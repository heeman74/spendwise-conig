import { gql } from '@apollo/client';
import { ACCOUNT_FRAGMENT } from '../fragments';

export const GET_ACCOUNTS = gql`
  ${ACCOUNT_FRAGMENT}
  query GetAccounts {
    accounts {
      ...AccountFields
    }
  }
`;

export const GET_ACCOUNT = gql`
  ${ACCOUNT_FRAGMENT}
  query GetAccount($id: ID!) {
    account(id: $id) {
      ...AccountFields
    }
  }
`;

export const GET_TOTAL_BALANCE = gql`
  query GetTotalBalance {
    totalBalance
  }
`;
