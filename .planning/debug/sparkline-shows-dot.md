---
status: diagnosed
trigger: "Dashboard Sparkline Shows Dot Instead of Graph"
created: 2026-02-02T00:00:00Z
updated: 2026-02-02T00:00:00Z
---

## Current Focus

hypothesis: CONFIRMED - Multiple compounding causes produce the "green dot" symptom
test: Code analysis + Recharts known behavior verification
expecting: Sparkline receives 0-1 data points for ONE_MONTH range, Recharts cannot draw a line with <2 points
next_action: Report diagnosis (find_root_cause_only mode)

## Symptoms

expected: Dashboard net worth summary card displays a mini sparkline (60px height) showing 1-month net worth trend as a recognizable line chart
actual: User sees a "green dot" instead of a graph - the sparkline area shows a single dot, not a line
errors: Potentially silent - no crash, just visual degradation
reproduction: View dashboard after initial account setup without extensive snapshot history
started: Since net worth widget was added (phase 05-net-worth-tracking)

## Eliminated

- hypothesis: GraphQL query completely fails due to includeInNetWorth field error on the netWorth query itself
  evidence: The GET_NET_WORTH query (spendwise/src/graphql/queries/netWorth.ts) requests `includeInNetWorth` on the `AccountNetWorth` type (netWorth.ts typeDefs line 23), NOT on the `Account` type. The AccountNetWorth type correctly defines this field. The netWorth query itself does not fail due to this. The includeInNetWorth field IS missing from the Account type (account.ts line 4-15), but that only affects the toggleIncludeInNetWorth mutation return type, not the main netWorth query.
  timestamp: 2026-02-02T00:00:00Z

## Evidence

- timestamp: 2026-02-02T00:00:00Z
  checked: NetWorthSummaryCard.tsx sparkline rendering (lines 207-222)
  found: Sparkline renders when `sparklineData.length > 0` with `dot={false}` on the Line component (line 216). With dot={false} and only 1 data point, Recharts has a known issue (GitHub Issue #149) where NOTHING visible renders -- no line segment can be drawn from a single point, and the dot is explicitly hidden.
  implication: Even a single data point produces an invisible or barely visible rendering artifact

- timestamp: 2026-02-02T00:00:00Z
  checked: Snapshot creation mechanism (spendwise-api/src/lib/jobs/snapshotNetWorth.ts)
  found: Daily snapshots are created by a BullMQ cron job running at 2 AM daily (line 116: pattern '0 2 * * *'). Each run creates ONE snapshot per account per day. For a new user, after first day there would be 0-1 snapshots.
  implication: New users or recently-set-up accounts will have very few snapshots

- timestamp: 2026-02-02T00:00:00Z
  checked: Backfill mechanism (netWorth resolver, backfillNetWorthSnapshots mutation, lines 222-315)
  found: Backfill creates snapshots at MONTHLY granularity only (line 262: `currentDate.setDate(1)`, line 300: `currentDate.setMonth(currentDate.getMonth() + 1)`). For a ONE_MONTH time range, the backfill would produce at most 1-2 data points (this month's 1st and possibly last month's 1st).
  implication: Even after backfill, ONE_MONTH range gets very few history points

- timestamp: 2026-02-02T00:00:00Z
  checked: Resolver date filtering for ONE_MONTH (netWorth resolver lines 14-16, 68-76)
  found: ONE_MONTH range = last 30 days. The snapshotWhereClause filters `date: { gte: startDate, lte: endDate }`. With monthly backfill, only snapshots from the 1st of the current month (if within 30 days) would be returned. Daily snapshots only accumulate 1 per day -- after a few days you'd have a few points, but on day 1 you'd have 0-1.
  implication: The history array passed to sparklineData will typically have 0-2 entries for new/recent setups

- timestamp: 2026-02-02T00:00:00Z
  checked: sparklineData preparation (NetWorthSummaryCard.tsx lines 47-55)
  found: sparklineData maps history to `{ value: item.value }` objects. No padding, interpolation, or minimum-point-count logic exists. If history has 1 entry, sparklineData has 1 entry.
  implication: Component has no protection against few-data-point scenarios

- timestamp: 2026-02-02T00:00:00Z
  checked: Account type GraphQL definition (spendwise-api/src/schema/typeDefs/account.ts lines 4-15)
  found: The `Account` GraphQL type does NOT include `includeInNetWorth` field. The `toggleIncludeInNetWorth` mutation (netWorth.ts typeDefs line 44) returns `Account!`, and the frontend mutation (spendwise/src/graphql/mutations/netWorth.ts line 7) requests `includeInNetWorth` from the returned Account.
  implication: The toggleIncludeInNetWorth mutation will fail with a GraphQL error because `includeInNetWorth` is not a field on the Account type. This is a separate bug (noted in the symptom context as "test 5 error") that prevents users from toggling accounts in/out of net worth tracking. While this does NOT directly cause the sparkline issue (the main netWorth query still works), it means users cannot adjust which accounts are included, and the /net-worth page's AccountBreakdown toggle functionality is broken.

- timestamp: 2026-02-02T00:00:00Z
  checked: Recharts behavior with single data point and dot={false}
  found: Known Recharts issue (GitHub Issue #149). A LineChart needs >=2 points to draw a line segment. With 1 point and dot={false}, nothing visible renders. The "green dot" the user sees is likely from 2 very close data points rendering a tiny line segment that looks like a dot, OR from Recharts rendering a sub-pixel artifact.
  implication: This is the direct visual cause of the "green dot" symptom

## Resolution

root_cause: |
  **PRIMARY (3 compounding causes):**

  1. **Insufficient data points for ONE_MONTH sparkline** (data pipeline issue)
     - Daily snapshot job creates only 1 snapshot/day, so new users accumulate points slowly
     - Backfill mutation generates snapshots at MONTHLY granularity (1st of each month), yielding only 1-2 points within a 30-day window
     - No snapshot is created on account creation, so day-0 users have 0 history points

  2. **No minimum-data-point handling in sparkline component** (UI issue)
     - `NetWorthSummaryCard.tsx` line 207: renders sparkline whenever `sparklineData.length > 0`
     - No check for minimum viable data points (needs >=2 for a visible line)
     - No data padding/interpolation for sparse datasets

  3. **Recharts `dot={false}` hides single data points** (library behavior)
     - `NetWorthSummaryCard.tsx` line 216: `dot={false}` explicitly hides dots
     - With 1 data point, there's no line to draw AND the dot is hidden = invisible chart
     - With 2 very close points, a tiny line segment renders that looks like a "green dot"

  **SECONDARY (related but separate bug):**

  4. **`includeInNetWorth` missing from Account GraphQL type**
     - File: `spendwise-api/src/schema/typeDefs/account.ts` lines 4-15
     - The Account type lacks `includeInNetWorth: Boolean!` field
     - The `toggleIncludeInNetWorth` mutation returns `Account!` but the frontend requests `includeInNetWorth` on it
     - This causes the toggle mutation to fail, preventing users from managing which accounts are included
     - Indirectly worsens sparkline issue by preventing account management

fix: (diagnosis only - not applied)
verification: (diagnosis only - not verified)
files_changed: []
