import { test, expect } from '@playwright/test';

test.describe('Authentication Flow', () => {
  test('should redirect to sign in page when not authenticated', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/.*signin/);
  });

  test('should show Google sign in button', async ({ page }) => {
    await page.goto('/auth/signin');
    const signInButton = page.getByRole('button', { name: /sign in with google/i });
    await expect(signInButton).toBeVisible();
  });
});

test.describe('Dashboard', () => {
  test.skip('should display dashboard stats after login', async ({ page }) => {
    // This test requires authenticated session
    // In production, you would set up authentication context
    await page.goto('/dashboard');
    
    // Check for stat cards
    await expect(page.getByText(/new leads today/i)).toBeVisible();
    await expect(page.getByText(/follow-ups due/i)).toBeVisible();
    await expect(page.getByText(/calls today/i)).toBeVisible();
  });
});

test.describe('Lead Management', () => {
  test.skip('should navigate to leads page', async ({ page }) => {
    // Requires authentication
    await page.goto('/dashboard/leads');
    await expect(page.getByRole('heading', { name: /leads/i })).toBeVisible();
  });
});
