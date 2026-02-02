# Phase 5: Net Worth Tracking - Context

**Gathered:** 2026-02-02
**Status:** Ready for planning

<domain>
## Phase Boundary

Users can track total net worth across all accounts over time. Includes: net worth calculation (assets minus liabilities), historical line chart with time range selection, and per-account breakdown showing each account's contribution. Dashboard gets a summary card; dedicated /net-worth page for full view.

</domain>

<decisions>
## Implementation Decisions

### Net Worth Display
- Hero number at top with both month-over-month change AND period change matching selected time range
- Line chart below with time range selector: 1M, 3M, 6M, 1Y, All
- Chart color: green for positive trend, red for negative (standard financial convention)
- Account breakdown side-by-side with chart on desktop, stacks on mobile
- Accounts grouped into Assets and Liabilities sections with subtotals
- Each account shown as a card with: name, type, balance, % of total net worth, mini sparkline of balance over time
- All accounts shown regardless of balance (no hiding $0 accounts)

### Account Classification
- Auto-classify from account type: Checking + Savings + Investment = asset, Credit = liability
- User can override classification if needed
- Credit cards always treated as liability
- Per-account "include in net worth" toggle available both in account settings AND on the net worth page
- Balance sourced from account's current balance field (not computed from transactions)

### History Snapshots
- Daily scheduled snapshots via BullMQ + Redis queue (Redis already in stack)
- Also snapshot on each statement import (dual trigger: daily + on-import)
- Store per-account balances in each snapshot (not just total) — enables per-account sparklines
- Backfill historical data from transaction history for existing users
- Chart granularity: Claude's discretion (adaptive based on time range and data volume)

### Page Layout & Navigation
- Dedicated /net-worth page with full chart + breakdown
- Summary card on /dashboard: net worth number + mini sparkline, clickable to /net-worth
- Sidebar nav: Net Worth appears after Recurring (Analytics > Recurring > Net Worth > Accounts)
- Empty state: show page normally with $0 net worth and note "Add accounts to start tracking"

### Claude's Discretion
- Chart granularity per time range (daily vs weekly vs monthly data points)
- Exact sparkline implementation for account cards
- Loading states and skeleton design
- Exact card spacing and typography
- BullMQ job configuration (schedule time, retry policy)
- Backfill algorithm details (how far back, edge cases)

</decisions>

<specifics>
## Specific Ideas

- Side-by-side layout mirrors financial dashboard apps — chart gives the trend, breakdown gives the detail
- Sparklines on account cards give quick visual context without needing to click into each account
- Dual change indicators (month-over-month + period) give both consistency and context
- BullMQ chosen over node-cron for reliability and observability with existing Redis infrastructure

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 05-net-worth-tracking*
*Context gathered: 2026-02-02*
