'use client';

import Card, { CardHeader, CardTitle } from '../ui/Card';
import SpendingPieChart from '../charts/SpendingPieChart';
import { formatCurrency } from '@/lib/utils';
import type { CategoryAmount } from '@/types';

interface SpendingOverviewProps {
  data: CategoryAmount[];
  totalSpending: number;
  period: string;
}

export default function SpendingOverview({ data, totalSpending, period }: SpendingOverviewProps) {
  return (
    <Card>
      <CardHeader className="flex items-center justify-between">
        <CardTitle>Spending by Category</CardTitle>
        <span className="text-sm text-gray-500 dark:text-gray-400 capitalize">{period}</span>
      </CardHeader>
      <div className="flex flex-col lg:flex-row items-center gap-6">
        <div className="w-full lg:w-1/2">
          <SpendingPieChart data={data} showLegend={false} />
        </div>
        <div className="w-full lg:w-1/2 space-y-3">
          <div className="mb-4">
            <p className="text-sm text-gray-500 dark:text-gray-400">Total Spending</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              {formatCurrency(totalSpending)}
            </p>
          </div>
          {data.slice(0, 5).map((category) => (
            <div key={category.category} className="flex items-center gap-3">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: category.color }}
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300 truncate">
                    {category.category}
                  </span>
                  <span className="text-sm text-gray-500 dark:text-gray-400 ml-2">
                    {category.percentage.toFixed(1)}%
                  </span>
                </div>
                <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-1.5">
                  <div
                    className="h-1.5 rounded-full transition-all duration-500"
                    style={{
                      width: `${category.percentage}%`,
                      backgroundColor: category.color,
                    }}
                  />
                </div>
              </div>
              <span className="text-sm font-medium text-gray-900 dark:text-white whitespace-nowrap">
                {formatCurrency(category.amount)}
              </span>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}
