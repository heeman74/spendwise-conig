'use client';

import { useState, useRef, useEffect, KeyboardEvent } from 'react';
import { cn } from '@/lib/utils';

interface ChatInputProps {
  onSend: (message: string) => void;
  disabled: boolean;
  remaining: number;
  resetAt: string | null;
  initialMessage?: string;
}

export default function ChatInput({
  onSend,
  disabled,
  remaining,
  resetAt,
  initialMessage,
}: ChatInputProps) {
  const [message, setMessage] = useState('');

  // Pre-fill from initialMessage when it changes
  useEffect(() => {
    if (initialMessage) {
      setMessage(initialMessage);
    }
  }, [initialMessage]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [message]);

  const handleSend = () => {
    if (!message.trim() || disabled) return;

    onSend(message.trim());
    setMessage('');

    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Format reset time
  const formattedResetTime = resetAt
    ? new Date(resetAt).toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      })
    : null;

  const isRateLimited = remaining === 0;

  return (
    <div className="border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4">
      <div className="max-w-4xl mx-auto">
        {/* Input area */}
        <div className="flex items-end gap-2">
          <textarea
            ref={textareaRef}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              isRateLimited
                ? 'Daily limit reached...'
                : 'Ask about your finances or set a goal...'
            }
            disabled={disabled || isRateLimited}
            rows={1}
            className={cn(
              'flex-1 resize-none rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-4 py-3 text-sm text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 dark:focus:ring-primary-600 focus:border-transparent',
              (disabled || isRateLimited) && 'opacity-50 cursor-not-allowed'
            )}
            style={{ maxHeight: '200px', minHeight: '48px' }}
          />

          {/* Send button */}
          <button
            onClick={handleSend}
            disabled={disabled || isRateLimited || !message.trim()}
            className={cn(
              'flex-shrink-0 inline-flex items-center justify-center w-12 h-12 rounded-lg bg-primary-600 text-white hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 transition-colors',
              (disabled || isRateLimited || !message.trim()) &&
                'opacity-50 cursor-not-allowed'
            )}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
              />
            </svg>
          </button>
        </div>

        {/* Rate limit display */}
        <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
          {isRateLimited ? (
            <span className="text-red-600 dark:text-red-400">
              Daily limit reached. Resets at {formattedResetTime || 'midnight'}.
            </span>
          ) : (
            <span>
              {remaining} {remaining === 1 ? 'message' : 'messages'} remaining today
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
