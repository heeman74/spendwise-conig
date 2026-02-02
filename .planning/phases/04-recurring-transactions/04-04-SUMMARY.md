---
phase: 04-recurring-transactions
plan: 04
completed: 2026-02-02
duration: 5min 26s
subsystem: frontend-transactions
tags: [mark-recurring, modal, transaction-actions, gap-closure]

requires:
  - 04-03 # Recurring page, useAddRecurring hook, AddRecurringModal pattern

provides:
  - mark-recurring-from-transactions # Users can create recurring entries from transaction rows
  - transaction-recurring-action-button # Recurring icon button on each transaction row
  - mark-recurring-modal # Lightweight frequency selection modal pre-filled with transaction data

affects:
  - None # Gap closure complete, no downstream dependencies

tech-stack:
  added:
    - None # Used existing stack
  patterns:
    - pre-filled-modal # Modal pre-populated from parent data, minimal user input required
    - callback-prop-passthrough # onMarkRecurring flows TransactionList -> TransactionItem

key-files:
  created:
    - spendwise/src/components/transactions/MarkAsRecurringModal.tsx
  modified:
    - spendwise/src/components/transactions/TransactionItem.tsx
    - spendwise/src/components/transactions/TransactionList.tsx
    - spendwise/src/app/(dashboard)/transactions/page.tsx

decisions:
  - id: pre-filled-readonly-fields
    choice: Show merchant, amount, category, date as read-only summary card in modal
    rationale: Reduces user effort to single dropdown selection (frequency)
    alternatives: [Editable fields like AddRecurringModal, Inline form on transaction row]
    impact: One-click + frequency select workflow, minimal friction

  - id: reuse-addrecurring-hook
    choice: Wire existing useAddRecurring hook rather than creating new mutation
    rationale: Same mutation needed, no API changes required
    alternatives: [New dedicated mutation, Direct Apollo call]
    impact: Zero backend changes, consistent data flow

commits:
  - hash: b1b760f
    message: "feat(04-04): add Mark as Recurring button to TransactionItem and TransactionList"
    files: 2
    scope: Component props and recurring action button

  - hash: e63474f
    message: "feat(04-04): create MarkAsRecurringModal and wire into transactions page"
    files: 2
    scope: Modal component and page integration
---

# Phase 04 Plan 04: Mark as Recurring from Transactions Summary

**One-liner:** Recurring icon button on transaction rows opens a pre-filled frequency selection modal, wired to existing addRecurring mutation via useAddRecurring hook

## What Was Built

### TransactionItem Enhancement
- Added `onMarkRecurring` optional callback prop to TransactionItemProps
- Added recurring icon button (refresh/repeat SVG) between edit and delete actions
- Styled with primary blue color (`text-primary-600`) matching the app's action palette
- Accessibility: `title="Mark as recurring"` for screen readers and hover tooltip

### TransactionList Passthrough
- Added `onMarkRecurring` optional prop to TransactionListProps
- Passes callback through to each TransactionItem in the map

### MarkAsRecurringModal Component (new)
- Pre-filled summary card showing: merchant name, amount (formatted currency), category, date
- All fields read-only except frequency dropdown
- Frequency options: Weekly, Biweekly, Monthly, Quarterly, Annual (defaults to Monthly)
- Same visual pattern as AddRecurringModal (fixed overlay + centered card)
- Submit calls onSubmit with: merchantName, amount (absolute value), frequency, category, firstDate (YYYY-MM-DD)
- Loading state on submit button ("Saving...")
- Resets frequency to MONTHLY on close/reopen
- Returns null if not open or no transaction selected

### Transactions Page Wiring
- Imported `useAddRecurring` from `@/hooks/useRecurring`
- Added `markRecurringTransaction` state (Transaction | null)
- Created `handleMarkRecurring` callback (sets transaction for modal)
- Created `handleMarkRecurringSubmit` with try/catch error handling
- Passed `onMarkRecurring={handleMarkRecurring}` to both All Transactions and Needs Review TransactionLists
- Added MarkAsRecurringModal after existing Add/Edit Modal

## Technical Patterns

**Callback Prop Chain:**
```
TransactionsPage (handleMarkRecurring)
  -> TransactionList (onMarkRecurring passthrough)
    -> TransactionItem (onClick triggers callback with transaction)
      -> MarkAsRecurringModal (receives transaction, calls addRecurring on submit)
```

**Pre-filled Modal Pattern:**
Unlike AddRecurringModal which requires all fields, MarkAsRecurringModal extracts data from the selected transaction and only requires frequency selection. This reduces user effort to a single dropdown choice.

## Deviations from Plan

None -- plan executed exactly as written.

## Issues Encountered

None.

## Verification

**Build Check:**
```
Build succeeded
Route: /transactions (7.48 kB, First Load JS: 119 kB)
```

**TypeScript Check:**
No errors in TransactionItem, TransactionList, or transactions page.

**Acceptance Criteria Met:**
- TransactionItem shows "Mark as Recurring" button alongside edit and delete
- Clicking the button opens a modal pre-filled with transaction data
- Only frequency needs to be selected by the user
- Submitting creates a recurring transaction entry via addRecurring mutation
- Build passes, no TypeScript errors

## Next Phase Readiness

This was a gap closure plan (04-04). The feature bridges the transactions page to the recurring system, giving users a direct path from viewing a transaction to marking it as recurring.

**No Blockers**: All gap closure items addressed.

---

**Duration**: 5 minutes 26 seconds
**Commits**: 2 (component props + modal and wiring)
**Files Created**: 1
**Files Modified**: 3
**Lines Added**: ~150 (modal component + page integration)
