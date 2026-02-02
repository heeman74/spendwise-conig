import { gql } from '@apollo/client';

export const ADD_HOLDING = gql`
  mutation AddHolding($input: AddHoldingInput!) {
    addHolding(input: $input) {
      id
      quantity
      institutionPrice
      institutionValue
      costBasis
      unrealizedGain
      unrealizedGainPercent
      security {
        id
        name
        tickerSymbol
        type
      }
      account {
        id
        name
      }
    }
  }
`;

export const UPDATE_HOLDING_PRICE = gql`
  mutation UpdateHoldingPrice($input: UpdateHoldingPriceInput!) {
    updateHoldingPrice(input: $input) {
      id
      institutionPrice
      institutionValue
      unrealizedGain
      unrealizedGainPercent
    }
  }
`;
