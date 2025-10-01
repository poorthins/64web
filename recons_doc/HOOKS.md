# 能源填報系統 Hook 使用說明

## 📋 文件資訊

- **文件版本**：v1.0
- **建立日期**：2025-01-01
- **適用範圍**：14 個能源類別頁面
- **相關文件**：REFACTORING_PLAN.md, WORKFLOW.md

---

## 📚 目錄

1. [Hook 總覽](#hook-總覽)
2. [useEnergyPage - 使用者填報](#useenergypage---使用者填報)
3. [useEnergyReview - 管理員審核](#useenergyreview---管理員審核)
4. [型別定義](#型別定義)
5. [完整使用範例](#完整使用範例)
6. [常見問題](#常見問題)

---

## Hook 總覽

能源填報系統提供 **2 個核心 Hook**，分別對應兩種使用場景：

| Hook | 使用場景 | 核心功能 |
|------|---------|---------|
| `useEnergyPage` | 使用者填報 | 資料載入、檔案管理、提交、清除 |
| `useEnergyReview` | 管理員審核 | 檢測審核模式、載入待審資料、通過/退件 |

### 設計原則

**1. 一個場景 = 一個 Hook**
- 使用者填報的所有功能都在 `useEnergyPage`
- 管理員審核的所有功能都在 `useEnergyReview`
- 兩個場景互不干擾

**2. 簡單易用**
- 最少的參數
- 清晰的回傳值
- 自動處理複雜邏輯

**3. 錯誤處理**
- Hook 內部處理錯誤
- 回傳友善的錯誤訊息
- 不會讓頁面崩潰

---

## useEnergyPage - 使用者填報

### 功能說明

這個 Hook 處理使用者填報的**所有功能**：
- ✅ 載入舊資料（重新進入頁面時）
- ✅ 檔案管理（上傳、刪除、記憶體暫存）
- ✅ 提交填報（資料 + 檔案一起提交）
- ✅ 清除資料（刪除資料庫記錄和檔案）

---

### API 定義

```typescript
const {
  // === 資料載入 ===
  entry,              // 現有記錄（EnergyEntry | null）
  loading,            // 是否載入中（boolean）
  
  // === 檔案管理 ===
  files,              // 已上傳的檔案（EvidenceFile[]）
  memoryFiles,        // 記憶體檔案（MemoryFile[]）
  addMemoryFile,      // 新增記憶體檔案（function）
  removeMemoryFile,   // 移除記憶體檔案（function）
  deleteFile,         // 刪除已上傳檔案（function）
  
  // === 提交 ===
  submit,             // 提交函式（function）
  submitting,         // 是否提交中（boolean）
  
  // === 清除 ===
  clear,              // 清除函式（function）
  clearing,           // 是否清除中（boolean）
  
  // === 訊息 ===
  error,              // 錯誤訊息（string | null）
  success,            // 成功訊息（string | null）
  clearError,         // 清除錯誤訊息（function）
  clearSuccess        // 清除成功訊息（function）
  
} = useEnergyPage(pageKey, year)
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
  console.log(file.category)       // msds 或 usage_evidence
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
  3. 上傳 msdsFiles（category='msds'）
  4. 上傳 monthlyFiles（category='usage_evidence', month=1~12）
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
   - 呼叫 uploadEvidenceWithEntry(file, { entryId, pageKey, year, category })
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
  category: 'msds' | 'usage_evidence'  // 檔案類別
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
  category: 'msds' | 'usage_evidence'  // 檔案類別
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

## 版本歷史

| 版本 | 日期 | 變更內容 |
|------|------|---------|
| v1.0 | 2025-01-01 | 初版，包含 2 個核心 Hook |

---

**相關文件：**
- [重構計畫](./REFACTORING_PLAN.md)
- [工作流程](./WORKFLOW.md)
- [共用組件說明](./COMPONENTS.md)（待撰寫）
- [遷移指南](./MIGRATION_GUIDE.md)（待撰寫）