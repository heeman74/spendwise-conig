'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import ReactMarkdown from 'react-markdown';
import { cn } from '@/lib/utils';

interface ChatMessageProps {
  role: 'user' | 'assistant';
  content: string;
  createdAt: string;
  isStreaming?: boolean;
}

export default function ChatMessage({
  role,
  content,
  createdAt,
  isStreaming = false,
}: ChatMessageProps) {
  // Split content into main content and disclaimer
  const { mainContent, disclaimer } = useMemo(() => {
    if (role === 'assistant') {
      // Check if last line is the disclaimer
      const lines = content.trim().split('\n');
      const lastLine = lines[lines.length - 1];

      if (lastLine.toLowerCase().includes('not professional financial advice')) {
        return {
          mainContent: lines.slice(0, -1).join('\n').trim(),
          disclaimer: lastLine,
        };
      }
    }

    return { mainContent: content, disclaimer: null };
  }, [role, content]);

  // Format timestamp
  const formattedTime = useMemo(() => {
    const date = new Date(createdAt);
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  }, [createdAt]);

  const isUser = role === 'user';

  return (
    <div className={cn('flex', isUser ? 'justify-end' : 'justify-start')}>
      <div className={cn('max-w-[80%] space-y-1', isUser ? 'items-end' : 'items-start')}>
        {/* Message bubble */}
        <div
          className={cn(
            'rounded-lg px-4 py-2.5',
            isUser
              ? 'bg-primary-600 text-white'
              : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white'
          )}
        >
          {isUser ? (
            <p className="text-sm whitespace-pre-wrap">{content}</p>
          ) : (
            <div className="text-sm prose prose-sm dark:prose-invert max-w-none">
              <ReactMarkdown
                components={{
                  // Custom link renderer for internal app links
                  a: ({ href, children, ...props }) => {
                    if (href?.startsWith('/')) {
                      return (
                        <Link
                          href={href}
                          className="text-primary-600 dark:text-primary-400 hover:underline"
                        >
                          {children}
                        </Link>
                      );
                    }
                    return (
                      <a
                        href={href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary-600 dark:text-primary-400 hover:underline"
                        {...props}
                      >
                        {children}
                      </a>
                    );
                  },
                  // Override paragraph to remove extra spacing
                  p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                  // Style lists
                  ul: ({ children }) => <ul className="list-disc pl-4 mb-2">{children}</ul>,
                  ol: ({ children }) => <ol className="list-decimal pl-4 mb-2">{children}</ol>,
                  // Style code blocks
                  code: ({ children, className }) => {
                    const isInline = !className;
                    return isInline ? (
                      <code className="bg-gray-200 dark:bg-gray-700 px-1 py-0.5 rounded text-xs">
                        {children}
                      </code>
                    ) : (
                      <code className={className}>{children}</code>
                    );
                  },
                }}
              >
                {mainContent}
              </ReactMarkdown>

              {/* Streaming cursor */}
              {isStreaming && (
                <span className="inline-block w-1.5 h-4 bg-gray-900 dark:bg-white animate-pulse ml-0.5" />
              )}
            </div>
          )}

          {/* Disclaimer for assistant messages */}
          {!isUser && disclaimer && (
            <p className="text-xs italic text-gray-500 dark:text-gray-400 mt-2 border-t border-gray-200 dark:border-gray-700 pt-2">
              {disclaimer}
            </p>
          )}
        </div>

        {/* Timestamp */}
        <p className="text-xs text-gray-500 dark:text-gray-400 px-1">
          {formattedTime}
        </p>
      </div>
    </div>
  );
}
