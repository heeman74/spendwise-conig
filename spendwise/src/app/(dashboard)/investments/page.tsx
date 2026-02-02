'use client';

import PortfolioSummary from '@/components/portfolio/PortfolioSummary';
import AssetAllocationChart from '@/components/charts/AssetAllocationChart';
import HoldingsTable from '@/components/portfolio/HoldingsTable';
import { usePortfolio, useAssetAllocation, useHoldings } from '@/hooks/usePortfolio';

export default function InvestmentsPage() {
  const { portfolio, loading: portfolioLoading, error: portfolioError } = usePortfolio();
  const { allocation, loading: allocationLoading } = useAssetAllocation();
  const { holdings, loading: holdingsLoading } = useHoldings();

  // Loading state - only show full-page loader on initial load (no cached data yet)
  if (portfolioLoading && !portfolio) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-gray-500 dark:text-gray-400">Loading portfolio data...</div>
      </div>
    );
  }

  // Error state
  if (portfolioError) {
    return (
      <div className="space-y-6">
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <p className="text-red-800 dark:text-red-300">
            Failed to load portfolio data. Please try again.
          </p>
        </div>
      </div>
    );
  }

  const hasHoldings = portfolio && portfolio.holdingCount > 0;

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Investment Portfolio
        </h1>
        <p className="text-gray-500 dark:text-gray-400">
          View your investment holdings with performance and allocation insights
        </p>
      </div>

      {/* Empty state */}
      {!hasHoldings && (
        <div className="bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-lg p-8 text-center">
          <svg
            className="w-12 h-12 mx-auto mb-4 text-gray-400 dark:text-gray-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z"
            />
          </svg>
          <p className="text-gray-600 dark:text-gray-400 font-medium mb-2">
            No Investment Holdings
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-500">
            Upload a brokerage statement or add holdings manually to start tracking your portfolio
          </p>
        </div>
      )}

      {/* Portfolio content */}
      {hasHoldings && portfolio && (
        <>
          {/* Portfolio summary */}
          <PortfolioSummary
            totalValue={portfolio.totalValue}
            totalCostBasis={portfolio.totalCostBasis}
            totalGain={portfolio.totalGain}
            totalGainPercent={portfolio.totalGainPercent}
            holdingCount={portfolio.holdingCount}
            accountCount={portfolio.accountCount}
          />

          {/* Main content grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Asset allocation chart */}
            <div className="lg:col-span-1">
              <AssetAllocationChart data={allocation || []} loading={allocationLoading} />
            </div>

            {/* Holdings table */}
            <div className="lg:col-span-2">
              <HoldingsTable holdings={holdings || []} loading={holdingsLoading} />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
