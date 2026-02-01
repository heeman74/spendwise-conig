import { renderHook } from '@testing-library/react';
import { useQuery } from '@apollo/client/react';
import { useDashboardStats, useAnalytics, useSpendingByCategory } from '@/hooks/useDashboard';
import { mockDashboardStats } from '../mocks/data';

// Mock useQuery
jest.mock('@apollo/client/react', () => ({
  useQuery: jest.fn(),
}));

describe('useDashboard hooks', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('useDashboardStats', () => {
    it('should return loading state initially', () => {
      (useQuery as jest.Mock).mockReturnValue({
        data: undefined,
        loading: true,
        error: undefined,
        refetch: jest.fn(),
      });

      const { result } = renderHook(() => useDashboardStats());

      expect(result.current.loading).toBe(true);
      expect(result.current.stats).toBeUndefined();
      expect(result.current.error).toBeUndefined();
    });

    it('should return dashboard stats when loaded', () => {
      (useQuery as jest.Mock).mockReturnValue({
        data: { dashboardStats: mockDashboardStats },
        loading: false,
        error: undefined,
        refetch: jest.fn(),
      });

      const { result } = renderHook(() => useDashboardStats());

      expect(result.current.loading).toBe(false);
      expect(result.current.stats).toEqual(mockDashboardStats);
      expect(result.current.error).toBeUndefined();
    });

    it('should return error when query fails', () => {
      const mockError = new Error('Failed to fetch');
      (useQuery as jest.Mock).mockReturnValue({
        data: undefined,
        loading: false,
        error: mockError,
        refetch: jest.fn(),
      });

      const { result } = renderHook(() => useDashboardStats());

      expect(result.current.loading).toBe(false);
      expect(result.current.stats).toBeUndefined();
      expect(result.current.error).toBe(mockError);
    });

    it('should skip query when skip option is true', () => {
      (useQuery as jest.Mock).mockReturnValue({
        data: undefined,
        loading: false,
        error: undefined,
        refetch: jest.fn(),
      });

      renderHook(() => useDashboardStats({ skip: true }));

      expect(useQuery).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ skip: true })
      );
    });

    it('should provide refetch function', () => {
      const mockRefetch = jest.fn();
      (useQuery as jest.Mock).mockReturnValue({
        data: { dashboardStats: mockDashboardStats },
        loading: false,
        error: undefined,
        refetch: mockRefetch,
      });

      const { result } = renderHook(() => useDashboardStats());

      expect(result.current.refetch).toBe(mockRefetch);
    });
  });

  describe('useAnalytics', () => {
    it('should fetch analytics with default period', () => {
      (useQuery as jest.Mock).mockReturnValue({
        data: { analytics: {} },
        loading: false,
        error: undefined,
        refetch: jest.fn(),
      });

      renderHook(() => useAnalytics());

      expect(useQuery).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          variables: { period: 'MONTH' },
        })
      );
    });

    it('should fetch analytics with custom period', () => {
      (useQuery as jest.Mock).mockReturnValue({
        data: { analytics: {} },
        loading: false,
        error: undefined,
        refetch: jest.fn(),
      });

      renderHook(() => useAnalytics('YEAR'));

      expect(useQuery).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          variables: { period: 'YEAR' },
        })
      );
    });
  });

  describe('useSpendingByCategory', () => {
    it('should return empty array when no data', () => {
      (useQuery as jest.Mock).mockReturnValue({
        data: undefined,
        loading: false,
        error: undefined,
        refetch: jest.fn(),
      });

      const { result } = renderHook(() => useSpendingByCategory());

      expect(result.current.categories).toEqual([]);
    });

    it('should return spending categories when loaded', () => {
      const mockCategories = [
        { category: 'Food', amount: 500, percentage: 50 },
        { category: 'Transport', amount: 500, percentage: 50 },
      ];

      (useQuery as jest.Mock).mockReturnValue({
        data: { spendingByCategory: mockCategories },
        loading: false,
        error: undefined,
        refetch: jest.fn(),
      });

      const { result } = renderHook(() => useSpendingByCategory());

      expect(result.current.categories).toEqual(mockCategories);
    });
  });
});
