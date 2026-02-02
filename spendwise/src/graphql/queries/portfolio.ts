import { gql } from '@apollo/client';

export const GET_PORTFOLIO = gql`
  query GetPortfolio {
    portfolio {
      totalValue
      totalCostBasis
      totalGain
      totalGainPercent
      holdingCount
      accountCount
      accounts {
        id
        name
        institution
        value
        holdingCount
      }
    }
  }
`;

export const GET_ASSET_ALLOCATION = gql`
  query GetAssetAllocation {
    assetAllocation {
      type
      value
      percentage
      color
    }
  }
`;

export const GET_HOLDINGS = gql`
  query GetHoldings($accountId: ID) {
    holdings(accountId: $accountId) {
      id
      quantity
      institutionPrice
      institutionValue
      costBasis
      unrealizedGain
      unrealizedGainPercent
      isoCurrencyCode
      security {
        id
        name
        tickerSymbol
        type
        closePrice
        closePriceAsOf
      }
      account {
        id
        name
      }
    }
  }
`;
