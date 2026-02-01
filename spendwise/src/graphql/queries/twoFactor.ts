import { gql } from '@apollo/client';

export const GET_TWO_FACTOR_STATUS = gql`
  query GetTwoFactorStatus {
    twoFactorStatus {
      emailEnabled
      smsEnabled
      emailVerified
      phoneVerified
      phoneNumber
      backupCodesRemaining
    }
  }
`;
