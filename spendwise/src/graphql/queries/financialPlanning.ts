import { gql } from '@apollo/client';

export const GET_CHAT_SESSIONS = gql`
  query GetChatSessions {
    chatSessions {
      id
      userId
      title
      createdAt
      updatedAt
    }
  }
`;

export const GET_CHAT_SESSION = gql`
  query GetChatSession($id: String!) {
    chatSession(id: $id) {
      id
      userId
      title
      createdAt
      updatedAt
      messages {
        id
        sessionId
        role
        content
        metadata
        createdAt
      }
    }
  }
`;

export const GET_ACTIVE_INSIGHTS = gql`
  query GetActiveInsights {
    activeInsights {
      id
      insightType
      title
      content
      priority
      generatedAt
    }
  }
`;

export const GET_CHAT_RATE_LIMIT = gql`
  query GetChatRateLimit {
    chatRateLimit {
      allowed
      remaining
      resetAt
    }
  }
`;
