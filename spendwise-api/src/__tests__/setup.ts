// Test setup file
import { jest } from '@jest/globals';

// Helper to create properly typed mock functions that accept any value
const createMockFn = (): any => jest.fn();

const mockPrismaClient: any = {
  user: {
    findUnique: createMockFn(),
    findMany: createMockFn(),
    findFirst: createMockFn(),
    create: createMockFn(),
    update: createMockFn(),
    delete: createMockFn(),
  },
  account: {
    findUnique: createMockFn(),
    findMany: createMockFn(),
    findFirst: createMockFn(),
    create: createMockFn(),
    update: createMockFn(),
    delete: createMockFn(),
    aggregate: createMockFn(),
  },
  transaction: {
    findUnique: createMockFn(),
    findMany: createMockFn(),
    findFirst: createMockFn(),
    create: createMockFn(),
    update: createMockFn(),
    delete: createMockFn(),
    count: createMockFn(),
    groupBy: createMockFn(),
    aggregate: createMockFn(),
  },
  savingsGoal: {
    findUnique: createMockFn(),
    findMany: createMockFn(),
    findFirst: createMockFn(),
    create: createMockFn(),
    update: createMockFn(),
    delete: createMockFn(),
    aggregate: createMockFn(),
  },
  merchantRule: {
    findUnique: createMockFn(),
    findMany: createMockFn(),
    findFirst: createMockFn(),
    create: createMockFn(),
    update: createMockFn(),
    upsert: createMockFn(),
    delete: createMockFn(),
  },
  $transaction: jest.fn((callback: any) => callback(mockPrismaClient)),
};

// Mock Prisma client - export both named and default
// Cast to any to avoid TypeScript strict type checking issues with jest.Mock
jest.mock('../lib/prisma', () => ({
  __esModule: true,
  prisma: mockPrismaClient as any,
  default: mockPrismaClient as any,
}));

// Mock Redis client
jest.mock('../lib/redis', () => ({
  __esModule: true,
  redis: {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
    keys: jest.fn(),
  },
  default: {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
    keys: jest.fn(),
  },
  getCache: jest.fn(),
  setCache: jest.fn(),
  deleteCache: jest.fn(),
  deleteCachePattern: jest.fn(),
  invalidateCache: jest.fn(),
}));

// Set test environment variables
process.env.JWT_SECRET = 'test-jwt-secret-for-testing';
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';

// Global test timeout
jest.setTimeout(10000);

// Clean up after each test
afterEach(() => {
  jest.clearAllMocks();
});

export { mockPrismaClient };
