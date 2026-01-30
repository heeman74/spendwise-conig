# Requirements: SpendWise

**Defined:** 2026-01-30
**Core Value:** Users see their complete financial picture in one place — every account, every transaction, automatically categorized — with AI-powered advice on how to save and invest smarter.

## v1 Requirements

Requirements for initial release. Each maps to roadmap phases.

### Account Connection

- [ ] **CONN-01**: User can connect bank accounts via Plaid Link
- [ ] **CONN-02**: User can connect credit card accounts via Plaid Link
- [ ] **CONN-03**: User can connect investment accounts via Plaid Link
- [ ] **CONN-04**: User can connect savings accounts via Plaid Link
- [ ] **CONN-05**: User can connect multiple institutions simultaneously
- [ ] **CONN-06**: User can see connection status for each linked institution
- [ ] **CONN-07**: User can re-authenticate when a connection breaks
- [ ] **CONN-08**: User can unlink a connected institution
- [ ] **CONN-09**: User can keep manual accounts alongside Plaid-linked accounts
- [ ] **CONN-10**: Plaid access tokens are encrypted at rest (AES-256-GCM)

### Transaction Sync

- [ ] **SYNC-01**: Transactions are automatically synced daily from all connected accounts
- [ ] **SYNC-02**: User can trigger a manual sync for any connected account
- [ ] **SYNC-03**: Pending transactions are shown and updated when they post
- [ ] **SYNC-04**: Duplicate transactions are prevented via cursor-based sync
- [ ] **SYNC-05**: Sync status and last-updated timestamp shown per account

### AI Categorization

- [ ] **CATG-01**: Transactions are automatically categorized using AI (LLM)
- [ ] **CATG-02**: Plaid's built-in categories are used as initial categorization
- [ ] **CATG-03**: AI refines categorization with merchant name, amount, and user history
- [ ] **CATG-04**: User can manually override any transaction category
- [ ] **CATG-05**: AI learns from user corrections and applies to future transactions
- [ ] **CATG-06**: AI assigns confidence scores to categorizations
- [ ] **CATG-07**: Low-confidence categorizations are flagged for user review
- [ ] **CATG-08**: Merchant names are cleaned for readability (e.g., "AMZN*MARKETPLACE" → "Amazon")

### Spending Analysis

- [ ] **SPND-01**: User can view spending breakdown by category (pie/bar chart)
- [ ] **SPND-02**: User can view monthly spending trends over time
- [ ] **SPND-03**: User can see month-over-month spending comparison
- [ ] **SPND-04**: User can view top merchants by frequency and amount
- [ ] **SPND-05**: User can filter spending analysis by date range and account

### Recurring Transactions

- [ ] **RECR-01**: System automatically detects recurring transactions (subscriptions, bills)
- [ ] **RECR-02**: User can view all recurring transactions with frequency and amount
- [ ] **RECR-03**: User can see total monthly recurring cost

### Net Worth

- [ ] **NWTH-01**: User can see total net worth (assets minus liabilities) across all accounts
- [ ] **NWTH-02**: User can view net worth over time (historical chart)
- [ ] **NWTH-03**: User can see breakdown by account contributing to net worth

### Investment Portfolio

- [ ] **INVS-01**: User can view all investment holdings with current values
- [ ] **INVS-02**: User can view asset allocation breakdown (stocks, bonds, ETFs, cash)
- [ ] **INVS-03**: User can view portfolio performance (total return, period changes)
- [ ] **INVS-04**: Holdings prices are refreshed daily via Plaid
- [ ] **INVS-05**: User can see cost basis and unrealized gains/losses per holding

### Financial Planning

- [ ] **PLAN-01**: AI generates personalized spending insights ("You spent 20% more on dining this month")
- [ ] **PLAN-02**: AI provides goal-based savings recommendations ("To save $5K by June, reduce dining by $200/mo")
- [ ] **PLAN-03**: AI suggests investment rebalancing based on user goals and current allocation
- [ ] **PLAN-04**: User receives behavioral nudges ("You're on track!" or "Warning: overspending in dining")
- [ ] **PLAN-05**: Financial advice includes disclaimer ("Not professional financial advice")

### Dashboard

- [ ] **DASH-01**: Unified dashboard shows net worth, spending breakdown, goals progress, and AI advice
- [ ] **DASH-02**: Dashboard data refreshes on page load with cached results
- [ ] **DASH-03**: Dashboard shows account connection health status

## v2 Requirements

Deferred to future release. Tracked but not in current roadmap.

### Notifications

- **NOTF-01**: User receives alerts for unusual spending patterns
- **NOTF-02**: User receives alerts for large transactions
- **NOTF-03**: User receives upcoming bill reminders
- **NOTF-04**: User can configure notification preferences

### Advanced Analytics

- **ANLZ-01**: User can view income vs expense trends
- **ANLZ-02**: User can set and track budget limits by category
- **ANLZ-03**: User can view cash flow forecasting (projected balance)
- **ANLZ-04**: User can compare spending to national averages

### Enhanced Investments

- **EINV-01**: User can set target asset allocation
- **EINV-02**: User can view dividend income tracking
- **EINV-03**: User can see tax-loss harvesting opportunities

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| Direct trading or money movement | Read-only app, not a brokerage. Regulatory complexity. |
| Bill pay automation | Risk of unauthorized payments. High liability. |
| Credit score monitoring | Requires separate data provider. Different domain. |
| Social/sharing features | Privacy risk with financial data. No user demand. |
| Crypto wallet integration | Plaid support is limited. Separate domain. |
| Tax preparation | Requires tax expertise and IRS compliance. |
| Multi-currency support | US accounts only for v1. Adds complexity. |
| Real-time push notifications | Daily sync is sufficient. Mobile app not in scope. |
| Real-time webhook sync | Daily sync is simpler and cheaper. v2 consideration. |
| Custom ML model training | LLM APIs sufficient for categorization and advice. |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| (Updated during roadmap creation) | | |

**Coverage:**
- v1 requirements: 38 total
- Mapped to phases: 0
- Unmapped: 38 ⚠️

---
*Requirements defined: 2026-01-30*
*Last updated: 2026-01-30 after initial definition*
