import { gql } from '@apollo/client';

export const CONFIRM_IMPORT = gql`
  mutation ConfirmImport($input: ConfirmImportInput!) {
    confirmImport(input: $input) {
      success
      message
      accountId
      transactionsImported
      duplicatesSkipped
    }
  }
`;

export const CANCEL_IMPORT = gql`
  mutation CancelImport($importId: String!) {
    cancelImport(importId: $importId)
  }
`;

export const DELETE_IMPORT = gql`
  mutation DeleteImport($importId: String!) {
    deleteImport(importId: $importId) {
      success
      message
      transactionsDeleted
    }
  }
`;
