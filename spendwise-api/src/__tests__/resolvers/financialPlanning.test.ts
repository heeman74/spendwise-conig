import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import { GraphQLError } from 'graphql';
import { financialPlanningResolvers } from '../../schema/resolvers/financialPlanning';
import { mockContext, mockUnauthenticatedContext } from '../mocks/data';
import { prisma } from '../../lib/prisma';

// Mock the service modules
jest.mock('../../services/financialPlanning/insight-generator', () => ({
  getActiveInsights: jest.fn(),
  generateAndCacheInsights: jest.fn(),
}));

jest.mock('../../services/financialPlanning/rate-limiter', () => ({
  checkRateLimit: jest.fn(),
  incrementUsage: jest.fn(),
}));

jest.mock('../../services/financialPlanning/goal-parser', () => ({
  parseAndCreateGoal: jest.fn(),
}));

const { getActiveInsights, generateAndCacheInsights } =
  require('../../services/financialPlanning/insight-generator') as any;

const { checkRateLimit, incrementUsage } =
  require('../../services/financialPlanning/rate-limiter') as any;

const prismaMock = prisma as any;

const mockInsights = [
  {
    id: 'ins-1',
    userId: 'user-123',
    insightType: 'spending_anomaly',
    title: 'High Dining Spending',
    content: 'Your dining spending is 40% above average this month.',
    priority: 2,
    generatedAt: new Date('2024-01-15'),
    invalidatedAt: null,
  },
  {
    id: 'ins-2',
    userId: 'user-123',
    insightType: 'savings_opportunity',
    title: 'Subscription Savings',
    content: 'You could save $50/month by consolidating subscriptions.',
    priority: 3,
    generatedAt: new Date('2024-01-15'),
    invalidatedAt: null,
  },
];

const mockChatSessions = [
  {
    id: 'session-1',
    userId: 'user-123',
    title: 'Chat Jan 15',
    createdAt: new Date('2024-01-15'),
    updatedAt: new Date('2024-01-15'),
    messages: [],
  },
];

describe('Financial Planning Resolvers', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Query.activeInsights', () => {
    it('should return active insights for authenticated user', async () => {
      getActiveInsights.mockResolvedValue(mockInsights);

      const context = { ...mockContext, prisma };

      const result = await financialPlanningResolvers.Query.activeInsights(
        null,
        {},
        context as any
      );

      expect(result).toEqual(mockInsights);
      expect(getActiveInsights).toHaveBeenCalledWith(prisma, 'user-123');
    });

    it('should auto-generate insights when none exist', async () => {
      getActiveInsights.mockResolvedValue([]);
      generateAndCacheInsights.mockResolvedValue(mockInsights);

      const context = { ...mockContext, prisma };

      const result = await financialPlanningResolvers.Query.activeInsights(
        null,
        {},
        context as any
      );

      expect(result).toEqual(mockInsights);
      expect(generateAndCacheInsights).toHaveBeenCalledWith(prisma, 'user-123');
    });

    it('should return empty array when auto-generation fails', async () => {
      getActiveInsights.mockResolvedValue([]);
      generateAndCacheInsights.mockRejectedValue(new Error('AI service unavailable'));

      const context = { ...mockContext, prisma };

      const result = await financialPlanningResolvers.Query.activeInsights(
        null,
        {},
        context as any
      );

      expect(result).toEqual([]);
    });

    it('should throw UNAUTHENTICATED error when not logged in', async () => {
      const context = { ...mockUnauthenticatedContext, prisma };

      await expect(
        financialPlanningResolvers.Query.activeInsights(null, {}, context as any)
      ).rejects.toThrow(GraphQLError);

      await expect(
        financialPlanningResolvers.Query.activeInsights(null, {}, context as any)
      ).rejects.toMatchObject({
        extensions: { code: 'UNAUTHENTICATED' },
      });
    });
  });

  describe('Query.chatSessions', () => {
    it('should return chat sessions for authenticated user', async () => {
      prismaMock.chatSession.findMany.mockResolvedValue(mockChatSessions);

      const context = { ...mockContext, prisma };

      const result = await financialPlanningResolvers.Query.chatSessions(
        null,
        {},
        context as any
      );

      expect(result).toEqual(mockChatSessions);
      expect(prismaMock.chatSession.findMany).toHaveBeenCalledWith({
        where: { userId: 'user-123' },
        orderBy: { updatedAt: 'desc' },
        include: {
          messages: {
            orderBy: { createdAt: 'asc' },
          },
        },
      });
    });

    it('should throw UNAUTHENTICATED error when not logged in', async () => {
      const context = { ...mockUnauthenticatedContext, prisma };

      await expect(
        financialPlanningResolvers.Query.chatSessions(null, {}, context as any)
      ).rejects.toMatchObject({
        extensions: { code: 'UNAUTHENTICATED' },
      });
    });
  });

  describe('Query.chatSession', () => {
    it('should return a specific chat session', async () => {
      const session = { ...mockChatSessions[0], messages: [] };
      prismaMock.chatSession.findFirst.mockResolvedValue(session);

      const context = { ...mockContext, prisma };

      const result = await financialPlanningResolvers.Query.chatSession(
        null,
        { id: 'session-1' },
        context as any
      );

      expect(result).toEqual(session);
      expect(prismaMock.chatSession.findFirst).toHaveBeenCalledWith({
        where: { id: 'session-1', userId: 'user-123' },
        include: {
          messages: {
            orderBy: { createdAt: 'asc' },
          },
        },
      });
    });

    it('should throw NOT_FOUND when session does not exist', async () => {
      prismaMock.chatSession.findFirst.mockResolvedValue(null);

      const context = { ...mockContext, prisma };

      await expect(
        financialPlanningResolvers.Query.chatSession(
          null,
          { id: 'nonexistent' },
          context as any
        )
      ).rejects.toThrow('Chat session not found');
    });
  });

  describe('Query.chatRateLimit', () => {
    it('should return rate limit info for authenticated user', async () => {
      const resetAt = new Date('2024-01-16');
      checkRateLimit.mockResolvedValue({
        allowed: true,
        remaining: 8,
        resetAt,
      });

      const context = { ...mockContext, prisma };

      const result = await financialPlanningResolvers.Query.chatRateLimit(
        null,
        {},
        context as any
      );

      expect(result).toEqual({
        allowed: true,
        remaining: 8,
        resetAt: resetAt.toISOString(),
      });
      expect(checkRateLimit).toHaveBeenCalledWith('user-123');
    });
  });

  describe('Mutation.createChatSession', () => {
    it('should create a new chat session', async () => {
      const newSession = {
        id: 'session-new',
        userId: 'user-123',
        title: 'My Chat',
        messages: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      prismaMock.chatSession.create.mockResolvedValue(newSession);

      const context = { ...mockContext, prisma };

      const result = await financialPlanningResolvers.Mutation.createChatSession(
        null,
        { title: 'My Chat' },
        context as any
      );

      expect(result).toEqual(newSession);
      expect(prismaMock.chatSession.create).toHaveBeenCalledWith({
        data: {
          userId: 'user-123',
          title: 'My Chat',
        },
        include: { messages: true },
      });
    });

    it('should use default title when none provided', async () => {
      prismaMock.chatSession.create.mockResolvedValue({
        id: 'session-new',
        messages: [],
      });

      const context = { ...mockContext, prisma };

      await financialPlanningResolvers.Mutation.createChatSession(
        null,
        {},
        context as any
      );

      expect(prismaMock.chatSession.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            title: expect.stringContaining('Chat'),
          }),
        })
      );
    });
  });

  describe('Mutation.sendChatMessage', () => {
    it('should save user message and return success', async () => {
      checkRateLimit.mockResolvedValue({ allowed: true, remaining: 9 });
      prismaMock.chatSession.findFirst.mockResolvedValue(mockChatSessions[0]);
      prismaMock.chatMessage.create.mockResolvedValue({
        id: 'msg-1',
        sessionId: 'session-1',
        role: 'user',
        content: 'Hello',
      });
      prismaMock.chatSession.update.mockResolvedValue({});

      const context = { ...mockContext, prisma };

      const result = await financialPlanningResolvers.Mutation.sendChatMessage(
        null,
        { sessionId: 'session-1', content: 'Hello' },
        context as any
      );

      expect(result.success).toBe(true);
      expect(result.sessionId).toBe('session-1');
      expect(incrementUsage).toHaveBeenCalledWith('user-123');
    });

    it('should throw RATE_LIMIT_EXCEEDED when limit reached', async () => {
      checkRateLimit.mockResolvedValue({
        allowed: false,
        remaining: 0,
        resetAt: new Date('2024-01-16'),
      });

      const context = { ...mockContext, prisma };

      await expect(
        financialPlanningResolvers.Mutation.sendChatMessage(
          null,
          { sessionId: 'session-1', content: 'Hello' },
          context as any
        )
      ).rejects.toMatchObject({
        extensions: { code: 'RATE_LIMIT_EXCEEDED' },
      });
    });

    it('should throw NOT_FOUND when session does not exist', async () => {
      checkRateLimit.mockResolvedValue({ allowed: true, remaining: 9 });
      prismaMock.chatSession.findFirst.mockResolvedValue(null);

      const context = { ...mockContext, prisma };

      await expect(
        financialPlanningResolvers.Mutation.sendChatMessage(
          null,
          { sessionId: 'nonexistent', content: 'Hello' },
          context as any
        )
      ).rejects.toThrow('Chat session not found');
    });
  });

  describe('Mutation.regenerateInsights', () => {
    it('should regenerate insights', async () => {
      generateAndCacheInsights.mockResolvedValue(mockInsights);

      const context = { ...mockContext, prisma };

      const result = await financialPlanningResolvers.Mutation.regenerateInsights(
        null,
        {},
        context as any
      );

      expect(result).toEqual(mockInsights);
      expect(generateAndCacheInsights).toHaveBeenCalledWith(prisma, 'user-123');
    });

    it('should throw error when regeneration fails', async () => {
      generateAndCacheInsights.mockRejectedValue(new Error('AI service down'));

      const context = { ...mockContext, prisma };

      await expect(
        financialPlanningResolvers.Mutation.regenerateInsights(
          null,
          {},
          context as any
        )
      ).rejects.toThrow('Failed to generate insights');
    });
  });

  describe('ChatMessage.metadata', () => {
    it('should serialize metadata to JSON string', () => {
      const parent = { metadata: { key: 'value' } };
      const result = financialPlanningResolvers.ChatMessage.metadata(parent);
      expect(result).toBe('{"key":"value"}');
    });

    it('should return null for null metadata', () => {
      const parent = { metadata: null };
      const result = financialPlanningResolvers.ChatMessage.metadata(parent);
      expect(result).toBeNull();
    });
  });
});
