'use client';

import { useState, useCallback } from 'react';
import ImportPreview from './ImportPreview';
import Button from '@/components/ui/Button';
import { FileImportEntry } from '@/hooks/useMultiStatementImport';

interface MultiImportPreviewProps {
  entries: FileImportEntry[];
  onConfirmEntry: (entryId: string, options: any) => Promise<any>;
  onSkipEntry: (entryId: string) => void;
  onCancelAll: () => void;
}

export default function MultiImportPreview({
  entries,
  onConfirmEntry,
  onSkipEntry,
  onCancelAll,
}: MultiImportPreviewProps) {
  const reviewable = entries.filter(
    (e) => e.status === 'preview_ready' || e.status === 'confirming' || e.status === 'done' || e.status === 'skipped'
  );
  const [currentIndex, setCurrentIndex] = useState(0);
  const [confirming, setConfirming] = useState(false);
  const [confirmError, setConfirmError] = useState<string | null>(null);

  const currentEntry = reviewable[currentIndex];
  const isSingleFile = entries.length === 1;

  const handleConfirm = useCallback(async (options: any) => {
    if (!currentEntry) return;
    setConfirming(true);
    setConfirmError(null);

    try {
      await onConfirmEntry(currentEntry.id, options);
      // Auto-advance to next reviewable entry
      const nextPending = reviewable.findIndex(
        (e, i) => i > currentIndex && e.status === 'preview_ready'
      );
      if (nextPending !== -1) {
        setCurrentIndex(nextPending);
      }
    } catch (err: any) {
      setConfirmError(err.message || 'Failed to confirm import');
    } finally {
      setConfirming(false);
    }
  }, [currentEntry, currentIndex, reviewable, onConfirmEntry]);

  const handleSkip = useCallback(() => {
    if (!currentEntry) return;
    onSkipEntry(currentEntry.id);
    // Auto-advance to next reviewable entry
    const nextPending = reviewable.findIndex(
      (e, i) => i > currentIndex && e.status === 'preview_ready'
    );
    if (nextPending !== -1) {
      setCurrentIndex(nextPending);
    }
  }, [currentEntry, currentIndex, reviewable, onSkipEntry]);

  if (!currentEntry) return null;

  const showTabs = !isSingleFile;

  return (
    <div className="space-y-4">
      {/* File tab bar */}
      {showTabs && (
        <div className="flex gap-1 overflow-x-auto pb-2 border-b border-gray-200 dark:border-gray-700">
          {reviewable.map((entry, idx) => (
            <button
              key={entry.id}
              onClick={() => setCurrentIndex(idx)}
              className={`
                flex items-center gap-2 px-3 py-2 text-sm rounded-t-lg whitespace-nowrap transition-colors
                ${idx === currentIndex
                  ? 'bg-white dark:bg-gray-800 border border-b-0 border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white font-medium -mb-px'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                }
              `}
            >
              <TabStatusDot status={entry.status} />
              <span className="max-w-[120px] truncate">{entry.fileName}</span>
            </button>
          ))}
        </div>
      )}

      {/* Error banner */}
      {confirmError && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded-lg text-sm">
          {confirmError}
        </div>
      )}

      {/* Current file status overlay for done/skipped entries */}
      {currentEntry.status === 'done' ? (
        <div className="text-center py-8">
          <svg className="w-12 h-12 text-green-500 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          <p className="text-sm font-medium text-gray-900 dark:text-white">
            {currentEntry.fileName} — imported successfully
          </p>
          {currentEntry.result && (
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {currentEntry.result.transactionsImported} transactions imported
              {currentEntry.result.duplicatesSkipped > 0 &&
                `, ${currentEntry.result.duplicatesSkipped} duplicates skipped`}
            </p>
          )}
        </div>
      ) : currentEntry.status === 'skipped' ? (
        <div className="text-center py-8">
          <svg className="w-12 h-12 text-gray-400 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
          </svg>
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
            {currentEntry.fileName} — skipped
          </p>
        </div>
      ) : currentEntry.status === 'preview_ready' && currentEntry.preview ? (
        <ImportPreview
          preview={currentEntry.preview}
          onConfirm={handleConfirm}
          onCancel={isSingleFile ? onCancelAll : handleSkip}
          confirming={confirming}
        />
      ) : null}

      {/* Multi-file navigation footer */}
      {showTabs && currentEntry.status === 'preview_ready' && (
        <div className="flex items-center justify-between pt-2 border-t border-gray-200 dark:border-gray-700">
          <span className="text-xs text-gray-500 dark:text-gray-400">
            File {currentIndex + 1} of {reviewable.length}
          </span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentIndex(Math.max(0, currentIndex - 1))}
              disabled={currentIndex === 0}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentIndex(Math.min(reviewable.length - 1, currentIndex + 1))}
              disabled={currentIndex >= reviewable.length - 1}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function TabStatusDot({ status }: { status: string }) {
  const colors: Record<string, string> = {
    preview_ready: 'bg-blue-500',
    confirming: 'bg-blue-500 animate-pulse',
    done: 'bg-green-500',
    skipped: 'bg-gray-400',
    error: 'bg-red-500',
  };
  return (
    <span className={`w-2 h-2 rounded-full flex-shrink-0 ${colors[status] || 'bg-gray-300'}`} />
  );
}
