'use client';

import { useQuery, useMutation } from '@apollo/client/react';
import {
  GET_TWO_FACTOR_STATUS,
  SEND_SETUP_CODE,
  ENABLE_TWO_FACTOR,
  DISABLE_TWO_FACTOR,
  REGENERATE_BACKUP_CODES,
  LOGIN_STEP_1,
  LOGIN_STEP_2,
} from '@/graphql';

export type TwoFactorType = 'EMAIL' | 'SMS' | 'BACKUP_CODE';

export interface TwoFactorStatus {
  emailEnabled: boolean;
  smsEnabled: boolean;
  emailVerified: boolean;
  phoneVerified: boolean;
  phoneNumber?: string;
  backupCodesRemaining: number;
}

interface SendSetupCodeData {
  sendSetupCode: {
    success: boolean;
    expiresInMinutes: number;
    codeSentTo: string | null;
  } | null;
}

interface EnableTwoFactorData {
  enableTwoFactor: {
    success: boolean;
    backupCodes: string[] | null;
    message: string | null;
  } | null;
}

interface LoginStep1Data {
  loginStep1: {
    requiresTwoFactor: boolean;
    pendingToken: string | null;
    availableMethods: TwoFactorType[];
  } | null;
}

interface LoginStep2Data {
  loginStep2: {
    token: string;
    user: {
      id: string;
      email: string;
      name: string | null;
      image: string | null;
    };
  } | null;
}

export function useTwoFactorStatus() {
  const { data, loading, error, refetch } = useQuery<any>(GET_TWO_FACTOR_STATUS, {
    fetchPolicy: 'cache-and-network',
  });

  return {
    status: data?.twoFactorStatus as TwoFactorStatus | undefined,
    loading,
    error,
    refetch,
  };
}

export function useSendSetupCode() {
  const [sendSetupCode, { loading, error, data }] = useMutation<SendSetupCodeData>(SEND_SETUP_CODE);

  return {
    sendSetupCode: (type: TwoFactorType, phoneNumber?: string) =>
      sendSetupCode({ variables: { type, phoneNumber } }),
    loading,
    error,
    data,
  };
}

export function useEnableTwoFactor() {
  const [enableTwoFactor, { loading, error, data }] = useMutation<EnableTwoFactorData>(ENABLE_TWO_FACTOR);

  return {
    enableTwoFactor: (type: TwoFactorType, code: string) =>
      enableTwoFactor({ variables: { type, code } }),
    loading,
    error,
    data,
  };
}

export function useDisableTwoFactor() {
  const [disableTwoFactor, { loading, error, data }] = useMutation<{ disableTwoFactor: boolean }>(DISABLE_TWO_FACTOR);

  return {
    disableTwoFactor: (type: TwoFactorType, code: string) =>
      disableTwoFactor({ variables: { type, code } }),
    loading,
    error,
    data,
  };
}

export function useRegenerateBackupCodes() {
  const [regenerateBackupCodes, { loading, error, data }] = useMutation<{ regenerateBackupCodes: string[] }>(REGENERATE_BACKUP_CODES);

  return {
    regenerateBackupCodes: (password: string) =>
      regenerateBackupCodes({ variables: { password } }),
    loading,
    error,
    data,
  };
}

export function useLoginStep1() {
  const [loginStep1, { loading, error, data }] = useMutation<LoginStep1Data>(LOGIN_STEP_1);

  return {
    loginStep1: (email: string, password: string) =>
      loginStep1({ variables: { email, password } }),
    loading,
    error,
    data,
  };
}

export function useLoginStep2() {
  const [loginStep2, { loading, error, data }] = useMutation<LoginStep2Data>(LOGIN_STEP_2);

  return {
    loginStep2: (pendingToken: string, code: string, type: TwoFactorType) =>
      loginStep2({ variables: { pendingToken, code, type } }),
    loading,
    error,
    data,
  };
}

// Combined hook for common 2FA operations
export function useTwoFactor() {
  const { status, loading: statusLoading, refetch } = useTwoFactorStatus();
  const { sendSetupCode, loading: sendingCode } = useSendSetupCode();
  const { enableTwoFactor, loading: enabling } = useEnableTwoFactor();
  const { disableTwoFactor, loading: disabling } = useDisableTwoFactor();
  const { regenerateBackupCodes, loading: regenerating } = useRegenerateBackupCodes();

  return {
    status,
    loading: statusLoading,
    sendingCode,
    enabling,
    disabling,
    regenerating,
    sendSetupCode,
    enableTwoFactor,
    disableTwoFactor,
    regenerateBackupCodes,
    refetch,
  };
}
