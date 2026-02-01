'use client';

import { useQuery } from '@apollo/client/react';
import {
  GET_DASHBOARD_STATS,
  GET_ANALYTICS,
  GET_SPENDING_BY_CATEGORY,
  GET_TOP_MERCHANTS,
} from '@/graphql';

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

export function useAnalytics(options?: {
  period?: Period;
  dateRange?: { from: Date; to: Date };
  accountIds?: string[];
}) {
  const variables: Record<string, unknown> = {};

  if (options?.dateRange) {
    variables.dateRange = { start: options.dateRange.from, end: options.dateRange.to };
  } else if (options?.period) {
    variables.period = options.period;
  } else {
    variables.period = 'MONTH';
  }

  if (options?.accountIds?.length) {
    variables.accountIds = options.accountIds;
  }

  const { data, loading, error, refetch } = useQuery<any>(GET_ANALYTICS, {
    variables,
    fetchPolicy: 'cache-and-network',
  });

  return {
    analytics: data?.analytics,
    loading,
    error,
    refetch,
  };
}

export function useSpendingByCategory(options?: {
  period?: Period;
  dateRange?: { from: Date; to: Date };
  accountIds?: string[];
}) {
  const variables: Record<string, unknown> = {};

  if (options?.dateRange) {
    variables.dateRange = { start: options.dateRange.from, end: options.dateRange.to };
  } else if (options?.period) {
    variables.period = options.period;
  } else {
    variables.period = 'MONTH';
  }

  if (options?.accountIds?.length) {
    variables.accountIds = options.accountIds;
  }

  const { data, loading, error, refetch } = useQuery<any>(GET_SPENDING_BY_CATEGORY, {
    variables,
    fetchPolicy: 'cache-and-network',
  });

  return {
    categories: data?.spendingByCategory ?? [],
    loading,
    error,
    refetch,
  };
}

export function useTopMerchants(options?: {
  dateRange?: { from: Date; to: Date };
  accountIds?: string[];
  limit?: number;
}) {
  const variables: Record<string, unknown> = {};

  if (options?.dateRange) {
    variables.dateRange = { start: options.dateRange.from, end: options.dateRange.to };
  }

  if (options?.accountIds?.length) {
    variables.accountIds = options.accountIds;
  }

  if (options?.limit) {
    variables.limit = options.limit;
  }

  const { data, loading, error, refetch } = useQuery<any>(GET_TOP_MERCHANTS, {
    variables,
    fetchPolicy: 'cache-and-network',
  });

  return {
    merchants: data?.topMerchants ?? [],
    loading,
    error,
    refetch,
  };
}
