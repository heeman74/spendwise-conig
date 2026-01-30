# Technology Stack

**Analysis Date:** 2026-01-30

## Languages

**Primary:**
- TypeScript 5.3.3 - Used in both frontend and backend for type safety
- JavaScript (ES2020) - Output target for compiled code
- HTML/CSS - Frontend markup and styling

**Secondary:**
- SQL (PostgreSQL dialect) - Database queries via Prisma ORM
- GraphQL - API query language for frontend-backend communication

## Runtime

**Environment:**
- Node.js 20+ (inferred from packages and tsconfig target ES2020)

**Package Manager:**
- npm with lockfile version 3 (npm 9.x or later)
- Lock files: `spendwise/package-lock.json`, `spendwise-api/package-lock.json`

## Frameworks

**Frontend:**
- Next.js 14.1.0 - React framework with App Router
- React 18.2.0 - UI library
- Redux Toolkit 2.2.1 - State management for client-side data

**Backend:**
- Express 4.18.2 - HTTP server and middleware framework
- Apollo Server 4.10.0 - GraphQL server on top of Express

**Testing:**
- Jest 29.7.0 - Unit and integration testing (both frontend and backend)
- Playwright 1.41.2 - E2E testing (frontend only)
- @testing-library/react 14.2.1 - React component testing utilities
- @testing-library/jest-dom 6.4.2 - Jest matchers for DOM

**Build/Dev:**
- TypeScript 5.3.3 - TypeScript compiler
- ts-node-dev 2.0.0 - Development server for backend (auto-reload)
- tsx 4.7.1 - TypeScript executor for Node scripts (Prisma seed)
- Tailwind CSS 3.4.1 - Utility-first CSS framework (frontend)
- PostCSS 8.4.35 - CSS transformation (frontend)
- Autoprefixer 10.4.17 - CSS vendor prefixes (frontend)

## Key Dependencies

**Critical:**
- @prisma/client 5.10.0 - Database ORM and query builder (shared by frontend and backend)
- graphql 16.12.0 (frontend), 16.8.1 (backend) - GraphQL query language implementation
- @apollo/client 4.1.2 - Apollo Client for GraphQL queries on frontend
- @apollo/server 4.10.0 - Apollo Server for GraphQL API on backend
- jsonwebtoken 9.0.3 (frontend), 9.0.2 (backend) - JWT token signing and verification
- bcryptjs 2.4.3 - Password hashing (both frontend and backend)
- zod 3.22.4 - Schema validation library (frontend registration endpoint)

**Infrastructure:**
- ioredis 5.3.2 - Redis client for caching and session management (backend)
- ioredis-mock 8.13.1 - Redis mock for testing (backend dev)
- nodemailer 7.0.13 - Email sending via SMTP (backend)
- twilio 5.12.0 - SMS sending service (backend)
- dotenv 17.2.3 - Environment variable loading (backend)
- cors 2.8.5 - Cross-origin resource sharing middleware (backend)

**Authentication:**
- next-auth 4.24.6 - Session and authentication management (frontend)
- graphql-tag 2.12.6 - GraphQL query parsing (backend)

**API & Data:**
- openai 4.28.0 - OpenAI API client for AI advice (frontend)
- recharts 2.12.2 - React charting library for financial data visualization
- graphql-scalars 1.22.4 - Custom GraphQL scalar types (backend)

## Configuration

**Environment:**

Frontend (`spendwise/.env.local`):
- `DATABASE_URL` - PostgreSQL connection string
- `REDIS_URL` - Redis connection string
- `NEXTAUTH_URL` - NextAuth session provider URL
- `NEXTAUTH_SECRET` - Session encryption secret
- `OPENAI_API_KEY` - OpenAI API key for advice feature
- `NEXT_PUBLIC_GRAPHQL_URL` - GraphQL API endpoint (public)

Backend (`spendwise-api/.env`):
- `DATABASE_URL` - PostgreSQL connection string (same as frontend)
- `REDIS_URL` - Redis connection string (same as frontend)
- `JWT_SECRET` - JWT signing secret
- `PORT` - Express server port (default 4000)
- `NODE_ENV` - Environment mode (development/production)
- `ENCRYPTION_KEY` - AES-256 encryption for sensitive user data (2FA)
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASSWORD` - Email service credentials
- `SMTP_FROM_EMAIL`, `SMTP_FROM_NAME` - Email sender identity
- `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBER` - SMS service credentials

**Build:**

Frontend (`spendwise/tsconfig.json`):
- Target: ES modules with DOM lib
- Module resolution: bundler (Next.js optimized)
- Path alias: `@/*` → `./src/*`
- Strict mode enabled

Backend (`spendwise-api/tsconfig.json`):
- Target: ES2020
- Module: CommonJS
- Output directory: `./dist`
- Strict mode enabled
- Source maps enabled

## Database

**Provider:** PostgreSQL 16 (via Docker)
- Connection: `postgresql://spendwise:spendwise123@localhost:5433/spendwise`
- ORM: Prisma 5.10.0
- Schema location: `spendwise/prisma/schema.prisma` (shared by both projects)
- Models: User, Account, Transaction, SavingsGoal, TwoFactorCode, TwoFactorLog

## Cache

**Provider:** Redis 7 (via Docker)
- Connection: `redis://localhost:6379`
- Client: ioredis 5.3.2
- Usage: GraphQL query result caching, 2FA code storage, session data

## Docker

**Containerized Services:**
- PostgreSQL 16-alpine - Database on port 5433
- Redis 7-alpine - Cache on port 6379
- Networks: Both services on default bridge network with volume persistence

## Platform Requirements

**Development:**
- Node.js 20+
- npm 9+ (lockfile version 3)
- PostgreSQL 16 and Redis 7 (via Docker or native)
- Docker and Docker Compose (for containerized services)
- Git

**Production:**
- Node.js 20+ LTS
- PostgreSQL 15+
- Redis 7+
- SMTP server (Gmail or compatible)
- Twilio account (optional, for SMS 2FA)
- OpenAI API account (optional, for AI advice feature)
- Environment variables properly configured

---

*Stack analysis: 2026-01-30*
