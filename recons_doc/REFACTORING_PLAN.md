# 能源填報系統重構計畫

## 📋 文件資訊

- **建立日期**：2025-01-01
- **系統版本**：v1.0（重構前）
- **目標版本**：v2.0（重構後）
- **負責範圍**：14 個能源類別頁面的使用者端

---

## 🎯 重構目標

### 為什麼要重構？

**問題現況：**
1. **重複程式碼嚴重**：14 個能源頁面（WD40、Acetylene、Refrigerant...）各自獨立，大量複製貼上
2. **維護困難**：改一個邏輯要改 14 次，容易漏改或改錯
3. **擴充不易**：新增頁面需要複製整個檔案，超過 1000 行

**重構目標：**
1. **統一邏輯**：提交、審核、檔案管理的邏輯只寫一次
2. **保持彈性**：每個頁面的表單欄位可以不同（WD40 有 12 個月份，Refrigerant 有機器清單）
3. **易於維護**：修改邏輯只需改一個地方
4. **易於擴充**：新增頁面只需寫表單部分，流程邏輯自動繼承

**重要原則：**
- ✅ 不改變現有功能
- ✅ 不改變前端 UI（保持現在的樣子）
- ✅ 向後相容（Never break userspace）
- ✅ 漸進式重構（一次改一個頁面）

---

## 📊 現況分析

### 目前的 14 個能源頁面

| 範疇 | 頁面 | page_key | 狀態 |
|------|------|----------|------|
| 範疇一 | WD-40 | wd40 | ✅ 已完成 |
| 範疇一 | 乙炔 | acetylene | ✅ 已完成 |
| 範疇一 | 冷媒 | refrigerant | ✅ 已完成 |
| 範疇一 | 化糞池 | septic_tank | ✅ 已完成 |
| 範疇一 | 天然氣 | natural_gas | ✅ 已完成 |
| 範疇一 | 尿素 | urea | ✅ 已完成 |
| 範疇一 | 柴油(發電機) | diesel_generator | ✅ 已完成 |
| 範疇一 | 柴油 | diesel | ✅ 已完成 |
| 範疇一 | 汽油 | gasoline | ✅ 已完成 |
| 範疇一 | 液化石油氣 | lpg | ✅ 已完成 |
| 範疇一 | 滅火器 | fire_extinguisher | ✅ 已完成 |
| 範疇一 | 焊條 | welding_rod | ✅ 已完成 |
| 範疇二 | 外購電力 | electricity | ✅ 已完成 |
| 範疇三 | 員工通勤 | employee_commute | ✅ 已完成 |

### 現有架構的問題

#### 問題 1：重複的邏輯（每個頁面都有）
```typescript
// 提交邏輯 - 在 14 個檔案中重複
const handleSubmit = async () => {
  const { entry_id } = await upsertEnergyEntry(entryInput)
  await uploadEvidenceWithEntry(...)
  await commitEvidence(...)
  await handleSubmitSuccess()
}

// 審核邏輯 - 在 14 個檔案中重複
if (isReviewMode) {
  const entry = await getEntryById(reviewEntryId)
  // ...載入邏輯
}

// 檔案管理 - 在 14 個檔案中重複
const loadFiles = async () => {
  const msds = await listMSDSFiles(pageKey)
  const usage = await listUsageEvidenceFiles(pageKey, year)
  // ...
}
```

#### 問題 2：狀態管理分散
每個頁面都有自己的：
- `currentStatus`
- `submitting`
- `loading`
- `error`
- `hasSubmittedBefore`
- ... 超過 20 個 state

#### 問題 3：UI 組件不統一
- 有的頁面用 `<ApprovalBanner>`，有的自己寫
- 清除確認彈窗每個頁面長得不一樣
- Toast 訊息用詞不統一

---

## 🏗️ 重構方案

### 核心思想

> **「只抽邏輯，不抽 UI」**
> 
> 每個頁面保持獨立的表單結構（因為欄位不同），但共用底層的提交、審核、檔案管理邏輯。

### 架構設計

```
┌─────────────────────────────────────────┐
│          14 個能源頁面（各自獨立）          │
│  WD40Page  AcetylenePage  RefrigerantPage │
│                                           │
│  ┌─────────────────────────────────┐    │
│  │  各頁面的表單欄位（不統一）        │    │
│  │  - WD40: 12 個月份 + 單位容量     │    │
│  │  - Refrigerant: 機器清單          │    │
│  │  - Electricity: 電費單            │    │
│  └─────────────────────────────────┘    │
│                                           │
│  ┌─────────────────────────────────┐    │
│  │  呼叫共用 Hook（邏輯統一）         │    │
│  │  useEnergySubmission()            │    │
│  │  useEnergyReview()                │    │
│  │  useEnergyFiles()                 │    │
│  └─────────────────────────────────┘    │
└─────────────────────────────────────────┘
              ↓
┌─────────────────────────────────────────┐
│           共用組件（UI 統一）              │
│  <ApprovalBanner>                        │
│  <ClearConfirmModal>                     │
│  <SubmitSuccessModal>                    │
│  <Toast>                                 │
└─────────────────────────────────────────┘
              ↓
┌─────────────────────────────────────────┐
│            API 層（不變）                 │
│  upsertEnergyEntry()                     │
│  uploadEvidenceWithEntry()               │
│  reviewEntry()                           │
└─────────────────────────────────────────┘
```

---

## 🔧 技術實作

### 1. 建立 3 個核心 Hook

#### Hook 1: `useEnergySubmission`
**負責：提交流程**

```typescript
功能：
- 儲存表單資料到資料庫
- 上傳記憶體檔案到 Supabase Storage
- 關聯檔案到記錄
- 處理提交成功/失敗

使用方式：
const { submit, submitting, error } = useEnergySubmission(pageKey, year)

await submit({
  formData: { monthly: {...}, unitCapacity: 500, ... },
  memoryFiles: { msds: [...], monthly: [...] }
})
```

#### Hook 2: `useEnergyReview`
**負責：審核流程**

```typescript
功能：
- 檢測是否為審核模式（URL 參數）
- 載入待審核的記錄
- 執行通過/退件操作
- 審核後導航回上一頁

使用方式：
const { 
  isReviewing, 
  reviewData, 
  approve, 
  reject 
} = useEnergyReview()

if (isReviewing) {
  // 顯示審核 UI
}
```

#### Hook 3: `useEnergyFiles`
**負責：檔案管理**

```typescript
功能：
- 載入已上傳的檔案清單
- 上傳新檔案
- 刪除檔案
- 管理記憶體檔案

使用方式：
const { 
  files, 
  memoryFiles,
  uploadFile,
  deleteFile,
  loadFiles
} = useEnergyFiles(entryId, pageKey)
```

### 2. 統一共用組件

#### 組件 1: `<ApprovalBanner>`
**顯示審核狀態橫幅**

```typescript
位置：頁面最上方
顯示邏輯：
- approved → 綠色 + 🎉 + "恭喜您已審核通過！"
- rejected → 紅色 + ⚠️ + "填報已被退回" + 退回原因
- submitted → 藍色 + "等待審核中"

使用方式：
<ApprovalBanner 
  status={currentStatus}
  rejectionReason={reviewNotes}
  reviewedAt={reviewedAt}
/>
```

#### 組件 2: `<ClearConfirmModal>`
**清除資料確認彈窗**

```typescript
標題：清除資料確認
內容：「確定要清除所有 [頁面名稱] 資料嗎？此操作無法復原，包括已保存到資料庫的記錄和檔案。」
按鈕：取消 / 確定清除

使用方式：
<ClearConfirmModal
  isOpen={showClearModal}
  categoryName="WD-40"
  onConfirm={handleClearConfirm}
  onCancel={() => setShowClearModal(false)}
/>
```

#### 組件 3: `<SubmitSuccessModal>`
**提交成功彈窗**

```typescript
圖示：✅
標題：提交成功
內容：「年度總使用量：XXX [單位]」
按鈕：確定

使用方式：
<SubmitSuccessModal
  isOpen={showSuccessModal}
  amount={totalAmount}
  unit="ML"
  onClose={() => setShowSuccessModal(false)}
/>
```

---

## 📝 完整工作流程

### 流程 1：首次填報

```
步驟 1：進入頁面
  → getEntryByPageKeyAndYear(pageKey, year)
  → 回傳 null（無資料）
  → 顯示空白表單

步驟 2：填寫表單 + 上傳檔案
  → 表單資料存在 React state
  → 檔案存在記憶體（MemoryFile[]）
  → 尚未寫入資料庫

步驟 3：點提交
  → upsertEnergyEntry() → 回傳 entry_id
  → uploadEvidenceWithEntry() → 上傳記憶體檔案
  → commitEvidence() → 關聯檔案
  → Toast: "提交成功！"
  → 狀態變更: submitted
```

### 流程 2：重新進入頁面（載入舊資料）

```
步驟 1：使用者回到頁面
  → getEntryByPageKeyAndYear(pageKey, year)
  → 回傳 existing entry
  → 從 payload 載入表單資料
  → getEntryFiles(entry_id) → 載入檔案清單
  → 顯示資料 + 檔案

顯示狀態：
  - 狀態標籤：「已提交」（藍色）
  - 表單：可編輯
  - 檔案：可增刪
```

### 流程 3：修改已提交的資料

```
步驟 1：修改表單 + 檔案
  → 更新 React state
  → 刪除舊檔案：deleteEvidenceFile(fileId)
  → 新檔案存記憶體

步驟 2：重新提交
  → upsertEnergyEntry() → 覆蓋舊資料
  → 上傳新的記憶體檔案
  → 重新關聯檔案
  → 結果：舊資料被覆蓋（不保留歷史版本）
```

### 流程 4：管理員審核 - 退件

```
步驟 1：管理員進入審核模式
  → URL: /wd40?mode=review&entryId=abc123
  → getEntryById('abc123')
  → 頁面變唯讀
  → 顯示「通過」和「退件」按鈕

步驟 2：管理員點退件
  → 輸入原因："MSDS 檔案不完整"
  → reviewEntry('abc123', 'reject', '原因')
  → 資料庫更新: status='rejected', review_notes='原因'
  → 導航：回到上一頁
```

### 流程 5：使用者看到退件 + 重新提交

```
步驟 1：使用者進入頁面
  → 載入 entry（status='rejected'）
  → 顯示紅色警告 + 退件原因
  → 表單變成可編輯

步驟 2：修正後重新提交
  → upsertEnergyEntry()
  → 狀態變更: rejected → submitted
  → 清空 review_notes
```

### 流程 6：管理員審核 - 通過

```
步驟 1：管理員點通過
  → reviewEntry('abc123', 'approve', '')
  → 資料庫更新: status='approved', is_locked=true
  → 導航：回到上一頁

步驟 2：使用者看到通過狀態
  → 顯示綠色祝賀："🎉 恭喜您已審核通過！"
  → 表單變成唯讀
  → 隱藏「提交」按鈕
  → 檔案只能看，不能改
```

### 流程 7：清除功能

```
使用者點清除
  → 確認彈窗
  → deleteEnergyEntry(entry_id)
  → 級聯刪除: 資料庫記錄 + 關聯檔案 + Storage 實體檔案
  → 清空前端 state
  → Toast: "資料已清除"

限制：
  - approved 狀態：禁用清除
  - 其他狀態：可以清除
```

---

## 🔄 狀態轉換圖

```
null（無資料）
  ↓ 首次提交
submitted（已提交）← 可修改、可清除
  ↓ 管理員審核
  ├─ approved（通過）→ 鎖定，不能改，不能清除
  └─ rejected（退件）→ 可重新編輯、可清除
       ↓ 使用者修正後提交
     submitted（重新提交）
       ↓ 再次審核
     approved（通過）
```

---

## 📋 API 對應表

| 功能 | API 函式 | 回傳值 |
|------|---------|--------|
| 載入舊資料 | `getEntryByPageKeyAndYear(pageKey, year)` | `EnergyEntry \| null` |
| 新增/更新記錄 | `upsertEnergyEntry(input)` | `{ entry_id: string }` |
| 上傳檔案 | `uploadEvidenceWithEntry(file, metadata)` | `EvidenceFile` |
| 關聯檔案 | `commitEvidence({ entryId, pageKey })` | `void` |
| 刪除檔案 | `deleteEvidenceFile(fileId)` | `void` |
| 載入檔案清單 | `getEntryFiles(entryId)` | `EvidenceFile[]` |
| 審核（通過/退件） | `reviewEntry(entryId, action, notes)` | `void` |
| 清除記錄 | `deleteEnergyEntry(entryId)` | `void` |

---

## 📅 實施計畫

### 階段 1：準備階段（第 1 週）
- [x] 討論需求
- [x] 確認流程
- [x] 撰寫重構計畫文件
- [ ] 設計 Hook API
- [ ] 撰寫 Hook 使用文件

### 階段 2：開發階段（第 2-3 週）
- [ ] 開發 `useEnergySubmission`
- [ ] 開發 `useEnergyReview`
- [ ] 開發 `useEnergyFiles`
- [ ] 統一共用組件
- [ ] 撰寫單元測試

### 階段 3：試點階段（第 4 週）
- [ ] 重構 WD40Page（試點）
- [ ] 完整測試 WD40 所有流程
- [ ] 修正問題
- [ ] 確認方案可行

### 階段 4：推廣階段（第 5-6 週）
- [ ] 重構其他 13 個頁面
- [ ] 每改一個就測試一個
- [ ] 撰寫遷移指南

### 階段 5：驗收階段（第 7 週）
- [ ] 完整回歸測試
- [ ] 效能測試
- [ ] 文件整理
- [ ] 上線準備

---

## ✅ 成功標準

重構完成後，應達成：

### 功能面
- ✅ 所有現有功能正常運作（Never break userspace）
- ✅ 14 個頁面的提交/審核/檔案管理邏輯完全一致
- ✅ UI 組件（警告、恭喜、Toast）完全統一
- ✅ 所有測試通過

### 程式碼面
- ✅ 每個頁面程式碼從 1000+ 行降到 300-400 行
- ✅ 共用邏輯統一在 Hook 中
- ✅ 新增頁面只需複製模板 + 改表單欄位

### 維護面
- ✅ 修改流程邏輯只需改 Hook
- ✅ 所有頁面自動繼承修改
- ✅ 有完整文件可查

---

## 🚨 風險與對策

### 風險 1：重構破壞現有功能
**對策：**
- 漸進式重構，一次改一個頁面
- 改完立即測試
- 保留原始程式碼備份

### 風險 2：Hook 設計不夠彈性
**對策：**
- 先用 WD40 試點
- 發現問題立即調整
- 確認可行再推廣

### 風險 3：測試範圍太大
**對策：**
- 建立測試清單
- 自動化測試腳本
- 每個頁面獨立測試

---

## 📚 相關文件

完成重構後，將產出以下文件：

1. **REFACTORING_PLAN.md**（本文件）
   - 重構目標、方案、流程

2. **WORKFLOW.md**
   - 7 個完整使用流程
   - 狀態轉換圖
   - API 對應表

3. **HOOKS.md**
   - 3 個 Hook 的詳細說明
   - 使用範例
   - API Reference

4. **COMPONENTS.md**
   - 共用組件使用說明
   - Props 定義
   - 範例程式碼

5. **MIGRATION_GUIDE.md**
   - 如何改造現有頁面
   - Step by step 教學
   - 常見問題 FAQ

---

## 📞 聯絡資訊

如有問題，請參考：
- 完整流程：見 `WORKFLOW.md`
- Hook 使用：見 `HOOKS.md`
- 遷移教學：見 `MIGRATION_GUIDE.md`

---

**文件版本：v1.0**  
**最後更新：2025-01-01**