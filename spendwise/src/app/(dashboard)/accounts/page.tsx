'use client';

import { useState } from 'react';
import Link from 'next/link';
import Button from '@/components/ui/Button';
import Spinner from '@/components/ui/Spinner';
import Input from '@/components/ui/Input';
import BalanceSummary from '@/components/accounts/BalanceSummary';
import AccountTypeGroup from '@/components/accounts/AccountTypeGroup';
import { useAccounts, useUpdateAccount, useDeleteAccount } from '@/hooks/useAccounts';
import type { Account, AccountType } from '@/types';

export default function AccountsPage() {
  const { accounts, loading: accountsLoading } = useAccounts();
  const { updateAccount } = useUpdateAccount();
  const { deleteAccount, loading: deleteLoading } = useDeleteAccount();
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [editName, setEditName] = useState('');
  const [deletingAccount, setDeletingAccount] = useState<Account | null>(null);

  const handleEdit = (account: Account) => {
    setEditingAccount(account);
    setEditName(account.name);
  };

  const handleSaveEdit = async () => {
    if (!editingAccount || !editName.trim()) return;
    await updateAccount(editingAccount.id, { name: editName.trim() });
    setEditingAccount(null);
    setEditName('');
  };

  const handleCancelEdit = () => {
    setEditingAccount(null);
    setEditName('');
  };

  const handleDeleteRequest = (id: string) => {
    const account = accounts.find((a: Account) => a.id === id);
    if (account) setDeletingAccount(account);
  };

  const handleConfirmDelete = async () => {
    if (!deletingAccount) return;
    await deleteAccount(deletingAccount.id);
    setDeletingAccount(null);
  };

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

      {/* Rename account modal */}
      {editingAccount && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={handleCancelEdit}>
          <div
            className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-sm mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
              Rename Account
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              {editingAccount.institution}
            </p>
            <Input
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              placeholder="Account name"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSaveEdit();
                if (e.key === 'Escape') handleCancelEdit();
              }}
            />
            <div className="flex justify-end gap-2 mt-4">
              <Button variant="outline" size="sm" onClick={handleCancelEdit}>
                Cancel
              </Button>
              <Button size="sm" onClick={handleSaveEdit} disabled={!editName.trim()}>
                Save
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirmation modal */}
      {deletingAccount && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setDeletingAccount(null)}>
          <div
            className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-sm mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Delete Account
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  This cannot be undone
                </p>
              </div>
            </div>
            <p className="text-sm text-gray-700 dark:text-gray-300 mb-1">
              Are you sure you want to delete <span className="font-semibold">{deletingAccount.name}</span>?
            </p>
            <p className="text-sm text-red-600 dark:text-red-400 mb-4">
              All transactions associated with this account will also be permanently deleted.
            </p>
            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setDeletingAccount(null)}>
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleConfirmDelete}
                disabled={deleteLoading}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                {deleteLoading ? 'Deleting...' : 'Delete'}
              </Button>
            </div>
          </div>
        </div>
      )}

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
              onEdit={handleEdit}
              onDelete={handleDeleteRequest}
            />

            <AccountTypeGroup
              type="SAVINGS"
              accounts={accounts.filter((a: any) => a.type === 'SAVINGS')}
              onEdit={handleEdit}
              onDelete={handleDeleteRequest}
            />

            <AccountTypeGroup
              type="CREDIT"
              accounts={accounts.filter((a: any) => a.type === 'CREDIT')}
              onEdit={handleEdit}
              onDelete={handleDeleteRequest}
            />

            <AccountTypeGroup
              type="INVESTMENT"
              accounts={accounts.filter((a: any) => a.type === 'INVESTMENT')}
              onEdit={handleEdit}
              onDelete={handleDeleteRequest}
            />
          </div>
        </>
      )}
    </div>
  );
}
