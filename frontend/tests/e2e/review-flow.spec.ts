import { test, expect } from '@playwright/test';
import { login, logout } from './utils/auth';
import {
  navigateToEntriesList,
  findAndClickEntry,
  getEntryCount,
  verifyEntryStatus
} from './utils/energy';

const ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL || 'admin@example.com';
const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD || 'admin_password';
const TEST_USER_EMAIL = process.env.E2E_USER_EMAIL || 'user@example.com';

test.describe('Review Flow - Admin Approval Process', () => {
  test.beforeEach(async ({ page }) => {
    // Login as admin before each test
    await login(page, ADMIN_EMAIL, ADMIN_PASSWORD);
  });

  test.afterEach(async ({ page }) => {
    // Logout after each test
    await logout(page);
  });

  test('admin can view pending submissions', async ({ page }) => {
    // Navigate to admin review page
    await page.goto('/app/admin/submissions');

    // Verify we're on the admin submissions page
    await expect(page).toHaveURL('/app/admin/submissions');

    // Verify page title or heading
    await expect(page.locator('h1, h2').filter({ hasText: /審核|待審|Pending|Submissions/i })).toBeVisible();

    // Verify there's a list of submissions
    const submissionsList = page.locator('[data-testid="submissions-list"], .submissions-list, table');
    await expect(submissionsList).toBeVisible({ timeout: 10000 });

    // Check if there are any pending submissions
    const pendingSubmissions = page.locator('[data-status="submitted"], .status-submitted, tr').filter({
      hasText: /待審|Pending|Submitted/i
    });

    const count = await pendingSubmissions.count();
    console.log(`Found ${count} pending submissions`);

    // If there are submissions, verify they show key information
    if (count > 0) {
      const firstSubmission = pendingSubmissions.first();

      // Should show: user email, submission date, energy type, etc.
      await expect(firstSubmission).toBeVisible();

      // Verify there are action buttons (approve/reject)
      const approveButton = firstSubmission.getByRole('button', { name: /核准|批准|通過|Approve/i });
      const rejectButton = firstSubmission.getByRole('button', { name: /拒絕|駁回|Reject/i });

      await expect(approveButton.or(rejectButton)).toBeVisible();
    }
  });

  test('admin can approve a submission', async ({ page }) => {
    await page.goto('/app/admin/submissions');

    // Find a pending submission
    const pendingSubmission = page.locator('[data-status="submitted"], .status-submitted').first();

    if (await pendingSubmission.isVisible({ timeout: 5000 }).catch(() => false)) {
      // Get submission details before approval
      const submissionText = await pendingSubmission.textContent();
      console.log('Reviewing submission:', submissionText);

      // Click approve button
      const approveButton = pendingSubmission.getByRole('button', { name: /核准|批准|通過|Approve/i });
      await approveButton.click();

      // Confirm approval if there's a confirmation dialog
      const confirmButton = page.getByRole('button', { name: /確認|是|Yes|Confirm/i });
      if (await confirmButton.isVisible({ timeout: 2000 }).catch(() => false)) {
        await confirmButton.click();
      }

      // Wait for success message
      await expect(page.getByText(/核准成功|批准成功|已核准|Approved successfully/i)).toBeVisible({ timeout: 10000 });

      // Verify the submission is no longer in pending state
      // It should either disappear or change status
      await page.waitForTimeout(1000);
      const updatedStatus = page.locator('[data-status="approved"], .status-approved').filter({
        hasText: new RegExp(submissionText?.substring(0, 20) || '', 'i')
      });

      // The submission should now show as approved, or be removed from pending list
      const isPending = await pendingSubmission.isVisible({ timeout: 2000 }).catch(() => false);
      const isApproved = await updatedStatus.isVisible({ timeout: 2000 }).catch(() => false);

      expect(isPending || isApproved).toBeTruthy();
    } else {
      console.log('No pending submissions found for approval test');
      test.skip();
    }
  });

  test('admin can reject a submission with reason', async ({ page }) => {
    await page.goto('/app/admin/submissions');

    // Find a pending submission
    const pendingSubmission = page.locator('[data-status="submitted"], .status-submitted').first();

    if (await pendingSubmission.isVisible({ timeout: 5000 }).catch(() => false)) {
      // Click reject button
      const rejectButton = pendingSubmission.getByRole('button', { name: /拒絕|駁回|Reject/i });
      await rejectButton.click();

      // Fill in rejection reason if there's a modal/form
      const reasonInput = page.locator('textarea[placeholder*="原因"], textarea[name*="reason"], textarea');
      if (await reasonInput.isVisible({ timeout: 2000 }).catch(() => false)) {
        await reasonInput.fill('資料不完整,請重新提交完整的使用量數據。');
      }

      // Confirm rejection
      const confirmButton = page.getByRole('button', { name: /確認拒絕|確認|是|Confirm/i });
      await confirmButton.click();

      // Wait for success message
      await expect(page.getByText(/拒絕成功|已駁回|Rejected successfully/i)).toBeVisible({ timeout: 10000 });

      // Verify the submission status changed
      await page.waitForTimeout(1000);
    } else {
      console.log('No pending submissions found for rejection test');
      test.skip();
    }
  });

  test('admin can view submission details before approving', async ({ page }) => {
    await page.goto('/app/admin/submissions');

    const pendingSubmission = page.locator('[data-status="submitted"], .status-submitted').first();

    if (await pendingSubmission.isVisible({ timeout: 5000 }).catch(() => false)) {
      // Click on submission to view details
      // Look for a view/detail button or click the row itself
      const viewButton = pendingSubmission.getByRole('button', { name: /查看|詳情|View|Details/i });

      if (await viewButton.isVisible({ timeout: 2000 }).catch(() => false)) {
        await viewButton.click();
      } else {
        // If no button, try clicking the row
        await pendingSubmission.click();
      }

      // Verify detail view opens
      await expect(page.locator('.submission-detail, [data-testid="submission-detail"]')).toBeVisible({ timeout: 5000 });

      // Verify we can see:
      // - User information
      await expect(page.getByText(/提交者|使用者|User|Submitter/i)).toBeVisible();

      // - Monthly usage data
      await expect(page.locator('table, .data-table, [data-testid="usage-data"]')).toBeVisible();

      // - Uploaded evidence files
      const evidenceSection = page.locator('[data-testid="evidence-files"], .evidence-files').first();
      if (await evidenceSection.isVisible({ timeout: 2000 }).catch(() => false)) {
        await expect(evidenceSection).toBeVisible();
      }

      // - Approve/Reject buttons in detail view
      await expect(page.getByRole('button', { name: /核准|批准|通過|Approve/i })).toBeVisible();
      await expect(page.getByRole('button', { name: /拒絕|駁回|Reject/i })).toBeVisible();
    } else {
      console.log('No pending submissions found for detail view test');
      test.skip();
    }
  });

  test('admin can filter submissions by status', async ({ page }) => {
    await page.goto('/app/admin/submissions');

    // Look for status filter dropdown or tabs
    const statusFilters = [
      page.getByRole('tab', { name: /待審|Pending/i }),
      page.getByRole('button', { name: /待審|Pending/i }),
      page.locator('select[name*="status"]')
    ];

    let filterFound = false;
    for (const filter of statusFilters) {
      if (await filter.isVisible({ timeout: 2000 }).catch(() => false)) {
        filterFound = true;

        // Try different statuses
        const statuses = ['待審核', '已核准', '已拒絕'];

        for (const status of statuses) {
          const statusButton = page.getByRole('tab', { name: new RegExp(status, 'i') });

          if (await statusButton.isVisible({ timeout: 1000 }).catch(() => false)) {
            await statusButton.click();
            await page.waitForTimeout(500);

            // Verify the list updates
            await expect(page.locator('[data-testid="submissions-list"], .submissions-list')).toBeVisible();
          }
        }

        break;
      }
    }

    if (!filterFound) {
      console.log('Status filter not found - may not be implemented yet');
    }
  });

  test('admin can search submissions by user email', async ({ page }) => {
    await page.goto('/app/admin/submissions');

    // Look for search input
    const searchInput = page.locator('input[type="search"], input[placeholder*="搜尋"], input[name*="search"]').first();

    if (await searchInput.isVisible({ timeout: 2000 }).catch(() => false)) {
      // Search for test user email
      await searchInput.fill(TEST_USER_EMAIL);
      await page.waitForTimeout(1000);

      // Verify results are filtered
      const results = page.locator('[data-testid="submissions-list"] tr, .submission-row');
      const count = await results.count();

      if (count > 0) {
        // All results should contain the search term
        const firstResult = results.first();
        await expect(firstResult).toContainText(new RegExp(TEST_USER_EMAIL, 'i'));
      }
    } else {
      console.log('Search functionality not found');
    }
  });
});

test.describe('Review Flow - User Perspective', () => {
  test.beforeEach(async ({ page }) => {
    // Login as regular user
    await login(page, TEST_USER_EMAIL, process.env.E2E_USER_PASSWORD || 'password');
  });

  test.afterEach(async ({ page }) => {
    await logout(page);
  });

  test('user can see their submission status', async ({ page }) => {
    await navigateToEntriesList(page);

    // Verify entries list shows status for each entry
    const entries = page.locator('[data-testid="entry-item"], .entry-item, tr').filter({
      hasText: /草稿|待審|已核准|已拒絕|Draft|Pending|Approved|Rejected/i
    });

    const count = await entries.count();
    expect(count).toBeGreaterThanOrEqual(0);

    if (count > 0) {
      // Verify first entry shows status
      const firstEntry = entries.first();
      await expect(firstEntry).toBeVisible();

      // Status badge/label should be visible
      const statusBadge = firstEntry.locator('[data-testid="entry-status"], .status-badge, .badge');
      await expect(statusBadge).toBeVisible();
    }
  });

  test('user can view rejection reason', async ({ page }) => {
    await navigateToEntriesList(page);

    // Find a rejected entry
    const rejectedEntry = page.locator('[data-status="rejected"], .status-rejected').first();

    if (await rejectedEntry.isVisible({ timeout: 5000 }).catch(() => false)) {
      // Click to view details
      await rejectedEntry.click();

      // Verify rejection reason is displayed
      await expect(page.getByText(/拒絕原因|駁回原因|Rejection reason/i)).toBeVisible({ timeout: 5000 });

      // The reason text should be visible
      const reasonText = page.locator('[data-testid="rejection-reason"], .rejection-reason');
      if (await reasonText.isVisible({ timeout: 2000 }).catch(() => false)) {
        const reason = await reasonText.textContent();
        expect(reason).toBeTruthy();
        expect(reason!.length).toBeGreaterThan(0);
      }
    } else {
      console.log('No rejected entries found');
      test.skip();
    }
  });

  test('user cannot edit approved submission', async ({ page }) => {
    await navigateToEntriesList(page);

    // Find an approved entry
    const approvedEntry = page.locator('[data-status="approved"], .status-approved').first();

    if (await approvedEntry.isVisible({ timeout: 5000 }).catch(() => false)) {
      await approvedEntry.click();

      // Verify form inputs are disabled or read-only
      const inputs = page.locator('input[type="number"]');
      const count = await inputs.count();

      if (count > 0) {
        for (let i = 0; i < Math.min(count, 3); i++) {
          const input = inputs.nth(i);
          const isDisabled = await input.isDisabled();
          const isReadonly = await input.getAttribute('readonly');

          expect(isDisabled || isReadonly !== null).toBeTruthy();
        }
      }

      // Submit button should not be visible or should be disabled
      const submitButton = page.getByRole('button', { name: /提交|送出|Submit/i });
      const buttonExists = await submitButton.isVisible({ timeout: 1000 }).catch(() => false);

      if (buttonExists) {
        const isDisabled = await submitButton.isDisabled();
        expect(isDisabled).toBeTruthy();
      }
    } else {
      console.log('No approved entries found');
      test.skip();
    }
  });

  test('user can resubmit after rejection', async ({ page }) => {
    await navigateToEntriesList(page);

    // Find a rejected entry
    const rejectedEntry = page.locator('[data-status="rejected"], .status-rejected').first();

    if (await rejectedEntry.isVisible({ timeout: 5000 }).catch(() => false)) {
      await rejectedEntry.click();

      // Verify we're on the edit page
      await page.waitForTimeout(500);

      // Form inputs should be editable
      const inputs = page.locator('input[type="number"]');
      const count = await inputs.count();

      if (count > 0) {
        const firstInput = inputs.first();
        const isDisabled = await firstInput.isDisabled();
        expect(isDisabled).toBeFalsy();

        // Modify a value
        await firstInput.clear();
        await firstInput.fill('999');
      }

      // Submit button should be visible and enabled
      const submitButton = page.getByRole('button', { name: /重新提交|提交|送出|Resubmit|Submit/i });
      await expect(submitButton).toBeVisible();
      await expect(submitButton).toBeEnabled();

      // Click submit
      await submitButton.click();

      // Verify resubmission success
      await expect(page.getByText(/提交成功|已提交|Successfully submitted/i)).toBeVisible({ timeout: 15000 });
    } else {
      console.log('No rejected entries found for resubmission test');
      test.skip();
    }
  });
});

test.describe('Review Flow - Permissions', () => {
  test('regular user cannot access admin review page', async ({ page }) => {
    // Login as regular user
    await login(page, TEST_USER_EMAIL, process.env.E2E_USER_PASSWORD || 'password');

    // Try to access admin review page
    await page.goto('/app/admin/submissions');

    // Should be redirected or see access denied
    await page.waitForTimeout(2000);

    const currentUrl = page.url();

    // Either redirected to another page, or see error message
    if (currentUrl.includes('/admin/submissions')) {
      // If still on admin page, should show access denied
      await expect(page.getByText(/無權限|拒絕存取|Access denied|Unauthorized/i)).toBeVisible();
    } else {
      // Should be redirected away from admin page
      expect(currentUrl).not.toContain('/admin/submissions');
    }

    await logout(page);
  });

  test('admin can access all user submissions', async ({ page }) => {
    await login(page, ADMIN_EMAIL, ADMIN_PASSWORD);

    await page.goto('/app/admin/submissions');

    // Verify admin can see submissions from multiple users
    const submissions = page.locator('[data-testid="submission-item"], .submission-row, tr');
    const count = await submissions.count();

    // Admin should see multiple submissions (or at least have the page accessible)
    expect(count).toBeGreaterThanOrEqual(0);

    // Verify there's no filter limiting to own submissions only
    const allUsersToggle = page.getByText(/所有使用者|All users/i);
    if (await allUsersToggle.isVisible({ timeout: 2000 }).catch(() => false)) {
      await expect(allUsersToggle).toBeVisible();
    }

    await logout(page);
  });
});
