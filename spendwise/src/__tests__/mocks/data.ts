// Mock data for frontend tests

export const mockUser = {
  id: 'user-123',
  email: 'test@example.com',
  name: 'Test User',
  image: null,
};

export const mockSession = {
  user: mockUser,
  accessToken: 'mock-jwt-token',
  expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
};

export const mockAccounts = [
  {
    id: 'acc-1',
    name: 'Checking Account',
    type: 'CHECKING',
    balance: 5000.0,
    institution: 'Chase Bank',
    lastSynced: new Date('2024-01-15'),
  },
  {
    id: 'acc-2',
    name: 'Savings Account',
    type: 'SAVINGS',
    balance: 15000.0,
    institution: 'Marcus',
    lastSynced: new Date('2024-01-15'),
  },
  {
    id: 'acc-3',
    name: 'Credit Card',
    type: 'CREDIT',
    balance: -1250.75,
    institution: 'Amex',
    lastSynced: new Date('2024-01-15'),
  },
];

export const mockTransactions = [
  {
    id: 'txn-1',
    accountId: 'acc-1',
    amount: 150.0,
    type: 'EXPENSE',
    category: 'Food & Dining',
    merchant: 'Whole Foods',
    description: 'Weekly groceries',
    date: new Date('2024-01-14'),
    account: mockAccounts[0],
  },
  {
    id: 'txn-2',
    accountId: 'acc-1',
    amount: 5000.0,
    type: 'INCOME',
    category: 'Income',
    merchant: 'Employer Inc',
    description: 'Monthly salary',
    date: new Date('2024-01-01'),
    account: mockAccounts[0],
  },
  {
    id: 'txn-3',
    accountId: 'acc-3',
    amount: 75.0,
    type: 'EXPENSE',
    category: 'Entertainment',
    merchant: 'Netflix',
    description: 'Streaming subscription',
    date: new Date('2024-01-10'),
    account: mockAccounts[2],
  },
];

export const mockDashboardStats = {
  totalBalance: 18749.25,
  monthlyIncome: 5000,
  monthlyExpenses: 2500,
  savingsRate: 50,
  topCategories: [
    { category: 'Food & Dining', amount: 800, percentage: 32, color: '#10B981' },
    { category: 'Entertainment', amount: 500, percentage: 20, color: '#6366F1' },
    { category: 'Shopping', amount: 400, percentage: 16, color: '#F59E0B' },
    { category: 'Transportation', amount: 300, percentage: 12, color: '#EF4444' },
    { category: 'Bills & Utilities', amount: 500, percentage: 20, color: '#8B5CF6' },
  ],
  recentTransactions: mockTransactions.slice(0, 5),
};

export const mockSavingsGoals = [
  {
    id: 'goal-1',
    name: 'Emergency Fund',
    targetAmount: 20000.0,
    currentAmount: 15000.0,
    deadline: new Date('2024-12-31'),
  },
  {
    id: 'goal-2',
    name: 'Vacation Fund',
    targetAmount: 5000.0,
    currentAmount: 2500.0,
    deadline: new Date('2024-06-01'),
  },
];

export const mockAdvice = [
  {
    id: 'adv-1',
    type: 'budget',
    title: 'High Restaurant Spending',
    description: 'Your dining out expenses are 35% above your monthly average.',
    priority: 'medium',
    actionable: true,
    action: 'View Dining Expenses',
  },
  {
    id: 'adv-2',
    type: 'savings',
    title: 'Emergency Fund Progress',
    description: "You've saved 4 months of expenses. Keep going!",
    priority: 'low',
    actionable: true,
    action: 'View Savings Goal',
  },
];

// Mock GraphQL response wrappers
export const mockTransactionsQueryResponse = {
  transactions: {
    edges: mockTransactions.map((t, i) => ({
      node: t,
      cursor: Buffer.from(`${i}`).toString('base64'),
    })),
    pageInfo: {
      hasNextPage: false,
      hasPreviousPage: false,
      totalCount: mockTransactions.length,
      totalPages: 1,
    },
  },
};

export const mockAccountsQueryResponse = {
  accounts: mockAccounts,
};

export const mockDashboardStatsQueryResponse = {
  dashboardStats: mockDashboardStats,
};
