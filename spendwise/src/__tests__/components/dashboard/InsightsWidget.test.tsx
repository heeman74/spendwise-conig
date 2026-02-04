import { render, screen } from '@testing-library/react';
import { useSelector } from 'react-redux';
import { useQuery } from '@apollo/client/react';
import InsightsWidget from '@/components/dashboard/InsightsWidget';

// Mock Card component
jest.mock('@/components/ui/Card', () => {
  const MockCard = ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div data-testid="card" className={className}>{children}</div>
  );
  MockCard.displayName = 'MockCard';

  const MockCardHeader = ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div data-testid="card-header" className={className}>{children}</div>
  );
  MockCardHeader.displayName = 'MockCardHeader';

  const MockCardTitle = ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <h3 data-testid="card-title" className={className}>{children}</h3>
  );
  MockCardTitle.displayName = 'MockCardTitle';

  return {
    __esModule: true,
    default: MockCard,
    CardHeader: MockCardHeader,
    CardTitle: MockCardTitle,
  };
});

// Mock Spinner
jest.mock('@/components/ui/Spinner', () => {
  const MockSpinner = ({ size }: { size?: string }) => (
    <div data-testid="spinner" data-size={size}>Loading...</div>
  );
  MockSpinner.displayName = 'MockSpinner';
  return { __esModule: true, default: MockSpinner };
});

// Mock next/link
jest.mock('next/link', () => {
  const MockLink = ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  );
  MockLink.displayName = 'MockLink';
  return { __esModule: true, default: MockLink };
});

// Mock InsightCard
jest.mock('@/components/planning/InsightCard', () => {
  const MockInsightCard = ({ title, content, insightType, priority, onAskAbout }: any) => (
    <div data-testid="insight-card">
      <span>{title}</span>
      <span>{content}</span>
      <button onClick={() => onAskAbout(title)}>Ask about this →</button>
    </div>
  );
  MockInsightCard.displayName = 'MockInsightCard';
  return { __esModule: true, default: MockInsightCard };
});

const mockInsights = [
  {
    id: 'ins-1',
    insightType: 'spending_anomaly',
    title: 'High Dining Spending',
    content: 'Your dining spending is 40% above average this month.',
    priority: 2,
  },
  {
    id: 'ins-2',
    insightType: 'savings_opportunity',
    title: 'Subscription Savings',
    content: 'You could save $50/month by consolidating subscriptions.',
    priority: 3,
  },
  {
    id: 'ins-3',
    insightType: 'investment_observation',
    title: 'Portfolio Rebalance',
    content: 'Your portfolio allocation has drifted from target.',
    priority: 4,
  },
];

const mockRouterPush = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockRouterPush,
    replace: jest.fn(),
    prefetch: jest.fn(),
    back: jest.fn(),
    forward: jest.fn(),
  }),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
}));

describe('InsightsWidget', () => {
  beforeEach(() => {
    (useSelector as unknown as jest.Mock).mockReturnValue(false); // not demo
    mockRouterPush.mockClear();
  });

  it('should show loading spinner while loading', () => {
    (useQuery as jest.Mock).mockReturnValue({
      data: undefined,
      loading: true,
      error: undefined,
      refetch: jest.fn(),
    });

    render(<InsightsWidget />);

    expect(screen.getByTestId('spinner')).toBeInTheDocument();
  });

  it('should show error state on error', () => {
    (useQuery as jest.Mock).mockReturnValue({
      data: undefined,
      loading: false,
      error: new Error('Network error'),
      refetch: jest.fn(),
    });

    render(<InsightsWidget />);

    expect(screen.getByText('Unable to load insights')).toBeInTheDocument();
  });

  it('should show demo empty state when in demo mode', () => {
    (useSelector as unknown as jest.Mock).mockReturnValue(true); // demo

    (useQuery as jest.Mock).mockReturnValue({
      data: undefined,
      loading: false,
      error: undefined,
      refetch: jest.fn(),
    });

    render(<InsightsWidget />);

    expect(screen.getByText('No insights available yet')).toBeInTheDocument();
    expect(screen.getByText('Go to Financial Planning →')).toBeInTheDocument();
  });

  it('should show empty state when no insights', () => {
    (useQuery as jest.Mock).mockReturnValue({
      data: { activeInsights: [] },
      loading: false,
      error: undefined,
      refetch: jest.fn(),
    });

    render(<InsightsWidget />);

    expect(screen.getByText('No insights available yet')).toBeInTheDocument();
  });

  it('should render insight cards', () => {
    (useQuery as jest.Mock).mockReturnValue({
      data: { activeInsights: mockInsights },
      loading: false,
      error: undefined,
      refetch: jest.fn(),
    });

    render(<InsightsWidget />);

    expect(screen.getByText('High Dining Spending')).toBeInTheDocument();
    expect(screen.getByText('Subscription Savings')).toBeInTheDocument();
  });

  it('should limit to 2 insights', () => {
    (useQuery as jest.Mock).mockReturnValue({
      data: { activeInsights: mockInsights },
      loading: false,
      error: undefined,
      refetch: jest.fn(),
    });

    render(<InsightsWidget />);

    const insightCards = screen.getAllByTestId('insight-card');
    expect(insightCards).toHaveLength(2);
    expect(screen.queryByText('Portfolio Rebalance')).not.toBeInTheDocument();
  });

  it('should render title and View All link', () => {
    (useQuery as jest.Mock).mockReturnValue({
      data: { activeInsights: mockInsights },
      loading: false,
      error: undefined,
      refetch: jest.fn(),
    });

    render(<InsightsWidget />);

    expect(screen.getByText('AI Insights')).toBeInTheDocument();
    const viewAllLink = screen.getByText('View All Insights →');
    expect(viewAllLink.closest('a')).toHaveAttribute('href', '/planning');
  });

  it('should navigate to planning on Ask About click', () => {
    (useQuery as jest.Mock).mockReturnValue({
      data: { activeInsights: mockInsights },
      loading: false,
      error: undefined,
      refetch: jest.fn(),
    });

    render(<InsightsWidget />);

    const askButtons = screen.getAllByText('Ask about this →');
    askButtons[0].click();

    expect(mockRouterPush).toHaveBeenCalledWith(
      '/planning?ask=High%20Dining%20Spending'
    );
  });

  it('should link to planning page in empty state', () => {
    (useQuery as jest.Mock).mockReturnValue({
      data: { activeInsights: [] },
      loading: false,
      error: undefined,
      refetch: jest.fn(),
    });

    render(<InsightsWidget />);

    const link = screen.getByText('Go to Financial Planning →');
    expect(link.closest('a')).toHaveAttribute('href', '/planning');
  });

  it('should not show loading when insights are already loaded', () => {
    (useQuery as jest.Mock).mockReturnValue({
      data: { activeInsights: mockInsights },
      loading: true, // still loading but has data
      error: undefined,
      refetch: jest.fn(),
    });

    render(<InsightsWidget />);

    expect(screen.queryByTestId('spinner')).not.toBeInTheDocument();
    expect(screen.getByText('High Dining Spending')).toBeInTheDocument();
  });
});
