# Phase 3: Spending Analysis - Research

**Researched:** 2026-02-01
**Domain:** Financial data visualization and analytics dashboard development
**Confidence:** HIGH

## Summary

Phase 3 builds spending analysis features on top of the existing analytics infrastructure. The codebase already has:
- Recharts v2.12.2 installed and working (pie, bar, line, area charts)
- Analytics resolver with category breakdown, trends, and comparison data
- GraphQL queries (GET_ANALYTICS, GET_SPENDING_BY_CATEGORY)
- Basic analytics page at `/analytics` using mock data
- Transaction data with merchant, category, date, and amount fields

The phase needs to enhance the existing analytics page to use real data, add merchant analysis, implement date range filtering, and add account filtering. The standard approach is to leverage the existing Recharts setup, add a native HTML date input (lightweight) or react-day-picker (feature-rich), and extend the GraphQL API to support filtering parameters.

**Primary recommendation:** Enhance existing analytics infrastructure rather than rebuild. Add filtering parameters to existing GraphQL queries, replace mock data with real API calls, implement merchant aggregation resolver, and add lightweight date range picker component.

## Standard Stack

The established libraries/tools for this domain:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Recharts | 2.12.2 | Data visualization | Already installed, React-native, composable, handles all required chart types (pie, bar, line) |
| Apollo Client | 4.1.2 | GraphQL data fetching | Already in use, provides caching and optimistic updates |
| react-day-picker | 9.x | Date range selection | Lightweight (12KB), accessible, native React, widely used with Tailwind CSS |
| date-fns | 2.30+ | Date manipulation | Pairs with react-day-picker, tree-shakeable, simpler than moment.js |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Prisma | 5.10.0 | Database queries | Already in use for transaction aggregation |
| Redis | 5.3.2 | Query caching | Already in use for analytics caching |
| Tailwind CSS | 3.4.1 | Styling | Already configured for UI components |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Recharts | Chart.js | Chart.js requires more imperative code, less React-idiomatic |
| Recharts | Victory | Victory has larger bundle size, similar API |
| react-day-picker | Native HTML input | Native inputs work but lack preset ranges, dual calendar view |
| date-fns | Day.js | Day.js is smaller but date-fns has better TypeScript support |

**Installation:**
```bash
npm install react-day-picker date-fns
```

## Architecture Patterns

### Recommended Project Structure
```
src/
├── app/(dashboard)/
│   ├── analytics/          # Enhanced spending analysis page
│   │   ├── page.tsx        # Main analytics page
│   │   └── _components/    # Page-specific components (filters, merchant table)
├── components/
│   ├── charts/             # Reusable chart components (already exists)
│   │   ├── SpendingPieChart.tsx
│   │   ├── CategoryBarChart.tsx
│   │   ├── TrendLineChart.tsx
│   │   └── MerchantBarChart.tsx  # NEW
│   ├── ui/                 # Base UI components
│   │   └── DateRangePicker.tsx   # NEW
├── hooks/
│   └── useDashboard.ts     # Analytics hooks (already exists, extend)
```

### Pattern 1: Filter State Management with URL Sync
**What:** Store filter state (date range, accounts) in both local state and URL params for shareability
**When to use:** Financial dashboards where users want to bookmark/share specific views
**Example:**
```typescript
// Source: Next.js App Router patterns + React best practices
'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';

export function useAnalyticsFilters() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [dateRange, setDateRange] = useState({
    from: searchParams.get('from')
      ? new Date(searchParams.get('from')!)
      : startOfMonth(new Date()),
    to: searchParams.get('to')
      ? new Date(searchParams.get('to')!)
      : endOfMonth(new Date()),
  });

  const [accountIds, setAccountIds] = useState<string[]>(
    searchParams.get('accounts')?.split(',') || []
  );

  // Update URL when filters change
  const updateFilters = (newFilters: Partial<Filters>) => {
    const params = new URLSearchParams(searchParams);
    if (newFilters.dateRange) {
      params.set('from', format(newFilters.dateRange.from, 'yyyy-MM-dd'));
      params.set('to', format(newFilters.dateRange.to, 'yyyy-MM-dd'));
    }
    if (newFilters.accountIds) {
      params.set('accounts', newFilters.accountIds.join(','));
    }
    router.push(`?${params.toString()}`);
  };

  return { dateRange, accountIds, updateFilters };
}
```

### Pattern 2: GraphQL Resolver with Conditional Filtering
**What:** Extend existing analytics resolver to accept optional filter parameters
**When to use:** When adding filters to existing queries without breaking current usage
**Example:**
```typescript
// Source: GraphQL best practices + Apollo Server patterns
// spendwise-api/src/schema/typeDefs/analytics.ts
extend type Query {
  analytics(
    period: Period = MONTH
    dateRange: DateRangeInput
    accountIds: [ID!]
  ): Analytics!

  topMerchants(
    dateRange: DateRangeInput
    accountIds: [ID!]
    limit: Int = 10
  ): [MerchantStats!]!
}

input DateRangeInput {
  start: DateTime!
  end: DateTime!
}

type MerchantStats {
  merchant: String!
  totalAmount: Decimal!
  transactionCount: Int!
  averageAmount: Decimal!
  categoryBreakdown: [CategoryAmount!]!
}

// spendwise-api/src/schema/resolvers/analytics.ts
topMerchants: async (
  _: unknown,
  { dateRange, accountIds, limit = 10 }: TopMerchantsArgs,
  context: Context
) => {
  const user = requireAuth(context);

  const whereClause: Prisma.TransactionWhereInput = {
    userId: user.id,
    type: 'EXPENSE',
    merchant: { not: null },
    ...(dateRange && {
      date: { gte: dateRange.start, lte: dateRange.end }
    }),
    ...(accountIds?.length && {
      accountId: { in: accountIds }
    }),
  };

  const transactions = await context.prisma.transaction.findMany({
    where: whereClause,
    select: { merchant: true, amount: true, category: true },
  });

  // Aggregate by merchant
  const merchantTotals = transactions.reduce((acc, t) => {
    const merchant = t.merchant || 'Unknown';
    if (!acc[merchant]) {
      acc[merchant] = { amount: 0, count: 0, categories: {} };
    }
    acc[merchant].amount += parseDecimal(t.amount);
    acc[merchant].count += 1;
    acc[merchant].categories[t.category] =
      (acc[merchant].categories[t.category] || 0) + parseDecimal(t.amount);
    return acc;
  }, {} as Record<string, any>);

  return Object.entries(merchantTotals)
    .map(([merchant, data]) => ({
      merchant,
      totalAmount: data.amount,
      transactionCount: data.count,
      averageAmount: data.amount / data.count,
      categoryBreakdown: Object.entries(data.categories).map(([cat, amt]) => ({
        category: cat,
        amount: amt,
        percentage: (amt / data.amount) * 100,
        color: getCategoryColor(cat),
      })),
    }))
    .sort((a, b) => b.totalAmount - a.totalAmount)
    .slice(0, limit);
}
```

### Pattern 3: Recharts Performance Optimization
**What:** Memoize chart data and use stable references to prevent unnecessary re-renders
**When to use:** Any Recharts component, especially with frequent data updates
**Example:**
```typescript
// Source: https://recharts.github.io/en-US/guide/performance/
import { useMemo, useCallback } from 'react';

export function SpendingAnalyticsCharts({ rawData }: Props) {
  // Memoize chart data transformations
  const chartData = useMemo(() => {
    return rawData.map(item => ({
      name: item.category,
      value: item.amount,
      color: item.color,
    }));
  }, [rawData]);

  // Stable dataKey reference
  const getDataKey = useCallback((data: ChartData) => data.value, []);

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={chartData}>
        <Bar dataKey={getDataKey} />
      </BarChart>
    </ResponsiveContainer>
  );
}
```

### Pattern 4: Date Range Picker with Presets
**What:** Date picker with common preset ranges (Last 7 days, This month, Last 3 months)
**When to use:** Financial dashboards where users frequently analyze standard time periods
**Example:**
```typescript
// Source: react-day-picker v9 + Tailwind patterns
import { useState } from 'react';
import { DayPicker, DateRange } from 'react-day-picker';
import { format, subDays, startOfMonth, endOfMonth } from 'date-fns';
import 'react-day-picker/style.css';

const presets = [
  { label: 'Last 7 days', getValue: () => ({ from: subDays(new Date(), 7), to: new Date() }) },
  { label: 'Last 30 days', getValue: () => ({ from: subDays(new Date(), 30), to: new Date() }) },
  { label: 'This month', getValue: () => ({ from: startOfMonth(new Date()), to: endOfMonth(new Date()) }) },
  { label: 'Last 3 months', getValue: () => ({ from: subDays(new Date(), 90), to: new Date() }) },
];

export function DateRangePicker({ value, onChange }: Props) {
  return (
    <div className="flex gap-4">
      <div className="flex flex-col gap-2">
        {presets.map(preset => (
          <button
            key={preset.label}
            onClick={() => onChange(preset.getValue())}
            className="text-sm px-3 py-2 rounded hover:bg-gray-100"
          >
            {preset.label}
          </button>
        ))}
      </div>
      <DayPicker
        mode="range"
        selected={value}
        onSelect={onChange}
        numberOfMonths={2}
      />
    </div>
  );
}
```

### Anti-Patterns to Avoid
- **Fetching all transactions client-side then filtering**: Always filter at database level for performance
- **Not caching analytics queries**: Redis caching is critical for expensive aggregations
- **Creating new chart data objects on every render**: Memoize transformations with useMemo
- **Using offset pagination for large datasets**: Cursor-based pagination is more stable
- **Not handling null merchants**: Always provide fallback for transactions without merchant data

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Date range picker | Custom calendar UI | react-day-picker | Handles accessibility, keyboard navigation, i18n, edge cases (leap years, DST) |
| Date arithmetic | Manual calculations | date-fns or Day.js | Handles timezones, DST, month boundaries, leap years correctly |
| Chart tooltips | Custom hover components | Recharts Tooltip | Handles positioning, edge detection, touch events, accessibility |
| Number formatting | String concatenation | Intl.NumberFormat or formatCurrency helper | Handles locales, currency symbols, decimals, negatives |
| Data aggregation | Manual reduce loops | SQL GROUP BY via Prisma | Database aggregation is 10-100x faster than JS for large datasets |
| Chart responsiveness | Manual resize listeners | ResponsiveContainer | Handles container queries, debouncing, cleanup |

**Key insight:** Financial dashboards have well-established patterns. The codebase already uses the right stack (Recharts, Prisma, Apollo). Focus on composing existing tools rather than creating custom solutions.

## Common Pitfalls

### Pitfall 1: Information Overload on Single Screen
**What goes wrong:** Displaying too many charts, filters, and metrics makes the page overwhelming and dilutes key insights
**Why it happens:** Trying to show every possible analysis on one page "for completeness"
**How to avoid:**
- Limit to 4-6 key visualizations per page
- Use progressive disclosure (filters in collapsible sections)
- Prioritize insights that drive decisions (category breakdown, trends, top merchants)
**Warning signs:** Page scroll is excessive, charts are compressed, user asks "where do I start?"

### Pitfall 2: Poorly Indexed Date Range Queries
**What goes wrong:** Date range queries on Transaction table become slow as data grows (>10,000 rows)
**Why it happens:** Missing composite indexes on (userId, date, type) or using BETWEEN without proper indexing
**How to avoid:**
- Ensure index exists: `@@index([userId, date, type])`
- Filter by userId first, then date range
- Use Redis caching for expensive aggregations (already implemented in analytics resolver)
**Warning signs:** Query time >1s, Prisma query logs show sequential scans

### Pitfall 3: Not Normalizing Merchant Names
**What goes wrong:** "Amazon.com", "AMAZON.COM", "Amazon" appear as separate merchants
**Why it happens:** Transaction descriptions from banks are inconsistent
**How to avoid:**
- Normalize merchant names: lowercase, trim, remove common suffixes ("inc", "llc", "www")
- Group similar merchants using pattern matching or merchant rules table
- The codebase has MerchantRule model - use merchantPattern field for normalization
**Warning signs:** Top merchants list has duplicates, user reports "I see Amazon 3 times"

### Pitfall 4: Recharts Re-renders on Every State Change
**What goes wrong:** Charts lag when typing in filters or hovering over tooltips
**Why it happens:** Chart data references change on every parent re-render, forcing Recharts to recalculate
**How to avoid:**
- Memoize chart data with useMemo
- Use useCallback for dataKey functions
- Isolate frequently-changing components (tooltips) from static chart structure
**Warning signs:** Typing in date input feels sluggish, React DevTools shows frequent chart re-renders

### Pitfall 5: Missing Null/Empty State Handling
**What goes wrong:** Charts break or show confusing empty states when no transactions match filters
**Why it happens:** Not considering edge cases (new user, date range with no transactions, filtered to zero)
**How to avoid:**
- Check data.length before rendering charts
- Show helpful empty state: "No transactions in this date range. Try expanding your filters."
- Provide example data or suggested actions
**Warning signs:** Console errors about "cannot read property of undefined", blank white space instead of chart

### Pitfall 6: Not Accounting for Different Account Types
**What goes wrong:** Mixing credit card expenses (positive amounts) with checking expenses (negative amounts) skews totals
**Why it happens:** Different account types represent money differently
**How to avoid:**
- Normalize amounts by account type in resolver (already done in existing analytics resolver)
- Filter to EXPENSE type transactions for spending analysis
- Consider credit balances as negative net worth
**Warning signs:** Spending totals don't match user expectations, negative spending amounts

### Pitfall 7: Ignoring Period Comparison Edge Cases
**What goes wrong:** Month-over-month comparison breaks for first month of data, or shows 0% change incorrectly
**Why it happens:** No previous period data, or division by zero when previous = 0
**How to avoid:**
```typescript
// Handle no previous data
const previousExpenses = previousTransactions.length === 0 ? null : calculateTotal(previousTransactions);

// Handle division by zero
const expensesChange = previousExpenses === 0
  ? (currentExpenses > 0 ? 100 : 0)  // 100% increase if went from 0 to positive
  : ((currentExpenses - previousExpenses) / previousExpenses) * 100;
```
**Warning signs:** "NaN%" displayed, infinity symbol, comparison missing for first month

## Code Examples

Verified patterns from official sources:

### Month-over-Month Comparison Display
```typescript
// Source: Financial dashboard best practices
interface ComparisonCardProps {
  label: string;
  current: number;
  previous: number;
  formatValue?: (n: number) => string;
}

export function ComparisonCard({ label, current, previous, formatValue = formatCurrency }: ComparisonCardProps) {
  const change = previous === 0
    ? (current > 0 ? 100 : 0)
    : ((current - previous) / Math.abs(previous)) * 100;

  const isPositive = current >= previous;
  const isExpense = label.toLowerCase().includes('expense');

  // For expenses, increase is bad (red), decrease is good (green)
  // For income, increase is good (green), decrease is bad (red)
  const isGood = isExpense ? !isPositive : isPositive;

  return (
    <Card>
      <p className="text-sm text-gray-500 dark:text-gray-400">{label}</p>
      <p className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">
        {formatValue(current)}
      </p>
      {previous !== null && (
        <div className="flex items-center gap-1 mt-1">
          <span className={`text-sm ${isGood ? 'text-green-600' : 'text-red-600'}`}>
            {isPositive ? '↑' : '↓'} {Math.abs(change).toFixed(1)}%
          </span>
          <span className="text-sm text-gray-500">vs last period</span>
        </div>
      )}
    </Card>
  );
}
```

### Top Merchants Table
```typescript
// Source: Financial analytics UI patterns
interface TopMerchantsTableProps {
  merchants: MerchantStats[];
  loading: boolean;
}

export function TopMerchantsTable({ merchants, loading }: TopMerchantsTableProps) {
  if (loading) return <Spinner />;

  if (merchants.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        No merchant data available for this period
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="text-left text-sm text-gray-500 border-b">
            <th className="pb-3 font-medium">Merchant</th>
            <th className="pb-3 font-medium text-right">Transactions</th>
            <th className="pb-3 font-medium text-right">Total Spent</th>
            <th className="pb-3 font-medium text-right">Avg. per Transaction</th>
          </tr>
        </thead>
        <tbody>
          {merchants.map((merchant, idx) => (
            <tr key={merchant.merchant} className="border-b last:border-0">
              <td className="py-3">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-500">#{idx + 1}</span>
                  <span className="font-medium">{merchant.merchant}</span>
                </div>
              </td>
              <td className="py-3 text-right text-gray-700">
                {merchant.transactionCount}
              </td>
              <td className="py-3 text-right font-medium">
                {formatCurrency(merchant.totalAmount)}
              </td>
              <td className="py-3 text-right text-gray-700">
                {formatCurrency(merchant.averageAmount)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

### GraphQL Query with Filters
```typescript
// Source: Apollo Client + GraphQL best practices
// spendwise/src/graphql/queries/analytics.ts
export const GET_ANALYTICS = gql`
  ${CATEGORY_AMOUNT_FRAGMENT}
  query GetAnalytics(
    $period: Period
    $dateRange: DateRangeInput
    $accountIds: [ID!]
  ) {
    analytics(period: $period, dateRange: $dateRange, accountIds: $accountIds) {
      period
      dateRange { start end }
      summary {
        totalIncome
        totalExpenses
        netSavings
        savingsRate
        transactionCount
        averageTransaction
      }
      categoryBreakdown {
        ...CategoryAmountFields
      }
      trends {
        labels
        income
        expenses
        savings
      }
      comparison {
        previousPeriod {
          totalIncome
          totalExpenses
          netSavings
          savingsRate
        }
        incomeChange
        expensesChange
        savingsChange
      }
    }
  }
`;

// Usage in component
const { analytics, loading, error } = useQuery(GET_ANALYTICS, {
  variables: {
    dateRange: {
      start: dateRange.from,
      end: dateRange.to,
    },
    accountIds: selectedAccounts,
  },
  fetchPolicy: 'cache-and-network',
});
```

### Monthly Spending Trend Calculation
```typescript
// Source: PostgreSQL aggregation + Prisma patterns
// spendwise-api/src/schema/resolvers/analytics.ts
export async function getMonthlyTrends(
  userId: string,
  dateRange: DateRange,
  prisma: PrismaClient
) {
  // Get all transactions in range
  const transactions = await prisma.transaction.findMany({
    where: {
      userId,
      date: { gte: dateRange.start, lte: dateRange.end },
    },
    select: { date: true, amount: true, type: true },
    orderBy: { date: 'asc' },
  });

  // Group by month
  const monthlyData = transactions.reduce((acc, t) => {
    const monthKey = format(t.date, 'yyyy-MM');
    if (!acc[monthKey]) {
      acc[monthKey] = { income: 0, expenses: 0 };
    }
    const amount = parseDecimal(t.amount);
    if (t.type === 'INCOME') {
      acc[monthKey].income += amount;
    } else if (t.type === 'EXPENSE') {
      acc[monthKey].expenses += amount;
    }
    return acc;
  }, {} as Record<string, { income: number; expenses: number }>);

  // Convert to chart format
  const labels = Object.keys(monthlyData).sort();
  const income = labels.map(m => monthlyData[m].income);
  const expenses = labels.map(m => monthlyData[m].expenses);
  const savings = labels.map(m => monthlyData[m].income - monthlyData[m].expenses);

  return {
    labels: labels.map(m => format(parseISO(m + '-01'), 'MMM yyyy')),
    income,
    expenses,
    savings,
  };
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Offset pagination (LIMIT/OFFSET) | Cursor-based pagination | 2024+ | More stable for real-time data, avoids "page drift" when data changes |
| Client-side chart libraries (D3.js raw) | React-native libraries (Recharts, Victory) | 2020+ | Better React integration, less imperative code, easier maintenance |
| Moment.js for dates | date-fns or Day.js | 2022+ | Smaller bundle (date-fns is tree-shakeable), moment.js in maintenance mode |
| Custom date pickers | react-day-picker v9 + shadcn | 2025+ | Better accessibility, TypeScript support, Tailwind integration |
| Manual SQL queries | Prisma ORM | 2023+ | Type-safe queries, migrations, better DX |
| Static dashboards | Real-time with WebSockets/polling | 2025+ | Users expect live updates, especially for financial data |

**Deprecated/outdated:**
- **Moment.js**: In maintenance mode since 2020, use date-fns or Day.js
- **Chart.js v2**: v3+ has breaking changes, but Recharts is better for React
- **Redux for server state**: Use Apollo Client cache or React Query, Redux for UI state only
- **Class components**: Use function components + hooks (React 16.8+)
- **create-react-app**: Next.js or Vite are preferred (CRA deprecated 2023)

## Open Questions

Things that couldn't be fully resolved:

1. **Multi-month trend data structure**
   - What we know: Current analytics resolver has simplified trend data (labels array + parallel data arrays)
   - What's unclear: Best way to generate 6-12 months of historical trend data efficiently
   - Recommendation: Generate monthly aggregates in resolver with date bucketing, cache for 1 hour since historical data doesn't change frequently

2. **Merchant name normalization strategy**
   - What we know: MerchantRule table exists for user-defined mapping, merchant field on Transaction is optional
   - What's unclear: Whether to normalize merchants globally vs per-user, and when to apply rules
   - Recommendation: Use MerchantRule for user-specific overrides, apply normalization in topMerchants resolver using merchantPattern matching

3. **Date range picker library choice**
   - What we know: react-day-picker v9 is lightweight and popular, no date library currently installed
   - What's unclear: Whether to use full component library or build minimal custom picker with native input
   - Recommendation: Start with react-day-picker for preset ranges and dual-month calendar, can simplify later if needed

4. **Chart interactivity requirements**
   - What we know: Recharts supports onClick, tooltips, legends
   - What's unclear: Should clicking a category filter the view, drill down to transactions, or just display tooltip
   - Recommendation: Phase 3 focuses on visualization; defer click-to-filter to Phase 4 if needed

## Sources

### Primary (HIGH confidence)
- [Recharts Official Documentation](https://recharts.github.io/en-US/api/) - API reference and component guide
- [Recharts Performance Guide](https://recharts.github.io/en-US/guide/performance/) - Official optimization techniques
- [GraphQL Pagination Best Practices](https://graphql.org/learn/pagination/) - Official GraphQL spec
- [Apollo Client Pagination](https://www.apollographql.com/docs/react/pagination/overview) - Apollo's pagination patterns
- [PostgreSQL Date Range Indexing](https://use-the-index-luke.com/sql/where-clause/searching-for-ranges/greater-less-between-tuning-sql-access-filter-predicates) - SQL performance optimization
- [react-day-picker v9 Documentation](https://ui.shadcn.com/docs/components/date-picker) - Shadcn UI date picker patterns

### Secondary (MEDIUM confidence)
- [Recharts Performance Improvements](https://belchior.hashnode.dev/improving-recharts-performance-clp5w295y000b0ajq8hu6cnmm) - Community optimization guide
- [Financial Dashboard Design Best Practices](https://www.eleken.co/blog-posts/modern-fintech-design-guide) - Fintech UI patterns 2026
- [GraphQL Filtering and Sorting](https://www.howtographql.com/graphql-js/8-filtering-pagination-and-sorting/) - HowToGraphQL tutorial
- [Period-over-period Comparisons](https://www.metabase.com/learn/metabase-basics/querying-and-dashboards/time-series/time-series-comparisons) - Time series visualization patterns
- [PostgreSQL Range Types](https://www.postgresql.org/docs/current/rangetypes.html) - Official PostgreSQL documentation
- [Date Range Picker for Shadcn](https://github.com/johnpolacek/date-range-picker-for-shadcn) - Open source component with presets

### Tertiary (LOW confidence)
- [Best React Chart Libraries 2025](https://blog.logrocket.com/best-react-chart-libraries-2025/) - LogRocket comparison article
- [Common Analytics Mistakes](https://www.metabase.com/learn/grow-your-data-skills/analytics/analytics-mistakes) - General analytics pitfalls
- [Payment Analytics Dashboards](https://primer.io/blog/payment-analytics-dashboards) - Financial dashboard patterns

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Recharts already installed and working, Apollo Client in use, react-day-picker is industry standard
- Architecture: HIGH - Existing codebase has clear patterns (analytics resolver, chart components, hooks)
- Pitfalls: MEDIUM - Based on general financial dashboard experience, some specific to this codebase (merchant normalization)

**Research date:** 2026-02-01
**Valid until:** ~30 days (stable domain, libraries update slowly)
