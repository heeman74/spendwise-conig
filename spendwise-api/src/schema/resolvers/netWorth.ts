import { Context } from '../../context';
import { requireAuth } from '../../middleware/authMiddleware';
import { getCache, setCache, invalidateCache } from '../../lib/redis';
import { parseDecimal } from '../../lib/utils';

type TimeRange = 'ONE_MONTH' | 'THREE_MONTHS' | 'SIX_MONTHS' | 'ONE_YEAR' | 'ALL';

/**
 * Calculate date range start based on TimeRange
 */
function getDateRangeStart(timeRange: TimeRange): Date | null {
  const now = new Date();
  switch (timeRange) {
    case 'ONE_MONTH':
      return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    case 'THREE_MONTHS':
      return new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
    case 'SIX_MONTHS':
      return new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000);
    case 'ONE_YEAR':
      return new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
    case 'ALL':
      return null; // No start date filter
    default:
      return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  }
}

/**
 * Calculate net worth from account balances
 * CREDIT accounts are liabilities (subtracted), all others are assets (added)
 */
function calculateNetWorth(accounts: Array<{ type: string; balance: any }>): number {
  return accounts.reduce((total, account) => {
    const balance = parseDecimal(account.balance);
    if (account.type === 'CREDIT') {
      return total - balance; // Liabilities subtract from net worth
    }
    return total + balance; // Assets add to net worth
  }, 0);
}

export const netWorthResolvers = {
  Query: {
    netWorth: async (
      _: unknown,
      {
        timeRange = 'ONE_MONTH',
        accountIds,
      }: {
        timeRange?: TimeRange;
        accountIds?: string[];
      },
      context: Context
    ) => {
      const user = requireAuth(context);

      // Build cache key with all filter parameters
      const cacheKey = `user:${user.id}:netWorth:${timeRange}:${accountIds?.sort().join(',') || 'all'}`;
      const cached = await getCache<Record<string, unknown>>(cacheKey);
      if (cached) return cached;

      // Calculate date range
      const startDate = getDateRangeStart(timeRange);
      const endDate = new Date();

      // Build where clause for snapshots
      const snapshotWhereClause: any = {
        userId: user.id,
      };
      if (startDate) {
        snapshotWhereClause.date = { gte: startDate, lte: endDate };
      }
      if (accountIds && accountIds.length > 0) {
        snapshotWhereClause.accountId = { in: accountIds };
      }

      // Build where clause for current accounts
      const accountWhereClause: any = {
        userId: user.id,
        includeInNetWorth: true,
      };
      if (accountIds && accountIds.length > 0) {
        accountWhereClause.id = { in: accountIds };
      }

      // Fetch snapshots and current accounts
      const [snapshots, currentAccounts] = await Promise.all([
        context.prisma.netWorthSnapshot.findMany({
          where: snapshotWhereClause,
          include: { account: true },
          orderBy: { date: 'asc' },
        }),
        context.prisma.account.findMany({
          where: accountWhereClause,
        }),
      ]);

      // Calculate current net worth
      const current = calculateNetWorth(currentAccounts);

      // Build history array by grouping snapshots by date
      const historyMap: Map<string, number> = new Map();
      snapshots.forEach((snapshot) => {
        const dateKey = snapshot.date.toISOString().split('T')[0];
        const balance = parseDecimal(snapshot.balance);
        const accountType = snapshot.account.type;

        const currentValue = historyMap.get(dateKey) || 0;
        if (accountType === 'CREDIT') {
          historyMap.set(dateKey, currentValue - balance);
        } else {
          historyMap.set(dateKey, currentValue + balance);
        }
      });

      const history = Array.from(historyMap.entries())
        .map(([dateStr, value]) => ({
          date: new Date(dateStr),
          value,
        }))
        .sort((a, b) => a.date.getTime() - b.date.getTime());

      // Calculate month-over-month change (30 days ago)
      const thirtyDaysAgo = new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000);
      const monthAgoSnapshot = history.find(
        (h) => h.date.getTime() >= thirtyDaysAgo.getTime()
      );
      const monthAgoValue = monthAgoSnapshot?.value || current;
      const monthOverMonthChange = current - monthAgoValue;
      const monthOverMonthChangePercent =
        monthAgoValue !== 0 ? (monthOverMonthChange / Math.abs(monthAgoValue)) * 100 : 0;

      // Calculate period change (first value in history)
      const firstValue = history.length > 0 ? history[0].value : current;
      const periodChange = current - firstValue;
      const periodChangePercent =
        firstValue !== 0 ? (periodChange / Math.abs(firstValue)) * 100 : 0;

      // Calculate total assets and liabilities
      const totalAssets = currentAccounts
        .filter((acc) => acc.type !== 'CREDIT')
        .reduce((sum, acc) => sum + parseDecimal(acc.balance), 0);

      const totalLiabilities = currentAccounts
        .filter((acc) => acc.type === 'CREDIT')
        .reduce((sum, acc) => sum + parseDecimal(acc.balance), 0);

      // Build account breakdown with per-account history
      const accounts = currentAccounts.map((account) => {
        const balance = parseDecimal(account.balance);
        const percentOfTotal = current !== 0 ? (Math.abs(balance) / Math.abs(current)) * 100 : 0;

        // Filter snapshots for this account
        const accountSnapshots = snapshots
          .filter((s) => s.accountId === account.id)
          .map((s) => ({
            date: s.date,
            value: parseDecimal(s.balance),
          }))
          .sort((a, b) => a.date.getTime() - b.date.getTime());

        return {
          accountId: account.id,
          accountName: account.name,
          accountType: account.type,
          balance: account.balance,
          percentOfTotal,
          includeInNetWorth: account.includeInNetWorth,
          history: accountSnapshots,
        };
      });

      const result = {
        current,
        monthOverMonthChange,
        monthOverMonthChangePercent,
        periodChange,
        periodChangePercent,
        totalAssets,
        totalLiabilities,
        history,
        accounts,
      };

      // Cache for 15 minutes
      await setCache(cacheKey, result, 900);

      return result;
    },
  },

  Mutation: {
    toggleIncludeInNetWorth: async (
      _: unknown,
      { accountId }: { accountId: string },
      context: Context
    ) => {
      const user = requireAuth(context);

      // Find account and verify ownership
      const account = await context.prisma.account.findFirst({
        where: { id: accountId, userId: user.id },
      });

      if (!account) {
        throw new Error('Account not found');
      }

      // Toggle includeInNetWorth
      const updatedAccount = await context.prisma.account.update({
        where: { id: accountId },
        data: { includeInNetWorth: !account.includeInNetWorth },
      });

      // Invalidate cache
      await invalidateCache(`user:${user.id}:netWorth:*`);

      return updatedAccount;
    },

    backfillNetWorthSnapshots: async (_: unknown, __: unknown, context: Context) => {
      const user = requireAuth(context);

      // Fetch all user accounts
      const accounts = await context.prisma.account.findMany({
        where: { userId: user.id },
      });

      if (accounts.length === 0) {
        return true; // No accounts, nothing to backfill
      }

      // Find oldest transaction date for user
      const oldestTransaction = await context.prisma.transaction.findFirst({
        where: { userId: user.id },
        orderBy: { date: 'asc' },
        select: { date: true },
      });

      if (!oldestTransaction) {
        return true; // No transactions, nothing to backfill
      }

      // Calculate start date (limit to 2 years of history max)
      const now = new Date();
      const twoYearsAgo = new Date(now.getTime() - 2 * 365 * 24 * 60 * 60 * 1000);
      const startDate = new Date(
        Math.max(oldestTransaction.date.getTime(), twoYearsAgo.getTime())
      );

      // Generate monthly snapshots from start date to now
      const snapshots: Array<{
        userId: string;
        accountId: string;
        balance: any;
        date: Date;
      }> = [];

      // Iterate through each month
      const currentDate = new Date(startDate);
      currentDate.setDate(1); // Set to 1st of month
      currentDate.setHours(0, 0, 0, 0);

      while (currentDate <= now) {
        const snapshotDate = new Date(currentDate);

        // For each account, calculate balance at that date
        for (const account of accounts) {
          // Calculate balance at snapshot date:
          // Current balance minus sum of all transactions after snapshot date
          const transactionsAfter = await context.prisma.transaction.findMany({
            where: {
              accountId: account.id,
              date: { gt: snapshotDate },
            },
            select: { amount: true, type: true },
          });

          let balanceAtDate = parseDecimal(account.balance);
          transactionsAfter.forEach((txn) => {
            const amount = parseDecimal(txn.amount);
            if (txn.type === 'INCOME') {
              balanceAtDate -= amount;
            } else if (txn.type === 'EXPENSE') {
              balanceAtDate += amount;
            }
            // TRANSFER: no net change to account balance (both sides captured)
          });

          snapshots.push({
            userId: user.id,
            accountId: account.id,
            balance: balanceAtDate,
            date: snapshotDate,
          });
        }

        // Move to next month
        currentDate.setMonth(currentDate.getMonth() + 1);
      }

      // Insert snapshots, skip duplicates
      if (snapshots.length > 0) {
        await context.prisma.netWorthSnapshot.createMany({
          data: snapshots,
          skipDuplicates: true,
        });
      }

      // Invalidate cache
      await invalidateCache(`user:${user.id}:netWorth:*`);

      return true;
    },
  },
};
