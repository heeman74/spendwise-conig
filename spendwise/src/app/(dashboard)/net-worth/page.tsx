'use client';

import { useState } from 'react';
import NetWorthHero from '@/components/net-worth/NetWorthHero';
import NetWorthChart from '@/components/charts/NetWorthChart';
import AccountBreakdown from '@/components/net-worth/AccountBreakdown';
import {
  useNetWorth,
  useToggleIncludeInNetWorth,
  useBackfillSnapshots,
  TIME_RANGE_LABELS,
} from '@/hooks/useNetWorth';

export default function NetWorthPage() {
  const [timeRange, setTimeRange] = useState('ONE_MONTH');

  const { netWorth, loading, error } = useNetWorth({ timeRange });
  const { toggleInclude } = useToggleIncludeInNetWorth();
  const { backfill, loading: backfillLoading } = useBackfillSnapshots();

  const handleToggleInclude = async (accountId: string) => {
    try {
      await toggleInclude(accountId);
    } catch (err) {
      console.error('Failed to toggle include in net worth:', err);
    }
  };

  const handleBackfill = async () => {
    try {
      await backfill();
    } catch (err) {
      console.error('Failed to backfill snapshots:', err);
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-gray-500 dark:text-gray-400">Loading net worth data...</div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="space-y-6">
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <p className="text-red-800 dark:text-red-300">
            Failed to load net worth data. Please try again.
          </p>
        </div>
      </div>
    );
  }

  const hasAccounts = netWorth?.accounts && netWorth.accounts.length > 0;
  const hasHistory = netWorth?.history && netWorth.history.length > 0;

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Net Worth</h1>
        <p className="text-gray-500 dark:text-gray-400">
          Track your total net worth across all accounts
        </p>
      </div>

      {/* Hero section */}
      <NetWorthHero
        current={netWorth?.current || 0}
        monthOverMonthChange={netWorth?.monthOverMonthChange || 0}
        monthOverMonthChangePercent={netWorth?.monthOverMonthChangePercent || 0}
        periodChange={netWorth?.periodChange || 0}
        periodChangePercent={netWorth?.periodChangePercent || 0}
        timeRangeLabel={TIME_RANGE_LABELS[timeRange]}
      />

      {/* Backfill button if limited history */}
      {hasAccounts && (!hasHistory || (netWorth?.history && netWorth.history.length < 3)) && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-blue-900 dark:text-blue-300">
                Generate Historical Data
              </p>
              <p className="text-xs text-blue-700 dark:text-blue-400 mt-1">
                You have limited historical data. Generate monthly snapshots from your transaction history for a more complete trend.
              </p>
            </div>
            <button
              onClick={handleBackfill}
              disabled={backfillLoading}
              className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {backfillLoading ? 'Generating...' : 'Generate'}
            </button>
          </div>
        </div>
      )}

      {/* Empty state */}
      {!hasAccounts && (
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
              d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
            />
          </svg>
          <p className="text-gray-600 dark:text-gray-400 font-medium mb-2">No Accounts Yet</p>
          <p className="text-sm text-gray-500 dark:text-gray-500">
            Add accounts to start tracking your net worth
          </p>
        </div>
      )}

      {/* Main content grid */}
      {hasAccounts && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Chart */}
          <div className="lg:col-span-2">
            <NetWorthChart
              data={netWorth?.history || []}
              timeRange={timeRange}
              onTimeRangeChange={setTimeRange}
            />
            {/* Subtle regenerate link */}
            {hasAccounts && !backfillLoading && (
              <button
                onClick={handleBackfill}
                className="text-xs text-gray-400 hover:text-primary-600 dark:hover:text-primary-400 cursor-pointer mt-2"
              >
                Regenerate historical data
              </button>
            )}
            {backfillLoading && (
              <div className="text-xs text-gray-400 mt-2">Generating...</div>
            )}
          </div>

          {/* Account breakdown */}
          <div className="lg:col-span-1">
            <AccountBreakdown
              accounts={netWorth?.accounts || []}
              onToggleInclude={handleToggleInclude}
            />
          </div>
        </div>
      )}
    </div>
  );
}
