import { useState, useCallback } from 'react';
import { useQuery, useMutation } from '@apollo/client/react';
import { GET_IMPORT_PREVIEW, GET_IMPORT_HISTORY } from '@/graphql/queries/statementImport';
import { CONFIRM_IMPORT, CANCEL_IMPORT, DELETE_IMPORT } from '@/graphql/mutations/statementImport';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

interface UploadState {
  uploading: boolean;
  importId: string | null;
  error: string | null;
}

export function useStatementUpload() {
  const [state, setState] = useState<UploadState>({
    uploading: false,
    importId: null,
    error: null,
  });

  const upload = useCallback(async (file: File, token: string) => {
    setState({ uploading: true, importId: null, error: null });

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch(`${API_URL}/api/upload-statement`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Upload failed' }));
        throw new Error(errorData.error || `Upload failed with status ${response.status}`);
      }

      const data = await response.json();
      setState({ uploading: false, importId: data.importId, error: null });
      return data.importId;
    } catch (err: any) {
      setState({ uploading: false, importId: null, error: err.message });
      throw err;
    }
  }, []);

  const reset = useCallback(() => {
    setState({ uploading: false, importId: null, error: null });
  }, []);

  return { ...state, upload, reset };
}

export function useImportPreview(importId: string | null) {
  const [activeImportId, setActiveImportId] = useState<string | null>(null);
  const [polling, setPolling] = useState(false);

  const { data, loading, error, stopPolling } = useQuery<any>(GET_IMPORT_PREVIEW, {
    variables: { importId: activeImportId },
    skip: !activeImportId,
    fetchPolicy: 'network-only',
    pollInterval: polling ? 1500 : 0,
  });

  const preview = data?.importPreview;
  const isParsing = preview?.status === 'PENDING' || preview?.status === 'PARSING';
  const isReady = preview?.status === 'PREVIEW';
  const isError = preview?.status === 'ERROR';

  // Stop polling once parsing is done
  if ((isReady || isError) && polling) {
    setPolling(false);
  }

  const startFetching = useCallback((id: string) => {
    setActiveImportId(id);
    setPolling(true);
  }, []);

  const stop = useCallback(() => {
    setPolling(false);
    stopPolling();
  }, [stopPolling]);

  return {
    preview,
    loading,
    error: error?.message || null,
    isParsing,
    isReady,
    isError,
    startFetching,
    stopPolling: stop,
  };
}

export function useConfirmImport() {
  const [confirmMutation, { loading, error }] = useMutation<any>(CONFIRM_IMPORT);

  const confirm = useCallback(async (input: {
    importId: string;
    accountId?: string;
    createNewAccount?: boolean;
    newAccountName?: string;
    newAccountType?: string;
    newAccountInstitution?: string;
    skipDuplicates?: boolean;
    categoryOverrides?: Array<{ index: number; category: string }>;
  }) => {
    const { data } = await confirmMutation({ variables: { input } });
    return data?.confirmImport;
  }, [confirmMutation]);

  return { confirm, loading, error: error?.message || null };
}

export function useCancelImport() {
  const [cancelMutation, { loading }] = useMutation<any>(CANCEL_IMPORT);

  const cancel = useCallback(async (importId: string) => {
    await cancelMutation({ variables: { importId } });
  }, [cancelMutation]);

  return { cancel, loading };
}

export function useDeleteImport() {
  const [deleteMutation, { loading, error }] = useMutation<any>(DELETE_IMPORT, {
    refetchQueries: ['GetImportHistory', 'GetTransactions', 'GetAccounts', 'GetDashboardStats'],
  });

  const deleteImport = useCallback(async (importId: string) => {
    const { data } = await deleteMutation({ variables: { importId } });
    return data?.deleteImport;
  }, [deleteMutation]);

  return { deleteImport, loading, error: error?.message || null };
}

export function useImportHistory(limit = 10) {
  const { data, loading, error, refetch } = useQuery<any>(GET_IMPORT_HISTORY, {
    variables: { limit, offset: 0 },
    fetchPolicy: 'cache-and-network',
  });

  return {
    imports: data?.importHistory || [],
    loading,
    error: error?.message || null,
    refetch,
  };
}
