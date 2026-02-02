# Phase 4: Recurring Transactions - Research

**Researched:** 2026-02-01
**Domain:** Recurring transaction pattern detection, financial analysis UI
**Confidence:** HIGH

## Summary

This phase implements automatic detection of recurring transactions (subscriptions, bills, paychecks) from imported statement data, with a user-facing list view for managing detected items and summary metrics. The research covers two primary domains: (1) recurring pattern detection algorithms using rule-based matching with AI fallback, and (2) React table/list UI patterns with filtering, sorting, and expandable rows.

**Standard approach:** Rule-based interval detection (delta-t analysis) combined with merchant name + amount matching, stored in database for persistence. Pattern-matched against weekly/biweekly/monthly/quarterly/annual frequencies with tolerance windows. Triggered automatically on statement import via background job. Frontend uses standard table pattern with URL state management for filters, Apollo Client for GraphQL data fetching, and options object pattern for hooks (established in Phase 3).

**Key technical decisions already locked:** RecurringTransaction table exists in Prisma schema (plaidStreamId field references Plaid's stream format but will be repurposed for custom detection). OpenAI API already integrated for AI categorization (Phase 2), can reuse for borderline recurring pattern detection. Redis already available for caching. Apollo Client cache policies and options object hook pattern established in Phases 2-3.

**Primary recommendation:** Implement rule-based detection algorithm using delta-t (time between transactions) and amount variance checks, store results in RecurringTransaction table, trigger detection on statement import completion. Use standard React table with URL param sync (useSearchParams pattern from Phase 3), Apollo Client hooks following options object pattern, and expandable rows for transaction history. BullMQ not needed for v1 - simple post-import trigger sufficient. Plaid stream format provides reference but custom detection algorithm required.

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Prisma ORM | 5.10.0 | Database queries, RecurringTransaction model | Already integrated in Phases 1-3, handles all DB operations |
| Apollo Client | 4.1.2 | GraphQL data fetching on frontend | Established in Phase 1, cache policies defined for transactions |
| date-fns | 4.1.0 | Date manipulation, interval calculations | Already used in Phase 3 for analytics filters, lightweight alternative to moment.js |
| OpenAI API | 4.104.0 | AI fallback for borderline recurring patterns | Integrated in Phase 2 for categorization, reuse for ambiguous cases |
| Redis (ioredis) | 5.3.2 | Caching detection results, import state | Already running, used in Phase 2 for categorization cache |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| react-day-picker | 9.13.0 | Date range filtering in UI | Already used in Phase 3 analytics, consistent UX |
| Next.js useSearchParams | 14.1.0 | URL state sync for filters | Phase 3 pattern (useAnalyticsFilters.ts), enables shareable views |
| Zod | 4.3.6 | OpenAI Structured Outputs validation | Phase 2 pattern for AI responses, type-safe |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Rule-based detection | Plaid recurring streams API | Plaid costs $0.01-0.03 per stream, requires Plaid connection, currently paused per PROJECT.md |
| Custom detection | Third-party APIs (Ntropy, Subaio) | External cost, vendor lock-in, unnecessary complexity for straightforward pattern matching |
| BullMQ background jobs | Post-import hook | BullMQ adds infrastructure complexity, overkill for simple trigger-after-import pattern |
| TanStack Table | Custom table component | TanStack Table powerful but heavy (30KB), current codebase uses simple table patterns successfully |

**Installation:**
No new dependencies required. All stack items already present in project.

## Architecture Patterns

### Recommended Project Structure

**Backend (spendwise-api/src):**
```
src/
├── lib/
│   └── recurring-detector.ts      # Detection algorithm (rule-based + AI fallback)
├── schema/
│   ├── typeDefs/
│   │   └── recurring.ts           # GraphQL types (RecurringTransaction, filters, sorting)
│   └── resolvers/
│       └── recurring.ts           # Query resolvers (list, summary stats)
└── jobs/
    └── detect-recurring.ts        # Trigger on statement import completion
```

**Frontend (spendwise/src):**
```
src/
├── app/(dashboard)/
│   └── recurring/
│       └── page.tsx               # Main recurring page (summary cards + table)
├── components/
│   └── recurring/
│       ├── RecurringTable.tsx     # Sortable table with expandable rows
│       ├── RecurringFilters.tsx   # Frequency & category filters
│       ├── RecurringSummary.tsx   # 4 summary cards (expenses, income, net, count)
│       └── AddRecurringModal.tsx  # Manual add form
├── hooks/
│   └── useRecurring.ts            # Apollo Client hook (options object pattern)
└── graphql/
    ├── queries/
    │   └── recurring.ts           # GET_RECURRING, GET_RECURRING_SUMMARY
    └── mutations/
        └── recurring.ts           # UPDATE_RECURRING, DISMISS_RECURRING
```

### Pattern 1: Delta-t Interval Detection

**What:** Calculate time differences between consecutive transactions from same merchant+amount range to identify recurring patterns.

**When to use:** Primary detection method for clear recurring patterns (3+ occurrences, predictable intervals).

**Algorithm steps:**
1. Group transactions by normalized merchant name (lowercase, strip special chars)
2. For each merchant group, sub-group by amount range (±10% tolerance)
3. Sort by date ascending, calculate delta-t between consecutive transactions
4. Check if delta-t matches known frequencies: 7±2 days (weekly), 14±3 days (biweekly), 28-32 days (monthly), 85-95 days (quarterly), 350-380 days (annual)
5. If 3+ consecutive transactions match interval, flag as recurring
6. Store first date, last date, average amount, frequency in RecurringTransaction table

**Example:**
```typescript
// Source: Research synthesis from Ntropy blog, BBVA AI Factory, SQL Habit
interface TransactionGroup {
  merchant: string;
  transactions: Array<{ date: Date; amount: number; id: string }>;
}

function detectRecurringPatterns(groups: TransactionGroup[]): RecurringPattern[] {
  const patterns: RecurringPattern[] = [];

  for (const group of groups) {
    // Sort by date
    const sorted = group.transactions.sort((a, b) => a.date.getTime() - b.date.getTime());

    if (sorted.length < 3) continue; // Minimum 3 occurrences

    // Calculate delta-t (days between transactions)
    const intervals: number[] = [];
    for (let i = 1; i < sorted.length; i++) {
      const deltaDays = differenceInDays(sorted[i].date, sorted[i-1].date);
      intervals.push(deltaDays);
    }

    // Check for consistent frequency
    const avgInterval = intervals.reduce((a, b) => a + b) / intervals.length;
    const frequency = classifyFrequency(avgInterval);

    if (frequency && isConsistent(intervals, avgInterval)) {
      patterns.push({
        merchant: group.merchant,
        frequency,
        firstDate: sorted[0].date,
        lastDate: sorted[sorted.length - 1].date,
        averageAmount: sorted.reduce((sum, t) => sum + t.amount, 0) / sorted.length,
        transactionIds: sorted.map(t => t.id),
      });
    }
  }

  return patterns;
}

function classifyFrequency(days: number): Frequency | null {
  if (days >= 5 && days <= 9) return 'WEEKLY';
  if (days >= 11 && days <= 17) return 'BIWEEKLY';
  if (days >= 25 && days <= 35) return 'MONTHLY';
  if (days >= 82 && days <= 98) return 'QUARTERLY';
  if (days >= 340 && days <= 390) return 'ANNUALLY';
  return null;
}

function isConsistent(intervals: number[], avg: number): boolean {
  // Check if all intervals within ±20% of average
  return intervals.every(i => Math.abs(i - avg) / avg <= 0.2);
}
```

### Pattern 2: Merchant Name Normalization

**What:** Normalize merchant names to group variations of same merchant (e.g., "AMAZON.COM", "AMZN MKTP", "Amazon Prime" → "amazon").

**When to use:** Before grouping transactions for pattern detection to avoid missing recurring patterns due to merchant name variations.

**Example:**
```typescript
// Source: Phase 2 categorizer.ts merchant rules pattern
function normalizeMerchant(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '') // Remove special chars
    .replace(/\d{4,}/g, '') // Remove long numbers (transaction IDs)
    .trim();
}

// Enhanced version with common patterns
function normalizeMerchantAdvanced(raw: string): string {
  let normalized = raw.toLowerCase();

  // Strip common suffixes
  normalized = normalized
    .replace(/\s+(inc|llc|corp|ltd|co|com)\.?$/i, '')
    .replace(/\s*#\d+/g, '') // Remove location numbers
    .replace(/\*+/g, '') // Remove asterisks
    .replace(/\s+/g, ' ')
    .trim();

  return normalized;
}
```

### Pattern 3: Options Object Hook Pattern (Phase 3 Established)

**What:** Use options object parameter instead of positional parameters for GraphQL query hooks.

**When to use:** All new query hooks in this phase (useRecurring, useRecurringSummary).

**Example:**
```typescript
// Source: spendwise/src/hooks/useDashboard.ts (Phase 3)
export function useRecurring(options?: {
  filters?: { frequency?: string; category?: string; type?: 'INCOME' | 'EXPENSE' };
  sort?: { field: string; order: 'ASC' | 'DESC' };
  dismissed?: boolean;
}) {
  const variables: Record<string, unknown> = {};

  if (options?.filters) {
    variables.filters = options.filters;
  }

  if (options?.sort) {
    variables.sort = options.sort;
  }

  if (options?.dismissed !== undefined) {
    variables.dismissed = options.dismissed;
  }

  const { data, loading, error, refetch } = useQuery(GET_RECURRING, {
    variables,
    fetchPolicy: 'cache-and-network',
  });

  return {
    recurring: data?.recurring ?? [],
    loading,
    error,
    refetch,
  };
}
```

### Pattern 4: URL State Management for Filters (Phase 3 Established)

**What:** Sync filter state with URL query parameters for shareable, bookmarkable views.

**When to use:** Recurring page filters (frequency, category, type).

**Example:**
```typescript
// Source: spendwise/src/hooks/useAnalyticsFilters.ts (Phase 3)
'use client';

import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { useState, useCallback, useEffect } from 'react';

export function useRecurringFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [filters, setFiltersState] = useState(() => ({
    frequency: searchParams.get('frequency') || undefined,
    category: searchParams.get('category') || undefined,
    type: searchParams.get('type') as 'INCOME' | 'EXPENSE' | undefined,
  }));

  const setFilters = useCallback((newFilters: typeof filters) => {
    setFiltersState(newFilters);

    const params = new URLSearchParams(searchParams.toString());
    if (newFilters.frequency) params.set('frequency', newFilters.frequency);
    else params.delete('frequency');

    if (newFilters.category) params.set('category', newFilters.category);
    else params.delete('category');

    if (newFilters.type) params.set('type', newFilters.type);
    else params.delete('type');

    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  }, [pathname, router, searchParams]);

  return { filters, setFilters };
}
```

### Pattern 5: Expandable Table Rows (React State)

**What:** Click to expand row inline, showing transaction history without navigation.

**When to use:** Recurring table transaction history view.

**Example:**
```typescript
// Source: shadcn/ui patterns, Material UI table expansion pattern
function RecurringTable({ recurring }: { recurring: RecurringItem[] }) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  return (
    <table>
      <tbody>
        {recurring.map(item => (
          <React.Fragment key={item.id}>
            <tr onClick={() => setExpandedId(expandedId === item.id ? null : item.id)}>
              <td>
                <ChevronRight className={expandedId === item.id ? 'rotate-90' : ''} />
              </td>
              <td>{item.merchantName}</td>
              <td>{formatCurrency(item.averageAmount)}</td>
              <td>{item.frequency}</td>
              {/* ... */}
            </tr>
            {expandedId === item.id && (
              <tr>
                <td colSpan={7}>
                  <div className="p-4 bg-gray-50">
                    <h4 className="font-semibold mb-2">Transaction History</h4>
                    {item.transactions.map(t => (
                      <div key={t.id}>
                        {formatDate(t.date)} - {formatCurrency(t.amount)}
                      </div>
                    ))}
                  </div>
                </td>
              </tr>
            )}
          </React.Fragment>
        ))}
      </tbody>
    </table>
  );
}
```

### Pattern 6: Frequency Normalization to Monthly Equivalent

**What:** Convert weekly/biweekly/quarterly/annual amounts to monthly for aggregate summaries.

**When to use:** Summary card calculations (Total Recurring Expenses, Net Recurring).

**Conversion factors:**
- Weekly: multiply by 4.33 (52 weeks / 12 months)
- Biweekly: multiply by 2.17 (26 pay periods / 12 months)
- Monthly: no conversion (1.0)
- Quarterly: divide by 3
- Annual: divide by 12

**Example:**
```typescript
// Source: Payroll frequency standards (52 weeks/year, 12 months/year)
function normalizeToMonthly(amount: number, frequency: Frequency): number {
  const factors: Record<Frequency, number> = {
    WEEKLY: 4.33,      // 52 weeks / 12 months
    BIWEEKLY: 2.17,    // 26 periods / 12 months
    MONTHLY: 1.0,
    QUARTERLY: 1/3,    // 4 quarters / 12 months
    ANNUALLY: 1/12,
  };

  return amount * factors[frequency];
}

// Calculate total monthly recurring expenses
function calculateMonthlyTotal(recurring: RecurringItem[]): number {
  return recurring
    .filter(r => r.isActive && !r.isDismissed)
    .reduce((sum, r) => sum + normalizeToMonthly(r.averageAmount, r.frequency), 0);
}
```

### Anti-Patterns to Avoid

- **Matching merchant only without amount range:** Creates false positives (e.g., Amazon subscription vs Amazon shopping spree both flagged as recurring)
- **Hard-coded 30-day month assumption:** Use 28-32 day range for monthly, real calendar math varies
- **Ignoring weekends/holidays in timing tolerance:** ±5 day tolerance accounts for payment date shifts
- **Separate detection runs per import:** Detection should analyze full transaction history, not just new imports
- **Calculating next expected date naively (lastDate + avgInterval):** Account for missed payments, use historical pattern
- **Showing raw categorySource ('ai', 'keyword') to users:** Map to friendly labels (Phase 2 UAT issue), apply same fix here if showing sources

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Background job queue | Custom setTimeout/setInterval loops | Post-import trigger (v1), BullMQ (if needed later) | BullMQ handles retries, persistence, distributed workers. Simple post-import hook sufficient for v1 since detection is fast (<1s per import). |
| Date interval calculations | Manual day counting loops | date-fns (differenceInDays, addDays, isBefore) | Already in project (Phase 3), handles edge cases (DST, leap years, timezones) |
| Merchant name matching | Regex soup, string distance | Normalize + exact match, OpenAI for ambiguous | Plaid spent years refining merchant matching. Simple normalization covers 90% of cases, AI handles edge cases. |
| GraphQL pagination | Custom offset logic | Apollo Client cache merge (existing pattern) | Already configured in apollo-client.ts for transactions, reuse pattern |
| Table sorting/filtering | Manual array operations | GraphQL resolver + Prisma orderBy/where | Database-level sorting/filtering faster, supports large datasets |

**Key insight:** Recurring detection looks deceptively simple ("just find same merchant repeating") but has edge cases: multiple subscriptions to same merchant, amount variations (taxes, price changes), irregular schedules. Plaid's recurring streams endpoint exists because this is non-trivial. Rule-based detection covers majority of cases; AI fallback handles ambiguity. Don't try to handle every edge case in rules - that's what the AI is for.

## Common Pitfalls

### Pitfall 1: Detecting False Positives (Habitual vs Recurring)

**What goes wrong:** User shops at Starbucks 3+ times per week, algorithm flags as "recurring subscription" instead of habitual spending.

**Why it happens:** Frequency alone doesn't distinguish true subscriptions (committed spend) from habitual purchases (discretionary).

**How to avoid:**
- Require both merchant AND amount consistency (±10% variance)
- Filter out cash-like merchants (Starbucks, gas stations, grocery stores) with high transaction counts
- Focus on merchants known for subscriptions (streaming, utilities, insurance)
- Flag ambiguous cases for AI review

**Warning signs:** High transaction count (>10/month) for same merchant, wide amount variance (>20%), merchant in excluded category list

**Example:**
```typescript
// Exclude habitual spending categories from detection
const EXCLUDED_CATEGORIES = [
  'Food & Dining',
  'Groceries',
  'Transportation', // Gas stations
];

function shouldSkipMerchant(merchant: string, category: string, txCount: number): boolean {
  if (EXCLUDED_CATEGORIES.includes(category) && txCount > 10) {
    return true; // Likely habitual, not recurring
  }
  return false;
}
```

### Pitfall 2: Overlapping Recurring Sequences

**What goes wrong:** User has two Netflix accounts (one on 2nd, one on 15th of month). Algorithm either misses one or flags as single subscription.

**Why it happens:** Same merchant, same amount, but two independent recurring patterns that need disentangling.

**How to avoid:**
- After finding one recurring pattern, remove matched transactions from pool
- Re-run detection on remaining transactions for same merchant
- Store separate RecurringTransaction records for each pattern
- Use plaidStreamId (or custom streamId) to distinguish multiple patterns

**Warning signs:** Irregular intervals in delta-t sequence, large gaps between some transactions but regular intervals for others

**Example:**
```typescript
// Multi-pattern detection for same merchant
function detectMultiplePatterns(transactions: Transaction[]): RecurringPattern[] {
  const patterns: RecurringPattern[] = [];
  let remaining = [...transactions];

  while (remaining.length >= 3) {
    const pattern = detectSinglePattern(remaining);
    if (!pattern) break;

    patterns.push(pattern);

    // Remove matched transactions, retry with remainder
    remaining = remaining.filter(t => !pattern.transactionIds.includes(t.id));
  }

  return patterns;
}
```

### Pitfall 3: Missed Payment Detection Firing Too Early

**What goes wrong:** User's gym membership normally charges on 1st of month, but January charge happened on 3rd due to weekend. Algorithm flags as "possibly cancelled" when it's just delayed.

**Why it happens:** Timing tolerance too strict, doesn't account for payment processor delays or calendar variations.

**How to avoid:**
- Use ±5 day tolerance for expected date (context decision)
- Only flag as "possibly cancelled" after 2+ missed expected dates (60+ days for monthly)
- Check if recent transactions exist with different amounts (price change, not cancellation)
- Surface as "possibly cancelled" with dimmed styling, not hard error

**Warning signs:** Flagging cancellations within first 45 days of expected date, high false positive rate on quarterly/annual subscriptions

**Example:**
```typescript
function checkMissedPayment(pattern: RecurringPattern, latestTransactionDate: Date): boolean {
  const expectedNext = calculateNextExpected(pattern);
  const daysSinceMissed = differenceInDays(latestTransactionDate, expectedNext);

  if (pattern.frequency === 'MONTHLY' && daysSinceMissed > 60) {
    return true; // 2+ months missed
  }

  if (pattern.frequency === 'QUARTERLY' && daysSinceMissed > 180) {
    return true; // 2+ quarters missed
  }

  return false; // Within tolerance
}
```

### Pitfall 4: Running Detection on Every Query

**What goes wrong:** Detection algorithm runs on every page load, slowing down recurring page and wasting CPU.

**Why it happens:** Not persisting detection results in database, treating as computed field.

**How to avoid:**
- Store detection results in RecurringTransaction table (context decision)
- Only run detection on statement import completion (trigger pattern)
- Query stored results from database for page loads
- Provide manual "Re-scan" button if user wants to refresh detection

**Warning signs:** Slow page loads (>2s), high CPU usage on recurring page, duplicate recurring items with same transactions

**Example:**
```typescript
// Trigger detection after statement import completes
async function onStatementImportComplete(importId: string, userId: string) {
  // ... transaction import logic ...

  // Trigger recurring detection for this user's full transaction history
  await detectAndStoreRecurringPatterns(userId);
}

async function detectAndStoreRecurringPatterns(userId: string) {
  const transactions = await prisma.transaction.findMany({
    where: { userId },
    orderBy: { date: 'asc' },
  });

  const patterns = detectRecurringPatterns(groupByMerchant(transactions));

  // Upsert to RecurringTransaction table
  for (const pattern of patterns) {
    await prisma.recurringTransaction.upsert({
      where: {
        userId_merchantName_frequency: {
          userId,
          merchantName: pattern.merchant,
          frequency: pattern.frequency,
        }
      },
      create: {
        userId,
        plaidStreamId: generateStreamId(), // Custom ID, not Plaid
        merchantName: pattern.merchant,
        frequency: pattern.frequency,
        averageAmount: pattern.averageAmount,
        lastDate: pattern.lastDate,
        firstDate: pattern.firstDate,
        transactionIds: pattern.transactionIds,
        isActive: true,
      },
      update: {
        averageAmount: pattern.averageAmount,
        lastDate: pattern.lastDate,
        transactionIds: pattern.transactionIds,
      },
    });
  }
}
```

### Pitfall 5: Not Handling Price Changes

**What goes wrong:** Netflix raises price from $9.99 to $10.99. Algorithm treats as two separate subscriptions or misses the new pattern.

**Why it happens:** Strict amount matching without allowing for price updates.

**How to avoid:**
- Allow ±10% amount variance (context decision)
- Update RecurringTransaction.averageAmount when new amount detected
- Show amount trend in UI ("$9.99 → $10.99" if recent change)
- Don't create duplicate recurring item for same merchant + frequency

**Warning signs:** Multiple recurring items for same merchant with different amounts, "possibly cancelled" flag when price just changed

**Example:**
```typescript
function groupByAmountRange(transactions: Transaction[]): Transaction[][] {
  const groups: Transaction[][] = [];
  const sorted = [...transactions].sort((a, b) => a.amount - b.amount);

  let currentGroup: Transaction[] = [sorted[0]];

  for (let i = 1; i < sorted.length; i++) {
    const prevAmount = sorted[i - 1].amount;
    const currAmount = sorted[i].amount;

    // Within ±10% = same group
    if (Math.abs(currAmount - prevAmount) / prevAmount <= 0.10) {
      currentGroup.push(sorted[i]);
    } else {
      groups.push(currentGroup);
      currentGroup = [sorted[i]];
    }
  }

  if (currentGroup.length > 0) groups.push(currentGroup);

  return groups;
}
```

## Code Examples

Verified patterns from official sources and existing codebase:

### Prisma RecurringTransaction Schema

```typescript
// Source: spendwise/prisma/schema.prisma (existing)
model RecurringTransaction {
  id             String   @id @default(cuid())
  userId         String
  user           User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  plaidStreamId  String   @unique
  description    String
  merchantName   String?
  category       String
  frequency      String // "WEEKLY", "BIWEEKLY", "MONTHLY", "SEMI_MONTHLY", "ANNUALLY"
  isActive       Boolean  @default(true)
  lastAmount     Decimal  @db.Decimal(12, 2)
  averageAmount  Decimal  @db.Decimal(12, 2)
  lastDate       DateTime
  firstDate      DateTime
  transactionIds String[] // Array of transaction IDs in this stream
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt

  @@index([userId])
  @@index([plaidStreamId])
}

// Add fields needed for custom detection (beyond Plaid schema):
// - isDismissed Boolean @default(false)
// - nextExpectedDate DateTime?
// - status String @default("ACTIVE") // "ACTIVE", "POSSIBLY_CANCELLED"
```

### GraphQL Recurring Queries

```typescript
// Source: Apollo Server 4 patterns, Phase 2-3 resolver structure
import { GraphQLError } from 'graphql';
import { Context } from '../../context';

export const recurringResolvers = {
  Query: {
    recurring: async (
      _: any,
      { filters, sort, dismissed }: {
        filters?: { frequency?: string; category?: string; type?: string };
        sort?: { field: string; order: 'asc' | 'desc' };
        dismissed?: boolean;
      },
      ctx: Context
    ) => {
      if (!ctx.user) {
        throw new GraphQLError('Authentication required', {
          extensions: { code: 'UNAUTHENTICATED' }
        });
      }

      const where: any = { userId: ctx.user.id };

      if (dismissed !== undefined) {
        where.isDismissed = dismissed;
      }

      if (filters?.frequency) {
        where.frequency = filters.frequency;
      }

      if (filters?.category) {
        where.category = filters.category;
      }

      // Type filter requires inferring from category
      if (filters?.type) {
        const incomeCategories = ['Income'];
        where.category = filters.type === 'INCOME'
          ? { in: incomeCategories }
          : { notIn: incomeCategories };
      }

      const orderBy: any = {};
      if (sort?.field) {
        orderBy[sort.field.toLowerCase()] = sort.order || 'asc';
      } else {
        orderBy.lastDate = 'desc'; // Default: most recent first
      }

      const recurring = await ctx.prisma.recurringTransaction.findMany({
        where,
        orderBy,
      });

      return recurring;
    },

    recurringSummary: async (_: any, __: any, ctx: Context) => {
      if (!ctx.user) {
        throw new GraphQLError('Authentication required', {
          extensions: { code: 'UNAUTHENTICATED' }
        });
      }

      const recurring = await ctx.prisma.recurringTransaction.findMany({
        where: {
          userId: ctx.user.id,
          isActive: true,
          isDismissed: false,
        },
      });

      const incomeCategories = ['Income'];

      const expenses = recurring.filter(r => !incomeCategories.includes(r.category));
      const income = recurring.filter(r => incomeCategories.includes(r.category));

      const totalExpenses = expenses.reduce((sum, r) =>
        sum + normalizeToMonthly(parseFloat(r.averageAmount.toString()), r.frequency), 0
      );

      const totalIncome = income.reduce((sum, r) =>
        sum + normalizeToMonthly(parseFloat(r.averageAmount.toString()), r.frequency), 0
      );

      return {
        totalRecurringExpenses: totalExpenses,
        totalRecurringIncome: totalIncome,
        netRecurring: totalIncome - totalExpenses,
        activeCount: recurring.length,
      };
    },
  },
};

function normalizeToMonthly(amount: number, frequency: string): number {
  const factors: Record<string, number> = {
    WEEKLY: 4.33,
    BIWEEKLY: 2.17,
    MONTHLY: 1.0,
    QUARTERLY: 1/3,
    ANNUALLY: 1/12,
  };
  return amount * (factors[frequency] || 1.0);
}
```

### Frontend Recurring Hook (Options Pattern)

```typescript
// Source: spendwise/src/hooks/useDashboard.ts pattern (Phase 3)
'use client';

import { useQuery, useMutation, useApolloClient } from '@apollo/client/react';
import { GET_RECURRING, GET_RECURRING_SUMMARY, UPDATE_RECURRING, DISMISS_RECURRING } from '@/graphql';

export function useRecurring(options?: {
  filters?: { frequency?: string; category?: string; type?: 'INCOME' | 'EXPENSE' };
  sort?: { field: string; order: 'ASC' | 'DESC' };
  dismissed?: boolean;
}) {
  const variables: Record<string, unknown> = {};

  if (options?.filters) {
    variables.filters = options.filters;
  }

  if (options?.sort) {
    variables.sort = options.sort;
  }

  if (options?.dismissed !== undefined) {
    variables.dismissed = options.dismissed;
  }

  const { data, loading, error, refetch } = useQuery(GET_RECURRING, {
    variables,
    fetchPolicy: 'cache-and-network',
  });

  return {
    recurring: data?.recurring ?? [],
    loading,
    error,
    refetch,
  };
}

export function useRecurringSummary() {
  const { data, loading, error, refetch } = useQuery(GET_RECURRING_SUMMARY, {
    fetchPolicy: 'cache-and-network',
  });

  return {
    summary: data?.recurringSummary,
    loading,
    error,
    refetch,
  };
}

export function useUpdateRecurring() {
  const client = useApolloClient();
  const [updateMutation, { loading, error }] = useMutation(UPDATE_RECURRING, {
    onCompleted: () => {
      client.refetchQueries({
        include: ['GetRecurring', 'GetRecurringSummary'],
      });
    },
  });

  const updateRecurring = (id: string, input: any) =>
    updateMutation({ variables: { id, input } });

  return { updateRecurring, loading, error };
}

export function useDismissRecurring() {
  const client = useApolloClient();
  const [dismissMutation, { loading, error }] = useMutation(DISMISS_RECURRING, {
    onCompleted: () => {
      client.refetchQueries({
        include: ['GetRecurring', 'GetRecurringSummary'],
      });
    },
  });

  const dismissRecurring = (id: string) =>
    dismissMutation({ variables: { id } });

  return { dismissRecurring, loading, error };
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Manual subscription tracking | Automatic detection from transaction data | 2018-2020 (fintech apps) | Plaid launched recurring streams 2020, now standard in PFM apps |
| Offset-based pagination | Cursor-based pagination | GraphQL best practice (2019+) | Better for infinite scroll, stable results |
| Bull (original) | BullMQ (TypeScript rewrite) | 2021 | BullMQ is actively maintained, Bull in maintenance mode |
| Moment.js | date-fns / Day.js | 2020+ | date-fns tree-shakeable, 10x smaller bundle |
| Manual recurring entry | AI-assisted detection | 2022+ (LLM era) | OpenAI/Claude can disambiguate borderline cases |

**Deprecated/outdated:**
- **Plaid transaction streams sync API:** Plaid now recommends /transactions/recurring/get endpoint for recurring detection, deprecating manual stream analysis
- **Hard-coded merchant lists:** Pre-AI approach used static merchant → category mappings. Modern: use LLM for unknown merchants
- **Regex-based merchant matching:** String distance algorithms like Levenshtein too slow for large datasets. Modern: normalize + exact match, escalate ambiguous to AI

## Open Questions

Things that couldn't be fully resolved:

1. **Should detection run incrementally or full-history each time?**
   - What we know: Full-history scan enables catching annual subscriptions and multi-pattern detection
   - What's unclear: Performance implications on users with 5+ years of transaction history (10,000+ transactions)
   - Recommendation: Start with full-history (simpler), add incremental optimization if query time >2s in testing

2. **How to handle semi-monthly (twice per month) frequency?**
   - What we know: Context specifies weekly/biweekly/monthly/quarterly/annual
   - What's unclear: Some bills (payroll, mortgages) are semi-monthly (1st and 15th), not biweekly
   - Recommendation: Add 'SEMI_MONTHLY' to enum if detected in testing, or group as monthly with 2x occurrences

3. **Should OpenAI AI fallback prompt include user transaction history?**
   - What we know: Phase 2 categorizer includes top 50 user patterns in prompt (~500 tokens)
   - What's unclear: Does recurring detection benefit from personalization, or is pattern purely mathematical?
   - Recommendation: Start without history (simpler), add if AI produces poor results in borderline cases

4. **Badge notification persistence: session-based or dismissed-based?**
   - What we know: Context specifies badge on nav showing "3 new recurring" after import
   - What's unclear: When does "new" badge clear? On page visit, explicit dismiss, or session end?
   - Recommendation: Clear badge on page visit (simpler), store lastViewedAt timestamp for user

## Sources

### Primary (HIGH confidence)

- **Plaid Recurring Transactions API Documentation**
  - [Retrieve recurring transaction streams | Plaid API](https://www.postman.com/plaid-api/plaid/request/kclqv0d/retrieve-recurring-transaction-streams)
  - [Build deeper user connections with data driven insights | Plaid](https://plaid.com/blog/recurring-transactions/)
  - Provides authoritative pattern: merchant name + amount + frequency, early detection (<3 occurrences), exclusion of habitual spending

- **BullMQ Official Documentation**
  - [BullMQ - Background Jobs and Message Queue for Node.js](https://bullmq.io/)
  - [How to Build a Job Queue in Node.js with BullMQ and Redis](https://oneuptime.com/blog/post/2026-01-06-nodejs-job-queue-bullmq-redis/view)
  - Current (2026) best practices: BullMQ replaces Bull, TypeScript-first, concurrency management

- **Existing Codebase Patterns (Phase 1-3)**
  - `/Users/heechung/projects/spendwise/prisma/schema.prisma` - RecurringTransaction model already exists
  - `/Users/heechung/projects/spendwise/src/hooks/useDashboard.ts` - Options object pattern established
  - `/Users/heechung/projects/spendwise/src/hooks/useAnalyticsFilters.ts` - URL state management pattern
  - `/Users/heechung/projects/spendwise/src/app/(dashboard)/analytics/page.tsx` - Summary cards + table layout

- **GraphQL Pagination Best Practices**
  - [Pagination | GraphQL Official Docs](https://graphql.org/learn/pagination/)
  - [Pagination in Apollo Client - Apollo GraphQL Docs](https://www.apollographql.com/docs/react/pagination/overview)
  - Cursor-based recommended over offset for stability

### Secondary (MEDIUM confidence)

- **Recurring Pattern Detection Algorithms**
  - [BBVA AI Factory | Financial habits through recurring pattern analysis](https://www.bbvaaifactory.com/financial-habits-analysis/)
  - [Ntropy Blog | Finding recurring events in massive sequences](https://ntropy.com/post/quickly-finding-recurring-events-in-massive-sequences)
  - [SQL Habit | Detect recurring payments with SQL](https://www.sqlhabit.com/blog/how-to-detect-recurring-payments-with-sql)
  - DBSCAN, MATRIX, delta-t approaches confirmed by multiple sources

- **React URL State Management**
  - [nuqs | Type-safe search params state management](https://nuqs.dev/)
  - [Why URL state matters: useSearchParams in React - LogRocket](https://blog.logrocket.com/url-state-usesearchparams/)
  - Next.js useSearchParams is standard, nuqs provides enhanced type safety

- **React Expandable Table Patterns**
  - [shadcn/ui - Data Table Advanced Expandable Rows](https://www.shadcn.io/patterns/data-table-advanced-1)
  - [Expanding Guide | TanStack Table Docs](https://tanstack.com/table/v8/docs/guide/expanding)
  - [Material React Table - Expanding Sub-Rows Guide](https://www.material-react-table.com/docs/guides/expanding-sub-rows)
  - Multiple sources confirm expandedId state + conditional render pattern

- **Frequency Conversion Standards**
  - [Paycheck Frequency: Weekly, Bi-Weekly, Monthly Payrolls](https://paylinedata.com/blog/paycheck-frequency)
  - [Pay Frequency Options | Patriot Software](https://www.patriotsoftware.com/blog/payroll/pay-frequency/)
  - 52 weeks/year, 26 biweekly periods/year, 12 months/year confirmed by payroll standards

### Tertiary (LOW confidence)

- **Advanced Periodicity Detection (Academic)**
  - [RobustPeriod: Time-Frequency Mining for Multiple Periodicity Detection](https://arxiv.org/pdf/2002.09535)
  - [Pattern Recognition in Time Series | Baeldung](https://www.baeldung.com/cs/pattern-recognition-time-series)
  - Research-level algorithms (F1/FP, Apriori) - interesting but overkill for business app

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All libraries already in project (Prisma, Apollo, date-fns, OpenAI, Redis)
- Architecture: HIGH - Patterns established in Phases 1-3, RecurringTransaction schema exists, similar to categorization flow
- Pitfalls: HIGH - Plaid documentation explicitly covers false positives, overlapping patterns, habitual vs recurring distinction
- Detection algorithm: MEDIUM - Delta-t approach well-documented, but exact tolerance values (±10% amount, ±5 days timing) require testing

**Research date:** 2026-02-01
**Valid until:** 2026-03-01 (30 days - stable domain, established patterns)
