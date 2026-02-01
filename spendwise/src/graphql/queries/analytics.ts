import { gql } from '@apollo/client';
import {
  TRANSACTION_FRAGMENT,
  ACCOUNT_FRAGMENT,
  SAVINGS_GOAL_FRAGMENT,
  CATEGORY_AMOUNT_FRAGMENT,
} from '../fragments';

export const GET_DASHBOARD_STATS = gql`
  ${TRANSACTION_FRAGMENT}
  ${ACCOUNT_FRAGMENT}
  ${SAVINGS_GOAL_FRAGMENT}
  ${CATEGORY_AMOUNT_FRAGMENT}
  query GetDashboardStats {
    dashboardStats {
      totalBalance
      monthlyIncome
      monthlyExpenses
      savingsRate
      accountCount
      topCategories {
        ...CategoryAmountFields
      }
      recentTransactions {
        ...TransactionFields
        account {
          ...AccountFields
        }
      }
      savingsGoals {
        ...SavingsGoalFields
      }
    }
  }
`;

export const GET_ANALYTICS = gql`
  ${CATEGORY_AMOUNT_FRAGMENT}
  query GetAnalytics($period: Period) {
    analytics(period: $period) {
      period
      dateRange {
        start
        end
      }
      summary {
        totalIncome
        totalExpenses
        netSavings
        savingsRate
        transactionCount
        averageTransaction
      }
      categoryBreakdown {
        ...CategoryAmountFields
      }
      trends {
        labels
        income
        expenses
        savings
      }
      comparison {
        previousPeriod {
          totalIncome
          totalExpenses
          netSavings
          savingsRate
          transactionCount
          averageTransaction
        }
        incomeChange
        expensesChange
        savingsChange
      }
    }
  }
`;

export const GET_SPENDING_BY_CATEGORY = gql`
  ${CATEGORY_AMOUNT_FRAGMENT}
  query GetSpendingByCategory($period: Period) {
    spendingByCategory(period: $period) {
      ...CategoryAmountFields
    }
  }
`;
