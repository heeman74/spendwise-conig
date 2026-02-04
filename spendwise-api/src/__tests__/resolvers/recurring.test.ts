import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import { GraphQLError } from 'graphql';
import { recurringResolvers } from '../../schema/resolvers/recurring';
import {
  mockRecurringTransactions,
  mockContext,
  mockUnauthenticatedContext,
} from '../mocks/data';
import { prisma } from '../../lib/prisma';

const prismaMock = prisma as any;

describe('Recurring Resolvers', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Query.recurring', () => {
    it('should return recurring transactions for authenticated user', async () => {
      const activeRecurring = mockRecurringTransactions.filter((r) => !r.isDismissed);
      prismaMock.recurringTransaction.findMany.mockResolvedValue(activeRecurring);

      const context = { ...mockContext, prisma };

      const result = await recurringResolvers.Query.recurring(
        null,
        {},
        context as any
      );

      expect(result).toEqual(activeRecurring);
      expect(prismaMock.recurringTransaction.findMany).toHaveBeenCalledWith({
        where: { userId: 'user-123', isDismissed: false },
        orderBy: { lastDate: 'desc' },
      });
    });

    it('should return dismissed recurring when dismissed=true', async () => {
      const dismissed = mockRecurringTransactions.filter((r) => r.isDismissed);
      prismaMock.recurringTransaction.findMany.mockResolvedValue(dismissed);

      const context = { ...mockContext, prisma };

      const result = await recurringResolvers.Query.recurring(
        null,
        { dismissed: true },
        context as any
      );

      expect(result).toEqual(dismissed);
      expect(prismaMock.recurringTransaction.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ isDismissed: true }),
        })
      );
    });

    it('should apply frequency filter', async () => {
      prismaMock.recurringTransaction.findMany.mockResolvedValue([]);

      const context = { ...mockContext, prisma };

      await recurringResolvers.Query.recurring(
        null,
        { filters: { frequency: 'MONTHLY' } },
        context as any
      );

      expect(prismaMock.recurringTransaction.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ frequency: 'MONTHLY' }),
        })
      );
    });

    it('should apply category filter', async () => {
      prismaMock.recurringTransaction.findMany.mockResolvedValue([]);

      const context = { ...mockContext, prisma };

      await recurringResolvers.Query.recurring(
        null,
        { filters: { category: 'Entertainment' } },
        context as any
      );

      expect(prismaMock.recurringTransaction.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ category: 'Entertainment' }),
        })
      );
    });

    it('should apply type filter for INCOME', async () => {
      prismaMock.recurringTransaction.findMany.mockResolvedValue([]);

      const context = { ...mockContext, prisma };

      await recurringResolvers.Query.recurring(
        null,
        { filters: { type: 'INCOME' } },
        context as any
      );

      expect(prismaMock.recurringTransaction.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ category: 'Income' }),
        })
      );
    });

    it('should apply type filter for EXPENSE', async () => {
      prismaMock.recurringTransaction.findMany.mockResolvedValue([]);

      const context = { ...mockContext, prisma };

      await recurringResolvers.Query.recurring(
        null,
        { filters: { type: 'EXPENSE' } },
        context as any
      );

      expect(prismaMock.recurringTransaction.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ category: { not: 'Income' } }),
        })
      );
    });

    it('should apply custom sort', async () => {
      prismaMock.recurringTransaction.findMany.mockResolvedValue([]);

      const context = { ...mockContext, prisma };

      await recurringResolvers.Query.recurring(
        null,
        { sort: { field: 'averageAmount', order: 'desc' } },
        context as any
      );

      expect(prismaMock.recurringTransaction.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { averageAmount: 'desc' },
        })
      );
    });

    it('should throw UNAUTHENTICATED error when not logged in', async () => {
      const context = { ...mockUnauthenticatedContext, prisma };

      await expect(
        recurringResolvers.Query.recurring(null, {}, context as any)
      ).rejects.toThrow(GraphQLError);

      await expect(
        recurringResolvers.Query.recurring(null, {}, context as any)
      ).rejects.toMatchObject({
        extensions: { code: 'UNAUTHENTICATED' },
      });
    });
  });

  describe('Query.recurringSummary', () => {
    it('should return summary for authenticated user', async () => {
      const activeItems = [
        {
          ...mockRecurringTransactions[0], // Netflix, Entertainment, MONTHLY, avg 15.99
          averageAmount: 15.99,
          frequency: 'MONTHLY',
          category: 'Entertainment',
        },
        {
          ...mockRecurringTransactions[1], // Employer, Income, MONTHLY, avg 5000
          averageAmount: 5000,
          frequency: 'MONTHLY',
          category: 'Income',
        },
      ];

      prismaMock.recurringTransaction.findMany.mockResolvedValue(activeItems);

      const context = { ...mockContext, prisma };

      const result = await recurringResolvers.Query.recurringSummary(
        null,
        {},
        context as any
      );

      expect(result.totalRecurringExpenses).toBeCloseTo(15.99, 2);
      expect(result.totalRecurringIncome).toBeCloseTo(5000, 2);
      expect(result.netRecurring).toBeCloseTo(5000 - 15.99, 2);
      expect(result.activeCount).toBe(2);
      expect(result.incomeRatio).toBeCloseTo((15.99 / 5000) * 100, 2);
    });

    it('should fetch only active, non-dismissed items', async () => {
      prismaMock.recurringTransaction.findMany.mockResolvedValue([]);

      const context = { ...mockContext, prisma };

      await recurringResolvers.Query.recurringSummary(null, {}, context as any);

      expect(prismaMock.recurringTransaction.findMany).toHaveBeenCalledWith({
        where: {
          userId: 'user-123',
          isActive: true,
          isDismissed: false,
        },
      });
    });

    it('should return zero totals when no items', async () => {
      prismaMock.recurringTransaction.findMany.mockResolvedValue([]);

      const context = { ...mockContext, prisma };

      const result = await recurringResolvers.Query.recurringSummary(
        null,
        {},
        context as any
      );

      expect(result.totalRecurringExpenses).toBe(0);
      expect(result.totalRecurringIncome).toBe(0);
      expect(result.netRecurring).toBe(0);
      expect(result.activeCount).toBe(0);
      expect(result.incomeRatio).toBeNull();
    });

    it('should normalize weekly expenses to monthly', async () => {
      const weeklyItem = [
        {
          id: 'rec-weekly',
          category: 'Food & Dining',
          averageAmount: 100, // $100/week
          frequency: 'WEEKLY',
          isActive: true,
          isDismissed: false,
        },
      ];

      prismaMock.recurringTransaction.findMany.mockResolvedValue(weeklyItem);

      const context = { ...mockContext, prisma };

      const result = await recurringResolvers.Query.recurringSummary(
        null,
        {},
        context as any
      );

      // Weekly $100 normalized to monthly = $100 * (52/12) ≈ $433.33
      expect(result.totalRecurringExpenses).toBeCloseTo(100 * (52 / 12), 1);
    });

    it('should return null incomeRatio when no income', async () => {
      const expenseOnly = [
        {
          id: 'rec-1',
          category: 'Entertainment',
          averageAmount: 50,
          frequency: 'MONTHLY',
          isActive: true,
          isDismissed: false,
        },
      ];

      prismaMock.recurringTransaction.findMany.mockResolvedValue(expenseOnly);

      const context = { ...mockContext, prisma };

      const result = await recurringResolvers.Query.recurringSummary(
        null,
        {},
        context as any
      );

      expect(result.incomeRatio).toBeNull();
    });

    it('should throw UNAUTHENTICATED error when not logged in', async () => {
      const context = { ...mockUnauthenticatedContext, prisma };

      await expect(
        recurringResolvers.Query.recurringSummary(null, {}, context as any)
      ).rejects.toThrow(GraphQLError);

      await expect(
        recurringResolvers.Query.recurringSummary(null, {}, context as any)
      ).rejects.toMatchObject({
        extensions: { code: 'UNAUTHENTICATED' },
      });
    });
  });

  describe('Mutation.dismissRecurring', () => {
    it('should dismiss a recurring transaction', async () => {
      const existing = mockRecurringTransactions[0];
      const dismissed = { ...existing, isDismissed: true };

      prismaMock.recurringTransaction.findFirst.mockResolvedValue(existing);
      prismaMock.recurringTransaction.update.mockResolvedValue(dismissed);

      const context = { ...mockContext, prisma };

      const result = await recurringResolvers.Mutation.dismissRecurring(
        null,
        { id: 'rec-1' },
        context as any
      );

      expect(result.isDismissed).toBe(true);
      expect(prismaMock.recurringTransaction.update).toHaveBeenCalledWith({
        where: { id: 'rec-1' },
        data: { isDismissed: true },
      });
    });

    it('should throw NOT_FOUND when recurring item does not exist', async () => {
      prismaMock.recurringTransaction.findFirst.mockResolvedValue(null);

      const context = { ...mockContext, prisma };

      await expect(
        recurringResolvers.Mutation.dismissRecurring(
          null,
          { id: 'nonexistent' },
          context as any
        )
      ).rejects.toThrow('Recurring transaction not found');
    });

    it('should throw UNAUTHENTICATED when not logged in', async () => {
      const context = { ...mockUnauthenticatedContext, prisma };

      await expect(
        recurringResolvers.Mutation.dismissRecurring(
          null,
          { id: 'rec-1' },
          context as any
        )
      ).rejects.toMatchObject({
        extensions: { code: 'UNAUTHENTICATED' },
      });
    });
  });

  describe('Mutation.restoreRecurring', () => {
    it('should restore a dismissed recurring transaction', async () => {
      const existing = { ...mockRecurringTransactions[2], isDismissed: true };
      const restored = { ...existing, isDismissed: false };

      prismaMock.recurringTransaction.findFirst.mockResolvedValue(existing);
      prismaMock.recurringTransaction.update.mockResolvedValue(restored);

      const context = { ...mockContext, prisma };

      const result = await recurringResolvers.Mutation.restoreRecurring(
        null,
        { id: 'rec-3' },
        context as any
      );

      expect(result.isDismissed).toBe(false);
      expect(prismaMock.recurringTransaction.update).toHaveBeenCalledWith({
        where: { id: 'rec-3' },
        data: { isDismissed: false },
      });
    });
  });

  describe('Mutation.updateRecurring', () => {
    it('should update recurring transaction fields', async () => {
      const existing = mockRecurringTransactions[0];
      const updated = { ...existing, merchantName: 'Netflix Premium', category: 'Streaming' };

      prismaMock.recurringTransaction.findFirst.mockResolvedValue(existing);
      prismaMock.recurringTransaction.update.mockResolvedValue(updated);

      const context = { ...mockContext, prisma };

      const result = await recurringResolvers.Mutation.updateRecurring(
        null,
        {
          id: 'rec-1',
          input: { merchantName: 'Netflix Premium', category: 'Streaming' },
        },
        context as any
      );

      expect(result.merchantName).toBe('Netflix Premium');
      expect(prismaMock.recurringTransaction.update).toHaveBeenCalledWith({
        where: { id: 'rec-1' },
        data: { merchantName: 'Netflix Premium', category: 'Streaming' },
      });
    });

    it('should update amount fields when amount is provided', async () => {
      const existing = mockRecurringTransactions[0];
      prismaMock.recurringTransaction.findFirst.mockResolvedValue(existing);
      prismaMock.recurringTransaction.update.mockResolvedValue({
        ...existing,
        lastAmount: 19.99,
        averageAmount: 19.99,
      });

      const context = { ...mockContext, prisma };

      await recurringResolvers.Mutation.updateRecurring(
        null,
        { id: 'rec-1', input: { amount: 19.99 } },
        context as any
      );

      expect(prismaMock.recurringTransaction.update).toHaveBeenCalledWith({
        where: { id: 'rec-1' },
        data: { lastAmount: 19.99, averageAmount: 19.99 },
      });
    });

    it('should throw NOT_FOUND when recurring item does not exist', async () => {
      prismaMock.recurringTransaction.findFirst.mockResolvedValue(null);

      const context = { ...mockContext, prisma };

      await expect(
        recurringResolvers.Mutation.updateRecurring(
          null,
          { id: 'nonexistent', input: { merchantName: 'Test' } },
          context as any
        )
      ).rejects.toThrow('Recurring transaction not found');
    });
  });
});
