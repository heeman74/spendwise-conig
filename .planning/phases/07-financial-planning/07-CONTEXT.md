# Phase 7: Financial Planning - Context

**Gathered:** 2026-02-02
**Status:** Ready for planning

<domain>
## Phase Boundary

AI-powered personalized financial insights and recommendations. Users receive spending analysis, savings guidance, and investment observations through a conversational chat interface with pre-generated insights. Leverages data from all prior phases (spending, recurring, net worth, portfolio). Enhances existing SavingsGoal system with AI-powered tracking. Does NOT include dashboard integration (Phase 8).

</domain>

<decisions>
## Implementation Decisions

### Insight types & depth
- Full analysis format: each insight is a mini-report covering what happened, why it matters, and what to do about it
- Three insight categories: spending anomalies, savings opportunities, and investment observations
- Directional guidance for investment rebalancing (not specific buy/sell actions)
- Both positive reinforcement and warnings for behavioral nudges
- Self-comparison plus general financial norms for benchmarks ("20% more than your average" + "advisors recommend <30% on housing")
- Wait for 2-3 months of data before generating insights — avoid misleading analysis from insufficient history
- Insights ranked by impact — biggest savings opportunity or anomaly gets top billing
- Include recurring transaction insights — leverage Phase 4 data for subscription cancellation suggestions and cost increase alerts

### Presentation & tone
- Chat/conversational interface as primary interaction model
- Pre-generated top insights displayed when page loads, plus chat input for follow-ups
- Friendly advisor tone: warm but knowledgeable, not overly formal or overly casual
- Deep drill-down support: user can ask about specific transactions, accounts, merchants, time periods
- Chat history persisted across sessions — AI references previous conversations
- Per-message disclaimer: each AI response includes subtle "Not professional financial advice" line
- Inline charts in chat responses — small visualizations embedded when discussing trends or breakdowns
- Streaming token display — text appears word-by-word for responsive feel
- Thinking dots animation (like iMessage) while AI processes, transitioning to streaming text
- Cross-links to other pages — AI can link to analytics, net worth, portfolio, recurring pages in responses

### Goal-setting flow
- Freeform text input with AI parsing: user types "I want to save $5K for a vacation by June" and AI extracts goal details
- Both chat and form paths: quick goals via chat, detailed goals via existing form — both create the same underlying SavingsGoal
- Enhance existing SavingsGoal system rather than replacing it — add AI recommendations on top
- Active progress tracking with progress bars and AI updates ("You're 60% there!")
- All goals (chat-created or form-created) appear on savings goals page and in chat context — unified view
- AI proactively suggests goals in pre-generated insights based on financial data analysis
- 3-5 active goal limit to encourage focus — AI helps prioritize
- Celebrate + archive on completion: AI congratulates, goal moves to "Completed" section, AI suggests next goal

### Trigger & freshness
- Pre-generated insights refresh after each statement import — always reflects latest data
- 3-5 top insights curated for page load — most impactful, digestible
- Full conversation context carried forward — AI remembers and builds on previous discussions
- Daily rate limit (~20-30 messages) to control LLM API costs — shows remaining count
- Pre-loaded financial summary approach: build summary of totals, trends, top merchants and pass to AI — controls token usage
- Last 6 months of historical data in financial summary — captures seasonal patterns
- Insights cached in DB, invalidated when new statement imported
- Planning page only — dashboard integration deferred to Phase 8

### LLM provider
- Anthropic Claude API for financial planning chat (separate from OpenAI used for categorization)

### Claude's Discretion
- Exact chat UI component library/design
- How to structure the financial summary for optimal token usage
- Specific streaming implementation approach
- Chart types for inline visualizations
- Message rate limit exact number within 20-30 range
- Minimum data threshold per insight type (within 2-3 month guideline)
- How to handle edge cases in freeform goal parsing

</decisions>

<specifics>
## Specific Ideas

- Chat should feel like talking to a knowledgeable financial friend, not a robo-advisor
- Pre-generated insights act as conversation starters — user can click/respond to dive deeper
- Streaming with thinking dots gives the feel of a real conversation partner
- Cross-page links let the AI be a navigator for the whole app ("See your full spending breakdown →")
- Recurring transaction insights bridge Phase 4 data into actionable advice ("You could save $45/mo by cancelling unused subscriptions")

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 07-financial-planning*
*Context gathered: 2026-02-02*
