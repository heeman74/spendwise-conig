---
status: complete
phase: 04-recurring-transactions
source: [04-01-SUMMARY.md, 04-02-SUMMARY.md, 04-03-SUMMARY.md]
started: 2026-02-02T04:30:00Z
updated: 2026-02-02T04:45:00Z
---

## Current Test

[testing complete]

## Tests

### 1. Navigate to Recurring page from sidebar
expected: In the sidebar, a "Recurring" nav item with refresh icon appears between Analytics and Accounts. Clicking it navigates to /recurring showing "Recurring Transactions" page title and an "Add Recurring" button.
result: pass

### 2. View summary cards with monthly-normalized amounts
expected: At the top of the /recurring page, 4 summary cards display: (1) Monthly Recurring Expenses in red, (2) Monthly Recurring Income in green, (3) Net Monthly Recurring colored by positive/negative, (4) Active Subscriptions count. All amounts are normalized to monthly equivalents. If no data exists, cards should show $0.00 or 0.
result: pass

### 3. View sortable recurring transactions table
expected: Below the summary cards, a table shows recurring transactions with 7 columns: Merchant, Amount, Frequency, Category, Next Expected, Last Paid, Status. Clicking any column header sorts the table by that column, toggling between ascending and descending. An arrow indicator shows the active sort direction.
result: issue
reported: "Need to assign recurring from the transaction so that user can assign as recurring from the transactions page"
severity: major

### 4. Filter by type using tabs
expected: Above the table, three tab buttons (All, Expenses, Income) filter the recurring list. "All" shows everything, "Expenses" shows only non-income items, "Income" shows only income items. The active tab is visually highlighted.
result: pass

### 5. Filter by frequency using dropdown
expected: A frequency dropdown filter offers options: All Frequencies, Weekly, Biweekly, Monthly, Quarterly, Annual. Selecting a frequency filters the table to show only items with that frequency.
result: pass

### 6. Expand a row to see transaction details
expected: Clicking a table row expands it to show transaction pattern details (transaction count and date range). A chevron icon on the left rotates when expanded. Only one row can be expanded at a time — expanding a new row collapses the previous one.
result: issue
reported: "Removed recurring transaction is not able to be added back"
severity: major

### 7. Dismiss a recurring item
expected: Each active recurring item has a dismiss button (X icon). Clicking it removes the item from the active list. The item should then appear in the "Dismissed Items" section at the bottom of the page.
result: pass

### 8. Restore a dismissed item
expected: At the bottom of the page, clicking "Dismissed Items" header expands a section showing dismissed recurring items with reduced opacity and strikethrough text. Each has a restore (undo) button. Clicking restore returns the item to the active list.
result: pass

### 9. Add a recurring item manually
expected: Clicking "Add Recurring" opens a modal with fields: Merchant Name (required), Amount (required, positive), Frequency (select), Category (select with ~11 options), Description (optional), Start Date (required, defaults to today). Submitting with valid data creates the item and it appears in the table. Cancel closes without saving.
result: pass

### 10. Possibly cancelled items appear dimmed
expected: Recurring items with "Possibly Cancelled" status appear dimmed (reduced opacity) in the table, with an amber/orange status badge reading "Possibly Cancelled" instead of the green "Active" badge.
result: pass

### 11. Empty state when no recurring items exist
expected: When no recurring transactions are detected, the table area shows a message like "No recurring transactions detected yet" with a link/button to navigate to the import page, guiding the user to import more statements.
result: pass

### 12. Auto-detection after statement import
expected: After importing a statement (via /import), recurring patterns are automatically detected from the full transaction history. Navigating to /recurring after import shows any newly detected patterns without needing to trigger detection manually.
result: pass

## Summary

total: 12
passed: 10
issues: 2
pending: 0
skipped: 0

## Gaps

- truth: "User can assign a transaction as recurring directly from the transactions page"
  status: failed
  reason: "User reported: Need to assign recurring from the transaction so that user can assign as recurring from the transactions page"
  severity: major
  test: 3
  root_cause: "Missing feature — no 'Mark as Recurring' action exists on transaction rows. TransactionItem.tsx only has edit and delete buttons. The addRecurring mutation and useAddRecurring hook exist and work, but there's no UI entry point from the transactions page. Needs: a third action button or dropdown on TransactionItem, a frequency selection modal pre-filled with transaction data, and wiring to useAddRecurring hook."
  artifacts:
    - spendwise/src/components/transactions/TransactionItem.tsx (add Mark as Recurring button)
    - spendwise/src/components/transactions/TransactionList.tsx (pass through callback)
    - spendwise/src/app/(dashboard)/transactions/page.tsx (add handler + modal)
  missing:
    - "Mark as Recurring" action button on transaction rows
    - Frequency selection modal pre-filled with transaction data

- truth: "Dismissed/removed recurring transaction can be restored back to the active list"
  status: failed
  reason: "User reported: Removed recurring transaction is not able to be added back"
  severity: major
  test: 6
  root_cause: "Apollo cache refetch issue — useRestoreRecurring uses refetchQueries: ['GetRecurring', 'GetRecurringSummary'] by operation name only. The page has TWO useRecurring queries with different variables (dismissed: false and dismissed: true). Apollo's name-based refetch doesn't properly coordinate both queries. The backend mutation works correctly (sets isDismissed: false), but the dismissed items list doesn't update in the UI after restore."
  artifacts:
    - spendwise/src/hooks/useRecurring.ts (fix refetchQueries in useRestoreRecurring and useDismissRecurring)
  missing:
    - Proper cache invalidation for queries with same operation name but different variables
