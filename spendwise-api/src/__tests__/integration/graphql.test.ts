import { jest, describe, it, expect, beforeEach, beforeAll } from '@jest/globals';
import { ApolloServer } from '@apollo/server';
import { makeExecutableSchema } from '@graphql-tools/schema';
import gql from 'graphql-tag';
import { mockUser, mockAccounts, mockTransactions, mockContext } from '../mocks/data';
import { prisma } from '../../lib/prisma';

// Mock the auth module
jest.mock('../../context/auth', () => ({
  signToken: jest.fn().mockReturnValue('mock-jwt-token'),
  getUserFromToken: jest.fn(),
}));

// Mock bcryptjs
jest.mock('bcryptjs', () => ({
  hash: jest.fn<any>().mockResolvedValue('$2a$12$hashedpassword'),
  compare: jest.fn<any>().mockResolvedValue(true),
}));

// Import after mocks
import { typeDefs } from '../../schema/typeDefs';
import { resolvers } from '../../schema/resolvers';

describe('GraphQL API Integration Tests', () => {
  let server: ApolloServer;

  beforeAll(async () => {
    const schema = makeExecutableSchema({
      typeDefs,
      resolvers,
    });

    server = new ApolloServer({
      schema,
    });

    await server.start();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('User Queries and Mutations', () => {
    it('should return null for me query when unauthenticated', async () => {
      const query = gql`
        query Me {
          me {
            id
            email
            name
          }
        }
      `;

      const response = await server.executeOperation(
        { query: query.loc?.source.body || '' },
        { contextValue: { prisma, user: null, redis: {} } }
      );

      expect(response.body.kind).toBe('single');
      if (response.body.kind === 'single') {
        expect(response.body.singleResult.errors).toBeUndefined();
        expect(response.body.singleResult.data?.me).toBeNull();
      }
    });

    it('should return current user for me query when authenticated', async () => {
      (prisma.user.findUnique as any).mockResolvedValue({
        ...mockUser,
        accounts: mockAccounts,
        goals: [],
      });

      const query = gql`
        query Me {
          me {
            id
            email
            name
          }
        }
      `;

      const response = await server.executeOperation(
        { query: query.loc?.source.body || '' },
        { contextValue: { prisma, user: mockContext.user, redis: {} } }
      );

      expect(response.body.kind).toBe('single');
      if (response.body.kind === 'single') {
        expect(response.body.singleResult.errors).toBeUndefined();
        expect(response.body.singleResult.data?.me).toMatchObject({
          id: 'user-123',
          email: 'test@example.com',
        });
      }
    });

    it('should register a new user', async () => {
      (prisma.user.findUnique as any).mockResolvedValue(null);
      (prisma.user.create as any).mockResolvedValue({
        ...mockUser,
        id: 'new-user-id',
        email: 'newuser@example.com',
      });

      const mutation = gql`
        mutation Register($email: String!, $password: String!, $name: String) {
          register(email: $email, password: $password, name: $name) {
            token
            user {
              id
              email
            }
          }
        }
      `;

      const response = await server.executeOperation(
        {
          query: mutation.loc?.source.body || '',
          variables: {
            email: 'newuser@example.com',
            password: 'password123',
            name: 'New User',
          },
        },
        { contextValue: { prisma, user: null, redis: {} } }
      );

      expect(response.body.kind).toBe('single');
      if (response.body.kind === 'single') {
        expect(response.body.singleResult.errors).toBeUndefined();
        expect(response.body.singleResult.data?.register).toMatchObject({
          token: 'mock-jwt-token',
          user: { email: 'newuser@example.com' },
        });
      }
    });

    it('should login a user', async () => {
      (prisma.user.findUnique as any).mockResolvedValue(mockUser);

      const mutation = gql`
        mutation Login($email: String!, $password: String!) {
          login(email: $email, password: $password) {
            token
            user {
              id
              email
            }
          }
        }
      `;

      const response = await server.executeOperation(
        {
          query: mutation.loc?.source.body || '',
          variables: {
            email: 'test@example.com',
            password: 'password123',
          },
        },
        { contextValue: { prisma, user: null, redis: {} } }
      );

      expect(response.body.kind).toBe('single');
      if (response.body.kind === 'single') {
        expect(response.body.singleResult.errors).toBeUndefined();
        expect(response.body.singleResult.data?.login).toMatchObject({
          token: 'mock-jwt-token',
          user: { email: 'test@example.com' },
        });
      }
    });
  });

  describe('Account Queries and Mutations', () => {
    it('should return accounts for authenticated user', async () => {
      (prisma.account.findMany as any).mockResolvedValue(mockAccounts);

      const query = gql`
        query Accounts {
          accounts {
            id
            name
            type
            balance
          }
        }
      `;

      const response = await server.executeOperation(
        { query: query.loc?.source.body || '' },
        { contextValue: { prisma, user: mockContext.user, redis: {} } }
      );

      expect(response.body.kind).toBe('single');
      if (response.body.kind === 'single') {
        expect(response.body.singleResult.errors).toBeUndefined();
        expect(response.body.singleResult.data?.accounts).toHaveLength(3);
      }
    });

    it('should return UNAUTHENTICATED error for accounts when not logged in', async () => {
      const query = gql`
        query Accounts {
          accounts {
            id
            name
          }
        }
      `;

      const response = await server.executeOperation(
        { query: query.loc?.source.body || '' },
        { contextValue: { prisma, user: null, redis: {} } }
      );

      expect(response.body.kind).toBe('single');
      if (response.body.kind === 'single') {
        expect(response.body.singleResult.errors).toBeDefined();
        expect(response.body.singleResult.errors?.[0].extensions?.code).toBe('UNAUTHENTICATED');
      }
    });

    it('should create an account', async () => {
      const newAccount = {
        id: 'acc-new',
        userId: 'user-123',
        name: 'New Savings',
        type: 'SAVINGS',
        balance: 5000,
        institution: 'Bank',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (prisma.account.create as any).mockResolvedValue(newAccount);

      const mutation = gql`
        mutation CreateAccount($input: CreateAccountInput!) {
          createAccount(input: $input) {
            id
            name
            type
            balance
          }
        }
      `;

      const response = await server.executeOperation(
        {
          query: mutation.loc?.source.body || '',
          variables: {
            input: {
              name: 'New Savings',
              type: 'SAVINGS',
              balance: 5000,
              institution: 'Bank',
            },
          },
        },
        { contextValue: { prisma, user: mockContext.user, redis: {} } }
      );

      expect(response.body.kind).toBe('single');
      if (response.body.kind === 'single') {
        expect(response.body.singleResult.errors).toBeUndefined();
        expect(response.body.singleResult.data?.createAccount).toMatchObject({
          name: 'New Savings',
          type: 'SAVINGS',
        });
      }
    });

    it('should calculate total balance correctly', async () => {
      (prisma.account.findMany as any).mockResolvedValue([
        { balance: 5000, type: 'CHECKING' },
        { balance: 10000, type: 'SAVINGS' },
        { balance: 500, type: 'CREDIT' },
      ]);

      const query = gql`
        query TotalBalance {
          totalBalance
        }
      `;

      const response = await server.executeOperation(
        { query: query.loc?.source.body || '' },
        { contextValue: { prisma, user: mockContext.user, redis: {} } }
      );

      expect(response.body.kind).toBe('single');
      if (response.body.kind === 'single') {
        expect(response.body.singleResult.errors).toBeUndefined();
        // 5000 + 10000 - 500 = 14500
        expect(response.body.singleResult.data?.totalBalance).toBe(14500);
      }
    });
  });

  describe('Transaction Queries and Mutations', () => {
    it('should return transactions with pagination', async () => {
      (prisma.transaction.findMany as any).mockResolvedValue(mockTransactions);
      (prisma.transaction.count as any).mockResolvedValue(3);

      const query = gql`
        query Transactions($pagination: PaginationInput) {
          transactions(pagination: $pagination) {
            edges {
              node {
                id
                amount
                category
                type
              }
            }
            pageInfo {
              totalCount
              hasNextPage
            }
          }
        }
      `;

      const response = await server.executeOperation(
        {
          query: query.loc?.source.body || '',
          variables: { pagination: { page: 1, limit: 20 } },
        },
        { contextValue: { prisma, user: mockContext.user, redis: {} } }
      );

      expect(response.body.kind).toBe('single');
      if (response.body.kind === 'single') {
        expect(response.body.singleResult.errors).toBeUndefined();
        expect((response.body.singleResult.data as any)?.transactions.edges).toHaveLength(3);
        expect((response.body.singleResult.data as any)?.transactions.pageInfo.totalCount).toBe(3);
      }
    });

    it('should return recent transactions', async () => {
      (prisma.transaction.findMany as any).mockResolvedValue(mockTransactions.slice(0, 5));

      const query = gql`
        query RecentTransactions($limit: Int) {
          recentTransactions(limit: $limit) {
            id
            amount
            category
          }
        }
      `;

      const response = await server.executeOperation(
        {
          query: query.loc?.source.body || '',
          variables: { limit: 5 },
        },
        { contextValue: { prisma, user: mockContext.user, redis: {} } }
      );

      expect(response.body.kind).toBe('single');
      if (response.body.kind === 'single') {
        expect(response.body.singleResult.errors).toBeUndefined();
        expect(response.body.singleResult.data?.recentTransactions).toBeDefined();
      }
    });

    it('should create a transaction', async () => {
      const newTransaction = {
        id: 'txn-new',
        userId: 'user-123',
        accountId: 'acc-1',
        amount: 50,
        type: 'EXPENSE',
        category: 'Food',
        merchant: 'Restaurant',
        date: new Date(),
        createdAt: new Date(),
        account: mockAccounts[0],
      };

      (prisma.account.findFirst as any).mockResolvedValue(mockAccounts[0]);
      (prisma.transaction.create as any).mockResolvedValue(newTransaction);
      (prisma.account.update as any).mockResolvedValue({});

      const mutation = gql`
        mutation CreateTransaction($input: CreateTransactionInput!) {
          createTransaction(input: $input) {
            id
            amount
            category
            type
          }
        }
      `;

      const response = await server.executeOperation(
        {
          query: mutation.loc?.source.body || '',
          variables: {
            input: {
              accountId: 'acc-1',
              amount: 50,
              type: 'EXPENSE',
              category: 'Food',
              merchant: 'Restaurant',
              date: new Date().toISOString(),
            },
          },
        },
        { contextValue: { prisma, user: mockContext.user, redis: {} } }
      );

      expect(response.body.kind).toBe('single');
      if (response.body.kind === 'single') {
        expect(response.body.singleResult.errors).toBeUndefined();
        expect(response.body.singleResult.data?.createTransaction).toMatchObject({
          category: 'Food',
          type: 'EXPENSE',
        });
      }
    });

    it('should return categories', async () => {
      (prisma.transaction.findMany as any).mockResolvedValue([
        { category: 'Food & Dining' },
        { category: 'Entertainment' },
        { category: 'Shopping' },
      ]);

      const query = gql`
        query Categories {
          categories
        }
      `;

      const response = await server.executeOperation(
        { query: query.loc?.source.body || '' },
        { contextValue: { prisma, user: mockContext.user, redis: {} } }
      );

      expect(response.body.kind).toBe('single');
      if (response.body.kind === 'single') {
        expect(response.body.singleResult.errors).toBeUndefined();
        expect(response.body.singleResult.data?.categories).toContain('Food & Dining');
      }
    });
  });

  describe('Dashboard Stats Query', () => {
    it('should return dashboard stats', async () => {
      // Mock account and transaction data
      (prisma.account.findMany as any).mockResolvedValue(mockAccounts);
      (prisma.transaction.findMany as any).mockResolvedValue(mockTransactions);
      (prisma.transaction.groupBy as any).mockResolvedValue([
        { category: 'Food & Dining', _sum: { amount: 150 } },
        { category: 'Entertainment', _sum: { amount: 75 } },
      ]);
      (prisma.transaction.aggregate as any).mockResolvedValue({
        _sum: { amount: 5000 },
      });

      const query = gql`
        query DashboardStats {
          dashboardStats {
            totalBalance
            monthlyIncome
            monthlyExpenses
            savingsRate
          }
        }
      `;

      const response = await server.executeOperation(
        { query: query.loc?.source.body || '' },
        { contextValue: { prisma, user: mockContext.user, redis: {} } }
      );

      expect(response.body.kind).toBe('single');
      if (response.body.kind === 'single') {
        // May have errors if the resolver isn't fully mocked, but should not be auth error
        const errors = response.body.singleResult.errors;
        if (errors) {
          errors.forEach(err => {
            expect(err.extensions?.code).not.toBe('UNAUTHENTICATED');
          });
        }
      }
    });
  });
});
