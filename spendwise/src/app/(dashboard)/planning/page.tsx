'use client';

import { Suspense, useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import InsightCard from '@/components/planning/InsightCard';
import ChatInterface from '@/components/planning/ChatInterface';
import { useActiveInsights, useRegenerateInsights } from '@/hooks/useFinancialPlanning';

export default function PlanningPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center py-12"><div className="text-gray-500">Loading...</div></div>}>
      <PlanningContent />
    </Suspense>
  );
}

function PlanningContent() {
  const searchParams = useSearchParams();
  const { insights, loading: insightsLoading, refetch } = useActiveInsights();
  const { regenerateInsights, loading: regenerating } = useRegenerateInsights();
  const [askQuestion, setAskQuestion] = useState<string | null>(null);

  // Read ?ask= query param (from dashboard InsightsWidget navigation)
  useEffect(() => {
    const askParam = searchParams.get('ask');
    if (askParam) {
      setAskQuestion(askParam);
    }
  }, [searchParams]);

  const handleAskAbout = (title: string) => {
    setAskQuestion(title);
    const chatSection = document.getElementById('chat-section');
    chatSection?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="space-y-6 h-full flex flex-col">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Financial Planning
        </h1>
        <p className="text-gray-500 dark:text-gray-400">
          AI-powered insights and personalized advice
        </p>

        {/* Disclaimer banner */}
        <div className="mt-3 px-4 py-2 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-lg">
          <p className="text-xs text-gray-600 dark:text-gray-400">
            AI-generated insights are not professional financial advice. Always consult with a
            qualified financial advisor for important financial decisions.
          </p>
        </div>
      </div>

      {/* Insights section */}
      {insightsLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-40 bg-gray-100 dark:bg-gray-800 rounded-lg animate-pulse"
            />
          ))}
        </div>
      ) : insights && insights.length > 0 ? (
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
            Recent Insights
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {insights.slice(0, 6).map((insight: any) => (
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
        </div>
      ) : (
        <div className="bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-lg p-6 text-center">
          <svg
            className="w-10 h-10 mx-auto mb-3 text-gray-400 dark:text-gray-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
            />
          </svg>
          <p className="text-gray-600 dark:text-gray-400 font-medium mb-1">
            No insights yet
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-500 mb-4">
            Generate AI-powered insights based on your financial data
          </p>
          <button
            onClick={async () => {
              try {
                await regenerateInsights();
                refetch();
              } catch {
                // error handled by hook
              }
            }}
            disabled={regenerating}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {regenerating ? (
              <>
                <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Generating...
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                Generate Insights
              </>
            )}
          </button>
        </div>
      )}

      {/* Chat section */}
      <div id="chat-section" className="flex-1 min-h-0">
        <div className="h-full bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
          <ChatInterface initialQuestion={askQuestion} />
        </div>
      </div>
    </div>
  );
}
