import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import { GraphQLError } from 'graphql';
import { userResolvers } from '../../schema/resolvers/user';
import { mockUser, mockAccounts, mockContext, mockUnauthenticatedContext } from '../mocks/data';
import { prisma } from '../../lib/prisma';

// Mock bcryptjs
jest.mock('bcryptjs', () => ({
  hash: jest.fn<any>().mockResolvedValue('$2a$12$hashedpassword'),
  compare: jest.fn(),
}));

// Mock the auth module
jest.mock('../../context/auth', () => ({
  signToken: jest.fn().mockReturnValue('mock-jwt-token'),
}));

import { compare } from 'bcryptjs';

describe('User Resolvers', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Query.me', () => {
    it('should return current user when authenticated', async () => {
      const userWithRelations = {
        ...mockUser,
        accounts: mockAccounts,
        goals: [],
      };
      (prisma.user.findUnique as any).mockResolvedValue(userWithRelations);

      const context = {
        ...mockContext,
        prisma,
      };

      const result = await userResolvers.Query.me(null, {}, context as any);

      expect(result).toEqual(userWithRelations);
      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: 'user-123' },
        include: { accounts: true, goals: true },
      });
    });

    it('should return null when not authenticated', async () => {
      const context = {
        ...mockUnauthenticatedContext,
        prisma,
      };

      const result = await userResolvers.Query.me(null, {}, context as any);

      expect(result).toBeNull();
      expect(prisma.user.findUnique).not.toHaveBeenCalled();
    });
  });

  describe('Mutation.login', () => {
    it('should return token and user on successful login', async () => {
      (prisma.user.findUnique as any).mockResolvedValue(mockUser);
      (compare as any).mockResolvedValue(true);

      const context = {
        prisma,
        user: null,
      };

      const result = await userResolvers.Mutation.login(
        null,
        { email: 'test@example.com', password: 'password123' },
        context as any
      );

      expect(result).toHaveProperty('token', 'mock-jwt-token');
      expect(result).toHaveProperty('user');
      expect(result.user.email).toBe('test@example.com');
    });

    it('should throw UNAUTHENTICATED error when user not found', async () => {
      (prisma.user.findUnique as any).mockResolvedValue(null);

      const context = {
        prisma,
        user: null,
      };

      await expect(
        userResolvers.Mutation.login(
          null,
          { email: 'nonexistent@example.com', password: 'password' },
          context as any
        )
      ).rejects.toMatchObject({
        message: 'Invalid credentials',
        extensions: { code: 'UNAUTHENTICATED' },
      });
    });

    it('should throw UNAUTHENTICATED error when password is invalid', async () => {
      (prisma.user.findUnique as any).mockResolvedValue(mockUser);
      (compare as any).mockResolvedValue(false);

      const context = {
        prisma,
        user: null,
      };

      await expect(
        userResolvers.Mutation.login(
          null,
          { email: 'test@example.com', password: 'wrongpassword' },
          context as any
        )
      ).rejects.toMatchObject({
        message: 'Invalid credentials',
        extensions: { code: 'UNAUTHENTICATED' },
      });
    });

    it('should throw UNAUTHENTICATED error when user has no password', async () => {
      const userWithoutPassword = { ...mockUser, password: null };
      (prisma.user.findUnique as any).mockResolvedValue(userWithoutPassword);

      const context = {
        prisma,
        user: null,
      };

      await expect(
        userResolvers.Mutation.login(
          null,
          { email: 'test@example.com', password: 'password' },
          context as any
        )
      ).rejects.toMatchObject({
        message: 'Invalid credentials',
        extensions: { code: 'UNAUTHENTICATED' },
      });
    });
  });

  describe('Mutation.register', () => {
    it('should create a new user and return token', async () => {
      const newUser = {
        id: 'new-user-123',
        email: 'newuser@example.com',
        name: 'New User',
        password: '$2a$12$hashedpassword',
        image: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (prisma.user.findUnique as any).mockResolvedValue(null);
      (prisma.user.create as any).mockResolvedValue(newUser);

      const context = {
        prisma,
        user: null,
      };

      const result = await userResolvers.Mutation.register(
        null,
        { email: 'newuser@example.com', password: 'password123', name: 'New User' },
        context as any
      );

      expect(result).toHaveProperty('token', 'mock-jwt-token');
      expect(result).toHaveProperty('user');
      expect(result.user.email).toBe('newuser@example.com');
      expect(prisma.user.create).toHaveBeenCalled();
    });

    it('should register without name', async () => {
      const newUser = {
        id: 'new-user-123',
        email: 'newuser@example.com',
        name: null,
        password: '$2a$12$hashedpassword',
        image: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (prisma.user.findUnique as any).mockResolvedValue(null);
      (prisma.user.create as any).mockResolvedValue(newUser);

      const context = {
        prisma,
        user: null,
      };

      const result = await userResolvers.Mutation.register(
        null,
        { email: 'newuser@example.com', password: 'password123' },
        context as any
      );

      expect(result.user.name).toBeNull();
      expect(prisma.user.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ name: null }),
        })
      );
    });

    it('should throw BAD_USER_INPUT when email already exists', async () => {
      (prisma.user.findUnique as any).mockResolvedValue(mockUser);

      const context = {
        prisma,
        user: null,
      };

      await expect(
        userResolvers.Mutation.register(
          null,
          { email: 'test@example.com', password: 'password123' },
          context as any
        )
      ).rejects.toMatchObject({
        message: 'User already exists with this email',
        extensions: { code: 'BAD_USER_INPUT' },
      });
    });
  });

  describe('Mutation.updateProfile', () => {
    it('should update user profile', async () => {
      const updatedUser = { ...mockUser, name: 'Updated Name' };
      (prisma.user.update as any).mockResolvedValue(updatedUser);

      const context = {
        ...mockContext,
        prisma,
      };

      const result = await userResolvers.Mutation.updateProfile(
        null,
        { name: 'Updated Name' },
        context as any
      );

      expect(result.name).toBe('Updated Name');
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-123' },
        data: { name: 'Updated Name' },
      });
    });

    it('should update user image', async () => {
      const updatedUser = { ...mockUser, image: 'https://example.com/avatar.jpg' };
      (prisma.user.update as any).mockResolvedValue(updatedUser);

      const context = {
        ...mockContext,
        prisma,
      };

      const result = await userResolvers.Mutation.updateProfile(
        null,
        { image: 'https://example.com/avatar.jpg' },
        context as any
      );

      expect(result.image).toBe('https://example.com/avatar.jpg');
    });

    it('should throw UNAUTHENTICATED when not logged in', async () => {
      const context = {
        ...mockUnauthenticatedContext,
        prisma,
      };

      await expect(
        userResolvers.Mutation.updateProfile(null, { name: 'Test' }, context as any)
      ).rejects.toMatchObject({
        extensions: { code: 'UNAUTHENTICATED' },
      });
    });
  });

  describe('User field resolvers', () => {
    describe('User.accounts', () => {
      it('should return user accounts', async () => {
        (prisma.account.findMany as any).mockResolvedValue(mockAccounts);

        const context = {
          ...mockContext,
          prisma,
        };

        const result = await userResolvers.User.accounts(
          { id: 'user-123' },
          {},
          context as any
        );

        expect(result).toEqual(mockAccounts);
        expect(prisma.account.findMany).toHaveBeenCalledWith({
          where: { userId: 'user-123' },
        });
      });
    });

    describe('User.transactions', () => {
      it('should return paginated user transactions', async () => {
        const mockTxns = [{ id: 'txn-1' }, { id: 'txn-2' }];
        (prisma.transaction.findMany as any).mockResolvedValue(mockTxns);
        (prisma.transaction.count as any).mockResolvedValue(2);

        const context = {
          ...mockContext,
          prisma,
        };

        const result = await userResolvers.User.transactions(
          { id: 'user-123' },
          { pagination: { page: 1, limit: 20 } },
          context as any
        );

        expect(result.edges).toHaveLength(2);
        expect(result.pageInfo.totalCount).toBe(2);
      });
    });

    describe('User.savingsGoals', () => {
      it('should return user savings goals', async () => {
        const mockGoals = [{ id: 'goal-1', name: 'Emergency Fund' }];
        (prisma.savingsGoal.findMany as any).mockResolvedValue(mockGoals);

        const context = {
          ...mockContext,
          prisma,
        };

        const result = await userResolvers.User.savingsGoals(
          { id: 'user-123' },
          {},
          context as any
        );

        expect(result).toEqual(mockGoals);
        expect(prisma.savingsGoal.findMany).toHaveBeenCalledWith({
          where: { userId: 'user-123' },
        });
      });
    });
  });
});
