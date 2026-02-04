import { redis } from '../lib/redis';

const MAX_ATTEMPTS = 5;
const LOCKOUT_TTL = 15 * 60; // 15 minutes in seconds
const KEY_PREFIX = 'lockout:';

export async function checkAccountLockout(email: string): Promise<boolean> {
  const key = `${KEY_PREFIX}${email}`;
  const attempts = await redis.get(key);
  return attempts !== null && parseInt(attempts, 10) >= MAX_ATTEMPTS;
}

export async function recordFailedAttempt(email: string): Promise<void> {
  const key = `${KEY_PREFIX}${email}`;
  const current = await redis.incr(key);
  if (current === 1) {
    await redis.expire(key, LOCKOUT_TTL);
  }
}

export async function clearFailedAttempts(email: string): Promise<void> {
  const key = `${KEY_PREFIX}${email}`;
  await redis.del(key);
}
