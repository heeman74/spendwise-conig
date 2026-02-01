'use client';

import Card from '../ui/Card';
import Badge from '../ui/Badge';
import Button from '../ui/Button';
import type { Advice } from '@/types';

interface AdviceCardProps {
  advice: Advice;
  onAction?: (advice: Advice) => void;
}

const typeIcons: Record<Advice['type'], React.ReactNode> = {
  budget: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
    </svg>
  ),
  savings: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
    </svg>
  ),
  investment: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
    </svg>
  ),
  debt: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
};

const priorityColors: Record<Advice['priority'], 'danger' | 'warning' | 'info'> = {
  high: 'danger',
  medium: 'warning',
  low: 'info',
};

const typeColors: Record<Advice['type'], string> = {
  budget: 'bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400',
  savings: 'bg-green-50 text-green-600 dark:bg-green-900/20 dark:text-green-400',
  investment: 'bg-purple-50 text-purple-600 dark:bg-purple-900/20 dark:text-purple-400',
  debt: 'bg-orange-50 text-orange-600 dark:bg-orange-900/20 dark:text-orange-400',
};

export default function AdviceCard({ advice, onAction }: AdviceCardProps) {
  return (
    <Card className="hover:shadow-md transition-shadow">
      <div className="flex items-start gap-4">
        <div className={`p-2 rounded-lg ${typeColors[advice.type]}`}>
          {typeIcons[advice.type]}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-semibold text-gray-900 dark:text-white truncate">
              {advice.title}
            </h3>
            <Badge variant={priorityColors[advice.priority]} size="sm">
              {advice.priority}
            </Badge>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">{advice.description}</p>
          {advice.actionable && advice.action && (
            <Button variant="outline" size="sm" onClick={() => onAction?.(advice)}>
              {advice.action}
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
}
