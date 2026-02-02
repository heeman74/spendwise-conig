import { GraphQLError } from 'graphql';
import { Context } from '../../context';
import { detectRecurringPatterns, normalizeToMonthly, Frequency } from '../../lib/recurring-detector';
import { addDays } from 'date-fns';

interface RecurringFiltersInput {
  frequency?: string;
  category?: string;
  type?: 'INCOME' | 'EXPENSE';
}

interface RecurringSortInput {
  field: string;
  order: 'asc' | 'desc';
}

interface AddRecurringInput {
  merchantName: string;
  amount: number;
  frequency: Frequency;
  category: string;
  description?: string;
  firstDate: Date;
}

interface UpdateRecurringInput {
  merchantName?: string;
  amount?: number;
  frequency?: Frequency;
  category?: string;
  description?: string;
}

export const recurringResolvers = {
  Query: {
    recurring: async (
      _: unknown,
      {
        filters,
        sort,
        dismissed = false,
      }: {
        filters?: RecurringFiltersInput;
        sort?: RecurringSortInput;
        dismissed?: boolean;
      },
      ctx: Context
    ) => {
      if (!ctx.user) {
        throw new GraphQLError('Authentication required', {
          extensions: { code: 'UNAUTHENTICATED' },
        });
      }

      // Build where clause
      const where: any = {
        userId: ctx.user.id,
        isDismissed: dismissed === true ? true : false,
      };

      // Apply filters
      if (filters) {
        if (filters.frequency) {
          where.frequency = filters.frequency;
        }

        if (filters.category) {
          where.category = filters.category;
        }

        if (filters.type) {
          if (filters.type === 'INCOME') {
            where.category = 'Income';
          } else if (filters.type === 'EXPENSE') {
            where.category = { not: 'Income' };
          }
        }
      }

      // Build orderBy clause
      let orderBy: any = { lastDate: 'desc' };
      if (sort) {
        orderBy = { [sort.field]: sort.order };
      }

      const results = await ctx.prisma.recurringTransaction.findMany({
        where,
        orderBy,
      });

      return results;
    },

    recurringSummary: async (_: unknown, __: unknown, ctx: Context) => {
      if (!ctx.user) {
        throw new GraphQLError('Authentication required', {
          extensions: { code: 'UNAUTHENTICATED' },
        });
      }

      // Fetch all active, non-dismissed recurring items
      const items = await ctx.prisma.recurringTransaction.findMany({
        where: {
          userId: ctx.user.id,
          isActive: true,
          isDismissed: false,
        },
      });

      // Separate into income and expenses
      const expenses = items.filter((item) => item.category !== 'Income');
      const income = items.filter((item) => item.category === 'Income');

      // Calculate monthly-normalized totals
      const totalRecurringExpenses = expenses.reduce((sum, item) => {
        const avgAmount = parseFloat(item.averageAmount.toString());
        return sum + normalizeToMonthly(avgAmount, item.frequency as Frequency);
      }, 0);

      const totalRecurringIncome = income.reduce((sum, item) => {
        const avgAmount = parseFloat(item.averageAmount.toString());
        return sum + normalizeToMonthly(avgAmount, item.frequency as Frequency);
      }, 0);

      const netRecurring = totalRecurringIncome - totalRecurringExpenses;

      const incomeRatio =
        totalRecurringIncome > 0
          ? (totalRecurringExpenses / totalRecurringIncome) * 100
          : null;

      return {
        totalRecurringExpenses,
        totalRecurringIncome,
        netRecurring,
        activeCount: items.length,
        incomeRatio,
      };
    },
  },

  Mutation: {
    updateRecurring: async (
      _: unknown,
      { id, input }: { id: string; input: UpdateRecurringInput },
      ctx: Context
    ) => {
      if (!ctx.user) {
        throw new GraphQLError('Authentication required', {
          extensions: { code: 'UNAUTHENTICATED' },
        });
      }

      // Find the recurring item
      const existing = await ctx.prisma.recurringTransaction.findFirst({
        where: { id, userId: ctx.user.id },
      });

      if (!existing) {
        throw new GraphQLError('Recurring transaction not found', {
          extensions: { code: 'NOT_FOUND' },
        });
      }

      // Build update data
      const updateData: any = {};

      if (input.merchantName !== undefined) {
        updateData.merchantName = input.merchantName;
      }

      if (input.amount !== undefined) {
        updateData.lastAmount = input.amount;
        updateData.averageAmount = input.amount;
      }

      if (input.frequency !== undefined) {
        updateData.frequency = input.frequency;
      }

      if (input.category !== undefined) {
        updateData.category = input.category;
      }

      if (input.description !== undefined) {
        updateData.description = input.description;
      }

      // Update the item
      const updated = await ctx.prisma.recurringTransaction.update({
        where: { id },
        data: updateData,
      });

      return updated;
    },

    dismissRecurring: async (_: unknown, { id }: { id: string }, ctx: Context) => {
      if (!ctx.user) {
        throw new GraphQLError('Authentication required', {
          extensions: { code: 'UNAUTHENTICATED' },
        });
      }

      const existing = await ctx.prisma.recurringTransaction.findFirst({
        where: { id, userId: ctx.user.id },
      });

      if (!existing) {
        throw new GraphQLError('Recurring transaction not found', {
          extensions: { code: 'NOT_FOUND' },
        });
      }

      const updated = await ctx.prisma.recurringTransaction.update({
        where: { id },
        data: { isDismissed: true },
      });

      return updated;
    },

    restoreRecurring: async (_: unknown, { id }: { id: string }, ctx: Context) => {
      if (!ctx.user) {
        throw new GraphQLError('Authentication required', {
          extensions: { code: 'UNAUTHENTICATED' },
        });
      }

      const existing = await ctx.prisma.recurringTransaction.findFirst({
        where: { id, userId: ctx.user.id },
      });

      if (!existing) {
        throw new GraphQLError('Recurring transaction not found', {
          extensions: { code: 'NOT_FOUND' },
        });
      }

      const updated = await ctx.prisma.recurringTransaction.update({
        where: { id },
        data: { isDismissed: false },
      });

      return updated;
    },

    addRecurring: async (
      _: unknown,
      { input }: { input: AddRecurringInput },
      ctx: Context
    ) => {
      if (!ctx.user) {
        throw new GraphQLError('Authentication required', {
          extensions: { code: 'UNAUTHENTICATED' },
        });
      }

      // Calculate next expected date based on frequency
      const frequencyDays: Record<Frequency, number> = {
        WEEKLY: 7,
        BIWEEKLY: 14,
        MONTHLY: 30,
        QUARTERLY: 90,
        ANNUALLY: 365,
      };

      const nextExpectedDate = addDays(
        input.firstDate,
        frequencyDays[input.frequency]
      );

      // Generate a unique plaidStreamId (using crypto.randomUUID)
      const plaidStreamId = require('crypto').randomUUID();

      // Create the recurring transaction
      const created = await ctx.prisma.recurringTransaction.create({
        data: {
          userId: ctx.user.id,
          plaidStreamId,
          description: input.description || `Manual entry: ${input.merchantName}`,
          merchantName: input.merchantName,
          category: input.category,
          frequency: input.frequency,
          isActive: true,
          isDismissed: false,
          status: 'ACTIVE',
          lastAmount: input.amount,
          averageAmount: input.amount,
          lastDate: input.firstDate,
          firstDate: input.firstDate,
          nextExpectedDate,
          transactionIds: [],
        },
      });

      return created;
    },

    detectRecurring: async (_: unknown, __: unknown, ctx: Context) => {
      if (!ctx.user) {
        throw new GraphQLError('Authentication required', {
          extensions: { code: 'UNAUTHENTICATED' },
        });
      }

      // Fetch all user transactions
      const transactions = await ctx.prisma.transaction.findMany({
        where: { userId: ctx.user.id },
        orderBy: { date: 'asc' },
        select: {
          id: true,
          date: true,
          amount: true,
          merchant: true,
          category: true,
          type: true,
        },
      });

      // Convert to detector format
      const detectorInput = transactions.map((t) => ({
        id: t.id,
        date: t.date,
        amount: parseFloat(t.amount.toString()),
        merchant: t.merchant,
        category: t.category,
        type: t.type as 'INCOME' | 'EXPENSE' | 'TRANSFER',
      }));

      // Detect patterns
      const patterns = detectRecurringPatterns(detectorInput);

      // Upsert each pattern
      for (const pattern of patterns) {
        await ctx.prisma.recurringTransaction.upsert({
          where: {
            userId_merchantName_frequency: {
              userId: ctx.user.id,
              merchantName: pattern.merchantName,
              frequency: pattern.frequency,
            },
          },
          create: {
            userId: ctx.user.id,
            plaidStreamId: require('crypto').randomUUID(),
            description: pattern.description,
            merchantName: pattern.merchantName,
            category: pattern.category,
            frequency: pattern.frequency,
            isActive: true,
            isDismissed: false,
            status: pattern.status,
            lastAmount: pattern.lastAmount,
            averageAmount: pattern.averageAmount,
            lastDate: pattern.lastDate,
            firstDate: pattern.firstDate,
            nextExpectedDate: pattern.nextExpectedDate,
            transactionIds: pattern.transactionIds,
          },
          update: {
            lastAmount: pattern.lastAmount,
            averageAmount: pattern.averageAmount,
            lastDate: pattern.lastDate,
            transactionIds: pattern.transactionIds,
            nextExpectedDate: pattern.nextExpectedDate,
            status: pattern.status,
            description: pattern.description,
          },
        });
      }

      return patterns.length;
    },
  },
};
