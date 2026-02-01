'use client';

import { useEffect, useState, useRef } from 'react';
import { usePlaidLink } from 'react-plaid-link';
import { useCreateLinkToken, useExchangePublicToken, useUpdateItemStatus } from '@/hooks/usePlaid';
import Button from '@/components/ui/Button';
import Spinner, { LoadingOverlay } from '@/components/ui/Spinner';
import LinkSuccessModal from './LinkSuccessModal';

interface PlaidLinkButtonProps {
  mode?: 'create' | 'update';
  itemId?: string;
  onSuccess?: (result: any) => void;
  onExit?: () => void;
  className?: string;
  children?: React.ReactNode;
}

export default function PlaidLinkButton({
  mode = 'create',
  itemId,
  onSuccess,
  onExit,
  className,
  children,
}: PlaidLinkButtonProps) {
  const [linkToken, setLinkToken] = useState<string | null>(null);
  const [isLoadingToken, setIsLoadingToken] = useState(true);
  const [tokenError, setTokenError] = useState<string | null>(null);
  const [isExchanging, setIsExchanging] = useState(false);
  const [successResult, setSuccessResult] = useState<any>(null);
  const [showSuccess, setShowSuccess] = useState(false);

  const { createLinkToken } = useCreateLinkToken();
  const { exchangePublicToken } = useExchangePublicToken();
  const { updateItemStatus } = useUpdateItemStatus();

  // Use ref to avoid stale closure in fetchLinkToken
  const createLinkTokenRef = useRef(createLinkToken);
  createLinkTokenRef.current = createLinkToken;

  const fetchLinkToken = async () => {
    setIsLoadingToken(true);
    setTokenError(null);
    try {
      const { data } = await createLinkTokenRef.current(mode === 'update' ? itemId : undefined);
      if (data?.createLinkToken?.linkToken) {
        setLinkToken(data.createLinkToken.linkToken);
      } else {
        setTokenError('Unable to connect to Plaid. Check API credentials.');
      }
    } catch (error: any) {
      const message = error?.graphQLErrors?.[0]?.message || error?.message || 'Failed to initialize bank connection';
      setTokenError(message);
    } finally {
      setIsLoadingToken(false);
    }
  };

  // Fetch link token on mount and when mode/itemId changes
  useEffect(() => {
    fetchLinkToken();
  }, [mode, itemId]);

  const handleSuccess = async (public_token: string, metadata: any) => {
    try {
      if (mode === 'create') {
        setIsExchanging(true);

        const { data } = await exchangePublicToken({
          publicToken: public_token,
          institutionId: metadata.institution.institution_id,
          institutionName: metadata.institution.name,
        });

        if (data?.exchangePublicToken) {
          setSuccessResult(data.exchangePublicToken);
          setShowSuccess(true);
          onSuccess?.(data.exchangePublicToken);
        }
      } else if (mode === 'update' && itemId) {
        // Update mode: restore connection status
        await updateItemStatus(itemId, 'active');
        // Show simple notification via console (no toast library available)
        console.log('Connection restored!');
        onSuccess?.({ itemId, status: 'active' });
      }
    } catch (error) {
      console.error('Failed to exchange token:', error);
    } finally {
      setIsExchanging(false);
    }
  };

  const handleExit = (error: any, metadata: any) => {
    if (error) {
      const message = error.display_message || 'Connection cancelled';
      console.log('Plaid Link exit:', message);

      // If token is invalid, we could refetch here
      if (error.error_code === 'INVALID_LINK_TOKEN') {
        console.log('Link token invalid, please retry');
      }
    }
    onExit?.();
  };

  const { open, ready } = usePlaidLink({
    token: linkToken,
    onSuccess: handleSuccess,
    onExit: handleExit,
  });

  const handleConnectAnother = () => {
    setShowSuccess(false);
    setSuccessResult(null);
    // Re-fetch link token for another connection
    createLinkToken(undefined).then(({ data }) => {
      if (data?.createLinkToken?.linkToken) {
        setLinkToken(data.createLinkToken.linkToken);
        // Auto-open Link for next connection
        setTimeout(() => {
          if (ready) open();
        }, 100);
      }
    });
  };

  const handleDone = () => {
    setShowSuccess(false);
    setSuccessResult(null);
  };

  if (isExchanging) {
    return <LoadingOverlay message="Connecting your accounts..." />;
  }

  if (showSuccess && successResult) {
    return (
      <LinkSuccessModal
        institutionName={successResult.plaidItem.institutionName}
        accounts={successResult.plaidItem.accounts}
        onDone={handleDone}
        onConnectAnother={handleConnectAnother}
      />
    );
  }

  const defaultLabel = mode === 'create' ? 'Connect Bank' : 'Re-authenticate';

  // Loading state: show spinner in button while fetching token
  if (isLoadingToken) {
    return (
      <Button variant="primary" disabled className={className}>
        <Spinner size="sm" />
        <span className="ml-2">{children ?? defaultLabel}</span>
      </Button>
    );
  }

  // Error state: allow retry
  if (tokenError) {
    return (
      <div className="inline-flex flex-col items-end gap-1">
        <Button onClick={fetchLinkToken} variant="primary" className={className}>
          {children ?? defaultLabel}
        </Button>
        <p className="text-xs text-red-500">{tokenError}</p>
      </div>
    );
  }

  return (
    <Button
      onClick={() => open()}
      disabled={!ready || !linkToken}
      variant="primary"
      className={className}
    >
      {children ?? defaultLabel}
    </Button>
  );
}
