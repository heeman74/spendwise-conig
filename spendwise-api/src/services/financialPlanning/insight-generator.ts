import { PrismaClient, InsightCache } from '@prisma/client';
import { buildFinancialSummary } from './financial-summarizer';
import { generateInsightsFromSummary } from './claude-client';

/**
 * Generate and cache insights for a user based on their financial data
 */
export async function generateAndCacheInsights(
  prisma: PrismaClient,
  userId: string
): Promise<InsightCache[]> {
  // Build financial summary
  const financialSummary = await buildFinancialSummary(prisma, userId);

  // Check if user has sufficient data (at least 10 transactions total)
  const transactionCount = await prisma.transaction.count({
    where: { userId },
  });

  if (transactionCount < 10) {
    // Not enough data to generate meaningful insights
    return [];
  }

  // Generate insights using Claude
  const generatedInsights = await generateInsightsFromSummary(financialSummary);

  // Invalidate existing insights
  await prisma.insightCache.updateMany({
    where: {
      userId,
      invalidatedAt: null,
    },
    data: {
      invalidatedAt: new Date(),
    },
  });

  // Create new insight cache entries with offset timestamps
  // to avoid unique constraint collision on (userId, insightType, generatedAt)
  const now = Date.now();
  const cachedInsights = await Promise.all(
    generatedInsights.map((insight, index) =>
      prisma.insightCache.create({
        data: {
          userId,
          insightType: insight.insightType,
          title: insight.title,
          content: insight.content,
          priority: insight.priority,
          dataSnapshot: financialSummary as any,
          generatedAt: new Date(now + index),
        },
      })
    )
  );

  return cachedInsights;
}

/**
 * Get active (non-invalidated) insights for a user
 */
export async function getActiveInsights(
  prisma: PrismaClient,
  userId: string
): Promise<InsightCache[]> {
  const insights = await prisma.insightCache.findMany({
    where: {
      userId,
      invalidatedAt: null,
    },
    orderBy: {
      priority: 'asc', // Lower priority number = higher importance
    },
  });

  return insights;
}
