'use client';

import { useState } from 'react';
import { useTwoFactor, TwoFactorType } from '@/hooks/useTwoFactor';
import {
  useUserCategories,
  useCreateUserCategory,
  useUpdateUserCategory,
  useDeleteUserCategory,
  type UserCategory,
} from '@/hooks/useTransactions';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Badge from '@/components/ui/Badge';
import Spinner from '@/components/ui/Spinner';
import Modal from '@/components/ui/Modal';

export default function SettingsPage() {
  const {
    status,
    loading,
    sendingCode,
    enabling,
    disabling,
    regenerating,
    sendSetupCode,
    enableTwoFactor,
    disableTwoFactor,
    regenerateBackupCodes,
    refetch,
  } = useTwoFactor();

  const [showEnableModal, setShowEnableModal] = useState(false);
  const [showDisableModal, setShowDisableModal] = useState(false);
  const [showBackupCodesModal, setShowBackupCodesModal] = useState(false);
  const [selectedMethod, setSelectedMethod] = useState<TwoFactorType>('EMAIL');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [password, setPassword] = useState('');
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [codeSentTo, setCodeSentTo] = useState<string | null>(null);

  const handleEnableStart = (method: TwoFactorType) => {
    setSelectedMethod(method);
    setShowEnableModal(true);
    setError(null);
    setSuccess(null);
    setVerificationCode('');
    setPhoneNumber('');
    setCodeSentTo(null);
  };

  const handleDisableStart = (method: TwoFactorType) => {
    setSelectedMethod(method);
    setShowDisableModal(true);
    setError(null);
    setSuccess(null);
    setVerificationCode('');
  };

  const handleSendCode = async () => {
    try {
      setError(null);
      const { data } = await sendSetupCode(
        selectedMethod,
        selectedMethod === 'SMS' ? phoneNumber : undefined
      );

      if (data?.sendSetupCode?.success) {
        setCodeSentTo(data.sendSetupCode.codeSentTo || null);
        setSuccess(`Verification code sent to ${data.sendSetupCode.codeSentTo}`);
      } else {
        setError('Failed to send verification code');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to send code');
    }
  };

  const handleEnable = async () => {
    try {
      setError(null);
      const { data } = await enableTwoFactor(selectedMethod, verificationCode);

      if (data?.enableTwoFactor?.success) {
        setSuccess(`${selectedMethod === 'EMAIL' ? 'Email' : 'SMS'} 2FA enabled successfully`);

        if (data.enableTwoFactor.backupCodes) {
          setBackupCodes(data.enableTwoFactor.backupCodes);
          setShowBackupCodesModal(true);
        }

        setShowEnableModal(false);
        refetch();
      } else {
        setError(data?.enableTwoFactor?.message || 'Failed to enable 2FA');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to enable 2FA');
    }
  };

  const handleDisable = async () => {
    try {
      setError(null);
      const { data } = await disableTwoFactor(selectedMethod, verificationCode);

      if (data?.disableTwoFactor) {
        setSuccess(`${selectedMethod === 'EMAIL' ? 'Email' : 'SMS'} 2FA disabled successfully`);
        setShowDisableModal(false);
        refetch();
      } else {
        setError('Failed to disable 2FA');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to disable 2FA');
    }
  };

  const handleRegenerateBackupCodes = async () => {
    try {
      setError(null);
      const { data } = await regenerateBackupCodes(password);

      if (data?.regenerateBackupCodes) {
        setBackupCodes(data.regenerateBackupCodes);
        setShowBackupCodesModal(true);
        setPassword('');
        setSuccess('Backup codes regenerated successfully');
        refetch();
      } else {
        setError('Failed to regenerate backup codes');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to regenerate backup codes');
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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Settings</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">
          Manage your account security and preferences
        </p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded">
          {success}
        </div>
      )}

      {/* Two-Factor Authentication Section */}
      <Card>
        <div className="p-4 sm:p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                Two-Factor Authentication
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Add an extra layer of security to your account
              </p>
            </div>
          </div>

          <div className="space-y-4">
            {/* Email 2FA */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center flex-shrink-0">
                  <svg className="w-6 h-6 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white">Email Authentication</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Receive verification codes via email
                  </p>
                  {status?.emailVerified && (
                    <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                      Email verified
                    </p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-3 self-end sm:self-auto">
                {status?.emailEnabled ? (
                  <>
                    <Badge variant="success">Enabled</Badge>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDisableStart('EMAIL')}
                      disabled={disabling}
                    >
                      Disable
                    </Button>
                  </>
                ) : (
                  <>
                    <Badge variant="default">Disabled</Badge>
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => handleEnableStart('EMAIL')}
                      disabled={enabling}
                    >
                      Enable
                    </Button>
                  </>
                )}
              </div>
            </div>

            {/* SMS 2FA */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center flex-shrink-0">
                  <svg className="w-6 h-6 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white">SMS Authentication</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Receive verification codes via text message
                  </p>
                  {status?.phoneNumber && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      {status.phoneNumber}
                    </p>
                  )}
                  {status?.phoneVerified && (
                    <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                      Phone verified
                    </p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-3 self-end sm:self-auto">
                {status?.smsEnabled ? (
                  <>
                    <Badge variant="success">Enabled</Badge>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDisableStart('SMS')}
                      disabled={disabling}
                    >
                      Disable
                    </Button>
                  </>
                ) : (
                  <>
                    <Badge variant="default">Disabled</Badge>
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => handleEnableStart('SMS')}
                      disabled={enabling}
                    >
                      Enable
                    </Button>
                  </>
                )}
              </div>
            </div>

            {/* Backup Codes */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 border border-gray-200 dark:border-gray-700 rounded-lg bg-yellow-50 dark:bg-yellow-900/20">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-yellow-100 dark:bg-yellow-900 rounded-full flex items-center justify-center flex-shrink-0">
                  <svg className="w-6 h-6 text-yellow-600 dark:text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white">Backup Codes</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Use these codes if you lose access to your 2FA method
                  </p>
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mt-1">
                    {status?.backupCodesRemaining || 0} codes remaining
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3 self-end sm:self-auto">
                <Modal
                  isOpen={showBackupCodesModal}
                  onClose={() => setShowBackupCodesModal(false)}
                  title="Regenerate Backup Codes"
                >
                  <div className="space-y-4">
                    <div className="bg-yellow-50 border border-yellow-200 rounded p-3">
                      <p className="text-sm text-yellow-800">
                        This will invalidate your old backup codes. Make sure to save the new ones.
                      </p>
                    </div>

                    {backupCodes.length > 0 ? (
                      <>
                        <div className="bg-gray-50 border border-gray-200 rounded p-4">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 font-mono text-sm">
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
                            onClick={() => navigator.clipboard.writeText(backupCodes.join('\n'))}
                            className="flex-1"
                          >
                            Copy
                          </Button>
                          <Button
                            variant="outline"
                            onClick={handleDownloadBackupCodes}
                            className="flex-1"
                          >
                            Download
                          </Button>
                        </div>

                        <Button
                          onClick={() => setShowBackupCodesModal(false)}
                          className="w-full"
                        >
                          Done
                        </Button>
                      </>
                    ) : (
                      <>
                        <Input
                          label="Password"
                          type="password"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="Enter your password"
                          disabled={regenerating}
                        />

                        <div className="flex gap-3">
                          <Button
                            variant="outline"
                            onClick={() => {
                              setShowBackupCodesModal(false);
                              setPassword('');
                            }}
                            disabled={regenerating}
                            className="flex-1"
                          >
                            Cancel
                          </Button>
                          <Button
                            onClick={handleRegenerateBackupCodes}
                            disabled={regenerating || !password}
                            className="flex-1"
                          >
                            {regenerating ? <Spinner size="sm" /> : 'Generate'}
                          </Button>
                        </div>
                      </>
                    )}
                  </div>
                </Modal>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setBackupCodes([]);
                    setShowBackupCodesModal(true);
                  }}
                >
                  Regenerate
                </Button>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Enable 2FA Modal */}
      <Modal
        isOpen={showEnableModal}
        onClose={() => setShowEnableModal(false)}
        title={`Enable ${selectedMethod === 'EMAIL' ? 'Email' : 'SMS'} 2FA`}
      >
        <div className="space-y-4">
          {selectedMethod === 'SMS' && !codeSentTo && (
            <Input
              label="Phone Number"
              type="tel"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              placeholder="+1234567890"
              disabled={sendingCode}
            />
          )}

          {!codeSentTo ? (
            <Button
              onClick={handleSendCode}
              disabled={sendingCode || (selectedMethod === 'SMS' && !phoneNumber)}
              className="w-full"
            >
              {sendingCode ? <Spinner size="sm" /> : 'Send Verification Code'}
            </Button>
          ) : (
            <>
              <div className="bg-blue-50 border border-blue-200 rounded p-3">
                <p className="text-sm text-blue-800">
                  Code sent to {codeSentTo}. It expires in 1 minute.
                </p>
              </div>

              <Input
                label="Verification Code"
                type="text"
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="000000"
                maxLength={6}
                disabled={enabling}
              />

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded text-sm">
                  {error}
                </div>
              )}

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => setShowEnableModal(false)}
                  disabled={enabling}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleEnable}
                  disabled={enabling || verificationCode.length !== 6}
                  className="flex-1"
                >
                  {enabling ? <Spinner size="sm" /> : 'Enable'}
                </Button>
              </div>

              <button
                type="button"
                onClick={handleSendCode}
                disabled={sendingCode}
                className="text-sm text-blue-600 hover:text-blue-700 w-full"
              >
                {sendingCode ? 'Sending...' : 'Resend code'}
              </button>
            </>
          )}
        </div>
      </Modal>

      {/* Disable 2FA Modal */}
      <Modal
        isOpen={showDisableModal}
        onClose={() => setShowDisableModal(false)}
        title={`Disable ${selectedMethod === 'EMAIL' ? 'Email' : 'SMS'} 2FA`}
      >
        <div className="space-y-4">
          <div className="bg-yellow-50 border border-yellow-200 rounded p-3">
            <p className="text-sm text-yellow-800">
              Enter a verification code to confirm disabling 2FA. A code will be sent to your {selectedMethod === 'EMAIL' ? 'email' : 'phone'}.
            </p>
          </div>

          <Input
            label="Verification Code"
            type="text"
            value={verificationCode}
            onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
            placeholder="000000"
            maxLength={6}
            disabled={disabling}
          />

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded text-sm">
              {error}
            </div>
          )}

          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => setShowDisableModal(false)}
              disabled={disabling}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={handleDisable}
              disabled={disabling || verificationCode.length !== 6}
              className="flex-1"
              variant="primary"
            >
              {disabling ? <Spinner size="sm" /> : 'Disable'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Categories Section */}
      <CategoryManagement />
    </div>
  );
}

function CategoryManagement() {
  const { categories, loading: categoriesLoading } = useUserCategories();
  const { createUserCategory, loading: creating } = useCreateUserCategory();
  const { updateUserCategory, loading: updating } = useUpdateUserCategory();
  const { deleteUserCategory, loading: deleting } = useDeleteUserCategory();

  const [newName, setNewName] = useState('');
  const [newType, setNewType] = useState('EXPENSE');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editType, setEditType] = useState('');
  const [catError, setCatError] = useState<string | null>(null);
  const [catSuccess, setCatSuccess] = useState<string | null>(null);

  const handleAdd = async () => {
    const trimmed = newName.trim();
    if (!trimmed) return;
    setCatError(null);
    setCatSuccess(null);
    try {
      await createUserCategory({ name: trimmed, type: newType });
      setNewName('');
      setNewType('EXPENSE');
      setCatSuccess(`Category "${trimmed}" added`);
    } catch (err: any) {
      setCatError(err.message || 'Failed to add category');
    }
  };

  const handleEditStart = (cat: UserCategory) => {
    setEditingId(cat.id);
    setEditName(cat.name);
    setEditType(cat.type);
    setCatError(null);
    setCatSuccess(null);
  };

  const handleEditSave = async () => {
    if (!editingId) return;
    setCatError(null);
    setCatSuccess(null);
    try {
      await updateUserCategory(editingId, { name: editName.trim(), type: editType });
      setCatSuccess('Category updated');
      setEditingId(null);
    } catch (err: any) {
      setCatError(err.message || 'Failed to update category');
    }
  };

  const handleEditCancel = () => {
    setEditingId(null);
    setEditName('');
    setEditType('');
  };

  const handleDelete = async (cat: UserCategory) => {
    setCatError(null);
    setCatSuccess(null);
    try {
      await deleteUserCategory(cat.id);
      setCatSuccess(`Category "${cat.name}" deleted`);
    } catch (err: any) {
      setCatError(err.message || 'Failed to delete category');
    }
  };

  return (
    <Card>
      <div className="p-4 sm:p-6">
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Categories</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Manage your transaction categories
          </p>
        </div>

        {catError && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4 text-sm">
            {catError}
          </div>
        )}

        {catSuccess && (
          <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded mb-4 text-sm">
            {catSuccess}
          </div>
        )}

        {/* Add new category */}
        <div className="flex flex-col sm:flex-row sm:items-end gap-3 mb-4">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Name
            </label>
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleAdd(); }}
              placeholder="e.g., Subscriptions"
              className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
            />
          </div>
          <div className="w-full sm:w-32">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Type
            </label>
            <select
              value={newType}
              onChange={(e) => setNewType(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
            >
              <option value="EXPENSE">Expense</option>
              <option value="INCOME">Income</option>
              <option value="BOTH">Both</option>
            </select>
          </div>
          <Button
            variant="primary"
            size="sm"
            onClick={handleAdd}
            disabled={creating || !newName.trim()}
          >
            {creating ? <Spinner size="sm" /> : 'Add'}
          </Button>
        </div>

        {/* Category list */}
        {categoriesLoading ? (
          <div className="flex justify-center py-8">
            <Spinner size="lg" />
          </div>
        ) : (
          <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-800">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400">Name</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400">Type</th>
                  <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 dark:text-gray-400">Default</th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 dark:text-gray-400">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {categories.map((cat) => (
                  <tr key={cat.id}>
                    <td className="px-4 py-2">
                      {editingId === cat.id ? (
                        <input
                          type="text"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          onKeyDown={(e) => { if (e.key === 'Enter') handleEditSave(); if (e.key === 'Escape') handleEditCancel(); }}
                          className="px-2 py-1 rounded border border-primary-400 dark:border-primary-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm w-full"
                          autoFocus
                        />
                      ) : (
                        <span className="text-gray-900 dark:text-white">{cat.name}</span>
                      )}
                    </td>
                    <td className="px-4 py-2">
                      {editingId === cat.id ? (
                        <select
                          value={editType}
                          onChange={(e) => setEditType(e.target.value)}
                          className="px-2 py-1 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                        >
                          <option value="EXPENSE">Expense</option>
                          <option value="INCOME">Income</option>
                          <option value="BOTH">Both</option>
                        </select>
                      ) : (
                        <span className="text-gray-600 dark:text-gray-400">{cat.type}</span>
                      )}
                    </td>
                    <td className="px-4 py-2 text-center">
                      {cat.isDefault && (
                        <Badge variant="default" size="sm">Default</Badge>
                      )}
                    </td>
                    <td className="px-4 py-2 text-right">
                      {editingId === cat.id ? (
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={handleEditSave}
                            disabled={updating}
                            className="text-xs px-2 py-1 rounded bg-primary-600 text-white hover:bg-primary-700 disabled:opacity-40"
                          >
                            {updating ? '...' : 'Save'}
                          </button>
                          <button
                            onClick={handleEditCancel}
                            className="text-xs px-2 py-1 rounded text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleEditStart(cat)}
                            className="text-xs px-2 py-1 rounded text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300"
                          >
                            Edit
                          </button>
                          {!cat.isDefault && (
                            <button
                              onClick={() => handleDelete(cat)}
                              disabled={deleting}
                              className="text-xs px-2 py-1 rounded text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 disabled:opacity-40"
                            >
                              Delete
                            </button>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </Card>
  );
}
