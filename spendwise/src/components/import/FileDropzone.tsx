'use client';

import { useState, useCallback, useRef } from 'react';
import Button from '@/components/ui/Button';

const ALLOWED_EXTENSIONS = ['.csv', '.ofx', '.qfx', '.pdf'];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_FILES = 20;

interface FileDropzoneProps {
  onFilesSelected: (files: File[]) => void;
  disabled?: boolean;
}

export default function FileDropzone({ onFilesSelected, disabled }: FileDropzoneProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const validateFile = useCallback((file: File): string | null => {
    const ext = file.name.toLowerCase().match(/\.[^.]+$/)?.[0];
    if (!ext || !ALLOWED_EXTENSIONS.includes(ext)) {
      return `Unsupported file type: ${file.name}. Allowed: ${ALLOWED_EXTENSIONS.join(', ')}`;
    }
    if (file.size > MAX_FILE_SIZE) {
      return `${file.name} is too large. Maximum size is 10MB.`;
    }
    if (file.size === 0) {
      return `${file.name} is empty.`;
    }
    return null;
  }, []);

  const addFiles = useCallback((newFiles: FileList | File[]) => {
    const files = Array.from(newFiles);
    const errors: string[] = [];
    const validFiles: File[] = [];

    for (const file of files) {
      const err = validateFile(file);
      if (err) {
        errors.push(err);
        continue;
      }
      validFiles.push(file);
    }

    setSelectedFiles((prev) => {
      const existingNames = new Set(prev.map((f) => f.name));
      const deduped = validFiles.filter((f) => {
        if (existingNames.has(f.name)) {
          errors.push(`${f.name} is already selected.`);
          return false;
        }
        existingNames.add(f.name);
        return true;
      });

      const combined = [...prev, ...deduped];
      if (combined.length > MAX_FILES) {
        errors.push(`Maximum ${MAX_FILES} files allowed. Some files were not added.`);
        return combined.slice(0, MAX_FILES);
      }
      return combined;
    });

    setError(errors.length > 0 ? errors.join(' ') : null);
  }, [validateFile]);

  const removeFile = useCallback((fileName: string) => {
    setSelectedFiles((prev) => prev.filter((f) => f.name !== fileName));
    setError(null);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (disabled) return;
    if (e.dataTransfer.files.length > 0) {
      addFiles(e.dataTransfer.files);
    }
  }, [disabled, addFiles]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    if (!disabled) setIsDragOver(true);
  }, [disabled]);

  const handleDragLeave = useCallback(() => {
    setIsDragOver(false);
  }, []);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      addFiles(e.target.files);
    }
    // Reset input so the same files can be re-selected
    if (inputRef.current) inputRef.current.value = '';
  }, [addFiles]);

  const handleUpload = useCallback(() => {
    if (selectedFiles.length > 0) {
      onFilesSelected(selectedFiles);
    }
  }, [selectedFiles, onFilesSelected]);

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getFileIcon = (fileName: string) => {
    const ext = fileName.toLowerCase().match(/\.[^.]+$/)?.[0];
    switch (ext) {
      case '.csv':
        return (
          <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        );
      case '.pdf':
        return (
          <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
          </svg>
        );
      default:
        return (
          <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        );
    }
  };

  return (
    <div className="space-y-4">
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => !disabled && inputRef.current?.click()}
        className={`
          relative border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
          ${isDragOver
            ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/10'
            : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
          }
          ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
        `}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".csv,.ofx,.qfx,.pdf"
          multiple
          onChange={handleInputChange}
          className="hidden"
          disabled={disabled}
        />

        <div className="mx-auto w-12 h-12 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center mb-4">
          <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
          </svg>
        </div>

        <p className="text-sm font-medium text-gray-900 dark:text-white mb-1">
          {isDragOver ? 'Drop your files here' : 'Drag and drop your statement files'}
        </p>
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
          or click to browse — select multiple files at once
        </p>
        <p className="text-xs text-gray-400 dark:text-gray-500">
          Supports CSV, OFX, QFX, and PDF files up to 10MB each (max {MAX_FILES} files)
        </p>
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      )}

      {selectedFiles.length > 0 && (
        <div className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg divide-y divide-gray-200 dark:divide-gray-700">
          {selectedFiles.map((file) => (
            <div key={file.name} className="flex items-center gap-3 p-3">
              {getFileIcon(file.name)}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                  {file.name}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {formatFileSize(file.size)}
                </p>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  removeFile(file.name);
                }}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 flex-shrink-0"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          ))}

          <div className="p-3">
            <Button onClick={handleUpload} disabled={disabled} className="w-full">
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
              {selectedFiles.length === 1
                ? 'Upload and Parse'
                : `Upload and Parse ${selectedFiles.length} Files`}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
