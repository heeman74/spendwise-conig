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

/**
 * Default category type mapping for seeding
 * Maps category name to its type (INCOME, EXPENSE, BOTH)
 */
export const DEFAULT_CATEGORY_TYPES: Record<string, string> = {
  'Food & Dining': 'EXPENSE',
  'Groceries': 'EXPENSE',
  'Shopping': 'EXPENSE',
  'Transportation': 'EXPENSE',
  'Bills & Utilities': 'EXPENSE',
  'Entertainment': 'EXPENSE',
  'Healthcare': 'EXPENSE',
  'Travel': 'EXPENSE',
  'Education': 'EXPENSE',
  'Personal Care': 'EXPENSE',
  'Income': 'INCOME',
  'Transfer': 'BOTH',
  'Other': 'EXPENSE',
};

/**
 * Ensures a user has their default categories seeded.
 * Checks count first (cheap query), bulk-creates defaults if zero.
 */
export async function ensureUserCategoriesSeeded(prisma: any, userId: string): Promise<void> {
  const count = await prisma.userCategory.count({ where: { userId } });
  if (count > 0) return;

  const categories = Object.entries(DEFAULT_CATEGORY_TYPES).map(([name, type], index) => ({
    userId,
    name,
    type,
    isDefault: true,
    sortOrder: index,
  }));

  await prisma.userCategory.createMany({
    data: categories,
    skipDuplicates: true,
  });
}

/**
 * Returns the user's category names. Seeds defaults first if needed.
 */
export async function getUserCategoryNames(prisma: any, userId: string): Promise<string[]> {
  await ensureUserCategoriesSeeded(prisma, userId);
  const categories = await prisma.userCategory.findMany({
    where: { userId },
    select: { name: true },
    orderBy: { sortOrder: 'asc' },
  });
  return categories.map((c: { name: string }) => c.name);
}
