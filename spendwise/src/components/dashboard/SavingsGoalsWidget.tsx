'use client';

import Link from 'next/link';
import Card, { CardHeader, CardTitle } from '@/components/ui/Card';
import { formatCurrency } from '@/lib/utils';
import type { SavingsGoal } from '@/types';

interface SavingsGoalsWidgetProps {
  goals: SavingsGoal[];
}

export default function SavingsGoalsWidget({ goals }: SavingsGoalsWidgetProps) {
  if (!goals || goals.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Savings Goals</CardTitle>
        </CardHeader>
        <div className="text-center py-6">
          <svg
            className="w-12 h-12 mx-auto text-gray-300 dark:text-gray-600 mb-3"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"
            />
          </svg>
          <p className="text-sm text-gray-500 dark:text-gray-400">No savings goals yet</p>
          <Link
            href="/savings"
            className="text-sm text-primary-600 dark:text-primary-400 font-medium hover:underline mt-2 inline-block"
          >
            Create a goal →
          </Link>
        </div>
      </Card>
    );
  }

  const displayGoals = goals.slice(0, 3);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Savings Goals</CardTitle>
          <Link
            href="/savings"
            className="text-sm text-primary-600 dark:text-primary-400 font-medium hover:underline"
          >
            View All →
          </Link>
        </div>
      </CardHeader>
      <div className="space-y-4">
        {displayGoals.map((goal) => {
          const progress = goal.targetAmount > 0
            ? Math.min((goal.currentAmount / goal.targetAmount) * 100, 100)
            : 0;

          const daysRemaining = goal.deadline
            ? Math.max(0, Math.ceil((new Date(goal.deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
            : null;

          return (
            <div key={goal.id}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium text-gray-900 dark:text-white">
                  {goal.name}
                </span>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {daysRemaining !== null
                    ? daysRemaining === 0
                      ? 'Due today'
                      : `${daysRemaining}d left`
                    : 'No deadline'}
                </span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div
                  className="bg-primary-600 dark:bg-primary-500 h-2 rounded-full transition-all"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <div className="flex items-center justify-between mt-1">
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {formatCurrency(goal.currentAmount)}
                </span>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {formatCurrency(goal.targetAmount)}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
