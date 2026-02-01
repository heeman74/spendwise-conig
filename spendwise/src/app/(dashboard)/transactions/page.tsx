'use client';

import { useState, useMemo, useCallback, useRef, useEffect, type SetStateAction } from 'react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Spinner from '@/components/ui/Spinner';
import TransactionList from '@/components/transactions/TransactionList';
import TransactionFilters from '@/components/transactions/TransactionFilters';
import Modal, { ModalFooter } from '@/components/ui/Modal';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import {
  useTransactions,
  useCreateTransaction,
  useUpdateTransaction,
  useDeleteTransaction,
} from '@/hooks/useTransactions';
import { useAccounts } from '@/hooks/useAccounts';
import type { Transaction, TransactionFilters as FiltersType } from '@/types';
import type { SortState } from '@/components/transactions/TransactionList';

// NOTE: Categories hardcoded here - must match VALID_CATEGORIES in spendwise-api/src/lib/constants.ts
const categories = [
  { value: 'Food & Dining', label: 'Food & Dining' },
  { value: 'Groceries', label: 'Groceries' },
  { value: 'Shopping', label: 'Shopping' },
  { value: 'Transportation', label: 'Transportation' },
  { value: 'Bills & Utilities', label: 'Bills & Utilities' },
  { value: 'Entertainment', label: 'Entertainment' },
  { value: 'Healthcare', label: 'Healthcare' },
  { value: 'Travel', label: 'Travel' },
  { value: 'Education', label: 'Education' },
  { value: 'Personal Care', label: 'Personal Care' },
  { value: 'Income', label: 'Income' },
  { value: 'Transfer', label: 'Transfer' },
  { value: 'Other', label: 'Other' },
];

const transactionTypes = [
  { value: 'EXPENSE', label: 'Expense' },
  { value: 'INCOME', label: 'Income' },
  { value: 'TRANSFER', label: 'Transfer' },
];

const initialFilters: FiltersType = {
  search: '',
  category: null,
  type: null,
  accountId: null,
  startDate: null,
  endDate: null,
  minAmount: null,
  maxAmount: null,
};

const PAGE_SIZE = 50;

// Stable references — defined outside the component to prevent re-render loops
const DEFAULT_PAGINATION = { page: 1, limit: PAGE_SIZE };

export default function TransactionsPage() {
  const [filters, setFilters] = useState<FiltersType>(initialFilters);
  const [sort, setSort] = useState<SortState>({ field: 'DATE', order: 'DESC' });
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);

  const { accounts } = useAccounts();

  // Transform UI filters to API format
  const apiFilters = useMemo(() => {
    const f: Record<string, any> = {};
    if (filters.search) f.search = filters.search;
    if (filters.category) f.category = filters.category;
    if (filters.type) f.type = filters.type;
    if (filters.accountId) f.accountId = filters.accountId;
    if (filters.startDate) f.startDate = filters.startDate.toISOString();
    if (filters.endDate) f.endDate = filters.endDate.toISOString();
    if (filters.minAmount !== null) f.minAmount = filters.minAmount;
    if (filters.maxAmount !== null) f.maxAmount = filters.maxAmount;
    return Object.keys(f).length > 0 ? f : undefined;
  }, [filters]);

  // Memoize sort to maintain stable reference for useQuery
  const sortInput = useMemo(() => ({ field: sort.field, order: sort.order }), [sort.field, sort.order]);

  const { transactions, pageInfo, loading, loadingMore, loadMore } = useTransactions(
    apiFilters,
    DEFAULT_PAGINATION,
    sortInput,
  );

  const { createTransaction } = useCreateTransaction();
  const { updateTransaction } = useUpdateTransaction();
  const { deleteTransaction } = useDeleteTransaction();

  // ── Infinite scroll via IntersectionObserver ──
  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && pageInfo?.hasNextPage && !loading && !loadingMore) {
          loadMore();
        }
      },
      { rootMargin: '200px' },
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [pageInfo?.hasNextPage, loading, loadingMore, loadMore]);

  const [formData, setFormData] = useState({
    amount: '',
    type: 'EXPENSE',
    category: 'Food & Dining',
    accountId: '',
    merchant: '',
    description: '',
    date: new Date().toISOString().split('T')[0],
  });

  const accountOptions = useMemo(
    () => accounts.map((a: any) => ({ value: a.id, label: a.name })),
    [accounts],
  );

  const handleFiltersChange = (newFilters: Partial<FiltersType>) => {
    setFilters((prev) => ({ ...prev, ...newFilters }));
  };

  const handleClearFilters = () => {
    setFilters(initialFilters);
  };

  const handleEdit = (transaction: Transaction) => {
    setEditingTransaction(transaction);
    setFormData({
      amount: transaction.amount.toString(),
      type: transaction.type,
      category: transaction.category,
      accountId: transaction.accountId,
      merchant: transaction.merchant || '',
      description: transaction.description || '',
      date: new Date(transaction.date).toISOString().split('T')[0],
    });
    setIsModalOpen(true);
  };

  const handleDelete = useCallback(async (id: string) => {
    if (confirm('Are you sure you want to delete this transaction?')) {
      try {
        await deleteTransaction(id);
      } catch (err) {
        console.error('Failed to delete transaction:', err);
      }
    }
  }, [deleteTransaction]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingTransaction) {
        await updateTransaction(editingTransaction.id, {
          amount: parseFloat(formData.amount),
          type: formData.type as any,
          category: formData.category,
          accountId: formData.accountId,
          merchant: formData.merchant || undefined,
          description: formData.description || undefined,
          date: formData.date,
        });
      } else {
        await createTransaction({
          amount: parseFloat(formData.amount),
          type: formData.type as any,
          category: formData.category,
          accountId: formData.accountId,
          merchant: formData.merchant || undefined,
          description: formData.description || undefined,
          date: formData.date,
        });
      }
      setIsModalOpen(false);
      setEditingTransaction(null);
      resetForm();
    } catch (err) {
      console.error('Failed to save transaction:', err);
    }
  };

  const resetForm = () => {
    setFormData({
      amount: '',
      type: 'EXPENSE',
      category: 'Food & Dining',
      accountId: accounts[0]?.id || '',
      merchant: '',
      description: '',
      date: new Date().toISOString().split('T')[0],
    });
  };

  const handleExport = () => {
    const headers = ['Date', 'Merchant', 'Category', 'Type', 'Amount', 'Description'];
    const rows = transactions.map((t: Transaction) => [
      new Date(t.date).toLocaleDateString(),
      t.merchant || '',
      t.category,
      t.type,
      t.amount.toString(),
      t.description || '',
    ]);

    const csv = [headers, ...rows].map((row) => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'transactions.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Transactions</h1>
          <p className="text-gray-500 dark:text-gray-400">
            View and manage all your transactions
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExport}>
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Export
          </Button>
          <Button
            variant="primary"
            onClick={() => {
              setEditingTransaction(null);
              resetForm();
              setIsModalOpen(true);
            }}
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            Add Transaction
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <TransactionFilters
          filters={filters}
          onFiltersChange={handleFiltersChange}
          onClear={handleClearFilters}
          accounts={accountOptions}
        />
      </Card>

      {/* Transactions list */}
      <Card padding="none">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {pageInfo
              ? `Showing ${transactions.length} of ${pageInfo.totalCount} transactions`
              : `Showing ${transactions.length} transactions`}
          </p>
        </div>
        <TransactionList
          transactions={transactions}
          isLoading={loading}
          onEdit={handleEdit}
          onDelete={handleDelete}
          sort={sort}
          onSort={setSort}
        />
        {/* Infinite scroll sentinel */}
        <div ref={sentinelRef} className="h-1" />
        {loadingMore && (
          <div className="flex items-center justify-center py-4 border-t border-gray-200 dark:border-gray-700">
            <Spinner size="sm" />
            <span className="ml-2 text-sm text-gray-500 dark:text-gray-400">Loading more...</span>
          </div>
        )}
      </Card>

      {/* Add/Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingTransaction(null);
        }}
        title={editingTransaction ? 'Edit Transaction' : 'Add Transaction'}
        size="md"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Amount"
              type="number"
              step="0.01"
              placeholder="0.00"
              value={formData.amount}
              onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
              required
            />
            <Input
              label="Date"
              type="date"
              value={formData.date}
              onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Type"
              options={transactionTypes}
              value={formData.type}
              onChange={(e) => setFormData({ ...formData, type: e.target.value })}
            />
            <Select
              label="Category"
              options={categories}
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
            />
          </div>
          <Select
            label="Account"
            options={accountOptions}
            value={formData.accountId}
            onChange={(e) => setFormData({ ...formData, accountId: e.target.value })}
          />
          <Input
            label="Merchant"
            placeholder="e.g., Starbucks"
            value={formData.merchant}
            onChange={(e) => setFormData({ ...formData, merchant: e.target.value })}
          />
          <Input
            label="Description"
            placeholder="Optional notes"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          />
          <ModalFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setIsModalOpen(false);
                setEditingTransaction(null);
              }}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary">
              {editingTransaction ? 'Save Changes' : 'Add Transaction'}
            </Button>
          </ModalFooter>
        </form>
      </Modal>
    </div>
  );
}
