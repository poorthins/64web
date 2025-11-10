# 專案結構規則

## 📂 目錄結構（最終版）

```
frontend/src/
├── api/                      ← API 呼叫（按功能分檔）
│   ├── entries.ts            ← Entry 相關 API
│   ├── files.ts              ← 檔案相關 API
│   └── users.ts              ← 使用者相關 API
│
├── components/               ← 元件（按功能域分類）
│   ├── common/               ← 全專案通用元件
│   │   ├── ErrorBoundary.tsx
│   │   ├── LoadingPage.tsx
│   │   ├── Toast.tsx
│   │   └── ...
│   │
│   ├── energy/               ← 能源頁面專用元件
│   │   ├── FileTypeIcon.tsx
│   │   ├── RecordInputForm.tsx
│   │   ├── GroupList.tsx
│   │   └── ...
│   │
│   ├── dashboard/            ← 儀表板專用元件
│   ├── inventory/            ← 庫存盤查專用元件
│   └── admin/                ← 管理員專用元件
│
├── hooks/                    ← Hooks（按功能域分類）
│   ├── common/               ← 通用 hooks
│   │   ├── useRole.ts
│   │   ├── useEditPermissions.ts
│   │   └── ...
│   │
│   ├── energy/               ← 能源頁面專用 hooks
│   │   ├── useEnergyData.ts
│   │   ├── useMultiRecordSubmit.ts
│   │   ├── useRecordFileMapping.ts
│   │   └── ...
│   │
│   └── ... (其他根層級 hooks，逐步移到子資料夾)
│
├── utils/                    ← 工具函數（按功能域分類）
│   ├── common/               ← 通用工具
│   │   ├── designTokens.ts
│   │   ├── idGenerator.ts
│   │   └── ...
│   │
│   └── energy/               ← 能源頁面專用工具
│       ├── fileTypeDetector.ts
│       ├── recordHelpers.ts
│       └── dataPreparation.ts
│
├── layouts/                  ← 頁面 Layout
│   ├── SharedPageLayout.tsx  ← 能源頁面共用 Layout
│   ├── AdminLayout.tsx
│   └── ...
│
├── pages/                    ← 頁面（按類別分類）
│   ├── Category1/            ← 類別 1 的能源頁面
│   │   ├── DieselPage.tsx
│   │   ├── GasolinePage.tsx
│   │   └── ...
│   │
│   ├── admin/                ← 管理員頁面
│   ├── dashboard/            ← 儀表板頁面
│   └── inventory/            ← 庫存盤查頁面
│
├── services/                 ← 業務邏輯服務
│   ├── authService.ts
│   ├── documentHandler.ts
│   └── ...
│
├── types/                    ← 型別定義
├── contexts/                 ← React Context
└── lib/                      ← 第三方庫配置
    ├── supabaseClient.ts
    └── apiClient.ts
```

---

## 🎯 放置規則（決策樹）

### 問題 1：這個檔案要放哪裡？

#### 如果是 **元件 (Component)**：

```
是全專案通用的嗎？
├─ YES → components/common/
└─ NO → 是哪個功能域的？
    ├─ 能源頁面 → components/energy/
    ├─ 儀表板 → components/dashboard/
    ├─ 庫存盤查 → components/inventory/
    └─ 管理員 → components/admin/
```

**範例**：
- `LoadingPage.tsx` → `components/common/` （所有頁面都用）
- `RecordInputForm.tsx` → `components/energy/` （只有能源頁面用）

---

#### 如果是 **Hook**：

```
是全專案通用的嗎？
├─ YES → hooks/common/
└─ NO → 是哪個功能域的？
    ├─ 能源頁面 → hooks/energy/
    ├─ 儀表板 → hooks/dashboard/
    └─ 管理員 → hooks/admin/
```

**範例**：
- `useRole.ts` → `hooks/common/` （所有頁面都用）
- `useEnergyData.ts` → `hooks/energy/` （只有能源頁面用）

---

#### 如果是 **工具函數 (Utils)**：

```
是全專案通用的嗎？
├─ YES → utils/common/
└─ NO → 是哪個功能域的？
    ├─ 能源頁面 → utils/energy/
    ├─ 儀表板 → utils/dashboard/
    └─ 其他 → utils/[功能域]/
```

**範例**：
- `idGenerator.ts` → `utils/common/` （所有地方都用）
- `fileTypeDetector.ts` → `utils/energy/` （只有能源頁面用）

---

#### 如果是 **API 函數**：

```
按資料類型分檔（不分功能域）
├─ Entry 相關 → api/entries.ts
├─ 檔案相關 → api/files.ts
├─ 使用者相關 → api/users.ts
└─ 其他 → api/[資料類型].ts
```

**理由**：API 是底層服務，不應該按頁面分類。

---

## ✅ Hooks 品質認證清單

**說明**：以下 hooks 已通過 DieselPage（1559 行，多群組、多記錄）實戰測試，**程式碼品質好、可以安心重用**。

### 🟢 能源頁面核心（必用）

| Hook | 位置 | 品質 | 說明 |
|------|------|------|------|
| useEnergyData | hooks/ | ✅ 可用 | 載入能源資料（entry、檔案、權限） |
| useMultiRecordSubmit | hooks/ | ✅ 可用 | 多筆記錄提交（含檔案上傳） |
| useEnergyClear | hooks/ | ✅ 可用 | 清除草稿、刪除檔案 |
| useRecordFileMapping | hooks/ | ✅ 可用 | 記錄-檔案映射（防檔案錯亂） |

### 🟢 權限檢查（安全必備）

| Hook | 位置 | 品質 | 說明 |
|------|------|------|------|
| useReviewMode | hooks/ | ✅ 可用 | 審核模式檢測 |
| useRole | hooks/ | ✅ 可用 | 取得使用者角色（admin/editor/viewer） |
| useEditPermissions | hooks/ | ✅ 可用 | 編輯權限檢查 |
| useApprovalStatus | hooks/ | ✅ 可用 | 審核狀態（pending/approved/rejected） |
| useFrontendStatus | hooks/ | ✅ 可用 | 前端狀態管理（editing/idle/saving） |

### 🟢 工具類（提升 UX）

| Hook | 位置 | 品質 | 說明 |
|------|------|------|------|
| useSubmitGuard | hooks/ | ✅ 可用 | 提交防抖（防連點） |
| useGhostFileCleaner | hooks/ | ✅ 可用 | 清理幽靈檔案 |

### 🟢 管理員功能

| Hook | 位置 | 品質 | 說明 |
|------|------|------|------|
| useSubmissions | hooks/ | ✅ 可用 | 審核提交清單 |
| useAdminSave | hooks/ | ✅ 可用 | 管理員審核儲存 |

---

## ❌ 不建議使用的 Hooks

| Hook | 位置 | 品質 | 問題 |
|------|------|------|------|
| useFileHandler | hooks/ | ❌ 有問題 | 1. 設計給單一實體，不支援多群組<br>2. refresh() 未實作（回傳空陣列）<br>3. associate() 未實作（只有 console.log） |

**替代方案**：使用 `useRecordFileMapping` + 手動 `useState<MemoryFile[]>`

---

## ⚠️ 未測試 Hooks（使用前需評估）

| Hook | 位置 | 狀態 | 說明 |
|------|------|------|------|
| useStatusManager | hooks/ | ⚠️ 未測試 | 狀態管理，可能與 useFrontendStatus 重複 |
| useStatusBanner | hooks/ | ⚠️ 未測試 | 狀態橫幅，確認是否與現有 UI 重複 |
| useEnergyPage | hooks/energy/ | ⚠️ 未測試 | 單筆記錄頁面整合，確認頁面類型 |
| useEnergyPageLoader | hooks/energy/ | ⚠️ 未測試 | 頁面載入器 |
| useEnergySubmit | hooks/energy/ | ⚠️ 未測試 | 單筆記錄提交 |
| useEnergyReview | hooks/energy/ | ⚠️ 未測試 | 審核功能 |
| useEvidenceFiles | hooks/ | ⚠️ 未測試 | 佐證檔案管理 |
| useFileEditor | hooks/ | ⚠️ 未測試 | 檔案編輯器 |
| useReloadWithFileSync | hooks/ | ⚠️ 未測試 | 檔案同步重載 |
| useCurrentUserPermissions | hooks/ | ⚠️ 未測試 | 當前使用者權限 |
| useUserProfile | hooks/ | ⚠️ 未測試 | 使用者資料 |

---

## 📋 Hooks 分類清單（目標位置）

### ✅ 已分類（應該移到子資料夾）

#### hooks/common/ （通用 hooks）
```
✅ useRole.ts                    - 取得使用者角色
✅ useEditPermissions.ts         - 編輯權限檢查
✅ useFrontendStatus.ts          - 前端狀態管理
✅ useApprovalStatus.ts          - 審核狀態
✅ useReviewMode.ts              - 審核模式檢測
✅ useSubmitGuard.ts             - 提交防抖
✅ useGhostFileCleaner.ts        - 清理幽靈檔案
✅ useCurrentUserPermissions.ts  - 當前使用者權限
✅ useUserProfile.ts             - 使用者資料
```

#### hooks/energy/ （能源頁面專用）
```
✅ useEnergyData.ts              - 載入能源資料
✅ useEnergyPage.ts              - 整頁邏輯整合（單筆記錄）
✅ useEnergyPageLoader.ts        - 頁面載入器
✅ useEnergySubmit.ts            - 單筆記錄提交
✅ useEnergyReview.ts            - 審核功能
✅ useEnergyClear.ts             - 清除資料
✅ useMultiRecordSubmit.ts       - 多筆記錄提交
✅ useRecordFileMapping.ts       - 記錄-檔案映射
✅ useEvidenceFiles.ts           - 佐證檔案管理
✅ useFileHandler.ts             - 檔案處理（單一實體）
✅ useFileEditor.ts              - 檔案編輯器
✅ useReloadWithFileSync.ts      - 檔案同步重載
```

#### hooks/admin/ （管理員專用）
```
✅ useAdminSave.ts               - 管理員儲存
✅ useSubmissions.ts             - 審核提交（從 pages/admin/hooks/ 移過來）
```

#### hooks/other/ （其他）
```
✅ useStatusManager.ts           - 狀態管理（可能通用，待評估）
✅ useStatusBanner.ts            - 狀態橫幅（可能通用，待評估）
```

---

## 🚀 執行計劃

### 階段 1：建立子資料夾（5 分鐘）
```bash
mkdir frontend/src/hooks/common
mkdir frontend/src/hooks/energy
mkdir frontend/src/hooks/admin
mkdir frontend/src/utils/common
mkdir frontend/src/utils/energy
mkdir frontend/src/components/energy
```

### 階段 2：移動 hooks（20 分鐘）
**按照上面的分類清單，一個一個移動**

範例：
```bash
# 移動通用 hooks
mv frontend/src/hooks/useRole.ts frontend/src/hooks/common/
mv frontend/src/hooks/useEditPermissions.ts frontend/src/hooks/common/

# 移動能源 hooks
mv frontend/src/hooks/useEnergyData.ts frontend/src/hooks/energy/
mv frontend/src/hooks/useMultiRecordSubmit.ts frontend/src/hooks/energy/
```

### 階段 3：更新 import 路徑（10 分鐘）
**使用 find + sed 批次更新**

範例：
```bash
# 更新 useRole 的 import
find frontend/src -name "*.tsx" -o -name "*.ts" | xargs sed -i "s|from '../../hooks/useRole'|from '../../hooks/common/useRole'|g"
```

### 階段 4：測試（5 分鐘）
```bash
npm test
```

---

## 📖 使用規則

### 規則 1：一個功能域一個資料夾
❌ **不要**：所有元件丟在 `components/` 根目錄
✅ **要**：`components/energy/`, `components/dashboard/`

### 規則 2：通用的東西才放 common
❌ **不要**：只有 1-2 個地方用就放 common
✅ **要**：至少 3+ 個功能域使用才放 common

### 規則 3：import 路徑要清楚
❌ **不要**：`import { useEnergyData } from '../../hooks/useEnergyData'`
✅ **要**：`import { useEnergyData } from '../../hooks/energy/useEnergyData'`

### 規則 4：新功能先問自己
```
1. 這是哪個功能域的？（能源/儀表板/庫存/管理員/通用）
2. 是元件/Hook/工具函數？
3. 根據規則放到對應資料夾
```

---

## 🎓 範例：新增一個頁面

假設你要新增「天然氣頁面」：

### 步驟 1：確認功能域
- 天然氣 = 能源頁面 → 功能域是 `energy`

### 步驟 2：建立頁面
```
frontend/src/pages/Category1/NaturalGasPage.tsx
```

### 步驟 3：需要的元件
- 如果能重用 `components/energy/` 的元件 → 直接用
- 如果需要新元件 → 放到 `components/energy/`

### 步驟 4：需要的 hooks
- 如果能重用 `hooks/energy/` 的 hooks → 直接用
- 如果需要新 hook → 放到 `hooks/energy/`

### 步驟 5：需要的工具函數
- 如果能重用 `utils/energy/` 的函數 → 直接用
- 如果需要新函數 → 放到 `utils/energy/`

---

## ⚠️ 注意事項

### 不要過度分類
❌ **不要**：建立太深的巢狀資料夾
```
components/energy/forms/inputs/text/  ← 太深了！
```

✅ **要**：保持 2-3 層深度
```
components/energy/RecordInputForm.tsx  ← 剛好
```

### 不要過早抽象
❌ **不要**：只用 1 次就提取成共用元件
✅ **要**：至少用 2-3 次再考慮提取

### 檔案命名要清楚
❌ **不要**：`utils.ts`, `helpers.ts`, `common.ts`（太籠統）
✅ **要**：`fileTypeDetector.ts`, `recordHelpers.ts`（功能明確）

---

## 📊 重構前 vs 重構後

### 重構前（混亂）
```
frontend/src/
├── hooks/
│   ├── useRole.ts
│   ├── useEnergyData.ts
│   ├── useAdminSave.ts
│   └── ... (23 個 hooks 全混在一起)
│
└── components/
    ├── ErrorBoundary.tsx
    ├── LoadingPage.tsx
    └── ... (48 個元件全混在一起)
```
**問題**：找不到東西，不知道哪些可以重用

### 重構後（清晰）
```
frontend/src/
├── hooks/
│   ├── common/          ← 9 個通用 hooks
│   ├── energy/          ← 12 個能源專用 hooks
│   └── admin/           ← 2 個管理員專用 hooks
│
└── components/
    ├── common/          ← 通用元件
    ├── energy/          ← 能源專用元件
    ├── dashboard/       ← 儀表板專用元件
    └── admin/           ← 管理員專用元件
```
**好處**：一眼看出哪些能重用，新頁面知道從哪裡拿

---

## 🔧 大型頁面重構模式（Page-Specific Modules Pattern）

**適用場景**：當單一頁面超過 800 行時，使用此模式進行模組化重構。

### 為什麼要用這個模式？

**問題**：
- 單一頁面檔案過大（1000+ 行）
- 維護困難、難以理解
- 新增功能時容易出錯

**解決方案**：
- 建立頁面專用的模組資料夾
- 將型別、常數、工具函數、元件分離
- 保持頁面主檔案簡潔（~700 行以內）

---

### 📂 資料夾結構範例

以 `DieselPage.tsx` 為例，重構後的結構：

```
pages/Category1/
├── DieselPage.tsx                    ← 主頁面（697 行）
└── diesel/                           ← 頁面專用模組資料夾
    ├── dieselTypes.ts                ← 型別定義（27 行）
    ├── dieselConstants.ts            ← 常數定義（38 行）
    ├── dieselUtils.ts                ← 工具函數（71 行）
    └── components/                   ← 頁面專用元件
        ├── DieselUsageSection.tsx    ← 使用數據區塊（400 行）
        ├── DieselGroupListSection.tsx ← 資料列表區塊（100 行）
        └── ImageLightbox.tsx         ← 圖片預覽（54 行）
```

**重構成果**：
- 原始：1051 行 → 重構後：697 行（主頁面）
- 減少：354 行（約 34%）
- 模組化：6 個獨立模組

---

### 🎯 重構步驟（SOP）

#### Step 1: 提取型別定義
```typescript
// pages/Category1/diesel/dieselTypes.ts
export interface DieselRecord {
  id: string
  date: string
  quantity: number
  evidenceFiles?: EvidenceFile[]
  memoryFiles?: MemoryFile[]
  groupId?: string
}

export interface CurrentEditingGroup {
  groupId: string | null
  records: DieselRecord[]
  memoryFiles: MemoryFile[]
}
```

**提取原則**：
- ✅ 頁面專用的 interface/type
- ✅ 複雜的型別定義
- ❌ 不要提取全專案共用的型別（應放在 `types/`）

---

#### Step 2: 提取常數
```typescript
// pages/Category1/diesel/dieselConstants.ts
export const LAYOUT_CONSTANTS = {
  CONTAINER_WIDTH: 1102,
  CONTAINER_MIN_HEIGHT: 555,
  EDITOR_UPLOAD_WIDTH: 358,
  // ...
} as const
```

**提取原則**：
- ✅ 固定的數值（尺寸、限制、配置）
- ✅ 魔術數字（magic numbers）
- ❌ 不要提取會改變的值（應用 useState）

---

#### Step 3: 提取工具函數
```typescript
// pages/Category1/diesel/dieselUtils.ts
export const createEmptyRecords = (count: number): DieselRecord[] => {
  return Array.from({ length: count }, () => ({
    id: generateRecordId(),
    date: '',
    quantity: 0,
    // ...
  }))
}

export const prepareSubmissionData = (dieselData: DieselRecord[]) => {
  // 純邏輯處理...
  return { totalQuantity, cleanedDieselData, deduplicatedRecordData }
}
```

**提取原則**：
- ✅ 純函數（無副作用）
- ✅ 可獨立測試的邏輯
- ✅ 複雜的資料處理
- ❌ 不要提取依賴 React hooks 的函數（應放在元件內）

---

#### Step 4: 提取大型 UI 區塊為元件

**識別候選區塊**：
- 超過 100 行的 JSX
- 有明確功能邊界（如「使用數據編輯區」、「資料列表」）
- 有獨立的狀態管理

**範例 1：使用數據區塊**
```typescript
// pages/Category1/diesel/components/DieselUsageSection.tsx
export interface DieselUsageSectionProps {
  isReadOnly: boolean
  submitting: boolean
  currentEditingGroup: CurrentEditingGroup
  setCurrentEditingGroup: (value: CurrentEditingGroup | ((prev: CurrentEditingGroup) => CurrentEditingGroup)) => void
  addRecordToCurrentGroup: () => void
  updateCurrentGroupRecord: (id: string, field: 'date' | 'quantity', value: any) => void
  // ...其他 props
}

export function DieselUsageSection(props: DieselUsageSectionProps) {
  // 自包含的邏輯（如檔案上傳處理）
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // ...處理邏輯
  }

  return (
    <div>
      {/* 完整的 UI 結構 */}
    </div>
  )
}
```

**提取原則**：
- ✅ 元件應該自包含（self-contained）
- ✅ 透過 props 傳遞資料和回調函數
- ✅ 內部可以有自己的狀態（如 `fileInputRef`）
- ❌ 不要過度拆分（避免 props drilling 地獄）

---

#### Step 5: 更新主頁面
```typescript
// pages/Category1/DieselPage.tsx
import { DieselRecord, CurrentEditingGroup, EvidenceGroup } from './diesel/dieselTypes'
import { LAYOUT_CONSTANTS } from './diesel/dieselConstants'
import { createEmptyRecords, prepareSubmissionData } from './diesel/dieselUtils'
import { DieselUsageSection } from './diesel/components/DieselUsageSection'
import { DieselGroupListSection } from './diesel/components/DieselGroupListSection'
import { ImageLightbox } from './diesel/components/ImageLightbox'

export default function DieselPage() {
  // 狀態管理（保持在主頁面）
  const [currentEditingGroup, setCurrentEditingGroup] = useState<CurrentEditingGroup>({
    groupId: null,
    records: createEmptyRecords(),
    memoryFiles: []
  })

  // 業務邏輯函數（保持在主頁面）
  const addRecordToCurrentGroup = () => { /* ... */ }
  const saveCurrentGroup = () => { /* ... */ }

  return (
    <SharedPageLayout>
      {/* 使用數據區塊 - 從 ~296 行縮減到 16 行 */}
      <DieselUsageSection
        isReadOnly={isReadOnly}
        submitting={submitting}
        currentEditingGroup={currentEditingGroup}
        setCurrentEditingGroup={setCurrentEditingGroup}
        addRecordToCurrentGroup={addRecordToCurrentGroup}
        onPreviewImage={(src) => setLightboxSrc(src)}
        onError={(msg) => setError(msg)}
      />

      {/* 資料列表區塊 - 從 ~58 行縮減到 9 行 */}
      <DieselGroupListSection
        savedGroups={savedGroups}
        thumbnails={thumbnails}
        onEditGroup={loadGroupToEditor}
        onDeleteGroup={deleteSavedGroup}
        onPreviewImage={(src) => setLightboxSrc(src)}
      />

      {/* Lightbox - 從 ~22 行縮減到 5 行 */}
      <ImageLightbox
        src={lightboxSrc}
        onClose={() => setLightboxSrc(null)}
      />
    </SharedPageLayout>
  )
}
```

---

### ✅ 重構檢查清單

**Before（重構前）**：
- [ ] 確認頁面功能正常
- [ ] 確認所有測試通過
- [ ] 備份當前版本（git commit）

**During（重構中）**：
- [ ] Step 1: 提取型別 → 更新 import → 測試
- [ ] Step 2: 提取常數 → 更新 import → 測試
- [ ] Step 3: 提取工具函數 → 更新 import → 測試
- [ ] Step 4: 提取 UI 元件 → 替換 JSX → 測試
- [ ] Step 5: 清理未使用的程式碼

**After（重構後）**：
- [ ] 主頁面行數 < 800 行 ✓
- [ ] 所有測試通過 ✓
- [ ] import 路徑清晰 ✓
- [ ] 沒有程式碼重複 ✓

---

### 📊 重構前後對比

#### 重構前（DieselPage.tsx：1051 行）
```typescript
// 所有東西都塞在一個檔案
export default function DieselPage() {
  // 50+ 行的型別定義
  interface DieselRecord { /* ... */ }
  interface CurrentEditingGroup { /* ... */ }

  // 40+ 行的常數定義
  const LAYOUT_CONSTANTS = { /* ... */ }

  // 70+ 行的工具函數
  const createEmptyRecords = () => { /* ... */ }
  const prepareSubmissionData = () => { /* ... */ }

  // 300+ 行的 JSX（使用數據區塊）
  return (
    <div>
      {/* 佐證上傳 */}
      {/* 表單輸入 */}
      {/* 按鈕 */}
    </div>
  )
}
```

**問題**：
- 1051 行太長，難以維護
- 型別、常數、邏輯、UI 混在一起
- 新增功能時容易衝突

---

#### 重構後（DieselPage.tsx：705 行）
```typescript
// 清晰的 import
import { DieselRecord, CurrentEditingGroup } from './diesel/dieselTypes'
import { LAYOUT_CONSTANTS } from './diesel/dieselConstants'
import { createEmptyRecords, prepareSubmissionData } from './diesel/dieselUtils'
import { DieselUsageSection } from './diesel/components/DieselUsageSection'

export default function DieselPage() {
  // 只保留狀態管理和業務邏輯
  const [currentEditingGroup, setCurrentEditingGroup] = useState(/* ... */)

  const addRecordToCurrentGroup = () => { /* ... */ }
  const saveCurrentGroup = () => { /* ... */ }

  // 簡潔的 JSX
  return (
    <SharedPageLayout>
      <DieselUsageSection {...props} />
      <DieselGroupListSection {...props} />
      <ImageLightbox {...props} />
    </SharedPageLayout>
  )
}
```

**好處**：
- ✅ 主頁面只有 705 行，容易理解
- ✅ 型別、常數、工具函數分離，易於重用
- ✅ UI 區塊模組化，容易測試
- ✅ 新增功能時修改範圍小

---

### ⚠️ 注意事項

#### 1. 不要過度拆分
❌ **錯誤範例**：拆成 20 個小檔案
```
diesel/
├── types/
│   ├── DieselRecord.ts
│   ├── CurrentEditingGroup.ts
│   └── EvidenceGroup.ts  ← 太碎了！
├── constants/
│   ├── layoutConstants.ts
│   └── validationConstants.ts  ← 太碎了！
```

✅ **正確範例**：合併相關的定義
```
diesel/
├── dieselTypes.ts       ← 所有型別在一起
├── dieselConstants.ts   ← 所有常數在一起
```

---

#### 2. 狀態管理保持在主頁面
❌ **不要**：將核心狀態移到子元件
```typescript
// DieselUsageSection.tsx (錯誤)
export function DieselUsageSection() {
  const [currentEditingGroup, setCurrentEditingGroup] = useState(/* ... */)  // ❌ 不要這樣
  // ...
}
```

✅ **要**：狀態在主頁面，透過 props 傳遞
```typescript
// DieselPage.tsx (正確)
export default function DieselPage() {
  const [currentEditingGroup, setCurrentEditingGroup] = useState(/* ... */)  // ✅ 狀態在這裡

  return <DieselUsageSection currentEditingGroup={currentEditingGroup} setCurrentEditingGroup={setCurrentEditingGroup} />
}
```

---

#### 3. 元件應該自包含
✅ **正確範例**：元件內部處理檔案上傳邏輯
```typescript
export function DieselUsageSection(props) {
  const fileInputRef = useRef<HTMLInputElement>(null)  // ✅ 內部狀態

  const handleFileInputChange = (e) => {
    // ✅ 內部邏輯處理
    props.onError('檔案太大')
  }

  return <input ref={fileInputRef} onChange={handleFileInputChange} />
}
```

---

### 📝 應用到其他頁面

當你要重構其他能源頁面（如 GasolinePage、NaturalGasPage）時：

1. **檢查行數**：超過 800 行？使用此模式
2. **建立資料夾**：`pages/Category1/[pageName]/`
3. **照著 SOP 走**：Step 1 → Step 2 → Step 3 → Step 4 → Step 5
4. **每個 Step 都跑測試**：確保沒破壞功能
5. **最終檢查**：行數 < 800、測試通過

---

**重構範例**：DieselPage（已完成）
- 原始行數：1051 行
- 重構後行數：697 行
- 減少比例：34%
- 測試通過：122/123 ✅（1 個 StatusModal 測試失敗，與此頁面無關）

---

**最後更新**：2025-11-10
**維護者**：Linus Mode
