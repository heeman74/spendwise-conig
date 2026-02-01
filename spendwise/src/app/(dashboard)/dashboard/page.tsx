'use client';

import { useEffect, useMemo } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useSelector } from 'react-redux';
import StatsCard from '@/components/dashboard/StatsCard';
import RecentTransactions from '@/components/dashboard/RecentTransactions';
import SpendingOverview from '@/components/dashboard/SpendingOverview';
import QuickActions from '@/components/dashboard/QuickActions';
import TrendLineChart from '@/components/charts/TrendLineChart';
import Card, { CardHeader, CardTitle } from '@/components/ui/Card';
import Spinner from '@/components/ui/Spinner';
import { useDashboardStats } from '@/hooks/useDashboard';
import { getDashboardStats, getTrendData, mockTransactions } from '@/data/mockData';

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const isDemo = useSelector((state: any) => state.auth.isDemo);

  // Skip GraphQL query when in demo mode
  const { stats, loading, error } = useDashboardStats({ skip: isDemo });

  // Get mock data for demo mode
  const mockStats = useMemo(() => {
    if (!isDemo) return null;
    const stats = getDashboardStats();
    return {
      ...stats,
      recentTransactions: mockTransactions.slice(0, 5),
    };
  }, [isDemo]);

  // Redirect to login if not authenticated and not in demo mode
  useEffect(() => {
    if (!isDemo && status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router, isDemo]);

  // Check if user needs to re-login (missing accessToken)
  useEffect(() => {
    if (!isDemo && session && !session.accessToken) {
      // Session exists but no accessToken - need to re-login
      router.push('/login?error=session_expired');
    }
  }, [session, router, isDemo]);

  // Show loading while checking session (only for non-demo mode)
  if (!isDemo && status === 'loading') {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Spinner size="lg" />
      </div>
    );
  }

  // Don't render if not authenticated (only for non-demo mode)
  if (!isDemo && (status === 'unauthenticated' || (session && !session.accessToken))) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Spinner size="lg" />
      </div>
    );
  }

  // Show loading only for non-demo mode when fetching data
  if (!isDemo && loading && !stats) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Spinner size="lg" />
      </div>
    );
  }

  // Handle errors only for non-demo mode
  if (!isDemo && error) {
    // Check if it's an auth error
    const graphQLErrors = 'graphQLErrors' in error ? (error as any).graphQLErrors : [];
    const isAuthError = graphQLErrors?.some(
      (e: any) => e.extensions?.code === 'UNAUTHENTICATED'
    );

    if (isAuthError) {
      router.push('/login?error=session_expired');
      return (
        <div className="flex items-center justify-center min-h-[400px]">
          <Spinner size="lg" />
        </div>
      );
    }

    return (
      <div className="text-center py-12">
        <p className="text-red-500">Failed to load dashboard data. Please try again.</p>
        <p className="text-gray-500 text-sm mt-2">{error.message}</p>
      </div>
    );
  }

  // Use mock data for demo mode, otherwise use GraphQL data
  const dashboardStats = isDemo ? mockStats : (stats || {
    totalBalance: 0,
    monthlyIncome: 0,
    monthlyExpenses: 0,
    savingsRate: 0,
    topCategories: [],
    recentTransactions: [],
  });

  // Transform top categories for spending overview
  const spendingData = dashboardStats.topCategories?.map((cat: { category: string; amount: number; percentage: number; color: string }) => ({
    category: cat.category,
    amount: cat.amount,
    percentage: cat.percentage,
    color: cat.color,
  })) || [];

  // Use mock trend data for demo mode, otherwise compute from dashboard stats
  const trendData = isDemo ? getTrendData() : {
    labels: ['Week 1', 'Week 2', 'Week 3', 'Week 4'],
    income: [dashboardStats.monthlyIncome * 0.2, dashboardStats.monthlyIncome * 0.25, dashboardStats.monthlyIncome * 0.25, dashboardStats.monthlyIncome * 0.3],
    expenses: [dashboardStats.monthlyExpenses * 0.22, dashboardStats.monthlyExpenses * 0.28, dashboardStats.monthlyExpenses * 0.24, dashboardStats.monthlyExpenses * 0.26],
    savings: [
      (dashboardStats.monthlyIncome * 0.2) - (dashboardStats.monthlyExpenses * 0.22),
      (dashboardStats.monthlyIncome * 0.25) - (dashboardStats.monthlyExpenses * 0.28),
      (dashboardStats.monthlyIncome * 0.25) - (dashboardStats.monthlyExpenses * 0.24),
      (dashboardStats.monthlyIncome * 0.3) - (dashboardStats.monthlyExpenses * 0.26),
    ],
  };

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
        <p className="text-gray-500 dark:text-gray-400">
          Welcome back! Here&apos;s your financial overview.
        </p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          title="Total Balance"
          value={dashboardStats.totalBalance}
          icon={
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        />
        <StatsCard
          title="Monthly Income"
          value={dashboardStats.monthlyIncome}
          icon={
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
          }
        />
        <StatsCard
          title="Monthly Expenses"
          value={dashboardStats.monthlyExpenses}
          icon={
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
            </svg>
          }
        />
        <StatsCard
          title="Savings Rate"
          value={dashboardStats.savingsRate}
          format="percentage"
          icon={
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          }
        />
      </div>

      {/* Charts and transactions grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Spending overview - 2 columns */}
        <div className="lg:col-span-2">
          <SpendingOverview
            data={spendingData}
            totalSpending={dashboardStats.monthlyExpenses}
            period="This Month"
          />
        </div>

        {/* Quick actions */}
        <div>
          <QuickActions />
        </div>
      </div>

      {/* Trends chart */}
      <Card>
        <CardHeader>
          <CardTitle>Income vs Expenses Trend</CardTitle>
        </CardHeader>
        <TrendLineChart data={trendData} />
      </Card>

      {/* Recent transactions */}
      <RecentTransactions transactions={dashboardStats.recentTransactions || []} />
    </div>
  );
}
