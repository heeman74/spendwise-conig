import { redis } from './redis';
import { cleanMerchantName, generateMerchantFingerprint } from './parsers/merchant-cleaner';

export async function createOrUpdateMerchantRule(
  prisma: any,
  userId: string,
  rawMerchant: string,
  category: string
) {
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

  // Invalidate Redis cache for this merchant
  const cacheKey = generateMerchantFingerprint(rawMerchant);
  try {
    await redis.del(cacheKey);
  } catch {
    // Cache invalidation failure is non-critical
  }

  return rule;
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
