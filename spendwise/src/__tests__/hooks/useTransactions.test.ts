import { renderHook, act } from '@testing-library/react';
import { useQuery, useMutation, useApolloClient } from '@apollo/client/react';
import {
  useTransactions,
  useRecentTransactions,
  useCategories,
  useCreateTransaction,
  useUpdateTransaction,
  useDeleteTransaction,
} from '@/hooks/useTransactions';
import { mockTransactions, mockTransactionsQueryResponse } from '../mocks/data';

// Mock Apollo Client hooks
jest.mock('@apollo/client/react', () => ({
  useQuery: jest.fn(),
  useMutation: jest.fn(),
  useApolloClient: jest.fn(),
}));

describe('useTransactions hooks', () => {
  const mockApolloClient = {
    cache: {
      evict: jest.fn(),
      gc: jest.fn(),
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (useApolloClient as jest.Mock).mockReturnValue(mockApolloClient);
  });

  describe('useTransactions', () => {
    it('should return loading state initially', () => {
      (useQuery as jest.Mock).mockReturnValue({
        data: undefined,
        loading: true,
        error: undefined,
        refetch: jest.fn(),
        fetchMore: jest.fn(),
      });

      const { result } = renderHook(() => useTransactions());

      expect(result.current.loading).toBe(true);
      expect(result.current.transactions).toEqual([]);
    });

    it('should return transactions when loaded', () => {
      (useQuery as jest.Mock).mockReturnValue({
        data: mockTransactionsQueryResponse,
        loading: false,
        error: undefined,
        refetch: jest.fn(),
        fetchMore: jest.fn(),
      });

      const { result } = renderHook(() => useTransactions());

      expect(result.current.loading).toBe(false);
      expect(result.current.transactions).toHaveLength(mockTransactions.length);
    });

    it('should pass filters to query', () => {
      (useQuery as jest.Mock).mockReturnValue({
        data: mockTransactionsQueryResponse,
        loading: false,
        error: undefined,
        refetch: jest.fn(),
        fetchMore: jest.fn(),
      });

      const filters = { category: 'Food & Dining', type: 'EXPENSE' as const };
      renderHook(() => useTransactions(filters));

      expect(useQuery).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          variables: expect.objectContaining({
            filters,
          }),
        })
      );
    });

    it('should pass pagination to query', () => {
      (useQuery as jest.Mock).mockReturnValue({
        data: mockTransactionsQueryResponse,
        loading: false,
        error: undefined,
        refetch: jest.fn(),
        fetchMore: jest.fn(),
      });

      const pagination = { page: 2, limit: 10 };
      renderHook(() => useTransactions(undefined, pagination));

      expect(useQuery).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          variables: expect.objectContaining({
            pagination,
          }),
        })
      );
    });

    it('should return pageInfo', () => {
      (useQuery as jest.Mock).mockReturnValue({
        data: mockTransactionsQueryResponse,
        loading: false,
        error: undefined,
        refetch: jest.fn(),
        fetchMore: jest.fn(),
      });

      const { result } = renderHook(() => useTransactions());

      expect(result.current.pageInfo).toEqual(
        mockTransactionsQueryResponse.transactions.pageInfo
      );
    });
  });

  describe('useRecentTransactions', () => {
    it('should return recent transactions', () => {
      (useQuery as jest.Mock).mockReturnValue({
        data: { recentTransactions: mockTransactions.slice(0, 5) },
        loading: false,
        error: undefined,
        refetch: jest.fn(),
      });

      const { result } = renderHook(() => useRecentTransactions());

      expect(result.current.transactions).toHaveLength(3);
      expect(result.current.loading).toBe(false);
    });

    it('should pass custom limit', () => {
      (useQuery as jest.Mock).mockReturnValue({
        data: { recentTransactions: [] },
        loading: false,
        error: undefined,
        refetch: jest.fn(),
      });

      renderHook(() => useRecentTransactions(10));

      expect(useQuery).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          variables: { limit: 10 },
        })
      );
    });
  });

  describe('useCategories', () => {
    it('should return categories', () => {
      const categories = ['Food & Dining', 'Entertainment', 'Shopping'];
      (useQuery as jest.Mock).mockReturnValue({
        data: { categories },
        loading: false,
        error: undefined,
        refetch: jest.fn(),
      });

      const { result } = renderHook(() => useCategories());

      expect(result.current.categories).toEqual(categories);
    });

    it('should return empty array when no data', () => {
      (useQuery as jest.Mock).mockReturnValue({
        data: undefined,
        loading: false,
        error: undefined,
        refetch: jest.fn(),
      });

      const { result } = renderHook(() => useCategories());

      expect(result.current.categories).toEqual([]);
    });
  });

  describe('useCreateTransaction', () => {
    it('should call mutation with correct input', async () => {
      const mockMutate = jest.fn().mockResolvedValue({
        data: { createTransaction: mockTransactions[0] },
      });

      (useMutation as jest.Mock).mockReturnValue([
        mockMutate,
        { loading: false, error: undefined },
      ]);

      const { result } = renderHook(() => useCreateTransaction());

      const input = {
        accountId: 'acc-1',
        amount: 100,
        type: 'EXPENSE' as const,
        category: 'Food',
        date: new Date(),
      };

      await act(async () => {
        await result.current.createTransaction(input);
      });

      expect(mockMutate).toHaveBeenCalledWith({
        variables: { input },
      });
    });

    it('should return loading state', () => {
      (useMutation as jest.Mock).mockReturnValue([
        jest.fn(),
        { loading: true, error: undefined },
      ]);

      const { result } = renderHook(() => useCreateTransaction());

      expect(result.current.loading).toBe(true);
    });
  });

  describe('useUpdateTransaction', () => {
    it('should call mutation with id and input', async () => {
      const mockMutate = jest.fn().mockResolvedValue({
        data: { updateTransaction: mockTransactions[0] },
      });

      (useMutation as jest.Mock).mockReturnValue([
        mockMutate,
        { loading: false, error: undefined },
      ]);

      const { result } = renderHook(() => useUpdateTransaction());

      await act(async () => {
        await result.current.updateTransaction('txn-1', { category: 'Shopping' });
      });

      expect(mockMutate).toHaveBeenCalledWith({
        variables: { id: 'txn-1', input: { category: 'Shopping' } },
      });
    });
  });

  describe('useDeleteTransaction', () => {
    it('should call mutation with id', async () => {
      const mockMutate = jest.fn().mockResolvedValue({
        data: { deleteTransaction: true },
      });

      (useMutation as jest.Mock).mockReturnValue([
        mockMutate,
        { loading: false, error: undefined },
      ]);

      const { result } = renderHook(() => useDeleteTransaction());

      await act(async () => {
        await result.current.deleteTransaction('txn-1');
      });

      expect(mockMutate).toHaveBeenCalledWith({
        variables: { id: 'txn-1' },
      });
    });
  });
});
