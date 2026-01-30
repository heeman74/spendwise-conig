# External Integrations

**Analysis Date:** 2026-01-30

## APIs & External Services

**OpenAI:**
- Service: AI-powered financial advice generation
- SDK/Client: `openai` 4.28.0
- Auth: Environment variable `OPENAI_API_KEY`
- Used in: Frontend features (not yet fully integrated in API resolvers)
- Integration location: `spendwise/src` (Apollo Client queries)
- Status: Planned/stub implementation with TODO comments in `spendwise-api/src/schema/resolvers/advice.ts` line 94

**Twilio:**
- Service: SMS-based two-factor authentication and notifications
- SDK/Client: `twilio` 5.12.0
- Auth: Three environment variables:
  - `TWILIO_ACCOUNT_SID` - Account identifier
  - `TWILIO_AUTH_TOKEN` - API authentication token
  - `TWILIO_PHONE_NUMBER` - From number for outgoing SMS
- Implementation: `spendwise-api/src/lib/sms.ts`
- Methods:
  - `sendTwoFactorCode()` - Send 6-digit verification codes
  - `send2FAEnabledNotification()` - Notify when 2FA is enabled
  - `validatePhoneNumber()` - E.164 format validation
- Supports: US numbers (+1), with TODO for international support
- Graceful degradation: Logs warning if credentials invalid, service optional

**Email (SMTP):**
- Service: Email delivery via SMTP
- SDK/Client: `nodemailer` 7.0.13
- Configuration: Six environment variables:
  - `SMTP_HOST` - SMTP server address (gmail.com configured)
  - `SMTP_PORT` - SMTP port (587 for TLS)
  - `SMTP_SECURE` - Use TLS (false for port 587)
  - `SMTP_USER` - Email account username
  - `SMTP_PASSWORD` - Email account password
  - `SMTP_FROM_EMAIL` - Sender email address
  - `SMTP_FROM_NAME` - Sender display name
- Implementation: `spendwise-api/src/lib/email.ts`
- Methods:
  - `sendTwoFactorCode()` - Send verification codes
  - `sendBackupCodes()` - Send 2FA backup codes
  - `send2FAEnabledNotification()` - 2FA enabled notification
  - `send2FADisabledNotification()` - 2FA disabled notification
  - `verifyConnection()` - Test email service connectivity
- Templates: `spendwise-api/src/templates/email/` (loaded at runtime)

## Data Storage

**Databases:**
- Provider: PostgreSQL 16
- Connection: `postgresql://spendwise:spendwise123@localhost:5433/spendwise`
- Client: Prisma 5.10.0 ORM
- Database name: `spendwise`
- Models:
  - User (with 2FA fields)
  - Account (checking, savings, credit, investment types)
  - Transaction (income, expense, transfer types)
  - SavingsGoal
  - TwoFactorCode (6-digit codes with hashing)
  - TwoFactorLog (audit trail for 2FA events)

**File Storage:**
- Local filesystem only
- Email templates stored in: `spendwise-api/src/templates/email/`
- No cloud storage integration

**Caching:**
- Provider: Redis 7
- Connection: `redis://localhost:6379`
- Client: ioredis 5.3.2
- Usage patterns:
  - GraphQL query result caching (1 hour TTL for advice queries)
  - Cache key pattern: `user:{userId}:advice`
  - Helper functions in `spendwise-api/src/lib/redis.ts`:
    - `getCache<T>(key)` - Retrieve cached JSON
    - `setCache(key, data, ttlSeconds)` - Store with TTL
    - `invalidateCache(pattern)` - Delete by pattern

## Authentication & Identity

**Primary Auth Provider:** Custom (next-auth.js + JWT)
- Frontend: NextAuth.js 4.24.6
- Backend: JWT token validation
- Session strategy: JWT (30-day expiration)
- Provider: Credentials (email/password)

**Frontend Auth Implementation:**
- Location: `spendwise/src/lib/auth.ts`
- CredentialsProvider supports:
  - Email/password authentication
  - Pre-authenticated token flow (from registration/2FA)
- JWT signing: `jsonwebtoken` with `NEXTAUTH_SECRET`
- Session generation: NextAuth creates session with `accessToken`
- Callback: `jwt` callback generates signed JWT for GraphQL backend

**Backend Auth Implementation:**
- Location: `spendwise-api/src/context/auth.ts`
- Token validation: JWT.verify using `JWT_SECRET`
- Token transport: Authorization header with "Bearer " prefix
- User extraction: Extracts userId from JWT payload
- Token payload:
  ```typescript
  {
    id: string;
    email: string;
    name?: string;
    iat: number;
    exp: number;
  }
  ```
- Token expiration: 30 days
- Fallback: Returns null for missing/invalid tokens

**Password Security:**
- Library: bcryptjs 2.4.3
- Hashing cost: 12 (frontend registration: `src/app/api/auth/register/route.ts`)
- Verification: Used in credentials provider

**Two-Factor Authentication:**
- Methods: Email and SMS codes
- Code format: 6-digit numeric
- Expiration: 1 minute (configurable)
- Storage: Hashed with bcrypt in database
- Backup codes: JSON array stored encrypted
- Tracking: TwoFactorLog model with event audit trail
- Encryption: AES-256 for phone numbers (`ENCRYPTION_KEY`)

## Monitoring & Observability

**Error Tracking:**
- Provider: None (custom implementation)
- Approach: Console logging with debug prefixes
- Apollo Server formatting: Custom `formatError` handler in `spendwise-api/src/index.ts`
- Environment handling: Production hides internal error details

**Logs:**
- Approach: Console.log and console.error
- Auth debug logging: Extensive debug output in `spendwise-api/src/context/auth.ts`
- Service logging: Email and SMS services log operations and errors
- Location: Standard Node.js stdout/stderr
- No persistent log aggregation configured

## CI/CD & Deployment

**Hosting:**
- Not configured in codebase
- Expected targets: Vercel (Next.js frontend), Node.js hosting (Express backend)

**CI Pipeline:**
- No CI/CD configuration detected
- Test commands available but no automated pipeline

**Build Artifacts:**
- Frontend: Next.js build output in `.next/`
- Backend: TypeScript compiled to `dist/` directory
- Package format: npm packages

## Environment Configuration

**Required env vars - Frontend (`spendwise/.env.local`):**
- `DATABASE_URL` - PostgreSQL connection (shared)
- `REDIS_URL` - Redis connection (shared)
- `NEXTAUTH_URL` - Session provider (http://localhost:3000 in dev)
- `NEXTAUTH_SECRET` - Session encryption
- `OPENAI_API_KEY` - Optional for AI features
- `NEXT_PUBLIC_GRAPHQL_URL` - Public GraphQL endpoint (http://localhost:4000/graphql in dev)

**Required env vars - Backend (`spendwise-api/.env`):**
- `DATABASE_URL` - PostgreSQL connection
- `REDIS_URL` - Redis connection
- `JWT_SECRET` - JWT signing (should match NEXTAUTH_SECRET for compatibility)
- `PORT` - Server port (default 4000)
- `NODE_ENV` - Environment mode
- `ENCRYPTION_KEY` - AES-256 encryption key (32-byte hex)
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASSWORD` - Email
- `SMTP_FROM_EMAIL`, `SMTP_FROM_NAME` - Email identity
- `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBER` - SMS (optional)

**Secrets location:**
- Development: `.env` and `.env.local` files (NOT committed)
- Production: Environment variables via deployment platform

## Webhooks & Callbacks

**Incoming:**
- None detected

**Outgoing:**
- None detected (Twilio and email are one-directional service calls)

## CORS Configuration

**Backend (`spendwise-api/src/index.ts`):**
- Origins allowed:
  - `http://localhost:3000` (frontend dev)
  - `http://localhost:3001` (alternative frontend)
- Credentials: true (includes cookies/auth headers)
- Only on `/graphql` endpoint

## Health Checks

**Backend:**
- Endpoint: `GET /health`
- Response: `{ status: 'ok' }`
- Location: `spendwise-api/src/index.ts`
- Usage: Service availability monitoring

---

*Integration audit: 2026-01-30*
