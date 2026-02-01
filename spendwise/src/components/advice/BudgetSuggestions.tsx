'use client';

import Card, { CardHeader, CardTitle } from '../ui/Card';
import { formatCurrency } from '@/lib/utils';

interface BudgetSuggestionsProps {
  needs: {
    current: number;
    target: number;
    categories: string[];
  };
  wants: {
    current: number;
    target: number;
    categories: string[];
  };
  savings: {
    current: number;
    target: number;
  };
  totalIncome: number;
}

export default function BudgetSuggestions({
  needs,
  wants,
  savings,
  totalIncome,
}: BudgetSuggestionsProps) {
  const needsPercent = totalIncome > 0 ? (needs.current / totalIncome) * 100 : 0;
  const wantsPercent = totalIncome > 0 ? (wants.current / totalIncome) * 100 : 0;
  const savingsPercent = totalIncome > 0 ? (savings.current / totalIncome) * 100 : 0;

  const categories = [
    {
      name: 'Needs',
      description: 'Essential expenses like housing, food, utilities',
      current: needs.current,
      target: needs.target,
      currentPercent: needsPercent,
      targetPercent: 50,
      color: 'bg-blue-500',
      status: needsPercent <= 50 ? 'good' : 'warning',
      examples: needs.categories.slice(0, 3).join(', '),
    },
    {
      name: 'Wants',
      description: 'Non-essential spending like entertainment, dining out',
      current: wants.current,
      target: wants.target,
      currentPercent: wantsPercent,
      targetPercent: 30,
      color: 'bg-yellow-500',
      status: wantsPercent <= 30 ? 'good' : 'warning',
      examples: wants.categories.slice(0, 3).join(', '),
    },
    {
      name: 'Savings',
      description: 'Emergency fund, investments, debt payoff',
      current: savings.current,
      target: savings.target,
      currentPercent: savingsPercent,
      targetPercent: 20,
      color: 'bg-green-500',
      status: savingsPercent >= 20 ? 'good' : 'warning',
      examples: 'Emergency fund, retirement',
    },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>50/30/20 Budget Analysis</CardTitle>
      </CardHeader>
      <div className="space-y-6">
        <p className="text-sm text-gray-600 dark:text-gray-400">
          The 50/30/20 rule suggests allocating 50% of income to needs, 30% to wants, and 20% to
          savings.
        </p>

        {/* Visual summary */}
        <div className="flex h-6 rounded-full overflow-hidden">
          <div
            className="bg-blue-500 transition-all duration-500"
            style={{ width: `${Math.min(needsPercent, 100)}%` }}
            title={`Needs: ${needsPercent.toFixed(1)}%`}
          />
          <div
            className="bg-yellow-500 transition-all duration-500"
            style={{ width: `${Math.min(wantsPercent, 100 - needsPercent)}%` }}
            title={`Wants: ${wantsPercent.toFixed(1)}%`}
          />
          <div
            className="bg-green-500 transition-all duration-500"
            style={{ width: `${Math.min(savingsPercent, 100 - needsPercent - wantsPercent)}%` }}
            title={`Savings: ${savingsPercent.toFixed(1)}%`}
          />
        </div>

        {/* Detailed breakdown */}
        <div className="space-y-4">
          {categories.map((category) => (
            <div key={category.name} className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full ${category.color}`} />
                  <span className="font-medium text-gray-900 dark:text-white">
                    {category.name}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`text-sm font-semibold ${
                      category.status === 'good'
                        ? 'text-green-600 dark:text-green-400'
                        : 'text-yellow-600 dark:text-yellow-400'
                    }`}
                  >
                    {category.currentPercent.toFixed(1)}%
                  </span>
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    / {category.targetPercent}% target
                  </span>
                </div>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                {category.description}
              </p>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400">
                  Current: {formatCurrency(category.current)}
                </span>
                <span className="text-gray-600 dark:text-gray-400">
                  Target: {formatCurrency(category.target)}
                </span>
              </div>
              {category.examples && (
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
                  Examples: {category.examples}
                </p>
              )}
            </div>
          ))}
        </div>

        {/* Recommendations */}
        <div className="p-4 bg-primary-50 dark:bg-primary-900/20 rounded-lg">
          <h4 className="font-medium text-primary-700 dark:text-primary-400 mb-2">
            Recommendations
          </h4>
          <ul className="space-y-1 text-sm text-primary-600 dark:text-primary-300">
            {needsPercent > 50 && (
              <li>
                Consider reducing essential expenses by {formatCurrency(needs.current - needs.target)}
              </li>
            )}
            {wantsPercent > 30 && (
              <li>
                Try cutting discretionary spending by {formatCurrency(wants.current - wants.target)}
              </li>
            )}
            {savingsPercent < 20 && (
              <li>
                Aim to save an additional{' '}
                {formatCurrency(savings.target - savings.current)} per month
              </li>
            )}
            {needsPercent <= 50 && wantsPercent <= 30 && savingsPercent >= 20 && (
              <li>Great job! Your budget is well-balanced according to the 50/30/20 rule.</li>
            )}
          </ul>
        </div>
      </div>
    </Card>
  );
}
