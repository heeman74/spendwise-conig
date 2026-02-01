'use client';

import { useMemo } from 'react';
import Card, { CardHeader, CardTitle } from '@/components/ui/Card';
import AdviceCard from '@/components/advice/AdviceCard';
import InvestmentTips from '@/components/advice/InvestmentTips';
import BudgetSuggestions from '@/components/advice/BudgetSuggestions';
import Spinner from '@/components/ui/Spinner';
import {
  mockAdvice,
  mockAccounts,
  getDashboardStats,
  getBudgetSuggestions,
  getInvestmentTips,
} from '@/data/mockData';
import type { Advice } from '@/types';

export default function InvestmentsPage() {
  const stats = useMemo(() => getDashboardStats(), []);
  const budgetSuggestions = useMemo(
    () => getBudgetSuggestions(stats.monthlyIncome),
    [stats.monthlyIncome]
  );
  const investmentTips = useMemo(() => {
    const savingsAccount = mockAccounts.find((a) => a.type === 'SAVINGS');
    return getInvestmentTips(
      stats.monthlyExpenses,
      savingsAccount?.balance || 0,
      30 // Default age
    );
  }, [stats.monthlyExpenses]);

  const handleAdviceAction = (advice: Advice) => {
    console.log('Action for advice:', advice.id, advice.action);
    // TODO: Implement advice actions
  };

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Financial Advice
        </h1>
        <p className="text-gray-500 dark:text-gray-400">
          Personalized insights and recommendations for your finances
        </p>
      </div>

      {/* Quick advice cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {mockAdvice.map((advice) => (
          <AdviceCard key={advice.id} advice={advice} onAction={handleAdviceAction} />
        ))}
      </div>

      {/* Budget Analysis */}
      <BudgetSuggestions
        needs={budgetSuggestions.needs}
        wants={budgetSuggestions.wants}
        savings={budgetSuggestions.savings}
        totalIncome={stats.monthlyIncome}
      />

      {/* Investment Tips */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Investment Insights
        </h2>
        <InvestmentTips
          emergencyFund={investmentTips.emergencyFund}
          debtStrategy={investmentTips.debtStrategy}
          allocation={investmentTips.allocation}
        />
      </div>

      {/* AI Insights Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
            <CardTitle>AI-Powered Insights</CardTitle>
          </div>
        </CardHeader>
        <div className="space-y-4">
          <div className="p-4 bg-gradient-to-r from-primary-50 to-accent-50 dark:from-primary-900/20 dark:to-accent-900/20 rounded-lg">
            <h4 className="font-medium text-gray-900 dark:text-white mb-2">
              Spending Pattern Analysis
            </h4>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Based on your spending patterns over the last 3 months, you tend to spend more on dining
              out during weekends. Consider meal prepping on Sundays to reduce this expense by up to 40%.
            </p>
          </div>
          <div className="p-4 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-lg">
            <h4 className="font-medium text-gray-900 dark:text-white mb-2">
              Savings Opportunity
            </h4>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Your subscription services total $127/month. We found 3 overlapping services that could be
              consolidated, potentially saving you $45/month.
            </p>
          </div>
          <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-lg">
            <h4 className="font-medium text-gray-900 dark:text-white mb-2">
              Investment Opportunity
            </h4>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              With your current savings rate and emergency fund status, you could consider allocating
              $500/month to low-cost index funds for long-term growth.
            </p>
          </div>
        </div>
        <p className="mt-4 text-xs text-gray-500 dark:text-gray-400">
          Powered by AI. Always consult a financial advisor for personalized investment advice.
        </p>
      </Card>

      {/* Disclaimer */}
      <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
        <p className="text-xs text-gray-500 dark:text-gray-400">
          <strong>Disclaimer:</strong> The advice and recommendations provided are for informational
          purposes only and do not constitute financial, investment, or tax advice. Always consult
          with a qualified financial advisor before making any financial decisions.
        </p>
      </div>
    </div>
  );
}
