'use client';

import { useQuery, useMutation } from '@apollo/client/react';
import {
  GET_RECURRING,
  GET_RECURRING_SUMMARY,
  UPDATE_RECURRING,
  DISMISS_RECURRING,
  RESTORE_RECURRING,
  ADD_RECURRING,
} from '@/graphql';

export function useRecurring(options?: {
  filters?: {
    frequency?: string;
    category?: string;
    type?: string;
  };
  sort?: {
    field: string;
    order: string;
  };
  dismissed?: boolean;
}) {
  const variables: Record<string, unknown> = {};

  if (options?.filters) {
    variables.filters = options.filters;
  }

  if (options?.sort) {
    variables.sort = options.sort;
  }

  if (options?.dismissed !== undefined) {
    variables.dismissed = options.dismissed;
  }

  const { data, loading, error, refetch } = useQuery<any>(GET_RECURRING, {
    variables,
    fetchPolicy: 'cache-and-network',
  });

  return {
    recurring: data?.recurring ?? [],
    loading,
    error,
    refetch,
  };
}

export function useRecurringSummary() {
  const { data, loading, error, refetch } = useQuery<any>(GET_RECURRING_SUMMARY, {
    fetchPolicy: 'cache-and-network',
  });

  return {
    summary: data?.recurringSummary,
    loading,
    error,
    refetch,
  };
}

export function useUpdateRecurring() {
  const [updateRecurringMutation, { loading, error }] = useMutation<any>(UPDATE_RECURRING, {
    refetchQueries: ['GetRecurring', 'GetRecurringSummary'],
  });

  const updateRecurring = async (id: string, input: Record<string, unknown>) => {
    return updateRecurringMutation({
      variables: { id, input },
    });
  };

  return {
    updateRecurring,
    loading,
    error,
  };
}

export function useDismissRecurring() {
  const [dismissRecurringMutation, { loading, error }] = useMutation<any>(DISMISS_RECURRING, {
    refetchQueries: ['GetRecurring', 'GetRecurringSummary'],
  });

  const dismissRecurring = async (id: string) => {
    return dismissRecurringMutation({
      variables: { id },
    });
  };

  return {
    dismissRecurring,
    loading,
    error,
  };
}

export function useRestoreRecurring() {
  const [restoreRecurringMutation, { loading, error }] = useMutation<any>(RESTORE_RECURRING, {
    refetchQueries: ['GetRecurring', 'GetRecurringSummary'],
  });

  const restoreRecurring = async (id: string) => {
    return restoreRecurringMutation({
      variables: { id },
    });
  };

  return {
    restoreRecurring,
    loading,
    error,
  };
}

export function useAddRecurring() {
  const [addRecurringMutation, { loading, error }] = useMutation<any>(ADD_RECURRING, {
    refetchQueries: ['GetRecurring', 'GetRecurringSummary'],
  });

  const addRecurring = async (input: {
    merchantName: string;
    amount: number;
    frequency: string;
    category: string;
    description?: string;
    firstDate: string;
  }) => {
    return addRecurringMutation({
      variables: { input },
    });
  };

  return {
    addRecurring,
    loading,
    error,
  };
}
