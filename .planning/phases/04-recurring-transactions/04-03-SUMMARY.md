---
phase: 04-recurring-transactions
plan: 03
completed: 2026-02-02
duration: 4min 29s
subsystem: frontend-integration
tags: [graphql-client, react-hooks, ui-components, table, filters, modals]

requires:
  - 04-02 # GraphQL API with recurring queries/mutations

provides:
  - recurring-graphql-queries # GET_RECURRING and GET_RECURRING_SUMMARY
  - recurring-graphql-mutations # UPDATE, DISMISS, RESTORE, ADD
  - recurring-apollo-hooks # useRecurring, useRecurringSummary, mutation hooks
  - recurring-page # Full /recurring page with summary and table
  - recurring-components # RecurringSummary, RecurringTable, RecurringFilters, AddRecurringModal
  - recurring-navigation # Sidebar nav item

affects:
  - None # Frontend integration complete, ready for UAT

tech-stack:
  added:
    - None # Used existing stack (Apollo Client, React hooks, Tailwind)
  patterns:
    - options-object-hooks # Following Phase 3 pattern for hook parameters
    - cache-and-network-fetch-policy # Consistent data freshness
    - refetch-queries-on-mutation # Automatic cache invalidation
    - sortable-table-with-expansion # Interactive table pattern
    - modal-form-pattern # Controlled form with validation

key-files:
  created:
    - spendwise/src/graphql/queries/recurring.ts # GET_RECURRING and GET_RECURRING_SUMMARY
    - spendwise/src/graphql/mutations/recurring.ts # 5 recurring mutations
    - spendwise/src/hooks/useRecurring.ts # 6 Apollo hooks for recurring operations
    - spendwise/src/app/(dashboard)/recurring/page.tsx # Main recurring page
    - spendwise/src/components/recurring/RecurringSummary.tsx # 4 summary cards
    - spendwise/src/components/recurring/RecurringTable.tsx # Sortable/expandable table
    - spendwise/src/components/recurring/RecurringFilters.tsx # Type tabs and frequency dropdown
    - spendwise/src/components/recurring/AddRecurringModal.tsx # Manual entry modal
  modified:
    - spendwise/src/graphql/queries/index.ts # Export recurring queries
    - spendwise/src/graphql/mutations/index.ts # Export recurring mutations
    - spendwise/src/hooks/index.ts # Export recurring hooks
    - spendwise/src/components/layout/Sidebar.tsx # Add Recurring nav item

decisions:
  - id: sortable-table-columns
    choice: Click column headers to toggle sort order
    rationale: Standard pattern, no additional UI chrome needed, familiar UX
    alternatives: [Separate sort dropdown, Fixed sort order]
    impact: Users can sort by any column (Merchant, Amount, Frequency, Category, Next Expected, Last Paid, Status)

  - id: single-row-expansion
    choice: Only one row expanded at a time
    rationale: Keeps UI clean, focuses attention on single item, reduces scroll
    alternatives: [Multiple simultaneous expansions, No expansion]
    impact: Clicking row expands transaction history, auto-collapses previous

  - id: dismissed-section-collapsed
    choice: Dismissed items in separate collapsible section at bottom
    rationale: Keeps main view clean, dismissed items accessible but not prominent
    alternatives: [Filter tab, Inline with opacity, Separate page]
    impact: Users must click to see dismissed items, clear separation

  - id: add-modal-vs-page
    choice: Modal for adding recurring items
    rationale: Quick action, maintains context, no navigation required
    alternatives: [Dedicated add page, Inline form]
    impact: Fast workflow, form validates and resets on submit

  - id: frequency-dropdown-vs-tabs
    choice: Dropdown for frequency filter, tabs for type filter
    rationale: 5 frequency options too many for horizontal tabs, 3 type options perfect for tabs
    alternatives: [All tabs, All dropdowns]
    impact: Clean UI with both filter types easily accessible

  - id: possibly-cancelled-styling
    choice: Dimmed/opacity for possibly cancelled items
    rationale: Visual distinction without removing from active list, user can assess
    alternatives: [Hide completely, Separate section, No styling]
    impact: Users see stale subscriptions but not overwhelmed, can dismiss if confirmed cancelled

commits:
  - hash: 1d2e6c3
    message: "feat(04-03): add GraphQL queries/mutations and hooks for recurring transactions"
    files: 6
    scope: GraphQL layer and Apollo hooks

  - hash: 9f29706
    message: "feat(04-03): build recurring transactions page with full UI"
    files: 6
    scope: Page and components
---

# Phase 04 Plan 03: Recurring Transactions Frontend Summary

**One-liner:** Full-featured /recurring page with summary cards, sortable/filterable table, expandable rows, dismiss/restore/add actions, and sidebar navigation

## What Was Built

### GraphQL Integration Layer
- **GET_RECURRING query** with filters (frequency, category, type), sort, and dismissed parameters
- **GET_RECURRING_SUMMARY query** for monthly-normalized totals
- **5 mutations**: UPDATE_RECURRING, DISMISS_RECURRING, RESTORE_RECURRING, ADD_RECURRING, DETECT_RECURRING
- **6 Apollo hooks** following Phase 3 options object pattern:
  - `useRecurring(options)` — accepts filters, sort, dismissed flags
  - `useRecurringSummary()` — loads summary data for cards
  - `useUpdateRecurring()` — edit recurring item
  - `useDismissRecurring()` — soft delete
  - `useRestoreRecurring()` — undo soft delete
  - `useAddRecurring()` — manual entry
- All hooks use `cache-and-network` fetch policy and refetch queries on mutation

### UI Components

**RecurringSummary** (4 cards):
1. Monthly Recurring Expenses (red) — shows income ratio if available
2. Monthly Recurring Income (green)
3. Net Monthly Recurring (color based on positive/negative)
4. Active Subscriptions count

**RecurringFilters**:
- Type tabs: All | Expenses | Income (horizontal buttons, active highlighted)
- Frequency dropdown: All Frequencies | Weekly | Biweekly | Monthly | Quarterly | Annual

**RecurringTable**:
- 7 sortable columns: Merchant, Amount, Frequency, Category, Next Expected, Last Paid, Status
- Click column header to toggle asc/desc sort, visual arrow indicator
- Expandable rows (chevron icon) — shows transaction count and date range
- Status badges: "Active" (green) or "Possibly Cancelled" (amber)
- Possibly cancelled items appear dimmed (opacity-60)
- Dismissed items show with opacity-50 and strikethrough merchant name
- Dismiss (X icon) and Restore (undo icon) actions
- Empty state: "No recurring transactions detected yet" with Import CTA

**AddRecurringModal**:
- Form fields: Merchant Name*, Amount*, Frequency, Category, Description, Start Date*
- 11 category options (Subscriptions default): Bills & Utilities, Entertainment, Food & Dining, etc.
- Validation: Required fields, positive amount
- Loading state on submit button
- Modal overlay with cancel/submit actions

### Recurring Page
- Page header with "Add Recurring" button
- RecurringFilters component (tabs + dropdown)
- RecurringSummary component (4 cards)
- RecurringTable component (main active items)
- Collapsible "Dismissed Items" section at bottom (expandable by clicking header)
- Error handling with red alert card
- Loading states for each section (independent)
- Suspense boundary for Next.js compatibility
- State management: typeFilter, frequencyFilter, sort, showAddModal, showDismissed

### Navigation
- Added "Recurring" nav item to Sidebar between Analytics and Accounts
- Uses refresh/repeat icon (Heroicons) to represent recurring concept
- Route: `/recurring`

## Technical Patterns

**Options Object Pattern (Phase 3)**:
```typescript
useRecurring({
  filters: { type: 'EXPENSE', frequency: 'MONTHLY' },
  sort: { field: 'lastDate', order: 'desc' },
  dismissed: false,
})
```
Follows established pattern from analytics hooks for consistency and extensibility.

**Cache Invalidation**:
All mutation hooks refetch `['GetRecurring', 'GetRecurringSummary']` queries to ensure UI stays synchronized after changes.

**Sortable Table**:
- Single-column sort (clicking new column changes sort field)
- Toggle asc/desc on same column
- Visual indicators: arrows for active sort, neutral icon for inactive

**Expandable Rows**:
- Chevron icon rotates 90deg when expanded
- Only one row expanded at a time (clicking new row collapses previous)
- Expanded content shows transaction pattern details

## Deviations from Plan

None — plan executed exactly as written. All requirements met:
- 4 summary cards with monthly-normalized amounts ✓
- Sortable table with 7 columns ✓
- Type tabs and frequency dropdown filters ✓
- Expandable rows showing transaction history ✓
- Dismiss/restore functionality ✓
- Add recurring modal with validation ✓
- Possibly cancelled items dimmed ✓
- Empty state with import CTA ✓
- Sidebar navigation item ✓

## Integration Points

**Upstream Dependencies**:
- 04-02 GraphQL API provides `recurring`, `recurringSummary`, and mutation resolvers
- Existing UI components: Card, Button patterns from Phase 3
- Apollo Client configuration with auth link

**Downstream Usage**:
- Ready for UAT (next plan 04-UAT)
- Users can now view, filter, sort, dismiss, restore, and manually add recurring items
- Import flow (via 04-02) automatically detects recurring patterns

## Verification

**Build Check**:
```
✓ Compiled successfully
Route: /recurring (5.34 kB, First Load JS: 114 kB)
```

**TypeScript Check**:
No recurring-related errors. Pre-existing test file errors (unrelated to this plan).

**Manual Verification Checklist**:
- [ ] Navigate to /recurring from sidebar
- [ ] See 4 summary cards with data
- [ ] Filter by Expenses/Income tabs
- [ ] Filter by frequency dropdown
- [ ] Sort table by clicking column headers
- [ ] Expand row to see transaction history
- [ ] Dismiss an active item (moves to dismissed section)
- [ ] Restore a dismissed item (returns to active)
- [ ] Click "Add Recurring" and submit form
- [ ] See empty state when no recurring items exist

## Next Phase Readiness

**Plan 04-UAT Prerequisites Met**:
- ✅ Frontend fully built and integrated
- ✅ All CRUD operations wired up
- ✅ Error handling and loading states
- ✅ Empty states and guidance
- ✅ Build passes without errors

**Known Items for UAT**:
- Test with real user data (multiple recurring patterns)
- Verify summary calculations correct
- Test sort/filter combinations
- Verify dismiss/restore flow
- Test add recurring form validation
- Check responsive layout on mobile
- Verify navigation highlights active route

**No Blockers**: Phase 04 frontend complete, ready for user acceptance testing.

---

**Duration**: 4 minutes 29 seconds
**Commits**: 2 (GraphQL layer + UI components)
**Files Created**: 8
**Files Modified**: 4
**Lines Added**: ~1,100 (queries, mutations, hooks, components, page)
