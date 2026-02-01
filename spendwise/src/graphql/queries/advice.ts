import { gql } from '@apollo/client';

export const GET_ADVICE = gql`
  query GetAdvice {
    advice {
      id
      type
      title
      description
      priority
      actionable
      action
    }
  }
`;

export const GET_BUDGET_SUGGESTIONS = gql`
  query GetBudgetSuggestions {
    budgetSuggestions {
      needs {
        current
        target
        percentage
        categories
      }
      wants {
        current
        target
        percentage
        categories
      }
      savings {
        current
        target
        percentage
        categories
      }
    }
  }
`;
