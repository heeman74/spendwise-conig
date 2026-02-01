'use client';

import Modal, { ModalFooter } from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';

interface LinkSuccessModalProps {
  institutionName: string;
  accounts: Array<{
    id: string;
    name: string;
    officialName?: string;
    mask?: string;
    type: string;
    balance: number;
  }>;
  onDone: () => void;
  onConnectAnother: () => void;
}

export default function LinkSuccessModal({
  institutionName,
  accounts,
  onDone,
  onConnectAnother,
}: LinkSuccessModalProps) {
  const getAccountTypeBadge = (type: string) => {
    const typeConfig = {
      CHECKING: { variant: 'success' as const, label: 'Checking' },
      SAVINGS: { variant: 'info' as const, label: 'Savings' },
      CREDIT: { variant: 'danger' as const, label: 'Credit' },
      INVESTMENT: { variant: 'warning' as const, label: 'Investment' },
    };

    const config = typeConfig[type as keyof typeof typeConfig] || {
      variant: 'default' as const,
      label: type,
    };

    return (
      <Badge variant={config.variant} size="sm">
        {config.label}
      </Badge>
    );
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-full items-center justify-center p-4">
        {/* Backdrop */}
        <div className="fixed inset-0 bg-black/50" aria-hidden="true" />

        {/* Modal content */}
        <div className="relative w-full max-w-md transform rounded-xl bg-white p-6 shadow-xl dark:bg-gray-800">
          {/* Success icon and title */}
          <div className="mb-4 text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
              <svg
                className="h-6 w-6 text-green-600 dark:text-green-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
              Connected {institutionName}!
            </h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Found {accounts.length} account{accounts.length !== 1 ? 's' : ''}
            </p>
          </div>

          {/* Accounts list */}
          <div className="mb-6 divide-y divide-gray-200 rounded-lg border border-gray-200 dark:divide-gray-700 dark:border-gray-700">
            {accounts.map((account) => (
              <div key={account.id} className="flex items-center justify-between p-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-gray-900 dark:text-white">
                      {account.name || account.officialName || 'Account'}
                    </p>
                    {getAccountTypeBadge(account.type)}
                  </div>
                  {account.mask && (
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      ••••{account.mask}
                    </p>
                  )}
                </div>
                <div className="text-right">
                  <p className="font-semibold text-gray-900 dark:text-white">
                    {formatCurrency(account.balance)}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* Action buttons */}
          <div className="flex flex-col gap-2">
            <Button onClick={onConnectAnother} variant="secondary" className="w-full">
              Connect Another Bank
            </Button>
            <Button onClick={onDone} variant="primary" className="w-full">
              Done
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
