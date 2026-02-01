'use client';

import { useQuery } from '@apollo/client/react';
import { GET_ADVICE, GET_BUDGET_SUGGESTIONS } from '@/graphql';

export function useAdvice() {
  const { data, loading, error, refetch } = useQuery<any>(GET_ADVICE, {
    fetchPolicy: 'cache-and-network',
  });

  return {
    advice: data?.advice ?? [],
    loading,
    error,
    refetch,
  };
}

export function useBudgetSuggestions() {
  const { data, loading, error, refetch } = useQuery<any>(GET_BUDGET_SUGGESTIONS, {
    fetchPolicy: 'cache-and-network',
  });

  return {
    suggestions: data?.budgetSuggestions,
    loading,
    error,
    refetch,
  };
}
