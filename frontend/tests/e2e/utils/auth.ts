import { Page, expect } from '@playwright/test';

/**
 * Login utility function for E2E tests
 * @param page - Playwright page instance
 * @param email - User email
 * @param password - User password
 * @param shouldWaitForRedirect - Whether to wait for redirect to /app (default: true)
 */
export async function login(
  page: Page, 
  email: string, 
  password: string, 
  shouldWaitForRedirect: boolean = true
) {
  // Navigate to login page (either / or /login works)
  await page.goto('/login');
  
  // Wait for login form to be visible
  await expect(page.getByTestId('login-email')).toBeVisible();
  
  // Fill in the login form
  await page.getByTestId('login-email').fill(email);
  await page.getByTestId('login-password').fill(password);
  
  // Submit the form
  await page.getByTestId('login-submit').click();
  
  if (shouldWaitForRedirect) {
    // Wait for navigation to /app
    await page.waitForURL('/app', { timeout: 10000 });
    
    // Verify we're logged in by checking for user email in navbar
    await expect(page.getByTestId('nav-email')).toBeVisible();
    await expect(page.getByTestId('nav-email')).toContainText(email);
  }
}

/**
 * Logout utility function for E2E tests
 * @param page - Playwright page instance
 */
export async function logout(page: Page) {
  // Click logout button
  await page.getByTestId('nav-logout').click();
  
  // Wait for redirect to login page
  await page.waitForURL('/login', { timeout: 5000 });
  
  // Verify we're back at login page
  await expect(page.getByTestId('login-email')).toBeVisible();
}

/**
 * Check if user is currently logged in
 * @param page - Playwright page instance
 * @returns Promise<boolean>
 */
export async function isLoggedIn(page: Page): Promise<boolean> {
  try {
    await page.goto('/app');
    await page.waitForTimeout(1000); // Wait for potential redirect
    
    // If we can see the navbar email, we're logged in
    const emailElement = page.getByTestId('nav-email');
    return await emailElement.isVisible();
  } catch {
    return false;
  }
}

/**
 * Ensure user is logged out (cleanup utility)
 * @param page - Playwright page instance
 */
export async function ensureLoggedOut(page: Page) {
  const loggedIn = await isLoggedIn(page);
  if (loggedIn) {
    await logout(page);
  }
}

/**
 * Wait for login error message to appear
 * @param page - Playwright page instance
 * @param expectedError - Expected error message text (optional)
 */
export async function waitForLoginError(page: Page, expectedError?: string) {
  await expect(page.getByTestId('login-error')).toBeVisible();
  
  if (expectedError) {
    await expect(page.getByTestId('login-error')).toContainText(expectedError);
  }
}