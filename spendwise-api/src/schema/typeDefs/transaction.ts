import { gql } from 'graphql-tag';

export const transactionTypeDefs = gql`
  type Transaction {
    id: ID!
    userId: String!
    accountId: String!
    account: Account!
    amount: Decimal!
    type: TransactionType!
    category: String!
    merchant: String
    description: String
    date: DateTime!
    categoryConfidence: Int
    categorySource: String
    createdAt: DateTime!
  }

  type TransactionConnection {
    edges: [TransactionEdge!]!
    pageInfo: PageInfo!
  }

  type TransactionEdge {
    node: Transaction!
    cursor: String!
  }

  input TransactionFilterInput {
    search: String
    category: String
    type: TransactionType
    accountId: ID
    startDate: DateTime
    endDate: DateTime
    minAmount: Decimal
    maxAmount: Decimal
    needsReview: Boolean
  }

  input TransactionSortInput {
    field: TransactionSortField = DATE
    order: SortOrder = DESC
  }

  enum TransactionSortField {
    DATE
    AMOUNT
    CATEGORY
  }

  input CreateTransactionInput {
    accountId: ID!
    amount: Decimal!
    type: TransactionType!
    category: String!
    merchant: String
    description: String
    date: DateTime!
  }

  input UpdateTransactionInput {
    accountId: ID
    amount: Decimal
    type: TransactionType
    category: String
    merchant: String
    description: String
    date: DateTime
  }

  type TransactionsNeedingReviewResult {
    transactions: [Transaction!]!
    totalCount: Int!
  }

  extend type Query {
    transactions(
      pagination: PaginationInput
      filters: TransactionFilterInput
      sort: TransactionSortInput
    ): TransactionConnection!
    transaction(id: ID!): Transaction
    recentTransactions(limit: Int = 5): [Transaction!]!
    categories: [String!]!
    merchantRules(limit: Int, offset: Int): [MerchantRule!]!
    transactionsNeedingReview(limit: Int = 20, offset: Int = 0): TransactionsNeedingReviewResult!
  }

  extend type Mutation {
    createTransaction(input: CreateTransactionInput!): Transaction!
    updateTransaction(id: ID!, input: UpdateTransactionInput!): Transaction!
    deleteTransaction(id: ID!): Boolean!
    saveMerchantRule(merchant: String!, category: String!): MerchantRule!
    deleteMerchantRule(id: ID!): Boolean!
  }

  type MerchantRule {
    id: ID!
    merchantPattern: String!
    merchantDisplay: String!
    category: String!
    createdAt: DateTime!
    updatedAt: DateTime!
  }
`;
