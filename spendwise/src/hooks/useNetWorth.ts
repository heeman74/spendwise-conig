'use client';

import { useQuery, useMutation } from '@apollo/client/react';
import {
  GET_NET_WORTH,
  TOGGLE_INCLUDE_IN_NET_WORTH,
  BACKFILL_NET_WORTH_SNAPSHOTS,
} from '@/graphql';

export function useNetWorth(options?: {
  timeRange?: string;
  accountIds?: string[];
  skip?: boolean;
}) {
  const variables: Record<string, unknown> = {};

  if (options?.timeRange) {
    variables.timeRange = options.timeRange;
  }

  if (options?.accountIds) {
    variables.accountIds = options.accountIds;
  }

  const { data, loading, error, refetch } = useQuery<any>(GET_NET_WORTH, {
    variables,
    fetchPolicy: 'cache-and-network',
    skip: options?.skip,
  });

  return {
    netWorth: data?.netWorth,
    loading,
    error,
    refetch,
  };
}

export function useToggleIncludeInNetWorth() {
  const [toggleIncludeMutation, { loading, error }] = useMutation<any>(
    TOGGLE_INCLUDE_IN_NET_WORTH,
    {
      refetchQueries: ['GetNetWorth'],
      awaitRefetchQueries: true,
    }
  );

  const toggleInclude = async (accountId: string) => {
    return toggleIncludeMutation({
      variables: { accountId },
    });
  };

  return {
    toggleInclude,
    loading,
    error,
  };
}

export function useBackfillSnapshots() {
  const [backfillMutation, { loading, error }] = useMutation<any>(
    BACKFILL_NET_WORTH_SNAPSHOTS,
    {
      refetchQueries: ['GetNetWorth'],
      awaitRefetchQueries: true,
    }
  );

  const backfill = async () => {
    return backfillMutation();
  };

  return {
    backfill,
    loading,
    error,
  };
}

// Time range enum to display label mapping
export const TIME_RANGE_LABELS: Record<string, string> = {
  ONE_MONTH: '1M',
  THREE_MONTHS: '3M',
  SIX_MONTHS: '6M',
  ONE_YEAR: '1Y',
  ALL: 'All',
};
