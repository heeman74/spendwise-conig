import { gql } from 'graphql-tag';

export const accountTypeDefs = gql`
  type Account {
    id: ID!
    userId: String!
    name: String!
    type: AccountType!
    balance: Decimal!
    institution: String!
    includeInNetWorth: Boolean!
    lastSynced: DateTime
    transactions(pagination: PaginationInput): TransactionConnection!
    createdAt: DateTime!
    updatedAt: DateTime!
  }

  input CreateAccountInput {
    name: String!
    type: AccountType!
    balance: Decimal!
    institution: String!
  }

  input UpdateAccountInput {
    name: String
    type: AccountType
    institution: String
  }

  extend type Query {
    accounts: [Account!]!
    account(id: ID!): Account
    totalBalance: Decimal!
  }

  extend type Mutation {
    createAccount(input: CreateAccountInput!): Account!
    updateAccount(id: ID!, input: UpdateAccountInput!): Account!
    deleteAccount(id: ID!): Boolean!
  }
`;
