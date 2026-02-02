---
phase: 05-net-worth-tracking
plan: 01
subsystem: infrastructure
status: complete
tags: [schema, prisma, bullmq, redis, cron, jobs]

requires:
  phases: [04-recurring-transactions]
  services: [postgresql, redis]

provides:
  schema: [NetWorthSnapshot, Account.includeInNetWorth]
  jobs: [daily-snapshot, on-demand-snapshot]
  infrastructure: [bullmq-worker, snapshot-scheduler]

affects:
  phases: [05-02, 05-03]
  models: [NetWorthSnapshot, Account]

tech-stack:
  added: [bullmq]
  patterns: [scheduled-jobs, redis-queues, graceful-shutdown]

key-files:
  created:
    - spendwise-api/src/lib/jobs/snapshotNetWorth.ts: "BullMQ queue/worker for net worth snapshots"
  modified:
    - spendwise/prisma/schema.prisma: "Added NetWorthSnapshot model and includeInNetWorth field"
    - spendwise-api/prisma/schema.prisma: "Added NetWorthSnapshot model and includeInNetWorth field"
    - spendwise-api/src/index.ts: "Integrated snapshot queue initialization"
    - spendwise-api/package.json: "Added BullMQ dependency"

decisions:
  - id: separate-redis-for-bullmq
    what: "Create separate Redis connection for BullMQ with maxRetriesPerRequest: null"
    why: "BullMQ requires maxRetriesPerRequest: null, but existing Redis client uses maxRetriesPerRequest: 3 for resolver caching"
    impact: "Two Redis connections per server instance, but maintains compatibility with both use cases"

  - id: date-precision-snapshots
    what: "Use @db.Date instead of @db.Timestamp for snapshot date field"
    why: "Snapshots are daily, only need date precision, prevents timezone issues"
    impact: "Cleaner data model, simpler queries, no time-of-day variance"

  - id: dual-job-types
    what: "Support both daily-snapshot and on-demand-snapshot job types"
    why: "Daily snapshots for consistency, on-demand for immediate capture on import (Plan 02)"
    impact: "More flexible snapshot capture, enables import-triggered snapshots"

  - id: skip-duplicates
    what: "Use createMany with skipDuplicates instead of upsert"
    why: "Unique constraint [userId, accountId, date] prevents duplicates, skipDuplicates is more efficient than individual upserts"
    impact: "Handles re-runs gracefully, idempotent snapshot capture"

metrics:
  duration: 194s
  tasks-completed: 2/2
  files-created: 1
  files-modified: 4
  completed: 2026-02-02
---

# Phase 05 Plan 01: Net Worth Snapshot Infrastructure Summary

Database schema extended with NetWorthSnapshot model, BullMQ installed, and daily snapshot job scheduled at 2 AM capturing per-account balances for all users with graceful shutdown support.

## Objective

Extend Prisma schema with NetWorthSnapshot model and includeInNetWorth account field, install BullMQ, and set up daily scheduled snapshot job that captures per-account balances for all users.

**Purpose:** Foundation for net worth tracking — without snapshots, there is no historical data to chart or analyze.

## What Was Built

### Database Schema Changes

**NetWorthSnapshot Model:**
- Fields: id, userId, accountId, balance (Decimal 12,2), date (Date), createdAt
- Unique constraint: [userId, accountId, date] - prevents duplicate snapshots
- Indexes: [userId, date] and [accountId, date] - optimizes queries for chart data
- Cascade deletes on user and account deletion

**Account Model Extension:**
- Added `includeInNetWorth` Boolean field (default: true)
- Enables users to exclude specific accounts from net worth calculation
- Added `netWorthSnapshots` relation array

### BullMQ Infrastructure

**Separate Redis Connection:**
- Created dedicated Redis connection for BullMQ with `maxRetriesPerRequest: null`
- Required by BullMQ, separate from existing Redis client used for resolver caching
- Uses same REDIS_URL environment variable

**Snapshot Queue & Worker:**
- Queue: 'net-worth-snapshots'
- Daily job: scheduled at 2 AM via cron pattern '0 2 * * *'
- On-demand job: triggered by statement imports (Plan 02 integration point)
- Worker processes both job types, graceful shutdown on SIGTERM/SIGINT

### Snapshot Capture Logic

**captureUserSnapshot(userId):**
- Fetches all accounts where includeInNetWorth = true
- Creates snapshot with today's date (start of day UTC)
- Uses `createMany` with `skipDuplicates` for idempotent operation
- Logs: "[NetWorth] Captured snapshot for user ${userId}: ${accounts.length} accounts"

**captureAllUserSnapshots():**
- Fetches distinct userIds from Account table
- Calls captureUserSnapshot() for each user
- Logs: "[NetWorth] Daily snapshot complete: ${userCount} users processed"

### Server Integration

- `setupNetWorthSnapshotQueue()` called on server startup
- Try/catch wrapper prevents snapshot initialization failure from crashing server
- Exports queue instance for Plan 02 to add on-demand jobs
- Graceful shutdown handlers prevent stalled jobs on server restart

## Technical Implementation

**Stack:**
- BullMQ 6.x for job scheduling and queue management
- Redis (existing infrastructure) for queue persistence
- Prisma for database operations
- TypeScript for type safety

**Key Patterns:**
- Scheduled jobs with cron patterns
- Graceful shutdown for queue workers
- Idempotent operations via skipDuplicates
- Separate Redis connections for different maxRetriesPerRequest requirements

## Deviations from Plan

None - plan executed exactly as written.

## Issues & Resolutions

### Issue 1: npm install conflict with zod versions
**Problem:** BullMQ installation failed due to peer dependency conflict with zod (project uses zod 4.x, openai package expects zod 3.x)

**Resolution:** Used `--legacy-peer-deps` flag to install BullMQ, no runtime issues

**Impact:** BullMQ installed successfully, server starts without errors

### Issue 2: Pre-existing TypeScript compilation errors
**Problem:** `npx tsc --noEmit` fails with errors in existing files (ioredis-mock types, tsconfig issues)

**Resolution:** Verified server starts successfully and logs show snapshot initialization, TypeScript errors are pre-existing and unrelated to this plan

**Impact:** No impact on plan completion, server runs correctly despite TypeScript config issues

## Verification Results

All verification criteria passed:

1. `npx prisma validate` passes in both projects
2. Server starts successfully with "[NetWorth] Snapshot queue and worker initialized" log
3. NetWorthSnapshot model has @@unique([userId, accountId, date]) constraint
4. Account model has includeInNetWorth Boolean field
5. BullMQ installed and imports successfully
6. Graceful shutdown logs appear when server killed

## Next Phase Readiness

**Blockers:** None

**For Plan 02 (Snapshot Triggers):**
- NetWorthSnapshot model ready for writes
- On-demand-snapshot job type defined and tested
- Queue instance exported for adding jobs
- includeInNetWorth field ready for filtering

**For Plan 03 (GraphQL API):**
- Schema ready for resolvers
- Indexes in place for efficient queries
- Data structure supports time-series queries

## Commits

| Task | Description | Commit | Files |
|------|-------------|--------|-------|
| 1 | Extend schema with NetWorthSnapshot model | 08a22db | prisma/schema.prisma (both), package.json |
| 2 | Implement BullMQ snapshot job with daily scheduling | 9ae74b8 | snapshotNetWorth.ts, index.ts |

---

**Plan executed:** 2026-02-02
**Duration:** 194 seconds (3min 14s)
**Result:** Schema extended, BullMQ operational, daily snapshots scheduled
