'use client';

import Link from 'next/link';
import { useSelector } from 'react-redux';
import Card from '@/components/ui/Card';
import Spinner from '@/components/ui/Spinner';
import { usePortfolio } from '@/hooks/usePortfolio';
import { formatCurrency, cn } from '@/lib/utils';

export default function PortfolioSummaryCard() {
  const isDemo = useSelector((state: any) => state.auth.isDemo);

  // Fetch portfolio data - skip when in demo mode
  const { portfolio, loading, error } = usePortfolio({
    skip: isDemo,
  });

  // Loading state
  if (!isDemo && loading && !portfolio) {
    return (
      <Card className="min-h-[200px] flex items-center justify-center">
        <Spinner size="lg" />
      </Card>
    );
  }

  // Error state - show card with placeholder (don't break dashboard)
  if (!isDemo && error) {
    return (
      <Link href="/investments">
        <Card className="cursor-pointer hover:shadow-lg transition-shadow">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Portfolio</h3>
              <svg
                className="w-5 h-5 text-gray-400"
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
            </div>

            <div>
              <p className="text-3xl font-bold text-gray-900 dark:text-white">--</p>
              <p className="text-sm text-red-500 mt-2">Unable to load portfolio</p>
            </div>

            <div className="text-sm text-primary-600 dark:text-primary-400 font-medium">
              View Details →
            </div>
          </div>
        </Card>
      </Link>
    );
  }

  // Demo mode or no data state
  if (isDemo || !portfolio || portfolio.holdingCount === 0) {
    return (
      <Link href="/investments">
        <Card className="cursor-pointer hover:shadow-lg transition-shadow">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Portfolio</h3>
              <svg
                className="w-5 h-5 text-gray-400"
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
            </div>

            <div>
              <p className="text-3xl font-bold text-gray-900 dark:text-white">
                {formatCurrency(0)}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">No holdings yet</p>
            </div>

            <div className="text-sm text-primary-600 dark:text-primary-400 font-medium">
              View Details →
            </div>
          </div>
        </Card>
      </Link>
    );
  }

  // Determine if gain is positive or negative
  const isPositive = portfolio.totalGain >= 0;

  // Normal state with data
  return (
    <Link href="/investments">
      <Card className="cursor-pointer hover:shadow-lg transition-shadow">
        <div className="space-y-4">
          {/* Header with title and icon */}
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Portfolio</h3>
            <svg
              className={cn(
                'w-5 h-5',
                isPositive ? 'text-green-500' : 'text-red-500'
              )}
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
          </div>

          {/* Total portfolio value */}
          <div>
            <p className="text-3xl font-bold text-gray-900 dark:text-white">
              {formatCurrency(portfolio.totalValue)}
            </p>

            {/* Total gain/loss */}
            {portfolio.totalGain !== 0 && (
              <div className="flex items-center gap-1 mt-2">
                <span
                  className={cn(
                    'inline-flex items-center text-sm font-medium',
                    isPositive
                      ? 'text-green-600 dark:text-green-400'
                      : 'text-red-600 dark:text-red-400'
                  )}
                >
                  {isPositive ? (
                    <svg className="w-4 h-4 mr-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4 mr-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                    </svg>
                  )}
                  {isPositive ? '+' : ''}
                  {formatCurrency(portfolio.totalGain)}
                  {portfolio.totalGainPercent !== undefined && (
                    <span className="ml-1">
                      ({isPositive ? '+' : ''}{portfolio.totalGainPercent.toFixed(2)}%)
                    </span>
                  )}
                </span>
                <span className="text-sm text-gray-500 dark:text-gray-400">total return</span>
              </div>
            )}

            {/* Holdings and accounts count */}
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {portfolio.holdingCount} {portfolio.holdingCount === 1 ? 'holding' : 'holdings'} across {portfolio.accountCount} {portfolio.accountCount === 1 ? 'account' : 'accounts'}
            </p>
          </div>

          {/* View details link */}
          <div className="text-sm text-primary-600 dark:text-primary-400 font-medium">
            View Details →
          </div>
        </div>
      </Card>
    </Link>
  );
}
