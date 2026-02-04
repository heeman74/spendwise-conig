'use client';

import { Suspense, useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { useQuery } from '@apollo/client/react';
import { startOfMonth, endOfMonth } from 'date-fns';
import Card, { CardHeader, CardTitle } from '@/components/ui/Card';
import SpendingPieChart from '@/components/charts/SpendingPieChart';
import TrendLineChart from '@/components/charts/TrendLineChart';
import CategoryBarChart from '@/components/charts/CategoryBarChart';
import TopMerchantsTable from '@/components/charts/TopMerchantsTable';
import DateRangePicker from '@/components/ui/DateRangePicker';
import AccountFilter from '@/components/ui/AccountFilter';
import Spinner from '@/components/ui/Spinner';
import { useAnalytics, useSpendingByCategory, useTopMerchants } from '@/hooks/useDashboard';
import { useAnalyticsFilters } from '@/hooks/useAnalyticsFilters';
import { useAccounts } from '@/hooks/useAccounts';
import { formatCurrency, getCategoryColor } from '@/lib/utils';
import { GET_TRANSACTIONS } from '@/graphql';
import type { CategoryAmount } from '@/types';

function AnalyticsContent() {
  const { dateRange, accountIds, setDateRange, setAccountIds } = useAnalyticsFilters();
  const { accounts, loading: accountsLoading } = useAccounts();
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const drillDownRef = useRef<HTMLDivElement>(null);

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

  // Query transactions for the selected category drill-down
  const { data: drillDownData, loading: drillDownLoading } = useQuery<any>(GET_TRANSACTIONS, {
    variables: {
      filters: {
        category: selectedCategory,
        startDate: dateRange.from,
        endDate: dateRange.to,
      },
      pagination: { page: 1, limit: 50 },
      sort: { field: 'DATE', order: 'DESC' },
    },
    skip: !selectedCategory,
    fetchPolicy: 'cache-and-network',
  });

  const drillDownTransactions = drillDownData?.transactions?.edges?.map((e: any) => e.node) ?? [];
  const drillDownTotal = drillDownData?.transactions?.pageInfo?.totalCount ?? 0;

  // Scroll to drill-down when a category is selected
  useEffect(() => {
    if (selectedCategory && drillDownRef.current) {
      drillDownRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [selectedCategory]);

  // Parse month label (e.g., "Jan 2026") into a date range
  const handleMonthClick = useCallback((monthLabel: string) => {
    const MONTH_MAP: Record<string, number> = {
      Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5,
      Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11,
    };
    const parts = monthLabel.split(' ');
    if (parts.length !== 2) return;
    const monthIndex = MONTH_MAP[parts[0]];
    const year = parseInt(parts[1], 10);
    if (monthIndex === undefined || isNaN(year)) return;

    const monthDate = new Date(year, monthIndex, 1);
    setDateRange({ from: startOfMonth(monthDate), to: endOfMonth(monthDate) });
  }, [setDateRange]);

  const handleCategoryClick = useCallback((category: string) => {
    setSelectedCategory((prev) => prev === category ? null : category);
  }, []);

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

  // Group transactions by merchant/description and compute totals
  const merchantGroups = useMemo(() => {
    if (!selectedCategory || drillDownTransactions.length === 0) return null;

    const groups: Record<string, { name: string; totalAmount: number; count: number }> = {};
    let grandTotal = 0;

    for (const t of drillDownTransactions) {
      const key = (t.merchant || t.description || selectedCategory).toLowerCase().trim();
      const label = t.merchant || t.description || selectedCategory;
      if (!groups[key]) {
        groups[key] = { name: label, totalAmount: 0, count: 0 };
      }
      groups[key].totalAmount += Math.abs(t.amount);
      groups[key].count += 1;
      grandTotal += Math.abs(t.amount);
    }

    const sorted = Object.values(groups).sort((a, b) => b.totalAmount - a.totalAmount);
    return { groups: sorted, grandTotal, transactionCount: drillDownTransactions.length };
  }, [selectedCategory, drillDownTransactions]);

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
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">Click a month to view details</p>
          </CardHeader>
          {analyticsLoading ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-gray-500 dark:text-gray-400">Loading trend data...</div>
            </div>
          ) : analytics?.trends && analytics.trends.labels.length > 0 ? (
            <TrendLineChart data={analytics.trends} onMonthClick={handleMonthClick} />
          ) : (
            <div className="flex items-center justify-center h-64 text-gray-500 dark:text-gray-400">
              No trend data available for this period
            </div>
          )}
        </Card>

        {/* Spending by Category - Pie */}
        <Card>
          <CardHeader>
            <CardTitle>Spending by Category</CardTitle>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">Click a category for details</p>
          </CardHeader>
          {categoriesLoading ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-gray-500 dark:text-gray-400">Loading categories...</div>
            </div>
          ) : (
            <SpendingPieChart data={categories} onCategoryClick={handleCategoryClick} />
          )}
        </Card>

        {/* Spending by Category - Bar */}
        <Card>
          <CardHeader>
            <CardTitle>Spending by Category</CardTitle>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">Click a bar for details</p>
          </CardHeader>
          {categoriesLoading ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-gray-500 dark:text-gray-400">Loading categories...</div>
            </div>
          ) : (
            <CategoryBarChart data={categories} onCategoryClick={handleCategoryClick} />
          )}
        </Card>
      </div>

      {/* Category drill-down panel */}
      {selectedCategory && (
        <div ref={drillDownRef}>
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className="w-4 h-4 rounded-full flex-shrink-0"
                    style={{ backgroundColor: getCategoryColor(selectedCategory) }}
                  />
                  <div>
                    <CardTitle>{selectedCategory}</CardTitle>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                      {merchantGroups
                        ? `${merchantGroups.transactionCount} transaction${merchantGroups.transactionCount !== 1 ? 's' : ''} — ${formatCurrency(merchantGroups.grandTotal)} total`
                        : 'Loading...'}
                      {drillDownTotal > drillDownTransactions.length && ` (showing ${drillDownTransactions.length} of ${drillDownTotal})`}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedCategory(null)}
                  className="p-1 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </CardHeader>
            {drillDownLoading ? (
              <div className="flex items-center justify-center py-8">
                <Spinner size="md" />
              </div>
            ) : !merchantGroups || merchantGroups.groups.length === 0 ? (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                No transactions found for this category in the selected period.
              </div>
            ) : (
              <div className="divide-y divide-gray-100 dark:divide-gray-700">
                {merchantGroups.groups.map((group) => (
                  <div key={group.name} className="flex items-center justify-between py-3 px-1">
                    <div className="flex-1 min-w-0 mr-4">
                      <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                        {group.name}
                      </p>
                      <p className="text-xs text-gray-400 dark:text-gray-500">
                        {group.count} transaction{group.count !== 1 ? 's' : ''}
                      </p>
                    </div>
                    <span className="text-sm font-semibold text-gray-900 dark:text-white flex-shrink-0">
                      {formatCurrency(group.totalAmount)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      )}

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
              <button
                key={category.category}
                onClick={() => handleCategoryClick(category.category)}
                className={`flex items-center gap-4 w-full text-left rounded-lg px-2 py-1 transition-colors ${
                  selectedCategory === category.category
                    ? 'bg-primary-50 dark:bg-primary-900/20 ring-1 ring-primary-200 dark:ring-primary-800'
                    : 'hover:bg-gray-50 dark:hover:bg-gray-800/50'
                }`}
              >
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
              </button>
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
