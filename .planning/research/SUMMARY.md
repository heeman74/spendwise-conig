# Research Summary

**Domain:** Personal finance app with Plaid bank connectivity, AI categorization, financial planning
**Researched:** 2026-01-30

## Key Findings

### Stack
- **Plaid** (plaid-node + react-plaid-link) for bank/credit/investment/savings connectivity
- **OpenAI API** (existing) for AI categorization and financial advice; use Batch API for cost savings
- **BullMQ** for background job processing (daily sync, batch categorization) — leverages existing Redis
- **No new infrastructure** — everything integrates with existing PostgreSQL + Redis + Express + Apollo stack
- Only 3 new npm packages needed: `plaid-node`, `react-plaid-link`, `bullmq`

### Features
- **Table stakes:** Account linking, automatic transaction import, categorization, spending breakdown, net worth tracking, recurring transaction detection
- **Differentiators:** AI-powered categorization that learns from user corrections, goal-based financial advice with specific savings recommendations, investment portfolio view with rebalancing suggestions
- **Anti-features:** Direct trading, bill pay automation, credit score monitoring, crypto, tax prep, multi-currency

### Architecture
- **Web-Queue-Worker pattern:** API handles requests, Redis+BullMQ manages job queues, workers process syncs/AI
- **Plaid data flow:** Link token → public token → access token (encrypted) → daily sync via cursor-based API
- **AI pipeline:** Plaid categories as first pass → LLM refinement for uncertain cases → user corrections stored → batch processing for cost efficiency
- **Build order:** Schema → Plaid connection → Account sync → Transaction sync → AI categorization → Spending analysis → Investments → Financial planning → Dashboard

### Critical Pitfalls
1. **Plaid access token security** — Must encrypt at rest with AES-256-GCM, never expose to frontend
2. **Transaction duplication** — Use cursor-based sync API, handle pending→posted transitions
3. **AI cost explosion** — Batch categorization (50/call), use Plaid categories first, cache merchant mappings
4. **Plaid item degradation** — Monitor status, build re-authentication flow
5. **Financial advice liability** — Add disclaimers, use suggestive language, never recommend specific securities

## Recommendations for Roadmap

**Phase structure should follow build order:**
1. Database schema extensions (PlaidItem, InvestmentHolding, Security, etc.)
2. Plaid foundation (client setup, Link flow, token exchange, encryption)
3. Account & transaction sync (background workers, daily cron, deduplication)
4. AI categorization pipeline (batch processing, confidence scoring, user corrections)
5. Spending analysis & insights (category breakdowns, trends, comparisons)
6. Investment portfolio (holdings, allocation, performance tracking)
7. Financial planning engine (goal-based advice, rebalancing suggestions)
8. Dashboard unification (net worth, spending, goals, AI advice — all in one view)
9. Polish & hardening (error handling, re-auth flows, sync monitoring)

**Cross-cutting concerns for every phase:**
- Plaid access token encryption
- Financial data never in logs
- Error handling for Plaid API failures
- Rate limiting awareness
