import { render, screen } from '@testing-library/react';
import ImportResult from '@/components/import/ImportResult';

// Mock next/link
jest.mock('next/link', () => {
  return ({ children, href, ...props }: any) => (
    <a href={href} {...props}>{children}</a>
  );
});

describe('ImportResult - Recurring Patterns', () => {
  const baseResult = {
    transactionsImported: 25,
    duplicatesSkipped: 3,
    accountId: 'acc-1',
  };

  const onImportAnother = jest.fn();

  it('should display recurring patterns section when patterns are detected', () => {
    const result = {
      ...baseResult,
      recurringPatternsDetected: [
        { merchantName: 'Netflix', frequency: 'MONTHLY', averageAmount: 15.99 },
        { merchantName: 'Spotify', frequency: 'MONTHLY', averageAmount: 9.99 },
      ],
    };

    render(<ImportResult result={result} onImportAnother={onImportAnother} />);

    expect(screen.getByText(/2 recurring patterns detected/)).toBeInTheDocument();
    expect(screen.getByText('Netflix')).toBeInTheDocument();
    expect(screen.getByText('Spotify')).toBeInTheDocument();
  });

  it('should not display recurring patterns section when array is empty', () => {
    const result = {
      ...baseResult,
      recurringPatternsDetected: [],
    };

    render(<ImportResult result={result} onImportAnother={onImportAnother} />);

    expect(screen.queryByText(/recurring pattern/)).not.toBeInTheDocument();
  });

  it('should not display recurring patterns section when property is undefined', () => {
    render(<ImportResult result={baseResult} onImportAnother={onImportAnother} />);

    expect(screen.queryByText(/recurring pattern/)).not.toBeInTheDocument();
  });

  it('should display frequency and average amount for each pattern', () => {
    const result = {
      ...baseResult,
      recurringPatternsDetected: [
        { merchantName: 'Netflix', frequency: 'MONTHLY', averageAmount: 15.99 },
      ],
    };

    render(<ImportResult result={result} onImportAnother={onImportAnother} />);

    // Should show "Monthly" (title-cased from "MONTHLY")
    expect(screen.getByText(/Monthly/)).toBeInTheDocument();
    // Should show formatted amount
    expect(screen.getByText(/\$15\.99/)).toBeInTheDocument();
  });

  it('should use singular text for 1 pattern', () => {
    const result = {
      ...baseResult,
      recurringPatternsDetected: [
        { merchantName: 'Netflix', frequency: 'MONTHLY', averageAmount: 15.99 },
      ],
    };

    render(<ImportResult result={result} onImportAnother={onImportAnother} />);

    expect(screen.getByText('1 recurring pattern detected')).toBeInTheDocument();
  });

  it('should use plural text for multiple patterns', () => {
    const result = {
      ...baseResult,
      recurringPatternsDetected: [
        { merchantName: 'Netflix', frequency: 'MONTHLY', averageAmount: 15.99 },
        { merchantName: 'Spotify', frequency: 'MONTHLY', averageAmount: 9.99 },
        { merchantName: 'AWS', frequency: 'MONTHLY', averageAmount: 49.99 },
      ],
    };

    render(<ImportResult result={result} onImportAnother={onImportAnother} />);

    expect(screen.getByText('3 recurring patterns detected')).toBeInTheDocument();
  });

  it('should still display transaction count and duplicates info', () => {
    const result = {
      ...baseResult,
      recurringPatternsDetected: [
        { merchantName: 'Netflix', frequency: 'MONTHLY', averageAmount: 15.99 },
      ],
    };

    render(<ImportResult result={result} onImportAnother={onImportAnother} />);

    expect(screen.getByText('25')).toBeInTheDocument();
    expect(screen.getByText(/imported successfully/)).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
    expect(screen.getByText(/duplicate.*skipped/)).toBeInTheDocument();
  });

  it('should still show action buttons with patterns', () => {
    const result = {
      ...baseResult,
      recurringPatternsDetected: [
        { merchantName: 'Netflix', frequency: 'MONTHLY', averageAmount: 15.99 },
      ],
    };

    render(<ImportResult result={result} onImportAnother={onImportAnother} />);

    expect(screen.getByText('View Transactions')).toBeInTheDocument();
    expect(screen.getByText('Import Another')).toBeInTheDocument();
  });

  it('should handle different frequency types', () => {
    const result = {
      ...baseResult,
      recurringPatternsDetected: [
        { merchantName: 'Gym Pass', frequency: 'WEEKLY', averageAmount: 5.0 },
        { merchantName: 'Rent', frequency: 'MONTHLY', averageAmount: 2000.0 },
        { merchantName: 'Insurance', frequency: 'QUARTERLY', averageAmount: 300.0 },
      ],
    };

    render(<ImportResult result={result} onImportAnother={onImportAnother} />);

    expect(screen.getByText(/Weekly/)).toBeInTheDocument();
    expect(screen.getByText(/Monthly/)).toBeInTheDocument();
    expect(screen.getByText(/Quarterly/)).toBeInTheDocument();
  });
});
