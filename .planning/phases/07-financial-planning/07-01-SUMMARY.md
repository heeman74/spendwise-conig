---
phase: 07
plan: 01
subsystem: financial-planning-foundation
tags: [anthropic, claude, ai, prisma, schema, chat, insights, rate-limiting, redis]
requires: [06-04]
provides: [chat-persistence, insight-caching, financial-summarization, claude-client]
affects: [07-02, 07-03, 07-04]
tech-stack:
  added: [@anthropic-ai/sdk]
  patterns: [ai-streaming, token-optimization, insight-caching]
key-files:
  created:
    - spendwise-api/src/lib/anthropic.ts
    - spendwise-api/src/services/financialPlanning/financial-summarizer.ts
    - spendwise-api/src/services/financialPlanning/prompt-templates.ts
    - spendwise-api/src/services/financialPlanning/claude-client.ts
    - spendwise-api/src/services/financialPlanning/insight-generator.ts
    - spendwise-api/src/services/financialPlanning/goal-parser.ts
    - spendwise-api/src/services/financialPlanning/rate-limiter.ts
    - spendwise-api/src/types/ioredis-mock.d.ts
  modified:
    - spendwise-api/prisma/schema.prisma
    - spendwise/prisma/schema.prisma
    - spendwise-api/package.json
decisions:
  - id: anthropic-claude-api
    choice: Claude 3.5 Sonnet for financial planning chat
    rationale: Separate from OpenAI categorization, better conversational tone for advisory role
  - id: 25-message-daily-limit
    choice: 25 messages per day per user
    rationale: Controls LLM API costs while providing sufficient quota for meaningful conversations
  - id: 6-month-summary-window
    choice: Last 6 months of financial data in summary
    rationale: Captures seasonal patterns without excessive token usage
  - id: insight-cache-invalidation
    choice: Invalidate insights after statement import
    rationale: Ensures insights always reflect latest data without constant regeneration
  - id: 3-model-system
    choice: Three separate models - ChatSession, ChatMessage, InsightCache
    rationale: Clean separation of concerns, efficient queries, supports both chat persistence and pre-loaded insights
metrics:
  duration: 5.4 minutes
  files-created: 8
  files-modified: 3
  models-added: 3
  services-created: 6
completed: 2026-02-02
---

# Phase 07 Plan 01: Financial Planning Foundation Summary

**One-liner:** Extended schema with chat/insight models and built 6 core services (summarizer, Claude client, insight generator, goal parser, rate limiter, prompt templates) for AI-powered financial planning

## What Was Built

This plan established the complete foundation layer for AI-powered financial planning. Extended the database schema with three new models for chat persistence and insight caching, then built all backend services needed to interact with Claude API and process financial data.

### Database Schema Extensions

Added three new models to both API and frontend Prisma schemas:

**ChatSession model:**
- Stores conversation sessions per user
- Auto-generated or user-set titles
- Indexed by userId and updatedAt for efficient retrieval

**ChatMessage model:**
- Individual messages in a session with role (user/assistant)
- Text content with optional metadata (tokens, model info)
- Cascade deletes with session
- Indexed by sessionId and createdAt for conversation ordering

**InsightCache model:**
- Pre-generated AI insights (spending anomalies, savings opportunities, investment observations)
- Priority ranking (1 = highest impact)
- Data snapshot preserves financial summary used for generation
- Invalidation timestamp for refresh after statement imports
- Unique constraint on [userId, insightType, generatedAt]

All models include proper relations to User model and performance-optimized indexes.

### Financial Planning Services

Created 6 service modules in `spendwise-api/src/services/financialPlanning/`:

**1. financial-summarizer.ts**
- `buildFinancialSummary()`: Compresses 6 months of user data into 1-2K token summary
- Parallel Prisma queries for optimal performance
- Includes: income/expense by category, top merchants, account balances, recurring costs, net worth trends, investment holdings, savings goals, behavioral patterns
- Calculates spending variability (stable/moderate/high) and top spending day

**2. claude-client.ts**
- `streamChatResponse()`: Token-by-token streaming for conversational feel
- `generateInsightsFromSummary()`: Batch generation of 3-5 pre-loaded insights
- `parseGoalFromText()`: Extract goal details from freeform text with confidence scoring
- Uses Claude 3.5 Sonnet model for all interactions

**3. prompt-templates.ts**
- `FINANCIAL_ADVISOR_SYSTEM_PROMPT`: Main chat system prompt with financial summary injection, cross-page link guidance, and mandatory disclaimer
- `INSIGHT_GENERATOR_SYSTEM_PROMPT`: Pre-loaded insight generation with priority ranking
- `GOAL_PARSER_SYSTEM_PROMPT`: Goal extraction from natural language input

**4. insight-generator.ts**
- `generateAndCacheInsights()`: Builds summary, generates insights via Claude, invalidates old cache, creates new entries
- `getActiveInsights()`: Retrieves non-invalidated insights sorted by priority
- Checks for minimum 10 transactions in last 60 days before generation

**5. goal-parser.ts**
- `parseAndCreateGoal()`: Parses freeform text and creates SavingsGoal if confidence > 0.5
- Handles optional conversation context for better extraction

**6. rate-limiter.ts**
- `checkRateLimit()`: Returns allowed/remaining/resetAt for user
- `incrementUsage()`: Increments daily message count in Redis
- 25 messages per day limit with automatic midnight UTC reset

### Anthropic Client Singleton

Created `src/lib/anthropic.ts` - shared Anthropic SDK instance configured with API key from environment variable.

## Key Implementation Details

**Token Optimization:**
- Financial summary aggregates 6 months of data into structured format
- Only essential metrics included (totals, top N items, trends)
- Avoids sending individual transaction details

**Streaming Chat:**
- AsyncGenerator pattern for token-by-token delivery
- Yields chunk events: content_block_start, content_block_delta, content_block_stop, message_stop
- Frontend can display text as it arrives (like iMessage)

**Insight Caching:**
- Insights generated once after statement import
- Stored with data snapshot to understand context
- Invalidated (not deleted) to preserve history
- Priority-sorted for "top 3-5" display

**Rate Limiting:**
- Redis INCR + EXPIRE pattern for atomic operations
- Key format: `rate_limit:chat:${userId}`
- TTL calculated dynamically to next midnight UTC
- 25 message daily limit balances cost control with usability

**Goal Parsing:**
- Claude extracts: name, targetAmount, deadline, confidence
- Only creates SavingsGoal if confidence >= 0.5
- Returns null for ambiguous input (resolver can ask for clarification)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Fixed missing ioredis-mock type declaration**
- **Found during:** Task 2 TypeScript compilation
- **Issue:** Pre-existing test file `twoFactor.test.ts` imported `ioredis-mock` without type declarations, blocking build
- **Fix:** Created `src/types/ioredis-mock.d.ts` to declare module
- **Files modified:** Added new type declaration file
- **Commit:** Included in Task 2 commit (cd03697)

**Rationale:** Could not verify Task 2 compilation success without fixing this blocking TypeScript error. This is a common pattern for packages lacking official type definitions.

## Testing Notes

All services were verified via TypeScript compilation. Full integration testing will occur in subsequent plans (07-02 GraphQL resolvers, 07-03 frontend).

**Manual verification checklist:**
- [x] Prisma schemas in sync (API and frontend)
- [x] Database tables created (ChatSession, ChatMessage, InsightCache)
- [x] Prisma client regenerated with new types
- [x] TypeScript compiles cleanly (`npm run build`)
- [x] All 6 service files exist and export expected functions
- [x] @anthropic-ai/sdk in package.json dependencies

## Next Phase Readiness

**Ready for 07-02 (GraphQL API):**
- All services ready to be called from resolvers
- Schema models available for Prisma queries
- Rate limiter can be called before processing messages
- Insight generator can be triggered after statement imports

**Environment requirements:**
- `ANTHROPIC_API_KEY` must be set in .env for Claude API access
- Redis must be running for rate limiting (already required for existing features)

**Blockers:** None

**Concerns:** None - all foundation pieces in place

## Commit History

| Commit | Message | Files Changed |
|--------|---------|---------------|
| aaba558 | feat(07-01): extend Prisma schema with chat and insights models | 2 |
| cd03697 | feat(07-01): create Anthropic client and financial planning services | 10 |

**Total changes:**
- 12 files modified/created
- 927 lines added
- 3 database models added
- 6 service modules created
- 1 pre-existing bug fixed

---

**Phase 07 Plan 01 complete.** Foundation layer fully implemented and ready for GraphQL API integration.
