# 程式碼品質檢查清單

> 建立日期：2025-01-18
> 用途：統一程式碼品質標準，確保所有頁面重構/新增時都符合相同規範

**重要提醒：每次開始重構或新增功能前，請先查閱此清單！**

---

## 📁 檔案結構標準

### 允許的檔案位置

```
frontend/src/
├── pages/Category1/          # ✅ 能源頁面主檔案
│   ├── XxxPage.tsx           # ✅ 頁面主檔案（如 RefrigerantPage.tsx）
│   ├── components/           # ✅ 該頁面專用的 UI 組件
│   │   ├── XxxInputFields.tsx      # 輸入欄位組件
│   │   ├── XxxListSection.tsx      # 列表顯示組件
│   │   └── ...
│   ├── hooks/                # ✅ 該頁面專用的業務邏輯 hooks
│   │   └── useXxxDeviceManager.ts  # 資料管理 hook
│   └── shared/               # ✅ 多個能源頁面共用的邏輯
│       └── mobile/           # 行動版共用邏輯
│
├── hooks/                    # ✅ 全域共用 hooks
│   ├── useAdminSave.ts       # 管理員儲存邏輯
│   ├── useSubmitGuard.ts     # 提交守衛
│   └── ...
│
├── components/               # ✅ 全域共用 UI 組件
│   └── energy/
│       └── ActionButtons.tsx # 編輯/刪除按鈕
│
├── api/                      # ✅ API 呼叫層
│   ├── v2/                   # 新版 API
│   │   ├── entryAPI.ts       # Entry 相關 API
│   │   └── fileAPI.ts        # 檔案相關 API
│   ├── entries.ts            # 舊版 API（待淘汰）
│   └── files.ts              # 舊版 API（待淘汰）
│
└── utils/                    # ✅ 通用工具函數
    ├── validation.ts         # 驗證邏輯
    ├── formatting.ts         # 格式化函數
    └── calculations.ts       # 計算邏輯
```

### 禁止的檔案類型

- ❌ **`useMultiRecordSubmit.ts`** - 已被 `entryAPI.submitEnergyEntry` 取代
- ❌ **`useRecordFileMapping.ts`** - 已被 `fileAPI.uploadEvidenceFile` 取代
- ❌ **`useEnergyPageNotifications.ts`** - 應改用 `useState` + `withNotification` HOF
- ❌ **任何超過 200 行的檔案** - 需拆分成更小的模組

### 命名規則

| 類型 | 命名範例 | 說明 |
|------|---------|------|
| 頁面主檔案 | `RefrigerantPage.tsx` | PascalCase + Page 後綴 |
| 組件檔案 | `RefrigerantInputFields.tsx` | PascalCase，描述功能 |
| Hook 檔案 | `useRefrigerantDeviceManager.ts` | camelCase，use 前綴 |
| API 檔案 | `entryAPI.ts` | camelCase + API 後綴 |
| 工具檔案 | `validation.ts` | camelCase，功能名稱 |

---

## 🔍 程式碼品質標準（分級檢查）

### P0：Critical（必須修復）

#### 1. 重複程式碼（Duplicated Code）
**檢查方式：**
```bash
# 搜尋相同或高度相似的程式碼區塊
npx --prefix frontend tsc --noEmit 2>&1 | grep "appears to be unused"
```

**標準：**
- ❌ **禁止：** 同一頁面內有 3 個以上相同邏輯的函數
- ❌ **禁止：** 多個頁面複製貼上相同的邏輯
- ✅ **正確：** 提取成 helper function 或 shared hook

**範例：**
```typescript
// ❌ 錯誤：重複的包裝函數
const handleDeleteWrapper = (id: string) => {
  try {
    handleDelete(id)
    setLocalSuccess('刪除成功')
  } catch (error) {
    setLocalError(error instanceof Error ? error.message : '刪除失敗')
  }
}

const handleEditWrapper = (id: string) => {
  try {
    handleEdit(id)
    setLocalSuccess('編輯成功')
  } catch (error) {
    setLocalError(error instanceof Error ? error.message : '編輯失敗')
  }
}

// ✅ 正確：使用 Higher-Order Function
const withNotification = <T extends any[]>(
  fn: (...args: T) => string | undefined
) => (...args: T) => {
  try {
    const message = fn(...args)
    if (message) setLocalSuccess(message)
  } catch (error) {
    setLocalError(error instanceof Error ? error.message : '操作失敗')
  }
}

const handleDelete = withNotification((id: string) => {
  // 刪除邏輯
  return '刪除成功'
})
```

#### 2. 業務邏輯洩漏到前端（Business Logic Leak）
**標準：**
- ❌ **禁止：** 單位轉換在前端（如 `gram → kg`）
- ❌ **禁止：** 計算碳排係數在前端
- ❌ **禁止：** 資料驗證規則在前端（應由後端 schema 驗證）
- ✅ **正確：** 前端只做 UI 狀態管理和顯示

**範例：**
```typescript
// ❌ 錯誤：單位轉換在前端
const totalAmount = devices.reduce((sum, item) => {
  const amountInKg = item.unit === 'gram' ? item.fillAmount / 1000 : item.fillAmount
  return sum + amountInKg
}, 0)

// ✅ 正確：後端處理單位轉換，前端只傳原始值
const totalAmount = devices.reduce((sum, item) => sum + item.fillAmount, 0)
// 後端 API 負責依 unit 欄位轉換
```

#### 3. 過長的型別定義（Long Type Definitions）
**標準：**
- ❌ **禁止：** 超過 5 行的 inline 型別定義
- ✅ **正確：** 重用現有型別，或提取到獨立 interface

**範例：**
```typescript
// ❌ 錯誤：8 行重複定義
const filesToUpload: Array<{
  file: File
  metadata: {
    recordIndex: number
    fileType: 'other'
    recordId?: string
  }
}> = []

// ✅ 正確：重用現有型別（1 行）
import type { AdminSaveParams } from '../../hooks/useAdminSave'
const filesToUpload: AdminSaveParams['files'] = []
```

---

### P1：High Priority（應該修復）

#### 4. 過長的函數（Long Method）
**標準：**
- ❌ **禁止：** 單一函數超過 50 行
- ⚠️ **警告：** 單一函數超過 30 行
- ✅ **正確：** 拆分成多個小函數，每個函數只做一件事

**範例：**
```typescript
// ❌ 錯誤：65 行的 handleSave
const handleSave = async () => {
  // ... 65 行包含檔案收集、刪除、上傳、資料準備等多種邏輯 ...
}

// ✅ 正確：拆分成多個函數
const collectFilesForAdminSave = () => {
  // 只負責收集檔案
}

const deleteOldFiles = async (fileIds: string[]) => {
  // 只負責刪除檔案
}

const handleSave = async () => {
  const { filesToUpload, filesToDelete } = collectFilesForAdminSave()
  await deleteOldFiles(filesToDelete)
  // ...
}
```

#### 5. 包裝函數地獄（Wrapper Hell）
**標準：**
- ❌ **禁止：** 3 個以上結構相同的包裝函數
- ✅ **正確：** 使用 Higher-Order Function 或 decorator pattern

**範例：** 見 P0-1 範例

---

### P2：Medium Priority（可以優化）

#### 6. UI 狀態污染（UI State Pollution）
**標準：**
- ⚠️ **警告：** 主頁面組件有超過 10 個 `useState`
- ✅ **建議：** UI 專用狀態（如 `expandedGroups`）移到子組件

**範例：**
```typescript
// ⚠️ 警告：主頁面有太多 UI 狀態
const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({})
const [showImageModal, setShowImageModal] = useState(false)
const [selectedImage, setSelectedImage] = useState<string>('')
// ... 還有 7 個以上 useState ...

// ✅ 建議：移到子組件
// 在 ListSection 組件內部管理 expandedGroups
```

#### 7. 魔術數字/字串（Magic Numbers/Strings）
**標準：**
- ⚠️ **警告：** 重複出現的數字/字串沒有命名
- ✅ **建議：** 提取成常數

**範例：**
```typescript
// ⚠️ 警告
if (devices.length > 0) {
  const total = devices.reduce((sum, d) => sum + d.amount * 0.001, 0)
}

// ✅ 建議
const KG_TO_TON = 0.001
const total = devices.reduce((sum, d) => sum + d.amount * KG_TO_TON, 0)
```

---

## 🔄 程式碼提取與重用標準

### 何時應該提取（Extraction Criteria）

#### 規則 1：三次原則（Rule of Three）
**觸發條件：** 同樣的程式碼模式出現 3 次以上

**範例：**
```typescript
// ❌ 發現 3 個頁面都有類似的 submitData 函數
// RefrigerantPage.tsx
const submitData = async (isDraft: boolean) => { /* ... */ }

// SF6Page.tsx
const submitData = async (isDraft: boolean) => { /* ... */ }

// GeneratorTestPage.tsx
const submitData = async (isDraft: boolean) => { /* ... */ }

// ✅ 提取到 src/hooks/useEnergySubmit.ts
export const useEnergySubmit = (pageKey: string, year: string) => {
  const submitData = async (isDraft: boolean, payload: any) => { /* ... */ }
  return { submitData }
}
```

#### 規則 2：跨頁面使用（Cross-Page Usage）
**觸發條件：** 某個邏輯被 2 個以上頁面使用

**提取目標：**
```
2-3 個頁面使用 → src/pages/Category1/shared/
4+ 個頁面使用   → src/hooks/ 或 src/utils/
```

**範例：**
```typescript
// ❌ 多個頁面都有檔案過濾邏輯
const recordFiles = files.filter(f => f.record_id === recordId)

// ✅ 提取到 src/utils/fileHelpers.ts
export const getRecordFiles = (
  files: EvidenceFile[],
  recordId: string
) => files.filter(f => f.record_id === recordId)
```

#### 規則 3：高複雜度邏輯（Complex Logic）
**觸發條件：** 單一邏輯區塊超過 20 行，且可獨立測試

**提取目標：** `src/utils/` 或該頁面的 `hooks/`

**範例：**
```typescript
// ❌ 頁面內部有 30 行的計算邏輯
const calculateTotalFillAmount = (devices: RefrigerantDevice[]) => {
  return devices.reduce((sum, item) => {
    const amountInKg = item.unit === 'gram' ? item.fillAmount / 1000 : item.fillAmount
    return sum + amountInKg
  }, 0)
}

// ✅ 提取到 src/utils/calculations.ts
export const calculateWeightInKg = (
  amount: number,
  unit: 'kg' | 'gram'
) => unit === 'gram' ? amount / 1000 : amount
```

---

### 實際範例：useThumbnailLoader

**背景：** 2025-01-20 發現 9 個頁面有重複的縮圖載入邏輯

**觸發條件分析：**
- ✅ 規則 1（Rule of Three）：9 頁 >> 3 頁門檻
- ✅ 規則 2（Cross-Page Usage）：9 頁 → 應放 `src/hooks/`
- ✅ 規則 3（Complex Logic）：SF6Page 版本 45 行，包含批次載入、錯誤處理
- 🔴 P0 Critical：Duplicated Code（9 頁重複）

**Before（9 頁重複，共 135 行）：**

```typescript
// RefrigerantPage.tsx, SF6Page.tsx, DieselPage.tsx... 等 9 頁
const [thumbnails, setThumbnails] = useState<Record<string, string>>({})

useEffect(() => {
  savedDevices.forEach(async (device) => {
    const evidenceFile = device.evidenceFiles?.[0]
    if (evidenceFile && evidenceFile.mime_type.startsWith('image/') && !thumbnails[evidenceFile.id]) {
      try {
        const url = await getFileUrl(evidenceFile.file_path)
        setThumbnails(prev => ({ ...prev, [evidenceFile.id]: url }))
      } catch {
        // Silently ignore
      }
    }
  })
}, [savedDevices, thumbnails])  // ❌ RefrigerantPage 有依賴陣列 bug
```

**After（1 個 hook，50 行）：**

```typescript
// src/hooks/useThumbnailLoader.ts（新建）
export function useThumbnailLoader<T>({
  records,
  fileExtractor,
  enabled = true
}: UseThumbnailLoaderOptions<T>): Record<string, string> {
  const [thumbnails, setThumbnails] = useState<Record<string, string>>({})

  useEffect(() => {
    if (!enabled) return

    const loadThumbnails = async () => {
      const tasks: Array<{ fileId: string; loadFn: () => Promise<string> }> = []

      // 收集所有需要載入的圖片檔案
      records.forEach((record) => {
        const files = fileExtractor(record)
        files.forEach((file) => {
          if (file.mime_type.startsWith('image/') && !thumbnails[file.id]) {
            tasks.push({
              fileId: file.id,
              loadFn: () => getFileUrl(file.file_path)
            })
          }
        })
      })

      if (tasks.length === 0) return

      // 批次執行（一次最多 3 個並發，避免 API 轟炸）
      const BATCH_SIZE = 3
      for (let i = 0; i < tasks.length; i += BATCH_SIZE) {
        const batch = tasks.slice(i, i + BATCH_SIZE)
        const results = await Promise.allSettled(batch.map(task => task.loadFn()))

        results.forEach((result, index) => {
          if (result.status === 'fulfilled') {
            setThumbnails(prev => ({ ...prev, [batch[index].fileId]: result.value }))
          }
        })
      }
    }

    loadThumbnails()
  }, [records, enabled])  // ✅ 正確依賴陣列，不含 thumbnails

  return thumbnails
}

// 使用範例（9 頁統一）
const thumbnails = useThumbnailLoader({
  records: savedDevices,  // 或 savedGroups（Type 2）
  fileExtractor: (device) => device.evidenceFiles || []
})
```

**成果：**
- ✅ 程式碼減少：135 行 → 50 行（-85 行，63% 減少）
- ✅ 修復 bug：RefrigerantPage 的 `[savedDevices, thumbnails]` 依賴陣列錯誤
- ✅ 統一邏輯：所有頁面使用相同的批次載入邏輯（BATCH_SIZE = 3）
- ✅ 泛型設計：支援 Type 1（devices）和 Type 2（groups）
- ✅ 提升效能：批次載入避免 API 轟炸

**位置：** `frontend/src/hooks/useThumbnailLoader.ts`

**受益頁面（9 頁）：**
- Type 1: RefrigerantPage, SF6Page, GeneratorTestPage
- Type 2: DieselPage, GasolinePage, UreaPage, WD40Page, SepticTankPage, DieselStationarySourcesPage

---

### 提取檢查清單

每次重構時，問自己以下問題：

```
[ ] 這段程式碼在其他頁面出現過嗎？（≥3 次 → 必須提取）
[ ] 這段邏輯會被其他頁面用到嗎？（跨頁面 → 提取到 shared/）
[ ] 這段邏輯超過 20 行且可獨立測試嗎？（高複雜度 → 提取到 utils/）
[ ] 提取後會讓主頁面更簡潔嗎？（可讀性 → 建議提取）
[ ] 提取後的函數有清楚的單一職責嗎？（單一職責原則 → 才提取）
```

### 提取後的檔案結構範例

```
src/
├── utils/
│   ├── calculations.ts       # ✅ 通用計算函數
│   │   ├── calculateWeightInKg()
│   │   └── calculateCarbonEmission()
│   ├── fileHelpers.ts        # ✅ 檔案處理工具
│   │   ├── getRecordFiles()
│   │   └── validateFileType()
│   └── validation.ts         # ✅ 驗證邏輯
│       └── validateDeviceData()
│
├── hooks/
│   ├── useEnergySubmit.ts    # ✅ 4+ 頁面共用的提交邏輯
│   └── useFileUpload.ts      # ✅ 通用檔案上傳邏輯
│
└── pages/Category1/
    └── shared/
        └── helpers.ts        # ✅ 2-3 個能源頁面共用的小工具
```

---

## 🎨 UI/UX 標準

### 刪除操作確認原則

**標準：**
- ❌ **禁止：** 列表項目的刪除操作出現確認彈窗（例如：`window.confirm()`）
- ✅ **正確：** 直接刪除，並顯示成功訊息（使用 Toast 或通知系統）
- ✅ **正確：** 如果需要防止誤刪，應使用「撤銷」功能而非確認彈窗

**理由：**
- 用戶已經點擊垃圾桶圖標，意圖明確
- 重複確認降低操作效率
- 列表項目通常可以重新新增，風險較低

**範例：**
```typescript
// ❌ 錯誤：出現確認彈窗
const deleteSavedGroup = (groupId: string) => {
  if (!window.confirm('確定要刪除此群組嗎？')) return
  setSavedGroups(prev => prev.filter(r => r.groupId !== groupId))
  setSuccess('群組已刪除')
}

// ✅ 正確：直接刪除 + 成功訊息
const deleteSavedGroup = (groupId: string) => {
  setSavedGroups(prev => prev.filter(r => r.groupId !== groupId))
  setSuccess('群組已刪除')
}
```

**例外情況（需要確認彈窗）：**
- ✅ 清空所有資料（如「清空」按鈕）
- ✅ 刪除後無法復原的重要資料（如已提交的 entry）
- ✅ 刪除操作會影響其他使用者或系統的資料

---

## 🎨 UI/UX 標準

### 縮圖佔位符標準（Thumbnail Placeholder Standard）

**標準：** 所有能源頁面的縮圖顯示必須使用統一佔位符

**必須使用：**
```typescript
import { THUMBNAIL_PLACEHOLDER_SVG, THUMBNAIL_BACKGROUND, THUMBNAIL_BORDER } from '../../../utils/energy/thumbnailConstants'

// ✅ 正確：永久容器 + 統一佔位符
<div style={{
  background: THUMBNAIL_BACKGROUND,  // #EBEDF0
  border: THUMBNAIL_BORDER,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center'
}}>
  {thumbnail ? (
    <img src={thumbnail} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
  ) : (
    THUMBNAIL_PLACEHOLDER_SVG
  )}
</div>
```

**禁止：**
```typescript
// ❌ 錯誤：條件渲染（導致 layout shift）
{thumbnail && <div><img src={thumbnail} /></div>}

// ❌ 錯誤：白色背景或 emoji
<div style={{ background: '#FFF' }} />
<span>📷</span>
```

**效果：**
- ✅ 載入過程無 layout shift（容器永遠存在）
- ✅ 視覺一致（所有頁面相同）
- ✅ 程式碼不重複（SVG 只定義一次）

**檢查方式：**
```bash
# 搜尋條件渲染縮圖（可能有問題）
grep -r "{thumbnail &&" frontend/src/pages/Category1/

# 搜尋白色背景佔位符（需更新）
grep -r "background.*#FFF" frontend/src/pages/Category1/ | grep -i thumbnail
```

**參考：**
- 定義檔案：`frontend/src/utils/energy/thumbnailConstants.tsx`
- Type 1 範例：`pages/Category1/components/RefrigerantListSection.tsx`
- Type 2 範例：`components/energy/GroupListItem.tsx`
- SOP文件：`docs/type1-sop.md` 步驟 8、`docs/type2-sop.md` 步驟 9

---

## ✅ 驗證指令

### 1. TypeScript 編譯檢查
```bash
npx --prefix frontend tsc --noEmit
```
**必須：** 無任何錯誤

### 2. 檢查特定頁面的問題
```bash
npx --prefix frontend tsc --noEmit 2>&1 | grep -A 5 "RefrigerantPage"
```

### 3. 搜尋禁止的檔案
```bash
# 檢查是否還有舊版 hooks
find frontend/src -name "useMultiRecordSubmit.ts" -o -name "useRecordFileMapping.ts"
```
**必須：** 無任何結果

### 4. 搜尋重複程式碼模式
```bash
# 搜尋包裝函數模式（可能的重複）
grep -r "Wrapper = " frontend/src/pages/Category1/
```

### 5. 執行測試（如果有）
```bash
npm --prefix frontend test
```

---

## 📝 快速檢查清單（每次重構必檢）

複製此清單到你的 commit message 或 PR description：

```markdown
### 檔案結構
- [ ] 沒有禁止的檔案類型（useMultiRecordSubmit, useRecordFileMapping 等）
- [ ] 檔案放在正確的位置（components/, hooks/, utils/）
- [ ] 命名符合規則（PascalCase for components, camelCase for utils）

### P0：Critical
- [ ] 無重複程式碼（3+ 次相同邏輯已提取）
- [ ] 無業務邏輯洩漏（無單位轉換、無碳排計算）
- [ ] 無過長型別定義（≤5 行，或重用現有型別）

### P1：High Priority
- [ ] 無過長函數（每個函數 ≤50 行）
- [ ] 無包裝函數地獄（已改用 HOF 或 decorator）

### P2：Medium Priority
- [ ] UI 狀態已整理（主組件 ≤10 個 useState）
- [ ] 無魔術數字/字串（重複值已提取成常數）

### 程式碼提取
- [ ] 已檢查三次原則（3+ 次出現的程式碼已提取）
- [ ] 已檢查跨頁面使用（共用邏輯已移到 shared/ 或 hooks/）
- [ ] 已檢查高複雜度邏輯（>20 行邏輯已提取到 utils/）

### UI/UX
- [ ] 列表項目刪除操作無確認彈窗（直接刪除 + 成功訊息）
- [ ] 重要操作保留確認彈窗（清空全部、刪除已提交 entry）
- [ ] 縮圖佔位符使用統一標準（THUMBNAIL_PLACEHOLDER_SVG + #EBEDF0）
- [ ] 縮圖容器永久顯示（無條件渲染 `{thumbnail && ...}`）

### 驗證
- [ ] TypeScript 編譯通過（`npx --prefix frontend tsc --noEmit`）
- [ ] 無禁止檔案殘留（`find` 指令檢查通過）
- [ ] 測試通過（如果有）
```

---

## 🎯 優先順序總結

| 級別 | 說明 | 修復時機 |
|------|------|---------|
| **P0** | 會導致維護困難、錯誤、技術債的問題 | **必須立即修復** |
| **P1** | 影響可讀性和可維護性的問題 | **應該修復** |
| **P2** | 可以改善程式碼品質的優化 | **建議修復** |

---

**記住：寫程式碼時，先讓它能動，再讓它正確，最後讓它快速。品質檢查幫助我們達到「正確」！**
