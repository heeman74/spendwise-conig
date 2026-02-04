import { hash, compare } from 'bcryptjs';
import { GraphQLError } from 'graphql';
import { Context } from '../../context';
import { requireAuth } from '../../middleware/authMiddleware';
import { signToken } from '../../context/auth';
import { checkAccountLockout, recordFailedAttempt, clearFailedAttempts } from '../../middleware/accountLockout';
import { z } from 'zod';

const passwordSchema = z.string().min(8, 'Password must be at least 8 characters')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number')
  .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character');

export const userResolvers = {
  Query: {
    me: async (_: unknown, __: unknown, context: Context) => {
      if (!context.user) return null;

      return context.prisma.user.findUnique({
        where: { id: context.user.id },
        include: {
          accounts: true,
          goals: true,
        },
      });
    },
  },

  Mutation: {
    login: async (
      _: unknown,
      { email, password }: { email: string; password: string },
      context: Context
    ) => {
      // Check account lockout before any other processing
      const isLocked = await checkAccountLockout(email);
      if (isLocked) {
        throw new GraphQLError('Account temporarily locked due to too many failed login attempts. Please try again in 15 minutes.', {
          extensions: { code: 'FORBIDDEN' },
        });
      }

      const user = await context.prisma.user.findUnique({
        where: { email },
      });

      if (!user || !user.password) {
        await recordFailedAttempt(email);
        throw new GraphQLError('Invalid credentials', {
          extensions: { code: 'UNAUTHENTICATED' },
        });
      }

      const isValid = await compare(password, user.password);

      if (!isValid) {
        await recordFailedAttempt(email);
        throw new GraphQLError('Invalid credentials', {
          extensions: { code: 'UNAUTHENTICATED' },
        });
      }

      // Successful login - clear any failed attempts
      await clearFailedAttempts(email);

      const token = signToken(user);

      return {
        token,
        user,
      };
    },

    register: async (
      _: unknown,
      { email, password, name }: { email: string; password: string; name?: string },
      context: Context
    ) => {
      const passwordResult = passwordSchema.safeParse(password);
      if (!passwordResult.success) {
        throw new GraphQLError(passwordResult.error.issues.map(i => i.message).join('. '), {
          extensions: { code: 'BAD_USER_INPUT' },
        });
      }

      const existingUser = await context.prisma.user.findUnique({
        where: { email },
      });

      if (existingUser) {
        throw new GraphQLError('User already exists with this email', {
          extensions: { code: 'BAD_USER_INPUT' },
        });
      }

      const hashedPassword = await hash(password, 12);

      const user = await context.prisma.user.create({
        data: {
          email,
          password: hashedPassword,
          name: name || null,
        },
      });

      const token = signToken(user);

      return {
        token,
        user,
        requiresSetup: true, // New users must set up 2FA
      };
    },

    updateProfile: async (
      _: unknown,
      { name, image }: { name?: string; image?: string },
      context: Context
    ) => {
      const user = requireAuth(context);

      return context.prisma.user.update({
        where: { id: user.id },
        data: {
          ...(name !== undefined && { name }),
          ...(image !== undefined && { image }),
        },
      });
    },
  },

  User: {
    accounts: async (parent: { id: string }, _: unknown, context: Context) => {
      return context.prisma.account.findMany({
        where: { userId: parent.id },
      });
    },

    transactions: async (
      parent: { id: string },
      args: { pagination?: { page: number; limit: number }; filters?: Record<string, unknown> },
      context: Context
    ) => {
      const page = args.pagination?.page ?? 1;
      const limit = args.pagination?.limit ?? 20;
      const skip = (page - 1) * limit;

      const [transactions, totalCount] = await Promise.all([
        context.prisma.transaction.findMany({
          where: { userId: parent.id },
          orderBy: { date: 'desc' },
          skip,
          take: limit,
          include: { account: true },
        }),
        context.prisma.transaction.count({ where: { userId: parent.id } }),
      ]);

      const totalPages = Math.ceil(totalCount / limit);

      return {
        edges: transactions.map((t, index) => ({
          node: t,
          cursor: Buffer.from(`${skip + index}`).toString('base64'),
        })),
        pageInfo: {
          hasNextPage: page < totalPages,
          hasPreviousPage: page > 1,
          totalCount,
          totalPages,
        },
      };
    },

    savingsGoals: async (parent: { id: string }, _: unknown, context: Context) => {
      return context.prisma.savingsGoal.findMany({
        where: { userId: parent.id },
      });
    },
  },
};
