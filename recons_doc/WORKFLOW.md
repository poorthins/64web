# 能源填報系統工作流程文件

## 📋 文件資訊

- **文件版本**：v1.0
- **建立日期**：2025-01-01
- **適用範圍**：14 個能源類別頁面
- **相關文件**：REFACTORING_PLAN.md

---

## 📚 目錄

1. [流程總覽](#流程總覽)
2. [流程 1：首次填報](#流程-1首次填報)
3. [流程 2：重新進入頁面](#流程-2重新進入頁面載入舊資料)
4. [流程 3：修改已提交的資料](#流程-3修改已提交的資料)
5. [流程 4：管理員審核 - 退件](#流程-4管理員審核---退件)
6. [流程 5：使用者看到退件並重新提交](#流程-5使用者看到退件並重新提交)
7. [流程 6：管理員審核 - 通過](#流程-6管理員審核---通過)
8. [流程 7：清除功能](#流程-7清除功能)
9. [狀態轉換圖](#狀態轉換圖)
10. [API 對應表](#api-對應表)
11. [錯誤處理](#錯誤處理)

---

## 流程總覽

能源填報系統有 7 個核心流程：

| 流程 | 使用者 | 主要動作 | 狀態變化 |
|------|--------|---------|---------|
| 1 | 使用者 | 首次填報 | null → submitted |
| 2 | 使用者 | 重新進入頁面 | - |
| 3 | 使用者 | 修改已提交的資料 | submitted → submitted |
| 4 | 管理員 | 審核退件 | submitted → rejected |
| 5 | 使用者 | 看到退件並重新提交 | rejected → submitted |
| 6 | 管理員 | 審核通過 | submitted → approved |
| 7 | 使用者 | 清除資料 | any → null |

---

## 流程 1：首次填報

### 使用場景
新使用者第一次進入某個能源類別頁面（例如 WD-40），尚未填寫過任何資料。

### 步驟詳解

#### 步驟 1-1：進入頁面
```
使用者動作：
  - 從側邊欄點擊「WD-40」

系統行為：
  1. 導航到 /app/wd40
  2. 呼叫 getEntryByPageKeyAndYear('wd40', 2024)
  3. 回傳 null（因為沒有資料）
  4. 初始化空白表單
  5. 顯示狀態：無狀態標籤
```

**相關 API：**
```typescript
const entry = await getEntryByPageKeyAndYear('wd40', 2024)
// 回傳: null
```

---

#### 步驟 1-2：填寫表單
```
使用者動作：
  - 填寫「單位容量」：500
  - 填寫「碳排係數」：85
  - 填寫 1 月使用量：10
  - 填寫 2 月使用量：15
  - ... (其他月份)

系統行為：
  - 所有資料暫存在 React state
  - 尚未寫入資料庫
  - 即時計算總使用量
```

**前端狀態：**
```typescript
monthlyData: [
  { month: 1, quantity: 10 },
  { month: 2, quantity: 15 },
  // ...
]
unitCapacity: 500
carbonRate: 85
```

---

#### 步驟 1-3：上傳檔案（MSDS）
```
使用者動作：
  - 點「上傳 MSDS」
  - 選擇檔案：msds-document.pdf

系統行為：
  1. 檔案驗證（類型、大小）
  2. 轉換為 MemoryFile 格式
  3. 存在記憶體（尚未上傳到 Supabase Storage）
  4. 顯示預覽（圖片）或檔名（PDF）
```

**記憶體檔案結構：**
```typescript
MemoryFile {
  file: File,           // 原始檔案物件
  file_name: "msds-document.pdf",
  preview_url: "blob:...",
  category: "msds"
}
```

---

#### 步驟 1-4：上傳檔案（月份使用證明）
```
使用者動作：
  - 在 1 月區塊上傳：invoice-jan.jpg
  - 在 2 月區塊上傳：invoice-feb.jpg

系統行為：
  - 同樣轉換為 MemoryFile
  - 按月份分類存放
  - 尚未上傳到 Supabase Storage
```

---

#### 步驟 1-5：點提交
```
使用者動作：
  - 點「提交填報」按鈕

系統行為（依序執行）：

A. 驗證資料
   - 檢查必填欄位
   - 檢查總使用量 > 0
   - 檢查檔案數量符合規範

B. 儲存表單資料到資料庫
   呼叫：upsertEnergyEntry({
     page_key: 'wd40',
     period_year: 2024,
     unit: 'ML',
     monthly: { '1': 10, '2': 15, ... },
     payload: {
       unitCapacity: 500,
       carbonRate: 85,
       monthly: { '1': 10, '2': 15, ... }
     }
   })
   
   回傳：{ entry_id: 'abc123' }
   資料庫狀態：status = 'submitted'

C. 上傳記憶體檔案到 Supabase Storage
   針對每個 MemoryFile：
     1. uploadEvidenceWithEntry(file, {
          entryId: 'abc123',
          pageKey: 'wd40',
          year: 2024,
          category: 'msds'
        })
     2. 檔案上傳到 Storage
     3. 寫入 evidence_files 表
     4. 自動關聯到 entry_id

D. 關聯所有檔案
   呼叫：commitEvidence({
     entryId: 'abc123',
     pageKey: 'wd40'
   })
   
   確保所有檔案都正確關聯到記錄

E. 更新前端狀態
   - 清空記憶體檔案
   - 設定 currentEntryId = 'abc123'
   - 設定 hasSubmittedBefore = true
   - 設定 currentStatus = 'submitted'

F. 顯示成功訊息
   - Toast: "提交成功！年度總使用量：XXX ML"
   - 顯示成功彈窗（可選）
```

**相關 API 呼叫順序：**
```typescript
1. const { entry_id } = await upsertEnergyEntry(input)
2. for (const file of msdsMemoryFiles) {
     await uploadEvidenceWithEntry(file, metadata)
   }
3. for (const file of monthlyMemoryFiles) {
     await uploadEvidenceWithEntry(file, metadata)
   }
4. await commitEvidence({ entryId, pageKey })
```

---

## 流程 2：重新進入頁面（載入舊資料）

### 使用場景
使用者已經提交過資料，關閉瀏覽器或導航到其他頁面後，再次回到該能源類別頁面。

### 步驟詳解

#### 步驟 2-1：進入頁面
```
使用者動作：
  - 從側邊欄點擊「WD-40」

系統行為：
  1. 導航到 /app/wd40
  2. 呼叫 getEntryByPageKeyAndYear('wd40', 2024)
  3. 回傳 existing entry（status = 'submitted'）
  4. 設定 currentEntryId = entry.id
  5. 設定 hasSubmittedBefore = true
  6. 設定 initialStatus = 'submitted'
```

**回傳資料結構：**
```typescript
EnergyEntry {
  id: 'abc123',
  owner_id: 'user456',
  page_key: 'wd40',
  period_year: 2024,
  category: 'WD-40',
  status: 'submitted',
  amount: 250,  // 總使用量
  unit: 'ML',
  payload: {
    unitCapacity: 500,
    carbonRate: 85,
    monthly: { '1': 10, '2': 15, ... }
  },
  created_at: '2024-03-20T10:00:00',
  updated_at: '2024-03-20T10:00:00'
}
```

---

#### 步驟 2-2：載入表單資料
```
系統行為：
  1. 從 payload.monthly 載入月份資料
  2. 從 payload.unitCapacity 載入單位容量
  3. 從 payload.carbonRate 載入碳排係數
  4. 計算總使用量
  5. 更新前端 state
```

**前端狀態更新：**
```typescript
setMonthlyData([
  { month: 1, quantity: 10 },
  { month: 2, quantity: 15 },
  // ...
])
setUnitCapacity(500)
setCarbonRate(85)
```

---

#### 步驟 2-3：載入檔案清單
```
系統行為：
  1. 呼叫 getEntryFiles('abc123')
  2. 回傳所有關聯的檔案
  3. 按 category 分類（msds / usage_evidence）
  4. 按 month 分組（usage_evidence）
  5. 更新前端 state
```

**回傳檔案結構：**
```typescript
EvidenceFile[] = [
  {
    id: 'file1',
    entry_id: 'abc123',
    file_name: 'msds-document.pdf',
    file_path: 'evidence/wd40/2024/msds/...',
    category: 'msds',
    month: null,
    uploaded_at: '2024-03-20T10:00:00'
  },
  {
    id: 'file2',
    entry_id: 'abc123',
    file_name: 'invoice-jan.jpg',
    file_path: 'evidence/wd40/2024/usage/...',
    category: 'usage_evidence',
    month: 1,
    uploaded_at: '2024-03-20T10:00:00'
  },
  // ...
]
```

---

#### 步驟 2-4：顯示頁面
```
顯示內容：
  1. 狀態標籤：「已提交」（藍色）
  2. 表單：顯示所有已填資料（可編輯）
  3. MSDS 檔案：顯示已上傳的檔案
  4. 月份檔案：顯示各月份已上傳的檔案
  5. 底部按鈕：「提交填報」「清除」

編輯權限：
  - 狀態 = submitted → 可編輯
  - 狀態 = approved → 唯讀
  - 狀態 = rejected → 可編輯
```

---

## 流程 3：修改已提交的資料

### 使用場景
使用者發現已提交的資料有誤，想要修改表單欄位或檔案。

### 步驟詳解

#### 步驟 3-1：修改表單欄位
```
使用者動作：
  - 修改 1 月使用量：10 → 12
  - 修改碳排係數：85 → 90

系統行為：
  - 更新 React state
  - 重新計算總使用量
  - 尚未寫入資料庫
  - 頁面狀態保持「已提交」
```

---

#### 步驟 3-2：刪除舊檔案
```
使用者動作：
  - 點擊某個檔案的刪除按鈕
  - 確認刪除

系統行為：
  1. 呼叫 deleteEvidenceFile(fileId)
  2. 從 evidence_files 表刪除記錄
  3. 從 Supabase Storage 刪除實體檔案
  4. 更新前端 state（移除該檔案）
```

**相關 API：**
```typescript
await deleteEvidenceFile('file1')
// 結果：檔案從資料庫和 Storage 刪除
```

---

#### 步驟 3-3：上傳新檔案
```
使用者動作：
  - 上傳新的 MSDS 檔案

系統行為：
  - 轉換為 MemoryFile
  - 存在記憶體
  - 尚未上傳到 Supabase Storage
  - 顯示預覽
```

---

#### 步驟 3-4：重新提交
```
使用者動作：
  - 點「提交填報」按鈕

系統行為：

A. 更新資料庫記錄
   呼叫：upsertEnergyEntry({
     page_key: 'wd40',
     period_year: 2024,
     unit: 'ML',
     monthly: { '1': 12, '2': 15, ... },  // 修改後的資料
     payload: {
       unitCapacity: 500,
       carbonRate: 90,  // 修改後的係數
       monthly: { '1': 12, '2': 15, ... }
     }
   })
   
   結果：
   - 找到現有記錄（entry_id = 'abc123'）
   - 覆蓋 payload（舊資料消失，不保留歷史）
   - 更新 amount（總使用量）
   - 更新 updated_at
   - 狀態維持 'submitted'

B. 上傳新的記憶體檔案
   - 如果有新的 MemoryFile
   - 呼叫 uploadEvidenceWithEntry()
   - 自動關聯到 entry_id = 'abc123'

C. 重新關聯檔案
   - 呼叫 commitEvidence()
   - 確保所有檔案正確關聯

D. 顯示成功訊息
   - Toast: "提交成功！年度總使用量：XXX ML"
```

**最終結果：**
```
資料庫中的記錄：
- entry_id: 'abc123'（不變）
- payload: 新的資料（覆蓋舊的）
- amount: 新的總量
- status: 'submitted'（維持）

檔案：
- 舊檔案 A：已刪除
- 新檔案 a：已上傳
- 其他檔案 B, C：保持不變

結果：Supabase 存的是 a, B, C
```

---

## 流程 4：管理員審核 - 退件

### 使用場景
管理員檢查使用者提交的資料，發現問題需要退回修正。

### 步驟詳解

#### 步驟 4-1：管理員進入審核模式
```
系統行為：
  1. 管理員從審核列表點擊某筆記錄
  2. 導航到：/app/wd40?mode=review&entryId=abc123&userId=user456
  3. 檢測到 URL 參數 mode=review
  4. 設定 isReviewMode = true
  5. 呼叫 getEntryById('abc123')
  6. 載入該使用者的資料

頁面顯示：
  - 表單：唯讀（不能編輯）
  - 檔案：可檢視、可下載、不能刪除
  - 底部：隱藏「提交」和「清除」按鈕
  - 審核區：顯示「通過」和「退件」按鈕
```

**審核模式特徵：**
```typescript
isReviewMode = true
reviewEntryId = 'abc123'
reviewUserId = 'user456'

editPermissions = {
  canEdit: false,        // 不能編輯表單
  canUpload: false,      // 不能上傳檔案
  canDelete: false,      // 不能刪除檔案
  canSubmit: false       // 不能提交
}
```

---

#### 步驟 4-2：管理員檢視資料
```
管理員動作：
  - 檢視表單資料
  - 下載 MSDS 檔案
  - 檢視月份使用證明
  - 發現：MSDS 檔案不完整

系統行為：
  - 提供檔案預覽（圖片）
  - 提供檔案下載（PDF）
  - 所有資料唯讀
```

---

#### 步驟 4-3：管理員點退件
```
管理員動作：
  1. 點「退件」按鈕
  2. 彈出輸入框
  3. 輸入退件原因："MSDS 檔案不完整，請補充產品安全資料表"
  4. 確認退件

系統行為：
  1. 呼叫 reviewEntry('abc123', 'reject', '退件原因')
  2. 更新資料庫
  3. 顯示成功訊息
  4. 導航回上一頁（審核列表）
```

**API 呼叫：**
```typescript
await reviewEntry(
  'abc123',           // entryId
  'reject',           // action
  'MSDS 檔案不完整，請補充產品安全資料表'  // notes
)
```

**資料庫更新：**
```sql
UPDATE energy_entries
SET 
  status = 'rejected',
  review_notes = 'MSDS 檔案不完整，請補充產品安全資料表',
  reviewed_at = '2024-03-23T10:30:00',
  reviewer_id = 'admin123',
  is_locked = false
WHERE id = 'abc123'
```

---

## 流程 5：使用者看到退件並重新提交

### 使用場景
使用者的填報被管理員退回，需要修正後重新提交。

### 步驟詳解

#### 步驟 5-1：使用者進入頁面
```
使用者動作：
  - 從側邊欄點擊「WD-40」

系統行為：
  1. 呼叫 getEntryByPageKeyAndYear('wd40', 2024)
  2. 回傳 entry（status = 'rejected'）
  3. 檢測到退件狀態
  4. 顯示退件警告橫幅
```

**頁面顯示：**
```
紅色警告橫幅（頁面最上方）：
┌────────────────────────────────────────┐
│ ⚠️  填報已被退回                        │
│                                        │
│ 退回原因：MSDS 檔案不完整，請補充產品   │
│           安全資料表                    │
│                                        │
│ 請根據上述原因修正後重新提交。修正完成   │
│ 後，資料將重新進入審核流程。            │
│                                        │
│ 退回時間：2024-03-23 10:30:00          │
└────────────────────────────────────────┘

表單狀態：可編輯
檔案：可增刪
底部按鈕：「提交填報」「清除」
```

---

#### 步驟 5-2：使用者修正問題
```
使用者動作：
  - 刪除不完整的 MSDS 檔案
  - 上傳完整的 MSDS 檔案（包含產品安全資料表）
  - 檢查其他資料

系統行為：
  - 刪除舊檔案：deleteEvidenceFile()
  - 新檔案存記憶體：MemoryFile
  - 表單資料維持原樣（或可修改）
```

---

#### 步驟 5-3：重新提交
```
使用者動作：
  - 點「提交填報」按鈕

系統行為：

A. 更新資料庫記錄
   呼叫：upsertEnergyEntry(...)
   
   資料庫更新：
   - payload: 最新的表單資料
   - status: 'rejected' → 'submitted'
   - review_notes: 清空（null）
   - reviewed_at: 清空（null）
   - reviewer_id: 清空（null）
   - updated_at: 更新為當前時間

B. 上傳新的 MSDS 檔案
   - uploadEvidenceWithEntry()
   - 關聯到同一個 entry_id

C. 顯示成功訊息
   - Toast: "重新提交成功，等待審核"
   - 隱藏紅色警告橫幅
   - 顯示藍色「已提交」標籤
```

**狀態變化：**
```
before: status = 'rejected', review_notes = '退件原因'
after:  status = 'submitted', review_notes = null
```

---

## 流程 6：管理員審核 - 通過

### 使用場景
管理員檢查使用者提交（或重新提交）的資料，確認無誤後通過審核。

### 步驟詳解

#### 步驟 6-1：管理員進入審核模式
```
系統行為：
  1. 導航到：/app/wd40?mode=review&entryId=abc123&userId=user456
  2. 載入待審核的資料
  3. 頁面變唯讀
  4. 顯示「通過」和「退件」按鈕
```

---

#### 步驟 6-2：管理員點通過
```
管理員動作：
  1. 檢視所有資料
  2. 確認無誤
  3. 點「通過」按鈕
  4. 確認通過

系統行為：
  1. 呼叫 reviewEntry('abc123', 'approve', '')
  2. 更新資料庫
  3. 顯示成功訊息
  4. 導航回上一頁（審核列表）
```

**API 呼叫：**
```typescript
await reviewEntry(
  'abc123',    // entryId
  'approve',   // action
  ''           // notes（通過時為空）
)
```

**資料庫更新：**
```sql
UPDATE energy_entries
SET 
  status = 'approved',
  review_notes = null,
  reviewed_at = '2024-03-23T14:00:00',
  reviewer_id = 'admin123',
  is_locked = true    -- 🔒 鎖定資料
WHERE id = 'abc123'
```

---

#### 步驟 6-3：使用者看到通過狀態
```
使用者動作：
  - 進入 WD-40 頁面

系統行為：
  1. 呼叫 getEntryByPageKeyAndYear('wd40', 2024)
  2. 回傳 entry（status = 'approved', is_locked = true）
  3. 檢測到通過狀態
  4. 顯示通過祝賀橫幅
```

**頁面顯示：**
```
綠色祝賀橫幅（頁面最上方）：
┌────────────────────────────────────────┐
│ 🎉  恭喜您已審核通過！                  │
│                                        │
│ 此填報已完成審核，資料已鎖定無法修改。   │
│                                        │
│ 審核完成時間：2024-03-23 14:00:00      │
└────────────────────────────────────────┘

表單狀態：唯讀（不能編輯）
檔案：只能檢視和下載，不能刪除
底部按鈕：全部隱藏
```

**編輯權限：**
```typescript
editPermissions = {
  canEdit: false,      // ❌ 不能編輯表單
  canUpload: false,    // ❌ 不能上傳檔案
  canDelete: false,    // ❌ 不能刪除檔案
  canSubmit: false,    // ❌ 不能提交
  canClear: false      // ❌ 不能清除
}
```

---

## 流程 7：清除功能

### 使用場景
使用者想要清除所有已填寫的資料，重新開始。

### 步驟詳解

#### 步驟 7-1：使用者點清除
```
使用者動作：
  - 點「清除」按鈕

系統行為：
  1. 檢查當前狀態
  2. 如果 status = 'approved'：按鈕禁用，無法點擊
  3. 如果 status ≠ 'approved'：顯示確認彈窗
```

**清除按鈕可用性：**
```typescript
const canClear = currentStatus !== 'approved'

<button disabled={!canClear}>
  清除
</button>
```

---

#### 步驟 7-2：確認清除
```
確認彈窗內容：
┌────────────────────────────────────────┐
│         清除資料確認                    │
│                                        │
│ 確定要清除所有 WD-40 資料嗎？           │
│ 此操作無法復原，包括已保存到資料庫的     │
│ 記錄和檔案。                           │
│                                        │
│        [取消]        [確定清除]        │
└────────────────────────────────────────┘

使用者動作：
  - 點「確定清除」
```

---

#### 步驟 7-3：執行清除
```
系統行為：

A. 刪除資料庫記錄
   呼叫：deleteEnergyEntry('abc123')
   
   資料庫行為（級聯刪除）：
   1. 刪除 energy_entries 記錄
   2. 自動刪除 evidence_files 關聯記錄
   3. 從 Supabase Storage 刪除實體檔案

B. 清空前端 state
   - 清空所有表單欄位
   - 清空記憶體檔案
   - 重置狀態
   - 清空 currentEntryId
   - 設定 hasSubmittedBefore = false

C. 顯示成功訊息
   - Toast: "資料已清除"
   - 頁面回到初始狀態（如同首次進入）
```

**API 呼叫：**
```typescript
await deleteEnergyEntry('abc123')
// 結果：記錄和所有關聯檔案被刪除
```

**前端狀態重置：**
```typescript
setMonthlyData(Array.from({ length: 12 }, (_, i) => ({
  month: i + 1,
  quantity: 0,
  totalUsage: 0,
  files: []
})))
setUnitCapacity(0)
setCarbonRate(0)
setMsdsFiles([])
setMsdsMemoryFiles([])
setCurrentEntryId(null)
setHasSubmittedBefore(false)
setCurrentStatus('submitted')
```

---

## 狀態轉換圖

```
┌─────────────────────────────────────────────────────┐
│                   狀態轉換流程                        │
└─────────────────────────────────────────────────────┘

    null（無資料）
      │
      │ 首次提交
      │ upsertEnergyEntry()
      ↓
    submitted（已提交）
      │ ◄────────────────┐
      │                  │
      │ 修改後重新提交      │ 使用者修正後提交
      │ upsertEnergyEntry() │ upsertEnergyEntry()
      │                  │
      ↓                  │
    管理員審核            │
      │                  │
      ├─────────┬─────────┤
      │         │         │
      │ approve │  reject │
      │         │         │
      ↓         ↓         ↓
  approved   rejected ────┘
 （通過）    （退件）
   │
   │ 🔒 is_locked = true
   │ 不能編輯
   │ 不能清除
   │
   └─→ 最終狀態


清除功能：
- submitted → null  ✅ 可清除
- rejected → null   ✅ 可清除
- approved → null   ❌ 不可清除（按鈕禁用）
```

---

## API 對應表

### 資料操作 API

| 功能 | API 函式 | 參數 | 回傳值 | 說明 |
|------|---------|------|--------|------|
| 載入舊資料 | `getEntryByPageKeyAndYear` | `pageKey: string`<br>`year: number` | `EnergyEntry \| null` | 載入使用者某年度的填報記錄 |
| 新增/更新記錄 | `upsertEnergyEntry` | `input: UpsertEntryInput` | `{ entry_id: string }` | 新增或更新填報記錄<br>狀態設為 submitted |
| 更新狀態 | `updateEntryStatus` | `entryId: string`<br>`status: EntryStatus` | `void` | 手動更新記錄狀態 |
| 取得單筆記錄 | `getEntryById` | `entryId: string` | `EnergyEntry \| null` | 管理員用：載入特定記錄 |
| 刪除記錄 | `deleteEnergyEntry` | `entryId: string` | `void` | 刪除記錄（級聯刪除檔案） |

### 檔案操作 API

| 功能 | API 函式 | 參數 | 回傳值 | 說明 |
|------|---------|------|--------|------|
| 上傳檔案 | `uploadEvidenceWithEntry` | `file: File`<br>`metadata: object` | `EvidenceFile` | 上傳檔案到 Storage<br>並寫入 evidence_files |
| 關聯檔案 | `commitEvidence` | `{ entryId, pageKey }` | `void` | 確認所有檔案正確關聯 |
| 載入檔案清單 | `getEntryFiles` | `entryId: string` | `EvidenceFile[]` | 載入記錄的所有檔案 |
| 刪除檔案 | `deleteEvidenceFile` | `fileId: string` | `void` | 刪除檔案（資料庫+Storage） |
| 列出 MSDS | `listMSDSFiles` | `pageKey: string` | `EvidenceFile[]` | 列出某類別的 MSDS |
| 列出使用證明 | `listUsageEvidenceFiles` | `pageKey: string`<br>`year: number` | `EvidenceFile[]` | 列出某類別某年的使用證明 |

### 審核操作 API

| 功能 | API 函式 | 參數 | 回傳值 | 說明 |
|------|---------|------|--------|------|
| 審核操作 | `reviewEntry` | `entryId: string`<br>`action: 'approve'\|'reject'`<br>`notes?: string` | `void` | 執行通過或退件<br>通過會鎖定資料 |

---

## 錯誤處理

### 常見錯誤情況

#### 1. 網路錯誤
```
情境：上傳檔案時網路中斷

處理：
- 顯示錯誤 Toast
- 保留記憶體檔案
- 使用者可重新提交
- 使用 Promise.allSettled 部分成功處理
```

#### 2. 權限錯誤
```
情境：RLS 政策阻擋操作

處理：
- 檢查認證狀態
- 顯示友善錯誤訊息
- 提供重新登入選項
```

#### 3. 檔案上傳失敗
```
情境：檔案太大或格式錯誤

處理：
- 前端驗證：檔案類型、大小
- 後端驗證：Supabase Storage 限制
- 顯示具體錯誤原因
```

#### 4. 資料驗證失敗
```
情境：總使用量為 0

處理：
- 前端驗證：提交前檢查
- 後端驗證：資料庫約束
- 顯示：「總使用量必須大於 0」
```

---

## 常見問題 FAQ

### Q1：修改已提交的資料會保留歷史版本嗎？
**A：不會。** 每次提交都會覆蓋舊資料，不保留歷史版本。

---

### Q2：通過審核後還能修改嗎？
**A：不能。** status = 'approved' 且 is_locked = true 時，所有編輯功能都會禁用。

---

### Q3：清除功能什麼時候可以用？
**A：除了 approved 狀態，其他時候都可以用。**
- submitted → 可清除
- rejected → 可清除
- approved → 不可清除（按鈕禁用）

---

### Q4：記憶體檔案什麼時候上傳到 Supabase？
**A：點「提交填報」時。** 上傳前檔案只存在瀏覽器記憶體，關閉頁面就消失。

---

### Q5：管理員審核後會導航到哪裡？
**A：回到上一頁（審核列表）。** 使用 `navigate(-1)`。

---

### Q6：檔案刪除是立即生效嗎？
**A：是。** 呼叫 deleteEvidenceFile() 會立即從資料庫和 Storage 刪除。

---

## 版本歷史

| 版本 | 日期 | 變更內容 |
|------|------|---------|
| v1.0 | 2025-01-01 | 初版，包含 7 個完整流程 |

---

**相關文件：**
- [重構計畫](./REFACTORING_PLAN.md)
- [Hook 使用說明](./HOOKS.md)（待撰寫）
- [共用組件說明](./COMPONENTS.md)（待撰寫）
- [遷移指南](./MIGRATION_GUIDE.md)（待撰寫）