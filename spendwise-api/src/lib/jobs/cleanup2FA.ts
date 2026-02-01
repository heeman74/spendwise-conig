import { prisma } from '../prisma';

/**
 * Cleanup expired 2FA codes
 * Should be run periodically (e.g., hourly via cron)
 */
export async function cleanup2FACodes(): Promise<void> {
  try {
    const deleted = await prisma.twoFactorCode.deleteMany({
      where: {
        expiresAt: { lt: new Date() },
      },
    });

    console.log(`[2FA Cleanup] Deleted ${deleted.count} expired 2FA codes`);
  } catch (error) {
    console.error('[2FA Cleanup] Failed to cleanup expired codes:', error);
  }
}

/**
 * Cleanup old 2FA logs (retention policy: 90 days)
 * Should be run periodically (e.g., daily via cron)
 */
export async function cleanup2FALogs(): Promise<void> {
  try {
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    const deleted = await prisma.twoFactorLog.deleteMany({
      where: {
        createdAt: { lt: ninetyDaysAgo },
      },
    });

    console.log(`[2FA Cleanup] Deleted ${deleted.count} old 2FA logs`);
  } catch (error) {
    console.error('[2FA Cleanup] Failed to cleanup old logs:', error);
  }
}

/**
 * Run both cleanup jobs
 */
export async function runAllCleanupJobs(): Promise<void> {
  console.log('[2FA Cleanup] Starting cleanup jobs...');
  await cleanup2FACodes();
  await cleanup2FALogs();
  console.log('[2FA Cleanup] Cleanup jobs completed');
}
