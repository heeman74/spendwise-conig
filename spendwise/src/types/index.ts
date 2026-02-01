import { Decimal } from '@prisma/client/runtime/library';

export type AccountType = 'CHECKING' | 'SAVINGS' | 'CREDIT' | 'INVESTMENT';
export type TransactionType = 'INCOME' | 'EXPENSE' | 'TRANSFER';

export interface User {
  id: string;
  email: string;
  name: string | null;
  image: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface Account {
  id: string;
  userId: string;
  name: string;
  type: AccountType;
  balance: number;
  institution: string;
  lastSynced: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface Transaction {
  id: string;
  userId: string;
  accountId: string;
  amount: number;
  type: TransactionType;
  category: string;
  merchant: string | null;
  description: string | null;
  date: Date;
  categoryConfidence?: number | null;
  categorySource?: string | null;
  createdAt: Date;
  account?: Account;
}

export interface SavingsGoal {
  id: string;
  userId: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  deadline: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface TransactionFilters {
  search: string;
  category: string | null;
  type: TransactionType | null;
  accountId: string | null;
  startDate: Date | null;
  endDate: Date | null;
  minAmount: number | null;
  maxAmount: number | null;
}

export interface SpendingData {
  total: number;
  byCategory: CategoryAmount[];
  comparison: {
    previous: number;
    change: number;
    percentChange: number;
  };
}

export interface CategoryAmount {
  category: string;
  amount: number;
  percentage: number;
  color: string;
}

export interface TrendData {
  labels: string[];
  income: number[];
  expenses: number[];
  savings: number[];
}

export interface DashboardStats {
  totalBalance: number;
  monthlyIncome: number;
  monthlyExpenses: number;
  savingsRate: number;
  topCategories: CategoryAmount[];
}

export interface Notification {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
  timestamp: Date;
}

export interface Advice {
  id: string;
  type: 'budget' | 'savings' | 'investment' | 'debt';
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  actionable: boolean;
  action?: string;
}

export interface PaginationParams {
  page: number;
  limit: number;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}
