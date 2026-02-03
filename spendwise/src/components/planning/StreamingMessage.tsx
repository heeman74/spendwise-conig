'use client';

import ChatMessage from './ChatMessage';

interface StreamingMessageProps {
  content: string;
  isThinking: boolean;
}

export default function StreamingMessage({ content, isThinking }: StreamingMessageProps) {
  // Show thinking dots when thinking and no content yet
  if (isThinking && !content) {
    return (
      <div className="flex justify-start">
        <div className="bg-gray-100 dark:bg-gray-800 rounded-lg px-4 py-3">
          <div className="flex items-center gap-1">
            <div
              className="w-2 h-2 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce"
              style={{ animationDelay: '0ms' }}
            />
            <div
              className="w-2 h-2 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce"
              style={{ animationDelay: '150ms' }}
            />
            <div
              className="w-2 h-2 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce"
              style={{ animationDelay: '300ms' }}
            />
          </div>
        </div>
      </div>
    );
  }

  // Show streaming content once it starts arriving
  if (content) {
    return (
      <ChatMessage
        role="assistant"
        content={content}
        createdAt={new Date().toISOString()}
        isStreaming={true}
      />
    );
  }

  // No content and not thinking - shouldn't happen, but handle gracefully
  return null;
}
