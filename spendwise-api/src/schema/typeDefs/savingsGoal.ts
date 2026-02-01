import { gql } from 'graphql-tag';

export const savingsGoalTypeDefs = gql`
  type SavingsGoal {
    id: ID!
    userId: String!
    name: String!
    targetAmount: Decimal!
    currentAmount: Decimal!
    progress: Float!
    deadline: DateTime
    isCompleted: Boolean!
    daysRemaining: Int
    createdAt: DateTime!
    updatedAt: DateTime!
  }

  type SavingsProgress {
    totalTarget: Decimal!
    totalCurrent: Decimal!
    overallProgress: Float!
    goalsCount: Int!
    completedCount: Int!
  }

  input CreateSavingsGoalInput {
    name: String!
    targetAmount: Decimal!
    currentAmount: Decimal = 0
    deadline: DateTime
  }

  input UpdateSavingsGoalInput {
    name: String
    targetAmount: Decimal
    currentAmount: Decimal
    deadline: DateTime
  }

  extend type Query {
    savingsGoals: [SavingsGoal!]!
    savingsGoal(id: ID!): SavingsGoal
    totalSavingsProgress: SavingsProgress!
  }

  extend type Mutation {
    createSavingsGoal(input: CreateSavingsGoalInput!): SavingsGoal!
    updateSavingsGoal(id: ID!, input: UpdateSavingsGoalInput!): SavingsGoal!
    deleteSavingsGoal(id: ID!): Boolean!
    contributeSavings(id: ID!, amount: Decimal!): SavingsGoal!
  }
`;
