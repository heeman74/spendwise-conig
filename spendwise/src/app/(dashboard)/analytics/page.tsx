'use client';

import { useState, useMemo } from 'react';
import Card, { CardHeader, CardTitle } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import SpendingPieChart from '@/components/charts/SpendingPieChart';
import TrendLineChart from '@/components/charts/TrendLineChart';
import CategoryBarChart from '@/components/charts/CategoryBarChart';
import SavingsAreaChart from '@/components/charts/SavingsAreaChart';
import { formatCurrency, formatPercentage } from '@/lib/utils';
import { getSpendingByCategory, getTrendData, getDashboardStats } from '@/data/mockData';

type Period = 'week' | 'month' | 'year';

export default function AnalyticsPage() {
  const [period, setPeriod] = useState<Period>('month');

  const spendingData = useMemo(() => getSpendingByCategory(), []);
  const trendData = useMemo(() => getTrendData(), []);
  const stats = useMemo(() => getDashboardStats(), []);

  const totalSpending = spendingData.reduce((sum, item) => sum + item.amount, 0);

  // Mock savings data for area chart
  const savingsData = trendData.labels.map((label, index) => ({
    name: label,
    savings: trendData.savings[index],
  }));

  // Calculate mock comparison data
  const previousMonthExpenses = stats.monthlyExpenses * 0.92;
  const expenseChange = ((stats.monthlyExpenses - previousMonthExpenses) / previousMonthExpenses) * 100;
  const previousMonthIncome = stats.monthlyIncome * 0.95;
  const incomeChange = ((stats.monthlyIncome - previousMonthIncome) / previousMonthIncome) * 100;

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Analytics</h1>
          <p className="text-gray-500 dark:text-gray-400">
            Understand your spending patterns and financial trends
          </p>
        </div>
        <div className="flex gap-2 bg-gray-100 dark:bg-gray-800 p-1 rounded-lg">
          {(['week', 'month', 'year'] as Period[]).map((p) => (
            <Button
              key={p}
              variant={period === p ? 'primary' : 'ghost'}
              size="sm"
              onClick={() => setPeriod(p)}
              className="capitalize"
            >
              {p}
            </Button>
          ))}
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <p className="text-sm text-gray-500 dark:text-gray-400">Total Spending</p>
          <p className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">
            {formatCurrency(totalSpending)}
          </p>
          <p className={`mt-1 text-sm ${expenseChange > 0 ? 'text-red-600' : 'text-green-600'}`}>
            {formatPercentage(expenseChange)} vs last {period}
          </p>
        </Card>
        <Card>
          <p className="text-sm text-gray-500 dark:text-gray-400">Total Income</p>
          <p className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">
            {formatCurrency(stats.monthlyIncome)}
          </p>
          <p className={`mt-1 text-sm ${incomeChange > 0 ? 'text-green-600' : 'text-red-600'}`}>
            {formatPercentage(incomeChange)} vs last {period}
          </p>
        </Card>
        <Card>
          <p className="text-sm text-gray-500 dark:text-gray-400">Net Savings</p>
          <p className="mt-1 text-2xl font-bold text-green-600 dark:text-green-400">
            {formatCurrency(stats.monthlyIncome - stats.monthlyExpenses)}
          </p>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {stats.savingsRate}% savings rate
          </p>
        </Card>
        <Card>
          <p className="text-sm text-gray-500 dark:text-gray-400">Avg. Daily Spending</p>
          <p className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">
            {formatCurrency(totalSpending / 30)}
          </p>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Over {period === 'week' ? 7 : period === 'month' ? 30 : 365} days
          </p>
        </Card>
      </div>

      {/* Charts grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Income vs Expenses Trend */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Income vs Expenses Trend</CardTitle>
          </CardHeader>
          <TrendLineChart data={trendData} />
        </Card>

        {/* Spending by Category - Pie */}
        <Card>
          <CardHeader>
            <CardTitle>Spending by Category</CardTitle>
          </CardHeader>
          <SpendingPieChart data={spendingData} />
        </Card>

        {/* Savings Over Time */}
        <Card>
          <CardHeader>
            <CardTitle>Savings Over Time</CardTitle>
          </CardHeader>
          <SavingsAreaChart data={savingsData} goalAmount={2000} />
        </Card>

        {/* Category Breakdown - Bar */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Category Breakdown</CardTitle>
          </CardHeader>
          <CategoryBarChart data={spendingData} />
        </Card>
      </div>

      {/* Top spending categories */}
      <Card>
        <CardHeader>
          <CardTitle>Top Spending Categories</CardTitle>
        </CardHeader>
        <div className="space-y-4">
          {spendingData.slice(0, 5).map((category, index) => (
            <div key={category.category} className="flex items-center gap-4">
              <span className="w-6 text-sm text-gray-500 dark:text-gray-400">#{index + 1}</span>
              <div
                className="w-4 h-4 rounded-full"
                style={{ backgroundColor: category.color }}
              />
              <div className="flex-1">
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
              <span className="w-16 text-right text-sm text-gray-500 dark:text-gray-400">
                {category.percentage.toFixed(1)}%
              </span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
