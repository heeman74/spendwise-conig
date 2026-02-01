import { gql } from '@apollo/client';
import { SAVINGS_GOAL_FRAGMENT } from '../fragments';

export const GET_SAVINGS_GOALS = gql`
  ${SAVINGS_GOAL_FRAGMENT}
  query GetSavingsGoals {
    savingsGoals {
      ...SavingsGoalFields
    }
  }
`;

export const GET_SAVINGS_GOAL = gql`
  ${SAVINGS_GOAL_FRAGMENT}
  query GetSavingsGoal($id: ID!) {
    savingsGoal(id: $id) {
      ...SavingsGoalFields
    }
  }
`;

export const GET_TOTAL_SAVINGS_PROGRESS = gql`
  query GetTotalSavingsProgress {
    totalSavingsProgress {
      totalTarget
      totalCurrent
      overallProgress
      goalsCount
      completedCount
    }
  }
`;
