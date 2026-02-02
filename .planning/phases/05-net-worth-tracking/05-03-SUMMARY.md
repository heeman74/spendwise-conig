---
phase: 05-net-worth-tracking
plan: 03
subsystem: ui
tags: [react, nextjs, recharts, apollo-client, graphql, tailwindcss]

# Dependency graph
requires:
  - phase: 05-02
    provides: GraphQL API with netWorth query resolver and snapshot management
provides:
  - Complete /net-worth page with hero, chart, and account breakdown
  - Time range selector with adaptive granularity (1M, 3M, 6M, 1Y, All)
  - Account-level net worth toggles and mini sparklines
  - GraphQL query/mutation definitions and custom hooks
  - Sidebar navigation to net worth page
affects: [05-04]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Options-object pattern for useNetWorth hook (consistent with Phase 3-4)
    - Document-based refetchQueries for mutations (Phase 4 decision)
    - Adaptive granularity for chart data (daily/weekly/monthly sampling)
    - Trend-based color coding (green positive, red negative)

key-files:
  created:
    - spendwise/src/graphql/queries/netWorth.ts
    - spendwise/src/graphql/mutations/netWorth.ts
    - spendwise/src/hooks/useNetWorth.ts
    - spendwise/src/components/net-worth/NetWorthHero.tsx
    - spendwise/src/components/net-worth/AccountCard.tsx
    - spendwise/src/components/net-worth/AccountBreakdown.tsx
    - spendwise/src/components/charts/NetWorthChart.tsx
    - spendwise/src/app/(dashboard)/net-worth/page.tsx
  modified:
    - spendwise/src/graphql/queries/index.ts
    - spendwise/src/graphql/mutations/index.ts
    - spendwise/src/hooks/index.ts
    - spendwise/src/components/layout/Sidebar.tsx

key-decisions:
  - "Adaptive granularity: 1M/3M show daily, 6M weekly, 1Y/All monthly"
  - "All accounts visible regardless of balance (no hiding $0 accounts)"
  - "Desktop side-by-side layout (chart 2/3, breakdown 1/3) with mobile stacking"
  - "Backfill button shown only when accounts exist but no history"

patterns-established:
  - "Time range selector as button group above chart"
  - "Mini sparklines in account cards using Recharts LineChart"
  - "Toggle switch pattern for boolean account settings"
  - "Section subtotals in breakdown (assets/liabilities)"

# Metrics
duration: 5min 18s
completed: 2026-02-02
---

# Phase 05-03: Net Worth Frontend Summary

**Complete /net-worth page with hero metrics, historical chart with adaptive granularity, account breakdown with sparklines and include/exclude toggles**

## Performance

- **Duration:** 5min 18s
- **Started:** 2026-02-02T19:52:19Z
- **Completed:** 2026-02-02T19:57:37Z
- **Tasks:** 2
- **Files modified:** 12

## Accomplishments
- Full-featured /net-worth page accessible from sidebar navigation
- Time range selector with 5 options (1M, 3M, 6M, 1Y, All) and adaptive chart granularity
- Account-level controls for include/exclude in net worth calculation
- Mini sparklines showing individual account history trends
- Empty state and backfill CTA for users without historical data

## Task Commits

Each task was committed atomically:

1. **Task 1: Create GraphQL definitions and useNetWorth hook** - `63c8c4c` (feat)
2. **Task 2: Build net worth page with all components** - `5540415` (feat)

## Files Created/Modified

**GraphQL Layer:**
- `spendwise/src/graphql/queries/netWorth.ts` - GET_NET_WORTH query with timeRange and accountIds filters
- `spendwise/src/graphql/mutations/netWorth.ts` - TOGGLE_INCLUDE_IN_NET_WORTH and BACKFILL_NET_WORTH_SNAPSHOTS mutations
- `spendwise/src/graphql/queries/index.ts` - Added netWorth barrel export
- `spendwise/src/graphql/mutations/index.ts` - Added netWorth barrel export

**Hooks:**
- `spendwise/src/hooks/useNetWorth.ts` - useNetWorth, useToggleIncludeInNetWorth, useBackfillSnapshots hooks with TIME_RANGE_LABELS mapping
- `spendwise/src/hooks/index.ts` - Added useNetWorth barrel export

**Components:**
- `spendwise/src/components/net-worth/NetWorthHero.tsx` - Hero section with current net worth, MoM change, and period change indicators
- `spendwise/src/components/charts/NetWorthChart.tsx` - Historical line chart with time range selector and adaptive granularity (daily/weekly/monthly)
- `spendwise/src/components/net-worth/AccountCard.tsx` - Individual account card with sparkline, toggle switch, type badge, and opacity for excluded accounts
- `spendwise/src/components/net-worth/AccountBreakdown.tsx` - Assets and liabilities sections with subtotals and account cards

**Pages:**
- `spendwise/src/app/(dashboard)/net-worth/page.tsx` - Main net worth page with hero, chart, breakdown, empty state, and backfill button

**Navigation:**
- `spendwise/src/components/layout/Sidebar.tsx` - Added "Net Worth" nav item between "Recurring" and "Accounts"

## Decisions Made

**1. Adaptive granularity for chart data**
- 1M, 3M: Show all daily data points
- 6M: Sample weekly (first data point of each week)
- 1Y, All: Sample monthly (first data point of each month)
- Rationale: Prevents chart overcrowding while maintaining meaningful trends

**2. All accounts visible regardless of balance**
- Empty accounts ($0 balance) shown in breakdown
- Rationale: Users may want to track accounts even with zero balance, consistent with CONTEXT.md decision

**3. Desktop layout uses 3-column grid**
- Chart: lg:col-span-2 (66% width)
- Breakdown: lg:col-span-1 (33% width)
- Mobile: Full-width stacking (chart above breakdown)
- Rationale: Chart needs space for readability, breakdown is compact list

**4. Backfill button conditional visibility**
- Shown only when: accounts exist AND history is empty
- Rationale: No point offering backfill if no accounts, and unnecessary if history already exists

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None - implementation followed existing patterns from Phase 3-4 (analytics, recurring) with no complications.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

**Ready for Phase 05-04 (UAT):**
- Complete net worth page ready for user acceptance testing
- All UI components functional and styled
- GraphQL layer connected to API built in 05-02
- Empty state and backfill flows ready for user validation

**No blockers or concerns.**

---
*Phase: 05-net-worth-tracking*
*Completed: 2026-02-02*
