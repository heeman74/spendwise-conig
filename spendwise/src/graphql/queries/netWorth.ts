import { gql } from '@apollo/client';

export const GET_NET_WORTH = gql`
  query GetNetWorth($timeRange: TimeRange, $accountIds: [String!]) {
    netWorth(timeRange: $timeRange, accountIds: $accountIds) {
      current
      monthOverMonthChange
      monthOverMonthChangePercent
      periodChange
      periodChangePercent
      totalAssets
      totalLiabilities
      history {
        date
        value
      }
      accounts {
        accountId
        accountName
        accountType
        balance
        percentOfTotal
        includeInNetWorth
        history {
          date
          value
        }
      }
    }
  }
`;
