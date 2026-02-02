import { gql } from 'graphql-tag';

export const investmentTypeDefs = gql`
  type Security {
    id: ID!
    name: String!
    tickerSymbol: String
    type: String!
    closePrice: Decimal
    closePriceAsOf: DateTime
    sector: String
    industry: String
  }

  type InvestmentHolding {
    id: ID!
    accountId: String!
    account: Account!
    securityId: String!
    security: Security!
    quantity: Decimal!
    institutionPrice: Decimal!
    institutionValue: Decimal!
    costBasis: Decimal
    unrealizedGain: Decimal!
    unrealizedGainPercent: Decimal!
    isoCurrencyCode: String
    createdAt: DateTime!
    updatedAt: DateTime!
  }

  type AssetAllocation {
    type: String!
    value: Decimal!
    percentage: Float!
    color: String!
  }

  type PortfolioAccount {
    id: ID!
    name: String!
    institution: String!
    value: Decimal!
    holdingCount: Int!
  }

  type Portfolio {
    totalValue: Decimal!
    totalCostBasis: Decimal!
    totalGain: Decimal!
    totalGainPercent: Float!
    holdingCount: Int!
    accountCount: Int!
    accounts: [PortfolioAccount!]!
  }

  input AddHoldingInput {
    accountId: String!
    securityName: String!
    tickerSymbol: String
    securityType: String!
    quantity: Float!
    price: Float!
    costBasis: Float
  }

  input UpdateHoldingPriceInput {
    holdingId: String!
    newPrice: Float!
  }

  extend type Query {
    portfolio: Portfolio!
    assetAllocation: [AssetAllocation!]!
    holdings(accountId: ID): [InvestmentHolding!]!
  }

  extend type Mutation {
    addHolding(input: AddHoldingInput!): InvestmentHolding!
    updateHoldingPrice(input: UpdateHoldingPriceInput!): InvestmentHolding!
  }
`;
