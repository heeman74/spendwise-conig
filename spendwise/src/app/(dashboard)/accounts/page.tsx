'use client';

import Link from 'next/link';
import Button from '@/components/ui/Button';
import Spinner from '@/components/ui/Spinner';
import BalanceSummary from '@/components/accounts/BalanceSummary';
import AccountTypeGroup from '@/components/accounts/AccountTypeGroup';
import { useAccounts } from '@/hooks/useAccounts';
import type { AccountType } from '@/types';

export default function AccountsPage() {
  const { accounts, loading: accountsLoading } = useAccounts();

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Accounts</h1>
          <p className="text-gray-500 dark:text-gray-400">
            Manage your financial accounts
          </p>
        </div>
        <Link href="/import">
          <Button>
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
            Upload Statement
          </Button>
        </Link>
      </div>

      {accountsLoading ? (
        <div className="flex items-center justify-center py-12">
          <Spinner size="lg" />
        </div>
      ) : accounts.length === 0 ? (
        /* Empty state when no accounts at all */
        <div className="text-center py-12 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-800/50">
          <div className="mx-auto w-16 h-16 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center mb-4">
            <svg className="w-8 h-8 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            No accounts yet
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-6 max-w-sm mx-auto">
            Upload a bank or credit card statement to get started with SpendWise. Track balances, transactions, and get personalized financial insights.
          </p>
          <div className="flex items-center justify-center gap-4">
            <Link href="/import">
              <Button>
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
                Upload Statement
              </Button>
            </Link>
          </div>
        </div>
      ) : (
        <>
          {/* Balance Summary */}
          <BalanceSummary accounts={accounts} />

          {/* Account Type Groups */}
          <div className="space-y-8">
            <AccountTypeGroup
              type="CHECKING"
              accounts={accounts.filter((a: any) => a.type === 'CHECKING')}
            />

            <AccountTypeGroup
              type="SAVINGS"
              accounts={accounts.filter((a: any) => a.type === 'SAVINGS')}
            />

            <AccountTypeGroup
              type="CREDIT"
              accounts={accounts.filter((a: any) => a.type === 'CREDIT')}
            />

            <AccountTypeGroup
              type="INVESTMENT"
              accounts={accounts.filter((a: any) => a.type === 'INVESTMENT')}
            />
          </div>
        </>
      )}
    </div>
  );
}
