'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';

interface InsightCardProps {
  insightType: string;
  title: string;
  content: string;
  priority: number;
  onAskAbout: (title: string) => void;
}

export default function InsightCard({
  insightType,
  title,
  content,
  priority,
  onAskAbout,
}: InsightCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  // Determine icon based on insight type
  const icon = () => {
    switch (insightType) {
      case 'spending_anomaly':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
          </svg>
        );
      case 'savings_opportunity':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
        );
      case 'investment_observation':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
          </svg>
        );
      default:
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
    }
  };

  // Determine priority badge
  const priorityBadge = () => {
    if (priority <= 2) {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400">
          High Impact
        </span>
      );
    } else if (priority === 3) {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400">
          Medium
        </span>
      );
    } else {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400">
          Info
        </span>
      );
    }
  };

  // Truncate content to 3 lines if not expanded
  const displayContent = isExpanded ? content : content;
  const needsTruncation = content.length > 200;

  return (
    <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start gap-3">
        {/* Icon */}
        <div className="flex-shrink-0 mt-1 text-primary-600 dark:text-primary-400">
          {icon()}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Header with priority badge */}
          <div className="flex items-start justify-between gap-2 mb-2">
            <h4 className="font-semibold text-gray-900 dark:text-white">{title}</h4>
            {priorityBadge()}
          </div>

          {/* Content */}
          <p
            className={cn(
              'text-sm text-gray-600 dark:text-gray-300',
              !isExpanded && needsTruncation && 'line-clamp-3'
            )}
          >
            {displayContent}
          </p>

          {/* Action links */}
          <div className="flex items-center gap-4 mt-3">
            {needsTruncation && (
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="text-sm text-primary-600 dark:text-primary-400 hover:underline"
              >
                {isExpanded ? 'Show less' : 'Read more'}
              </button>
            )}

            <button
              onClick={() => onAskAbout(title)}
              className="text-sm font-medium text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 transition-colors"
            >
              Ask about this →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
