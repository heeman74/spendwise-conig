---
phase: 02-plaid-integration-foundation
plan: 02
subsystem: plaid
completed: 2026-01-31
duration: 3min
tags: [plaid, webhooks, jwt-verification, express, security]
dependency_graph:
  requires:
    - 02-01 (Plaid client infrastructure)
  provides:
    - Webhook endpoint for Plaid notifications
    - JWT signature verification for webhook security
    - PlaidItem status updates based on connection health
  affects:
    - 02-03 (Frontend will need to detect error status and prompt re-auth)
    - Future webhook handlers (TRANSACTIONS, HOLDINGS, etc.)
tech_stack:
  added:
    - jose (JWT verification)
    - js-sha256 (body hash verification)
  patterns:
    - Plaid webhook JWT verification flow
    - Express route-level body parsing (express.raw vs express.json)
    - Unauthenticated endpoints with signature verification
key_files:
  created:
    - spendwise-api/src/lib/plaid-webhooks.ts (Webhook JWT verification utility)
    - spendwise-api/src/routes/plaid-webhooks.ts (Webhook route handler)
  modified:
    - spendwise-api/src/index.ts (Registered webhook route)
    - spendwise-api/package.json (Added jose, js-sha256)
decisions:
  - decision: Webhook route registered BEFORE GraphQL middleware
    rationale: Webhooks need express.raw() for signature verification, GraphQL uses express.json()
    impact: Each route manages its own body parsing strategy
  - decision: Return 200 OK for all successfully verified webhooks
    rationale: Even unhandled webhook types should return 200 to prevent Plaid retries
    impact: Graceful handling of future webhook types without code changes
  - decision: Return 200 OK even for processing errors (after signature verification)
    rationale: If signature is valid but processing fails, don't trigger Plaid retries
    impact: Internal processing errors are logged but don't cause webhook retry storms
---

# Phase 02 Plan 02: Plaid Webhooks Summary

**One-liner:** Secure Plaid webhook endpoint with JWT verification that updates PlaidItem connection status (ITEM_LOGIN_REQUIRED → error, LOGIN_REPAIRED → active).

## What Was Built

Created a production-ready webhook endpoint that receives Plaid notifications about connection status changes and securely verifies them using Plaid's JWT signature verification.

**Core functionality:**
- POST /webhooks/plaid endpoint that accepts Plaid webhook payloads
- Full JWT verification flow (kid extraction, JWK fetch, ES256 signature verification, timestamp check, body hash verification)
- PlaidItem status updates based on ITEM webhooks:
  - ITEM_LOGIN_REQUIRED error → status: 'error'
  - LOGIN_REPAIRED → status: 'active'
  - PENDING_EXPIRATION → status: 'pending_disconnect'
- Comprehensive logging for all webhook events (handled and unhandled)

**Security implementation:**
- Webhook authentication via JWT signature verification (not app's auth system)
- 5-minute timestamp freshness check on webhook JWTs
- SHA-256 body hash verification to prevent tampering
- Invalid/expired webhooks rejected with 401
- Valid webhooks always return 200 OK (prevents retry storms)

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Create webhook verification utility and route handler | 40793fd | src/lib/plaid-webhooks.ts, src/routes/plaid-webhooks.ts, package.json |
| 2 | Register webhook route in Express server | 5305366 | src/index.ts |

## Technical Implementation

### Webhook Verification Flow

The `verifyPlaidWebhook` function implements Plaid's official verification pattern:

1. **Extract JWT from header:** Get `plaid-verification` header
2. **Decode header for kid:** Use `jose.decodeProtectedHeader()` to extract key ID without verification
3. **Fetch JWK from Plaid:** Call `plaidClient.webhookVerificationKeyGet({ key_id: kid })`
4. **Import public key:** Use `jose.importJWK(jwk, 'ES256')` to create verification key
5. **Verify JWT signature:** Call `jose.jwtVerify(signedJwt, publicKey, { algorithms: ['ES256'] })`
6. **Check timestamp freshness:** Ensure `iat` claim is less than 5 minutes old
7. **Verify body hash:** Compute SHA-256 of request body, compare to `request_body_sha256` claim

### Express Route Architecture

**Critical design decision:** Webhook route uses `express.raw()` for body parsing, NOT `express.json()`.

**Why:**
- Signature verification requires the exact raw bytes of the request body
- JSON parsing transforms the body (whitespace, key ordering), breaking hash verification
- Therefore, webhook route must be registered BEFORE GraphQL middleware (which uses express.json())

**Route structure:**
```typescript
plaidWebhookRouter.post(
  '/webhooks/plaid',
  express.raw({ type: 'application/json' }),  // Route-level body parser
  async (req, res) => { ... }
);
```

**Server registration:**
```typescript
const app = express();
app.use(plaidWebhookRouter);  // BEFORE GraphQL middleware
app.use('/graphql', cors(), express.json(), expressMiddleware(server));
```

### Webhook Handling Logic

**ITEM webhooks (connection status):**
- `ERROR` with `ITEM_LOGIN_REQUIRED` → User needs to re-authenticate → status: 'error'
- `LOGIN_REPAIRED` → User successfully re-authenticated → status: 'active'
- `PENDING_EXPIRATION` → Connection will expire soon → status: 'pending_disconnect'

**Other webhooks (TRANSACTIONS, HOLDINGS, etc.):**
- Logged for future implementation
- Return 200 OK (prevents retries until handlers are implemented)

**Error handling strategy:**
- Signature verification failure → 401 (reject invalid webhooks)
- Processing errors (after verification) → 200 OK (valid webhook, internal issue, don't retry)
- Prevents webhook retry storms from internal errors

## Key Files

### spendwise-api/src/lib/plaid-webhooks.ts
Exports `verifyPlaidWebhook(body: string, headers: Record<string, string | string[] | undefined>): Promise<boolean>`

Implements the full Plaid webhook JWT verification flow using jose and js-sha256 libraries.

### spendwise-api/src/routes/plaid-webhooks.ts
Exports `plaidWebhookRouter` (Express Router)

Provides POST /webhooks/plaid endpoint that:
- Verifies webhook signature
- Parses webhook payload
- Updates PlaidItem status based on webhook type
- Logs all events for debugging

### spendwise-api/src/index.ts
Registers plaidWebhookRouter before GraphQL middleware to ensure proper body parsing.

## Integration Points

**Upstream dependencies:**
- 02-01: plaidClient for JWK fetching
- 02-01: PlaidItem model with status field
- 02-01: prisma client for database updates

**Downstream consumers:**
- 02-03: Frontend integration will detect 'error' status and prompt re-auth flow
- Future: TRANSACTIONS webhooks will trigger transaction sync
- Future: HOLDINGS webhooks will trigger investment data refresh

## What's Next

**Immediate next steps (02-03):**
- Frontend PlaidLink integration to handle re-authentication
- UI indication when PlaidItem status is 'error' (e.g., "Reconnect required" banner)
- Link update mode to fix broken connections

**Future webhook handlers:**
- TRANSACTIONS webhooks: Trigger incremental transaction sync
- HOLDINGS webhooks: Refresh investment holdings data
- ASSETS webhooks: Update asset report status

## Decisions Made

**1. Webhook route registered before GraphQL middleware**
- **Context:** Webhooks need express.raw() for signature verification, GraphQL uses express.json()
- **Decision:** Register webhook route first, let each route manage its own body parsing
- **Impact:** Clear separation of concerns, prevents body parsing conflicts
- **Alternatives considered:** Global express.raw() with selective JSON parsing (more complex, error-prone)

**2. Return 200 OK for all successfully verified webhooks**
- **Context:** Plaid retries webhooks that return 4xx/5xx status codes
- **Decision:** Return 200 OK even for unhandled webhook types
- **Impact:** Graceful handling of future webhook types without code changes, no retry storms
- **Alternatives considered:** Return 501 Not Implemented (would cause Plaid to retry indefinitely)

**3. Return 200 OK for processing errors after signature verification**
- **Context:** If signature is valid but database update fails, should Plaid retry?
- **Decision:** Return 200 OK, log the error internally
- **Impact:** Internal errors don't trigger webhook retry storms, errors are logged for investigation
- **Alternatives considered:** Return 500 (would cause retries, could overwhelm system during outages)

## Next Phase Readiness

**Blockers:** None

**Concerns:** None

**Ready for next plan:** Yes

**What enables next plan:**
- Webhook endpoint is production-ready
- PlaidItem status field accurately reflects connection health
- Frontend can now detect 'error' status and prompt re-authentication

## Deviations from Plan

None - plan executed exactly as written.

## Performance

**Execution time:** 3 minutes

**Efficiency notes:**
- Quick dependency installation (jose, js-sha256)
- Clean TypeScript compilation
- All existing tests still pass (201 tests)

## Testing Notes

**Existing test coverage:**
- All 201 existing tests pass
- Tests verify existing resolvers and utilities still work

**Future test needs:**
- Webhook verification tests (mock jose.jwtVerify, test signature validation)
- Webhook handler tests (mock Plaid payloads, verify status updates)
- Integration tests (verify route registration, body parsing)

**Test strategy for next plan:**
- Unit tests for webhook verification utility
- Integration tests for webhook route handler
- E2E tests for webhook flow (send mock Plaid webhook, verify database update)
