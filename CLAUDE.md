# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

SpendWise is a personal finance application with two main components:
- **spendwise/** - Next.js 14 frontend with App Router
- **spendwise-api/** - Express + Apollo Server GraphQL API

Both services share the same PostgreSQL database schema (via Prisma) and connect through GraphQL.

## Common Commands

### Frontend (spendwise/)
```bash
cd spendwise
npm run dev          # Start dev server (port 3000)
npm run build        # Production build
npm run lint         # ESLint
npm test             # Jest unit tests
npm run test:watch   # Jest in watch mode
npm run test:e2e     # Playwright E2E tests
npm run test:e2e:ui  # Playwright with UI
npm run db:generate  # Generate Prisma client
npm run db:push      # Push schema to database
npm run db:studio    # Prisma Studio GUI
```

### Backend (spendwise-api/)
```bash
cd spendwise-api
npm run dev          # Start dev server (port 4000)
npm run build        # TypeScript compile to dist/
npm test             # Jest tests
npm run test:watch   # Jest in watch mode
npm run generate     # Generate Prisma client
```

### Infrastructure
```bash
cd spendwise
docker-compose up -d  # Start PostgreSQL (port 5433) and Redis (port 6379)
```

### Running Single Tests
```bash
# Frontend - specific test file
npm test -- src/__tests__/components/Card.test.tsx

# Frontend - pattern match
npm test -- --testPathPattern="useTransactions"

# API - specific test file
npm test -- src/__tests__/resolvers/user.test.ts

# E2E - specific spec file
npm run test:e2e -- e2e/auth.spec.ts

# E2E - specific test by name
npm run test:e2e -- -g "should display login form"
```

## Architecture

### Data Flow
1. Frontend uses Apollo Client to call GraphQL API
2. API authenticates via JWT tokens (passed in Authorization header)
3. API resolvers query PostgreSQL via Prisma ORM
4. Redis is used for caching in the API layer

### Frontend Structure
- `src/app/` - Next.js App Router pages with route groups: `(auth)` for login/register, `(dashboard)` for authenticated pages
- `src/components/` - React components organized by domain (ui/, layout/, charts/, dashboard/, transactions/, accounts/, advice/)
- `src/hooks/` - Custom hooks wrapping Apollo Client queries/mutations (useTransactions, useAccounts, useDashboard, useSavingsGoals, useAdvice)
- `src/graphql/` - GraphQL queries, mutations, and fragments
- `src/store/` - Redux Toolkit store with slices for auth, transactions, accounts, analytics, ui
- `src/lib/apollo-client.ts` - Apollo Client configuration with auth link and cache policies

### API Structure
- `src/schema/typeDefs/` - GraphQL type definitions by domain
- `src/schema/resolvers/` - GraphQL resolvers by domain (user, account, transaction, savingsGoal, analytics, advice)
- `src/context/` - Request context creation with auth user extraction
- `src/lib/` - Prisma client, Redis client, utilities

### Database Models
User, Account, Transaction, SavingsGoal - defined in `prisma/schema.prisma` (both projects share the same schema)

### Authentication
- NextAuth.js on frontend for session management
- JWT tokens passed to API via Authorization header
- API validates tokens and extracts user in context creation (`src/context/auth.ts`)
