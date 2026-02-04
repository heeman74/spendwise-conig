import { useState, useCallback, useRef, useEffect } from 'react';
import { useApolloClient, useMutation } from '@apollo/client/react';
import { GET_IMPORT_PREVIEW } from '@/graphql/queries/statementImport';
import { CONFIRM_IMPORT, CANCEL_IMPORT } from '@/graphql/mutations/statementImport';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
const POLL_INTERVAL = 1500;

export type FileImportStatus =
  | 'pending'
  | 'uploading'
  | 'parsing'
  | 'preview_ready'
  | 'confirming'
  | 'done'
  | 'skipped'
  | 'error';

export interface FileImportEntry {
  id: string;
  file: File;
  fileName: string;
  status: FileImportStatus;
  importId: string | null;
  preview: any | null;
  result: any | null;
  error: string | null;
}

export function useMultiStatementImport() {
  const [entries, setEntries] = useState<FileImportEntry[]>([]);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const client = useApolloClient();
  const [confirmMutation] = useMutation(CONFIRM_IMPORT);
  const [cancelMutation] = useMutation(CANCEL_IMPORT);

  const updateEntry = useCallback((id: string, updates: Partial<FileImportEntry>) => {
    setEntries((prev) =>
      prev.map((e) => (e.id === id ? { ...e, ...updates } : e))
    );
  }, []);

  // Upload all files in parallel
  const uploadAll = useCallback(async (files: File[], token: string) => {
    const newEntries: FileImportEntry[] = files.map((file) => ({
      id: crypto.randomUUID(),
      file,
      fileName: file.name,
      status: 'uploading' as const,
      importId: null,
      preview: null,
      result: null,
      error: null,
    }));

    setEntries(newEntries);

    // Fire all uploads in parallel
    await Promise.allSettled(
      newEntries.map(async (entry) => {
        try {
          const formData = new FormData();
          formData.append('file', entry.file);

          const response = await fetch(`${API_URL}/api/upload-statement`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}` },
            body: formData,
          });

          if (!response.ok) {
            const errorData = await response.json().catch(() => ({ error: 'Upload failed' }));
            throw new Error(errorData.error || `Upload failed with status ${response.status}`);
          }

          const data = await response.json();
          setEntries((prev) =>
            prev.map((e) =>
              e.id === entry.id
                ? { ...e, status: 'parsing', importId: data.importId }
                : e
            )
          );
        } catch (err: any) {
          setEntries((prev) =>
            prev.map((e) =>
              e.id === entry.id
                ? { ...e, status: 'error', error: err.message }
                : e
            )
          );
        }
      })
    );
  }, []);

  // Poll for parsing status
  const startPolling = useCallback(() => {
    if (pollingRef.current) return;

    pollingRef.current = setInterval(async () => {
      setEntries((currentEntries) => {
        const parsingEntries = currentEntries.filter((e) => e.status === 'parsing' && e.importId);

        if (parsingEntries.length === 0) {
          if (pollingRef.current) {
            clearInterval(pollingRef.current);
            pollingRef.current = null;
          }
          return currentEntries;
        }

        // Fire queries for each parsing entry (outside setState)
        for (const entry of parsingEntries) {
          client
            .query({
              query: GET_IMPORT_PREVIEW,
              variables: { importId: entry.importId },
              fetchPolicy: 'network-only',
            })
            .then(({ data }: { data: any }) => {
              const preview = data?.importPreview;
              if (!preview) return;

              if (preview.status === 'PREVIEW') {
                updateEntry(entry.id, { status: 'preview_ready', preview });
              } else if (preview.status === 'ERROR') {
                updateEntry(entry.id, {
                  status: 'error',
                  error: preview.warnings?.[0] || 'Failed to parse statement',
                });
              }
            })
            .catch((err) => {
              updateEntry(entry.id, {
                status: 'error',
                error: err.message || 'Failed to check parsing status',
              });
            });
        }

        return currentEntries;
      });
    }, POLL_INTERVAL);
  }, [client, updateEntry]);

  // Stop polling
  const stopPolling = useCallback(() => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
  }, []);

  // Auto-stop polling when no entries are parsing
  useEffect(() => {
    const parsingCount = entries.filter((e) => e.status === 'parsing').length;
    if (parsingCount === 0 && pollingRef.current) {
      stopPolling();
    }
  }, [entries, stopPolling]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
      }
    };
  }, []);

  // Confirm a single entry
  const confirmEntry = useCallback(async (entryId: string, options: any) => {
    const entry = entries.find((e) => e.id === entryId);
    if (!entry?.importId) return;

    updateEntry(entryId, { status: 'confirming' });

    try {
      const { data } = await confirmMutation({
        variables: {
          input: {
            importId: entry.importId,
            ...options,
          },
        },
      });
      const result = (data as any)?.confirmImport;
      if (result?.success) {
        updateEntry(entryId, { status: 'done', result });
      } else {
        updateEntry(entryId, {
          status: 'error',
          error: result?.message || 'Import failed',
        });
      }
      return result;
    } catch (err: any) {
      updateEntry(entryId, {
        status: 'error',
        error: err.message || 'Import confirmation failed',
      });
      throw err;
    }
  }, [entries, confirmMutation, updateEntry]);

  // Skip a single entry
  const skipEntry = useCallback(async (entryId: string) => {
    const entry = entries.find((e) => e.id === entryId);
    if (entry?.importId) {
      try {
        await cancelMutation({ variables: { importId: entry.importId } });
      } catch {
        // Best-effort cancel
      }
    }
    updateEntry(entryId, { status: 'skipped' });
  }, [entries, cancelMutation, updateEntry]);

  // Cancel all pending/parsing imports
  const cancelAll = useCallback(async () => {
    stopPolling();
    const cancellable = entries.filter(
      (e) => e.importId && ['parsing', 'preview_ready', 'uploading'].includes(e.status)
    );
    await Promise.allSettled(
      cancellable.map((entry) =>
        cancelMutation({ variables: { importId: entry.importId } }).catch(() => {})
      )
    );
    setEntries([]);
  }, [entries, cancelMutation, stopPolling]);

  // Reset everything
  const resetAll = useCallback(() => {
    stopPolling();
    setEntries([]);
  }, [stopPolling]);

  // Derived state
  const allUploaded = entries.length > 0 && entries.every((e) => e.status !== 'uploading');
  const allParsed = entries.length > 0 && entries.every((e) => e.status !== 'parsing' && e.status !== 'uploading');
  const allDone = entries.length > 0 && entries.every((e) => ['done', 'skipped', 'error'].includes(e.status));
  const previewReadyEntries = entries.filter((e) => e.status === 'preview_ready');
  const hasAnyPreviewReady = previewReadyEntries.length > 0;
  const allFailed = entries.length > 0 && entries.every((e) => e.status === 'error');

  return {
    entries,
    uploadAll,
    startPolling,
    stopPolling,
    confirmEntry,
    skipEntry,
    cancelAll,
    resetAll,
    allUploaded,
    allParsed,
    allDone,
    previewReadyEntries,
    hasAnyPreviewReady,
    allFailed,
  };
}
