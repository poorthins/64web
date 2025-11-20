# E2E Tests

端到端測試使用 [Playwright](https://playwright.dev/) 來模擬真實用戶操作流程。

## 測試覆蓋範圍

### 1. 認證流程 (`auth.spec.ts`)
- ✅ 未登入用戶重定向到登入頁
- ✅ 登入成功後導航到主頁
- ✅ 登出功能
- ✅ 錯誤處理（錯誤密碼）
- ✅ 表單驗證
- ✅ Loading 狀態
- ✅ 受保護路由存取控制

### 2. 提交流程 (`submission-flow.spec.ts`)
- ✅ 完整提交流程：填寫數據 → 上傳佐證 → 提交
- ✅ 必填欄位驗證
- ✅ 儲存草稿功能
- ✅ 拒絕後重新提交
- ✅ 文件上傳驗證（PDF、圖片）
- ✅ 文件預覽
- ✅ 刪除已上傳文件
- ✅ Loading 狀態
- ✅ 頁面間導航和狀態保持

### 3. 審核流程 (`review-flow.spec.ts`)
- ✅ 管理員查看待審核提交
- ✅ 批准提交
- ✅ 拒絕提交（含原因）
- ✅ 查看提交詳情
- ✅ 狀態篩選
- ✅ 搜尋功能
- ✅ 使用者查看提交狀態
- ✅ 使用者查看拒絕原因
- ✅ 已批准記錄不可編輯
- ✅ 拒絕後可重新提交
- ✅ 權限控制（普通用戶無法存取管理頁面）

## 設置步驟

### 1. 安裝依賴

```bash
npm install
```

Playwright 已包含在 devDependencies 中。

### 2. 環境變數配置

複製環境變數範例文件：

```bash
cp .env.test.example .env.test
```

編輯 `.env.test` 填入實際值：

```env
# 應用 URL
E2E_BASE_URL=http://localhost:5173

# 測試用戶帳號
E2E_USER_EMAIL=test@example.com
E2E_USER_PASSWORD=your_test_password

# 管理員帳號
E2E_ADMIN_EMAIL=admin@example.com
E2E_ADMIN_PASSWORD=your_admin_password

# Supabase 配置（測試環境）
VITE_SUPABASE_URL=https://your-test-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-test-anon-key
```

**重要：**
- 使用測試/Staging 環境的 Supabase 憑證，**不要使用生產環境**
- 確保測試帳號已在測試資料庫中創建
- 管理員帳號需要有 `admin` 角色

### 3. 生成測試夾具文件

```bash
node tests/e2e/fixtures/generate-fixtures.cjs
```

這會創建以下測試文件：
- `test-evidence.pdf` - 測試用 PDF 文件
- `test-image.jpg` - 測試用圖片
- `test-image.png` - 測試用 PNG 圖片

### 4. 安裝瀏覽器（首次運行）

```bash
npx playwright install
```

這會安裝 Chromium、Firefox 和 WebKit 瀏覽器。

## 運行測試

### 運行所有 E2E 測試

```bash
npm run test:e2e
```

### 運行特定測試文件

```bash
npx playwright test tests/e2e/auth.spec.ts
npx playwright test tests/e2e/submission-flow.spec.ts
npx playwright test tests/e2e/review-flow.spec.ts
```

### 帶 UI 界面運行（推薦用於開發）

```bash
npm run test:e2e:ui
```

這會打開 Playwright UI，可以：
- 查看測試執行過程
- 時間旅行調試
- 查看網路請求
- 檢視截圖和影片

### Headed 模式（顯示瀏覽器視窗）

```bash
npm run test:e2e:headed
```

### Debug 模式

```bash
npm run test:e2e:debug
```

這會：
- 暫停測試執行
- 打開 Playwright Inspector
- 允許逐步執行測試

### 運行特定瀏覽器

```bash
# 只在 Chromium 運行
npx playwright test --project=chromium

# 只在 Firefox 運行
npx playwright test --project=firefox

# 只在 WebKit 運行
npx playwright test --project=webkit
```

## 測試開發

### 工具函數

測試使用共享工具函數在 `utils/` 目錄：

#### `utils/auth.ts`
- `login(page, email, password)` - 登入
- `logout(page)` - 登出
- `ensureLoggedOut(page)` - 確保登出狀態
- `isLoggedIn(page)` - 檢查登入狀態
- `waitForLoginError(page)` - 等待登入錯誤訊息

#### `utils/energy.ts`
- `fillDieselMonthData(page, data[])` - 填寫月份數據
- `uploadEvidence(page, filePath, options)` - 上傳佐證文件
- `submitEnergyData(page)` - 提交數據
- `saveAsDraft(page)` - 儲存草稿
- `clearEnergyData(page)` - 清除數據
- `verifyEntryStatus(page, status)` - 驗證記錄狀態
- `navigateToEntriesList(page)` - 導航到記錄列表
- `findAndClickEntry(page, status)` - 查找並點擊記錄
- `deleteUploadedFile(page, fileName)` - 刪除已上傳文件
- `getEntryCount(page, status)` - 獲取記錄數量

### 編寫新測試

1. 在 `tests/e2e/` 創建新的 `.spec.ts` 文件
2. 導入需要的工具函數
3. 使用 `test.describe()` 和 `test()` 結構化測試
4. 使用 `beforeEach/afterEach` 設置和清理

範例：

```typescript
import { test, expect } from '@playwright/test';
import { login, logout } from './utils/auth';

test.describe('My Feature', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, 'user@example.com', 'password');
  });

  test.afterEach(async ({ page }) => {
    await logout(page);
  });

  test('should do something', async ({ page }) => {
    await page.goto('/app/my-feature');

    await expect(page.getByText('Expected Text')).toBeVisible();
  });
});
```

### 最佳實踐

1. **使用 data-testid 屬性**
   ```tsx
   <button data-testid="submit-button">Submit</button>
   ```
   ```typescript
   await page.getByTestId('submit-button').click();
   ```

2. **明確的等待條件**
   ```typescript
   await expect(element).toBeVisible({ timeout: 5000 });
   await page.waitForURL('/expected-url');
   ```

3. **獨立的測試**
   - 每個測試應該獨立運行
   - 使用 `beforeEach` 設置初始狀態
   - 使用 `afterEach` 清理

4. **有意義的測試名稱**
   ```typescript
   test('user can submit diesel usage data with file upload', ...)
   ```

5. **錯誤處理**
   ```typescript
   const button = page.getByRole('button', { name: /submit/i });
   if (await button.isVisible({ timeout: 2000 }).catch(() => false)) {
     await button.click();
   }
   ```

## 測試結果

測試完成後會生成以下輸出：

### 1. 控制台報告
即時顯示測試執行結果

### 2. HTML 報告
```bash
npx playwright show-report
```

包含：
- 測試執行時間
- 失敗的測試詳情
- 截圖和影片（失敗時）
- Trace 記錄

### 3. JSON/JUnit 報告
在 `test-results/` 目錄：
- `results.json` - JSON 格式結果
- `results.xml` - JUnit 格式（CI 集成用）

## CI/CD 集成

### GitHub Actions 範例

```yaml
name: E2E Tests

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - uses: actions/setup-node@v3
        with:
          node-version: '20'

      - name: Install dependencies
        run: npm ci

      - name: Install Playwright
        run: npx playwright install --with-deps

      - name: Run E2E tests
        run: npm run test:e2e
        env:
          E2E_USER_EMAIL: ${{ secrets.E2E_USER_EMAIL }}
          E2E_USER_PASSWORD: ${{ secrets.E2E_USER_PASSWORD }}
          E2E_ADMIN_EMAIL: ${{ secrets.E2E_ADMIN_EMAIL }}
          E2E_ADMIN_PASSWORD: ${{ secrets.E2E_ADMIN_PASSWORD }}

      - uses: actions/upload-artifact@v3
        if: always()
        with:
          name: playwright-report
          path: playwright-report/
          retention-days: 30
```

## 故障排除

### 測試超時

如果測試經常超時，可以增加超時時間：

```typescript
test('slow operation', async ({ page }) => {
  test.setTimeout(60000); // 60 秒
  // ...
});
```

或在配置文件中全局設置：

```typescript
// playwright.config.ts
export default defineConfig({
  timeout: 30000, // 30 秒
  // ...
});
```

### 無法找到元素

1. 檢查元素是否正確渲染
2. 增加等待時間
3. 使用更具體的選擇器
4. 檢查是否在 iframe 中
5. 使用 Playwright Inspector 調試

### 測試不穩定（Flaky Tests）

1. 添加適當的等待條件
2. 避免使用固定延遲 (`page.waitForTimeout`)
3. 使用 `waitForSelector` 或 `waitForURL`
4. 確保每個測試獨立運行

## 參考資源

- [Playwright 官方文檔](https://playwright.dev/)
- [Playwright Best Practices](https://playwright.dev/docs/best-practices)
- [Test Selectors](https://playwright.dev/docs/selectors)
- [Debugging Tests](https://playwright.dev/docs/debug)
