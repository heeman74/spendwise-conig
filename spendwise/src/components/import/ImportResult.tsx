'use client';

import Link from 'next/link';
import Button from '@/components/ui/Button';
import { formatCurrency } from '@/lib/utils';

interface ImportResultProps {
  result: {
    transactionsImported: number;
    duplicatesSkipped: number;
    accountId: string;
    recurringPatternsDetected?: Array<{
      merchantName: string;
      frequency: string;
      averageAmount: number;
    }>;
  };
  onImportAnother: () => void;
}

export default function ImportResult({ result, onImportAnother }: ImportResultProps) {
  return (
    <div className="text-center py-8">
      <div className="mx-auto w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mb-4">
        <svg className="w-8 h-8 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      </div>

      <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
        Import Complete
      </h3>

      <div className="text-sm text-gray-600 dark:text-gray-400 space-y-1 mb-6">
        <p>
          <span className="font-medium text-gray-900 dark:text-white">
            {result.transactionsImported}
          </span>{' '}
          transaction{result.transactionsImported !== 1 ? 's' : ''} imported successfully
        </p>
        {result.duplicatesSkipped > 0 && (
          <p>
            <span className="font-medium">{result.duplicatesSkipped}</span> duplicate{result.duplicatesSkipped !== 1 ? 's' : ''} skipped
          </p>
        )}
      </div>

      {result.recurringPatternsDetected && result.recurringPatternsDetected.length > 0 && (
        <div className="mb-6 mx-auto max-w-sm">
          <div className="rounded-lg border border-purple-200 dark:border-purple-800 bg-purple-50 dark:bg-purple-900/20 p-4">
            <h4 className="text-sm font-medium text-purple-900 dark:text-purple-300 mb-2">
              {result.recurringPatternsDetected.length} recurring pattern{result.recurringPatternsDetected.length !== 1 ? 's' : ''} detected
            </h4>
            <ul className="space-y-1.5">
              {result.recurringPatternsDetected.map((pattern, i) => (
                <li key={i} className="flex items-center justify-between text-xs text-purple-700 dark:text-purple-400">
                  <span className="font-medium truncate mr-2">{pattern.merchantName}</span>
                  <span className="flex-shrink-0">
                    {pattern.frequency.charAt(0) + pattern.frequency.slice(1).toLowerCase()} · {formatCurrency(pattern.averageAmount)}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      <div className="flex items-center justify-center gap-3">
        <Link href="/transactions">
          <Button>
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            View Transactions
          </Button>
        </Link>
        <Button variant="outline" onClick={onImportAnother}>
          Import Another
        </Button>
      </div>
    </div>
  );
}
