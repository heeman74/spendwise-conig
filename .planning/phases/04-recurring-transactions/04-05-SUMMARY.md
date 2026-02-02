---
phase: 04-recurring-transactions
plan: 05
completed: 2026-02-02
duration: 5min 5s
subsystem: frontend-cache
tags: [apollo-client, cache-invalidation, refetchQueries, recurring-transactions]

requires:
  - 04-03 # Original frontend hooks with string-based refetchQueries

provides:
  - recurring-cache-fix # Document-based refetchQueries for all mutation hooks

affects:
  - None # Bug fix, no downstream changes needed

tech-stack:
  added:
    - None
  patterns:
    - document-based-refetchQueries # Use query documents instead of operation name strings
    - awaitRefetchQueries # Ensure UI waits for cache update before re-rendering

key-files:
  created: []
  modified:
    - spendwise/src/hooks/useRecurring.ts # All 4 mutation hooks updated

decisions:
  - id: document-vs-string-refetch
    choice: Use { query: GET_RECURRING } instead of 'GetRecurring' string
    rationale: Document-based refetch tells Apollo to refetch ALL active instances of the query regardless of variables, fixing the bug where dismissed:true and dismissed:false instances were not both refreshed
    alternatives: [Manual cache updates with writeQuery, String-based with explicit variable combinations]
    impact: Both active and dismissed lists update immediately after any mutation

commits:
  - hash: ba0e5ce
    message: "fix(04-05): use document-based refetchQueries for recurring mutations"
    files: 1
    scope: All 4 mutation hooks in useRecurring.ts
---

# Phase 04 Plan 05: Fix Apollo Cache Invalidation for Recurring Mutations

**One-liner:** Document-based refetchQueries with awaitRefetchQueries on all recurring mutation hooks to fix dismiss/restore list synchronization

## Performance

- Start: 2026-02-02T05:11:28Z
- End: 2026-02-02T05:16:33Z
- Duration: 5 minutes 5 seconds
- Tasks: 1/1 complete

## What Was Fixed

### Root Cause
The recurring page uses two instances of the `GetRecurring` query with different variables:
- `useRecurring({ dismissed: false })` for the active list
- `useRecurring({ dismissed: true })` for the dismissed list

All four mutation hooks used string-based refetchQueries (`['GetRecurring', 'GetRecurringSummary']`). When Apollo receives a string operation name, it may not properly refetch ALL active query instances with different variables. This caused the dismissed list to not update after a restore operation.

### Fix Applied
Changed all four mutation hooks from:
```typescript
refetchQueries: ['GetRecurring', 'GetRecurringSummary'],
```
to:
```typescript
refetchQueries: [
  { query: GET_RECURRING },
  { query: GET_RECURRING_SUMMARY },
],
awaitRefetchQueries: true,
```

When Apollo receives a query document object (without variables), it refetches every active watcher of that query regardless of their variables. The `awaitRefetchQueries: true` ensures the mutation promise doesn't resolve until all refetches complete, preventing UI flash.

### Hooks Updated
1. `useUpdateRecurring()` - edit recurring item
2. `useDismissRecurring()` - soft delete (move to dismissed)
3. `useRestoreRecurring()` - undo soft delete (move back to active)
4. `useAddRecurring()` - manual entry

## Task Commits

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Fix refetchQueries in all mutation hooks | ba0e5ce | spendwise/src/hooks/useRecurring.ts |

## Files Modified

- `spendwise/src/hooks/useRecurring.ts` - 4 mutation hooks updated (20 insertions, 4 deletions)

## Decisions Made

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Refetch strategy | Document-based `{ query: GET_RECURRING }` | Refetches ALL active instances regardless of variables |
| Await refetch | `awaitRefetchQueries: true` | Prevents UI flash, ensures data is ready before re-render |

## Deviations from Plan

None -- plan executed exactly as written.

## Issues Encountered

None. The fix was straightforward -- a single-file change affecting 4 hook definitions.

## Verification

- TypeScript: No type errors in useRecurring.ts
- Build: Compiled successfully, /recurring route at 5.41 kB
- Pattern: All 4 mutation hooks consistently use document-based refetchQueries

## Next Phase Readiness

This was a gap closure plan (04-05) fixing a UAT-discovered issue. Phase 04 recurring transactions is now fully complete with this cache invalidation fix.

---

**Duration**: 5 minutes 5 seconds
**Commits**: 1
**Files Modified**: 1
**Lines Changed**: +20 / -4
