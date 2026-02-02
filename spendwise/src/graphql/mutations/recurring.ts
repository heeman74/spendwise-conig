import { gql } from '@apollo/client';

export const UPDATE_RECURRING = gql`
  mutation UpdateRecurring($id: ID!, $input: UpdateRecurringInput!) {
    updateRecurring(id: $id, input: $input) {
      id
      description
      merchantName
      category
      frequency
      isActive
      isDismissed
      lastAmount
      averageAmount
      lastDate
      firstDate
      nextExpectedDate
      status
      transactionIds
      createdAt
      updatedAt
    }
  }
`;

export const DISMISS_RECURRING = gql`
  mutation DismissRecurring($id: ID!) {
    dismissRecurring(id: $id) {
      id
      isDismissed
    }
  }
`;

export const RESTORE_RECURRING = gql`
  mutation RestoreRecurring($id: ID!) {
    restoreRecurring(id: $id) {
      id
      isDismissed
    }
  }
`;

export const ADD_RECURRING = gql`
  mutation AddRecurring($input: AddRecurringInput!) {
    addRecurring(input: $input) {
      id
      description
      merchantName
      category
      frequency
      isActive
      isDismissed
      lastAmount
      averageAmount
      lastDate
      firstDate
      nextExpectedDate
      status
      transactionIds
      createdAt
      updatedAt
    }
  }
`;

export const DETECT_RECURRING = gql`
  mutation DetectRecurring {
    detectRecurring
  }
`;
