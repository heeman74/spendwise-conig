import { test, expect } from '@playwright/test';

test.describe('Dashboard', () => {
  // Login via demo mode before each test
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.getByRole('button', { name: /demo|try demo/i }).click();
    await page.waitForURL(/\/dashboard/, { timeout: 10000 });

    // On mobile, the sidebar opens by default and its overlay (z-30)
    // intercepts clicks on the bottom nav (z-20). Dismiss it by
    // dispatching a click event directly on the overlay element (the
    // sidebar covers the overlay's center, so a normal click would hit
    // the sidebar instead).
    const sidebarOverlay = page.locator('div[class*="bg-black"]');
    if (await sidebarOverlay.isVisible().catch(() => false)) {
      await sidebarOverlay.dispatchEvent('click');
      await sidebarOverlay.waitFor({ state: 'hidden', timeout: 1000 }).catch(() => {});
    }
  });

  test.describe('Dashboard Layout', () => {
    test('should display page header', async ({ page }) => {
      await expect(page.getByRole('heading', { name: /dashboard/i })).toBeVisible();
    });

    test('should display sidebar navigation', async ({ page }) => {
      // On mobile, the sidebar is hidden and a bottom nav bar is used instead.
      // The bottom nav uses "Home" instead of "Dashboard", and both nav elements
      // exist in the DOM, so we must disambiguate to avoid strict-mode violations.
      const isMobile = (page.viewportSize()?.width ?? 1280) < 1024;

      if (isMobile) {
        const bottomNav = page.getByRole('navigation').last();
        await expect(bottomNav.getByRole('link', { name: /home/i })).toBeVisible();
        await expect(bottomNav.getByRole('link', { name: /transactions/i })).toBeVisible();
        await expect(bottomNav.getByRole('link', { name: /accounts/i })).toBeVisible();
      } else {
        await expect(page.getByRole('link', { name: /dashboard/i })).toBeVisible();
        await expect(page.getByRole('link', { name: /transactions/i })).toBeVisible();
        await expect(page.getByRole('link', { name: /accounts/i })).toBeVisible();
      }
    });

    test('should display header with user info', async ({ page }) => {
      // Check for header elements
      const header = page.locator('header');
      await expect(header).toBeVisible();
    });
  });

  test.describe('Stats Cards', () => {
    test('should display total balance card', async ({ page }) => {
      await expect(page.getByText(/total balance/i)).toBeVisible();
    });

    test('should display monthly income card', async ({ page }) => {
      await expect(page.getByText(/monthly income/i)).toBeVisible();
    });

    test('should display monthly expenses card', async ({ page }) => {
      await expect(page.getByText(/monthly expenses/i)).toBeVisible();
    });

    test('should display savings rate card', async ({ page }) => {
      await expect(page.getByText(/savings rate/i)).toBeVisible();
    });

    test('should display formatted currency values', async ({ page }) => {
      // Check for dollar sign in stats
      await expect(page.locator('text=/\\$[\\d,]+/').first()).toBeVisible();
    });
  });

  test.describe('Spending Overview', () => {
    test('should display spending overview section', async ({ page }) => {
      await expect(page.getByText(/spending|expenses/i).first()).toBeVisible();
    });

    test('should display category breakdown', async ({ page }) => {
      // Look for common expense categories
      const categories = ['Food', 'Entertainment', 'Shopping', 'Transportation'];
      let foundCategory = false;

      for (const category of categories) {
        const categoryElement = page.getByText(new RegExp(category, 'i'));
        if (await categoryElement.isVisible().catch(() => false)) {
          foundCategory = true;
          break;
        }
      }

      expect(foundCategory).toBe(true);
    });
  });

  test.describe('Recent Transactions', () => {
    test('should display recent transactions section', async ({ page }) => {
      await expect(page.getByText(/recent transactions/i)).toBeVisible();
    });

    test('should display transaction items', async ({ page }) => {
      // Wait for transactions to load
      await page.waitForSelector('[data-testid="transaction-item"], .transaction-item, [class*="transaction"]', {
        timeout: 5000,
      }).catch(() => {
        // If specific selectors not found, just check for content
      });

      // Check for transaction-like content (merchant names or amounts)
      const hasTransactions = await page.locator('text=/\\$[\\d,]+\\.\\d{2}/').first().isVisible().catch(() => false);
      expect(hasTransactions).toBe(true);
    });
  });

  test.describe('Quick Actions', () => {
    test('should display quick actions section', async ({ page }) => {
      // Look for action buttons
      const actionButtons = page.getByRole('button', { name: /add|new|create/i });
      const hasActions = await actionButtons.first().isVisible().catch(() => false);

      // If no buttons, check for links
      if (!hasActions) {
        const actionLinks = page.getByRole('link', { name: /add|new|create/i });
        await expect(actionLinks.first()).toBeVisible();
      }
    });
  });

  test.describe('Charts', () => {
    test('should display income vs expenses trend chart', async ({ page }) => {
      await expect(page.getByText(/income.*expense.*trend|trend/i)).toBeVisible();
    });

    test('should render chart canvas or SVG', async ({ page }) => {
      // Charts typically use canvas or SVG
      const chartElement = page.locator('canvas, svg.recharts-surface');
      await expect(chartElement.first()).toBeVisible({ timeout: 5000 });
    });
  });

  test.describe('Navigation from Dashboard', () => {
    test('should navigate to transactions page', async ({ page }) => {
      // On mobile, both sidebar and bottom nav contain matching links.
      // Scope to the last navigation element (bottom nav on mobile, sidebar on desktop).
      const nav = page.getByRole('navigation').last();
      await nav.getByRole('link', { name: /transactions/i }).click();
      await expect(page).toHaveURL(/\/transactions/);
    });

    test('should navigate to accounts page', async ({ page }) => {
      const nav = page.getByRole('navigation').last();
      await nav.getByRole('link', { name: /accounts/i }).click();
      await expect(page).toHaveURL(/\/accounts/);
    });
  });

  test.describe('Responsive Design', () => {
    test('should adapt layout on mobile', async ({ page }) => {
      // Set viewport to mobile size
      await page.setViewportSize({ width: 375, height: 667 });

      // Page should still be functional on mobile
      // Either sidebar is hidden/collapsed OR main content adapts
      const mainContent = page.locator('main');
      await expect(mainContent).toBeVisible();

      // Dashboard heading should still be visible
      await expect(page.getByRole('heading', { name: /dashboard/i })).toBeVisible();
    });

    test('should show navigation on small screens', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });

      // Look for any navigation - mobile nav, hamburger menu, or bottom nav
      const hasNavLinks = await page.getByRole('link', { name: /dashboard/i }).isVisible().catch(() => false);
      const hasMenuButton = await page.getByRole('button').first().isVisible().catch(() => false);

      expect(hasNavLinks || hasMenuButton).toBe(true);
    });

    test('should display content on mobile', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });

      // Key content should be visible on mobile
      await expect(page.getByText(/total balance/i)).toBeVisible();
    });
  });
});
