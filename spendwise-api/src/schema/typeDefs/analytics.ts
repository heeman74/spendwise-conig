import { gql } from 'graphql-tag';

export const analyticsTypeDefs = gql`
  type Analytics {
    period: Period!
    dateRange: DateRange!
    summary: FinancialSummary!
    categoryBreakdown: [CategoryAmount!]!
    trends: TrendData!
    comparison: PeriodComparison!
  }

  type DateRange {
    start: DateTime!
    end: DateTime!
  }

  type FinancialSummary {
    totalIncome: Decimal!
    totalExpenses: Decimal!
    netSavings: Decimal!
    savingsRate: Float!
    transactionCount: Int!
    averageTransaction: Decimal!
  }

  type CategoryAmount {
    category: String!
    amount: Decimal!
    percentage: Float!
    color: String!
    transactionCount: Int!
  }

  type TrendData {
    labels: [String!]!
    income: [Decimal!]!
    expenses: [Decimal!]!
    savings: [Decimal!]!
  }

  type PeriodComparison {
    previousPeriod: FinancialSummary!
    incomeChange: Float!
    expensesChange: Float!
    savingsChange: Float!
  }

  type DashboardStats {
    totalBalance: Decimal!
    monthlyIncome: Decimal!
    monthlyExpenses: Decimal!
    savingsRate: Float!
    accountCount: Int!
    topCategories: [CategoryAmount!]!
    recentTransactions: [Transaction!]!
    savingsGoals: [SavingsGoal!]!
  }

  input DateRangeInput {
    start: DateTime!
    end: DateTime!
  }

  type MerchantStats {
    merchant: String!
    totalAmount: Decimal!
    transactionCount: Int!
    averageAmount: Decimal!
    categoryBreakdown: [CategoryAmount!]!
  }

  extend type Query {
    analytics(period: Period = MONTH, dateRange: DateRangeInput, accountIds: [ID!]): Analytics!
    dashboardStats: DashboardStats!
    spendingByCategory(period: Period = MONTH, dateRange: DateRangeInput, accountIds: [ID!]): [CategoryAmount!]!
    topMerchants(dateRange: DateRangeInput, accountIds: [ID!], limit: Int = 10): [MerchantStats!]!
  }
`;
