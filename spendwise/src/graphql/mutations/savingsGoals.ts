import { gql } from '@apollo/client';
import { SAVINGS_GOAL_FRAGMENT } from '../fragments';

export const CREATE_SAVINGS_GOAL = gql`
  ${SAVINGS_GOAL_FRAGMENT}
  mutation CreateSavingsGoal($input: CreateSavingsGoalInput!) {
    createSavingsGoal(input: $input) {
      ...SavingsGoalFields
    }
  }
`;

export const UPDATE_SAVINGS_GOAL = gql`
  ${SAVINGS_GOAL_FRAGMENT}
  mutation UpdateSavingsGoal($id: ID!, $input: UpdateSavingsGoalInput!) {
    updateSavingsGoal(id: $id, input: $input) {
      ...SavingsGoalFields
    }
  }
`;

export const DELETE_SAVINGS_GOAL = gql`
  mutation DeleteSavingsGoal($id: ID!) {
    deleteSavingsGoal(id: $id)
  }
`;

export const CONTRIBUTE_SAVINGS = gql`
  ${SAVINGS_GOAL_FRAGMENT}
  mutation ContributeSavings($id: ID!, $amount: Decimal!) {
    contributeSavings(id: $id, amount: $amount) {
      ...SavingsGoalFields
    }
  }
`;
