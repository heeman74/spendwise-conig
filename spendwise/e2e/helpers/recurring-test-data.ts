import { PrismaClient } from '@prisma/client';
import { hash } from 'bcryptjs';

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL || 'postgresql://spendwise:spendwise123@localhost:5433/spendwise',
    },
  },
});

const TEST_EMAIL = 'e2e-recurring@spendwise.com';
const TEST_PASSWORD = 'e2e-test-password';

export interface TestUser {
  email: string;
  password: string;
  userId: string;
}

/**
 * Seeds deterministic test data for recurring indicator E2E tests.
 * Idempotent: if the test user already exists with data, returns it as-is.
 *
 * Creates:
 * - 1 test user (e2e-recurring@spendwise.com)
 * - 1 checking account
 * - 5 transactions (3 with recurring info, 2 without)
 * - 3 recurring transaction records linked to the appropriate transactions
 */
export async function seedRecurringTestData(): Promise<TestUser> {
  // Check if test user already exists (another worker may have seeded it)
  const existingUser = await prisma.user.findUnique({ where: { email: TEST_EMAIL } });
  if (existingUser) {
    // Verify the user has transaction data (not a partial cleanup state)
    const txnCount = await prisma.transaction.count({ where: { userId: existingUser.id } });
    if (txnCount >= 5) {
      return { email: TEST_EMAIL, password: TEST_PASSWORD, userId: existingUser.id };
    }
    // Partial state — clean up and re-seed
    await cleanupRecurringTestData(existingUser.id);
  }

  // Create test user — handle race condition where another worker creates it simultaneously
  const hashedPassword = await hash(TEST_PASSWORD, 10);
  let user: { id: string; email: string };
  try {
    user = await prisma.user.create({
      data: {
        email: TEST_EMAIL,
        password: hashedPassword,
        name: 'E2E Recurring Test',
      },
    });
  } catch (error: any) {
    // Unique constraint violation — another worker created it first
    if (error?.code === 'P2002') {
      // Wait briefly for the other worker to finish seeding, then return the existing user
      await new Promise((resolve) => setTimeout(resolve, 2000));
      const raceUser = await prisma.user.findUnique({ where: { email: TEST_EMAIL } });
      if (raceUser) {
        return { email: TEST_EMAIL, password: TEST_PASSWORD, userId: raceUser.id };
      }
    }
    throw error;
  }

  // Create checking account
  const account = await prisma.account.create({
    data: {
      userId: user.id,
      name: 'Main Checking',
      type: 'CHECKING',
      balance: 5000,
      institution: 'Test Bank',
    },
  });

  // Create 5 transactions
  const txnNetflix = await prisma.transaction.create({
    data: {
      userId: user.id,
      accountId: account.id,
      amount: 15.99,
      type: 'EXPENSE',
      category: 'Entertainment',
      merchant: 'Netflix',
      description: 'Streaming subscription',
      date: new Date('2025-01-15T00:00:00Z'),
      categoryConfidence: 95,
      categorySource: 'ai',
    },
  });

  const txnWholeFoods = await prisma.transaction.create({
    data: {
      userId: user.id,
      accountId: account.id,
      amount: 85.50,
      type: 'EXPENSE',
      category: 'Groceries',
      merchant: 'Whole Foods',
      description: 'Weekly groceries',
      date: new Date('2025-01-14T00:00:00Z'),
      categoryConfidence: 90,
      categorySource: 'ai',
    },
  });

  const txnPlanetFitness = await prisma.transaction.create({
    data: {
      userId: user.id,
      accountId: account.id,
      amount: 49.99,
      type: 'EXPENSE',
      category: 'Health',
      merchant: 'Planet Fitness',
      description: 'Gym membership',
      date: new Date('2025-01-13T00:00:00Z'),
      categoryConfidence: 88,
      categorySource: 'ai',
    },
  });

  await prisma.transaction.create({
    data: {
      userId: user.id,
      accountId: account.id,
      amount: 32.47,
      type: 'EXPENSE',
      category: 'Shopping',
      merchant: 'Target',
      description: 'Household supplies',
      date: new Date('2025-01-12T00:00:00Z'),
      categoryConfidence: 80,
      categorySource: 'ai',
    },
  });

  await prisma.transaction.create({
    data: {
      userId: user.id,
      accountId: account.id,
      amount: 45.00,
      type: 'EXPENSE',
      category: 'Transportation',
      merchant: 'Shell Gas',
      description: 'Gas fill-up',
      date: new Date('2025-01-11T00:00:00Z'),
      categoryConfidence: 92,
      categorySource: 'ai',
    },
  });

  // Create recurring transaction records with transactionIds pointing to the real transactions
  await prisma.recurringTransaction.create({
    data: {
      userId: user.id,
      merchantName: 'Netflix',
      category: 'Entertainment',
      frequency: 'MONTHLY',
      isActive: true,
      lastAmount: 15.99,
      averageAmount: 15.99,
      lastDate: new Date('2025-01-15T00:00:00Z'),
      firstDate: new Date('2024-10-15T00:00:00Z'),
      nextExpectedDate: new Date('2025-02-15T00:00:00Z'),
      status: 'ACTIVE',
      transactionIds: [txnNetflix.id],
    },
  });

  await prisma.recurringTransaction.create({
    data: {
      userId: user.id,
      merchantName: 'Whole Foods',
      category: 'Groceries',
      frequency: 'WEEKLY',
      isActive: true,
      lastAmount: 85.50,
      averageAmount: 85.50,
      lastDate: new Date('2025-01-14T00:00:00Z'),
      firstDate: new Date('2024-11-01T00:00:00Z'),
      nextExpectedDate: new Date('2025-01-21T00:00:00Z'),
      status: 'ACTIVE',
      transactionIds: [txnWholeFoods.id],
    },
  });

  await prisma.recurringTransaction.create({
    data: {
      userId: user.id,
      merchantName: 'Planet Fitness',
      category: 'Health',
      frequency: 'BIWEEKLY',
      isActive: true,
      lastAmount: 49.99,
      averageAmount: 49.99,
      lastDate: new Date('2025-01-13T00:00:00Z'),
      firstDate: new Date('2024-09-01T00:00:00Z'),
      nextExpectedDate: new Date('2025-01-27T00:00:00Z'),
      status: 'ACTIVE',
      transactionIds: [txnPlanetFitness.id],
    },
  });

  return { email: TEST_EMAIL, password: TEST_PASSWORD, userId: user.id };
}

/**
 * Cleans up all test data created by seedRecurringTestData.
 * Deletes in FK-safe order. Never throws — logs errors instead.
 * Uses deleteMany for user to avoid "record not found" errors.
 */
export async function cleanupRecurringTestData(userId: string): Promise<void> {
  try {
    await prisma.recurringTransaction.deleteMany({ where: { userId } });
    await prisma.transaction.deleteMany({ where: { userId } });
    await prisma.account.deleteMany({ where: { userId } });
    await prisma.user.deleteMany({ where: { id: userId } });
  } catch (error) {
    console.error('Cleanup error (non-fatal):', error);
  }
}

/**
 * Clean up by email — useful when userId is not available.
 */
export async function cleanupRecurringTestDataByEmail(): Promise<void> {
  try {
    const user = await prisma.user.findUnique({ where: { email: TEST_EMAIL } });
    if (user) {
      await cleanupRecurringTestData(user.id);
    }
  } catch (error) {
    console.error('Cleanup by email error (non-fatal):', error);
  }
}

/**
 * Disconnects the Prisma client. Call in afterAll.
 */
export async function disconnectPrisma(): Promise<void> {
  await prisma.$disconnect();
}
