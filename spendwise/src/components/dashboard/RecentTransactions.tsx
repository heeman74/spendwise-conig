'use client';

import Link from 'next/link';
import Card, { CardHeader, CardTitle } from '../ui/Card';
import Badge from '../ui/Badge';
import { formatCurrency, formatDate, getCategoryColor } from '@/lib/utils';
import type { Transaction } from '@/types';

interface RecentTransactionsProps {
  transactions: Transaction[];
}

export default function RecentTransactions({ transactions }: RecentTransactionsProps) {
  return (
    <Card>
      <CardHeader className="flex items-center justify-between">
        <CardTitle>Recent Transactions</CardTitle>
        <Link
          href="/transactions"
          className="text-sm font-medium text-primary-600 hover:text-primary-700 dark:text-primary-400"
        >
          View all
        </Link>
      </CardHeader>
      <div className="space-y-4">
        {transactions.length === 0 ? (
          <p className="text-center text-gray-500 dark:text-gray-400 py-8">
            No recent transactions
          </p>
        ) : (
          transactions.map((transaction) => (
            <div
              key={transaction.id}
              className="flex items-center justify-between py-3 border-b border-gray-100 dark:border-gray-800 last:border-0"
            >
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: `${getCategoryColor(transaction.category)}20` }}
                >
                  <span
                    className="text-lg"
                    style={{ color: getCategoryColor(transaction.category) }}
                  >
                    {getCategoryIcon(transaction.category)}
                  </span>
                </div>
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">
                    {transaction.merchant || transaction.category}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {formatDate(transaction.date, 'relative')}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p
                  className={`font-semibold ${
                    transaction.type === 'INCOME'
                      ? 'text-green-600 dark:text-green-400'
                      : 'text-gray-900 dark:text-white'
                  }`}
                >
                  {transaction.type === 'INCOME' ? '+' : '-'}
                  {formatCurrency(Math.abs(transaction.amount))}
                </p>
                <Badge
                  variant={
                    transaction.type === 'INCOME'
                      ? 'success'
                      : transaction.type === 'EXPENSE'
                      ? 'default'
                      : 'info'
                  }
                  size="sm"
                >
                  {transaction.category}
                </Badge>
              </div>
            </div>
          ))
        )}
      </div>
    </Card>
  );
}

function getCategoryIcon(category: string): string {
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
