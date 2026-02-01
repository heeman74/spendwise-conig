'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import Card from '@/components/ui/Card';
import ImportStepper from '@/components/import/ImportStepper';
import FileDropzone from '@/components/import/FileDropzone';
import ParsingProgress from '@/components/import/ParsingProgress';
import ImportPreview from '@/components/import/ImportPreview';
import ImportResult from '@/components/import/ImportResult';
import ImportHistory from '@/components/import/ImportHistory';
import {
  useStatementUpload,
  useImportPreview,
  useConfirmImport,
  useCancelImport,
} from '@/hooks/useStatementImport';

type Step = 'upload' | 'parse' | 'preview' | 'import' | 'done';

export default function ImportPage() {
  const { data: session } = useSession();
  const [step, setStep] = useState<Step>('upload');
  const [fileName, setFileName] = useState('');
  const [importResult, setImportResult] = useState<any>(null);

  const { uploading, importId, error: uploadError, upload, reset: resetUpload } = useStatementUpload();
  const { preview, isParsing, isReady, isError, startFetching, stopPolling } = useImportPreview(importId);
  const { confirm, loading: confirming, error: confirmError } = useConfirmImport();
  const { cancel } = useCancelImport();

  // Handle file selected from dropzone
  const handleFileSelected = useCallback(async (file: File) => {
    setFileName(file.name);
    setStep('parse');

    try {
      const token = (session as any)?.accessToken || (session as any)?.token;
      if (!token) {
        throw new Error('Not authenticated');
      }
      const id = await upload(file, token);
      if (id) {
        startFetching(id);
      }
    } catch {
      setStep('upload');
    }
  }, [session, upload, startFetching]);

  // React to preview status changes
  useEffect(() => {
    if (isReady && preview) {
      stopPolling();
      setStep('preview');
    }
    if (isError) {
      stopPolling();
      // Stay on parse step to show error
    }
  }, [isReady, isError, preview, stopPolling]);

  // Handle confirm import
  const handleConfirm = useCallback(async (options: any) => {
    if (!importId) return;

    try {
      const result = await confirm({
        importId,
        ...options,
      });
      if (result?.success) {
        setImportResult(result);
        setStep('done');
      }
    } catch {
      // Error shown via confirmError
    }
  }, [importId, confirm]);

  // Handle cancel
  const handleCancel = useCallback(async () => {
    if (importId) {
      try {
        await cancel(importId);
      } catch {
        // Best-effort cancel
      }
    }
    resetState();
  }, [importId, cancel]);

  // Reset to start
  const resetState = useCallback(() => {
    setStep('upload');
    setFileName('');
    setImportResult(null);
    resetUpload();
  }, [resetUpload]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Import Statements</h1>
        <p className="text-gray-500 dark:text-gray-400">
          Upload bank or credit card statements to import transactions
        </p>
      </div>

      <Card>
        <div className="p-6">
          <ImportStepper currentStep={step} />

          {/* Upload Step */}
          {step === 'upload' && (
            <div>
              {uploadError && (
                <div className="mb-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded-lg text-sm">
                  {uploadError}
                </div>
              )}
              <FileDropzone onFileSelected={handleFileSelected} disabled={uploading} />
            </div>
          )}

          {/* Parsing Step */}
          {step === 'parse' && (
            <div>
              {isError && preview?.warnings ? (
                <div className="text-center py-8">
                  <div className="mx-auto w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mb-4">
                    <svg className="w-8 h-8 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                    Failed to parse statement
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                    {preview.warnings[0] || 'An error occurred while parsing your statement.'}
                  </p>
                  <button
                    onClick={resetState}
                    className="text-sm text-primary-600 dark:text-primary-400 hover:underline"
                  >
                    Try another file
                  </button>
                </div>
              ) : (
                <ParsingProgress fileName={fileName} />
              )}
            </div>
          )}

          {/* Preview Step */}
          {step === 'preview' && preview && (
            <div>
              {confirmError && (
                <div className="mb-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded-lg text-sm">
                  {confirmError}
                </div>
              )}
              <ImportPreview
                preview={preview}
                onConfirm={handleConfirm}
                onCancel={handleCancel}
                confirming={confirming}
              />
            </div>
          )}

          {/* Done Step */}
          {step === 'done' && importResult && (
            <ImportResult result={importResult} onImportAnother={resetState} />
          )}
        </div>
      </Card>

      {/* Import History */}
      <ImportHistory />
    </div>
  );
}
