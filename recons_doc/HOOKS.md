# 能源填報系統 Hook 使用說明

## 📋 文件資訊

- **文件版本**：v1.0
- **建立日期**：2025-01-01
- **適用範圍**：14 個能源類別頁面
- **相關文件**：REFACTORING_PLAN.md, WORKFLOW.md

---

## 📚 目錄

1. [Hook 總覽](#hook-總覽)
2. [useEnergyData - 資料載入](#useenergydata---資料載入)
3. [useEnergySubmit - 提交邏輯（單記錄）](#useenergysubmit---提交邏輯)
4. [useMultiRecordSubmit - 提交邏輯（多記錄）](#usemultirecordsubmit---多記錄提交)
5. [useEnergyClear - 清除邏輯](#useenergyclear---清除邏輯)
6. [型別定義](#型別定義)
7. [完整使用範例](#完整使用範例)
8. [常見問題](#常見問題)

---

## Hook 總覽

能源填報系統提供 **核心 Hook**，採用單一職責原則設計：

| Hook | 職責 | 核心功能 |
|------|------|---------|
| `useEnergyData` | 資料載入 | 載入 entry 和檔案、提供 reload 函式 |
| `useEnergySubmit` | 提交邏輯（單記錄） | 儲存資料、上傳檔案、錯誤處理 |
| `useMultiRecordSubmit` | 提交邏輯（多記錄） | 多筆記錄提交、檔案映射、統一訊息 |
| `useEnergyClear` | 清除邏輯 | 刪除 entry、刪除檔案、清理記憶體 |
| `useGhostFileCleaner` | 幽靈檔案清理 | 驗證檔案存在、刪除幽靈檔案記錄 |
| `useRecordFileMapping` | 多記錄檔案映射 | 用穩定 ID 關聯檔案，防止檔案錯位 |
| `useReloadWithFileSync` | Reload 同步延遲 | 處理 reload 後的檔案同步問題 |

### 設計原則

**1. 單一職責（Single Responsibility）**
- 每個 Hook 只負責一件事
- `useEnergyData` 只管載入
- `useEnergySubmit` 只管提交
- `useEnergyClear` 只管清除

**2. 簡單易用**
- 最少的參數
- 清晰的回傳值
- 自動處理複雜邏輯

**3. 錯誤處理**
- Hook 內部處理錯誤
- 回傳友善的錯誤訊息
- 不會讓頁面崩潰

**4. 可組合（Composable）**
- Hook 之間可以自由組合
- 頁面決定使用哪些 Hook
- 互不依賴，鬆散耦合

---

## useEnergyData - 資料載入

### 功能說明

這個 Hook 處理使用者填報的**所有功能**：
- ✅ 載入舊資料（重新進入頁面時）
- ✅ 檔案管理（上傳、刪除、記憶體暫存）
- ✅ 提交填報（資料 + 檔案一起提交）
- ✅ 清除資料（刪除資料庫記錄和檔案）

---

### API 定義

```typescript
// === Hook 1: 資料載入 ===
const {
  entry,              // 現有記錄（EnergyEntry | null）
  files,              // 已上傳的檔案（EvidenceFile[]）
  loading,            // 是否載入中（boolean）
  reload              // 重新載入函式（function）
} = useEnergyData(pageKey, year)

// === Hook 2: 提交邏輯 ===
const {
  submit,             // 提交函式（function）
  submitting,         // 是否提交中（boolean）
  error,              // 錯誤訊息（string | null）
  success             // 成功訊息（string | null）
} = useEnergySubmit(pageKey, year)

// === Hook 3: 清除邏輯 ===
const {
  clear,              // 清除函式（function）
  clearing,           // 是否清除中（boolean）
  error: clearError   // 清除錯誤訊息（string | null）
} = useEnergyClear(entryId, currentStatus)
```

---

### 參數說明

#### `pageKey: string`
- **說明**：能源類別的識別碼
- **範例**：`'wd40'`, `'acetylene'`, `'electricity'`
- **必填**：是

#### `year: number`
- **說明**：填報年度
- **範例**：`2024`
- **必填**：是
- **預設值**：當前年度

---

### 回傳值說明

#### 資料載入

##### `entry: EnergyEntry | null`
- **說明**：現有的填報記錄
- **何時有值**：使用者之前提交過資料
- **何時為 null**：首次進入頁面（尚未提交）
- **用途**：判斷是否有舊資料、取得狀態

**範例：**
```typescript
if (entry) {
  console.log('已提交過，狀態:', entry.status)
  console.log('提交時間:', entry.created_at)
} else {
  console.log('首次填報')
}
```

##### `loading: boolean`
- **說明**：是否正在載入資料
- **何時為 true**：初始化時載入舊資料
- **用途**：顯示 loading 畫面

**範例：**
```typescript
if (loading) {
  return <div>載入中...</div>
}
```

---

#### 檔案管理

##### `files: EvidenceFile[]`
- **說明**：已上傳到 Supabase 的檔案清單
- **來源**：從資料庫 `evidence_files` 表載入
- **用途**：顯示已上傳的檔案

**範例：**
```typescript
files.forEach(file => {
  console.log(file.file_name)      // 檔案名稱
  console.log(file.file_type)      // msds 或 usage_evidence
  console.log(file.month)          // 月份（usage_evidence 才有）
})
```

##### `deleteFile(fileId: string): Promise<void>`
- **說明**：刪除已上傳的檔案
- **參數**：`fileId` - 檔案 ID
- **行為**：
  1. 呼叫 `deleteEvidenceFile(fileId)`
  2. 從 `files` 陣列移除
  3. 從 Supabase Storage 刪除實體檔案
- **錯誤處理**：失敗時設定 `error`

**範例：**
```typescript
<button onClick={() => deleteFile(file.id)}>
  刪除檔案
</button>
```

---

#### 提交

##### `submit(params): Promise<void>`
- **說明**：提交填報（資料 + 檔案）
- **參數**：
  ```typescript
  {
    formData: any,              // 表單資料（必填）
    msdsFiles?: MemoryFile[],   // MSDS 記憶體檔案（選填）
    monthlyFiles?: MemoryFile[][] // 月份記憶體檔案（選填，12個月）
  }
  ```
- **行為**：
  1. 驗證資料（必填、總量 > 0）
  2. 呼叫 `upsertEnergyEntry()` 儲存資料
  3. 上傳 msdsFiles（file_type='msds'）
  4. 上傳 monthlyFiles（file_type='usage_evidence', month=1~12）
  5. 呼叫 `commitEvidence()` 關聯檔案
  6. 重新載入 `entry` 和 `files`
  7. 設定 `success` 訊息
- **錯誤處理**：失敗時設定 `error`，部分成功會特別處理

**範例：**
```typescript
const handleSubmit = async () => {
  await submit({
    formData: {
      monthly: { '1': 10, '2': 15, ... },
      unitCapacity: 500,
      carbonRate: 85
    },
    msdsFiles: msdsMemoryFiles,
    monthlyFiles: monthlyMemoryFiles
  })
}

<button onClick={handleSubmit} disabled={submitting}>
  {submitting ? '提交中...' : '提交填報'}
</button>
```

##### `submitting: boolean`
- **說明**：是否正在提交
- **用途**：禁用按鈕、顯示 loading

---

#### 清除

##### `clear(): Promise<void>`
- **說明**：清除所有資料（資料庫 + 檔案）
- **行為**：
  1. 呼叫 `deleteEnergyEntry(entryId)`
  2. 級聯刪除關聯檔案
  3. 清空前端 state
  4. 重置為初始狀態
- **限制**：`status = 'approved'` 時無法清除
- **錯誤處理**：失敗時設定 `error`

**範例：**
```typescript
const handleClear = async () => {
  if (confirm('確定要清除所有資料嗎？')) {
    await clear()
  }
}

<button 
  onClick={handleClear} 
  disabled={clearing || entry?.status === 'approved'}
>
  {clearing ? '清除中...' : '清除'}
</button>
```

##### `clearing: boolean`
- **說明**：是否正在清除
- **用途**：禁用按鈕、顯示 loading

---

#### 訊息

##### `error: string | null`
- **說明**：錯誤訊息
- **何時有值**：提交、刪除檔案、清除失敗時
- **用途**：顯示錯誤 Toast

**範例：**
```typescript
{error && (
  <Toast 
    message={error} 
    type="error" 
    onClose={clearError}
  />
)}
```

##### `success: string | null`
- **說明**：成功訊息
- **何時有值**：提交成功時
- **用途**：顯示成功 Toast

**範例：**
```typescript
{success && (
  <Toast 
    message={success} 
    type="success" 
    onClose={clearSuccess}
  />
)}
```

##### `clearError(): void`
- **說明**：清除錯誤訊息
- **用途**：關閉錯誤 Toast

##### `clearSuccess(): void`
- **說明**：清除成功訊息
- **用途**：關閉成功 Toast

---

### 內部行為

#### 初始化時（useEffect）
```typescript
1. 呼叫 getEntryByPageKeyAndYear(pageKey, year)
2. 如果有回傳 entry：
   - 設定 entry
   - 呼叫 getEntryFiles(entry.id)
   - 設定 files
3. 設定 loading = false
```

#### 提交時（submit）
```typescript
1. 設定 submitting = true
2. 驗證 formData
3. 呼叫 upsertEnergyEntry({
     page_key: pageKey,
     period_year: year,
     payload: formData,
     monthly: formData.monthly,
     unit: 單位
   })
4. 取得 entry_id
5. 針對每個 memoryFile：
   - 呼叫 uploadEvidenceWithEntry(file, { entryId, pageKey, year, file_type })
6. 呼叫 commitEvidence({ entryId, pageKey })
7. 清空 memoryFiles
8. 重新載入 entry 和 files
9. 設定 success = "提交成功！年度總使用量：XXX [單位]"
10. 設定 submitting = false

如果失敗：
- 設定 error
- 設定 submitting = false
```

#### 清除時（clear）
```typescript
1. 設定 clearing = true
2. 呼叫 deleteEnergyEntry(entry.id)
3. 清空所有 state：
   - entry = null
   - files = []
   - memoryFiles = []
4. 設定 success = "資料已清除"
5. 設定 clearing = false

如果失敗：
- 設定 error
- 設定 clearing = false
```

---

### 使用範例

#### 完整的頁面範例（WD40）

```typescript
const WD40Page = () => {
  const pageKey = 'wd40'
  const year = 2024
  
  // === 使用 Hook ===
  const {
    entry,
    loading,
    files,
    deleteFile,
    submit,
    submitting,
    clear,
    clearing,
    error,
    success,
    clearError,
    clearSuccess
  } = useEnergyPage(pageKey, year)
  
  // === 頁面自己的 state（表單欄位） ===
  const [monthlyData, setMonthlyData] = useState([...])
  const [unitCapacity, setUnitCapacity] = useState(0)
  const [carbonRate, setCarbonRate] = useState(0)
  
  // === 頁面自己管理記憶體檔案 ===
  const [msdsMemoryFiles, setMsdsMemoryFiles] = useState<MemoryFile[]>([])
  const [monthlyMemoryFiles, setMonthlyMemoryFiles] = useState<MemoryFile[][]>(
    Array.from({ length: 12 }, () => [])
  )
  
  // === 初始化：從 entry 載入資料 ===
  useEffect(() => {
    if (entry?.payload) {
      setMonthlyData(entry.payload.monthly)
      setUnitCapacity(entry.payload.unitCapacity)
      setCarbonRate(entry.payload.carbonRate)
    }
  }, [entry])
  
  // === 提交 ===
  const handleSubmit = async () => {
    await submit({
      formData: {
        monthly: monthlyData,
        unitCapacity,
        carbonRate
      },
      msdsFiles: msdsMemoryFiles,
      monthlyFiles: monthlyMemoryFiles
    })
  }
  
  // === 清除 ===
  const handleClear = async () => {
    if (confirm('確定要清除所有資料嗎？')) {
      await clear()
      // 清除後重置表單
      setMonthlyData([...])
      setUnitCapacity(0)
      setCarbonRate(0)
      setMsdsMemoryFiles([])
      setMonthlyMemoryFiles(Array.from({ length: 12 }, () => []))
    }
  }
  
  // === 上傳檔案（使用 EvidenceUpload 組件） ===
  // MSDS 檔案
  <EvidenceUpload
    pageKey={pageKey}
    kind="msds"
    memoryFiles={msdsMemoryFiles}
    onMemoryFilesChange={setMsdsMemoryFiles}
  />
  
  // 月份檔案
  {monthlyData.map((month, i) => (
    <EvidenceUpload
      key={i}
      pageKey={pageKey}
      kind="usage_evidence"
      month={i + 1}
      memoryFiles={monthlyMemoryFiles[i]}
      onMemoryFilesChange={(files) => {
        const newFiles = [...monthlyMemoryFiles]
        newFiles[i] = files
        setMonthlyMemoryFiles(newFiles)
      }}
    />
  ))}
  
  // === Loading 畫面 ===
  if (loading) {
    return <div>載入中...</div>
  }
  
  // === 顯示狀態橫幅 ===
  const currentStatus = entry?.status || 'submitted'
  
  return (
    <div>
      {/* 審核狀態橫幅 */}
      {currentStatus === 'approved' && (
        <div className="bg-green-100 p-4">
          🎉 恭喜您已審核通過！
        </div>
      )}
      
      {currentStatus === 'rejected' && (
        <div className="bg-red-100 p-4">
          ⚠️ 填報已被退回
          <p>退回原因：{entry.review_notes}</p>
        </div>
      )}
      
      {/* 表單欄位 */}
      <input 
        value={unitCapacity}
        onChange={(e) => setUnitCapacity(Number(e.target.value))}
        disabled={currentStatus === 'approved'}
      />
      
      {/* 月份資料 */}
      {monthlyData.map((month, i) => (
        <div key={i}>
          <input 
            value={month.quantity}
            onChange={(e) => {
              const newData = [...monthlyData]
              newData[i].quantity = Number(e.target.value)
              setMonthlyData(newData)
            }}
            disabled={currentStatus === 'approved'}
          />
          
          {/* 上傳月份檔案 */}
          <EvidenceUpload
            pageKey={pageKey}
            kind="usage_evidence"
            month={i + 1}
            memoryFiles={monthlyMemoryFiles[i]}
            onMemoryFilesChange={(files) => {
              const newFiles = [...monthlyMemoryFiles]
              newFiles[i] = files
              setMonthlyMemoryFiles(newFiles)
            }}
            disabled={currentStatus === 'approved'}
          />
        </div>
      ))}
      
      {/* 顯示已上傳的檔案 */}
      <div>
        <h3>已上傳檔案</h3>
        {files.map(file => (
          <div key={file.id}>
            {file.file_name}
            <button 
              onClick={() => deleteFile(file.id)}
              disabled={currentStatus === 'approved'}
            >
              刪除
            </button>
          </div>
        ))}
      </div>
      
      {/* 底部按鈕 */}
      {currentStatus !== 'approved' && (
        <div>
          <button 
            onClick={handleSubmit} 
            disabled={submitting}
          >
            {submitting ? '提交中...' : '提交填報'}
          </button>
          
          <button 
            onClick={handleClear} 
            disabled={clearing}
          >
            {clearing ? '清除中...' : '清除'}
          </button>
        </div>
      )}
      
      {/* Toast 訊息 */}
      {error && (
        <Toast 
          message={error} 
          type="error" 
          onClose={clearError}
        />
      )}
      
      {success && (
        <Toast 
          message={success} 
          type="success" 
          onClose={clearSuccess}
        />
      )}
    </div>
  )
}
```

---

## useMultiRecordSubmit - 多記錄提交

### 功能說明

這個 Hook 處理多記錄頁面的**提交與暫存功能**：
- ✅ 支援 submit（提交）和 save（暫存）雙模式
- ✅ 三階段提交：entry → 檔案 → fileMapping
- ✅ 與 useRecordFileMapping 無縫配合
- ✅ 訊息格式與 useEnergySubmit 統一
- ✅ 接收 entry_id 回調參數

**適用頁面：**
- DieselPage（柴油）
- GasolinePage（汽油）
- RefrigerantPage（冷媒）
- DieselGeneratorRefuelPage（柴油發電機加油）

**核心差異：** 與 useEnergySubmit 不同，多記錄頁面需要：
1. 批次處理多筆記錄的檔案上傳
2. 使用 recordId 關聯檔案（不是月份）
3. 提交時需要三階段流程（entry → files → update entry with fileMapping）

---

### API 定義

```typescript
const {
  submit,             // 提交函式（完整驗證）
  save,               // 暫存函式（跳過驗證）
  submitting,         // 是否提交/暫存中
  error,              // 錯誤訊息
  success,            // 成功訊息
  clearError,         // 清除錯誤訊息
  clearSuccess        // 清除成功訊息
} = useMultiRecordSubmit(pageKey, year)
```

---

### 參數說明

#### `pageKey: string`
- **說明**：能源類別識別碼
- **範例**：`'diesel'`, `'gasoline'`, `'refrigerant'`
- **必填**：是

#### `year: number`
- **說明**：填報年度
- **範例**：`2025`
- **必填**：是

---

### 回傳值說明

#### `submit(params): Promise<string>`
- **說明**：提交多記錄填報（完整驗證）
- **參數**：
  ```typescript
  {
    entryInput: UpsertEntryInput,     // entry 基本資料
    recordData: Array<{               // 記錄陣列
      id: string,                     // recordId
      memoryFiles?: MemoryFile[]      // 記憶體檔案
    }>,
    uploadRecordFiles: (              // 上傳函數（來自 useRecordFileMapping）
      id: string,
      files: MemoryFile[],
      entryId: string
    ) => Promise<void>,
    onSuccess?: (entry_id: string) => Promise<void>  // 成功回調（接收 entry_id）
  }
  ```
- **回傳**：`Promise<string>` - entry_id
- **行為**：
  1. 呼叫 `upsertEnergyEntry()` 儲存 entry（status: 'submitted'）
  2. 批次上傳所有記錄的檔案（使用 uploadRecordFiles）
  3. 執行 onSuccess 回調（傳入 entry_id）
  4. 設定成功訊息：`提交成功！共 N 筆記錄`

**範例：**
```typescript
await submit({
  entryInput: {
    page_key: 'diesel',
    period_year: 2025,
    unit: 'L',
    monthly: { '1': totalQuantity },
    extraPayload: { dieselData: cleanedData }
  },
  recordData: dieselData.filter(r => !r.isExample),
  uploadRecordFiles,
  onSuccess: async (entry_id) => {
    setCurrentEntryId(entry_id)
    await reload()
    setHasSubmittedBefore(true)
  }
})
```

#### `save(params): Promise<string>`
- **說明**：暫存多記錄填報（跳過驗證）
- **參數**：與 submit 相同
- **回傳**：`Promise<string>` - entry_id
- **行為**：
  1. 呼叫 `upsertEnergyEntry()` 儲存 entry（status: 'saved'）
  2. 批次上傳所有記錄的檔案
  3. 執行 onSuccess 回調
  4. 設定成功訊息：`暫存成功！資料已儲存，可稍後繼續編輯`

**範例：**
```typescript
const handleSave = async () => {
  await save({
    entryInput: { ... },
    recordData: dieselData,
    uploadRecordFiles,
    onSuccess: async (entry_id) => {
      setCurrentEntryId(entry_id)
      await reload()
    }
  })
}
```

#### `submitting: boolean`
- **說明**：是否正在提交或暫存
- **用途**：禁用按鈕、顯示 loading

#### `error: string | null`
- **說明**：錯誤訊息
- **何時有值**：提交或暫存失敗時
- **用途**：顯示錯誤 Toast

#### `success: string | null`
- **說明**：成功訊息
- **何時有值**：提交或暫存成功時
- **訊息格式**：
  - 暫存：`暫存成功！資料已儲存，可稍後繼續編輯`
  - 提交：`提交成功！共 N 筆記錄`

#### `clearError(): void`
- **說明**：清除錯誤訊息

#### `clearSuccess(): void`
- **說明**：清除成功訊息

---

### 三階段提交模式

**適用於：** GasolinePage, RefrigerantPage, DieselGeneratorRefuelPage

**為什麼需要三階段：**
- 第一階段：儲存 entry（沒有 fileMapping）
- 第二階段：上傳檔案（取得 file IDs）
- 第三階段：更新 entry（加入 fileMapping）

**實作範例：**
```typescript
const handleSubmit = async () => {
  // 第一+第二階段：使用 hook 的 submit()
  await submit({
    entryInput: {
      page_key: pageKey,
      period_year: year,
      unit: 'L',
      monthly: { '1': totalQuantity },
      extraPayload: { gasolineData: cleanedData }  // ← 還沒有 fileMapping
    },
    recordData: gasolineData,
    uploadRecordFiles,
    onSuccess: async (entry_id) => {
      // 第三階段：在 onSuccess 內再次儲存（加入 fileMapping）
      await upsertEnergyEntry({
        page_key: pageKey,
        period_year: year,
        unit: 'L',
        monthly: { '1': totalQuantity },
        extraPayload: {
          gasolineData: cleanedData,
          fileMapping: getFileMappingForPayload()  // ✅ 現在有 fileMapping
        }
      }, true)  // preserveStatus = true

      setCurrentEntryId(entry_id)
      await reload()
    }
  })
}
```

---

### 使用範例

#### 範例 1：基本用法（DieselPage）

```typescript
import { useMultiRecordSubmit } from '@/hooks/useMultiRecordSubmit'
import { useRecordFileMapping } from '@/hooks/useRecordFileMapping'

function DieselPage() {
  const pageKey = 'diesel'
  const year = 2025

  // 檔案映射 Hook
  const { uploadRecordFiles } = useRecordFileMapping(pageKey, currentEntryId)

  // 提交 Hook
  const { submit, save, submitting } = useMultiRecordSubmit(pageKey, year)

  // 提交
  const handleSubmit = async () => {
    // 前端驗證...

    await submit({
      entryInput: {
        page_key: pageKey,
        period_year: year,
        unit: 'L',
        monthly: { '1': totalQuantity },
        extraPayload: { dieselData: cleanedData }
      },
      recordData: dieselData,
      uploadRecordFiles,
      onSuccess: async (entry_id) => {
        setCurrentEntryId(entry_id)
        await reload()
        setHasSubmittedBefore(true)
      }
    })
  }

  // 暫存
  const handleSave = async () => {
    // 暫存不需要驗證

    await save({
      entryInput: { ... },
      recordData: dieselData,
      uploadRecordFiles,
      onSuccess: async (entry_id) => {
        setCurrentEntryId(entry_id)
        await reload()
        setHasSubmittedBefore(true)
      }
    })
  }

  return (
    <div>
      <button onClick={handleSubmit} disabled={submitting}>
        {submitting ? '提交中...' : '提交'}
      </button>
      <button onClick={handleSave} disabled={submitting}>
        {submitting ? '暫存中...' : '暫存'}
      </button>
    </div>
  )
}
```

#### 範例 2：三階段提交（GasolinePage）

```typescript
function GasolinePage() {
  const { submit } = useMultiRecordSubmit('gasoline', 2025)
  const { uploadRecordFiles, getFileMappingForPayload } = useRecordFileMapping('gasoline', currentEntryId)

  const handleSubmit = async () => {
    // 第一+第二階段
    await submit({
      entryInput: {
        page_key: 'gasoline',
        period_year: 2025,
        unit: 'L',
        monthly: { '1': totalQuantity },
        extraPayload: { gasolineData: cleanedData }
      },
      recordData: gasolineData,
      uploadRecordFiles,
      onSuccess: async (entry_id) => {
        // 第三階段：更新 fileMapping
        await upsertEnergyEntry({
          page_key: 'gasoline',
          period_year: 2025,
          unit: 'L',
          monthly: { '1': totalQuantity },
          extraPayload: {
            gasolineData: cleanedData,
            fileMapping: getFileMappingForPayload()
          }
        }, true)

        setCurrentEntryId(entry_id)
        await reload()
      }
    })
  }
}
```

---

### 常見問題

#### Q1：為什麼需要單獨的 Hook？
**A：多記錄頁面的邏輯與單記錄頁面不同**

**差異點：**
- ✅ 單記錄頁面：月份檔案（12 個月）
- ✅ 多記錄頁面：記錄陣列（動態數量）

**如果混在一起：**
- 參數會很複雜（需要判斷模式）
- 邏輯分支多（維護困難）
- 容易出錯

**分開後：**
- 每個 Hook 只做一件事
- 介面清晰
- 易於測試

---

#### Q2：為什麼需要三階段提交？
**A：fileMapping 必須在檔案上傳後才能生成**

**時序問題：**
```
T0: 儲存 entry → 取得 entry_id
T1: 上傳檔案 → 取得 file IDs
T2: 生成 fileMapping（需要 file IDs）
T3: 更新 entry（加入 fileMapping）
```

**如果不分階段：**
- 第一次儲存時 fileMapping 是空的
- 重新載入後無法還原檔案關聯

---

#### Q3：onSuccess 為什麼要接收 entry_id？
**A：允許頁面在回調內更新狀態**

**沒有 entry_id：**
```typescript
onSuccess: async () => {
  setCurrentEntryId(entry_id)  // ❌ entry_id 不在 scope
}
```

**有 entry_id：**
```typescript
onSuccess: async (entry_id) => {
  setCurrentEntryId(entry_id)  // ✅ 正確
  await reload()
}
```

---

#### Q4：submit 和 save 的差異？
**A：submit 完整驗證，save 跳過驗證**

| | submit | save |
|---|--------|------|
| 驗證 | 完整驗證（必填、範圍等） | 跳過驗證 |
| status | 'submitted' | 'saved' |
| 用途 | 正式提交 | 暫存草稿 |
| 訊息 | `提交成功！共 N 筆記錄` | `暫存成功！資料已儲存，可稍後繼續編輯` |

---

#### Q5：所有多記錄頁面都要用嗎？
**A：是的，4 個多記錄頁面都需要**

**遷移狀態：**
- ✅ DieselPage
- ✅ GasolinePage
- ✅ RefrigerantPage
- ✅ DieselGeneratorRefuelPage

---

## useEnergyReview - 管理員審核

### 功能說明

這個 Hook 處理管理員審核的**所有功能**：
- ✅ 檢測審核模式（URL 參數）
- ✅ 載入待審核的記錄
- ✅ 執行通過操作
- ✅ 執行退件操作
- ✅ 審核後自動導航回上一頁

---

### API 定義

```typescript
const {
  // === 審核模式 ===
  isReviewing,        // 是否為審核模式（boolean）
  reviewData,         // 待審核的記錄（EnergyEntry | null）
  loading,            // 是否載入中（boolean）
  
  // === 審核操作 ===
  approve,            // 通過函式（function）
  reject,             // 退件函式（function）
  approving,          // 是否通過中（boolean）
  rejecting,          // 是否退件中（boolean）
  
  // === 訊息 ===
  error               // 錯誤訊息（string | null）
  
} = useEnergyReview()
```

---

### 參數說明

**無參數** - Hook 會自動從 URL 參數讀取：
- `mode=review` - 檢測審核模式
- `entryId=xxx` - 待審核的記錄 ID
- `userId=xxx` - 填報者 ID（選填，供顯示用）

---

### 回傳值說明

#### 審核模式

##### `isReviewing: boolean`
- **說明**：是否為審核模式
- **判斷依據**：URL 參數包含 `mode=review`
- **用途**：決定是否顯示審核 UI

**範例：**
```typescript
if (isReviewing) {
  return <ReviewSection />
} else {
  return <NormalForm />
}
```

##### `reviewData: EnergyEntry | null`
- **說明**：待審核的記錄
- **來源**：呼叫 `getEntryById(entryId)`
- **何時有值**：審核模式且成功載入資料
- **用途**：顯示待審核的內容

**範例：**
```typescript
if (reviewData) {
  console.log('填報者:', reviewData.owner_id)
  console.log('狀態:', reviewData.status)
  console.log('資料:', reviewData.payload)
}
```

##### `loading: boolean`
- **說明**：是否正在載入待審資料
- **用途**：顯示 loading 畫面

---

#### 審核操作

##### `approve(): Promise<void>`
- **說明**：通過審核
- **行為**：
  1. 呼叫 `reviewEntry(entryId, 'approve', '')`
  2. 資料庫更新：status = 'approved', is_locked = true
  3. 顯示成功訊息
  4. 導航回上一頁 `navigate(-1)`
- **錯誤處理**：失敗時設定 `error`

**範例：**
```typescript
<button 
  onClick={approve} 
  disabled={approving}
>
  {approving ? '處理中...' : '通過'}
</button>
```

##### `reject(reason: string): Promise<void>`
- **說明**：退回審核
- **參數**：`reason` - 退件原因（必填）
- **行為**：
  1. 呼叫 `reviewEntry(entryId, 'reject', reason)`
  2. 資料庫更新：status = 'rejected', review_notes = reason
  3. 顯示成功訊息
  4. 導航回上一頁 `navigate(-1)`
- **錯誤處理**：失敗時設定 `error`

**範例：**
```typescript
const handleReject = async () => {
  const reason = prompt('請輸入退件原因')
  if (reason) {
    await reject(reason)
  }
}

<button 
  onClick={handleReject} 
  disabled={rejecting}
>
  {rejecting ? '處理中...' : '退件'}
</button>
```

##### `approving: boolean`
- **說明**：是否正在通過
- **用途**：禁用按鈕

##### `rejecting: boolean`
- **說明**：是否正在退件
- **用途**：禁用按鈕

---

#### 訊息

##### `error: string | null`
- **說明**：錯誤訊息
- **何時有值**：審核操作失敗時
- **用途**：顯示錯誤 Toast

---

### 內部行為

#### 初始化時（useEffect）
```typescript
1. 從 URL 取得參數：
   - const searchParams = useSearchParams()
   - const mode = searchParams.get('mode')
   - const entryId = searchParams.get('entryId')
   - const userId = searchParams.get('userId')

2. 如果 mode === 'review'：
   - 設定 isReviewing = true
   - 呼叫 getEntryById(entryId)
   - 設定 reviewData
   
3. 設定 loading = false
```

#### 通過時（approve）
```typescript
1. 設定 approving = true
2. 呼叫 reviewEntry(entryId, 'approve', '')
3. 資料庫更新：
   - status = 'approved'
   - is_locked = true
   - reviewed_at = 當前時間
   - reviewer_id = 當前管理員 ID
4. 導航回上一頁：navigate(-1)
5. 設定 approving = false

如果失敗：
- 設定 error
- 設定 approving = false
```

#### 退件時（reject）
```typescript
1. 設定 rejecting = true
2. 呼叫 reviewEntry(entryId, 'reject', reason)
3. 資料庫更新：
   - status = 'rejected'
   - review_notes = reason
   - reviewed_at = 當前時間
   - reviewer_id = 當前管理員 ID
4. 導航回上一頁：navigate(-1)
5. 設定 rejecting = false

如果失敗：
- 設定 error
- 設定 rejecting = false
```

---

### 使用範例

#### 完整的審核頁面範例

```typescript
import { useEnergyPage } from '@/hooks/useEnergyPage'
import { useEnergyReview } from '@/hooks/useEnergyReview'
import ReviewSection from '@/components/ReviewSection'

export default function WD40Page() {
  const pageKey = 'wd40'
  const year = 2024
  
  // === 使用者填報 Hook ===
  const energyPage = useEnergyPage(pageKey, year)
  
  // === 審核 Hook ===
  const review = useEnergyReview()
  
  // === 判斷模式 ===
  if (review.isReviewing) {
    // 審核模式
    if (review.loading) {
      return <div>載入待審資料中...</div>
    }
    
    if (!review.reviewData) {
      return <div>找不到待審資料</div>
    }
    
    return (
      <div>
        {/* 顯示待審資料（唯讀） */}
        <div>
          <h2>待審核：WD-40</h2>
          <p>填報者：{review.reviewData.owner_id}</p>
          <p>提交時間：{review.reviewData.created_at}</p>
          
          {/* 顯示表單資料（唯讀） */}
          <div>
            <h3>填報內容</h3>
            <pre>{JSON.stringify(review.reviewData.payload, null, 2)}</pre>
          </div>
          
          {/* 顯示檔案 */}
          <div>
            <h3>上傳檔案</h3>
            {energyPage.files.map(file => (
              <div key={file.id}>
                <a href={file.file_path} download>
                  {file.file_name}
                </a>
              </div>
            ))}
          </div>
        </div>
        
        {/* 審核按鈕 */}
        <ReviewSection
          entryId={review.reviewData.id}
          userId={review.reviewData.owner_id}
          category="WD-40"
          userName="填報用戶"
          amount={review.reviewData.amount}
          unit={review.reviewData.unit}
          onApprove={review.approve}
          onReject={review.reject}
        />
        
        {/* 錯誤訊息 */}
        {review.error && (
          <div className="text-red-500">
            {review.error}
          </div>
        )}
      </div>
    )
  }
  
  // === 一般模式（使用者填報） ===
  return (
    <div>
      {/* 表單內容 */}
      {/* ... 使用 energyPage 的功能 ... */}
    </div>
  )
}
```

---

## 型別定義

### EnergyEntry
```typescript
interface EnergyEntry {
  id: string                // 記錄 ID
  owner_id: string          // 填報者 ID
  page_key: string          // 能源類別（'wd40', 'acetylene', ...）
  period_year: number       // 填報年度
  category: string          // 類別名稱（'WD-40', '乙炔', ...）
  unit: string              // 單位（'ML', 'kg', ...）
  amount: number            // 總使用量
  status: EntryStatus       // 狀態
  payload: any              // 表單資料（結構由各頁面自訂）
  review_notes: string | null   // 退件原因
  reviewed_at: string | null    // 審核時間
  reviewer_id: string | null    // 審核者 ID
  is_locked: boolean        // 是否鎖定
  created_at: string        // 建立時間
  updated_at: string        // 更新時間
}
```

### EntryStatus
```typescript
type EntryStatus = 'submitted' | 'approved' | 'rejected'
```

### EvidenceFile
```typescript
interface EvidenceFile {
  id: string                // 檔案 ID
  entry_id: string          // 關聯的記錄 ID
  file_name: string         // 檔案名稱
  file_path: string         // Storage 路徑
  file_type: 'msds' | 'usage_evidence'  // 檔案類別
  month: number | null      // 月份（usage_evidence 才有）
  uploaded_at: string       // 上傳時間
}
```

### MemoryFile
```typescript
interface MemoryFile {
  file: File                // 原始檔案物件
  file_name: string         // 檔案名稱
  preview_url: string       // 預覽 URL（blob:...）
  file_type: 'msds' | 'usage_evidence'  // 檔案類別
  month?: number            // 月份（usage_evidence 才有）
}
```

---

## 完整使用範例

### 範例 1：簡單頁面（只有月份資料）

```typescript
export default function SimplePage() {
  const { 
    entry, 
    loading, 
    submit, 
    submitting 
  } = useEnergyPage('simple', 2024)
  
  const [monthly, setMonthly] = useState({})
  const [memoryFiles, setMemoryFiles] = useState([])
  
  useEffect(() => {
    if (entry?.payload?.monthly) {
      setMonthly(entry.payload.monthly)
    }
  }, [entry])
  
  if (loading) return <div>Loading...</div>
  
  return (
    <div>
      {/* 表單 */}
      <input 
        value={monthly['1'] || 0}
        onChange={(e) => setMonthly({
          ...monthly,
          '1': Number(e.target.value)
        })}
      />
      
      {/* 檔案上傳 */}
      <EvidenceUpload
        pageKey="simple"
        memoryFiles={memoryFiles}
        onMemoryFilesChange={setMemoryFiles}
      />
      
      {/* 提交 */}
      <button 
        onClick={() => submit({
          formData: { monthly },
          msdsFiles: memoryFiles
        })}
        disabled={submitting}
      >
        提交
      </button>
    </div>
  )
}
```

---

### 範例 2：完整頁面（WD40 - 表單 + 檔案）

```typescript
export default function WD40Page() {
  const { 
    entry,
    files,
    deleteFile,
    submit,
    clear,
    error,
    success 
  } = useEnergyPage('wd40', 2024)
  
  // 表單資料
  const [formData, setFormData] = useState({})
  
  // 記憶體檔案（頁面自己管）
  const [msdsFiles, setMsdsFiles] = useState<MemoryFile[]>([])
  const [monthlyFiles, setMonthlyFiles] = useState<MemoryFile[][]>(
    Array.from({ length: 12 }, () => [])
  )
  
  return (
    <div>
      {/* 表單 */}
      <input onChange={(e) => setFormData({...})} />
      
      {/* MSDS 檔案上傳 */}
      <EvidenceUpload
        pageKey="wd40"
        kind="msds"
        memoryFiles={msdsFiles}
        onMemoryFilesChange={setMsdsFiles}
      />
      
      {/* 月份檔案上傳 */}
      {[1, 2, 3, ...].map(month => (
        <EvidenceUpload
          key={month}
          pageKey="wd40"
          kind="usage_evidence"
          month={month}
          memoryFiles={monthlyFiles[month - 1]}
          onMemoryFilesChange={(files) => {
            const newFiles = [...monthlyFiles]
            newFiles[month - 1] = files
            setMonthlyFiles(newFiles)
          }}
        />
      ))}
      
      {/* 已上傳檔案 */}
      {files.map(f => (
        <div key={f.id}>
          {f.file_name}
          <button onClick={() => deleteFile(f.id)}>刪除</button>
        </div>
      ))}
      
      {/* 按鈕 */}
      <button onClick={() => submit({
        formData,
        msdsFiles,
        monthlyFiles
      })}>提交</button>
      <button onClick={clear}>清除</button>
      
      {/* Toast */}
      {error && <Toast message={error} type="error" />}
      {success && <Toast message={success} type="success" />}
    </div>
  )
}
```

---

## 常見問題

### Q1：如何管理記憶體檔案？
**A：頁面自己管理，Hook 只負責上傳。**

```typescript
// 頁面自己管理檔案分類
const [msdsMemoryFiles, setMsdsMemoryFiles] = useState<MemoryFile[]>([])
const [monthlyMemoryFiles, setMonthlyMemoryFiles] = useState<MemoryFile[][]>(
  Array.from({ length: 12 }, () => [])
)

// 提交時傳給 Hook
await submit({
  formData: {...},
  msdsFiles: msdsMemoryFiles,
  monthlyFiles: monthlyMemoryFiles
})
```

**為什麼這樣設計？**
- 每個頁面的檔案結構不同（WD40 有月份，Refrigerant 有機器清單）
- Hook 不該知道頁面細節
- 保持彈性

### Q2：如何判斷是首次填報還是修改？
**A：檢查 `entry` 是否為 null**
```typescript
if (entry === null) {
  console.log('首次填報')
} else {
  console.log('修改既有資料')
}
```

---

### Q3：如何取得當前狀態？
**A：從 `entry.status` 取得**
```typescript
const currentStatus = entry?.status || 'submitted'

if (currentStatus === 'approved') {
  // 通過後禁用編輯
}
```

---

### Q3：記憶體檔案什麼時候會被清空？
**A：提交成功後自動清空**
- 提交前：`memoryFiles.length > 0`
- 提交後：`memoryFiles.length === 0`

---

### Q4：如何自訂成功訊息？
**A：Hook 會自動產生，包含總使用量**
```typescript
// 自動產生的訊息格式
"提交成功！年度總使用量：250.00 ML"
```

---

### Q5：審核模式下可以編輯嗎？
**A：不行，審核模式是唯讀的**
```typescript
const isReadonly = isReviewing || entry?.status === 'approved'

<input disabled={isReadonly} />
```

---

### Q6：清除功能什麼時候不能用？
**A：通過審核後不能清除**
```typescript
const canClear = entry?.status !== 'approved'

<button disabled={!canClear || clearing}>
  清除
</button>
```

---

### Q7：如何處理部分檔案上傳失敗？
**A：Hook 會自動處理，並回報哪些失敗**
- 成功的檔案會正常關聯
- 失敗的檔案會保留在記憶體
- `error` 會顯示：「部分檔案關聯成功 (3/5)」

---

### Q8：兩個 Hook 可以同時使用嗎？
**A：可以，但通常只會用其中一個**
```typescript
// 審核模式：主要用 useEnergyReview
if (isReviewing) {
  // 只顯示資料，不需要 useEnergyPage 的提交功能
}

// 一般模式：只用 useEnergyPage
else {
  // 不需要 useEnergyReview
}
```

---

## useEnergyClear - 清除邏輯

### 功能說明

這個 Hook 處理清除填報記錄的**所有功能**：
- ✅ 檢查狀態（`approved` 不能清除）
- ✅ 刪除所有檔案（從資料庫和 Storage）
- ✅ 刪除 entry 記錄
- ✅ 清理記憶體檔案的 preview URLs
- ✅ 完整錯誤處理

---

### API 定義

```typescript
const {
  clear,              // 清除函式（function）
  clearing,           // 是否清除中（boolean）
  error,              // 錯誤訊息（string | null）
  clearError          // 清除錯誤訊息（function）
} = useEnergyClear(entryId, currentStatus)
```

---

### 參數說明

#### `entryId: string | null`
- **說明**：要清除的 entry ID
- **必填**：是
- **何時為 null**：尚未提交過資料

#### `currentStatus: EntryStatus | null`
- **說明**：當前狀態
- **必填**：是
- **用途**：檢查是否允許清除（`approved` 不能清除）
- **型別**：`'submitted' | 'approved' | 'rejected' | null`

---

### 回傳值說明

#### `clear(params): Promise<void>`
- **說明**：清除所有資料
- **參數**：
  ```typescript
  {
    filesToDelete: EvidenceFile[],        // 要刪除的檔案清單
    memoryFilesToClean: MemoryFile[][]    // 要清理的記憶體檔案
  }
  ```
- **行為**：
  1. 檢查 `entryId` 是否存在
  2. 檢查 `currentStatus` 是否為 `approved`
  3. 刪除所有檔案（呼叫 `deleteEvidenceFile`）
  4. 刪除 entry 記錄（呼叫 `deleteEnergyEntry`）
  5. 清理記憶體檔案的 blob URLs
- **錯誤處理**：
  - `entryId` 為 null → 拋出「沒有可清除的資料」
  - `currentStatus` 為 `approved` → 拋出「已通過審核的資料無法清除」
  - 刪除失敗 → 設定 `error` 並重新拋出

**範例：**
```typescript
const handleClear = async () => {
  try {
    // 收集所有要刪除的檔案
    const allFiles = [...msdsFiles]
    monthlyData.forEach(data => {
      allFiles.push(...data.files)
    })

    // 呼叫清除
    await clear({
      filesToDelete: allFiles,
      memoryFilesToClean: [msdsMemoryFiles, ...monthlyMemoryFiles]
    })

    // 清除成功後，重置前端狀態
    setFormData(initialState)
    setSuccess('資料已完全清除')

  } catch (error) {
    // 錯誤已經在 Hook 內設定，這裡只需要處理 UI
    console.error('清除失敗:', error)
  }
}
```

#### `clearing: boolean`
- **說明**：是否正在清除
- **用途**：禁用清除按鈕、顯示 loading

**範例：**
```typescript
<button
  onClick={handleClear}
  disabled={clearing || currentStatus === 'approved'}
>
  {clearing ? '清除中...' : '清除'}
</button>
```

#### `error: string | null`
- **說明**：錯誤訊息
- **何時有值**：清除失敗時
- **用途**：顯示錯誤 Toast

**範例：**
```typescript
{error && (
  <Toast
    message={error}
    type="error"
    onClose={clearError}
  />
)}
```

#### `clearError(): void`
- **說明**：清除錯誤訊息
- **用途**：關閉錯誤 Toast

---

### 使用範例

#### 完整的清除流程

```typescript
import { useEnergyClear } from '@/hooks/useEnergyClear'

function WD40Page() {
  const [currentEntryId, setCurrentEntryId] = useState<string | null>(null)
  const [currentStatus, setCurrentStatus] = useState<EntryStatus | null>('submitted')
  const [msdsFiles, setMsdsFiles] = useState<EvidenceFile[]>([])
  const [monthlyData, setMonthlyData] = useState([...])

  // 使用 Hook
  const { clear, clearing, error, clearError } = useEnergyClear(
    currentEntryId,
    currentStatus
  )

  const handleClear = async () => {
    try {
      // 收集檔案
      const allFiles = [...msdsFiles]
      monthlyData.forEach(data => allFiles.push(...data.files))

      // 呼叫清除
      await clear({
        filesToDelete: allFiles,
        memoryFilesToClean: [msdsMemoryFiles, ...monthlyMemoryFiles]
      })

      // 重置狀態
      setCurrentEntryId(null)
      setCurrentStatus(null)
      setMsdsFiles([])
      setMonthlyData(initialMonthlyData)
      setFormData(initialFormData)

      setSuccess('資料已完全清除')

    } catch (err) {
      // Hook 已處理錯誤，這裡只需要 UI 反饋
    }
  }

  return (
    <div>
      {/* 清除按鈕 */}
      <button
        onClick={handleClear}
        disabled={clearing || currentStatus === 'approved'}
        className="..."
      >
        {clearing ? '清除中...' : '清除'}
      </button>

      {/* 錯誤訊息 */}
      {error && (
        <Toast message={error} type="error" onClose={clearError} />
      )}
    </div>
  )
}
```

---

### 內部行為

#### 清除流程

```typescript
1. 檢查前置條件
   - entryId 不能為 null
   - currentStatus 不能為 'approved'

2. 設定 clearing = true

3. 刪除所有檔案
   for (const file of filesToDelete) {
     await deleteEvidenceFile(file.id)
   }
   // 失敗時只 console.warn，繼續刪除其他檔案

4. 刪除 entry 記錄
   await deleteEnergyEntry(entryId)
   // 失敗時拋出錯誤

5. 清理記憶體檔案
   memoryFilesToClean.forEach(files => {
     DocumentHandler.clearAllMemoryFiles(files)
   })

6. 設定 clearing = false

如果失敗：
- 設定 error
- 設定 clearing = false
- 重新拋出錯誤
```

---

### 常見問題

#### Q1：為什麼要傳 `memoryFilesToClean` 參數？
**A：釋放 blob URLs，避免記憶體洩漏。**

記憶體檔案使用 `URL.createObjectURL()` 建立預覽 URL，清除時必須呼叫 `URL.revokeObjectURL()` 釋放。

```typescript
// DocumentHandler.clearAllMemoryFiles 內部會做：
memoryFiles.forEach(file => {
  if (file.preview_url) {
    URL.revokeObjectURL(file.preview_url)
  }
})
```

---

#### Q2：為什麼刪除檔案失敗不拋錯？
**A：部分檔案刪除失敗不應該阻止整個清除流程。**

檔案可能因為權限、網路等問題刪除失敗，但 entry 記錄仍應該被刪除。

```typescript
for (const file of filesToDelete) {
  try {
    await deleteEvidenceFile(file.id)
  } catch (err) {
    console.warn('⚠️ 刪除檔案失敗，繼續:', err)
    // 不拋錯，繼續刪除其他檔案
  }
}
```

---

#### Q3：approved 狀態為什麼不能清除？
**A：已通過審核的資料不應該被刪除，這是業務規則。**

如果需要刪除，應該：
1. 管理員先退回審核
2. 使用者再清除

---

#### Q4：清除後前端狀態要怎麼處理？
**A：頁面自己負責重置狀態。**

Hook 只負責刪除後端資料，前端狀態由呼叫方重置：

```typescript
await clear({ ... })

// 清除成功後，重置所有狀態
setCurrentEntryId(null)
setFormData(initialState)
setFiles([])
setMemoryFiles([])
```

---

## useGhostFileCleaner - 幽靈檔案清理

### 功能說明

處理**幽靈檔案**問題：資料庫有記錄，但 Supabase Storage 實體檔案不存在（404）。

**核心功能：**
- ✅ 驗證檔案是否存在於 Storage
- ✅ 自動刪除幽靈檔案的資料庫記錄
- ✅ 回傳有效檔案清單
- ✅ 防止頁面因 404 錯誤崩潰

---

### API 定義

```typescript
const {
  cleanFiles    // 清理函式（function）
} = useGhostFileCleaner()
```

---

### 回傳值說明

#### `cleanFiles(files: EvidenceFile[]): Promise<EvidenceFile[]>`

**說明：** 驗證並清理檔案清單

**參數：**
- `files` - 從資料庫載入的檔案清單（可能包含幽靈檔案）

**回傳：**
- `Promise<EvidenceFile[]>` - 只包含有效檔案的清單

**行為：**
1. 遍歷每個檔案
2. 呼叫 `getFileUrl(file.file_path)` 驗證存在性
3. 如果成功 → 檔案有效，加入回傳清單
4. 如果 404 → 幽靈檔案，從資料庫刪除記錄
5. 回傳只包含有效檔案的清單

**範例：**
```typescript
const { cleanFiles } = useGhostFileCleaner()

useEffect(() => {
  if (loadedFiles.length > 0) {
    const cleanup = async () => {
      // 清理幽靈檔案
      const validFiles = await cleanFiles(loadedFiles)

      // 使用有效檔案更新狀態
      setMyFiles(validFiles)
    }
    cleanup()
  }
}, [loadedFiles])
```

---

### 何時使用

**使用時機：** 在 `useEnergyData` 載入檔案後

**典型流程：**
```typescript
// 1. 載入資料
const { files: loadedFiles } = useEnergyData(pageKey, year)

// 2. 清理幽靈檔案
const { cleanFiles } = useGhostFileCleaner()

useEffect(() => {
  if (loadedFiles.length > 0) {
    const cleanup = async () => {
      const validFiles = await cleanFiles(loadedFiles)
      // 3. 使用有效檔案...
    }
    cleanup()
  }
}, [loadedFiles])
```

---

### 內部行為

```typescript
1. 接收檔案清單：files: EvidenceFile[]

2. 初始化：const validFiles = []

3. 遍歷驗證：
   for (const file of files) {
     try {
       await getFileUrl(file.file_path)  // 驗證檔案存在
       validFiles.push(file)              // 有效 → 保留
     } catch (error) {
       if (error.message.includes('404')) {
         // 幽靈檔案 → 刪除資料庫記錄
         await supabase
           .from('entry_files')
           .delete()
           .eq('id', file.id)

         console.log(`🗑️ Deleted ghost file: ${file.id}`)
       }
     }
   }

4. 回傳有效檔案：return validFiles
```

---

### 常見問題

#### Q1：為什麼需要這個 Hook？
**A：防止幽靈檔案導致頁面崩潰**

**場景：**
1. 使用者上傳檔案並提交 → Supabase Storage 有檔案
2. 系統維護清理 Storage → 檔案被刪除
3. 資料庫記錄還在 → 形成幽靈檔案
4. 使用者重新載入頁面 → `getFileUrl` 回傳 404 → 頁面崩潰

**有了這個 Hook：**
- 載入時自動檢測幽靈檔案
- 刪除無效記錄
- 頁面正常運作

---

#### Q2：為什麼是 Hook 而不是純函式？
**A：未來可能需要擴充功能**

**Linus 的判斷：**
- 可能需要加入 loading 狀態
- 可能需要批次刪除優化
- 可能需要重試機制
- Hook 可以無痛擴充，純函式會很麻煩

---

#### Q3：何時執行清理？
**A：在載入檔案之後，使用檔案之前**

```typescript
❌ 不在上傳時：
   上傳時檔案還沒到 Supabase，沒有幽靈檔案

✅ 在載入時：
   useEnergyData 從資料庫載入後，必須立即驗證
```

---

#### Q4：會影響效能嗎？
**A：影響很小，且只在有檔案時執行**

- 只有 `loadedFiles.length > 0` 時才執行
- 驗證是並行的（可優化為 Promise.all）
- 刪除失敗不影響主流程
- 使用者感覺不到延遲

---

#### Q5：所有頁面都要用嗎？
**A：是的，14 個能源頁面都需要**

**實作狀態：**
- ✅ DieselPage：已整合
- ⏳ 其他 12 頁：待整合

---

---

## useRecordFileMapping - 多記錄檔案映射

### 功能說明

解決多記錄頁面的檔案關聯問題：**用穩定 recordId 取代不穩定的陣列索引**，防止刪除/新增記錄時檔案錯位。

**適用頁面：**
- FireExtinguisherPage（滅火器清單）- 最嚴重（新增在前面）
- DieselPage（12 個月記錄）
- UreaPage（12 個月記錄）
- DieselGeneratorPage（發電機清單）

**核心功能：**
- ✅ 上傳檔案時用 recordId 關聯（不是 recordIndex）
- ✅ 查詢檔案時用 fileMapping（不受索引偏移影響）
- ✅ 存儲 fileMapping 到 payload（重新載入時還原）
- ✅ 完整測試覆蓋（25 個測試案例）

---

### 問題背景

**舊做法（錯誤）：**
```typescript
// 上傳時
recordIndex: 0, 1, 2  // 用陣列索引關聯

// 刪除中間記錄後
records = [A, C]  // 索引變成 [0, 1]
files = [fileA, fileB, fileC]  // 索引還是 [0, 1, 2]
結果：C 拿到 B 的檔案（索引 1 對到舊的索引 1）❌
```

**新做法（正確）：**
```typescript
// 上傳時
recordId: "fire_1", "fire_2", "fire_3"  // 用穩定 ID
fileMapping: {
  "fire_1": ["file-uuid-1"],
  "fire_2": ["file-uuid-2"],
  "fire_3": ["file-uuid-3"]
}

// 刪除中間記錄後
fileMapping: {
  "fire_1": ["file-uuid-1"],
  "fire_3": ["file-uuid-3"]  // fire_2 已移除
}
結果：fire_3 拿到自己的檔案 ✅
```

---

### API 定義

```typescript
const {
  uploadRecordFiles,            // 上傳記錄檔案（function）
  getRecordFiles,               // 取得記錄檔案（function）
  loadFileMapping,              // 載入映射表（function）
  getFileMappingForPayload,     // 取得要存入 payload 的映射表（function）
  removeRecordMapping,          // 刪除記錄映射（function）
  fileMapping                   // 當前映射表狀態（object）
} = useRecordFileMapping(pageKey, entryId)
```

---

### 參數說明

#### `pageKey: string`
- **說明**：頁面識別碼
- **範例**：`'fire_extinguisher'`, `'diesel'`
- **必填**：是

#### `entryId: string | null`
- **說明**：Entry ID（用於上傳檔案）
- **何時為 null**：尚未提交過資料
- **必填**：是（null 時無法上傳，但其他功能正常）

---

### 回傳值說明

#### `uploadRecordFiles(recordId, files): Promise<void>`
- **說明**：上傳記錄的檔案並更新映射表
- **參數**：
  - `recordId: string` - 記錄的穩定 ID
  - `files: MemoryFile[]` - 要上傳的記憶體檔案
- **行為**：
  1. 批次上傳檔案到 Storage（使用 `uploadEvidenceWithEntry`）
  2. 收集上傳後的檔案 ID
  3. 更新 fileMapping（累積，不覆蓋）

**範例：**
```typescript
await uploadRecordFiles("fire_1", record.memoryFiles)
```

#### `getRecordFiles(recordId, allFiles): EvidenceFile[]`
- **說明**：取得屬於某記錄的檔案
- **參數**：
  - `recordId: string` - 記錄的穩定 ID
  - `allFiles: EvidenceFile[]` - 所有檔案（從 useEnergyData 取得）
- **回傳**：屬於這個記錄的檔案陣列

**範例：**
```typescript
const recordFiles = getRecordFiles(record.id, allFiles)
```

#### `loadFileMapping(payload): void`
- **說明**：從 payload 載入 fileMapping
- **參數**：`payload: any` - entry.payload（從 useEnergyData 取得）
- **用途**：重新進入頁面時還原映射表

**範例：**
```typescript
useEffect(() => {
  if (entry?.payload) {
    loadFileMapping(entry.payload.fireExtinguisherData)
  }
}, [entry])
```

#### `getFileMappingForPayload(): FileMapping`
- **說明**：取得要存入 payload 的映射表
- **回傳**：當前的 fileMapping
- **用途**：提交時存入 extraPayload

**範例：**
```typescript
payload: {
  records: data.records,
  fileMapping: getFileMappingForPayload()  // ⭐ 存入映射表
}
```

#### `removeRecordMapping(recordId): void`
- **說明**：刪除記錄的映射
- **參數**：`recordId: string` - 要刪除的記錄 ID
- **用途**：刪除記錄時清理映射表

**範例：**
```typescript
const handleDeleteRecord = (recordId: string) => {
  setData(prev => ({
    records: prev.records.filter(r => r.id !== recordId)
  }))
  removeRecordMapping(recordId)  // ⭐ 清理映射
}
```

#### `fileMapping: FileMapping`
- **說明**：當前映射表狀態
- **型別**：`Record<string, string[]>` - recordId → fileIds[]
- **用途**：調試、顯示

---

### 完整使用範例（FireExtinguisherPage）

```typescript
import { useRecordFileMapping } from '@/hooks/useRecordFileMapping'

export default function FireExtinguisherPage() {
  const pageKey = 'fire_extinguisher'

  // Hook: 資料載入
  const { entry, files } = useEnergyData(pageKey, year)

  // Hook: 檔案映射 ⭐
  const {
    uploadRecordFiles,
    getRecordFiles,
    loadFileMapping,
    getFileMappingForPayload,
    removeRecordMapping
  } = useRecordFileMapping(pageKey, entry?.id || null)

  // 本地狀態
  const [data, setData] = useState({ records: [] })

  // 1. 載入時還原映射表
  useEffect(() => {
    if (entry?.payload) {
      loadFileMapping(entry.payload.fireExtinguisherData)
      setData(entry.payload.fireExtinguisherData)
    }
  }, [entry])

  // 2. 顯示檔案時使用
  {data.records.map((record) => {
    const recordFiles = getRecordFiles(record.id, files)  // ⭐ 用 ID 查詢

    return (
      <div key={record.id}>
        <h3>{record.equipmentType}</h3>
        {recordFiles.map(file => (
          <FileCard key={file.id} file={file} />
        ))}
      </div>
    )
  })}

  // 3. 提交時上傳和存儲
  const handleSubmit = async () => {
    // 上傳每筆記錄的檔案
    for (const record of data.records) {
      if (record.memoryFiles?.length > 0) {
        await uploadRecordFiles(record.id, record.memoryFiles)  // ⭐ 用 ID 上傳
      }
    }

    // 提交時存入 payload
    await upsertEnergyEntry({
      page_key: pageKey,
      period_year: year,
      extraPayload: {
        fireExtinguisherData: {
          records: data.records,
          fileMapping: getFileMappingForPayload()  // ⭐ 存入映射表
        }
      }
    })
  }

  // 4. 刪除記錄時清理映射
  const handleDeleteRecord = (recordId: string) => {
    setData(prev => ({
      records: prev.records.filter(r => r.id !== recordId)
    }))
    removeRecordMapping(recordId)  // ⭐ 清理映射
  }
}
```

---

### 測試覆蓋

✅ **25 個測試案例全部通過**

**測試分類：**
- 基本功能（6 個）：初始化、上傳、取得、載入、存檔、刪除
- 檔案關聯（4 個）：recordId 關聯、一對多、過濾、空檔案
- **真實場景（4 個）**：刪除中間記錄、新增在前面、重新載入、混合操作 ⭐ 最關鍵
- 向後相容（2 個）：舊資料處理、警告訊息
- 錯誤處理（3 個）：null entryId、上傳失敗、空陣列
- 邊界情況（3 個）：大量記錄（100 筆）、大量檔案（10 個/筆）、累積檔案
- Bug 防護（3 個）：檔案錯位防護測試

**執行結果：**
```
✅ Test Files: 1 passed (1)
✅ Tests: 25 passed (25)
⏱️ Duration: 2.02s
```

---

### 常見問題

#### Q1：為什麼需要這個 Hook？
**A：防止檔案與記錄錯位**

**真實 Bug 案例：**
1. 使用者新增 3 筆滅火器記錄（A, B, C）
2. 各上傳 1 個銘牌照片
3. 刪除中間記錄 B
4. 重新提交
5. **結果：C 的照片變成 B 的照片** ❌

**根本原因：** 使用陣列索引關聯，刪除後索引偏移

---

#### Q2：所有多記錄頁面都要用嗎？
**A：是的，4 個多記錄頁面都需要**

**實作狀態：**
- ⏳ FireExtinguisherPage：進行中
- ⏳ DieselPage：待修改
- ⏳ UreaPage：待修改
- ⏳ DieselGeneratorPage：待修改

---

#### Q3：舊資料沒有 fileMapping 怎麼辦？
**A：向後相容，會顯示警告**

```typescript
loadFileMapping(payload)
// 如果 payload 沒有 fileMapping：
// ⚠️ [useRecordFileMapping] payload 中沒有 fileMapping（舊資料格式）
// fileMapping 設為 {}
```

---

#### Q4：fileMapping 存在哪裡？
**A：存在 entry.payload 中**

```typescript
// 提交時
payload: {
  records: [...],
  fileMapping: {
    "fire_1": ["file-uuid-1"],
    "fire_2": ["file-uuid-2"]
  }
}

// 重新載入時
if (entry?.payload?.fileMapping) {
  loadFileMapping(entry.payload)
}
```

---

## useReloadWithFileSync - Reload 同步延遲

### 功能說明

處理 **reload 後的檔案同步問題**：在 `reload()` 後加入延遲，確保 useEffect 有足夠時間處理載入的檔案，才清空 memoryFiles。

**核心功能：**
- ✅ 封裝 reload + 延遲邏輯
- ✅ 防止 memoryFiles 過早清空導致檔案消失
- ✅ 允許自訂延遲時間
- ✅ 清楚文件說明已知風險

**適用頁面：**
- WeldingRodPage（焊條）
- LPGPage（液化石油氣）
- WD40Page
- AcetylenePage（乙炔）
- 其他有月份檔案上傳的頁面

---

### 問題背景

**Bug 場景：**
```typescript
// 提交後
await reload()                  // ← reload 觸發異步載入
setMemoryFiles([])             // ← 立即清空，但 useEffect 還沒處理完
// 結果：UI 顯示空白（檔案消失）❌
```

**為什麼會這樣？**
```
T0:      reload() 觸發 → setFiles(loadedFiles)
T0:      useEffect 監聽到 loadedFiles 變化
T0:      開始執行 cleanAndAssignFiles() (異步)
T0:      cleanFiles() 驗證每個檔案是否存在
T0-800ms: 如果有幽靈檔案，等 800ms 重試 (useGhostFileCleaner)
T0:      ⚠️ setMemoryFiles([]) 立即執行 → UI 顯示空白
T800:     cleanFiles() 完成 → setMsdsFiles() / setMonthlyData() → 檔案回來了
```

**解決方案：**
```typescript
// 提交後
await reload()                  // ← reload 觸發異步載入
await delay(100ms)             // ← 等待 useEffect 處理完
setMemoryFiles([])             // ← 現在可以安全清空
// 結果：UI 正常顯示檔案 ✅
```

---

### API 定義

```typescript
const {
  reloadAndSync    // 包含延遲的 reload 函式（function）
} = useReloadWithFileSync(reloadFn, delayMs?)
```

---

### 參數說明

#### `reloadFn: () => Promise<void>`
- **說明**：useEnergyData 的 reload 函式
- **必填**：是

#### `delayMs?: number`
- **說明**：延遲時間（毫秒）
- **必填**：否
- **預設值**：100ms
- **何時調整**：
  - 大量檔案（>20 個）→ 建議 300ms
  - 少量檔案（<5 個）→ 預設 100ms 即可

---

### 回傳值說明

#### `reloadAndSync(): Promise<void>`
- **說明**：執行 reload 並等待同步完成
- **行為**：
  1. 呼叫 `reloadFn()` 重新載入資料
  2. 等待 `delayMs` 毫秒（預設 100ms）
  3. 回傳（允許後續清空 memoryFiles）

**範例：**
```typescript
// 提交成功後
await reloadAndSync()
setMsdsMemoryFiles([])
setMonthlyMemoryFiles([])
```

---

### 已知風險

#### 風險 A: useGhostFileCleaner 的 800ms 延遲

**問題：** `cleanFiles()` 可能需要 800ms（有幽靈檔案時）
**影響：** 我們的 100ms 延遲不夠等它完成
**緩解：** 實際上沒問題，因為 memoryFiles 和 serverFiles 分開管理

```typescript
// memoryFiles 清空不影響 serverFiles
await reloadAndSync()
setMemoryFiles([])  // ← 清空記憶體檔案

// serverFiles 會在 cleanFiles() 完成後正確更新
// UI 顯示的是 serverFiles，不會消失 ✅
```

#### 風險 B: 多個 useEffect 同時觸發

**問題：** 如果你的頁面有 useEffect 監聽 memoryFiles
**影響：** 清空後會觸發該 useEffect
**解決：** 確保你的 useEffect 邏輯能處理空陣列

```typescript
useEffect(() => {
  if (memoryFiles.length > 0) {
    // 只在有檔案時執行 ✅
  }
}, [memoryFiles])
```

#### 風險 C: useFileHandler 的衝突

**問題：** 不要同時呼叫 useFileHandler.refresh() 和 reload()
**解決：** 選擇其中一個作為 single source of truth

```typescript
❌ 錯誤：
await reloadAndSync()
await fileHandler.refresh()  // ← 衝突

✅ 正確：
await reloadAndSync()  // ← 只用一個
```

#### 風險 D: useRecordFileMapping 的衝突

**問題：** 不要在 reload 過程中呼叫 uploadRecordFiles()
**解決：** 等 reloadAndSync() 完成後再上傳

```typescript
❌ 錯誤：
await Promise.all([
  reloadAndSync(),
  uploadRecordFiles(...)  // ← 衝突
])

✅ 正確：
await reloadAndSync()
await uploadRecordFiles(...)  // ← 依序執行
```

---

### 使用範例

#### 範例 1：基本用法（WeldingRodPage）

```typescript
import { useEnergyData } from '@/hooks/useEnergyData'
import { useEnergySubmit } from '@/hooks/useEnergySubmit'
import { useReloadWithFileSync } from '@/hooks/useReloadWithFileSync'

function WeldingRodPage() {
  // 載入資料
  const { reload } = useEnergyData(pageKey, year)

  // 提交邏輯
  const { submit } = useEnergySubmit(pageKey, year)

  // ⭐ Reload 同步 Hook
  const { reloadAndSync } = useReloadWithFileSync(reload)

  const handleSubmit = async () => {
    // 提交
    await submit({ ... })

    // ⭐ 使用 reloadAndSync 取代原本的 reload
    await reloadAndSync()

    // 現在可以安全清空
    setMsdsMemoryFiles([])
    setMonthlyMemoryFiles([])
  }
}
```

#### 範例 2：自訂延遲時間（大量檔案）

```typescript
// 如果頁面有大量檔案（>20 個），可能需要更長延遲
const { reloadAndSync } = useReloadWithFileSync(reload, 300)  // 300ms

await reloadAndSync()
setMemoryFiles([])
```

---

### 常見問題

#### Q1：為什麼不直接在 useEnergyData 裡面加延遲？
**A：違反單一職責原則**

`useEnergyData` 只負責載入資料，不應該知道頁面如何使用這些資料。

```typescript
✅ 好的設計：
useEnergyData → 載入
useReloadWithFileSync → 同步延遲
頁面 → 清空 memoryFiles

❌ 壞的設計：
useEnergyData → 載入 + 延遲 + 猜測頁面需求
```

---

#### Q2：100ms 夠嗎？
**A：對大部分頁面夠**

- React 的 render cycle 通常 < 50ms
- useEffect 處理檔案 < 50ms
- 100ms 是保守值

**何時不夠：**
- 大量檔案（>20 個）
- useGhostFileCleaner 遇到幽靈檔案（需 800ms）
- 但這通常不影響功能（serverFiles 最終會正確）

**解決方法：**
```typescript
const { reloadAndSync } = useReloadWithFileSync(reload, 300)  // 調高延遲
```

---

#### Q3：這是好的設計嗎？
**A：不是，這是「修補設計缺陷」**

**真正的問題：** memoryFiles 和 serverFiles 是兩個獨立狀態，需要手動同步。

**根本解決：** 統一管理檔案狀態，消除手動同步需求。

**為什麼不現在做：**
- 需要重構整個檔案管理系統
- 影響 14 個頁面
- 風險太高

**當前方案：** 先用 Hook 緩解問題，等專案穩定後再重構。

---

#### Q4：所有頁面都要用嗎？
**A：所有有月份檔案上傳的頁面都需要**

**實作狀態：**
- ✅ WeldingRodPage（焊條）
- ✅ LPGPage（液化石油氣）
- ✅ WD40Page
- ✅ AcetylenePage（乙炔）
- ⏳ 其他頁面：按需遷移

---

#### Q5：會影響效能嗎？
**A：影響極小**

- 延遲只有 100ms
- 只在提交後執行一次
- 使用者感覺不到

---

## useAdminSave - 管理員審核儲存

### 功能說明

專門處理管理員在審核模式下的編輯與儲存功能。

**核心功能：**
- ✅ 更新 entry 資料（unit, amount, payload）
- ✅ 批次上傳檔案到 Storage
- ✅ 完整錯誤處理
- ✅ 統一 15 個能源頁面的儲存邏輯

**適用場景：**
- 管理員進入審核模式（URL: `?mode=review&entryId=xxx`）
- 編輯使用者提交的資料
- 上傳新檔案或修改現有資料
- 儲存後繼續留在頁面（不改變審核狀態）

**與其他 Hook 的差異：**

| | useAdminSave | useEnergyReview | useEnergySubmit |
|---|--------------|-----------------|-----------------|
| 職責 | 編輯並儲存 | 審核決策 | 使用者提交 |
| 使用者 | 管理員 | 管理員 | 一般使用者 |
| 操作次數 | 多次 | 一次 | 一次 |
| 執行後 | 留在頁面 | 離開頁面 | 留在頁面 |
| 狀態變更 | 不改 status | 改為 approved/rejected | 改為 submitted |

---

### API 定義

```typescript
const {
  save,              // 儲存函式（function）
  saving,            // 是否儲存中（boolean）
  error,             // 錯誤訊息（string | null）
  clearError         // 清除錯誤訊息（function）
} = useAdminSave(pageKey, reviewEntryId)
```

---

### 參數說明

#### `pageKey: string`
- **說明**：能源類別識別碼
- **範例**：`'electricity'`, `'diesel'`, `'wd40'`
- **必填**：是

#### `reviewEntryId: string | null`
- **說明**：審核模式下的 entry ID
- **來源**：從 URL 取得 `?entryId=xxx`
- **必填**：是（null 時無法儲存，會拋錯）

---

### 回傳值說明

#### `save(params: AdminSaveParams): Promise<void>`

**說明：** 儲存管理員編輯的資料

**參數：**
```typescript
{
  updateData: {
    unit: string           // 單位（如 'kWh', 'L', 'kg'）
    amount: number         // 總量
    payload: any          // 完整的 payload 資料
  },
  files: Array<{
    file: File             // 要上傳的檔案
    metadata: {
      recordIndex?: number    // 記錄索引（表格式頁面）
      month?: number          // 月份（月份式頁面）
      fileType: 'msds' | 'usage_evidence' | 'other'
    }
  }>
}
```

**行為：**
1. 檢查 `reviewEntryId` 存在
2. 呼叫 `supabase.update()` 更新資料庫
3. 批次上傳 `files` 陣列中的檔案
4. 部分檔案上傳失敗不中斷流程（只記 log）
5. 成功或失敗後更新 `saving` 狀態

**範例：**
```typescript
await save({
  updateData: {
    unit: 'kWh',
    amount: 1000,
    payload: {
      monthly: { '1': 100, '2': 200, ... },
      billData: [...],
      meters: [...],
      notes: '備註'
    }
  },
  files: bills.flatMap((bill, i) =>
    (billMemoryFiles[bill.id] || []).map(mf => ({
      file: mf.file,
      metadata: { recordIndex: i, fileType: 'usage_evidence' }
    }))
  )
})
```

#### `saving: boolean`
- **說明**：是否正在儲存
- **用途**：禁用按鈕、顯示 loading

**範例：**
```typescript
<button onClick={handleSave} disabled={saving}>
  {saving ? '儲存中...' : '儲存'}
</button>
```

#### `error: string | null`
- **說明**：錯誤訊息
- **何時有值**：儲存失敗時
- **用途**：顯示錯誤 Toast

**範例：**
```typescript
{error && (
  <Toast message={error} type="error" onClose={clearError} />
)}
```

#### `clearError(): void`
- **說明**：清除錯誤訊息
- **用途**：關閉錯誤 Toast

---

### 使用範例

#### 範例 1：電力頁面（帳單式）

```typescript
import { useAdminSave } from '@/hooks/useAdminSave'

export default function ElectricityBillPage() {
  const [searchParams] = useSearchParams()
  const reviewEntryId = searchParams.get('entryId')
  const isReviewMode = searchParams.get('mode') === 'review'

  // 使用 Hook
  const { save: adminSave, saving: adminSaving } = useAdminSave('electricity', reviewEntryId)

  const handleSave = async () => {
    if (!isReviewMode || !reviewEntryId) return

    const totalAmount = Object.values(monthly).reduce((sum, val) => sum + val, 0)

    await adminSave({
      updateData: {
        unit: 'kWh',
        amount: totalAmount,
        payload: {
          monthly,
          billData,
          meters,
          notes: `外購電力用量填報 - ${bills.length}筆繳費單`
        }
      },
      files: bills.flatMap((bill, i) =>
        (billMemoryFiles[bill.id] || []).map(mf => ({
          file: mf.file,
          metadata: { recordIndex: i, fileType: 'usage_evidence' }
        }))
      )
    })

    // 儲存成功後 reload
    await reload()
    reloadApprovalStatus()
    setToast({ message: '✅ 儲存成功！', type: 'success' })
  }
}
```

#### 範例 2：柴油頁面（表格式）

```typescript
const { save: adminSave } = useAdminSave('diesel', reviewEntryId)

const handleSave = async () => {
  const totalQuantity = dieselData.reduce((sum, r) => sum + r.quantity, 0)

  await adminSave({
    updateData: {
      unit: 'L',
      amount: totalQuantity,
      payload: {
        dieselData: cleanedDieselData,
        fileMapping: getFileMappingForPayload()
      }
    },
    files: dieselData.flatMap(record =>
      (recordFileMapping[record.id] || []).map(mf => ({
        file: mf.file,
        metadata: { recordIndex: record.id, fileType: 'usage_evidence' }
      }))
    )
  })

  await reload()
  setSuccess('✅ 儲存成功！')
}
```

#### 範例 3：WD40 頁面（月份式）

```typescript
const { save: adminSave } = useAdminSave('wd40', reviewEntryId)

const handleSave = async () => {
  const totalAmount = monthlyData.reduce((sum, m) => sum + m.usage, 0)

  await adminSave({
    updateData: {
      unit: 'ML',
      amount: totalAmount,
      payload: {
        unitCapacity,
        carbonRate,
        monthly: monthlyData.reduce((acc, m, i) => {
          acc[i + 1] = m.usage
          return acc
        }, {} as Record<string, number>),
        monthlyQuantity: monthlyData.reduce((acc, m, i) => {
          acc[i + 1] = m.quantity
          return acc
        }, {} as Record<string, number>)
      }
    },
    files: [
      ...msdsMemoryFiles.map(mf => ({
        file: mf.file,
        metadata: { fileType: 'msds' as const }
      })),
      ...monthlyMemoryFiles.flatMap((files, month) =>
        files.map(mf => ({
          file: mf.file,
          metadata: { month: month + 1, fileType: 'usage_evidence' as const }
        }))
      )
    ]
  })

  await reload()
  setToast('✅ 儲存成功！')
}
```

---

### 常見問題

#### Q1：為什麼需要單獨的 Hook？

**A：避免 15 個頁面重複寫 50 行程式碼**

**沒有 Hook：**
```typescript
// 每個頁面都要寫這 50 行
if (isReviewMode && reviewEntryId) {
  await supabase.update(...)
  for (const file of files) {
    await uploadEvidenceWithEntry(...)
  }
  await reload()
  setToast('成功')
}
```

**有了 Hook：**
```typescript
// 只要 15 行
await adminSave({ updateData, files })
await reload()
setToast('成功')
```

---

#### Q2：與 useEnergyReview 的關係？

**A：職責分離，但常一起使用**

```typescript
// 檢測審核模式
const { isReviewing } = useEnergyReview()

// 儲存編輯
const { save } = useAdminSave(pageKey, reviewEntryId)

// 審核決策
const { approve, reject } = useEnergyReview()
```

- `useEnergyReview`：檢測模式、通過/退件（改狀態、離開頁面）
- `useAdminSave`：編輯儲存（不改狀態、留在頁面）

---

#### Q3：為什麼不在 hook 內處理 reload？

**A：不同頁面的 reload 邏輯不同**

```typescript
// 電力頁面
await adminSave(...)
await reload()              // useEnergyData 的 reload
reloadApprovalStatus()      // useApprovalStatus 的 reload

// 柴油頁面
await adminSave(...)
await reload()              // 可能還要重新計算檔案映射
updateFileMapping()
```

Hook 只負責核心儲存邏輯，reload 由呼叫方決定。

---

#### Q4：檔案上傳失敗怎麼辦？

**A：部分失敗不中斷流程**

```typescript
// Hook 內部
for (const { file, metadata } of params.files) {
  try {
    await uploadEvidenceWithEntry(...)
  } catch (uploadError) {
    console.error('⚠️ File upload failed:', uploadError)
    // 只記 log，繼續上傳其他檔案
  }
}
```

- 資料庫更新失敗 → 拋錯，整個流程中斷
- 檔案上傳失敗 → 記 log，繼續其他檔案

---

#### Q5：需要遷移所有 15 個頁面嗎？

**A：是的，但可以漸進式遷移**

**優先級：**
- P0：ElectricityBillPage（已完成）- 驗證 API 可用
- P1：表格式頁面（7 個）- DieselPage, UreaPage, GasolinePage...
- P2：月份式頁面（5 個）- WD40Page, AcetylenePage, LPGPage...
- P3：特殊頁面（2 個）- SepticTankPage, CommuteePage

**遷移狀態：**
- ✅ ElectricityBillPage（外購電力）
- ⏳ 其他 14 個頁面

---

## 版本歷史

| 版本 | 日期 | 變更內容 |
|------|------|---------|
| v1.0 | 2025-01-01 | 初版，包含 `useEnergyData`、`useEnergySubmit` |
| v1.1 | 2025-01-03 | 新增 `useEnergyClear` |
| v1.2 | 2025-01-08 | 新增 `useGhostFileCleaner` - 幽靈檔案清理機制 |
| v1.3 | 2025-10-13 | 新增 `useRecordFileMapping` - 多記錄檔案映射機制（TDD 完成，25 測試通過）|
| v1.4 | 2025-10-16 | 新增 `useReloadWithFileSync` - Reload 同步延遲機制（解決檔案消失 Bug，4 頁面已遷移）|
| v1.5 | 2025-10-16 | 新增 `useMultiRecordSubmit` - 多記錄提交 Hook（統一暫存功能，4 個多記錄頁面已遷移）|
| v1.6 | 2025-10-23 | 新增 `useAdminSave` - 管理員審核儲存 Hook（統一 15 個頁面的管理員儲存邏輯，ElectricityBillPage 已遷移）|

---

**相關文件：**
- [重構計畫](./REFACTORING_PLAN.md)
- [工作流程](./WORKFLOW.md)
- [重構日誌](./REFACTORING_LOG.md)
- [共用組件說明](./COMPONENTS.md)（待撰寫）
- [遷移指南](./MIGRATION_GUIDE.md)（待撰寫）