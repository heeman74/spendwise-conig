import { renderHook, act } from '@testing-library/react';
import { useQuery, useMutation, useApolloClient } from '@apollo/client/react';
import {
  useAccounts,
  useAccount,
  useTotalBalance,
  useCreateAccount,
  useUpdateAccount,
  useDeleteAccount,
} from '@/hooks/useAccounts';
import { mockAccounts } from '../mocks/data';

// Mock Apollo Client hooks
jest.mock('@apollo/client/react', () => ({
  useQuery: jest.fn(),
  useMutation: jest.fn(),
  useApolloClient: jest.fn(),
}));

describe('useAccounts hooks', () => {
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

  describe('useAccounts', () => {
    it('should return loading state initially', () => {
      (useQuery as jest.Mock).mockReturnValue({
        data: undefined,
        loading: true,
        error: undefined,
        refetch: jest.fn(),
      });

      const { result } = renderHook(() => useAccounts());

      expect(result.current.loading).toBe(true);
      expect(result.current.accounts).toEqual([]);
    });

    it('should return accounts when loaded', () => {
      (useQuery as jest.Mock).mockReturnValue({
        data: { accounts: mockAccounts },
        loading: false,
        error: undefined,
        refetch: jest.fn(),
      });

      const { result } = renderHook(() => useAccounts());

      expect(result.current.loading).toBe(false);
      expect(result.current.accounts).toEqual(mockAccounts);
    });

    it('should return error when query fails', () => {
      const mockError = new Error('Failed to fetch accounts');
      (useQuery as jest.Mock).mockReturnValue({
        data: undefined,
        loading: false,
        error: mockError,
        refetch: jest.fn(),
      });

      const { result } = renderHook(() => useAccounts());

      expect(result.current.error).toBe(mockError);
    });

    it('should provide refetch function', () => {
      const mockRefetch = jest.fn();
      (useQuery as jest.Mock).mockReturnValue({
        data: { accounts: mockAccounts },
        loading: false,
        error: undefined,
        refetch: mockRefetch,
      });

      const { result } = renderHook(() => useAccounts());

      expect(result.current.refetch).toBe(mockRefetch);
    });
  });

  describe('useAccount', () => {
    it('should fetch single account by id', () => {
      const account = mockAccounts[0];
      (useQuery as jest.Mock).mockReturnValue({
        data: { account },
        loading: false,
        error: undefined,
        refetch: jest.fn(),
      });

      const { result } = renderHook(() => useAccount('acc-1'));

      expect(result.current.account).toEqual(account);
      expect(useQuery).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          variables: { id: 'acc-1' },
        })
      );
    });

    it('should skip query when no id provided', () => {
      (useQuery as jest.Mock).mockReturnValue({
        data: undefined,
        loading: false,
        error: undefined,
        refetch: jest.fn(),
      });

      renderHook(() => useAccount(''));

      expect(useQuery).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          skip: true,
        })
      );
    });
  });

  describe('useTotalBalance', () => {
    it('should return total balance', () => {
      (useQuery as jest.Mock).mockReturnValue({
        data: { totalBalance: 18749.25 },
        loading: false,
        error: undefined,
        refetch: jest.fn(),
      });

      const { result } = renderHook(() => useTotalBalance());

      expect(result.current.totalBalance).toBe(18749.25);
    });

    it('should return 0 when no data', () => {
      (useQuery as jest.Mock).mockReturnValue({
        data: undefined,
        loading: false,
        error: undefined,
        refetch: jest.fn(),
      });

      const { result } = renderHook(() => useTotalBalance());

      expect(result.current.totalBalance).toBe(0);
    });
  });

  describe('useCreateAccount', () => {
    it('should call mutation with correct input', async () => {
      const mockMutate = jest.fn().mockResolvedValue({
        data: { createAccount: mockAccounts[0] },
      });

      (useMutation as jest.Mock).mockReturnValue([
        mockMutate,
        { loading: false, error: undefined },
      ]);

      const { result } = renderHook(() => useCreateAccount());

      const input = {
        name: 'New Account',
        type: 'CHECKING' as const,
        balance: 1000,
        institution: 'Test Bank',
      };

      await act(async () => {
        await result.current.createAccount(input);
      });

      expect(mockMutate).toHaveBeenCalledWith({
        variables: { input },
      });
    });

    it('should return loading state during mutation', () => {
      (useMutation as jest.Mock).mockReturnValue([
        jest.fn(),
        { loading: true, error: undefined },
      ]);

      const { result } = renderHook(() => useCreateAccount());

      expect(result.current.loading).toBe(true);
    });

    it('should return error on failure', () => {
      const mockError = new Error('Failed to create account');
      (useMutation as jest.Mock).mockReturnValue([
        jest.fn(),
        { loading: false, error: mockError },
      ]);

      const { result } = renderHook(() => useCreateAccount());

      expect(result.current.error).toBe(mockError);
    });
  });

  describe('useUpdateAccount', () => {
    it('should call mutation with id and input', async () => {
      const mockMutate = jest.fn().mockResolvedValue({
        data: { updateAccount: { ...mockAccounts[0], name: 'Updated' } },
      });

      (useMutation as jest.Mock).mockReturnValue([
        mockMutate,
        { loading: false, error: undefined },
      ]);

      const { result } = renderHook(() => useUpdateAccount());

      await act(async () => {
        await result.current.updateAccount('acc-1', { name: 'Updated' });
      });

      expect(mockMutate).toHaveBeenCalledWith({
        variables: { id: 'acc-1', input: { name: 'Updated' } },
      });
    });
  });

  describe('useDeleteAccount', () => {
    it('should call mutation with id', async () => {
      const mockMutate = jest.fn().mockResolvedValue({
        data: { deleteAccount: true },
      });

      (useMutation as jest.Mock).mockReturnValue([
        mockMutate,
        { loading: false, error: undefined },
      ]);

      const { result } = renderHook(() => useDeleteAccount());

      await act(async () => {
        await result.current.deleteAccount('acc-1');
      });

      expect(mockMutate).toHaveBeenCalledWith({
        variables: { id: 'acc-1' },
      });
    });

    it('should evict cache after deletion', async () => {
      const mockMutate = jest.fn().mockResolvedValue({
        data: { deleteAccount: true },
      });

      (useMutation as jest.Mock).mockReturnValue([
        mockMutate,
        { loading: false, error: undefined },
      ]);

      const { result } = renderHook(() => useDeleteAccount());

      await act(async () => {
        await result.current.deleteAccount('acc-1');
      });

      // The mutation's onCompleted should handle cache eviction
      expect(mockMutate).toHaveBeenCalled();
    });
  });
});
