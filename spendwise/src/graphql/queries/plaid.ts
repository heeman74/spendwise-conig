import { gql } from '@apollo/client';

export const GET_PLAID_ITEMS = gql`
  query GetPlaidItems {
    plaidItems {
      id
      plaidInstitutionId
      institutionName
      status
      consentExpirationTime
      accounts {
        id
        name
        officialName
        mask
        type
        balance
        isLinked
        lastSynced
      }
      createdAt
      updatedAt
    }
  }
`;
