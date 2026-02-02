import { gql } from '@apollo/client';

export const GET_RECURRING = gql`
  query GetRecurring($filters: RecurringFiltersInput, $sort: RecurringSortInput, $dismissed: Boolean) {
    recurring(filters: $filters, sort: $sort, dismissed: $dismissed) {
      id
      description
      merchantName
      category
      frequency
      isActive
      isDismissed
      lastAmount
      averageAmount
      lastDate
      firstDate
      nextExpectedDate
      status
      transactionIds
      createdAt
      updatedAt
    }
  }
`;

export const GET_RECURRING_SUMMARY = gql`
  query GetRecurringSummary {
    recurringSummary {
      totalRecurringExpenses
      totalRecurringIncome
      netRecurring
      activeCount
      incomeRatio
    }
  }
`;
