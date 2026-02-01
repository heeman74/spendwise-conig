'use client';

import Card, { CardHeader, CardTitle } from '../ui/Card';
import { formatCurrency } from '@/lib/utils';

interface InvestmentTipsProps {
  emergencyFund: {
    current: number;
    recommended: number;
    monthsOfExpenses: number;
  };
  debtStrategy: {
    totalDebt: number;
    recommendation: string;
  };
  allocation: {
    stocks: number;
    bonds: number;
    cash: number;
  };
}

export default function InvestmentTips({
  emergencyFund,
  debtStrategy,
  allocation,
}: InvestmentTipsProps) {
  const emergencyProgress = Math.min(
    (emergencyFund.current / emergencyFund.recommended) * 100,
    100
  );

  return (
    <div className="space-y-6">
      {/* Emergency Fund */}
      <Card>
        <CardHeader>
          <CardTitle>Emergency Fund Status</CardTitle>
        </CardHeader>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600 dark:text-gray-400">Current</span>
            <span className="font-semibold text-gray-900 dark:text-white">
              {formatCurrency(emergencyFund.current)}
            </span>
          </div>
          <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-3">
            <div
              className="h-3 rounded-full bg-primary-500 transition-all duration-500"
              style={{ width: `${emergencyProgress}%` }}
            />
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-500 dark:text-gray-400">
              {emergencyFund.monthsOfExpenses.toFixed(1)} months covered
            </span>
            <span className="text-gray-500 dark:text-gray-400">
              Goal: {formatCurrency(emergencyFund.recommended)} (6 months)
            </span>
          </div>
          {emergencyFund.monthsOfExpenses < 3 && (
            <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
              <p className="text-sm text-yellow-700 dark:text-yellow-400">
                We recommend building up at least 3-6 months of expenses in your emergency fund.
              </p>
            </div>
          )}
        </div>
      </Card>

      {/* Debt Strategy */}
      {debtStrategy.totalDebt > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Debt Strategy</CardTitle>
          </CardHeader>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-400">Total Debt</span>
              <span className="font-semibold text-red-600 dark:text-red-400">
                {formatCurrency(debtStrategy.totalDebt)}
              </span>
            </div>
            <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <p className="text-sm text-blue-700 dark:text-blue-400">
                {debtStrategy.recommendation}
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* Investment Allocation */}
      <Card>
        <CardHeader>
          <CardTitle>Suggested Portfolio Allocation</CardTitle>
        </CardHeader>
        <div className="space-y-4">
          <div className="flex h-4 rounded-full overflow-hidden">
            <div
              className="bg-blue-500"
              style={{ width: `${allocation.stocks}%` }}
              title={`Stocks: ${allocation.stocks}%`}
            />
            <div
              className="bg-green-500"
              style={{ width: `${allocation.bonds}%` }}
              title={`Bonds: ${allocation.bonds}%`}
            />
            <div
              className="bg-gray-400"
              style={{ width: `${allocation.cash}%` }}
              title={`Cash: ${allocation.cash}%`}
            />
          </div>
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-blue-500" />
              <span className="text-gray-600 dark:text-gray-400">
                Stocks {allocation.stocks}%
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-green-500" />
              <span className="text-gray-600 dark:text-gray-400">
                Bonds {allocation.bonds}%
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-gray-400" />
              <span className="text-gray-600 dark:text-gray-400">Cash {allocation.cash}%</span>
            </div>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Based on your age and risk tolerance. Consult a financial advisor for personalized
            advice.
          </p>
        </div>
      </Card>
    </div>
  );
}
