---
status: diagnosed
trigger: "User reports they don't see the backfill button on the /net-worth page"
created: 2026-02-02T21:00:00Z
updated: 2026-02-02T21:15:00Z
---

## Current Focus

hypothesis: The backfill button is correctly hidden because snapshot history data already exists (from the daily BullMQ snapshot job or a prior backfill), making `hasHistory` evaluate to `true`.
test: Trace the conditional rendering logic and the data pipeline
expecting: `hasAccounts && !hasHistory` evaluates to false because history is non-empty
next_action: Return diagnosis

## Symptoms

expected: If user has accounts but no historical snapshot data, a "Backfill" button should appear on /net-worth page
actual: User does not see the backfill button
errors: None reported (no red error banner visible -- user sees the page with chart data)
reproduction: Navigate to /net-worth -- no backfill button visible
started: First time testing this feature (phase 05 UAT test 6)

## Eliminated

- hypothesis: The netWorth query fails due to the `includeInNetWorth` field missing from the GraphQL `Account` type, causing an error state that hides the button
  evidence: The `GET_NET_WORTH` query requests `includeInNetWorth` on the `AccountNetWorth` type (defined in `netWorth.ts` typeDefs at line 23), NOT on the `Account` type. The `AccountNetWorth` type correctly includes `includeInNetWorth: Boolean!`. The query would only fail if it requested this field on `Account` type, which it does not. The `Account` type missing `includeInNetWorth` is a SEPARATE bug that affects the `toggleIncludeInNetWorth` mutation (test 5), not the netWorth query itself.
  timestamp: 2026-02-02T21:05:00Z

- hypothesis: The button condition logic is wrong (e.g., checking wrong fields)
  evidence: The condition on page.tsx line 83 is `{hasAccounts && !hasHistory && (...)}`. `hasAccounts` is `netWorth?.accounts && netWorth.accounts.length > 0` (line 59). `hasHistory` is `netWorth?.history && netWorth.history.length > 0` (line 60). These directly check the query response fields. The logic correctly shows the button only when accounts exist AND history is empty. The condition itself is correct.
  timestamp: 2026-02-02T21:07:00Z

## Evidence

- timestamp: 2026-02-02T21:02:00Z
  checked: UAT test results in 05-UAT.md
  found: Test 3 (Time Range Selector and Chart) PASSED -- user confirmed they see chart data and can switch time ranges
  implication: If the chart shows data, `netWorth.history` must be non-empty, which means `hasHistory` is `true`

- timestamp: 2026-02-02T21:03:00Z
  checked: Backfill button rendering condition in page.tsx line 83
  found: Button renders when `hasAccounts && !hasHistory` -- both conditions must be true simultaneously
  implication: If history has any data points, `!hasHistory` is false and button is hidden regardless of accounts

- timestamp: 2026-02-02T21:04:00Z
  checked: GET_NET_WORTH query (spendwise/src/graphql/queries/netWorth.ts)
  found: Query fetches `history { date value }` from `NetWorthData` type. The `history` field in the resolver (netWorth.ts lines 103-122) is built from `netWorthSnapshot` records filtered by date range
  implication: If any NetWorthSnapshot records exist within the time range, history will be non-empty

- timestamp: 2026-02-02T21:05:00Z
  checked: Daily snapshot job (spendwise-api/src/lib/jobs/snapshotNetWorth.ts)
  found: A BullMQ cron job runs at 2 AM daily (line 116: `pattern: '0 2 * * *'`). It is initialized on API server start (index.ts line 81). It calls `captureAllUserSnapshots()` which creates a `NetWorthSnapshot` record for every account with `includeInNetWorth: true` for every user
  implication: If the API server has been running, at least one daily snapshot exists, making `history` non-empty

- timestamp: 2026-02-02T21:06:00Z
  checked: Default time range in page.tsx
  found: `const [timeRange, setTimeRange] = useState('ONE_MONTH')` (line 15). The resolver filters snapshots to the last 30 days for ONE_MONTH range
  implication: Even a single snapshot from today would appear in the ONE_MONTH history, making `hasHistory` true

- timestamp: 2026-02-02T21:08:00Z
  checked: Account type GraphQL schema (spendwise-api/src/schema/typeDefs/account.ts)
  found: The `Account` GraphQL type does NOT include `includeInNetWorth` field. But `AccountNetWorth` type in netWorth.ts DOES include it. The `toggleIncludeInNetWorth` mutation returns `Account!` type, which is the SEPARATE test 5 bug
  implication: The missing field on `Account` type only breaks the toggle mutation (test 5), not the netWorth query (test 6)

- timestamp: 2026-02-02T21:10:00Z
  checked: Resolver account filtering (spendwise-api/src/schema/resolvers/netWorth.ts lines 79-85)
  found: `currentAccounts` query filters by `includeInNetWorth: true`. The `accounts` array in the response is mapped from `currentAccounts` only
  implication: The netWorth query only returns accounts where includeInNetWorth is true. All accounts default to `includeInNetWorth: true` (Prisma schema line 55: `@default(true)`), so all accounts appear

- timestamp: 2026-02-02T21:12:00Z
  checked: Whether snapshot data could exist without explicit backfill
  found: Two sources create NetWorthSnapshot records: (1) the `backfillNetWorthSnapshots` mutation (manual trigger), (2) the daily BullMQ cron job at 2 AM. The cron job runs automatically when the API server is running. No seed script exists
  implication: If the user has been running the API server, the daily job would have created at least one snapshot record, which populates `history` and hides the backfill button

## Resolution

root_cause: The backfill button is correctly hidden because snapshot history data already exists. The daily BullMQ snapshot cron job (runs at 2 AM via `setupNetWorthSnapshotQueue()` in `spendwise-api/src/lib/jobs/snapshotNetWorth.ts`) automatically creates `NetWorthSnapshot` records whenever the API server is running. Since the user passed UAT test 3 (chart with data visible, time range buttons working), `netWorth.history` is non-empty, causing `hasHistory` to evaluate to `true` on line 60 of `page.tsx`. The button condition `hasAccounts && !hasHistory` (line 83) then evaluates to `false`, correctly hiding the button.

This is scenario (a): the button is correctly hidden because history data exists. The button only appears in the narrow window between "user creates their first account" and "the first daily snapshot runs (or user manually backfills)." Once any snapshot exists for the current time range, the button disappears permanently.

NOTE: There is a UX design concern here -- the button text says "Generate Historical Data" and is meant to backfill up to 24 months of historical snapshots. But it disappears as soon as ANY snapshot exists (even a single day). A user who has 1 day of snapshots but wants 24 months of backfilled history would never see this button. The condition should arguably check whether SUFFICIENT history exists, not just whether ANY history exists. However, this is a design/UX issue, not a code bug.

fix: N/A (diagnosis only)
verification: N/A (diagnosis only)
files_changed: []
