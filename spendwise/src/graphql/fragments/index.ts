import { gql } from '@apollo/client';

export const TRANSACTION_FRAGMENT = gql`
  fragment TransactionFields on Transaction {
    id
    amount
    type
    category
    merchant
    description
    date
    categoryConfidence
    categorySource
    createdAt
    accountId
  }
`;

export const ACCOUNT_FRAGMENT = gql`
  fragment AccountFields on Account {
    id
    name
    type
    balance
    institution
    lastSynced
    createdAt
    updatedAt
  }
`;

export const SAVINGS_GOAL_FRAGMENT = gql`
  fragment SavingsGoalFields on SavingsGoal {
    id
    name
    targetAmount
    currentAmount
    progress
    deadline
    isCompleted
    daysRemaining
    createdAt
    updatedAt
  }
`;

export const CATEGORY_AMOUNT_FRAGMENT = gql`
  fragment CategoryAmountFields on CategoryAmount {
    category
    amount
    percentage
    color
    transactionCount
  }
`;

export const USER_FRAGMENT = gql`
  fragment UserFields on User {
    id
    email
    name
    image
    createdAt
    updatedAt
  }
`;
