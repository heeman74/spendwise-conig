import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import { transactionResolvers } from '../../schema/resolvers/transaction';
import { mockRecurringTransactions, mockContext, mockUnauthenticatedContext } from '../mocks/data';
import { prisma } from '../../lib/prisma';

describe('Transaction.recurringInfo Resolver', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return null when user is not authenticated', async () => {
    const context = {
      ...mockUnauthenticatedContext,
      prisma,
    };

    const result = await transactionResolvers.Transaction.recurringInfo(
      { id: 'txn-3', userId: 'user-123' },
      {},
      context as any
    );

    expect(result).toBeNull();
    expect(prisma.recurringTransaction.findMany).not.toHaveBeenCalled();
  });

  it('should return recurring info when transaction is part of a recurring pattern', async () => {
    // Only return active, non-dismissed records
    const activeRecords = mockRecurringTransactions.filter(r => r.isActive && !r.isDismissed);
    (prisma.recurringTransaction.findMany as any).mockResolvedValue(activeRecords);

    const context = {
      ...mockContext,
      prisma,
    };

    const result = await transactionResolvers.Transaction.recurringInfo(
      { id: 'txn-3', userId: 'user-123' },
      {},
      context as any
    );

    expect(result).toEqual({
      frequency: 'MONTHLY',
      merchantName: 'Netflix',
    });
  });

  it('should return null when transaction is not part of any recurring pattern', async () => {
    const activeRecords = mockRecurringTransactions.filter(r => r.isActive && !r.isDismissed);
    (prisma.recurringTransaction.findMany as any).mockResolvedValue(activeRecords);

    const context = {
      ...mockContext,
      prisma,
    };

    const result = await transactionResolvers.Transaction.recurringInfo(
      { id: 'txn-not-recurring', userId: 'user-123' },
      {},
      context as any
    );

    expect(result).toBeNull();
  });

  it('should use per-request cache and only query once for multiple transactions', async () => {
    const activeRecords = mockRecurringTransactions.filter(r => r.isActive && !r.isDismissed);
    (prisma.recurringTransaction.findMany as any).mockResolvedValue(activeRecords);

    const context = {
      ...mockContext,
      prisma,
    };

    // First call builds the cache
    await transactionResolvers.Transaction.recurringInfo(
      { id: 'txn-3', userId: 'user-123' },
      {},
      context as any
    );

    // Second call uses cached lookup
    await transactionResolvers.Transaction.recurringInfo(
      { id: 'txn-2', userId: 'user-123' },
      {},
      context as any
    );

    // Third call for a non-recurring transaction
    await transactionResolvers.Transaction.recurringInfo(
      { id: 'txn-1', userId: 'user-123' },
      {},
      context as any
    );

    // Should only query the database once
    expect(prisma.recurringTransaction.findMany).toHaveBeenCalledTimes(1);
  });

  it('should exclude dismissed recurring transactions', async () => {
    const activeRecords = mockRecurringTransactions.filter(r => r.isActive && !r.isDismissed);
    (prisma.recurringTransaction.findMany as any).mockResolvedValue(activeRecords);

    const context = {
      ...mockContext,
      prisma,
    };

    // txn-1 is in rec-3 which is dismissed, so it should not appear
    const result = await transactionResolvers.Transaction.recurringInfo(
      { id: 'txn-1', userId: 'user-123' },
      {},
      context as any
    );

    expect(result).toBeNull();

    // Verify the query filters for active and non-dismissed
    expect(prisma.recurringTransaction.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          isActive: true,
          isDismissed: false,
        }),
      })
    );
  });

  it('should return correct info for income recurring transactions', async () => {
    const activeRecords = mockRecurringTransactions.filter(r => r.isActive && !r.isDismissed);
    (prisma.recurringTransaction.findMany as any).mockResolvedValue(activeRecords);

    const context = {
      ...mockContext,
      prisma,
    };

    const result = await transactionResolvers.Transaction.recurringInfo(
      { id: 'txn-2', userId: 'user-123' },
      {},
      context as any
    );

    expect(result).toEqual({
      frequency: 'MONTHLY',
      merchantName: 'Employer Inc',
    });
  });

  it('should handle empty recurring transactions list', async () => {
    (prisma.recurringTransaction.findMany as any).mockResolvedValue([]);

    const context = {
      ...mockContext,
      prisma,
    };

    const result = await transactionResolvers.Transaction.recurringInfo(
      { id: 'txn-1', userId: 'user-123' },
      {},
      context as any
    );

    expect(result).toBeNull();
  });

  it('should handle recurring transactions with null merchantName', async () => {
    (prisma.recurringTransaction.findMany as any).mockResolvedValue([]);

    const context = {
      ...mockContext,
      prisma,
    };

    // The query already filters out null merchantName, so result should be empty
    const result = await transactionResolvers.Transaction.recurringInfo(
      { id: 'txn-1', userId: 'user-123' },
      {},
      context as any
    );

    expect(result).toBeNull();
    expect(prisma.recurringTransaction.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          merchantName: { not: null },
        }),
      })
    );
  });
});
