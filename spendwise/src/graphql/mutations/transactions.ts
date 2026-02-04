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

export const CREATE_USER_CATEGORY = gql`
  mutation CreateUserCategory($input: CreateUserCategoryInput!) {
    createUserCategory(input: $input) {
      id
      name
      type
      isDefault
      sortOrder
      createdAt
      updatedAt
    }
  }
`;

export const UPDATE_USER_CATEGORY = gql`
  mutation UpdateUserCategory($id: ID!, $input: UpdateUserCategoryInput!) {
    updateUserCategory(id: $id, input: $input) {
      id
      name
      type
      isDefault
      sortOrder
      createdAt
      updatedAt
    }
  }
`;

export const DELETE_USER_CATEGORY = gql`
  mutation DeleteUserCategory($id: ID!) {
    deleteUserCategory(id: $id)
  }
`;
