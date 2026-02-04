import { gql } from 'graphql-tag';

export const transactionTypeDefs = gql`
  type RecurringInfo {
    frequency: String!
    merchantName: String!
  }

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
    recurringInfo: RecurringInfo
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
    CREATED_AT
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

  type UserCategory {
    id: ID!
    name: String!
    type: String!
    isDefault: Boolean!
    sortOrder: Int!
    createdAt: DateTime!
    updatedAt: DateTime!
  }

  input CreateUserCategoryInput {
    name: String!
    type: String
  }

  input UpdateUserCategoryInput {
    name: String
    type: String
    sortOrder: Int
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
    userCategories: [UserCategory!]!
    merchantRules(limit: Int, offset: Int): [MerchantRule!]!
    transactionsNeedingReview(limit: Int = 20, offset: Int = 0): TransactionsNeedingReviewResult!
  }

  extend type Mutation {
    createTransaction(input: CreateTransactionInput!): Transaction!
    updateTransaction(id: ID!, input: UpdateTransactionInput!): Transaction!
    deleteTransaction(id: ID!): Boolean!
    saveMerchantRule(merchant: String!, category: String!): MerchantRule!
    deleteMerchantRule(id: ID!): Boolean!
    createUserCategory(input: CreateUserCategoryInput!): UserCategory!
    updateUserCategory(id: ID!, input: UpdateUserCategoryInput!): UserCategory!
    deleteUserCategory(id: ID!): Boolean!
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
