import { gql } from 'graphql-tag';

export const statementImportTypeDefs = gql`
  enum StatementFormat {
    CSV
    OFX
    QFX
    PDF
  }

  enum ImportStatus {
    PENDING
    PARSING
    PREVIEW
    IMPORTING
    COMPLETED
    ERROR
  }

  type DetectedAccountInfo {
    institution: String
    accountType: String
    accountName: String
    accountMask: String
  }

  type PreviewTransaction {
    date: DateTime!
    amount: Decimal!
    description: String!
    merchant: String
    type: String!
    category: String!
    fitId: String
    isDuplicate: Boolean!
    suggestedCategory: String!
    duplicateOf: String
    categoryConfidence: Int!
    categorySource: String!
    cleanedMerchant: String!
  }

  type ImportPreview {
    importId: String!
    fileName: String!
    fileFormat: String!
    account: DetectedAccountInfo
    transactions: [PreviewTransaction!]!
    totalTransactions: Int!
    duplicateCount: Int!
    warnings: [String!]!
    matchedAccountId: String
    matchedAccountName: String
    status: ImportStatus!
  }

  type StatementImport {
    id: String!
    fileName: String!
    fileFormat: StatementFormat!
    fileSize: Int!
    status: ImportStatus!
    accountId: String
    accountName: String
    detectedInstitution: String
    detectedAccountType: String
    transactionsFound: Int!
    transactionsImported: Int!
    duplicatesSkipped: Int!
    errorMessage: String
    createdAt: DateTime!
    completedAt: DateTime
  }

  type ConfirmImportResult {
    success: Boolean!
    message: String
    accountId: String
    transactionsImported: Int!
    duplicatesSkipped: Int!
  }

  type DeleteImportResult {
    success: Boolean!
    message: String
    transactionsDeleted: Int!
  }

  input CategoryOverrideInput {
    index: Int!
    category: String!
  }

  input ConfirmImportInput {
    importId: String!
    accountId: String
    createNewAccount: Boolean
    newAccountName: String
    newAccountType: String
    newAccountInstitution: String
    skipDuplicates: Boolean
    categoryOverrides: [CategoryOverrideInput!]
  }

  extend type Query {
    importPreview(importId: String!): ImportPreview
    importHistory(limit: Int, offset: Int): [StatementImport!]!
  }

  extend type Mutation {
    confirmImport(input: ConfirmImportInput!): ConfirmImportResult!
    cancelImport(importId: String!): Boolean!
    deleteImport(importId: String!): DeleteImportResult!
  }
`;
