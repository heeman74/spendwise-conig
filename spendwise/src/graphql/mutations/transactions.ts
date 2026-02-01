import { gql } from '@apollo/client';
import { TRANSACTION_FRAGMENT, ACCOUNT_FRAGMENT } from '../fragments';

export const CREATE_TRANSACTION = gql`
  ${TRANSACTION_FRAGMENT}
  ${ACCOUNT_FRAGMENT}
  mutation CreateTransaction($input: CreateTransactionInput!) {
    createTransaction(input: $input) {
      ...TransactionFields
      account {
        ...AccountFields
      }
    }
  }
`;

export const UPDATE_TRANSACTION = gql`
  ${TRANSACTION_FRAGMENT}
  ${ACCOUNT_FRAGMENT}
  mutation UpdateTransaction($id: ID!, $input: UpdateTransactionInput!) {
    updateTransaction(id: $id, input: $input) {
      ...TransactionFields
      account {
        ...AccountFields
      }
    }
  }
`;

export const DELETE_TRANSACTION = gql`
  mutation DeleteTransaction($id: ID!) {
    deleteTransaction(id: $id)
  }
`;
