'use client';

import AccountCard from './AccountCard';
import Spinner from '../ui/Spinner';
import Button from '../ui/Button';
import type { Account } from '@/types';

interface AccountListProps {
  accounts: Account[];
  isLoading?: boolean;
  onEdit?: (account: Account) => void;
  onDelete?: (id: string) => void;
  onSync?: (id: string) => void;
  onAdd?: () => void;
}

export default function AccountList({
  accounts,
  isLoading = false,
  onEdit,
  onDelete,
  onSync,
  onAdd,
}: AccountListProps) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Spinner size="lg" />
      </div>
    );
  }

  if (accounts.length === 0) {
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
            d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
          />
        </svg>
        <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">No accounts</h3>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Get started by connecting your first account.
        </p>
        {onAdd && (
          <div className="mt-6">
            <Button variant="primary" onClick={onAdd}>
              Add Account
            </Button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {accounts.map((account) => (
        <AccountCard
          key={account.id}
          account={account}
          onEdit={onEdit}
          onDelete={onDelete}
          onSync={onSync}
        />
      ))}
    </div>
  );
}
