import { render, screen } from '@testing-library/react';
import TransactionItem from '@/components/transactions/TransactionItem';
import type { Transaction } from '@/types';

// Mock the Table components
jest.mock('@/components/ui/Table', () => ({
  TableRow: ({ children, ...props }: any) => <tr {...props}>{children}</tr>,
  TableCell: ({ children, className, ...props }: any) => (
    <td className={className} {...props}>{children}</td>
  ),
}));

const baseTransaction: Transaction = {
  id: 'txn-1',
  userId: 'user-123',
  accountId: 'acc-1',
  amount: 150.0,
  type: 'EXPENSE',
  category: 'Food & Dining',
  merchant: 'Whole Foods',
  description: 'Weekly groceries',
  date: new Date('2024-01-14'),
  categoryConfidence: 85,
  categorySource: 'keyword',
  createdAt: new Date('2024-01-14'),
  account: {
    id: 'acc-1',
    userId: 'user-123',
    name: 'Checking Account',
    type: 'CHECKING',
    balance: 5000,
    institution: 'Chase',
    lastSynced: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
};

describe('TransactionItem - Recurring Badge', () => {
  it('should display recurring badge when recurringInfo is present', () => {
    const transaction: Transaction = {
      ...baseTransaction,
      recurringInfo: {
        frequency: 'MONTHLY',
        merchantName: 'Whole Foods',
      },
    };

    const { container } = render(
      <table><tbody>
        <TransactionItem transaction={transaction} />
      </tbody></table>
    );

    expect(screen.getByText('Monthly')).toBeInTheDocument();
  });

  it('should not display recurring badge when recurringInfo is null', () => {
    const transaction: Transaction = {
      ...baseTransaction,
      recurringInfo: null,
    };

    const { container } = render(
      <table><tbody>
        <TransactionItem transaction={transaction} />
      </tbody></table>
    );

    expect(screen.queryByText('Monthly')).not.toBeInTheDocument();
    expect(screen.queryByText('Weekly')).not.toBeInTheDocument();
    expect(screen.queryByText('Biweekly')).not.toBeInTheDocument();
    expect(screen.queryByText('Quarterly')).not.toBeInTheDocument();
    expect(screen.queryByText('Annual')).not.toBeInTheDocument();
  });

  it('should not display recurring badge when recurringInfo is undefined', () => {
    const transaction: Transaction = {
      ...baseTransaction,
    };

    const { container } = render(
      <table><tbody>
        <TransactionItem transaction={transaction} />
      </tbody></table>
    );

    expect(screen.queryByText('Monthly')).not.toBeInTheDocument();
  });

  it('should display correct frequency text for WEEKLY', () => {
    const transaction: Transaction = {
      ...baseTransaction,
      recurringInfo: {
        frequency: 'WEEKLY',
        merchantName: 'Whole Foods',
      },
    };

    render(
      <table><tbody>
        <TransactionItem transaction={transaction} />
      </tbody></table>
    );

    expect(screen.getByText('Weekly')).toBeInTheDocument();
  });

  it('should display correct frequency text for BIWEEKLY', () => {
    const transaction: Transaction = {
      ...baseTransaction,
      recurringInfo: {
        frequency: 'BIWEEKLY',
        merchantName: 'Whole Foods',
      },
    };

    render(
      <table><tbody>
        <TransactionItem transaction={transaction} />
      </tbody></table>
    );

    expect(screen.getByText('Biweekly')).toBeInTheDocument();
  });

  it('should display correct frequency text for QUARTERLY', () => {
    const transaction: Transaction = {
      ...baseTransaction,
      recurringInfo: {
        frequency: 'QUARTERLY',
        merchantName: 'Whole Foods',
      },
    };

    render(
      <table><tbody>
        <TransactionItem transaction={transaction} />
      </tbody></table>
    );

    expect(screen.getByText('Quarterly')).toBeInTheDocument();
  });

  it('should display correct frequency text for ANNUAL', () => {
    const transaction: Transaction = {
      ...baseTransaction,
      recurringInfo: {
        frequency: 'ANNUAL',
        merchantName: 'Whole Foods',
      },
    };

    render(
      <table><tbody>
        <TransactionItem transaction={transaction} />
      </tbody></table>
    );

    expect(screen.getByText('Annual')).toBeInTheDocument();
  });

  it('should apply purple styling to recurring badge', () => {
    const transaction: Transaction = {
      ...baseTransaction,
      recurringInfo: {
        frequency: 'MONTHLY',
        merchantName: 'Whole Foods',
      },
    };

    render(
      <table><tbody>
        <TransactionItem transaction={transaction} />
      </tbody></table>
    );

    const badge = screen.getByText('Monthly');
    expect(badge).toHaveClass('bg-purple-100');
    expect(badge).toHaveClass('text-purple-700');
  });

  it('should still render merchant name alongside recurring badge', () => {
    const transaction: Transaction = {
      ...baseTransaction,
      recurringInfo: {
        frequency: 'MONTHLY',
        merchantName: 'Whole Foods',
      },
    };

    render(
      <table><tbody>
        <TransactionItem transaction={transaction} />
      </tbody></table>
    );

    expect(screen.getByText('Whole Foods')).toBeInTheDocument();
    expect(screen.getByText('Monthly')).toBeInTheDocument();
  });

  it('should render category badge alongside recurring badge', () => {
    const transaction: Transaction = {
      ...baseTransaction,
      recurringInfo: {
        frequency: 'MONTHLY',
        merchantName: 'Whole Foods',
      },
    };

    render(
      <table><tbody>
        <TransactionItem transaction={transaction} />
      </tbody></table>
    );

    expect(screen.getByText('Food & Dining')).toBeInTheDocument();
    expect(screen.getByText('Monthly')).toBeInTheDocument();
  });
});
