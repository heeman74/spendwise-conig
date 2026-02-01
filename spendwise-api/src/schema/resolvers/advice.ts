import { Context } from '../../context';
import { requireAuth } from '../../middleware/authMiddleware';
import { getCache, setCache } from '../../lib/redis';
import { parseDecimal, getMonthRange } from '../../lib/utils';

interface Advice {
  id: string;
  type: 'BUDGET' | 'SAVINGS' | 'INVESTMENT' | 'DEBT' | 'GENERAL';
  title: string;
  description: string;
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  actionable: boolean;
  action?: string;
}

export const adviceResolvers = {
  Query: {
    advice: async (_: unknown, __: unknown, context: Context) => {
      const user = requireAuth(context);

      // Check cache
      const cacheKey = `user:${user.id}:advice`;
      const cached = await getCache<Advice[]>(cacheKey);
      if (cached) return cached;

      const { start, end } = getMonthRange();

      const [accounts, transactions] = await Promise.all([
        context.prisma.account.findMany({ where: { userId: user.id } }),
        context.prisma.transaction.findMany({
          where: { userId: user.id, date: { gte: start, lte: end } },
        }),
      ]);

      const advice: Advice[] = [];

      // Calculate metrics
      const totalBalance = accounts.reduce((sum, a) => {
        const balance = parseDecimal(a.balance);
        return sum + (a.type === 'CREDIT' ? -balance : balance);
      }, 0);

      const savingsBalance = accounts
        .filter((a) => a.type === 'SAVINGS')
        .reduce((sum, a) => sum + parseDecimal(a.balance), 0);

      const creditDebt = accounts
        .filter((a) => a.type === 'CREDIT')
        .reduce((sum, a) => sum + parseDecimal(a.balance), 0);

      const monthlyIncome = transactions
        .filter((t) => t.type === 'INCOME')
        .reduce((sum, t) => sum + parseDecimal(t.amount), 0);

      const monthlyExpenses = transactions
        .filter((t) => t.type === 'EXPENSE')
        .reduce((sum, t) => sum + parseDecimal(t.amount), 0);

      const savingsRate =
        monthlyIncome > 0 ? ((monthlyIncome - monthlyExpenses) / monthlyIncome) * 100 : 0;

      // Calculate category breakdown for 50/30/20 analysis
      const categoryTotals: Record<string, number> = {};
      transactions
        .filter((t) => t.type === 'EXPENSE')
        .forEach((t) => {
          categoryTotals[t.category] =
            (categoryTotals[t.category] || 0) + parseDecimal(t.amount);
        });

      // Needs categories (50% target)
      const needsCategories = [
        'Bills & Utilities',
        'Groceries',
        'Healthcare',
        'Transportation',
      ];
      const needsSpending = Object.entries(categoryTotals)
        .filter(([cat]) => needsCategories.includes(cat))
        .reduce((sum, [, amount]) => sum + amount, 0);

      // Wants categories (30% target)
      const wantsCategories = ['Entertainment', 'Shopping', 'Food & Dining', 'Travel'];
      const wantsSpending = Object.entries(categoryTotals)
        .filter(([cat]) => wantsCategories.includes(cat))
        .reduce((sum, [, amount]) => sum + amount, 0);

      const needsPercentage =
        monthlyIncome > 0 ? (needsSpending / monthlyIncome) * 100 : 0;
      const wantsPercentage =
        monthlyIncome > 0 ? (wantsSpending / monthlyIncome) * 100 : 0;

      // Generate advice based on analysis
      // Todo: AI generated advice could be integrated here for more personalized tips

      // 1. Savings rate advice
      if (savingsRate < 10) {
        advice.push({
          id: 'savings-low',
          type: 'SAVINGS',
          title: 'Low Savings Rate',
          description: `Your current savings rate is ${savingsRate.toFixed(1)}%. Aim to save at least 20% of your income.`,
          priority: 'HIGH',
          actionable: true,
          action: 'Review your expenses and identify areas to cut back.',
        });
      } else if (savingsRate < 20) {
        advice.push({
          id: 'savings-moderate',
          type: 'SAVINGS',
          title: 'Improve Your Savings',
          description: `You're saving ${savingsRate.toFixed(1)}% of your income. Try to reach the recommended 20%.`,
          priority: 'MEDIUM',
          actionable: true,
          action: 'Consider automating additional savings each month.',
        });
      } else {
        advice.push({
          id: 'savings-good',
          type: 'SAVINGS',
          title: 'Great Savings Rate!',
          description: `You're saving ${savingsRate.toFixed(1)}% of your income. Keep up the excellent work!`,
          priority: 'LOW',
          actionable: false,
        });
      }

      // 2. Emergency fund advice
      const monthsOfExpenses =
        monthlyExpenses > 0 ? savingsBalance / monthlyExpenses : 0;
      if (monthsOfExpenses < 3) {
        advice.push({
          id: 'emergency-fund',
          type: 'SAVINGS',
          title: 'Build Your Emergency Fund',
          description: `You have ${monthsOfExpenses.toFixed(1)} months of expenses saved. Aim for 3-6 months.`,
          priority: 'HIGH',
          actionable: true,
          action: 'Prioritize building your emergency fund before other goals.',
        });
      } else if (monthsOfExpenses < 6) {
        advice.push({
          id: 'emergency-fund-good',
          type: 'SAVINGS',
          title: 'Continue Building Emergency Fund',
          description: `You have ${monthsOfExpenses.toFixed(1)} months of expenses saved. Consider reaching 6 months.`,
          priority: 'MEDIUM',
          actionable: true,
          action: 'Continue adding to your emergency fund steadily.',
        });
      }

      // 3. Credit card debt advice
      if (creditDebt > 0) {
        advice.push({
          id: 'credit-debt',
          type: 'DEBT',
          title: 'Pay Down Credit Card Debt',
          description: `You have $${creditDebt.toFixed(2)} in credit card debt. High-interest debt should be a priority.`,
          priority: 'HIGH',
          actionable: true,
          action: 'Focus on paying more than the minimum payment each month.',
        });
      }

      // 4. 50/30/20 budget advice
      if (needsPercentage > 55) {
        advice.push({
          id: 'needs-high',
          type: 'BUDGET',
          title: 'High Essential Spending',
          description: `Your needs spending is ${needsPercentage.toFixed(1)}% of income (target: 50%). Look for ways to reduce fixed costs.`,
          priority: 'MEDIUM',
          actionable: true,
          action: 'Review subscriptions, negotiate bills, or consider housing costs.',
        });
      }

      if (wantsPercentage > 35) {
        advice.push({
          id: 'wants-high',
          type: 'BUDGET',
          title: 'High Discretionary Spending',
          description: `Your wants spending is ${wantsPercentage.toFixed(1)}% of income (target: 30%). Consider cutting back.`,
          priority: 'MEDIUM',
          actionable: true,
          action: 'Set a monthly budget for entertainment and dining out.',
        });
      }

      // 5. Investment advice
      const hasInvestmentAccount = accounts.some((a) => a.type === 'INVESTMENT');
      if (!hasInvestmentAccount && savingsRate >= 15 && monthsOfExpenses >= 3) {
        advice.push({
          id: 'start-investing',
          type: 'INVESTMENT',
          title: 'Consider Investing',
          description:
            "You have a solid savings foundation. Consider opening an investment account to grow your wealth.",
          priority: 'MEDIUM',
          actionable: true,
          action: 'Research low-cost index funds or speak with a financial advisor.',
        });
      }

      // Sort by priority
      const priorityOrder = { HIGH: 0, MEDIUM: 1, LOW: 2 };
      advice.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

      // Cache for 1 hour
      await setCache(cacheKey, advice, 3600);

      return advice;
    },

    budgetSuggestions: async (_: unknown, __: unknown, context: Context) => {
      const user = requireAuth(context);

      const { start, end } = getMonthRange();

      const transactions = await context.prisma.transaction.findMany({
        where: { userId: user.id, date: { gte: start, lte: end } },
      });

      const monthlyIncome = transactions
        .filter((t) => t.type === 'INCOME')
        .reduce((sum, t) => sum + parseDecimal(t.amount), 0);

      const categoryTotals: Record<string, number> = {};
      transactions
        .filter((t) => t.type === 'EXPENSE')
        .forEach((t) => {
          categoryTotals[t.category] =
            (categoryTotals[t.category] || 0) + parseDecimal(t.amount);
        });

      const needsCategories = [
        'Bills & Utilities',
        'Groceries',
        'Healthcare',
        'Transportation',
      ];
      const wantsCategories = ['Entertainment', 'Shopping', 'Food & Dining', 'Travel'];

      const needsSpending = Object.entries(categoryTotals)
        .filter(([cat]) => needsCategories.includes(cat))
        .reduce((sum, [, amount]) => sum + amount, 0);

      const wantsSpending = Object.entries(categoryTotals)
        .filter(([cat]) => wantsCategories.includes(cat))
        .reduce((sum, [, amount]) => sum + amount, 0);

      const totalExpenses = Object.values(categoryTotals).reduce(
        (sum, amount) => sum + amount,
        0
      );
      const savingsAmount = monthlyIncome - totalExpenses;

      return {
        needs: {
          current: needsSpending,
          target: monthlyIncome * 0.5,
          percentage: monthlyIncome > 0 ? (needsSpending / monthlyIncome) * 100 : 0,
          categories: needsCategories,
        },
        wants: {
          current: wantsSpending,
          target: monthlyIncome * 0.3,
          percentage: monthlyIncome > 0 ? (wantsSpending / monthlyIncome) * 100 : 0,
          categories: wantsCategories,
        },
        savings: {
          current: savingsAmount,
          target: monthlyIncome * 0.2,
          percentage: monthlyIncome > 0 ? (savingsAmount / monthlyIncome) * 100 : 0,
          categories: ['Savings', 'Investments'],
        },
      };
    },
  },
};
