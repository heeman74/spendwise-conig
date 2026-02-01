'use client';

import { useState, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';

interface Account {
  id: string;
  name: string;
  type: string;
  institution: string;
}

interface AccountFilterProps {
  accounts: Account[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
}

const accountTypeColors: Record<string, string> = {
  CHECKING: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  SAVINGS: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  CREDIT: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  INVESTMENT: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
};

export default function AccountFilter({ accounts, selectedIds, onChange }: AccountFilterProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleToggle = (accountId: string) => {
    if (selectedIds.includes(accountId)) {
      onChange(selectedIds.filter((id) => id !== accountId));
    } else {
      onChange([...selectedIds, accountId]);
    }
  };

  const handleSelectAll = () => {
    onChange(accounts.map((acc) => acc.id));
  };

  const handleClear = () => {
    onChange([]);
  };

  const getButtonLabel = () => {
    if (selectedIds.length === 0) {
      return 'All Accounts';
    }
    if (selectedIds.length === accounts.length) {
      return 'All Accounts';
    }
    return `${selectedIds.length} account${selectedIds.length > 1 ? 's' : ''}`;
  };

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-200 dark:border-gray-600 dark:hover:bg-gray-700"
      >
        <svg
          className="w-4 h-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
          />
        </svg>
        <span>{getButtonLabel()}</span>
      </button>

      {isOpen && (
        <div className="absolute left-0 z-50 mt-2 w-80 bg-white border border-gray-200 rounded-lg shadow-lg dark:bg-gray-800 dark:border-gray-700">
          <div className="p-3 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-900 dark:text-white">Filter by Account</span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleSelectAll}
                  className="text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                >
                  Select All
                </button>
                <span className="text-gray-300 dark:text-gray-600">|</span>
                <button
                  type="button"
                  onClick={handleClear}
                  className="text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                >
                  Clear
                </button>
              </div>
            </div>
          </div>
          <div className="max-h-64 overflow-y-auto p-2">
            {accounts.length === 0 ? (
              <div className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
                No accounts available
              </div>
            ) : (
              accounts.map((account) => (
                <label
                  key={account.id}
                  className="flex items-center gap-3 px-3 py-2 rounded hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={selectedIds.includes(account.id)}
                    onChange={() => handleToggle(account.id)}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 dark:border-gray-600 dark:focus:ring-blue-600"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-900 dark:text-white truncate">
                        {account.name}
                      </span>
                      <span
                        className={cn(
                          'text-xs px-2 py-0.5 rounded-full',
                          accountTypeColors[account.type] || accountTypeColors.CHECKING
                        )}
                      >
                        {account.type}
                      </span>
                    </div>
                    <span className="text-xs text-gray-500 dark:text-gray-400 truncate block">
                      {account.institution}
                    </span>
                  </div>
                </label>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
