import { gql } from '@apollo/client';

export const GET_IMPORT_PREVIEW = gql`
  query GetImportPreview($importId: String!) {
    importPreview(importId: $importId) {
      importId
      fileName
      fileFormat
      status
      account {
        institution
        accountType
        accountName
        accountMask
      }
      transactions {
        date
        amount
        description
        merchant
        type
        category
        fitId
        isDuplicate
        suggestedCategory
        duplicateOf
        categoryConfidence
        categorySource
        cleanedMerchant
      }
      totalTransactions
      duplicateCount
      warnings
      matchedAccountId
      matchedAccountName
    }
  }
`;

export const GET_IMPORT_HISTORY = gql`
  query GetImportHistory($limit: Int, $offset: Int) {
    importHistory(limit: $limit, offset: $offset) {
      id
      fileName
      fileFormat
      fileSize
      status
      accountId
      accountName
      detectedInstitution
      detectedAccountType
      transactionsFound
      transactionsImported
      duplicatesSkipped
      errorMessage
      createdAt
      completedAt
    }
  }
`;
