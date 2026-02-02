import {
  normalizeMerchant,
  classifyFrequency,
  normalizeToMonthly,
  detectRecurringPatterns,
  TransactionInput,
  RecurringPattern,
  Frequency,
} from '../../lib/recurring-detector';
import { addDays, subDays } from 'date-fns';

describe('normalizeMerchant', () => {
  it('should normalize basic merchant names', () => {
    expect(normalizeMerchant('NETFLIX.COM')).toBe('netflix');
    expect(normalizeMerchant('Spotify USA Inc.')).toBe('spotify usa');
    expect(normalizeMerchant('SHELL OIL 04821')).toBe('shell oil');
  });

  it('should strip asterisks and special chars', () => {
    expect(normalizeMerchant('AMZN*MARKETPLACE')).toBe('amznmarketplace');
    expect(normalizeMerchant('SQ *COFFEE SHOP')).toBe('sq coffee shop');
  });

  it('should strip corporate suffixes', () => {
    expect(normalizeMerchant('Apple Inc.')).toBe('apple');
    expect(normalizeMerchant('Microsoft Corp')).toBe('microsoft');
    expect(normalizeMerchant('Amazon LLC')).toBe('amazon');
    expect(normalizeMerchant('Target Ltd')).toBe('target');
    expect(normalizeMerchant('Walmart Co')).toBe('walmart');
  });

  it('should strip long numbers but preserve short ones', () => {
    expect(normalizeMerchant('SHELL OIL 04821')).toBe('shell oil');
    expect(normalizeMerchant('STORE 12345')).toBe('store');
    expect(normalizeMerchant('Gas Station 123')).toBe('gas station 123');
  });

  it('should handle edge cases', () => {
    expect(normalizeMerchant('')).toBe('');
    expect(normalizeMerchant('   SPACES   ')).toBe('spaces');
    expect(normalizeMerchant('multiple    spaces')).toBe('multiple spaces');
  });
});

describe('classifyFrequency', () => {
  it('should classify weekly intervals', () => {
    expect(classifyFrequency(7)).toBe('WEEKLY');
    expect(classifyFrequency(6)).toBe('WEEKLY');
    expect(classifyFrequency(8)).toBe('WEEKLY');
  });

  it('should classify biweekly intervals', () => {
    expect(classifyFrequency(14)).toBe('BIWEEKLY');
    expect(classifyFrequency(12)).toBe('BIWEEKLY');
    expect(classifyFrequency(16)).toBe('BIWEEKLY');
  });

  it('should classify monthly intervals', () => {
    expect(classifyFrequency(30)).toBe('MONTHLY');
    expect(classifyFrequency(28)).toBe('MONTHLY');
    expect(classifyFrequency(31)).toBe('MONTHLY');
  });

  it('should classify quarterly intervals', () => {
    expect(classifyFrequency(90)).toBe('QUARTERLY');
    expect(classifyFrequency(85)).toBe('QUARTERLY');
    expect(classifyFrequency(95)).toBe('QUARTERLY');
  });

  it('should classify annual intervals', () => {
    expect(classifyFrequency(365)).toBe('ANNUALLY');
    expect(classifyFrequency(350)).toBe('ANNUALLY');
    expect(classifyFrequency(380)).toBe('ANNUALLY');
  });

  it('should return null for unclassifiable intervals', () => {
    expect(classifyFrequency(50)).toBeNull();
    expect(classifyFrequency(200)).toBeNull();
    expect(classifyFrequency(3)).toBeNull();
  });
});

describe('normalizeToMonthly', () => {
  it('should convert weekly to monthly', () => {
    expect(normalizeToMonthly(10, 'WEEKLY')).toBeCloseTo(43.3, 1);
  });

  it('should convert biweekly to monthly', () => {
    expect(normalizeToMonthly(100, 'BIWEEKLY')).toBeCloseTo(217, 0);
  });

  it('should keep monthly as-is', () => {
    expect(normalizeToMonthly(50, 'MONTHLY')).toBe(50);
  });

  it('should convert quarterly to monthly', () => {
    expect(normalizeToMonthly(300, 'QUARTERLY')).toBeCloseTo(100, 0);
  });

  it('should convert annual to monthly', () => {
    expect(normalizeToMonthly(120, 'ANNUALLY')).toBeCloseTo(10, 0);
  });
});

describe('detectRecurringPatterns', () => {
  const baseDate = new Date('2024-01-01');

  describe('basic pattern detection', () => {
    it('should detect monthly Netflix subscription', () => {
      const transactions: TransactionInput[] = [
        {
          id: '1',
          date: new Date('2024-01-01'),
          amount: 15.99,
          merchant: 'NETFLIX.COM',
          category: 'Entertainment',
          type: 'EXPENSE',
        },
        {
          id: '2',
          date: new Date('2024-02-01'),
          amount: 15.99,
          merchant: 'Netflix',
          category: 'Entertainment',
          type: 'EXPENSE',
        },
        {
          id: '3',
          date: new Date('2024-03-01'),
          amount: 15.99,
          merchant: 'NETFLIX',
          category: 'Entertainment',
          type: 'EXPENSE',
        },
      ];

      const patterns = detectRecurringPatterns(transactions);

      expect(patterns).toHaveLength(1);
      expect(patterns[0].merchantName).toBe('netflix');
      expect(patterns[0].frequency).toBe('MONTHLY');
      expect(patterns[0].averageAmount).toBeCloseTo(15.99, 2);
      expect(patterns[0].transactionIds).toHaveLength(3);
    });

    it('should detect weekly gym membership', () => {
      const transactions: TransactionInput[] = [
        {
          id: '1',
          date: new Date('2024-01-01'),
          amount: 25.0,
          merchant: 'GYM FITNESS',
          category: 'Health',
          type: 'EXPENSE',
        },
        {
          id: '2',
          date: addDays(new Date('2024-01-01'), 7),
          amount: 25.0,
          merchant: 'GYM FITNESS',
          category: 'Health',
          type: 'EXPENSE',
        },
        {
          id: '3',
          date: addDays(new Date('2024-01-01'), 14),
          amount: 25.0,
          merchant: 'GYM FITNESS',
          category: 'Health',
          type: 'EXPENSE',
        },
        {
          id: '4',
          date: addDays(new Date('2024-01-01'), 21),
          amount: 25.0,
          merchant: 'GYM FITNESS',
          category: 'Health',
          type: 'EXPENSE',
        },
        {
          id: '5',
          date: addDays(new Date('2024-01-01'), 28),
          amount: 25.0,
          merchant: 'GYM FITNESS',
          category: 'Health',
          type: 'EXPENSE',
        },
      ];

      const patterns = detectRecurringPatterns(transactions);

      expect(patterns).toHaveLength(1);
      expect(patterns[0].frequency).toBe('WEEKLY');
      expect(patterns[0].transactionIds).toHaveLength(5);
    });

    it('should not detect pattern with only 2 transactions', () => {
      const transactions: TransactionInput[] = [
        {
          id: '1',
          date: new Date('2024-01-01'),
          amount: 9.99,
          merchant: 'Spotify',
          category: 'Entertainment',
          type: 'EXPENSE',
        },
        {
          id: '2',
          date: new Date('2024-02-01'),
          amount: 9.99,
          merchant: 'Spotify',
          category: 'Entertainment',
          type: 'EXPENSE',
        },
      ];

      const patterns = detectRecurringPatterns(transactions);

      expect(patterns).toHaveLength(0);
    });
  });

  describe('multiple patterns from same merchant', () => {
    it('should detect multiple Netflix subscriptions at different amounts', () => {
      const transactions: TransactionInput[] = [
        // First subscription at $9.99
        {
          id: '1',
          date: new Date('2024-01-01'),
          amount: 9.99,
          merchant: 'Netflix',
          category: 'Entertainment',
          type: 'EXPENSE',
        },
        {
          id: '2',
          date: new Date('2024-02-01'),
          amount: 9.99,
          merchant: 'Netflix',
          category: 'Entertainment',
          type: 'EXPENSE',
        },
        {
          id: '3',
          date: new Date('2024-03-01'),
          amount: 9.99,
          merchant: 'Netflix',
          category: 'Entertainment',
          type: 'EXPENSE',
        },
        // Second subscription at $15.99
        {
          id: '4',
          date: new Date('2024-01-15'),
          amount: 15.99,
          merchant: 'Netflix',
          category: 'Entertainment',
          type: 'EXPENSE',
        },
        {
          id: '5',
          date: new Date('2024-02-15'),
          amount: 15.99,
          merchant: 'Netflix',
          category: 'Entertainment',
          type: 'EXPENSE',
        },
        {
          id: '6',
          date: new Date('2024-03-15'),
          amount: 15.99,
          merchant: 'Netflix',
          category: 'Entertainment',
          type: 'EXPENSE',
        },
      ];

      const patterns = detectRecurringPatterns(transactions);

      expect(patterns).toHaveLength(2);
      const amounts = patterns.map(p => p.averageAmount).sort();
      expect(amounts[0]).toBeCloseTo(9.99, 2);
      expect(amounts[1]).toBeCloseTo(15.99, 2);
    });
  });

  describe('amount tolerance', () => {
    it('should group transactions within 10% tolerance', () => {
      const transactions: TransactionInput[] = [
        {
          id: '1',
          date: new Date('2024-01-01'),
          amount: 9.99,
          merchant: 'Service',
          category: 'Subscription',
          type: 'EXPENSE',
        },
        {
          id: '2',
          date: new Date('2024-02-01'),
          amount: 9.99,
          merchant: 'Service',
          category: 'Subscription',
          type: 'EXPENSE',
        },
        {
          id: '3',
          date: new Date('2024-03-01'),
          amount: 10.49, // Within 10% of 9.99
          merchant: 'Service',
          category: 'Subscription',
          type: 'EXPENSE',
        },
      ];

      const patterns = detectRecurringPatterns(transactions);

      expect(patterns).toHaveLength(1);
      expect(patterns[0].transactionIds).toHaveLength(3);
    });

    it('should not group transactions beyond 10% tolerance', () => {
      const transactions: TransactionInput[] = [
        {
          id: '1',
          date: new Date('2024-01-01'),
          amount: 10.0,
          merchant: 'Service',
          category: 'Subscription',
          type: 'EXPENSE',
        },
        {
          id: '2',
          date: new Date('2024-02-01'),
          amount: 10.0,
          merchant: 'Service',
          category: 'Subscription',
          type: 'EXPENSE',
        },
        {
          id: '3',
          date: new Date('2024-03-01'),
          amount: 12.0, // 20% difference
          merchant: 'Service',
          category: 'Subscription',
          type: 'EXPENSE',
        },
      ];

      const patterns = detectRecurringPatterns(transactions);

      // Should either find no pattern or only the first 2
      expect(patterns.length).toBeLessThanOrEqual(1);
      if (patterns.length === 1) {
        expect(patterns[0].transactionIds.length).toBe(2);
      }
    });
  });

  describe('habitual spending exclusion', () => {
    it('should exclude Starbucks with high frequency and variable amounts', () => {
      const transactions: TransactionInput[] = [];

      // Generate 20 transactions over 30 days with varying amounts
      for (let i = 0; i < 20; i++) {
        transactions.push({
          id: `${i + 1}`,
          date: addDays(new Date('2024-01-01'), Math.floor(i * 1.5)),
          amount: 4 + Math.random() * 4, // $4-$8 range (high variance)
          merchant: 'Starbucks',
          category: 'Food',
          type: 'EXPENSE',
        });
      }

      const patterns = detectRecurringPatterns(transactions);

      // Should not detect pattern due to high variance
      expect(patterns).toHaveLength(0);
    });
  });

  describe('interval consistency', () => {
    it('should not detect pattern with inconsistent intervals', () => {
      const transactions: TransactionInput[] = [
        {
          id: '1',
          date: new Date('2024-01-01'),
          amount: 10.0,
          merchant: 'Service',
          category: 'Subscription',
          type: 'EXPENSE',
        },
        {
          id: '2',
          date: addDays(new Date('2024-01-01'), 10),
          amount: 10.0,
          merchant: 'Service',
          category: 'Subscription',
          type: 'EXPENSE',
        },
        {
          id: '3',
          date: addDays(new Date('2024-01-01'), 55), // Inconsistent gap
          amount: 10.0,
          merchant: 'Service',
          category: 'Subscription',
          type: 'EXPENSE',
        },
        {
          id: '4',
          date: addDays(new Date('2024-01-01'), 67),
          amount: 10.0,
          merchant: 'Service',
          category: 'Subscription',
          type: 'EXPENSE',
        },
      ];

      const patterns = detectRecurringPatterns(transactions);

      expect(patterns).toHaveLength(0);
    });
  });

  describe('status and next expected date', () => {
    it('should calculate next expected date', () => {
      const transactions: TransactionInput[] = [
        {
          id: '1',
          date: new Date('2024-01-01'),
          amount: 15.99,
          merchant: 'Netflix',
          category: 'Entertainment',
          type: 'EXPENSE',
        },
        {
          id: '2',
          date: new Date('2024-02-01'),
          amount: 15.99,
          merchant: 'Netflix',
          category: 'Entertainment',
          type: 'EXPENSE',
        },
        {
          id: '3',
          date: new Date('2024-03-01'),
          amount: 15.99,
          merchant: 'Netflix',
          category: 'Entertainment',
          type: 'EXPENSE',
        },
      ];

      const patterns = detectRecurringPatterns(transactions);

      expect(patterns).toHaveLength(1);
      expect(patterns[0].nextExpectedDate).toBeDefined();
      // Should be approximately 31 days after last transaction
      const daysDiff = Math.abs(
        (patterns[0].nextExpectedDate.getTime() - new Date('2024-04-01').getTime()) / (1000 * 60 * 60 * 24)
      );
      expect(daysDiff).toBeLessThan(2);
    });

    it('should mark as POSSIBLY_CANCELLED when payment is missed', () => {
      const oldDate = subDays(new Date(), 90); // 90 days ago

      const transactions: TransactionInput[] = [
        {
          id: '1',
          date: subDays(oldDate, 60),
          amount: 15.99,
          merchant: 'Netflix',
          category: 'Entertainment',
          type: 'EXPENSE',
        },
        {
          id: '2',
          date: subDays(oldDate, 30),
          amount: 15.99,
          merchant: 'Netflix',
          category: 'Entertainment',
          type: 'EXPENSE',
        },
        {
          id: '3',
          date: oldDate,
          amount: 15.99,
          merchant: 'Netflix',
          category: 'Entertainment',
          type: 'EXPENSE',
        },
      ];

      const patterns = detectRecurringPatterns(transactions);

      expect(patterns).toHaveLength(1);
      expect(patterns[0].status).toBe('POSSIBLY_CANCELLED');
    });

    it('should mark as ACTIVE when pattern is current', () => {
      const recentDate = subDays(new Date(), 15); // 15 days ago

      const transactions: TransactionInput[] = [
        {
          id: '1',
          date: subDays(recentDate, 60),
          amount: 15.99,
          merchant: 'Netflix',
          category: 'Entertainment',
          type: 'EXPENSE',
        },
        {
          id: '2',
          date: subDays(recentDate, 30),
          amount: 15.99,
          merchant: 'Netflix',
          category: 'Entertainment',
          type: 'EXPENSE',
        },
        {
          id: '3',
          date: recentDate,
          amount: 15.99,
          merchant: 'Netflix',
          category: 'Entertainment',
          type: 'EXPENSE',
        },
      ];

      const patterns = detectRecurringPatterns(transactions);

      expect(patterns).toHaveLength(1);
      expect(patterns[0].status).toBe('ACTIVE');
    });
  });

  describe('pattern metadata', () => {
    it('should include all required fields in pattern', () => {
      const transactions: TransactionInput[] = [
        {
          id: '1',
          date: new Date('2024-01-01'),
          amount: 15.99,
          merchant: 'Netflix',
          category: 'Entertainment',
          type: 'EXPENSE',
        },
        {
          id: '2',
          date: new Date('2024-02-01'),
          amount: 15.99,
          merchant: 'Netflix',
          category: 'Entertainment',
          type: 'EXPENSE',
        },
        {
          id: '3',
          date: new Date('2024-03-01'),
          amount: 15.99,
          merchant: 'Netflix',
          category: 'Entertainment',
          type: 'EXPENSE',
        },
      ];

      const patterns = detectRecurringPatterns(transactions);

      expect(patterns).toHaveLength(1);
      const pattern = patterns[0];

      expect(pattern).toHaveProperty('merchantName');
      expect(pattern).toHaveProperty('frequency');
      expect(pattern).toHaveProperty('averageAmount');
      expect(pattern).toHaveProperty('lastAmount');
      expect(pattern).toHaveProperty('lastDate');
      expect(pattern).toHaveProperty('firstDate');
      expect(pattern).toHaveProperty('nextExpectedDate');
      expect(pattern).toHaveProperty('transactionIds');
      expect(pattern).toHaveProperty('category');
      expect(pattern).toHaveProperty('status');
      expect(pattern).toHaveProperty('description');

      expect(pattern.lastAmount).toBe(15.99);
      expect(pattern.category).toBe('Entertainment');
      expect(pattern.description).toBeTruthy();
    });
  });
});
