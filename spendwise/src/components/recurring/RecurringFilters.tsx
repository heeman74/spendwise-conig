'use client';

import { cn } from '@/lib/utils';

interface RecurringFiltersProps {
  typeFilter: 'All' | 'EXPENSE' | 'INCOME';
  frequencyFilter?: string;
  onFilterChange: (filters: { type?: 'All' | 'EXPENSE' | 'INCOME'; frequency?: string }) => void;
}

const FREQUENCY_OPTIONS = [
  { value: '', label: 'All Frequencies' },
  { value: 'WEEKLY', label: 'Weekly' },
  { value: 'BIWEEKLY', label: 'Biweekly' },
  { value: 'MONTHLY', label: 'Monthly' },
  { value: 'QUARTERLY', label: 'Quarterly' },
  { value: 'ANNUAL', label: 'Annual' },
];

export default function RecurringFilters({
  typeFilter,
  frequencyFilter,
  onFilterChange,
}: RecurringFiltersProps) {
  return (
    <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
      {/* Type tabs */}
      <div className="flex gap-2">
        {(['All', 'EXPENSE', 'INCOME'] as const).map((type) => (
          <button
            key={type}
            onClick={() => onFilterChange({ type })}
            className={cn(
              'px-4 py-2 rounded-lg text-sm font-medium transition-colors',
              typeFilter === type
                ? 'bg-primary-600 text-white'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
            )}
          >
            {type === 'All' ? 'All' : type === 'EXPENSE' ? 'Expenses' : 'Income'}
          </button>
        ))}
      </div>

      {/* Frequency dropdown */}
      <div>
        <select
          value={frequencyFilter || ''}
          onChange={(e) => onFilterChange({ frequency: e.target.value })}
          className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
        >
          {FREQUENCY_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
