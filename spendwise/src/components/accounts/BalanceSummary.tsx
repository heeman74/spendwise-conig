'use client';

import type { Account } from '@/types';

interface BalanceSummaryProps {
  accounts: Account[];
}

export default function BalanceSummary({ accounts }: BalanceSummaryProps) {
  // Calculate totals per account type
  const checkingTotal = accounts
    .filter((a) => a.type === 'CHECKING')
    .reduce((sum, a) => sum + a.balance, 0);

  const savingsTotal = accounts
    .filter((a) => a.type === 'SAVINGS')
    .reduce((sum, a) => sum + a.balance, 0);

  const creditTotal = Math.abs(
    accounts
      .filter((a) => a.type === 'CREDIT')
      .reduce((sum, a) => sum + a.balance, 0)
  );

  const investmentTotal = accounts
    .filter((a) => a.type === 'INVESTMENT')
    .reduce((sum, a) => sum + a.balance, 0);

  // Calculate counts
  const checkingCount = accounts.filter((a) => a.type === 'CHECKING').length;
  const savingsCount = accounts.filter((a) => a.type === 'SAVINGS').length;
  const creditCount = accounts.filter((a) => a.type === 'CREDIT').length;
  const investmentCount = accounts.filter((a) => a.type === 'INVESTMENT').length;

  // Net worth: checking + savings + investment - credit
  const netWorth = checkingTotal + savingsTotal + investmentTotal - creditTotal;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Checking */}
        <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-4 bg-white dark:bg-gray-800">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Checking</p>
            <div className="w-2 h-2 rounded-full bg-blue-500"></div>
          </div>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">
            {formatCurrency(checkingTotal)}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            {checkingCount} {checkingCount === 1 ? 'account' : 'accounts'}
          </p>
        </div>

        {/* Savings */}
        <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-4 bg-white dark:bg-gray-800">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Savings</p>
            <div className="w-2 h-2 rounded-full bg-green-500"></div>
          </div>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">
            {formatCurrency(savingsTotal)}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            {savingsCount} {savingsCount === 1 ? 'account' : 'accounts'}
          </p>
        </div>

        {/* Credit */}
        <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-4 bg-white dark:bg-gray-800">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Credit Cards</p>
            <div className="w-2 h-2 rounded-full bg-orange-500"></div>
          </div>
          <p className="text-2xl font-bold text-red-600 dark:text-red-400">
            {formatCurrency(creditTotal)}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            {creditCount} {creditCount === 1 ? 'account' : 'accounts'}
          </p>
        </div>

        {/* Investment */}
        <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-4 bg-white dark:bg-gray-800">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Investments</p>
            <div className="w-2 h-2 rounded-full bg-purple-500"></div>
          </div>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">
            {formatCurrency(investmentTotal)}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            {investmentCount} {investmentCount === 1 ? 'account' : 'accounts'}
          </p>
        </div>
      </div>

      {/* Net Worth */}
      <div className="rounded-lg border-2 border-gray-300 dark:border-gray-600 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-gray-800 dark:to-gray-700">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Net Worth</p>
            <p className={`text-3xl font-bold mt-1 ${
              netWorth >= 0
                ? 'text-green-600 dark:text-green-400'
                : 'text-red-600 dark:text-red-400'
            }`}>
              {formatCurrency(netWorth)}
            </p>
          </div>
          <div className="text-right text-xs text-gray-500 dark:text-gray-400">
            <p>Assets: {formatCurrency(checkingTotal + savingsTotal + investmentTotal)}</p>
            <p>Liabilities: {formatCurrency(creditTotal)}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
