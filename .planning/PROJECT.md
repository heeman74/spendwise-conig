# SpendWise

## What This Is

SpendWise is a personal finance application that connects to users' real bank accounts, credit cards, investment accounts, and savings accounts via Plaid to automatically pull transactions, categorize spending and income using AI, and provide a full financial planning experience — spending insights, goal-based advice, and investment allocation suggestions — all on a unified dashboard.

## Core Value

Users see their complete financial picture in one place — every account, every transaction, automatically categorized — with AI-powered advice on how to save more and invest smarter based on their personal goals.

## Requirements

### Validated

- ✓ User authentication with email/password and JWT — existing
- ✓ Manual account creation (checking, savings, credit, investment) — existing
- ✓ Manual transaction entry with categories — existing
- ✓ Savings goals with progress tracking — existing
- ✓ Dashboard with spending analytics and charts — existing
- ✓ Basic AI-powered financial advice via OpenAI — existing
- ✓ Two-factor authentication (email + SMS) — existing
- ✓ Redis caching for API query performance — existing

### Active

- [ ] Plaid integration for connecting real bank accounts
- [ ] Plaid integration for credit card accounts
- [ ] Plaid integration for investment accounts (holdings, performance, allocation)
- [ ] Plaid integration for savings accounts
- [ ] Daily automatic transaction sync from connected accounts
- [ ] AI-powered transaction categorization using LLM (learns user preferences)
- [ ] Spending analysis with trends, breakdowns, and areas to cut back
- [ ] Goal-based financial advice ("to hit your goal, reduce dining by $200/mo")
- [ ] Investment portfolio view with holdings, gains/losses, and allocation breakdown
- [ ] Investment rebalancing suggestions based on user goals
- [ ] Unified dashboard showing net worth, spending breakdown, goals progress, and AI advice
- [ ] Coexistence of Plaid-linked accounts and manual accounts side by side

### Out of Scope

- Real-time webhook transaction sync — daily sync is sufficient for v1, simpler and cheaper
- Direct trading or money movement — SpendWise is read-only for financial accounts
- Custom ML model training — using LLM APIs (OpenAI/Claude) for categorization and advice
- Mobile app — web-first, mobile later
- Multi-currency support — US accounts only for v1
- Bill pay or transfers — analysis and advice only, no financial actions

## Context

SpendWise is an existing brownfield project with a working Next.js 14 frontend (App Router) and Express + Apollo Server GraphQL API. Both services share a PostgreSQL database via Prisma ORM with Redis caching. The app currently supports manual account and transaction management with basic analytics and AI advice.

The next milestone transforms SpendWise from a manual finance tracker into an automated, AI-powered financial planning tool by integrating Plaid for real account connections and enhancing the AI layer for intelligent categorization and personalized financial guidance.

**Technical environment:**
- Frontend: Next.js 14, React 18, Apollo Client, Redux Toolkit, Tailwind CSS
- Backend: Express, Apollo Server 4, Prisma 5, Redis 7
- Database: PostgreSQL 16
- Existing AI: OpenAI API (advice feature)
- Auth: NextAuth.js (frontend) + JWT (API)

**Key integration point:** Plaid will be integrated on the API side, with Plaid Link (frontend component) handling the user-facing account connection flow. Transaction data flows through the existing GraphQL layer.

## Constraints

- **Third-party dependency**: Plaid API requires an account and has costs per connection — development/sandbox mode is free
- **Data sensitivity**: Financial data requires encryption at rest and secure token storage for Plaid access tokens
- **API rate limits**: Plaid and LLM APIs have rate limits — daily sync and batched categorization needed
- **Existing architecture**: Must integrate with current GraphQL + Prisma + Redis stack without rewriting existing features
- **Account coexistence**: Plaid-linked and manual accounts must work side by side — no migration required

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Plaid for bank connectivity | Industry standard, broad institution coverage, developer-friendly sandbox | — Pending |
| LLM API for categorization | Faster to ship than custom ML, can learn from user corrections via prompt context | — Pending |
| Daily sync over webhooks | Simpler architecture, lower cost, sufficient for personal finance use case | — Pending |
| Keep manual accounts | Users may have accounts not supported by Plaid, or prefer manual tracking | — Pending |
| All four account types in v1 | User wants complete financial picture from day one | — Pending |
| Full portfolio view for investments | Holdings, performance, allocation, and rebalancing suggestions | — Pending |

---
*Last updated: 2026-01-30 after initialization*
