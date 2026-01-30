# Codebase Structure

**Analysis Date:** 2026-01-30

## Directory Layout

```
/Users/heechung/projects/
├── spendwise/                 # Next.js 14 frontend application
│   ├── src/
│   │   ├── app/               # Next.js App Router pages and layouts
│   │   ├── components/        # React components organized by domain
│   │   ├── hooks/             # Custom hooks wrapping Apollo operations
│   │   ├── graphql/           # GraphQL queries, mutations, fragments
│   │   ├── lib/               # Utilities including Apollo Client setup
│   │   ├── store/             # Redux Toolkit store with slices
│   │   ├── types/             # TypeScript type definitions
│   │   ├── data/              # Mock data for demo mode
│   │   ├── __tests__/         # Jest unit tests
│   │   ├── e2e/               # Playwright E2E tests
│   │   └── globals.css        # Global CSS styling
│   ├── prisma/                # Shared database schema
│   │   ├── schema.prisma      # Prisma models (User, Account, Transaction, etc.)
│   │   └── migrations/        # Database migration history
│   ├── public/                # Static assets
│   ├── playwright.config.ts   # Playwright E2E test configuration
│   ├── jest.config.js         # Jest unit test configuration
│   ├── tsconfig.json          # TypeScript configuration
│   ├── next.config.js         # Next.js configuration
│   └── package.json           # Frontend dependencies
│
├── spendwise-api/             # Express + Apollo GraphQL API
│   ├── src/
│   │   ├── index.ts           # Server entry point (Express + Apollo setup)
│   │   ├── schema/            # GraphQL schema (typeDefs and resolvers)
│   │   │   ├── typeDefs/      # GraphQL type definitions by domain
│   │   │   └── resolvers/     # GraphQL resolvers by domain
│   │   ├── context/           # Request context creation and auth
│   │   ├── middleware/        # Express/request middleware (auth guards)
│   │   ├── lib/               # Utilities (Prisma, Redis, email, jobs)
│   │   │   ├── jobs/          # Background job handlers
│   │   │   └── email/         # Email templates
│   │   ├── __tests__/         # Jest tests (unit and integration)
│   │   │   ├── resolvers/     # Resolver tests
│   │   │   ├── integration/   # Integration tests
│   │   │   └── mocks/         # Test mocks
│   │   ├── __mocks__/         # Jest module mocks
│   │   └── templates/         # Email templates
│   ├── prisma/                # Shared database schema (symlink/copy)
│   │   ├── schema.prisma      # Prisma models
│   │   └── migrations/        # Database migrations
│   ├── tsconfig.json          # TypeScript configuration
│   ├── jest.config.js         # Jest test configuration
│   └── package.json           # API dependencies
│
└── docker-compose.yml         # PostgreSQL and Redis containers
```

## Directory Purposes

**Frontend `spendwise/src/`:**

**`app/`:** Next.js App Router pages and layouts
- Route groups: `(auth)/` for login/register, `(dashboard)/` for authenticated pages
- Contains: page.tsx files (Page components), layout.tsx (Layout components), providers.tsx (context providers)
- Key structure: Routes like `/dashboard`, `/transactions`, `/accounts` map to page files

**`components/`:** React components organized by domain
- `ui/` - Reusable UI components (Card, Button, Input, Modal, etc.)
- `layout/` - Layout components (Navbar, Sidebar, Footer)
- `dashboard/` - Dashboard-specific components (StatsCard, RecentTransactions, SpendingOverview)
- `transactions/` - Transaction-specific components
- `accounts/` - Account-specific components
- `charts/` - Chart/visualization components (TrendLineChart, etc.)
- `advice/` - Financial advice components
- `auth/` - Authentication components (LoginForm, RegisterForm)

**`hooks/`:** Custom hooks wrapping Apollo Client operations
- `useTransactions.ts` - Query and mutate transactions with filtering/pagination
- `useAccounts.ts` - Query and mutate accounts
- `useDashboard.ts` - Query dashboard statistics
- `useSavingsGoals.ts` - Query and mutate savings goals
- `useAdvice.ts` - Query personalized advice
- `useTwoFactor.ts` - 2FA operations
- Pattern: Each exports multiple hooks (e.g., `useTransactions`, `useRecentTransactions`, `useCreateTransaction`)

**`graphql/`:** GraphQL operation definitions
- `queries/` - GraphQL query definitions (GetTransactions, GetDashboardStats, etc.)
- `mutations/` - GraphQL mutation definitions (CreateTransaction, UpdateAccount, etc.)
- `fragments/` - Reusable GraphQL fragments for consistent field selection
- Format: GraphQL template strings (gql``), sent to API via Apollo Client

**`lib/`:** Utilities
- `apollo-client.ts` - Apollo Client initialization with auth link and error handling
- Contains: HTTP link to API, auth link adding JWT token, error link handling auth errors

**`store/`:** Redux Toolkit store
- `index.ts` - Store configuration combining slices
- `slices/` - Redux slices:
  - `authSlice.ts` - Auth state (user, session, demo mode)
  - `transactionsSlice.ts` - Transaction filters and pagination
  - `accountsSlice.ts` - Account state
  - `analyticsSlice.ts` - Analytics/dashboard data
  - `uiSlice.ts` - UI state (modals, notifications, theme)

**`types/`:** TypeScript types
- Global types shared across frontend

**`data/`:** Mock data
- `mockData.ts` - Sample data for demo/development mode

**`__tests__/`:** Jest unit tests
- `components/` - Component tests
- `hooks/` - Hook tests
- `mocks/` - Jest mocks for Apollo Client, NextAuth

**`e2e/`:** Playwright E2E tests
- End-to-end tests for critical user flows (login, create transaction, etc.)

---

**API `spendwise-api/src/`:**

**`index.ts`:** Server entry point
- Initializes Express app
- Configures Apollo Server with typeDefs and resolvers
- Sets up CORS middleware
- Starts HTTP server listening on port 4000

**`schema/typeDefs/`:** GraphQL type definitions
- `index.ts` - Combines all typeDefs into array
- `common.ts` - Common scalars and shared types
- `user.ts` - User type, queries, mutations
- `account.ts` - Account type, queries, mutations
- `transaction.ts` - Transaction type, queries, mutations with filtering/pagination
- `savingsGoal.ts` - SavingsGoal type, queries, mutations
- `analytics.ts` - DashboardStats type, analytics queries
- `advice.ts` - Advice type, financial advice queries
- `twoFactor.ts` - TwoFactor types and mutations

**`schema/resolvers/`:** GraphQL resolver implementations
- `index.ts` - Combines all resolvers, exports merged Query, Mutation, Type resolvers
- `user.ts` - User resolvers (me, register, login, updateProfile, etc.)
- `account.ts` - Account resolvers (getAccounts, createAccount, updateAccount, deleteAccount)
- `transaction.ts` - Transaction resolvers (transactions, recentTransactions, createTransaction, updateTransaction, deleteTransaction)
- `savingsGoal.ts` - SavingsGoal resolvers
- `analytics.ts` - Analytics resolvers (dashboardStats, spendingByCategory, trends)
- `advice.ts` - Advice resolvers (personalized financial advice)
- `twoFactor.ts` - 2FA resolvers (setup, verify, disable)
- `scalars.ts` - Custom scalar resolvers (DateTime, Decimal)

**`context/`:** Request context
- `index.ts` - Creates request context with prisma, redis, and authenticated user
- `auth.ts` - JWT verification, user extraction from token, user lookup in database

**`middleware/`:** Request middleware
- `authMiddleware.ts` - `requireAuth()` function to guard resolvers, NotFoundError class

**`lib/`:** Utility libraries
- `prisma.ts` - Prisma Client singleton instance
- `redis.ts` - Redis Client singleton instance and cache invalidation utilities
- `email.ts` - Email sending utilities
- `sms.ts` - SMS sending utilities
- `twoFactor.ts` - 2FA authentication utilities
- `utils.ts` - Helper functions (e.g., parseDecimal for monetary amounts)
- `jobs/` - Background job handlers (e.g., cron jobs for analytics updates)

**`__tests__/`:** Jest tests
- `resolvers/` - Resolver unit tests (test individual GraphQL operations)
- `integration/` - Integration tests (test full GraphQL queries end-to-end)
- `lib/` - Library/utility function tests
- `mocks/` - Jest mocks for Prisma, Redis, external services

---

**Shared `prisma/`:** Database schema
- `schema.prisma` - Prisma ORM schema with models:
  - `User` - User account and profile
  - `Account` - Bank/financial accounts
  - `Transaction` - Income/expense/transfer transactions
  - `SavingsGoal` - User's savings goals
  - Relationships defined between models
- `migrations/` - Database schema migration history (auto-generated by Prisma)

## Key File Locations

**Entry Points:**

- `spendwise/src/app/layout.tsx` - Frontend root layout, initializes providers
- `spendwise/src/app/page.tsx` - Frontend home page (redirects to /dashboard)
- `spendwise-api/src/index.ts` - API server entry point
- `spendwise/src/app/api/auth/[...nextauth]/route.ts` - NextAuth API route for auth endpoints

**Configuration:**

- `spendwise/tsconfig.json` - TypeScript config, path aliases (`@/` → `src/`)
- `spendwise/next.config.js` - Next.js config (build options, experimental features)
- `spendwise/jest.config.js` - Jest test config
- `spendwise/playwright.config.ts` - Playwright E2E config
- `spendwise-api/tsconfig.json` - Backend TypeScript config
- `spendwise-api/jest.config.js` - Backend Jest config
- `.env` (both projects) - Environment variables (DATABASE_URL, JWT_SECRET, API endpoint, etc.)

**Core Logic:**

- `spendwise/src/hooks/` - Data fetching and mutation hooks
- `spendwise/src/store/` - Client-side state management
- `spendwise-api/src/schema/resolvers/` - GraphQL operation implementations
- `spendwise-api/src/context/auth.ts` - Authentication logic

**Testing:**

- `spendwise/src/__tests__/` - Frontend unit tests
- `spendwise/e2e/` - Frontend E2E tests (Playwright specs)
- `spendwise-api/src/__tests__/` - Backend unit and integration tests
- `spendwise-api/jest.config.js` - Backend test runner config

## Naming Conventions

**Files:**

- React components: PascalCase (e.g., `StatsCard.tsx`, `TransactionForm.tsx`)
- Hooks: camelCase with 'use' prefix (e.g., `useTransactions.ts`, `useDashboard.ts`)
- Pages: lowercase with hyphens for multi-word routes (e.g., `dashboard/page.tsx`, `settings/page.tsx`)
- Tests: `*.test.ts` or `*.spec.ts` suffix (e.g., `StatsCard.test.tsx`)
- API resolvers: lowercase with domain name (e.g., `transaction.ts`, `account.ts`)
- GraphQL operations: UPPER_SNAKE_CASE queries/mutations exported (e.g., `GET_TRANSACTIONS`, `CREATE_TRANSACTION`)

**Directories:**

- Feature/domain directories: lowercase plural (e.g., `transactions/`, `accounts/`, `components/`)
- Private/internal directories: prefixed with underscore (e.g., `__tests__/`, `__mocks__/`)
- Utility directories: `lib/` for libraries, `utils/` for utility functions

**TypeScript:**

- Interfaces: PascalCase with I prefix optional (e.g., `TransactionFilterInput`, `CreateTransactionInput`)
- Types: PascalCase (e.g., `TransactionType`, `DashboardStats`)
- Constants: UPPER_SNAKE_CASE (e.g., `MAX_TRANSACTIONS_PER_PAGE`, `DEFAULT_SORT_ORDER`)
- Functions: camelCase (e.g., `parseDecimal()`, `requireAuth()`)
- Variables: camelCase (e.g., `isDemo`, `userTransactions`)

**GraphQL:**

- Type names: PascalCase (e.g., `Transaction`, `DashboardStats`)
- Query names: camelCase (e.g., `transactions`, `dashboardStats`)
- Mutation names: camelCase verb + object (e.g., `createTransaction`, `updateAccount`)
- Enum values: UPPER_SNAKE_CASE (e.g., `INCOME`, `EXPENSE`, `TRANSFER`)
- Input types: PascalCase ending in 'Input' (e.g., `TransactionFilterInput`, `CreateTransactionInput`)

## Where to Add New Code

**New Feature (e.g., new domain like "Budget"):**

1. **Frontend:**
   - Add page: `src/app/(dashboard)/budgets/page.tsx`
   - Add components: `src/components/budgets/BudgetList.tsx`, `src/components/budgets/BudgetForm.tsx`
   - Add hook: `src/hooks/useBudgets.ts`
   - Add GraphQL: `src/graphql/queries/GetBudgets.ts`, `src/graphql/mutations/CreateBudget.ts`
   - Add Redux slice: `src/store/slices/budgetsSlice.ts` (if needed for filters/UI state)

2. **API:**
   - Add type definitions: `src/schema/typeDefs/budget.ts`
   - Add resolvers: `src/schema/resolvers/budget.ts`
   - Update schema index: `src/schema/typeDefs/index.ts` and `src/schema/resolvers/index.ts`
   - Add Prisma model: `prisma/schema.prisma` (new Budget model and relationships)

3. **Database:**
   - Run `npm run db:push` to apply schema changes

**New Component (within existing feature):**

- Location: `src/components/{feature}/NewComponent.tsx`
- Use path alias: `import { useSomeHook } from '@/hooks'`
- Follow domain-driven organization (group related components)

**New Hook:**

- Location: `src/hooks/useFeature.ts`
- Follow pattern: Export multiple hooks (query hook, create hook, update hook, delete hook)
- Include filtering/pagination interfaces matching API schema
- Use Apollo Client for data fetching via `useQuery` and `useMutation`
- Invalidate related caches on mutation completion

**New Utility:**

- Shared frontend: `src/lib/{utility}.ts`
- API utilities: `spendwise-api/src/lib/{utility}.ts`
- Test utilities: `src/__tests__/mocks/` or `spendwise-api/src/__tests__/mocks/`

**New GraphQL Operation:**

- Query: `src/graphql/queries/{OperationName}.ts`
- Mutation: `src/graphql/mutations/{OperationName}.ts`
- Fragment: `src/graphql/fragments/{FragmentName}.ts`
- Export from `src/graphql/index.ts`

**New API Endpoint:**

- All data access goes through GraphQL resolvers
- Add to typeDef in `src/schema/typeDefs/{domain}.ts`
- Implement resolver in `src/schema/resolvers/{domain}.ts`
- No direct REST endpoints (GraphQL only)

**New Test:**

- Unit test: Co-locate with source file or in matching `src/__tests__/{feature}` structure
- Integration test: `spendwise-api/src/__tests__/integration/` for full GraphQL flows
- E2E test: `spendwise/e2e/{feature}.spec.ts` for user workflows
- Mock data: `src/__tests__/mocks/` for shared test fixtures

## Special Directories

**`prisma/migrations/`:**
- Purpose: Stores database schema change history
- Generated: Yes (auto-created by Prisma on `db:push`)
- Committed: Yes (part of version control to track schema evolution)
- Access: Read-only, managed by Prisma CLI

**`spendwise/.next/`:**
- Purpose: Build artifacts for Next.js
- Generated: Yes (created during `npm run build`)
- Committed: No (added to .gitignore)
- Access: Not modified directly

**`spendwise-api/dist/`:**
- Purpose: Compiled JavaScript output from TypeScript
- Generated: Yes (created during `npm run build`)
- Committed: No (added to .gitignore)
- Access: Not modified directly

**`spendwise/node_modules/` and `spendwise-api/node_modules/`:**
- Purpose: Installed npm dependencies
- Generated: Yes (created by `npm install`)
- Committed: No (added to .gitignore)
- Access: Not modified directly

**`spendwise/__tests__/mocks/`:**
- Purpose: Jest mock modules for Apollo Client, NextAuth, dependencies
- Generated: No (manually created)
- Committed: Yes (version controlled)
- Access: Imported in test files to mock external libraries

**`spendwise-api/__mocks__/`:**
- Purpose: Jest module mocks for backend
- Generated: No (manually created)
- Committed: Yes (version controlled)
- Access: Automatically used by Jest when mocking

---

*Structure analysis: 2026-01-30*
