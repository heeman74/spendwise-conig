import { gql } from '@apollo/client';

export const CREATE_LINK_TOKEN = gql`
  mutation CreateLinkToken($itemId: String) {
    createLinkToken(itemId: $itemId) {
      linkToken
      expiration
    }
  }
`;

export const EXCHANGE_PUBLIC_TOKEN = gql`
  mutation ExchangePublicToken($input: ExchangePublicTokenInput!) {
    exchangePublicToken(input: $input) {
      plaidItem {
        id
        institutionName
        status
        accounts {
          id
          name
          officialName
          mask
          type
          balance
        }
      }
      accountsCreated
    }
  }
`;

export const UNLINK_ITEM = gql`
  mutation UnlinkItem($itemId: ID!, $keepAsManual: Boolean!) {
    unlinkItem(itemId: $itemId, keepAsManual: $keepAsManual) {
      success
      accountsAffected
      keptAsManual
    }
  }
`;

export const UPDATE_ITEM_STATUS = gql`
  mutation UpdateItemStatus($itemId: ID!, $status: String!) {
    updateItemStatus(itemId: $itemId, status: $status) {
      id
      status
    }
  }
`;
