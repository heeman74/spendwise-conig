import { Context } from '../../context';
import { requireAuth, NotFoundError } from '../../middleware/authMiddleware';
import { invalidateCache } from '../../lib/redis';
import { parseDecimal } from '../../lib/utils';

interface CreateSavingsGoalInput {
  name: string;
  targetAmount: number;
  currentAmount?: number;
  deadline?: Date;
}

interface UpdateSavingsGoalInput {
  name?: string;
  targetAmount?: number;
  currentAmount?: number;
  deadline?: Date;
}

export const savingsGoalResolvers = {
  Query: {
    savingsGoals: async (_: unknown, __: unknown, context: Context) => {
      const user = requireAuth(context);

      return context.prisma.savingsGoal.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: 'desc' },
      });
    },

    savingsGoal: async (_: unknown, { id }: { id: string }, context: Context) => {
      const user = requireAuth(context);

      const goal = await context.prisma.savingsGoal.findFirst({
        where: { id, userId: user.id },
      });

      if (!goal) {
        throw new NotFoundError('Savings Goal');
      }

      return goal;
    },

    totalSavingsProgress: async (_: unknown, __: unknown, context: Context) => {
      const user = requireAuth(context);

      const goals = await context.prisma.savingsGoal.findMany({
        where: { userId: user.id },
      });

      const totalTarget = goals.reduce(
        (sum, g) => sum + parseDecimal(g.targetAmount),
        0
      );
      const totalCurrent = goals.reduce(
        (sum, g) => sum + parseDecimal(g.currentAmount),
        0
      );
      const completedCount = goals.filter(
        (g) => parseDecimal(g.currentAmount) >= parseDecimal(g.targetAmount)
      ).length;

      return {
        totalTarget,
        totalCurrent,
        overallProgress: totalTarget > 0 ? (totalCurrent / totalTarget) * 100 : 0,
        goalsCount: goals.length,
        completedCount,
      };
    },
  },

  Mutation: {
    createSavingsGoal: async (
      _: unknown,
      { input }: { input: CreateSavingsGoalInput },
      context: Context
    ) => {
      const user = requireAuth(context);

      const goal = await context.prisma.savingsGoal.create({
        data: {
          ...input,
          currentAmount: input.currentAmount ?? 0,
          userId: user.id,
        },
      });

      await invalidateCache(`user:${user.id}:*`);

      return goal;
    },

    updateSavingsGoal: async (
      _: unknown,
      { id, input }: { id: string; input: UpdateSavingsGoalInput },
      context: Context
    ) => {
      const user = requireAuth(context);

      const existing = await context.prisma.savingsGoal.findFirst({
        where: { id, userId: user.id },
      });

      if (!existing) {
        throw new NotFoundError('Savings Goal');
      }

      const goal = await context.prisma.savingsGoal.update({
        where: { id },
        data: input,
      });

      await invalidateCache(`user:${user.id}:*`);

      return goal;
    },

    deleteSavingsGoal: async (_: unknown, { id }: { id: string }, context: Context) => {
      const user = requireAuth(context);

      const existing = await context.prisma.savingsGoal.findFirst({
        where: { id, userId: user.id },
      });

      if (!existing) {
        throw new NotFoundError('Savings Goal');
      }

      await context.prisma.savingsGoal.delete({ where: { id } });
      await invalidateCache(`user:${user.id}:*`);

      return true;
    },

    contributeSavings: async (
      _: unknown,
      { id, amount }: { id: string; amount: number },
      context: Context
    ) => {
      const user = requireAuth(context);

      const existing = await context.prisma.savingsGoal.findFirst({
        where: { id, userId: user.id },
      });

      if (!existing) {
        throw new NotFoundError('Savings Goal');
      }

      const goal = await context.prisma.savingsGoal.update({
        where: { id },
        data: {
          currentAmount: { increment: amount },
        },
      });

      await invalidateCache(`user:${user.id}:*`);

      return goal;
    },
  },

  SavingsGoal: {
    targetAmount: (parent: { targetAmount: unknown }) => {
      return parseDecimal(parent.targetAmount as number);
    },

    currentAmount: (parent: { currentAmount: unknown }) => {
      return parseDecimal(parent.currentAmount as number);
    },

    progress: (parent: { currentAmount: unknown; targetAmount: unknown }) => {
      const current = parseDecimal(parent.currentAmount as number);
      const target = parseDecimal(parent.targetAmount as number);
      return target > 0 ? (current / target) * 100 : 0;
    },

    isCompleted: (parent: { currentAmount: unknown; targetAmount: unknown }) => {
      const current = parseDecimal(parent.currentAmount as number);
      const target = parseDecimal(parent.targetAmount as number);
      return current >= target;
    },

    daysRemaining: (parent: { deadline: Date | null }) => {
      if (!parent.deadline) return null;
      const now = new Date();
      const deadline = new Date(parent.deadline);
      const diffTime = deadline.getTime() - now.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return diffDays > 0 ? diffDays : 0;
    },
  },
};
