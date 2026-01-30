# Architecture Research: Plaid Integration + AI Financial Planning

**Researched:** 2026-01-30
**Domain:** Financial data pipeline with Plaid, background processing, AI categorization

## System Architecture Overview

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────┐
│   Next.js App    │────▶│  GraphQL API     │────▶│ PostgreSQL  │
│  (Plaid Link)    │◀────│  (Apollo Server)  │◀────│  (Prisma)   │
└─────────────────┘     └──────────────────┘     └─────────────┘
                              │       ▲
                              │       │
                        ┌─────▼───────┴──────┐
                        │     Redis          │
                        │  (Cache + BullMQ)   │
                        └─────┬──────────────┘
                              │
                        ┌─────▼──────────────┐
                        │  Background Workers  │
                        │  - Transaction Sync  │
                        │  - AI Categorization │
                        │  - Investment Refresh │
                        └─────┬──────────────┘
                              │
                    ┌─────────┼─────────┐
                    ▼         ▼         ▼
              ┌──────────┐ ┌────────┐ ┌────────┐
              │ Plaid API │ │OpenAI  │ │  DB    │
              └──────────┘ └────────┘ └────────┘
```

## Component Architecture

### 1. Plaid Connection Layer (API)

**Location:** `src/services/plaid/`

**Components:**
- `plaidClient.ts` — Plaid SDK client configuration
- `linkToken.ts` — Create Link tokens for frontend
- `itemService.ts` — Exchange public tokens, manage Plaid items
- `accountService.ts` — Fetch and sync account data
- `transactionService.ts` — Fetch and sync transactions
- `investmentService.ts` — Fetch holdings and investment transactions

**Data Flow — Account Connection:**
1. Frontend requests Link token via GraphQL mutation
2. API creates Plaid Link token → returns to frontend
3. User completes Plaid Link flow in frontend
4. Frontend sends public_token to API via GraphQL mutation
5. API exchanges public_token → access_token via Plaid API
6. API encrypts access_token, stores in PlaidItem table
7. API triggers initial sync job via BullMQ

### 2. Background Worker Layer

**Location:** `src/workers/`

**Components:**
- `syncWorker.ts` — Transaction sync processor
- `categorizationWorker.ts` — AI categorization processor
- `investmentWorker.ts` — Investment data refresh processor
- `scheduler.ts` — Cron job setup for daily syncs

**Architecture Pattern:** Web-Queue-Worker
- API handles GraphQL requests (web tier)
- Redis + BullMQ manages job queues (queue tier)
- Worker processes run alongside or as separate process (worker tier)

**Job Types:**
| Job | Trigger | Frequency | Timeout |
|-----|---------|-----------|---------|
| sync-transactions | Daily cron + manual | Daily 2am | 5min |
| categorize-batch | After sync completes | On demand | 10min |
| refresh-investments | Daily cron | Daily 3am | 5min |
| refresh-balances | Daily cron | Daily 1am | 2min |

### 3. AI Categorization Layer

**Location:** `src/services/ai/`

**Components:**
- `categorizer.ts` — Transaction categorization via LLM
- `advisor.ts` — Financial advice generation (extend existing)
- `prompts/` — Prompt templates for categorization and advice

**Categorization Pipeline:**
1. New transactions arrive from Plaid sync
2. BullMQ job processes batch of uncategorized transactions
3. Plaid's built-in categories used as initial suggestion
4. LLM refines categorization using: merchant name, amount, Plaid category, user's historical corrections
5. Confidence score assigned (high/medium/low)
6. Low confidence → flagged for user review
7. User corrections stored → fed back into future prompts

**Batch Strategy:**
- Process 50 transactions per LLM call (batch for efficiency)
- Use OpenAI Batch API for non-urgent bulk categorization (50% cheaper)
- Real-time single-transaction categorization for user corrections

### 4. Financial Planning Engine

**Location:** `src/services/planning/`

**Components:**
- `netWorth.ts` — Calculate net worth from all accounts
- `spendingAnalysis.ts` — Category breakdowns, trends, comparisons
- `goalTracker.ts` — Progress toward savings/investment goals
- `portfolioAnalysis.ts` — Holdings allocation, performance metrics
- `rebalancer.ts` — Generate rebalancing suggestions
- `advisorEngine.ts` — Orchestrate AI advice with spending + goals data

**Data Flow — Financial Planning:**
1. User opens dashboard
2. Frontend requests dashboard data via GraphQL
3. API aggregates: accounts → balances → net worth
4. API computes: transactions → category spending → trends
5. API checks: goals → progress → gap analysis
6. API generates: AI advice based on all above data
7. Results cached in Redis (TTL: 1 hour for dashboard)

### 5. Database Schema Extensions

**New Models:**
```
PlaidItem {
  id, userId, accessTokenEncrypted, institutionId, institutionName,
  status (ACTIVE/ERROR/PENDING_REAUTH), lastSync, createdAt
}

PlaidAccount (extends existing Account) {
  plaidAccountId, plaidItemId, mask, officialName, subtype,
  isLinked (boolean — distinguishes Plaid vs manual)
}

InvestmentHolding {
  id, accountId, securityId, quantity, costBasis, currentValue,
  institutionPrice, lastUpdated
}

Security {
  id, plaidSecurityId, ticker, name, type (stock/bond/etf/mutual_fund/cash),
  closePrice, lastUpdated
}

TransactionCategory (AI enrichment) {
  transactionId, aiCategory, aiConfidence, userOverride, plaidCategory
}
```

### 6. GraphQL Schema Extensions

**New Types:**
- `PlaidItem` — Connected institution
- `InvestmentHolding` — Individual holding
- `Security` — Security master data
- `PortfolioSummary` — Allocation, performance, rebalancing
- `SpendingInsight` — Category analysis, trends
- `FinancialAdvice` — AI-generated advice with context

**New Queries:**
- `plaidLinkToken` — Get Link token for frontend
- `investmentHoldings(accountId)` — Holdings for account
- `portfolioSummary` — Full portfolio analysis
- `spendingInsights(period)` — Spending breakdown
- `financialPlan` — Comprehensive advice

**New Mutations:**
- `exchangePlaidToken(publicToken)` — Complete account link
- `syncTransactions(itemId?)` — Trigger manual sync
- `updateTransactionCategory(id, category)` — User correction
- `unlinkPlaidItem(itemId)` — Disconnect institution

## Suggested Build Order

1. **Database schema** — New models and migrations
2. **Plaid connection flow** — Link token → exchange → store
3. **Account sync** — Pull accounts from Plaid items
4. **Transaction sync** — Background job + daily cron
5. **AI categorization** — Batch processing pipeline
6. **Spending analysis** — Computed from categorized transactions
7. **Investment data** — Holdings, securities, portfolio view
8. **Financial planning engine** — Advice combining all data
9. **Dashboard integration** — Unified view with all components

## Key Architecture Decisions

| Decision | Rationale |
|----------|-----------|
| Workers in same process (dev), separate process (prod) | Simple dev, scalable prod |
| Encrypt Plaid access tokens at rest | Financial data security requirement |
| Use Plaid categories as starting point, LLM to refine | Saves API costs, improves accuracy |
| Cache dashboard data in Redis (1hr TTL) | Dashboard is read-heavy, data changes daily |
| Batch AI calls (50 txns per request) | Cost optimization for LLM API |
| Store AI confidence scores | Enable user review of uncertain categorizations |
