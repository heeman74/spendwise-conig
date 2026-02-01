import { gql } from 'graphql-tag';

export const adviceTypeDefs = gql`
  enum AdviceType {
    BUDGET
    SAVINGS
    INVESTMENT
    DEBT
    GENERAL
  }

  enum AdvicePriority {
    HIGH
    MEDIUM
    LOW
  }

  type Advice {
    id: ID!
    type: AdviceType!
    title: String!
    description: String!
    priority: AdvicePriority!
    actionable: Boolean!
    action: String
  }

  type BudgetSuggestion {
    needs: BudgetCategory!
    wants: BudgetCategory!
    savings: BudgetCategory!
  }

  type BudgetCategory {
    current: Decimal!
    target: Decimal!
    percentage: Float!
    categories: [String!]
  }

  extend type Query {
    advice: [Advice!]!
    budgetSuggestions: BudgetSuggestion!
  }
`;
