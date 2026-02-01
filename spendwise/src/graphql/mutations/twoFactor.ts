import { gql } from '@apollo/client';

export const SEND_SETUP_CODE = gql`
  mutation SendSetupCode($type: TwoFactorType!, $phoneNumber: String) {
    sendSetupCode(type: $type, phoneNumber: $phoneNumber) {
      success
      expiresInMinutes
      codeSentTo
    }
  }
`;

export const ENABLE_TWO_FACTOR = gql`
  mutation EnableTwoFactor($type: TwoFactorType!, $code: String!) {
    enableTwoFactor(type: $type, code: $code) {
      success
      backupCodes
      message
    }
  }
`;

export const DISABLE_TWO_FACTOR = gql`
  mutation DisableTwoFactor($type: TwoFactorType!, $code: String!) {
    disableTwoFactor(type: $type, code: $code)
  }
`;

export const REGENERATE_BACKUP_CODES = gql`
  mutation RegenerateBackupCodes($password: String!) {
    regenerateBackupCodes(password: $password)
  }
`;

export const LOGIN_STEP_1 = gql`
  mutation LoginStep1($email: String!, $password: String!) {
    loginStep1(email: $email, password: $password) {
      requiresTwoFactor
      pendingToken
      availableMethods
    }
  }
`;

export const LOGIN_STEP_2 = gql`
  mutation LoginStep2($pendingToken: String!, $code: String!, $type: TwoFactorType!) {
    loginStep2(pendingToken: $pendingToken, code: $code, type: $type) {
      token
      user {
        id
        email
        name
        image
      }
    }
  }
`;
