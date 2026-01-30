# Roadmap: SpendWise

## Overview

SpendWise transforms from a manual finance tracker into an automated, AI-powered financial planning tool. This roadmap delivers Plaid integration for real-time account connectivity, intelligent AI transaction categorization, comprehensive spending and investment analysis, goal-based financial advice, and a unified dashboard that shows users their complete financial picture in one place.

## Phases

- [x] **Phase 1: Database Schema & Encryption** - Extend schema for Plaid data and implement token encryption
- [ ] **Phase 2: Plaid Integration Foundation** - Core connectivity infrastructure with Link flow
- [ ] **Phase 3: Account Sync** - Sync bank, credit, savings, and investment accounts via Plaid
- [ ] **Phase 4: Transaction Sync** - Daily automatic transaction sync with deduplication
- [ ] **Phase 5: AI Categorization** - Intelligent transaction categorization with learning
- [ ] **Phase 6: Spending Analysis** - Category breakdowns, trends, and merchant insights
- [ ] **Phase 7: Recurring Transactions** - Subscription detection and recurring cost tracking
- [ ] **Phase 8: Net Worth Tracking** - Total net worth with historical trends
- [ ] **Phase 9: Investment Portfolio** - Holdings, allocation, performance, and gains/losses
- [ ] **Phase 10: Financial Planning** - AI-powered insights and goal-based advice
- [ ] **Phase 11: Unified Dashboard** - Complete financial picture in one view

## Phase Details

### Phase 1: Database Schema & Encryption

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

### Phase 2: Plaid Integration Foundation

**Goal**: Users can connect financial institutions via Plaid Link

**Depends on**: Phase 1

**Requirements**: CONN-01, CONN-02, CONN-03, CONN-04, CONN-05, CONN-06, CONN-07, CONN-08, CONN-09

**Success Criteria** (what must be TRUE):
1. User can initiate Plaid Link flow from the frontend
2. User can connect bank, credit card, investment, and savings accounts
3. User can connect multiple institutions in one session or across sessions
4. User can see connection status for each linked institution (connected, needs re-auth, disconnected)
5. User can re-authenticate when a connection breaks
6. User can unlink a connected institution and remove its data
7. Manual accounts and Plaid-linked accounts coexist in the UI

**Plans**: TBD

Plans:
- [ ] 02-01: TBD
- [ ] 02-02: TBD
- [ ] 02-03: TBD

---

### Phase 3: Account Sync

**Goal**: Account balances and metadata sync from connected institutions

**Depends on**: Phase 2

**Requirements**: (Enables transaction sync, no explicit requirements but foundational)

**Success Criteria** (what must be TRUE):
1. Account balances update when user manually triggers sync
2. Account names and types match those from Plaid
3. Account data persists in database with correct linking to PlaidItem
4. Sync errors are logged and user is notified of connection issues

**Plans**: TBD

Plans:
- [ ] 03-01: TBD
- [ ] 03-02: TBD

---

### Phase 4: Transaction Sync

**Goal**: Transactions automatically sync daily from all connected accounts

**Depends on**: Phase 3

**Requirements**: SYNC-01, SYNC-02, SYNC-03, SYNC-04, SYNC-05

**Success Criteria** (what must be TRUE):
1. Transactions are automatically synced daily from all connected accounts
2. User can trigger a manual sync for any connected account on demand
3. Pending transactions appear in transaction list and update when they post
4. Duplicate transactions are prevented through cursor-based syncing
5. Each account shows sync status and last-updated timestamp
6. Background worker processes sync jobs via BullMQ

**Plans**: TBD

Plans:
- [ ] 04-01: TBD
- [ ] 04-02: TBD
- [ ] 04-03: TBD

---

### Phase 5: AI Categorization

**Goal**: Transactions are intelligently categorized with AI learning from user feedback

**Depends on**: Phase 4

**Requirements**: CATG-01, CATG-02, CATG-03, CATG-04, CATG-05, CATG-06, CATG-07, CATG-08

**Success Criteria** (what must be TRUE):
1. Newly synced transactions are automatically categorized using AI (LLM)
2. Plaid's built-in categories are used as initial categorization baseline
3. AI refines categorization using merchant name, amount, and user's transaction history
4. User can manually override any transaction category
5. AI learns from user corrections and applies patterns to future transactions
6. Each categorization includes a confidence score
7. Low-confidence categorizations are flagged for user review
8. Merchant names are cleaned for readability (e.g., "AMZN*MARKETPLACE" becomes "Amazon")

**Plans**: TBD

Plans:
- [ ] 05-01: TBD
- [ ] 05-02: TBD
- [ ] 05-03: TBD

---

### Phase 6: Spending Analysis

**Goal**: Users understand spending patterns through visual breakdowns and trends

**Depends on**: Phase 5

**Requirements**: SPND-01, SPND-02, SPND-03, SPND-04, SPND-05

**Success Criteria** (what must be TRUE):
1. User can view spending breakdown by category with pie and bar charts
2. User can view monthly spending trends over time (line chart)
3. User can see month-over-month spending comparison with percentage changes
4. User can view top merchants by frequency and total amount spent
5. User can filter all spending analysis by date range and specific accounts

**Plans**: TBD

Plans:
- [ ] 06-01: TBD
- [ ] 06-02: TBD

---

### Phase 7: Recurring Transactions

**Goal**: Users can identify and track recurring expenses and subscriptions

**Depends on**: Phase 5

**Requirements**: RECR-01, RECR-02, RECR-03

**Success Criteria** (what must be TRUE):
1. System automatically detects recurring transactions (subscriptions, bills, regular payments)
2. User can view a list of all recurring transactions with frequency and amount
3. User can see total monthly recurring cost as a summary metric

**Plans**: TBD

Plans:
- [ ] 07-01: TBD

---

### Phase 8: Net Worth Tracking

**Goal**: Users can track total net worth across all accounts over time

**Depends on**: Phase 3

**Requirements**: NWTH-01, NWTH-02, NWTH-03

**Success Criteria** (what must be TRUE):
1. User can see total net worth calculated as assets minus liabilities across all accounts
2. User can view net worth over time as a historical line chart
3. User can see breakdown by account showing each account's contribution to net worth

**Plans**: TBD

Plans:
- [ ] 08-01: TBD

---

### Phase 9: Investment Portfolio

**Goal**: Users can view investment holdings with performance and allocation insights

**Depends on**: Phase 3

**Requirements**: INVS-01, INVS-02, INVS-03, INVS-04, INVS-05

**Success Criteria** (what must be TRUE):
1. User can view all investment holdings with current values
2. User can view asset allocation breakdown (stocks, bonds, ETFs, cash) as pie chart
3. User can view portfolio performance including total return and period changes
4. Holdings prices are refreshed daily via Plaid background sync
5. User can see cost basis and unrealized gains/losses per holding

**Plans**: TBD

Plans:
- [ ] 09-01: TBD
- [ ] 09-02: TBD

---

### Phase 10: Financial Planning

**Goal**: Users receive personalized AI-powered financial insights and recommendations

**Depends on**: Phase 6, Phase 8, Phase 9

**Requirements**: PLAN-01, PLAN-02, PLAN-03, PLAN-04, PLAN-05

**Success Criteria** (what must be TRUE):
1. AI generates personalized spending insights (e.g., "You spent 20% more on dining this month")
2. AI provides goal-based savings recommendations (e.g., "To save $5K by June, reduce dining by $200/mo")
3. AI suggests investment rebalancing based on user goals and current allocation
4. User receives behavioral nudges (e.g., "You're on track!" or "Warning: overspending in dining")
5. All financial advice includes disclaimer stating "Not professional financial advice"

**Plans**: TBD

Plans:
- [ ] 10-01: TBD
- [ ] 10-02: TBD

---

### Phase 11: Unified Dashboard

**Goal**: Users see complete financial picture in one unified dashboard view

**Depends on**: Phase 10

**Requirements**: DASH-01, DASH-02, DASH-03

**Success Criteria** (what must be TRUE):
1. Dashboard shows net worth, spending breakdown, goals progress, and AI advice in unified view
2. Dashboard data refreshes on page load using cached results for performance
3. Dashboard displays account connection health status with indicators for issues
4. All components integrate seamlessly without requiring navigation to separate pages

**Plans**: TBD

Plans:
- [ ] 11-01: TBD

---

## Progress

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Database Schema & Encryption | 2/2 | ✓ Complete | 2026-01-30 |
| 2. Plaid Integration Foundation | 0/TBD | Not started | - |
| 3. Account Sync | 0/TBD | Not started | - |
| 4. Transaction Sync | 0/TBD | Not started | - |
| 5. AI Categorization | 0/TBD | Not started | - |
| 6. Spending Analysis | 0/TBD | Not started | - |
| 7. Recurring Transactions | 0/TBD | Not started | - |
| 8. Net Worth Tracking | 0/TBD | Not started | - |
| 9. Investment Portfolio | 0/TBD | Not started | - |
| 10. Financial Planning | 0/TBD | Not started | - |
| 11. Unified Dashboard | 0/TBD | Not started | - |

---
*Roadmap created: 2026-01-30*
*Last updated: 2026-01-30 — Phase 1 complete*
