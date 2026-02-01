import { render, screen } from '@testing-library/react';
import StatsCard from '@/components/dashboard/StatsCard';

// Mock the Card component
jest.mock('@/components/ui/Card', () => {
  const MockCard = ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div data-testid="card" className={className}>
      {children}
    </div>
  );
  MockCard.displayName = 'MockCard';
  return MockCard;
});

const mockIcon = <svg data-testid="icon" />;

describe('StatsCard', () => {
  it('should render title and value', () => {
    render(<StatsCard title="Total Balance" value={5000} icon={mockIcon} />);

    expect(screen.getByText('Total Balance')).toBeInTheDocument();
    expect(screen.getByText('$5,000.00')).toBeInTheDocument();
  });

  it('should format value as currency by default', () => {
    render(<StatsCard title="Balance" value={1234.56} icon={mockIcon} />);

    expect(screen.getByText('$1,234.56')).toBeInTheDocument();
  });

  it('should format value as percentage when format is percentage', () => {
    render(
      <StatsCard title="Savings Rate" value={25.5} icon={mockIcon} format="percentage" />
    );

    expect(screen.getByText('25.5%')).toBeInTheDocument();
  });

  it('should format value as number when format is number', () => {
    render(
      <StatsCard title="Transactions" value={1500} icon={mockIcon} format="number" />
    );

    expect(screen.getByText('1,500')).toBeInTheDocument();
  });

  it('should render the icon', () => {
    render(<StatsCard title="Test" value={100} icon={mockIcon} />);

    expect(screen.getByTestId('icon')).toBeInTheDocument();
  });

  it('should render change indicator when change is provided', () => {
    render(
      <StatsCard title="Balance" value={5000} icon={mockIcon} change={10.5} />
    );

    // Change is formatted with + prefix for positive values
    expect(screen.getByText('+10.5%')).toBeInTheDocument();
  });

  it('should render change label when provided', () => {
    render(
      <StatsCard
        title="Balance"
        value={5000}
        icon={mockIcon}
        change={10.5}
        changeLabel="vs last month"
      />
    );

    expect(screen.getByText('vs last month')).toBeInTheDocument();
  });

  it('should not render change indicator when change is not provided', () => {
    render(<StatsCard title="Balance" value={5000} icon={mockIcon} />);

    // Check that no percentage element is rendered
    expect(screen.queryByText(/%$/)).not.toBeInTheDocument();
  });

  it('should show up trend arrow for positive change', () => {
    const { container } = render(
      <StatsCard title="Balance" value={5000} icon={mockIcon} change={10} />
    );

    // Check for green color class which indicates up trend
    const changeElement = container.querySelector('.text-green-600');
    expect(changeElement).toBeInTheDocument();
  });

  it('should show down trend arrow for negative change', () => {
    const { container } = render(
      <StatsCard title="Balance" value={5000} icon={mockIcon} change={-5} />
    );

    // Check for red color class which indicates down trend
    const changeElement = container.querySelector('.text-red-600');
    expect(changeElement).toBeInTheDocument();
  });

  it('should show neutral style for zero change', () => {
    const { container } = render(
      <StatsCard title="Balance" value={5000} icon={mockIcon} change={0} />
    );

    // Check for gray color class which indicates neutral trend
    const changeElement = container.querySelector('.text-gray-500');
    expect(changeElement).toBeInTheDocument();
  });

  it('should respect explicit trend prop over calculated trend', () => {
    const { container } = render(
      <StatsCard title="Balance" value={5000} icon={mockIcon} change={10} trend="down" />
    );

    // Even with positive change, should show down trend
    const changeElement = container.querySelector('.text-red-600');
    expect(changeElement).toBeInTheDocument();
  });

  it('should handle large currency values', () => {
    render(<StatsCard title="Balance" value={1000000} icon={mockIcon} />);

    expect(screen.getByText('$1,000,000.00')).toBeInTheDocument();
  });

  it('should handle negative currency values', () => {
    render(<StatsCard title="Debt" value={-500} icon={mockIcon} />);

    expect(screen.getByText('-$500.00')).toBeInTheDocument();
  });

  it('should handle zero value', () => {
    render(<StatsCard title="Balance" value={0} icon={mockIcon} />);

    expect(screen.getByText('$0.00')).toBeInTheDocument();
  });

  it('should handle decimal values correctly', () => {
    render(<StatsCard title="Balance" value={99.99} icon={mockIcon} />);

    expect(screen.getByText('$99.99')).toBeInTheDocument();
  });
});
