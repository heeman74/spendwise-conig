---
phase: 06-investment-portfolio
plan: 01
subsystem: api
tags: [graphql, apollo, prisma, redis, investment, portfolio]

# Dependency graph
requires:
  - phase: 01-database-schema-encryption
    provides: Prisma schema with Security and InvestmentHolding models
provides:
  - GraphQL queries: portfolio, assetAllocation, holdings(accountId)
  - GraphQL mutations: addHolding, updateHoldingPrice
  - Investment data layer with Redis caching
  - Security type normalization and asset allocation logic
affects: [06-02-portfolio-ui, 06-03-holdings-management]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Security type normalization with standard categories (equity, etf, mutual fund, bond, cash)
    - Asset allocation color mapping for consistent UI
    - Computed unrealized gain fields on InvestmentHolding type
    - 15-minute Redis cache TTL for portfolio and assetAllocation queries

key-files:
  created:
    - spendwise-api/src/schema/typeDefs/investment.ts
    - spendwise-api/src/schema/resolvers/investment.ts
  modified:
    - spendwise-api/src/schema/typeDefs/index.ts
    - spendwise-api/src/schema/resolvers/index.ts

key-decisions:
  - "Return 0 for unrealized gains when costBasis is null (graceful degradation for manual holdings without cost basis)"
  - "Normalize security types to standard categories before asset allocation (handles variation in user-entered types)"
  - "15-minute cache TTL for portfolio and assetAllocation queries (balances freshness with performance)"
  - "Filter by INVESTMENT account type in all queries (prevents mixing with other account types)"

patterns-established:
  - "Security type normalization: lowercase trim, map synonyms to canonical types"
  - "Asset allocation color scheme: equity=blue, etf=green, mutual fund=purple, bond=amber, cash=gray"
  - "Computed field resolvers for unrealizedGain and unrealizedGainPercent on InvestmentHolding"
  - "Account ownership verification in all mutations before modification"

# Metrics
duration: 3min 29s
completed: 2026-02-02
---

# Phase 06 Plan 01: Investment Portfolio Backend Summary

**GraphQL investment API with portfolio summary, asset allocation, holdings queries, and mutations for adding/updating holdings with Redis caching**

## Performance

- **Duration:** 3min 29s
- **Started:** 2026-02-02T23:38:54Z
- **Completed:** 2026-02-02T23:42:23Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments
- Created complete GraphQL schema for investment portfolio (Security, InvestmentHolding, Portfolio, AssetAllocation types)
- Implemented 3 queries with authentication and caching: portfolio summary, asset allocation breakdown, holdings list
- Implemented 2 mutations: addHolding (with security lookup-or-create), updateHoldingPrice (recalculates institution value)
- Added computed field resolvers for unrealized gains with null cost basis handling

## Task Commits

Each task was committed atomically:

1. **Task 1: Create investment GraphQL type definitions** - `07602c0` (feat)
2. **Task 2: Create investment resolvers and register in schema** - `c5d9576` (feat)

## Files Created/Modified
- `spendwise-api/src/schema/typeDefs/investment.ts` - GraphQL type definitions for investment entities
- `spendwise-api/src/schema/resolvers/investment.ts` - Resolvers for queries, mutations, and computed fields
- `spendwise-api/src/schema/typeDefs/index.ts` - Registered investment typeDefs in schema
- `spendwise-api/src/schema/resolvers/index.ts` - Registered investment resolvers in schema

## Decisions Made

**1. Zero unrealized gain when cost basis is null**
- Rationale: Manual holdings may not have cost basis data. Returning 0 instead of error allows graceful degradation while still showing current value.

**2. Security type normalization before asset allocation**
- Rationale: User-entered types may vary ("stock" vs "equity", "ETF" vs "etf"). Normalizing to canonical types ensures accurate grouping in asset allocation.

**3. 15-minute cache TTL for portfolio queries**
- Rationale: Investment values don't change frequently for manual portfolios. 15min balances data freshness with reduced database load.

**4. Security upsert using plaidSecurityId**
- Rationale: Prevents duplicate securities when adding holdings. Uses ticker symbol if provided, falls back to security name as unique identifier.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None - implementation proceeded smoothly following netWorth resolver patterns.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Investment data layer complete and ready for frontend consumption
- All queries authenticated and filtered to INVESTMENT account type only
- Ready for Phase 06 Plan 02 (portfolio UI) to consume these APIs
- Holdings mutation ready for Plan 03 (holdings management) manual entry UI

---
*Phase: 06-investment-portfolio*
*Completed: 2026-02-02*
