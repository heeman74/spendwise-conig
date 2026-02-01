import { gql } from '@apollo/client';
import { TRANSACTION_FRAGMENT, ACCOUNT_FRAGMENT } from '../fragments';

export const GET_TRANSACTIONS = gql`
  ${TRANSACTION_FRAGMENT}
  ${ACCOUNT_FRAGMENT}
  query GetTransactions(
    $pagination: PaginationInput
    $filters: TransactionFilterInput
    $sort: TransactionSortInput
  ) {
    transactions(pagination: $pagination, filters: $filters, sort: $sort) {
      edges {
        node {
          ...TransactionFields
          account {
            ...AccountFields
          }
        }
        cursor
      }
      pageInfo {
        hasNextPage
        hasPreviousPage
        totalCount
        totalPages
      }
    }
  }
`;

export const GET_TRANSACTION = gql`
  ${TRANSACTION_FRAGMENT}
  ${ACCOUNT_FRAGMENT}
  query GetTransaction($id: ID!) {
    transaction(id: $id) {
      ...TransactionFields
      account {
        ...AccountFields
      }
    }
  }
`;

export const GET_RECENT_TRANSACTIONS = gql`
  ${TRANSACTION_FRAGMENT}
  ${ACCOUNT_FRAGMENT}
  query GetRecentTransactions($limit: Int) {
    recentTransactions(limit: $limit) {
      ...TransactionFields
      account {
        ...AccountFields
      }
    }
  }
`;

export const GET_CATEGORIES = gql`
  query GetCategories {
    categories
  }
`;
