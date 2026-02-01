import { Context } from '../../context';
import { requireAuth } from '../../middleware/authMiddleware';
import { getCache, setCache } from '../../lib/redis';
import {
  parseDecimal,
  getMonthRange,
  getWeekRange,
  getYearRange,
  getPreviousPeriodRange,
  getCategoryColor,
} from '../../lib/utils';

type Period = 'WEEK' | 'MONTH' | 'YEAR';

function getDateRange(period: Period): { start: Date; end: Date } {
  switch (period) {
    case 'WEEK':
      return getWeekRange();
    case 'YEAR':
      return getYearRange();
    default:
      return getMonthRange();
  }
}

export const analyticsResolvers = {
  Query: {
    dashboardStats: async (_: unknown, __: unknown, context: Context) => {
      const user = requireAuth(context);

      // Check cache first
      const cacheKey = `user:${user.id}:dashboard`;
      const cached = await getCache<Record<string, unknown>>(cacheKey);
      if (cached) return cached;

      const { start, end } = getMonthRange();

      const [accounts, transactions, goals] = await Promise.all([
        context.prisma.account.findMany({ where: { userId: user.id } }),
        context.prisma.transaction.findMany({
          where: { userId: user.id, date: { gte: start, lte: end } },
        }),
        context.prisma.savingsGoal.findMany({ where: { userId: user.id } }),
      ]);

      const totalBalance = accounts.reduce((sum, a) => {
        const balance = parseDecimal(a.balance);
        return sum + (a.type === 'CREDIT' ? -balance : balance);
      }, 0);

      const monthlyIncome = transactions
        .filter((t) => t.type === 'INCOME')
        .reduce((sum, t) => sum + parseDecimal(t.amount), 0);

      const monthlyExpenses = transactions
        .filter((t) => t.type === 'EXPENSE')
        .reduce((sum, t) => sum + parseDecimal(t.amount), 0);

      const savingsRate =
        monthlyIncome > 0
          ? Math.round(((monthlyIncome - monthlyExpenses) / monthlyIncome) * 100)
          : 0;

      // Calculate top categories
      const categoryTotals: Record<string, number> = {};
      transactions
        .filter((t) => t.type === 'EXPENSE')
        .forEach((t) => {
          categoryTotals[t.category] =
            (categoryTotals[t.category] || 0) + parseDecimal(t.amount);
        });

      const topCategories = Object.entries(categoryTotals)
        .map(([category, amount]) => ({
          category,
          amount,
          percentage: monthlyExpenses > 0 ? (amount / monthlyExpenses) * 100 : 0,
          color: getCategoryColor(category),
          transactionCount: transactions.filter((t) => t.category === category).length,
        }))
        .sort((a, b) => b.amount - a.amount)
        .slice(0, 5);

      const recentTransactions = await context.prisma.transaction.findMany({
        where: { userId: user.id },
        orderBy: { date: 'desc' },
        take: 5,
        include: { account: true },
      });

      const result = {
        totalBalance,
        monthlyIncome,
        monthlyExpenses,
        savingsRate,
        accountCount: accounts.length,
        topCategories,
        recentTransactions,
        savingsGoals: goals,
      };

      // Cache for 5 minutes
      await setCache(cacheKey, result, 300);

      return result;
    },

    analytics: async (
      _: unknown,
      {
        period = 'MONTH',
        dateRange: dateRangeArg,
        accountIds
      }: {
        period?: Period;
        dateRange?: { start: Date; end: Date };
        accountIds?: string[]
      },
      context: Context
    ) => {
      const user = requireAuth(context);

      // Build cache key with all parameters
      const cacheKey = `user:${user.id}:analytics:${period}:${dateRangeArg?.start?.toISOString() || ''}:${dateRangeArg?.end?.toISOString() || ''}:${accountIds?.sort().join(',') || ''}`;
      const cached = await getCache<Record<string, unknown>>(cacheKey);
      if (cached) return cached;

      const dateRange = dateRangeArg || getDateRange(period);
      const previousRange = getPreviousPeriodRange(period);

      // Build where clause with optional filters
      const whereClause: any = {
        userId: user.id,
        date: { gte: dateRange.start, lte: dateRange.end },
      };
      if (accountIds && accountIds.length > 0) {
        whereClause.accountId = { in: accountIds };
      }

      const previousWhereClause: any = {
        userId: user.id,
        date: { gte: previousRange.start, lte: previousRange.end },
      };
      if (accountIds && accountIds.length > 0) {
        previousWhereClause.accountId = { in: accountIds };
      }

      const [transactions, previousTransactions] = await Promise.all([
        context.prisma.transaction.findMany({
          where: whereClause,
        }),
        context.prisma.transaction.findMany({
          where: previousWhereClause,
        }),
      ]);

      const totalIncome = transactions
        .filter((t) => t.type === 'INCOME')
        .reduce((sum, t) => sum + parseDecimal(t.amount), 0);

      const totalExpenses = transactions
        .filter((t) => t.type === 'EXPENSE')
        .reduce((sum, t) => sum + parseDecimal(t.amount), 0);

      const previousIncome = previousTransactions
        .filter((t) => t.type === 'INCOME')
        .reduce((sum, t) => sum + parseDecimal(t.amount), 0);

      const previousExpenses = previousTransactions
        .filter((t) => t.type === 'EXPENSE')
        .reduce((sum, t) => sum + parseDecimal(t.amount), 0);

      // Build category breakdown
      const categoryTotals: Record<string, { amount: number; count: number }> = {};
      transactions
        .filter((t) => t.type === 'EXPENSE')
        .forEach((t) => {
          const cat = categoryTotals[t.category] || { amount: 0, count: 0 };
          cat.amount += parseDecimal(t.amount);
          cat.count += 1;
          categoryTotals[t.category] = cat;
        });

      const categoryBreakdown = Object.entries(categoryTotals)
        .map(([category, data]) => ({
          category,
          amount: data.amount,
          percentage: totalExpenses > 0 ? (data.amount / totalExpenses) * 100 : 0,
          color: getCategoryColor(category),
          transactionCount: data.count,
        }))
        .sort((a, b) => b.amount - a.amount);

      // Calculate trends - multi-month time series data
      const netSavings = totalIncome - totalExpenses;
      const previousSavings = previousIncome - previousExpenses;

      // Determine trend window (6 months)
      const trendEnd = dateRange.end;
      const trendStart = new Date(trendEnd);
      trendStart.setMonth(trendStart.getMonth() - 5); // 6 months total including current
      trendStart.setDate(1); // Start of month
      trendStart.setHours(0, 0, 0, 0);

      // Fetch transactions for trend period
      const trendWhereClause: any = {
        userId: user.id,
        date: { gte: trendStart, lte: trendEnd },
      };
      if (accountIds && accountIds.length > 0) {
        trendWhereClause.accountId = { in: accountIds };
      }

      const trendTransactions = await context.prisma.transaction.findMany({
        where: trendWhereClause,
      });

      // Group by month
      const monthlyData: Record<string, { income: number; expenses: number }> = {};

      trendTransactions.forEach((t) => {
        const monthKey = t.date.getFullYear() + '-' + String(t.date.getMonth() + 1).padStart(2, '0');
        if (!monthlyData[monthKey]) {
          monthlyData[monthKey] = { income: 0, expenses: 0 };
        }
        const amount = parseDecimal(t.amount);
        if (t.type === 'INCOME') {
          monthlyData[monthKey].income += amount;
        } else if (t.type === 'EXPENSE') {
          monthlyData[monthKey].expenses += amount;
        }
      });

      // Build arrays for all 6 months
      const trendLabels: string[] = [];
      const trendIncome: number[] = [];
      const trendExpenses: number[] = [];
      const trendSavings: number[] = [];

      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

      for (let i = 0; i < 6; i++) {
        const monthDate = new Date(trendStart);
        monthDate.setMonth(trendStart.getMonth() + i);
        const monthKey = monthDate.getFullYear() + '-' + String(monthDate.getMonth() + 1).padStart(2, '0');
        const monthLabel = monthNames[monthDate.getMonth()] + ' ' + monthDate.getFullYear();

        trendLabels.push(monthLabel);
        const data = monthlyData[monthKey] || { income: 0, expenses: 0 };
        trendIncome.push(data.income);
        trendExpenses.push(data.expenses);
        trendSavings.push(data.income - data.expenses);
      }

      const result = {
        period,
        dateRange: {
          start: dateRange.start,
          end: dateRange.end,
        },
        summary: {
          totalIncome,
          totalExpenses,
          netSavings,
          savingsRate: totalIncome > 0 ? ((netSavings) / totalIncome) * 100 : 0,
          transactionCount: transactions.length,
          averageTransaction:
            transactions.length > 0
              ? (totalIncome + totalExpenses) / transactions.length
              : 0,
        },
        categoryBreakdown,
        trends: {
          labels: trendLabels,
          income: trendIncome,
          expenses: trendExpenses,
          savings: trendSavings,
        },
        comparison: {
          previousPeriod: {
            totalIncome: previousIncome,
            totalExpenses: previousExpenses,
            netSavings: previousSavings,
            savingsRate:
              previousIncome > 0 ? (previousSavings / previousIncome) * 100 : 0,
            transactionCount: previousTransactions.length,
            averageTransaction:
              previousTransactions.length > 0
                ? (previousIncome + previousExpenses) / previousTransactions.length
                : 0,
          },
          incomeChange:
            previousIncome > 0
              ? ((totalIncome - previousIncome) / previousIncome) * 100
              : 0,
          expensesChange:
            previousExpenses > 0
              ? ((totalExpenses - previousExpenses) / previousExpenses) * 100
              : 0,
          savingsChange:
            previousSavings !== 0
              ? ((netSavings - previousSavings) / Math.abs(previousSavings)) * 100
              : 0,
        },
      };

      // Cache for 15 minutes
      await setCache(cacheKey, result, 900);

      return result;
    },

    spendingByCategory: async (
      _: unknown,
      {
        period = 'MONTH',
        dateRange: dateRangeArg,
        accountIds
      }: {
        period?: Period;
        dateRange?: { start: Date; end: Date };
        accountIds?: string[]
      },
      context: Context
    ) => {
      const user = requireAuth(context);

      const dateRange = dateRangeArg || getDateRange(period);

      // Build where clause with optional filters
      const whereClause: any = {
        userId: user.id,
        type: 'EXPENSE',
        date: { gte: dateRange.start, lte: dateRange.end },
      };
      if (accountIds && accountIds.length > 0) {
        whereClause.accountId = { in: accountIds };
      }

      const transactions = await context.prisma.transaction.findMany({
        where: whereClause,
      });

      const totalExpenses = transactions.reduce(
        (sum, t) => sum + parseDecimal(t.amount),
        0
      );

      const categoryTotals: Record<string, { amount: number; count: number }> = {};
      transactions.forEach((t) => {
        const cat = categoryTotals[t.category] || { amount: 0, count: 0 };
        cat.amount += parseDecimal(t.amount);
        cat.count += 1;
        categoryTotals[t.category] = cat;
      });

      return Object.entries(categoryTotals)
        .map(([category, data]) => ({
          category,
          amount: data.amount,
          percentage: totalExpenses > 0 ? (data.amount / totalExpenses) * 100 : 0,
          color: getCategoryColor(category),
          transactionCount: data.count,
        }))
        .sort((a, b) => b.amount - a.amount);
    },

    topMerchants: async (
      _: unknown,
      {
        dateRange: dateRangeArg,
        accountIds,
        limit = 10
      }: {
        dateRange?: { start: Date; end: Date };
        accountIds?: string[];
        limit?: number
      },
      context: Context
    ) => {
      const user = requireAuth(context);

      // Default to current month if no date range provided
      const dateRange = dateRangeArg || getMonthRange();

      // Build cache key with all parameters
      const cacheKey = `user:${user.id}:topMerchants:${dateRange.start.toISOString()}:${dateRange.end.toISOString()}:${accountIds?.sort().join(',') || ''}:${limit}`;
      const cached = await getCache<any[]>(cacheKey);
      if (cached) return cached;

      // Build where clause
      const whereClause: any = {
        userId: user.id,
        type: 'EXPENSE',
        merchant: { not: null },
        date: { gte: dateRange.start, lte: dateRange.end },
      };
      if (accountIds && accountIds.length > 0) {
        whereClause.accountId = { in: accountIds };
      }

      const transactions = await context.prisma.transaction.findMany({
        where: whereClause,
      });

      // Aggregate by merchant
      const merchantData: Record<string, {
        totalAmount: number;
        transactionCount: number;
        categories: Record<string, number>;
      }> = {};

      transactions.forEach((t) => {
        const merchant = t.merchant!;
        if (!merchantData[merchant]) {
          merchantData[merchant] = {
            totalAmount: 0,
            transactionCount: 0,
            categories: {},
          };
        }
        const amount = parseDecimal(t.amount);
        merchantData[merchant].totalAmount += amount;
        merchantData[merchant].transactionCount += 1;
        merchantData[merchant].categories[t.category] =
          (merchantData[merchant].categories[t.category] || 0) + amount;
      });

      // Build result
      const result = Object.entries(merchantData)
        .map(([merchant, data]) => ({
          merchant,
          totalAmount: data.totalAmount,
          transactionCount: data.transactionCount,
          averageAmount: data.transactionCount > 0 ? data.totalAmount / data.transactionCount : 0,
          categoryBreakdown: Object.entries(data.categories).map(([category, amount]) => ({
            category,
            amount,
            percentage: data.totalAmount > 0 ? (amount / data.totalAmount) * 100 : 0,
            color: getCategoryColor(category),
            transactionCount: transactions.filter(t => t.merchant === merchant && t.category === category).length,
          })).sort((a, b) => b.amount - a.amount),
        }))
        .sort((a, b) => b.totalAmount - a.totalAmount)
        .slice(0, limit);

      // Cache for 15 minutes
      await setCache(cacheKey, result, 900);

      return result;
    },
  },

  DashboardStats: {
    totalBalance: (parent: { totalBalance: number }) => parent.totalBalance,
    monthlyIncome: (parent: { monthlyIncome: number }) => parent.monthlyIncome,
    monthlyExpenses: (parent: { monthlyExpenses: number }) => parent.monthlyExpenses,
  },
};
