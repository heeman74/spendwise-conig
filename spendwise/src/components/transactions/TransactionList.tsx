'use client';

import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../ui/Table';
import TransactionItem from './TransactionItem';
import Spinner from '../ui/Spinner';
import type { Transaction } from '@/types';

type SortField = 'DATE' | 'AMOUNT' | 'CATEGORY';
type SortOrder = 'ASC' | 'DESC';

export interface SortState {
  field: SortField;
  order: SortOrder;
}

interface TransactionListProps {
  transactions: Transaction[];
  isLoading?: boolean;
  onEdit?: (transaction: Transaction) => void;
  onDelete?: (id: string) => void;
  sort?: SortState;
  onSort?: (sort: SortState) => void;
}

function SortIcon({ field, sort }: { field: SortField; sort?: SortState }) {
  const isActive = sort?.field === field;
  const isAsc = isActive && sort?.order === 'ASC';
  const isDesc = isActive && sort?.order === 'DESC';

  return (
    <span className="inline-flex flex-col ml-1 -space-y-1">
      <svg
        className={`w-3 h-3 ${isAsc ? 'text-primary-600 dark:text-primary-400' : 'text-gray-300 dark:text-gray-600'}`}
        viewBox="0 0 10 6"
        fill="currentColor"
      >
        <path d="M5 0L10 6H0z" />
      </svg>
      <svg
        className={`w-3 h-3 ${isDesc ? 'text-primary-600 dark:text-primary-400' : 'text-gray-300 dark:text-gray-600'}`}
        viewBox="0 0 10 6"
        fill="currentColor"
      >
        <path d="M5 6L0 0h10z" />
      </svg>
    </span>
  );
}

export default function TransactionList({
  transactions,
  isLoading = false,
  onEdit,
  onDelete,
  sort,
  onSort,
}: TransactionListProps) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Spinner size="lg" />
      </div>
    );
  }

  if (transactions.length === 0) {
    return (
      <div className="text-center py-12">
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
            d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
          />
        </svg>
        <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">No transactions</h3>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Get started by adding a new transaction.
        </p>
      </div>
    );
  }

  const handleSort = (field: SortField) => {
    if (!onSort) return;
    if (sort?.field === field) {
      // Toggle direction
      onSort({ field, order: sort.order === 'DESC' ? 'ASC' : 'DESC' });
    } else {
      // New field defaults to DESC (newest/highest first)
      onSort({ field, order: 'DESC' });
    }
  };

  const sortableClass = onSort
    ? 'cursor-pointer select-none hover:text-gray-700 dark:hover:text-gray-200 transition-colors'
    : '';

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead
            className={sortableClass}
            onClick={() => handleSort('DATE')}
          >
            <span className="inline-flex items-center">
              Date
              {onSort && <SortIcon field="DATE" sort={sort} />}
            </span>
          </TableHead>
          <TableHead>Description</TableHead>
          <TableHead
            className={sortableClass}
            onClick={() => handleSort('CATEGORY')}
          >
            <span className="inline-flex items-center">
              Category
              {onSort && <SortIcon field="CATEGORY" sort={sort} />}
            </span>
          </TableHead>
          <TableHead>Account</TableHead>
          <TableHead
            className={`text-right ${sortableClass}`}
            onClick={() => handleSort('AMOUNT')}
          >
            <span className="inline-flex items-center justify-end w-full">
              Amount
              {onSort && <SortIcon field="AMOUNT" sort={sort} />}
            </span>
          </TableHead>
          <TableHead className="w-[100px]">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {transactions.map((transaction) => (
          <TransactionItem
            key={transaction.id}
            transaction={transaction}
            onEdit={onEdit}
            onDelete={onDelete}
          />
        ))}
      </TableBody>
    </Table>
  );
}
