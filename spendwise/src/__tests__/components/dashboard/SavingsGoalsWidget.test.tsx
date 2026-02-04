import { render, screen } from '@testing-library/react';
import SavingsGoalsWidget from '@/components/dashboard/SavingsGoalsWidget';

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

// Mock next/link
jest.mock('next/link', () => {
  const MockLink = ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  );
  MockLink.displayName = 'MockLink';
  return { __esModule: true, default: MockLink };
});

const mockGoals = [
  {
    id: 'goal-1',
    userId: 'user-1',
    name: 'Emergency Fund',
    targetAmount: 20000,
    currentAmount: 15000,
    deadline: new Date('2025-12-31'),
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-15'),
  },
  {
    id: 'goal-2',
    userId: 'user-1',
    name: 'Vacation Fund',
    targetAmount: 5000,
    currentAmount: 2500,
    deadline: new Date('2025-06-01'),
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-15'),
  },
  {
    id: 'goal-3',
    userId: 'user-1',
    name: 'New Car',
    targetAmount: 30000,
    currentAmount: 8000,
    deadline: new Date('2027-12-31'),
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-15'),
  },
];

describe('SavingsGoalsWidget', () => {
  it('should render empty state when no goals', () => {
    render(<SavingsGoalsWidget goals={[]} />);

    expect(screen.getByText('No savings goals yet')).toBeInTheDocument();
    expect(screen.getByText('Create a goal →')).toBeInTheDocument();
  });

  it('should render empty state for undefined goals', () => {
    render(<SavingsGoalsWidget goals={undefined as any} />);

    expect(screen.getByText('No savings goals yet')).toBeInTheDocument();
  });

  it('should render the title', () => {
    render(<SavingsGoalsWidget goals={mockGoals} />);

    expect(screen.getByText('Savings Goals')).toBeInTheDocument();
  });

  it('should render View All link', () => {
    render(<SavingsGoalsWidget goals={mockGoals} />);

    const viewAllLink = screen.getByText('View All →');
    expect(viewAllLink).toBeInTheDocument();
    expect(viewAllLink.closest('a')).toHaveAttribute('href', '/savings');
  });

  it('should render goal names', () => {
    render(<SavingsGoalsWidget goals={mockGoals} />);

    expect(screen.getByText('Emergency Fund')).toBeInTheDocument();
    expect(screen.getByText('Vacation Fund')).toBeInTheDocument();
    expect(screen.getByText('New Car')).toBeInTheDocument();
  });

  it('should render current and target amounts', () => {
    render(<SavingsGoalsWidget goals={mockGoals} />);

    expect(screen.getByText('$15,000.00')).toBeInTheDocument();
    expect(screen.getByText('$20,000.00')).toBeInTheDocument();
    expect(screen.getByText('$2,500.00')).toBeInTheDocument();
    expect(screen.getByText('$5,000.00')).toBeInTheDocument();
  });

  it('should display days remaining for goals with deadlines', () => {
    render(<SavingsGoalsWidget goals={mockGoals} />);

    // Each goal has a deadline, so should show days left
    const daysElements = screen.getAllByText(/\d+d left/);
    expect(daysElements.length).toBeGreaterThan(0);
  });

  it('should show "No deadline" for goals without deadline', () => {
    const goalsWithoutDeadline = [
      { ...mockGoals[0], deadline: null },
    ];

    render(<SavingsGoalsWidget goals={goalsWithoutDeadline} />);

    expect(screen.getByText('No deadline')).toBeInTheDocument();
  });

  it('should limit display to 3 goals', () => {
    const manyGoals = [
      ...mockGoals,
      {
        id: 'goal-4',
        userId: 'user-1',
        name: 'Fourth Goal',
        targetAmount: 10000,
        currentAmount: 1000,
        deadline: new Date('2026-01-01'),
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-15'),
      },
    ];

    render(<SavingsGoalsWidget goals={manyGoals} />);

    expect(screen.getByText('Emergency Fund')).toBeInTheDocument();
    expect(screen.getByText('Vacation Fund')).toBeInTheDocument();
    expect(screen.getByText('New Car')).toBeInTheDocument();
    expect(screen.queryByText('Fourth Goal')).not.toBeInTheDocument();
  });

  it('should render progress bars', () => {
    const { container } = render(<SavingsGoalsWidget goals={mockGoals} />);

    // Progress bars should have width style based on percentage
    const progressBars = container.querySelectorAll('[style*="width"]');
    expect(progressBars.length).toBe(3);
  });

  it('should handle goal with 100% progress', () => {
    const completedGoal = [
      { ...mockGoals[0], currentAmount: 25000, targetAmount: 20000 },
    ];

    const { container } = render(<SavingsGoalsWidget goals={completedGoal} />);

    // Progress should be capped at 100%
    const progressBar = container.querySelector('[style*="width"]');
    expect(progressBar).toHaveStyle({ width: '100%' });
  });

  it('should handle goal with zero target amount', () => {
    const zeroTarget = [
      { ...mockGoals[0], targetAmount: 0 },
    ];

    const { container } = render(<SavingsGoalsWidget goals={zeroTarget} />);

    // Progress should be 0% when target is 0
    const progressBar = container.querySelector('[style*="width"]');
    expect(progressBar).toHaveStyle({ width: '0%' });
  });

  it('should link to savings page in empty state', () => {
    render(<SavingsGoalsWidget goals={[]} />);

    const link = screen.getByText('Create a goal →');
    expect(link.closest('a')).toHaveAttribute('href', '/savings');
  });
});
