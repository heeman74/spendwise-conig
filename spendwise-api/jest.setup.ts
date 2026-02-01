// Jest setup file for global test configuration

// Mock Prisma
jest.mock('./src/lib/prisma', () => ({
  prisma: require('./src/__mocks__/prisma').mockPrismaClient,
}));

// Mock Redis
const Redis = require('ioredis-mock');
const redisInstance = new Redis();

jest.mock('./src/lib/redis', () => {
  return {
    redis: redisInstance,
    getCache: jest.fn(async (key: string) => {
      try {
        const data = await redisInstance.get(key);
        return data ? JSON.parse(data) : null;
      } catch {
        return null;
      }
    }),
    setCache: jest.fn(async (key: string, data: any, ttlSeconds: number) => {
      try {
        await redisInstance.setex(key, ttlSeconds, JSON.stringify(data));
      } catch {}
    }),
    invalidateCache: jest.fn(async (pattern: string) => {
      try {
        const keys = await redisInstance.keys(pattern);
        if (keys.length > 0) {
          await redisInstance.del(...keys);
        }
      } catch {}
    }),
  };
});

// Set test environment variables
process.env.JWT_SECRET = 'test-jwt-secret-key-for-testing-only';
process.env.ENCRYPTION_KEY = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef'; // 64 hex chars = 32 bytes
process.env.SMTP_HOST = 'smtp.test.com';
process.env.SMTP_PORT = '587';
process.env.SMTP_SECURE = 'false';
process.env.SMTP_USER = 'test@test.com';
process.env.SMTP_PASSWORD = 'test-password';
process.env.SMTP_FROM_EMAIL = 'noreply@test.com';
process.env.SMTP_FROM_NAME = 'Test App';
process.env.TWILIO_ACCOUNT_SID = 'ACtest123456789';
process.env.TWILIO_AUTH_TOKEN = 'test-auth-token';
process.env.TWILIO_PHONE_NUMBER = '+1234567890';

// Clear all mocks and Redis data before each test
beforeEach(async () => {
  jest.clearAllMocks();
  // Clear Redis data
  await redisInstance.flushall();
});
