import type { ParsedTransaction, PreviewTransaction } from './types';
import crypto from 'crypto';

export function generateFingerprint(txn: ParsedTransaction): string {
  const dateStr = txn.date.toISOString().split('T')[0];
  const amountStr = txn.amount.toFixed(2);
  const desc = txn.description.toLowerCase().replace(/\s+/g, ' ').trim();
  return crypto
    .createHash('sha256')
    .update(`${dateStr}|${amountStr}|${txn.type}|${desc}`)
    .digest('hex')
    .substring(0, 16);
}

export async function detectDuplicates(
  prisma: any,
  userId: string,
  transactions: ParsedTransaction[],
  accountId?: string
): Promise<PreviewTransaction[]> {
  // Fetch existing transactions for comparison
  const dateRange = getDateRange(transactions);
  if (!dateRange) {
    return transactions.map((txn) => ({
      ...txn,
      isDuplicate: false,
      suggestedCategory: txn.category || 'Other',
      categoryConfidence: (txn as any).confidence ?? 50,
      categorySource: (txn as any).source ?? 'keyword',
      cleanedMerchant: (txn as any).cleanedMerchant ?? txn.merchant ?? '',
    }));
  }

  const whereClause: any = {
    userId,
    date: {
      gte: dateRange.start,
      lte: dateRange.end,
    },
  };
  if (accountId) {
    whereClause.accountId = accountId;
  }

  const existingTransactions = await prisma.transaction.findMany({
    where: whereClause,
    select: {
      id: true,
      date: true,
      amount: true,
      type: true,
      description: true,
      plaidTransactionId: true,
    },
  });

  // Build fingerprint set from existing transactions
  const existingFingerprints = new Map<string, string>();
  const existingFitIds = new Set<string>();

  for (const existing of existingTransactions) {
    const fingerprint = generateFingerprint({
      date: existing.date,
      amount: Number(existing.amount),
      type: existing.type as any,
      description: existing.description || '',
    });
    existingFingerprints.set(fingerprint, existing.id);

    if (existing.plaidTransactionId) {
      existingFitIds.add(existing.plaidTransactionId);
    }
  }

  return transactions.map((txn) => {
    let isDuplicate = false;
    let duplicateOf: string | undefined;

    // Check FITID first (most reliable for OFX)
    if (txn.fitId && existingFitIds.has(txn.fitId)) {
      isDuplicate = true;
    }

    // Check fingerprint
    if (!isDuplicate) {
      const fingerprint = generateFingerprint(txn);
      const existingId = existingFingerprints.get(fingerprint);
      if (existingId) {
        isDuplicate = true;
        duplicateOf = existingId;
      }
    }

    return {
      ...txn,
      isDuplicate,
      duplicateOf,
      suggestedCategory: txn.category || 'Other',
      categoryConfidence: (txn as any).confidence ?? 50,
      categorySource: (txn as any).source ?? 'keyword',
      cleanedMerchant: (txn as any).cleanedMerchant ?? txn.merchant ?? '',
    };
  });
}

function getDateRange(transactions: ParsedTransaction[]): { start: Date; end: Date } | null {
  if (transactions.length === 0) return null;

  let minDate = transactions[0].date;
  let maxDate = transactions[0].date;

  for (const txn of transactions) {
    if (txn.date < minDate) minDate = txn.date;
    if (txn.date > maxDate) maxDate = txn.date;
  }

  // Extend range by 1 day on each side for fuzzy matching
  const start = new Date(minDate);
  start.setDate(start.getDate() - 1);
  const end = new Date(maxDate);
  end.setDate(end.getDate() + 1);

  return { start, end };
}
