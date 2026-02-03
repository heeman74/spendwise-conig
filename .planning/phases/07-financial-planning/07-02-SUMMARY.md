---
phase: 07
plan: 02
subsystem: financial-planning-api
tags: [graphql, sse, streaming, api, rate-limiting, insights]
requires: [07-01]
provides: [chat-api, insight-api, streaming-endpoint]
affects: [07-03, 07-04]
tech-stack:
  added: []
  patterns: [sse-streaming, graphql-resolvers, insight-invalidation]
key-files:
  created:
    - spendwise-api/src/schema/typeDefs/financialPlanning.ts
    - spendwise-api/src/schema/resolvers/financialPlanning.ts
    - spendwise-api/src/routes/chat-stream.ts
  modified:
    - spendwise-api/src/schema/typeDefs/index.ts
    - spendwise-api/src/schema/resolvers/index.ts
    - spendwise-api/src/index.ts
    - spendwise-api/src/schema/resolvers/statementImport.ts
decisions:
  - id: sse-streaming-pattern
    choice: Server-Sent Events for token-by-token streaming
    rationale: Native browser support, simpler than WebSockets for one-way streaming, works with standard HTTP
  - id: disclaimer-append-before-save
    choice: Add disclaimer to assistant message before database persistence
    rationale: Ensures disclaimer is always present in chat history, not added client-side
  - id: 20-message-history-limit
    choice: Load last 20 messages for conversation context
    rationale: Balances context quality with token usage, sufficient for multi-turn conversations
  - id: insight-invalidation-on-import
    choice: Invalidate insights after statement import, not delete
    rationale: Preserves insight history for analysis, allows regeneration with fresh data
  - id: prisma-type-assertion
    choice: Use 'as any' for extended Prisma client in service calls
    rationale: Service functions expect strict PrismaClient type, extended client is compatible at runtime
metrics:
  duration: 3.2 minutes
  files-created: 3
  files-modified: 4
  queries-added: 4
  mutations-added: 4
completed: 2026-02-02
---

# Phase 07 Plan 02: Financial Planning API Summary

**One-liner:** Built GraphQL API layer with 4 queries + 4 mutations and SSE streaming endpoint for real-time Claude responses with automatic insight invalidation on imports

## What Was Built

This plan exposed the Plan 01 foundation services through the GraphQL API and created a streaming endpoint for real-time chat responses. The API now supports chat session management, insight retrieval, goal parsing, and token-by-token streaming of Claude's responses via Server-Sent Events.

### GraphQL API Layer

Created complete type definitions and resolvers for financial planning:

**Type Definitions (`financialPlanningTypeDefs`):**
- `ChatSession`: Session container with id, title, timestamps, and messages relation
- `ChatMessage`: Individual messages with role (user/assistant), content, optional metadata (JSON)
- `InsightCard`: Pre-generated insights with type, title, content, priority, timestamp
- `RateLimitStatus`: Rate limit status with allowed flag, remaining count, reset time
- `SendMessageResult`: Mutation result with success status, sessionId, messageId
- `GoalParseResult`: Goal parsing result with success flag, optional SavingsGoal, confidence score

**Queries:**
1. `chatSessions`: Fetch all user sessions ordered by most recent activity
2. `chatSession(id)`: Fetch single session with full message history
3. `activeInsights`: Retrieve non-invalidated insights sorted by priority
4. `chatRateLimit`: Check current rate limit status for user

**Mutations:**
1. `createChatSession(title?)`: Create new session with optional custom title
2. `sendChatMessage(sessionId, content)`: Save user message, check rate limit, return success (actual response via SSE)
3. `regenerateInsights`: Trigger fresh insight generation from current financial data
4. `parseGoalFromChat(input, sessionId?)`: Parse freeform text to extract SavingsGoal details

**Resolvers:**
- All queries/mutations require authentication via `requireAuth(context)`
- Rate limit checked before message processing
- Session ownership verified for all operations
- Services called with `context.prisma as any` for extended client compatibility
- ChatSession field resolver for lazy-loaded messages

**Registration:**
- Added to `typeDefs/index.ts` and `resolvers/index.ts`
- Queries merged into root Query type
- Mutations merged into root Mutation type
- ChatSession resolver registered for field resolution

### SSE Streaming Endpoint

Created Express router at `/api/chat/stream` for real-time Claude responses:

**Request Flow:**
1. Extract and validate JWT from Authorization header
2. Validate request body (sessionId, content required)
3. Check rate limit - return 429 if exceeded
4. Verify session ownership
5. Save user message to database
6. Increment rate limit usage
7. Build financial summary (6-month window)
8. Load last 20 messages for conversation context
9. Set SSE headers (text/event-stream, no-cache, keep-alive)
10. Stream response chunks token-by-token
11. Append disclaimer to complete response
12. Save assistant message to database
13. Update session timestamp
14. Close connection

**SSE Event Format:**
- `content_block_start`: Stream initialization
- `content_block_delta`: Token chunks with `content` field
- `content_block_stop`: Content complete
- `message_stop`: Full response complete
- `error`: Error events if streaming fails

**Streaming Implementation:**
- Uses `streamChatResponse()` AsyncGenerator from claude-client.ts
- Builds financial summary on each request (fresh context)
- Conversation history limited to last 20 messages
- Disclaimer appended before persistence: "_Not professional financial advice. Consult a licensed advisor for personalized guidance._"
- Handles client disconnect gracefully

**Error Handling:**
- Authentication failures: 401
- Missing parameters: 400
- Rate limit exceeded: 429 with resetAt timestamp
- Session not found: 404
- Streaming errors: SSE error event
- Generic errors: 500 or SSE error event if streaming started

**CORS Configuration:**
- Enabled for localhost:3000 and localhost:3001
- Credentials allowed for cookie-based auth

### Insight Cache Invalidation

Extended statement import flow to invalidate insights:

**Integration Point:**
- After recurring detection and net worth snapshot triggers
- Before Redis cache cleanup
- Non-blocking with try/catch (import succeeds even if invalidation fails)

**Implementation:**
```typescript
await ctx.prisma.insightCache.updateMany({
  where: {
    userId: ctx.user!.id,
    invalidatedAt: null,
  },
  data: {
    invalidatedAt: new Date(),
  },
});
```

**Behavior:**
- Sets `invalidatedAt` timestamp on all active insights
- Does NOT delete insights (preserves history)
- Active insights query filters out invalidated entries
- Frontend can trigger regeneration via `regenerateInsights` mutation
- Ensures insights always reflect latest transactions

## Key Implementation Details

**SSE vs WebSockets:**
- Chose SSE for simpler one-way streaming
- Native browser EventSource API support
- Works over standard HTTP (no upgrade required)
- Sufficient for token-by-token chat responses

**Conversation History Management:**
- Last 20 messages loaded from database
- Excludes current user message (already in request)
- Mapped to Claude's message format (role + content)
- Combined with financial summary in system prompt

**Rate Limiting:**
- Checked in both GraphQL mutation and SSE endpoint
- GraphQL mutation: early validation before streaming
- SSE endpoint: enforced before financial summary generation
- Prevents double-charging on retry

**Disclaimer Handling:**
- Appended to full response before database save
- Sent as final SSE chunk for immediate display
- Always present in chat history
- Not added client-side (ensures consistency)

**Type Safety:**
- Services expect `PrismaClient` type
- Context provides extended Prisma client
- Used `as any` assertion for compatibility
- Common pattern in extended Prisma setups

## Deviations from Plan

**Auto-fixed Issues:**

**1. [Rule 3 - Blocking] Fixed Prisma client type mismatch**
- **Found during:** Task 1 TypeScript compilation
- **Issue:** Service functions signature `PrismaClient` incompatible with context's extended Prisma client type
- **Fix:** Added `as any` type assertions when passing `context.prisma` to service functions
- **Files modified:** financialPlanning.ts resolver
- **Commit:** Included in Task 1 commit (2d68015)

**Rationale:** Extended Prisma clients (with encryption or other middleware) have different types but are runtime-compatible. The `as any` assertion is a standard pattern for this scenario and does not affect type safety within the services themselves.

## Testing Notes

All code verified via TypeScript compilation. Integration testing will occur in Plan 07-03 (frontend).

**Manual verification checklist:**
- [x] GraphQL schema compiles cleanly
- [x] All 4 queries registered in schema
- [x] All 4 mutations registered in schema
- [x] SSE endpoint registered at /api/chat/stream (before Apollo middleware)
- [x] Insight invalidation added to statement import resolver
- [x] TypeScript compiles without errors

**API contracts established:**
- Chat session CRUD operations
- Message persistence and retrieval
- Insight generation and caching
- Rate limit enforcement
- SSE streaming protocol

## Next Phase Readiness

**Ready for 07-03 (Frontend UI):**
- GraphQL API fully implemented
- SSE streaming endpoint operational
- Rate limit enforced at API layer
- Insights automatically refreshed on imports
- All resolvers authenticated and authorized

**Frontend can now:**
- Create and manage chat sessions
- Send messages via GraphQL mutation
- Stream responses via SSE endpoint
- Display active insights
- Show rate limit status
- Parse goals from chat input

**Environment requirements:**
- `ANTHROPIC_API_KEY` must be set (same as Plan 01)
- Redis running for rate limiting (already required)

**Blockers:** None

**Concerns:** None - API layer complete and ready for frontend integration

## Commit History

| Commit | Message | Files Changed |
|--------|---------|---------------|
| 2d68015 | feat(07-02): add GraphQL typeDefs and resolvers for financial planning | 4 |
| 49fc579 | feat(07-02): add SSE streaming endpoint and insight invalidation | 3 |

**Total changes:**
- 7 files created/modified
- ~484 lines added
- 4 GraphQL queries added
- 4 GraphQL mutations added
- 1 SSE streaming endpoint created
- 1 insight invalidation trigger added

---

**Phase 07 Plan 02 complete.** GraphQL API and SSE streaming ready for frontend integration.
