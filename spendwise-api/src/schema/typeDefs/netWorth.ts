import { gql } from 'graphql-tag';

export const netWorthTypeDefs = gql`
  enum TimeRange {
    ONE_MONTH
    THREE_MONTHS
    SIX_MONTHS
    ONE_YEAR
    ALL
  }

  type NetWorthHistory {
    date: DateTime!
    value: Decimal!
  }

  type AccountNetWorth {
    accountId: String!
    accountName: String!
    accountType: String!
    balance: Decimal!
    percentOfTotal: Float!
    includeInNetWorth: Boolean!
    history: [NetWorthHistory!]!
  }

  type NetWorthData {
    current: Decimal!
    monthOverMonthChange: Decimal!
    monthOverMonthChangePercent: Float!
    periodChange: Decimal!
    periodChangePercent: Float!
    totalAssets: Decimal!
    totalLiabilities: Decimal!
    history: [NetWorthHistory!]!
    accounts: [AccountNetWorth!]!
  }

  extend type Query {
    netWorth(timeRange: TimeRange, accountIds: [String!]): NetWorthData!
  }

  extend type Mutation {
    toggleIncludeInNetWorth(accountId: String!): Account!
    backfillNetWorthSnapshots: Boolean!
  }
`;
