---
phase: 02-ai-categorization-enhancement
plan: 02
subsystem: ai-categorization
tags: [openai, machine-learning, personalization, merchant-rules, user-history]

requires:
  - 01-01-database-schema
  - 01-02-encryption-setup
  - 02-01-structured-outputs-upgrade

provides:
  - User history context in AI categorization prompts
  - Retroactive re-categorization on merchant rule changes
  - Personalized AI categorization based on user corrections
  - Bulk category updates for similar transactions

affects:
  - 03-statement-upload-parsing (will benefit from improved categorization)
  - 04-ai-advice-engine (will use same personalization patterns)

tech-stack:
  added: []
  patterns:
    - User behavior learning (top-N pattern mining)
    - Retroactive bulk updates with preservation logic
    - Graceful degradation on query failures

key-files:
  created: []
  modified:
    - spendwise-api/src/lib/ai/categorizer.ts
    - spendwise-api/src/lib/merchant-rules.ts
    - spendwise-api/src/schema/resolvers/transaction.ts

key-decisions:
  - decision: Query top 50 merchant-category patterns from manual/rule categorizations
    rationale: Balances personalization with prompt token limits (~500 tokens)
    alternatives: [All history, Recent 20, No limit]

  - decision: Only include categorySource 'manual' and 'rule' in user history
    rationale: These represent deliberate user choices; 'ai' and 'keyword' are automated guesses
    alternatives: [Include all sources, Manual only]

  - decision: Retroactive updates skip categorySource 'manual' transactions
    rationale: Explicit user corrections are sacred and should never be overwritten
    alternatives: [Update all, Ask user, Skip manual and rule]

  - decision: Do not update merchant display name retroactively
    rationale: Merchant field was cleaned during import; changing it could be confusing
    alternatives: [Update display name too, Ask user]

duration: 7min
completed: 2026-02-01
---

# Phase 2 Plan 02: User History Context and Retroactive Re-categorization Summary

**One-liner:** AI learns from user's top 50 manual corrections and applies new merchant rules retroactively to similar transactions while preserving manual edits.

## Performance

**Duration:** 7 minutes
**Started:** 2026-02-01T17:12:44Z
**Completed:** 2026-02-01T17:20:08Z
**Tasks completed:** 2/2
**Files modified:** 3

## Accomplishments

### Task 1: User History Context in AI Prompt
- Added `getUserCategoryHistory` function to query user's categorization patterns
- Queries top 50 merchant-category pairs where categorySource is 'manual' or 'rule'
- Groups by merchant and category, orders by frequency (count descending)
- User history appended to AI system prompt with format: "Merchant -> Category (Nx)"
- Graceful degradation: returns empty string if query fails (doesn't break categorization)
- Fetched once before batch loop for efficiency (not per-batch)

### Task 2: Retroactive Re-categorization
- Implemented `applyMerchantRuleRetroactively` function in merchant-rules.ts
- Bulk updates all transactions matching merchant pattern where categorySource ≠ 'manual'
- Preserves user's manual corrections (sacred data)
- Returns count of updated transactions for visibility
- Updated `createOrUpdateMerchantRule` to call retroactive update and return { rule, retroactiveCount }
- Updated transaction resolver's `updateTransaction` and `saveMerchantRule` to handle new return type
- Console logging added for retroactive updates ("Retroactively updated N transactions...")

## Task Commits

| Task | Commit | Description |
|------|--------|-------------|
| 1 | 66c4151 | feat(02-02): add user history context to AI categorization prompt |
| 2 | 16d9141 | feat(02-02): implement retroactive re-categorization on merchant rule changes |

## Files Created

None. All changes were enhancements to existing files.

## Files Modified

### spendwise-api/src/lib/ai/categorizer.ts
- Added `getUserCategoryHistory` helper function (lines 29-57)
- Calls `getUserCategoryHistory` before batch loop (line 165)
- Appends `userHistoryContext` to system prompt (line 188)
- Note: File also contains Plan 02-01 changes (Zod Structured Outputs) committed in parallel

### spendwise-api/src/lib/merchant-rules.ts
- Added `applyMerchantRuleRetroactively` function (lines 4-32)
- Updated `createOrUpdateMerchantRule` return type to include retroactiveCount
- Calls retroactive update after upserting rule (line 65)
- Returns { rule, retroactiveCount } instead of just rule (line 80)

### spendwise-api/src/schema/resolvers/transaction.ts
- Updated `updateTransaction` mutation to handle new return type (lines 258-261)
- Updated `saveMerchantRule` mutation to return result.rule (line 289)
- Added console logging for retroactive updates

## Decisions Made

1. **Top 50 merchant-category pattern limit:** Balances personalization quality with prompt token efficiency. 50 patterns ≈ 500 tokens, leaving room for base instructions and transaction data.

2. **Filter by categorySource 'manual' and 'rule':** Only includes deliberate user choices in history. Automated categorizations ('ai', 'keyword', 'cache') are excluded as they're not confirmed preferences.

3. **Preserve manual categorizations in retroactive updates:** categorySource: 'manual' transactions are explicitly excluded from bulk updates. User's explicit corrections are never overwritten.

4. **Merchant display name not updated retroactively:** Transaction merchant field was already cleaned during import. Changing it post-import could confuse users. Only category, source, and confidence are updated.

5. **Graceful degradation on history query failure:** If getUserCategoryHistory fails, it returns empty string rather than throwing. AI categorization continues without user history (still better than no categorization).

## Deviations from Plan

None. Plan executed exactly as written.

## Integration Notes

### Concurrency with Plan 02-01
This plan executed IN PARALLEL with Plan 02-01 (Structured Outputs upgrade). Both plans modified `categorizer.ts`:
- Plan 02-01 changes: Zod imports, schema definition, openai.beta.chat.completions.parse
- Plan 02-02 changes: getUserCategoryHistory function, userHistoryContext in prompt

Changes were to different sections of the file and merged cleanly without conflicts. The commit for Task 1 includes both sets of changes with a note in the commit message.

### Database Query Performance
The `getUserCategoryHistory` query uses `groupBy` on 'merchant' and 'category' fields. These fields are indexed in the Transaction table (merchant has index for search, category has index for filtering). Query should be fast even with thousands of transactions.

The `applyMerchantRuleRetroactively` query uses `updateMany` with WHERE clause filtering by userId, categorySource, and merchant. All three fields are indexed. Bulk update should be efficient.

## Testing

- TypeScript compilation: PASSED (npx tsc --noEmit)
- All existing tests: PASSED (11 test suites, 201 tests)
- No new tests added (integration tests would require test database with historical transactions)

## Next Phase Readiness

**Status:** READY

**What's delivered:**
- AI categorization now learns from user's past corrections
- Merchant rule changes automatically fix similar past transactions
- Manual categorizations are protected from automated changes

**What this enables:**
- Phase 3 (Statement Upload Parsing): Imported transactions will be categorized based on user's established patterns from day one
- Phase 4 (AI Advice Engine): Can reuse the user history pattern to personalize advice based on user's actual spending categories

**Blockers:** None

**Recommendations:**
- Consider adding a UI indicator when retroactive updates occur (e.g., "Updated 12 similar transactions")
- Consider adding a "review retroactive changes" feature for power users
- Monitor OpenAI prompt token usage as users build larger category histories (50-pattern limit should be sufficient for v1)

## Success Criteria Met

- ✅ CATG-03: AI uses merchant + amount + user history (top 50 manual corrections in prompt)
- ✅ CATG-05: AI learns from corrections (merchant rules applied retroactively)
- ✅ Manual categorizations never overwritten (categorySource: 'manual' preserved)
- ✅ All changes backward-compatible (no schema changes, no new dependencies)
- ✅ TypeScript compiles without errors
- ✅ All tests pass

## Metadata

**Wave:** 1 (executed in parallel with Plan 02-01)
**Dependencies:** None (independent implementation)
**Autonomous execution:** Yes (no checkpoints, no human verification needed)
