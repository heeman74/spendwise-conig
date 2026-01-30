# Architecture

**Analysis Date:** 2026-01-30

## Pattern Overview

**Overall:** Distributed Architecture with Apollo GraphQL Boundary

SpendWise uses a distributed two-service architecture centered around a GraphQL API. The frontend (Next.js) and backend (Express + Apollo) are independent services communicating exclusively through GraphQL, with shared Prisma schema for database consistency.

**Key Characteristics:**
- Service-oriented: Frontend and API are completely decoupled services
- GraphQL-first: All data flows through Apollo Server GraphQL endpoint (`http://localhost:4000/graphql`)
- Domain-driven organization: Both services organize code by business domain (User, Account, Transaction, SavingsGoal, Analytics, Advice)
- Token-based authentication: JWT tokens passed via Authorization header enable stateless API requests
- Resolver-based backend: Apollo resolvers act as domain-specific request handlers between client and database

## Layers

**Frontend Presentation Layer:**
- Purpose: React components rendering UI and user interactions
- Location: `src/components/`
- Contains: UI components organized by domain (accounts/, transactions/, dashboard/, charts/, advice/, layout/, ui/)
- Depends on: Custom hooks for data fetching, Apollo Client for GraphQL, Redux Toolkit for local state
- Used by: Next.js pages and route handlers

**Frontend Data/State Layer:**
- Purpose: Manages client-side state and GraphQL caching
- Location: `src/store/` (Redux Toolkit) and `src/lib/apollo-client.ts` (Apollo Client)
- Contains: Redux slices (auth, transactions, accounts, analytics, ui) and Apollo cache configuration
- Depends on: GraphQL queries/mutations defined in `src/graphql/`
- Used by: Components via `useSelector()` and Apollo hooks

**Frontend API Integration Layer:**
- Purpose: Wraps Apollo Client operations in domain-specific hooks
- Location: `src/hooks/`
- Contains: Custom hooks (useTransactions, useAccounts, useDashboard, useSavingsGoals, useAdvice, useTwoFactor)
- Depends on: GraphQL queries/mutations, Apollo Client
- Used by: Page components for data fetching

**Frontend GraphQL Definitions:**
- Purpose: Type-safe queries, mutations, and fragments
- Location: `src/graphql/queries/`, `src/graphql/mutations/`, `src/graphql/fragments/`
- Contains: GraphQL operation definitions sent to API
- Depends on: GraphQL schema introspection from API
- Used by: Custom hooks and Apollo Client

**API Request Handling Layer:**
- Purpose: Receive HTTP requests and route to resolvers
- Location: `src/index.ts` (Express/Apollo Server setup)
- Contains: CORS configuration, middleware chain, health check endpoint
- Depends on: Middleware layer, resolver layer
- Used by: HTTP clients (frontend, external services)

**API Authentication Layer:**
- Purpose: Extract and validate user from JWT tokens
- Location: `src/context/auth.ts` (JWT verification), `src/context/index.ts` (context creation), `src/middleware/authMiddleware.ts` (auth guards)
- Contains: `getUserFromToken()` function, `createContext()` for request context, `requireAuth()` guard
- Depends on: Prisma for user lookup, jsonwebtoken library
- Used by: Resolvers to determine authenticated user

**API Resolver Layer:**
- Purpose: Implement GraphQL operations (Query, Mutation, field resolvers)
- Location: `src/schema/resolvers/` with files by domain (user.ts, account.ts, transaction.ts, savingsGoal.ts, analytics.ts, advice.ts, twoFactor.ts)
- Contains: Domain-specific resolvers that query Prisma and return GraphQL objects
- Depends on: Context (user, prisma, redis), Prisma Client, validation/auth middleware
- Used by: Apollo Server to fulfill GraphQL requests

**API Type Definition Layer:**
- Purpose: GraphQL type definitions and schemas
- Location: `src/schema/typeDefs/` with files by domain (user.ts, account.ts, transaction.ts, savingsGoal.ts, analytics.ts, advice.ts, twoFactor.ts, common.ts)
- Contains: Type definitions, scalar definitions, GraphQL object types
- Depends on: GraphQL tag (gql)
- Used by: Apollo Server to validate and parse GraphQL requests

**API Data Access Layer:**
- Purpose: Database queries and caching
- Location: `src/lib/prisma.ts` (Prisma Client), `src/lib/redis.ts` (Redis Client)
- Contains: ORM client instances and utility functions
- Depends on: Prisma schema (shared), environment configuration
- Used by: Resolvers for database operations

**Shared Database Layer:**
- Purpose: Unified data schema for both services
- Location: `prisma/schema.prisma` (both projects reference same schema)
- Contains: User, Account, Transaction, SavingsGoal models and relationships
- Depends on: PostgreSQL database
- Used by: Both frontend (via API) and backend (via ORM)

## Data Flow

**Read Flow (Dashboard Loading):**

1. Frontend page component (`src/app/(dashboard)/dashboard/page.tsx`) calls `useDashboardStats()` hook
2. Hook uses Apollo Client to execute GraphQL query defined in `src/graphql/queries/`
3. Apollo Client adds authorization header from NextAuth session via `src/lib/apollo-client.ts` auth link
4. Request reaches API at `/graphql` endpoint (Express middleware in `src/index.ts`)
5. Apollo Server receives request, creates context via `src/context/index.ts`:
   - Extracts JWT token from Authorization header
   - Validates JWT and loads user via `src/context/auth.ts`
   - Instantiates prisma and redis clients
6. Apollo Server matches operation to resolver in `src/schema/resolvers/analytics.ts`
7. Resolver executes Prisma query against PostgreSQL (authenticated as specific user)
8. Redis caches result if configured
9. Result serialized to GraphQL response type (defined in `src/schema/typeDefs/`)
10. Apollo Client in frontend receives response, updates cache
11. Component re-renders with new data from Redux store (if using Redux) or Apollo cache

**Write Flow (Creating Transaction):**

1. Component calls `useCreateTransaction()` hook
2. Hook triggers Apollo mutation with input data
3. Apollo Client adds auth header and sends to API
4. API resolver in `src/schema/resolvers/transaction.ts` receives mutation args
5. Resolver calls `requireAuth()` middleware to verify user exists
6. Resolver builds Prisma input, validates data, creates transaction
7. Prisma executes INSERT query against PostgreSQL
8. Resolver returns created Transaction object
9. Apollo Client receives response, invalidates related queries (GetTransactions, GetDashboardStats, GetAccounts, GetAnalytics)
10. Related queries automatically refetch with updated data
11. Components observing those queries re-render with new state

**State Management:**

- **Server State:** Stored in PostgreSQL, accessed via Prisma ORM in API
- **Client State:** Mix of Redux Toolkit (ui state, local filters) and Apollo Client (cached GraphQL data)
- **Session State:** NextAuth.js stores session with JWT accessToken in browser
- **Cache State:** Apollo Client maintains normalized cache of GraphQL objects with key policies, Redis on API side caches expensive queries

## Key Abstractions

**Custom Hook Pattern (Frontend):**
- Purpose: Encapsulate GraphQL operations with business logic
- Examples: `src/hooks/useTransactions.ts`, `src/hooks/useAccounts.ts`, `src/hooks/useDashboard.ts`
- Pattern: Returns object with `{ data, loading, error, functions }` shape, manages Apollo cache invalidation on mutations
- Usage: Components call hooks like `const { transactions, loading, error, loadMore } = useTransactions(filters)`

**Resolver Pattern (API):**
- Purpose: Map GraphQL operations to database queries
- Examples: `src/schema/resolvers/transaction.ts` exports `transactionResolvers` with `Query`, `Mutation`, and type field resolver objects
- Pattern: Each resolver receives `(parent, args, context)` and returns typed data; uses `requireAuth(context)` to guard operations
- Structure: Query resolvers fetch data (with pagination/filtering/sorting), Mutation resolvers create/update/delete, field resolvers resolve nested objects

**Type Definition Pattern (API):**
- Purpose: Define GraphQL schema by domain
- Examples: `src/schema/typeDefs/transaction.ts` exports `transactionTypeDefs` as gql template
- Pattern: Types define fields with types, inputs define mutation/query parameters, scalars define custom serialization
- Composition: All typeDefs collected in `src/schema/typeDefs/index.ts` and passed to Apollo Server

**Context Pattern (API):**
- Purpose: Inject authenticated user and data layer clients into all resolvers
- Location: `src/context/index.ts` defines Context interface with `{ prisma, redis, user }`
- Flow: Each request creates fresh context with user extracted from JWT, then context passed to all resolvers
- Usage: `const user = context.user; const result = context.prisma.transaction.findMany(...)`

**Auth Middleware Pattern (API):**
- Purpose: Guard resolvers to require authentication
- Location: `src/middleware/authMiddleware.ts` exports `requireAuth(context)` function
- Pattern: Resolver calls `requireAuth(context)` at start; throws if user is null
- Usage: `const user = requireAuth(context);` followed by Prisma queries filtered by `userId: user.id`

## Entry Points

**Frontend Application Entry:**
- Location: `src/app/layout.tsx` (root layout) → `src/app/providers.tsx` (wraps with providers) → `src/app/page.tsx` (home redirects to /dashboard)
- Triggers: Browser navigation to app origin
- Responsibilities: Initializes NextAuth session, Apollo Client, Redux store; wraps entire app with providers

**Frontend Pages (Route Groups):**
- Auth Routes: `src/app/(auth)/login/page.tsx`, `src/app/(auth)/register/page.tsx` - unauthenticated pages
- Dashboard Routes: `src/app/(dashboard)/dashboard/page.tsx`, `src/app/(dashboard)/accounts/page.tsx`, etc. - authenticated pages
- Triggers: URL navigation
- Responsibilities: Check auth status, fetch domain data via custom hooks, render components

**API Server Entry:**
- Location: `src/index.ts` - startServer() function
- Triggers: `npm run dev` or node process startup
- Responsibilities: Configure Express app, initialize Apollo Server with typeDefs and resolvers, set up middleware, listen on port 4000

**API GraphQL Endpoint:**
- Path: `/graphql`
- Triggers: POST request with GraphQL query/mutation
- Responsibilities: Receive GraphQL operation, create context, validate against schema, execute resolver, return response

**API Health Check:**
- Path: `/health` (GET)
- Triggers: Health monitoring services
- Responsibilities: Return `{ status: 'ok' }`

## Error Handling

**Strategy:** Layered error catching with user-friendly messages in production

**Patterns:**

1. **Frontend Apollo Errors:** `src/lib/apollo-client.ts` errorLink catches GraphQL errors; UNAUTHENTICATED errors redirect to /login; all errors logged to console
2. **Frontend Resolver Auth Errors:** Resolvers call `requireAuth()` which throws NotFoundError with message "User not authenticated"
3. **Frontend Component Error Boundaries:** Pages check error from hooks, render error message or redirect (e.g., dashboard redirects on auth error)
4. **API GraphQL Errors:** Apollo Server formatError hook in `src/index.ts` redacts INTERNAL_SERVER_ERROR in production, preserves message in development
5. **Resolver Errors:** Resolvers can throw errors which become GraphQL errors; middleware middleware provides NotFoundError for consistent error shapes
6. **Database Errors:** Prisma errors bubble up through resolvers; in production, wrapped in generic message; in development, detailed message shown

## Cross-Cutting Concerns

**Logging:**
- Frontend: Browser console.log/console.error for GraphQL and network errors
- API: console.log/console.error in resolvers and middleware; debug logs in `src/context/auth.ts` for JWT verification

**Validation:**
- Frontend: Component-level validation before sending mutations (input components validate before calling hooks)
- API: Resolver input interface definitions enforce types; Prisma validates against schema; explicit validations in resolvers (e.g., amount > 0)

**Authentication:**
- Frontend: NextAuth.js manages session with JWT token stored in session; Apollo Client authLink injects token in every request
- API: `src/context/auth.ts` extracts and validates JWT on every request; `requireAuth()` middleware guards protected resolvers

**Authorization:**
- Frontend: Components check session status and redirect if unauthenticated
- API: All resolvers filter queries by `userId: user.id` to ensure users only access their own data; Prisma enforces foreign key relationships

**Caching:**
- Frontend: Apollo Client InMemoryCache with custom typePolicies for pagination and merge logic; Redis Client cache option for expensive queries on API
- API: Redis stores expensive query results; cache invalidated on mutations via `invalidateCache()` utility in `src/lib/redis.ts`

**Pagination:**
- Frontend: Apollo hook `loadMore()` function fetches next page; `pageInfo` object tracks `hasNextPage`
- API: Resolvers accept `pagination { page, limit }` args; return edges (cursor-style) and pageInfo; merges results in cache

---

*Architecture analysis: 2026-01-30*
