'use client';

import { useState, useMemo } from 'react';
import Input from '../ui/Input';
import Select from '../ui/Select';
import Button from '../ui/Button';
import type { TransactionFilters as FiltersType, TransactionType } from '@/types';

const transactionTypes = [
  { value: '', label: 'All Types' },
  { value: 'EXPENSE', label: 'Expense' },
  { value: 'INCOME', label: 'Income' },
  { value: 'TRANSFER', label: 'Transfer' },
];

interface TransactionFiltersProps {
  filters: FiltersType;
  onFiltersChange: (filters: Partial<FiltersType>) => void;
  onClear: () => void;
  accounts?: { value: string; label: string }[];
  categories?: string[];
}

export default function TransactionFilters({
  filters,
  onFiltersChange,
  onClear,
  accounts = [],
  categories: categoryNames = [],
}: TransactionFiltersProps) {
  const categoryOptions = useMemo(() => {
    const opts = [{ value: '', label: 'All Categories' }];
    const sorted = [...categoryNames].sort((a, b) => a.localeCompare(b));
    for (const name of sorted) {
      opts.push({ value: name, label: name });
    }
    return opts;
  }, [categoryNames]);
  const [isExpanded, setIsExpanded] = useState(false);

  const hasActiveFilters =
    filters.search ||
    filters.category ||
    filters.type ||
    filters.accountId ||
    filters.startDate ||
    filters.endDate ||
    filters.minAmount !== null ||
    filters.maxAmount !== null;

  return (
    <div className="space-y-4">
      {/* Search and quick filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1">
          <Input
            placeholder="Search transactions..."
            value={filters.search}
            onChange={(e) => onFiltersChange({ search: e.target.value })}
            leftIcon={
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            }
          />
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <Select
            options={transactionTypes}
            value={filters.type || ''}
            onChange={(e) =>
              onFiltersChange({ type: (e.target.value as TransactionType) || null })
            }
            className="sm:w-32"
          />
          <Select
            options={categoryOptions}
            value={filters.category || ''}
            onChange={(e) => onFiltersChange({ category: e.target.value || null })}
            className="sm:w-40"
          />
          <Button
            variant="outline"
            onClick={() => setIsExpanded(!isExpanded)}
            className="px-3"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"
              />
            </svg>
          </Button>
          {hasActiveFilters && (
            <Button variant="ghost" onClick={onClear} className="text-red-600">
              Clear
            </Button>
          )}
        </div>
      </div>

      {/* Expanded filters */}
      {isExpanded && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
          {accounts.length > 0 && (
            <Select
              label="Account"
              options={[{ value: '', label: 'All Accounts' }, ...accounts]}
              value={filters.accountId || ''}
              onChange={(e) => onFiltersChange({ accountId: e.target.value || null })}
            />
          )}
          <Input
            label="Start Date"
            type="date"
            value={filters.startDate ? filters.startDate.toISOString().split('T')[0] : ''}
            onChange={(e) =>
              onFiltersChange({
                startDate: e.target.value ? new Date(e.target.value) : null,
              })
            }
          />
          <Input
            label="End Date"
            type="date"
            value={filters.endDate ? filters.endDate.toISOString().split('T')[0] : ''}
            onChange={(e) =>
              onFiltersChange({
                endDate: e.target.value ? new Date(e.target.value) : null,
              })
            }
          />
          <div className="grid grid-cols-2 gap-2">
            <Input
              label="Min Amount"
              type="number"
              placeholder="0"
              value={filters.minAmount ?? ''}
              onChange={(e) =>
                onFiltersChange({
                  minAmount: e.target.value ? parseFloat(e.target.value) : null,
                })
              }
            />
            <Input
              label="Max Amount"
              type="number"
              placeholder="∞"
              value={filters.maxAmount ?? ''}
              onChange={(e) =>
                onFiltersChange({
                  maxAmount: e.target.value ? parseFloat(e.target.value) : null,
                })
              }
            />
          </div>
        </div>
      )}
    </div>
  );
}
