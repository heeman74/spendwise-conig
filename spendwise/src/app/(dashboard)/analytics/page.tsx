'use client';

import { Suspense } from 'react';
import Card, { CardHeader, CardTitle } from '@/components/ui/Card';
import SpendingPieChart from '@/components/charts/SpendingPieChart';
import TrendLineChart from '@/components/charts/TrendLineChart';
import CategoryBarChart from '@/components/charts/CategoryBarChart';
import TopMerchantsTable from '@/components/charts/TopMerchantsTable';
import DateRangePicker from '@/components/ui/DateRangePicker';
import AccountFilter from '@/components/ui/AccountFilter';
import { useAnalytics, useSpendingByCategory, useTopMerchants } from '@/hooks/useDashboard';
import { useAnalyticsFilters } from '@/hooks/useAnalyticsFilters';
import { useAccounts } from '@/hooks/useAccounts';
import { formatCurrency, formatPercentage } from '@/lib/utils';
import type { CategoryAmount } from '@/types';

function AnalyticsContent() {
  const { dateRange, accountIds, setDateRange, setAccountIds } = useAnalyticsFilters();
  const { accounts, loading: accountsLoading } = useAccounts();

  const { analytics, loading: analyticsLoading, error: analyticsError } = useAnalytics({
    dateRange,
    accountIds,
  });

  const { categories, loading: categoriesLoading, error: categoriesError } = useSpendingByCategory({
    dateRange,
    accountIds,
  });

  const { merchants, loading: merchantsLoading, error: merchantsError } = useTopMerchants({
    dateRange,
    accountIds,
    limit: 10,
  });

  // Error handling
  if (analyticsError || categoriesError || merchantsError) {
    return (
      <div className="space-y-6">
        <Card className="bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800">
          <p className="text-red-800 dark:text-red-300">
            Failed to load analytics. Please try again.
          </p>
        </Card>
      </div>
    );
  }

  // Helper to render comparison with proper colors
  const renderComparison = (change: number | undefined | null, isExpense: boolean = false) => {
    if (change === undefined || change === null) {
      return (
        <span className="text-sm text-gray-500 dark:text-gray-400">No change</span>
      );
    }

    if (change === 0) {
      return (
        <span className="text-sm text-gray-500 dark:text-gray-400">No change</span>
      );
    }

    const isPositive = change > 0;
    // For expenses, UP is bad (red), DOWN is good (green)
    // For income, UP is good (green), DOWN is bad (red)
    const isGood = isExpense ? !isPositive : isPositive;
    const color = isGood ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400';
    const arrow = isPositive ? '↑' : '↓';

    return (
      <div className="flex items-center gap-1 mt-1">
        <span className={`text-sm ${color}`}>
          {arrow} {Math.abs(change).toFixed(1)}%
        </span>
        <span className="text-sm text-gray-500 dark:text-gray-400">vs last period</span>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Page header with filters */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Spending Analysis</h1>
            <p className="text-gray-500 dark:text-gray-400">
              Understand your spending patterns and financial trends
            </p>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <DateRangePicker value={dateRange} onChange={setDateRange} />
            <AccountFilter
              accounts={accounts}
              selectedIds={accountIds}
              onChange={setAccountIds}
            />
          </div>
        </div>
      </div>

      {/* Summary comparison cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Spending */}
        <Card>
          <p className="text-sm text-gray-500 dark:text-gray-400">Total Spending</p>
          {analyticsLoading ? (
            <div className="mt-1 h-8 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
          ) : (
            <>
              <p className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">
                {formatCurrency(analytics?.summary?.totalExpenses ?? 0)}
              </p>
              {renderComparison(analytics?.comparison?.expensesChange, true)}
            </>
          )}
        </Card>

        {/* Total Income */}
        <Card>
          <p className="text-sm text-gray-500 dark:text-gray-400">Total Income</p>
          {analyticsLoading ? (
            <div className="mt-1 h-8 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
          ) : (
            <>
              <p className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">
                {formatCurrency(analytics?.summary?.totalIncome ?? 0)}
              </p>
              {renderComparison(analytics?.comparison?.incomeChange, false)}
            </>
          )}
        </Card>

        {/* Net Savings */}
        <Card>
          <p className="text-sm text-gray-500 dark:text-gray-400">Net Savings</p>
          {analyticsLoading ? (
            <div className="mt-1 h-8 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
          ) : (
            <>
              <p className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">
                {formatCurrency(analytics?.summary?.netSavings ?? 0)}
              </p>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                {analytics?.summary?.savingsRate?.toFixed(1) ?? 0}% savings rate
              </p>
            </>
          )}
        </Card>

        {/* Avg. Transaction */}
        <Card>
          <p className="text-sm text-gray-500 dark:text-gray-400">Avg. Transaction</p>
          {analyticsLoading ? (
            <div className="mt-1 h-8 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
          ) : (
            <>
              <p className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">
                {formatCurrency(analytics?.summary?.averageTransaction ?? 0)}
              </p>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                {analytics?.summary?.transactionCount ?? 0} transactions
              </p>
            </>
          )}
        </Card>
      </div>

      {/* Charts grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Income vs Expenses Trend - Full width */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Income vs Expenses Trend</CardTitle>
          </CardHeader>
          {analyticsLoading ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-gray-500 dark:text-gray-400">Loading trend data...</div>
            </div>
          ) : analytics?.trends && analytics.trends.labels.length > 0 ? (
            <TrendLineChart data={analytics.trends} />
          ) : (
            <div className="flex items-center justify-center h-64 text-gray-500 dark:text-gray-400">
              No trend data available for this period
            </div>
          )}
        </Card>

        {/* Spending by Category - Pie */}
        <Card>
          <CardHeader>
            <CardTitle>Spending by Category - Pie</CardTitle>
          </CardHeader>
          {categoriesLoading ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-gray-500 dark:text-gray-400">Loading categories...</div>
            </div>
          ) : (
            <SpendingPieChart data={categories} />
          )}
        </Card>

        {/* Spending by Category - Bar */}
        <Card>
          <CardHeader>
            <CardTitle>Spending by Category - Bar</CardTitle>
          </CardHeader>
          {categoriesLoading ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-gray-500 dark:text-gray-400">Loading categories...</div>
            </div>
          ) : (
            <CategoryBarChart data={categories} />
          )}
        </Card>
      </div>

      {/* Top Merchants section */}
      <Card>
        <CardHeader>
          <CardTitle>Top Merchants</CardTitle>
        </CardHeader>
        <TopMerchantsTable merchants={merchants} loading={merchantsLoading} />
      </Card>

      {/* Top spending categories list */}
      <Card>
        <CardHeader>
          <CardTitle>Top Spending Categories</CardTitle>
        </CardHeader>
        {categoriesLoading ? (
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-16 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
            ))}
          </div>
        ) : categories.length === 0 ? (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            No transactions found for this period. Try expanding your date range or changing account filters.
          </div>
        ) : (
          <div className="space-y-4">
            {categories.slice(0, 5).map((category: CategoryAmount, index: number) => (
              <div key={category.category} className="flex items-center gap-4">
                <span className="w-6 text-sm text-gray-500 dark:text-gray-400">#{index + 1}</span>
                <div
                  className="w-4 h-4 rounded-full flex-shrink-0"
                  style={{ backgroundColor: category.color }}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium text-gray-900 dark:text-white">
                      {category.category}
                    </span>
                    <span className="text-gray-600 dark:text-gray-400">
                      {formatCurrency(category.amount)}
                    </span>
                  </div>
                  <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-2">
                    <div
                      className="h-2 rounded-full transition-all duration-500"
                      style={{
                        width: `${category.percentage}%`,
                        backgroundColor: category.color,
                      }}
                    />
                  </div>
                </div>
                <span className="w-16 text-right text-sm text-gray-500 dark:text-gray-400 flex-shrink-0">
                  {category.percentage.toFixed(1)}%
                </span>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

export default function AnalyticsPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-gray-500 dark:text-gray-400">Loading analytics...</div>
      </div>
    }>
      <AnalyticsContent />
    </Suspense>
  );
}
