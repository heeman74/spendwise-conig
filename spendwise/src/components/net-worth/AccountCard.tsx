'use client';

import { LineChart, Line } from 'recharts';
import { formatCurrency } from '@/lib/utils';

interface AccountNetWorth {
  accountId: string;
  accountName: string;
  accountType: string;
  balance: number;
  percentOfTotal: number;
  includeInNetWorth: boolean;
  history: { date: string; value: number }[];
}

interface AccountCardProps {
  account: AccountNetWorth;
  onToggleInclude: (accountId: string) => void;
}

export default function AccountCard({ account, onToggleInclude }: AccountCardProps) {
  const {
    accountId,
    accountName,
    accountType,
    balance,
    percentOfTotal,
    includeInNetWorth,
    history,
  } = account;

  // Account type badge colors
  const typeColors: Record<string, string> = {
    CHECKING: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
    SAVINGS: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
    INVESTMENT: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
    CREDIT: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  };

  const typeColor = typeColors[accountType] || 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';

  return (
    <div
      className={`border border-gray-200 dark:border-gray-700 rounded-lg p-4 transition-opacity ${
        includeInNetWorth ? '' : 'opacity-50'
      }`}
    >
      <div className="space-y-3">
        {/* Header: name and toggle */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <h4 className="text-sm font-medium text-gray-900 dark:text-white truncate">
              {accountName}
            </h4>
            <span className={`inline-block mt-1 px-2 py-0.5 text-xs font-medium rounded ${typeColor}`}>
              {accountType}
            </span>
          </div>

          {/* Toggle switch */}
          <button
            onClick={() => onToggleInclude(accountId)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              includeInNetWorth ? 'bg-primary-600' : 'bg-gray-200 dark:bg-gray-700'
            }`}
            aria-label={`Toggle include ${accountName} in net worth`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                includeInNetWorth ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>

        {/* Balance and percentage */}
        <div className="flex items-baseline justify-between">
          <p className="text-lg font-semibold text-gray-900 dark:text-white">
            {formatCurrency(balance)}
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {percentOfTotal.toFixed(1)}%
          </p>
        </div>

        {/* Mini sparkline */}
        {history && history.length > 0 && (
          <div className="h-10">
            <LineChart width={200} height={40} data={history}>
              <Line
                type="monotone"
                dataKey="value"
                stroke="#3b82f6"
                strokeWidth={1.5}
                dot={false}
                isAnimationActive={false}
              />
            </LineChart>
          </div>
        )}
      </div>
    </div>
  );
}
