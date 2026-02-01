import { Decimal } from '@prisma/client/runtime/library';

// Parse Prisma Decimal to number
export function parseDecimal(value: Decimal | number | string): number {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') return parseFloat(value);
  return value.toNumber();
}

// Get date range for the current month
export function getMonthRange(): { start: Date; end: Date } {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
  return { start, end };
}

// Get date range for the current week
export function getWeekRange(): { start: Date; end: Date } {
  const now = new Date();
  const dayOfWeek = now.getDay();
  const start = new Date(now);
  start.setDate(now.getDate() - dayOfWeek);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  end.setHours(23, 59, 59, 999);
  return { start, end };
}

// Get date range for the current year
export function getYearRange(): { start: Date; end: Date } {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 1);
  const end = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
  return { start, end };
}

// Get previous period range
export function getPreviousPeriodRange(period: 'WEEK' | 'MONTH' | 'YEAR'): { start: Date; end: Date } {
  const now = new Date();

  switch (period) {
    case 'WEEK': {
      const dayOfWeek = now.getDay();
      const start = new Date(now);
      start.setDate(now.getDate() - dayOfWeek - 7);
      start.setHours(0, 0, 0, 0);
      const end = new Date(start);
      end.setDate(start.getDate() + 6);
      end.setHours(23, 59, 59, 999);
      return { start, end };
    }
    case 'MONTH': {
      const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const end = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
      return { start, end };
    }
    case 'YEAR': {
      const start = new Date(now.getFullYear() - 1, 0, 1);
      const end = new Date(now.getFullYear() - 1, 11, 31, 23, 59, 59, 999);
      return { start, end };
    }
  }
}

// Category colors for charts
const categoryColors: Record<string, string> = {
  'Food & Dining': '#FF6384',
  'Transportation': '#36A2EB',
  'Shopping': '#FFCE56',
  'Entertainment': '#4BC0C0',
  'Bills & Utilities': '#9966FF',
  'Healthcare': '#FF9F40',
  'Travel': '#C9CBCF',
  'Education': '#7C4DFF',
  'Personal Care': '#FF6B6B',
  'Groceries': '#4CAF50',
  'Salary': '#2196F3',
  'Investment': '#9C27B0',
  'Other': '#607D8B',
};

export function getCategoryColor(category: string): string {
  return categoryColors[category] || '#' + Math.floor(Math.random() * 16777215).toString(16);
}
