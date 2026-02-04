---
status: testing
phase: 02-ai-categorization-enhancement
source: [02-01-SUMMARY.md, 02-02-SUMMARY.md, 02-03-SUMMARY.md]
started: 2026-02-01T17:40:00Z
updated: 2026-02-01T17:40:00Z
---

## Current Test

number: 3
name: Category override from review tab
expected: |
  Clicking edit on a transaction in the "Needs Review" tab opens the edit form. Changing the category and saving should update the transaction. The corrected transaction should disappear from the review list (since it's now manual/100% confidence).
awaiting: user response

## Tests

### 1. Needs Review tab visible on transactions page
expected: On the transactions page, two tabs appear: "All Transactions" and "Needs Review". The "Needs Review" tab has an amber count badge if flagged transactions exist. Clicking it shows either the flagged transactions list or "All caught up!" empty state.
result: issue
reported: "Ok, on Edit transaction, should have add in category to be able to create new category to assign to the transaction."
severity: major

### 2. Confidence detail shown in review tab
expected: When viewing the "Needs Review" tab, each transaction shows its confidence percentage and categorization source inline (e.g., "65% (ai)" or "45% (keyword)") next to the category badge.
result: issue
reported: "20% (keyword) shown in category prediction — source labels like 'keyword' and 'ai' are technical and should be user-friendly. Low confidence keyword fallbacks showing raw internals."
severity: minor

### 3. Category override from review tab
expected: Clicking edit on a transaction in the "Needs Review" tab opens the edit form. Changing the category and saving should update the transaction. The corrected transaction should disappear from the review list (since it's now manual/100% confidence).
result: [pending]

### 4. Filters hidden in review mode
expected: When the "Needs Review" tab is active, the category/date/account filters and export button should be hidden. Switching back to "All Transactions" should restore them.
result: [pending]

### 5. Category list consistency
expected: The category dropdown in the transaction edit form shows the same categories that the AI uses for categorization: Food & Dining, Groceries, Shopping, Transportation, Bills & Utilities, Entertainment, Healthcare, Travel, Education, Personal Care, Income, Transfer, Other.
result: [pending]

### 6. Retroactive updates on category correction
expected: After correcting a transaction's category from "Needs Review", check the "All Transactions" tab. Other transactions from the same merchant should also have been updated to the new category (unless they were manually categorized before). The console (API logs) should show "Retroactively updated N transactions for merchant..." if similar transactions existed.
result: [pending]

## Summary

total: 6
passed: 0
issues: 2
pending: 4
skipped: 0

## Gaps

- truth: "User can create a new custom category when editing a transaction"
  status: failed
  reason: "User reported: Edit transaction form should have an 'add category' button so users can create new custom categories to assign to transactions."
  severity: major
  test: 1
  root_cause: "Category dropdown only shows fixed VALID_CATEGORIES list (13 predefined). No UI or backend support for user-defined categories."
  artifacts: ["spendwise-api/src/lib/constants.ts", "spendwise/src/app/(dashboard)/transactions/page.tsx"]
  missing: ["Custom category model/storage", "Add category UI in edit form", "Integration with AI categorizer"]
  debug_session: ""

- truth: "Confidence source labels are user-friendly in review tab"
  status: failed
  reason: "User reported: '20% (keyword)' shown — source labels 'keyword' and 'ai' are raw technical terms, not user-friendly."
  severity: minor
  test: 2
  root_cause: "TransactionItem.tsx displays categorySource directly: `{transaction.categoryConfidence}% ({transaction.categorySource})`. No mapping to human-readable labels."
  artifacts: ["spendwise/src/components/transactions/TransactionItem.tsx:80"]
  missing: ["Source label mapping (ai → 'AI predicted', keyword → 'Best guess', rule → 'Your rule')"]
  debug_session: ""
