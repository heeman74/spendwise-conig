import { gql } from 'graphql-tag';

export const commonTypeDefs = gql`
  scalar DateTime
  scalar Decimal

  enum AccountType {
    CHECKING
    SAVINGS
    CREDIT
    INVESTMENT
  }

  enum TransactionType {
    INCOME
    EXPENSE
    TRANSFER
  }

  enum Period {
    WEEK
    MONTH
    YEAR
  }

  enum SortOrder {
    ASC
    DESC
  }

  type PageInfo {
    hasNextPage: Boolean!
    hasPreviousPage: Boolean!
    totalCount: Int!
    totalPages: Int!
  }

  input PaginationInput {
    page: Int = 1
    limit: Int = 20
  }
`;
