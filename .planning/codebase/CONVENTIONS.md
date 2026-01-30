# Coding Conventions

**Analysis Date:** 2026-01-30

## Naming Patterns

**Files:**
- Components: PascalCase (e.g., `Button.tsx`, `TransactionList.tsx`)
- Hooks: camelCase with `use` prefix (e.g., `useTransactions.ts`, `useDashboard.ts`)
- Utilities/Helpers: camelCase (e.g., `utils.ts`, `prisma.ts`, `redis.ts`)
- Type definitions: PascalCase (e.g., `types/index.ts`)
- GraphQL resolvers: camelCase with domain suffix (e.g., `user.ts`, `transaction.ts`)
- Test files: match source file name with `.test.ts` or `.spec.ts` suffix (e.g., `Card.test.tsx`, `user.test.ts`)
- GraphQL queries/mutations: separate files by domain in `graphql/queries/` and `graphql/mutations/`

**Functions:**
- camelCase for all functions (exported and internal)
- Prefix with `get`, `set`, `create`, `update`, `delete`, `is`, `has`, `check` for clarity
- Examples: `parseDecimal()`, `getMonthRange()`, `createTransaction()`, `requireAuth()`

**Variables:**
- camelCase for all variables and constants
- React component props: camelCase (e.g., `isLoading`, `leftIcon`, `variant`)
- GraphQL input types and interfaces: camelCase (e.g., `TransactionFilterInput`, `CreateTransactionInput`)

**Types/Interfaces:**
- PascalCase for all TypeScript types and interfaces
- Suffix interface names with `Input` for GraphQL mutation/query inputs (e.g., `CreateTransactionInput`, `TransactionFilterInput`)
- GraphQL type definitions: PascalCase matching schema types (e.g., `User`, `Transaction`, `Account`)
- Examples: `AuthUser`, `JWTPayload`, `Context`, `ButtonProps`

**GraphQL Naming:**
- Query names: camelCase (e.g., `transactions`, `recentTransactions`, `me`)
- Mutation names: camelCase (e.g., `createTransaction`, `updateProfile`, `login`)
- Type names: PascalCase (e.g., `User`, `Transaction`, `PageInfo`)
- Enum values: SCREAMING_SNAKE_CASE (e.g., `EXPENSE`, `INCOME`, `CHECKING`, `SAVINGS`)

## Code Style

**Formatting:**
- No explicit formatter configured (no `.prettierrc` or ESLint config present)
- Projects use TypeScript strict mode: `"strict": true`
- Indentation: 2 spaces (standard for Next.js and Node.js)
- Line length: No explicit limit enforced
- Trailing commas: Used in multi-line structures

**Linting:**
- Frontend uses Next.js built-in linting: `npm run lint`
- No explicit ESLint configuration found, relying on Next.js defaults
- TypeScript compilation enforced with strict mode

**Language Features:**
- Use const and let; avoid var
- Arrow functions preferred for callbacks and functional patterns
- Destructuring used extensively for function parameters and object access
- Nullish coalescing (`??`) and optional chaining (`?.`) used for safe access
- Template literals for string interpolation

## Import Organization

**Order:**
1. Third-party library imports (React, Next.js, Apollo, Redux, Prisma, etc.)
2. Type imports from third-party libraries
3. Internal imports from `@/` path alias
4. Internal type imports

**Path Aliases:**
- `@/` → `./src/` (configured in `tsconfig.json`)
- Frontend example: `import { useTransactions } from '@/hooks/useTransactions'`
- Backend: No path alias configured; uses relative imports

**Import Examples:**

Frontend:
```typescript
'use client';

import { useQuery, useMutation, useApolloClient } from '@apollo/client/react';
import { GET_TRANSACTIONS, CREATE_TRANSACTION } from '@/graphql';
import Button from '@/components/ui/Button';
import { useTransactions } from '@/hooks/useTransactions';
import type { TransactionFilterInput } from '@/hooks/useTransactions';
```

Backend:
```typescript
import { Prisma } from '@prisma/client';
import { GraphQLError } from 'graphql';
import { Context } from '../../context';
import { requireAuth, NotFoundError } from '../../middleware/authMiddleware';
import { invalidateCache } from '../../lib/redis';
```

## Error Handling

**Patterns:**
- GraphQL errors use `GraphQLError` with extensions for error codes
- Error codes used: `UNAUTHENTICATED`, `BAD_USER_INPUT`, `NOT_FOUND`
- Examples from `src/schema/resolvers/user.ts`:
  ```typescript
  throw new GraphQLError('Invalid credentials', {
    extensions: { code: 'UNAUTHENTICATED' },
  });

  throw new GraphQLError('User already exists with this email', {
    extensions: { code: 'BAD_USER_INPUT' },
  });
  ```

- Custom error classes: `NotFoundError` in `src/middleware/authMiddleware.ts`
- Promise error handling: try/catch blocks around async operations
- Frontend auth errors: redirect to `/login` on `UNAUTHENTICATED` in Apollo error link (`src/lib/apollo-client.ts`)
- Logging: console.log/console.error used (no structured logging library)
  - Auth debugging: Prefixed logs with emoji `🔐 Auth Debug -` for visibility

**Frontend Apollo Client Error Handling:**
- `onError` link catches GraphQL and network errors
- GraphQL error messages logged: `console.error(\`[GraphQL error]: Message: ${err.message}\`)`
- Network errors logged separately: `console.error(\`[Network error]: ${networkError}\`)`

## Logging

**Framework:** console methods (console.log, console.error, console.warn)

**Patterns:**
- Authentication module uses prefixed debug logs: `🔐 Auth Debug - [message]`
- GraphQL errors logged with `[GraphQL error]` prefix
- Network errors logged with `[Network error]` prefix
- Verbose logging in auth context: token presence, JWT secret availability, token verification steps
- Optional suppression of React warnings in test setup

## Comments

**When to Comment:**
- Complex logic requiring explanation (e.g., pagination cursor generation, date range calculations)
- Workarounds or non-obvious solutions
- Business logic that differs from standard patterns
- Examples from codebase:
  ```typescript
  // Remove 'Bearer ' prefix if present
  const cleanToken = token.startsWith('Bearer ') ? token.slice(7) : token;

  // For pagination, merge results
  if (!existing || args?.pagination?.page === 1) {
    return incoming;
  }
  ```

**JSDoc/TSDoc:**
- Not consistently used; optional comments not enforced
- Interface definitions include type information inline
- Function parameters documented through TypeScript types
- No @param, @returns, @throws decorators found in codebase

## Function Design

**Size:** Functions generally 10-40 lines; resolvers may be longer (40-100 lines) due to query building

**Parameters:**
- Use object destructuring for parameters with multiple properties
- Named parameters preferred over positional
- Resolver pattern: `(parent, args, context)` for GraphQL resolvers
- Hook pattern: Accept configuration objects instead of many parameters
- Example from `useTransactions()`:
  ```typescript
  export function useTransactions(
    filters?: TransactionFilterInput,
    pagination?: PaginationInput,
    sort?: TransactionSortInput
  )
  ```

**Return Values:**
- Resolvers return data objects or arrays directly
- Hooks return objects with related data and methods bundled
- Example from `useCreateTransaction()`:
  ```typescript
  return {
    createTransaction,
    loading,
    error,
  };
  ```

- Frontend utility functions return single values or objects
- Null/empty returns used for missing data: `?? []`, `?? null`, `?? {}`

## Module Design

**Exports:**
- Named exports preferred for functions and types
- Default exports used for React components
- GraphQL resolvers exported as named objects: `export const userResolvers = { Query: {...}, Mutation: {...} }`

**Barrel Files:**
- `src/hooks/index.ts` - exports all hooks
- `src/graphql/index.ts` - exports queries, mutations, fragments
- `src/graphql/queries/index.ts` - exports all query definitions
- `src/graphql/mutations/index.ts` - exports all mutation definitions
- `src/store/index.ts` - exports store configuration
- `src/__tests__/mocks/data.ts` - centralized mock data

**Component Structure:**
- UI components in `src/components/ui/` with variant and size props
- Domain-specific components in `src/components/[domain]/` (e.g., `transactions/`, `accounts/`, `dashboard/`)
- Components use forwardRef for ref forwarding (e.g., Button.tsx)
- displayName set for components using forwardRef

**Resolver Organization:**
- Domain-based organization: `src/schema/resolvers/[domain].ts`
- Each resolver file exports an object with `Query`, `Mutation`, and field resolvers
- Field resolvers handle nested data fetching (User.accounts, User.transactions)
- Input interfaces defined at top of resolver file

## React Patterns

**Client Components:**
- Marked with `'use client'` directive for Next.js App Router
- Examples: `useTransactions.ts`, `Button.tsx`, `apollo-client.ts`

**State Management:**
- Redux Toolkit for global state (auth, transactions, accounts, analytics, ui)
- Redux slices in `src/store/slices/`
- Apollo Client for server state (GraphQL queries/mutations)
- Local useState for component state

**Hooks:**
- Custom hooks in `src/hooks/` wrap Apollo queries and mutations
- Return objects grouping related data and operations
- Use Apollo cache refetching for consistency after mutations

**API Patterns:**
- GraphQL-first: All data fetching through Apollo Client
- No REST endpoints; only NextAuth.js route handlers for auth
- Auth routes: `src/app/api/auth/` for NextAuth configuration and registration

## Special Patterns

**Apollo Client Cache:**
- Custom type policies for merging paginated results
- `keyFields` defined for types that should be cached by ID
- `merge` function for pagination: appends new edges to existing on subsequent pages

**Authentication:**
- JWT tokens signed with HS256 algorithm
- Token stored in session.accessToken (NextAuth.js)
- Bearer token passed in Authorization header
- Token expiry: 30 days

**Prisma Usage:**
- Decimal type used for monetary values (parseDecimal utility for conversion)
- `include` and `select` for relation loading
- `findMany`, `findUnique`, `findFirst` for queries
- `Promise.all()` for parallel queries (count + data fetch)

---

*Convention analysis: 2026-01-30*
