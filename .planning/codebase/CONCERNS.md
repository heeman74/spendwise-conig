# Codebase Concerns

**Analysis Date:** 2026-01-30

## Tech Debt

**Unimplemented Feature Handlers:**
- Issue: Critical frontend features lack implementation, causing runtime failures when triggered
- Files:
  - `spendwise/src/app/(dashboard)/transactions/page.tsx:115` - Delete transaction action
  - `spendwise/src/app/(dashboard)/accounts/page.tsx:59` - Sync accounts action
  - `spendwise/src/app/(dashboard)/investments/page.tsx:35` - Advice actions
  - `spendwise/src/components/dashboard/QuickActions.tsx:43` - Transaction creation
- Impact: Users can click buttons that fail silently or throw errors; incomplete user workflows
- Fix approach: Implement missing mutation handlers in each component and wire to API resolvers

**International Phone Number Support Incomplete:**
- Issue: SMS service only supports US phone numbers (hardcoded +1 country code handling)
- Files: `spendwise-api/src/lib/sms.ts:38-50`
- Impact: Users from non-US regions cannot use SMS 2FA; marked with "Todo" comments indicating planned future work
- Fix approach: Expand phone number formatting to support E.164 format with multiple country codes; integrate phone validation library

**AI-Generated Advice Not Integrated:**
- Issue: OpenAI dependency exists in stack but advice resolver generates only rule-based suggestions
- Files: `spendwise-api/src/schema/resolvers/advice.ts:94` - "Todo: AI generated advice"
- Impact: Investment in OpenAI integration unused; limited personalization of financial advice
- Fix approach: Add AI prompt engineering to advice resolver; handle streaming responses; implement cost controls

## Known Bugs

**Loose TypeScript Error Handling:**
- Problem: Generic `catch (error: any)` blocks throughout codebase mask actual error types
- Files:
  - `spendwise-api/src/lib/sms.ts:69,92` - Twilio error handling
  - `spendwise/src/app/(dashboard)/settings/page.tsx:71,94,111,130` - Settings page mutation handlers
- Trigger: Any GraphQL error from API returns generic message to frontend without type discrimination
- Workaround: Check browser console for actual error messages
- Impact: Difficult error debugging; users see unhelpful error messages

**Debug Logging in Production Auth:**
- Problem: JWT verification logs contain sensitive information and debug output
- Files: `spendwise-api/src/context/auth.ts:20-22,32`
- Trigger: Executes on every API request when running in production with console output enabled
- Impact: Potential information disclosure through logs; performance overhead; exposure of JWT_SECRET prefix
- Fix approach: Condition debug logging on NODE_ENV === 'development'; use proper structured logging

**Missing ENCRYPTION_KEY Validation:**
- Problem: Code assumes ENCRYPTION_KEY env var exists but doesn't validate format or presence upfront
- Files: `spendwise-api/src/lib/twoFactor.ts:203,217` - Uses `process.env.ENCRYPTION_KEY!` with non-null assertion
- Trigger: System starts without error but fails at runtime when encrypting phone numbers
- Impact: Delayed failure discovery; affects phone number collection in 2FA setup
- Fix approach: Validate encryption key on startup in main.ts; throw clear error if missing/invalid

## Security Considerations

**Backup Codes JSON String Parsing Without Validation:**
- Risk: Backup codes stored as JSON string; parsing failures silently caught with generic fallback
- Files: `spendwise-api/src/lib/twoFactor.ts:193-196` - `JSON.parse()` in try-catch
- Current mitigation: Fallback returns 0 codes
- Recommendation: Add explicit schema validation for backup codes array; log parse failures; validate on write

**Phone Number Encryption Without Authenticated Key Management:**
- Risk: Encryption key stored in environment variable; single key for all users; no key rotation mechanism
- Files: `spendwise-api/src/lib/twoFactor.ts:201-231`
- Current mitigation: Uses AES-256-GCM with random IV
- Recommendations:
  - Implement key derivation per user or use secrets manager (AWS Secrets Manager, HashiCorp Vault)
  - Add key rotation strategy with versioning in encrypted data format
  - Audit environment variable access in deployment pipeline

**Two-Factor Code Attempt Rate Limiting Depends on Redis:**
- Risk: If Redis becomes unavailable, rate limiting silently fails and allows brute force attacks
- Files: `spendwise-api/src/lib/twoFactor.ts:33-37` - "If Redis fails, allow the request"
- Current mitigation: Console error logging
- Recommendation: Fail secure by throwing error instead of allowing request; implement in-memory fallback with data loss acknowledgment

**Unvalidated User Input in SMS/Email Services:**
- Risk: Phone numbers and emails passed directly to external services without comprehensive validation
- Files:
  - `spendwise-api/src/lib/sms.ts:53-73` - Basic E.164 format check but permissive
  - `spendwise-api/src/lib/email.ts` - Email validation before sending
- Current mitigation: Basic regex validation for phone and email
- Recommendation: Use established libraries (libphonenumber-js, email-validator); add content injection tests

**Backup Code Generation Uses Insufficient Entropy:**
- Risk: Codes generated as `crypto.randomBytes(4).toString('hex')` = 8 hex chars (32 bits entropy)
- Files: `spendwise-api/src/lib/twoFactor.ts:148`
- Current mitigation: Codes are hashed with bcrypt(12) in database
- Recommendation: Increase entropy to 128 bits minimum for backup codes; document expected guessing resistance

## Performance Bottlenecks

**N+1 Query in Dashboard Analytics:**
- Problem: Dashboard stats fetches accounts, transactions, and goals separately; could use single JOIN query
- Files: `spendwise-api/src/schema/resolvers/analytics.ts:38-44`
- Cause: Parallel Promise.all() with separate Prisma queries
- Improvement path: Use Prisma `include()` to fetch related data; single query with joins
- Impact: Extra database round trips; scales poorly with many users

**Redis Cache Miss Cascades to Database:**
- Problem: All queries check Redis then hit database if missing; no cache warming strategy
- Files:
  - `spendwise-api/src/schema/resolvers/advice.ts:21-24`
  - `spendwise-api/src/schema/resolvers/analytics.ts:31-34`
- Cause: Cache hits happen per-request without predictive warming
- Impact: Cold cache on service restart causes stampede of database queries; potential timeout cascades
- Improvement path: Implement cache warming on mutation operations; use Redis WATCH for consistency

**Large JSON String Serialization for Backup Codes:**
- Problem: Backup codes stored as JSON string in User.backupCodes; parsed/stringified on every verification
- Files: `spendwise-api/src/lib/twoFactor.ts:167,176`
- Cause: Design choice to store array as single field instead of junction table
- Impact: Inefficient for users with many backup code operations
- Improvement path: Create separate BackupCode model with indexed table; simpler queries

## Fragile Areas

**Two-Factor Authentication Implementation:**
- Files:
  - `spendwise-api/src/lib/twoFactor.ts` (286 lines)
  - `spendwise-api/src/schema/resolvers/twoFactor.ts` (380 lines)
- Why fragile: Critical security component with multiple moving parts (code generation, delivery channels, backup codes, state transitions)
- Safe modification:
  - Add comprehensive logging for all state transitions (code sent → verified → used)
  - Test all paths: happy path, rate limits, expired codes, backup code fallback
  - Verify database constraints prevent duplicate verified codes
- Test coverage: Test files exist but focus on happy paths; missing edge cases like concurrent verification attempts

**Settings Page State Management:**
- Files: `spendwise/src/app/(dashboard)/settings/page.tsx` (547 lines)
- Why fragile:
  - Complex local state with 8+ useState hooks managing modal visibility and form inputs
  - Interdependent state (selectedMethod affects which fields render)
  - Three separate modals with shared verification code input
- Safe modification: Extract modal logic to separate components; create custom hook for 2FA state machine
- Test coverage: Basic component tests exist but lack integration tests for full enable/disable flows

**SMS Service Initialization:**
- Files: `spendwise-api/src/lib/sms.ts` (111 lines)
- Why fragile: Silent initialization failures allow service to start without SMS capability but without clear indication
- Safe modification:
  - Throw clear error on startup if SMS is required but not configured
  - Separate "SMS disabled" from "SMS misconfigured" states
  - Add health check endpoint for SMS service status
- Test coverage: Unit tests cover validation but not end-to-end Twilio integration

**Phone Number Encryption/Decryption:**
- Files: `spendwise-api/src/lib/twoFactor.ts:201-231`
- Why fragile:
  - String-based IV/authTag parsing with no schema or versioning
  - Decrypt fails silently if encrypted value format is corrupted
  - Mask function assumes specific format
- Safe modification: Version encrypted data format; add validation on decrypt; add integration test with real data
- Test coverage: Missing tests for corruption scenarios

## Scaling Limits

**Redis as Single Point of Failure for Rate Limiting:**
- Current capacity: Redis cluster typical burst: ~10k ops/sec per node
- Limit: If primary node fails, rate limiting disabled; if memory full, keys evicted unpredictably
- Scaling path: Add Redis cluster with sentinel for failover; monitor key eviction; implement circuit breaker pattern

**Database Query Volume from Cache Misses:**
- Current capacity: PostgreSQL read pools depend on configuration; typical: 100-500 concurrent queries
- Limit: Cold cache after restart causes query storm; 1000+ users active = N concurrent dashboard fetches
- Scaling path: Implement cache warming on deployment; use query result pagination; add query timeouts

**Two-Factor Code Storage:**
- Current capacity: TwoFactorCode table with indexes on (userId, verified, expiresAt); typical SSD: 10M+ rows before performance degrades
- Limit: Cleanup job missing to remove expired codes; table grows unbounded
- Scaling path: Add scheduled job to delete codes older than 7 days; monitor table size; partition by userId or date

## Dependencies at Risk

**Twilio Integration Hardcoded:**
- Risk: SMS feature tightly coupled to Twilio SDK; switching providers requires code changes across multiple files
- Files: `spendwise-api/src/lib/sms.ts`, `spendwise-api/src/schema/resolvers/twoFactor.ts`, resolvers using SMS
- Impact: Vendor lock-in; cost changes require renegotiation; API changes block updates
- Migration plan: Create SMSProvider interface; implement TwilioProvider; allow swapping providers via env var

**OpenAI Dependency Unused:**
- Risk: Package added but feature never completed; maintenance burden without value
- Files: `spendwise/package.json` - present but unused in code
- Impact: Security updates for OpenAI SDK required; potential licensing concerns if not using service
- Migration plan: Remove OpenAI from dependencies if advice generation stays rule-based; or complete AI integration

**jsonwebtoken Non-Standard Usage:**
- Risk: Token expiration hardcoded to 30 days across both projects
- Files: `spendwise-api/src/context/auth.ts:65`
- Impact: Cannot adjust token lifetime without code changes; conflicts with NextAuth session handling
- Migration plan: Move expiration to env var; align with NextAuth token refresh strategy

## Missing Critical Features

**Audit Trail for Financial Transactions:**
- Problem: No user-facing audit log; users cannot see account activity history
- Blocks: Compliance requirements; dispute resolution; fraud investigation
- Current state: Only TwoFactorLog exists for security events; no transaction modification log
- Fix approach: Create AuditLog model; log all transaction mutations; expose via read-only query

**Account Sync Not Implemented:**
- Problem: Bank account integration stubbed but not connected
- Blocks: Real data import from financial institutions; MVP completion
- Current state: lastSynced field exists on Account model but never updated
- Fix approach: Integrate Plaid/Finicity SDK or implement import mechanism

**Transaction Search/Filter:**
- Problem: Frontend has TransactionFilters component but filters not passed to API resolver
- Blocks: Users cannot find specific transactions in large datasets
- Current state: All transactions fetched then filtered client-side
- Fix approach: Implement date range, category, amount, merchant filters in resolver

## Test Coverage Gaps

**API Error Response Handling:**
- What's not tested: GraphQL mutation error responses don't match frontend error handling expectations
- Files: `spendwise-api/src/schema/resolvers/` - all resolvers lack error response type coverage
- Risk: Frontend receives unexpected error format; error modal displays raw API error
- Priority: HIGH - affects user experience on any mutation failure

**Two-Factor Setup Edge Cases:**
- What's not tested:
  - Simultaneous setup attempts for EMAIL and SMS
  - Code expiration race conditions during verification
  - Backup code depletion scenarios
- Files: `spendwise-api/src/__tests__/lib/twoFactor.test.ts`, `spendwise/src/__tests__/components/auth/TwoFactorSetup.test.tsx`
- Risk: Users might lose access to account if edge cases triggered
- Priority: HIGH - security feature

**Database Constraint Violations:**
- What's not tested: Cascading deletes, unique constraint handling
- Files: Tests mock Prisma; no integration tests with real database
- Risk: Data inconsistencies; orphaned records if constraints fail silently
- Priority: MEDIUM - data integrity

**Redis Failover Scenarios:**
- What's not tested:
  - Rate limit check with Redis unavailable
  - Cache retrieval with Redis timeout
  - Cache invalidation with stale data
- Files: `spendwise-api/src/lib/redis.ts` - unit tests only
- Risk: Unexpected behavior when Redis goes down; silent failures
- Priority: MEDIUM - reliability

**E2E Tests Incomplete:**
- What's not tested:
  - Full 2FA flow with SMS verification
  - Analytics calculations accuracy
  - Budget advice generation logic
- Files: `spendwise/e2e/` directory has 5 specs covering auth, accounts, transactions but missing advice/analytics
- Risk: Backend changes break dashboards undetected
- Priority: LOW - integration tests provide coverage but E2E adds confidence

**Decimal Math Rounding:**
- What's not tested: Currency calculations don't have rounding tests
- Files: `spendwise-api/src/schema/resolvers/analytics.ts` uses parseDecimal and arithmetic
- Risk: Penny-off errors in totals; rate calculations wrong due to JavaScript float precision
- Priority: MEDIUM - financial accuracy

---

*Concerns audit: 2026-01-30*
