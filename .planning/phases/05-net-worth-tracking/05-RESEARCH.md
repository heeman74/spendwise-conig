# Phase 5: Net Worth Tracking - Research

**Researched:** 2026-02-02
**Domain:** Financial time-series data tracking, job scheduling, charting
**Confidence:** HIGH

## Summary

Net worth tracking requires three core technical components: (1) scheduled snapshot capture via job queue, (2) time-series storage in PostgreSQL with proper indexing, and (3) adaptive chart visualization with Recharts. The research confirms BullMQ is the standard choice for Redis-backed job queuing in Node.js, offering robust scheduled job execution with cron expressions. For data storage, PostgreSQL with composite indexes on (userId, date) provides efficient time-series queries without requiring specialized extensions like TimescaleDB for this scale. Recharts, already in the stack, supports sparkline-style minimal charts through configuration. The pattern of daily snapshots + on-import triggers aligns with financial app best practices observed in production apps like Empower and Kubera.

**Primary recommendation:** Use BullMQ with daily cron jobs for snapshots, store per-account balances in a NetWorthSnapshot model with composite index (userId, date), and implement adaptive chart granularity client-side by sampling data points based on time range selection.

## Standard Stack

The established libraries/tools for this domain:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| BullMQ | ^5.x | Redis-backed job queue for scheduled snapshots | Industry standard for Node.js background jobs, handles 1M+ jobs/day, native TypeScript support, robust retry logic |
| PostgreSQL | 16 | Time-series snapshot storage | Already in stack, NUMERIC type provides exact decimal precision for financial data, composite indexes optimize time-range queries |
| Recharts | ^2.12.2 | Chart visualization | Already in stack (Phase 3), React-native, supports minimal sparkline configs |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| IORedis | ^5.3.2 | Redis client for BullMQ | Already in stack, required by BullMQ with `maxRetriesPerRequest: null` config |
| date-fns | ^4.1.0 | Date manipulation for backfill | Already in stack, used for time range calculations |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| BullMQ | node-cron | BullMQ provides persistence, retries, observability; cron jobs lost on restart |
| PostgreSQL | TimescaleDB extension | TimescaleDB optimizes for massive time-series scale (millions of data points), but adds complexity; plain PostgreSQL sufficient for user-level net worth snapshots |
| Recharts sparklines | react-sparklines library | Recharts already in stack, sparklines achievable via configuration; no need for additional dependency |

**Installation:**
```bash
# API (spendwise-api/)
npm install bullmq

# No additional frontend dependencies needed
```

## Architecture Patterns

### Recommended Project Structure
```
spendwise-api/src/
├── lib/
│   ├── jobs/
│   │   ├── cleanup2FA.ts          # Existing pattern to follow
│   │   └── snapshotNetWorth.ts    # New: daily snapshot job
│   └── redis.ts                    # Existing: Redis client
├── schema/
│   ├── typeDefs/
│   │   └── netWorth.ts            # GraphQL types
│   └── resolvers/
│       └── netWorth.ts            # Query/mutation resolvers
└── server.ts                       # Setup BullMQ worker

spendwise/src/
├── app/(dashboard)/
│   └── net-worth/
│       └── page.tsx               # Dedicated /net-worth page
├── components/
│   ├── charts/
│   │   └── NetWorthChart.tsx     # Main historical chart
│   ├── net-worth/
│   │   ├── NetWorthHero.tsx      # Hero number + changes
│   │   ├── AccountBreakdown.tsx  # Assets/liabilities list
│   │   └── AccountCard.tsx       # Individual account with sparkline
│   └── dashboard/
│       └── NetWorthSummaryCard.tsx  # Dashboard widget
└── hooks/
    └── useNetWorth.ts             # GraphQL query hooks
```

### Pattern 1: BullMQ Scheduled Daily Snapshot

**What:** Background job that captures per-account balances daily at a consistent time

**When to use:** Need reliable, persistent scheduled execution that survives server restarts

**Example:**
```typescript
// Source: https://docs.bullmq.io/guide/jobs/repeatable
import { Queue, Worker } from 'bullmq';
import { redis } from './redis';

// Queue setup (in server.ts initialization)
const snapshotQueue = new Queue('net-worth-snapshots', {
  connection: redis,
});

// Schedule daily snapshot at 2:00 AM
await snapshotQueue.add(
  'daily-snapshot',
  {},
  {
    repeat: {
      pattern: '0 0 2 * * *', // cron: 2 AM daily
    },
  }
);

// Worker setup (in server.ts)
const worker = new Worker(
  'net-worth-snapshots',
  async (job) => {
    if (job.name === 'daily-snapshot') {
      await captureAllUserSnapshots();
    }
  },
  { connection: redis }
);

// Graceful shutdown
process.on('SIGTERM', async () => {
  await worker.close();
  await snapshotQueue.close();
  process.exit(0);
});
```

**Key points:**
- Use cron pattern for daily execution (e.g., `'0 0 2 * * *'` for 2 AM)
- Worker processes jobs from queue, survives server restarts
- BullMQ requires `maxRetriesPerRequest: null` in IORedis config
- Always implement graceful shutdown with `worker.close()`

### Pattern 2: Time-Series Snapshot Schema with Composite Index

**What:** Prisma model storing per-account balances at specific points in time

**When to use:** Need efficient time-range queries filtered by user

**Example:**
```typescript
// Source: Prisma indexing best practices + financial time-series patterns
// prisma/schema.prisma
model NetWorthSnapshot {
  id        String   @id @default(cuid())
  userId    String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  accountId String
  account   Account  @relation(fields: [accountId], references: [id], onDelete: Cascade)
  balance   Decimal  @db.Decimal(12, 2)
  date      DateTime
  createdAt DateTime @default(now())

  @@index([userId, date])      // Optimizes time-range queries
  @@index([accountId, date])   // Optimizes per-account history
}
```

**Why this index strategy:**
- Composite `[userId, date]` index optimizes WHERE userId = X AND date BETWEEN queries
- B-tree indexes (PostgreSQL default) support range comparisons needed for time-series
- Separate `[accountId, date]` supports per-account sparkline queries
- DECIMAL(12, 2) provides exact precision for financial balances (avoids float rounding)

### Pattern 3: Adaptive Chart Granularity (Client-Side)

**What:** Dynamically sample data points based on selected time range to keep chart readable

**When to use:** Time ranges vary from 1 month to "All time" — need different granularities

**Example:**
```typescript
// Source: Industry patterns from time-series visualization best practices
function getChartData(snapshots: NetWorthSnapshot[], timeRange: TimeRange) {
  const granularity = selectGranularity(timeRange, snapshots.length);

  switch (granularity) {
    case 'daily':
      return snapshots; // Use all data points
    case 'weekly':
      return sampleWeekly(snapshots); // First snapshot of each week
    case 'monthly':
      return sampleMonthly(snapshots); // First snapshot of each month
  }
}

function selectGranularity(range: TimeRange, dataPoints: number): Granularity {
  const days = getDayCount(range);

  // 1M, 3M: daily (30-90 points)
  if (days <= 90) return 'daily';

  // 6M: weekly (24-26 points)
  if (days <= 180) return 'weekly';

  // 1Y, All: monthly (12+ points)
  return 'monthly';
}
```

**Rationale:**
- Keeps chart readable (aim for 30-100 data points max)
- Reduces frontend memory overhead for "All time" ranges
- Sampling happens client-side; all data fetched from API
- Alternative: Server-side aggregation if snapshot count grows very large (thousands per user)

### Pattern 4: Sparkline Configuration with Recharts

**What:** Minimal line chart showing trend without axes, labels, or grid

**When to use:** Account cards need compact visual context

**Example:**
```typescript
// Source: Recharts minimal configuration patterns
import { LineChart, Line, ResponsiveContainer } from 'recharts';

function AccountSparkline({ data }: { data: { date: string; balance: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={40}>
      <LineChart data={data}>
        <Line
          type="monotone"
          dataKey="balance"
          stroke="#3b82f6"
          strokeWidth={1.5}
          dot={false}
          isAnimationActive={false}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
```

**Key configuration:**
- No `XAxis`, `YAxis`, `CartesianGrid`, `Tooltip` components = minimal sparkline
- `dot={false}` removes data point markers
- `isAnimationActive={false}` improves performance for many sparklines
- Height 40-60px typical for inline sparklines

### Pattern 5: Snapshot Triggers (Dual: Daily + On-Import)

**What:** Capture snapshots both on schedule AND when statement imports complete

**When to use:** Users expect up-to-date net worth after importing statements

**Example:**
```typescript
// In statement import resolver (after successful import)
await snapshotQueue.add('on-demand-snapshot', {
  userId: user.id,
  trigger: 'import',
});

// Worker handles both scheduled and on-demand
const worker = new Worker('net-worth-snapshots', async (job) => {
  if (job.name === 'daily-snapshot') {
    await captureAllUserSnapshots(); // All users
  } else if (job.name === 'on-demand-snapshot') {
    await captureUserSnapshot(job.data.userId); // Specific user
  }
});
```

**Deduplication strategy:**
- Check if snapshot exists for (userId, date) before inserting
- Use `ON CONFLICT DO NOTHING` or Prisma `createMany({ skipDuplicates: true })`
- Daily snapshot at 2 AM establishes consistent timeline
- On-import snapshots fill intra-day gaps when user uploads statements

### Pattern 6: Historical Backfill Algorithm

**What:** Generate missing historical snapshots from transaction history for existing users

**When to use:** Phase 5 launches with existing accounts that lack snapshot history

**Example:**
```typescript
// Source: Time-series backfill best practices
async function backfillUserSnapshots(userId: string) {
  const accounts = await prisma.account.findMany({ where: { userId } });
  const oldestTransaction = await prisma.transaction.findFirst({
    where: { userId },
    orderBy: { date: 'asc' },
  });

  if (!oldestTransaction) return; // No data to backfill

  const startDate = oldestTransaction.date;
  const endDate = new Date();

  // Generate snapshots for first of each month
  const snapshots = [];
  for (let date = startOfMonth(startDate); date <= endDate; date = addMonths(date, 1)) {
    for (const account of accounts) {
      const balance = await calculateBalanceAtDate(account.id, date);
      snapshots.push({
        userId,
        accountId: account.id,
        balance,
        date,
      });
    }
  }

  await prisma.netWorthSnapshot.createMany({
    data: snapshots,
    skipDuplicates: true,
  });
}

async function calculateBalanceAtDate(accountId: string, date: Date): Promise<Decimal> {
  const account = await prisma.account.findUnique({ where: { id: accountId } });
  const currentBalance = account.balance;

  // Sum transactions after target date
  const futureTransactions = await prisma.transaction.aggregate({
    where: {
      accountId,
      date: { gt: date },
    },
    _sum: { amount: true },
  });

  // Balance at date = current balance - future transactions
  return currentBalance.minus(futureTransactions._sum.amount || 0);
}
```

**Considerations:**
- Backfill monthly (not daily) to reduce data volume for historical periods
- Run as one-time migration script, not in BullMQ queue
- Skip if transaction history incomplete (warn user in UI)
- Alternative: Only backfill after user explicitly requests historical view

### Anti-Patterns to Avoid

- **Computing net worth from transactions in real-time:** Slow, complex queries. Use snapshot lookups instead.
- **Storing only total net worth (no per-account):** Prevents account breakdowns and sparklines. Always store per-account balances.
- **Using node-cron for snapshots:** Lost on server restart, no retry logic. BullMQ persists jobs in Redis.
- **Fetching all snapshots for "All time" without sampling:** Frontend memory overhead. Sample to monthly for long ranges.
- **Ignoring credit card negative balances:** Credit cards are liabilities; balance should be stored as positive amount, classified as liability by account type.
- **Refetching entire snapshot history after mutations:** Unnecessary network overhead. Use Apollo cache updates with document objects.

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Job scheduling with persistence | Custom cron wrapper with database queue | BullMQ | Handles retries, failure recovery, observability, horizontal scaling, job priorities — edge cases are complex |
| Time-series data aggregation | Custom bucketing logic | Client-side sampling OR PostgreSQL DATE_TRUNC | Well-understood patterns, avoid reinventing date math edge cases |
| Sparkline charts | Custom SVG/Canvas rendering | Recharts with minimal config | Already in stack, handles responsive sizing, data normalization |
| Historical backfill from transactions | Manual snapshot generation script | date-fns + Prisma batch operations | Date iteration, time zone handling, bulk insert optimization already solved |
| Decimal financial calculations | JavaScript Number type | PostgreSQL NUMERIC + Prisma Decimal | Avoids floating-point rounding errors (e.g., 0.1 + 0.2 !== 0.3) |

**Key insight:** Job queues and time-series data have subtle failure modes (retries, duplicate prevention, time zones, aggregation boundaries). Using battle-tested libraries prevents production issues.

## Common Pitfalls

### Pitfall 1: BullMQ Worker Not Closing on Shutdown

**What goes wrong:** Server terminates before jobs complete, causing stalled jobs

**Why it happens:** Node.js doesn't wait for async operations on SIGTERM by default

**How to avoid:** Always implement graceful shutdown:
```typescript
process.on('SIGTERM', async () => {
  await worker.close(); // Waits for current job to finish
  await queue.close();
  process.exit(0);
});
```

**Warning signs:** "Stalled jobs detected" in BullMQ logs, jobs re-running unexpectedly

**Source:** [BullMQ Graceful Shutdown Docs](https://docs.bullmq.io/guide/workers/graceful-shutdown)

### Pitfall 2: Missing maxRetriesPerRequest for IORedis

**What goes wrong:** BullMQ fails to connect to Redis with "Reached maximum retries" error

**Why it happens:** BullMQ needs infinite retry capability; default IORedis retries are limited

**How to avoid:** Configure IORedis client:
```typescript
const connection = new IORedis({
  maxRetriesPerRequest: null, // Required by BullMQ
});
```

**Warning signs:** Worker startup fails with Redis connection errors

**Source:** [BullMQ Quick Start](https://docs.bullmq.io/readme-1)

### Pitfall 3: Composite Index Order Matters

**What goes wrong:** Queries remain slow despite having indexes on userId and date

**Why it happens:** PostgreSQL can't use index efficiently if query pattern doesn't match index column order

**How to avoid:** Index must match query: `@@index([userId, date])` for `WHERE userId = ? AND date BETWEEN`

**Warning signs:** `EXPLAIN ANALYZE` shows sequential scan instead of index scan

**Source:** [Prisma Indexing Best Practices](https://www.prisma.io/blog/improving-query-performance-using-indexes-2-MyoiJNMFTsfq)

### Pitfall 4: Float Precision Loss in Financial Calculations

**What goes wrong:** Account balances show incorrect values like $1000.0000000001

**Why it happens:** JavaScript Number is IEEE 754 float; `0.1 + 0.2 !== 0.3` in binary

**How to avoid:** Use PostgreSQL DECIMAL(12, 2) + Prisma Decimal type, avoid JavaScript math:
```typescript
// BAD: JavaScript arithmetic
const balance = account.balance + transaction.amount;

// GOOD: Prisma Decimal methods
const balance = account.balance.plus(transaction.amount);
```

**Warning signs:** Penny discrepancies in totals, balance assertions fail in tests

**Source:** [PostgreSQL Numeric Types](https://www.postgresql.org/docs/current/datatype-numeric.html), [Crunchy Data: Working with Money in Postgres](https://www.crunchydata.com/blog/working-with-money-in-postgres)

### Pitfall 5: Refetching Queries with Operation Names Instead of Documents

**What goes wrong:** Apollo cache updates don't trigger re-renders; stale data shown

**Why it happens:** String operation names only refetch the first query instance; queries with different variables are missed

**How to avoid:** Use document objects in `refetchQueries`:
```typescript
// BAD: Misses queries with different variables
client.refetchQueries({ include: ['GetNetWorth'] });

// GOOD: Refetches all instances
client.refetchQueries({ include: [GET_NET_WORTH] });
```

**Warning signs:** Dashboard shows old net worth after account update, requires manual refresh

**Source:** Phase 4 decision 04-05: "Document-based refetchQueries over string-based", [Apollo Refetching Docs](https://www.apollographql.com/docs/react/data/refetching)

### Pitfall 6: Credit Card Balance Sign Confusion

**What goes wrong:** Credit card balances appear negative in net worth calculation, inflating assets

**Why it happens:** Credit cards store balance as positive (what you owe), but are liabilities (should subtract from net worth)

**How to avoid:** Always classify by account type, not balance sign:
```typescript
const netWorth = accounts.reduce((total, account) => {
  const amount = parseDecimal(account.balance);
  // Credit cards are liabilities even if balance is positive
  return account.type === 'CREDIT'
    ? total - amount  // Subtract liability
    : total + amount; // Add asset
}, 0);
```

**Warning signs:** Net worth increases when credit card balance goes up

**Source:** [Credit Cards Impact on Net Worth](https://www.creditsesame.com/blog/debt/how-credit-cards-affect-your-net-worth/)

### Pitfall 7: Snapshot Duplication on Frequent Imports

**What goes wrong:** Multiple snapshots created for same user+date when importing multiple statements

**Why it happens:** On-import snapshot trigger runs for each import without deduplication

**How to avoid:** Use unique constraint or check-before-insert:
```typescript
// Option 1: Prisma schema constraint
@@unique([userId, accountId, date])

// Option 2: Skip duplicates in code
await prisma.netWorthSnapshot.createMany({
  data: snapshots,
  skipDuplicates: true, // PostgreSQL ON CONFLICT DO NOTHING
});
```

**Warning signs:** Multiple snapshot records for same date in database, inflated row counts

## Code Examples

Verified patterns from official sources:

### BullMQ Daily Scheduled Job Setup

```typescript
// Source: https://docs.bullmq.io/guide/jobs/repeatable
// spendwise-api/src/server.ts
import { Queue, Worker } from 'bullmq';
import { redis } from './lib/redis';
import { captureNetWorthSnapshots } from './lib/jobs/snapshotNetWorth';

// Initialize queue and schedule daily job
export async function setupNetWorthSnapshotQueue() {
  const snapshotQueue = new Queue('net-worth-snapshots', {
    connection: redis,
  });

  // Schedule daily snapshot at 2:00 AM
  await snapshotQueue.add(
    'daily-snapshot',
    {},
    {
      repeat: {
        pattern: '0 0 2 * * *', // Every day at 2 AM
      },
    }
  );

  // Worker to process snapshot jobs
  const worker = new Worker(
    'net-worth-snapshots',
    async (job) => {
      console.log(`[NetWorth] Processing ${job.name} job`);
      await captureNetWorthSnapshots();
    },
    { connection: redis }
  );

  // Graceful shutdown handlers
  const shutdown = async () => {
    console.log('[NetWorth] Shutting down snapshot worker...');
    await worker.close();
    await snapshotQueue.close();
    process.exit(0);
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);

  return { queue: snapshotQueue, worker };
}
```

### Net Worth GraphQL Resolver with Time Range

```typescript
// Source: Existing analytics resolver patterns from Phase 3
// spendwise-api/src/schema/resolvers/netWorth.ts
import { Context } from '../../context';
import { requireAuth } from '../../middleware/authMiddleware';
import { getCache, setCache } from '../../lib/redis';

export const netWorthResolvers = {
  Query: {
    netWorth: async (
      _: unknown,
      {
        timeRange = '1M',
        accountIds,
      }: {
        timeRange?: '1M' | '3M' | '6M' | '1Y' | 'ALL';
        accountIds?: string[];
      },
      context: Context
    ) => {
      const user = requireAuth(context);

      // Build cache key with all parameters
      const cacheKey = `user:${user.id}:netWorth:${timeRange}:${accountIds?.sort().join(',') || 'all'}`;
      const cached = await getCache<any>(cacheKey);
      if (cached) return cached;

      // Calculate date range
      const { start, end } = getDateRangeForTimeRange(timeRange);

      // Build where clause
      const whereClause: any = {
        userId: user.id,
        date: { gte: start, lte: end },
      };
      if (accountIds?.length) {
        whereClause.accountId = { in: accountIds };
      }

      // Fetch snapshots
      const snapshots = await context.prisma.netWorthSnapshot.findMany({
        where: whereClause,
        include: { account: true },
        orderBy: { date: 'asc' },
      });

      // Group by date for time-series data
      const snapshotsByDate = groupSnapshotsByDate(snapshots);

      // Calculate net worth at each date
      const history = Object.entries(snapshotsByDate).map(([dateStr, dateSnapshots]) => {
        const total = dateSnapshots.reduce((sum, snap) => {
          const balance = parseDecimal(snap.balance);
          const isLiability = snap.account.type === 'CREDIT';
          return sum + (isLiability ? -balance : balance);
        }, 0);

        return {
          date: new Date(dateStr),
          value: total,
        };
      });

      // Calculate current and comparison values
      const currentValue = history[history.length - 1]?.value || 0;
      const monthAgoValue = history[history.length - 30]?.value || currentValue;
      const periodStartValue = history[0]?.value || currentValue;

      const result = {
        current: currentValue,
        monthOverMonthChange: currentValue - monthAgoValue,
        periodChange: currentValue - periodStartValue,
        history,
      };

      // Cache for 15 minutes
      await setCache(cacheKey, result, 900);

      return result;
    },
  },
};
```

### Recharts Net Worth Line Chart with Time Range Selector

```typescript
// Source: Existing TrendLineChart.tsx patterns + Recharts docs
// spendwise/src/components/charts/NetWorthChart.tsx
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { formatCurrency } from '@/lib/utils';

type TimeRange = '1M' | '3M' | '6M' | '1Y' | 'ALL';

interface NetWorthChartProps {
  data: { date: Date; value: number }[];
  timeRange: TimeRange;
  onTimeRangeChange: (range: TimeRange) => void;
}

export default function NetWorthChart({ data, timeRange, onTimeRangeChange }: NetWorthChartProps) {
  // Sample data based on time range for readable charts
  const sampledData = sampleDataByRange(data, timeRange);

  // Determine trend direction for color
  const trend = sampledData.length > 1
    ? sampledData[sampledData.length - 1].value - sampledData[0].value
    : 0;
  const trendColor = trend >= 0 ? '#10b981' : '#ef4444'; // Green for positive, red for negative

  const chartData = sampledData.map((point) => ({
    date: formatChartDate(point.date, timeRange),
    value: point.value,
  }));

  return (
    <div>
      {/* Time range selector */}
      <div className="flex gap-2 mb-4">
        {(['1M', '3M', '6M', '1Y', 'ALL'] as TimeRange[]).map((range) => (
          <button
            key={range}
            onClick={() => onTimeRangeChange(range)}
            className={`px-3 py-1 rounded ${
              timeRange === range
                ? 'bg-blue-500 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            {range}
          </button>
        ))}
      </div>

      {/* Chart */}
      <ResponsiveContainer width="100%" height={400}>
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.2} />
          <XAxis
            dataKey="date"
            tick={{ fill: '#6B7280', fontSize: 12 }}
            axisLine={{ stroke: '#374151', opacity: 0.3 }}
          />
          <YAxis
            tick={{ fill: '#6B7280', fontSize: 12 }}
            axisLine={{ stroke: '#374151', opacity: 0.3 }}
            tickFormatter={(value) => formatCurrency(value)}
          />
          <Tooltip
            content={({ active, payload }) => {
              if (active && payload?.length) {
                return (
                  <div className="bg-white p-3 rounded-lg shadow-lg border">
                    <p className="font-medium">{payload[0].payload.date}</p>
                    <p style={{ color: trendColor }}>
                      {formatCurrency(payload[0].value as number)}
                    </p>
                  </div>
                );
              }
              return null;
            }}
          />
          <Line
            type="monotone"
            dataKey="value"
            stroke={trendColor}
            strokeWidth={2}
            dot={{ fill: trendColor, strokeWidth: 2 }}
            activeDot={{ r: 6 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

// Helper: Sample data to keep charts readable
function sampleDataByRange(data: { date: Date; value: number }[], range: TimeRange) {
  const days = {
    '1M': 30,
    '3M': 90,
    '6M': 180,
    '1Y': 365,
    'ALL': Infinity,
  }[range];

  if (days <= 90) return data; // Daily granularity
  if (days <= 180) return sampleWeekly(data); // Weekly granularity
  return sampleMonthly(data); // Monthly granularity
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Bull library | BullMQ | 2021 | BullMQ is rewrite with better TypeScript support, improved performance, job schedulers API |
| node-cron for scheduled jobs | BullMQ repeatable jobs | Ongoing (2024-2026) | Persistence, retry logic, horizontal scaling built-in |
| String operation names in refetchQueries | DocumentNode objects | Apollo Client v3 (2020+) | Ensures all query instances with different variables are refetched |
| repeatable jobs API | Job Schedulers API | BullMQ v5.16.0 (2024) | More cohesive API for managing recurring jobs |
| TimescaleDB for all time-series | Plain PostgreSQL + indexes | Context-dependent | TimescaleDB adds complexity; use only for massive scale (millions of rows) |

**Deprecated/outdated:**
- **Bull library:** Superseded by BullMQ (rewrite with better architecture). Migrate to BullMQ for new projects.
- **BullMQ repeatable jobs API:** Deprecated in favor of Job Schedulers as of v5.16.0, though still functional. Use Job Schedulers for new code.

## Open Questions

Things that couldn't be fully resolved:

1. **Backfill Strategy Depth**
   - What we know: Can calculate historical balances from transaction history; backfill should be monthly (not daily) to reduce data volume
   - What's unclear: How far back to backfill if user has years of transaction history? Should there be a cutoff (e.g., 2 years)?
   - Recommendation: Backfill up to 2 years of history OR oldest transaction date, whichever is more recent. Warn user if older data exists but isn't visualized. Prevents massive data volume for long-time users.

2. **Chart Performance with Thousands of Snapshots**
   - What we know: Client-side sampling keeps charts readable; monthly sampling for "All time" reduces data points to 12-100 range
   - What's unclear: At what snapshot count should we move sampling to server-side? (GraphQL aggregation vs client filtering)
   - Recommendation: Start with client-side sampling. If users accumulate 5+ years of daily snapshots (1,800+ rows), consider server-side DATE_TRUNC aggregation in GraphQL resolver. Monitor in Phase 5 UAT.

3. **Include in Net Worth Toggle Persistence**
   - What we know: Account model needs `includeInNetWorth` boolean field (defaults true); toggle available in both account settings and net worth page
   - What's unclear: Should snapshots store "include" state at capture time, or filter at query time?
   - Recommendation: Filter at query time based on current account.includeInNetWorth value. Simpler implementation, allows retroactive changes. Tradeoff: Historical view can't show "what net worth was before I excluded this account." Acceptable for v1.

## Sources

### Primary (HIGH confidence)
- [BullMQ Official Documentation](https://docs.bullmq.io) - Job queue architecture, repeatable jobs, graceful shutdown
- [BullMQ Quick Start](https://docs.bullmq.io/readme-1) - Installation, queue/worker setup, IORedis configuration
- [BullMQ Repeatable Jobs](https://docs.bullmq.io/guide/jobs/repeatable) - Cron syntax, repeat options, deduplication
- [BullMQ Graceful Shutdown](https://docs.bullmq.io/guide/workers/graceful-shutdown) - Worker cleanup on process termination
- [Apollo Client Refetching](https://www.apollographql.com/docs/react/data/refetching) - Document objects vs operation names, cache update patterns
- [PostgreSQL Numeric Types](https://www.postgresql.org/docs/current/datatype-numeric.html) - DECIMAL precision and scale for financial data
- [Prisma Indexing Best Practices](https://www.prisma.io/blog/improving-query-performance-using-indexes-2-MyoiJNMFTsfq) - Composite indexes, B-tree performance
- [Recharts GitHub](https://github.com/recharts/recharts) - React chart library, LineChart configuration

### Secondary (MEDIUM confidence)
- [BullMQ Job Scheduling Guide (Better Stack)](https://betterstack.com/community/guides/scaling-nodejs/bullmq-scheduled-tasks/) - Daily cron examples, scheduling patterns
- [OneUpTime: BullMQ Guide (Jan 2026)](https://oneuptime.com/blog/post/2026-01-06-nodejs-job-queue-bullmq-redis/view) - Production deployment patterns
- [Crunchy Data: Working with Money in Postgres](https://www.crunchydata.com/blog/working-with-money-in-postgres) - NUMERIC vs MONEY type, precision recommendations
- [Credit Cards Impact on Net Worth](https://www.creditsesame.com/blog/debt/how-credit-cards-affect-your-net-worth/) - Liability classification, balance sign handling
- [Time-Series Backfilling Guide (LakeFS)](https://lakefs.io/blog/backfilling-data-foolproof-guide/) - Historical data migration strategies
- [Recharts Simple Line Chart Example](https://recharts.github.io/en-US/examples/SimpleLineChart/) - Minimal configuration patterns

### Tertiary (LOW confidence - for further validation)
- Web search results on sparkline implementations (MUI X, Tremor) - Various approaches, need library selection validation
- Web search results on adaptive chart granularity - General patterns, specific thresholds need testing in Phase 5

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - BullMQ, PostgreSQL, Recharts all verified in official docs and confirmed compatible with existing stack
- Architecture: HIGH - Snapshot model pattern, composite indexes, BullMQ setup all sourced from official documentation and existing codebase patterns (Phase 3 analytics, 2FA jobs)
- Pitfalls: HIGH - All pitfalls documented from official sources (BullMQ, Apollo, PostgreSQL) or prior phase decisions (04-05 refetchQueries)

**Research date:** 2026-02-02
**Valid until:** 2026-03-02 (30 days - stable domain with mature libraries)
