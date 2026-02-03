import { gql } from '@apollo/client';

export const CREATE_CHAT_SESSION = gql`
  mutation CreateChatSession($title: String) {
    createChatSession(title: $title) {
      id
      userId
      title
      createdAt
      updatedAt
    }
  }
`;

export const SEND_CHAT_MESSAGE = gql`
  mutation SendChatMessage($sessionId: String!, $content: String!) {
    sendChatMessage(sessionId: $sessionId, content: $content) {
      success
      sessionId
      messageId
    }
  }
`;

export const REGENERATE_INSIGHTS = gql`
  mutation RegenerateInsights {
    regenerateInsights {
      id
      insightType
      title
      content
      priority
      generatedAt
    }
  }
`;

export const PARSE_GOAL_FROM_CHAT = gql`
  mutation ParseGoalFromChat($input: String!, $sessionId: String) {
    parseGoalFromChat(input: $input, sessionId: $sessionId) {
      parsed
      goal {
        id
        name
        targetAmount
        currentAmount
        targetDate
        category
        description
      }
      confidence
    }
  }
`;
