import { redis } from './redis';
import { cleanMerchantName, generateMerchantFingerprint } from './parsers/merchant-cleaner';

export async function applyMerchantRuleRetroactively(
  prisma: any,
  userId: string,
  merchantPattern: string,
  category: string,
  merchantDisplay: string
): Promise<number> {
  try {
    // Update all transactions from this user with matching merchant
    // that were NOT manually categorized (preserve user intent)
    const result = await prisma.transaction.updateMany({
      where: {
        userId,
        categorySource: { notIn: ['manual'] },
        OR: [
          { merchant: { contains: merchantPattern, mode: 'insensitive' } },
        ],
      },
      data: {
        category,
        categorySource: 'rule',
        categoryConfidence: 100,
      },
    });
    return result.count;
  } catch (error) {
    console.error('Retroactive re-categorization failed:', error);
    return 0;
  }
}

export async function createOrUpdateMerchantRule(
  prisma: any,
  userId: string,
  rawMerchant: string,
  category: string
): Promise<{ rule: any; retroactiveCount: number } | null> {
  const { displayName, normalizedKey } = cleanMerchantName(rawMerchant);

  if (!normalizedKey) return null;

  const rule = await prisma.merchantRule.upsert({
    where: {
      userId_merchantPattern: {
        userId,
        merchantPattern: normalizedKey,
      },
    },
    update: {
      category,
      merchantDisplay: displayName,
    },
    create: {
      userId,
      merchantPattern: normalizedKey,
      merchantDisplay: displayName,
      category,
    },
  });

  // Apply rule retroactively to existing transactions
  const retroCount = await applyMerchantRuleRetroactively(
    prisma, userId, normalizedKey, category, displayName
  );
  if (retroCount > 0) {
    console.log(`Retroactively updated ${retroCount} transactions for merchant "${displayName}"`);
  }

  // Invalidate Redis cache for this merchant
  const cacheKey = generateMerchantFingerprint(rawMerchant);
  try {
    await redis.del(cacheKey);
  } catch {
    // Cache invalidation failure is non-critical
  }

  return { rule, retroactiveCount: retroCount };
}

export async function getMerchantRules(
  prisma: any,
  userId: string,
  limit = 50,
  offset = 0
) {
  return prisma.merchantRule.findMany({
    where: { userId },
    orderBy: { updatedAt: 'desc' },
    take: limit,
    skip: offset,
  });
}

export async function deleteMerchantRule(
  prisma: any,
  userId: string,
  ruleId: string
) {
  const rule = await prisma.merchantRule.findFirst({
    where: { id: ruleId, userId },
  });

  if (!rule) return false;

  await prisma.merchantRule.delete({
    where: { id: ruleId },
  });

  // Invalidate Redis cache
  const cacheKey = `merchant:cat:${rule.merchantPattern}`;
  try {
    await redis.del(cacheKey);
  } catch {
    // Non-critical
  }

  return true;
}
