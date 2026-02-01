// Type definitions for test mocks
import { jest } from '@jest/globals';

// Create a type that makes all Prisma methods return properly typed mocks
export type MockedPrismaClient = {
  user: {
    findUnique: jest.MockedFunction<any>;
    findMany: jest.MockedFunction<any>;
    findFirst: jest.MockedFunction<any>;
    create: jest.MockedFunction<any>;
    update: jest.MockedFunction<any>;
    delete: jest.MockedFunction<any>;
  };
  account: {
    findUnique: jest.MockedFunction<any>;
    findMany: jest.MockedFunction<any>;
    findFirst: jest.MockedFunction<any>;
    create: jest.MockedFunction<any>;
    update: jest.MockedFunction<any>;
    delete: jest.MockedFunction<any>;
    aggregate: jest.MockedFunction<any>;
  };
  transaction: {
    findUnique: jest.MockedFunction<any>;
    findMany: jest.MockedFunction<any>;
    findFirst: jest.MockedFunction<any>;
    create: jest.MockedFunction<any>;
    update: jest.MockedFunction<any>;
    delete: jest.MockedFunction<any>;
    count: jest.MockedFunction<any>;
    groupBy: jest.MockedFunction<any>;
    aggregate: jest.MockedFunction<any>;
  };
  savingsGoal: {
    findUnique: jest.MockedFunction<any>;
    findMany: jest.MockedFunction<any>;
    findFirst: jest.MockedFunction<any>;
    create: jest.MockedFunction<any>;
    update: jest.MockedFunction<any>;
    delete: jest.MockedFunction<any>;
    aggregate: jest.MockedFunction<any>;
  };
  $transaction: jest.MockedFunction<any>;
};
