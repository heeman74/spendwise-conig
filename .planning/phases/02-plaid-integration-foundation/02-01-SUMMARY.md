---
phase: 02-plaid-integration-foundation
plan: 01
subsystem: api
tags: [plaid, graphql, apollo-server, node.js, prisma]

# Dependency graph
requires:
  - phase: 01-database-schema-encryption
    provides: PlaidItem and Account models with encryption infrastructure
provides:
  - Initialized PlaidApi client singleton with environment configuration
  - Complete GraphQL API for Plaid operations (5 operations total)
  - Link token creation for new connections and re-authentication
  - Public token exchange with automatic PlaidItem and Account creation
  - Item unlinking with keep-as-manual option
  - Item status management
affects: [02-02, 02-03, 02-04, 02-05, 03-transaction-sync, 04-ai-categorization]

# Tech tracking
tech-stack:
  added: [plaid@41.0.0]
  patterns:
    - PlaidApi singleton client pattern
    - GraphQL error wrapping for external API calls
    - Account type mapping from Plaid to internal enum
    - Prisma transaction for coordinated updates/deletes

key-files:
  created:
    - spendwise-api/src/lib/plaid-client.ts
    - spendwise-api/src/schema/typeDefs/plaid.ts
    - spendwise-api/src/schema/resolvers/plaid.ts
  modified:
    - spendwise-api/package.json
    - spendwise-api/src/schema/typeDefs/index.ts
    - spendwise-api/src/schema/resolvers/index.ts

key-decisions:
  - "Allow plaid-client initialization without credentials in test environment"
  - "Map Plaid depository subtypes to CHECKING/SAVINGS, credit to CREDIT, investment to INVESTMENT"
  - "Use Prisma transactions for unlinkItem to ensure atomic account updates and item deletion"
  - "Continue local cleanup even if Plaid itemRemove API call fails"

patterns-established:
  - "PlaidApi client singleton exported from lib/plaid-client.ts"
  - "GraphQL error type PLAID_ERROR for all Plaid API failures"
  - "Account filters specify exact subtypes for each account type"
  - "Link token creation supports both create mode and update mode via itemId parameter"

# Metrics
duration: 5min
completed: 2026-01-31
---

# Phase 02 Plan 01: Plaid Backend Infrastructure Summary

**PlaidApi client with 5 GraphQL operations: link token creation (create/update modes), public token exchange with Account auto-creation, item unlinking with manual conversion option, and status management**

## Performance

- **Duration:** 5 min
- **Started:** 2026-01-31T03:11:41Z
- **Completed:** 2026-01-31T03:17:06Z
- **Tasks:** 2
- **Files modified:** 8

## Accomplishments

- Installed Plaid SDK and created configured PlaidApi singleton client
- Implemented complete GraphQL schema for Plaid operations (PlaidItem, PlaidLinkToken, ExchangeResult, UnlinkResult types)
- Built all 5 Plaid GraphQL operations: plaidItems query, createLinkToken mutation (handles both new connections and re-auth), exchangePublicToken mutation (creates PlaidItem + Accounts atomically), unlinkItem mutation (with keepAsManual option), updateItemStatus mutation
- Integrated Plaid resolvers into Apollo Server schema

## Task Commits

Each task was committed atomically:

1. **Task 1: Install Plaid SDK and create client initialization** - `fe605cf` (chore)
2. **Task 2: Create Plaid GraphQL typeDefs and resolvers** - `5fce0d4` (feat)

## Files Created/Modified

- `spendwise-api/src/lib/plaid-client.ts` - PlaidApi singleton with PLAID_CLIENT_ID, PLAID_SECRET, PLAID_ENV configuration
- `spendwise-api/src/schema/typeDefs/plaid.ts` - GraphQL type definitions for PlaidItem, PlaidLinkToken, ExchangeResult, UnlinkResult
- `spendwise-api/src/schema/resolvers/plaid.ts` - Resolver implementations for all 5 Plaid operations with error handling
- `spendwise-api/package.json` - Added plaid@41.0.0 dependency
- `spendwise-api/src/schema/typeDefs/index.ts` - Registered plaidTypeDefs
- `spendwise-api/src/schema/resolvers/index.ts` - Registered plaidResolvers in Query, Mutation, and PlaidItem type

## Decisions Made

**Allow plaid-client initialization without credentials in test environment**
- Rationale: Tests need to load the schema without having Plaid credentials configured. Actual API calls will fail if credentials are missing, but tests can still import and load the resolvers.

**Map Plaid depository subtypes to CHECKING/SAVINGS**
- Rationale: Plaid's depository type includes both checking and savings accounts. We check the subtype to map correctly: 'savings' -> SAVINGS, all others -> CHECKING (most common).

**Use Prisma transactions for unlinkItem**
- Rationale: Ensures atomic operations when unlinking - either all accounts are updated/deleted and item is removed, or nothing changes. Prevents partial state.

**Continue local cleanup even if Plaid itemRemove fails**
- Rationale: If Plaid API is down or the item is already removed, we still want to clean up our local database. Log the error but continue with local deletion.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Fixed plaid-client initialization to allow loading without credentials in test environment**

- **Found during:** Task 2 (running tests after adding Plaid resolvers)
- **Issue:** Tests failed with "PLAID_CLIENT_ID and PLAID_SECRET environment variables must be set" error when importing schema
- **Fix:** Changed plaid-client.ts to allow empty credentials during initialization. Tests can load the schema, and actual API calls will fail gracefully if credentials are missing at runtime.
- **Files modified:** `spendwise-api/src/lib/plaid-client.ts`
- **Verification:** All 201 tests pass, TypeScript compilation succeeds
- **Committed in:** `5fce0d4` (Task 2 commit)

**2. [Rule 1 - Bug] Fixed AccountSubtype enum values for investment accounts**

- **Found during:** Task 2 (TypeScript compilation)
- **Issue:** Used `AccountSubtype.I401k` and `AccountSubtype.I403B` which don't exist - TypeScript error revealed correct names are `_401k` and `_403B` (leading underscore for numeric enums)
- **Fix:** Changed to `AccountSubtype._401k` and `AccountSubtype._403B`
- **Files modified:** `spendwise-api/src/schema/resolvers/plaid.ts`
- **Verification:** TypeScript compilation passes without errors
- **Committed in:** `5fce0d4` (Task 2 commit)

---

**Total deviations:** 2 auto-fixed (1 blocking, 1 bug)
**Impact on plan:** Both auto-fixes necessary for tests to run and code to compile correctly. No scope creep - all planned features delivered exactly as specified.

## Issues Encountered

None - plan executed smoothly with only minor fixes for test compatibility and TypeScript enum naming.

## User Setup Required

**External services require manual configuration.** See [02-USER-SETUP.md](./02-USER-SETUP.md) for:
- Plaid account creation and Sandbox API key retrieval
- Environment variables: PLAID_CLIENT_ID, PLAID_SECRET, PLAID_ENV, PLAID_WEBHOOK_URL, PLAID_REDIRECT_URI
- Verification steps

Note: Plan 02-01 focused on backend infrastructure. User setup will be validated in later plans when frontend integration is built.

## Next Phase Readiness

**Ready for:** Plan 02-02 (Plaid Link UI component and connection flow)

**What's available:**
- GraphQL API fully operational for all Plaid operations
- PlaidApi client configured and ready for transaction sync (future phases)
- Account type mapping established
- Error handling patterns set for external API calls

**Security verified:**
- Access tokens never exposed in GraphQL schema (checked: grep found no accessToken field in plaid.ts typeDefs)
- Access tokens encrypted automatically by prisma-field-encryption
- All mutations require authentication via requireAuth middleware

**No blockers** - frontend can now build Plaid Link UI and call these GraphQL operations.

---
*Phase: 02-plaid-integration-foundation*
*Completed: 2026-01-31*
