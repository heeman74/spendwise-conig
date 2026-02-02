import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import { statementImportResolvers } from '../../schema/resolvers/statementImport';
import { mockContext, mockUnauthenticatedContext, mockAccounts } from '../mocks/data';
import { prisma } from '../../lib/prisma';

// Mock the recurring detector
jest.mock('../../lib/recurring-detector', () => ({
  detectRecurringPatterns: jest.fn(() => [
    {
      merchantName: 'Netflix',
      frequency: 'MONTHLY',
      description: 'Netflix (auto-detected)',
      category: 'Entertainment',
      status: 'ACTIVE',
      lastAmount: 15.99,
      averageAmount: 15.99,
      lastDate: new Date('2024-01-10'),
      firstDate: new Date('2023-06-10'),
      nextExpectedDate: new Date('2024-02-10'),
      transactionIds: ['created-1'],
    },
    {
      merchantName: 'Spotify',
      frequency: 'MONTHLY',
      description: 'Spotify (auto-detected)',
      category: 'Entertainment',
      status: 'ACTIVE',
      lastAmount: 9.99,
      averageAmount: 9.99,
      lastDate: new Date('2024-01-15'),
      firstDate: new Date('2023-03-15'),
      nextExpectedDate: new Date('2024-02-15'),
      transactionIds: ['created-2'],
    },
  ]),
}));

// Mock crypto for UUID generation
jest.mock('crypto', () => ({
  randomUUID: jest.fn(() => 'mock-uuid'),
}));

// Mock merchant rules
jest.mock('../../lib/merchant-rules', () => ({
  createOrUpdateMerchantRule: jest.fn(),
}));

const mockRedis = {
  get: jest.fn() as any,
  del: jest.fn() as any,
  set: jest.fn() as any,
  setex: jest.fn() as any,
};

const mockPreviewData = {
  importId: 'import-1',
  fileName: 'statement.ofx',
  fileFormat: 'OFX',
  account: {
    institution: 'Chase',
    accountType: 'CHECKING',
    accountName: 'Chase Checking',
    accountMask: '1234',
  },
  totalTransactions: 3,
  duplicateCount: 0,
  warnings: [],
  transactions: [
    {
      date: '2024-01-10',
      amount: 15.99,
      description: 'Netflix subscription',
      merchant: 'Netflix',
      cleanedMerchant: 'Netflix',
      type: 'EXPENSE',
      suggestedCategory: 'Entertainment',
      fitId: 'fit-1',
      isDuplicate: false,
      categoryConfidence: 80,
      categorySource: 'keyword',
    },
    {
      date: '2024-01-15',
      amount: 9.99,
      description: 'Spotify subscription',
      merchant: 'Spotify',
      cleanedMerchant: 'Spotify',
      type: 'EXPENSE',
      suggestedCategory: 'Entertainment',
      fitId: 'fit-2',
      isDuplicate: false,
      categoryConfidence: 75,
      categorySource: 'keyword',
    },
    {
      date: '2024-01-20',
      amount: 150.00,
      description: 'Grocery shopping',
      merchant: 'Whole Foods',
      cleanedMerchant: 'Whole Foods',
      type: 'EXPENSE',
      suggestedCategory: 'Food & Dining',
      fitId: 'fit-3',
      isDuplicate: false,
      categoryConfidence: 90,
      categorySource: 'keyword',
    },
  ],
};

describe('StatementImport Resolvers - Recurring Features', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('confirmImport - recurringPatternsDetected', () => {
    it('should return detected recurring patterns in the result', async () => {
      // Setup mocks for the full confirm flow
      (prisma.statementImport.findFirst as any).mockResolvedValue({
        id: 'import-1',
        userId: 'user-123',
        status: 'PREVIEW',
        accountId: null,
      });

      mockRedis.get.mockResolvedValue(JSON.stringify(mockPreviewData));
      mockRedis.del.mockResolvedValue(1);

      (prisma.account.findFirst as any).mockResolvedValue(mockAccounts[0]);
      (prisma.statementImport.update as any).mockResolvedValue({});
      (prisma.transaction.createMany as any).mockResolvedValue({ count: 3 });
      (prisma.account.update as any).mockResolvedValue({});
      (prisma.transaction.findMany as any).mockResolvedValue([
        { id: 'created-1', date: new Date('2024-01-10'), amount: 15.99, merchant: 'Netflix', category: 'Entertainment', type: 'EXPENSE' },
        { id: 'created-2', date: new Date('2024-01-15'), amount: 9.99, merchant: 'Spotify', category: 'Entertainment', type: 'EXPENSE' },
        { id: 'created-3', date: new Date('2024-01-20'), amount: 150, merchant: 'Whole Foods', category: 'Food & Dining', type: 'EXPENSE' },
      ]);
      (prisma.recurringTransaction.upsert as any).mockResolvedValue({});

      const ctx = {
        ...mockContext,
        prisma,
        redis: mockRedis,
      };

      const result = await statementImportResolvers.Mutation.confirmImport(
        null,
        {
          input: {
            importId: 'import-1',
            accountId: 'acc-1',
            skipDuplicates: true,
          },
        },
        ctx as any
      );

      expect(result.success).toBe(true);
      expect(result.recurringPatternsDetected).toHaveLength(2);
      expect(result.recurringPatternsDetected[0]).toEqual({
        merchantName: 'Netflix',
        frequency: 'MONTHLY',
        averageAmount: 15.99,
      });
      expect(result.recurringPatternsDetected[1]).toEqual({
        merchantName: 'Spotify',
        frequency: 'MONTHLY',
        averageAmount: 9.99,
      });
    });

    it('should return empty recurringPatternsDetected when detection fails', async () => {
      const { detectRecurringPatterns } = require('../../lib/recurring-detector');
      (detectRecurringPatterns as any).mockImplementationOnce(() => {
        throw new Error('Detection failed');
      });

      (prisma.statementImport.findFirst as any).mockResolvedValue({
        id: 'import-1',
        userId: 'user-123',
        status: 'PREVIEW',
        accountId: null,
      });

      mockRedis.get.mockResolvedValue(JSON.stringify(mockPreviewData));
      mockRedis.del.mockResolvedValue(1);

      (prisma.account.findFirst as any).mockResolvedValue(mockAccounts[0]);
      (prisma.statementImport.update as any).mockResolvedValue({});
      (prisma.transaction.createMany as any).mockResolvedValue({ count: 3 });
      (prisma.account.update as any).mockResolvedValue({});
      (prisma.transaction.findMany as any).mockResolvedValue([]);

      const ctx = {
        ...mockContext,
        prisma,
        redis: mockRedis,
      };

      const result = await statementImportResolvers.Mutation.confirmImport(
        null,
        {
          input: {
            importId: 'import-1',
            accountId: 'acc-1',
            skipDuplicates: true,
          },
        },
        ctx as any
      );

      expect(result.success).toBe(true);
      expect(result.recurringPatternsDetected).toEqual([]);
    });
  });

  describe('confirmImport - recurringIndices', () => {
    it('should create RecurringTransaction records for flagged transactions', async () => {
      (prisma.statementImport.findFirst as any).mockResolvedValue({
        id: 'import-1',
        userId: 'user-123',
        status: 'PREVIEW',
        accountId: null,
      });

      mockRedis.get.mockResolvedValue(JSON.stringify(mockPreviewData));
      mockRedis.del.mockResolvedValue(1);

      (prisma.account.findFirst as any).mockResolvedValue(mockAccounts[0]);
      (prisma.statementImport.update as any).mockResolvedValue({});
      (prisma.transaction.createMany as any).mockResolvedValue({ count: 3 });
      (prisma.account.update as any).mockResolvedValue({});

      // First findMany call is for recurring indices lookup (importId-filtered)
      // Second findMany call is for auto-detection (full history)
      (prisma.transaction.findMany as any)
        .mockResolvedValueOnce([
          { id: 'created-1', date: new Date('2024-01-10'), amount: 15.99, merchant: 'Netflix', category: 'Entertainment', type: 'EXPENSE' },
          { id: 'created-2', date: new Date('2024-01-15'), amount: 9.99, merchant: 'Spotify', category: 'Entertainment', type: 'EXPENSE' },
          { id: 'created-3', date: new Date('2024-01-20'), amount: 150, merchant: 'Whole Foods', category: 'Food & Dining', type: 'EXPENSE' },
        ])
        .mockResolvedValueOnce([
          { id: 'created-1', date: new Date('2024-01-10'), amount: 15.99, merchant: 'Netflix', category: 'Entertainment', type: 'EXPENSE' },
          { id: 'created-2', date: new Date('2024-01-15'), amount: 9.99, merchant: 'Spotify', category: 'Entertainment', type: 'EXPENSE' },
          { id: 'created-3', date: new Date('2024-01-20'), amount: 150, merchant: 'Whole Foods', category: 'Food & Dining', type: 'EXPENSE' },
        ]);

      (prisma.recurringTransaction.upsert as any).mockResolvedValue({});

      const ctx = {
        ...mockContext,
        prisma,
        redis: mockRedis,
      };

      const result = await statementImportResolvers.Mutation.confirmImport(
        null,
        {
          input: {
            importId: 'import-1',
            accountId: 'acc-1',
            skipDuplicates: true,
            recurringIndices: [0, 1], // Flag Netflix and Spotify
          },
        },
        ctx as any
      );

      expect(result.success).toBe(true);

      // Should upsert recurring records for flagged transactions (grouped by merchant)
      // Plus 2 more for auto-detected patterns
      expect(prisma.recurringTransaction.upsert).toHaveBeenCalled();

      // Find the calls for manually flagged (frequency: 'MONTHLY' default)
      const upsertCalls = (prisma.recurringTransaction.upsert as any).mock.calls;
      const manualCalls = upsertCalls.filter(
        (call: any) => call[0].create?.description?.includes('manually flagged')
      );
      expect(manualCalls.length).toBe(2); // Netflix and Spotify
    });

    it('should ignore invalid recurringIndices', async () => {
      (prisma.statementImport.findFirst as any).mockResolvedValue({
        id: 'import-1',
        userId: 'user-123',
        status: 'PREVIEW',
        accountId: null,
      });

      mockRedis.get.mockResolvedValue(JSON.stringify(mockPreviewData));
      mockRedis.del.mockResolvedValue(1);

      (prisma.account.findFirst as any).mockResolvedValue(mockAccounts[0]);
      (prisma.statementImport.update as any).mockResolvedValue({});
      (prisma.transaction.createMany as any).mockResolvedValue({ count: 3 });
      (prisma.account.update as any).mockResolvedValue({});
      (prisma.transaction.findMany as any)
        .mockResolvedValueOnce([
          { id: 'created-1', date: new Date('2024-01-10'), amount: 15.99, merchant: 'Netflix', category: 'Entertainment', type: 'EXPENSE' },
          { id: 'created-2', date: new Date('2024-01-15'), amount: 9.99, merchant: 'Spotify', category: 'Entertainment', type: 'EXPENSE' },
          { id: 'created-3', date: new Date('2024-01-20'), amount: 150, merchant: 'Whole Foods', category: 'Food & Dining', type: 'EXPENSE' },
        ])
        .mockResolvedValueOnce([]);

      (prisma.recurringTransaction.upsert as any).mockResolvedValue({});

      const ctx = {
        ...mockContext,
        prisma,
        redis: mockRedis,
      };

      const result = await statementImportResolvers.Mutation.confirmImport(
        null,
        {
          input: {
            importId: 'import-1',
            accountId: 'acc-1',
            skipDuplicates: true,
            recurringIndices: [-1, 100, 999], // All invalid
          },
        },
        ctx as any
      );

      expect(result.success).toBe(true);

      // Should not create any manual recurring records
      const upsertCalls = (prisma.recurringTransaction.upsert as any).mock.calls;
      const manualCalls = upsertCalls.filter(
        (call: any) => call[0].create?.description?.includes('manually flagged')
      );
      expect(manualCalls.length).toBe(0);
    });

    it('should not create recurring records when recurringIndices is empty', async () => {
      (prisma.statementImport.findFirst as any).mockResolvedValue({
        id: 'import-1',
        userId: 'user-123',
        status: 'PREVIEW',
        accountId: null,
      });

      mockRedis.get.mockResolvedValue(JSON.stringify(mockPreviewData));
      mockRedis.del.mockResolvedValue(1);

      (prisma.account.findFirst as any).mockResolvedValue(mockAccounts[0]);
      (prisma.statementImport.update as any).mockResolvedValue({});
      (prisma.transaction.createMany as any).mockResolvedValue({ count: 3 });
      (prisma.account.update as any).mockResolvedValue({});
      (prisma.transaction.findMany as any).mockResolvedValue([
        { id: 'created-1', date: new Date('2024-01-10'), amount: 15.99, merchant: 'Netflix', category: 'Entertainment', type: 'EXPENSE' },
      ]);
      (prisma.recurringTransaction.upsert as any).mockResolvedValue({});

      const ctx = {
        ...mockContext,
        prisma,
        redis: mockRedis,
      };

      const result = await statementImportResolvers.Mutation.confirmImport(
        null,
        {
          input: {
            importId: 'import-1',
            accountId: 'acc-1',
            skipDuplicates: true,
            recurringIndices: [],
          },
        },
        ctx as any
      );

      expect(result.success).toBe(true);

      // Only auto-detection upserts, no manual ones
      const upsertCalls = (prisma.recurringTransaction.upsert as any).mock.calls;
      const manualCalls = upsertCalls.filter(
        (call: any) => call[0].create?.description?.includes('manually flagged')
      );
      expect(manualCalls.length).toBe(0);
    });
  });

  describe('confirmImport - authentication', () => {
    it('should throw UNAUTHENTICATED when not logged in', async () => {
      const ctx = {
        ...mockUnauthenticatedContext,
        prisma,
        redis: mockRedis,
      };

      await expect(
        statementImportResolvers.Mutation.confirmImport(
          null,
          { input: { importId: 'import-1' } },
          ctx as any
        )
      ).rejects.toMatchObject({
        extensions: { code: 'UNAUTHENTICATED' },
      });
    });
  });
});
