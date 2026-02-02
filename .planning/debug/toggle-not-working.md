---
status: diagnosed
trigger: "Include/Exclude Account Toggle Not Working - GraphQL error: Cannot query field includeInNetWorth on type Account"
created: 2026-02-02T00:00:00Z
updated: 2026-02-02T00:01:00Z
---

## Current Focus

hypothesis: CONFIRMED - includeInNetWorth field exists in Prisma schema but is NOT exposed in the Account GraphQL type definition
test: Read Account GraphQL type definition at spendwise-api/src/schema/typeDefs/account.ts
expecting: Field missing from Account type
next_action: Diagnosis complete - return findings

## Symptoms

expected: Each account card in the net worth breakdown has a toggle switch. Toggling an account off should dim the card and update the net worth hero value to exclude that account.
actual: GraphQL error observed - Cannot query field "includeInNetWorth" on type "Account"
errors: Cannot query field "includeInNetWorth" on type "Account"
reproduction: Toggle the include/exclude switch on any account card in the net worth page
started: Since net worth feature was implemented (Phase 05)

## Eliminated

(none - first hypothesis was correct)

## Evidence

- timestamp: 2026-02-02T00:00:10Z
  checked: spendwise/prisma/schema.prisma (line 55)
  found: Account model includes `includeInNetWorth Boolean @default(true)` - field exists in database
  implication: Database layer is correct

- timestamp: 2026-02-02T00:00:20Z
  checked: spendwise-api/src/schema/typeDefs/account.ts (lines 4-15)
  found: Account GraphQL type has fields id, userId, name, type, balance, institution, lastSynced, transactions, createdAt, updatedAt - NO includeInNetWorth field
  implication: ROOT CAUSE - the Account type in GraphQL does not expose includeInNetWorth, so any query or mutation returning Account that selects includeInNetWorth will fail

- timestamp: 2026-02-02T00:00:30Z
  checked: spendwise-api/src/schema/typeDefs/netWorth.ts (line 44)
  found: toggleIncludeInNetWorth mutation returns `Account!` type. AccountNetWorth type (line 23) correctly has includeInNetWorth field, but that is a separate type used within NetWorthData, not the Account type itself
  implication: The netWorth query works for reading includeInNetWorth via AccountNetWorth, but the toggle mutation fails because it returns the Account type which lacks the field

- timestamp: 2026-02-02T00:00:40Z
  checked: spendwise/src/graphql/mutations/netWorth.ts (lines 3-10)
  found: Frontend mutation requests `{ id, includeInNetWorth }` on the Account returned by toggleIncludeInNetWorth
  implication: Frontend correctly expects includeInNetWorth on Account type, but GraphQL schema rejects it

- timestamp: 2026-02-02T00:00:50Z
  checked: spendwise-api/src/schema/resolvers/netWorth.ts (lines 194-219)
  found: toggleIncludeInNetWorth resolver correctly toggles the Prisma field and returns the updated account object (which includes includeInNetWorth from Prisma)
  implication: Resolver logic is correct - the data flow works at the Prisma level, only the GraphQL type definition is missing the field

- timestamp: 2026-02-02T00:01:00Z
  checked: spendwise-api/src/schema/resolvers/account.ts (lines 123-163)
  found: Account field resolvers only define balance and transactions - no includeInNetWorth resolver needed (Prisma returns it directly)
  implication: No additional resolver needed; simply adding the field to the Account type definition will allow GraphQL to auto-resolve it from the Prisma object

## Resolution

root_cause: The `includeInNetWorth` field was added to the Prisma schema (Account model, line 55 of schema.prisma) and used in the netWorth resolvers, but was NEVER added to the Account GraphQL type definition in `spendwise-api/src/schema/typeDefs/account.ts`. The `toggleIncludeInNetWorth` mutation (defined in netWorth.ts typeDefs, line 44) returns `Account!`, and the frontend mutation requests `includeInNetWorth` on that Account. Since the GraphQL Account type (account.ts lines 4-15) does not declare `includeInNetWorth: Boolean!`, GraphQL rejects the query with "Cannot query field 'includeInNetWorth' on type 'Account'".
fix:
verification:
files_changed: []
