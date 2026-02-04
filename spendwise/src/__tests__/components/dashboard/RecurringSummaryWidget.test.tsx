import { render, screen } from '@testing-library/react';
import { useSelector } from 'react-redux';
import { useQuery } from '@apollo/client/react';
import RecurringSummaryWidget from '@/components/dashboard/RecurringSummaryWidget';

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

const mockSummary = {
  totalRecurringExpenses: 850.50,
  totalRecurringIncome: 5000,
  netRecurring: 4149.50,
  activeCount: 8,
  incomeRatio: 17.01,
};

describe('RecurringSummaryWidget', () => {
  beforeEach(() => {
    (useSelector as unknown as jest.Mock).mockReturnValue(false); // not demo
  });

  it('should show loading spinner while loading', () => {
    (useQuery as jest.Mock).mockReturnValue({
      data: undefined,
      loading: true,
      error: undefined,
      refetch: jest.fn(),
    });

    render(<RecurringSummaryWidget />);

    expect(screen.getByTestId('spinner')).toBeInTheDocument();
  });

  it('should show error state on error', () => {
    (useQuery as jest.Mock).mockReturnValue({
      data: undefined,
      loading: false,
      error: new Error('Network error'),
      refetch: jest.fn(),
    });

    render(<RecurringSummaryWidget />);

    expect(screen.getByText('Unable to load recurring data')).toBeInTheDocument();
    expect(screen.getByText('View Details →')).toBeInTheDocument();
  });

  it('should show demo state when in demo mode', () => {
    (useSelector as unknown as jest.Mock).mockReturnValue(true); // demo mode

    (useQuery as jest.Mock).mockReturnValue({
      data: undefined,
      loading: false,
      error: undefined,
      refetch: jest.fn(),
    });

    render(<RecurringSummaryWidget />);

    expect(screen.getByText('No recurring transactions detected')).toBeInTheDocument();
  });

  it('should show empty state when no summary data', () => {
    (useQuery as jest.Mock).mockReturnValue({
      data: { recurringSummary: null },
      loading: false,
      error: undefined,
      refetch: jest.fn(),
    });

    render(<RecurringSummaryWidget />);

    expect(screen.getByText('No recurring transactions detected')).toBeInTheDocument();
  });

  it('should render summary data correctly', () => {
    (useQuery as jest.Mock).mockReturnValue({
      data: { recurringSummary: mockSummary },
      loading: false,
      error: undefined,
      refetch: jest.fn(),
    });

    render(<RecurringSummaryWidget />);

    expect(screen.getByText('Recurring Bills')).toBeInTheDocument();
    expect(screen.getByText('8 active')).toBeInTheDocument();
    expect(screen.getByText('Monthly Expenses')).toBeInTheDocument();
    expect(screen.getByText('Monthly Income')).toBeInTheDocument();
    expect(screen.getByText('Net Recurring')).toBeInTheDocument();
  });

  it('should display formatted currency amounts', () => {
    (useQuery as jest.Mock).mockReturnValue({
      data: { recurringSummary: mockSummary },
      loading: false,
      error: undefined,
      refetch: jest.fn(),
    });

    render(<RecurringSummaryWidget />);

    expect(screen.getByText('-$850.50')).toBeInTheDocument();
    expect(screen.getByText('+$5,000.00')).toBeInTheDocument();
    expect(screen.getByText('+$4,149.50')).toBeInTheDocument();
  });

  it('should show negative net recurring with red styling', () => {
    const negativeSummary = {
      ...mockSummary,
      netRecurring: -500,
    };

    (useQuery as jest.Mock).mockReturnValue({
      data: { recurringSummary: negativeSummary },
      loading: false,
      error: undefined,
      refetch: jest.fn(),
    });

    const { container } = render(<RecurringSummaryWidget />);

    expect(screen.getByText('-$500.00')).toBeInTheDocument();
    // Net recurring text should have red styling
    const netElement = container.querySelector('.text-red-600');
    expect(netElement).toBeInTheDocument();
  });

  it('should show positive net recurring with green styling', () => {
    (useQuery as jest.Mock).mockReturnValue({
      data: { recurringSummary: mockSummary },
      loading: false,
      error: undefined,
      refetch: jest.fn(),
    });

    const { container } = render(<RecurringSummaryWidget />);

    // Positive net should show green
    const netElement = container.querySelector('.text-green-600');
    expect(netElement).toBeInTheDocument();
  });

  it('should link to recurring page', () => {
    (useQuery as jest.Mock).mockReturnValue({
      data: { recurringSummary: mockSummary },
      loading: false,
      error: undefined,
      refetch: jest.fn(),
    });

    render(<RecurringSummaryWidget />);

    expect(screen.getByText('Manage Recurring →').closest('a')).toHaveAttribute('href', '/recurring');
  });

  it('should link to recurring page in error state', () => {
    (useQuery as jest.Mock).mockReturnValue({
      data: undefined,
      loading: false,
      error: new Error('Error'),
      refetch: jest.fn(),
    });

    render(<RecurringSummaryWidget />);

    expect(screen.getByText('View Details →').closest('a')).toHaveAttribute('href', '/recurring');
  });
});
