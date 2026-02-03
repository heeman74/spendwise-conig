import { gql } from 'graphql-tag';

export const financialPlanningTypeDefs = gql`
  type ChatSession {
    id: ID!
    userId: String!
    title: String!
    createdAt: DateTime!
    updatedAt: DateTime!
    messages: [ChatMessage!]!
  }

  type ChatMessage {
    id: ID!
    sessionId: String!
    role: String!
    content: String!
    metadata: JSON
    createdAt: DateTime!
  }

  type InsightCard {
    id: ID!
    insightType: String!
    title: String!
    content: String!
    priority: Int!
    generatedAt: DateTime!
  }

  type RateLimitStatus {
    allowed: Boolean!
    remaining: Int!
    resetAt: String!
  }

  type SendMessageResult {
    success: Boolean!
    sessionId: String!
    messageId: String!
  }

  type GoalParseResult {
    parsed: Boolean!
    goal: SavingsGoal
    confidence: Int
  }

  extend type Query {
    chatSessions: [ChatSession!]!
    chatSession(id: String!): ChatSession
    activeInsights: [InsightCard!]!
    chatRateLimit: RateLimitStatus!
  }

  extend type Mutation {
    createChatSession(title: String): ChatSession!
    sendChatMessage(sessionId: String!, content: String!): SendMessageResult!
    regenerateInsights: [InsightCard!]!
    parseGoalFromChat(input: String!, sessionId: String): GoalParseResult!
  }
`;
