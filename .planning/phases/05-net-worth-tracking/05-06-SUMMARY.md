---
phase: 05-net-worth-tracking
plan: 06
subsystem: ui
tags: [react, recharts, net-worth, sparkline, dashboard, ux]

# Dependency graph
requires:
  - phase: 05-net-worth-tracking
    provides: Net worth page, dashboard widget, and backfill functionality
provides:
  - Improved backfill button visibility logic (< 3 data points threshold)
  - Persistent subtle backfill link below chart for ongoing access
  - Dashboard sparkline with sparse data handling (area chart with gradient)
  - Visual padding for single data points (duplicated to create visible line)
affects: [dashboard, net-worth-tracking]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Sparse data padding: duplicate single points to create visible horizontal lines in charts"
    - "Conditional dot rendering: show dots when <= 3 points, hide for dense data"
    - "Area chart with gradient fill for better visual recognition vs line charts"

key-files:
  created: []
  modified:
    - spendwise/src/app/(dashboard)/net-worth/page.tsx
    - spendwise/src/components/dashboard/NetWorthSummaryCard.tsx

key-decisions:
  - "Backfill banner shows when history has < 3 data points (not just empty)"
  - "Persistent subtle backfill link below chart provides ongoing access"
  - "Dashboard sparkline uses AreaChart with gradient fill for better visual recognition"
  - "Single data point duplicated to create visible horizontal line instead of invisible dot"
  - "Dots shown when <= 3 points for visibility, hidden for normal-density data"

patterns-established:
  - "Threshold-based UI visibility: < 3 data points triggers help/action prompts"
  - "Dual-access pattern: prominent banner for first-time, subtle link for ongoing access"
  - "Chart data padding: duplicate sparse points to ensure visual recognizability"

# Metrics
duration: 1min 54s
completed: 2026-02-02
---

# Phase 05 Plan 06: Backfill & Sparkline UX Improvements Summary

**Improved backfill button visibility with < 3 data point threshold and fixed dashboard sparkline to render recognizable area chart with gradient fill for sparse data**

## Performance

- **Duration:** 1min 54s
- **Started:** 2026-02-02T21:32:44Z
- **Completed:** 2026-02-02T21:34:43Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- Backfill banner now visible when history has < 3 data points (not just empty)
- Added persistent subtle "Regenerate historical data" link below chart for ongoing access
- Dashboard sparkline renders as recognizable area chart with gradient fill regardless of data point count
- Single data point now shows as visible horizontal line with gradient, not invisible dot

## Task Commits

Each task was committed atomically:

1. **Task 1: Improve backfill button visibility** - `900a5a5` (feat)
2. **Task 2: Fix dashboard sparkline for sparse data** - `a3a20b8` (feat)

## Files Created/Modified
- `spendwise/src/app/(dashboard)/net-worth/page.tsx` - Updated backfill banner condition to check for < 3 history points, added persistent subtle backfill link below chart
- `spendwise/src/components/dashboard/NetWorthSummaryCard.tsx` - Replaced LineChart with AreaChart, added gradient fill, implemented sparse data padding (duplicate single points), conditional dot rendering

## Decisions Made

**Backfill visibility threshold:**
- Changed from `!hasHistory` (binary: empty or not) to `< 3 data points`
- Rationale: Daily cron creates 1 snapshot, hiding banner immediately. Users with 1-2 days of history still need deeper backfill from transaction history.
- 3-point threshold gives users ~2 days of cron snapshots before assuming sufficient coverage

**Persistent backfill access:**
- Added subtle text link below chart (always visible when hasAccounts)
- Rationale: Banner disappears after threshold met, but users may want to regenerate history later (e.g., after importing old transactions)
- Subtle placement avoids clutter, maintains ongoing access

**Area chart over line chart:**
- Replaced LineChart+Line with AreaChart+Area with gradient fill
- Rationale: Gradient beneath line makes even sparse data (single horizontal line) recognizable as a "chart" instead of just a stroke
- Visual weight helps user immediately identify it as a data visualization

**Sparse data padding:**
- Duplicate single data point to create 2-point array
- Rationale: Recharts cannot draw a line from 1 point. Duplication creates visible horizontal line showing the static value.
- Better UX than empty sparkline or placeholder text

**Conditional dot rendering:**
- Show dots when <= 3 points (r: 2), hide for normal data
- Rationale: Dots increase visibility for sparse data but clutter dense charts. 3-point threshold balances visibility and cleanliness.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None

## Next Phase Readiness

Phase 5 (Net Worth Tracking) gap closure complete. Both UAT issues fixed:
1. Backfill button now visible for users with limited historical coverage (< 3 snapshots)
2. Dashboard sparkline renders recognizable area chart even with 1-2 data points

Ready for Phase 6 or next priority phase.

---
*Phase: 05-net-worth-tracking*
*Completed: 2026-02-02*
