'use client';

import Link from 'next/link';
import AccountCard from './AccountCard';
import Button from '@/components/ui/Button';
import type { Account, AccountType } from '@/types';

interface AccountTypeGroupProps {
  type: AccountType;
  accounts: Account[];
}

const typeLabels: Record<AccountType, string> = {
  CHECKING: 'Checking',
  SAVINGS: 'Savings',
  CREDIT: 'Credit Cards',
  INVESTMENT: 'Investments',
};

export default function AccountTypeGroup({
  type,
  accounts,
}: AccountTypeGroupProps) {
  const typeLabel = typeLabels[type];

  return (
    <div>
      <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
        {typeLabel} ({accounts.length})
      </h2>

      {accounts.length === 0 ? (
        <div className="rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600 p-8 text-center bg-gray-50 dark:bg-gray-800/50">
          <div className="mx-auto w-12 h-12 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center mb-3">
            <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
          </div>
          <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-1">
            No {typeLabel.toLowerCase()} accounts
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
            Upload a statement to add an account
          </p>
          <Link href="/import">
            <Button variant="outline" size="sm">
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
              Upload Statement
            </Button>
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {accounts.map((account) => (
            <AccountCard
              key={account.id}
              account={account}
            />
          ))}
        </div>
      )}
    </div>
  );
}
