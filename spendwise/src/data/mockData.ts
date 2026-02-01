import type { Account, Transaction, CategoryAmount, TrendData, DashboardStats, Advice, SavingsGoal } from '@/types';
import { getCategoryColor } from '@/lib/utils';

export const mockAccounts: Account[] = [
  {
    id: 'acc_1',
    userId: 'user_1',
    name: 'Primary Checking',
    type: 'CHECKING',
    balance: 5432.50,
    institution: 'Chase Bank',
    lastSynced: new Date('2024-01-15'),
    createdAt: new Date('2023-01-01'),
    updatedAt: new Date('2024-01-15'),
  },
  {
    id: 'acc_2',
    userId: 'user_1',
    name: 'High-Yield Savings',
    type: 'SAVINGS',
    balance: 15000.00,
    institution: 'Marcus by Goldman Sachs',
    lastSynced: new Date('2024-01-15'),
    createdAt: new Date('2023-01-01'),
    updatedAt: new Date('2024-01-15'),
  },
  {
    id: 'acc_3',
    userId: 'user_1',
    name: 'Rewards Credit Card',
    type: 'CREDIT',
    balance: -1250.75,
    institution: 'American Express',
    lastSynced: new Date('2024-01-15'),
    createdAt: new Date('2023-06-01'),
    updatedAt: new Date('2024-01-15'),
  },
  {
    id: 'acc_4',
    userId: 'user_1',
    name: 'Investment Portfolio',
    type: 'INVESTMENT',
    balance: 45000.00,
    institution: 'Fidelity',
    lastSynced: new Date('2024-01-14'),
    createdAt: new Date('2022-01-01'),
    updatedAt: new Date('2024-01-14'),
  },
];

const categories = [
  'Food & Dining',
  'Shopping',
  'Transportation',
  'Bills & Utilities',
  'Entertainment',
  'Healthcare',
  'Travel',
  'Education',
  'Personal Care',
];

function generateTransactions(count: number): Transaction[] {
  const transactions: Transaction[] = [];
  const now = new Date();

  for (let i = 0; i < count; i++) {
    const daysAgo = Math.floor(Math.random() * 90);
    const date = new Date(now);
    date.setDate(date.getDate() - daysAgo);

    const isIncome = Math.random() < 0.2;
    const isTransfer = !isIncome && Math.random() < 0.1;

    const category = isIncome ? 'Income' : isTransfer ? 'Transfer' : categories[Math.floor(Math.random() * categories.length)];
    const account = mockAccounts[Math.floor(Math.random() * mockAccounts.length)];

    const merchants: Record<string, string[]> = {
      'Food & Dining': ['Starbucks', 'Chipotle', 'Whole Foods', 'DoorDash', 'Uber Eats'],
      'Shopping': ['Amazon', 'Target', 'Walmart', 'Best Buy', 'Nike'],
      'Transportation': ['Shell', 'Uber', 'Lyft', 'Metro Transit', 'Chevron'],
      'Bills & Utilities': ['Electric Co', 'Water Utility', 'Internet Provider', 'Phone Bill', 'Gas Company'],
      'Entertainment': ['Netflix', 'Spotify', 'AMC Theaters', 'Steam', 'PlayStation'],
      'Healthcare': ['CVS Pharmacy', 'Walgreens', 'Doctor Visit', 'Dental Care', 'Vision Center'],
      'Travel': ['United Airlines', 'Marriott', 'Airbnb', 'Expedia', 'Hertz'],
      'Education': ['Udemy', 'Coursera', 'Books Store', 'School Fees', 'Skillshare'],
      'Personal Care': ['Salon', 'Gym Membership', 'Spa', 'Barber Shop', 'Cosmetics Store'],
      'Income': ['Paycheck', 'Freelance', 'Dividend', 'Bonus', 'Refund'],
      'Transfer': ['Bank Transfer', 'Savings Transfer', 'Investment Transfer'],
    };

    const categoryMerchants = merchants[category] || ['Unknown'];
    const merchant = categoryMerchants[Math.floor(Math.random() * categoryMerchants.length)];

    let amount: number;
    if (isIncome) {
      amount = Math.round((Math.random() * 4000 + 1000) * 100) / 100;
    } else if (isTransfer) {
      amount = Math.round((Math.random() * 500 + 100) * 100) / 100;
    } else {
      amount = Math.round((Math.random() * 200 + 5) * 100) / 100;
    }

    transactions.push({
      id: `txn_${i + 1}`,
      userId: 'user_1',
      accountId: account.id,
      amount,
      type: isIncome ? 'INCOME' : isTransfer ? 'TRANSFER' : 'EXPENSE',
      category,
      merchant,
      description: null,
      date,
      createdAt: date,
      account,
    });
  }

  return transactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

export const mockTransactions = generateTransactions(100);

export function getSpendingByCategory(): CategoryAmount[] {
  const spending: Record<string, number> = {};

  mockTransactions
    .filter(t => t.type === 'EXPENSE')
    .forEach(t => {
      spending[t.category] = (spending[t.category] || 0) + t.amount;
    });

  const total = Object.values(spending).reduce((sum, val) => sum + val, 0);

  return Object.entries(spending)
    .map(([category, amount]) => ({
      category,
      amount,
      percentage: (amount / total) * 100,
      color: getCategoryColor(category),
    }))
    .sort((a, b) => b.amount - a.amount);
}

export function getTrendData(): TrendData {
  const months = ['Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar'];
  const income: number[] = [];
  const expenses: number[] = [];
  const savings: number[] = [];

  months.forEach((_, i) => {
    const monthIncome = 5000 + Math.random() * 2000;
    const monthExpenses = 3000 + Math.random() * 1500;
    income.push(Math.round(monthIncome));
    expenses.push(Math.round(monthExpenses));
    savings.push(Math.round(monthIncome - monthExpenses));
  });

  return { labels: months, income, expenses, savings };
}

export function getDashboardStats(): DashboardStats {
  const totalBalance = mockAccounts.reduce((sum, acc) => sum + acc.balance, 0);

  const thisMonth = new Date();
  const thisMonthStart = new Date(thisMonth.getFullYear(), thisMonth.getMonth(), 1);

  const monthlyTransactions = mockTransactions.filter(t => new Date(t.date) >= thisMonthStart);

  const monthlyIncome = monthlyTransactions
    .filter(t => t.type === 'INCOME')
    .reduce((sum, t) => sum + t.amount, 0);

  const monthlyExpenses = monthlyTransactions
    .filter(t => t.type === 'EXPENSE')
    .reduce((sum, t) => sum + t.amount, 0);

  const savingsRate = monthlyIncome > 0
    ? Math.round(((monthlyIncome - monthlyExpenses) / monthlyIncome) * 100)
    : 0;

  return {
    totalBalance,
    monthlyIncome,
    monthlyExpenses,
    savingsRate,
    topCategories: getSpendingByCategory().slice(0, 5),
  };
}

export const mockAdvice: Advice[] = [
  {
    id: 'adv_1',
    type: 'budget',
    title: 'High Restaurant Spending',
    description: 'Your dining out expenses are 35% above your monthly average. Consider cooking more meals at home to save money.',
    priority: 'medium',
    actionable: true,
    action: 'View Dining Expenses',
  },
  {
    id: 'adv_2',
    type: 'savings',
    title: 'Emergency Fund Progress',
    description: "You've saved 4 months of expenses. Keep going to reach the recommended 6 months!",
    priority: 'low',
    actionable: true,
    action: 'View Savings Goal',
  },
  {
    id: 'adv_3',
    type: 'investment',
    title: 'Consider Index Funds',
    description: 'Based on your savings rate and risk profile, you might benefit from low-cost index fund investments.',
    priority: 'medium',
    actionable: true,
    action: 'Learn More',
  },
  {
    id: 'adv_4',
    type: 'debt',
    title: 'Credit Card Balance',
    description: 'Pay off your credit card balance to avoid interest charges. Consider setting up automatic payments.',
    priority: 'high',
    actionable: true,
    action: 'Set Up Auto-Pay',
  },
];

export const mockSavingsGoals: SavingsGoal[] = [
  {
    id: 'goal_1',
    userId: 'user_1',
    name: 'Emergency Fund',
    targetAmount: 20000,
    currentAmount: 15000,
    deadline: new Date('2024-12-31'),
    createdAt: new Date('2023-01-01'),
    updatedAt: new Date('2024-01-15'),
  },
  {
    id: 'goal_2',
    userId: 'user_1',
    name: 'Vacation Fund',
    targetAmount: 5000,
    currentAmount: 2500,
    deadline: new Date('2024-06-01'),
    createdAt: new Date('2023-06-01'),
    updatedAt: new Date('2024-01-15'),
  },
  {
    id: 'goal_3',
    userId: 'user_1',
    name: 'New Car',
    targetAmount: 30000,
    currentAmount: 8000,
    deadline: new Date('2025-12-31'),
    createdAt: new Date('2023-01-01'),
    updatedAt: new Date('2024-01-15'),
  },
];

export function getBudgetSuggestions(monthlyIncome: number) {
  const expenses = mockTransactions.filter(t => t.type === 'EXPENSE');

  const needsCategories = ['Bills & Utilities', 'Healthcare', 'Transportation'];
  const wantsCategories = ['Food & Dining', 'Shopping', 'Entertainment', 'Travel', 'Personal Care'];

  const needsTotal = expenses
    .filter(t => needsCategories.includes(t.category))
    .reduce((sum, t) => sum + t.amount, 0) / 3; // Monthly average

  const wantsTotal = expenses
    .filter(t => wantsCategories.includes(t.category))
    .reduce((sum, t) => sum + t.amount, 0) / 3;

  const savingsTotal = monthlyIncome - needsTotal - wantsTotal;

  return {
    needs: {
      current: needsTotal,
      target: monthlyIncome * 0.5,
      categories: needsCategories,
    },
    wants: {
      current: wantsTotal,
      target: monthlyIncome * 0.3,
      categories: wantsCategories,
    },
    savings: {
      current: savingsTotal,
      target: monthlyIncome * 0.2,
    },
  };
}

export function getInvestmentTips(monthlyExpenses: number, savingsBalance: number, age: number = 30) {
  const recommendedEmergencyFund = monthlyExpenses * 6;
  const monthsOfExpenses = savingsBalance / monthlyExpenses;

  const creditAccount = mockAccounts.find(a => a.type === 'CREDIT');
  const totalDebt = creditAccount ? Math.abs(creditAccount.balance) : 0;

  // Age-based allocation (simplified)
  const stockAllocation = Math.max(100 - age, 50);
  const bondAllocation = Math.min(age - 10, 40);
  const cashAllocation = 100 - stockAllocation - bondAllocation;

  let debtRecommendation = '';
  if (totalDebt > 0) {
    if (totalDebt > monthlyExpenses) {
      debtRecommendation = 'Focus on paying down high-interest debt before investing. Consider the avalanche or snowball method.';
    } else {
      debtRecommendation = 'Your debt is manageable. Consider paying it off while still contributing to savings.';
    }
  } else {
    debtRecommendation = 'Great! You have no outstanding debt. Focus on building your investment portfolio.';
  }

  return {
    emergencyFund: {
      current: savingsBalance,
      recommended: recommendedEmergencyFund,
      monthsOfExpenses,
    },
    debtStrategy: {
      totalDebt,
      recommendation: debtRecommendation,
    },
    allocation: {
      stocks: stockAllocation,
      bonds: bondAllocation,
      cash: cashAllocation,
    },
  };
}
