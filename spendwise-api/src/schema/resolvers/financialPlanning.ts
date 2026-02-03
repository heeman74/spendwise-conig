import { GraphQLError } from 'graphql';
import { Context } from '../../context';
import { requireAuth } from '../../middleware/authMiddleware';
import {
  checkRateLimit,
  incrementUsage,
} from '../../services/financialPlanning/rate-limiter';
import {
  generateAndCacheInsights,
  getActiveInsights,
} from '../../services/financialPlanning/insight-generator';
import { parseAndCreateGoal } from '../../services/financialPlanning/goal-parser';

export const financialPlanningResolvers = {
  Query: {
    chatSessions: async (_: unknown, __: unknown, context: Context) => {
      const user = requireAuth(context);

      const sessions = await context.prisma.chatSession.findMany({
        where: { userId: user.id },
        orderBy: { updatedAt: 'desc' },
        include: {
          messages: {
            orderBy: { createdAt: 'asc' },
          },
        },
      });

      return sessions;
    },

    chatSession: async (
      _: unknown,
      { id }: { id: string },
      context: Context
    ) => {
      const user = requireAuth(context);

      const session = await context.prisma.chatSession.findFirst({
        where: { id, userId: user.id },
        include: {
          messages: {
            orderBy: { createdAt: 'asc' },
          },
        },
      });

      if (!session) {
        throw new GraphQLError('Chat session not found', {
          extensions: { code: 'NOT_FOUND' },
        });
      }

      return session;
    },

    activeInsights: async (_: unknown, __: unknown, context: Context) => {
      const user = requireAuth(context);
      return getActiveInsights(context.prisma as any, user.id);
    },

    chatRateLimit: async (_: unknown, __: unknown, context: Context) => {
      const user = requireAuth(context);
      const result = await checkRateLimit(user.id);

      return {
        allowed: result.allowed,
        remaining: result.remaining,
        resetAt: result.resetAt.toISOString(),
      };
    },
  },

  Mutation: {
    createChatSession: async (
      _: unknown,
      { title }: { title?: string },
      context: Context
    ) => {
      const user = requireAuth(context);

      const session = await context.prisma.chatSession.create({
        data: {
          userId: user.id,
          title: title || `Chat ${new Date().toLocaleDateString()}`,
        },
        include: {
          messages: true,
        },
      });

      return session;
    },

    sendChatMessage: async (
      _: unknown,
      { sessionId, content }: { sessionId: string; content: string },
      context: Context
    ) => {
      const user = requireAuth(context);

      // Check rate limit
      const rateLimit = await checkRateLimit(user.id);
      if (!rateLimit.allowed) {
        throw new GraphQLError(
          `Daily message limit reached. Resets at ${rateLimit.resetAt.toISOString()}`,
          { extensions: { code: 'RATE_LIMIT_EXCEEDED' } }
        );
      }

      // Verify session ownership
      const session = await context.prisma.chatSession.findFirst({
        where: { id: sessionId, userId: user.id },
      });

      if (!session) {
        throw new GraphQLError('Chat session not found', {
          extensions: { code: 'NOT_FOUND' },
        });
      }

      // Save user message
      const userMessage = await context.prisma.chatMessage.create({
        data: {
          sessionId,
          role: 'user',
          content,
        },
      });

      // Increment rate limit
      await incrementUsage(user.id);

      // Update session timestamp
      await context.prisma.chatSession.update({
        where: { id: sessionId },
        data: { updatedAt: new Date() },
      });

      // Return success - actual AI response will be streamed via SSE endpoint
      return {
        success: true,
        sessionId,
        messageId: userMessage.id,
      };
    },

    regenerateInsights: async (_: unknown, __: unknown, context: Context) => {
      const user = requireAuth(context);

      try {
        const insights = await generateAndCacheInsights(
          context.prisma as any,
          user.id
        );
        return insights;
      } catch (error) {
        console.error('Failed to regenerate insights:', error);
        throw new GraphQLError('Failed to generate insights', {
          extensions: { code: 'INTERNAL_SERVER_ERROR' },
        });
      }
    },

    parseGoalFromChat: async (
      _: unknown,
      { input, sessionId }: { input: string; sessionId?: string },
      context: Context
    ) => {
      const user = requireAuth(context);

      // Load conversation context if sessionId provided
      let conversationContext: string | undefined;
      if (sessionId) {
        const session = await context.prisma.chatSession.findFirst({
          where: { id: sessionId, userId: user.id },
          include: {
            messages: {
              orderBy: { createdAt: 'desc' },
              take: 5,
            },
          },
        });

        if (session && session.messages.length > 0) {
          conversationContext = session.messages
            .reverse()
            .map((m) => `${m.role}: ${m.content}`)
            .join('\n');
        }
      }

      const result = await parseAndCreateGoal(
        context.prisma as any,
        user.id,
        input,
        conversationContext
      );

      return {
        parsed: result !== null,
        goal: result || null,
        confidence: result ? 100 : 0, // Binary for now - either created or not
      };
    },
  },

  ChatSession: {
    messages: async (parent: any, _: unknown, context: Context) => {
      return context.prisma.chatMessage.findMany({
        where: { sessionId: parent.id },
        orderBy: { createdAt: 'asc' },
      });
    },
  },

  ChatMessage: {
    metadata: (parent: any) => {
      return parent.metadata ? JSON.stringify(parent.metadata) : null;
    },
  },
};
