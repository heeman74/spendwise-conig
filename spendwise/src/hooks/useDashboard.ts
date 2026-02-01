'use client';

import { useQuery } from '@apollo/client/react';
import { GET_DASHBOARD_STATS, GET_ANALYTICS, GET_SPENDING_BY_CATEGORY } from '@/graphql';

export type Period = 'WEEK' | 'MONTH' | 'YEAR';

export function useDashboardStats(options?: { skip?: boolean }) {
  const { data, loading, error, refetch } = useQuery<any>(GET_DASHBOARD_STATS, {
    fetchPolicy: 'cache-and-network',
    skip: options?.skip,
  });

  return {
    stats: data?.dashboardStats,
    loading,
    error,
    refetch,
  };
}

export function useAnalytics(period: Period = 'MONTH') {
  const { data, loading, error, refetch } = useQuery<any>(GET_ANALYTICS, {
    variables: { period },
    fetchPolicy: 'cache-and-network',
  });

  return {
    analytics: data?.analytics,
    loading,
    error,
    refetch,
  };
}

export function useSpendingByCategory(period: Period = 'MONTH') {
  const { data, loading, error, refetch } = useQuery<any>(GET_SPENDING_BY_CATEGORY, {
    variables: { period },
    fetchPolicy: 'cache-and-network',
  });

  return {
    categories: data?.spendingByCategory ?? [],
    loading,
    error,
    refetch,
  };
}
