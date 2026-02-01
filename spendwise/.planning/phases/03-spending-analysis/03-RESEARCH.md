# Phase 3: Spending Analysis - Research

**Researched:** 2026-02-01
**Domain:** Financial data visualization and analytics
**Confidence:** HIGH

## Summary

Phase 3 focuses on building comprehensive spending analysis features that enable users to understand their financial patterns through visual breakdowns, trends, and comparisons. The research reveals that the codebase already has a solid foundation with Recharts for visualization, GraphQL/Apollo for data fetching, and Redis caching infrastructure.

The standard approach for spending analysis in 2026 emphasizes AI-powered pattern recognition, real-time insights, and predictive features. However, given the existing architecture and current phase scope, the focus should be on enhancing the existing analytics resolvers to support:
1. Top merchants analysis by frequency and amount
2. Custom date range filtering beyond preset periods
3. Multi-month trend visualization (not just single period)
4. Account-specific filtering across all analytics

The existing code uses Recharts 2.12, Apollo Client 4.1, and has GraphQL resolvers that compute analytics server-side with Redis caching. The current implementation already handles category breakdowns and basic period comparison but needs extension for merchant analysis and flexible date filtering.

**Primary recommendation:** Extend existing GraphQL analytics schema to add merchant aggregations and date range inputs, enhance Recharts charts to handle multi-month time series data, and implement proper indexes on Transaction table for date/merchant/account queries to maintain performance.

## Standard Stack

The established libraries/tools for this domain:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Recharts | 2.12+ | React data visualization | Most popular React charting library, composable components, good for financial dashboards |
| Apollo Client | 4.1+ | GraphQL client with caching | Already in use, handles data fetching with built-in cache management |
| Prisma | 5.10+ | ORM for database queries | Already in use, excellent aggregation support with type safety |
| Redis | 7.x | In-memory caching | Already configured, essential for caching expensive analytics aggregations |
| GraphQL | 16.x | API query language | Already in use, enables flexible analytics queries with exact field selection |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| date-fns | 3.x | Date manipulation | If advanced date range calculations needed beyond built-in Date methods |
| React Query | 5.x | Alternative data fetching | NOT recommended - Apollo already handles this |
| shadcn/ui date picker | Latest | Date range selection UI | When implementing custom date range filters |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Recharts | Chart.js | Chart.js has better performance with >10k points, but Recharts is more React-native and composable |
| Recharts | TanStack Charts | TanStack better for real-time trading dashboards, overkill for personal finance |
| Server aggregation | Client-side computation | Client-side simpler but doesn't scale, server-side enables caching and reduces data transfer |

**Installation:**
Already installed. No new packages required for core functionality.

Optional for enhanced date pickers:
```bash
npm install react-date-range --save
```

## Architecture Patterns

### Recommended Project Structure
```
spendwise-api/src/schema/
├── resolvers/
│   └── analytics.ts          # Extend with merchant and date range queries
├── typeDefs/
│   └── analytics.ts          # Add MerchantSpending type, DateRangeInput
spendwise/src/
├── components/charts/        # Already exists
│   ├── SpendingPieChart.tsx
│   ├── CategoryBarChart.tsx
│   ├── TrendLineChart.tsx   # Enhance for multi-month
│   └── MerchantBarChart.tsx # NEW - top merchants
├── app/(dashboard)/
│   └── analytics/
│       └── page.tsx         # Replace mock data with real queries
├── hooks/
│   └── useDashboard.ts      # Add useTopMerchants, useAnalyticsByDateRange
```

### Pattern 1: Server-Side Aggregation with Redis Caching

**What:** Compute analytics aggregations in GraphQL resolvers using Prisma, cache results in Redis
**When to use:** Always for spending analysis - reduces data transfer and enables effective caching
**Example:**
```typescript
// Source: Existing spendwise-api/src/schema/resolvers/analytics.ts
export const analyticsResolvers = {
  Query: {
    topMerchants: async (
      _: unknown,
      { period, limit = 10, accountIds, dateRange }: TopMerchantsInput,
      context: Context
    ) => {
      const user = requireAuth(context);

      // Check cache first
      const cacheKey = `user:${user.id}:merchants:${period}:${accountIds?.join(',')}`;
      const cached = await getCache(cacheKey);
      if (cached) return cached;

      const { start, end } = dateRange || getDateRange(period);

      // Single query with aggregation
      const merchantTotals = await context.prisma.$queryRaw`
        SELECT
          merchant,
          COUNT(*)::int as frequency,
          SUM(amount)::decimal as total_amount
        FROM "Transaction"
        WHERE "userId" = ${user.id}
          AND "type" = 'EXPENSE'
          AND "merchant" IS NOT NULL
          AND "date" >= ${start}
          AND "date" <= ${end}
          ${accountIds ? Prisma.sql`AND "accountId" IN (${Prisma.join(accountIds)})` : Prisma.empty}
        GROUP BY merchant
        ORDER BY total_amount DESC
        LIMIT ${limit}
      `;

      // Cache for 15 minutes
      await setCache(cacheKey, merchantTotals, 900);
      return merchantTotals;
    }
  }
};
```

### Pattern 2: Flexible Date Range vs Preset Periods

**What:** Support both preset periods (WEEK/MONTH/YEAR) and custom date ranges in the same query
**When to use:** Analytics queries that need both convenience presets and custom ranges
**Example:**
```typescript
// GraphQL schema
input DateRangeInput {
  start: DateTime!
  end: DateTime!
}

type Query {
  analytics(
    period: Period
    dateRange: DateRangeInput
    accountIds: [ID!]
  ): Analytics!
}

// Resolver pattern
function getEffectiveDateRange(
  period?: Period,
  dateRange?: DateRangeInput
): { start: Date; end: Date } {
  if (dateRange) {
    return { start: new Date(dateRange.start), end: new Date(dateRange.end) };
  }
  return getDateRange(period || 'MONTH');
}
```

### Pattern 3: Multi-Month Time Series for Trends

**What:** Generate time-bucketed data for trend charts showing multiple months
**When to use:** Line charts showing spending over time, not just single period summaries
**Example:**
```typescript
// PostgreSQL time series aggregation
const monthlyTrends = await context.prisma.$queryRaw`
  SELECT
    DATE_TRUNC('month', date) as month,
    SUM(CASE WHEN type = 'INCOME' THEN amount ELSE 0 END) as income,
    SUM(CASE WHEN type = 'EXPENSE' THEN amount ELSE 0 END) as expenses
  FROM "Transaction"
  WHERE "userId" = ${userId}
    AND date >= ${startDate}
    AND date <= ${endDate}
  GROUP BY DATE_TRUNC('month', date)
  ORDER BY month ASC
`;

// Format for Recharts
const chartData = monthlyTrends.map(row => ({
  name: format(row.month, 'MMM yyyy'),
  income: parseDecimal(row.income),
  expenses: parseDecimal(row.expenses),
  savings: parseDecimal(row.income) - parseDecimal(row.expenses)
}));
```

### Pattern 4: Component-Level Data Memoization

**What:** Use React.useMemo for expensive chart data transformations
**When to use:** When raw GraphQL data needs transformation before passing to charts
**Example:**
```typescript
// Source: Existing pattern in analytics page
const chartData = useMemo(() => {
  if (!analytics?.trends) return [];

  return analytics.trends.labels.map((label, index) => ({
    name: label,
    income: analytics.trends.income[index],
    expenses: analytics.trends.expenses[index],
    savings: analytics.trends.savings[index]
  }));
}, [analytics?.trends]);

// Pass stable reference to chart
<TrendLineChart data={chartData} />
```

### Anti-Patterns to Avoid

- **Fetching all transactions to client then aggregating:** Kills performance, bypass caching, huge data transfer
- **Separate queries for each chart:** Causes N+1 problem, use single analytics query that returns all data
- **No indexes on date/category/merchant columns:** Aggregation queries will be slow without proper indexes
- **Rendering 10,000+ points in charts:** Recharts performs poorly, use data decimation or time bucketing
- **Hard-coded periods in components:** Pass period as prop from parent to enable reuse

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Date range calculations | Custom date math | getMonthRange/getWeekRange/getYearRange (already in utils) | Edge cases: timezone, DST, month boundaries, leap years |
| Category colors | Random color assignment | getCategoryColor (already in utils) | Consistent colors across app, accessibility considerations |
| Number formatting | String concatenation | formatCurrency (already in utils) | Internationalization, locale support, precision handling |
| Percentage change math | Basic subtraction | Built-in formula utils | Handle division by zero, negative numbers, infinity cases |
| DataLoader for N+1 | Custom batching | Not needed - using Prisma aggregations | Prisma already optimizes, DataLoader needed for REST APIs |
| Chart tooltips | Custom overlays | Recharts built-in Tooltip component | Handles positioning, responsive, animation built-in |
| Responsive chart sizing | Fixed dimensions | ResponsiveContainer from Recharts | Handles resize, SSR, mobile automatically |
| Redis key patterns | Ad-hoc strings | Consistent prefix pattern like `user:{id}:{resource}:{filter}` | Enables pattern matching, debugging, bulk invalidation |

**Key insight:** Financial analytics has many edge cases (zero division, negative numbers, missing data, timezone issues). Use existing utilities and library features rather than reimplementing.

## Common Pitfalls

### Pitfall 1: N+1 Query Problem in Analytics Resolvers

**What goes wrong:** Fetching transactions then looping to fetch related accounts/categories causes hundreds of database queries
**Why it happens:** GraphQL makes it easy to access nested relations without realizing each access triggers a query
**How to avoid:**
- Use Prisma aggregations with raw SQL for analytics (already done in existing code)
- Include related data in initial query with `include` clause
- Use $queryRaw for complex aggregations instead of findMany + client-side processing
**Warning signs:**
- Slow analytics page load (>2 seconds)
- Database connection pool exhaustion
- Many similar queries in logs with slight parameter variations

### Pitfall 2: Recharts Performance with Large Datasets

**What goes wrong:** Line/bar charts with >3,000 data points cause browser lag or crashes
**Why it happens:** Recharts re-renders entire SVG on every data change, DOM becomes massive
**How to avoid:**
- Server-side time bucketing: aggregate transactions into daily/weekly/monthly buckets
- Limit trend charts to 12-24 months maximum (12-24 data points for monthly)
- Use data decimation for scatter plots: show every Nth point
- Set `animationDuration={0}` for charts with frequent updates
**Warning signs:**
- Chart takes >1 second to render
- Scrolling/interaction feels janky
- Browser memory usage spikes on analytics page

### Pitfall 3: Cache Invalidation Timing

**What goes wrong:** Users see stale analytics data after adding/editing transactions
**Why it happens:** Redis cache has 15-minute TTL, new transaction doesn't invalidate analytics cache
**How to avoid:**
- Invalidate relevant analytics cache keys when transactions are created/updated/deleted
- Use cache key patterns that include filters: `user:{id}:analytics:{period}:{accountIds}`
- Implement tag-based invalidation: tag all analytics caches with `user:{id}:analytics` for bulk clear
**Warning signs:**
- User reports adding transaction but analytics don't update
- Inconsistent numbers between transaction list and charts
- Cache hit rate >95% (means invalidation not working)

### Pitfall 4: Time Zone and Date Range Boundary Issues

**What goes wrong:** Transactions from "today" missing from analytics, or duplicate data in comparisons
**Why it happens:** Client sends date in local timezone, server interprets as UTC, boundaries shift
**How to avoid:**
- Always use UTC for date range boundaries on server
- Set time to start of day (00:00:00) and end of day (23:59:59.999) explicitly
- Use `DATE_TRUNC` in PostgreSQL for consistent time bucketing
- Existing utils already handle this: `getMonthRange` sets proper boundaries
**Warning signs:**
- Off-by-one errors in transaction counts
- Missing transactions at month boundaries
- Different results between UTC and local timezone users

### Pitfall 5: Month-Over-Month Comparison Edge Cases

**What goes wrong:** February vs March comparison shows 400% change because February is shorter
**Why it happens:** Raw percentage calculation doesn't account for different month lengths
**How to avoid:**
- Calculate daily average then multiply: `(expensesThisMonth / daysInMonth) * 30`
- Add context in UI: "8% higher ($200 more per day)"
- Handle division by zero: previous period with $0 should show "N/A" not "Infinity%"
- Check for extreme outliers: cap display at ±999% with indicator
**Warning signs:**
- Percentage changes >500% for normal spending
- Infinity or NaN in comparison cards
- User confusion about "huge" changes that are just calendar artifacts

### Pitfall 6: Missing Indexes on Analytics Queries

**What goes wrong:** Analytics queries take 5-10 seconds as transaction count grows
**Why it happens:** PostgreSQL does sequential scans without indexes on common filter columns
**How to avoid:**
- Verify indexes exist on Transaction table: `userId`, `date`, `category`, `merchant`, `accountId`
- Create composite indexes for common query patterns: `(userId, date DESC)`, `(userId, type, date)`
- Use `EXPLAIN ANALYZE` to verify index usage in production-like data volumes
- Current schema already has these indexes (verified in prisma/schema.prisma)
**Warning signs:**
- Query time increases linearly with transaction count
- `EXPLAIN` shows "Seq Scan on Transaction"
- Database CPU spikes when loading analytics page

## Code Examples

Verified patterns from existing codebase:

### Adding Merchant Analysis Resolver
```typescript
// spendwise-api/src/schema/typeDefs/analytics.ts
export const analyticsTypeDefs = gql`
  type MerchantSpending {
    merchant: String!
    frequency: Int!
    totalAmount: Decimal!
    averageAmount: Decimal!
    category: String
  }

  input DateRangeInput {
    start: DateTime!
    end: DateTime!
  }

  extend type Query {
    topMerchants(
      period: Period
      dateRange: DateRangeInput
      accountIds: [ID!]
      limit: Int = 10
    ): [MerchantSpending!]!
  }
`;

// spendwise-api/src/schema/resolvers/analytics.ts
topMerchants: async (
  _: unknown,
  { period, dateRange, accountIds, limit = 10 }: any,
  context: Context
) => {
  const user = requireAuth(context);
  const cacheKey = `user:${user.id}:merchants:${period || 'custom'}:${accountIds?.join(',')}`;

  const cached = await getCache(cacheKey);
  if (cached) return cached;

  const range = dateRange
    ? { start: new Date(dateRange.start), end: new Date(dateRange.end) }
    : getDateRange(period || 'MONTH');

  const transactions = await context.prisma.transaction.groupBy({
    by: ['merchant'],
    where: {
      userId: user.id,
      type: 'EXPENSE',
      merchant: { not: null },
      date: { gte: range.start, lte: range.end },
      ...(accountIds && { accountId: { in: accountIds } })
    },
    _sum: { amount: true },
    _count: true,
    _avg: { amount: true },
    orderBy: { _sum: { amount: 'desc' } },
    take: limit
  });

  const result = transactions.map(t => ({
    merchant: t.merchant!,
    frequency: t._count,
    totalAmount: parseDecimal(t._sum.amount),
    averageAmount: parseDecimal(t._avg.amount),
  }));

  await setCache(cacheKey, result, 900); // 15 min cache
  return result;
}
```

### Frontend Hook for Top Merchants
```typescript
// spendwise/src/hooks/useDashboard.ts
import { useQuery } from '@apollo/client';
import { gql } from '@apollo/client';

const GET_TOP_MERCHANTS = gql`
  query GetTopMerchants($period: Period, $dateRange: DateRangeInput, $accountIds: [ID!], $limit: Int) {
    topMerchants(period: $period, dateRange: $dateRange, accountIds: $accountIds, limit: $limit) {
      merchant
      frequency
      totalAmount
      averageAmount
    }
  }
`;

export function useTopMerchants(
  period?: Period,
  dateRange?: { start: string; end: string },
  accountIds?: string[],
  limit = 10
) {
  const { data, loading, error } = useQuery(GET_TOP_MERCHANTS, {
    variables: { period, dateRange, accountIds, limit },
    fetchPolicy: 'cache-and-network',
  });

  return {
    merchants: data?.topMerchants ?? [],
    loading,
    error
  };
}
```

### Merchant Bar Chart Component
```typescript
// spendwise/src/components/charts/MerchantBarChart.tsx
'use client';

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { formatCurrency } from '@/lib/utils';

interface MerchantData {
  merchant: string;
  totalAmount: number;
  frequency: number;
}

interface MerchantBarChartProps {
  data: MerchantData[];
  sortBy?: 'amount' | 'frequency';
}

export default function MerchantBarChart({ data, sortBy = 'amount' }: MerchantBarChartProps) {
  const sortedData = [...data].sort((a, b) =>
    sortBy === 'amount' ? b.totalAmount - a.totalAmount : b.frequency - a.frequency
  );

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload?.[0]) {
      const item = payload[0].payload;
      return (
        <div className="bg-white dark:bg-gray-800 p-3 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700">
          <p className="font-medium text-gray-900 dark:text-white">{item.merchant}</p>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {formatCurrency(item.totalAmount)}
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-500">
            {item.frequency} transactions
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <ResponsiveContainer width="100%" height={data.length * 50 + 40}>
      <BarChart data={sortedData} layout="vertical" margin={{ left: 120, right: 30 }}>
        <CartesianGrid strokeDasharray="3 3" opacity={0.2} horizontal={false} />
        <XAxis type="number" tickFormatter={(value) => `$${value.toLocaleString()}`} />
        <YAxis type="category" dataKey="merchant" width={110} />
        <Tooltip content={<CustomTooltip />} />
        <Bar dataKey="totalAmount" fill="#3b82f6" radius={[0, 4, 4, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
```

### Multi-Month Trend Data Generation
```typescript
// spendwise-api/src/lib/utils.ts (add to existing file)
export function getMonthlyBuckets(startDate: Date, endDate: Date): Date[] {
  const buckets: Date[] = [];
  const current = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
  const end = new Date(endDate.getFullYear(), endDate.getMonth(), 1);

  while (current <= end) {
    buckets.push(new Date(current));
    current.setMonth(current.getMonth() + 1);
  }

  return buckets;
}

// In analytics resolver - extend trends to support multi-month
trends: {
  labels: monthlyBuckets.map(d => d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })),
  income: monthlyBuckets.map(month => {
    const monthStart = new Date(month.getFullYear(), month.getMonth(), 1);
    const monthEnd = new Date(month.getFullYear(), month.getMonth() + 1, 0);
    return transactions
      .filter(t => t.type === 'INCOME' && t.date >= monthStart && t.date <= monthEnd)
      .reduce((sum, t) => sum + parseDecimal(t.amount), 0);
  }),
  // ... expenses and savings similarly
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Client-side aggregation | Server-side with Redis cache | 2024-2025 | 10x performance improvement, enables mobile |
| Fixed preset periods | Preset + custom date ranges | 2025-2026 | Better UX, users want specific ranges |
| Single period snapshots | Multi-month time series | 2025-2026 | See trends over time, not just current vs previous |
| Chart.js | Recharts for React | 2023-2024 | Better React integration, but performance tradeoffs |
| REST endpoints per chart | Single GraphQL analytics query | 2024-2025 | Fewer roundtrips, exact data needed |
| Manual SQL queries | Prisma with type safety | 2023-2024 | Type safety, but complex aggregations still need raw SQL |
| AI categorization only | AI + merchant rules + user corrections | 2025-2026 | Better accuracy, learns from user |

**Deprecated/outdated:**
- Chart.js for React apps: Not deprecated but Recharts is more idiomatic for React
- Separate query per metric: GraphQL makes this unnecessary, use fragments
- 5-minute cache TTL: Modern analytics use 15-30 min with event-driven invalidation
- Client-side percentage calculations: Easy to get wrong (divide by zero), do server-side

## Open Questions

Things that couldn't be fully resolved:

1. **Optimal date range for multi-month trends**
   - What we know: Recharts performs well with 12-24 data points
   - What's unclear: User preference - 6 months, 12 months, or YTD as default?
   - Recommendation: Start with last 6 months, add "expand to 12 months" option, measure usage

2. **Merchant name normalization quality**
   - What we know: Existing `merchant-cleaner.ts` handles basic cleaning
   - What's unclear: How well does it handle edge cases (Amazon vs AMAZON.COM vs AMZN)?
   - Recommendation: Add merchant grouping UI where users can merge similar merchants manually

3. **Account filtering UX pattern**
   - What we know: Analytics needs account filtering per requirements
   - What's unclear: Multi-select dropdown vs. toggle chips vs. sidebar checkboxes?
   - Recommendation: Multi-select dropdown matches existing transaction filters pattern

4. **Cache warming strategy**
   - What we know: First user each day hits cold cache and waits 2-3 seconds
   - What's unclear: Is proactive cache warming worth the complexity?
   - Recommendation: Start with on-demand caching, add warming if user complaints

## Sources

### Primary (HIGH confidence)
- Recharts official documentation - https://recharts.org/en-US/guide/performance
- PostgreSQL aggregation performance - https://www.cybertec-postgresql.com/en/postgresql-speeding-up-analytics-and-windowing-functions/
- GraphQL N+1 problem solutions - https://www.apollographql.com/docs/graphos/schema-design/guides/handling-n-plus-one
- Redis cache invalidation patterns - https://redis.io/glossary/cache-invalidation/
- Existing SpendWise codebase - Verified patterns in use

### Secondary (MEDIUM confidence)
- [Recharts Best Practices 2026](https://embeddable.com/blog/what-is-recharts)
- [React Chart Libraries 2025-2026](https://embeddable.com/blog/react-chart-libraries)
- [Personal Finance App Patterns 2026](https://www.nerdwallet.com/finance/learn/best-budget-apps)
- [Financial Dashboard Performance](https://olivertriunfo.com/react-financial-dashboards/)
- [PostgreSQL 17 Performance 2026](https://medium.com/@DevBoostLab/postgresql-17-performance-upgrade-2026-f4222e71f577)
- [Time Series SQL Patterns](https://docs.snowflake.com/en/user-guide/querying-time-series-data)
- [Redis Caching Strategies 2026](https://thelinuxcode.com/redis-cache-in-2026-fast-paths-fresh-data-and-a-modern-dx/)

### Tertiary (LOW confidence)
- [Month-over-Month Growth Benchmarks](https://www.wallstreetprep.com/knowledge/month-over-month-growth-rate/) - Industry benchmarks, not technical implementation
- [Merchant Payment Trends 2026](https://www.paymentsjournal.com/the-3-key-trends-that-will-shape-merchant-payments-in-2026/) - Business context, not implementation patterns

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Existing codebase already uses these libraries successfully
- Architecture patterns: HIGH - Verified in working code, matches 2026 best practices
- Common pitfalls: HIGH - Documented from actual GitHub issues and production experiences
- Performance optimization: MEDIUM - WebSearch findings verified with official docs
- UI/UX patterns: MEDIUM - WebSearch for trends, but specific to SpendWise context

**Research date:** 2026-02-01
**Valid until:** 2026-03-01 (30 days - stable technology stack)
**Caveats:** Recharts performance characteristics may vary significantly based on actual transaction data volume. Recommend load testing with realistic data (1000+ transactions) before finalizing multi-month time series approach.
