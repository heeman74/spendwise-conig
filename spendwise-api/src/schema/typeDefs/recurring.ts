import { gql } from 'graphql-tag';

export const recurringTypeDefs = gql`
  type RecurringTransaction {
    id: ID!
    userId: ID!
    description: String!
    merchantName: String!
    category: String!
    frequency: String!
    isActive: Boolean!
    isDismissed: Boolean!
    lastAmount: Decimal!
    averageAmount: Decimal!
    lastDate: DateTime!
    firstDate: DateTime!
    nextExpectedDate: DateTime!
    status: String!
    transactionIds: [String!]!
    createdAt: DateTime!
    updatedAt: DateTime!
  }

  type RecurringSummary {
    totalRecurringExpenses: Float!
    totalRecurringIncome: Float!
    netRecurring: Float!
    activeCount: Int!
    incomeRatio: Float
  }

  input RecurringFiltersInput {
    frequency: String
    category: String
    type: String
  }

  input RecurringSortInput {
    field: String!
    order: String!
  }

  input AddRecurringInput {
    merchantName: String!
    amount: Float!
    frequency: String!
    category: String!
    description: String
    firstDate: DateTime!
  }

  input UpdateRecurringInput {
    merchantName: String
    amount: Float
    frequency: String
    category: String
    description: String
  }

  extend type Query {
    recurring(filters: RecurringFiltersInput, sort: RecurringSortInput, dismissed: Boolean): [RecurringTransaction!]!
    recurringSummary: RecurringSummary!
  }

  extend type Mutation {
    updateRecurring(id: ID!, input: UpdateRecurringInput!): RecurringTransaction!
    dismissRecurring(id: ID!): RecurringTransaction!
    restoreRecurring(id: ID!): RecurringTransaction!
    addRecurring(input: AddRecurringInput!): RecurringTransaction!
    detectRecurring: Int!
  }
`;
