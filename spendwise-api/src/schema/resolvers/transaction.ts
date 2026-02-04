import { Prisma } from '@prisma/client';
import { Context } from '../../context';
import { requireAuth, NotFoundError } from '../../middleware/authMiddleware';
import { invalidateCache } from '../../lib/redis';
import { parseDecimal } from '../../lib/utils';
import { createOrUpdateMerchantRule, getMerchantRules, deleteMerchantRule } from '../../lib/merchant-rules';
import { ensureUserCategoriesSeeded } from '../../lib/constants';

interface TransactionFilterInput {
  search?: string;
  category?: string;
  type?: 'INCOME' | 'EXPENSE' | 'TRANSFER';
  accountId?: string;
  startDate?: Date;
  endDate?: Date;
  minAmount?: number;
  maxAmount?: number;
  needsReview?: boolean;
}

interface TransactionSortInput {
  field?: 'DATE' | 'AMOUNT' | 'CATEGORY' | 'CREATED_AT';
  order?: 'ASC' | 'DESC';
}

interface CreateTransactionInput {
  accountId: string;
  amount: number;
  type: 'INCOME' | 'EXPENSE' | 'TRANSFER';
  category: string;
  merchant?: string;
  description?: string;
  date: Date;
}

interface UpdateTransactionInput {
  accountId?: string;
  amount?: number;
  type?: 'INCOME' | 'EXPENSE' | 'TRANSFER';
  category?: string;
  merchant?: string;
  description?: string;
  date?: Date;
}

export const transactionResolvers = {
  Query: {
    transactions: async (
      _: unknown,
      args: {
        pagination?: { page: number; limit: number };
        filters?: TransactionFilterInput;
        sort?: TransactionSortInput;
      },
      context: Context
    ) => {
      const user = requireAuth(context);

      const page = args.pagination?.page ?? 1;
      const limit = args.pagination?.limit ?? 20;
      const skip = (page - 1) * limit;

      const where: Prisma.TransactionWhereInput = {
        userId: user.id,
      };

      // Apply filters
      if (args.filters?.search) {
        where.OR = [
          { merchant: { contains: args.filters.search, mode: 'insensitive' } },
          { description: { contains: args.filters.search, mode: 'insensitive' } },
          { category: { contains: args.filters.search, mode: 'insensitive' } },
        ];
      }
      if (args.filters?.category) where.category = args.filters.category;
      if (args.filters?.type) where.type = args.filters.type;
      if (args.filters?.accountId) where.accountId = args.filters.accountId;
      if (args.filters?.startDate || args.filters?.endDate) {
        where.date = {};
        if (args.filters.startDate) where.date.gte = args.filters.startDate;
        if (args.filters.endDate) where.date.lte = args.filters.endDate;
      }
      if (args.filters?.minAmount || args.filters?.maxAmount) {
        where.amount = {};
        if (args.filters.minAmount) where.amount.gte = args.filters.minAmount;
        if (args.filters.maxAmount) where.amount.lte = args.filters.maxAmount;
      }
      if (args.filters?.needsReview) {
        where.categoryConfidence = { lt: 70 };
        where.categorySource = { notIn: ['manual', 'rule'] };
      }

      // Build order by
      const orderBy: Prisma.TransactionOrderByWithRelationInput = {};
      const sortField = args.sort?.field?.toLowerCase() ?? 'date';
      const sortOrder = args.sort?.order?.toLowerCase() === 'asc' ? 'asc' : 'desc';

      if (sortField === 'date') orderBy.date = sortOrder;
      else if (sortField === 'amount') orderBy.amount = sortOrder;
      else if (sortField === 'category') orderBy.category = sortOrder;
      else if (sortField === 'created_at') orderBy.createdAt = sortOrder;
      else orderBy.date = 'desc';

      const [transactions, totalCount] = await Promise.all([
        context.prisma.transaction.findMany({
          where,
          orderBy,
          skip,
          take: limit,
          include: { account: true },
        }),
        context.prisma.transaction.count({ where }),
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

    transaction: async (_: unknown, { id }: { id: string }, context: Context) => {
      const user = requireAuth(context);

      const transaction = await context.prisma.transaction.findFirst({
        where: { id, userId: user.id },
        include: { account: true },
      });

      if (!transaction) {
        throw new NotFoundError('Transaction');
      }

      return transaction;
    },

    recentTransactions: async (
      _: unknown,
      { limit = 5 }: { limit?: number },
      context: Context
    ) => {
      const user = requireAuth(context);

      return context.prisma.transaction.findMany({
        where: { userId: user.id },
        orderBy: { date: 'desc' },
        take: limit,
        include: { account: true },
      });
    },

    categories: async (_: unknown, __: unknown, context: Context) => {
      const user = requireAuth(context);

      // Merge UserCategory names with transaction-derived categories
      await ensureUserCategoriesSeeded(context.prisma, user.id);
      const [userCategories, transactions] = await Promise.all([
        context.prisma.userCategory.findMany({
          where: { userId: user.id },
          select: { name: true },
          orderBy: { sortOrder: 'asc' },
        }),
        context.prisma.transaction.findMany({
          where: { userId: user.id },
          select: { category: true },
          distinct: ['category'],
        }),
      ]);

      const categorySet = new Set<string>();
      for (const uc of userCategories) categorySet.add(uc.name);
      for (const t of transactions) categorySet.add(t.category);
      return Array.from(categorySet);
    },

    userCategories: async (_: unknown, __: unknown, context: Context) => {
      const user = requireAuth(context);
      await ensureUserCategoriesSeeded(context.prisma, user.id);
      return context.prisma.userCategory.findMany({
        where: { userId: user.id },
        orderBy: { sortOrder: 'asc' },
      });
    },

    merchantRules: async (
      _: unknown,
      { limit = 50, offset = 0 }: { limit?: number; offset?: number },
      context: Context
    ) => {
      const user = requireAuth(context);
      return getMerchantRules(context.prisma, user.id, limit, offset);
    },

    transactionsNeedingReview: async (
      _: unknown,
      { limit = 20, offset = 0 }: { limit?: number; offset?: number },
      context: Context
    ) => {
      const user = requireAuth(context);

      const where = {
        userId: user.id,
        categoryConfidence: { lt: 70 },
        categorySource: { notIn: ['manual', 'rule'] },
      };

      const [transactions, totalCount] = await Promise.all([
        context.prisma.transaction.findMany({
          where,
          orderBy: { date: 'desc' },
          take: limit,
          skip: offset,
          include: { account: true },
        }),
        context.prisma.transaction.count({ where }),
      ]);

      return { transactions, totalCount };
    },
  },

  Mutation: {
    createTransaction: async (
      _: unknown,
      { input }: { input: CreateTransactionInput },
      context: Context
    ) => {
      const user = requireAuth(context);

      // Verify account ownership
      const account = await context.prisma.account.findFirst({
        where: { id: input.accountId, userId: user.id },
      });

      if (!account) {
        throw new NotFoundError('Account');
      }

      const transaction = await context.prisma.transaction.create({
        data: {
          ...input,
          userId: user.id,
        },
        include: { account: true },
      });

      // Update account balance
      const balanceChange =
        input.type === 'INCOME'
          ? input.amount
          : input.type === 'EXPENSE'
            ? -input.amount
            : 0;

      if (balanceChange !== 0) {
        await context.prisma.account.update({
          where: { id: input.accountId },
          data: { balance: { increment: balanceChange } },
        });
      }

      // Invalidate caches
      await invalidateCache(`user:${user.id}:*`);

      return transaction;
    },

    updateTransaction: async (
      _: unknown,
      { id, input }: { id: string; input: UpdateTransactionInput },
      context: Context
    ) => {
      const user = requireAuth(context);

      const existing = await context.prisma.transaction.findFirst({
        where: { id, userId: user.id },
      });

      if (!existing) {
        throw new NotFoundError('Transaction');
      }

      // If changing account, verify new account ownership
      if (input.accountId && input.accountId !== existing.accountId) {
        const newAccount = await context.prisma.account.findFirst({
          where: { id: input.accountId, userId: user.id },
        });

        if (!newAccount) {
          throw new NotFoundError('Account');
        }
      }

      // If category changed, create a merchant rule
      const updateData: any = { ...input };
      if (input.category && input.category !== existing.category) {
        updateData.categorySource = 'manual';
        updateData.categoryConfidence = 100;

        // Save merchant rule if transaction has a merchant
        const merchant = input.merchant || existing.merchant;
        if (merchant) {
          try {
            const ruleResult = await createOrUpdateMerchantRule(context.prisma, user.id, merchant, input.category);
            if (ruleResult && ruleResult.retroactiveCount > 0) {
              console.log(`Rule applied retroactively to ${ruleResult.retroactiveCount} transactions`);
            }
          } catch (error) {
            console.error('Failed to save merchant rule:', error);
          }
        }
      }

      const transaction = await context.prisma.transaction.update({
        where: { id },
        data: updateData,
        include: { account: true },
      });

      await invalidateCache(`user:${user.id}:*`);

      return transaction;
    },

    saveMerchantRule: async (
      _: unknown,
      { merchant, category }: { merchant: string; category: string },
      context: Context
    ) => {
      const user = requireAuth(context);
      const result = await createOrUpdateMerchantRule(context.prisma, user.id, merchant, category);
      if (!result) {
        throw new Error('Failed to save merchant rule: invalid merchant name');
      }
      return result.rule;
    },

    deleteMerchantRule: async (
      _: unknown,
      { id }: { id: string },
      context: Context
    ) => {
      const user = requireAuth(context);
      return deleteMerchantRule(context.prisma, user.id, id);
    },

    deleteTransaction: async (_: unknown, { id }: { id: string }, context: Context) => {
      const user = requireAuth(context);

      const transaction = await context.prisma.transaction.findFirst({
        where: { id, userId: user.id },
      });

      if (!transaction) {
        throw new NotFoundError('Transaction');
      }

      // Reverse the balance change
      const balanceChange =
        transaction.type === 'INCOME'
          ? -parseDecimal(transaction.amount)
          : transaction.type === 'EXPENSE'
            ? parseDecimal(transaction.amount)
            : 0;

      if (balanceChange !== 0) {
        await context.prisma.account.update({
          where: { id: transaction.accountId },
          data: { balance: { increment: balanceChange } },
        });
      }

      await context.prisma.transaction.delete({ where: { id } });
      await invalidateCache(`user:${user.id}:*`);

      return true;
    },

    createUserCategory: async (
      _: unknown,
      { input }: { input: { name: string; type?: string } },
      context: Context
    ) => {
      const user = requireAuth(context);
      await ensureUserCategoriesSeeded(context.prisma, user.id);

      // Get next sortOrder
      const maxOrder = await context.prisma.userCategory.aggregate({
        where: { userId: user.id },
        _max: { sortOrder: true },
      });
      const nextOrder = (maxOrder._max.sortOrder ?? -1) + 1;

      return context.prisma.userCategory.create({
        data: {
          userId: user.id,
          name: input.name.trim(),
          type: input.type || 'EXPENSE',
          isDefault: false,
          sortOrder: nextOrder,
        },
      });
    },

    updateUserCategory: async (
      _: unknown,
      { id, input }: { id: string; input: { name?: string; type?: string; sortOrder?: number } },
      context: Context
    ) => {
      const user = requireAuth(context);

      const existing = await context.prisma.userCategory.findFirst({
        where: { id, userId: user.id },
      });
      if (!existing) {
        throw new NotFoundError('UserCategory');
      }

      const data: any = {};
      if (input.name !== undefined) data.name = input.name.trim();
      if (input.type !== undefined) data.type = input.type;
      if (input.sortOrder !== undefined) data.sortOrder = input.sortOrder;

      const updated = await context.prisma.userCategory.update({
        where: { id },
        data,
      });

      // If name changed, cascade rename to transactions and merchant rules
      if (input.name && input.name.trim() !== existing.name) {
        const oldName = existing.name;
        const newName = input.name.trim();

        await context.prisma.transaction.updateMany({
          where: { userId: user.id, category: oldName },
          data: { category: newName },
        });

        await context.prisma.merchantRule.updateMany({
          where: { userId: user.id, category: oldName },
          data: { category: newName },
        });

        await invalidateCache(`user:${user.id}:*`);
      }

      return updated;
    },

    deleteUserCategory: async (
      _: unknown,
      { id }: { id: string },
      context: Context
    ) => {
      const user = requireAuth(context);

      const existing = await context.prisma.userCategory.findFirst({
        where: { id, userId: user.id },
      });
      if (!existing) {
        throw new NotFoundError('UserCategory');
      }

      // Check if transactions exist with this category
      const txnCount = await context.prisma.transaction.count({
        where: { userId: user.id, category: existing.name },
      });
      if (txnCount > 0) {
        throw new Error(
          `Cannot delete category "${existing.name}" — ${txnCount} transaction${txnCount > 1 ? 's' : ''} use this category. Rename it instead or recategorize those transactions first.`
        );
      }

      await context.prisma.userCategory.delete({ where: { id } });
      return true;
    },
  },

  Transaction: {
    amount: (parent: { amount: unknown }) => {
      return parseDecimal(parent.amount as number);
    },

    recurringInfo: async (
      parent: { id: string; userId: string },
      _args: unknown,
      context: Context
    ) => {
      if (!context.user) return null;

      // Lazy per-request cache: build the lookup map once, reuse for all transactions
      if (!context._recurringLookup) {
        const recurringRecords = await context.prisma.recurringTransaction.findMany({
          where: {
            userId: context.user.id,
            isActive: true,
            isDismissed: false,
            merchantName: { not: null },
          },
          select: {
            frequency: true,
            merchantName: true,
            transactionIds: true,
          },
        });

        const lookup = new Map<string, { frequency: string; merchantName: string }>();
        for (const record of recurringRecords) {
          if (!record.merchantName) continue;
          const txIds = Array.isArray(record.transactionIds)
            ? record.transactionIds as string[]
            : [];
          for (const txId of txIds) {
            lookup.set(txId, {
              frequency: record.frequency,
              merchantName: record.merchantName,
            });
          }
        }
        context._recurringLookup = lookup;
      }

      return context._recurringLookup.get(parent.id) || null;
    },
  },
};
