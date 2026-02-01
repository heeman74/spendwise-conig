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
      { period = 'MONTH' }: { period?: Period },
      context: Context
    ) => {
      const user = requireAuth(context);

      // Check cache
      const cacheKey = `user:${user.id}:analytics:${period}`;
      const cached = await getCache<Record<string, unknown>>(cacheKey);
      if (cached) return cached;

      const dateRange = getDateRange(period);
      const previousRange = getPreviousPeriodRange(period);

      const [transactions, previousTransactions] = await Promise.all([
        context.prisma.transaction.findMany({
          where: {
            userId: user.id,
            date: { gte: dateRange.start, lte: dateRange.end },
          },
        }),
        context.prisma.transaction.findMany({
          where: {
            userId: user.id,
            date: { gte: previousRange.start, lte: previousRange.end },
          },
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

      // Calculate trends (simplified - could be enhanced for actual time series)
      const netSavings = totalIncome - totalExpenses;
      const previousSavings = previousIncome - previousExpenses;

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
          labels: ['Current Period'],
          income: [totalIncome],
          expenses: [totalExpenses],
          savings: [netSavings],
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
      { period = 'MONTH' }: { period?: Period },
      context: Context
    ) => {
      const user = requireAuth(context);

      const dateRange = getDateRange(period);

      const transactions = await context.prisma.transaction.findMany({
        where: {
          userId: user.id,
          type: 'EXPENSE',
          date: { gte: dateRange.start, lte: dateRange.end },
        },
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
  },

  DashboardStats: {
    totalBalance: (parent: { totalBalance: number }) => parent.totalBalance,
    monthlyIncome: (parent: { monthlyIncome: number }) => parent.monthlyIncome,
    monthlyExpenses: (parent: { monthlyExpenses: number }) => parent.monthlyExpenses,
  },
};
