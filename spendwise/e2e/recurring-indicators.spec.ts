import { test, expect } from '@playwright/test';
import {
  seedRecurringTestData,
  disconnectPrisma,
  type TestUser,
} from './helpers/recurring-test-data';
import { signInWithNextAuth } from './helpers/sign-in';

// Force all tests in this file to run sequentially in a single worker
// to avoid race conditions with shared test data
test.describe.configure({ mode: 'serial' });

// ---------------------------------------------------------------------------
// Test lifecycle: seed real data before all tests
// Cleanup is handled by global teardown (e2e/global-teardown.ts)
// ---------------------------------------------------------------------------

let testUser: TestUser;

test.beforeAll(async () => {
  testUser = await seedRecurringTestData();
});

test.afterAll(async () => {
  await disconnectPrisma();
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

test.describe('Recurring Indicators', () => {
  test.beforeEach(async ({ page }) => {
    await signInWithNextAuth(page, testUser.email, testUser.password);
  });

  test.describe('Transactions Page - Recurring Badges', () => {
    test.beforeEach(async ({ page }) => {
      await page.getByRole('link', { name: /transactions/i }).first().click();
      await page.waitForURL(/\/transactions/, { timeout: 10000 });
      // Wait for transactions to load from the API
      await expect(page.getByText('$15.99')).toBeVisible({ timeout: 15000 });
    });

    test('should display transactions page', async ({ page }) => {
      await expect(page.getByRole('heading', { name: /transactions/i })).toBeVisible();
    });

    test('should display transaction amounts', async ({ page }) => {
      await expect(page.getByText('$15.99')).toBeVisible();
      await expect(page.getByText('$85.50')).toBeVisible();
      await expect(page.getByText('$49.99')).toBeVisible();
      await expect(page.getByText('$32.47')).toBeVisible();
      await expect(page.getByText('$45.00')).toBeVisible();
    });

    test('should show recurring badges on recurring transactions', async ({ page }) => {
      const recurringBadges = page.locator('text=/^(Monthly|Weekly|Biweekly)$/');

      // Exactly 3 recurring badges should be visible
      await expect(recurringBadges).toHaveCount(3);
      await expect(page.getByText('Monthly', { exact: true })).toBeVisible();
      await expect(page.getByText('Weekly', { exact: true })).toBeVisible();
      await expect(page.getByText('Biweekly', { exact: true })).toBeVisible();
    });

    test('should display recurring badge with purple styling', async ({ page }) => {
      const purpleBadges = page.locator('.bg-purple-100');
      await expect(purpleBadges).toHaveCount(3);
      await expect(purpleBadges.first()).toBeVisible();
    });

    test('should show recurring badge inline with merchant name', async ({ page }) => {
      // "Monthly" badge should be in the same row as "Netflix"
      const netflixRow = page.locator('tr').filter({ hasText: 'Netflix' });
      await expect(netflixRow.getByText('Monthly', { exact: true })).toBeVisible();
      await expect(netflixRow.locator('text=/\\$15\\.99/')).toBeVisible();

      // "Weekly" badge should be in the same row as "Whole Foods"
      const wholeFoodsRow = page.locator('tr').filter({ hasText: 'Whole Foods' });
      await expect(wholeFoodsRow.getByText('Weekly', { exact: true })).toBeVisible();
      await expect(wholeFoodsRow.locator('text=/\\$85\\.50/')).toBeVisible();
    });

    test('should not show recurring badge on non-recurring transactions', async ({ page }) => {
      // Target row should have no frequency badge
      const targetRow = page.locator('tr').filter({ hasText: 'Target' });
      await expect(targetRow).toBeVisible();
      await expect(
        targetRow.locator('text=/^(Monthly|Weekly|Biweekly|Quarterly|Annual)$/')
      ).toHaveCount(0);

      // Shell Gas row should have no frequency badge
      const shellRow = page.locator('tr').filter({ hasText: 'Shell Gas' });
      await expect(shellRow).toBeVisible();
      await expect(
        shellRow.locator('text=/^(Monthly|Weekly|Biweekly|Quarterly|Annual)$/')
      ).toHaveCount(0);
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
        await expect(page.getByRole('heading', { name: /recurring/i }).first()).toBeVisible();
      }
    });
  });
});
