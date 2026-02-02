'use client';

import Card from '@/components/ui/Card';
import { formatCurrency } from '@/lib/utils';

interface RecurringSummaryProps {
  summary?: {
    totalRecurringExpenses: number;
    totalRecurringIncome: number;
    netRecurring: number;
    activeCount: number;
    incomeRatio?: number | null;
  };
  loading: boolean;
}

export default function RecurringSummary({ summary, loading }: RecurringSummaryProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i}>
            <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mb-2" />
            <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
          </Card>
        ))}
      </div>
    );
  }

  if (!summary) {
    return null;
  }

  const netIsPositive = summary.netRecurring >= 0;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Total Recurring Expenses */}
      <Card>
        <p className="text-sm text-gray-500 dark:text-gray-400">Monthly Recurring Expenses</p>
        <p className="mt-1 text-2xl font-bold text-red-600 dark:text-red-400">
          {formatCurrency(summary.totalRecurringExpenses)}
        </p>
        {summary.incomeRatio !== null && summary.incomeRatio !== undefined && (
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            {summary.incomeRatio.toFixed(0)}% of income goes to fixed costs
          </p>
        )}
      </Card>

      {/* Total Recurring Income */}
      <Card>
        <p className="text-sm text-gray-500 dark:text-gray-400">Monthly Recurring Income</p>
        <p className="mt-1 text-2xl font-bold text-green-600 dark:text-green-400">
          {formatCurrency(summary.totalRecurringIncome)}
        </p>
      </Card>

      {/* Net Recurring */}
      <Card>
        <p className="text-sm text-gray-500 dark:text-gray-400">Net Monthly Recurring</p>
        <p
          className={`mt-1 text-2xl font-bold ${
            netIsPositive
              ? 'text-green-600 dark:text-green-400'
              : 'text-red-600 dark:text-red-400'
          }`}
        >
          {formatCurrency(summary.netRecurring)}
        </p>
      </Card>

      {/* Active Count */}
      <Card>
        <p className="text-sm text-gray-500 dark:text-gray-400">Active Subscriptions</p>
        <p className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">
          {summary.activeCount}
        </p>
      </Card>
    </div>
  );
}
