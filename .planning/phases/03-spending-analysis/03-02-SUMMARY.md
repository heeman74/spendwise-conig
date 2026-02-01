---
phase: 03-spending-analysis
plan: 02
subsystem: ui
tags: [react-day-picker, date-fns, react, graphql, apollo-client, filters, url-state]

# Dependency graph
requires:
  - phase: 03-01
    provides: Analytics API with DateRangeInput and MerchantStats types
provides:
  - DateRangePicker and AccountFilter UI components
  - useAnalyticsFilters hook for filter state management with URL sync
  - Updated GraphQL queries with filter variables (GET_ANALYTICS, GET_SPENDING_BY_CATEGORY, GET_TOP_MERCHANTS)
  - Updated hooks accepting filter parameters (useAnalytics, useSpendingByCategory, useTopMerchants)
affects: [03-03, analytics-ui, spending-dashboard]

# Tech tracking
tech-stack:
  added: [react-day-picker, date-fns]
  patterns: [URL-synced filter state, preset date ranges, click-outside dropdown closure]

key-files:
  created:
    - spendwise/src/components/ui/DateRangePicker.tsx
    - spendwise/src/components/ui/AccountFilter.tsx
    - spendwise/src/hooks/useAnalyticsFilters.ts
  modified:
    - spendwise/src/types/index.ts
    - spendwise/src/graphql/queries/analytics.ts
    - spendwise/src/hooks/useDashboard.ts
    - spendwise/src/__tests__/hooks/useDashboard.test.ts

key-decisions:
  - "Use react-day-picker for date selection (lightweight, accessible, Tailwind-compatible)"
  - "Sync filter state to URL params for shareable analytics views"
  - "Default to current month for date range (startOfMonth to endOfMonth)"
  - "Empty accountIds array means 'all accounts' (no filter)"
  - "DateRangePicker shows dual-month calendar with 5 preset ranges"

patterns-established:
  - "Filter state managed in custom hook with URL param sync using Next.js useSearchParams/useRouter"
  - "GraphQL queries accept optional filter variables (dateRange, accountIds) for backward compatibility"
  - "Hooks accept options object with optional filters instead of positional parameters"

# Metrics
duration: 4min 1s
completed: 2026-02-01
---

# Phase 03 Plan 02: Filter Infrastructure Summary

**React date range picker and account filter components with URL-synced state management and GraphQL query filtering**

## Performance

- **Duration:** 4 min 1 sec
- **Started:** 2026-02-01T23:27:33Z
- **Completed:** 2026-02-01T23:31:34Z
- **Tasks:** 2
- **Files modified:** 8

## Accomplishments
- Date range picker with 5 presets (Last 7 days, Last 30 days, This month, Last 3 months, Last 6 months) and dual-month calendar
- Account filter dropdown with checkboxes and type badges (CHECKING, SAVINGS, CREDIT, INVESTMENT)
- Filter state management hook with URL parameter synchronization for shareable views
- GraphQL queries updated to accept dateRange and accountIds variables
- useTopMerchants hook added for merchant analysis

## Task Commits

Each task was committed atomically:

1. **Task 1: Install dependencies and create filter components** - `87a7fb5` (feat)
2. **Task 2: Create useAnalyticsFilters hook and update GraphQL queries/hooks** - `ab64e43` (feat)

## Files Created/Modified

### Created
- `spendwise/src/components/ui/DateRangePicker.tsx` - Date range picker with presets and dual-month calendar using react-day-picker
- `spendwise/src/components/ui/AccountFilter.tsx` - Multi-select account filter dropdown with checkboxes and type badges
- `spendwise/src/hooks/useAnalyticsFilters.ts` - Filter state management hook with URL param sync

### Modified
- `spendwise/src/types/index.ts` - Added MerchantStats and AnalyticsFilters interfaces, added transactionCount to CategoryAmount
- `spendwise/src/graphql/queries/analytics.ts` - Updated GET_ANALYTICS and GET_SPENDING_BY_CATEGORY to accept filter variables, added GET_TOP_MERCHANTS query
- `spendwise/src/hooks/useDashboard.ts` - Updated useAnalytics and useSpendingByCategory to accept options object, added useTopMerchants hook
- `spendwise/src/__tests__/hooks/useDashboard.test.ts` - Updated tests to match new hook API signatures, added tests for filter parameters
- `spendwise/package.json` - Added react-day-picker and date-fns dependencies

## Decisions Made

1. **react-day-picker for date selection** - Lightweight (12KB), accessible, React-native, pairs well with Tailwind CSS and date-fns
2. **URL param sync for filter state** - Enables shareable analytics views, preserves filter state on page refresh
3. **Options object pattern for hooks** - Changed from positional parameters (period) to options object for better extensibility and backward compatibility
4. **Default to current month** - When no filters provided, dateRange defaults to startOfMonth/endOfMonth of current month
5. **Empty accountIds = all accounts** - Simplifies API - empty array or omitted parameter means no account filtering
6. **5 preset date ranges** - Last 7/30 days, This month, Last 3/6 months cover common analytics time periods

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Added transactionCount to CategoryAmount type**
- **Found during:** Task 1 (Adding MerchantStats type)
- **Issue:** CATEGORY_AMOUNT_FRAGMENT in GraphQL includes transactionCount field, but TypeScript interface was missing it
- **Fix:** Added optional `transactionCount?: number` to CategoryAmount interface
- **Files modified:** spendwise/src/types/index.ts
- **Verification:** Build passes, type matches GraphQL fragment
- **Committed in:** 87a7fb5 (Task 1 commit)

**2. [Rule 3 - Blocking] Updated test signatures to match new hook API**
- **Found during:** Task 2 verification (npm test)
- **Issue:** useDashboard.test.ts expected old API where useAnalytics accepts period directly, causing test failures
- **Fix:** Updated test calls to use options object pattern, added tests for new filter parameters
- **Files modified:** spendwise/src/__tests__/hooks/useDashboard.test.ts
- **Verification:** All tests pass (75 passed)
- **Committed in:** ab64e43 (Task 2 commit)

---

**Total deviations:** 2 auto-fixed (1 missing critical type field, 1 blocking test update)
**Impact on plan:** Both fixes necessary for type safety and test correctness. No scope creep - aligned with plan intent.

## Issues Encountered

None - plan executed smoothly. Dependencies installed without issues, components built as specified, tests updated to match new API.

## User Setup Required

None - no external service configuration required. All changes are frontend infrastructure.

## Next Phase Readiness

- Filter components ready for integration into analytics page (Plan 03-03)
- GraphQL queries accept filter parameters (API already supports them from 03-01)
- useAnalyticsFilters hook provides complete filter state management
- useTopMerchants hook ready for merchant analysis visualization
- Dark mode support included in all new components
- Existing tests pass, components compile successfully

**Ready for:** Plan 03-03 to compose these components into the analytics page with real data visualization.

**Note:** Two pre-existing test failures remain (TwoFactorSetup and TwoFactorVerify tests missing @testing-library/user-event dependency) - unrelated to this plan.

---
*Phase: 03-spending-analysis*
*Completed: 2026-02-01*
