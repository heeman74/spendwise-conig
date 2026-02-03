'use client';

import { useState } from 'react';
import { formatCurrency } from '@/lib/utils';

interface GoalSuggestionProps {
  goalName: string;
  targetAmount: number;
  deadline?: string;
  onCreateGoal: () => void;
  onDismiss: () => void;
}

export default function GoalSuggestion({
  goalName,
  targetAmount,
  deadline,
  onCreateGoal,
  onDismiss,
}: GoalSuggestionProps) {
  const [isCreating, setIsCreating] = useState(false);
  const [isCreated, setIsCreated] = useState(false);

  const handleCreate = async () => {
    setIsCreating(true);
    try {
      await onCreateGoal();
      setIsCreated(true);
      // Auto-dismiss after 2 seconds
      setTimeout(() => {
        onDismiss();
      }, 2000);
    } catch (error) {
      console.error('Failed to create goal:', error);
      setIsCreating(false);
    }
  };

  // Format deadline if provided
  const formattedDeadline = deadline
    ? new Date(deadline).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : null;

  if (isCreated) {
    return (
      <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4 my-2">
        <div className="flex items-center gap-2">
          <svg
            className="w-5 h-5 text-green-600 dark:text-green-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          <span className="text-sm font-medium text-green-800 dark:text-green-300">
            Goal created!
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-primary-50 dark:bg-primary-900/20 border border-primary-200 dark:border-primary-800 rounded-lg p-4 my-2">
      <div className="space-y-3">
        {/* Header */}
        <div className="flex items-start gap-2">
          <svg
            className="w-5 h-5 text-primary-600 dark:text-primary-400 mt-0.5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z"
            />
          </svg>
          <div className="flex-1">
            <h4 className="text-sm font-semibold text-primary-900 dark:text-primary-100">
              Create Savings Goal
            </h4>
          </div>
        </div>

        {/* Goal details */}
        <div className="pl-7 space-y-1">
          <p className="text-sm text-primary-800 dark:text-primary-200">
            <span className="font-medium">Goal:</span> {goalName}
          </p>
          <p className="text-sm text-primary-800 dark:text-primary-200">
            <span className="font-medium">Target:</span> {formatCurrency(targetAmount)}
          </p>
          {formattedDeadline && (
            <p className="text-sm text-primary-800 dark:text-primary-200">
              <span className="font-medium">Deadline:</span> {formattedDeadline}
            </p>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 pl-7">
          <button
            onClick={handleCreate}
            disabled={isCreating}
            className="px-4 py-2 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isCreating ? 'Creating...' : 'Create Goal'}
          </button>
          <button
            onClick={onDismiss}
            disabled={isCreating}
            className="px-4 py-2 text-sm font-medium text-primary-700 dark:text-primary-300 hover:bg-primary-100 dark:hover:bg-primary-900/40 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Not now
          </button>
        </div>
      </div>
    </div>
  );
}
