import { differenceInDays, addDays } from 'date-fns';

export type Frequency = 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'ANNUALLY';

export interface TransactionInput {
  id: string;
  date: Date;
  amount: number;
  merchant: string | null;
  category: string;
  type: 'INCOME' | 'EXPENSE' | 'TRANSFER';
}

export interface RecurringPattern {
  merchantName: string;
  frequency: Frequency;
  averageAmount: number;
  lastAmount: number;
  lastDate: Date;
  firstDate: Date;
  nextExpectedDate: Date;
  transactionIds: string[];
  category: string;
  status: 'ACTIVE' | 'POSSIBLY_CANCELLED';
  description: string;
}

/**
 * Normalize merchant name for grouping
 * - Strips special characters except spaces
 * - Removes corporate suffixes (Inc, LLC, Corp, Ltd, Co, Com)
 * - Removes long numbers (4+ digits)
 * - Removes asterisks
 * - Trims and collapses whitespace
 * - Converts to lowercase
 */
export function normalizeMerchant(raw: string): string {
  if (!raw) return '';

  let normalized = raw.toLowerCase();

  // Remove asterisks
  normalized = normalized.replace(/\*/g, '');

  // Remove periods and commas
  normalized = normalized.replace(/[.,]/g, ' ');

  // Remove long numbers (4+ consecutive digits)
  normalized = normalized.replace(/\b\d{4,}\b/g, '');

  // Remove corporate suffixes at the end
  normalized = normalized.replace(/\s+(inc|llc|corp|ltd|co|com)\.?\s*$/i, '');

  // Remove special chars except spaces and alphanumerics
  normalized = normalized.replace(/[^a-z0-9\s]/g, '');

  // Collapse multiple spaces and trim
  normalized = normalized.replace(/\s+/g, ' ').trim();

  return normalized;
}

/**
 * Classify average interval into frequency category
 * Ranges allow for some variance in billing dates
 */
export function classifyFrequency(avgDays: number): Frequency | null {
  if (avgDays >= 5 && avgDays <= 9) return 'WEEKLY';
  if (avgDays >= 11 && avgDays <= 17) return 'BIWEEKLY';
  if (avgDays >= 25 && avgDays <= 35) return 'MONTHLY';
  if (avgDays >= 82 && avgDays <= 98) return 'QUARTERLY';
  if (avgDays >= 340 && avgDays <= 390) return 'ANNUALLY';
  return null;
}

/**
 * Convert amount to monthly equivalent based on frequency
 */
export function normalizeToMonthly(amount: number, frequency: Frequency): number {
  const multipliers: Record<Frequency, number> = {
    WEEKLY: 52 / 12, // ~4.33
    BIWEEKLY: 26 / 12, // ~2.17
    MONTHLY: 1,
    QUARTERLY: 1 / 3,
    ANNUALLY: 1 / 12,
  };

  return amount * multipliers[frequency];
}

interface TransactionGroup {
  merchant: string;
  transactions: TransactionInput[];
}

interface AmountGroup {
  avgAmount: number;
  transactions: TransactionInput[];
}

/**
 * Detect recurring transaction patterns from raw transactions
 *
 * Algorithm:
 * 1. Group by normalized merchant name
 * 2. Within each merchant, sub-group by amount (10% tolerance)
 * 3. For each amount group with 3+ transactions:
 *    - Calculate intervals between consecutive dates
 *    - Check interval consistency (within 20% of average)
 *    - Classify frequency
 *    - Check for habitual spending (high frequency + high variance = excluded)
 * 4. Calculate next expected date and status
 */
export function detectRecurringPatterns(transactions: TransactionInput[]): RecurringPattern[] {
  const patterns: RecurringPattern[] = [];

  // Sort by date ascending
  const sortedTxns = [...transactions].sort((a, b) => a.date.getTime() - b.date.getTime());

  // Group by normalized merchant
  const merchantGroups: Map<string, TransactionInput[]> = new Map();

  for (const txn of sortedTxns) {
    const normalizedMerchant = normalizeMerchant(txn.merchant || 'unknown');
    if (!normalizedMerchant) continue;

    if (!merchantGroups.has(normalizedMerchant)) {
      merchantGroups.set(normalizedMerchant, []);
    }
    merchantGroups.get(normalizedMerchant)!.push(txn);
  }

  // Process each merchant group
  for (const [merchantName, merchantTxns] of merchantGroups.entries()) {
    if (merchantTxns.length < 3) continue;

    // Check for habitual spending BEFORE amount grouping (exclude entire merchant if habitual)
    if (isHabitual(merchantTxns)) continue;

    // Sub-group by amount (10% tolerance)
    const amountGroups = groupByAmount(merchantTxns, 0.1);

    for (const amountGroup of amountGroups) {
      if (amountGroup.transactions.length < 3) continue;

      // Calculate intervals between consecutive transactions
      const intervals = calculateIntervals(amountGroup.transactions);
      if (intervals.length === 0) continue;

      // Check interval consistency (within 20% of average)
      const avgInterval = intervals.reduce((sum, val) => sum + val, 0) / intervals.length;
      const isConsistent = intervals.every(interval => {
        const deviation = Math.abs(interval - avgInterval) / avgInterval;
        return deviation <= 0.2;
      });

      if (!isConsistent) continue;

      // Classify frequency
      const frequency = classifyFrequency(avgInterval);
      if (!frequency) continue;

      // Build pattern
      const txns = amountGroup.transactions;
      const lastTxn = txns[txns.length - 1];
      const firstTxn = txns[0];

      const amounts = txns.map(t => t.amount);
      const averageAmount = amounts.reduce((sum, val) => sum + val, 0) / amounts.length;

      // Calculate next expected date
      const nextExpectedDate = addDays(lastTxn.date, Math.round(avgInterval));

      // Determine status
      const now = new Date();
      const daysSinceLastTransaction = differenceInDays(now, lastTxn.date);
      const status = daysSinceLastTransaction > avgInterval * 2 ? 'POSSIBLY_CANCELLED' : 'ACTIVE';

      // Generate description
      const description = generateDescription(merchantName, frequency, averageAmount, txns[0].type);

      patterns.push({
        merchantName,
        frequency,
        averageAmount,
        lastAmount: lastTxn.amount,
        lastDate: lastTxn.date,
        firstDate: firstTxn.date,
        nextExpectedDate,
        transactionIds: txns.map(t => t.id),
        category: lastTxn.category,
        status,
        description,
      });
    }
  }

  return patterns;
}

/**
 * Group transactions by amount with tolerance
 * Uses clustering to find distinct amount groups
 */
function groupByAmount(transactions: TransactionInput[], tolerance: number): AmountGroup[] {
  if (transactions.length === 0) return [];

  // Sort by amount to make clustering easier
  const sorted = [...transactions].sort((a, b) => a.amount - b.amount);

  const groups: AmountGroup[] = [];
  let currentGroup: TransactionInput[] = [sorted[0]];
  let currentAvg = sorted[0].amount;

  for (let i = 1; i < sorted.length; i++) {
    const amount = sorted[i].amount;
    const deviation = Math.abs(amount - currentAvg) / currentAvg;

    if (deviation <= tolerance) {
      // Add to current group
      currentGroup.push(sorted[i]);
      // Update running average
      currentAvg = currentGroup.reduce((sum, t) => sum + t.amount, 0) / currentGroup.length;
    } else {
      // Start new group
      if (currentGroup.length > 0) {
        groups.push({
          avgAmount: currentAvg,
          transactions: currentGroup.sort((a, b) => a.date.getTime() - b.date.getTime()),
        });
      }
      currentGroup = [sorted[i]];
      currentAvg = sorted[i].amount;
    }
  }

  // Add final group
  if (currentGroup.length > 0) {
    groups.push({
      avgAmount: currentAvg,
      transactions: currentGroup.sort((a, b) => a.date.getTime() - b.date.getTime()),
    });
  }

  return groups;
}

/**
 * Calculate intervals (in days) between consecutive transactions
 */
function calculateIntervals(transactions: TransactionInput[]): number[] {
  if (transactions.length < 2) return [];

  const intervals: number[] = [];
  for (let i = 1; i < transactions.length; i++) {
    const days = differenceInDays(transactions[i].date, transactions[i - 1].date);
    if (days > 0) {
      intervals.push(days);
    }
  }

  return intervals;
}

/**
 * Detect habitual spending patterns to exclude
 * High frequency (>10 per month) + high amount variance (>20%)
 *
 * Important: This check applies to the ORIGINAL merchant group before
 * amount-based sub-grouping, not to individual amount groups.
 */
function isHabitual(transactions: TransactionInput[]): boolean {
  // Need at least 10 transactions to be habitual
  if (transactions.length < 10) return false;

  // Calculate time span
  const sortedTxns = [...transactions].sort((a, b) => a.date.getTime() - b.date.getTime());
  const firstDate = sortedTxns[0].date;
  const lastDate = sortedTxns[sortedTxns.length - 1].date;
  const daySpan = differenceInDays(lastDate, firstDate);

  if (daySpan === 0) return false;

  // Calculate frequency (transactions per 30 days)
  const txnsPerMonth = (transactions.length / daySpan) * 30;

  // Must be high frequency
  if (txnsPerMonth <= 10) return false;

  // Calculate amount variance
  const amounts = transactions.map(t => t.amount);
  const avgAmount = amounts.reduce((sum, val) => sum + val, 0) / amounts.length;

  const variance = amounts.reduce((sum, val) => {
    const diff = val - avgAmount;
    return sum + diff * diff;
  }, 0) / amounts.length;

  const stdDev = Math.sqrt(variance);
  const coefficientOfVariation = stdDev / avgAmount;

  // High variance if coefficient > 20%
  return coefficientOfVariation > 0.2;
}

/**
 * Generate human-readable description for the pattern
 */
function generateDescription(
  merchantName: string,
  frequency: Frequency,
  amount: number,
  type: 'INCOME' | 'EXPENSE' | 'TRANSFER'
): string {
  const frequencyText = frequency.toLowerCase();
  const amountText = `$${amount.toFixed(2)}`;

  const merchantDisplay = merchantName
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

  if (type === 'INCOME') {
    return `${frequencyText.charAt(0).toUpperCase() + frequencyText.slice(1)} income from ${merchantDisplay} (~${amountText})`;
  } else {
    return `${frequencyText.charAt(0).toUpperCase() + frequencyText.slice(1)} payment to ${merchantDisplay} (~${amountText})`;
  }
}
