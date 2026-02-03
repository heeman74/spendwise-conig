import { PrismaClient } from '@prisma/client';
import { subMonths } from 'date-fns';
import { parseDecimal } from '../../lib/utils';

export interface FinancialSummary {
  timeframe: {
    start: string;
    end: string;
    months: number;
  };
  income: {
    total: number;
    monthly_average: number;
    top_sources: Array<{ category: string; amount: number }>;
  };
  expenses: {
    total: number;
    monthly_average: number;
    by_category: Array<{ category: string; amount: number; percentage: number }>;
    top_merchants: Array<{ merchant: string; amount: number; category: string }>;
  };
  accounts: {
    checking_balance: number;
    savings_balance: number;
    credit_debt: number;
    investment_value: number;
    net_worth: number;
  };
  recurring: {
    active_subscriptions: number;
    monthly_recurring_cost: number;
    top_recurring: Array<{ merchant: string; frequency: string; amount: number }>;
  };
  net_worth_trend: {
    current: number;
    six_months_ago: number;
    change_amount: number;
    change_percentage: number;
  };
  investments: {
    total_value: number;
    holdings: Array<{ symbol: string; value: number; percentage: number }>;
    asset_allocation: Array<{ type: string; value: number; percentage: number }>;
  };
  savings_goals: Array<{
    name: string;
    target: number;
    current: number;
    progress_percentage: number;
    deadline: string | null;
  }>;
  behavioral_patterns: {
    average_transaction_size: number;
    spending_variability: string; // "stable", "moderate", "high"
    top_spending_day_of_week: string;
  };
}

export async function buildFinancialSummary(
  prisma: PrismaClient,
  userId: string
): Promise<FinancialSummary> {
  // Use the user's most recent transaction date as the end date,
  // falling back to today if no transactions exist
  const latestTransaction = await prisma.transaction.findFirst({
    where: { userId },
    orderBy: { date: 'desc' },
    select: { date: true },
  });
  const endDate = latestTransaction?.date ?? new Date();
  const startDate = subMonths(endDate, 6);

  // Parallel queries for all financial data
  const [
    accounts,
    transactions,
    recurringTransactions,
    netWorthSnapshots,
    savingsGoals,
    holdings,
  ] = await Promise.all([
    prisma.account.findMany({
      where: { userId, includeInNetWorth: true },
    }),
    prisma.transaction.findMany({
      where: {
        userId,
        date: { gte: startDate, lte: endDate },
      },
      orderBy: { date: 'desc' },
    }),
    prisma.recurringTransaction.findMany({
      where: { userId, isActive: true },
    }),
    prisma.netWorthSnapshot.findMany({
      where: {
        userId,
        date: { gte: startDate, lte: endDate },
      },
      include: { account: true },
      orderBy: { date: 'asc' },
    }),
    prisma.savingsGoal.findMany({
      where: { userId },
    }),
    prisma.investmentHolding.findMany({
      where: { account: { userId } },
      include: { security: true },
    }),
  ]);

  // Calculate account balances by type
  const checkingBalance = accounts
    .filter((a) => a.type === 'CHECKING')
    .reduce((sum, a) => sum + parseDecimal(a.balance), 0);

  const savingsBalance = accounts
    .filter((a) => a.type === 'SAVINGS')
    .reduce((sum, a) => sum + parseDecimal(a.balance), 0);

  const creditDebt = accounts
    .filter((a) => a.type === 'CREDIT')
    .reduce((sum, a) => sum + parseDecimal(a.balance), 0);

  const investmentValue = accounts
    .filter((a) => a.type === 'INVESTMENT')
    .reduce((sum, a) => sum + parseDecimal(a.balance), 0);

  const netWorth = checkingBalance + savingsBalance + investmentValue - creditDebt;

  // Income analysis
  const incomeTransactions = transactions.filter((t) => t.type === 'INCOME');
  const totalIncome = incomeTransactions.reduce((sum, t) => sum + parseDecimal(t.amount), 0);
  const monthlyAverageIncome = totalIncome / 6;

  const incomeByCategory: Record<string, number> = {};
  incomeTransactions.forEach((t) => {
    incomeByCategory[t.category] = (incomeByCategory[t.category] || 0) + parseDecimal(t.amount);
  });
  const topIncomeSources = Object.entries(incomeByCategory)
    .map(([category, amount]) => ({ category, amount }))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 3);

  // Expense analysis
  const expenseTransactions = transactions.filter((t) => t.type === 'EXPENSE');
  const totalExpenses = expenseTransactions.reduce((sum, t) => sum + parseDecimal(t.amount), 0);
  const monthlyAverageExpenses = totalExpenses / 6;

  const expenseByCategory: Record<string, number> = {};
  expenseTransactions.forEach((t) => {
    expenseByCategory[t.category] = (expenseByCategory[t.category] || 0) + parseDecimal(t.amount);
  });

  const expenseCategoryArray = Object.entries(expenseByCategory)
    .map(([category, amount]) => ({
      category,
      amount,
      percentage: (amount / totalExpenses) * 100,
    }))
    .sort((a, b) => b.amount - a.amount);

  // Top merchants
  const merchantTotals: Record<string, { amount: number; category: string }> = {};
  expenseTransactions.forEach((t) => {
    const merchant = t.merchant || 'Unknown';
    if (!merchantTotals[merchant]) {
      merchantTotals[merchant] = { amount: 0, category: t.category };
    }
    merchantTotals[merchant].amount += parseDecimal(t.amount);
  });

  const topMerchants = Object.entries(merchantTotals)
    .map(([merchant, data]) => ({ merchant, amount: data.amount, category: data.category }))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 10);

  // Recurring transactions summary
  const monthlyRecurringCost = recurringTransactions
    .filter((r) => r.frequency === 'MONTHLY')
    .reduce((sum, r) => sum + parseDecimal(r.averageAmount), 0);

  const topRecurring = recurringTransactions
    .sort((a, b) => parseDecimal(b.averageAmount) - parseDecimal(a.averageAmount))
    .slice(0, 5)
    .map((r) => ({
      merchant: r.merchantName || 'Unknown',
      frequency: r.frequency,
      amount: parseDecimal(r.averageAmount),
    }));

  // Net worth trend
  const latestNetWorthByAccount: Record<string, number> = {};
  const oldestNetWorthByAccount: Record<string, number> = {};

  netWorthSnapshots.forEach((snapshot) => {
    const accountId = snapshot.accountId;
    const balance = parseDecimal(snapshot.balance);
    const date = snapshot.date.getTime();

    if (!latestNetWorthByAccount[accountId] || date > latestNetWorthByAccount[accountId]) {
      latestNetWorthByAccount[accountId] = balance;
    }

    if (!oldestNetWorthByAccount[accountId] || date < oldestNetWorthByAccount[accountId]) {
      oldestNetWorthByAccount[accountId] = balance;
    }
  });

  const currentNetWorth = Object.values(latestNetWorthByAccount).reduce((sum, val) => sum + val, 0);
  const sixMonthsAgoNetWorth = Object.values(oldestNetWorthByAccount).reduce(
    (sum, val) => sum + val,
    0
  );
  const netWorthChange = currentNetWorth - sixMonthsAgoNetWorth;
  const netWorthChangePercentage =
    sixMonthsAgoNetWorth !== 0 ? (netWorthChange / sixMonthsAgoNetWorth) * 100 : 0;

  // Investment holdings analysis
  const totalInvestmentValue = holdings.reduce(
    (sum, h) => sum + parseDecimal(h.institutionValue),
    0
  );

  const holdingsBySymbol = holdings.map((h) => ({
    symbol: h.security.tickerSymbol || h.security.name,
    value: parseDecimal(h.institutionValue),
    percentage: (parseDecimal(h.institutionValue) / totalInvestmentValue) * 100,
  }));

  // Asset allocation by type
  const assetAllocation: Record<string, number> = {};
  holdings.forEach((h) => {
    const type = h.security.type;
    assetAllocation[type] = (assetAllocation[type] || 0) + parseDecimal(h.institutionValue);
  });

  const assetAllocationArray = Object.entries(assetAllocation).map(([type, value]) => ({
    type,
    value,
    percentage: (value / totalInvestmentValue) * 100,
  }));

  // Savings goals
  const goalsArray = savingsGoals.map((g) => ({
    name: g.name,
    target: parseDecimal(g.targetAmount),
    current: parseDecimal(g.currentAmount),
    progress_percentage: (parseDecimal(g.currentAmount) / parseDecimal(g.targetAmount)) * 100,
    deadline: g.deadline ? g.deadline.toISOString().split('T')[0] : null,
  }));

  // Behavioral patterns
  const avgTransactionSize =
    expenseTransactions.length > 0 ? totalExpenses / expenseTransactions.length : 0;

  // Calculate spending variability (coefficient of variation)
  const monthlySpending: number[] = [];
  for (let i = 0; i < 6; i++) {
    const monthStart = subMonths(endDate, i + 1);
    const monthEnd = subMonths(endDate, i);
    const monthExpenses = expenseTransactions
      .filter((t) => t.date >= monthStart && t.date < monthEnd)
      .reduce((sum, t) => sum + parseDecimal(t.amount), 0);
    monthlySpending.push(monthExpenses);
  }

  const avgMonthlySpending =
    monthlySpending.reduce((sum, val) => sum + val, 0) / monthlySpending.length;
  const variance =
    monthlySpending.reduce((sum, val) => sum + Math.pow(val - avgMonthlySpending, 2), 0) /
    monthlySpending.length;
  const stdDev = Math.sqrt(variance);
  const coefficientOfVariation = avgMonthlySpending !== 0 ? stdDev / avgMonthlySpending : 0;

  const spendingVariability =
    coefficientOfVariation < 0.15 ? 'stable' : coefficientOfVariation < 0.3 ? 'moderate' : 'high';

  // Top spending day of week
  const dayOfWeekSpending: Record<string, number> = {
    Sunday: 0,
    Monday: 0,
    Tuesday: 0,
    Wednesday: 0,
    Thursday: 0,
    Friday: 0,
    Saturday: 0,
  };
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  expenseTransactions.forEach((t) => {
    const dayName = dayNames[t.date.getDay()];
    dayOfWeekSpending[dayName] += parseDecimal(t.amount);
  });

  const topSpendingDay = Object.entries(dayOfWeekSpending).sort((a, b) => b[1] - a[1])[0][0];

  return {
    timeframe: {
      start: startDate.toISOString().split('T')[0],
      end: endDate.toISOString().split('T')[0],
      months: 6,
    },
    income: {
      total: totalIncome,
      monthly_average: monthlyAverageIncome,
      top_sources: topIncomeSources,
    },
    expenses: {
      total: totalExpenses,
      monthly_average: monthlyAverageExpenses,
      by_category: expenseCategoryArray,
      top_merchants: topMerchants,
    },
    accounts: {
      checking_balance: checkingBalance,
      savings_balance: savingsBalance,
      credit_debt: creditDebt,
      investment_value: investmentValue,
      net_worth: netWorth,
    },
    recurring: {
      active_subscriptions: recurringTransactions.length,
      monthly_recurring_cost: monthlyRecurringCost,
      top_recurring: topRecurring,
    },
    net_worth_trend: {
      current: currentNetWorth,
      six_months_ago: sixMonthsAgoNetWorth,
      change_amount: netWorthChange,
      change_percentage: netWorthChangePercentage,
    },
    investments: {
      total_value: totalInvestmentValue,
      holdings: holdingsBySymbol,
      asset_allocation: assetAllocationArray,
    },
    savings_goals: goalsArray,
    behavioral_patterns: {
      average_transaction_size: avgTransactionSize,
      spending_variability: spendingVariability,
      top_spending_day_of_week: topSpendingDay,
    },
  };
}
