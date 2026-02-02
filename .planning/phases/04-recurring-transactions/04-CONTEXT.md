# Phase 4: Recurring Transactions - Context

**Gathered:** 2026-02-01
**Status:** Ready for planning

<domain>
## Phase Boundary

Detect recurring patterns in imported transactions (subscriptions, bills, regular payments, paychecks) and present them as a trackable list with summary metrics. Users can dismiss false positives, manually add missed items, and edit detected entries. Creating budgets or alerts based on recurring items belongs in future phases.

</domain>

<decisions>
## Implementation Decisions

### Detection criteria
- **Minimum occurrences:** 3 transactions before flagging as recurring
- **Amount tolerance:** 10% variance between occurrences (e.g., $9.99 vs $10.49 still matches)
- **Matching strategy:** Merchant name + amount range together (not merchant alone) — separates e.g., Amazon Prime from Amazon orders
- **Timing tolerance:** +/-5 days from expected date (accounts for weekends/holidays)
- **Frequencies detected:** Weekly, biweekly, monthly, quarterly, annual
- **Transaction types:** Both income (paychecks, regular deposits) and expenses (subscriptions, bills)
- **History window:** Full transaction history (not rolling window) — catches annual subscriptions
- **Missed payment detection:** Flag as "possibly cancelled" if 2+ expected dates pass without a matching transaction
- **Algorithm:** Rule-based with AI fallback — deterministic rules for clear cases, existing OpenAI integration for borderline patterns
- **Trigger:** Runs automatically on each statement import (background), not on-demand
- **Persistence:** Store detected recurring items in RecurringTransaction database table — supports user edits, faster page loads, status tracking
- **New detection notification:** Badge/indicator on Recurring nav item (e.g., "3 new recurring") after import detects new items

### Recurring list display
- **Layout:** Table/list (sortable rows, not cards)
- **Columns (7+):** Merchant, Amount, Frequency, Category, Next Expected, Last Paid, Status
- **Sorting:** Sortable by any column header click
- **Filtering:** Filterable by frequency and category
- **Tabs:** All | Expenses | Income — default shows all, tabs filter by type
- **Possibly cancelled items:** Dimmed/grayed rows in the main table (not separated)
- **Transaction history:** Expandable row — click to see past occurrence dates and amounts inline
- **Page structure:** Summary cards at top, then table below (consistent with analytics page pattern)
- **Empty state:** Helpful guidance — "No recurring transactions detected yet. Import more statements to help identify patterns." with import CTA

### User control over detections
- **Confirmation model:** Auto-confirmed by default, user can dismiss false positives
- **Manual add:** "Add recurring" button lets user manually create an entry (merchant, amount, frequency)
- **Editing:** Full edit — users can rename, change frequency, adjust expected amount, update category
- **Dismiss behavior:** Soft delete (recoverable) — dismissed items visible in a "Dismissed" section and can be restored

### Monthly cost summary
- **Summary cards (4):** Total Recurring Expenses, Total Recurring Income, Net Recurring (income - expenses), Active Count
- **Amount normalization:** All frequencies normalized to monthly equivalent (weekly x4.33, biweekly x2.17, quarterly /3, annual /12)
- **Excluded from total:** Dismissed and possibly-cancelled items — only active items count
- **Month-over-month comparison:** Show change indicator (e.g., "Your recurring costs went up $12 this month")
- **Income ratio:** Show recurring expenses as percentage of monthly income (e.g., "45% of income goes to fixed costs")

### Claude's Discretion
- Detection algorithm internals (exact scoring, weighting)
- AI fallback prompt design for borderline cases
- Exact table styling and responsive breakpoints
- Loading skeleton design for the page
- Error state handling
- "Add recurring" form design and validation
- Badge/indicator implementation details on nav

</decisions>

<specifics>
## Specific Ideas

- Summary cards + table pattern should match the analytics page for visual consistency
- Expandable rows for transaction history — keep the user on the same page instead of navigating away
- RecurringTransaction table already exists in Prisma schema (created in Phase 1) — use it
- Badge on nav should be subtle, not intrusive — similar to "Needs Review" tab indicator from Phase 2

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 04-recurring-transactions*
*Context gathered: 2026-02-01*
