'use client';

import { useState } from 'react';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Spinner from '@/components/ui/Spinner';

interface UnlinkConfirmationModalProps {
  institutionName: string;
  accountCount: number;
  itemId: string;
  onConfirm: (itemId: string, keepAsManual: boolean) => Promise<void>;
  onCancel: () => void;
}

export default function UnlinkConfirmationModal({
  institutionName,
  accountCount,
  itemId,
  onConfirm,
  onCancel,
}: UnlinkConfirmationModalProps) {
  const [confirmText, setConfirmText] = useState('');
  const [keepAsManual, setKeepAsManual] = useState(true);
  const [isUnlinking, setIsUnlinking] = useState(false);
  const [result, setResult] = useState<{ accountCount: number; keptAsManual: boolean } | null>(null);

  const isConfirmTextValid = confirmText.trim().toLowerCase() === institutionName.toLowerCase();

  const handleConfirm = async () => {
    if (!isConfirmTextValid) return;

    setIsUnlinking(true);
    try {
      await onConfirm(itemId, keepAsManual);
      setResult({ accountCount, keptAsManual: keepAsManual });
    } catch (error) {
      console.error('Failed to unlink:', error);
      setIsUnlinking(false);
    }
  };

  const handleDone = () => {
    setResult(null);
    setConfirmText('');
    onCancel();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-xl shadow-2xl p-6">
        {!result ? (
          // Before confirmation
          <>
            <div className="mb-4">
              <h2 className="text-xl font-bold text-red-600 mb-2">
                Unlink {institutionName}?
              </h2>
              <p className="text-sm text-gray-700">
                This will disconnect {institutionName} from SpendWise. {accountCount} account(s) will be affected.
              </p>
            </div>

            {/* Data retention choice */}
            <div className="mb-6 space-y-3">
              <p className="text-sm font-semibold text-gray-900">What should happen to your data?</p>

              <label className="flex items-start gap-3 p-3 border-2 rounded-lg cursor-pointer transition hover:bg-gray-50" style={{ borderColor: keepAsManual ? '#3b82f6' : '#e5e7eb' }}>
                <input
                  type="radio"
                  name="dataRetention"
                  checked={keepAsManual}
                  onChange={() => setKeepAsManual(true)}
                  className="mt-1"
                />
                <div className="flex-1">
                  <p className="font-medium text-gray-900">Keep accounts as manual</p>
                  <p className="text-xs text-gray-600 mt-1">
                    Your accounts and transaction history will be preserved but no longer sync automatically.
                  </p>
                </div>
              </label>

              <label className="flex items-start gap-3 p-3 border-2 rounded-lg cursor-pointer transition hover:bg-gray-50" style={{ borderColor: !keepAsManual ? '#3b82f6' : '#e5e7eb' }}>
                <input
                  type="radio"
                  name="dataRetention"
                  checked={!keepAsManual}
                  onChange={() => setKeepAsManual(false)}
                  className="mt-1"
                />
                <div className="flex-1">
                  <p className="font-medium text-gray-900">Delete all data</p>
                  <p className="text-xs text-gray-600 mt-1">
                    All accounts and transactions from {institutionName} will be permanently deleted.
                  </p>
                </div>
              </label>
            </div>

            {/* Confirmation input */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-900 mb-2">
                Type &apos;{institutionName}&apos; to confirm
              </label>
              <Input
                type="text"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder={institutionName}
                disabled={isUnlinking}
                className="w-full"
              />
            </div>

            {/* Buttons */}
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={onCancel}
                disabled={isUnlinking}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={handleConfirm}
                disabled={!isConfirmTextValid || isUnlinking}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white"
              >
                {isUnlinking ? <Spinner size="sm" /> : `Unlink ${institutionName}`}
              </Button>
            </div>
          </>
        ) : (
          // After confirmation
          <>
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">
                {institutionName} disconnected
              </h2>
              <p className="text-sm text-gray-700">
                {result.accountCount} account(s) {result.keptAsManual ? 'converted to manual' : 'removed'}
              </p>
            </div>

            <Button onClick={handleDone} className="w-full">
              Done
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
