'use client';

import { useQuery, useMutation } from '@apollo/client/react';
import {
  GET_PORTFOLIO,
  GET_ASSET_ALLOCATION,
  GET_HOLDINGS,
  ADD_HOLDING,
  UPDATE_HOLDING_PRICE,
} from '@/graphql';

export function usePortfolio(options?: { skip?: boolean }) {
  const { data, loading, error, refetch } = useQuery<any>(GET_PORTFOLIO, {
    fetchPolicy: 'cache-and-network',
    skip: options?.skip,
  });

  return {
    portfolio: data?.portfolio,
    loading,
    error,
    refetch,
  };
}

export function useAssetAllocation(options?: { skip?: boolean }) {
  const { data, loading, error, refetch } = useQuery<any>(GET_ASSET_ALLOCATION, {
    fetchPolicy: 'cache-and-network',
    skip: options?.skip,
  });

  return {
    allocation: data?.assetAllocation ?? [],
    loading,
    error,
    refetch,
  };
}

export function useHoldings(options?: { accountId?: string; skip?: boolean }) {
  const variables: Record<string, unknown> = {};

  if (options?.accountId) {
    variables.accountId = options.accountId;
  }

  const { data, loading, error, refetch } = useQuery<any>(GET_HOLDINGS, {
    variables,
    fetchPolicy: 'cache-and-network',
    skip: options?.skip,
  });

  return {
    holdings: data?.holdings ?? [],
    loading,
    error,
    refetch,
  };
}

export function useAddHolding() {
  const [addHoldingMutation, { loading, error }] = useMutation<any>(
    ADD_HOLDING,
    {
      refetchQueries: ['GetPortfolio', 'GetAssetAllocation', 'GetHoldings'],
      awaitRefetchQueries: true,
    }
  );

  const addHolding = async (input: {
    accountId: string;
    securityName: string;
    tickerSymbol?: string;
    securityType: string;
    quantity: number;
    price: number;
    costBasis?: number;
  }) => {
    return addHoldingMutation({
      variables: { input },
    });
  };

  return {
    addHolding,
    loading,
    error,
  };
}

export function useUpdateHoldingPrice() {
  const [updatePriceMutation, { loading, error }] = useMutation<any>(
    UPDATE_HOLDING_PRICE,
    {
      refetchQueries: ['GetPortfolio', 'GetAssetAllocation', 'GetHoldings'],
      awaitRefetchQueries: true,
    }
  );

  const updatePrice = async (holdingId: string, newPrice: number) => {
    return updatePriceMutation({
      variables: { input: { holdingId, newPrice } },
    });
  };

  return {
    updatePrice,
    loading,
    error,
  };
}
