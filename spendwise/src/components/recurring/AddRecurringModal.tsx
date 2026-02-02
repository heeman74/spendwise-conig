'use client';

import { useState, FormEvent } from 'react';
import { cn } from '@/lib/utils';

interface AddRecurringModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: {
    merchantName: string;
    amount: number;
    frequency: string;
    category: string;
    description?: string;
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

const CATEGORY_OPTIONS = [
  'Bills & Utilities',
  'Entertainment',
  'Food & Dining',
  'Groceries',
  'Healthcare',
  'Income',
  'Personal Care',
  'Shopping',
  'Subscriptions',
  'Transportation',
  'Other',
];

export default function AddRecurringModal({
  isOpen,
  onClose,
  onSubmit,
  loading,
}: AddRecurringModalProps) {
  const [formData, setFormData] = useState({
    merchantName: '',
    amount: '',
    frequency: 'MONTHLY',
    category: 'Subscriptions',
    description: '',
    firstDate: new Date().toISOString().split('T')[0],
  });

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!formData.merchantName || !formData.amount) {
      return;
    }

    const amount = parseFloat(formData.amount);
    if (isNaN(amount) || amount <= 0) {
      return;
    }

    await onSubmit({
      merchantName: formData.merchantName,
      amount,
      frequency: formData.frequency,
      category: formData.category,
      description: formData.description || undefined,
      firstDate: formData.firstDate,
    });

    // Reset form
    setFormData({
      merchantName: '',
      amount: '',
      frequency: 'MONTHLY',
      category: 'Subscriptions',
      description: '',
      firstDate: new Date().toISOString().split('T')[0],
    });

    onClose();
  };

  const handleCancel = () => {
    // Reset form on cancel
    setFormData({
      merchantName: '',
      amount: '',
      frequency: 'MONTHLY',
      category: 'Subscriptions',
      description: '',
      firstDate: new Date().toISOString().split('T')[0],
    });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Overlay */}
      <div className="fixed inset-0 bg-black/50" onClick={handleCancel} />

      {/* Modal */}
      <div className="relative bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-md w-full mx-4 p-6">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
          Add Recurring Transaction
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Merchant Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Merchant Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.merchantName}
              onChange={(e) => setFormData({ ...formData, merchantName: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
              placeholder="e.g. Netflix"
              required
            />
          </div>

          {/* Amount */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Amount <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              step="0.01"
              min="0.01"
              value={formData.amount}
              onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
              placeholder="0.00"
              required
            />
          </div>

          {/* Frequency */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Frequency
            </label>
            <select
              value={formData.frequency}
              onChange={(e) => setFormData({ ...formData, frequency: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              {FREQUENCY_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          {/* Category */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Category
            </label>
            <select
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              {CATEGORY_OPTIONS.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Description (optional)
            </label>
            <input
              type="text"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
              placeholder="Additional details"
            />
          </div>

          {/* Start Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Start Date <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              value={formData.firstDate}
              onChange={(e) => setFormData({ ...formData, firstDate: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
              required
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={handleCancel}
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
              {loading ? 'Adding...' : 'Add Recurring'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
