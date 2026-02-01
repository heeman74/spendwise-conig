import { gql } from 'graphql-tag';

export const userTypeDefs = gql`
  type User {
    id: ID!
    email: String!
    name: String
    image: String
    accounts: [Account!]!
    transactions(pagination: PaginationInput, filters: TransactionFilterInput): TransactionConnection!
    savingsGoals: [SavingsGoal!]!
    createdAt: DateTime!
    updatedAt: DateTime!
  }

  type AuthPayload {
    token: String!
    user: User!
    requiresSetup: Boolean
  }

  extend type Query {
    me: User
  }

  extend type Mutation {
    login(email: String!, password: String!): AuthPayload!
    register(email: String!, password: String!, name: String): AuthPayload!
    updateProfile(name: String, image: String): User!
  }
`;
