---
phase: 07
plan: 03
subsystem: financial-planning-frontend
tags: [graphql, react-hooks, sse-client, apollo, streaming]
requires: [07-02]
provides: [chat-hooks, insight-hooks, streaming-client]
affects: [07-04]
tech-stack:
  added: []
  patterns: [apollo-hooks, sse-streaming-client, options-object-pattern]
key-files:
  created:
    - spendwise/src/graphql/queries/financialPlanning.ts
    - spendwise/src/graphql/mutations/financialPlanning.ts
    - spendwise/src/hooks/useFinancialPlanning.ts
  modified:
    - spendwise/src/graphql/queries/index.ts
    - spendwise/src/graphql/mutations/index.ts
    - spendwise/src/hooks/index.ts
decisions:
  - id: network-only-rate-limit
    choice: Use network-only fetch policy for rate limit queries
    rationale: Rate limits change rapidly, cache would be stale immediately
  - id: no-refetch-send-message
    choice: sendChatMessage mutation does not trigger refetch queries
    rationale: SSE stream handles response delivery, refetching would be redundant
  - id: fetch-api-sse-client
    choice: Use fetch API with ReadableStream instead of EventSource
    rationale: Need custom headers for auth, EventSource doesn't support Authorization header
  - id: abort-controller-cancellation
    choice: Use AbortController for stream cancellation
    rationale: Standard pattern for cancellable fetch requests, clean cleanup
metrics:
  duration: 2.4 minutes
  files-created: 3
  files-modified: 3
  queries-added: 4
  mutations-added: 4
  hooks-added: 9
completed: 2026-02-02
---

# Phase 07 Plan 03: Financial Planning Frontend Data Layer Summary

**One-liner:** Built complete frontend data layer with 4 GraphQL query documents, 4 mutation documents, 8 Apollo hooks, and 1 SSE streaming hook using fetch API with custom auth headers

## What Was Built

This plan created the frontend data layer for financial planning: GraphQL query/mutation documents following the portfolio.ts pattern, Apollo hooks following the usePortfolio.ts pattern, and a custom SSE streaming client using fetch API with ReadableStream for token-by-token chat responses with authentication.

### GraphQL Query Documents

Created `src/graphql/queries/financialPlanning.ts` with 4 query documents:

**GET_CHAT_SESSIONS:**
- Fetches all user chat sessions
- Returns: id, userId, title, createdAt, updatedAt
- No messages (performance - lazy load)

**GET_CHAT_SESSION:**
- Fetches single session with full message history
- Variables: id (String!)
- Returns: session + messages array with role, content, metadata
- Used for chat UI display

**GET_ACTIVE_INSIGHTS:**
- Fetches non-invalidated insight cards
- Returns: id, insightType, title, content, priority, generatedAt
- Sorted by priority on backend

**GET_CHAT_RATE_LIMIT:**
- Checks current rate limit status
- Returns: allowed (Boolean), remaining (Int), resetAt (String)
- Always fetches fresh data (network-only policy)

**Pattern:**
- Uses `gql` from `@apollo/client`
- Field selection mirrors API schema exactly
- Follows established query naming convention (GET_*)

### GraphQL Mutation Documents

Created `src/graphql/mutations/financialPlanning.ts` with 4 mutation documents:

**CREATE_CHAT_SESSION:**
- Creates new chat session
- Variables: title (optional String)
- Returns: full ChatSession object

**SEND_CHAT_MESSAGE:**
- Saves user message, triggers rate limit check
- Variables: sessionId (String!), content (String!)
- Returns: SendMessageResult (success, sessionId, messageId)
- Does NOT return assistant response (comes via SSE)

**REGENERATE_INSIGHTS:**
- Triggers fresh insight generation from current data
- No variables
- Returns: array of new InsightCard objects

**PARSE_GOAL_FROM_CHAT:**
- Extracts SavingsGoal from natural language input
- Variables: input (String!), sessionId (optional String)
- Returns: GoalParseResult (parsed, goal, confidence)
- Goal includes all SavingsGoal fields if successfully parsed

**Pattern:**
- Standard mutation format
- Returns affected objects for cache updates
- Follows established naming convention (VERB_NOUN_*)

### Apollo Query Hooks

Created 4 query hooks in `src/hooks/useFinancialPlanning.ts`:

**useChatSessions(options?):**
- Query: GET_CHAT_SESSIONS
- Options: skip (boolean)
- Returns: { sessions, loading, error, refetch }
- Fetch policy: cache-and-network
- Default sessions to empty array

**useChatSession(options?):**
- Query: GET_CHAT_SESSION
- Options: sessionId (string), skip (boolean)
- Variables: { id: sessionId }
- Returns: { session, loading, error, refetch }
- Fetch policy: cache-and-network
- Skip if no sessionId provided

**useActiveInsights(options?):**
- Query: GET_ACTIVE_INSIGHTS
- Options: skip (boolean)
- Returns: { insights, loading, error, refetch }
- Fetch policy: cache-and-network
- Default insights to empty array

**useChatRateLimit(options?):**
- Query: GET_CHAT_RATE_LIMIT
- Options: skip (boolean)
- Returns: { rateLimit, loading, error, refetch }
- Fetch policy: **network-only** (always fresh, no cache)
- Rate limits change rapidly, caching would be stale

**Pattern:**
- Options-object parameter with skip flag
- Destructured return with consistent naming
- Default empty arrays for collections
- Fetch policy: cache-and-network (except rate limit)

### Apollo Mutation Hooks

Created 4 mutation hooks:

**useCreateChatSession():**
- Mutation: CREATE_CHAT_SESSION
- refetchQueries: ['GetChatSessions']
- Returns: { createSession(title?), loading, error }
- Auto-updates session list after creation

**useSendChatMessage():**
- Mutation: SEND_CHAT_MESSAGE
- NO refetchQueries (SSE handles response delivery)
- Returns: { sendMessage(sessionId, content), loading, error }
- Returns promise with success status

**useRegenerateInsights():**
- Mutation: REGENERATE_INSIGHTS
- refetchQueries: ['GetActiveInsights']
- Returns: { regenerateInsights(), loading, error }
- Auto-updates insights list

**useParseGoalFromChat():**
- Mutation: PARSE_GOAL_FROM_CHAT
- No refetchQueries (returns parsed goal directly)
- Returns: { parseGoal(input, sessionId?), loading, error }
- Used for quick goal extraction

**Pattern:**
- Wrapped mutation functions with typed parameters
- refetchQueries for list updates
- awaitRefetchQueries: true for consistency
- Async functions return mutation result

### SSE Streaming Hook

Created `useChatStream()` custom hook for real-time chat responses:

**Why not EventSource:**
- EventSource API doesn't support custom headers
- Need Authorization: Bearer {token} for authentication
- Solution: fetch API with ReadableStream

**Implementation:**
- State: isStreaming, streamedContent, error
- Ref: abortControllerRef for cancellation
- Methods: startStream(options), stopStream()

**startStream flow:**
1. Reset state (isStreaming=true, content='', error=null)
2. Get auth token via `getSession()` from next-auth
3. Abort if not authenticated
4. POST to `/api/chat/stream` with sessionId + content
5. Set Authorization header with Bearer token
6. Read response.body with ReadableStream reader
7. Decode chunks with TextDecoder
8. Parse SSE events (data: prefix)
9. Handle event types:
   - `content_block_delta`: Accumulate text, call onToken callback
   - `message_stop`: Complete, call onComplete callback
   - `error`: Throw error
10. Update streamedContent state incrementally
11. Set isStreaming=false on completion

**stopStream flow:**
- Calls abortController.abort()
- Cancels fetch request cleanly
- Sets isStreaming=false
- AbortError is ignored (user-initiated)

**Error handling:**
- Network errors: caught and set in error state
- Authentication errors: thrown immediately
- HTTP errors: parsed from response JSON
- Parse errors: logged but ignored (keep-alive comments)
- Abort errors: silent (user cancelled)

**Callbacks:**
- onToken(token): Called for each text chunk
- onComplete(fullContent): Called when stream finishes
- onError(error): Called on streaming errors

**Usage pattern:**
```typescript
const { startStream, stopStream, isStreaming, streamedContent, error } = useChatStream();

await startStream({
  sessionId: 'session-id',
  content: 'User message',
  onToken: (token) => console.log(token),
  onComplete: (full) => console.log('Done:', full),
  onError: (err) => console.error(err),
});

// Later: stopStream() to cancel
```

### Barrel Exports

Updated 3 barrel export files:

**src/graphql/queries/index.ts:**
- Added: `export * from './financialPlanning'`
- Exports GET_CHAT_SESSIONS, GET_CHAT_SESSION, GET_ACTIVE_INSIGHTS, GET_CHAT_RATE_LIMIT

**src/graphql/mutations/index.ts:**
- Added: `export * from './financialPlanning'`
- Exports CREATE_CHAT_SESSION, SEND_CHAT_MESSAGE, REGENERATE_INSIGHTS, PARSE_GOAL_FROM_CHAT

**src/hooks/index.ts:**
- Added: `export * from './useFinancialPlanning'`
- Exports all 9 hooks (4 query, 4 mutation, 1 streaming)

## Key Implementation Details

**Authentication in SSE client:**
- Cannot use EventSource (no custom headers)
- Used fetch API with Authorization header
- Token from next-auth getSession()
- Same pattern as Apollo authLink

**Rate limit fetch policy:**
- Only hook with network-only policy
- Rate limits change with each request
- Cache would always be stale
- Fresh data critical for UI decisions

**Send message refetch strategy:**
- Does NOT refetch queries
- SSE stream delivers assistant response
- Refetching would duplicate network calls
- Message list updates when stream completes

**SSE event parsing:**
- Lines starting with `data: ` contain JSON
- Parse each event, extract type and delta
- Accumulate text from content_block_delta events
- Ignore malformed events (comments, keep-alive)
- Stop on message_stop event

**Stream cancellation:**
- AbortController attached to fetch
- Calling abort() cancels request immediately
- Reader.read() throws AbortError
- Caught and ignored (user-initiated)
- Clean resource cleanup

**TypeScript typing:**
- All hooks use `any` for Apollo types (consistent with existing hooks)
- SSE options interface for type safety
- Error state typed as Error | null
- Callbacks optional with void return type

## Deviations from Plan

None - plan executed exactly as written.

All patterns followed established conventions from portfolio and recurring hooks. SSE implementation used fetch API as specified. All 9 hooks delivered with expected signatures.

## Testing Notes

All code verified via TypeScript compilation. Integration testing will occur in Plan 07-04 (UI implementation).

**Manual verification checklist:**
- [x] 4 query documents exported
- [x] 4 mutation documents exported
- [x] 9 hooks exported (4 query, 4 mutation, 1 streaming)
- [x] All barrel exports updated
- [x] TypeScript compiles without errors
- [x] Follows established hook patterns
- [x] SSE client uses fetch with auth headers

**Hook contracts established:**
- Chat session CRUD operations
- Message history retrieval
- Insight fetching and regeneration
- Rate limit checking
- Goal parsing from natural language
- Real-time streaming with token callbacks

## Next Phase Readiness

**Ready for 07-04 (Financial Planning UI):**
- All data hooks available via barrel export
- SSE streaming client ready for chat UI
- Mutation hooks configured with proper refetch strategies
- Rate limit hook provides real-time status
- Insight hooks support dashboard cards

**UI components can now:**
- Display chat session list
- Show conversation history
- Stream responses token-by-token
- Check rate limits before sending
- Display active insights
- Regenerate insights on demand
- Parse goals from chat input

**No authentication setup needed:**
- SSE client auto-fetches token from next-auth
- Apollo client already configured with authLink
- All requests include Bearer token

**Blockers:** None

**Concerns:** None - frontend data layer complete and ready for UI implementation

## Commit History

| Commit | Message | Files Changed |
|--------|---------|---------------|
| 424d96b | feat(07-03): add GraphQL query and mutation documents for financial planning | 4 |
| b56f5c0 | feat(07-03): add React hooks and SSE streaming client for financial planning | 2 |

**Total changes:**
- 6 files created/modified
- ~400 lines added
- 4 GraphQL queries added
- 4 GraphQL mutations added
- 8 Apollo hooks added
- 1 SSE streaming hook added

---

**Phase 07 Plan 03 complete.** Frontend data layer ready for UI components in Plan 07-04.
