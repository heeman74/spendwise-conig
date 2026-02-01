import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import { GraphQLError } from 'graphql';
import { transactionResolvers } from '../../schema/resolvers/transaction';
import { mockTransactions, mockAccounts, mockContext, mockUnauthenticatedContext } from '../mocks/data';
import { prisma } from '../../lib/prisma';

describe('Transaction Resolvers', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Query.transactions', () => {
    it('should return paginated transactions for authenticated user', async () => {
      (prisma.transaction.findMany as any).mockResolvedValue(mockTransactions);
      (prisma.transaction.count as any).mockResolvedValue(3);

      const context = {
        ...mockContext,
        prisma,
      };

      const result = await transactionResolvers.Query.transactions(
        null,
        { pagination: { page: 1, limit: 20 } },
        context as any
      );

      expect(result.edges).toHaveLength(3);
      expect(result.pageInfo.totalCount).toBe(3);
      expect(result.pageInfo.hasNextPage).toBe(false);
      expect(result.pageInfo.hasPreviousPage).toBe(false);
    });

    it('should filter transactions by category', async () => {
      const foodTransactions = mockTransactions.filter(t => t.category === 'Food & Dining');
      (prisma.transaction.findMany as any).mockResolvedValue(foodTransactions);
      (prisma.transaction.count as any).mockResolvedValue(1);

      const context = {
        ...mockContext,
        prisma,
      };

      await transactionResolvers.Query.transactions(
        null,
        {
          pagination: { page: 1, limit: 20 },
          filters: { category: 'Food & Dining' }
        },
        context as any
      );

      expect(prisma.transaction.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            userId: 'user-123',
            category: 'Food & Dining',
          }),
        })
      );
    });

    it('should filter transactions by type', async () => {
      (prisma.transaction.findMany as any).mockResolvedValue([]);
      (prisma.transaction.count as any).mockResolvedValue(0);

      const context = {
        ...mockContext,
        prisma,
      };

      await transactionResolvers.Query.transactions(
        null,
        {
          pagination: { page: 1, limit: 20 },
          filters: { type: 'EXPENSE' }
        },
        context as any
      );

      expect(prisma.transaction.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            userId: 'user-123',
            type: 'EXPENSE',
          }),
        })
      );
    });

    it('should filter transactions by date range', async () => {
      (prisma.transaction.findMany as any).mockResolvedValue([]);
      (prisma.transaction.count as any).mockResolvedValue(0);

      const context = {
        ...mockContext,
        prisma,
      };

      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-31');

      await transactionResolvers.Query.transactions(
        null,
        {
          pagination: { page: 1, limit: 20 },
          filters: { startDate, endDate }
        },
        context as any
      );

      expect(prisma.transaction.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            userId: 'user-123',
            date: { gte: startDate, lte: endDate },
          }),
        })
      );
    });

    it('should filter transactions by amount range', async () => {
      (prisma.transaction.findMany as any).mockResolvedValue([]);
      (prisma.transaction.count as any).mockResolvedValue(0);

      const context = {
        ...mockContext,
        prisma,
      };

      await transactionResolvers.Query.transactions(
        null,
        {
          pagination: { page: 1, limit: 20 },
          filters: { minAmount: 100, maxAmount: 500 }
        },
        context as any
      );

      expect(prisma.transaction.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            userId: 'user-123',
            amount: { gte: 100, lte: 500 },
          }),
        })
      );
    });

    it('should search transactions by text', async () => {
      (prisma.transaction.findMany as any).mockResolvedValue([]);
      (prisma.transaction.count as any).mockResolvedValue(0);

      const context = {
        ...mockContext,
        prisma,
      };

      await transactionResolvers.Query.transactions(
        null,
        {
          pagination: { page: 1, limit: 20 },
          filters: { search: 'grocery' }
        },
        context as any
      );

      expect(prisma.transaction.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            userId: 'user-123',
            OR: expect.arrayContaining([
              expect.objectContaining({ merchant: expect.any(Object) }),
              expect.objectContaining({ description: expect.any(Object) }),
              expect.objectContaining({ category: expect.any(Object) }),
            ]),
          }),
        })
      );
    });

    it('should sort transactions by amount ascending', async () => {
      (prisma.transaction.findMany as any).mockResolvedValue([]);
      (prisma.transaction.count as any).mockResolvedValue(0);

      const context = {
        ...mockContext,
        prisma,
      };

      await transactionResolvers.Query.transactions(
        null,
        {
          pagination: { page: 1, limit: 20 },
          sort: { field: 'AMOUNT', order: 'ASC' }
        },
        context as any
      );

      expect(prisma.transaction.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { amount: 'asc' },
        })
      );
    });

    it('should throw UNAUTHENTICATED error when not logged in', async () => {
      const context = {
        ...mockUnauthenticatedContext,
        prisma,
      };

      await expect(
        transactionResolvers.Query.transactions(
          null,
          { pagination: { page: 1, limit: 20 } },
          context as any
        )
      ).rejects.toMatchObject({
        extensions: { code: 'UNAUTHENTICATED' },
      });
    });
  });

  describe('Query.transaction', () => {
    it('should return a specific transaction by id', async () => {
      const mockTransaction = mockTransactions[0];
      (prisma.transaction.findFirst as any).mockResolvedValue(mockTransaction);

      const context = {
        ...mockContext,
        prisma,
      };

      const result = await transactionResolvers.Query.transaction(
        null,
        { id: 'txn-1' },
        context as any
      );

      expect(result).toEqual(mockTransaction);
      expect(prisma.transaction.findFirst).toHaveBeenCalledWith({
        where: { id: 'txn-1', userId: 'user-123' },
        include: { account: true },
      });
    });

    it('should throw NOT_FOUND when transaction does not exist', async () => {
      (prisma.transaction.findFirst as any).mockResolvedValue(null);

      const context = {
        ...mockContext,
        prisma,
      };

      await expect(
        transactionResolvers.Query.transaction(null, { id: 'nonexistent' }, context as any)
      ).rejects.toThrow('Transaction not found');
    });
  });

  describe('Query.recentTransactions', () => {
    it('should return recent transactions with default limit', async () => {
      (prisma.transaction.findMany as any).mockResolvedValue(mockTransactions.slice(0, 5));

      const context = {
        ...mockContext,
        prisma,
      };

      const result = await transactionResolvers.Query.recentTransactions(
        null,
        {},
        context as any
      );

      expect(result).toHaveLength(3); // Our mock only has 3 transactions
      expect(prisma.transaction.findMany).toHaveBeenCalledWith({
        where: { userId: 'user-123' },
        orderBy: { date: 'desc' },
        take: 5,
        include: { account: true },
      });
    });

    it('should return recent transactions with custom limit', async () => {
      (prisma.transaction.findMany as any).mockResolvedValue(mockTransactions.slice(0, 2));

      const context = {
        ...mockContext,
        prisma,
      };

      await transactionResolvers.Query.recentTransactions(
        null,
        { limit: 2 },
        context as any
      );

      expect(prisma.transaction.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ take: 2 })
      );
    });
  });

  describe('Query.categories', () => {
    it('should return distinct categories', async () => {
      (prisma.transaction.findMany as any).mockResolvedValue([
        { category: 'Food & Dining' },
        { category: 'Entertainment' },
        { category: 'Income' },
      ]);

      const context = {
        ...mockContext,
        prisma,
      };

      const result = await transactionResolvers.Query.categories(null, {}, context as any);

      expect(result).toEqual(['Food & Dining', 'Entertainment', 'Income']);
      expect(prisma.transaction.findMany).toHaveBeenCalledWith({
        where: { userId: 'user-123' },
        select: { category: true },
        distinct: ['category'],
      });
    });
  });

  describe('Mutation.createTransaction', () => {
    it('should create a new transaction and update account balance', async () => {
      const newTransaction = {
        id: 'txn-new',
        userId: 'user-123',
        accountId: 'acc-1',
        amount: 100,
        type: 'EXPENSE',
        category: 'Shopping',
        merchant: 'Amazon',
        description: 'Books',
        date: new Date('2024-01-15'),
        createdAt: new Date(),
        account: mockAccounts[0],
      };

      (prisma.account.findFirst as any).mockResolvedValue(mockAccounts[0]);
      (prisma.transaction.create as any).mockResolvedValue(newTransaction);
      (prisma.account.update as any).mockResolvedValue({
        ...mockAccounts[0],
        balance: 4900,
      });

      const context = {
        ...mockContext,
        prisma,
      };

      const input = {
        accountId: 'acc-1',
        amount: 100,
        type: 'EXPENSE' as const,
        category: 'Shopping',
        merchant: 'Amazon',
        description: 'Books',
        date: new Date('2024-01-15'),
      };

      const result = await transactionResolvers.Mutation.createTransaction(
        null,
        { input },
        context as any
      );

      expect(result).toEqual(newTransaction);
      expect(prisma.account.update).toHaveBeenCalledWith({
        where: { id: 'acc-1' },
        data: { balance: { increment: -100 } },
      });
    });

    it('should increase balance for INCOME transactions', async () => {
      const incomeTransaction = {
        id: 'txn-new',
        userId: 'user-123',
        accountId: 'acc-1',
        amount: 5000,
        type: 'INCOME',
        category: 'Income',
        merchant: 'Employer',
        description: 'Salary',
        date: new Date('2024-01-15'),
        createdAt: new Date(),
        account: mockAccounts[0],
      };

      (prisma.account.findFirst as any).mockResolvedValue(mockAccounts[0]);
      (prisma.transaction.create as any).mockResolvedValue(incomeTransaction);
      (prisma.account.update as any).mockResolvedValue({});

      const context = {
        ...mockContext,
        prisma,
      };

      const input = {
        accountId: 'acc-1',
        amount: 5000,
        type: 'INCOME' as const,
        category: 'Income',
        merchant: 'Employer',
        date: new Date('2024-01-15'),
      };

      await transactionResolvers.Mutation.createTransaction(
        null,
        { input },
        context as any
      );

      expect(prisma.account.update).toHaveBeenCalledWith({
        where: { id: 'acc-1' },
        data: { balance: { increment: 5000 } },
      });
    });

    it('should throw NOT_FOUND when account does not exist', async () => {
      (prisma.account.findFirst as any).mockResolvedValue(null);

      const context = {
        ...mockContext,
        prisma,
      };

      const input = {
        accountId: 'nonexistent',
        amount: 100,
        type: 'EXPENSE' as const,
        category: 'Shopping',
        date: new Date(),
      };

      await expect(
        transactionResolvers.Mutation.createTransaction(null, { input }, context as any)
      ).rejects.toThrow('Account not found');
    });
  });

  describe('Mutation.updateTransaction', () => {
    it('should update an existing transaction', async () => {
      const existingTransaction = mockTransactions[0];
      const updatedTransaction = { ...existingTransaction, category: 'Groceries' };

      (prisma.transaction.findFirst as any).mockResolvedValue(existingTransaction);
      (prisma.transaction.update as any).mockResolvedValue(updatedTransaction);

      const context = {
        ...mockContext,
        prisma,
      };

      const result = await transactionResolvers.Mutation.updateTransaction(
        null,
        { id: 'txn-1', input: { category: 'Groceries' } },
        context as any
      );

      expect(result.category).toBe('Groceries');
      expect(prisma.transaction.update).toHaveBeenCalledWith({
        where: { id: 'txn-1' },
        data: { category: 'Groceries', categoryConfidence: 100, categorySource: 'manual' },
        include: { account: true },
      });
    });

    it('should throw NOT_FOUND when transaction does not exist', async () => {
      (prisma.transaction.findFirst as any).mockResolvedValue(null);

      const context = {
        ...mockContext,
        prisma,
      };

      await expect(
        transactionResolvers.Mutation.updateTransaction(
          null,
          { id: 'nonexistent', input: { category: 'Test' } },
          context as any
        )
      ).rejects.toThrow('Transaction not found');
    });
  });

  describe('Mutation.deleteTransaction', () => {
    it('should delete a transaction and reverse balance change', async () => {
      const transaction = mockTransactions[0]; // EXPENSE transaction
      (prisma.transaction.findFirst as any).mockResolvedValue(transaction);
      (prisma.transaction.delete as any).mockResolvedValue(transaction);
      (prisma.account.update as any).mockResolvedValue({});

      const context = {
        ...mockContext,
        prisma,
      };

      const result = await transactionResolvers.Mutation.deleteTransaction(
        null,
        { id: 'txn-1' },
        context as any
      );

      expect(result).toBe(true);
      // For EXPENSE, should add back the amount
      expect(prisma.account.update).toHaveBeenCalledWith({
        where: { id: transaction.accountId },
        data: { balance: { increment: 150 } }, // Reverse expense
      });
    });

    it('should throw NOT_FOUND when transaction does not exist', async () => {
      (prisma.transaction.findFirst as any).mockResolvedValue(null);

      const context = {
        ...mockContext,
        prisma,
      };

      await expect(
        transactionResolvers.Mutation.deleteTransaction(null, { id: 'nonexistent' }, context as any)
      ).rejects.toThrow('Transaction not found');
    });
  });

  describe('Transaction.amount', () => {
    it('should parse decimal amount correctly', () => {
      const result = transactionResolvers.Transaction.amount({ amount: 150.5 });
      expect(result).toBe(150.5);
    });
  });
});
