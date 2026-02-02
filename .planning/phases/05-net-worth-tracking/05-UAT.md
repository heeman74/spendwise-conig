---
status: diagnosed
phase: 05-net-worth-tracking
source: [05-01-SUMMARY.md, 05-02-SUMMARY.md, 05-03-SUMMARY.md, 05-04-SUMMARY.md]
started: 2026-02-02T20:30:00Z
updated: 2026-02-02T20:50:00Z
---

## Current Test

[testing complete]

## Tests

### 1. Net Worth Page in Sidebar
expected: "Net Worth" appears in the sidebar navigation between "Recurring" and "Accounts". Clicking it navigates to /net-worth.
result: pass

### 2. Net Worth Hero Section
expected: The /net-worth page shows a hero section at the top displaying the current total net worth as a large formatted number, with month-over-month change and period change indicators (green for positive, red for negative, with directional arrows).
result: pass

### 3. Time Range Selector and Chart
expected: Below the hero, a historical line chart shows net worth over time. Above the chart, 5 time range buttons (1M, 3M, 6M, 1Y, All) allow switching periods. The chart updates when you select a different range.
result: pass

### 4. Account Breakdown Panel
expected: On desktop, an account breakdown panel appears to the right of the chart (or below on mobile). It shows two sections — Assets and Liabilities — each with subtotals. Each account shows its name, balance, type badge, and a mini sparkline.
result: pass

### 5. Include/Exclude Account Toggle
expected: Each account card in the breakdown has a toggle switch. Toggling an account off dims the card (reduced opacity) and the net worth hero value updates to exclude that account. Toggling back on restores it.
result: issue
reported: "Ok, the toggle switch does not work."
severity: major

### 6. Backfill Historical Data
expected: If you have accounts but no historical snapshot data, a "Backfill" button appears. Clicking it generates historical snapshots and the chart populates with data going back up to 24 months.
result: issue
reported: "I don't see the backfill button."
severity: major

### 7. Dashboard Net Worth Widget
expected: The main dashboard page shows a net worth summary card between the stats grid and charts section. It displays the current net worth value, a month-over-month change with colored arrow, and a mini sparkline showing the 1-month trend.
result: issue
reported: "Ok, it shows a green dot, but it didn't look like a graph at first glance. It needs to refine to show it like a graph."
severity: minor

### 8. Dashboard Widget Navigation
expected: Clicking anywhere on the dashboard net worth card navigates to the full /net-worth page. The card shows hover effects (shadow) to indicate it's clickable.
result: pass

### 9. Credit Accounts as Liabilities
expected: Any credit card accounts are listed under "Liabilities" in the account breakdown and their balances are subtracted from the total net worth (not added).
result: issue
reported: "it does not show Liabilities"
severity: major

### 10. Empty State
expected: If no accounts exist, the net worth page shows an appropriate empty state message rather than broken UI or zero values without context.
result: pass

## Summary

total: 10
passed: 6
issues: 4
pending: 0
skipped: 0

## Gaps

- truth: "Toggling an account off dims the card and the net worth hero value updates to exclude that account"
  status: failed
  reason: "User reported: Ok, the toggle switch does not work."
  severity: major
  test: 5
  root_cause: "includeInNetWorth field exists in Prisma schema but was never added to the Account GraphQL type definition in account.ts. The toggleIncludeInNetWorth mutation returns Account!, and the frontend requests includeInNetWorth on that return type, causing GraphQL validation error."
  artifacts:
    - path: "spendwise-api/src/schema/typeDefs/account.ts"
      issue: "Account type missing includeInNetWorth: Boolean! field (lines 4-15)"
    - path: "spendwise/src/graphql/mutations/netWorth.ts"
      issue: "Mutation requests includeInNetWorth on Account return type (line 7)"
  missing:
    - "Add includeInNetWorth: Boolean! to Account GraphQL type definition"
  debug_session: ".planning/debug/toggle-not-working.md"

- truth: "Backfill button appears when accounts exist but no historical snapshot data"
  status: failed
  reason: "User reported: I don't see the backfill button."
  severity: major
  test: 6
  root_cause: "NOT A BUG. Button is correctly hidden because daily snapshot cron job has already created history data. The condition (hasAccounts && !hasHistory) evaluates to false. This is a UX design gap — button disappears as soon as any snapshot exists even if user wants to backfill deeper history."
  artifacts:
    - path: "spendwise/src/app/(dashboard)/net-worth/page.tsx"
      issue: "Button visibility condition correct but too restrictive (lines 59-60, 83)"
  missing:
    - "Improve backfill button condition to check for sufficient historical coverage rather than any history existing"
    - "Consider making backfill a persistent action (menu item or settings) rather than conditional banner"
  debug_session: ".planning/debug/backfill-button-missing.md"

- truth: "Dashboard sparkline shows a recognizable mini graph of the 1-month net worth trend"
  status: failed
  reason: "User reported: Ok, it shows a green dot, but it didn't look like a graph at first glance. It needs to refine to show it like a graph."
  severity: minor
  test: 7
  root_cause: "Three compounding issues: (1) ONE_MONTH range yields very few data points from daily cron + monthly backfill granularity, (2) No minimum data point handling in sparkline component — renders with 1+ points regardless, (3) Recharts with dot={false} cannot draw a line from a single point, rendering nothing or a tiny dot."
  artifacts:
    - path: "spendwise/src/components/dashboard/NetWorthSummaryCard.tsx"
      issue: "No min-point guard (line 207), dot={false} hides single points (line 216), no data padding (lines 47-55)"
  missing:
    - "Add minimum data point check — if < 2 points, show placeholder or pad data"
    - "Enable dot rendering when only 1-2 points exist"
    - "Consider extending time range or padding sparse data for visual density"
  debug_session: ".planning/debug/sparkline-shows-dot.md"

- truth: "Credit card accounts are listed under Liabilities in the account breakdown"
  status: failed
  reason: "User reported: it does not show Liabilities"
  severity: major
  test: 9
  root_cause: "Same root cause as test 5: includeInNetWorth field missing from Account GraphQL type causes mutations to fail. Additionally, if db:push was not run after schema changes, the includeInNetWorth column may not exist in the database, causing the netWorth resolver to crash when filtering with includeInNetWorth: true. When the query fails, page.tsx renders error state instead of AccountBreakdown component."
  artifacts:
    - path: "spendwise-api/src/schema/typeDefs/account.ts"
      issue: "Account type missing includeInNetWorth: Boolean! field (lines 4-15)"
    - path: "spendwise-api/src/schema/resolvers/netWorth.ts"
      issue: "Resolver filters with includeInNetWorth: true (line 81) which requires DB column"
  missing:
    - "Add includeInNetWorth: Boolean! to Account GraphQL type definition"
    - "Ensure db:push is run so includeInNetWorth column exists in database"
  debug_session: ".planning/debug/liabilities-not-shown.md"
