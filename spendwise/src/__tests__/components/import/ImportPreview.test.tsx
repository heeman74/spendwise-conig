import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ImportPreview from '@/components/import/ImportPreview';

// Mock the hooks used by ImportPreview
jest.mock('@/hooks/useAccounts', () => ({
  useAccounts: () => ({
    accounts: [
      { id: 'acc-1', name: 'Checking Account', institution: 'Chase', type: 'CHECKING' },
      { id: 'acc-2', name: 'Savings Account', institution: 'Marcus', type: 'SAVINGS' },
    ],
    loading: false,
  }),
}));

jest.mock('@/hooks/useTransactions', () => ({
  useCategories: () => ({
    categories: ['Food & Dining', 'Entertainment', 'Shopping', 'Income'],
    loading: false,
  }),
}));

const mockPreview = {
  importId: 'import-1',
  fileName: 'statement.ofx',
  fileFormat: 'OFX',
  account: {
    institution: 'Chase',
    accountType: 'CHECKING',
    accountName: 'Chase Checking',
    accountMask: '1234',
  },
  totalTransactions: 3,
  duplicateCount: 0,
  warnings: [],
  matchedAccountId: 'acc-1',
  matchedAccountName: 'Checking Account',
  transactions: [
    {
      date: '2024-01-10',
      amount: 15.99,
      description: 'Netflix subscription',
      merchant: 'Netflix',
      cleanedMerchant: 'Netflix',
      type: 'EXPENSE',
      suggestedCategory: 'Entertainment',
      fitId: 'fit-1',
      isDuplicate: false,
      categoryConfidence: 80,
      categorySource: 'keyword',
    },
    {
      date: '2024-01-15',
      amount: 9.99,
      description: 'Spotify subscription',
      merchant: 'Spotify',
      cleanedMerchant: 'Spotify',
      type: 'EXPENSE',
      suggestedCategory: 'Entertainment',
      fitId: 'fit-2',
      isDuplicate: false,
      categoryConfidence: 75,
      categorySource: 'keyword',
    },
    {
      date: '2024-01-20',
      amount: 150.00,
      description: 'Grocery shopping',
      merchant: 'Whole Foods',
      cleanedMerchant: 'Whole Foods',
      type: 'EXPENSE',
      suggestedCategory: 'Food & Dining',
      fitId: 'fit-3',
      isDuplicate: false,
      categoryConfidence: 90,
      categorySource: 'keyword',
    },
  ],
};

describe('ImportPreview - Recurring Column', () => {
  const mockOnConfirm = jest.fn();
  const mockOnCancel = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should display the Recurring column header', () => {
    render(
      <ImportPreview
        preview={mockPreview}
        onConfirm={mockOnConfirm}
        onCancel={mockOnCancel}
        confirming={false}
      />
    );

    expect(screen.getByText('Recurring')).toBeInTheDocument();
  });

  it('should display checkboxes for non-duplicate transactions', () => {
    render(
      <ImportPreview
        preview={mockPreview}
        onConfirm={mockOnConfirm}
        onCancel={mockOnCancel}
        confirming={false}
      />
    );

    const checkboxes = screen.getAllByRole('checkbox').filter(
      (cb) => cb.getAttribute('title') === 'Mark as recurring'
    );
    expect(checkboxes).toHaveLength(3);
  });

  it('should not display recurring checkbox for duplicate transactions', () => {
    const previewWithDuplicate = {
      ...mockPreview,
      duplicateCount: 1,
      transactions: [
        ...mockPreview.transactions,
        {
          date: '2024-01-10',
          amount: 15.99,
          description: 'Netflix subscription (duplicate)',
          merchant: 'Netflix',
          cleanedMerchant: 'Netflix',
          type: 'EXPENSE',
          suggestedCategory: 'Entertainment',
          fitId: 'fit-1-dup',
          isDuplicate: true,
          categoryConfidence: 80,
          categorySource: 'keyword',
        },
      ],
    };

    render(
      <ImportPreview
        preview={previewWithDuplicate}
        onConfirm={mockOnConfirm}
        onCancel={mockOnCancel}
        confirming={false}
      />
    );

    const recurringCheckboxes = screen.getAllByRole('checkbox').filter(
      (cb) => cb.getAttribute('title') === 'Mark as recurring'
    );
    // Only 3 non-duplicate transactions should have recurring checkboxes
    expect(recurringCheckboxes).toHaveLength(3);
  });

  it('should toggle recurring checkbox state', async () => {
    const user = userEvent.setup();

    render(
      <ImportPreview
        preview={mockPreview}
        onConfirm={mockOnConfirm}
        onCancel={mockOnCancel}
        confirming={false}
      />
    );

    const checkboxes = screen.getAllByRole('checkbox').filter(
      (cb) => cb.getAttribute('title') === 'Mark as recurring'
    );

    // Initially unchecked
    expect(checkboxes[0]).not.toBeChecked();

    // Click to check
    await user.click(checkboxes[0]);
    expect(checkboxes[0]).toBeChecked();

    // Click again to uncheck
    await user.click(checkboxes[0]);
    expect(checkboxes[0]).not.toBeChecked();
  });

  it('should pass recurringIndices through onConfirm when transactions are flagged', async () => {
    const user = userEvent.setup();

    render(
      <ImportPreview
        preview={mockPreview}
        onConfirm={mockOnConfirm}
        onCancel={mockOnCancel}
        confirming={false}
      />
    );

    // Check the first and third recurring checkboxes (Netflix and Whole Foods)
    const checkboxes = screen.getAllByRole('checkbox').filter(
      (cb) => cb.getAttribute('title') === 'Mark as recurring'
    );
    await user.click(checkboxes[0]);
    await user.click(checkboxes[2]);

    // Click the import button
    const importButton = screen.getByRole('button', { name: /Import 3 Transactions/i });
    await user.click(importButton);

    expect(mockOnConfirm).toHaveBeenCalledTimes(1);
    const callArgs = mockOnConfirm.mock.calls[0][0];
    expect(callArgs.recurringIndices).toEqual([0, 2]);
  });

  it('should not include recurringIndices when no checkboxes are checked', async () => {
    const user = userEvent.setup();

    render(
      <ImportPreview
        preview={mockPreview}
        onConfirm={mockOnConfirm}
        onCancel={mockOnCancel}
        confirming={false}
      />
    );

    // Click import without checking any recurring boxes
    const importButton = screen.getByRole('button', { name: /Import 3 Transactions/i });
    await user.click(importButton);

    expect(mockOnConfirm).toHaveBeenCalledTimes(1);
    const callArgs = mockOnConfirm.mock.calls[0][0];
    expect(callArgs.recurringIndices).toBeUndefined();
  });

  it('should render transaction data alongside recurring checkboxes', () => {
    render(
      <ImportPreview
        preview={mockPreview}
        onConfirm={mockOnConfirm}
        onCancel={mockOnCancel}
        confirming={false}
      />
    );

    // Verify transaction data is still rendered
    expect(screen.getByText('Netflix')).toBeInTheDocument();
    expect(screen.getByText('Spotify')).toBeInTheDocument();
    expect(screen.getByText('Whole Foods')).toBeInTheDocument();
  });
});
