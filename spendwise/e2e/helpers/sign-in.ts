import type { Page } from '@playwright/test';

/**
 * Sign in via NextAuth credentials provider (bypasses 2FA).
 * Includes retry logic to handle transient ECONNRESET errors
 * when the dev server is under parallel test load.
 */
export async function signInWithNextAuth(
  page: Page,
  email: string,
  password: string,
) {
  let csrfToken: string | undefined;

  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const csrfRes = await page.request.get('/api/auth/csrf');
      ({ csrfToken } = await csrfRes.json());
      break;
    } catch {
      if (attempt === 2) throw new Error('Failed to fetch CSRF token after 3 attempts');
      await page.waitForTimeout(1_000);
    }
  }

  await page.request.post('/api/auth/callback/credentials', {
    form: {
      email,
      password,
      csrfToken: csrfToken!,
      json: 'true',
    },
  });

  await page.goto('/dashboard');
  await page.waitForURL(/\/dashboard/, { timeout: 15_000 });
}
