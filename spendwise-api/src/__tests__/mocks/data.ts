// Mock data for testing
export const mockUser = {
  id: 'user-123',
  email: 'test@example.com',
  name: 'Test User',
  password: '$2a$10$abcdefghijklmnopqrstuvwxyz123456', // hashed 'password123'
  image: null,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
};

export const mockAccounts = [
  {
    id: 'acc-1',
    userId: 'user-123',
    name: 'Checking Account',
    type: 'CHECKING',
    balance: 5000.0,
    institution: 'Chase Bank',
    lastSynced: new Date('2024-01-15'),
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-15'),
  },
  {
    id: 'acc-2',
    userId: 'user-123',
    name: 'Savings Account',
    type: 'SAVINGS',
    balance: 15000.0,
    institution: 'Marcus',
    lastSynced: new Date('2024-01-15'),
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-15'),
  },
  {
    id: 'acc-3',
    userId: 'user-123',
    name: 'Credit Card',
    type: 'CREDIT',
    balance: -1250.75,
    institution: 'Amex',
    lastSynced: new Date('2024-01-15'),
    createdAt: new Date('2024-06-01'),
    updatedAt: new Date('2024-01-15'),
  },
];

export const mockTransactions = [
  {
    id: 'txn-1',
    userId: 'user-123',
    accountId: 'acc-1',
    amount: 150.0,
    type: 'EXPENSE',
    category: 'Food & Dining',
    merchant: 'Whole Foods',
    description: 'Weekly groceries',
    date: new Date('2024-01-14'),
    createdAt: new Date('2024-01-14'),
    account: mockAccounts[0],
  },
  {
    id: 'txn-2',
    userId: 'user-123',
    accountId: 'acc-1',
    amount: 5000.0,
    type: 'INCOME',
    category: 'Income',
    merchant: 'Employer Inc',
    description: 'Monthly salary',
    date: new Date('2024-01-01'),
    createdAt: new Date('2024-01-01'),
    account: mockAccounts[0],
  },
  {
    id: 'txn-3',
    userId: 'user-123',
    accountId: 'acc-3',
    amount: 75.0,
    type: 'EXPENSE',
    category: 'Entertainment',
    merchant: 'Netflix',
    description: 'Streaming subscription',
    date: new Date('2024-01-10'),
    createdAt: new Date('2024-01-10'),
    account: mockAccounts[2],
  },
];

export const mockSavingsGoals = [
  {
    id: 'goal-1',
    userId: 'user-123',
    name: 'Emergency Fund',
    targetAmount: 20000.0,
    currentAmount: 15000.0,
    deadline: new Date('2024-12-31'),
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-15'),
  },
  {
    id: 'goal-2',
    userId: 'user-123',
    name: 'Vacation Fund',
    targetAmount: 5000.0,
    currentAmount: 2500.0,
    deadline: new Date('2024-06-01'),
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-15'),
  },
];

export const mockContext = {
  user: {
    id: 'user-123',
    email: 'test@example.com',
    name: 'Test User',
    image: null,
  },
};

export const mockUnauthenticatedContext = {
  user: null,
};
