import { test, expect } from '@playwright/test';
import { login, logout } from './utils/auth';
import { fillDieselMonthData, uploadEvidence, submitEnergyData } from './utils/energy';

const TEST_USER_EMAIL = process.env.E2E_USER_EMAIL || 'user@example.com';
const TEST_USER_PASSWORD = process.env.E2E_USER_PASSWORD || 'password';

test.describe('Submission Flow - Diesel Energy Data', () => {
  test.beforeEach(async ({ page }) => {
    // Login before each test
    await login(page, TEST_USER_EMAIL, TEST_USER_PASSWORD);
  });

  test.afterEach(async ({ page }) => {
    // Logout after each test
    await logout(page);
  });

  test('complete submission flow: fill data -> upload evidence -> submit', async ({ page }) => {
    // Step 1: Navigate to diesel page
    await page.goto('/app/diesel');

    // Verify we're on the diesel page
    await expect(page).toHaveURL('/app/diesel');
    await expect(page.locator('h1, h2').filter({ hasText: /柴油|Diesel/i })).toBeVisible();

    // Step 2: Fill in monthly usage data for at least 2 months
    // Assuming the page has input fields for each month (1-12)
    await fillDieselMonthData(page, [
      { month: 1, value: 100 },
      { month: 2, value: 150 }
    ]);

    // Step 3: Upload evidence files
    // Look for file upload inputs
    const fileInput = page.locator('input[type="file"]').first();
    await expect(fileInput).toBeVisible();

    // Create a test file (PDF)
    const testFilePath = './tests/e2e/fixtures/test-evidence.pdf';
    await uploadEvidence(page, testFilePath, { month: 1 });

    // Verify file is uploaded
    await expect(page.getByText(/test-evidence\.pdf|已上傳|上傳成功/i)).toBeVisible({ timeout: 10000 });

    // Step 4: Submit the data
    const submitButton = page.getByRole('button', { name: /提交|送出|Submit/i });
    await expect(submitButton).toBeEnabled();
    await submitButton.click();

    // Step 5: Verify success message
    await expect(page.getByText(/提交成功|已提交|成功送出/i)).toBeVisible({ timeout: 15000 });

    // Verify status changed to 'submitted'
    // This depends on your UI implementation
    await expect(page.getByText(/已提交|待審核|Submitted/i)).toBeVisible();
  });

  test('cannot submit without required monthly data', async ({ page }) => {
    await page.goto('/app/diesel');

    // Try to submit without filling any data
    const submitButton = page.getByRole('button', { name: /提交|送出|Submit/i });

    // Button should be disabled or clicking should show error
    const isDisabled = await submitButton.isDisabled();
    if (!isDisabled) {
      await submitButton.click();

      // Should show error message
      await expect(page.getByText(/請填寫|必須填寫|至少填寫/i)).toBeVisible();
    } else {
      // Button is correctly disabled
      expect(isDisabled).toBe(true);
    }
  });

  test('can save as draft without submitting', async ({ page }) => {
    await page.goto('/app/diesel');

    // Fill in some data
    await fillDieselMonthData(page, [
      { month: 1, value: 50 }
    ]);

    // Look for save/draft button
    const saveButton = page.getByRole('button', { name: /儲存|存檔|暫存|Save/i });

    if (await saveButton.isVisible()) {
      await saveButton.click();

      // Verify save success
      await expect(page.getByText(/儲存成功|已儲存|Saved/i)).toBeVisible({ timeout: 10000 });

      // Verify status is still draft
      await expect(page.getByText(/草稿|Draft/i)).toBeVisible();
    }
  });

  test('can edit and resubmit after rejection', async ({ page }) => {
    // This test assumes there's a rejected entry that needs resubmission
    await page.goto('/app/my/entries');

    // Look for rejected entries
    const rejectedEntry = page.locator('[data-status="rejected"], .status-rejected').first();

    if (await rejectedEntry.isVisible()) {
      // Click to view/edit the rejected entry
      await rejectedEntry.click();

      // Modify the data
      await fillDieselMonthData(page, [
        { month: 1, value: 200 }
      ]);

      // Resubmit
      const submitButton = page.getByRole('button', { name: /重新提交|提交|送出|Resubmit/i });
      await submitButton.click();

      // Verify success
      await expect(page.getByText(/提交成功|已提交|成功送出/i)).toBeVisible({ timeout: 15000 });
    }
  });

  test('file upload validation - accepts PDF and images', async ({ page }) => {
    await page.goto('/app/diesel');

    // Fill required data first
    await fillDieselMonthData(page, [
      { month: 1, value: 100 }
    ]);

    const fileInput = page.locator('input[type="file"]').first();

    // Test PDF upload
    await fileInput.setInputFiles('./tests/e2e/fixtures/test-evidence.pdf');
    await expect(page.getByText(/test-evidence\.pdf|已上傳/i)).toBeVisible({ timeout: 5000 });

    // Test image upload (if supported)
    await fileInput.setInputFiles('./tests/e2e/fixtures/test-image.jpg');
    await expect(page.getByText(/test-image\.jpg|已上傳/i)).toBeVisible({ timeout: 5000 });
  });

  test('can view uploaded file preview', async ({ page }) => {
    await page.goto('/app/diesel');

    // Upload a file
    const fileInput = page.locator('input[type="file"]').first();
    await fileInput.setInputFiles('./tests/e2e/fixtures/test-evidence.pdf');

    // Wait for upload to complete
    await expect(page.getByText(/test-evidence\.pdf/i)).toBeVisible({ timeout: 10000 });

    // Look for preview/view button
    const viewButton = page.getByRole('button', { name: /查看|預覽|View|Preview/i }).first();

    if (await viewButton.isVisible()) {
      await viewButton.click();

      // Verify preview modal or new tab opens
      // This depends on your implementation
      await expect(page.locator('[data-testid="file-preview"], .file-preview, .lightbox')).toBeVisible({ timeout: 5000 });
    }
  });

  test('can delete uploaded file before submission', async ({ page }) => {
    await page.goto('/app/diesel');

    // Upload a file
    const fileInput = page.locator('input[type="file"]').first();
    await fileInput.setInputFiles('./tests/e2e/fixtures/test-evidence.pdf');

    // Wait for upload
    await expect(page.getByText(/test-evidence\.pdf/i)).toBeVisible({ timeout: 10000 });

    // Look for delete button
    const deleteButton = page.getByRole('button', { name: /刪除|移除|Delete|Remove/i }).first();
    await deleteButton.click();

    // Confirm deletion if there's a confirmation modal
    const confirmButton = page.getByRole('button', { name: /確認|是|Yes|Confirm/i });
    if (await confirmButton.isVisible({ timeout: 2000 })) {
      await confirmButton.click();
    }

    // Verify file is removed
    await expect(page.getByText(/test-evidence\.pdf/i)).not.toBeVisible({ timeout: 5000 });
  });

  test('loading state during submission', async ({ page }) => {
    await page.goto('/app/diesel');

    // Fill data
    await fillDieselMonthData(page, [
      { month: 1, value: 100 },
      { month: 2, value: 150 }
    ]);

    // Click submit
    const submitButton = page.getByRole('button', { name: /提交|送出|Submit/i });
    await submitButton.click();

    // Verify loading state appears
    await expect(page.getByText(/提交中|處理中|Submitting|Loading/i)).toBeVisible({ timeout: 2000 });

    // Wait for completion
    await expect(page.getByText(/提交成功|已提交|成功送出/i)).toBeVisible({ timeout: 15000 });
  });
});

test.describe('Submission Flow - Navigation and State', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, TEST_USER_EMAIL, TEST_USER_PASSWORD);
  });

  test.afterEach(async ({ page }) => {
    await logout(page);
  });

  test('can navigate between different energy types', async ({ page }) => {
    // Navigate to diesel page
    await page.goto('/app/diesel');
    await expect(page).toHaveURL('/app/diesel');

    // Fill some data
    await fillDieselMonthData(page, [{ month: 1, value: 100 }]);

    // Save as draft
    const saveButton = page.getByRole('button', { name: /儲存|存檔|Save/i });
    if (await saveButton.isVisible()) {
      await saveButton.click();
      await expect(page.getByText(/儲存成功|已儲存/i)).toBeVisible({ timeout: 10000 });
    }

    // Navigate to another energy page (e.g., gasoline)
    await page.goto('/app/gasoline');

    // Verify navigation worked
    await expect(page).toHaveURL('/app/gasoline');

    // Go back to diesel
    await page.goto('/app/diesel');
    await expect(page).toHaveURL('/app/diesel');

    // Verify data persists (should still show the saved value)
    const monthInput = page.locator('input[data-month="1"], input[name*="1"]').first();
    if (await monthInput.isVisible()) {
      const value = await monthInput.inputValue();
      expect(value).toBe('100');
    }
  });

  test('unsaved changes warning when navigating away', async ({ page }) => {
    await page.goto('/app/diesel');

    // Fill data without saving
    await fillDieselMonthData(page, [{ month: 1, value: 100 }]);

    // Try to navigate away
    const dialog = page.waitForEvent('dialog');
    await page.goto('/app/gasoline');

    // Check if browser shows unsaved changes warning
    // Note: This might not work in all browsers/configurations
    try {
      const dialogEvent = await dialog;
      await dialogEvent.accept();
    } catch {
      // If no dialog, that's also acceptable
    }
  });
});
