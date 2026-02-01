'use client';

import { useState } from 'react';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Modal, { ModalFooter } from '@/components/ui/Modal';
import { useImportHistory, useDeleteImport } from '@/hooks/useStatementImport';

const statusVariants: Record<string, 'default' | 'success' | 'warning' | 'danger' | 'info'> = {
  PENDING: 'default',
  PARSING: 'info',
  PREVIEW: 'info',
  IMPORTING: 'info',
  COMPLETED: 'success',
  ERROR: 'danger',
};

const statusLabels: Record<string, string> = {
  PENDING: 'Pending',
  PARSING: 'Parsing',
  PREVIEW: 'Preview',
  IMPORTING: 'Importing',
  COMPLETED: 'Completed',
  ERROR: 'Error',
};

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function ImportHistory() {
  const { imports, loading, refetch } = useImportHistory();
  const { deleteImport, loading: deleting } = useDeleteImport();
  const [confirmDelete, setConfirmDelete] = useState<any>(null);

  const handleDelete = async () => {
    if (!confirmDelete) return;
    try {
      await deleteImport(confirmDelete.id);
      setConfirmDelete(null);
      refetch();
    } catch (err) {
      console.error('Failed to delete import:', err);
    }
  };

  if (loading || imports.length === 0) return null;

  return (
    <div className="mt-8">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
        Import History
      </h3>

      <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-800">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400">File</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400">Format</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400">Account</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400">Transactions</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400">Status</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400">Date</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {imports.map((imp: any) => (
                <tr key={imp.id}>
                  <td className="px-4 py-3">
                    <div>
                      <p className="text-gray-900 dark:text-white font-medium truncate max-w-[200px]">
                        {imp.fileName}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {formatFileSize(imp.fileSize)}
                      </p>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <Badge size="sm">{imp.fileFormat}</Badge>
                  </td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                    {imp.accountName || imp.detectedInstitution || '-'}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {imp.status === 'COMPLETED' ? (
                      <span className="text-gray-900 dark:text-white">
                        {imp.transactionsImported}
                        {imp.duplicatesSkipped > 0 && (
                          <span className="text-gray-400"> ({imp.duplicatesSkipped} skipped)</span>
                        )}
                      </span>
                    ) : (
                      <span className="text-gray-400">{imp.transactionsFound || '-'}</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <Badge variant={statusVariants[imp.status]} size="sm">
                      {statusLabels[imp.status] || imp.status}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-right text-gray-500 dark:text-gray-400 whitespace-nowrap">
                    {new Date(imp.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => setConfirmDelete(imp)}
                      className="p-1.5 text-gray-400 hover:text-red-600 dark:hover:text-red-400 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                      title="Delete import"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        title="Delete Import"
        size="sm"
      >
        <div className="space-y-3">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Are you sure you want to delete this import?
          </p>
          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 text-sm">
            <p className="font-medium text-gray-900 dark:text-white">{confirmDelete?.fileName}</p>
            {confirmDelete?.status === 'COMPLETED' && confirmDelete?.transactionsImported > 0 && (
              <p className="text-red-600 dark:text-red-400 mt-1">
                This will also delete {confirmDelete.transactionsImported} imported transaction{confirmDelete.transactionsImported !== 1 ? 's' : ''} and reverse balance changes.
              </p>
            )}
          </div>
        </div>
        <ModalFooter>
          <Button variant="outline" onClick={() => setConfirmDelete(null)} disabled={deleting}>
            Cancel
          </Button>
          <Button
            variant="danger"
            onClick={handleDelete}
            disabled={deleting}
          >
            {deleting ? 'Deleting...' : 'Delete'}
          </Button>
        </ModalFooter>
      </Modal>
    </div>
  );
}
