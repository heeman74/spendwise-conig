'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import Card from '@/components/ui/Card';
import ImportStepper from '@/components/import/ImportStepper';
import FileDropzone from '@/components/import/FileDropzone';
import MultiParsingProgress from '@/components/import/MultiParsingProgress';
import MultiImportPreview from '@/components/import/MultiImportPreview';
import MultiImportResult from '@/components/import/MultiImportResult';
import ImportHistory from '@/components/import/ImportHistory';
import { useMultiStatementImport } from '@/hooks/useMultiStatementImport';

type Step = 'upload' | 'parse' | 'preview' | 'done';

export default function ImportPage() {
  const { data: session } = useSession();
  const [step, setStep] = useState<Step>('upload');

  const {
    entries,
    uploadAll,
    startPolling,
    cancelAll,
    resetAll,
    confirmEntry,
    skipEntry,
    allParsed,
    allDone,
    hasAnyPreviewReady,
    allFailed,
  } = useMultiStatementImport();

  // Handle files selected from dropzone
  const handleFilesSelected = useCallback(async (files: File[]) => {
    setStep('parse');

    try {
      const token = (session as any)?.accessToken || (session as any)?.token;
      if (!token) {
        throw new Error('Not authenticated');
      }
      await uploadAll(files, token);
      startPolling();
    } catch {
      setStep('upload');
    }
  }, [session, uploadAll, startPolling]);

  // Auto-transition from parse to preview when all parsing is done and at least one is ready
  useEffect(() => {
    if (step === 'parse' && allParsed && hasAnyPreviewReady) {
      setStep('preview');
    }
  }, [step, allParsed, hasAnyPreviewReady]);

  // Auto-transition to done when all entries are resolved
  useEffect(() => {
    if (step === 'preview' && allDone) {
      setStep('done');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [step, allDone]);

  // Handle continue from parsing progress
  const handleContinueToReview = useCallback(() => {
    setStep('preview');
  }, []);

  // Handle cancel
  const handleCancel = useCallback(async () => {
    await cancelAll();
    setStep('upload');
  }, [cancelAll]);

  // Reset to start
  const resetState = useCallback(() => {
    resetAll();
    setStep('upload');
  }, [resetAll]);

  // Map step to stepper format (stepper expects 5 steps, we use 4)
  const stepperStep = step === 'done' ? 'done' : step === 'preview' ? 'preview' : step === 'parse' ? 'parse' : 'upload';

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
          <ImportStepper currentStep={stepperStep} />

          {/* Upload Step */}
          {step === 'upload' && (
            <FileDropzone onFilesSelected={handleFilesSelected} />
          )}

          {/* Parsing Step */}
          {step === 'parse' && (
            <MultiParsingProgress
              entries={entries}
              onContinue={handleContinueToReview}
              onRetry={resetState}
              onCancel={handleCancel}
              hasAnyPreviewReady={hasAnyPreviewReady}
              allParsed={allParsed}
              allFailed={allFailed}
            />
          )}

          {/* Preview Step */}
          {step === 'preview' && (
            <MultiImportPreview
              entries={entries}
              onConfirmEntry={confirmEntry}
              onSkipEntry={skipEntry}
              onCancelAll={handleCancel}
            />
          )}

          {/* Done Step */}
          {step === 'done' && (
            <MultiImportResult entries={entries} onImportMore={resetState} />
          )}
        </div>
      </Card>

      {/* Import History */}
      <ImportHistory />
    </div>
  );
}
