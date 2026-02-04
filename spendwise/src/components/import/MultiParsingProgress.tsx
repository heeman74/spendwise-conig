'use client';

import Spinner from '@/components/ui/Spinner';
import Button from '@/components/ui/Button';
import { FileImportEntry } from '@/hooks/useMultiStatementImport';

interface MultiParsingProgressProps {
  entries: FileImportEntry[];
  onContinue: () => void;
  onRetry: () => void;
  onCancel: () => void;
  hasAnyPreviewReady: boolean;
  allParsed: boolean;
  allFailed: boolean;
}

export default function MultiParsingProgress({
  entries,
  onContinue,
  onRetry,
  onCancel,
  hasAnyPreviewReady,
  allParsed,
  allFailed,
}: MultiParsingProgressProps) {
  return (
    <div className="py-8">
      <h3 className="text-lg font-medium text-gray-900 dark:text-white text-center mb-6">
        {allParsed ? 'Parsing complete' : 'Parsing your statements...'}
      </h3>

      <div className="space-y-3 max-w-md mx-auto mb-8">
        {entries.map((entry) => (
          <div
            key={entry.id}
            className="flex items-center gap-3 px-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg"
          >
            <StatusIcon status={entry.status} />
            <span className="flex-1 text-sm font-medium text-gray-900 dark:text-white truncate">
              {entry.fileName}
            </span>
            <span className="text-xs text-gray-500 dark:text-gray-400 flex-shrink-0">
              <StatusLabel status={entry.status} error={entry.error} />
            </span>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-center gap-3">
        {allFailed ? (
          <Button onClick={onRetry}>Try Again</Button>
        ) : allParsed && hasAnyPreviewReady ? (
          <Button onClick={onContinue}>Continue to Review</Button>
        ) : hasAnyPreviewReady ? (
          <Button variant="outline" onClick={onContinue}>
            Review Ready Files
          </Button>
        ) : null}

        {!allParsed && (
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        )}
      </div>
    </div>
  );
}

function StatusIcon({ status }: { status: string }) {
  switch (status) {
    case 'uploading':
    case 'parsing':
      return <Spinner size="sm" className="text-primary-600 dark:text-primary-400" />;
    case 'preview_ready':
    case 'done':
      return (
        <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      );
    case 'error':
      return (
        <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      );
    case 'skipped':
      return (
        <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
        </svg>
      );
    default:
      return <div className="w-5 h-5 rounded-full bg-gray-200 dark:bg-gray-600" />;
  }
}

function StatusLabel({ status, error }: { status: string; error: string | null }) {
  switch (status) {
    case 'uploading':
      return <>Uploading...</>;
    case 'parsing':
      return <>Parsing...</>;
    case 'preview_ready':
      return <span className="text-green-600 dark:text-green-400">Ready for review</span>;
    case 'done':
      return <span className="text-green-600 dark:text-green-400">Imported</span>;
    case 'skipped':
      return <span className="text-gray-500">Skipped</span>;
    case 'error':
      return (
        <span className="text-red-600 dark:text-red-400" title={error || undefined}>
          Error{error ? `: ${error.length > 30 ? error.slice(0, 30) + '...' : error}` : ''}
        </span>
      );
    default:
      return <>Pending</>;
  }
}
