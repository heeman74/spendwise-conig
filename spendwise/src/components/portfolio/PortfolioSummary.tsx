'use client';

import { formatCurrency, cn } from '@/lib/utils';

interface PortfolioSummaryProps {
  totalValue: number;
  totalCostBasis: number;
  totalGain: number;
  totalGainPercent: number;
  holdingCount: number;
  accountCount: number;
}

export default function PortfolioSummary({
  totalValue,
  totalCostBasis,
  totalGain,
  totalGainPercent,
  holdingCount,
  accountCount,
}: PortfolioSummaryProps) {
  const gainPositive = totalGain >= 0;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
      <div className="space-y-4">
        {/* Total Portfolio Value */}
        <div>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">
            Total Portfolio Value
          </p>
          <p className="text-3xl font-bold text-gray-900 dark:text-white">
            {formatCurrency(totalValue)}
          </p>
        </div>

        {/* Total Gain/Loss */}
        <div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Total Gain/Loss</p>
          <div
            className={cn(
              'flex items-center gap-1 text-lg font-semibold',
              gainPositive
                ? 'text-green-600 dark:text-green-400'
                : 'text-red-600 dark:text-red-400'
            )}
          >
            <span>
              {gainPositive ? '+' : ''}
              {formatCurrency(totalGain)}
            </span>
            <span className="text-sm">
              ({gainPositive ? '+' : ''}
              {totalGainPercent.toFixed(2)}%)
            </span>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-3 gap-4 pt-4 border-t border-gray-200 dark:border-gray-700">
          <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-3">
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Cost Basis</p>
            <p className="text-sm font-medium text-gray-900 dark:text-white">
              {formatCurrency(totalCostBasis)}
            </p>
          </div>
          <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-3">
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Holdings</p>
            <p className="text-sm font-medium text-gray-900 dark:text-white">
              {holdingCount}
            </p>
          </div>
          <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-3">
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Accounts</p>
            <p className="text-sm font-medium text-gray-900 dark:text-white">
              {accountCount}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
