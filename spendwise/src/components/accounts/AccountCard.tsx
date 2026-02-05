'use client';

import Card from '../ui/Card';
import Badge from '../ui/Badge';
import Button from '../ui/Button';
import BankLogo from '../ui/BankLogo';
import { formatCurrency, formatDate } from '@/lib/utils';
import type { Account, AccountType } from '@/types';

interface AccountCardProps {
  account: Account;
  onEdit?: (account: Account) => void;
  onDelete?: (id: string) => void;
  onSync?: (id: string) => void;
}

const accountTypeColors: Record<AccountType, string> = {
  CHECKING: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  SAVINGS: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  CREDIT: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  INVESTMENT: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
};

export default function AccountCard({
  account,
  onEdit,
  onDelete,
  onSync,
}: AccountCardProps) {
  const isNegativeBalance = account.balance < 0;

  return (
    <Card className="hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <BankLogo institution={account.institution} size={40} />
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white">{account.name}</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {account.institution}
            </p>
          </div>
        </div>
        <Badge className={accountTypeColors[account.type]}>{account.type}</Badge>
      </div>

      <div className="mb-4">
        <p className="text-sm text-gray-500 dark:text-gray-400">Current Balance</p>
        <p
          className={`text-2xl font-bold ${
            isNegativeBalance
              ? 'text-red-600 dark:text-red-400'
              : 'text-gray-900 dark:text-white'
          }`}
        >
          {formatCurrency(account.balance)}
        </p>
      </div>

      {account.lastSynced && (
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
          Last updated: {formatDate(account.lastSynced, 'relative')}
        </p>
      )}

      <div className="flex items-center gap-2 pt-4 border-t border-gray-100 dark:border-gray-700">
        {onSync && (
          <Button variant="outline" size="sm" onClick={() => onSync(account.id)}>
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
            Sync
          </Button>
        )}
        {onEdit && (
          <Button variant="ghost" size="sm" onClick={() => onEdit(account)}>
            Edit
          </Button>
        )}
        {onDelete && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onDelete(account.id)}
            className="text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20 ml-auto"
          >
            Delete
          </Button>
        )}
      </div>
    </Card>
  );
}
