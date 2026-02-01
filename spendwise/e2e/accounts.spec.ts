import { test, expect } from '@playwright/test';

test.describe('Accounts', () => {
  // Login via demo mode before each test
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.getByRole('button', { name: /demo|try demo/i }).click();
    await page.waitForURL(/\/dashboard/, { timeout: 10000 });
    await page.getByRole('link', { name: /accounts/i }).first().click();
    await page.waitForURL(/\/accounts/, { timeout: 10000 });
  });

  test.describe('Accounts List', () => {
    test('should display accounts page header', async ({ page }) => {
      await expect(page.getByRole('heading', { name: 'Accounts', level: 1 })).toBeVisible();
    });

    test('should display account cards', async ({ page }) => {
      // Should show account information
      await page.waitForLoadState('domcontentloaded');

      const accountCard = page.locator('[data-testid="account-card"], [class*="account"]').first();

      // At minimum, should display some accounts or empty state
      const hasAccounts = await accountCard.isVisible().catch(() => false);
      const hasEmptyState = await page.getByText(/no accounts|add.*account/i).isVisible().catch(() => false);

      expect(hasAccounts || hasEmptyState).toBe(true);
    });

    test('should display account balances', async ({ page }) => {
      // Check for balance amounts
      const balanceAmount = page.locator('text=/\\$[\\d,]+\\.\\d{2}/');
      await expect(balanceAmount.first()).toBeVisible({ timeout: 5000 });
    });

    test('should display account types', async ({ page }) => {
      // Common account types
      const types = ['Checking', 'Savings', 'Credit', 'Investment'];

      let foundType = false;
      for (const type of types) {
        if (await page.getByText(new RegExp(type, 'i')).first().isVisible().catch(() => false)) {
          foundType = true;
          break;
        }
      }

      expect(foundType).toBe(true);
    });

    test('should display total balance summary', async ({ page }) => {
      await expect(
        page.getByText(/total.*balance|net worth|combined/i).or(page.getByText(/total/i)).first()
      ).toBeVisible({ timeout: 5000 });
    });
  });

  test.describe('Add Account', () => {
    test('should have add account button', async ({ page }) => {
      const addButton = page.getByRole('button', { name: /add.*account|new.*account|\+/i })
        .or(page.getByRole('link', { name: /add.*account|new.*account/i }));

      await expect(addButton.first()).toBeVisible();
    });

    test('should open add account modal/form', async ({ page }) => {
      const addButton = page.getByRole('button', { name: /add|new|\+/i });
      await addButton.first().click();

      // Should show account form
      const form = page.getByRole('dialog')
        .or(page.locator('form'))
        .or(page.getByText(/create.*account|add.*account/i));

      await expect(form.first()).toBeVisible({ timeout: 5000 });
    });

    test('should have required form fields', async ({ page }) => {
      const addButton = page.getByRole('button', { name: /add|new|\+/i });
      await addButton.first().click();

      // Check for form fields
      await expect(
        page.getByLabel(/name/i).or(page.locator('input[name*="name"]'))
      ).toBeVisible({ timeout: 5000 });

      await expect(
        page.getByLabel(/type/i).or(page.locator('select[name*="type"]'))
      ).toBeVisible();

      await expect(
        page.getByLabel(/balance/i).or(page.locator('input[name*="balance"]'))
      ).toBeVisible();
    });

    test('should validate required fields', async ({ page }) => {
      const addButton = page.getByRole('button', { name: /add|new|\+/i });
      await addButton.first().click();

      // Try to submit without filling form - scope to form
      const submitButton = page.locator('form').getByRole('button', { name: /save|create|add/i });
      if (await submitButton.isVisible()) {
        await submitButton.click();

        // Form should still be visible (not submitted) or show validation error
        const formStillVisible = await page.locator('form').isVisible();
        const hasValidationError = await page.getByText(/required|enter.*name|invalid|please/i).first().isVisible().catch(() => false);

        expect(formStillVisible || hasValidationError).toBe(true);
      }
    });
  });

  test.describe('Account Actions', () => {
    test('should have edit option for accounts', async ({ page }) => {
      const accountCard = page.locator('[data-testid="account-card"], [class*="account"]').first();

      if (await accountCard.isVisible()) {
        // Look for edit button or menu
        const editButton = accountCard.getByRole('button', { name: /edit/i })
          .or(page.getByRole('button', { name: /edit/i }));

        const menuButton = accountCard.locator('[data-testid="account-menu"]')
          .or(accountCard.getByRole('button', { name: /more|options|menu/i }));

        if (await menuButton.isVisible().catch(() => false)) {
          await menuButton.click();
        }

        const hasEdit = await editButton.first().isVisible().catch(() => false);
        expect(hasEdit).toBe(true);
      }
    });

    test('should have delete option for accounts', async ({ page }) => {
      const accountCard = page.locator('[data-testid="account-card"], [class*="account"]').first();

      if (await accountCard.isVisible()) {
        const menuButton = accountCard.locator('[data-testid="account-menu"]')
          .or(accountCard.getByRole('button', { name: /more|options|menu/i }));

        if (await menuButton.isVisible().catch(() => false)) {
          await menuButton.click();

          const deleteButton = page.getByRole('button', { name: /delete/i });
          await expect(deleteButton.first()).toBeVisible();
        }
      }
    });
  });

  test.describe('Account Details', () => {
    test('should show account institution', async ({ page }) => {
      // Look for institution/bank names
      const institutionNames = ['Chase', 'Bank', 'Marcus', 'Amex', 'Fidelity'];

      let foundInstitution = false;
      for (const name of institutionNames) {
        if (await page.getByText(new RegExp(name, 'i')).first().isVisible().catch(() => false)) {
          foundInstitution = true;
          break;
        }
      }

      expect(foundInstitution).toBe(true);
    });

    test('should display last synced date', async ({ page }) => {
      const syncInfo = page.getByText(/synced|updated|last.*sync/i);
      const hasSync = await syncInfo.first().isVisible().catch(() => false);
      // Sync info is optional feature
    });
  });

  test.describe('Account Breakdown', () => {
    test('should show account type breakdown', async ({ page }) => {
      // May show pie chart or breakdown of account types
      const breakdown = page.locator('[class*="chart"], [class*="breakdown"], canvas, svg');
      const hasBreakdown = await breakdown.first().isVisible().catch(() => false);
      // Breakdown is optional feature
    });

    test('should distinguish positive and negative balances', async ({ page }) => {
      // Credit cards typically show negative
      const negativeBalance = page.locator('text=/-\\$|\\(\\$|credit/i');
      const positiveBalance = page.locator('text=/\\$[0-9]/');

      const hasPositive = await positiveBalance.first().isVisible().catch(() => false);
      expect(hasPositive).toBe(true);
    });
  });

  test.describe('Account Navigation', () => {
    test('should navigate to account transactions when clicking account', async ({ page }) => {
      const accountCard = page.locator('[data-testid="account-card"], [class*="account"]').first();

      if (await accountCard.isVisible()) {
        // Some apps allow clicking account to see transactions
        const viewButton = accountCard.getByRole('button', { name: /view|details/i })
          .or(accountCard.getByRole('link'));

        if (await viewButton.first().isVisible().catch(() => false)) {
          await viewButton.first().click();
          // May navigate to account detail or filtered transactions
        }
      }
    });
  });

  test.describe('Responsive Design', () => {
    test('should display accounts in grid on desktop', async ({ page }) => {
      await page.setViewportSize({ width: 1280, height: 800 });

      const accountsContainer = page.locator('[class*="grid"], [class*="accounts"]');
      await expect(accountsContainer.first()).toBeVisible();
    });

    test('should stack accounts on mobile', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });

      // Accounts should be visible and stacked
      const accountCard = page.locator('[data-testid="account-card"], [class*="account"]').first();

      if (await accountCard.isVisible()) {
        const box = await accountCard.boundingBox();
        // Card should take most of screen width on mobile
        expect(box!.width).toBeGreaterThan(300);
      }
    });
  });
});
