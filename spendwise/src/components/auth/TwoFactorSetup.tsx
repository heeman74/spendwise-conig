'use client';

import { useState } from 'react';
import { useTwoFactor, TwoFactorType } from '@/hooks/useTwoFactor';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Card from '@/components/ui/Card';
import Spinner from '@/components/ui/Spinner';

interface TwoFactorSetupProps {
  onComplete: () => void;
  onSkip?: () => void;
  required?: boolean;
}

type SetupStep = 'choose-method' | 'enter-phone' | 'verify-code' | 'backup-codes';

export function TwoFactorSetup({ onComplete, onSkip, required = false }: TwoFactorSetupProps) {
  const [step, setStep] = useState<SetupStep>('choose-method');
  const [selectedMethod, setSelectedMethod] = useState<TwoFactorType>('EMAIL');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [codeSentTo, setCodeSentTo] = useState<string | null>(null);

  const {
    sendSetupCode,
    enableTwoFactor,
    sendingCode,
    enabling,
  } = useTwoFactor();

  const handleMethodSelect = async (method: TwoFactorType) => {
    setSelectedMethod(method);
    setError(null);

    if (method === 'SMS') {
      setStep('enter-phone');
    } else {
      // For email, send code immediately
      await handleSendCode(method);
    }
  };

  const handleSendCode = async (method: TwoFactorType = selectedMethod, phone?: string) => {
    try {
      setError(null);
      const { data } = await sendSetupCode(method, phone || phoneNumber);

      if (data?.sendSetupCode?.success) {
        setCodeSentTo(data.sendSetupCode.codeSentTo || null);
        setStep('verify-code');
      } else {
        setError('Failed to send verification code. Please try again.');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to send verification code');
    }
  };

  const handlePhoneSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!phoneNumber.trim()) {
      setError('Please enter a phone number');
      return;
    }

    // Basic phone validation
    const phoneRegex = /^\+?[1-9]\d{1,14}$/;
    if (!phoneRegex.test(phoneNumber.replace(/[\s()-]/g, ''))) {
      setError('Please enter a valid phone number (e.g., +1234567890)');
      return;
    }

    await handleSendCode('SMS', phoneNumber);
  };

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!verificationCode.trim()) {
      setError('Please enter the verification code');
      return;
    }

    if (verificationCode.length !== 6) {
      setError('Verification code must be 6 digits');
      return;
    }

    try {
      setError(null);
      const { data } = await enableTwoFactor(selectedMethod, verificationCode);

      if (data?.enableTwoFactor?.success) {
        setBackupCodes(data.enableTwoFactor.backupCodes || []);
        setStep('backup-codes');
      } else {
        setError(data?.enableTwoFactor?.message || 'Invalid verification code');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to verify code');
    }
  };

  const handleDownloadBackupCodes = () => {
    const content = `SpendWise Backup Codes\n\nThese backup codes can be used to access your account if you lose access to your two-factor authentication method.\n\nEach code can only be used once. Store them in a safe place.\n\n${backupCodes.join('\n')}`;

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'spendwise-backup-codes.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleCopyBackupCodes = () => {
    navigator.clipboard.writeText(backupCodes.join('\n'));
  };

  const renderChooseMethod = () => (
    <div className="space-y-4">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold mb-2">Set Up Two-Factor Authentication</h2>
        <p className="text-gray-600">
          Choose how you want to receive verification codes
        </p>
      </div>

      <div className="space-y-3">
        <button
          onClick={() => handleMethodSelect('EMAIL')}
          disabled={sendingCode}
          className="w-full p-4 border-2 border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors text-left"
        >
          <div className="flex items-start">
            <div className="flex-shrink-0 mt-1">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <div className="ml-4">
              <h3 className="font-semibold text-lg">Email Verification</h3>
              <p className="text-gray-600 text-sm">Receive codes via email</p>
            </div>
          </div>
        </button>

        <button
          onClick={() => handleMethodSelect('SMS')}
          disabled={sendingCode}
          className="w-full p-4 border-2 border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors text-left"
        >
          <div className="flex items-start">
            <div className="flex-shrink-0 mt-1">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
            </div>
            <div className="ml-4">
              <h3 className="font-semibold text-lg">SMS Verification</h3>
              <p className="text-gray-600 text-sm">Receive codes via text message</p>
            </div>
          </div>
        </button>
      </div>

      {!required && onSkip && (
        <div className="text-center mt-6">
          <button
            onClick={onSkip}
            className="text-gray-500 hover:text-gray-700 text-sm"
          >
            Skip for now
          </button>
        </div>
      )}
    </div>
  );

  const renderEnterPhone = () => (
    <div className="space-y-4">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold mb-2">Enter Phone Number</h2>
        <p className="text-gray-600">
          We'll send a verification code to this number
        </p>
      </div>

      <form onSubmit={handlePhoneSubmit} className="space-y-4">
        <div>
          <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
            Phone Number
          </label>
          <Input
            id="phone"
            type="tel"
            value={phoneNumber}
            onChange={(e) => setPhoneNumber(e.target.value)}
            placeholder="+1234567890"
            disabled={sendingCode}
            className="w-full"
          />
          <p className="text-xs text-gray-500 mt-1">
            Include country code (e.g., +1 for US)
          </p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        )}

        <div className="flex gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => setStep('choose-method')}
            disabled={sendingCode}
            className="flex-1"
          >
            Back
          </Button>
          <Button
            type="submit"
            disabled={sendingCode}
            className="flex-1"
          >
            {sendingCode ? <Spinner size="sm" /> : 'Send Code'}
          </Button>
        </div>
      </form>
    </div>
  );

  const renderVerifyCode = () => (
    <div className="space-y-4">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold mb-2">Enter Verification Code</h2>
        <p className="text-gray-600">
          {codeSentTo ? (
            <>Code sent to {codeSentTo}</>
          ) : (
            <>Enter the 6-digit code we sent you</>
          )}
        </p>
        <p className="text-sm text-gray-500 mt-2">
          Code expires in 1 minute
        </p>
      </div>

      <form onSubmit={handleVerifyCode} className="space-y-4">
        <div>
          <label htmlFor="code" className="block text-sm font-medium text-gray-700 mb-1">
            Verification Code
          </label>
          <Input
            id="code"
            type="text"
            value={verificationCode}
            onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
            placeholder="000000"
            maxLength={6}
            disabled={enabling}
            className="w-full text-center text-2xl tracking-widest"
          />
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        )}

        <div className="flex gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              setVerificationCode('');
              setError(null);
              if (selectedMethod === 'SMS') {
                setStep('enter-phone');
              } else {
                setStep('choose-method');
              }
            }}
            disabled={enabling}
            className="flex-1"
          >
            Back
          </Button>
          <Button
            type="submit"
            disabled={enabling || verificationCode.length !== 6}
            className="flex-1"
          >
            {enabling ? <Spinner size="sm" /> : 'Verify'}
          </Button>
        </div>

        <div className="text-center">
          <button
            type="button"
            onClick={() => handleSendCode(selectedMethod, selectedMethod === 'SMS' ? phoneNumber : undefined)}
            disabled={sendingCode}
            className="text-sm text-blue-600 hover:text-blue-700"
          >
            {sendingCode ? 'Sending...' : 'Resend code'}
          </button>
        </div>
      </form>
    </div>
  );

  const renderBackupCodes = () => (
    <div className="space-y-4">
      <div className="text-center mb-6">
        <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
          <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 className="text-2xl font-bold mb-2">Two-Factor Authentication Enabled!</h2>
        <p className="text-gray-600">
          Save these backup codes in a safe place
        </p>
      </div>

      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
        <div className="flex items-start">
          <svg className="w-5 h-5 text-yellow-600 mt-0.5 mr-2" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          <div className="flex-1">
            <p className="font-semibold text-yellow-800">Important!</p>
            <p className="text-sm text-yellow-700">
              Each backup code can only be used once. Store them securely.
            </p>
          </div>
        </div>
      </div>

      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <div className="grid grid-cols-2 gap-2 font-mono text-sm">
          {backupCodes.map((code, index) => (
            <div key={index} className="bg-white px-3 py-2 rounded border border-gray-300 text-center">
              {code}
            </div>
          ))}
        </div>
      </div>

      <div className="flex gap-3">
        <Button
          variant="outline"
          onClick={handleCopyBackupCodes}
          className="flex-1"
        >
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
          Copy
        </Button>
        <Button
          variant="outline"
          onClick={handleDownloadBackupCodes}
          className="flex-1"
        >
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          Download
        </Button>
      </div>

      <Button
        onClick={onComplete}
        className="w-full"
      >
        Continue to Dashboard
      </Button>
    </div>
  );

  return (
    <Card className="max-w-md mx-auto">
      <div className="p-6">
        {step === 'choose-method' && renderChooseMethod()}
        {step === 'enter-phone' && renderEnterPhone()}
        {step === 'verify-code' && renderVerifyCode()}
        {step === 'backup-codes' && renderBackupCodes()}
      </div>
    </Card>
  );
}
