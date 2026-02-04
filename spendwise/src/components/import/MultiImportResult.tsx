'use client';

import Link from 'next/link';
import Button from '@/components/ui/Button';
import { FileImportEntry } from '@/hooks/useMultiStatementImport';

interface MultiImportResultProps {
  entries: FileImportEntry[];
  onImportMore: () => void;
}

export default function MultiImportResult({ entries, onImportMore }: MultiImportResultProps) {
  const doneEntries = entries.filter((e) => e.status === 'done');
  const skippedEntries = entries.filter((e) => e.status === 'skipped');
  const errorEntries = entries.filter((e) => e.status === 'error');

  const totalImported = doneEntries.reduce(
    (sum, e) => sum + (e.result?.transactionsImported ?? 0),
    0
  );
  const totalDuplicatesSkipped = doneEntries.reduce(
    (sum, e) => sum + (e.result?.duplicatesSkipped ?? 0),
    0
  );
  const filesProcessed = doneEntries.length + skippedEntries.length + errorEntries.length;

  const isSingleFile = entries.length === 1 && doneEntries.length === 1;

  // Single file: delegate to simpler display
  if (isSingleFile) {
    const entry = doneEntries[0];
    const result = entry.result;
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
            <span className="font-medium text-gray-900 dark:text-white">{result.transactionsImported}</span>{' '}
            transaction{result.transactionsImported !== 1 ? 's' : ''} imported successfully
          </p>
          {result.duplicatesSkipped > 0 && (
            <p>
              <span className="font-medium">{result.duplicatesSkipped}</span> duplicate{result.duplicatesSkipped !== 1 ? 's' : ''} skipped
            </p>
          )}
        </div>
        {result.recurringPatternsDetected?.length > 0 && (
          <RecurringPatterns patterns={result.recurringPatternsDetected} />
        )}
        <ResultActions onImportMore={onImportMore} />
      </div>
    );
  }

  // Multi-file result
  return (
    <div className="py-8">
      <div className="text-center mb-6">
        <div className="mx-auto w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mb-4">
          <svg className="w-8 h-8 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-1">
          Import Complete — {filesProcessed} file{filesProcessed !== 1 ? 's' : ''} processed
        </h3>
      </div>

      {/* Per-file breakdown */}
      <div className="max-w-md mx-auto mb-6 space-y-2">
        {entries.map((entry) => (
          <div
            key={entry.id}
            className="flex items-center justify-between px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm"
          >
            <span className="font-medium text-gray-900 dark:text-white truncate mr-3">
              {entry.fileName}
            </span>
            <span className="text-gray-500 dark:text-gray-400 flex-shrink-0">
              {entry.status === 'done' && entry.result ? (
                <>
                  {entry.result.transactionsImported} imported
                  {entry.result.duplicatesSkipped > 0 && (
                    <>, {entry.result.duplicatesSkipped} duplicates skipped</>
                  )}
                </>
              ) : entry.status === 'skipped' ? (
                <span className="text-gray-400">Skipped</span>
              ) : entry.status === 'error' ? (
                <span className="text-red-500">Failed</span>
              ) : null}
            </span>
          </div>
        ))}
      </div>

      {/* Totals */}
      <div className="text-center text-sm text-gray-600 dark:text-gray-400 mb-6">
        <p>
          Total: <span className="font-medium text-gray-900 dark:text-white">{totalImported}</span>{' '}
          transaction{totalImported !== 1 ? 's' : ''} imported
          {totalDuplicatesSkipped > 0 && (
            <>, <span className="font-medium">{totalDuplicatesSkipped}</span> duplicate{totalDuplicatesSkipped !== 1 ? 's' : ''} skipped</>
          )}
        </p>
      </div>

      <ResultActions onImportMore={onImportMore} />
    </div>
  );
}

function RecurringPatterns({ patterns }: { patterns: Array<{ merchantName: string; frequency: string; averageAmount: number }> }) {
  return (
    <div className="mb-6 mx-auto max-w-sm">
      <div className="rounded-lg border border-purple-200 dark:border-purple-800 bg-purple-50 dark:bg-purple-900/20 p-4">
        <h4 className="text-sm font-medium text-purple-900 dark:text-purple-300 mb-2">
          {patterns.length} recurring pattern{patterns.length !== 1 ? 's' : ''} detected
        </h4>
        <ul className="space-y-1.5">
          {patterns.map((pattern, i) => (
            <li key={i} className="flex items-center justify-between text-xs text-purple-700 dark:text-purple-400">
              <span className="font-medium truncate mr-2">{pattern.merchantName}</span>
              <span className="flex-shrink-0">
                {pattern.frequency.charAt(0) + pattern.frequency.slice(1).toLowerCase()} · ${pattern.averageAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function ResultActions({ onImportMore }: { onImportMore: () => void }) {
  return (
    <div className="flex items-center justify-center gap-3">
      <Link href="/transactions?sort=CREATED_AT&order=DESC">
        <Button>
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
          View Transactions
        </Button>
      </Link>
      <Button variant="outline" onClick={onImportMore}>
        Import More
      </Button>
    </div>
  );
}
