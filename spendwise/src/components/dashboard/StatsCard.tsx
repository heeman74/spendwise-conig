'use client';

import Card from '../ui/Card';
import { cn, formatCurrency, formatPercentage } from '@/lib/utils';

interface StatsCardProps {
  title: string;
  value: number;
  change?: number;
  changeLabel?: string;
  icon: React.ReactNode;
  format?: 'currency' | 'percentage' | 'number';
  trend?: 'up' | 'down' | 'neutral';
}

export default function StatsCard({
  title,
  value,
  change,
  changeLabel,
  icon,
  format = 'currency',
  trend,
}: StatsCardProps) {
  const formattedValue = () => {
    switch (format) {
      case 'currency':
        return formatCurrency(value);
      case 'percentage':
        return `${value.toFixed(1)}%`;
      case 'number':
        return value.toLocaleString();
      default:
        return value;
    }
  };

  const determineTrend = () => {
    if (trend) return trend;
    if (change === undefined || change === 0) return 'neutral';
    return change > 0 ? 'up' : 'down';
  };

  const currentTrend = determineTrend();

  return (
    <Card className="relative overflow-hidden">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{title}</p>
          <p className="mt-2 text-2xl font-bold text-gray-900 dark:text-white">{formattedValue()}</p>
          {change !== undefined && (
            <div className="mt-2 flex items-center gap-1">
              <span
                className={cn(
                  'inline-flex items-center text-sm font-medium',
                  currentTrend === 'up' && 'text-green-600 dark:text-green-400',
                  currentTrend === 'down' && 'text-red-600 dark:text-red-400',
                  currentTrend === 'neutral' && 'text-gray-500 dark:text-gray-400'
                )}
              >
                {currentTrend === 'up' && (
                  <svg className="w-4 h-4 mr-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
                  </svg>
                )}
                {currentTrend === 'down' && (
                  <svg className="w-4 h-4 mr-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                  </svg>
                )}
                {formatPercentage(change)}
              </span>
              {changeLabel && (
                <span className="text-sm text-gray-500 dark:text-gray-400">{changeLabel}</span>
              )}
            </div>
          )}
        </div>
        <div className="p-3 rounded-lg bg-primary-50 text-primary-600 dark:bg-primary-900/20 dark:text-primary-400">
          {icon}
        </div>
      </div>
    </Card>
  );
}
