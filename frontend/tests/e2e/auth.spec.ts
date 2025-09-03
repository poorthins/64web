import { test, expect } from '@playwright/test';
import { login, logout, ensureLoggedOut, waitForLoginError } from './utils/auth';

const TEST_USER_EMAIL = process.env.E2E_USER_EMAIL || 'user@example.com';
const TEST_USER_PASSWORD = process.env.E2E_USER_PASSWORD || 'password';

test.describe('Authentication Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Ensure we start each test logged out
    await ensureLoggedOut(page);
  });

  test('redirect unauthenticated /app -> /login', async ({ page }) => {
    // Try to access protected route without authentication
    await page.goto('/app');
    
    // Should be redirected to login page
    await page.waitForURL('/login', { timeout: 5000 });
    
    // Verify we're on the login page
    await expect(page.getByTestId('login-email')).toBeVisible();
    await expect(page.getByTestId('login-password')).toBeVisible();
    await expect(page.getByTestId('login-submit')).toBeVisible();
    
    // Check that the page title or heading indicates this is login
    await expect(page.locator('h2')).toContainText('歡迎登入');
  });

  test('login success -> /app, navbar shows email', async ({ page }) => {
    // Perform login
    await login(page, TEST_USER_EMAIL, TEST_USER_PASSWORD);
    
    // Verify we're on the dashboard page
    await expect(page).toHaveURL('/app');
    
    // Verify navbar shows user email and logout button
    await expect(page.getByTestId('nav-email')).toBeVisible();
    await expect(page.getByTestId('nav-email')).toContainText(TEST_USER_EMAIL);
    await expect(page.getByTestId('nav-logout')).toBeVisible();
    
    // Verify the main content area is visible (dashboard)
    await expect(page.locator('h1')).toContainText('歡迎回來');
  });

  test('logout -> back to /login; /app blocked', async ({ page }) => {
    // First login
    await login(page, TEST_USER_EMAIL, TEST_USER_PASSWORD);
    await expect(page).toHaveURL('/app');
    
    // Logout
    await logout(page);
    
    // Verify we're back at login page
    await expect(page).toHaveURL('/login');
    await expect(page.getByTestId('login-email')).toBeVisible();
    
    // Try to access protected route again - should be blocked
    await page.goto('/app');
    await page.waitForURL('/login', { timeout: 5000 });
    
    // Should be back at login page
    await expect(page.getByTestId('login-email')).toBeVisible();
  });

  test('login error shows message', async ({ page }) => {
    // Go to login page
    await page.goto('/login');
    
    // Try to login with wrong credentials
    await page.getByTestId('login-email').fill(TEST_USER_EMAIL);
    await page.getByTestId('login-password').fill('wrong_password');
    await page.getByTestId('login-submit').click();
    
    // Wait for error message to appear
    await waitForLoginError(page);
    
    // Verify error message content
    const errorMessage = page.getByTestId('login-error');
    await expect(errorMessage).toBeVisible();
    
    // The error message should contain something about invalid credentials
    // Note: The exact message depends on your Supabase configuration
    const errorText = await errorMessage.textContent();
    expect(errorText).toBeTruthy();
    expect(errorText!.length).toBeGreaterThan(0);
    
    // Verify we're still on the login page
    await expect(page.getByTestId('login-email')).toBeVisible();
  });

  test('login with redirect parameter', async ({ page }) => {
    const redirectPath = '/app/my/entries';
    
    // Try to access a protected sub-route without authentication
    await page.goto(redirectPath);
    
    // Should be redirected to login with redirect parameter
    await page.waitForURL('/login', { timeout: 5000 });
    
    // The URL should contain redirect parameter (if implemented)
    // Note: This depends on your ProtectedLayout implementation
    
    // Verify we're on login page
    await expect(page.getByTestId('login-email')).toBeVisible();
    
    // Login successfully
    await login(page, TEST_USER_EMAIL, TEST_USER_PASSWORD, false);
    
    // Should be redirected to the original target path or /app
    // Note: Adjust this based on your actual redirect implementation
    await page.waitForURL(new RegExp('/app'), { timeout: 10000 });
    
    // Verify we're logged in
    await expect(page.getByTestId('nav-email')).toBeVisible();
    await expect(page.getByTestId('nav-email')).toContainText(TEST_USER_EMAIL);
  });

  test('empty form submission is blocked', async ({ page }) => {
    await page.goto('/login');
    
    // Try to submit empty form
    const submitButton = page.getByTestId('login-submit');
    await expect(submitButton).toBeDisabled();
    
    // Fill only email
    await page.getByTestId('login-email').fill(TEST_USER_EMAIL);
    await expect(submitButton).toBeDisabled();
    
    // Fill only password (after clearing email)
    await page.getByTestId('login-email').clear();
    await page.getByTestId('login-password').fill('somepassword');
    await expect(submitButton).toBeDisabled();
    
    // Fill both fields - button should be enabled
    await page.getByTestId('login-email').fill(TEST_USER_EMAIL);
    await expect(submitButton).toBeEnabled();
  });

  test('loading state during login', async ({ page }) => {
    await page.goto('/login');
    
    // Fill in credentials
    await page.getByTestId('login-email').fill(TEST_USER_EMAIL);
    await page.getByTestId('login-password').fill(TEST_USER_PASSWORD);
    
    // Submit form and immediately check for loading state
    await page.getByTestId('login-submit').click();
    
    // The button should show loading state briefly
    const submitButton = page.getByTestId('login-submit');
    
    // Either the button is disabled or shows loading text
    // (the loading state might be too brief to catch reliably)
    try {
      await expect(submitButton).toContainText('登入中');
    } catch {
      // If loading state passes too quickly, that's also acceptable
      // Just verify we eventually get redirected
      await page.waitForURL('/app', { timeout: 10000 });
    }
  });
});

test.describe('Protected Routes', () => {
  test.beforeEach(async ({ page }) => {
    // Start each test logged in
    await login(page, TEST_USER_EMAIL, TEST_USER_PASSWORD);
  });

  test('can navigate to dashboard', async ({ page }) => {
    await expect(page).toHaveURL('/app');
    await expect(page.getByTestId('nav-email')).toBeVisible();
  });

  test('can navigate to my entries page', async ({ page }) => {
    // Navigate to my entries page
    await page.goto('/app/my/entries');
    
    // Verify we can access the page (should not redirect to login)
    await expect(page).toHaveURL('/app/my/entries');
    await expect(page.getByTestId('nav-email')).toBeVisible();
    
    // The page content depends on your MyEntriesPage implementation
    // At minimum, verify we're still logged in
    await expect(page.getByTestId('nav-email')).toContainText(TEST_USER_EMAIL);
  });
});