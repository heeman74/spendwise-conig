---
status: diagnosed
trigger: "Liabilities section not showing in account breakdown on /net-worth page"
created: 2026-02-02T00:00:00Z
updated: 2026-02-02T00:01:00Z
symptoms_prefilled: true
goal: find_root_cause_only
---

## Current Focus

hypothesis: CONFIRMED - Account GraphQL type missing includeInNetWorth field causes toggleIncludeInNetWorth mutation to fail; this is the primary schema defect. Secondary: if includeInNetWorth column missing from DB, the GET_NET_WORTH query itself would also fail, preventing AccountBreakdown from rendering at all.
test: N/A - root cause found
expecting: N/A
next_action: Return diagnosis

## Symptoms

expected: Credit card accounts listed under a "Liabilities" section in account breakdown, balances subtracted from total net worth
actual: Liabilities section does not show in account breakdown panel on /net-worth page
errors: Possible includeInNetWorth GraphQL error may cause entire netWorth query to fail
reproduction: Visit /net-worth page, observe account breakdown panel
started: Unknown - may be since initial implementation

## Eliminated

- hypothesis: AccountBreakdown component conditionally hides Liabilities section when no credit accounts exist
  evidence: Lines 67-90 of AccountBreakdown.tsx ALWAYS render the Liabilities section unconditionally, showing "No liability accounts" when empty. The section is never conditionally hidden.
  timestamp: 2026-02-02T00:00:10Z

- hypothesis: GET_NET_WORTH query requests fields not on AccountNetWorth type
  evidence: GET_NET_WORTH queries the AccountNetWorth type which defines all requested fields including accountId, accountName, accountType, balance, percentOfTotal, includeInNetWorth, and history. The query is valid against the schema.
  timestamp: 2026-02-02T00:00:20Z

- hypothesis: Decimal scalar fails to serialize Prisma Decimal for AccountNetWorth.balance
  evidence: The Decimal scalar (scalars.ts lines 39-41) explicitly handles Prisma Decimal objects via toNumber() method check. The serialization path is correct.
  timestamp: 2026-02-02T00:00:25Z

- hypothesis: Resolver does not return accountType for credit card accounts
  evidence: Resolver line 166 returns accountType: account.type which comes from Prisma AccountType enum. CREDIT is a valid enum value. The filtering in AccountBreakdown (line 30) matches on 'CREDIT'. This path is correct.
  timestamp: 2026-02-02T00:00:30Z

## Evidence

- timestamp: 2026-02-02T00:00:10Z
  checked: AccountBreakdown.tsx (spendwise/src/components/net-worth/AccountBreakdown.tsx)
  found: Lines 27-30 split accounts by accountType. Line 30 filters for CREDIT type. Lines 67-90 always render Liabilities section regardless of whether liabilities array is empty. If empty, shows "No liability accounts" message.
  implication: The component itself correctly handles both assets and liabilities. The issue is not in the component rendering logic.

- timestamp: 2026-02-02T00:00:15Z
  checked: Account GraphQL type definition (spendwise-api/src/schema/typeDefs/account.ts lines 4-15)
  found: Account type defines: id, userId, name, type, balance, institution, lastSynced, transactions, createdAt, updatedAt. NO includeInNetWorth field.
  implication: The toggleIncludeInNetWorth mutation returns Account! but the client requests includeInNetWorth on it, which will cause a GraphQL validation error.

- timestamp: 2026-02-02T00:00:17Z
  checked: toggleIncludeInNetWorth mutation definition (spendwise-api/src/schema/typeDefs/netWorth.ts line 44)
  found: Returns Account! type. The client mutation (spendwise/src/graphql/mutations/netWorth.ts lines 5-8) requests { id, includeInNetWorth } from the returned Account.
  implication: This mutation WILL fail at the GraphQL level because includeInNetWorth is not a field on the Account type. Users cannot toggle accounts in/out of net worth.

- timestamp: 2026-02-02T00:00:20Z
  checked: AccountNetWorth type definition (spendwise-api/src/schema/typeDefs/netWorth.ts lines 17-25)
  found: AccountNetWorth type correctly defines includeInNetWorth: Boolean! along with all other fields the GET_NET_WORTH query requests.
  implication: The main GET_NET_WORTH query is valid against the schema and should not fail due to type definition issues.

- timestamp: 2026-02-02T00:00:25Z
  checked: netWorth resolver account query filter (spendwise-api/src/schema/resolvers/netWorth.ts lines 79-85)
  found: Line 81 filters accounts with includeInNetWorth: true in the Prisma where clause. This uses a Prisma field that exists in schema.prisma but was NOT part of the initial migration.
  implication: If the includeInNetWorth column does not exist in the actual database (db:push not run after adding field), this Prisma query will throw a database error, causing the entire netWorth query to fail with an error. The page.tsx error handler (lines 47-57) would then show the error state instead of the AccountBreakdown component.

- timestamp: 2026-02-02T00:00:28Z
  checked: Database migration history (spendwise/prisma/migrations/20260127235041_init/migration.sql)
  found: The init migration creates the Account table WITHOUT the includeInNetWorth column or NetWorthSnapshot table. No subsequent migrations exist. The project relies on db:push for schema changes.
  implication: If db:push was not executed after the net worth feature was added, the database is missing the includeInNetWorth column and the NetWorthSnapshot table, which would cause the netWorth resolver to crash.

- timestamp: 2026-02-02T00:00:30Z
  checked: Page error handling (spendwise/src/app/(dashboard)/net-worth/page.tsx lines 38-57)
  found: If the useNetWorth hook returns an error, the page shows a red error banner ("Failed to load net worth data") and does NOT render the AccountBreakdown component at all. The AccountBreakdown only renders inside the hasAccounts conditional block (lines 129-148).
  implication: Any query-level error would prevent the entire account breakdown (including both Assets and Liabilities sections) from rendering.

## Resolution

root_cause: |
  TWO RELATED ISSUES:

  ISSUE 1 (DEFINITE BUG - Schema gap): The Account GraphQL type definition
  (spendwise-api/src/schema/typeDefs/account.ts lines 4-15) is missing the
  includeInNetWorth field. The toggleIncludeInNetWorth mutation
  (netWorth.ts typeDefs line 44) returns Account!, and the client mutation
  (spendwise/src/graphql/mutations/netWorth.ts line 7) requests includeInNetWorth
  from the returned Account. Since Account type does not define this field,
  the server rejects the mutation with a GraphQL validation error:
  "Cannot query field 'includeInNetWorth' on type 'Account'."
  This prevents users from toggling accounts in/out of net worth.

  ISSUE 2 (LIKELY BUG - Missing DB column): The netWorth resolver
  (spendwise-api/src/schema/resolvers/netWorth.ts line 81) filters accounts
  with includeInNetWorth: true in the Prisma where clause. The
  includeInNetWorth column was added to the Prisma schema but the init
  migration does NOT include it (no column in Account table creation, no
  NetWorthSnapshot table). If db:push was not run after this feature was
  added, the Prisma query crashes with a database error, causing the entire
  GET_NET_WORTH query to fail. The page.tsx error handler then renders
  the error state instead of the AccountBreakdown component, which is why
  the Liabilities section (and everything else) does not appear.

fix:
verification:
files_changed: []
