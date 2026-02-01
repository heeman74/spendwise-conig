'use client';

import { useQuery, useMutation, useApolloClient } from '@apollo/client/react';
import {
  GET_PLAID_ITEMS,
  CREATE_LINK_TOKEN,
  EXCHANGE_PUBLIC_TOKEN,
  UNLINK_ITEM,
  UPDATE_ITEM_STATUS,
} from '@/graphql';

export interface ExchangePublicTokenInput {
  publicToken: string;
  institutionId: string;
  institutionName: string;
}

export function usePlaidItems() {
  const { data, loading, error, refetch } = useQuery<any>(GET_PLAID_ITEMS, {
    fetchPolicy: 'cache-and-network',
  });

  return {
    plaidItems: data?.plaidItems ?? [],
    loading,
    error,
    refetch,
  };
}

export function useCreateLinkToken() {
  const [createLinkTokenMutation, { data, loading, error }] = useMutation<{
    createLinkToken: { linkToken: string } | null;
  }>(CREATE_LINK_TOKEN);

  const createLinkToken = (itemId?: string) =>
    createLinkTokenMutation({ variables: itemId ? { itemId } : {} });

  return {
    createLinkToken,
    linkToken: data?.createLinkToken?.linkToken,
    loading,
    error,
  };
}

export function useExchangePublicToken() {
  const client = useApolloClient();
  const [exchangePublicTokenMutation, { data, loading, error }] = useMutation<{
    exchangePublicToken: { plaidItem: { institutionName: string; accounts: any[] } } | null;
  }>(
    EXCHANGE_PUBLIC_TOKEN,
    {
      onCompleted: () => {
        client.refetchQueries({
          include: ['GetPlaidItems', 'GetAccounts'],
        });
      },
    }
  );

  const exchangePublicToken = (input: ExchangePublicTokenInput) =>
    exchangePublicTokenMutation({ variables: { input } });

  return {
    exchangePublicToken,
    data,
    loading,
    error,
  };
}

export function useUnlinkItem() {
  const client = useApolloClient();
  const [unlinkItemMutation, { loading, error }] = useMutation<{ unlinkItem: boolean }>(UNLINK_ITEM, {
    onCompleted: () => {
      client.refetchQueries({
        include: ['GetPlaidItems', 'GetAccounts'],
      });
    },
  });

  const unlinkItem = (itemId: string, keepAsManual: boolean) =>
    unlinkItemMutation({ variables: { itemId, keepAsManual } });

  return {
    unlinkItem,
    loading,
    error,
  };
}

export function useUpdateItemStatus() {
  const client = useApolloClient();
  const [updateItemStatusMutation, { loading, error }] = useMutation<{ updateItemStatus: boolean }>(UPDATE_ITEM_STATUS, {
    onCompleted: () => {
      client.refetchQueries({
        include: ['GetPlaidItems'],
      });
    },
  });

  const updateItemStatus = (itemId: string, status: string) =>
    updateItemStatusMutation({ variables: { itemId, status } });

  return {
    updateItemStatus,
    loading,
    error,
  };
}
