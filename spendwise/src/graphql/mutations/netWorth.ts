import { gql } from '@apollo/client';

export const TOGGLE_INCLUDE_IN_NET_WORTH = gql`
  mutation ToggleIncludeInNetWorth($accountId: String!) {
    toggleIncludeInNetWorth(accountId: $accountId) {
      id
      includeInNetWorth
    }
  }
`;

export const BACKFILL_NET_WORTH_SNAPSHOTS = gql`
  mutation BackfillNetWorthSnapshots {
    backfillNetWorthSnapshots
  }
`;
