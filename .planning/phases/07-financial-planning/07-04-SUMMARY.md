---
phase: 07-financial-planning
plan: 04
subsystem: ui
tags: [react, tailwind, recharts, react-markdown, sse, streaming-ui, chat]
requires:
  - "07-03"
provides:
  - planning-page
  - chat-interface
  - insight-cards
  - streaming-message-ui
  - sidebar-planning-nav
affects: ["08-unified-dashboard"]
tech-stack:
  added: [react-markdown]
  patterns: [streaming-chat-ui, optimistic-message-updates, auto-scroll, thinking-dots-animation]
key-files:
  created:
    - spendwise/src/components/planning/InsightCard.tsx
    - spendwise/src/components/planning/ChatMessage.tsx
    - spendwise/src/components/planning/StreamingMessage.tsx
    - spendwise/src/components/planning/ChatInput.tsx
    - spendwise/src/components/planning/ChatInterface.tsx
    - spendwise/src/components/planning/InlineChart.tsx
    - spendwise/src/components/planning/GoalSuggestion.tsx
    - spendwise/src/app/(dashboard)/planning/page.tsx
  modified:
    - spendwise/src/components/layout/Sidebar.tsx
    - spendwise-api/src/schema/resolvers/chat.ts
    - spendwise-api/src/lib/ai/claude-client.ts
    - spendwise-api/src/routes/chat-stream.ts
    - spendwise-api/src/lib/ai/insight-generator.ts
    - spendwise-api/src/schema/typeDefs/chat.ts
decisions:
  - id: react-markdown-for-chat
    choice: Use react-markdown for rendering assistant messages
    rationale: Supports markdown links, code blocks, and formatting in AI responses
  - id: optimistic-message-updates
    choice: Optimistically add user messages to local state before API confirmation
    rationale: Instant feedback for chat UX, refetch syncs after stream completes
  - id: thinking-dots-to-streaming
    choice: Show thinking dots animation that transitions to streaming text
    rationale: iMessage-style pattern for natural conversation feel
  - id: auto-generate-insights-on-first-load
    choice: Auto-generate insights when page loads and none exist
    rationale: First-time users get immediate value without manual action
  - id: string-metadata-over-json-scalar
    choice: Replace JSON scalar with String for chat message metadata
    rationale: Avoids custom scalar complexity, metadata serialized as JSON string
metrics:
  duration: Previous session
  files-created: 8
  files-modified: 6
  commits: 9
completed: 2026-02-02
---

# Phase 07 Plan 04: Financial Planning UI Summary

**Complete planning page with AI chat interface, streaming responses, pre-generated insight cards, and sidebar navigation using react-markdown and SSE streaming**

## Performance

- **Tasks:** 3 (Task 1: components + page, Task 2: checkpoint verified, Task 3: sidebar nav)
- **Files created:** 8
- **Files modified:** 6
- **Commits:** 9 (1 feat + 8 fixes)

## Accomplishments

- Built 7 planning UI components: InsightCard, ChatMessage, StreamingMessage, ChatInput, ChatInterface, InlineChart, GoalSuggestion
- Created /planning page with insights grid + full chat interface
- Added Planning sidebar navigation with lightbulb icon
- Implemented thinking dots animation transitioning to streaming text
- Integrated react-markdown for rich AI response rendering with internal app links
- Auto-generate insights on first page load for first-time user experience

## Task Commits

1. **Task 1: Create chat components and planning page** — `b90a6ed` (feat)
2. **Task 3: Add sidebar navigation** — `d4d78f6` (fix — combined with auto-generate insights)

### Follow-up Bug Fixes

3. `19cec8e` — Replace unknown JSON scalar with String for metadata field
4. `d4d78f6` — Auto-generate insights on first load and add Planning sidebar nav
5. `84122cb` — Update deprecated Claude model to claude-sonnet-4-20250514
6. `4538575` — Remove duplicate user message save from SSE endpoint
7. `b019dd1` — Strip markdown code blocks from Claude JSON responses
8. `4c99d3b` — Offset generatedAt timestamps to avoid unique constraint collision
9. `492a29d` — Use actual transaction date range for insights instead of fixed 60-day window
10. `e10b99c` — Register ChatMessage resolver for metadata serialization

## Files Created/Modified

**Created:**
- `spendwise/src/components/planning/InsightCard.tsx` (127 lines) — Type-specific icons, priority badges, expandable content, ask-about action
- `spendwise/src/components/planning/ChatMessage.tsx` (136 lines) — Markdown rendering, internal links, disclaimer styling, streaming cursor
- `spendwise/src/components/planning/StreamingMessage.tsx` (49 lines) — Thinking dots animation to streaming text transition
- `spendwise/src/components/planning/ChatInput.tsx` (120 lines) — Auto-resize textarea, rate limit display, enter-to-send
- `spendwise/src/components/planning/ChatInterface.tsx` (198 lines) — Session management, streaming orchestration, auto-scroll
- `spendwise/src/components/planning/InlineChart.tsx` (70 lines) — Trend and breakdown charts with recharts
- `spendwise/src/components/planning/GoalSuggestion.tsx` (128 lines) — Goal confirmation card with create/dismiss
- `spendwise/src/app/(dashboard)/planning/page.tsx` (99 lines) — Planning page with insights grid + chat interface

**Modified:**
- `spendwise/src/components/layout/Sidebar.tsx` — Added Planning nav entry with lightbulb icon
- `spendwise-api/src/schema/resolvers/chat.ts` — Registered ChatMessage resolver for metadata
- `spendwise-api/src/lib/ai/claude-client.ts` — Updated to non-deprecated Claude model
- `spendwise-api/src/routes/chat-stream.ts` — Fixed duplicate user message save
- `spendwise-api/src/lib/ai/insight-generator.ts` — Fixed date range, timestamp offsets, markdown stripping
- `spendwise-api/src/schema/typeDefs/chat.ts` — String metadata instead of JSON scalar

## Decisions Made

- **react-markdown for chat rendering** — Supports markdown links, code blocks, formatting in AI responses
- **Optimistic message updates** — User messages appear instantly, refetch syncs after stream
- **Thinking dots to streaming transition** — iMessage-style pattern for natural conversation feel
- **Auto-generate insights on first load** — First-time users get immediate value
- **String metadata over JSON scalar** — Avoids custom scalar complexity
- **Actual transaction date range for insights** — Uses real data boundaries instead of hardcoded 60-day window
- **Offset generatedAt timestamps** — Prevents unique constraint collisions when generating multiple insights

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] JSON scalar type not registered**
- **Found during:** Testing chat message display
- **Issue:** GraphQL schema used unknown JSON scalar for metadata field
- **Fix:** Replaced with String type, serialize metadata as JSON string
- **Committed in:** 19cec8e

**2. [Rule 1 - Bug] Duplicate user message save**
- **Found during:** Testing chat stream endpoint
- **Issue:** SSE endpoint saved user message again after mutation already saved it
- **Fix:** Removed duplicate save from SSE endpoint
- **Committed in:** 4538575

**3. [Rule 1 - Bug] Markdown code blocks in Claude JSON responses**
- **Found during:** Testing insight generation
- **Issue:** Claude sometimes wraps JSON in markdown code blocks, breaking parse
- **Fix:** Strip markdown code block wrappers before JSON.parse
- **Committed in:** b019dd1

**4. [Rule 1 - Bug] Unique constraint collision on generatedAt**
- **Found during:** Testing bulk insight generation
- **Issue:** Multiple insights generated at same timestamp cause unique constraint violation
- **Fix:** Offset generatedAt by index * 1ms for each insight
- **Committed in:** 4c99d3b

**5. [Rule 1 - Bug] Fixed 60-day insight window**
- **Found during:** Testing with varied transaction data
- **Issue:** Insights used hardcoded 60-day window instead of actual data range
- **Fix:** Query actual transaction date boundaries and use those
- **Committed in:** 492a29d

**6. [Rule 1 - Bug] ChatMessage resolver not registered**
- **Found during:** Testing metadata display in chat
- **Issue:** ChatMessage type resolver for metadata serialization wasn't registered
- **Fix:** Added ChatMessage resolver registration
- **Committed in:** e10b99c

**7. [Rule 3 - Blocking] Deprecated Claude model**
- **Found during:** Testing chat responses
- **Issue:** Model ID no longer valid
- **Fix:** Updated to claude-sonnet-4-20250514
- **Committed in:** 84122cb

---

**Total deviations:** 7 auto-fixed (6 bugs, 1 blocking)
**Impact on plan:** All fixes necessary for correct operation. No scope creep.

## Issues Encountered

None beyond the auto-fixed deviations above.

## User Setup Required

None - no external service configuration required (ANTHROPIC_API_KEY already configured from 07-01).

## Next Phase Readiness

**Phase 7 complete.** All 4 plans executed:
- 07-01: Schema + backend services
- 07-02: GraphQL API + SSE endpoint
- 07-03: Frontend data layer (hooks + SSE client)
- 07-04: Frontend UI (page + components + sidebar)

**Ready for Phase 8 (Unified Dashboard):**
- Planning page fully functional at /planning
- All financial planning hooks available via barrel exports
- Insight cards can be reused/adapted for dashboard widgets
- Chat interface pattern established for potential dashboard integration

**Blockers:** None
**Concerns:** None

---
*Phase: 07-financial-planning*
*Completed: 2026-02-02*
