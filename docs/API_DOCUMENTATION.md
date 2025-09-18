# API 文檔 - 碳足跡盤查系統

---
title: API 文檔
version: 2.1
last_updated: 2025-09-16
author: System Documentation
---

## 概覽

本文檔描述碳足跡盤查系統的所有 API 端點和函數。系統基於 Supabase 構建，使用 Row Level Security (RLS) 政策確保資料安全。

## 變更摘要
- 移除 draft 狀態相關 API
- 新增檔案編輯功能 API
- 增強錯誤處理機制
- 更新認證診斷工具
- 新增用戶個人化配置系統 (filling_config)
- 支援柴油發電機記錄模式設定
- 新增首頁狀態篩選和項目管理 API

## 認證系統

### 基礎認證 API

#### validateAuth()
統一的認證檢查函數，使用 getSession 確保一致性。

```typescript
interface AuthResult {
  user: User | null
  session: Session | null
  error: Error | null
}

function validateAuth(): Promise<AuthResult>
```

**功能**：
- 檢查當前 session 有效性
- 自動刷新過期 token
- 提供詳細診斷資訊

**回傳值**：
- `user`: Supabase User 對象或 null
- `session`: Supabase Session 對象或 null
- `error`: 錯誤對象或 null

**錯誤處理**：
- Session 過期自動嘗試刷新
- 診斷模式下提供詳細日誌
- RLS 錯誤分析

#### isUserAuthenticated()
快速檢查用戶是否已登入（不包含刷新邏輯）。

```typescript
function isUserAuthenticated(): Promise<boolean>
```

#### isAdmin()
檢查用戶是否為管理員。

```typescript
function isAdmin(): Promise<boolean>
```

**實現**：呼叫資料庫中的 `is_admin()` 函數

### 錯誤分析

#### analyzeRLSError()
分析錯誤是否為 RLS 相關錯誤。

```typescript
interface RLSError {
  isRLSError: boolean
  message: string
  code?: string
  table?: string
  operation?: 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE'
  suggestion?: string
}

function analyzeRLSError(error: any): RLSError
```

## 能源記錄 API

### 核心 API 函數 (entries.ts)

#### upsertEnergyEntry()
新增或更新能源填報記錄。

```typescript
interface UpsertEntryInput {
  page_key: string        // 能源類別識別
  period_year: number     // 填報年份
  unit: string           // 使用量單位
  monthly: Record<string, number>  // 月度資料
  notes?: string         // 備註
}

interface UpsertEntryResult {
  entry_id: string
}

function upsertEnergyEntry(
  input: UpsertEntryInput, 
  preserveStatus: boolean = false
): Promise<UpsertEntryResult>
```

**業務邏輯**：
- 計算月度總使用量
- 總使用量必須大於 0
- 自動推斷類別名稱和 scope
- 永遠設為 'submitted' 狀態（草稿功能已移除）
- 支援既有記錄更新

**錯誤處理**：
- 使用量驗證
- RLS 政策檢查
- 類別對應驗證

#### getUserEntries()
取得使用者的能源填報記錄。

```typescript
function getUserEntries(
  pageKey?: string, 
  year?: number
): Promise<EnergyEntry[]>
```

**參數**：
- `pageKey`: 選填，篩選特定能源類別
- `year`: 選填，篩選特定年份

#### getEntryByPageKeyAndYear()
根據頁面鍵值和年份取得特定記錄。

```typescript
function getEntryByPageKeyAndYear(
  pageKey: string, 
  year: number
): Promise<EnergyEntry | null>
```

#### updateEntryStatus()
更新能源填報記錄的狀態（管理員功能）。

```typescript
function updateEntryStatus(
  entryId: string, 
  status: 'submitted' | 'approved' | 'rejected'
): Promise<void>
```

#### deleteEnergyEntry()
刪除能源填報記錄。

```typescript
function deleteEnergyEntry(entryId: string): Promise<void>
```

**安全性**：確保只能刪除自己的記錄（RLS 政策）

### 資料驗證

#### sumMonthly()
計算每月數值的總和。

```typescript
function sumMonthly(monthly: Record<string, number>): number
```

#### validateMonthlyData()
驗證每月數據格式。

```typescript
interface ValidationResult {
  valid: boolean
  errors: string[]
}

function validateMonthlyData(
  monthly: Record<string, number>
): ValidationResult
```

## 檔案管理 API

### 核心檔案 API (files.ts)

#### uploadEvidence()
上傳佐證檔案到 Supabase Storage。

```typescript
interface EvidenceFile {
  id: string
  file_path: string
  file_name: string
  mime_type: string
  file_size: number
  page_key: string
  month?: number
  entry_id?: string      // 新增：支援 NULL（暫存檔案）
  created_at: string
}

function uploadEvidence(
  file: File,
  pageKey: string,
  month?: number,
  kind: 'msds' | 'usage_evidence' = 'usage_evidence'
): Promise<EvidenceFile>
```

**功能**：
- 檔案上傳至 Supabase Storage
- 記錄到 entry_files 表
- 支援暫存檔案（entry_id 為 NULL）

#### getEntryFiles() 🆕
取得特定能源記錄的相關檔案。

```typescript
function getEntryFiles(entryId: string): Promise<EvidenceFile[]>
```

**新功能**：支援檔案編輯功能的核心 API

#### deleteEvidenceFile() 🆕
刪除佐證檔案。

```typescript
function deleteEvidenceFile(fileId: string): Promise<void>
```

**功能**：
- 從 Storage 刪除檔案
- 從資料庫移除記錄
- 權限檢查（只能刪除自己的檔案）

#### updateFileEntryAssociation() 🆕
更新檔案與記錄的關聯。

```typescript
function updateFileEntryAssociation(
  fileId: string, 
  entryId: string
): Promise<void>
```

**用途**：檔案編輯功能中重新關聯檔案

#### commitEvidence()
提交暫存檔案，關聯到能源記錄。

```typescript
interface CommitEvidenceParams {
  entryId: string
  pageKey: string
}

function commitEvidence(params: CommitEvidenceParams): Promise<void>
```

**錯誤恢復機制**：
- 使用 Promise.allSettled 處理批量操作
- 部分成功時的錯誤報告
- 自動重試機制

#### listEvidence()
取得佐證檔案列表。

```typescript
function listEvidence(
  pageKey: string, 
  month?: number,
  kind?: 'msds' | 'usage_evidence'
): Promise<EvidenceFile[]>
```

## 管理員 API

### 用戶管理 (adminUsers.ts)

#### listUsers()
取得所有用戶列表。

```typescript
interface UserProfile {
  id: string
  display_name: string
  role: string
  is_active: boolean
  email?: string
  company?: string
  job_title?: string
  phone?: string
}

function listUsers(): Promise<UserProfile[]>
```

#### 用戶配置結構

##### FillingConfig
用戶個人化填報設定，儲存為 JSONB 格式。

```typescript
interface FillingConfig {
  diesel_generator_mode: 'refuel' | 'test'  // 柴油發電機記錄模式
}
```

**功能說明**：
- `diesel_generator_mode`: 決定用戶在柴油發電機頁面的記錄類型
  - `refuel`: 加油記錄模式（記錄實際加油量）
  - `test`: 測試記錄模式（記錄測試耗油量）

**預設值**：`{ "diesel_generator_mode": "refuel" }`

**使用場景**：
- 管理員建立用戶時設定
- 影響前端頁面顯示和功能
- 未來可擴展其他類別的個人化設定

#### createUser() 🆕
建立新用戶帳號。

```typescript
interface CreateUserData {
  email: string
  password: string
  display_name: string
  company?: string
  job_title?: string
  phone?: string
  role?: string
  filling_config?: FillingConfig
}

function createUser(userData: CreateUserData): Promise<UserProfile>
```

**功能**：
- 在 auth.users 表中建立認證帳號
- 在 profiles 表中建立用戶資料
- 設定用戶個人化填報配置
- 支援事務性操作（失敗時自動回滾）

**預設值**：
- `role`: 'user'
- `filling_config`: `{ "diesel_generator_mode": "refuel" }`

#### combineUsersWithCounts()
結合用戶資料與填報統計。

```typescript
interface User {
  id: string
  display_name: string
  role: string
  is_active: boolean
  entries_count: number
}

function combineUsersWithCounts(): Promise<User[]>
```

### 提交管理 (adminSubmissions.ts)

#### getAllEntries()
取得所有用戶的填報記錄。

```typescript
function getAllEntries(): Promise<EnergyEntry[]>
```

#### getUserEntriesAdmin()
取得特定用戶的填報記錄。

```typescript
function getUserEntriesAdmin(userId: string): Promise<EnergyEntry[]>
```

### 統計資料 (adminMetrics.ts)

#### getSystemMetrics()
取得系統統計資料。

```typescript
interface SystemMetrics {
  totalUsers: number
  activeUsers: number
  totalEntries: number
  pendingEntries: number
  completionRate: number
}

function getSystemMetrics(): Promise<SystemMetrics>
```

## 工作台 API

### 進度統計

#### getReportingProgress()
取得填報進度總覽。

```typescript
interface ReportingProgressSummary {
  total: number           // 總項目數 (14)
  completed: number       // 已完成項目數
  byStatus: {
    submitted: number
    approved: number
    rejected: number
  }
  reportingPeriod: {
    startDate: string
    endDate: string
  } | null
}

function getReportingProgress(): Promise<ReportingProgressSummary>
```

#### getRejectedEntries()
取得被退回的項目。

```typescript
interface RejectedEntry {
  id: string
  pageKey: string
  title: string
  category: string
  reviewNotes: string
  updatedAt: string
}

function getRejectedEntries(): Promise<RejectedEntry[]>
```

#### getPendingEntries()
取得待填寫項目。

```typescript
interface PendingEntry {
  pageKey: string
  title: string
  category: string
  scope: string
}

function getPendingEntries(): Promise<PendingEntry[]>
```

#### getRecentActivities()
取得最近活動記錄。

```typescript
interface RecentActivity {
  id: string
  type: string
  description: string
  timestamp: string
  status: string
}

function getRecentActivities(): Promise<RecentActivity[]>
```

#### getAllEntries()
取得所有能源項目及其填報狀態。

```typescript
interface AllEntry {
  pageKey: string           // 項目識別碼
  title: string            // 項目名稱
  category: string         // 範疇分類 (範疇一/範疇二/範疇三)
  scope: string           // 排放範圍描述
  status: 'pending' | 'submitted' | 'approved' | 'rejected' | null  // 項目狀態
  updatedAt?: string      // 最後更新時間
  rejectionReason?: string // 退回原因 (狀態為 rejected 時)
}

function getAllEntries(): Promise<AllEntry[]>
```

**功能**：
- 返回所有 14 個能源項目的完整資訊
- 包含項目當前填報狀態
- 提供篩選和顯示所需的完整資料
- 支援首頁狀態篩選功能

**使用場景**：
- 首頁項目列表顯示
- 狀態統計和篩選
- 項目進度追蹤

#### getRejectionReason()
取得特定項目的詳細退回資訊。

```typescript
interface RejectionDetail {
  reason: string          // 退回原因
  reviewer_notes: string  // 審核者備註
  rejected_at: string    // 退回時間
}

function getRejectionReason(entryId: string): Promise<RejectionDetail>
```

**功能**：
- 用於已退回項目的詳細資訊展開
- 支援異步載入退回原因
- 提供完整的審核回饋資訊

**參數**：
- `entryId`: 能源填報記錄的唯一識別碼

**使用場景**：
- 退回項目詳情展開
- 審核意見查看
- 修正指引顯示

## 類別常數系統

### categoryConstants.ts

#### ENERGY_CATEGORIES
能源類別配置。

```typescript
const ENERGY_CATEGORIES = {
  scope1: {
    'wd40': { category: 'WD-40', unit: 'ML', scope: 1 },
    'acetylene': { category: '乙炔', unit: 'kg', scope: 1 },
    'refrigerant': { category: '冷媒', unit: 'kg', scope: 1 },
    'septictank': { category: '化糞池', unit: 'person', scope: 1 },
    'natural_gas': { category: '天然氣', unit: 'm³', scope: 1 },
    'urea': { category: '尿素', unit: 'kg', scope: 1 },
    'diesel_generator': { category: '柴油(發電機)', unit: 'L', scope: 1 },
    'diesel': { category: '柴油', unit: 'L', scope: 1 },
    'gasoline': { category: '汽油', unit: 'L', scope: 1 },
    'lpg': { category: '液化石油氣', unit: 'kg', scope: 1 },
    'fire_extinguisher': { category: '滅火器', unit: 'kg', scope: 1 },
    'welding_rod': { category: '焊條', unit: 'kg', scope: 1 }
  },
  scope2: {
    'electricity_bill': { category: '外購電力', unit: 'kWh', scope: 2 }
  },
  scope3: {
    'employee_commute': { category: '員工通勤', unit: 'person-km', scope: 3 }
  }
}
```

#### getCategoryInfo()
根據 page_key 獲取對應的 category 資訊。

```typescript
function getCategoryInfo(pageKey: string): {
  category: string
  unit: string
  scope: number
}
```

## 錯誤處理

### 統一錯誤處理

#### handleAPIError()
標準化 API 錯誤處理。

```typescript
function handleAPIError(error: any, context: string): Error
```

**處理的錯誤類型**：
- 資料庫約束錯誤
- RLS 權限錯誤
- 網路連接錯誤
- 驗證錯誤

### 常見錯誤碼

| 錯誤碼 | 說明 | 處理方式 |
|--------|------|----------|
| 42501 | RLS 政策違反 | 檢查用戶權限 |
| 23505 | 唯一性約束違反 | 資料重複檢查 |
| 23503 | 外鍵約束違反 | 檢查關聯資料 |
| 23514 | 檢查約束違反 | 資料格式驗證 |

### 診斷工具

#### debugRLSOperation()
RLS 操作包裝器，提供詳細診斷。

```typescript
function debugRLSOperation<T>(
  description: string,
  operation: () => Promise<T>
): Promise<T>
```

## API 使用範例

### 基本填報流程

```typescript
// 1. 驗證認證狀態
const authResult = await validateAuth()
if (authResult.error) {
  throw new Error('請先登入')
}

// 2. 準備填報資料
const entryInput: UpsertEntryInput = {
  page_key: 'wd40',
  period_year: 2025,
  unit: 'ML',
  monthly: { '1': 10, '2': 15, '3': 20 },
  notes: '單位容量: 500ML/瓶'
}

// 3. 提交能源記錄
const { entry_id } = await upsertEnergyEntry(entryInput)

// 4. 關聯檔案（如果有暫存檔案）
await commitEvidence({
  entryId: entry_id,
  pageKey: 'wd40'
})
```

### 檔案編輯流程

```typescript
// 1. 載入現有檔案
const existingFiles = await getEntryFiles(entry_id)

// 2. 上傳新檔案
const newFile = await uploadEvidence(file, 'wd40', 1)

// 3. 關聯新檔案到記錄
await updateFileEntryAssociation(newFile.id, entry_id)

// 4. 刪除不需要的檔案
for (const file of filesToDelete) {
  await deleteEvidenceFile(file.id)
}
```

### 錯誤恢復範例

```typescript
// 使用 Promise.allSettled 進行批量操作
const results = await Promise.allSettled(
  files.map(file => updateFileEntryAssociation(file.id, entry_id))
)

// 處理部分成功的情況
const failed = results
  .filter(result => result.status === 'rejected')
  .map((result, index) => ({ index, error: result.reason }))

if (failed.length > 0) {
  console.warn('部分檔案關聯失敗:', failed)
  // 實施重試或用戶通知邏輯
}
```

## 相關文檔

- [資料庫架構文檔](./DATABASE_SCHEMA.md)
- [前端架構文檔](./FRONTEND_ARCHITECTURE.md)
- [前端開發指引](./FRONTEND_DEVELOPMENT_GUIDE.md)
- [認證診斷工具使用說明](./AUTH_DIAGNOSTICS_USAGE.md)

## 版本歷史

| 版本 | 日期 | 變更內容 | 作者 |
|------|------|----------|------|
| 2.0 | 2025-09-12 | 完整 API 文檔建立，移除 draft 狀態，新增檔案編輯功能 | System |
| 1.0 | 2025-09-09 | 初始 API 實作 | System |

---
**最後更新**: 2025-09-12  
**狀態**: 已完成  
**維護者**: 開發團隊