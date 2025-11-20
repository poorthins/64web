import { Page, expect } from '@playwright/test';

/**
 * Monthly data structure for energy inputs
 */
export interface MonthlyData {
  month: number;
  value: number;
}

/**
 * Fill diesel monthly usage data
 * @param page - Playwright page instance
 * @param data - Array of monthly data to fill
 */
export async function fillDieselMonthData(page: Page, data: MonthlyData[]) {
  for (const { month, value } of data) {
    // Try multiple possible selectors for month input fields
    const selectors = [
      `input[data-month="${month}"]`,
      `input[name*="month${month}"]`,
      `input[name*="月${month}"]`,
      `input[placeholder*="月 ${month}"]`,
      `.month-${month} input[type="number"]`,
      `[data-testid="month-${month}-input"]`
    ];

    let inputFound = false;
    for (const selector of selectors) {
      const input = page.locator(selector).first();
      if (await input.isVisible({ timeout: 1000 }).catch(() => false)) {
        await input.clear();
        await input.fill(value.toString());
        inputFound = true;
        break;
      }
    }

    if (!inputFound) {
      console.warn(`Could not find input for month ${month}`);
    }
  }

  // Wait a bit for any onChange handlers to fire
  await page.waitForTimeout(500);
}

/**
 * Upload evidence file for a specific month
 * @param page - Playwright page instance
 * @param filePath - Path to the file to upload
 * @param options - Upload options
 */
export async function uploadEvidence(
  page: Page,
  filePath: string,
  options?: { month?: number; description?: string }
) {
  // If month is specified, look for month-specific upload input
  let fileInput;
  if (options?.month) {
    fileInput = page.locator(
      `[data-month="${options.month}"] input[type="file"], ` +
      `input[data-month="${options.month}"][type="file"]`
    ).first();

    // If month-specific input not found, fall back to general input
    if (!await fileInput.isVisible({ timeout: 1000 }).catch(() => false)) {
      fileInput = page.locator('input[type="file"]').first();
    }
  } else {
    fileInput = page.locator('input[type="file"]').first();
  }

  await expect(fileInput).toBeVisible({ timeout: 5000 });
  await fileInput.setInputFiles(filePath);

  // Wait for upload to complete
  await page.waitForTimeout(1000);
}

/**
 * Submit energy data form
 * @param page - Playwright page instance
 * @param expectSuccess - Whether to expect success (default: true)
 */
export async function submitEnergyData(
  page: Page,
  expectSuccess: boolean = true
) {
  const submitButton = page.getByRole('button', { name: /提交|送出|Submit/i });
  await expect(submitButton).toBeEnabled({ timeout: 5000 });
  await submitButton.click();

  if (expectSuccess) {
    // Wait for success message
    await expect(
      page.getByText(/提交成功|已提交|成功送出|Successfully submitted/i)
    ).toBeVisible({ timeout: 15000 });
  }
}

/**
 * Save energy data as draft
 * @param page - Playwright page instance
 */
export async function saveAsDraft(page: Page) {
  const saveButton = page.getByRole('button', { name: /儲存|存檔|暫存|Save/i });
  await expect(saveButton).toBeVisible({ timeout: 5000 });
  await saveButton.click();

  // Wait for save success
  await expect(
    page.getByText(/儲存成功|已儲存|Saved successfully/i)
  ).toBeVisible({ timeout: 10000 });
}

/**
 * Clear all energy data on the page
 * @param page - Playwright page instance
 */
export async function clearEnergyData(page: Page) {
  const clearButton = page.getByRole('button', { name: /清除|清空|Clear/i });

  if (await clearButton.isVisible({ timeout: 2000 }).catch(() => false)) {
    await clearButton.click();

    // Confirm if there's a confirmation dialog
    const confirmButton = page.getByRole('button', { name: /確認|是|Yes|Confirm/i });
    if (await confirmButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await confirmButton.click();
    }

    // Wait for clear to complete
    await page.waitForTimeout(500);
  }
}

/**
 * Verify entry status in the UI
 * @param page - Playwright page instance
 * @param expectedStatus - Expected status text
 */
export async function verifyEntryStatus(
  page: Page,
  expectedStatus: 'draft' | 'submitted' | 'approved' | 'rejected'
) {
  const statusMap = {
    draft: /草稿|Draft/i,
    submitted: /已提交|待審核|Submitted|Pending/i,
    approved: /已核准|已批准|Approved/i,
    rejected: /已拒絕|已駁回|Rejected/i
  };

  const statusPattern = statusMap[expectedStatus];
  await expect(page.getByText(statusPattern)).toBeVisible({ timeout: 5000 });
}

/**
 * Navigate to entries list page
 * @param page - Playwright page instance
 */
export async function navigateToEntriesList(page: Page) {
  await page.goto('/app/my/entries');
  await expect(page).toHaveURL('/app/my/entries');
}

/**
 * Find and click on an entry with specific status
 * @param page - Playwright page instance
 * @param status - Entry status to find
 * @returns boolean - Whether entry was found and clicked
 */
export async function findAndClickEntry(
  page: Page,
  status: 'draft' | 'submitted' | 'approved' | 'rejected'
): Promise<boolean> {
  const statusSelectors = [
    `[data-status="${status}"]`,
    `.status-${status}`,
    `[data-testid="entry-${status}"]`
  ];

  for (const selector of statusSelectors) {
    const entry = page.locator(selector).first();
    if (await entry.isVisible({ timeout: 2000 }).catch(() => false)) {
      await entry.click();
      return true;
    }
  }

  return false;
}

/**
 * Delete an uploaded file
 * @param page - Playwright page instance
 * @param fileName - Name of file to delete
 */
export async function deleteUploadedFile(page: Page, fileName: string) {
  // Find the file in the list
  const fileRow = page.locator(`text=${fileName}`).first();
  await expect(fileRow).toBeVisible({ timeout: 5000 });

  // Find delete button near the file
  const deleteButton = fileRow.locator('..').getByRole('button', { name: /刪除|移除|Delete|Remove/i });
  await deleteButton.click();

  // Confirm deletion if needed
  const confirmButton = page.getByRole('button', { name: /確認|是|Yes|Confirm/i });
  if (await confirmButton.isVisible({ timeout: 2000 }).catch(() => false)) {
    await confirmButton.click();
  }

  // Verify file is removed
  await expect(fileRow).not.toBeVisible({ timeout: 5000 });
}

/**
 * Get the count of entries with a specific status
 * @param page - Playwright page instance
 * @param status - Entry status to count
 * @returns Promise<number> - Count of entries
 */
export async function getEntryCount(
  page: Page,
  status: 'draft' | 'submitted' | 'approved' | 'rejected'
): Promise<number> {
  const statusSelectors = [
    `[data-status="${status}"]`,
    `.status-${status}`,
    `[data-testid="entry-${status}"]`
  ];

  for (const selector of statusSelectors) {
    const entries = page.locator(selector);
    const count = await entries.count();
    if (count > 0) {
      return count;
    }
  }

  return 0;
}
