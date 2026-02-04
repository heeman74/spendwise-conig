# SpendWise

## What This Is

SpendWise is a personal finance application where users import bank and credit card statements to automatically pull in transactions, categorize spending and income using AI, and get a full financial planning experience — spending insights, goal-based advice, and investment allocation suggestions — all on a unified dashboard. Plaid integration code exists for future real-time account connectivity but is currently paused; statement uploads are the primary data source.

## Core Value

Users see their complete financial picture in one place — every account, every transaction imported from statements and automatically categorized — with AI-powered advice on how to save more and invest smarter based on their personal goals.

## Requirements

### Validated

- User authentication with email/password and JWT — existing
- Manual account creation (checking, savings, credit, investment) — existing
- Manual transaction entry with categories — existing
- Statement import with automatic transaction parsing — existing
- Savings goals with progress tracking — existing
- Dashboard with spending analytics and charts — existing
- Basic AI-powered financial advice via OpenAI — existing
- Two-factor authentication (email + SMS) — existing
- Redis caching for API query performance — existing

### Active

- [ ] AI-powered transaction categorization using LLM (learns user preferences)
- [ ] Spending analysis with trends, breakdowns, and areas to cut back
- [ ] Recurring transaction detection from imported statement data
- [ ] Net worth tracking aggregated from statement-imported account balances
- [ ] Goal-based financial advice ("to hit your goal, reduce dining by $200/mo")
- [ ] Investment portfolio view with holdings, gains/losses, and allocation breakdown (via statement imports or manual entry)
- [ ] Investment rebalancing suggestions based on user goals
- [ ] Unified dashboard showing net worth, spending breakdown, goals progress, and AI advice

### Paused

- [ ] Plaid integration for connecting real bank accounts (code built, not wired into UI)
- [ ] Plaid integration for credit card accounts
- [ ] Plaid integration for investment accounts (holdings, performance, allocation)
- [ ] Plaid integration for savings accounts
- [ ] Daily automatic transaction sync from connected accounts via Plaid
- [ ] Coexistence of Plaid-linked accounts and manual accounts side by side

### Out of Scope

- Real-time webhook transaction sync — daily sync is sufficient for v1, simpler and cheaper
- Direct trading or money movement — SpendWise is read-only for financial accounts
- Custom ML model training — using LLM APIs (OpenAI/Claude) for categorization and advice
- Mobile app — web-first, mobile later
- Multi-currency support — US accounts only for v1
- Bill pay or transfers — analysis and advice only, no financial actions

## Context

SpendWise is an existing brownfield project with a working Next.js 14 frontend (App Router) and Express + Apollo Server GraphQL API. Both services share a PostgreSQL database via Prisma ORM with Redis caching. The app currently supports manual account and transaction management, statement imports with automatic parsing, basic analytics, and AI advice.

The current milestone enhances SpendWise's AI categorization for imported transactions, adds spending analysis and recurring transaction detection, builds net worth tracking and investment portfolio features, and delivers AI-powered financial planning — all working from statement-imported data. Plaid integration code is preserved for future activation when real-time account connectivity becomes a priority.

**Technical environment:**
- Frontend: Next.js 14, React 18, Apollo Client, Redux Toolkit, Tailwind CSS
- Backend: Express, Apollo Server 4, Prisma 5, Redis 7
- Database: PostgreSQL 16
- Existing AI: OpenAI API (advice feature)
- Auth: NextAuth.js (frontend) + JWT (API)

**Key data flow:** Users upload bank/credit card statements -> transactions are parsed and imported -> AI categorizes transactions -> data feeds into spending analysis, recurring detection, net worth, and financial planning features.

## Constraints

- **Data sensitivity**: Financial data requires encryption at rest and secure token storage
- **API rate limits**: LLM APIs have rate limits — batched categorization needed
- **Existing architecture**: Must integrate with current GraphQL + Prisma + Redis stack without rewriting existing features
- **Statement format coverage**: Statement parser must handle common formats (CSV, OFX, QFX); PDF parsing is stretch goal
- **Plaid code preserved**: Plaid integration code remains in codebase — changes must not break it

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Statement uploads as primary data source | Already functional, no third-party cost, works for all accounts | Active |
| Pause Plaid integration | Code built but adds cost/complexity without proportional value at this stage | Paused — code preserved |
| LLM API for categorization | Faster to ship than custom ML, can learn from user corrections via prompt context | Active |
| Keep manual accounts | Users may have accounts not supported by statement imports | Active |
| Investment portfolio via statements/manual | Avoids Plaid dependency, users can import brokerage statements | Active |
| All four account types in v1 | Complete financial picture from day one | Active |
| Used prisma db push instead of migrate dev | Non-interactive environment, acceptable for development | Done |
| prisma-field-encryption for transparent encryption | Encrypts at ORM level rather than manual encrypt/decrypt | Done |

---
*Last updated: 2026-02-01 — Paused Plaid, refocused on statement-upload data flow*
