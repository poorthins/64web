# Type 3 頁面 SOP

---

## 🆕 新增 Type 3 頁面指南

> **適用場景：** 從零開始建立新的 Type 3 能源頁面（例如：乙炔、天然氣）
>
> **不適用：** 重構現有頁面 → 請看下方「🔧 重構 Type 3 頁面」章節

---

## ⭐ 全局檔案功能（Global Files）

> **新功能（2025-01-25）：** Type 3 架構現已支援全局檔案，用於額外的全局佐證（如滅火器的檢修表）

### 什麼是全局檔案？

- **規格佐證：** 每個規格一張照片（1:1）
- **使用佐證：** 每份購買單據可對應多筆記錄（1:多）
- **全局佐證：** 整個頁面只有一份的特殊佐證（例如：年度檢修表）

### 如何使用？

在 `useMobileType3Page` 中傳入 `globalFiles` 配置：

```typescript
const page = useMobileType3Page({
  config: FIRE_EXTINGUISHER_CONFIG,
  dataFieldName: 'fireExtinguisherData',
  useSpecManager: useFireExtinguisherSpecManager,
  mode: 'weight',
  parseSpecName: ...,
  // ⭐ 全局檔案配置
  globalFiles: [{
    key: 'inspectionReport',           // 唯一標識
    fileType: 'annual_evidence',       // 後端檔案類型
    required: false,                   // 是否必填
    label: '消防安全設備檢修表'        // 顯示標籤
  }]
})

// ⭐ 使用全局檔案
const inspectionReport = page.globalFilesState?.inspectionReport || null
const setInspectionReport = page.updateGlobalFile?.('inspectionReport') || (() => {})
```

### 自動處理的功能

✅ 自動載入已上傳的全局檔案
✅ 自動上傳新的全局檔案（隨著提交/暫存）
✅ 自動刪除舊的全局檔案
✅ 避免狀態衝突（記憶體檔案 vs 後端檔案）
✅ 零破壞性（其他 Type 3 頁面完全不受影響）

---

### 📋 7 題配置問卷（5 分鐘填寫）

填寫以下問卷，所有程式碼自動生成：

#### Q1. 中文標題
```
這個能源頁面的中文名稱？
範例：WD-40、液化石油氣、乙炔

▶ 您的答案：_______________
```

#### Q2. 英文標題
```
這個能源頁面的英文名稱？
範例：WD-40、Liquefied Petroleum Gas、Acetylene

▶ 您的答案：_______________
```

#### Q3. 說明文字
```
使用者操作指引（顯示在頁面頂部）
範例：
「請先依據購買品項建立清單；再上傳購買單據，選擇日期、品項、填寫數量，
點選「+新增數據到此群組」，讓一份佐證可對應多張購買單據/多筆品項；
同一份佐證的所有數據新增完成後，請點選「+新增群組」，以填寫下一份佐證的數據。」

▶ 您的答案：
_____________________________________________________
_____________________________________________________
_____________________________________________________
```

#### Q4. 大寫英文字母
```
類別標籤（顯示在頁面右上角的字母）
範例：W（WD-40）、L（LPG）、A（Acetylene）

▶ 您的答案：_______________（單一大寫字母）
```

#### Q5. 大寫英文字母與左邊邊界距離
```
字母位置（單位：px，預設值可用 609）
範例：609、646、746

💡 提示：先用預設值 609，頁面跑起來後再用開發者工具微調

▶ 您的答案：_______________ px
```

#### Q6. 本頁顏色色票
```
主題色（十六進位色碼）
範例：
- #068A8F（WD-40 青色）
- #2DB14C（LPG 綠色）
- #FF5722（橘紅色）

💡 提示：可到 https://coolors.co 選色

▶ 您的答案：#_______________
```

#### Q7. 規格設定填寫框第一個文字框內容
```
規格名稱欄位的標籤文字（顯示在輸入框上方）
範例：
- 品項名稱（WD-40）
- 品項清單（LPG）
- 規格型號
- 產品名稱

▶ 您的答案：_______________
```

#### Q8. 規格設定填寫框第二個文字框內容
```
規格佐證欄位的標籤文字（顯示在檔案上傳區上方）
範例：
- 品項佐證(產品照片/規格書)（WD-40）
- 重量證明（LPG）
- 規格說明文件
- 產品證明

▶ 您的答案：_______________
```

---

### 🤖 自動生成的技術配置

根據上述問卷答案，系統會自動生成以下技術細節（**不需手動填寫**）：

| 自動生成項目 | 規則 | 範例（Q1=乙炔, Q2=Acetylene） |
|------------|------|------------------------------|
| `pageKey` | Q2 小寫化 | `acetylene` |
| 檔案名稱 | Q2 首字母大寫 + Page.tsx | `AcetylenePage.tsx` |
| 元件名稱 | Q2 首字母大寫 + 功能名 | `AcetyleneSpecInputFields` |
| Hook 名稱 | use + Q2 首字母大寫 + SpecManager | `useAcetyleneSpecManager` |
| 路由 | /energy/ + pageKey | `/energy/acetylene` |
| Payload key | pageKey + Data | `acetyleneData` |
| **使用數據表格** | **固定 3 欄** | **日期 \| 品項 \| 購買數量** |

💡 **重要：** 使用數據表格結構固定為「日期 | 品項 | 購買數量」，品項會自動引入您在規格設定中建立的清單。

---

### 🚀 建立流程（15 分鐘）

#### 步驟 1：複製範本（3 分鐘）

選擇最接近的範本頁面：
- **標準模式** → 複製 `WD40Page.tsx`
- **需要特殊說明** → 複製 `LPGPage.tsx`

```bash
# 範例：建立乙炔頁面
cp frontend/src/pages/Category1/WD40Page.tsx \
   frontend/src/pages/Category1/AcetylenePage.tsx
```

---

#### 步驟 2：全域搜尋替換（5 分鐘）

使用編輯器的「搜尋替換」功能（注意大小寫）：

**2.1 替換檔名相關（3 處）**
```
WD40 → Acetylene     （大寫，影響元件名稱）
wd40 → acetylene     （小寫，影響 pageKey）
WD-40 → 乙炔          （顯示文字）
```

**2.2 修改 CONFIG 物件（手動修改 1 處）**

找到檔案頂部的 `WD40_CONFIG`，改為：

```typescript
const ACETYLENE_CONFIG = {
  pageKey: 'acetylene',                        // Q2 小寫
  unit: 'KG',                                   // 固定欄位（非表格標題）
  category: '移動式能源',                      // 固定值
  title: '乙炔',                               // Q1
  subtitle: 'Acetylene',                       // Q2
  iconColor: '#FF5722',                        // Q6
  categoryPosition: { left: 609, top: 39 },   // Q5 + 固定 top
  instructionText: `[Q3 的完整答案]`           // Q3（可用模板字串保留換行）
}
```

**2.3 修改 Payload key（1 處）**

找到 `extraPayload: { wd40Data: ... }`，改為：

```typescript
extraPayload: { acetyleneData: payload }
//              ^^^^^^^^^^^^^^^ pageKey + Data
```

---

#### 步驟 3：複製並修改 Spec Manager（3 分鐘）

```bash
# 3.1 複製 Hook
cp frontend/src/pages/Category1/hooks/useWD40SpecManager.ts \
   frontend/src/pages/Category1/hooks/useAcetyleneSpecManager.ts

# 3.2 在新檔案中搜尋替換
WD40 → Acetylene
wd40 → acetylene
```

---

#### 步驟 4：複製並修改 UI 元件（4 分鐘）

**4.1 規格輸入元件**
```bash
cp frontend/src/pages/Category1/components/WD40/WD40SpecInputFields.tsx \
   frontend/src/pages/Category1/components/Acetylene/AcetyleneSpecInputFields.tsx

# 全域替換 + 手動修改標籤
WD40 → Acetylene
# 手動修改：
# - label="品項名稱" → label="[Q7 答案]"
# - label="品項佐證" → label="[Q8 答案]"
```

**4.2 規格列表元件**
```bash
cp frontend/src/pages/Category1/components/WD40/WD40SpecListSection.tsx \
   frontend/src/pages/Category1/components/Acetylene/AcetyleneSpecListSection.tsx

# 全域替換 + 手動修改標題
WD40 → Acetylene
# 手動修改：標題中的「品項」改為 Q7 的答案（去掉「名稱」兩字）
```

**4.3 使用記錄輸入元件**
```bash
cp frontend/src/pages/Category1/components/WD40/WD40UsageInputFields.tsx \
   frontend/src/pages/Category1/components/Acetylene/AcetyleneUsageInputFields.tsx

# 全域替換（表格標籤通常不需修改）
WD40 → Acetylene
# 注意：使用數據表格固定為「日期 | 品項 | 購買數量」，通常不需修改
```

**4.4 檔案圖示大小規範（2025-01-26 統一標準）⭐ UI 標準**

**確認所有 UI 元件中的 FileTypeIcon 使用統一大小：**

```typescript
import { FileTypeIcon } from '../../../components/energy/FileTypeIcon'

// ✅ 正確：統一使用 size={36}
<FileTypeIcon fileType={fileType} size={36} />

// ❌ 錯誤：使用其他大小（24、32 等）
<FileTypeIcon fileType={fileType} size={24} />
<FileTypeIcon fileType={fileType} size={32} />
```

**檢查位置：**
- ✅ SpecListSection（規格列表）
- ✅ UsageInputFields（使用記錄輸入區）
- ✅ FileDropzone（上傳框）

**標準：**
- ✅ 所有 `FileTypeIcon` 必須使用 `size={36}`
- ✅ 確保 PDF（紅色）、Excel（綠色）、Word（藍色）文字標籤清晰可見
- ✅ 全局視覺一致性

---

#### 步驟 5：更新路由（1 分鐘）

在 `frontend/src/App.tsx` 中新增：

```typescript
import AcetylenePage from './pages/Category1/AcetylenePage'

// 在 <Routes> 區塊中新增
<Route path="/energy/acetylene" element={<AcetylenePage />} />
```

---

#### 步驟 6：測試驗證（4 分鐘）

```bash
# 1. TypeScript 編譯檢查（1 分鐘）
npx --prefix frontend tsc --noEmit

# 2. 開啟頁面測試（1 分鐘）
# 前往 http://localhost:5173/energy/acetylene

# 3. 功能測試（2 分鐘）
# ✅ 新增規格
# ✅ 新增使用記錄（確認「日期 | 品項 | 購買數量」三欄顯示正確）
# ✅ 上傳佐證
# ✅ 提交/暫存
```

---

### ✅ 檢查清單

完成後，請確認以下 17 項：

#### 基礎顯示（5 項）
- [ ] 頁面可正常開啟（無白畫面或錯誤）
- [ ] 中文標題顯示正確（Q1）
- [ ] 英文副標題顯示正確（Q2）
- [ ] 主題色正確（Q6，頁面重點元素的顏色）
- [ ] 說明文字顯示正確（Q3）

#### 規格管理功能（6 項）
- [ ] 規格名稱欄位標籤正確（Q7）
- [ ] 規格佐證欄位標籤正確（Q8）
- [ ] 可以新增規格
- [ ] 可以編輯規格
- [ ] 可以刪除規格
- [ ] 規格名稱重複時會提示錯誤

#### 使用記錄功能（4 項）
- [ ] 使用數據表格顯示「日期 | 品項 | 購買數量」三欄
- [ ] 沒有規格時，無法新增使用記錄（會提示「請先建立品項」）
- [ ] 可以選擇規格（下拉選單）
- [ ] 可以新增多筆使用記錄到同一群組

#### 提交功能（2 項）
- [ ] 暫存功能正常（顯示「暫存成功」）
- [ ] 提交功能正常（顯示「提交成功」）

---

### 🎯 完整範例：新增「乙炔頁面」

**問卷答案：**
```
Q1: 乙炔
Q2: Acetylene
Q3: 請先建立乙炔規格清單；再上傳購買單據，選擇日期、規格、填寫數量，
    點選「+新增數據到此群組」，讓一份佐證可對應多張購買單據/多筆規格；
    同一份佐證的所有數據新增完成後，請點選「+新增群組」，以填寫下一份佐證的數據。
Q4: A
Q5: 609
Q6: #FF5722
Q7: 規格型號
Q8: 規格證明
```

**執行搜尋替換：**
```
WD40 → Acetylene
wd40 → acetylene
WD-40 → 乙炔
品項名稱 → 規格型號
品項佐證 → 規格證明
```

**CONFIG 物件：**
```typescript
const ACETYLENE_CONFIG = {
  pageKey: 'acetylene',
  unit: 'KG',
  category: '移動式能源',
  title: '乙炔',
  subtitle: 'Acetylene',
  iconColor: '#FF5722',
  categoryPosition: { left: 609, top: 39 },
  instructionText: '請先建立乙炔規格清單；再上傳購買單據...'
}
```

**預期結果：**
- ✅ 路由：`/energy/acetylene`
- ✅ 頁面標題：乙炔 / Acetylene
- ✅ 規格欄位：規格型號、規格證明
- ✅ 使用數據表格：日期 | 品項 | 購買數量
- ✅ 主題色：橘紅色

---

### 💡 常見問題（FAQ）

#### Q: 我不知道什麼顏色好看？
A: 複製現有頁面的顏色，或去 [coolors.co](https://coolors.co) 選擇。建議避免太亮或太暗的顏色。

#### Q: categoryPosition 的 left 值怎麼確定？
A: 先用預設值 `609`，等頁面跑起來後：
   1. 按 F12 開啟開發者工具
   2. 選取右上角的字母元素
   3. 在 Styles 面板調整 `left` 值
   4. 找到合適位置後，複製數值到 CONFIG

#### Q: 規格名稱和佐證的標籤要寫什麼？
A: 根據你的業務需求：
   - 如果是「產品」概念 → 「產品名稱」+「產品證明」
   - 如果是「規格」概念 → 「規格型號」+「規格書」
   - 如果是「品項」概念 → 「品項名稱」+「品項佐證」

#### Q: 使用數據表格可以改成其他欄位嗎？
A: **不行**。Type 3 頁面固定為「日期 | 品項 | 購買數量」三欄結構。品項會自動引入您在規格設定中建立的清單。如果需要不同的表格結構，請考慮使用 Type 2 或其他類型的頁面。

#### Q: 搜尋替換會不會改錯東西？
A: 建議使用「逐一確認」模式（Find & Replace 的「Replace」按鈕，不要用「Replace All」），這樣可以看到每一處修改。

---

## 🔧 重構 Type 3 頁面

> 基於 WD40Page + LPGPage 重構經驗建立的標準操作流程

**建立日期：** 2025-01-24
**Pilot 頁面：** WD40Page ✅ 完成、LPGPage ✅ 完成
**適用頁面：** AcetylenePage, NaturalGasPage, LPGPage, WD40Page（5 個 Type 3 頁面）

---

## 🎯 Type 3 特徵

- **業務邏輯：** 規格（Specs）+ 使用記錄（Usage Records）— Dual List 結構
- **資料結構：**
  - Specs：一筆佐證 → 一筆規格（1:1 關係，單一 `record_id`）
  - Usage Records：一筆佐證 → 多筆使用記錄（1:多 關係，comma-separated `record_ids`）
- **複雜度：** 🔴 高
- **關鍵欄位：**
  - `specs[].id` — 規格唯一識別碼
  - `usageRecords[].specId` — 關聯到哪個規格
  - `usageRecords[].groupId` — 群組識別碼（繼承 Type 2）

---

## 📋 重構步驟（60 分鐘完成）

### 步驟 1：移除舊 imports（2 分鐘）

**移除：**
```typescript
import { useMultiRecordSubmit } from '../../hooks/useMultiRecordSubmit'
import { useRecordFileMapping } from '../../hooks/useRecordFileMapping'
import { prepareSubmissionData } from './common/mobileEnergyUtils'
```

**新增：**
```typescript
import { useType3Helpers } from '../../hooks/useType3Helpers'
import { submitEnergyEntry } from '../../api/v2/entryAPI'
```

---

### 步驟 2：新增 useType3Helpers（3 分鐘）

**在 useWD40SpecManager（或其他 spec manager）附近新增：**

```typescript
// ✅ Type 3 輔助函數
const type3Helpers = useType3Helpers<
  { id: string; name: string; memoryFiles?: MemoryFile[] },
  MobileEnergyRecord
>(pageKey, year)
```

**useType3Helpers 提供的函數：**
- `buildGroupsMap()` — 建立群組映射（繼承 Type 2）
- `uploadGroupFiles()` — 上傳使用記錄檔案（comma-separated IDs）
- `uploadSpecFiles()` — **🆕 Type 3 特有** 上傳規格檔案（單一 ID）
- `validateSpecsExist()` — **🆕 Type 3 特有** 驗證至少有一個規格
- `validateUsageRecordsHaveSpec()` — **🆕 Type 3 特有** 驗證使用記錄有對應規格
- `syncEditingGroupChanges()` — 同步編輯區到 savedGroups
- `deleteMarkedFiles()` — 刪除已標記的檔案
- `collectAdminFilesToUpload()` — 收集管理員檔案
- `deleteMarkedFilesAsAdmin()` — 管理員刪除檔案

---

### 步驟 3：移除舊 hook 初始化（2 分鐘）

**刪除：**
```typescript
const { submit, save, ... } = useMultiRecordSubmit(pageKey, year)
const { getFileMappingForPayload, getRecordFiles, ... } = useRecordFileMapping(...)
```

**新增本地狀態（取代舊 hook）：**
```typescript
const [submitError, setSubmitError] = useState<string | null>(null)
const [submitSuccess, setSubmitSuccess] = useState<string | null>(null)
```

---

### 步驟 4：統一提交邏輯（15 分鐘）⭐ 核心步驟

**刪除重複的 `handleSubmit` 和 `handleSave`，改為統一函數：**

```typescript
/**
 * 統一提交/暫存函數
 * @param status - 'submitted' | 'saved'
 */
const submitData = async (status: 'submitted' | 'saved') => {
  try {
    // ⭐ Type 3 驗證（規格必須存在 + 使用記錄必須有 specId）
    type3Helpers.validateSpecsExist(savedSpecs)
    type3Helpers.validateUsageRecordsHaveSpec(savedGroups)

    // ⭐ 準備 payload（Dual structure）
    const groupsMap = type3Helpers.buildGroupsMap(savedGroups)

    const payload = {
      records: Array.from(groupsMap.values()).flat().map(r => ({
        date: r.date,
        quantity: r.quantity,
        specId: r.specId  // ⭐ Type 3 關鍵欄位
      })),
      specs: savedSpecs.map(s => ({
        id: s.id,
        name: s.name
      }))
    }

    // ⭐ 計算總量
    const totalQuantity = payload.records.reduce((sum, r) => sum + (r.quantity || 0), 0)

    // ⭐ 提交 entry
    const { entry_id } = await submitEnergyEntry({
      pageKey,
      year,
      unit: WD40_CONFIG.unit,  // 或 LPG_CONFIG.unit
      monthly: { '1': totalQuantity },
      extraPayload: {
        wd40Data: payload  // 或 lpgData，視頁面而定
      },
      status
    })

    // ⭐ Dual file upload（Type 3 關鍵）
    await type3Helpers.uploadSpecFiles(savedSpecs, entry_id)        // 規格佐證（單一 ID）
    await type3Helpers.uploadGroupFiles(groupsMap, entry_id)        // 使用佐證（comma-separated IDs）

    // ⭐ 刪除標記的檔案
    await type3Helpers.deleteMarkedFiles(filesToDelete, setFilesToDelete)

    setCurrentEntryId(entry_id)
    setSubmitSuccess(status === 'submitted' ? '提交成功！' : '暫存成功！')
    setSubmitError(null)

    return { success: true }
  } catch (err: any) {
    setSubmitError(err.message || '提交失敗')
    setSubmitSuccess(null)
    return { success: false }
  }
}

// ⭐ 簡化的提交/暫存函數
const handleSubmit = () => executeSubmit(() => submitData('submitted'))
const handleSave = () => executeSubmit(() => submitData('saved'))
```

---

### 步驟 5：簡化檔案載入邏輯（10 分鐘）

**刪除舊的檔案映射邏輯：**
```typescript
// ❌ 刪除
const { getRecordFiles } = useRecordFileMapping(...)
const specFiles = getRecordFiles(spec.id, validFiles)
```

**改用直接過濾：**

```typescript
// ✅ 規格檔案（單一 ID）
setSavedSpecs(prev => prev.map(spec => ({
  ...spec,
  evidenceFiles: validFiles.filter(f => f.record_id === spec.id)
})))

// ✅ 使用記錄檔案（comma-separated IDs）
setSavedGroups(prev => prev.map(record => {
  const recordFiles = validFiles.filter(f => {
    const ids = f.record_id?.split(',') || []
    return ids.includes(record.id)
  })
  return {
    ...record,
    evidenceFiles: recordFiles
  }
}))
```

---

### 步驟 6：修復 Admin 儲存邏輯（8 分鐘）

**找到 `handleAdminSave`，修改為：**

```typescript
const handleAdminSave = async () => {
  try {
    // ⭐ 收集規格檔案 + 使用記錄檔案
    const specFiles = savedSpecs.flatMap(spec =>
      (spec.memoryFiles || [])
        .filter(mf => mf.file && mf.file.size > 0)
        .map(mf => ({
          file: mf.file,
          metadata: {
            recordId: spec.id,
            allRecordIds: [spec.id]  // 規格：單一 ID
          }
        }))
    )

    const usageFiles = type3Helpers.collectAdminFilesToUpload(savedGroups)

    const allFiles = [...specFiles, ...usageFiles]

    // ⭐ 準備 payload
    const groupsMap = type3Helpers.buildGroupsMap(savedGroups)
    const payload = {
      records: Array.from(groupsMap.values()).flat().map(r => ({
        date: r.date,
        quantity: r.quantity,
        specId: r.specId
      })),
      specs: savedSpecs.map(s => ({ id: s.id, name: s.name }))
    }

    const totalQuantity = payload.records.reduce((sum, r) => sum + (r.quantity || 0), 0)

    await adminSave({
      pageKey,
      year,
      status: targetStatus,
      unit: WD40_CONFIG.unit,
      monthly: { '1': totalQuantity },
      extraPayload: { wd40Data: payload },
      files: allFiles,
      targetUserId: reviewUserId
    })

    setAdminSuccess('管理員儲存成功')
  } catch (err: any) {
    setError(err.message)
  }
}
```

---

### 步驟 7：清理不必要的代碼（10 分鐘）

**移除：**
1. ❌ 所有 `prepareSubmissionData` 調用
2. ❌ 不必要的 `useMemo` 別名（例如 `const wd40Data = useMemo(() => savedGroups, [savedGroups])`）
3. ❌ `getFileMappingForPayload` 相關邏輯
4. ❌ 未使用的 import

---

### 步驟 8：驗證重構（10 分鐘）

**執行檢查：**

```bash
# 1. TypeScript 編譯
npx --prefix frontend tsc --noEmit

# 2. 跑測試
npm --prefix frontend test

# 3. 確認舊 Hooks 已移除
grep -r "useMultiRecordSubmit\|useRecordFileMapping" frontend/src/pages/Category1/WD40Page.tsx
# 應該回傳：0 結果

# 4. 確認行數
wc -l frontend/src/pages/Category1/WD40Page.tsx
# 目標：≤ 760 行（原 780 行）
```

---

## 🎯 驗收標準

### ✅ 必須通過（P0）
- [ ] 移除所有舊 Hooks（`useMultiRecordSubmit`, `useRecordFileMapping`, `prepareSubmissionData`）
- [ ] 使用 `useType3Helpers`
- [ ] 使用 `submitEnergyEntry` v2 API
- [ ] TypeScript 編譯零錯誤
- [ ] 所有測試通過（包含 useWD40SpecManager.test.ts, useType3Helpers.test.ts）

### ✅ 建議通過（P1）
- [ ] 行數減少 3-5%
- [ ] 統一提交/暫存邏輯為單一 `submitData` 函數
- [ ] 移除不必要的 useMemo/useCallback

### ✅ 可選（P2）
- [ ] 提取更多共用組件
- [ ] 改善錯誤訊息

---

## 💡 常見陷阱 & 解決方案

### 陷阱 1：檔案 record_id 格式混淆

**問題：** 規格檔案用單一 ID，使用記錄檔案用 comma-separated IDs

**解決：**
```typescript
// ✅ 規格檔案
record_id: spec.id  // "spec-001"

// ✅ 使用記錄檔案
record_id: groupRecords.map(r => r.id).join(',')  // "record-001,record-002,record-003"
```

---

### 陷阱 2：驗證邏輯缺失

**問題：** 提交時沒有檢查規格是否存在、使用記錄是否有 specId

**解決：**
```typescript
// ✅ 必須加上驗證
type3Helpers.validateSpecsExist(savedSpecs)
type3Helpers.validateUsageRecordsHaveSpec(savedGroups)
```

---

### 陷阱 3：檔案載入時 split 錯誤

**問題：** `record_id` 可能是 `null` 或空字串

**解決：**
```typescript
// ✅ 安全的 split
const ids = f.record_id?.split(',') || []
return ids.includes(record.id)
```

---

### 陷阱 4：Dual payload 結構遺漏

**問題：** Type 3 需要同時傳 `specs` 和 `records`

**解決：**
```typescript
// ✅ 完整的 payload
const payload = {
  specs: savedSpecs.map(s => ({ id: s.id, name: s.name })),
  records: usageRecords.map(r => ({
    date: r.date,
    quantity: r.quantity,
    specId: r.specId  // ⭐ 關鍵欄位
  }))
}
```

---

## 📊 重構成效

### WD40Page
- **前：** 780 行，使用舊 Hooks
- **後：** 753 行，使用 Type 3 新架構
- **減少：** 27 行（3.5%）

### LPGPage
- **前：** 776 行，使用舊 Hooks
- **後：** 749 行，使用 Type 3 新架構
- **減少：** 27 行（3.5%）

### 測試覆蓋
- **useWD40SpecManager.test.ts：** 9 個測試 ✅
- **useType3Helpers.test.ts：** 11 個測試 ✅
- **總計：** 20 個測試全過

---

## 🔄 Type 3 vs Type 2 差異

| 項目 | Type 2 | Type 3 |
|------|--------|--------|
| **資料結構** | 單一列表（usageRecords） | Dual 列表（specs + usageRecords） |
| **檔案上傳** | `uploadGroupFiles` | `uploadSpecFiles` + `uploadGroupFiles` |
| **record_id 格式** | comma-separated | specs：單一 ID<br>usage：comma-separated |
| **驗證邏輯** | 基本驗證 | +規格存在驗證<br>+specId 關聯驗證 |
| **Spec Manager** | 無 | useWD40SpecManager（或其他） |
| **複雜度** | 🟡 中等 | 🔴 高 |

---

## 🎓 學習要點

1. **Type 3 = Type 2 + Specs**
   - 繼承 Type 2 的所有邏輯（群組、comma-separated IDs）
   - 新增規格管理（單一 ID、名稱唯一性驗證）

2. **Dual Upload 是關鍵**
   - 規格佐證：`uploadSpecFiles(savedSpecs, entry_id)`
   - 使用佐證：`uploadGroupFiles(groupsMap, entry_id)`

3. **驗證不能少**
   - `validateSpecsExist` — 至少要有一個規格
   - `validateUsageRecordsHaveSpec` — 每筆使用記錄必須有 specId

4. **Spec Manager 是獨立的**
   - useWD40SpecManager 負責規格 CRUD
   - useType3Helpers 負責提交/檔案邏輯
   - 分離關注點，各司其職

---

---

## 🎉 全局檔案功能（2025-01-25 新增）

### 使用案例：滅火器頁面

**問題：** 滅火器需要額外的「消防安全設備檢修表」（全局佐證），但原本架構沒有支援。

**舊做法：**
- 291 行程式碼
- 手動管理 `inspectionReport` 狀態
- 手動寫 `useEffect` 載入檔案
- Override `handleSubmit` 和 `handleSave`
- 容易出現狀態衝突 bug

**新做法：**
```typescript
const page = useMobileType3Page({
  config: FIRE_EXTINGUISHER_CONFIG,
  dataFieldName: 'fireExtinguisherData',
  useSpecManager: useFireExtinguisherSpecManager,
  mode: 'weight',
  parseSpecName: ...,
  // ⭐ 只需加這 5 行
  globalFiles: [{
    key: 'inspectionReport',
    fileType: 'annual_evidence',
    required: false,
    label: '消防安全設備檢修表'
  }]
})

// ⭐ 直接使用
const inspectionReport = page.globalFilesState?.inspectionReport
const setInspectionReport = page.updateGlobalFile?.('inspectionReport')
```

**成效：**
- 159 行程式碼（減少 132 行，45%）
- 所有邏輯自動處理
- 零狀態衝突
- 其他頁面完全不受影響

---

**記錄者：** Linus (via Claude Code)
**最後更新：** 2025-01-25
