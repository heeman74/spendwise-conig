'use client';

import { useQuery, useMutation, useApolloClient } from '@apollo/client/react';
import {
  GET_SAVINGS_GOALS,
  GET_SAVINGS_GOAL,
  GET_TOTAL_SAVINGS_PROGRESS,
  CREATE_SAVINGS_GOAL,
  UPDATE_SAVINGS_GOAL,
  DELETE_SAVINGS_GOAL,
  CONTRIBUTE_SAVINGS,
} from '@/graphql';

export interface CreateSavingsGoalInput {
  name: string;
  targetAmount: number;
  currentAmount?: number;
  deadline?: string;
}

export interface UpdateSavingsGoalInput {
  name?: string;
  targetAmount?: number;
  currentAmount?: number;
  deadline?: string;
}

export function useSavingsGoals() {
  const { data, loading, error, refetch } = useQuery<any>(GET_SAVINGS_GOALS, {
    fetchPolicy: 'cache-and-network',
  });

  return {
    goals: data?.savingsGoals ?? [],
    loading,
    error,
    refetch,
  };
}

export function useSavingsGoal(id: string) {
  const { data, loading, error, refetch } = useQuery<any>(GET_SAVINGS_GOAL, {
    variables: { id },
    skip: !id,
    fetchPolicy: 'cache-and-network',
  });

  return {
    goal: data?.savingsGoal,
    loading,
    error,
    refetch,
  };
}

export function useTotalSavingsProgress() {
  const { data, loading, error, refetch } = useQuery<any>(GET_TOTAL_SAVINGS_PROGRESS, {
    fetchPolicy: 'cache-and-network',
  });

  return {
    progress: data?.totalSavingsProgress,
    loading,
    error,
    refetch,
  };
}

export function useCreateSavingsGoal() {
  const client = useApolloClient();
  const [createSavingsGoalMutation, { loading, error }] = useMutation<any>(CREATE_SAVINGS_GOAL, {
    onCompleted: () => {
      client.refetchQueries({
        include: ['GetSavingsGoals', 'GetDashboardStats', 'GetTotalSavingsProgress'],
      });
    },
  });

  const createSavingsGoal = (input: CreateSavingsGoalInput) =>
    createSavingsGoalMutation({ variables: { input } });

  return {
    createSavingsGoal,
    loading,
    error,
  };
}

export function useUpdateSavingsGoal() {
  const client = useApolloClient();
  const [updateSavingsGoalMutation, { loading, error }] = useMutation<any>(UPDATE_SAVINGS_GOAL, {
    onCompleted: () => {
      client.refetchQueries({
        include: ['GetSavingsGoals', 'GetDashboardStats', 'GetTotalSavingsProgress'],
      });
    },
  });

  const updateSavingsGoal = (id: string, input: UpdateSavingsGoalInput) =>
    updateSavingsGoalMutation({ variables: { id, input } });

  return {
    updateSavingsGoal,
    loading,
    error,
  };
}

export function useDeleteSavingsGoal() {
  const client = useApolloClient();
  const [deleteSavingsGoalMutation, { loading, error }] = useMutation<any>(DELETE_SAVINGS_GOAL, {
    onCompleted: () => {
      client.refetchQueries({
        include: ['GetSavingsGoals', 'GetDashboardStats', 'GetTotalSavingsProgress'],
      });
    },
  });

  const deleteSavingsGoal = (id: string) =>
    deleteSavingsGoalMutation({ variables: { id } });

  return {
    deleteSavingsGoal,
    loading,
    error,
  };
}

export function useContributeSavings() {
  const client = useApolloClient();
  const [contributeSavingsMutation, { loading, error }] = useMutation<any>(CONTRIBUTE_SAVINGS, {
    onCompleted: () => {
      client.refetchQueries({
        include: ['GetSavingsGoals', 'GetDashboardStats', 'GetTotalSavingsProgress'],
      });
    },
  });

  const contributeSavings = (id: string, amount: number) =>
    contributeSavingsMutation({ variables: { id, amount } });

  return {
    contributeSavings,
    loading,
    error,
  };
}
