'use client';

import { useState, useMemo, useRef, useEffect } from 'react';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import Spinner from '@/components/ui/Spinner';
import { useAccounts } from '@/hooks/useAccounts';
import { useCategories } from '@/hooks/useTransactions';

const DEFAULT_CATEGORIES = [
  'Food & Dining', 'Groceries', 'Shopping', 'Transportation',
  'Bills & Utilities', 'Entertainment', 'Healthcare', 'Travel',
  'Education', 'Personal Care', 'Income', 'Transfer', 'Other',
];

const ADD_NEW_VALUE = '__add_new__';

interface ImportPreviewProps {
  preview: any;
  onConfirm: (options: {
    accountId?: string;
    createNewAccount?: boolean;
    newAccountName?: string;
    newAccountType?: string;
    newAccountInstitution?: string;
    skipDuplicates?: boolean;
    categoryOverrides?: Array<{ index: number; category: string }>;
  }) => void;
  onCancel: () => void;
  confirming: boolean;
}

export default function ImportPreview({ preview, onConfirm, onCancel, confirming }: ImportPreviewProps) {
  const { accounts } = useAccounts();
  const { categories: userCategories } = useCategories();
  const [accountMode, setAccountMode] = useState<'existing' | 'new'>(
    preview.matchedAccountId ? 'existing' : 'new'
  );
  const [selectedAccountId, setSelectedAccountId] = useState<string>(
    preview.matchedAccountId || ''
  );
  const [newAccountName, setNewAccountName] = useState(
    preview.account?.accountName ||
    (preview.account?.institution ? `${preview.account.institution} Account` : '')
  );
  const [newAccountType, setNewAccountType] = useState(
    preview.account?.accountType || 'CHECKING'
  );
  const [newAccountInstitution, setNewAccountInstitution] = useState(
    preview.account?.institution || ''
  );
  const [skipDuplicates, setSkipDuplicates] = useState(true);
  const [categoryOverrides, setCategoryOverrides] = useState<Record<number, string>>({});
  const [showAllTransactions, setShowAllTransactions] = useState(false);
  const [customCategories, setCustomCategories] = useState<string[]>([]);
  const [addingCategoryForIdx, setAddingCategoryForIdx] = useState<number | null>(null);
  const [newCategoryName, setNewCategoryName] = useState('');
  const newCategoryInputRef = useRef<HTMLInputElement>(null);

  // Merge default + user's existing + newly created categories, deduplicated
  const allCategories = useMemo(() => {
    const set = new Set<string>(DEFAULT_CATEGORIES);
    for (const cat of userCategories) set.add(cat);
    for (const cat of customCategories) set.add(cat);
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [userCategories, customCategories]);

  // Focus the input when the add-new row appears
  useEffect(() => {
    if (addingCategoryForIdx !== null && newCategoryInputRef.current) {
      newCategoryInputRef.current.focus();
    }
  }, [addingCategoryForIdx]);

  const nonDuplicateCount = preview.totalTransactions - preview.duplicateCount;
  const displayedTransactions = showAllTransactions
    ? preview.transactions
    : preview.transactions.slice(0, 20);

  const lowConfidenceCount = preview.transactions.filter(
    (txn: any) => !txn.isDuplicate && txn.categorySource !== 'rule' && txn.categorySource !== 'manual' && (txn.categoryConfidence ?? 100) < 60
  ).length;

  const handleCategoryChange = (index: number, category: string) => {
    if (category === ADD_NEW_VALUE) {
      setAddingCategoryForIdx(index);
      setNewCategoryName('');
      return;
    }
    setCategoryOverrides((prev) => ({ ...prev, [index]: category }));
  };

  const handleAddCategory = () => {
    const trimmed = newCategoryName.trim();
    if (!trimmed) return;
    // Add to custom categories (will merge into allCategories via useMemo)
    setCustomCategories((prev) => prev.includes(trimmed) ? prev : [...prev, trimmed]);
    // Set as the selected category for this transaction
    if (addingCategoryForIdx !== null) {
      setCategoryOverrides((prev) => ({ ...prev, [addingCategoryForIdx]: trimmed }));
    }
    setAddingCategoryForIdx(null);
    setNewCategoryName('');
  };

  const handleCancelAddCategory = () => {
    setAddingCategoryForIdx(null);
    setNewCategoryName('');
  };

  const handleConfirm = () => {
    const overrides = Object.entries(categoryOverrides).map(([index, category]) => ({
      index: parseInt(index),
      category,
    }));

    if (accountMode === 'existing') {
      onConfirm({
        accountId: selectedAccountId,
        skipDuplicates,
        categoryOverrides: overrides.length > 0 ? overrides : undefined,
      });
    } else {
      onConfirm({
        createNewAccount: true,
        newAccountName: newAccountName || 'New Account',
        newAccountType,
        newAccountInstitution: newAccountInstitution || 'Unknown',
        skipDuplicates,
        categoryOverrides: overrides.length > 0 ? overrides : undefined,
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Warnings */}
      {preview.warnings.length > 0 && (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
          <h4 className="text-sm font-medium text-yellow-800 dark:text-yellow-300 mb-2">Warnings</h4>
          <ul className="text-sm text-yellow-700 dark:text-yellow-400 space-y-1">
            {preview.warnings.map((w: string, i: number) => (
              <li key={i}>{w}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Account Selection */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
        <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Target Account</h4>

        {preview.account?.institution && (
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
            Detected: {preview.account.institution}
            {preview.account.accountMask && ` (****${preview.account.accountMask})`}
            {preview.account.accountType && ` - ${preview.account.accountType}`}
          </p>
        )}

        <div className="flex gap-3 mb-3">
          <button
            onClick={() => setAccountMode('existing')}
            className={`px-3 py-1.5 text-sm rounded-lg border transition-colors ${
              accountMode === 'existing'
                ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-400'
                : 'border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400'
            }`}
          >
            Use Existing Account
          </button>
          <button
            onClick={() => setAccountMode('new')}
            className={`px-3 py-1.5 text-sm rounded-lg border transition-colors ${
              accountMode === 'new'
                ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-400'
                : 'border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400'
            }`}
          >
            Create New Account
          </button>
        </div>

        {accountMode === 'existing' ? (
          <select
            value={selectedAccountId}
            onChange={(e) => setSelectedAccountId(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
          >
            <option value="">Select an account...</option>
            {accounts.map((acc: any) => (
              <option key={acc.id} value={acc.id}>
                {acc.name} ({acc.institution}) - {acc.type}
              </option>
            ))}
          </select>
        ) : (
          <div className="space-y-3">
            <input
              type="text"
              value={newAccountName}
              onChange={(e) => setNewAccountName(e.target.value)}
              placeholder="Account name"
              className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
            />
            <div className="grid grid-cols-2 gap-3">
              <select
                value={newAccountType}
                onChange={(e) => setNewAccountType(e.target.value)}
                className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
              >
                <option value="CHECKING">Checking</option>
                <option value="SAVINGS">Savings</option>
                <option value="CREDIT">Credit Card</option>
                <option value="INVESTMENT">Investment</option>
              </select>
              <input
                type="text"
                value={newAccountInstitution}
                onChange={(e) => setNewAccountInstitution(e.target.value)}
                placeholder="Institution name"
                className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
              />
            </div>
          </div>
        )}
      </div>

      {/* Summary */}
      <div className="flex items-center gap-4 text-sm">
        <div className="flex items-center gap-2">
          <span className="text-gray-500 dark:text-gray-400">Transactions:</span>
          <span className="font-medium text-gray-900 dark:text-white">{preview.totalTransactions}</span>
        </div>
        {preview.duplicateCount > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-gray-500 dark:text-gray-400">Duplicates:</span>
            <Badge variant="warning" size="sm">{preview.duplicateCount}</Badge>
          </div>
        )}
        <div className="flex items-center gap-2">
          <span className="text-gray-500 dark:text-gray-400">To import:</span>
          <Badge variant="success" size="sm">
            {skipDuplicates ? nonDuplicateCount : preview.totalTransactions}
          </Badge>
        </div>
      </div>

      {/* Duplicate toggle */}
      {preview.duplicateCount > 0 && (
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={skipDuplicates}
            onChange={(e) => setSkipDuplicates(e.target.checked)}
            className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
          />
          <span className="text-gray-700 dark:text-gray-300">
            Skip {preview.duplicateCount} duplicate transaction{preview.duplicateCount > 1 ? 's' : ''}
          </span>
        </label>
      )}

      {/* Low confidence warning */}
      {lowConfidenceCount > 0 && (
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
          <p className="text-sm text-amber-700 dark:text-amber-400">
            {lowConfidenceCount} transaction{lowConfidenceCount > 1 ? 's' : ''} with low confidence — review categories above
          </p>
        </div>
      )}

      {/* Transaction Table */}
      <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-800">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400">Date</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400">Description</th>
                <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 dark:text-gray-400">Amount</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400">Category</th>
                <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 dark:text-gray-400">Confidence</th>
                <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 dark:text-gray-400">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {displayedTransactions.map((txn: any, idx: number) => (
                <tr
                  key={idx}
                  className={`${txn.isDuplicate ? 'bg-yellow-50/50 dark:bg-yellow-900/10' : ''}`}
                >
                  <td className="px-4 py-2 text-gray-900 dark:text-white whitespace-nowrap">
                    {new Date(txn.date).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-2 max-w-[200px]">
                    <div className="text-sm font-medium text-gray-900 dark:text-white truncate">
                      {txn.cleanedMerchant || txn.description}
                    </div>
                    {txn.cleanedMerchant && txn.description && txn.cleanedMerchant !== txn.description && (
                      <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                        {txn.description}
                      </div>
                    )}
                  </td>
                  <td className={`px-4 py-2 text-right whitespace-nowrap font-medium ${
                    txn.type === 'INCOME'
                      ? 'text-green-600 dark:text-green-400'
                      : 'text-gray-900 dark:text-white'
                  }`}>
                    {txn.type === 'INCOME' ? '+' : '-'}${txn.amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                  <td className="px-4 py-2">
                    {addingCategoryForIdx === idx ? (
                      <div className="flex items-center gap-1">
                        <input
                          ref={newCategoryInputRef}
                          type="text"
                          value={newCategoryName}
                          onChange={(e) => setNewCategoryName(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleAddCategory();
                            if (e.key === 'Escape') handleCancelAddCategory();
                          }}
                          placeholder="Category name"
                          className="text-xs px-2 py-1 rounded border border-primary-400 dark:border-primary-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white w-28 focus:outline-none focus:ring-1 focus:ring-primary-500"
                        />
                        <button
                          onClick={handleAddCategory}
                          disabled={!newCategoryName.trim()}
                          className="text-xs px-1.5 py-1 rounded bg-primary-600 text-white hover:bg-primary-700 disabled:opacity-40"
                        >
                          Add
                        </button>
                        <button
                          onClick={handleCancelAddCategory}
                          className="text-xs px-1.5 py-1 rounded text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <select
                        value={categoryOverrides[idx] || txn.suggestedCategory}
                        onChange={(e) => handleCategoryChange(idx, e.target.value)}
                        className="text-xs px-2 py-1 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      >
                        {allCategories.map((cat) => (
                          <option key={cat} value={cat}>{cat}</option>
                        ))}
                        <option disabled>──────────</option>
                        <option value={ADD_NEW_VALUE}>+ Add New Category</option>
                      </select>
                    )}
                  </td>
                  <td className="px-4 py-2 text-center">
                    {txn.categorySource === 'rule' ? (
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-900/30 px-2 py-0.5 rounded-full">
                        Learned
                      </span>
                    ) : txn.categorySource === 'manual' ? (
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 px-2 py-0.5 rounded-full">
                        Manual
                      </span>
                    ) : (
                      <div className="flex items-center gap-1.5 justify-center">
                        <div className="w-12 h-1.5 bg-gray-200 dark:bg-gray-600 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              (txn.categoryConfidence ?? 50) >= 80
                                ? 'bg-green-500'
                                : (txn.categoryConfidence ?? 50) >= 60
                                  ? 'bg-yellow-500'
                                  : 'bg-red-500'
                            }`}
                            style={{ width: `${txn.categoryConfidence ?? 50}%` }}
                          />
                        </div>
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {txn.categoryConfidence ?? 50}%
                        </span>
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-2 text-center">
                    {txn.isDuplicate ? (
                      <Badge variant="warning" size="sm">Duplicate</Badge>
                    ) : (
                      <Badge variant="success" size="sm">New</Badge>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {preview.transactions.length > 20 && !showAllTransactions && (
          <div className="px-4 py-3 bg-gray-50 dark:bg-gray-800 text-center">
            <button
              onClick={() => setShowAllTransactions(true)}
              className="text-sm text-primary-600 dark:text-primary-400 hover:underline"
            >
              Show all {preview.transactions.length} transactions
            </button>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between pt-4">
        <Button variant="outline" onClick={onCancel} disabled={confirming}>
          Cancel
        </Button>
        <Button
          onClick={handleConfirm}
          disabled={
            confirming ||
            (accountMode === 'existing' && !selectedAccountId) ||
            (accountMode === 'new' && !newAccountName)
          }
        >
          {confirming ? (
            <>
              <Spinner size="sm" />
              <span className="ml-2">Importing...</span>
            </>
          ) : (
            `Import ${skipDuplicates ? nonDuplicateCount : preview.totalTransactions} Transactions`
          )}
        </Button>
      </div>
    </div>
  );
}
