# Type 2 頁面重構 SOP

> 基於 DieselPage 重構經驗建立的標準操作流程

**建立日期：** 2025-01-20
**Pilot 頁面：** DieselPage ✅ 完成
**適用頁面：** GasolinePage, UreaPage, WD40Page, SepticTankPage, DieselStationarySourcesPage

---

## 🎯 Type 2 特徵

- **業務邏輯：** 一筆佐證 → 多筆資料（群組型）
- **資料結構：** 多筆記錄共用一個佐證檔案（1:多 關係）
- **複雜度：** 🟡 中等
- **關鍵欄位：** `groupId`（群組識別碼）

---

## 📋 重構步驟（45 分鐘完成）

### 步驟 1：移除舊 imports（2 分鐘）

**移除：**
```typescript
import { useMultiRecordSubmit } from '../../hooks/useMultiRecordSubmit'
import { useRecordFileMapping } from '../../hooks/useRecordFileMapping'
```

**新增：**
```typescript
import { submitEnergyEntry } from '../../api/v2/entryAPI'
import { uploadEvidenceFile } from '../../api/v2/fileAPI'
import { useThumbnailLoader } from '../../hooks/useThumbnailLoader'  // ⭐ Type 2 新增
```

---

### 步驟 2：移除舊 hooks 初始化（2 分鐘）

**刪除：**
```typescript
const {
  submit,
  save,
  error: submitError,
  success: submitSuccess,
  clearError: clearSubmitError,
  clearSuccess: clearSubmitSuccess
} = useMultiRecordSubmit(pageKey, year)

const {
  uploadRecordFiles,
  getRecordFiles,
  loadFileMapping,
  getFileMappingForPayload,
  removeRecordMapping
} = useRecordFileMapping(pageKey, currentEntryId)
```

**替換為：**
```typescript
const [submitError, setSubmitError] = useState<string | null>(null)
const [submitSuccess, setSubmitSuccess] = useState<string | null>(null)
```

---

### 步驟 3：加入 useThumbnailLoader（2 分鐘）⭐ Type 2 特有

**在 savedGroups 宣告之後加入：**

```typescript
// 已保存的群組（對應 Figma 下方「資料列表」區）
const [savedGroups, setSavedGroups] = useState<DieselRecord[]>([])

// ⭐ 縮圖載入（使用統一 hook，Type 2：從群組中提取 evidenceFiles）
const thumbnails = useThumbnailLoader({
  records: savedGroups,
  fileExtractor: (record) => record.evidenceFiles || []
})
```

**⚠️ 重要：必須在 `savedGroups` 宣告之後，否則會出現「已在其宣告之前使用區塊範圍變數」錯誤**

---

### 步驟 4：建立統一提交函數（15 分鐘）⭐ Type 2 核心

**核心模板（從 DieselPage 複製）：**

```typescript
// 統一提交函數（提交和暫存）
const submitData = async (isDraft: boolean) => {
  // 1️⃣ 驗證資料
  if (savedGroups.length === 0) {
    throw new Error('請至少新增一個群組')
  }

  await executeSubmit(async () => {
    try {
      // 2️⃣ 準備提交資料
      const { totalQuantity, cleanedEnergyData } = prepareSubmissionData(savedGroups)

      // 3️⃣ 提交 entry
      const response = await submitEnergyEntry({
        page_key: pageKey,  // 🔧 調整：'diesel', 'gasoline', 'urea', 'wd40', 'septic_tank', 'diesel_stationary'
        period_year: year,
        unit: DIESEL_CONFIG.unit,        // 🔧 調整：根據頁面配置
        monthly: { '1': totalQuantity },  // 🔧 必須包含
        status: isDraft ? 'saved' : 'submitted',  // ⚠️ 暫存用 'saved' 不是 'draft'
        notes: `${DIESEL_CONFIG.title}使用共 ${savedGroups.length} 筆記錄`,  // 🔧 調整描述
        payload: {
          dieselData: cleanedEnergyData  // 🔧 調整 key 名稱
        }
      })

      // 4️⃣⭐ Type 2 特有：按群組上傳檔案
      const groupsMap = new Map<string, DieselRecord[]>()
      savedGroups.forEach(record => {
        const gid = record.groupId || 'no-group'
        if (!groupsMap.has(gid)) groupsMap.set(gid, [])
        groupsMap.get(gid)!.push(record)
      })

      for (const [groupId, groupRecords] of groupsMap.entries()) {
        const firstRecord = groupRecords[0]
        if (firstRecord?.memoryFiles && firstRecord.memoryFiles.length > 0) {
          const newFiles = firstRecord.memoryFiles.filter(mf => mf.file && mf.file.size > 0)

          for (const file of newFiles) {
            await uploadEvidenceFile(file.file, {
              page_key: pageKey,
              period_year: year,
              file_type: 'other',
              entry_id: response.entry_id,
              record_id: groupRecords.map(r => r.id).join(','),  // ⭐ Type 2 關鍵：逗號分隔的 ID
              standard: '64'
            })
          }
        }
      }

      // 5️⃣ 更新前端狀態
      setCurrentEntryId(response.entry_id)
      setSubmitSuccess(isDraft ? '暫存成功' : '提交成功')

      // 6️⃣ 重新載入資料
      await reload()
      if (!isDraft) {
        await handleSubmitSuccess()
      }
      reloadApprovalStatus()

    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : '操作失敗')
      throw error
    }
  })
}
```

---

### 步驟 5：簡化 handleSubmit（1 分鐘）

**替換整個函數：**

```typescript
const handleSubmit = () => submitData(false)
```

---

### 步驟 6：簡化 handleSave（5 分鐘）

**保留管理員審核模式邏輯，一般模式簡化：**

```typescript
const handleSave = async () => {
  // 管理員審核模式（保持不變）
  if (isReviewMode && reviewEntryId) {
    // ... 保留原有的 adminSave 邏輯 ...
    return
  }

  // 一般暫存（簡化為一行）
  await submitData(true)
}
```

---

### 步驟 7：修復檔案載入邏輯（10 分鐘）⭐ Type 2 特有

**找到第二階段檔案載入的 useEffect，修正 record_id 過濾：**

```typescript
// ❌ Type 1 錯誤寫法
const recordFiles = files.filter(f => f.record_id === record.id)

// ✅ Type 2 正確寫法（record_id 是逗號分隔的字串）
const recordFiles = files.filter(f =>
  f.record_id && f.record_id.split(',').includes(record.id)
)
```

**完整範例：**

```typescript
// 第二步：檔案載入後映射到記錄
useEffect(() => {
  if (loadedFiles && loadedFiles.length > 0 && pageKey && !dataLoading) {
    const validFiles = loadedFiles.filter(f => f.page_key === pageKey)

    if (validFiles.length > 0 && savedGroups.length > 0) {
      setSavedGroups(prev => {
        return prev.map((item) => {
          // ⭐ Type 2 關鍵：使用 split(',').includes() 過濾
          const filesForThisRecord = validFiles.filter(f =>
            f.record_id && f.record_id.split(',').includes(item.id)
          )
          return {
            ...item,
            evidenceFiles: filesForThisRecord
            // ⚠️ 不要清除 memoryFiles！
          }
        })
      })
    }
  }
}, [loadedFiles, pageKey, dataLoading, savedGroups.length])
```

**⚠️ 常見錯誤：不要清除 memoryFiles**

```typescript
// ❌ 錯誤：會導致新增群組後佐證消失
return {
  ...item,
  evidenceFiles: filesForThisRecord,
  memoryFiles: filesForThisRecord.length > 0 ? [] : (item.memoryFiles || [])
}

// ✅ 正確：只更新 evidenceFiles
return {
  ...item,
  evidenceFiles: filesForThisRecord
}
```

---

### 步驟 8：移除刪除確認提示（2 分鐘）⭐ UI/UX 標準

**找到刪除群組函數，移除確認對話框：**

```typescript
// ❌ 舊寫法（有確認提示）
const deleteSavedGroup = (groupId: string) => {
  if (window.confirm('確定要刪除此群組嗎？')) {
    setSavedGroups(prev => prev.filter(r => r.groupId !== groupId))
    setSuccess('群組已刪除')
  }
}

// ✅ 新寫法（直接刪除）
const deleteSavedGroup = (groupId: string) => {
  setSavedGroups(prev => prev.filter(r => r.groupId !== groupId))
  setSuccess('群組已刪除')
}
```

**適用範圍：** 所有列表項目的刪除操作（僅前端暫存，未提交到後端）

---

### 步驟 9：確保縮圖使用統一佔位符（2 分鐘）⭐ UI/UX 標準

**GroupListItem.tsx 應使用統一縮圖佔位符：**

```typescript
import { THUMBNAIL_PLACEHOLDER_SVG, THUMBNAIL_BACKGROUND } from '../../utils/energy/thumbnailConstants'

// ✅ 正確：永久容器 + 統一佔位符
{isImage ? (
  <div style={{
    background: THUMBNAIL_BACKGROUND,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  }}>
    {THUMBNAIL_PLACEHOLDER_SVG}
  </div>
) : (
  <FileTypeIcon fileType={fileType} />
)}

// ❌ 錯誤：白色背景
<div style={{ background: '#FFF' }} />
```

**標準：** 與 Type 1 相同（見 [type1-sop.md](type1-sop.md) 步驟 8）

- ✅ 永遠渲染容器
- ✅ 背景色 `THUMBNAIL_BACKGROUND`（#EBEDF0）
- ✅ 無縮圖時顯示 `THUMBNAIL_PLACEHOLDER_SVG`
- ✅ 引用 `thumbnailConstants.tsx`

---

### 步驟 10：測試（3 分鐘）

**執行 TypeScript 檢查：**
```bash
npx --prefix frontend tsc --noEmit
```

**手動測試項目：**
```
[ ] 新增群組 → 佐證檔案顯示正常
[ ] 保存群組後再次進入 → 佐證檔案仍然存在（未被清除）
[ ] 刪除群組 → 無確認提示，直接刪除
[ ] 暫存 → 狀態為 'saved'
[ ] 提交 → 狀態為 'submitted'
[ ] 檔案上傳 → record_id 格式為 "id1,id2,id3"
```

---

### 步驟 11：程式碼品質檢查（15 分鐘）⭐ 重要

**基於 CODE_QUALITY_CHECKLIST.md 進行 Linus 式品質檢查**

#### P0 Critical（必須修復）

**1. 型別定義重複（Type Definition Duplication）**

```typescript
// ❌ 錯誤：8 行重複定義（DieselPage 原始問題）
const filesToUpload: Array<{
  file: File
  metadata: {
    recordIndex: number
    fileType: 'other'
    recordId?: string
    allRecordIds?: string[]
  }
}> = []

// ✅ 正確：重用現有型別（1 行）
import type { AdminSaveParams } from '../../hooks/useAdminSave'
const filesToUpload: AdminSaveParams['files'] = []
```

**檢查方式：** 搜尋 `Array<{` 開頭的型別定義，超過 5 行的改用 type import

---

#### P1 High Priority（應該修復）

**2. 過長函數拆分（Long Method Splitting）**

DieselPage 建立了 **6 個輔助函數**來拆分長函數：

```typescript
// 輔助函數 #1：建立群組映射（Type 2 核心邏輯）
const buildGroupsMap = (records: DieselRecord[]) => {
  const groupsMap = new Map<string, DieselRecord[]>()
  records.forEach(record => {
    const gid = record.groupId || 'no-group'
    if (!groupsMap.has(gid)) groupsMap.set(gid, [])
    groupsMap.get(gid)!.push(record)
  })
  return groupsMap
}

// 輔助函數 #2：上傳群組檔案
const uploadGroupFiles = async (groupsMap: Map<string, DieselRecord[]>, entryId: string) => {
  for (const [, groupRecords] of groupsMap.entries()) {
    const firstRecord = groupRecords[0]
    if (firstRecord?.memoryFiles && firstRecord.memoryFiles.length > 0) {
      const newFiles = firstRecord.memoryFiles.filter(mf => mf.file && mf.file.size > 0)

      for (const file of newFiles) {
        await uploadEvidenceFile(file.file, {
          page_key: pageKey,
          period_year: year,
          file_type: 'other',
          entry_id: entryId,
          record_id: groupRecords.map(r => r.id).join(','),  // Type 2 關鍵
          standard: '64'
        })
      }
    }
  }
}

// 輔助函數 #3：刪除已標記的檔案（一般模式）
const deleteMarkedFiles = async () => {
  if (filesToDelete.length > 0) {
    for (const fileId of filesToDelete) {
      try {
        await deleteEvidence(fileId)
      } catch (error) {
        // 靜默失敗
      }
    }
    setFilesToDelete([])
  }
}

// 輔助函數 #4：收集管理員要上傳的檔案
const collectAdminFilesToUpload = (allGroups: DieselRecord[]): AdminSaveParams['files'] => {
  const groupsMap = buildGroupsMap(allGroups)
  const filesToUpload: AdminSaveParams['files'] = []

  for (const [, groupRecords] of groupsMap.entries()) {
    const firstRecord = groupRecords[0]
    if (firstRecord?.memoryFiles && firstRecord.memoryFiles.length > 0) {
      const newFiles = firstRecord.memoryFiles.filter(mf => mf.file && mf.file.size > 0)

      for (const mf of newFiles) {
        filesToUpload.push({
          file: mf.file,
          metadata: {
            recordIndex: 0,
            fileType: 'other' as const,
            allRecordIds: groupRecords.map(r => r.id),
            recordId: firstRecord.id
          }
        })
      }
    }
  }

  return filesToUpload
}

// 輔助函數 #5：刪除管理員標記的檔案（管理員模式）
const deleteMarkedFilesAsAdmin = async () => {
  if (filesToDelete.length > 0) {
    for (const fileId of filesToDelete) {
      try {
        await adminDeleteEvidence(fileId)  // ⚠️ 管理員用 adminDeleteEvidence
      } catch (error) {
        // 靜默失敗
      }
    }
    setFilesToDelete([])
  }
}

// 輔助函數 #6：同步編輯區修改到 savedGroups
const syncEditingGroupChanges = () => {
  if (currentEditingGroup.groupId === null) {
    return savedGroups
  }

  const hasModifications = currentEditingGroup.records.some(r =>
    r.date.trim() !== '' || r.quantity > 0
  ) || currentEditingGroup.memoryFiles.length > 0

  if (!hasModifications) {
    return savedGroups
  }

  const { groupId, records, memoryFiles } = currentEditingGroup
  const validRecords = records.filter(r => r.date.trim() !== '' || r.quantity > 0)
  const recordsWithGroupId = validRecords.map(r => ({
    ...r,
    groupId: groupId,
    memoryFiles: [...memoryFiles]
  }))

  const finalSavedGroups = [
    ...recordsWithGroupId,
    ...savedGroups.filter(r => r.groupId !== groupId)
  ]

  setSavedGroups(finalSavedGroups)
  return finalSavedGroups
}
```

**函數縮減成果：**
- `submitData`: 77 行 → 43 行（44% 縮減）
- `handleAdminSave`: 76 行 → 19 行（75% 縮減）
- `handleSave`: 54 行 → 19 行（65% 縮減）

**檢查方式：** 手動數行數，任何函數超過 50 行就拆分

---

#### P2 Medium Priority（建議修復）

**3. 移除 console.log 污染**

```bash
# 搜尋所有 console.log
grep -n "console\\.log" frontend/src/pages/Category1/YourPage.tsx
```

**標準：** 移除所有調試用的 console.log/warn/error

---

### 步驟 12：最終驗證（2 分鐘）

**執行完整檢查：**
```bash
# 1. TypeScript 編譯
npx --prefix frontend tsc --noEmit

# 2. 搜尋型別定義重複（超過 5 行）
grep -A 8 "const.*: Array<{" frontend/src/pages/Category1/YourPage.tsx

# 3. 搜尋 console 殘留
grep -n "console\." frontend/src/pages/Category1/YourPage.tsx
```

**預期結果：**
- ✅ TypeScript 零錯誤
- ✅ 無超過 5 行的型別定義
- ✅ 無超過 50 行的函數
- ✅ 無 console.log 殘留

---

## 🔧 各頁面調整清單

### DieselPage ✅ 完成（Pilot）
- `page_key: 'diesel'`
- `payload.dieselData`
- `DIESEL_CONFIG.unit`, `DIESEL_CONFIG.title`
- 欄位：date, vehicleNumber, quantity, receiptNumber, groupId

### GasolinePage 🔜 下一個
- `page_key: 'gasoline'`
- `payload.gasolineData`
- `GASOLINE_CONFIG.unit`, `GASOLINE_CONFIG.title`
- 欄位：類似 DieselPage

### UreaPage
- `page_key: 'urea'`
- `payload.ureaData`
- `UREA_CONFIG.unit`, `UREA_CONFIG.title`

### WD40Page
- `page_key: 'wd40'`
- `payload.wd40Data`
- `WD40_CONFIG.unit`, `WD40_CONFIG.title`

### SepticTankPage
- `page_key: 'septic_tank'`
- `payload.septicTankData`
- `SEPTIC_TANK_CONFIG.unit`, `SEPTIC_TANK_CONFIG.title`

### DieselStationarySourcesPage
- `page_key: 'diesel_stationary'`
- `payload.dieselStationaryData`
- `DIESEL_STATIONARY_CONFIG.unit`, `DIESEL_STATIONARY_CONFIG.title`

---

## 📊 預期成果

### 程式碼減少
- **移除行數：** ~650 行 (useMultiRecordSubmit + useRecordFileMapping + 重複邏輯)
- **新增行數：** ~60 行 (submitData 函數)
- **淨減少：** ~590 行 (91%)

### Code Smells 消除
- ✅ Duplicated Code（handleSubmit 和 handleSave 重複）
- ✅ Long Method（useMultiRecordSubmit 204 行）
- ✅ Feature Envy（前端做後端的事）
- ✅ Duplicated Code（9 頁縮圖載入邏輯 → useThumbnailLoader）

### 新增標準化
- ✅ useThumbnailLoader（統一縮圖載入邏輯，9 頁共用）
- ✅ UI/UX 標準（移除刪除確認提示）

---

## ⚠️ Type 2 特有注意事項

### 1. record_id 格式 ⭐ 最關鍵
```typescript
// Type 1: 單一 ID
record_id: "abc123"

// Type 2: 逗號分隔的 ID 字串
record_id: "abc123,def456,ghi789"

// 過濾時使用 split(',').includes()
files.filter(f => f.record_id && f.record_id.split(',').includes(record.id))
```

### 2. groupId 概念
- 每個群組有唯一 `groupId`
- 同一群組內的多筆記錄共用佐證檔案
- 上傳檔案時取 `groupRecords.map(r => r.id).join(',')`

### 3. memoryFiles 不要清除
- `evidenceFiles`：從後端載入的檔案
- `memoryFiles`：使用者新增但尚未上傳的檔案
- 更新 `evidenceFiles` 時不要動 `memoryFiles`

### 4. 狀態欄位
- 暫存：`status: 'saved'` ⚠️ 不是 'draft'
- 提交：`status: 'submitted'`

### 5. useThumbnailLoader 位置
- 必須在 `savedGroups` 宣告之後
- 否則會出現「已在其宣告之前使用區塊範圍變數」錯誤

---

## 🚀 快速檢查清單

複製這個到每次重構前檢查：

```
[ ] 已備份原始檔案
[ ] 已移除 useMultiRecordSubmit import
[ ] 已移除 useRecordFileMapping import
[ ] 已新增 submitEnergyEntry, uploadEvidenceFile imports
[ ] ⭐ 已新增 useThumbnailLoader import
[ ] 已建立 submitData 函數
[ ] ⭐ submitData 中使用 groupsMap 按群組上傳檔案
[ ] ⭐ record_id 使用 groupRecords.map(r => r.id).join(',')
[ ] 已調整 page_key
[ ] 已調整 payload key 名稱
[ ] 已調整 CONFIG 引用（unit, title）
[ ] ⭐ status 使用 'saved' 不是 'draft'
[ ] 已簡化 handleSubmit
[ ] 已簡化 handleSave（保留 adminSave）
[ ] ⭐ 檔案載入邏輯使用 split(',').includes()
[ ] ⭐ 不清除 memoryFiles
[ ] ⭐ 已加入 useThumbnailLoader（在 savedGroups 之後）
[ ] ⭐ 已移除刪除確認提示
[ ] TypeScript 編譯通過
[ ] 手動測試佐證檔案顯示正常
[ ] 更新 PROGRESS.md
```

---

## 📝 Type 1 vs Type 2 對照

| 特性 | Type 1（設備型） | Type 2（群組型） |
|------|----------------|----------------|
| **佐證關係** | 1:1 | 1:多 |
| **record_id** | 單一 ID | 逗號分隔 ID |
| **檔案過濾** | `f.record_id === id` | `f.record_id.split(',').includes(id)` |
| **檔案上傳** | 每個設備獨立上傳 | 按群組上傳，多個 ID |
| **資料結構** | `savedDevices` | `savedGroups` |
| **關鍵欄位** | 無 | `groupId` |
| **縮圖載入** | `useThumbnailLoader` | `useThumbnailLoader`（相同） |

---

## ⚠️ DieselPage 踩過的坑（必讀！）

> 基於 PROGRESS.md 記錄的實際問題，以下是 Type 2 頁面必須避免的三個致命錯誤

### 🔴 坑 #1：管理員審核按鈕通知錯誤

**問題：** 管理員點「退回」按鈕顯示「提交成功」通知，三個審核按鈕通知都不對

**根本原因：**
DieselPage 傳了 `onShowSuccess` 和 `onShowError` 回調給 ReviewSection，但 TYPE1 (GeneratorTestPage) 不用這個模式。ReviewSection 自己處理通知，不需要外部回調。

**錯誤寫法：**
```typescript
// ❌ 不要這樣寫
reviewSection={{
  // ...
  onSave: handleSave,
  isSaving: submitting,
  onShowSuccess: (msg) => setSubmitSuccess(msg),  // ← 多餘
  onShowError: (msg) => setSubmitError(msg)       // ← 多餘
}}
```

**正確寫法（參考 TYPE1）：**
```typescript
// ✅ 正確：ReviewSection 自己處理通知
reviewSection={{
  isReviewMode,
  reviewEntryId,
  reviewUserId,
  currentEntryId,
  pageKey,
  year,
  category: DIESEL_CONFIG.title,
  amount: dieselData.reduce((sum, item) => sum + item.quantity, 0),
  unit: DIESEL_CONFIG.unit,
  role,
  onSave: handleSave,
  isSaving: submitting
  // ✅ 不傳 onShowSuccess 和 onShowError
}}
```

**修復位置：** `DieselPage.tsx` 的 reviewSection props

**參考範本：** `GeneratorTestPage.tsx:491-510`

---

### 🔴 坑 #2：⚠️ 雙重通知問題（已廢棄解法，請參照 UreaPage 模式）

**⚠️ 警告：本記錄的解法已被證實為錯誤方案，請勿參考。正確解法請參照下方「✅ 正確解法（2025-11-21）」。**

**問題：** 點「儲存」按鈕跳兩次成功通知

**❌ 錯誤解法（DieselPage 初版）：**
```typescript
// ❌ 不要這樣寫
bottomActionBar={{
  currentStatus,
  submitting,
  onSubmit: handleSubmit,
  onSave: handleSave,
  onClear: handleClear,
  show: !isReadOnly && !approvalStatus.isApproved && !isReviewMode,
  accentColor: DIESEL_CONFIG.iconColor,
  customNotifications: true  // ❌ 錯誤：增加複雜度，不是標準模式
}}
```

**為什麼這是錯的：**
1. **增加複雜度** - 需要頁面自己管理 Toast 組件
2. **不是標準模式** - UreaPage、SepticTankPage 等 Type 2 頁面都**不使用** `customNotifications`
3. **容易出錯** - GasolinePage 後來因此出現通知不顯示的問題

**✅ 正確解法（2025-11-21 從 UreaPage 學到）：**

**不要使用** `customNotifications: true`，讓 SharedPageLayout 通過 `notificationState` 自動顯示通知：

```typescript
// ✅ 正確：不設置 customNotifications
bottomActionBar={{
  currentStatus,
  submitting,
  onSubmit: handleSubmit,
  onSave: handleSave,
  onClear: handleClear,
  show: !isReadOnly && !approvalStatus.isApproved && !isReviewMode,
  accentColor: DIESEL_CONFIG.iconColor
  // ✅ 不要加 customNotifications: true
}}

// ✅ 確保 notificationState 正確傳遞
notificationState={{
  success: submitSuccess || success,
  error: submitError || error,
  clearSuccess: () => {
    clearSubmitSuccess();
    setSuccess(null);
  },
  clearError: () => {
    clearSubmitError();
    setError(null);
  }
}}
```

**工作原理：**
- SharedPageLayout 接收 `notificationState`
- 自動顯示 SuccessModal（藍色/綠色）或錯誤訊息
- 頁面不需要自己渲染 Toast 組件

**參考正確實現：**
- `frontend/src/pages/Category1/UreaPage.tsx` - Type 2 標準通知模式
- `frontend/src/pages/Category1/GasolinePage.tsx` - 已修正為正確模式

---

### 🔴 坑 #3：使用者無法刪除管理員上傳的檔案（⭐ 最重要）

**問題：** 使用者無法刪除管理員在審核模式上傳的佐證檔案

**場景：**
1. 管理員審核時上傳佐證 → `owner_id = admin_id`
2. 使用者編輯並刪除舊佐證 → 標記為待刪除
3. 使用者儲存 → `deleteEvidence(fileId)` → **刪除失敗**
4. Reload → 舊檔案重新出現

**根本原因：**
雙層權限檢查都基於錯誤的假設（檢查檔案所有者而非 entry 所有者）：
1. **API 查詢層**：`files.ts:1099, 1146` 的 `.eq('owner_id', user.id)` 過濾掉管理員上傳的檔案
2. **RLS Policy 層**：舊 Policy 也檢查 `owner_id = auth.uid()`

**影響範圍：** ❌ 所有 TYPE1 和 TYPE2 頁面（8 頁）

**❌ 錯誤解法 #1：使用 adminDeleteEvidence（不推薦）**
```typescript
// 這是舊方案，只在管理員模式有效，無法解決使用者刪除問題
await adminDeleteEvidence(fileId)
```

**✅ 正確解法：RLS Policy + API 程式碼雙修復**

**階段 1：修改 RLS Policy（在 Supabase SQL Editor 執行）**
```sql
DROP POLICY IF EXISTS "users_can_delete_own_files" ON entry_files;

CREATE POLICY "users_can_delete_own_entry_files"
ON entry_files
FOR DELETE
USING (
  -- 管理員可以刪除任何檔案
  auth.uid() IN (SELECT id FROM profiles WHERE role = 'admin')
  OR
  -- 或者：這個檔案的 entry 屬於當前使用者
  EXISTS (
    SELECT 1 FROM energy_entries
    WHERE energy_entries.id = entry_files.entry_id
    AND energy_entries.owner_id = auth.uid()
  )
);
```

**階段 2：移除 API 程式碼的 owner_id 檢查**

API 程式碼在 RLS Policy 之前就先過濾了資料，導致 RLS Policy 根本沒機會執行。

**修改位置 1：`files.ts:1095-1101` (查詢檔案)**
```typescript
// ❌ 修復前
const { data: fileData, error: fetchError } = await supabase
  .from('entry_files')
  .select('file_path, owner_id')
  .eq('id', fileId)
  .eq('owner_id', user.id) // ← 管理員檔案被過濾掉
  .maybeSingle()

// ✅ 修復後
const { data: fileData, error: fetchError } = await supabase
  .from('entry_files')
  .select('file_path, owner_id')
  .eq('id', fileId)
  // 移除 .eq('owner_id', user.id)
  // RLS Policy 會檢查是否有權限讀取此檔案
  .maybeSingle()
```

**修改位置 2：`files.ts:1142-1146` (刪除檔案)**
```typescript
// ❌ 修復前
const { error: dbError } = await supabase
  .from('entry_files')
  .delete()
  .eq('id', fileId)
  .eq('owner_id', user.id)  // ← 管理員檔案無法刪除

// ✅ 修復後
const { error: dbError } = await supabase
  .from('entry_files')
  .delete()
  .eq('id', fileId)
  // 移除 .eq('owner_id', user.id)
  // RLS Policy 會檢查是否有權限刪除此檔案
```

**為什麼需要兩階段修復：**
- **只改 RLS Policy**：API 查詢先過濾 → 返回 null → RLS Policy 無機會執行 ❌
- **只改 API 程式碼**：無 RLS Policy 保護 → 安全漏洞 ❌
- **雙修復**：API 不過濾 → RLS Policy 驗證權限 → 正確運作 ✅

**權限邏輯正確化：**
```
舊邏輯（錯誤）：
  檢查「誰上傳了這個檔案」(owner_id = user_id)
  → 使用者無法刪除管理員上傳的檔案

新邏輯（正確）：
  檢查「這個檔案的 entry 屬於誰」(entry.owner_id = user_id)
  → 使用者可以刪除自己 entry 下的任何檔案（不管是誰上傳的）
```

**修復檔案清單：**
1. Supabase SQL Editor - 執行 RLS Policy 修改
2. `frontend/src/api/files.ts:1099` - 移除查詢時的 `owner_id` 檢查
3. `frontend/src/api/files.ts:1146` - 移除刪除時的 `owner_id` 檢查

**⚠️ 注意：** 這是系統級修復，一次修復後所有頁面（8 頁）都生效，無需逐頁修改

---

### 🎨 坑 #4：審核通過後的唯讀狀態 UI

**問題：** 管理員通過後變唯讀，但點鉛筆可以看群組數據，垃圾桶不能點

**狀態：** 這是**正確的 UI/UX 行為**（不是 bug）

**標準行為：**
- ✅ 審核通過 (`approvalStatus.isApproved = true`) → 唯讀模式
- ✅ 鉛筆圖標可點 → 查看詳細數據（唯讀查看）
- ✅ 垃圾桶圖標禁用 → 不能刪除

**實現方式：**

列表項目的編輯/刪除按鈕根據 `isReadOnly` 狀態控制：

```typescript
// GroupListItem.tsx 或 ListSection 組件
<ActionButtons
  onEdit={() => handleEdit(group.groupId)}
  onDelete={isReadOnly ? undefined : () => handleDelete(group.groupId)}  // ← 唯讀時不傳 onDelete
  editIcon="pencil"
  deleteDisabled={isReadOnly}  // ← 垃圾桶禁用
/>
```

**isReadOnly 判斷邏輯：**
```typescript
const isReadOnly =
  approvalStatus.isApproved ||  // 審核通過
  isReviewMode ||                // 管理員審核模式
  (currentStatus !== 'saved' && currentStatus !== null)  // 已提交
```

**用戶體驗：**
- 審核通過後，使用者可以「查看」但不能「修改」資料
- 鉛筆圖標仍然可點，方便查看詳細資料
- 垃圾桶圖標禁用，避免誤刪

**參考範本：**
- TYPE1: `RefrigerantListSection.tsx` 的 ActionButtons 使用方式
- TYPE2: `GroupListItem.tsx` 的 isReadOnly 邏輯

---

### 🔴 坑 #5：檔案刪除時序錯誤（UreaPage Bug）

**問題：** 刪除舊佐證後點「暫存」，刪除的檔案重新出現

**場景：**
1. 使用者編輯群組 → 刪除舊佐證 → 上傳新佐證
2. 點「變更儲存」→ 新佐證存入 memoryFiles
3. 點「暫存」→ 刪除的檔案重新出現

**根本原因：** 檔案刪除的時序錯誤

**❌ 錯誤寫法（UreaPage 原始問題）：**
```typescript
onSuccess: async (entry_id) => {
  setCurrentEntryId(entry_id)
  await reload()              // ❌ 先重新載入（檔案還在資料庫中）
  await deleteMarkedFiles()   // ❌ 後刪除檔案（太晚了，UI 已經重新顯示檔案）
}
```

**執行流程（錯誤）：**
1. 使用者刪除檔案 → `filesToDelete` 記錄 ID
2. 點「暫存」→ `save()` 提交資料
3. **reload() 從資料庫重新載入** → 檔案還在（因為還沒刪）
4. useEffect 重新分配檔案 → 已刪除的檔案重新出現在 UI
5. deleteMarkedFiles() 執行刪除 → 太晚了，UI 已經顯示檔案

**✅ 正確寫法：**
```typescript
onSuccess: async (entry_id) => {
  setCurrentEntryId(entry_id)
  await deleteMarkedFiles()   // ✅ 先刪除檔案
  await reload()              // ✅ 再重新載入乾淨資料
}
```

**同樣問題出現在管理員保存：**
```typescript
// handleAdminSave 函數中
await deleteMarkedFilesAsAdmin()  // ✅ 先刪除檔案
await reload()                     // ✅ 再重新載入
```

**修復位置：**
- `UreaPage.tsx:615-616` (一般使用者模式)
- `UreaPage.tsx:569-570` (管理員模式)

**記憶口訣：** 「Delete before reload」（先刪除，再載入）

---

### 🔴 坑 #6：編輯模式清空新上傳檔案（UreaPage Bug）

**問題：** 編輯群組後上傳新佐證，點「變更儲存」，新佐證不會出現在資料列表中

**場景：**
1. 編輯群組 → 刪除舊佐證
2. 上傳新佐證 → 更新 `currentEditingGroup.memoryFiles`
3. 點「變更儲存」→ `saveCurrentGroup` 執行
4. **新佐證被清空** → 資料列表中沒有佐證

**根本原因：** saveCurrentGroup 在編輯模式錯誤地清空了 memoryFiles

**❌ 錯誤寫法（UreaPage 原始問題）：**
```typescript
const recordsWithGroupId = validRecords.map(r => ({
  ...r,
  groupId: targetGroupId,
  memoryFiles: isEditMode ? [] : [...memoryFiles]  // ❌ 編輯模式清空，新增模式保留
}))
```

**錯誤邏輯：**
- 開發者想避免重複顯示檔案（memoryFiles + evidenceFiles）
- 但這樣會導致新上傳的檔案被丟棄

**✅ 正確寫法（與 DieselStationarySourcesPage 一致）：**
```typescript
const recordsWithGroupId = validRecords.map(r => ({
  ...r,
  groupId: targetGroupId,
  memoryFiles: [...memoryFiles]  // ✅ 不論編輯或新增都保留
}))
```

**為什麼可以保留：**
- memoryFiles 在 `reload()` 後會轉為 evidenceFiles
- 不會造成重複顯示

**修復位置：** `UreaPage.tsx:335` (saveCurrentGroup 函數)

**記憶口訣：** 「Always preserve memoryFiles in saveCurrentGroup」

---

### 🔴 坑 #7：⚠️ 管理員儲存無通知（已過時，customNotifications 模式特有問題）

**⚠️ 警告：此坑是 `customNotifications: true` 模式特有問題。使用正確的 UreaPage 模式（不設置 customNotifications）則不會遇到此問題。**

**問題：** 管理員介面編輯完點「暫存」，沒有跳出成功通知

**根本原因（customNotifications 模式下）：** `handleAdminSave` 設定了 `setSubmitSuccess`，但沒有顯示對應的 Toast

**✅ 正確解法（2025-11-21）：**
不使用 `customNotifications: true`，讓 SharedPageLayout 自動處理通知。管理員儲存的 `setSuccess()` 會通過 `notificationState` 自動顯示 SuccessModal，不需要手動添加 Toast。

**❌ 錯誤寫法（DieselStationarySourcesPage 原始問題）：**
```typescript
// handleAdminSave 函數
await adminSave({...})
await reload()
setSubmitSuccess('管理員儲存成功')  // ✅ 設定訊息

// 但下方缺少 Toast 顯示
{success && <Toast message={success} type="success" onClose={() => setSuccess(null)} />}
// ❌ 沒有 submitSuccess 的 Toast
```

**✅ 正確寫法：新增 Toast 顯示**
```typescript
{submitError && (
  <Toast
    message={submitError}
    type="error"
    onClose={() => setSubmitError(null)}
  />
)}

{submitSuccess && (
  <Toast
    message={submitSuccess}
    type="success"
    onClose={() => setSubmitSuccess(null)}
  />
)}
```

**UreaPage 額外問題：**
- 原本從 `useMultiRecordSubmit` 解構 `submitError` 和 `submitSuccess`
- 但管理員保存不使用這個 hook
- 需要獨立的 state

**UreaPage 完整修復：**
```typescript
// 1. 新增獨立狀態
const [submitError, setSubmitError] = useState<string | null>(null)
const [submitSuccess, setSubmitSuccess] = useState<string | null>(null)

// 2. 簡化 useMultiRecordSubmit（不解構 error/success）
const {
  submit,
  save,
  submitting: submitLoading
} = useMultiRecordSubmit(pageKey, year)

// 3. handleAdminSave 使用獨立狀態
setSubmitSuccess('✅ 管理員儲存成功！資料已更新')

// 4. 新增 Toast 顯示（同上）
```

**修復位置：**
- `DieselStationarySourcesPage.tsx:813-827` (新增 Toast)
- `UreaPage.tsx:48-50` (新增狀態)
- `UreaPage.tsx:94-98` (簡化 hook)
- `UreaPage.tsx:573` (使用獨立狀態)
- `UreaPage.tsx:861-875` (新增 Toast)

**記憶口訣：** 「Every state needs a Toast」

---

### 🔴 坑 #8：刪除群組不應有確認對話框

**問題：** UreaPage 的 `deleteSavedGroup` 有 `window.confirm('確定要刪除此群組嗎？')`

**狀態：** 這不是標準行為（DieselStationarySourcesPage 沒有）

**❌ 錯誤寫法（UreaPage 原始問題）：**
```typescript
const deleteSavedGroup = (groupId: string) => {
  if (!window.confirm('確定要刪除此群組嗎？')) return  // ❌ 不需要確認對話框

  setSavedGroups(prev => prev.filter(r => r.groupId !== groupId))
  removeRecordMapping(groupId)
  setSuccess('群組已刪除')
}
```

**✅ 正確寫法（與 DieselStationarySourcesPage 一致）：**
```typescript
const deleteSavedGroup = (groupId: string) => {
  setSavedGroups(prev => prev.filter(r => r.groupId !== groupId))
  setSuccess('群組已刪除')
}
```

**為什麼不需要確認：**
- 資料尚未提交到資料庫，只是記憶體中的暫存
- 使用者可以重新新增群組
- 保持 UI 操作流暢

**修復位置：** `UreaPage.tsx:391-395` (deleteSavedGroup 函數)

**記憶口訣：** 「No confirm for memory operations」

---

### 🔴 坑 #9：管理員刪除檔案缺少 onDeleteEvidence 連接點（⭐ Copy-Paste Hell）

**問題：** 管理員刪除使用者的舊佐證後儲存，新舊佐證都出現在頁面中（舊佐證沒有被刪除）

**場景：**
1. 管理員編輯使用者 entry → 刪除舊佐證
2. 上傳新佐證 → 點「儲存」
3. **新舊佐證都顯示**（舊佐證沒有被刪除）

**根本原因：Copy-Paste Hell**

GasolinePage 已經有完整的刪除基礎設施：
- ✅ `handleDeleteEvidence` 函數（Line 313-315）
- ✅ `deleteMarkedFilesAsAdmin` 函數（Line 364-375）
- ✅ `filesToDelete` state（Line 100）
- ✅ 管理員儲存時呼叫 `deleteMarkedFilesAsAdmin()`（Line 506）

**但缺少關鍵連接點：**
- ❌ `MobileEnergyUsageSection` 沒有傳遞 `onDeleteEvidence` prop

**斷鏈流程：**
```
管理員點刪除按鈕（MobileEnergyUsageSection）
  ↓
呼叫 onDeleteEvidence?.(file.id)
  ↓
  ❌ GasolinePage 沒傳這個 prop！
  ↓
  handleDeleteEvidence 從未被呼叫
  ↓
  filesToDelete = []（保持空數組）
  ↓
管理員點儲存 → deleteMarkedFilesAsAdmin() 執行
  ↓
  ❌ 但 filesToDelete 是空的，什麼都沒刪
  ↓
reload() → 舊檔案和新檔案都載入 → 兩個都顯示
```

**❌ 錯誤寫法（GasolinePage 原始問題）：**
```typescript
<MobileEnergyUsageSection
  // ... 其他 props
  onError={(msg) => setSubmitError(msg)}
  // ❌ 缺少 onDeleteEvidence
  iconColor={GASOLINE_CONFIG.iconColor}
/>
```

**✅ 正確寫法（參照 UreaPage Line 813）：**
```typescript
<MobileEnergyUsageSection
  // ... 其他 props
  onError={(msg) => setSubmitError(msg)}
  onDeleteEvidence={handleDeleteEvidence}  // ⬅️ 必須傳這個！
  iconColor={GASOLINE_CONFIG.iconColor}
/>
```

**完整刪除鏈路（修復後）：**
```
管理員點刪除按鈕
  ↓
呼叫 onDeleteEvidence(file.id)  ✅
  ↓
觸發 handleDeleteEvidence(fileId)  ✅
  ↓
setFilesToDelete(prev => [...prev, fileId])  ✅ 記錄 ID
  ↓
管理員點儲存 → deleteMarkedFilesAsAdmin()
  ↓
  ✅ filesToDelete 有內容，呼叫 adminDeleteEvidence
  ↓
reload() → ✅ 只載入新檔案
```

**為什麼會發生：**
這是 **Copy-Paste Hell** 的經典案例：
1. 從 UreaPage 複製程式碼到 GasolinePage
2. 複製了所有函數（`handleDeleteEvidence`, `deleteMarkedFilesAsAdmin`）
3. 複製了所有 state（`filesToDelete`）
4. **但手滑忘了連接 prop** → 所有函數變成死代碼（defined but never called）
5. TypeScript 編譯通過（因為函數都定義了）
6. 只能在運行時發現問題（或逐行對比 UreaPage）

**修復位置：** `GasolinePage.tsx:689` (MobileEnergyUsageSection props)

**記憶口訣：** 「Connect the delete callback or it's dead code」

**參考範本：** `UreaPage.tsx:813`

---

## ✅ Type 2 重構檢查清單（更新版）

複製這個到每次重構前檢查：

```
[ ] 已備份原始檔案
[ ] 已移除 useMultiRecordSubmit import
[ ] 已移除 useRecordFileMapping import
[ ] 已新增 submitEnergyEntry, uploadEvidenceFile imports
[ ] ⭐ 已新增 useThumbnailLoader import
[ ] 已建立 submitData 函數
[ ] ⭐ submitData 中使用 groupsMap 按群組上傳檔案
[ ] ⭐ record_id 使用 groupRecords.map(r => r.id).join(',')
[ ] 已調整 page_key
[ ] 已調整 payload key 名稱
[ ] 已調整 CONFIG 引用（unit, title）
[ ] ⭐ status 使用 'saved' 不是 'draft'
[ ] 已簡化 handleSubmit
[ ] 已簡化 handleSave（保留 adminSave）
[ ] ⭐ 檔案載入邏輯使用 split(',').includes()
[ ] ⭐ 不清除 memoryFiles
[ ] ⭐ 已加入 useThumbnailLoader（在 savedGroups 之後）
[ ] ⭐ 已移除刪除確認提示
[ ] 🔴 reviewSection 不傳 onShowSuccess/onShowError（參考 TYPE1）
[ ] 🔴 bottomActionBar **不要加** customNotifications: true（參照 UreaPage 模式）
[ ] 🔴 notificationState 正確傳遞給 SharedPageLayout
[ ] 🔴 檔案刪除權限問題已修復（RLS Policy + API 程式碼，系統級）
[ ] 🔴 檔案刪除時序正確：deleteMarkedFiles() 在 reload() 之前（坑 #5）
[ ] 🔴 saveCurrentGroup 不清空 memoryFiles（坑 #6）
[ ] 🔴 管理員儲存正確設置 success state，由 SharedPageLayout 自動顯示（坑 #7，使用 UreaPage 模式無此問題）
[ ] 🔴 deleteSavedGroup 沒有 window.confirm（坑 #8）
[ ] 🔴 MobileEnergyUsageSection 傳遞 onDeleteEvidence prop（坑 #9，Copy-Paste Hell）
[ ] 📊 P0: 型別定義使用 AdminSaveParams['files'] 不重複定義
[ ] 📊 P1: 函數已拆分（6 個輔助函數），無超過 50 行的函數
[ ] 📊 P2: 已移除所有 console.log
[ ] 🎨 審核通過後唯讀狀態正確（鉛筆可點、垃圾桶禁用）
[ ] TypeScript 編譯通過
[ ] 手動測試佐證檔案顯示正常
[ ] 更新 PROGRESS.md
```

---

## 🔔 通知行為規範（2025-01-21 新增）

### 核心原則

**與 Type 1 完全一致** - Type 2 頁面遵循相同的通知規範

**靜默操作（Silent Operations）** - 前端內存操作，不跳通知：
- ✅ 點「變更儲存」（更新群組到內存）
- ✅ 點「+新增」（新增群組到內存）
- ✅ 點「刪除群組」（從內存刪除）
- ✅ 點「載入到編輯區」（將群組資料載入編輯區）

**通知操作（Notified Operations）** - 後端提交，必須跳通知：
- 🟢 使用者點「提交」→ 綠色 SuccessModal（提交成功！）
- 🔵 使用者點「暫存」→ 藍色 SuccessModal（儲存成功！）
- 🔵 管理員點「儲存」→ 藍色 SuccessModal（儲存成功！）
- 🟡 使用者點「清除」→ 通知（視情況）

### 實作模式

**步驟 1：群組操作移除通知**

在 `saveCurrentGroup()`, `deleteSavedGroup()`, `loadGroupToEditor()` 中：

```typescript
// ❌ 舊寫法
const saveCurrentGroup = () => {
  setSavedGroups(prev => [...prev, newGroup])
  setSuccess('群組已更新') // ← 刪除這行
}

// ✅ 新寫法
const saveCurrentGroup = () => {
  setSavedGroups(prev => [...prev, newGroup])
  // 不顯示通知（只是前端內存操作）
}
```

**步驟 2：使用標準通知模式（UreaPage 模式）**

**⚠️ 關鍵原則：不要使用 `customNotifications: true`**

```typescript
// ❌ 錯誤：不要這樣寫
bottomActionBar={{
  // ...
  customNotifications: true  // ❌ 增加複雜度，容易出錯
}}

// ✅ 正確：讓 SharedPageLayout 自動處理
bottomActionBar={{
  currentStatus,
  submitting,
  onSubmit: handleSubmit,
  onSave: handleSave,
  onClear: handleClear,
  show: !isReadOnly && !approvalStatus.isApproved && !isReviewMode,
  accentColor: DIESEL_CONFIG.iconColor
  // ✅ 不設置 customNotifications
}}

// ✅ 確保 notificationState 正確傳遞
notificationState={{
  success: submitSuccess || success,
  error: submitError || error,
  clearSuccess: () => {
    clearSubmitSuccess();
    setSuccess(null);
  },
  clearError: () => {
    clearSubmitError();
    setError(null);
  }
}}
```

SharedPageLayout 會自動識別「儲存」/「暫存」關鍵字並顯示對應顏色的 SuccessModal：
- 包含「暫存」或「儲存」→ 藍色 SuccessModal
- 其他訊息 → 綠色 SuccessModal（提交成功）

**步驟 3：管理員儲存確保通知**

管理員模式的 handleSave 必須觸發「儲存成功」：

```typescript
const handleSave = async () => {
  if (isReviewMode && reviewEntryId) {
    // 管理員審核模式
    const failedFiles = await adminSave.save({
      updateData: { unit, amount, payload },
      files: allFiles
    })

    // ✅ 必須設置 success 觸發藍色彈窗
    setSuccess('✅ 儲存成功！資料已更新')
    return
  }

  // 一般暫存模式
  await submitData(true)
}
```

### 已完成頁面

- ✅ **DieselPage** - 2025-01-21
- ✅ **DieselStationarySourcesPage** - 2025-01-21
- ✅ **GasolinePage** - 2025-01-21
- ✅ **WD40Page** - 2025-01-21
- ✅ **SepticTankPage** - 2025-01-21
- ✅ **UreaPage** - 2025-01-21

### 與步驟 8「移除刪除確認提示」的關係

**坑 #8** 已指出刪除確認對話框不是標準行為，現在進一步明確：

- ❌ 舊行為：`window.confirm('確定要刪除此群組嗎？')` + `setSuccess('群組已刪除')`
- ✅ 新行為：直接刪除 + **不顯示任何通知**

**修改範例：**
```typescript
// ❌ 舊寫法（UreaPage 原始問題）
const deleteSavedGroup = (groupId: string) => {
  if (!window.confirm('確定要刪除此群組嗎？')) return
  setSavedGroups(prev => prev.filter(r => r.groupId !== groupId))
  setSuccess('群組已刪除')  // ← 也要刪除
}

// ✅ 新寫法（靜默操作）
const deleteSavedGroup = (groupId: string) => {
  setSavedGroups(prev => prev.filter(r => r.groupId !== groupId))
  // 不顯示通知（只是前端內存操作）
}
```

### 設計理念（Vibe Coding）

**Excel 表格類比：**
- 在 Excel 加一行、刪一行、修改一行 → 不跳通知（只是內存操作）
- 點「發送」或「保存到雲端」→ 跳通知（後端提交）

**系統一致性：**
- 所有 TYPE1 頁面（RefrigerantPage, SF6Page, GeneratorTestPage）遵循此規範
- 所有 TYPE2 頁面（DieselPage, GasolinePage, UreaPage, WD40Page, SepticTankPage, DieselStationarySourcesPage）遵循此規範
- **14 個能源頁面** 通知行為完全統一

---

**下次重構 GasolinePage 時，直接複製這個 SOP！**