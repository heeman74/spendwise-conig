'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { useQuery, useMutation, useApolloClient } from '@apollo/client/react';
import {
  GET_TRANSACTIONS,
  GET_RECENT_TRANSACTIONS,
  GET_CATEGORIES,
  CREATE_TRANSACTION,
  UPDATE_TRANSACTION,
  DELETE_TRANSACTION,
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
  field?: 'DATE' | 'AMOUNT' | 'CATEGORY';
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

  const { data, loading, error, fetchMore, refetch: baseRefetch } = useQuery<any>(GET_TRANSACTIONS, {
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

  const loadMore = useCallback(async () => {
    if (!pageInfo?.hasNextPage || loadingMore || loading) return;
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
  }, [fetchMore, pageInfo?.hasNextPage, loadingMore, loading, pagination?.limit]);

  const refetch = useCallback(async () => {
    nextPageRef.current = 2;
    return baseRefetch();
  }, [baseRefetch]);

  return {
    transactions: data?.transactions?.edges?.map((e: { node: unknown }) => e.node) ?? [],
    pageInfo,
    loading: loading && !loadingMore,
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
      client.refetchQueries({
        include: ['GetTransactions', 'GetDashboardStats', 'GetAccounts', 'GetAnalytics'],
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
        include: ['GetTransactions', 'GetDashboardStats', 'GetAccounts', 'GetAnalytics'],
      });
    },
  });

  const deleteTransaction = (id: string) =>
    deleteTransactionMutation({ variables: { id } });

  return {
    deleteTransaction,
    loading,
    error,
  };
}
