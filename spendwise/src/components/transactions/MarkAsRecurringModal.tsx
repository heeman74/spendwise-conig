'use client';

import { useState, useEffect } from 'react';
import { cn, formatCurrency } from '@/lib/utils';
import type { Transaction } from '@/types';

interface MarkAsRecurringModalProps {
  isOpen: boolean;
  onClose: () => void;
  transaction: Transaction | null;
  onSubmit: (data: {
    merchantName: string;
    amount: number;
    frequency: string;
    category: string;
    firstDate: string;
  }) => Promise<void>;
  loading: boolean;
}

const FREQUENCY_OPTIONS = [
  { value: 'WEEKLY', label: 'Weekly' },
  { value: 'BIWEEKLY', label: 'Biweekly' },
  { value: 'MONTHLY', label: 'Monthly' },
  { value: 'QUARTERLY', label: 'Quarterly' },
  { value: 'ANNUAL', label: 'Annual' },
];

export default function MarkAsRecurringModal({
  isOpen,
  onClose,
  transaction,
  onSubmit,
  loading,
}: MarkAsRecurringModalProps) {
  const [frequency, setFrequency] = useState('MONTHLY');

  // Reset frequency when modal closes or transaction changes
  useEffect(() => {
    if (isOpen) {
      setFrequency('MONTHLY');
    }
  }, [isOpen, transaction]);

  if (!isOpen || !transaction) return null;

  const merchantName = transaction.merchant || transaction.description || transaction.category;
  const amount = Math.abs(transaction.amount);
  const firstDate = new Date(transaction.date).toISOString().split('T')[0];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    await onSubmit({
      merchantName,
      amount,
      frequency,
      category: transaction.category,
      firstDate,
    });
  };

  const handleClose = () => {
    setFrequency('MONTHLY');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Overlay */}
      <div className="fixed inset-0 bg-black/50" onClick={handleClose} />

      {/* Modal */}
      <div className="relative bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-md w-full mx-4 p-6">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
          Mark as Recurring
        </h2>

        {/* Transaction summary card */}
        <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-900 dark:text-white">
              {merchantName}
            </span>
            <span className="text-sm font-semibold text-gray-900 dark:text-white">
              {formatCurrency(amount)}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {transaction.category}
            </span>
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {new Date(transaction.date).toLocaleDateString()}
            </span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Frequency */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Frequency
            </label>
            <select
              value={frequency}
              onChange={(e) => setFrequency(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              {FREQUENCY_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={handleClose}
              className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className={cn(
                'flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors',
                loading && 'opacity-50 cursor-not-allowed'
              )}
              disabled={loading}
            >
              {loading ? 'Saving...' : 'Mark as Recurring'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
