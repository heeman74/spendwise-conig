'use client';

import Card from '@/components/ui/Card';
import { formatCurrency, formatPercentage } from '@/lib/utils';

interface NetWorthHeroProps {
  current: number;
  monthOverMonthChange: number;
  monthOverMonthChangePercent: number;
  periodChange: number;
  periodChangePercent: number;
  timeRangeLabel: string;
}

export default function NetWorthHero({
  current,
  monthOverMonthChange,
  monthOverMonthChangePercent,
  periodChange,
  periodChangePercent,
  timeRangeLabel,
}: NetWorthHeroProps) {
  const momPositive = monthOverMonthChange >= 0;
  const periodPositive = periodChange >= 0;

  return (
    <Card>
      <div className="space-y-4">
        {/* Current net worth */}
        <div>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Total Net Worth</p>
          <p className="text-4xl font-bold text-gray-900 dark:text-white">
            {formatCurrency(current)}
          </p>
        </div>

        {/* Change indicators */}
        <div className="flex flex-wrap gap-6">
          {/* Month-over-month */}
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Month-over-Month</p>
            <div className={`flex items-center gap-1 text-sm font-medium ${momPositive ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {momPositive ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                )}
              </svg>
              <span>{formatCurrency(Math.abs(monthOverMonthChange))}</span>
              <span className="text-xs">
                ({formatPercentage(monthOverMonthChangePercent)})
              </span>
            </div>
          </div>

          {/* Period change */}
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
              {timeRangeLabel} Change
            </p>
            <div className={`flex items-center gap-1 text-sm font-medium ${periodPositive ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {periodPositive ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                )}
              </svg>
              <span>{formatCurrency(Math.abs(periodChange))}</span>
              <span className="text-xs">
                ({formatPercentage(periodChangePercent)})
              </span>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}
