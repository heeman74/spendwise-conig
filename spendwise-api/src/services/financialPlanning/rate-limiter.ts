import { redis } from '../../lib/redis';

const DAILY_MESSAGE_LIMIT = 25;

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: Date;
}

/**
 * Get seconds until next midnight UTC
 */
function getSecondsUntilMidnightUTC(): number {
  const now = new Date();
  const midnight = new Date(now);
  midnight.setUTCHours(24, 0, 0, 0);
  return Math.floor((midnight.getTime() - now.getTime()) / 1000);
}

/**
 * Check if user has remaining message quota
 */
export async function checkRateLimit(userId: string): Promise<RateLimitResult> {
  const key = `rate_limit:chat:${userId}`;
  const count = await redis.get(key);
  const currentCount = count ? parseInt(count, 10) : 0;

  const remaining = Math.max(0, DAILY_MESSAGE_LIMIT - currentCount);
  const allowed = currentCount < DAILY_MESSAGE_LIMIT;

  const resetAt = new Date();
  resetAt.setUTCHours(24, 0, 0, 0);

  return {
    allowed,
    remaining,
    resetAt,
  };
}

/**
 * Increment user's daily message count
 */
export async function incrementUsage(userId: string): Promise<void> {
  const key = `rate_limit:chat:${userId}`;
  const ttl = getSecondsUntilMidnightUTC();

  const currentCount = await redis.get(key);

  if (currentCount) {
    await redis.incr(key);
  } else {
    // First message of the day - set with expiry
    await redis.setex(key, ttl, '1');
  }
}
