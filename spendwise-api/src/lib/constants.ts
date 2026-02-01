/**
 * Shared category constants for transaction categorization
 * Used by AI categorizer, keyword categorizer, and validation
 */

export const VALID_CATEGORIES = [
  'Food & Dining',
  'Groceries',
  'Shopping',
  'Transportation',
  'Bills & Utilities',
  'Entertainment',
  'Healthcare',
  'Travel',
  'Education',
  'Personal Care',
  'Income',
  'Transfer',
  'Other',
] as const;

/**
 * VALID_CATEGORIES_TUPLE is typed as [string, ...string[]] for z.enum()
 * z.enum requires a non-empty tuple type, not a readonly array
 */
export const VALID_CATEGORIES_TUPLE = VALID_CATEGORIES as unknown as [string, ...string[]];

/**
 * Confidence threshold for "needs review" flag
 * Transactions below this confidence should be flagged for user review
 */
export const CONFIDENCE_THRESHOLD_REVIEW = 70;

/**
 * Confidence threshold for low confidence display
 * Transactions below this should show low confidence indicator
 */
export const CONFIDENCE_THRESHOLD_LOW = 60;
