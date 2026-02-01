import { gql } from 'graphql-tag';

export const plaidTypeDefs = gql`
  type PlaidItem {
    id: ID!
    plaidInstitutionId: String!
    institutionName: String!
    status: String!
    accounts: [Account!]!
    consentExpirationTime: DateTime
    createdAt: DateTime!
    updatedAt: DateTime!
  }

  type PlaidLinkToken {
    linkToken: String!
    expiration: String!
  }

  type ExchangeResult {
    plaidItem: PlaidItem!
    accountsCreated: Int!
  }

  type UnlinkResult {
    success: Boolean!
    accountsAffected: Int!
    keptAsManual: Boolean!
  }

  input ExchangePublicTokenInput {
    publicToken: String!
    institutionId: String!
    institutionName: String!
  }

  extend type Query {
    plaidItems: [PlaidItem!]!
  }

  extend type Mutation {
    createLinkToken(itemId: String): PlaidLinkToken!
    exchangePublicToken(input: ExchangePublicTokenInput!): ExchangeResult!
    unlinkItem(itemId: ID!, keepAsManual: Boolean!): UnlinkResult!
    updateItemStatus(itemId: ID!, status: String!): PlaidItem!
  }
`;
