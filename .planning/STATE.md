# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-01)

**Core value:** Users see their complete financial picture in one place — every account, every transaction imported from statements and automatically categorized — with AI-powered advice on how to save more and invest smarter based on their personal goals.

**Current focus:** Phase 7 in progress — Financial Planning foundation complete

## Current Position

Phase: 7 of 8 (Financial Planning)
Plan: 3 of 4 plans complete
Status: In progress — Frontend data layer complete (hooks + SSE client)
Last activity: 2026-02-02 — Completed 07-03-PLAN.md

Progress: [████████▓░] 84% (Phase 1-6 complete + 3/4 Phase 7)

## Performance Metrics

**Velocity:**
- Total plans completed: 29 (2 Phase 1 + 3 Plaid before pause + 3 Phase 2 + 3 Phase 3 + 5 Phase 4 + 4 Phase 5 + 2 gap closure + 4 Phase 6 + 3 Phase 7)
- Average duration: 3min 53s
- Total execution time: 1.88 hours

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 01-database-schema-encryption | 2 | 8min | 4min |
| 02-ai-categorization-enhancement | 3 | 18min 8s | 6min 2s |
| 03-spending-analysis | 3 | 11min 16s | 3min 45s |
| 04-recurring-transactions | 5 | 28min 10s | 5min 38s |
| 05-net-worth-tracking | 4 | 15min 3s | 3min 46s |
| 05-net-worth-tracking (gap) | 2 | 3min 25s | 1min 43s |
| 06-investment-portfolio | 4 | 14min 55s | 3min 44s |
| 07-financial-planning | 3 | 11min 1s | 3min 40s |
| Plaid-integration-foundation (paused) | 3 | 12min | 4min |

**Recent Trend:**
- Last 5 plans: 07-03 (2min 24s), 07-02 (3min 14s), 07-01 (5min 23s), 06-04 (4min), 06-03 (3min 43s)
- Trend: Phase 7 frontend data layer completed efficiently - 9 hooks + SSE client in under 2.5 minutes

*Updated after each plan completion*

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- **Fetch API for SSE with auth headers** (07-03) — Use fetch with ReadableStream instead of EventSource for SSE, EventSource doesn't support Authorization header
- **Network-only rate limit fetch policy** (07-03) — Rate limit queries always fetch fresh, cache would be stale immediately
- **No refetch on send message** (07-03) — sendChatMessage mutation doesn't refetch, SSE stream handles response delivery
- **AbortController for stream cancellation** (07-03) — Standard pattern for cancellable fetch requests, clean cleanup
- **SSE streaming pattern** (07-02) — Server-Sent Events for token-by-token streaming, simpler than WebSockets for one-way streaming
- **Disclaimer append before save** (07-02) — Add disclaimer to assistant message before database persistence, ensures always present in chat history
- **20-message history limit** (07-02) — Load last 20 messages for conversation context, balances quality with token usage
- **Insight invalidation on import** (07-02) — Invalidate insights after statement import (not delete), preserves history while enabling regeneration
- **Prisma type assertion** (07-02) — Use 'as any' for extended Prisma client in service calls, standard pattern for type compatibility
- **Anthropic Claude API for financial planning** (07-01) — Separate from OpenAI categorization, better conversational tone for advisory role
- **25 message daily limit** (07-01) — Controls LLM API costs while providing sufficient quota for meaningful conversations
- **6-month summary window** (07-01) — Captures seasonal patterns without excessive token usage
- **Insight cache invalidation on statement import** (07-01) — Ensures insights always reflect latest data without constant regeneration
- **Three separate models (ChatSession, ChatMessage, InsightCache)** (07-01) — Clean separation of concerns, efficient queries, supports both chat persistence and pre-loaded insights
- **No sparkline for portfolio card** (06-04) — Portfolio lacks time-series history in Phase 6, shows static metrics appropriate for long-term investment tracking
- **Show total return instead of monthly change** (06-04) — Portfolio displays "total return" reflecting long-term nature of investments
- **Display holding count and account count** (06-04) — Provides portfolio diversification context at a glance on dashboard
- **Stock chart icon for portfolio card** (06-04) — Different icon than NetWorthSummaryCard's trend line for visual distinction
- **Em dash for null cost basis in holdings table** (06-03) — Show "—" instead of $0 or N/A for holdings without cost basis, visually cleaner and semantically correct
- **Default holdings table sort by value descending** (06-03) — institutionValue DESC shows largest holdings first without user action
- **Stock chart icon for Investments sidebar** (06-03) — Differentiated from Net Worth icon for visual clarity
- **Grid layout ratio for portfolio page** (06-03) — Asset allocation chart 1/3 width, holdings table 2/3 on desktop
- **Return 0 for unrealized gains when costBasis is null** (06-01) — Graceful degradation for manual holdings without cost basis, still shows current value
- **Normalize security types to standard categories** (06-01) — Handles variation in user-entered types (stock vs equity, ETF vs etf) for accurate asset allocation grouping
- **15-minute cache TTL for portfolio queries** (06-01) — Balances data freshness with reduced database load for manual portfolios
- **Security upsert using plaidSecurityId** (06-01) — Prevents duplicate securities, uses ticker symbol or falls back to security name as unique identifier
- **Backfill banner shows when < 3 data points** (05-06) — Changed from !hasHistory to < 3 points threshold, users with limited history see generation prompt
- **Persistent subtle backfill link** (05-06) — Always visible below chart when hasAccounts, provides ongoing access after banner disappears
- **Area chart with gradient for sparklines** (05-06) — Dashboard sparkline uses AreaChart with gradient fill for better visual recognition vs line charts
- **Single data point duplication** (05-06) — Duplicate single points to create visible horizontal line in charts instead of invisible dot
- **Conditional dot rendering** (05-06) — Show dots when <= 3 points for visibility, hide for normal-density data
- **Self-contained dashboard widgets with error handling** (05-04) — Dashboard components fetch their own data and handle errors gracefully without breaking parent layout
- **ONE_MONTH time range for dashboard sparkline** (05-04) — Dashboard net worth widget uses 1-month data for meaningful recent trend
- **Entire card clickable for navigation** (05-04) — Dashboard widgets wrapped in Link for intuitive navigation to detail pages
- **Adaptive granularity for chart data** (05-03) — 1M/3M show daily, 6M weekly, 1Y/All monthly to prevent chart overcrowding
- **All accounts visible regardless of balance** (05-03) — Empty accounts shown in breakdown, users can track zero-balance accounts
- **Desktop 3-column grid layout** (05-03) — Chart spans 2/3 width, breakdown 1/3, mobile stacks vertically
- **Backfill button conditional visibility** (05-03) — Shown only when accounts exist but history is empty
- **Non-blocking snapshot trigger** (05-02) — Snapshot queue trigger wrapped in try/catch, import success is primary operation
- **Monthly backfill with 2-year limit** (05-02) — backfillNetWorthSnapshots generates monthly snapshots, limited to 24 months
- **Credit accounts as liabilities** (05-02) — CREDIT account type always subtracted from net worth regardless of balance sign
- **Filter-aware cache keys for net worth** (05-02) — Cache keys include timeRange and accountIds to prevent collisions
- **Separate Redis connection for BullMQ** (05-01) — Create dedicated Redis client with maxRetriesPerRequest: null for BullMQ, separate from resolver caching client
- **Date precision for snapshots** (05-01) — Use @db.Date instead of @db.Timestamp for snapshot date field, daily precision sufficient
- **Dual snapshot job types** (05-01) — Support both daily-snapshot (scheduled) and on-demand-snapshot (import-triggered) for flexibility
- **Skip duplicates over upsert** (05-01) — Use createMany with skipDuplicates for efficient idempotent snapshot capture
- **Document-based refetchQueries over string-based** (04-05) — Use query document objects instead of operation name strings to ensure all active query instances with different variables are refetched
- **Pre-filled readonly modal for mark-as-recurring** (04-04) — Transaction data shown as read-only summary, only frequency selection required from user
- **Reuse existing addRecurring hook** (04-04) — No new API mutations needed, wired existing useAddRecurring to transactions page
- **Sortable table with single-row expansion** (04-03) — Click column headers to sort, click row to expand (one at a time for clean UI)
- **Dismissed section collapsed by default** (04-03) — Keeps main view clean, dismissed items accessible but not prominent
- **Frequency dropdown + type tabs for filters** (04-03) — 5 frequency options in dropdown, 3 type options as tabs for optimal UX
- **Possibly cancelled items dimmed not hidden** (04-03) — Visual distinction without removing from view, users can assess and dismiss
- **Non-blocking detection in import flow** (04-02) — Detection errors logged but don't fail import, ensures user always gets transactions
- **Full history detection on each import** (04-02) — Re-scans all transactions on every import to keep patterns current as history grows
- **Monthly normalization for recurring summary** (04-02) — All frequencies normalized to monthly equivalent for accurate budget comparison
- **10% amount tolerance for recurring pattern grouping** (04-01) — Allows subscriptions with slight price changes to group as same pattern
- **20% interval variance allowed for pattern consistency** (04-01) — Handles natural billing date variance (28-31 days monthly)
- **Minimum 3 transactions required for recurring pattern** (04-01) — Prevents false positives from coincidental timing
- **Habitual spending threshold >10/month + >20% variance** (04-01) — Excludes coffee shops, gas stations from recurring detection
- **POSSIBLY_CANCELLED after 2x expected interval** (04-01) — Flags stale subscriptions instead of predicting indefinitely
- **QUARTERLY frequency instead of SEMI_MONTHLY** (04-01) — Research showed quarterly bills more common than semi-monthly
- **Compound unique [userId, merchantName, frequency]** (04-01) — Enables upsert pattern for recurring detection updates
- **Section-level loading states** (03-03) — Each section shows independent loading instead of full-page loader for better UX
- **Comparison color coding logic** (03-03) — Expenses UP = red (bad), income UP = green (good), with directional arrows
- **Empty state actionable guidance** (03-03) — Prompts user to expand filters when no data found
- **Suspense boundary for useSearchParams** (03-03) — Required for Next.js useSearchParams compatibility
- **react-day-picker for date selection** (03-02) — Lightweight, accessible, React-native, Tailwind-compatible
- **URL param sync for filter state** (03-02) — Enables shareable analytics views, preserves state on refresh
- **Options object pattern for hooks** (03-02) — Changed from positional to options for extensibility and backward compatibility
- **Empty accountIds = all accounts** (03-02) — Simplifies API, empty array means no account filtering
- **6-month trend window for time series data** (03-01) — Provides meaningful historical context without overwhelming the chart
- **Default to current month if dateRange not provided to topMerchants** (03-01) — Matches analytics query behavior for consistency
- **Filter-aware cache keys include all parameters** (03-01) — Prevents cache collisions between different filter combinations
- **Composite index [userId, date, type] optimizes analytics queries** (03-01) — Supports common query pattern, prevents sequential scans
- **70% confidence threshold for "needs review"** (02-03) — Matches existing amber dot indicator in TransactionItem for visual consistency
- **Exclude manual and rule sources from review query** (02-03) — User has already confirmed these categorizations
- **Refetch review list after transaction edit** (02-03) — Ensures corrected transactions disappear immediately from review tab
- **Show confidence percentage and source in review tab** (02-03) — Helps users understand why transaction was flagged
- **Top 50 merchant-category pattern limit** (02-02) — Balances personalization with prompt token limits (~500 tokens)
- **Filter user history by categorySource 'manual' and 'rule'** (02-02) — Only deliberate user choices inform AI
- **Preserve manual categorizations in retroactive updates** (02-02) — categorySource: 'manual' is sacred, never overwritten
- **OpenAI Structured Outputs over JSON mode** (02-01) — Guarantees schema compliance, eliminates parse errors
- **Shared VALID_CATEGORIES constant** (02-01) — Single source of truth, eliminates duplication bugs
- **AI refusal graceful degradation** (02-01) — Falls back to keyword categorizer on policy refusals
- **Statement uploads as primary data source** — Already functional, no third-party cost, works for all accounts
- **Paused Plaid integration** — Code built (backend SDK, webhooks, frontend Link) but adds cost/complexity without proportional user value at this stage. Code preserved for future activation.
- LLM API for categorization — Faster to ship than custom ML, can learn from user corrections
- Keep manual accounts — Users may have accounts not supported by statement imports
- Investment portfolio via statements/manual — Avoids Plaid dependency
- All four account types in v1 — Complete financial picture from day one
- Used prisma db push instead of migrate dev — Non-interactive environment, acceptable for development
- All Plaid fields optional — Preserves backward compatibility with manual accounts
- prisma-field-encryption for transparent encryption — Encrypts at ORM level rather than manual encrypt/decrypt
- k1.aesgcm256 key format — Required by @47ng/cloak library used by prisma-field-encryption
- Extended client type pattern — Changed Context.prisma type to typeof prisma for type safety

### Pending Todos

None yet.

### Blockers/Concerns

None yet.

## Session Continuity

Last session: 2026-02-02
Stopped at: Completed 07-03-PLAN.md — Frontend data layer complete (hooks + SSE client) ready for UI
Resume file: None
