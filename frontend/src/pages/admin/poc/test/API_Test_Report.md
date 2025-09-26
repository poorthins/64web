# API 連接測試實施報告

## 📋 實施摘要

**測試實施日期**: 2024-09-22
**測試範圍**: POC 管理員 API 連接性和資料格式相容性
**測試狀態**: 已完成基礎實施，待實際執行測試

## 🎯 測試目標

1. 驗證所有管理員 API 的連接性
2. 測試資料格式轉換的正確性
3. 確認權限控制和錯誤處理
4. 為 POC 整合做準備

## 📁 已建立的檔案

### 1. 核心測試檔案
- **`apiConnectionTest.ts`**: API 測試邏輯和資料轉換函數
- **`APITestPage.tsx`**: 測試介面頁面
- **`API_Test_Report.md`**: 本測試報告

### 2. 路由整合
- 在 `AppRouter.tsx` 中添加了 `/app/admin/poc/api-test` 路由
- 在 `AdminDashboardPOC.tsx` 中添加了 API 測試連結

## 🔄 資料轉換函數

### 狀態轉換邏輯
```typescript
function convertUserStatus(
  isActive: boolean,
  pendingReviews: number,
  approvedReviews: number,
  needsFixReviews: number
): UserStatus {
  // API 的複雜狀態 → Mock 的簡化狀態
  if (!isActive) return 'rejected'
  if (needsFixReviews > 0) return 'rejected'
  if (approvedReviews > 0) return 'approved'
  return 'submitted'
}
```

### 日期格式統一
```typescript
function formatDateForDisplay(isoDate?: string): string {
  // ISO 8601 → YYYY-MM-DD
  if (!isoDate) return new Date().toISOString().split('T')[0]
  return isoDate.split('T')[0]
}
```

### 用戶資料轉換
```typescript
function convertAPIUserToMock(apiUser: UserWithSubmissions): User {
  // 處理欄位差異和格式轉換
}
```

### 測試用戶建立
```typescript
function createTestUserData(): CreateUserData {
  // 帶時間戳的安全測試資料
  const timestamp = Date.now()
  return {
    email: `test_${timestamp}@example.com`,
    display_name: `測試用戶_${timestamp}`,
    // ... 其他安全標記
  }
}
```

## 📊 Mock vs API 資料結構分析

### 用戶資料結構對比

| 欄位類型 | Mock Data | API Data | 轉換需求 |
|---------|-----------|----------|----------|
| **Mock 獨有** | `department`, `avatar`, `status` | - | 使用預設值或計算 |
| **API 獨有** | - | `company`, `job_title`, `phone`, `filling_config` | 可選欄位 |
| **格式不同** | `name` | `display_name` | 直接對應 |
| **格式不同** | `entries` | `entries_count` | 需額外查詢 |
| **格式不同** | `status` | `is_active` + `review_history` | 複雜邏輯轉換 |

### 提交資料結構對比

| 欄位類型 | Mock Data | API Data | 轉換需求 |
|---------|-----------|----------|----------|
| **Mock 獨有** | `userName`, `userDepartment`, `co2Emission`, `priority` | - | 需從關聯表取得 |
| **API 獨有** | - | `period_start`, `period_end`, `is_locked`, `approved_at` | 額外資訊 |
| **格式不同** | `submissionDate` | `created_at` | 日期格式轉換 |
| **格式不同** | `reviewDate` | `review_history[]` | 從陣列取最新 |
| **格式不同** | `status` | `review_history[].status` | 從最新審核記錄取得 |

## 🧪 測試分階段實施

### 第一批：讀取 API（安全）
✅ **已實施**
- `listUsers()` - 讀取用戶列表
- `combineUsersWithCounts()` - 用戶統計
- `getAllUsersWithSubmissions()` - 用戶提交列表
- `getSubmissionStats()` - 提交統計

### 第二批：寫入 API（謹慎）
✅ **已實施**（帶安全標記）
- `createUser()` - 建立測試用戶
- `updateUser()` - 更新測試用戶

### 第三批：進階測試
🟡 **待實施**
- RLS 權限測試
- 錯誤處理測試
- 大量資料測試
- 網路中斷測試

## 🎨 測試介面設計

### 測試頁面功能
- **分階段測試按鈕**: 讀取 API / 寫入 API
- **詳細結果展示**: 可展開查看完整 API 回應
- **即時狀態指示**: 成功/失敗狀態清楚標示
- **測試報告**: 統計成功率和建議事項
- **資料差異說明**: 視覺化對比 Mock vs API

### 安全措施
- **測試確認**: 寫入操作前需確認
- **測試標記**: 所有測試資料包含時間戳標記
- **錯誤隔離**: 測試失敗不影響現有功能

## 🔍 預期發現的問題

### 認證相關
- **Token 過期**: 長時間測試可能遇到認證過期
- **權限不足**: RLS 政策可能阻止某些操作
- **Admin 角色**: 確認當前用戶是否有管理員權限

### 資料格式相關
- **日期格式**: ISO 8601 vs 簡化格式
- **狀態邏輯**: 複雜的審核狀態轉換
- **關聯資料**: 需要多次查詢才能組合完整資料

### 效能相關
- **查詢效能**: 大量資料時的回應時間
- **網路延遲**: API 呼叫的穩定性
- **併發處理**: 多個 API 同時呼叫

## 🚀 接下來的步驟

### 立即執行
1. **訪問測試頁面**: `http://localhost:5176/app/admin/poc/api-test`
2. **執行第一批測試**: 點擊「開始讀取 API 測試」
3. **記錄結果**: 記錄成功/失敗和錯誤訊息

### 後續實施
1. **執行第二批測試**: 謹慎執行寫入 API 測試
2. **權限測試**: 測試不同角色的存取權限
3. **整合準備**: 基於測試結果準備 POC 整合

## 📝 測試結果記錄

### 讀取 API 測試結果
```
執行時間: [待填入]
成功率: [待填入]
失敗項目: [待填入]
錯誤訊息: [待填入]
```

### 寫入 API 測試結果
```
執行時間: [待填入]
成功率: [待填入]
建立的測試用戶: [待填入]
錯誤訊息: [待填入]
```

### 資料轉換測試結果
```
狀態轉換: [待填入]
日期轉換: [待填入]
用戶資料轉換: [待填入]
```

## 🎯 成功標準

### 基本成功標準
- [ ] 所有讀取 API 正常回應
- [ ] 資料轉換函數正確運作
- [ ] 測試介面正常顯示結果

### 進階成功標準
- [ ] 測試用戶成功建立（帶標記）
- [ ] 權限控制正確運作
- [ ] 錯誤處理完善

### 整合準備標準
- [ ] 資料格式差異已識別並可處理
- [ ] 所有必要的 API 都可用
- [ ] 效能表現在可接受範圍內

---

**報告產生時間**: `new Date().toLocaleString('zh-TW')`
**開發環境**: `http://localhost:5176`
**測試頁面**: `/app/admin/poc/api-test`