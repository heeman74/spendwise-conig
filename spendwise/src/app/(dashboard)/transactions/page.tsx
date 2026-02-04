'use client';

import { useState, useMemo, useCallback, useRef, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
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
  useTransactionsNeedingReview,
  useUserCategories,
  useCreateUserCategory,
  useCreateTransaction,
  useUpdateTransaction,
  useDeleteTransaction,
} from '@/hooks/useTransactions';
import { useAccounts } from '@/hooks/useAccounts';
import { useAddRecurring } from '@/hooks/useRecurring';
import MarkAsRecurringModal from '@/components/transactions/MarkAsRecurringModal';
import { formatCurrency } from '@/lib/utils';
import type { Transaction, TransactionFilters as FiltersType } from '@/types';
import type { SortState } from '@/components/transactions/TransactionList';

const PREDEFINED_CATEGORIES = [
  'Food & Dining',
  'Groceries',
  'Shopping',
  'Transportation',
  'Bills & Utilities',
  'Entertainment',
  'Healthcare',
  'Travel',
  'Education',
  'Personal Care',
  'Income',
  'Transfer',
  'Other',
];

const ADD_NEW_CATEGORY_VALUE = '__ADD_NEW__';

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

const VALID_SORT_FIELDS = ['DATE', 'AMOUNT', 'CATEGORY', 'CREATED_AT'] as const;
const VALID_SORT_ORDERS = ['ASC', 'DESC'] as const;

function parseSortFromParams(params: { get(name: string): string | null }): SortState {
  const field = params.get('sort')?.toUpperCase();
  const order = params.get('order')?.toUpperCase();
  return {
    field: (VALID_SORT_FIELDS as readonly string[]).includes(field ?? '') ? (field as SortState['field']) : 'DATE',
    order: (VALID_SORT_ORDERS as readonly string[]).includes(order ?? '') ? (order as SortState['order']) : 'DESC',
  };
}

export default function TransactionsPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-gray-500 dark:text-gray-400">Loading transactions...</div>
      </div>
    }>
      <TransactionsPageContent />
    </Suspense>
  );
}

function TransactionsPageContent() {
  const searchParams = useSearchParams();
  const [filters, setFilters] = useState<FiltersType>(initialFilters);
  const [sort, setSort] = useState<SortState>(() => parseSortFromParams(searchParams));
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [activeTab, setActiveTab] = useState<'all' | 'review'>('all');
  const [markRecurringTransaction, setMarkRecurringTransaction] = useState<Transaction | null>(null);

  const { accounts } = useAccounts();
  const { categories: userCategoryList } = useUserCategories();
  const { createUserCategory } = useCreateUserCategory();
  const userCategories = userCategoryList.map((c) => c.name);

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

  const {
    transactions: reviewTransactions,
    totalCount: reviewCount,
    loading: reviewLoading,
    refetch: refetchReview,
  } = useTransactionsNeedingReview(50);

  const { createTransaction } = useCreateTransaction();
  const { updateTransaction } = useUpdateTransaction();
  const { deleteTransaction } = useDeleteTransaction();
  const { addRecurring, loading: addRecurringLoading } = useAddRecurring();

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

  // ── Custom category input state ──
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [newCategoryInput, setNewCategoryInput] = useState('');
  const newCategoryInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isAddingCategory) {
      newCategoryInputRef.current?.focus();
    }
  }, [isAddingCategory]);

  // Merge user categories (from API) + any form-selected custom category, deduplicated and sorted
  const categoryOptions = useMemo(() => {
    const all = new Set(userCategories.length > 0 ? userCategories : PREDEFINED_CATEGORIES);
    if (formData.category && formData.category !== ADD_NEW_CATEGORY_VALUE) {
      all.add(formData.category);
    }
    const sorted = Array.from(all).sort((a, b) => a.localeCompare(b));
    return [
      ...sorted.map((c) => ({ value: c, label: c })),
      { value: ADD_NEW_CATEGORY_VALUE, label: '+ Add Category' },
    ];
  }, [userCategories, formData.category]);

  const handleCategoryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    if (e.target.value === ADD_NEW_CATEGORY_VALUE) {
      setIsAddingCategory(true);
      setNewCategoryInput('');
    } else {
      setFormData({ ...formData, category: e.target.value });
    }
  };

  const handleConfirmNewCategory = async () => {
    const trimmed = newCategoryInput.trim();
    if (!trimmed) return;
    // Persist to DB
    try {
      await createUserCategory({ name: trimmed });
    } catch {
      // May already exist — that's fine
    }
    setFormData({ ...formData, category: trimmed });
    setIsAddingCategory(false);
    setNewCategoryInput('');
  };

  const handleCancelNewCategory = () => {
    setIsAddingCategory(false);
    setNewCategoryInput('');
  };

  const handleNewCategoryKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleConfirmNewCategory();
    } else if (e.key === 'Escape') {
      handleCancelNewCategory();
    }
  };

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

  const handleCategoryClick = useCallback((category: string) => {
    setActiveTab('all');
    setFilters((prev) => ({ ...prev, category }));
  }, []);

  // Category summary when a category filter is active
  const categorySummary = useMemo(() => {
    if (!filters.category || transactions.length === 0) return null;
    let totalIncome = 0;
    let totalExpense = 0;
    let count = 0;
    for (const t of transactions) {
      count++;
      if (t.type === 'INCOME') totalIncome += Math.abs(t.amount);
      else if (t.type === 'EXPENSE') totalExpense += Math.abs(t.amount);
    }
    return { count, totalIncome, totalExpense, net: totalIncome - totalExpense };
  }, [filters.category, transactions]);

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

  const handleMarkRecurring = (transaction: Transaction) => {
    setMarkRecurringTransaction(transaction);
  };

  const handleMarkRecurringSubmit = async (data: {
    merchantName: string;
    amount: number;
    frequency: string;
    category: string;
    firstDate: string;
  }) => {
    try {
      await addRecurring(data);
      setMarkRecurringTransaction(null);
    } catch (err) {
      console.error('Failed to mark as recurring:', err);
    }
  };

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
        // Refetch review list since correcting a category may remove it from review
        refetchReview();
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
    setIsAddingCategory(false);
    setNewCategoryInput('');
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
      {activeTab === 'all' && (
        <Card>
          <TransactionFilters
            filters={filters}
            onFiltersChange={handleFiltersChange}
            onClear={handleClearFilters}
            accounts={accountOptions}
            categories={userCategories.length > 0 ? userCategories : PREDEFINED_CATEGORIES}
          />
        </Card>
      )}

      {/* Tab bar */}
      <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-lg w-fit max-w-full overflow-x-auto">
        <button
          onClick={() => setActiveTab('all')}
          className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
            activeTab === 'all'
              ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
          }`}
        >
          All Transactions
        </button>
        <button
          onClick={() => setActiveTab('review')}
          className={`px-4 py-2 text-sm font-medium rounded-md transition-colors flex items-center gap-2 ${
            activeTab === 'review'
              ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
          }`}
        >
          Needs Review
          {reviewCount > 0 && (
            <span className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 text-xs font-semibold px-2 py-0.5 rounded-full">
              {reviewCount}
            </span>
          )}
        </button>
      </div>

      {/* Category summary banner */}
      {categorySummary && filters.category && (
        <Card>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{filters.category}</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {categorySummary.count} transaction{categorySummary.count !== 1 ? 's' : ''} loaded
                {pageInfo && pageInfo.totalCount > categorySummary.count && ` of ${pageInfo.totalCount} total`}
              </p>
            </div>
            <div className="flex items-center gap-6 text-sm">
              {categorySummary.totalIncome > 0 && (
                <div className="text-right">
                  <p className="text-gray-500 dark:text-gray-400">Income</p>
                  <p className="font-semibold text-green-600 dark:text-green-400">{formatCurrency(categorySummary.totalIncome)}</p>
                </div>
              )}
              {categorySummary.totalExpense > 0 && (
                <div className="text-right">
                  <p className="text-gray-500 dark:text-gray-400">Spent</p>
                  <p className="font-semibold text-red-600 dark:text-red-400">{formatCurrency(categorySummary.totalExpense)}</p>
                </div>
              )}
            </div>
          </div>
        </Card>
      )}

      {/* All Transactions list */}
      {activeTab === 'all' && (
        <Card padding="none">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {pageInfo
                ? `Showing ${transactions.length} of ${pageInfo.totalCount} transactions`
                : `Showing ${transactions.length} transactions`}
            </p>
            {sort.field === 'CREATED_AT' && (
              <button
                onClick={() => setSort({ field: 'DATE', order: 'DESC' })}
                className="text-xs text-primary-600 dark:text-primary-400 hover:underline"
              >
                Sorted by recently added — switch to date order
              </button>
            )}
          </div>
        </div>
        <TransactionList
          transactions={transactions}
          isLoading={loading}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onMarkRecurring={handleMarkRecurring}
          onCategoryClick={handleCategoryClick}
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
      )}

      {/* Needs Review list */}
      {activeTab === 'review' && (
        <Card padding="none">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {reviewCount} transaction{reviewCount !== 1 ? 's' : ''} with low AI confidence need your review
            </p>
          </div>
          {reviewLoading ? (
            <div className="flex items-center justify-center py-12">
              <Spinner size="lg" />
            </div>
          ) : reviewTransactions.length === 0 ? (
            <div className="text-center py-12">
              <svg className="mx-auto h-12 w-12 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">All caught up!</h3>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                No transactions need review right now.
              </p>
            </div>
          ) : (
            <TransactionList
              transactions={reviewTransactions}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onMarkRecurring={handleMarkRecurring}
              onCategoryClick={handleCategoryClick}
              showConfidenceDetail
            />
          )}
        </Card>
      )}

      {/* Add/Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingTransaction(null);
          setIsAddingCategory(false);
          setNewCategoryInput('');
        }}
        title={editingTransaction ? 'Edit Transaction' : 'Add Transaction'}
        size="md"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Select
              label="Type"
              options={transactionTypes}
              value={formData.type}
              onChange={(e) => setFormData({ ...formData, type: e.target.value })}
            />
            {isAddingCategory ? (
              <div className="w-full">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Category
                </label>
                <div className="flex gap-2">
                  <Input
                    ref={newCategoryInputRef}
                    placeholder="e.g., Pet Care"
                    value={newCategoryInput}
                    onChange={(e) => setNewCategoryInput(e.target.value)}
                    onKeyDown={handleNewCategoryKeyDown}
                  />
                  <Button
                    type="button"
                    variant="primary"
                    size="sm"
                    disabled={!newCategoryInput.trim()}
                    onClick={handleConfirmNewCategory}
                    aria-label="Confirm new category"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleCancelNewCategory}
                    aria-label="Cancel new category"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </Button>
                </div>
              </div>
            ) : (
              <Select
                label="Category"
                options={categoryOptions}
                value={formData.category}
                onChange={handleCategoryChange}
              />
            )}
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
              className="w-full sm:w-auto"
              onClick={() => {
                setIsModalOpen(false);
                setEditingTransaction(null);
                setIsAddingCategory(false);
                setNewCategoryInput('');
              }}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary" className="w-full sm:w-auto">
              {editingTransaction ? 'Save Changes' : 'Add Transaction'}
            </Button>
          </ModalFooter>
        </form>
      </Modal>

      {/* Mark as Recurring Modal */}
      <MarkAsRecurringModal
        isOpen={!!markRecurringTransaction}
        onClose={() => setMarkRecurringTransaction(null)}
        transaction={markRecurringTransaction}
        onSubmit={handleMarkRecurringSubmit}
        loading={addRecurringLoading}
      />
    </div>
  );
}
