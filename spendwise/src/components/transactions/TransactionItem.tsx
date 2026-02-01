'use client';

import { TableRow, TableCell } from '../ui/Table';
import Badge from '../ui/Badge';
import Button from '../ui/Button';
import { formatCurrency, formatDate, getCategoryColor } from '@/lib/utils';
import type { Transaction } from '@/types';

interface TransactionItemProps {
  transaction: Transaction;
  onEdit?: (transaction: Transaction) => void;
  onDelete?: (id: string) => void;
}

export default function TransactionItem({ transaction, onEdit, onDelete }: TransactionItemProps) {
  const typeVariant = {
    INCOME: 'success' as const,
    EXPENSE: 'danger' as const,
    TRANSFER: 'info' as const,
  };

  return (
    <TableRow>
      <TableCell className="whitespace-nowrap">
        <div className="text-sm font-medium text-gray-900 dark:text-white">
          {formatDate(transaction.date)}
        </div>
        <div className="text-xs text-gray-500 dark:text-gray-400">
          {formatDate(transaction.date, 'relative')}
        </div>
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-3">
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: `${getCategoryColor(transaction.category)}20` }}
          >
            <span className="text-sm" style={{ color: getCategoryColor(transaction.category) }}>
              {getIcon(transaction.category)}
            </span>
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
              {transaction.merchant || transaction.description || transaction.category}
            </p>
            {transaction.description && transaction.merchant && (
              <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                {transaction.description}
              </p>
            )}
          </div>
        </div>
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-1.5">
          <Badge
            style={{
              backgroundColor: `${getCategoryColor(transaction.category)}20`,
              color: getCategoryColor(transaction.category),
            }}
          >
            {transaction.category}
          </Badge>
          {transaction.categorySource === 'rule' && (
            <span
              className="w-2 h-2 rounded-full bg-green-500 flex-shrink-0"
              title="Categorized by your saved merchant rule"
            />
          )}
          {transaction.categorySource === 'ai' && (transaction.categoryConfidence ?? 100) < 70 && (
            <span
              className="w-2 h-2 rounded-full bg-amber-500 flex-shrink-0"
              title={`AI confidence: ${transaction.categoryConfidence}%`}
            />
          )}
        </div>
      </TableCell>
      <TableCell>
        <span className="text-sm text-gray-600 dark:text-gray-400">
          {transaction.account?.name || 'Unknown'}
        </span>
      </TableCell>
      <TableCell className="text-right">
        <span
          className={`font-semibold ${
            transaction.type === 'INCOME'
              ? 'text-green-600 dark:text-green-400'
              : transaction.type === 'EXPENSE'
              ? 'text-red-600 dark:text-red-400'
              : 'text-gray-600 dark:text-gray-400'
          }`}
        >
          {transaction.type === 'INCOME' ? '+' : transaction.type === 'EXPENSE' ? '-' : ''}
          {formatCurrency(Math.abs(transaction.amount))}
        </span>
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-1">
          {onEdit && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onEdit(transaction)}
              className="p-1"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                />
              </svg>
            </Button>
          )}
          {onDelete && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onDelete(transaction.id)}
              className="p-1 text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                />
              </svg>
            </Button>
          )}
        </div>
      </TableCell>
    </TableRow>
  );
}

function getIcon(category: string): string {
  const icons: Record<string, string> = {
    'Food & Dining': '🍔',
    'Shopping': '🛍️',
    'Transportation': '🚗',
    'Bills & Utilities': '📄',
    'Entertainment': '🎬',
    'Healthcare': '🏥',
    'Travel': '✈️',
    'Education': '📚',
    'Personal Care': '💅',
    'Income': '💰',
    'Transfer': '↔️',
  };
  return icons[category] || '💵';
}
