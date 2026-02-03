'use client';

import { useQuery, useMutation } from '@apollo/client/react';
import { getSession } from 'next-auth/react';
import { useState, useCallback, useRef } from 'react';
import {
  GET_CHAT_SESSIONS,
  GET_CHAT_SESSION,
  GET_ACTIVE_INSIGHTS,
  GET_CHAT_RATE_LIMIT,
  CREATE_CHAT_SESSION,
  SEND_CHAT_MESSAGE,
  REGENERATE_INSIGHTS,
  PARSE_GOAL_FROM_CHAT,
} from '@/graphql';

// Query hooks
export function useChatSessions(options?: { skip?: boolean }) {
  const { data, loading, error, refetch } = useQuery<any>(GET_CHAT_SESSIONS, {
    fetchPolicy: 'cache-and-network',
    skip: options?.skip,
  });

  return {
    sessions: data?.chatSessions ?? [],
    loading,
    error,
    refetch,
  };
}

export function useChatSession(options?: { sessionId?: string; skip?: boolean }) {
  const { data, loading, error, refetch } = useQuery<any>(GET_CHAT_SESSION, {
    variables: { id: options?.sessionId },
    fetchPolicy: 'cache-and-network',
    skip: options?.skip || !options?.sessionId,
  });

  return {
    session: data?.chatSession,
    loading,
    error,
    refetch,
  };
}

export function useActiveInsights(options?: { skip?: boolean }) {
  const { data, loading, error, refetch } = useQuery<any>(GET_ACTIVE_INSIGHTS, {
    fetchPolicy: 'cache-and-network',
    skip: options?.skip,
  });

  return {
    insights: data?.activeInsights ?? [],
    loading,
    error,
    refetch,
  };
}

export function useChatRateLimit(options?: { skip?: boolean }) {
  const { data, loading, error, refetch } = useQuery<any>(GET_CHAT_RATE_LIMIT, {
    fetchPolicy: 'network-only',
    skip: options?.skip,
  });

  return {
    rateLimit: data?.chatRateLimit,
    loading,
    error,
    refetch,
  };
}

// Mutation hooks
export function useCreateChatSession() {
  const [createSessionMutation, { loading, error }] = useMutation<any>(
    CREATE_CHAT_SESSION,
    {
      refetchQueries: ['GetChatSessions'],
      awaitRefetchQueries: true,
    }
  );

  const createSession = async (title?: string) => {
    return createSessionMutation({
      variables: { title },
    });
  };

  return {
    createSession,
    loading,
    error,
  };
}

export function useSendChatMessage() {
  const [sendMessageMutation, { loading, error }] = useMutation<any>(
    SEND_CHAT_MESSAGE
  );

  const sendMessage = async (sessionId: string, content: string) => {
    return sendMessageMutation({
      variables: { sessionId, content },
    });
  };

  return {
    sendMessage,
    loading,
    error,
  };
}

export function useRegenerateInsights() {
  const [regenerateInsightsMutation, { loading, error }] = useMutation<any>(
    REGENERATE_INSIGHTS,
    {
      refetchQueries: ['GetActiveInsights'],
      awaitRefetchQueries: true,
    }
  );

  const regenerateInsights = async () => {
    return regenerateInsightsMutation();
  };

  return {
    regenerateInsights,
    loading,
    error,
  };
}

export function useParseGoalFromChat() {
  const [parseGoalMutation, { loading, error }] = useMutation<any>(
    PARSE_GOAL_FROM_CHAT
  );

  const parseGoal = async (input: string, sessionId?: string) => {
    return parseGoalMutation({
      variables: { input, sessionId },
    });
  };

  return {
    parseGoal,
    loading,
    error,
  };
}

// SSE Streaming hook
interface ChatStreamOptions {
  sessionId: string;
  content: string;
  onToken?: (token: string) => void;
  onComplete?: (fullContent: string) => void;
  onError?: (error: Error) => void;
}

export function useChatStream() {
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamedContent, setStreamedContent] = useState('');
  const [error, setError] = useState<Error | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const startStream = useCallback(async (options: ChatStreamOptions) => {
    const { sessionId, content, onToken, onComplete, onError } = options;

    // Reset state
    setIsStreaming(true);
    setStreamedContent('');
    setError(null);

    // Create abort controller for cancellation
    abortControllerRef.current = new AbortController();

    try {
      // Get auth token
      const session = await getSession();
      const token = session?.accessToken;

      if (!token) {
        throw new Error('Not authenticated');
      }

      // Connect to SSE endpoint
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
      const response = await fetch(`${apiUrl}/api/chat/stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ sessionId, content }),
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.error || `HTTP ${response.status}: ${response.statusText}`
        );
      }

      if (!response.body) {
        throw new Error('Response body is null');
      }

      // Process SSE stream
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let accumulatedContent = '';

      while (true) {
        const { done, value } = await reader.read();

        if (done) {
          break;
        }

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6); // Remove 'data: ' prefix

            try {
              const event = JSON.parse(data);

              // Handle different event types
              if (event.type === 'content_block_delta' && event.delta?.text) {
                const token = event.delta.text;
                accumulatedContent += token;
                setStreamedContent(accumulatedContent);
                onToken?.(token);
              } else if (event.type === 'message_stop') {
                // Stream complete
                setIsStreaming(false);
                onComplete?.(accumulatedContent);
              } else if (event.type === 'error') {
                throw new Error(event.error || 'Streaming error');
              }
            } catch (parseError) {
              // Ignore non-JSON lines (e.g., comments, keep-alive)
              if (data.trim() && !data.startsWith(':')) {
                console.warn('Failed to parse SSE event:', data);
              }
            }
          }
        }
      }

      setIsStreaming(false);
    } catch (err: any) {
      if (err.name === 'AbortError') {
        // User cancelled - not an error
        setIsStreaming(false);
        return;
      }

      const streamError = err instanceof Error ? err : new Error(String(err));
      setError(streamError);
      setIsStreaming(false);
      onError?.(streamError);
    }
  }, []);

  const stopStream = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsStreaming(false);
  }, []);

  return {
    startStream,
    stopStream,
    isStreaming,
    streamedContent,
    error,
  };
}
