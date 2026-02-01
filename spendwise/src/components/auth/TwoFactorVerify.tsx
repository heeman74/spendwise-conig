'use client';

import { useState } from 'react';
import { useLoginStep2, TwoFactorType } from '@/hooks/useTwoFactor';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Card from '@/components/ui/Card';
import Spinner from '@/components/ui/Spinner';

interface TwoFactorVerifyProps {
  pendingToken: string;
  availableMethods: TwoFactorType[];
  onVerify: (token: string, user: any) => void;
  onCancel?: () => void;
}

export function TwoFactorVerify({
  pendingToken,
  availableMethods,
  onVerify,
  onCancel,
}: TwoFactorVerifyProps) {
  const [selectedMethod, setSelectedMethod] = useState<TwoFactorType>(
    availableMethods[0] || 'EMAIL'
  );
  const [code, setCode] = useState('');
  const [useBackupCode, setUseBackupCode] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { loginStep2, loading } = useLoginStep2();

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!code.trim()) {
      setError('Please enter a verification code');
      return;
    }

    if (!useBackupCode && code.length !== 6) {
      setError('Verification code must be 6 digits');
      return;
    }

    try {
      setError(null);
      const { data } = await loginStep2(
        pendingToken,
        code,
        useBackupCode ? 'BACKUP_CODE' : selectedMethod
      );

      if (data?.loginStep2?.token && data?.loginStep2?.user) {
        onVerify(data.loginStep2.token, data.loginStep2.user);
      } else {
        setError('Invalid verification code');
      }
    } catch (err: any) {
      if (err.message.includes('Invalid') || err.message.includes('expired')) {
        setError('Invalid or expired verification code. Please try again.');
      } else if (err.message.includes('attempts')) {
        setError('Too many failed attempts. Please request a new code.');
      } else {
        setError(err.message || 'Verification failed');
      }
    }
  };

  const getMethodLabel = (method: TwoFactorType) => {
    switch (method) {
      case 'EMAIL':
        return 'Email';
      case 'SMS':
        return 'SMS';
      case 'BACKUP_CODE':
        return 'Backup Code';
      default:
        return method;
    }
  };

  const getMethodIcon = (method: TwoFactorType) => {
    switch (method) {
      case 'EMAIL':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
        );
      case 'SMS':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
          </svg>
        );
      default:
        return null;
    }
  };

  return (
    <Card className="max-w-md mx-auto">
      <div className="p-6">
        <div className="text-center mb-6">
          <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
            <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold mb-2">Two-Factor Authentication</h2>
          <p className="text-gray-600">
            {useBackupCode
              ? 'Enter one of your backup codes'
              : 'Enter the verification code sent to your device'}
          </p>
        </div>

        <form onSubmit={handleVerify} className="space-y-4">
          {!useBackupCode && availableMethods.length > 1 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Verification Method
              </label>
              <div className="grid grid-cols-2 gap-2">
                {availableMethods.map((method) => (
                  <button
                    key={method}
                    type="button"
                    onClick={() => setSelectedMethod(method)}
                    className={`p-3 border-2 rounded-lg flex items-center justify-center gap-2 transition-colors ${
                      selectedMethod === method
                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                        : 'border-gray-300 hover:border-gray-400'
                    }`}
                  >
                    {getMethodIcon(method)}
                    <span className="font-medium">{getMethodLabel(method)}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div>
            <label htmlFor="code" className="block text-sm font-medium text-gray-700 mb-1">
              {useBackupCode ? 'Backup Code' : 'Verification Code'}
            </label>
            <Input
              id="code"
              type="text"
              value={code}
              onChange={(e) => {
                if (useBackupCode) {
                  setCode(e.target.value.toUpperCase());
                } else {
                  setCode(e.target.value.replace(/\D/g, '').slice(0, 6));
                }
              }}
              placeholder={useBackupCode ? 'XXXXXXXX' : '000000'}
              maxLength={useBackupCode ? 8 : 6}
              disabled={loading}
              className="w-full text-center text-2xl tracking-widest"
              autoComplete="off"
              autoFocus
            />
            {!useBackupCode && (
              <p className="text-xs text-gray-500 mt-1 text-center">
                Code expires in 1 minute
              </p>
            )}
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

          <Button
            type="submit"
            disabled={loading || !code.trim() || (!useBackupCode && code.length !== 6)}
            className="w-full"
          >
            {loading ? <Spinner size="sm" /> : 'Verify'}
          </Button>

          <div className="space-y-2">
            <button
              type="button"
              onClick={() => {
                setUseBackupCode(!useBackupCode);
                setCode('');
                setError(null);
              }}
              className="w-full text-sm text-blue-600 hover:text-blue-700"
            >
              {useBackupCode ? 'Use verification code instead' : 'Use backup code'}
            </button>

            {onCancel && (
              <button
                type="button"
                onClick={onCancel}
                disabled={loading}
                className="w-full text-sm text-gray-500 hover:text-gray-700"
              >
                Cancel
              </button>
            )}
          </div>
        </form>

        {!useBackupCode && (
          <div className="mt-6 pt-6 border-t border-gray-200">
            <p className="text-sm text-gray-600 text-center mb-3">
              Didn't receive a code?
            </p>
            <div className="space-y-2 text-center text-sm">
              <p className="text-gray-500">
                Check your {selectedMethod === 'EMAIL' ? 'email inbox' : 'text messages'}
              </p>
              <p className="text-gray-500">
                Or try using a backup code
              </p>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}
