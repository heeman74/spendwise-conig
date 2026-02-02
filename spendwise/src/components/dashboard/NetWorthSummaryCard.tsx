'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { LineChart, Line, ResponsiveContainer } from 'recharts';
import { useSelector } from 'react-redux';
import Card from '@/components/ui/Card';
import Spinner from '@/components/ui/Spinner';
import { useNetWorth } from '@/hooks/useNetWorth';
import { formatCurrency, cn } from '@/lib/utils';

export default function NetWorthSummaryCard() {
  const isDemo = useSelector((state: any) => state.auth.isDemo);

  // Fetch net worth data with 1-month time range
  const { netWorth, loading, error } = useNetWorth({
    timeRange: 'ONE_MONTH',
    skip: isDemo,
  });

  // Calculate month-over-month change
  const momChange = useMemo(() => {
    if (!netWorth?.history || netWorth.history.length < 2) {
      return { amount: 0, percentage: 0, positive: true };
    }

    const sortedHistory = [...netWorth.history].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    const current = sortedHistory[sortedHistory.length - 1].value;
    const previous = sortedHistory[0].value;
    const difference = current - previous;
    const percentageChange = previous !== 0 ? (difference / Math.abs(previous)) * 100 : 0;

    return {
      amount: difference,
      percentage: percentageChange,
      positive: difference >= 0,
    };
  }, [netWorth]);

  // Determine sparkline color based on trend
  const sparklineColor = momChange.positive ? '#10b981' : '#ef4444';

  // Prepare sparkline data
  const sparklineData = useMemo(() => {
    if (!netWorth?.history || netWorth.history.length === 0) {
      return [];
    }

    return [...netWorth.history]
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .map((item) => ({ value: item.value }));
  }, [netWorth]);

  // Loading state
  if (!isDemo && loading && !netWorth) {
    return (
      <Card className="min-h-[200px] flex items-center justify-center">
        <Spinner size="lg" />
      </Card>
    );
  }

  // Error state - show card with placeholder (don't break dashboard)
  if (!isDemo && error) {
    return (
      <Link href="/net-worth">
        <Card className="cursor-pointer hover:shadow-lg transition-shadow">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Net Worth</h3>
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
                  d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
                />
              </svg>
            </div>

            <div>
              <p className="text-3xl font-bold text-gray-900 dark:text-white">--</p>
              <p className="text-sm text-red-500 mt-2">Unable to load net worth</p>
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
  if (isDemo || !netWorth || netWorth.current === 0) {
    return (
      <Link href="/net-worth">
        <Card className="cursor-pointer hover:shadow-lg transition-shadow">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Net Worth</h3>
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
                  d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
                />
              </svg>
            </div>

            <div>
              <p className="text-3xl font-bold text-gray-900 dark:text-white">
                {formatCurrency(0)}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">No accounts yet</p>
            </div>

            <div className="text-sm text-primary-600 dark:text-primary-400 font-medium">
              View Details →
            </div>
          </div>
        </Card>
      </Link>
    );
  }

  // Normal state with data
  return (
    <Link href="/net-worth">
      <Card className="cursor-pointer hover:shadow-lg transition-shadow">
        <div className="space-y-4">
          {/* Header with title and icon */}
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Net Worth</h3>
            <svg
              className={cn(
                'w-5 h-5',
                momChange.positive ? 'text-green-500' : 'text-red-500'
              )}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d={
                  momChange.positive
                    ? 'M13 7h8m0 0v8m0-8l-8 8-4-4-6 6'
                    : 'M13 17h8m0 0V9m0 8l-8-8-4 4-6-6'
                }
              />
            </svg>
          </div>

          {/* Current net worth */}
          <div>
            <p className="text-3xl font-bold text-gray-900 dark:text-white">
              {formatCurrency(netWorth.current)}
            </p>

            {/* Month-over-month change */}
            {momChange.amount !== 0 && (
              <div className="flex items-center gap-1 mt-2">
                <span
                  className={cn(
                    'inline-flex items-center text-sm font-medium',
                    momChange.positive
                      ? 'text-green-600 dark:text-green-400'
                      : 'text-red-600 dark:text-red-400'
                  )}
                >
                  {momChange.positive ? (
                    <svg className="w-4 h-4 mr-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4 mr-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                    </svg>
                  )}
                  {momChange.positive ? '+' : ''}
                  {formatCurrency(momChange.amount)}
                </span>
                <span className="text-sm text-gray-500 dark:text-gray-400">this month</span>
              </div>
            )}
          </div>

          {/* Mini sparkline */}
          {sparklineData.length > 0 && (
            <div className="h-[60px] -mx-2">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={sparklineData}>
                  <Line
                    type="monotone"
                    dataKey="value"
                    stroke={sparklineColor}
                    strokeWidth={2}
                    dot={false}
                    isAnimationActive={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* View details link */}
          <div className="text-sm text-primary-600 dark:text-primary-400 font-medium">
            View Details →
          </div>
        </div>
      </Card>
    </Link>
  );
}
