'use client';

import Link from 'next/link';
import { useSelector } from 'react-redux';
import Card, { CardHeader, CardTitle } from '@/components/ui/Card';
import Spinner from '@/components/ui/Spinner';
import { useRecurringSummary } from '@/hooks/useRecurring';
import { formatCurrency } from '@/lib/utils';

export default function RecurringSummaryWidget() {
  const isDemo = useSelector((state: any) => state.auth.isDemo);
  const { summary, loading, error } = useRecurringSummary();

  // Loading state
  if (!isDemo && loading && !summary) {
    return (
      <Card className="min-h-[200px] flex items-center justify-center">
        <Spinner size="lg" />
      </Card>
    );
  }

  // Error state
  if (!isDemo && error) {
    return (
      <Link href="/recurring">
        <Card className="cursor-pointer hover:shadow-lg transition-shadow">
          <CardHeader>
            <CardTitle>Recurring Bills</CardTitle>
          </CardHeader>
          <div>
            <p className="text-sm text-red-500">Unable to load recurring data</p>
          </div>
          <div className="mt-4 text-sm text-primary-600 dark:text-primary-400 font-medium">
            View Details →
          </div>
        </Card>
      </Link>
    );
  }

  // Demo mode or no data
  if (isDemo || !summary) {
    return (
      <Link href="/recurring">
        <Card className="cursor-pointer hover:shadow-lg transition-shadow">
          <CardHeader>
            <CardTitle>Recurring Bills</CardTitle>
          </CardHeader>
          <div className="text-center py-4">
            <svg
              className="w-12 h-12 mx-auto text-gray-300 dark:text-gray-600 mb-3"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
            <p className="text-sm text-gray-500 dark:text-gray-400">No recurring transactions detected</p>
          </div>
          <div className="text-sm text-primary-600 dark:text-primary-400 font-medium">
            View Details →
          </div>
        </Card>
      </Link>
    );
  }

  const netIsPositive = summary.netRecurring >= 0;

  return (
    <Link href="/recurring">
      <Card className="cursor-pointer hover:shadow-lg transition-shadow">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Recurring Bills</CardTitle>
            <span className="text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded-full">
              {summary.activeCount} active
            </span>
          </div>
        </CardHeader>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-500 dark:text-gray-400">Monthly Expenses</span>
            <span className="text-sm font-medium text-red-600 dark:text-red-400">
              -{formatCurrency(summary.totalRecurringExpenses)}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-500 dark:text-gray-400">Monthly Income</span>
            <span className="text-sm font-medium text-green-600 dark:text-green-400">
              +{formatCurrency(summary.totalRecurringIncome)}
            </span>
          </div>
          <div className="border-t border-gray-200 dark:border-gray-700 pt-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-900 dark:text-white">Net Recurring</span>
              <span
                className={`text-sm font-bold ${
                  netIsPositive
                    ? 'text-green-600 dark:text-green-400'
                    : 'text-red-600 dark:text-red-400'
                }`}
              >
                {netIsPositive ? '+' : ''}{formatCurrency(summary.netRecurring)}
              </span>
            </div>
          </div>
        </div>
        <div className="mt-4 text-sm text-primary-600 dark:text-primary-400 font-medium">
          Manage Recurring →
        </div>
      </Card>
    </Link>
  );
}
