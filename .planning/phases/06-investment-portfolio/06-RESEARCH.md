# Phase 6: Investment Portfolio - Research

**Researched:** 2026-02-02
**Domain:** Investment portfolio tracking, holdings management, asset allocation, performance metrics
**Confidence:** HIGH

## Summary

This phase builds investment portfolio tracking on top of existing database models (InvestmentHolding and Security) created in Phase 1. The research reveals that the foundation is already in place — we need to add GraphQL resolvers, frontend components, and a price data source strategy to display holdings, asset allocation, and performance metrics.

Unlike net worth tracking (Phase 5) which aggregates account balances, portfolio tracking focuses on individual security holdings within INVESTMENT accounts. Users can view what they own (stocks, bonds, ETFs), how their portfolio is allocated across asset types, and track unrealized gains/losses from cost basis.

Since Plaid is paused, we have three viable approaches for price data: (1) free stock price APIs with rate limits, (2) manual price entry by users, or (3) hybrid approach using statement-uploaded prices. The hybrid approach is recommended: use prices from statement imports as the baseline, with optional manual updates for real-time accuracy.

**Primary recommendation:** Build GraphQL resolvers for holdings data, create React components for portfolio visualization using Recharts (already in stack), implement asset allocation pie chart and holdings table, calculate unrealized gains from costBasis field. Start with statement-imported prices, add manual price update capability. Use Alpha Vantage free tier (25 requests/day) for optional real-time price refresh in future phases.

## Standard Stack

The established libraries/tools for this domain:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Recharts | 2.12.2 (existing) | Chart library for allocation pie charts | Already used in net worth and analytics; excellent React integration |
| Apollo Client | 4.1.2 (existing) | GraphQL client for data fetching | Already in use; type-safe queries and cache management |
| Prisma | 5.10.0 (existing) | ORM with existing Security/InvestmentHolding models | Schema already defined in Phase 1 |
| PostgreSQL | 16 (existing) | Database with investment data models | Existing schema supports holdings and securities |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Alpha Vantage API | Free tier | Stock price data (25 req/day) | Optional real-time price updates; use after statement imports established |
| date-fns | 4.1.0 (existing) | Date formatting for performance periods | Already in use across project |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Alpha Vantage | Finnhub (60 req/min free) | More generous rate limit but limited free tier features; Alpha Vantage has better historical data |
| Alpha Vantage | Yahoo Finance (yfinance) | Unofficial/breaks frequently; not production-ready |
| Real-time API | Manual price entry | No API costs but requires user effort; good for infrequent traders |
| Real-time API | Statement-imported prices | No API dependency; delayed but accurate for tax records |
| Recharts | Chart.js or D3 | Recharts is React-native and already in stack; no reason to add new library |

**Installation:**
No new dependencies needed. All required libraries already installed.

## Architecture Patterns

### Recommended Component Structure

```
Investment Portfolio View
├── Backend (API):
│   ├── GraphQL TypeDefs:
│   │   ├── investment.ts (InvestmentHolding, Security, Portfolio types)
│   │   └── Queries: holdings(accountId), portfolio, assetAllocation
│   ├── GraphQL Resolvers:
│   │   ├── investment.ts (holdings, portfolio, allocation calculations)
│   │   └── Computed fields: unrealizedGain, totalValue, allocationPercent
│   └── Price Management:
│       ├── Use institutionPrice from holdings (from statements)
│       └── Optional: manual price update mutation
│
└── Frontend (Next.js):
    ├── Page: app/(dashboard)/portfolio/page.tsx
    ├── Components:
    │   ├── PortfolioSummary (total value, gains, performance)
    │   ├── AssetAllocationChart (pie chart by type)
    │   ├── HoldingsTable (individual securities with gains)
    │   └── PerformanceMetrics (total return, period changes)
    ├── Hooks:
    │   └── usePortfolio.ts (GraphQL queries wrapper)
    └── GraphQL:
        ├── queries/portfolio.ts
        └── mutations/holdings.ts (future: manual updates)
```

### Pattern 1: Asset Allocation Calculation

**What:** Aggregate holdings by security type (stocks, bonds, ETFs, cash) to show portfolio composition.

**When to use:** Displaying how a portfolio is diversified across asset classes.

**Example:**
```typescript
// Source: Existing Security model + aggregation pattern from analytics resolver

// Backend resolver (investment.ts)
assetAllocation: async (_: unknown, __: unknown, context: Context) => {
  const user = requireAuth(context);

  // Get all investment accounts
  const accounts = await context.prisma.account.findMany({
    where: { userId: user.id, type: 'INVESTMENT' },
    select: { id: true },
  });

  const accountIds = accounts.map(a => a.id);

  // Get all holdings with securities
  const holdings = await context.prisma.investmentHolding.findMany({
    where: { accountId: { in: accountIds } },
    include: { security: true },
  });

  // Aggregate by security type
  const allocationMap: Record<string, number> = {};
  let totalValue = 0;

  holdings.forEach((holding) => {
    const value = parseDecimal(holding.institutionValue);
    const type = holding.security.type; // "equity", "etf", "mutual fund", "cash", "bond"

    allocationMap[type] = (allocationMap[type] || 0) + value;
    totalValue += value;
  });

  // Convert to array with percentages and colors
  return Object.entries(allocationMap).map(([type, value]) => ({
    type: formatAssetType(type), // "Stocks", "Bonds", "ETFs", etc.
    value,
    percentage: totalValue > 0 ? (value / totalValue) * 100 : 0,
    color: getAssetTypeColor(type),
  }));
}

// Helper functions
function formatAssetType(type: string): string {
  const typeMap: Record<string, string> = {
    'equity': 'Stocks',
    'etf': 'ETFs',
    'mutual fund': 'Mutual Funds',
    'bond': 'Bonds',
    'cash': 'Cash',
  };
  return typeMap[type] || type;
}

function getAssetTypeColor(type: string): string {
  const colorMap: Record<string, string> = {
    'equity': '#3b82f6',     // blue
    'etf': '#10b981',        // green
    'mutual fund': '#8b5cf6', // purple
    'bond': '#f59e0b',       // amber
    'cash': '#6b7280',       // gray
  };
  return colorMap[type] || '#94a3b8';
}
```

### Pattern 2: Unrealized Gains Calculation

**What:** Calculate the difference between current market value and cost basis to show paper profits/losses.

**When to use:** Showing performance metrics and tax planning information.

**Example:**
```typescript
// Source: Formula from web research + existing parseDecimal utility

// Formula: Unrealized Gain = (Current Price × Quantity) - Cost Basis

// Backend resolver field (on InvestmentHolding type)
InvestmentHolding: {
  unrealizedGain: (parent: InvestmentHolding) => {
    const currentValue = parseDecimal(parent.institutionValue);
    const costBasis = parent.costBasis
      ? parseDecimal(parent.costBasis)
      : currentValue; // If no cost basis, assume break-even

    return currentValue - costBasis;
  },

  unrealizedGainPercent: (parent: InvestmentHolding) => {
    const currentValue = parseDecimal(parent.institutionValue);
    const costBasis = parent.costBasis
      ? parseDecimal(parent.costBasis)
      : currentValue;

    if (costBasis === 0) return 0;
    return ((currentValue - costBasis) / costBasis) * 100;
  },

  // Existing fields from database
  quantity: (parent) => parseDecimal(parent.quantity),
  institutionPrice: (parent) => parseDecimal(parent.institutionPrice),
  institutionValue: (parent) => parseDecimal(parent.institutionValue),
  costBasis: (parent) => parent.costBasis ? parseDecimal(parent.costBasis) : null,
}
```

### Pattern 3: Portfolio Summary Aggregation

**What:** Roll up all holdings across investment accounts to show total portfolio value and performance.

**When to use:** Dashboard widget or portfolio overview page.

**Example:**
```typescript
// Source: Pattern from dashboardStats resolver in analytics.ts

// Backend resolver
portfolio: async (_: unknown, __: unknown, context: Context) => {
  const user = requireAuth(context);

  // Check cache first
  const cacheKey = `user:${user.id}:portfolio`;
  const cached = await getCache<Record<string, unknown>>(cacheKey);
  if (cached) return cached;

  // Get all investment accounts
  const accounts = await context.prisma.account.findMany({
    where: { userId: user.id, type: 'INVESTMENT' },
    include: {
      holdings: {
        include: { security: true },
      },
    },
  });

  let totalValue = 0;
  let totalCostBasis = 0;
  let holdingCount = 0;

  accounts.forEach((account) => {
    account.holdings.forEach((holding) => {
      totalValue += parseDecimal(holding.institutionValue);
      totalCostBasis += holding.costBasis
        ? parseDecimal(holding.costBasis)
        : 0;
      holdingCount++;
    });
  });

  const totalGain = totalValue - totalCostBasis;
  const totalGainPercent = totalCostBasis > 0
    ? (totalGain / totalCostBasis) * 100
    : 0;

  const result = {
    totalValue,
    totalCostBasis,
    totalGain,
    totalGainPercent,
    holdingCount,
    accountCount: accounts.length,
    accounts: accounts.map(account => ({
      id: account.id,
      name: account.name,
      institution: account.institution,
      value: account.holdings.reduce(
        (sum, h) => sum + parseDecimal(h.institutionValue),
        0
      ),
      holdingCount: account.holdings.length,
    })),
  };

  // Cache for 1 hour
  await setCache(cacheKey, result, 3600);

  return result;
}
```

### Pattern 4: Asset Allocation Pie Chart (Frontend)

**What:** Recharts PieChart component to visualize portfolio allocation by asset type.

**When to use:** Portfolio page to show diversification at a glance.

**Example:**
```typescript
// Source: Existing SpendingPieChart.tsx pattern + Recharts documentation

'use client';

import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { formatCurrency } from '@/lib/utils';

interface AssetAllocation {
  type: string;
  value: number;
  percentage: number;
  color: string;
}

interface AssetAllocationChartProps {
  data: AssetAllocation[];
}

export default function AssetAllocationChart({ data }: AssetAllocationChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-500 dark:text-gray-400">
        No allocation data available
      </div>
    );
  }

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const item = payload[0].payload;
      return (
        <div className="bg-white dark:bg-gray-800 p-3 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700">
          <p className="font-medium text-gray-900 dark:text-white">{item.type}</p>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {formatCurrency(item.value)} ({item.percentage.toFixed(1)}%)
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <ResponsiveContainer width="100%" height={300}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          innerRadius={60}
          outerRadius={100}
          paddingAngle={2}
          dataKey="value"
          nameKey="type"
        >
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.color} />
          ))}
        </Pie>
        <Tooltip content={<CustomTooltip />} />
        <Legend
          layout="vertical"
          align="right"
          verticalAlign="middle"
          formatter={(value) => (
            <span className="text-sm text-gray-700 dark:text-gray-300">{value}</span>
          )}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}
```

### Pattern 5: Holdings Table with Unrealized Gains

**What:** Sortable table displaying individual security holdings with cost basis and gains.

**When to use:** Detailed holdings view on portfolio page.

**Example:**
```typescript
// Source: Pattern from recurring transactions table + existing table patterns

'use client';

import { useState } from 'react';
import { formatCurrency } from '@/lib/utils';
import Card from '@/components/ui/Card';

interface Holding {
  id: string;
  security: {
    name: string;
    tickerSymbol: string | null;
    type: string;
  };
  quantity: number;
  institutionPrice: number;
  institutionValue: number;
  costBasis: number | null;
  unrealizedGain: number;
  unrealizedGainPercent: number;
}

interface HoldingsTableProps {
  holdings: Holding[];
}

export default function HoldingsTable({ holdings }: HoldingsTableProps) {
  const [sortField, setSortField] = useState<keyof Holding>('institutionValue');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  if (!holdings || holdings.length === 0) {
    return (
      <Card>
        <div className="flex items-center justify-center h-32 text-gray-500 dark:text-gray-400">
          No holdings found
        </div>
      </Card>
    );
  }

  const sortedHoldings = [...holdings].sort((a, b) => {
    const aVal = a[sortField];
    const bVal = b[sortField];
    const modifier = sortDirection === 'asc' ? 1 : -1;

    if (typeof aVal === 'number' && typeof bVal === 'number') {
      return (aVal - bVal) * modifier;
    }
    return 0;
  });

  const handleSort = (field: keyof Holding) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  return (
    <Card>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="border-b border-gray-200 dark:border-gray-700">
            <tr>
              <th className="text-left py-3 px-4 text-sm font-medium text-gray-700 dark:text-gray-300">
                Security
              </th>
              <th
                className="text-right py-3 px-4 text-sm font-medium text-gray-700 dark:text-gray-300 cursor-pointer hover:text-primary-600"
                onClick={() => handleSort('quantity')}
              >
                Shares
              </th>
              <th
                className="text-right py-3 px-4 text-sm font-medium text-gray-700 dark:text-gray-300 cursor-pointer hover:text-primary-600"
                onClick={() => handleSort('institutionPrice')}
              >
                Price
              </th>
              <th
                className="text-right py-3 px-4 text-sm font-medium text-gray-700 dark:text-gray-300 cursor-pointer hover:text-primary-600"
                onClick={() => handleSort('institutionValue')}
              >
                Value
              </th>
              <th
                className="text-right py-3 px-4 text-sm font-medium text-gray-700 dark:text-gray-300 cursor-pointer hover:text-primary-600"
                onClick={() => handleSort('costBasis')}
              >
                Cost Basis
              </th>
              <th
                className="text-right py-3 px-4 text-sm font-medium text-gray-700 dark:text-gray-300 cursor-pointer hover:text-primary-600"
                onClick={() => handleSort('unrealizedGain')}
              >
                Gain/Loss
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            {sortedHoldings.map((holding) => {
              const gainPositive = holding.unrealizedGain >= 0;
              const gainColor = gainPositive
                ? 'text-green-600 dark:text-green-400'
                : 'text-red-600 dark:text-red-400';

              return (
                <tr key={holding.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                  <td className="py-3 px-4">
                    <div className="flex flex-col">
                      <span className="font-medium text-gray-900 dark:text-white">
                        {holding.security.tickerSymbol || holding.security.name}
                      </span>
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {holding.security.type}
                      </span>
                    </div>
                  </td>
                  <td className="text-right py-3 px-4 text-sm text-gray-600 dark:text-gray-400">
                    {holding.quantity.toFixed(4)}
                  </td>
                  <td className="text-right py-3 px-4 text-sm text-gray-600 dark:text-gray-400">
                    {formatCurrency(holding.institutionPrice)}
                  </td>
                  <td className="text-right py-3 px-4 text-sm font-medium text-gray-900 dark:text-white">
                    {formatCurrency(holding.institutionValue)}
                  </td>
                  <td className="text-right py-3 px-4 text-sm text-gray-600 dark:text-gray-400">
                    {holding.costBasis ? formatCurrency(holding.costBasis) : '—'}
                  </td>
                  <td className={`text-right py-3 px-4 text-sm font-medium ${gainColor}`}>
                    <div className="flex flex-col items-end">
                      <span>{gainPositive ? '+' : ''}{formatCurrency(holding.unrealizedGain)}</span>
                      <span className="text-xs">
                        ({gainPositive ? '+' : ''}{holding.unrealizedGainPercent.toFixed(2)}%)
                      </span>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
```

### Pattern 6: Custom Hook for Portfolio Data

**What:** React hook wrapping GraphQL portfolio queries for consistent data access pattern.

**When to use:** Portfolio page and dashboard widget components.

**Example:**
```typescript
// Source: Existing useNetWorth.ts and useAccounts.ts patterns

'use client';

import { useQuery } from '@apollo/client/react';
import { GET_PORTFOLIO, GET_ASSET_ALLOCATION, GET_HOLDINGS } from '@/graphql';

export function usePortfolio() {
  const { data, loading, error, refetch } = useQuery<any>(GET_PORTFOLIO, {
    fetchPolicy: 'cache-and-network',
  });

  return {
    portfolio: data?.portfolio,
    loading,
    error,
    refetch,
  };
}

export function useAssetAllocation() {
  const { data, loading, error, refetch } = useQuery<any>(GET_ASSET_ALLOCATION, {
    fetchPolicy: 'cache-and-network',
  });

  return {
    allocation: data?.assetAllocation ?? [],
    loading,
    error,
    refetch,
  };
}

export function useHoldings(accountId?: string) {
  const { data, loading, error, refetch } = useQuery<any>(GET_HOLDINGS, {
    variables: accountId ? { accountId } : {},
    fetchPolicy: 'cache-and-network',
    skip: !accountId && accountId !== undefined,
  });

  return {
    holdings: data?.holdings ?? [],
    loading,
    error,
    refetch,
  };
}
```

### Anti-Patterns to Avoid

- **Real-time price updates without caching:** API rate limits will be exceeded quickly. Cache prices with appropriate TTL (e.g., 1 hour during market hours).
- **Missing cost basis handling:** Not all holdings have cost basis data. Always check for null and provide graceful defaults (e.g., assume break-even).
- **Calculating allocation client-side:** Server should compute allocation percentages to ensure consistency across all views.
- **Ignoring INVESTMENT account type filter:** Portfolio queries must filter by `type: 'INVESTMENT'` to exclude checking/savings/credit accounts.
- **Not validating security type values:** Security.type comes from Plaid/statements and may have unexpected values. Use type mapping with fallbacks.
- **Mixing holdings across time periods:** Holdings represent point-in-time snapshots. Don't mix old and new holdings in calculations.

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Stock price APIs | Custom scraper or unofficial APIs | Alpha Vantage (official free tier) | Official NASDAQ vendor, reliable, documented rate limits, better than yfinance |
| Asset allocation chart | Custom SVG/Canvas drawing | Recharts PieChart (already in stack) | React-native, accessible, customizable, already used for other charts |
| Unrealized gains calculation | Complex manual formulas | Simple subtraction: currentValue - costBasis | Standard accounting formula, no need to overcomplicate |
| Portfolio performance tracking | Custom return calculations | Start with basic unrealized gains | Total return calculations require dividends/distributions data not in Phase 6 scope |

**Key insight:** The database schema is already built (Phase 1). This phase is primarily about data presentation — GraphQL resolvers to query existing data, React components to visualize it, and minimal business logic for aggregations.

## Common Pitfalls

### Pitfall 1: Assuming All Holdings Have Cost Basis

**What goes wrong:** Queries or calculations fail when costBasis is null, breaking portfolio views.

**Why it happens:** Cost basis is optional in schema (nullable field). Statement imports may not include it, or users may not have purchase records.

**How to avoid:**
- Always check `if (holding.costBasis)` before calculations
- Provide fallback behavior: assume break-even (costBasis = currentValue) or show "—" in UI
- Filter out null cost basis holdings when calculating total portfolio gains
- Show warning icon next to holdings missing cost basis

**Warning signs:** "Cannot read property of null" errors; portfolio total gains wildly inaccurate.

### Pitfall 2: Rate Limiting Stock Price APIs

**What goes wrong:** Free tier APIs (Alpha Vantage 25/day, Finnhub 60/min) get exhausted quickly, breaking price updates.

**Why it happens:** Fetching prices for every holding on every page load without caching.

**How to avoid:**
- Cache prices in Redis with 1-hour TTL during market hours, 24-hour TTL after close
- Batch price fetches: one API call per ticker, not per holding
- Use statement-imported prices as baseline; API refresh is optional enhancement
- Show last updated timestamp; don't fetch on every render
- Implement retry logic with exponential backoff

**Warning signs:** API 429 errors; users see stale prices; price updates stop working.

### Pitfall 3: Ignoring Security Type Variations

**What goes wrong:** Asset allocation chart shows empty or miscategorized assets because security types don't match expected values.

**Why it happens:** Plaid and statement parsers may use different type values (e.g., "stock" vs "equity", "etf" vs "ETF").

**How to avoid:**
```typescript
// Normalize security types to standard values
function normalizeSecurityType(type: string): string {
  const normalized = type.toLowerCase().trim();

  const typeMap: Record<string, string> = {
    'stock': 'equity',
    'stocks': 'equity',
    'equities': 'equity',
    'etf': 'etf',
    'etfs': 'etf',
    'mutual fund': 'mutual fund',
    'mutual funds': 'mutual fund',
    'bond': 'bond',
    'bonds': 'bond',
    'cash': 'cash',
    'money market': 'cash',
  };

  return typeMap[normalized] || 'other';
}
```

**Warning signs:** Asset allocation chart missing categories; "other" category unexpectedly large.

### Pitfall 4: Not Handling Empty Portfolio States

**What goes wrong:** Portfolio page shows errors or blank screens when user has no investment accounts or holdings.

**Why it happens:** Components assume data exists; don't handle empty arrays gracefully.

**How to avoid:**
- Check `if (!holdings || holdings.length === 0)` in all components
- Show actionable empty states: "Add an investment account to track your portfolio"
- Distinguish between loading, error, and empty data states
- Allow users to manually add holdings if statements not available

**Warning signs:** Blank screens; console errors on portfolio page; user confusion about why page is empty.

### Pitfall 5: Mixing Net Worth and Portfolio Calculations

**What goes wrong:** Double-counting investment account values in both net worth and portfolio views.

**Why it happens:** Net worth includes all account balances; portfolio shows holdings detail. Values should match but serve different purposes.

**How to avoid:**
- Net worth: sum of `Account.balance` for all account types including INVESTMENT
- Portfolio: sum of `InvestmentHolding.institutionValue` for holdings detail
- Ensure INVESTMENT account balance equals sum of its holdings
- Update account balance when holdings change via statement imports
- Document relationship: portfolio is drill-down view of INVESTMENT accounts

**Warning signs:** Net worth and portfolio totals don't match; users report discrepancies.

### Pitfall 6: Performance Period Calculations Without Historical Data

**What goes wrong:** "1 month return" or "YTD performance" calculations fail because holdings don't have historical snapshots.

**Why it happens:** Current schema only stores current holdings, not historical positions or prices.

**How to avoid:**
- Phase 6 scope: only show unrealized gains from cost basis (all-time performance)
- Don't promise time-period returns (1M, 3M, YTD) without historical holding snapshots
- If period returns needed, create HoldingSnapshot model (similar to NetWorthSnapshot)
- Alternative: calculate from transaction history (buys/sells) if available
- Be explicit in UI: "Total Return" not "1 Month Return"

**Warning signs:** Feature requests for period returns; user confusion about performance metrics.

## Code Examples

Verified patterns from official sources:

### GraphQL Type Definitions
```typescript
// Source: Existing account.ts pattern + Prisma schema

import { gql } from 'graphql-tag';

export const investmentTypeDefs = gql`
  type InvestmentHolding {
    id: ID!
    accountId: String!
    account: Account!
    securityId: String!
    security: Security!
    quantity: Decimal!
    institutionPrice: Decimal!
    institutionValue: Decimal!
    costBasis: Decimal
    unrealizedGain: Decimal!
    unrealizedGainPercent: Decimal!
    isoCurrencyCode: String
    createdAt: DateTime!
    updatedAt: DateTime!
  }

  type Security {
    id: ID!
    plaidSecurityId: String!
    name: String!
    tickerSymbol: String
    type: String!
    closePrice: Decimal
    closePriceAsOf: DateTime
    sector: String
    industry: String
    createdAt: DateTime!
    updatedAt: DateTime!
  }

  type AssetAllocation {
    type: String!
    value: Decimal!
    percentage: Decimal!
    color: String!
  }

  type PortfolioAccount {
    id: ID!
    name: String!
    institution: String!
    value: Decimal!
    holdingCount: Int!
  }

  type Portfolio {
    totalValue: Decimal!
    totalCostBasis: Decimal!
    totalGain: Decimal!
    totalGainPercent: Decimal!
    holdingCount: Int!
    accountCount: Int!
    accounts: [PortfolioAccount!]!
  }

  extend type Query {
    portfolio: Portfolio!
    assetAllocation: [AssetAllocation!]!
    holdings(accountId: ID): [InvestmentHolding!]!
  }
`;
```

### GraphQL Queries (Frontend)
```typescript
// Source: Existing queries pattern (accounts.ts, netWorth.ts)

import { gql } from '@apollo/client';

export const GET_PORTFOLIO = gql`
  query GetPortfolio {
    portfolio {
      totalValue
      totalCostBasis
      totalGain
      totalGainPercent
      holdingCount
      accountCount
      accounts {
        id
        name
        institution
        value
        holdingCount
      }
    }
  }
`;

export const GET_ASSET_ALLOCATION = gql`
  query GetAssetAllocation {
    assetAllocation {
      type
      value
      percentage
      color
    }
  }
`;

export const GET_HOLDINGS = gql`
  query GetHoldings($accountId: ID) {
    holdings(accountId: $accountId) {
      id
      quantity
      institutionPrice
      institutionValue
      costBasis
      unrealizedGain
      unrealizedGainPercent
      security {
        name
        tickerSymbol
        type
        closePrice
        closePriceAsOf
      }
      account {
        id
        name
      }
    }
  }
`;
```

### Portfolio Page Component
```typescript
// Source: Pattern from net-worth/page.tsx

'use client';

import { useState } from 'react';
import PortfolioSummary from '@/components/portfolio/PortfolioSummary';
import AssetAllocationChart from '@/components/charts/AssetAllocationChart';
import HoldingsTable from '@/components/portfolio/HoldingsTable';
import { usePortfolio, useAssetAllocation, useHoldings } from '@/hooks/usePortfolio';

export default function PortfolioPage() {
  const { portfolio, loading: portfolioLoading, error: portfolioError } = usePortfolio();
  const { allocation, loading: allocationLoading } = useAssetAllocation();
  const { holdings, loading: holdingsLoading } = useHoldings();

  // Loading state
  if (portfolioLoading && !portfolio) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-gray-500 dark:text-gray-400">Loading portfolio data...</div>
      </div>
    );
  }

  // Error state
  if (portfolioError) {
    return (
      <div className="space-y-6">
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <p className="text-red-800 dark:text-red-300">
            Failed to load portfolio data. Please try again.
          </p>
        </div>
      </div>
    );
  }

  const hasHoldings = portfolio?.holdingCount > 0;

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Investment Portfolio
        </h1>
        <p className="text-gray-500 dark:text-gray-400">
          View your investment holdings with performance and allocation insights
        </p>
      </div>

      {/* Summary */}
      {portfolio && (
        <PortfolioSummary
          totalValue={portfolio.totalValue}
          totalGain={portfolio.totalGain}
          totalGainPercent={portfolio.totalGainPercent}
          holdingCount={portfolio.holdingCount}
          accountCount={portfolio.accountCount}
        />
      )}

      {/* Empty state */}
      {!hasHoldings && (
        <div className="bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-lg p-8 text-center">
          <svg
            className="w-12 h-12 mx-auto mb-4 text-gray-400 dark:text-gray-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z"
            />
          </svg>
          <p className="text-gray-600 dark:text-gray-400 font-medium mb-2">
            No Investment Holdings
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-500">
            Upload a brokerage statement or add holdings manually to start tracking your portfolio
          </p>
        </div>
      )}

      {/* Main content grid */}
      {hasHoldings && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Asset allocation chart */}
          <div className="lg:col-span-1">
            <AssetAllocationChart
              data={allocation}
              loading={allocationLoading}
            />
          </div>

          {/* Holdings table */}
          <div className="lg:col-span-2">
            <HoldingsTable
              holdings={holdings}
              loading={holdingsLoading}
            />
          </div>
        </div>
      )}
    </div>
  );
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Manual portfolio tracking in spreadsheets | Automated statement imports | 2020s+ | Reduced data entry errors, real-time accuracy |
| Daily price scraping from broker sites | Official APIs (Plaid, Alpha Vantage) | 2015+ | Reliable data, no scraping breakage, rate-limited but documented |
| Complex return calculations with dividends | Focus on unrealized gains for simplicity | Ongoing trend | Easier to implement, sufficient for most users, clearer tax implications |
| Custom chart libraries (D3, Chart.js) | React-native chart libraries (Recharts, Victory) | React era (2016+) | Better React integration, declarative syntax, smaller bundle size |

**Deprecated/outdated:**
- **yfinance (Yahoo Finance unofficial API)**: Frequently breaks, rate limiting issues, not production-ready in 2026
- **IEX Cloud**: Shut down August 2024, Alpha Vantage now recommended replacement
- **Client-side price scraping**: Blocked by CORS, unreliable, violates ToS

**Current best practices (2026):**
- Alpha Vantage for free stock prices (official NASDAQ vendor, 25 req/day free tier)
- Statement imports as primary data source (no API dependency, accurate for tax records)
- Recharts for React chart rendering (most popular, well-maintained, React-native)
- Redis caching for price data (reduce API calls, improve performance)

## Open Questions

Things that couldn't be fully resolved:

1. **Price refresh frequency and source**
   - What we know: Alpha Vantage free tier allows 25 requests/day; statements provide baseline prices
   - What's unclear: Should prices auto-refresh daily, on-demand, or only from statements?
   - Recommendation: Start statement-only (Phase 6), add optional manual refresh button, defer automatic daily refresh to future phase. Document that prices reflect last statement import.

2. **Cost basis tracking for statement imports**
   - What we know: Schema supports costBasis field; unrealized gains require it
   - What's unclear: How reliably do statement parsers extract cost basis? CSV formats vary.
   - Recommendation: Make cost basis optional in UI; show "—" when missing. Build statement parser to extract if present, but don't block holdings without it. Allow manual cost basis entry.

3. **Performance metrics scope**
   - What we know: Phase 6 requirements mention "total return and period changes"
   - What's unclear: Period changes require historical snapshots (like NetWorthSnapshot model). Is this in scope?
   - Recommendation: Phase 6 shows unrealized gains (all-time from cost basis). Period performance (1M, 3M, YTD) requires HoldingSnapshot model — defer to future phase or mark as stretch goal.

4. **Multi-currency support**
   - What we know: Schema has isoCurrencyCode field on holdings
   - What's unclear: Should portfolio aggregate across currencies? Convert to USD? Show separately?
   - Recommendation: Phase 6 assumes single currency (USD). Filter out or warn on holdings with non-USD isoCurrencyCode. Multi-currency aggregation is future enhancement.

5. **Real-time vs. delayed prices**
   - What we know: Free APIs provide 15-minute delayed prices; real-time requires paid tiers
   - What's unclear: Do users need real-time for portfolio tracking (vs. trading)?
   - Recommendation: Delayed prices (statement imports or daily API refresh) are sufficient for portfolio tracking. Real-time is trading use case, not in SpendWise scope. Document price delay in UI.

## Sources

### Primary (HIGH confidence)
- [Alpha Vantage API: The Complete 2026 Guide](https://alphalog.ai/blog/alphavantage-api-complete-guide) - Official API documentation and free tier details
- [Best Free Finance APIs 2025](https://noteapiconnector.com/best-free-finance-apis) - Comparison of Alpha Vantage, Finnhub, EODHD, FMP
- [Recharts GitHub Repository](https://github.com/recharts/recharts) - Official Recharts documentation and examples
- [Recharts PieChart API](https://recharts.github.io/en-US/api/PieChart/) - PieChart component documentation
- [How to Calculate Unrealized Gain and Loss](https://www.fool.com/investing/how-to-calculate/unrealized-gain-and-loss-of-investment-assets/) - Standard unrealized gains formula
- Existing SpendWise codebase:
  - `spendwise-api/prisma/schema.prisma` - InvestmentHolding and Security models
  - `spendwise/src/components/charts/SpendingPieChart.tsx` - Recharts pie chart pattern
  - `spendwise/src/hooks/useNetWorth.ts` - Custom hook pattern for GraphQL queries
  - `spendwise-api/src/schema/resolvers/analytics.ts` - Aggregation resolver pattern

### Secondary (MEDIUM confidence)
- [Create a Pie Chart Using Recharts in ReactJS - GeeksforGeeks](https://www.geeksforgeeks.org/reactjs/create-a-pie-chart-using-recharts-in-reactjs/) - Implementation examples
- [Best Chart Libraries for React Projects in 2026](https://weavelinx.com/best-chart-libraries-for-react-projects-in-2026/) - Library comparison and trends
- [Beyond yFinance: Comparing Financial Data APIs](https://medium.com/@trading.dude/beyond-yfinance-comparing-the-best-financial-data-apis-for-traders-and-developers-06a3b8bc07e2) - API alternatives analysis
- [Financial Data APIs 2025: Complete Guide](https://www.ksred.com/the-complete-guide-to-financial-data-apis-building-your-own-stock-market-data-pipeline-in-2025/) - API integration patterns
- [How are cost basis numbers calculated?](https://help.coinledger.io/en/articles/10302709-how-are-cost-basis-numbers-in-the-portfolio-tracker-calculated) - Cost basis calculation specifics

### Tertiary (LOW confidence)
- Various blog posts about portfolio tracking UX - General patterns, not SpendWise-specific
- Investment app screenshots from competitors - Visual inspiration but not technical guidance

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Recharts already in use, GraphQL patterns established, database schema exists
- Architecture: HIGH - Clear patterns from existing net worth and analytics features; minimal new concepts
- Price data source: MEDIUM - Multiple viable options; decision depends on product priorities (cost vs. accuracy)
- Performance metrics: MEDIUM - Requirements mention "period changes" but unclear if historical snapshots are in scope

**Research date:** 2026-02-02
**Valid until:** ~90 days (stable domain; stock APIs and Recharts are mature, but API free tier limits may change)

**Dependencies:**
- Phase 1 complete: InvestmentHolding and Security models exist in database
- Statement import system functional: Holdings can be populated from uploaded statements
- Recharts 2.12.2 installed: No new frontend dependencies needed
- Apollo Client + GraphQL patterns established: Follow existing query/resolver patterns
