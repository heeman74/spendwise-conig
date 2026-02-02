---
phase: 05-net-worth-tracking
plan: 02
subsystem: api
status: complete
tags: [graphql, resolvers, typedefs, redis, cache, networth, bullmq]

requires:
  phases: [05-01]
  infrastructure: [NetWorthSnapshot model, includeInNetWorth field, snapshotQueue]

provides:
  queries: [netWorth with TimeRange filtering and accountIds filter]
  mutations: [toggleIncludeInNetWorth, backfillNetWorthSnapshots]
  integrations: [on-import snapshot trigger in statement import]

affects:
  phases: [05-03]
  files: [netWorth GraphQL API ready for frontend consumption]

tech-stack:
  added: []
  patterns: [filter-aware cache keys, non-blocking job triggers, credit-as-liability calculation]

key-files:
  created:
    - spendwise-api/src/schema/typeDefs/netWorth.ts: "GraphQL type definitions for net worth"
    - spendwise-api/src/schema/resolvers/netWorth.ts: "Query and mutation resolvers for net worth"
  modified:
    - spendwise-api/src/schema/typeDefs/index.ts: "Added netWorthTypeDefs to schema"
    - spendwise-api/src/schema/resolvers/index.ts: "Added netWorthResolvers to resolvers"
    - spendwise-api/src/schema/resolvers/statementImport.ts: "Added on-demand snapshot trigger"

decisions:
  - id: credit-as-liability
    what: "CREDIT account type always subtracted from net worth regardless of balance sign"
    why: "Credit accounts are liabilities - balance represents what you owe"
    impact: "Net worth calculation correctly treats credit cards as debt"

  - id: filter-aware-cache-keys
    what: "Cache keys include all filter parameters: timeRange and accountIds"
    why: "Prevents cache collisions between different filter combinations"
    impact: "Each unique query combination cached separately"

  - id: non-blocking-snapshot-trigger
    what: "Snapshot queue trigger wrapped in try/catch, logs errors but doesn't fail import"
    why: "Import success is primary operation, snapshot capture is secondary"
    impact: "Import always succeeds even if snapshot queueing fails"

  - id: monthly-backfill-limit
    what: "backfillNetWorthSnapshots generates monthly snapshots, limited to 24 months (2 years)"
    why: "Balance calculation for older dates becomes less accurate, monthly granularity sufficient"
    impact: "Historical data available but not excessive"

metrics:
  duration: 241s
  tasks-completed: 2/2
  files-created: 2
  files-modified: 3
  completed: 2026-02-02
---

# Phase 05 Plan 02: Net Worth GraphQL API Summary

GraphQL API for net worth tracking with TimeRange filtering, account breakdown, historical data, cache layer, and on-import snapshot trigger integrated into statement import flow.

## Performance

- **Duration:** 4 min 1 sec (241s)
- **Started:** 2026-02-02T23:24:24Z
- **Completed:** 2026-02-02T23:28:25Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments

- netWorth query returns current value, month-over-month changes, period changes, history array, and per-account breakdown with history
- Credit accounts correctly subtracted as liabilities in net worth calculation
- toggleIncludeInNetWorth mutation flips boolean and invalidates cache
- backfillNetWorthSnapshots mutation generates up to 24 months of monthly historical snapshots
- Statement import triggers on-demand snapshot (non-blocking)
- All results cached in Redis for 15 minutes with filter-aware cache keys

## Task Commits

Each task was committed atomically:

1. **Task 1: Create net worth GraphQL typeDefs and resolvers** - `d7fd724` (feat)
   - GraphQL types: TimeRange enum, NetWorthHistory, AccountNetWorth, NetWorthData
   - netWorth query resolver with caching, time range filtering, account filtering
   - toggleIncludeInNetWorth mutation with cache invalidation
   - backfillNetWorthSnapshots mutation with 2-year limit
   - Integrated into schema index files

2. **Task 2: Add on-import snapshot trigger to statement import** - `8e6c202` (feat)
   - Imported snapshotQueue from snapshotNetWorth job
   - Added non-blocking snapshot trigger after successful import
   - Follows same pattern as recurring detection integration

## Files Created/Modified

**Created:**
- `spendwise-api/src/schema/typeDefs/netWorth.ts` - GraphQL type definitions for net worth (TimeRange enum, NetWorthData type, AccountNetWorth type, NetWorthHistory type)
- `spendwise-api/src/schema/resolvers/netWorth.ts` - Query and mutation resolvers (netWorth query, toggleIncludeInNetWorth, backfillNetWorthSnapshots)

**Modified:**
- `spendwise-api/src/schema/typeDefs/index.ts` - Added netWorthTypeDefs to schema
- `spendwise-api/src/schema/resolvers/index.ts` - Added netWorthResolvers to Query and Mutation objects
- `spendwise-api/src/schema/resolvers/statementImport.ts` - Added on-demand snapshot trigger after import completion

## Decisions Made

**Credit accounts as liabilities:**
- CREDIT account type always subtracted from net worth regardless of balance sign
- Rationale: Credit accounts represent debt (what you owe), not assets

**Filter-aware cache keys:**
- Cache keys include all filter parameters: `user:${userId}:netWorth:${timeRange}:${accountIds || 'all'}`
- Prevents cache collisions between different filter combinations
- Each unique query combination cached separately for 15 minutes

**Non-blocking snapshot trigger:**
- Snapshot queue trigger wrapped in try/catch in statement import resolver
- Logs errors but doesn't fail import
- Import success is primary operation, snapshot capture is secondary

**Monthly backfill with 2-year limit:**
- backfillNetWorthSnapshots generates monthly snapshots (1st of each month)
- Limited to 24 months (2 years) of history
- Balance calculation: current balance minus sum of transactions after snapshot date
- Uses skipDuplicates for idempotent backfills

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None - all tasks completed without issues.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

**Blockers:** None

**For Plan 03 (Net Worth Page UI):**
- netWorth query ready with all required data fields
- TimeRange enum available for period selection
- toggleIncludeInNetWorth mutation ready for account exclusion
- backfillNetWorthSnapshots mutation ready for historical data generation
- Cache invalidation working correctly
- Snapshot capture integrated into import flow

## Technical Implementation

**Stack:**
- GraphQL for API layer
- Redis for caching (15-minute TTL)
- BullMQ for on-demand snapshot jobs
- Prisma for database queries

**Key Patterns:**
- Filter-aware cache keys prevent collisions
- Non-blocking job triggers for secondary operations
- Credit accounts treated as liabilities
- Monthly backfills with transaction-based balance calculation

**Net Worth Calculation:**
```typescript
// CREDIT accounts subtract (liabilities)
// All other account types add (assets)
netWorth = totalAssets - totalLiabilities
```

**Backfill Algorithm:**
```typescript
// For each month from oldest transaction to now:
// For each account:
//   balanceAtDate = currentBalance - sumOfTransactionsAfter(date)
// createMany with skipDuplicates
```

## Verification Results

All verification criteria passed:

1. TypeScript compilation passes (only pre-existing ioredis-mock test error)
2. GraphQL schema includes TimeRange enum
3. netWorth query accepts TimeRange and accountIds parameters
4. toggleIncludeInNetWorth mutation exists
5. backfillNetWorthSnapshots mutation exists
6. Statement import resolver contains snapshotQueue.add call
7. Snapshot trigger is non-blocking (try/catch wrapper)

---

**Plan executed:** 2026-02-02
**Duration:** 241 seconds (4min 1s)
**Result:** GraphQL API complete, on-import snapshot trigger integrated, ready for frontend
