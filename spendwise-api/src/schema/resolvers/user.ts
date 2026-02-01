import { hash, compare } from 'bcryptjs';
import { GraphQLError } from 'graphql';
import { Context } from '../../context';
import { requireAuth } from '../../middleware/authMiddleware';
import { signToken } from '../../context/auth';

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
      const user = await context.prisma.user.findUnique({
        where: { email },
      });

      if (!user || !user.password) {
        throw new GraphQLError('Invalid credentials', {
          extensions: { code: 'UNAUTHENTICATED' },
        });
      }

      const isValid = await compare(password, user.password);

      if (!isValid) {
        throw new GraphQLError('Invalid credentials', {
          extensions: { code: 'UNAUTHENTICATED' },
        });
      }

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
