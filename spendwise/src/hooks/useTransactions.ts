'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { useQuery, useMutation, useApolloClient } from '@apollo/client/react';
import { NetworkStatus } from '@apollo/client';
import {
  GET_TRANSACTIONS,
  GET_RECENT_TRANSACTIONS,
  GET_CATEGORIES,
  GET_USER_CATEGORIES,
  GET_TRANSACTIONS_NEEDING_REVIEW,
  CREATE_TRANSACTION,
  UPDATE_TRANSACTION,
  DELETE_TRANSACTION,
  CREATE_USER_CATEGORY,
  UPDATE_USER_CATEGORY,
  DELETE_USER_CATEGORY,
} from '@/graphql';

export interface TransactionFilterInput {
  search?: string;
  category?: string;
  type?: 'INCOME' | 'EXPENSE' | 'TRANSFER';
  accountId?: string;
  startDate?: string;
  endDate?: string;
  minAmount?: number;
  maxAmount?: number;
}

export interface TransactionSortInput {
  field?: 'DATE' | 'AMOUNT' | 'CATEGORY' | 'CREATED_AT';
  order?: 'ASC' | 'DESC';
}

export interface PaginationInput {
  page?: number;
  limit?: number;
}

export interface CreateTransactionInput {
  accountId: string;
  amount: number;
  type: 'INCOME' | 'EXPENSE' | 'TRANSFER';
  category: string;
  merchant?: string;
  description?: string;
  date: string;
}

export interface UpdateTransactionInput {
  accountId?: string;
  amount?: number;
  type?: 'INCOME' | 'EXPENSE' | 'TRANSFER';
  category?: string;
  merchant?: string;
  description?: string;
  date?: string;
}

export function useTransactions(
  filters?: TransactionFilterInput,
  pagination?: PaginationInput,
  sort?: TransactionSortInput
) {
  const [loadingMore, setLoadingMore] = useState(false);
  const nextPageRef = useRef(2);

  const { data, loading, error, fetchMore, refetch: baseRefetch, networkStatus } = useQuery<any>(GET_TRANSACTIONS, {
    variables: { filters, pagination, sort },
    fetchPolicy: 'cache-and-network',
    notifyOnNetworkStatusChange: true,
  });

  // Reset page counter when filters/sort change (which triggers a fresh page-1 fetch)
  const filterKey = JSON.stringify(filters) + JSON.stringify(sort);
  useEffect(() => {
    nextPageRef.current = 2;
  }, [filterKey]);

  const pageInfo = data?.transactions?.pageInfo;

  // Only treat as "actively fetching" on initial load (status 1) or explicit refetch (status 4),
  // NOT on background cache-and-network re-fetches (status 2/7) which should not block loadMore.
  const isInitialOrRefetch = networkStatus === NetworkStatus.loading || networkStatus === NetworkStatus.refetch;

  const loadMore = useCallback(async () => {
    if (!pageInfo?.hasNextPage || loadingMore || isInitialOrRefetch) return;
    setLoadingMore(true);
    try {
      await fetchMore({
        variables: {
          pagination: {
            page: nextPageRef.current,
            limit: pagination?.limit ?? 50,
          },
        },
      });
      nextPageRef.current++;
    } finally {
      setLoadingMore(false);
    }
  }, [fetchMore, pageInfo?.hasNextPage, loadingMore, isInitialOrRefetch, pagination?.limit]);

  const refetch = useCallback(async () => {
    nextPageRef.current = 2;
    return baseRefetch();
  }, [baseRefetch]);

  return {
    transactions: data?.transactions?.edges?.map((e: { node: unknown }) => e.node) ?? [],
    pageInfo,
    loading: isInitialOrRefetch && !data,
    loadingMore,
    error,
    loadMore,
    refetch,
  };
}

export function useRecentTransactions(limit = 5) {
  const { data, loading, error, refetch } = useQuery<any>(GET_RECENT_TRANSACTIONS, {
    variables: { limit },
    fetchPolicy: 'cache-and-network',
  });

  return {
    transactions: data?.recentTransactions ?? [],
    loading,
    error,
    refetch,
  };
}

export function useCategories() {
  const { data, loading, error } = useQuery<any>(GET_CATEGORIES, {
    fetchPolicy: 'cache-first',
  });

  return {
    categories: data?.categories ?? [],
    loading,
    error,
  };
}

export function useTransactionsNeedingReview(limit = 20) {
  const { data, loading, error, refetch } = useQuery<any>(GET_TRANSACTIONS_NEEDING_REVIEW, {
    variables: { limit, offset: 0 },
    fetchPolicy: 'cache-and-network',
  });

  return {
    transactions: data?.transactionsNeedingReview?.transactions ?? [],
    totalCount: data?.transactionsNeedingReview?.totalCount ?? 0,
    loading: loading && !data,
    error,
    refetch,
  };
}

export function useCreateTransaction() {
  const client = useApolloClient();
  const [createTransactionMutation, { loading, error }] = useMutation<any>(CREATE_TRANSACTION, {
    onCompleted: () => {
      // Refetch related queries
      client.refetchQueries({
        include: ['GetTransactions', 'GetDashboardStats', 'GetAccounts', 'GetAnalytics'],
      });
    },
  });

  const createTransaction = (input: CreateTransactionInput) =>
    createTransactionMutation({ variables: { input } });

  return {
    createTransaction,
    loading,
    error,
  };
}

export function useUpdateTransaction() {
  const client = useApolloClient();
  const [updateTransactionMutation, { loading, error }] = useMutation<any>(UPDATE_TRANSACTION, {
    onCompleted: () => {
      // Don't refetch GetTransactions — Apollo auto-updates the cached
      // Transaction by id, so the list stays intact with scroll position preserved.
      client.refetchQueries({
        include: ['GetDashboardStats', 'GetAccounts', 'GetAnalytics'],
      });
    },
  });

  const updateTransaction = (id: string, input: UpdateTransactionInput) =>
    updateTransactionMutation({ variables: { id, input } });

  return {
    updateTransaction,
    loading,
    error,
  };
}

export function useDeleteTransaction() {
  const client = useApolloClient();
  const [deleteTransactionMutation, { loading, error }] = useMutation<any>(DELETE_TRANSACTION, {
    onCompleted: () => {
      client.refetchQueries({
        include: ['GetDashboardStats', 'GetAccounts', 'GetAnalytics'],
      });
    },
  });

  const deleteTransaction = (id: string) =>
    deleteTransactionMutation({
      variables: { id },
      update: (cache) => {
        cache.evict({ id: cache.identify({ __typename: 'Transaction', id }) });
        cache.gc();
      },
    });

  return {
    deleteTransaction,
    loading,
    error,
  };
}

export interface UserCategory {
  id: string;
  name: string;
  type: string;
  isDefault: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export function useUserCategories() {
  const { data, loading, error, refetch } = useQuery<any>(GET_USER_CATEGORIES, {
    fetchPolicy: 'cache-and-network',
  });

  return {
    categories: (data?.userCategories ?? []) as UserCategory[],
    loading,
    error,
    refetch,
  };
}

export function useCreateUserCategory() {
  const client = useApolloClient();
  const [createUserCategoryMutation, { loading, error }] = useMutation<any>(CREATE_USER_CATEGORY, {
    onCompleted: () => {
      client.refetchQueries({
        include: ['GetUserCategories', 'GetCategories'],
      });
    },
  });

  const createUserCategory = (input: { name: string; type?: string }) =>
    createUserCategoryMutation({ variables: { input } });

  return {
    createUserCategory,
    loading,
    error,
  };
}

export function useUpdateUserCategory() {
  const client = useApolloClient();
  const [updateUserCategoryMutation, { loading, error }] = useMutation<any>(UPDATE_USER_CATEGORY, {
    onCompleted: () => {
      client.refetchQueries({
        include: ['GetUserCategories', 'GetCategories', 'GetTransactions'],
      });
    },
  });

  const updateUserCategory = (id: string, input: { name?: string; type?: string; sortOrder?: number }) =>
    updateUserCategoryMutation({ variables: { id, input } });

  return {
    updateUserCategory,
    loading,
    error,
  };
}

export function useDeleteUserCategory() {
  const client = useApolloClient();
  const [deleteUserCategoryMutation, { loading, error }] = useMutation<any>(DELETE_USER_CATEGORY, {
    onCompleted: () => {
      client.refetchQueries({
        include: ['GetUserCategories', 'GetCategories'],
      });
    },
  });

  const deleteUserCategory = (id: string) =>
    deleteUserCategoryMutation({ variables: { id } });

  return {
    deleteUserCategory,
    loading,
    error,
  };
}
