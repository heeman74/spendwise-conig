import Redis from 'ioredis';

const globalForRedis = globalThis as unknown as {
  redis: Redis | undefined;
};

export const redis =
  globalForRedis.redis ??
  new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
    maxRetriesPerRequest: 3,
    retryStrategy(times) {
      const delay = Math.min(times * 50, 2000);
      return delay;
    },
  });

if (process.env.NODE_ENV !== 'production') globalForRedis.redis = redis;

// Cache key helpers
export const cacheKeys = {
  dashboard: (userId: string) => `user:${userId}:dashboard`,
  analytics: (userId: string, period: string) => `user:${userId}:analytics:${period}`,
  recentTransactions: (userId: string) => `user:${userId}:transactions:recent`,
  advice: (userId: string) => `user:${userId}:advice`,
};

// Cache TTL in seconds
export const cacheTTL = {
  dashboard: 300, // 5 minutes
  analytics: 900, // 15 minutes
  recentTransactions: 120, // 2 minutes
  advice: 3600, // 1 hour
};

// Cache helpers
export async function getCache<T>(key: string): Promise<T | null> {
  try {
    const data = await redis.get(key);
    return data ? JSON.parse(data) : null;
  } catch (error) {
    console.error('Redis get error:', error);
    return null;
  }
}

export async function setCache<T>(key: string, data: T, ttl: number): Promise<void> {
  try {
    await redis.setex(key, ttl, JSON.stringify(data));
  } catch (error) {
    console.error('Redis set error:', error);
  }
}

export async function invalidateCache(pattern: string): Promise<void> {
  try {
    const keys = await redis.keys(pattern);
    if (keys.length > 0) {
      await redis.del(...keys);
    }
  } catch (error) {
    console.error('Redis invalidate error:', error);
  }
}

export default redis;
