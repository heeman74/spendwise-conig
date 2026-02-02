'use client';

import { Suspense, useState } from 'react';
import Card, { CardHeader, CardTitle } from '@/components/ui/Card';
import RecurringSummary from '@/components/recurring/RecurringSummary';
import RecurringTable from '@/components/recurring/RecurringTable';
import RecurringFilters from '@/components/recurring/RecurringFilters';
import AddRecurringModal from '@/components/recurring/AddRecurringModal';
import {
  useRecurring,
  useRecurringSummary,
  useDismissRecurring,
  useRestoreRecurring,
  useAddRecurring,
} from '@/hooks/useRecurring';

function RecurringContent() {
  const [typeFilter, setTypeFilter] = useState<'All' | 'EXPENSE' | 'INCOME'>('All');
  const [frequencyFilter, setFrequencyFilter] = useState<string | undefined>(undefined);
  const [sort, setSort] = useState<{ field: string; order: 'asc' | 'desc' }>({
    field: 'lastDate',
    order: 'desc',
  });
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDismissed, setShowDismissed] = useState(false);

  // Build filters object
  const filters: Record<string, unknown> = {};
  if (typeFilter !== 'All') {
    filters.type = typeFilter;
  }
  if (frequencyFilter) {
    filters.frequency = frequencyFilter;
  }

  // Fetch data
  const { recurring, loading: recurringLoading, error: recurringError } = useRecurring({
    filters: Object.keys(filters).length > 0 ? filters : undefined,
    sort,
    dismissed: false,
  });

  const { summary, loading: summaryLoading } = useRecurringSummary();

  const {
    recurring: dismissedRecurring,
    loading: dismissedLoading,
  } = useRecurring({
    dismissed: true,
  });

  const { dismissRecurring, loading: dismissLoading } = useDismissRecurring();
  const { restoreRecurring, loading: restoreLoading } = useRestoreRecurring();
  const { addRecurring, loading: addLoading } = useAddRecurring();

  // Handlers
  const handleFilterChange = (newFilters: {
    type?: 'All' | 'EXPENSE' | 'INCOME';
    frequency?: string;
  }) => {
    if (newFilters.type !== undefined) {
      setTypeFilter(newFilters.type);
    }
    if (newFilters.frequency !== undefined) {
      setFrequencyFilter(newFilters.frequency || undefined);
    }
  };

  const handleSort = (field: string) => {
    if (sort.field === field) {
      setSort({ field, order: sort.order === 'asc' ? 'desc' : 'asc' });
    } else {
      setSort({ field, order: 'desc' });
    }
  };

  const handleDismiss = async (id: string) => {
    try {
      await dismissRecurring(id);
    } catch (error) {
      console.error('Failed to dismiss recurring:', error);
    }
  };

  const handleRestore = async (id: string) => {
    try {
      await restoreRecurring(id);
    } catch (error) {
      console.error('Failed to restore recurring:', error);
    }
  };

  const handleAddRecurring = async (data: {
    merchantName: string;
    amount: number;
    frequency: string;
    category: string;
    description?: string;
    firstDate: string;
  }) => {
    try {
      await addRecurring(data);
    } catch (error) {
      console.error('Failed to add recurring:', error);
      throw error;
    }
  };

  // Error handling
  if (recurringError) {
    return (
      <div className="space-y-6">
        <Card className="bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800">
          <p className="text-red-800 dark:text-red-300">
            Failed to load recurring transactions. Please try again.
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Recurring Transactions
          </h1>
          <p className="text-gray-500 dark:text-gray-400">
            Track and manage your recurring expenses and income
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="inline-flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
        >
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add Recurring
        </button>
      </div>

      {/* Filters */}
      <RecurringFilters
        typeFilter={typeFilter}
        frequencyFilter={frequencyFilter}
        onFilterChange={handleFilterChange}
      />

      {/* Summary cards */}
      <RecurringSummary summary={summary} loading={summaryLoading} />

      {/* Recurring table */}
      <Card padding="none">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <CardHeader className="mb-0">
            <CardTitle>Active Recurring Transactions</CardTitle>
          </CardHeader>
        </div>
        <div className="p-6">
          {recurringLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-gray-500 dark:text-gray-400">Loading recurring transactions...</div>
            </div>
          ) : (
            <RecurringTable
              recurring={recurring}
              sort={sort}
              onSort={handleSort}
              onDismiss={handleDismiss}
              onRestore={handleRestore}
            />
          )}
        </div>
      </Card>

      {/* Dismissed section */}
      {dismissedRecurring.length > 0 && (
        <Card padding="none">
          <div
            className="p-6 border-b border-gray-200 dark:border-gray-700 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
            onClick={() => setShowDismissed(!showDismissed)}
          >
            <div className="flex items-center justify-between">
              <CardHeader className="mb-0">
                <CardTitle>
                  Dismissed Items ({dismissedRecurring.length})
                </CardTitle>
              </CardHeader>
              <svg
                className={`w-5 h-5 text-gray-400 transition-transform ${showDismissed ? 'rotate-180' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>
          {showDismissed && (
            <div className="p-6">
              {dismissedLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="text-gray-500 dark:text-gray-400">Loading...</div>
                </div>
              ) : (
                <RecurringTable
                  recurring={dismissedRecurring}
                  sort={{ field: 'lastDate', order: 'desc' }}
                  onSort={() => {}}
                  onDismiss={() => {}}
                  onRestore={handleRestore}
                />
              )}
            </div>
          )}
        </Card>
      )}

      {/* Add Recurring Modal */}
      <AddRecurringModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSubmit={handleAddRecurring}
        loading={addLoading}
      />
    </div>
  );
}

export default function RecurringPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-gray-500 dark:text-gray-400">Loading recurring transactions...</div>
        </div>
      }
    >
      <RecurringContent />
    </Suspense>
  );
}
