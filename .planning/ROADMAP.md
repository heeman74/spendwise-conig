# Roadmap: SpendWise

## Overview

SpendWise is a personal finance application powered by statement imports and AI. Users upload bank/credit card statements to automatically import transactions, which are then intelligently categorized. The roadmap builds on this statement-import foundation to deliver spending analysis, recurring transaction detection, net worth tracking, investment portfolio management, AI-powered financial planning, and a unified dashboard.

Plaid integration code exists in the codebase (built in Phase 2) and is preserved for future activation, but all active development focuses on the statement-upload data flow.

## Phases

- [x] **Phase 1: Database Schema & Encryption** - Extend schema for Plaid data and implement token encryption
- [ ] ~~**Phase 2: Plaid Integration Foundation**~~ - **PAUSED** — Code built (backend SDK, webhooks, frontend Link flow) but not wired into UI pages
- [ ] ~~**Phase 3: Account Sync via Plaid**~~ - **PAUSED** — Depends on Plaid UI integration
- [ ] ~~**Phase 4: Transaction Sync via Plaid**~~ - **PAUSED** — Depends on Plaid account sync
- [x] **Phase 2: AI Categorization Enhancement** - Improve existing categorizer, add merchant rule learning, confidence tuning
- [x] **Phase 3: Spending Analysis** - Category breakdowns, trends, and merchant insights
- [x] **Phase 4: Recurring Transactions** - Subscription detection from imported transaction patterns
- [ ] **Phase 5: Net Worth Tracking** - Total net worth with historical trends from statement imports
- [ ] **Phase 6: Investment Portfolio** - Holdings tracking via statement imports or manual entry
- [ ] **Phase 7: Financial Planning** - AI-powered insights and goal-based advice
- [ ] **Phase 8: Unified Dashboard** - Complete financial picture in one view

## Phase Details

### Phase 1: Database Schema & Encryption — COMPLETE

**Goal**: Database structure supports Plaid data with secure token storage

**Depends on**: Nothing (first phase)

**Requirements**: CONN-10

**Success Criteria** (what must be TRUE):
1. Database schema includes PlaidItem, InvestmentHolding, Security, and RecurringTransaction tables
2. Plaid access tokens are encrypted at rest using AES-256-GCM
3. Encryption key management system is in place and secure
4. Schema supports coexistence of manual and Plaid-linked accounts

**Plans**: 2 plans

Plans:
- [x] 01-01-PLAN.md -- Extend Prisma schema with Plaid models and apply database migration
- [x] 01-02-PLAN.md -- Install prisma-field-encryption and validate AES-256-GCM token encryption

---

### Plaid Integration Foundation — PAUSED

**Goal**: Users can connect financial institutions via Plaid Link

**Status**: Backend SDK, webhook endpoint, and frontend Link component built. UI page integration (02-04, 02-05) never executed. Code preserved in codebase for future activation.

**Reason paused**: Statement import system handles transaction ingestion. Plaid adds cost/complexity without proportional user value at this stage.

**Code locations preserved:**
- Backend: `spendwise-api/src/lib/plaid-*`, `spendwise-api/src/routes/plaid-webhooks.ts`, `spendwise-api/src/schema/resolvers/plaid.ts`, `spendwise-api/src/schema/typeDefs/plaid.ts`
- Frontend: `spendwise/src/components/plaid/`, `spendwise/src/hooks/usePlaid.ts`, `spendwise/src/graphql/queries/plaid.ts`, `spendwise/src/graphql/mutations/plaid.ts`
- Prisma: PlaidItem model and Plaid fields on Account

Plans completed before pause:
- [x] 02-01-PLAN.md -- Backend Plaid SDK client + GraphQL API
- [x] 02-02-PLAN.md -- Backend webhook endpoint
- [x] 02-03-PLAN.md -- Frontend Plaid Link flow with react-plaid-link
- [ ] 02-04-PLAN.md -- Accounts page redesign (not executed)
- [ ] 02-05-PLAN.md -- Settings page institution management (not executed)

### Account Sync via Plaid — PAUSED

**Status**: Not started. Depends on Plaid UI integration.

### Transaction Sync via Plaid — PAUSED

**Status**: Not started. Depends on Plaid account sync.

---

### Phase 2: AI Categorization Enhancement — COMPLETE

**Goal**: Transactions are intelligently categorized with AI learning from user feedback

**Depends on**: Phase 1 (existing statement import categorizer provides baseline)

**Requirements**: CATG-01, CATG-02, CATG-03, CATG-04, CATG-05, CATG-06, CATG-07, CATG-08

**Success Criteria** (what must be TRUE):
1. Imported transactions are automatically categorized using AI (LLM)
2. AI uses merchant name, amount, and user's transaction history to categorize
3. User can manually override any transaction category
4. AI learns from user corrections and applies patterns to future transactions
5. Each categorization includes a confidence score
6. Low-confidence categorizations are flagged for user review
7. Merchant names are cleaned for readability (e.g., "AMZN*MARKETPLACE" becomes "Amazon")

**Plans**: 3 plans

Plans:
- [x] 02-01-PLAN.md -- Shared category constants, zod install, Structured Outputs upgrade for AI categorizer
- [x] 02-02-PLAN.md -- User history context in AI prompt and retroactive re-categorization on merchant rule changes
- [x] 02-03-PLAN.md -- Needs Review GraphQL query and frontend review UI tab

---

### Phase 3: Spending Analysis — COMPLETE

**Goal**: Users understand spending patterns through visual breakdowns and trends

**Depends on**: Phase 2

**Requirements**: SPND-01, SPND-02, SPND-03, SPND-04, SPND-05

**Success Criteria** (what must be TRUE):
1. User can view spending breakdown by category with pie and bar charts
2. User can view monthly spending trends over time (line chart)
3. User can see month-over-month spending comparison with percentage changes
4. User can view top merchants by frequency and total amount spent
5. User can filter all spending analysis by date range and specific accounts

**Plans**: 3 plans

Plans:
- [x] 03-01-PLAN.md -- Extend analytics GraphQL API with date/account filters, multi-month trends, and topMerchants query
- [x] 03-02-PLAN.md -- Frontend filter infrastructure: DateRangePicker, AccountFilter, useAnalyticsFilters hook, updated queries/hooks
- [x] 03-03-PLAN.md -- Rebuild analytics page with real data, comparison cards, top merchants table, and filter wiring

---

### Phase 4: Recurring Transactions — COMPLETE

**Goal**: Users can identify and track recurring expenses and subscriptions

**Depends on**: Phase 2

**Requirements**: RECR-01, RECR-02, RECR-03

**Success Criteria** (what must be TRUE):
1. System automatically detects recurring transactions (subscriptions, bills, regular payments) from imported data
2. User can view a list of all recurring transactions with frequency and amount
3. User can see total monthly recurring cost as a summary metric

**Plans**: 5 plans

Plans:
- [x] 04-01-PLAN.md -- Schema extension + TDD recurring detection algorithm (normalization, frequency classification, pattern detection)
- [x] 04-02-PLAN.md -- GraphQL API (typeDefs, resolvers, mutations) + post-import detection trigger
- [x] 04-03-PLAN.md -- Frontend: recurring page with summary cards, sortable table, filters, add/dismiss, sidebar nav
- [x] 04-04-PLAN.md -- Gap closure: Add "Mark as Recurring" action to transaction rows with frequency modal
- [x] 04-05-PLAN.md -- Gap closure: Fix Apollo cache invalidation for dismiss/restore mutations

---

### Phase 5: Net Worth Tracking

**Goal**: Users can track total net worth across all accounts over time

**Depends on**: Phase 1 (aggregates account balances from statement imports)

**Requirements**: NWTH-01, NWTH-02, NWTH-03

**Success Criteria** (what must be TRUE):
1. User can see total net worth calculated as assets minus liabilities across all accounts
2. User can view net worth over time as a historical line chart
3. User can see breakdown by account showing each account's contribution to net worth

**Plans**: 4 plans

Plans:
- [ ] 05-01-PLAN.md -- Prisma schema (NetWorthSnapshot model, includeInNetWorth) + BullMQ daily snapshot job
- [ ] 05-02-PLAN.md -- GraphQL API (netWorth query, toggle/backfill mutations, on-import trigger)
- [ ] 05-03-PLAN.md -- Frontend net worth page (hero, chart, account breakdown, sparklines, sidebar nav)
- [ ] 05-04-PLAN.md -- Dashboard net worth summary card with sparkline

---

### Phase 6: Investment Portfolio

**Goal**: Users can view investment holdings with performance and allocation insights

**Depends on**: Phase 1 (holdings tracked via statement imports or manual entry)

**Requirements**: INVS-01, INVS-02, INVS-03, INVS-04, INVS-05

**Success Criteria** (what must be TRUE):
1. User can view all investment holdings with current values
2. User can view asset allocation breakdown (stocks, bonds, ETFs, cash) as pie chart
3. User can view portfolio performance including total return and period changes
4. Holdings data sourced from statement imports or manual entry
5. User can see cost basis and unrealized gains/losses per holding

**Plans**: TBD

Plans:
- [ ] 06-01: TBD
- [ ] 06-02: TBD

---

### Phase 7: Financial Planning

**Goal**: Users receive personalized AI-powered financial insights and recommendations

**Depends on**: Phase 3, Phase 5, Phase 6

**Requirements**: PLAN-01, PLAN-02, PLAN-03, PLAN-04, PLAN-05

**Success Criteria** (what must be TRUE):
1. AI generates personalized spending insights (e.g., "You spent 20% more on dining this month")
2. AI provides goal-based savings recommendations (e.g., "To save $5K by June, reduce dining by $200/mo")
3. AI suggests investment rebalancing based on user goals and current allocation
4. User receives behavioral nudges (e.g., "You're on track!" or "Warning: overspending in dining")
5. All financial advice includes disclaimer stating "Not professional financial advice"

**Plans**: TBD

Plans:
- [ ] 07-01: TBD
- [ ] 07-02: TBD

---

### Phase 8: Unified Dashboard

**Goal**: Users see complete financial picture in one unified dashboard view

**Depends on**: Phase 7

**Requirements**: DASH-01, DASH-02, DASH-03

**Success Criteria** (what must be TRUE):
1. Dashboard shows net worth, spending breakdown, goals progress, and AI advice in unified view
2. Dashboard data refreshes on page load using cached results for performance
3. All components integrate seamlessly without requiring navigation to separate pages

**Plans**: TBD

Plans:
- [ ] 08-01: TBD

---

## Progress

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Database Schema & Encryption | 2/2 | Complete | 2026-01-30 |
| ~~Plaid Integration Foundation~~ | 3/5 | Paused | — |
| ~~Account Sync via Plaid~~ | 0/TBD | Paused | — |
| ~~Transaction Sync via Plaid~~ | 0/TBD | Paused | — |
| 2. AI Categorization Enhancement | 3/3 | Complete | 2026-02-01 |
| 3. Spending Analysis | 3/3 | Complete | 2026-02-01 |
| 4. Recurring Transactions | 5/5 | Complete | 2026-02-01 |
| 5. Net Worth Tracking | 0/TBD | Not started | — |
| 6. Investment Portfolio | 0/TBD | Not started | — |
| 7. Financial Planning | 0/TBD | Not started | — |
| 8. Unified Dashboard | 0/TBD | Not started | — |

---
*Roadmap created: 2026-01-30*
*Last updated: 2026-02-01 -- Phase 4 gap closure complete: all 5 plans verified (14/14 must-haves)*
