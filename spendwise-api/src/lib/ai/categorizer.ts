import OpenAI from 'openai';
import { zodResponseFormat } from 'openai/helpers/zod';
import { z } from 'zod';
import { redis } from '../redis';
import { cleanMerchantName, generateMerchantFingerprint } from '../parsers/merchant-cleaner';
import { categorizeTransactionWithConfidence } from '../parsers/categorizer';
import type { ParsedTransaction } from '../parsers/types';
import { VALID_CATEGORIES, getUserCategoryNames } from '../constants';

const CACHE_TTL = 30 * 24 * 60 * 60; // 30 days in seconds
const BATCH_SIZE = 50;

function buildCategorizedResultSchema(allCategories: string[]) {
  const tuple = allCategories as [string, ...string[]];
  return z.object({
    results: z.array(z.object({
      index: z.number().describe('The transaction index from the input batch'),
      category: z.enum(tuple).describe('The transaction category'),
      confidence: z.number().min(0).max(100).describe('Confidence score 0-100'),
      cleanedMerchant: z.string().describe('Clean, readable merchant name'),
    })),
  });
}

export interface CategorizedTransaction extends ParsedTransaction {
  confidence: number;
  source: 'ai' | 'rule' | 'keyword' | 'cache';
  cleanedMerchant: string;
}

async function getUserCategoryHistory(
  prisma: any,
  userId: string
): Promise<string> {
  try {
    const recentPatterns = await prisma.transaction.groupBy({
      by: ['merchant', 'category'],
      where: {
        userId,
        categorySource: { in: ['manual', 'rule'] },
        merchant: { not: null },
      },
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: 50,
    });

    if (recentPatterns.length === 0) return '';

    const lines = recentPatterns
      .map((p: any) => `${p.merchant} -> ${p.category} (${p._count.id}x)`)
      .join('\n');

    return `\n\nThis user has previously categorized these merchants:\n${lines}\n\nUse these as strong signals. Match similar merchants to the same categories.`;
  } catch (error) {
    console.error('Failed to fetch user category history:', error);
    return '';
  }
}

export async function categorizeTransactionsAI(
  prisma: any,
  userId: string,
  transactions: ParsedTransaction[]
): Promise<CategorizedTransaction[]> {
  const results: CategorizedTransaction[] = new Array(transactions.length);
  const uncategorizedIndices: number[] = [];

  // Fetch user categories (includes defaults + custom)
  const userCategoryNames = await getUserCategoryNames(prisma, userId);
  // Build full category list: merge VALID_CATEGORIES with user custom categories
  const allCategoryNames = Array.from(new Set([...VALID_CATEGORIES, ...userCategoryNames]));
  const allCategorySet = new Set(allCategoryNames);

  // Step 1: Clean merchant names for all transactions
  const cleanedNames = transactions.map((txn) => {
    const raw = txn.merchant || txn.description || '';
    return cleanMerchantName(raw);
  });

  // Step 2: Merchant rules lookup — batch query
  const normalizedKeys = cleanedNames
    .map((c) => c.normalizedKey)
    .filter((k) => k.length > 0);

  const uniqueKeys = [...new Set(normalizedKeys)];

  let rulesMap = new Map<string, { category: string; merchantDisplay: string }>();
  if (uniqueKeys.length > 0) {
    try {
      const rules = await prisma.merchantRule.findMany({
        where: {
          userId,
          merchantPattern: { in: uniqueKeys },
        },
      });
      for (const rule of rules) {
        rulesMap.set(rule.merchantPattern, {
          category: rule.category,
          merchantDisplay: rule.merchantDisplay,
        });
      }
    } catch (error) {
      console.error('Merchant rules lookup failed:', error);
    }
  }

  // Apply merchant rules
  for (let i = 0; i < transactions.length; i++) {
    const { normalizedKey, displayName } = cleanedNames[i];
    const rule = rulesMap.get(normalizedKey);

    if (rule) {
      results[i] = {
        ...transactions[i],
        category: rule.category,
        confidence: 100,
        source: 'rule',
        cleanedMerchant: rule.merchantDisplay || displayName,
      };
    }
  }

  // Step 3: Redis cache check for remaining
  const needsCacheCheck: number[] = [];
  for (let i = 0; i < transactions.length; i++) {
    if (!results[i]) needsCacheCheck.push(i);
  }

  if (needsCacheCheck.length > 0) {
    try {
      const cacheKeys = needsCacheCheck.map((i) =>
        generateMerchantFingerprint(transactions[i].merchant || transactions[i].description || '')
      );

      const cached = await redis.mget(...cacheKeys);

      for (let j = 0; j < needsCacheCheck.length; j++) {
        const idx = needsCacheCheck[j];
        if (cached[j]) {
          try {
            const parsed = JSON.parse(cached[j]!);
            if (parsed.category && allCategorySet.has(parsed.category)) {
              results[idx] = {
                ...transactions[idx],
                category: parsed.category,
                confidence: parsed.confidence || 85,
                source: 'cache',
                cleanedMerchant: parsed.cleanedMerchant || cleanedNames[idx].displayName,
              };
            }
          } catch {
            // Invalid cache entry, skip
          }
        }
      }
    } catch (error) {
      console.error('Redis cache lookup failed:', error);
    }
  }

  // Collect indices still needing categorization
  for (let i = 0; i < transactions.length; i++) {
    if (!results[i]) uncategorizedIndices.push(i);
  }

  // Step 4: OpenAI batch call for remaining
  if (uncategorizedIndices.length > 0 && process.env.OPENAI_API_KEY) {
    try {
      const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

      // Build dynamic Zod schema with all categories (defaults + custom)
      const DynamicCategorizedResult = buildCategorizedResultSchema(allCategoryNames);

      // Fetch user category history once for all batches
      const userHistoryContext = await getUserCategoryHistory(prisma, userId);

      // Process in batches
      for (let batchStart = 0; batchStart < uncategorizedIndices.length; batchStart += BATCH_SIZE) {
        const batchIndices = uncategorizedIndices.slice(batchStart, batchStart + BATCH_SIZE);
        const batchItems = batchIndices.map((idx, batchIdx) => {
          const txn = transactions[idx];
          const merchant = cleanedNames[idx].displayName || txn.merchant || '';
          return `${batchIdx}|${merchant}|${txn.description || ''}|${txn.amount}|${txn.type}`;
        });

        const response = await openai.beta.chat.completions.parse({
          model: 'gpt-4o-mini',
          temperature: 0.1,
          messages: [
            {
              role: 'system',
              content: `You are a financial transaction categorizer. Categorize each transaction into exactly one of these categories: ${allCategoryNames.join(', ')}.

Rules:
- Use the merchant name as primary signal
- confidence: 90+ for well-known merchants, 70-89 for likely matches, 50-69 for guesses
- cleanedMerchant: a clean, readable merchant name (e.g., "AMZN MKTP" → "Amazon")
- If unsure, use "Other" with low confidence${userHistoryContext}`,
            },
            {
              role: 'user',
              content: `Categorize these transactions (format: index|merchant|description|amount|type):\n${batchItems.join('\n')}`,
            },
          ],
          response_format: zodResponseFormat(DynamicCategorizedResult, 'categorization'),
        });

        const message = response.choices[0]?.message;
        if (message?.refusal) {
          console.warn('AI refused to categorize batch:', message.refusal);
          // Skip this batch - keyword fallback will handle these
          continue;
        }

        const parsed = message?.parsed;
        if (parsed?.results) {
          for (const result of parsed.results) {
            const batchIdx = result.index;
            if (batchIdx >= 0 && batchIdx < batchIndices.length) {
              const originalIdx = batchIndices[batchIdx];
              const confidence = Math.min(100, Math.max(0, result.confidence));
              const cleanedMerchant = result.cleanedMerchant || cleanedNames[originalIdx].displayName;

              results[originalIdx] = {
                ...transactions[originalIdx],
                category: result.category,
                confidence,
                source: 'ai',
                cleanedMerchant,
              };

              // Cache the result in Redis
              const cacheKey = generateMerchantFingerprint(
                transactions[originalIdx].merchant || transactions[originalIdx].description || ''
              );
              if (cacheKey !== 'merchant:cat:') {
                try {
                  await redis.setex(
                    cacheKey,
                    CACHE_TTL,
                    JSON.stringify({ category: result.category, confidence, cleanedMerchant })
                  );
                } catch {
                  // Cache write failure is non-critical
                }
              }
            }
          }
        }
      }
    } catch (error) {
      console.error('OpenAI categorization failed:', error);
    }
  } else if (uncategorizedIndices.length > 0 && !process.env.OPENAI_API_KEY) {
    console.warn('OPENAI_API_KEY not set — skipping AI categorization, using keyword fallback');
  }

  // Step 5: Keyword fallback for anything still uncategorized
  for (let i = 0; i < transactions.length; i++) {
    if (!results[i]) {
      const { category, confidence } = categorizeTransactionWithConfidence(transactions[i]);
      results[i] = {
        ...transactions[i],
        category,
        confidence,
        source: 'keyword',
        cleanedMerchant: cleanedNames[i].displayName || transactions[i].merchant || '',
      };
    }
  }

  return results;
}
