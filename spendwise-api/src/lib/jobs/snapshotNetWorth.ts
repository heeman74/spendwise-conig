import { Queue, Worker } from 'bullmq';
import Redis from 'ioredis';
import { prisma } from '../prisma';

// Create a separate Redis connection for BullMQ with maxRetriesPerRequest: null
const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
const bullmqRedis = new Redis(redisUrl, {
  maxRetriesPerRequest: null,
});

bullmqRedis.on('error', (err) => {
  console.error('[NetWorth] BullMQ Redis connection error:', err);
});

bullmqRedis.on('connect', () => {
  console.log('[NetWorth] BullMQ Redis connected');
});

/**
 * Capture net worth snapshot for a single user
 * @param userId - The user ID to capture snapshots for
 */
export async function captureUserSnapshot(userId: string): Promise<void> {
  try {
    // Fetch all accounts for user where includeInNetWorth is true
    const accounts = await prisma.account.findMany({
      where: {
        userId,
        includeInNetWorth: true,
      },
      select: {
        id: true,
        balance: true,
      },
    });

    if (accounts.length === 0) {
      console.log(`[NetWorth] No accounts to snapshot for user ${userId}`);
      return;
    }

    // Create snapshot date (start of day UTC)
    const snapshotDate = new Date();
    snapshotDate.setUTCHours(0, 0, 0, 0);

    // Prepare snapshot records
    const snapshots = accounts.map((account) => ({
      userId,
      accountId: account.id,
      balance: account.balance,
      date: snapshotDate,
    }));

    // Insert snapshots, skip duplicates
    await prisma.netWorthSnapshot.createMany({
      data: snapshots,
      skipDuplicates: true,
    });

    console.log(`[NetWorth] Captured snapshot for user ${userId}: ${accounts.length} accounts`);
  } catch (error) {
    console.error(`[NetWorth] Failed to capture snapshot for user ${userId}:`, error);
    throw error;
  }
}

/**
 * Capture net worth snapshots for all users
 */
export async function captureAllUserSnapshots(): Promise<void> {
  try {
    // Get all distinct userIds from Account table
    const users = await prisma.account.findMany({
      where: {
        includeInNetWorth: true,
      },
      select: {
        userId: true,
      },
      distinct: ['userId'],
    });

    console.log(`[NetWorth] Starting daily snapshot for ${users.length} users`);

    // Capture snapshots for each user
    for (const { userId } of users) {
      await captureUserSnapshot(userId);
    }

    console.log(`[NetWorth] Daily snapshot complete: ${users.length} users processed`);
  } catch (error) {
    console.error('[NetWorth] Failed to capture all user snapshots:', error);
    throw error;
  }
}

// Queue and worker instances
let queue: Queue | null = null;
let worker: Worker | null = null;

/**
 * Set up BullMQ queue and worker for net worth snapshots
 */
export async function setupNetWorthSnapshotQueue(): Promise<{ queue: Queue; worker: Worker }> {
  // Create queue
  queue = new Queue('net-worth-snapshots', {
    connection: bullmqRedis,
  });

  // Add daily repeating job (runs at 2 AM every day)
  await queue.add(
    'daily-snapshot',
    {},
    {
      repeat: {
        pattern: '0 2 * * *', // Cron pattern: At 02:00 AM every day
      },
    }
  );

  // Create worker to process jobs
  worker = new Worker(
    'net-worth-snapshots',
    async (job) => {
      if (job.name === 'daily-snapshot') {
        await captureAllUserSnapshots();
      } else if (job.name === 'on-demand-snapshot') {
        const { userId } = job.data;
        if (!userId) {
          throw new Error('userId is required for on-demand-snapshot job');
        }
        await captureUserSnapshot(userId);
      }
    },
    {
      connection: bullmqRedis,
    }
  );

  // Set up graceful shutdown
  const shutdown = async () => {
    console.log('[NetWorth] Shutting down snapshot worker...');
    if (worker) {
      await worker.close();
    }
    if (queue) {
      await queue.close();
    }
    console.log('[NetWorth] Snapshot worker shut down gracefully');
    process.exit(0);
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);

  console.log('[NetWorth] Snapshot queue and worker initialized');

  return { queue, worker };
}

// Export queue instance for use in Plan 02
export { queue };
