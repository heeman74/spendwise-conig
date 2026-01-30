# Features Research: Plaid-Connected Personal Finance Apps

**Researched:** 2026-01-30
**Domain:** Personal finance apps (Mint, Monarch Money, Copilot, YNAB, Rocket Money, PocketGuard)

## Table Stakes (Must Have)

These features are expected by users of Plaid-connected finance apps. Missing any of these will feel incomplete.

### Account Connection
- **Multi-institution linking** — Connect multiple banks, credit cards, brokerages
- **Plaid Link flow** — Standard bank connection UI (search, login, MFA)
- **Account list with balances** — See all connected accounts with current balances
- **Connection status indicators** — Show when accounts need re-authentication
- **Manual account fallback** — For institutions not supported by Plaid
- Complexity: Medium | Dependencies: Plaid integration foundation

### Transaction Management
- **Automatic transaction import** — Pull transactions from connected accounts
- **Transaction categorization** — Assign categories (Food, Transport, Shopping, etc.)
- **Merchant name cleaning** — "AMZN*MARKETPLACE" → "Amazon"
- **Search and filter** — By date, amount, category, account, merchant
- **Transaction detail view** — Full details including pending status
- Complexity: Medium | Dependencies: Account connection

### Spending Analysis
- **Category breakdown** — Pie/bar chart of spending by category
- **Monthly trends** — Spending over time by category
- **Month-over-month comparison** — "You spent 20% more on dining this month"
- **Top merchants** — Most frequent/expensive merchants
- Complexity: Medium | Dependencies: Transaction categorization

### Net Worth
- **Total net worth calculation** — Assets minus liabilities across all accounts
- **Net worth over time** — Historical chart showing growth/decline
- **Account breakdown** — Which accounts contribute what
- Complexity: Low | Dependencies: Account balances

### Recurring Transactions
- **Subscription detection** — Identify recurring charges (Netflix, gym, etc.)
- **Bill tracking** — Track upcoming bills and payment dates
- **Spending on subscriptions total** — Monthly recurring cost summary
- Complexity: Medium | Dependencies: Transaction history

## Differentiators (Competitive Advantage)

### AI-Powered Categorization
- **Learning from corrections** — When user recategorizes, apply to future transactions
- **Context-aware categorization** — Use merchant + amount + frequency patterns
- **Confidence scoring** — Flag uncertain categorizations for review
- Complexity: High | Dependencies: LLM integration, transaction data

### Goal-Based Financial Advice
- **Personalized recommendations** — "To save $5K by June, reduce dining by $200/mo"
- **Actionable insights** — Specific suggestions tied to actual spending data
- **Goal progress tracking** — Visual progress toward savings/investment goals
- **Behavioral nudges** — "You're on track!" or "Warning: overspending in dining"
- Complexity: High | Dependencies: Spending analysis, savings goals, LLM

### Investment Portfolio View
- **Holdings display** — List all investment holdings with current value
- **Asset allocation** — Stocks vs bonds vs cash breakdown
- **Performance tracking** — Total return, daily/weekly/monthly changes
- **Rebalancing suggestions** — "Your portfolio is 70/30, target is 60/40"
- Complexity: High | Dependencies: Plaid investments product

### Unified Dashboard
- **Everything at a glance** — Net worth, spending, goals, advice in one view
- **Customizable widgets** — User chooses what to see
- **Smart alerts** — Unusual spending, large transactions, goal milestones
- Complexity: Medium | Dependencies: All other features

## Anti-Features (Do NOT Build)

| Feature | Why Not |
|---------|---------|
| Direct trading/transfers | Read-only app, not a brokerage. Regulatory nightmare. |
| Bill pay automation | Risk of unauthorized payments. Liability too high. |
| Credit score monitoring | Requires separate data provider (Experian/TransUnion). Scope creep. |
| Social/sharing features | Privacy risk with financial data. No user demand. |
| Crypto wallet integration | Plaid doesn't support well. Separate domain. |
| Tax preparation | Requires tax expertise and IRS compliance. Defer to TurboTax. |
| Multi-currency | Adds complexity. US-only for v1. |
| Real-time notifications | Daily sync is sufficient. Push notifications add mobile complexity. |

## Feature Dependencies

```
Account Connection (foundation)
  ├── Transaction Import
  │   ├── AI Categorization
  │   │   ├── Spending Analysis
  │   │   │   ├── Goal-Based Advice
  │   │   │   └── Recurring Detection
  │   │   └── Monthly Trends
  │   └── Net Worth Tracking
  └── Investment Data
      └── Portfolio View
          └── Rebalancing Suggestions
```

## Competitive Landscape (2026)

| App | Price | Key Strength |
|-----|-------|-------------|
| Monarch Money | $99/yr | Most complete, investment tracking |
| Copilot | $12/mo | Best design, AI insights |
| Rocket Money | $7-14/mo | Subscription cancellation |
| YNAB | $109/yr | Budget methodology |
| PocketGuard | $8/mo | "In My Pocket" remaining spend |
| Simplifi | $48/yr | Cash flow forecasting |

**SpendWise differentiator:** AI-powered categorization that learns + full financial planning engine with investment rebalancing — combining the best of Monarch (investments) and Copilot (AI insights).
