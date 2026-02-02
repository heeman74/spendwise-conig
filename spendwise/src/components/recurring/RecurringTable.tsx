'use client';

import { useState } from 'react';
import { formatCurrency, formatDate, parseDecimal } from '@/lib/utils';
import { cn } from '@/lib/utils';

interface RecurringTransaction {
  id: string;
  merchantName: string;
  description: string;
  averageAmount: number;
  frequency: string;
  category: string;
  nextExpectedDate: string | null;
  lastDate: string;
  firstDate: string;
  status: string;
  isDismissed: boolean;
  transactionIds: string[];
}

interface RecurringTableProps {
  recurring: RecurringTransaction[];
  sort: {
    field: string;
    order: 'asc' | 'desc';
  };
  onSort: (field: string) => void;
  onDismiss: (id: string) => void;
  onRestore: (id: string) => void;
}

const COLUMNS = [
  { key: 'merchantName', label: 'Merchant', sortable: true },
  { key: 'averageAmount', label: 'Amount', sortable: true },
  { key: 'frequency', label: 'Frequency', sortable: true },
  { key: 'category', label: 'Category', sortable: true },
  { key: 'nextExpectedDate', label: 'Next Expected', sortable: true },
  { key: 'lastDate', label: 'Last Paid', sortable: true },
  { key: 'status', label: 'Status', sortable: true },
];

export default function RecurringTable({
  recurring,
  sort,
  onSort,
  onDismiss,
  onRestore,
}: RecurringTableProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (recurring.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="mb-4">
          <svg
            className="mx-auto h-12 w-12 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
          No recurring transactions detected yet
        </h3>
        <p className="text-gray-500 dark:text-gray-400 mb-4">
          Import more statements to help identify patterns.
        </p>
        <a
          href="/import"
          className="inline-flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
        >
          Import Statements
        </a>
      </div>
    );
  }

  const capitalizeFrequency = (freq: string) => {
    return freq.charAt(0) + freq.slice(1).toLowerCase();
  };

  const renderSortIcon = (columnKey: string) => {
    if (sort.field !== columnKey) {
      return (
        <svg className="w-4 h-4 ml-1 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
        </svg>
      );
    }

    if (sort.order === 'asc') {
      return (
        <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
        </svg>
      );
    }

    return (
      <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
      </svg>
    );
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-gray-200 dark:border-gray-700">
            <th className="w-8"></th>
            {COLUMNS.map((column) => (
              <th
                key={column.key}
                className={cn(
                  'px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider',
                  column.sortable && 'cursor-pointer hover:text-gray-700 dark:hover:text-gray-200'
                )}
                onClick={() => column.sortable && onSort(column.key)}
              >
                <div className="flex items-center">
                  {column.label}
                  {column.sortable && renderSortIcon(column.key)}
                </div>
              </th>
            ))}
            <th className="w-16"></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
          {recurring.map((item) => {
            const isExpanded = expandedId === item.id;
            const isPossiblyCancelled = item.status === 'POSSIBLY_CANCELLED';
            const amount = parseDecimal(item.averageAmount);

            return (
              <>
                <tr
                  key={item.id}
                  className={cn(
                    'hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors',
                    item.isDismissed && 'opacity-50',
                    isPossiblyCancelled && !item.isDismissed && 'opacity-60'
                  )}
                >
                  {/* Expand chevron */}
                  <td className="px-4 py-4">
                    <button
                      onClick={() => setExpandedId(isExpanded ? null : item.id)}
                      className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                    >
                      <svg
                        className={cn('w-5 h-5 transition-transform', isExpanded && 'rotate-90')}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  </td>

                  {/* Merchant */}
                  <td className="px-4 py-4">
                    <div>
                      <div className={cn('font-medium text-gray-900 dark:text-white', item.isDismissed && 'line-through')}>
                        {item.merchantName}
                      </div>
                      {item.description !== item.merchantName && (
                        <div className="text-sm text-gray-500 dark:text-gray-400">{item.description}</div>
                      )}
                    </div>
                  </td>

                  {/* Amount */}
                  <td className="px-4 py-4 text-gray-900 dark:text-white font-medium">
                    {formatCurrency(amount)}
                  </td>

                  {/* Frequency */}
                  <td className="px-4 py-4 text-gray-700 dark:text-gray-300">
                    {capitalizeFrequency(item.frequency)}
                  </td>

                  {/* Category */}
                  <td className="px-4 py-4">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary-100 dark:bg-primary-900 text-primary-800 dark:text-primary-200">
                      {item.category}
                    </span>
                  </td>

                  {/* Next Expected */}
                  <td className="px-4 py-4 text-gray-700 dark:text-gray-300">
                    {item.nextExpectedDate ? formatDate(item.nextExpectedDate) : 'N/A'}
                  </td>

                  {/* Last Paid */}
                  <td className="px-4 py-4 text-gray-700 dark:text-gray-300">
                    {formatDate(item.lastDate)}
                  </td>

                  {/* Status */}
                  <td className="px-4 py-4">
                    <span
                      className={cn(
                        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
                        isPossiblyCancelled
                          ? 'bg-amber-100 dark:bg-amber-900 text-amber-800 dark:text-amber-200'
                          : 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200'
                      )}
                    >
                      {isPossiblyCancelled ? 'Possibly Cancelled' : 'Active'}
                    </span>
                  </td>

                  {/* Actions */}
                  <td className="px-4 py-4">
                    {item.isDismissed ? (
                      <button
                        onClick={() => onRestore(item.id)}
                        className="text-gray-400 hover:text-primary-600 dark:hover:text-primary-400"
                        title="Restore"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                        </svg>
                      </button>
                    ) : (
                      <button
                        onClick={() => onDismiss(item.id)}
                        className="text-gray-400 hover:text-red-600 dark:hover:text-red-400"
                        title="Dismiss"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    )}
                  </td>
                </tr>

                {/* Expanded row */}
                {isExpanded && (
                  <tr>
                    <td colSpan={9} className="px-4 py-4 bg-gray-50 dark:bg-gray-800/50">
                      <div className="text-sm">
                        <p className="text-gray-700 dark:text-gray-300 mb-2">
                          <strong>{item.transactionIds.length}</strong> transactions detected since{' '}
                          <strong>{formatDate(item.firstDate)}</strong>
                        </p>
                        <p className="text-gray-500 dark:text-gray-400">
                          This pattern was identified based on recurring charges with similar amounts and
                          consistent timing intervals.
                        </p>
                      </div>
                    </td>
                  </tr>
                )}
              </>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
