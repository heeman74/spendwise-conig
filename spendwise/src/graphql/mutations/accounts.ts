import { gql } from '@apollo/client';
import { ACCOUNT_FRAGMENT } from '../fragments';

export const CREATE_ACCOUNT = gql`
  ${ACCOUNT_FRAGMENT}
  mutation CreateAccount($input: CreateAccountInput!) {
    createAccount(input: $input) {
      ...AccountFields
    }
  }
`;

export const UPDATE_ACCOUNT = gql`
  ${ACCOUNT_FRAGMENT}
  mutation UpdateAccount($id: ID!, $input: UpdateAccountInput!) {
    updateAccount(id: $id, input: $input) {
      ...AccountFields
    }
  }
`;

export const DELETE_ACCOUNT = gql`
  mutation DeleteAccount($id: ID!) {
    deleteAccount(id: $id)
  }
`;
