import { Context } from '../../context';
import { requireAuth, NotFoundError } from '../../middleware/authMiddleware';
import { invalidateCache } from '../../lib/redis';
import { parseDecimal } from '../../lib/utils';

interface CreateAccountInput {
  name: string;
  type: 'CHECKING' | 'SAVINGS' | 'CREDIT' | 'INVESTMENT';
  balance: number;
  institution: string;
}

interface UpdateAccountInput {
  name?: string;
  type?: 'CHECKING' | 'SAVINGS' | 'CREDIT' | 'INVESTMENT';
  institution?: string;
}

export const accountResolvers = {
  Query: {
    accounts: async (_: unknown, __: unknown, context: Context) => {
      const user = requireAuth(context);

      return context.prisma.account.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: 'desc' },
      });
    },

    account: async (_: unknown, { id }: { id: string }, context: Context) => {
      const user = requireAuth(context);

      const account = await context.prisma.account.findFirst({
        where: { id, userId: user.id },
      });

      if (!account) {
        throw new NotFoundError('Account');
      }

      return account;
    },

    totalBalance: async (_: unknown, __: unknown, context: Context) => {
      const user = requireAuth(context);

      const accounts = await context.prisma.account.findMany({
        where: { userId: user.id },
        select: { balance: true, type: true },
      });

      return accounts.reduce((sum, account) => {
        const balance = parseDecimal(account.balance);
        // Credit accounts have negative balance impact
        return sum + (account.type === 'CREDIT' ? -balance : balance);
      }, 0);
    },
  },

  Mutation: {
    createAccount: async (
      _: unknown,
      { input }: { input: CreateAccountInput },
      context: Context
    ) => {
      const user = requireAuth(context);

      // Check for existing account with same name, type, and institution
      const existing = await context.prisma.account.findFirst({
        where: {
          userId: user.id,
          name: input.name,
          type: input.type,
          institution: input.institution,
        },
      });

      if (existing) {
        throw new Error(
          `An account named "${input.name}" at "${input.institution}" already exists.`
        );
      }

      const account = await context.prisma.account.create({
        data: {
          ...input,
          userId: user.id,
        },
      });

      await invalidateCache(`user:${user.id}:*`);

      return account;
    },

    updateAccount: async (
      _: unknown,
      { id, input }: { id: string; input: UpdateAccountInput },
      context: Context
    ) => {
      const user = requireAuth(context);

      const existing = await context.prisma.account.findFirst({
        where: { id, userId: user.id },
      });

      if (!existing) {
        throw new NotFoundError('Account');
      }

      const account = await context.prisma.account.update({
        where: { id },
        data: input,
      });

      await invalidateCache(`user:${user.id}:*`);

      return account;
    },

    deleteAccount: async (_: unknown, { id }: { id: string }, context: Context) => {
      const user = requireAuth(context);

      const existing = await context.prisma.account.findFirst({
        where: { id, userId: user.id },
      });

      if (!existing) {
        throw new NotFoundError('Account');
      }

      await context.prisma.account.delete({ where: { id } });
      await invalidateCache(`user:${user.id}:*`);

      return true;
    },
  },

  Account: {
    balance: (parent: { balance: unknown }) => {
      return parseDecimal(parent.balance as number);
    },

    transactions: async (
      parent: { id: string },
      args: { pagination?: { page: number; limit: number } },
      context: Context
    ) => {
      const page = args.pagination?.page ?? 1;
      const limit = args.pagination?.limit ?? 20;
      const skip = (page - 1) * limit;

      const [transactions, totalCount] = await Promise.all([
        context.prisma.transaction.findMany({
          where: { accountId: parent.id },
          orderBy: { date: 'desc' },
          skip,
          take: limit,
          include: { account: true },
        }),
        context.prisma.transaction.count({ where: { accountId: parent.id } }),
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
  },
};
