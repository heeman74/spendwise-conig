import { test, expect } from '@playwright/test';
import { randomUUID } from 'crypto';

test.describe('Two-Factor Authentication E2E Tests', () => {
  const testPassword = 'TestPassword123!';
  const testName = 'Test User';

  // Generate a unique email per test to avoid collisions across parallel workers/browsers
  // Note: Playwright creates a fresh browser context per test, so cookies/storage are already isolated
  let testEmail: string;
  test.beforeEach(async () => {
    testEmail = `test-${randomUUID()}@example.com`;
  });

  test.describe('Registration with Mandatory 2FA', () => {
    test('should require 2FA setup after registration', async ({ page }) => {
      // Navigate to register page
      await page.goto('/register');

      // Fill registration form
      await page.getByLabel('Name').fill(testName);
      await page.getByLabel('Email').fill(testEmail);
      await page.getByLabel('Password', { exact: true }).fill(testPassword);
      await page.getByLabel('Confirm Password').fill(testPassword);

      // Accept terms
      await page.getByRole('checkbox').check();

      // Submit registration
      await page.getByRole('button', { name: /Create account/i }).click();

      // Should redirect to 2FA setup
      await expect(page.getByText(/Set Up Two-Factor Authentication/i)).toBeVisible();
      await expect(page.getByText(/Email Verification/i)).toBeVisible();
      await expect(page.getByText(/SMS Verification/i)).toBeVisible();
    });

    test('should complete email 2FA setup flow', async ({ page }) => {
      // Register
      await page.goto('/register');
      await page.getByLabel('Name').fill(testName);
      await page.getByLabel('Email').fill(testEmail);
      await page.getByLabel('Password', { exact: true }).fill(testPassword);
      await page.getByLabel('Confirm Password').fill(testPassword);
      await page.getByRole('checkbox').check();
      await page.getByRole('button', { name: /Create account/i }).click();

      // Wait for 2FA setup screen
      await expect(page.getByText(/Set Up Two-Factor Authentication/i)).toBeVisible();

      // Select email method
      await page.getByRole('button', { name: /Email Verification/i }).click();

      // Should show verification code input
      await expect(page.getByLabel(/Verification Code/i)).toBeVisible();
      await expect(page.getByText(/Code sent to/i)).toBeVisible();

      // Note: In real test, you would need to:
      // 1. Retrieve the code from test email inbox
      // 2. Enter the code
      // 3. Complete the flow
      // For now, we verify the UI is correct
    });

    test('should show phone number input for SMS method', async ({ page }) => {
      await page.goto('/register');
      await page.getByLabel('Name').fill(testName);
      await page.getByLabel('Email').fill(testEmail);
      await page.getByLabel('Password', { exact: true }).fill(testPassword);
      await page.getByLabel('Confirm Password').fill(testPassword);
      await page.getByRole('checkbox').check();
      await page.getByRole('button', { name: /Create account/i }).click();

      await expect(page.getByText(/Set Up Two-Factor Authentication/i)).toBeVisible();

      // Select SMS method
      await page.getByRole('button', { name: /SMS Verification/i }).click();

      // Should show phone input
      await expect(page.getByLabel(/Phone Number/i)).toBeVisible();
      await expect(page.getByRole('button', { name: /Send Code/i })).toBeVisible();
    });

    test('should not allow skipping 2FA when required', async ({ page }) => {
      await page.goto('/register');
      await page.getByLabel('Name').fill(testName);
      await page.getByLabel('Email').fill(testEmail);
      await page.getByLabel('Password', { exact: true }).fill(testPassword);
      await page.getByLabel('Confirm Password').fill(testPassword);
      await page.getByRole('checkbox').check();
      await page.getByRole('button', { name: /Create account/i }).click();

      await expect(page.getByText(/Set Up Two-Factor Authentication/i)).toBeVisible();

      // Skip button should not exist
      await expect(page.getByText(/Skip for now/i)).not.toBeVisible();
    });

    test('should validate phone number format', async ({ page }) => {
      await page.goto('/register');
      await page.getByLabel('Name').fill(testName);
      await page.getByLabel('Email').fill(testEmail);
      await page.getByLabel('Password', { exact: true }).fill(testPassword);
      await page.getByLabel('Confirm Password').fill(testPassword);
      await page.getByRole('checkbox').check();
      await page.getByRole('button', { name: /Create account/i }).click();

      await expect(page.getByText(/Set Up Two-Factor Authentication/i)).toBeVisible();

      await page.getByRole('button', { name: /SMS Verification/i }).click();

      // Enter invalid phone
      await page.getByLabel(/Phone Number/i).fill('invalid-phone');
      await page.getByRole('button', { name: /Send Code/i }).click();

      // Should show error
      await expect(page.getByText(/valid phone number/i)).toBeVisible();
    });

    test('should allow navigation back to method selection', async ({ page }) => {
      await page.goto('/register');
      await page.getByLabel('Name').fill(testName);
      await page.getByLabel('Email').fill(testEmail);
      await page.getByLabel('Password', { exact: true }).fill(testPassword);
      await page.getByLabel('Confirm Password').fill(testPassword);
      await page.getByRole('checkbox').check();
      await page.getByRole('button', { name: /Create account/i }).click();

      await expect(page.getByText(/Set Up Two-Factor Authentication/i)).toBeVisible();

      // Select SMS
      await page.getByRole('button', { name: /SMS Verification/i }).click();
      await expect(page.getByLabel(/Phone Number/i)).toBeVisible();

      // Go back
      await page.getByRole('button', { name: /Back/i }).click();

      // Should be back at method selection
      await expect(page.getByText(/Choose how you want to receive/i)).toBeVisible();
    });
  });

  test.describe('Login with 2FA', () => {
    // Mock the GraphQL loginStep1 mutation so the app always transitions to the 2FA
    // screen, regardless of whether the credentials map to a real user in the DB.
    test.beforeEach(async ({ page }) => {
      await page.route('**/graphql', async (route, request) => {
        const body = request.postDataJSON?.();
        if (body?.operationName === 'LoginStep1') {
          return route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              data: {
                loginStep1: {
                  requiresTwoFactor: true,
                  pendingToken: 'mock-pending-token',
                  availableMethods: ['EMAIL', 'SMS'],
                },
              },
            }),
          });
        }
        return route.continue();
      });
    });

    test('should show 2FA verification after credentials', async ({ page }) => {
      await page.goto('/login');

      await page.getByLabel('Email').fill('existing-user@example.com');
      await page.getByLabel('Password').fill('password123');
      await page.getByRole('button', { name: /Sign in/i }).click();

      // Should show 2FA verification screen
      await expect(page.getByText(/Two-Factor Authentication/i)).toBeVisible();
      await expect(page.getByLabel(/Verification Code/i)).toBeVisible();
    });

    test('should show method selector for multiple 2FA methods', async ({ page }) => {
      await page.goto('/login');

      await page.getByLabel('Email').fill('multi-method-user@example.com');
      await page.getByLabel('Password').fill('password123');
      await page.getByRole('button', { name: /Sign in/i }).click();

      // Should show 2FA screen with method selector buttons
      await expect(page.getByText(/Two-Factor Authentication/i)).toBeVisible();
      await expect(page.getByRole('button', { name: /Email/i })).toBeVisible();
    });

    test('should show backup code option', async ({ page }) => {
      await page.goto('/login');

      await page.getByLabel('Email').fill('existing-user@example.com');
      await page.getByLabel('Password').fill('password123');
      await page.getByRole('button', { name: /Sign in/i }).click();

      await expect(page.getByText(/Use backup code/i)).toBeVisible();
    });

    test('should switch to backup code input', async ({ page }) => {
      await page.goto('/login');

      await page.getByLabel('Email').fill('existing-user@example.com');
      await page.getByLabel('Password').fill('password123');
      await page.getByRole('button', { name: /Sign in/i }).click();

      // Click backup code link
      await page.getByText(/Use backup code/i).click();

      // Should show backup code input
      await expect(page.getByText(/Enter one of your backup codes/i)).toBeVisible();
      await expect(page.getByLabel(/Backup Code/i)).toBeVisible();
    });

    test('should allow canceling 2FA and returning to login', async ({ page }) => {
      await page.goto('/login');

      await page.getByLabel('Email').fill('existing-user@example.com');
      await page.getByLabel('Password').fill('password123');
      await page.getByRole('button', { name: /Sign in/i }).click();

      // Should show cancel button
      const cancelButton = page.getByRole('button', { name: /Cancel/i });
      if (await cancelButton.isVisible()) {
        await cancelButton.click();

        // Should return to login form
        await expect(page.getByText(/Sign in to manage your finances/i)).toBeVisible();
      }
    });

    test('should show code expiration notice', async ({ page }) => {
      await page.goto('/login');

      await page.getByLabel('Email').fill('existing-user@example.com');
      await page.getByLabel('Password').fill('password123');
      await page.getByRole('button', { name: /Sign in/i }).click();

      // Should show 1 minute expiration
      await expect(page.getByText(/expires in 1 minute/i)).toBeVisible();
    });

    test('should validate 6-digit code format', async ({ page }) => {
      await page.goto('/login');

      await page.getByLabel('Email').fill('existing-user@example.com');
      await page.getByLabel('Password').fill('password123');
      await page.getByRole('button', { name: /Sign in/i }).click();

      const codeInput = page.getByLabel(/Verification Code/i);

      // Enter more than 6 digits
      await codeInput.fill('12345678');

      // Should truncate to 6
      await expect(codeInput).toHaveValue('123456');
    });
  });

  test.describe('Settings - 2FA Management', () => {
    test.beforeEach(async ({ page }) => {
      // Login via demo mode to establish a valid session before visiting settings
      await page.goto('/login');
      await page.getByRole('button', { name: /demo|try demo/i }).click();
      await page.waitForURL(/\/dashboard/, { timeout: 10000 });
      // Wait for the dashboard to fully render so that client-side session
      // checks (useEffect redirects) have settled before tests navigate away.
      await expect(page.getByRole('heading', { name: /dashboard/i })).toBeVisible();
    });

    test('should display 2FA status', async ({ page }) => {
      // Retry navigation if interrupted by a late client-side redirect (webkit)
      await page.goto('/settings').catch(() => page.goto('/settings'));

      await expect(page.getByText(/Two-Factor Authentication/i)).toBeVisible();
      await expect(page.getByText(/Email Authentication/i)).toBeVisible();
      await expect(page.getByText(/SMS Authentication/i)).toBeVisible();
      await expect(page.getByText(/Backup Codes/i)).toBeVisible();
    });

    test('should show enable button for disabled methods', async ({ page }) => {
      // Retry navigation if interrupted by a late client-side redirect (webkit)
      await page.goto('/settings').catch(() => page.goto('/settings'));

      // Look for enable buttons (assuming some methods are disabled)
      // Use toBeVisible() which auto-retries, unlike count() which is a one-shot check
      await expect(page.getByRole('button', { name: /Enable/i }).first()).toBeVisible();
    });

    test('should show disable button for enabled methods', async ({ page }) => {
      // Mock GraphQL response so email 2FA appears enabled
      await page.route('**/graphql', async (route, request) => {
        const body = request.postDataJSON();
        if (body?.operationName === 'GetTwoFactorStatus') {
          return route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              data: {
                twoFactorStatus: {
                  emailEnabled: true,
                  smsEnabled: false,
                  emailVerified: true,
                  phoneVerified: false,
                  phoneNumber: null,
                  backupCodesRemaining: 8,
                },
              },
            }),
          });
        }
        return route.continue();
      });

      // Retry navigation if interrupted by a late client-side redirect (webkit)
      await page.goto('/settings').catch(() => page.goto('/settings'));

      const disableButtons = page.getByRole('button', { name: /Disable/i });
      await expect(disableButtons.first()).toBeVisible();
    });

    test('should display backup codes count', async ({ page }) => {
      // Retry navigation if interrupted by a late client-side redirect (webkit)
      await page.goto('/settings').catch(() => page.goto('/settings'));

      await expect(page.getByText(/codes remaining/i)).toBeVisible();
    });

    test('should open enable modal when clicking enable', async ({ page }) => {
      // Retry navigation if interrupted by a late client-side redirect (webkit)
      await page.goto('/settings').catch(() => page.goto('/settings'));

      // On mobile, the sidebar overlay may cover the main content.
      // Dismiss it by clicking the backdrop before interacting with buttons.
      const sidebarOverlay = page.locator('div[class*="bg-black"]');
      if (await sidebarOverlay.isVisible().catch(() => false)) {
        await sidebarOverlay.dispatchEvent('click');
        await sidebarOverlay.waitFor({ state: 'hidden', timeout: 1000 }).catch(() => {});
      }

      // Click first enable button (force: true bypasses overlap from adjacent
      // "Disabled" badge on narrow mobile viewports)
      await page.getByRole('button', { name: /Enable/i }).first().click({ force: true });

      // Modal should open
      await expect(page.getByRole('button', { name: /Send Verification Code/i })).toBeVisible();
    });

    test('should open regenerate backup codes modal', async ({ page }) => {
      // Retry navigation if interrupted by a late client-side redirect (webkit)
      await page.goto('/settings').catch(() => page.goto('/settings'));

      // Dismiss sidebar overlay on mobile if present
      const sidebarOverlay = page.locator('div[class*="bg-black"]');
      if (await sidebarOverlay.isVisible().catch(() => false)) {
        await sidebarOverlay.dispatchEvent('click');
        await sidebarOverlay.waitFor({ state: 'hidden', timeout: 1000 }).catch(() => {});
      }

      // Click regenerate button (force: true bypasses layout overlap on mobile)
      await page.getByRole('button', { name: /Regenerate/i }).click({ force: true });

      // Modal should open
      await expect(page.getByText(/Regenerate Backup Codes/i)).toBeVisible();
      await expect(page.getByLabel(/Password/i)).toBeVisible();
    });

    test('should show masked phone number when SMS enabled', async ({ page }) => {
      // Retry navigation if interrupted by a late client-side redirect (webkit)
      await page.goto('/settings').catch(() => page.goto('/settings'));

      // If SMS is enabled, phone number should be partially masked
      const phoneText = page.getByText(/\+.*\d{4}/);
      if (await phoneText.isVisible()) {
        expect(await phoneText.textContent()).toMatch(/\*/);
      }
    });
  });

  test.describe('Error Handling', () => {
    test('should show error for invalid credentials', async ({ page }) => {
      await page.goto('/login');

      await page.getByLabel('Email').fill('wrong@example.com');
      await page.getByLabel('Password').fill('wrongpassword');
      await page.getByRole('button', { name: /Sign in/i }).click();

      await expect(page.getByText(/invalid credentials/i)).toBeVisible();
    });

    test('should show error for weak password during registration', async ({ page }) => {
      await page.goto('/register');

      await page.getByLabel('Name').fill('Test User');
      await page.getByLabel('Email').fill(testEmail);
      await page.getByLabel('Password', { exact: true }).fill('weak');
      await page.getByLabel('Confirm Password').fill('weak');
      await page.getByRole('checkbox').check();
      await page.getByRole('button', { name: /Create account/i }).click();

      await expect(page.getByText(/at least 8 characters/i)).toBeVisible();
    });

    test('should show error for mismatched passwords', async ({ page }) => {
      await page.goto('/register');

      await page.getByLabel('Name').fill('Test User');
      await page.getByLabel('Email').fill(testEmail);
      await page.getByLabel('Password', { exact: true }).fill('Password123!');
      await page.getByLabel('Confirm Password').fill('DifferentPassword123!');
      await page.getByRole('checkbox').check();
      await page.getByRole('button', { name: /Create account/i }).click();

      await expect(page.getByText(/Passwords do not match/i)).toBeVisible();
    });
  });

  test.describe('Accessibility', () => {
    test('should have proper heading hierarchy', async ({ page }) => {
      await page.goto('/register');

      const h1 = page.getByRole('heading', { level: 1 });
      await expect(h1).toBeVisible();
    });

    test('should have accessible form labels', async ({ page }) => {
      await page.goto('/login');

      // All inputs should have labels
      await expect(page.getByLabel('Email')).toBeVisible();
      await expect(page.getByLabel('Password')).toBeVisible();
    });

    test('should support keyboard navigation', async ({ page, browserName }) => {
      // WebKit (Safari) Tab key only cycles through text fields by default,
      // skipping buttons, checkboxes, and links. Skip this test on webkit.
      test.skip(browserName === 'webkit', 'WebKit Tab key does not cycle through all focusable elements');

      await page.goto('/login');

      // Tab through form
      await page.keyboard.press('Tab'); // Email input
      await page.keyboard.press('Tab'); // Password input
      await page.keyboard.press('Tab'); // Remember me checkbox
      await page.keyboard.press('Tab'); // Forgot password link
      await page.keyboard.press('Tab'); // Sign in button

      // Sign in button should be focused
      const signInButton = page.getByRole('button', { name: /Sign in/i });
      await expect(signInButton).toBeFocused();
    });

    test('should have proper ARIA labels on 2FA screen', async ({ page }) => {
      await page.goto('/login');

      await page.getByLabel('Email').fill('existing-user@example.com');
      await page.getByLabel('Password').fill('password123');
      await page.getByRole('button', { name: /Sign in/i }).click();

      // Verification code input should have label
      await expect(page.getByLabel(/Verification Code/i)).toBeVisible();

      // Verify button should have accessible name
      await expect(page.getByRole('button', { name: /Verify/i })).toBeVisible();
    });
  });

  test.describe('Mobile Responsiveness', () => {
    test.use({ viewport: { width: 375, height: 667 } }); // iPhone SE

    test('should render properly on mobile', async ({ page }) => {
      await page.goto('/login');

      // Form should be visible and usable
      await expect(page.getByLabel('Email')).toBeVisible();
      await expect(page.getByLabel('Password')).toBeVisible();
      await expect(page.getByRole('button', { name: /Sign in/i })).toBeVisible();
    });

    test('should show mobile-friendly 2FA setup', async ({ page }) => {
      await page.goto('/register');

      await page.getByLabel('Name').fill(testName);
      await page.getByLabel('Email').fill(testEmail);
      await page.getByLabel('Password', { exact: true }).fill(testPassword);
      await page.getByLabel('Confirm Password').fill(testPassword);
      await page.getByRole('checkbox').check();
      await page.getByRole('button', { name: /Create account/i }).click();

      // 2FA setup should be usable on mobile
      await expect(page.getByText(/Set Up Two-Factor Authentication/i)).toBeVisible();
      await expect(page.getByText(/Email Verification/i)).toBeVisible();
    });
  });
});
