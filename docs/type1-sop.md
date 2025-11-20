# Type 1 頁面重構 SOP

> 基於 RefrigerantPage 重構經驗建立的標準操作流程

**建立日期：** 2025-01-18
**Pilot 頁面：** RefrigerantPage ✅ 完成
**適用頁面：** SF6Page, GeneratorTestPage

---

## 🎯 Type 1 特徵

- **業務邏輯：** 一筆佐證 → 一筆資料（設備型）
- **資料結構：** 每個設備有自己的佐證檔案（1:1 關係）
- **複雜度：** 🟢 簡單

---

## 📋 重構步驟（30 分鐘完成）

### 步驟 1：移除舊 imports（2 分鐘）

**移除：**
```typescript
import { useMultiRecordSubmit } from '../../hooks/useMultiRecordSubmit'
import { useRecordFileMapping } from '../../hooks/useRecordFileMapping'
import { upsertEnergyEntry } from '../../api/entries'
```

**新增：**
```typescript
import { entryAPI } from '../../api/v2/entryAPI'
import { fileAPI } from '../../api/v2/fileAPI'
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

**替換為簡單 state：**
```typescript
const [submitError, setSubmitError] = useState<string | null>(null)
const [submitSuccess, setSubmitSuccess] = useState<string | null>(null)
```

---

### 步驟 3：建立統一提交函數（10 分鐘）

**核心模板（從 RefrigerantPage 複製）：**

```typescript
// 統一提交函數（提交和暫存）
const submitData = async (isDraft: boolean) => {
  // 1️⃣ 驗證資料
  if (savedDevices.length === 0) {
    throw new Error('請至少新增一個設備')
  }

  await executeSubmit(async () => {
    // 2️⃣ 計算總量（根據頁面調整）
    const totalAmount = savedDevices.reduce((sum, item) => {
      // 🔧 調整：根據頁面的單位轉換邏輯
      const amountInStandardUnit = item.unit === 'gram'
        ? item.fillAmount / 1000
        : item.fillAmount
      return sum + amountInStandardUnit
    }, 0)

    // 3️⃣ 清理資料（移除前端專用欄位）
    const cleanedData = savedDevices.map(device => ({
      // 🔧 調整：根據頁面的資料欄位
      id: device.id,
      brandModel: device.brandModel,
      equipmentType: device.equipmentType,
      equipmentLocation: device.equipmentLocation,
      refrigerantType: device.refrigerantType,
      fillAmount: device.fillAmount,
      unit: device.unit
    }))

    // 4️⃣ 提交 entry
    const response = await entryAPI.submitEnergyEntry({
      page_key: pageKey,  // 🔧 調整：'refrigerant', 'sf6', 'generator_test'
      period_year: year,
      status: isDraft ? 'draft' : 'submitted',
      notes: `冷媒設備共 ${savedDevices.length} 台`,  // 🔧 調整描述
      payload: {
        refrigerantData: cleanedData  // 🔧 調整 key 名稱
      }
    })

    // 5️⃣ 上傳檔案
    for (const device of savedDevices) {
      if (device.memoryFiles?.length > 0) {
        for (const file of device.memoryFiles) {
          await fileAPI.uploadEvidenceFile(file.file, {
            page_key: pageKey,
            period_year: year,
            file_type: 'other',
            entry_id: response.entry_id,
            record_id: device.id,
            standard: '64'
          })
        }
      }
    }

    // 6️⃣ 更新前端狀態
    setCurrentEntryId(response.entry_id)
    setSubmitSuccess(isDraft ? '暫存成功' : '提交成功')

    // 7️⃣ 重新載入資料
    await reload()
    await handleSubmitSuccess()
    reloadApprovalStatus()
  })
}
```

---

### 步驟 4：簡化 handleSubmit（1 分鐘）

**替換整個函數：**

```typescript
const handleSubmit = () => submitData(false)
```

---

### 步驟 5：簡化 handleSave（5 分鐘）

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

### 步驟 6：更新 notification state（2 分鐘）

**在 SharedPageLayout 的 notificationState prop：**

```typescript
notificationState={{
  success: submitSuccess,
  error: submitError,
  clearSuccess: () => setSubmitSuccess(null),
  clearError: () => setSubmitError(null)
}}
```

---

### 步驟 7：移除檔案映射邏輯（5 分鐘）

**找到所有使用 getRecordFiles 的地方，替換為：**

```typescript
// ❌ 舊寫法
const recordFiles = getRecordFiles(device.id, refrigerantFiles)

// ✅ 新寫法（直接用 record_id 過濾）
const recordFiles = refrigerantFiles.filter(f => f.record_id === device.id)
```

---

### 步驟 8：測試（3 分鐘）

**執行 TypeScript 檢查：**
```bash
npx --prefix frontend tsc --noEmit 2>&1 | grep -A 5 "YourPageName"
```

**執行自動化測試：**
```bash
python -c "import io, sys; sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8'); exec(open('test_refrigerant_api.py', encoding='utf-8').read())"
```

---

## 🔧 各頁面調整清單

### RefrigerantPage ✅ 完成
- `page_key: 'refrigerant'`
- `payload.refrigerantData`
- 欄位：brandModel, equipmentType, equipmentLocation, refrigerantType, fillAmount, unit

### SF6Page 🔜 下一個
- `page_key: 'sf6'`
- `payload.sf6Data`
- 欄位：設備型號、設備位置、SF6類型、補充量、單位

### GeneratorTestPage 🔜 第三個
- `page_key: 'generator_test'`
- `payload.testRecords`
- 欄位：測試日期、發電機編號、運轉時數、燃料使用量

---

## 📊 預期成果

### 程式碼減少
- **移除行數：** ~650 行 (useMultiRecordSubmit 204行 + useRecordFileMapping 352行 + 重複邏輯 ~100行)
- **新增行數：** ~55 行 (submitData 函數)
- **淨減少：** ~595 行 (92%)

### Code Smells 消除
- ✅ Duplicated Code（handleSubmit 和 handleSave 重複）
- ✅ Long Method（useMultiRecordSubmit 204 行）
- ✅ Feature Envy（前端做後端的事）
- ✅ Primitive Obsession（過度複雜的 state 管理）

### 測試結果
- ✅ TypeScript 編譯無錯誤
- ✅ 資料結構驗證通過
- ✅ 檔案上傳結構正確
- ✅ 完整流程模擬成功

---

## ⚠️ 注意事項

### 不要碰的部分
1. **SharedPageLayout** - 母版不需要改
2. **輸入欄位組件** - UI 組件保持不變
3. **列表顯示組件** - 顯示邏輯保持不變
4. **useRefrigerantDeviceManager** 等 manager hooks - 資料管理邏輯保持不變
5. **管理員審核模式** - handleSave 中的 adminSave 邏輯保持不變

### 只改的部分
1. ✅ imports（移除舊 hooks，新增 entryAPI/fileAPI）
2. ✅ submitData 函數（新增統一提交邏輯）
3. ✅ handleSubmit（簡化為一行）
4. ✅ handleSave（一般模式簡化為一行）
5. ✅ notificationState（更新 prop）
6. ✅ 檔案過濾邏輯（移除 getRecordFiles）

---

## 🚀 快速檢查清單

複製這個到每次重構前檢查：

```
[ ] 已備份原始檔案
[ ] 已移除 useMultiRecordSubmit import
[ ] 已移除 useRecordFileMapping import
[ ] 已新增 entryAPI, fileAPI imports
[ ] 已建立 submitData 函數
[ ] 已調整 page_key
[ ] 已調整 payload key 名稱
[ ] 已調整 cleanedData 欄位映射
[ ] 已簡化 handleSubmit
[ ] 已簡化 handleSave（保留 adminSave）
[ ] 已更新 notificationState
[ ] 已移除 getRecordFiles，改用 filter
[ ] TypeScript 編譯通過
[ ] 自動化測試通過
[ ] 更新 PROGRESS.md
```

---

## 📝 範例對照

### Before（舊寫法，~530 行）

```typescript
const {
  submit,
  save,
  error: submitError,
  success: submitSuccess
} = useMultiRecordSubmit(pageKey, year)

const {
  uploadRecordFiles,
  getRecordFiles
} = useRecordFileMapping(pageKey, currentEntryId)

const handleSubmit = async () => {
  // ... 90 行提交邏輯 ...
}

const handleSave = async () => {
  // ... 90 行暫存邏輯（和 handleSubmit 重複 90%）...
}
```

### After（新寫法，~350 行）

```typescript
import { entryAPI } from '../../api/v2/entryAPI'
import { fileAPI } from '../../api/v2/fileAPI'

const [submitError, setSubmitError] = useState<string | null>(null)
const [submitSuccess, setSubmitSuccess] = useState<string | null>(null)

const submitData = async (isDraft: boolean) => {
  // ... 55 行統一邏輯 ...
}

const handleSubmit = () => submitData(false)

const handleSave = async () => {
  if (isReviewMode && reviewEntryId) {
    // adminSave 邏輯
    return
  }
  await submitData(true)
}
```

---

**下次重構 SF6Page 時，直接複製這個 SOP！**
