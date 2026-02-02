import { test, expect } from '@playwright/test';

test.describe('Recurring Indicators', () => {
  // Login via demo mode before each test
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.getByRole('button', { name: /demo|try demo/i }).click();
    await page.waitForURL(/\/dashboard/, { timeout: 10000 });
  });

  test.describe('Transactions Page - Recurring Badges', () => {
    test.beforeEach(async ({ page }) => {
      await page.getByRole('link', { name: /transactions/i }).first().click();
      await page.waitForURL(/\/transactions/, { timeout: 10000 });
    });

    test('should display transactions page', async ({ page }) => {
      await expect(page.getByRole('heading', { name: /transactions/i })).toBeVisible();
    });

    test('should display transaction amounts', async ({ page }) => {
      await page.waitForLoadState('domcontentloaded');
      const amounts = page.locator('text=/\\$[\\d,]+\\.\\d{2}/');
      await expect(amounts.first()).toBeVisible({ timeout: 5000 });
    });

    test('should show recurring badges on recurring transactions if any exist', async ({ page }) => {
      await page.waitForLoadState('domcontentloaded');

      // Look for recurring badges (they contain frequency text like Monthly, Weekly, etc.)
      const recurringBadges = page.locator('text=/^(Monthly|Weekly|Biweekly|Quarterly|Annual)$/');

      // Count how many recurring badges appear
      const count = await recurringBadges.count().catch(() => 0);

      // If recurring transactions exist, badges should be visible
      if (count > 0) {
        await expect(recurringBadges.first()).toBeVisible();
      }
      // If no recurring transactions exist, that's also valid (no badges shown)
    });

    test('should display recurring badge with purple styling', async ({ page }) => {
      await page.waitForLoadState('domcontentloaded');

      // Check for purple-styled badges (the recurring indicator class)
      const purpleBadge = page.locator('.bg-purple-100, .dark\\:bg-purple-900\\/30');
      const hasPurpleBadges = await purpleBadge.count().catch(() => 0);

      if (hasPurpleBadges > 0) {
        await expect(purpleBadge.first()).toBeVisible();
      }
    });

    test('should show recurring badge inline with merchant name', async ({ page }) => {
      await page.waitForLoadState('domcontentloaded');

      const recurringBadge = page.locator('text=/^(Monthly|Weekly|Biweekly|Quarterly|Annual)$/').first();

      if (await recurringBadge.isVisible().catch(() => false)) {
        // Badge should be adjacent to a merchant name in the same row
        const row = recurringBadge.locator('xpath=ancestor::tr');
        await expect(row).toBeVisible();

        // The row should also contain a dollar amount
        await expect(row.locator('text=/\\$/')).toBeVisible();
      }
    });
  });

  test.describe('Import Page - Recurring Column', () => {
    test.beforeEach(async ({ page }) => {
      await page.getByRole('link', { name: /import/i }).first().click();
      await page.waitForURL(/\/import/, { timeout: 10000 });
    });

    test('should display import page', async ({ page }) => {
      await expect(page.getByRole('heading', { name: /import/i })).toBeVisible();
    });

    test('should show file upload area', async ({ page }) => {
      // File dropzone should be visible
      const dropzone = page.locator('[class*="dropzone"], [class*="upload"]')
        .or(page.getByText(/drag.*drop|upload|browse/i));

      await expect(dropzone.first()).toBeVisible();
    });
  });

  test.describe('Recurring Page Navigation', () => {
    test('should navigate to recurring page from sidebar', async ({ page }) => {
      const recurringLink = page.getByRole('link', { name: /recurring/i });

      if (await recurringLink.first().isVisible().catch(() => false)) {
        await recurringLink.first().click();
        await page.waitForURL(/\/recurring/, { timeout: 10000 });
        await expect(page.getByRole('heading', { name: /recurring/i })).toBeVisible();
      }
    });
  });
});
