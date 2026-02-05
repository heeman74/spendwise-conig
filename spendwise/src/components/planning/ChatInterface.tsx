'use client';

import { useState, useEffect, useRef } from 'react';
import ChatMessage from './ChatMessage';
import StreamingMessage from './StreamingMessage';
import ChatInput from './ChatInput';
import {
  useChatSessions,
  useChatSession,
  useChatRateLimit,
  useCreateChatSession,
  useSendChatMessage,
  useChatStream,
} from '@/hooks/useFinancialPlanning';

interface ChatInterfaceProps {
  initialQuestion?: string | null;
}

export default function ChatInterface({ initialQuestion }: ChatInterfaceProps = {}) {
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [localMessages, setLocalMessages] = useState<any[]>([]);
  const [isThinking, setIsThinking] = useState(false);
  const [pendingQuestion, setPendingQuestion] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const initialQuestionSentRef = useRef(false);

  // Data hooks
  const { sessions, loading: sessionsLoading } = useChatSessions();
  const { session, refetch: refetchSession } = useChatSession({
    sessionId: activeSessionId || undefined,
    skip: !activeSessionId,
  });
  const { rateLimit, loading: rateLimitLoading } = useChatRateLimit();
  const { createSession, loading: creatingSession } = useCreateChatSession();
  const { sendMessage } = useSendChatMessage();
  const { startStream, isStreaming, streamedContent } = useChatStream();

  // Initialize: load most recent session or create new one
  useEffect(() => {
    if (!sessionsLoading && !activeSessionId) {
      if (sessions && sessions.length > 0) {
        // Load most recent session
        const mostRecent = sessions[0];
        setActiveSessionId(mostRecent.id);
      } else {
        // Auto-create new session
        handleNewChat();
      }
    }
  }, [sessions, sessionsLoading, activeSessionId]);

  // Load messages when session changes
  useEffect(() => {
    if (session?.messages) {
      setLocalMessages(session.messages);
    }
  }, [session]);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [localMessages, streamedContent, isStreaming]);

  // Track incoming initialQuestion
  useEffect(() => {
    if (initialQuestion && !initialQuestionSentRef.current) {
      setPendingQuestion(initialQuestion);
    }
  }, [initialQuestion]);

  // Auto-send pending question once session is ready
  useEffect(() => {
    if (pendingQuestion && activeSessionId && !isThinking && !isStreaming && !initialQuestionSentRef.current) {
      initialQuestionSentRef.current = true;
      const question = pendingQuestion;
      setPendingQuestion(null);
      handleSendMessage(`Tell me more about this insight: ${question}`);
    }
  }, [pendingQuestion, activeSessionId, isThinking, isStreaming]);

  const handleNewChat = async () => {
    try {
      const result = await createSession('New Chat');
      if (result?.data?.createChatSession?.id) {
        setActiveSessionId(result.data.createChatSession.id);
        setLocalMessages([]);
      }
    } catch (error) {
      console.error('Failed to create chat session:', error);
    }
  };

  const handleSendMessage = async (content: string) => {
    if (!activeSessionId || !content.trim()) return;

    // Optimistically add user message
    const userMessage = {
      id: `temp-${Date.now()}`,
      role: 'user',
      content,
      createdAt: new Date().toISOString(),
    };
    setLocalMessages((prev) => [...prev, userMessage]);

    try {
      // Send message to server
      const result = await sendMessage(activeSessionId, content);

      if (result?.data?.sendChatMessage?.success) {
        // Set thinking state
        setIsThinking(true);

        // Start streaming
        await startStream({
          sessionId: activeSessionId,
          content,
          onToken: (token) => {
            // First token received - stop thinking animation
            setIsThinking(false);
          },
          onComplete: (fullContent) => {
            // Add assistant message to local state
            const assistantMessage = {
              id: `assistant-${Date.now()}`,
              role: 'assistant',
              content: fullContent,
              createdAt: new Date().toISOString(),
            };
            setLocalMessages((prev) => [...prev, assistantMessage]);
            setIsThinking(false);

            // Refetch session to persist messages
            refetchSession();
          },
          onError: (error) => {
            console.error('Streaming error:', error);
            setIsThinking(false);
          },
        });
      }
    } catch (error) {
      console.error('Failed to send message:', error);
      setIsThinking(false);
    }
  };

  // Calculate remaining messages
  const remaining = rateLimit?.remaining ?? 25;
  const resetAt = rateLimit?.resetAt ?? null;

  // Check if input should be disabled
  const isInputDisabled = isStreaming || isThinking || remaining === 0 || creatingSession;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-700 px-6 py-4 bg-white dark:bg-gray-900">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Chat</h2>
        <button
          onClick={handleNewChat}
          disabled={creatingSession}
          className="px-4 py-2 text-sm font-medium text-primary-600 dark:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {creatingSession ? 'Creating...' : 'New Chat'}
        </button>
      </div>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4 bg-gray-50 dark:bg-gray-900/50">
        {localMessages.length === 0 && !isStreaming && (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <svg
                className="w-12 h-12 mx-auto mb-4 text-gray-400 dark:text-gray-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                />
              </svg>
              <p className="text-gray-500 dark:text-gray-400">
                Start a conversation about your finances
              </p>
            </div>
          </div>
        )}

        {localMessages.map((message) => (
          <ChatMessage
            key={message.id}
            role={message.role}
            content={message.content}
            createdAt={message.createdAt}
          />
        ))}

        {/* Streaming message */}
        {(isStreaming || isThinking) && (
          <StreamingMessage content={streamedContent} isThinking={isThinking} />
        )}

        {/* Scroll anchor */}
        <div ref={messagesEndRef} />
      </div>

      {/* Input area */}
      <ChatInput
        onSend={handleSendMessage}
        disabled={isInputDisabled}
        remaining={remaining}
        resetAt={resetAt}
        initialMessage={pendingQuestion || undefined}
      />
    </div>
  );
}
