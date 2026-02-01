import { gql } from 'graphql-tag';

export const twoFactorTypeDefs = gql`
  enum TwoFactorType {
    EMAIL
    SMS
    BACKUP_CODE
  }

  type TwoFactorStatus {
    emailEnabled: Boolean!
    smsEnabled: Boolean!
    emailVerified: Boolean!
    phoneVerified: Boolean!
    phoneNumber: String
    backupCodesRemaining: Int!
  }

  type SendCodeResponse {
    success: Boolean!
    expiresInMinutes: Int!
    codeSentTo: String
  }

  type TwoFactorSetupResponse {
    success: Boolean!
    backupCodes: [String!]
    message: String
  }

  type LoginStep1Response {
    requiresTwoFactor: Boolean!
    pendingToken: String
    availableMethods: [TwoFactorType!]!
  }

  extend type Query {
    twoFactorStatus: TwoFactorStatus!
  }

  extend type Mutation {
    # Two-Factor Setup
    sendSetupCode(type: TwoFactorType!, phoneNumber: String): SendCodeResponse!
    enableTwoFactor(type: TwoFactorType!, code: String!): TwoFactorSetupResponse!
    disableTwoFactor(type: TwoFactorType!, code: String!): Boolean!
    regenerateBackupCodes(password: String!): [String!]!

    # Two-Step Login Flow
    loginStep1(email: String!, password: String!): LoginStep1Response!
    loginStep2(pendingToken: String!, code: String!, type: TwoFactorType!): AuthPayload!
  }
`;
