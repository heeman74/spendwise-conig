'use client';

import { useState } from 'react';
import ReAuthBadge from './ReAuthBadge';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';

interface Account {
  id: string;
  name: string;
  officialName?: string;
  mask?: string;
  type: string;
  balance: number;
}

interface PlaidItem {
  id: string;
  institutionName: string;
  plaidInstitutionId: string;
  status: string;
  accounts: Account[];
  createdAt: string;
  updatedAt: string;
}

interface InstitutionCardProps {
  plaidItem: PlaidItem;
  onReAuth: (itemId: string) => void;
  onUnlink: (itemId: string) => void;
}

function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    if (diffHours === 0) {
      const diffMins = Math.floor(diffMs / (1000 * 60));
      return diffMins <= 1 ? 'just now' : `${diffMins} minutes ago`;
    }
    return diffHours === 1 ? '1 hour ago' : `${diffHours} hours ago`;
  }
  if (diffDays === 1) return 'yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) {
    const weeks = Math.floor(diffDays / 7);
    return weeks === 1 ? '1 week ago' : `${weeks} weeks ago`;
  }
  const months = Math.floor(diffDays / 30);
  if (months < 12) return months === 1 ? '1 month ago' : `${months} months ago`;

  // Fallback to date format for older dates
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
}

function getAccountTypeBadge(type: string) {
  const typeMap: Record<string, { label: string; variant: 'default' | 'success' | 'warning' | 'danger' }> = {
    depository: { label: 'Checking/Savings', variant: 'success' },
    credit: { label: 'Credit', variant: 'warning' },
    loan: { label: 'Loan', variant: 'default' },
    investment: { label: 'Investment', variant: 'default' },
  };

  const config = typeMap[type.toLowerCase()] || { label: type, variant: 'default' as const };
  return <Badge variant={config.variant}>{config.label}</Badge>;
}

export default function InstitutionCard({ plaidItem, onReAuth, onUnlink }: InstitutionCardProps) {
  const [reAuthAttempts, setReAuthAttempts] = useState(0);
  const hasError = plaidItem.status === 'error';

  const handleReAuth = () => {
    setReAuthAttempts((prev) => prev + 1);
    onReAuth(plaidItem.id);
  };

  const statusIndicator = {
    active: 'bg-green-500',
    error: 'bg-amber-500',
    pending_disconnect: 'bg-yellow-500',
  }[plaidItem.status] || 'bg-gray-400';

  return (
    <div className="rounded-xl border bg-white shadow-sm p-6">
      {/* Header row */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={`w-2 h-2 rounded-full ${statusIndicator}`} />
          <h3 className="text-lg font-bold text-gray-900">{plaidItem.institutionName}</h3>
        </div>
        {hasError && <ReAuthBadge onClick={handleReAuth} />}
      </div>

      {/* Error message */}
      {hasError && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4">
          <p className="text-sm text-amber-800 font-medium">
            Connection needs re-authentication
          </p>
          <p className="text-xs text-amber-700 mt-1">
            Your bank connection has expired or requires attention. Please re-authenticate to continue syncing.
          </p>
        </div>
      )}

      {/* Re-auth failure suggestion */}
      {reAuthAttempts >= 3 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
          <p className="text-sm text-blue-800 font-medium">Having trouble?</p>
          <p className="text-xs text-blue-700 mt-1">
            Try{' '}
            <button
              onClick={() => onUnlink(plaidItem.id)}
              className="underline hover:text-blue-900"
            >
              unlinking and reconnecting
            </button>{' '}
            this institution.
          </p>
        </div>
      )}

      {/* Accounts list */}
      <div className="divide-y divide-gray-200 my-4">
        {plaidItem.accounts.map((account) => (
          <div key={account.id} className="py-3 flex items-center justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="font-medium text-gray-900">
                  {account.officialName || account.name}
                </span>
                {getAccountTypeBadge(account.type)}
              </div>
              {account.mask && (
                <span className="text-sm text-gray-500">****{account.mask}</span>
              )}
            </div>
            <div className="text-right">
              <span className="font-semibold text-gray-900">
                {formatCurrency(account.balance)}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Footer info */}
      <div className="flex items-center justify-between text-xs text-gray-500 mb-4">
        <span>Connected {formatRelativeTime(plaidItem.createdAt)}</span>
        <span>Last updated {formatRelativeTime(plaidItem.updatedAt)}</span>
      </div>

      {/* Action buttons */}
      <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
        {hasError && (
          <Button variant="primary" size="sm" onClick={handleReAuth}>
            Re-authenticate
          </Button>
        )}
        <Button variant="outline" size="sm" onClick={() => onUnlink(plaidItem.id)} className="text-red-600 border-red-300 hover:bg-red-50">
          Unlink
        </Button>
      </div>
    </div>
  );
}
