import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import { GraphQLError } from 'graphql';
import { accountResolvers } from '../../schema/resolvers/account';
import { mockAccounts, mockContext, mockUnauthenticatedContext } from '../mocks/data';
import { prisma } from '../../lib/prisma';

// Cast prisma methods to any to avoid type issues with mocks
const prismaMock = prisma as any;

describe('Account Resolvers', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Query.accounts', () => {
    it('should return all accounts for authenticated user', async () => {
      prismaMock.account.findMany.mockResolvedValue(mockAccounts);

      const context = {
        ...mockContext,
        prisma,
      };

      const result = await accountResolvers.Query.accounts(null, {}, context as any);

      expect(result).toEqual(mockAccounts);
      expect(prismaMock.account.findMany).toHaveBeenCalledWith({
        where: { userId: 'user-123' },
        orderBy: { createdAt: 'desc' },
      });
    });

    it('should throw UNAUTHENTICATED error when not logged in', async () => {
      const context = {
        ...mockUnauthenticatedContext,
        prisma,
      };

      await expect(
        accountResolvers.Query.accounts(null, {}, context as any)
      ).rejects.toThrow(GraphQLError);

      await expect(
        accountResolvers.Query.accounts(null, {}, context as any)
      ).rejects.toMatchObject({
        extensions: { code: 'UNAUTHENTICATED' },
      });
    });
  });

  describe('Query.account', () => {
    it('should return a specific account by id', async () => {
      const mockAccount = mockAccounts[0];
      prismaMock.account.findFirst.mockResolvedValue(mockAccount);

      const context = {
        ...mockContext,
        prisma,
      };

      const result = await accountResolvers.Query.account(
        null,
        { id: 'acc-1' },
        context as any
      );

      expect(result).toEqual(mockAccount);
      expect(prismaMock.account.findFirst).toHaveBeenCalledWith({
        where: { id: 'acc-1', userId: 'user-123' },
      });
    });

    it('should throw NOT_FOUND error when account does not exist', async () => {
      prismaMock.account.findFirst.mockResolvedValue(null);

      const context = {
        ...mockContext,
        prisma,
      };

      await expect(
        accountResolvers.Query.account(null, { id: 'nonexistent' }, context as any)
      ).rejects.toThrow('Account not found');
    });
  });

  describe('Query.totalBalance', () => {
    it('should calculate total balance correctly', async () => {
      prismaMock.account.findMany.mockResolvedValue([
        { balance: 5000, type: 'CHECKING' },
        { balance: 15000, type: 'SAVINGS' },
        { balance: 1250.75, type: 'CREDIT' }, // Credit should be subtracted
      ]);

      const context = {
        ...mockContext,
        prisma,
      };

      const result = await accountResolvers.Query.totalBalance(null, {}, context as any);

      // 5000 + 15000 - 1250.75 = 18749.25
      expect(result).toBe(18749.25);
    });

    it('should return 0 when no accounts exist', async () => {
      prismaMock.account.findMany.mockResolvedValue([]);

      const context = {
        ...mockContext,
        prisma,
      };

      const result = await accountResolvers.Query.totalBalance(null, {}, context as any);

      expect(result).toBe(0);
    });
  });

  describe('Mutation.createAccount', () => {
    it('should create a new account', async () => {
      const newAccount = {
        id: 'acc-new',
        userId: 'user-123',
        name: 'New Account',
        type: 'CHECKING',
        balance: 1000,
        institution: 'Test Bank',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      prismaMock.account.create.mockResolvedValue(newAccount);

      const context = {
        ...mockContext,
        prisma,
      };

      const input = {
        name: 'New Account',
        type: 'CHECKING' as const,
        balance: 1000,
        institution: 'Test Bank',
      };

      const result = await accountResolvers.Mutation.createAccount(
        null,
        { input },
        context as any
      );

      expect(result).toEqual(newAccount);
      expect(prismaMock.account.create).toHaveBeenCalledWith({
        data: {
          ...input,
          userId: 'user-123',
        },
      });
    });

    it('should throw UNAUTHENTICATED error when not logged in', async () => {
      const context = {
        ...mockUnauthenticatedContext,
        prisma,
      };

      const input = {
        name: 'New Account',
        type: 'CHECKING' as const,
        balance: 1000,
        institution: 'Test Bank',
      };

      await expect(
        accountResolvers.Mutation.createAccount(null, { input }, context as any)
      ).rejects.toMatchObject({
        extensions: { code: 'UNAUTHENTICATED' },
      });
    });
  });

  describe('Mutation.updateAccount', () => {
    it('should update an existing account', async () => {
      const existingAccount = mockAccounts[0];
      const updatedAccount = { ...existingAccount, name: 'Updated Name' };

      prismaMock.account.findFirst.mockResolvedValue(existingAccount);
      prismaMock.account.update.mockResolvedValue(updatedAccount);

      const context = {
        ...mockContext,
        prisma,
      };

      const result = await accountResolvers.Mutation.updateAccount(
        null,
        { id: 'acc-1', input: { name: 'Updated Name' } },
        context as any
      );

      expect(result.name).toBe('Updated Name');
      expect(prismaMock.account.update).toHaveBeenCalledWith({
        where: { id: 'acc-1' },
        data: { name: 'Updated Name' },
      });
    });

    it('should throw NOT_FOUND when account does not exist', async () => {
      prismaMock.account.findFirst.mockResolvedValue(null);

      const context = {
        ...mockContext,
        prisma,
      };

      await expect(
        accountResolvers.Mutation.updateAccount(
          null,
          { id: 'nonexistent', input: { name: 'Test' } },
          context as any
        )
      ).rejects.toThrow('Account not found');
    });
  });

  describe('Mutation.deleteAccount', () => {
    it('should delete an existing account', async () => {
      prismaMock.account.findFirst.mockResolvedValue(mockAccounts[0]);
      prismaMock.account.delete.mockResolvedValue(mockAccounts[0]);

      const context = {
        ...mockContext,
        prisma,
      };

      const result = await accountResolvers.Mutation.deleteAccount(
        null,
        { id: 'acc-1' },
        context as any
      );

      expect(result).toBe(true);
      expect(prismaMock.account.delete).toHaveBeenCalledWith({ where: { id: 'acc-1' } });
    });

    it('should throw NOT_FOUND when account does not exist', async () => {
      prismaMock.account.findFirst.mockResolvedValue(null);

      const context = {
        ...mockContext,
        prisma,
      };

      await expect(
        accountResolvers.Mutation.deleteAccount(null, { id: 'nonexistent' }, context as any)
      ).rejects.toThrow('Account not found');
    });
  });

  describe('Account.balance', () => {
    it('should parse decimal balance correctly', () => {
      const result = accountResolvers.Account.balance({ balance: 5000.5 });
      expect(result).toBe(5000.5);
    });

    it('should handle Prisma Decimal type', () => {
      // Prisma returns Decimal objects that need to be parsed
      const decimalLike = { toNumber: () => 1234.56 };
      const result = accountResolvers.Account.balance({ balance: decimalLike });
      expect(typeof result).toBe('number');
    });
  });
});
