'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useSelector } from 'react-redux';
import Card, { CardHeader, CardTitle } from '@/components/ui/Card';
import Spinner from '@/components/ui/Spinner';
import InsightCard from '@/components/planning/InsightCard';
import { useActiveInsights } from '@/hooks/useFinancialPlanning';

export default function InsightsWidget() {
  const isDemo = useSelector((state: any) => state.auth.isDemo);
  const router = useRouter();
  const { insights, loading, error } = useActiveInsights({ skip: isDemo });

  const handleAskAbout = (title: string) => {
    router.push(`/planning?ask=${encodeURIComponent(title)}`);
  };

  // Loading state
  if (!isDemo && loading && !insights?.length) {
    return (
      <Card className="min-h-[150px] flex items-center justify-center">
        <Spinner size="lg" />
      </Card>
    );
  }

  // Error state
  if (!isDemo && error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>AI Insights</CardTitle>
        </CardHeader>
        <p className="text-sm text-red-500">Unable to load insights</p>
      </Card>
    );
  }

  // Demo mode or no data
  if (isDemo || !insights || insights.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>AI Insights</CardTitle>
        </CardHeader>
        <div className="text-center py-6">
          <svg
            className="w-12 h-12 mx-auto text-gray-300 dark:text-gray-600 mb-3"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
            />
          </svg>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            No insights available yet
          </p>
          <Link
            href="/planning"
            className="text-sm text-primary-600 dark:text-primary-400 font-medium hover:underline mt-2 inline-block"
          >
            Go to Financial Planning →
          </Link>
        </div>
      </Card>
    );
  }

  const displayInsights = insights.slice(0, 2);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>AI Insights</CardTitle>
          <Link
            href="/planning"
            className="text-sm text-primary-600 dark:text-primary-400 font-medium hover:underline"
          >
            View All Insights →
          </Link>
        </div>
      </CardHeader>
      <div className="space-y-3">
        {displayInsights.map((insight: any) => (
          <InsightCard
            key={insight.id}
            insightType={insight.insightType}
            title={insight.title}
            content={insight.content}
            priority={insight.priority}
            onAskAbout={handleAskAbout}
          />
        ))}
      </div>
    </Card>
  );
}
