---
status: complete
phase: 05-net-worth-tracking
source: [05-01-SUMMARY.md, 05-02-SUMMARY.md, 05-03-SUMMARY.md, 05-04-SUMMARY.md]
started: 2026-02-02T20:30:00Z
updated: 2026-02-02T20:43:00Z
---

## Current Test
<!-- OVERWRITE each test - shows where we are -->

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
  root_cause: ""
  artifacts: []
  missing: []
  debug_session: ""

- truth: "Backfill button appears when accounts exist but no historical snapshot data"
  status: failed
  reason: "User reported: I don't see the backfill button."
  severity: major
  test: 6
  root_cause: ""
  artifacts: []
  missing: []
  debug_session: ""

- truth: "Dashboard sparkline shows a recognizable mini graph of the 1-month net worth trend"
  status: failed
  reason: "User reported: Ok, it shows a green dot, but it didn't look like a graph at first glance. It needs to refine to show it like a graph."
  severity: minor
  test: 7
  root_cause: ""
  artifacts: []
  missing: []
  debug_session: ""

- truth: "Credit card accounts are listed under Liabilities in the account breakdown"
  status: failed
  reason: "User reported: it does not show Liabilities"
  severity: major
  test: 9
  root_cause: ""
  artifacts: []
  missing: []
  debug_session: ""
