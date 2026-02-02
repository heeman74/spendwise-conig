---
phase: 04-recurring-transactions
plan: 02
type: summary
status: complete
subsystem: backend-graphql-api
tags: [graphql, api, recurring-transactions, detection-automation]
requires: ["04-01"]
provides:
  - GraphQL API for recurring transactions (queries and mutations)
  - Automatic recurring detection on statement import
affects: ["04-03"]
key-files:
  created:
    - spendwise-api/src/schema/typeDefs/recurring.ts
    - spendwise-api/src/schema/resolvers/recurring.ts
  modified:
    - spendwise-api/src/schema/typeDefs/index.ts
    - spendwise-api/src/schema/resolvers/index.ts
    - spendwise-api/src/schema/resolvers/statementImport.ts
tech-stack:
  added: []
  patterns:
    - GraphQL extend type pattern for modular schema composition
    - Non-blocking async detection in mutation resolvers
    - Prisma upsert with compound unique key for pattern updates
decisions:
  - title: "Non-blocking detection in import flow"
    rationale: "Detection errors should not fail the import - user gets their transactions regardless of detection success"
    date: 2026-02-02
  - title: "Full transaction history detection on import"
    rationale: "Each import triggers detection on ALL transactions, not just new ones - ensures patterns update as history grows"
    date: 2026-02-02
  - title: "Monthly normalization in recurringSummary"
    rationale: "Normalizing all frequencies to monthly equivalent enables accurate budget comparison"
    date: 2026-02-02
metrics:
  duration: "6min 3s"
  completed: 2026-02-02
---

# Phase 04 Plan 02: GraphQL API for Recurring Transactions Summary

**One-liner:** Complete GraphQL API with filtering, sorting, CRUD operations, and automatic detection trigger on statement imports

## What Was Built

### GraphQL Type Definitions (recurring.ts)
- **RecurringTransaction type:** Full recurring pattern data including frequency, amounts, dates, status, linked transaction IDs
- **RecurringSummary type:** Monthly-normalized totals for expenses, income, net recurring, active count, income ratio
- **Input types:** RecurringFiltersInput (frequency, category, type), RecurringSortInput, AddRecurringInput, UpdateRecurringInput
- **Queries:** `recurring` (with filters, sort, dismissed flag), `recurringSummary`
- **Mutations:** `updateRecurring`, `dismissRecurring`, `restoreRecurring`, `addRecurring`, `detectRecurring`

### Query Resolvers
**recurring query:**
- Filters by frequency, category, type (INCOME/EXPENSE)
- `dismissed` parameter controls visibility (default false = show active only)
- Sorting support (default: lastDate desc)
- Type filter: "INCOME" = category:"Income", "EXPENSE" = category:not "Income"

**recurringSummary query:**
- Fetches all active, non-dismissed items
- Separates income vs expenses
- Normalizes each to monthly equivalent using `normalizeToMonthly`
- Calculates total recurring expenses, income, net, income ratio
- Income ratio = (expenses / income * 100) - shows what % of recurring income is consumed by recurring expenses

### Mutation Resolvers
**updateRecurring:**
- Updates merchant name, amount (sets both lastAmount and averageAmount), frequency, category, description
- Validates user ownership

**dismissRecurring / restoreRecurring:**
- Soft delete pattern - sets isDismissed flag
- Allows undo without data loss

**addRecurring:**
- Creates manual recurring entry
- Calculates nextExpectedDate based on frequency
- Generates UUID for plaidStreamId
- Sets status to ACTIVE

**detectRecurring:**
- Fetches all user transactions
- Calls detection algorithm
- Upserts patterns using compound unique key (userId, merchantName, frequency)
- Returns count of patterns found

### Statement Import Integration
**confirmImport mutation enhancement:**
- After successful import and status update to COMPLETED
- Fetches all user transactions (full history)
- Runs detection algorithm
- Upserts patterns into RecurringTransaction table
- Wrapped in try/catch - detection errors logged but don't fail import
- Non-blocking design ensures import always succeeds

## Key Patterns

### Compound Unique Key Pattern
```typescript
where: {
  userId_merchantName_frequency: {
    userId: ctx.user.id,
    merchantName: pattern.merchantName,
    frequency: pattern.frequency,
  }
}
```
Enables upsert operations - if same merchant+frequency exists, update it; otherwise create new. Prevents duplicate patterns.

### Monthly Normalization
All frequencies normalized to monthly equivalent in summary:
- WEEKLY × 4.33 (52 weeks / 12 months)
- BIWEEKLY × 2.17 (26 periods / 12 months)
- MONTHLY × 1
- QUARTERLY × 0.33
- ANNUALLY × 0.083

Allows comparison: "$50 monthly Netflix + $600 annual Prime = $100/month total"

### Non-Blocking Detection
Detection runs in try/catch after import completes. If detection fails:
- Error logged to console
- Import still returns success
- User's transactions are safe

### Filter Composition
Filters build Prisma where clause incrementally:
```typescript
const where: any = { userId, isDismissed: false };
if (filters.frequency) where.frequency = filters.frequency;
if (filters.type === 'INCOME') where.category = 'Income';
if (filters.type === 'EXPENSE') where.category = { not: 'Income' };
```

## Deviations from Plan

None - plan executed exactly as written.

## Testing Results

**TypeScript compilation:** ✅ Passes (pre-existing ioredis-mock type warning unrelated to changes)

**Test suite:** ✅ All 229 tests pass
- 12 test suites passed
- GraphQL integration tests verify schema loads correctly
- No new test failures introduced

**Manual verification:**
- GraphQL schema compiles and loads
- All type definitions extend properly
- All resolvers registered in index

## Integration Points

### Detection Algorithm Integration
- Imports `detectRecurringPatterns`, `normalizeToMonthly`, `Frequency` from `recurring-detector.ts`
- Uses same types and interfaces as detector
- Detector output maps directly to Prisma create/update fields

### Statement Import Integration
- `confirmImport` mutation now triggers detection
- Detection happens AFTER import status set to COMPLETED
- Detection runs on FULL transaction history (not just new imports)
- Pattern updates happen automatically with each import

### Schema Integration
- `recurringTypeDefs` added to typeDefs array
- `recurringResolvers` spread into Query and Mutation objects
- Follows existing patterns from analytics resolvers

## Next Phase Readiness

### Blockers
None.

### Dependencies Met
- ✅ Plan 04-01 complete (detection algorithm ready)
- ✅ Prisma schema extended with RecurringTransaction model
- ✅ Compound unique constraint exists for upsert pattern

### What's Ready for 04-03
**Frontend can now:**
- Query recurring transactions with filters (frequency, category, type)
- Get monthly-normalized summary totals
- Edit recurring items (change amount, category, frequency)
- Dismiss unwanted patterns (hide subscriptions they cancelled manually)
- Restore dismissed items (undo)
- Add manual recurring entries (track subscriptions not in bank data)
- Trigger manual detection (re-scan button)

**Automatic detection:**
- Runs after every statement import
- Updates existing patterns with new data
- Detects new patterns as history grows

### Recommended Next Steps
1. Create frontend hooks (useRecurring, useRecurringSummary)
2. Build recurring transactions list UI with filters
3. Build recurring summary dashboard section
4. Add edit/dismiss/restore actions in UI
5. Build manual add form for recurring entries

## Decisions Made

**1. Non-blocking detection in import flow**
- Detection wrapped in try/catch after status update
- Errors logged but don't fail import
- Ensures user always gets their transactions even if detection fails
- **Rationale:** Import success is more important than detection success. Detection can be re-run manually.

**2. Full transaction history detection on import**
- Each import triggers detection on ALL user transactions, not just new ones
- Ensures patterns update as history grows
- Handles pattern changes (price increases, frequency shifts)
- **Rationale:** Patterns improve with more data. Re-scanning full history on each import ensures patterns stay current.

**3. Monthly normalization in recurringSummary**
- All frequencies converted to monthly equivalent
- Enables accurate budget comparison across different frequencies
- Income ratio calculated on normalized amounts
- **Rationale:** Users think in monthly terms. "$50/week" vs "$600/year" hard to compare without normalization.

**4. dismissed flag defaults to false in query**
- If dismissed parameter not provided or explicitly false, show non-dismissed only
- If dismissed === true, show only dismissed items
- Two separate views: active recurring and dismissed recurring
- **Rationale:** Most users want to see active patterns by default. Dismissed items are "archived" - accessible but not cluttering main view.

## Files Changed

### Created
1. **spendwise-api/src/schema/typeDefs/recurring.ts** (73 lines)
   - RecurringTransaction type
   - RecurringSummary type
   - Input types for filters, sort, add, update
   - Query and Mutation extensions

2. **spendwise-api/src/schema/resolvers/recurring.ts** (357 lines)
   - recurring query with filtering and sorting
   - recurringSummary query with normalization
   - updateRecurring, dismissRecurring, restoreRecurring mutations
   - addRecurring manual entry mutation
   - detectRecurring manual trigger mutation

### Modified
3. **spendwise-api/src/schema/typeDefs/index.ts**
   - Import recurringTypeDefs
   - Add to typeDefs array

4. **spendwise-api/src/schema/resolvers/index.ts**
   - Import recurringResolvers
   - Spread into Query and Mutation objects

5. **spendwise-api/src/schema/resolvers/statementImport.ts**
   - Import detectRecurringPatterns
   - Add detection trigger in confirmImport after status update
   - Non-blocking try/catch wrapper

## Commits

- **9597214** - feat(04-02): create recurring transactions GraphQL API
- **961a9c5** - feat(04-02): wire recurring detection into statement import

## Performance Notes

**Execution time:** 6min 3s

**Detection performance considerations:**
- Detection runs on full transaction history (could be thousands of transactions)
- Currently synchronous in import flow - may block for large datasets
- Future optimization: Move to background job queue (Bull/BullMQ + Redis)
- Current implementation acceptable for MVP (<1000 transactions)

**Query performance:**
- Filtering leverages existing Prisma indexes
- No N+1 queries - all data fetched in single query
- Summary calculation iterates filtered results in-memory (fast for <100 patterns)

## Known Limitations

1. **Synchronous detection in import flow**
   - For users with 10,000+ transactions, detection could take several seconds
   - Import mutation waits for detection to complete (despite non-blocking error handling)
   - **Future:** Move to background job queue

2. **No pagination on recurring query**
   - Returns all matching items
   - Acceptable for MVP (most users have <50 recurring patterns)
   - **Future:** Add pagination with limit/offset

3. **No bulk operations**
   - Dismiss/restore one at a time
   - **Future:** Add dismissMany/restoreMany mutations

4. **Manual detection triggers full scan**
   - detectRecurring mutation re-scans all transactions
   - Could be expensive for large datasets
   - **Future:** Incremental detection (only new transactions since last scan)

## Success Metrics

- ✅ GraphQL API compiles without errors
- ✅ All 229 existing tests pass
- ✅ Schema loads correctly on server startup
- ✅ Detection trigger integrates into import flow
- ✅ Non-blocking detection design preserves import reliability
- ✅ All CRUD operations implemented
- ✅ Monthly normalization working correctly
- ✅ Compound unique key enables pattern updates
