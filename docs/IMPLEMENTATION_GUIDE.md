# 碳足跡盤查系統 - 實作指南

---
title: 系統實作指南
version: 2.0
last_updated: 2025-09-12
author: Implementation Team
---

## 概述

本指南提供碳足跡盤查系統的實際實作步驟、最佳實踐，以及新功能開發指引。系統基於 React + Supabase 架構，已完成完整的功能實作。

## 系統完成狀態

### ✅ 核心功能實作完成

1. **認證系統** 
   - 完整的 Supabase Auth 整合
   - 角色基礎權限控制 (admin/user)
   - 增強認證診斷工具
   - Row Level Security 政策實施

2. **能源記錄管理系統**
   - 14個能源類別完整實作
   - 月度資料填報功能
   - 提交、審核工作流
   - 資料驗證和錯誤處理

3. **檔案管理系統**
   - 檔案上傳至 Supabase Storage
   - 佐證檔案關聯功能
   - **新功能**: 檔案編輯與重新關聯
   - 錯誤恢復機制 (Promise.allSettled)

4. **管理員功能**
   - 用戶管理介面
   - 提交審核系統
   - 統計報表功能
   - 系統監控面板

### ✅ 架構優化完成

1. **前端架構優化**
   - 模組化元件設計
   - 統一的 API 層
   - 錯誤處理機制
   - 狀態管理策略

2. **後端服務整合**
   - Supabase 完整整合
   - RLS 政策實施
   - 觸發器和函數
   - Storage 政策配置

3. **開發工具完善**
   - TypeScript 完整覆蓋
   - 測試框架建立 (Vitest + Playwright)
   - 認證診斷工具
   - 完整文檔系統

## 新功能開發指南

### 檔案編輯功能實作範例

#### 1. API 層實作
新增檔案管理 API 函數：

```typescript
// src/api/files.ts
export async function getEntryFiles(entryId: string): Promise<EvidenceFile[]> {
  console.log('🔍 [getEntryFiles] Querying entry_files for entry_id:', entryId)
  const { data, error } = await supabase
    .from('entry_files')
    .select('*')
    .eq('entry_id', entryId)
    .order('created_at', { ascending: false })
  
  if (error) throw error
  return data || []
}

export async function updateFileEntryAssociation(
  fileId: string, 
  entryId: string
): Promise<void> {
  const { error } = await supabase
    .from('entry_files')
    .update({ entry_id: entryId })
    .eq('id', fileId)
  
  if (error) throw error
}
```

#### 2. 錯誤恢復機制實作
使用 Promise.allSettled 處理批量操作：

```typescript
// 批量檔案關聯，支援部分失敗
const results = await Promise.allSettled(
  unassociatedFiles.map(file => 
    updateFileEntryAssociation(file.id, entry_id)
  )
)

const failed = results
  .filter(result => result.status === 'rejected')
  .map((result, index) => ({ 
    index, 
    error: (result as PromiseRejectedResult).reason 
  }))

if (failed.length > 0) {
  console.warn('部分檔案關聯失敗:', failed)
  // 實施用戶通知邏輯
}
```

#### 3. 前端元件整合
在頁面元件中整合檔案編輯功能：

```typescript
// 載入現有檔案
useEffect(() => {
  if (existingEntry?.id) {
    loadAssociatedFiles(existingEntry.id)
  }
}, [existingEntry])

const loadAssociatedFiles = async (entryId: string) => {
  try {
    const files = await getEntryFiles(entryId)
    // 分類檔案到對應月份
    categorizeFiles(files)
  } catch (error) {
    console.error('載入檔案失敗:', error)
  }
}
```

### 狀態管理簡化實作

#### 移除 Draft 狀態
```typescript
// 舊版本 - 包含 draft 狀態
type EntryStatus = 'draft' | 'submitted' | 'under_review' | 'approved' | 'rejected'

// 新版本 - 簡化狀態
type EntryStatus = 'submitted' | 'approved' | 'rejected'

// 提交邏輯簡化
const handleSubmit = async () => {
  // 直接提交為 submitted 狀態
  const { entry_id } = await upsertEnergyEntry({
    ...entryInput,
    // 不再有保存草稿選項
  })
}
```

### 認證診斷工具實作

#### 自動診斷啟用
```typescript
// src/utils/authDiagnostics.ts
export function isDiagnosticMode(): boolean {
  return (
    import.meta.env.DEV || // 開發環境自動啟用
    import.meta.env.VITE_AUTH_DIAGNOSTIC === 'true' ||
    localStorage.getItem('auth_diagnostic_mode') === 'true'
  )
}

export async function diagnoseAuthState() {
  if (!isDiagnosticMode()) return null
  
  // 詳細的認證狀態檢查
  const userResult = await supabase.auth.getUser()
  const sessionResult = await supabase.auth.getSession()
  
  return {
    isAuthenticated: !!(userResult.data.user && sessionResult.data.session),
    user: userResult.data.user,
    session: sessionResult.data.session,
    // ... 其他診斷資訊
  }
}
```

## 開發環境設置

### 1. 前端開發環境
```bash
# 切換到前端目錄
cd frontend

# 安裝依賴
npm install

# 設定環境變數
cp .env.example .env
# 編輯 .env 填入 Supabase 連接資訊
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

# 啟動開發服務器
npm run dev
```

### 2. Supabase 設置
```sql
-- 設置 RLS 政策
-- 確保 energy_entries 表的 RLS 政策
CREATE POLICY "Users can view own entries" ON energy_entries
  FOR SELECT USING (auth.uid() = owner_id);

-- 確保 review_history 的插入政策
CREATE POLICY "Allow insert for review history" ON review_history
  FOR INSERT WITH CHECK (true);
```

### 3. 開發工具設置
```bash
# TypeScript 檢查
npm run type-check

# 代碼格式檢查
npm run lint

# 運行測試
npm run test

# E2E 測試
npm run test:e2e
```

## 部署和維護

### 1. 生產部署
```bash
# 建置生產版本
npm run build

# 部署到 Vercel（推薦）
vercel --prod

# 或部署到其他平台
# 上傳 dist/ 資料夾到靜態網站服務
```

### 2. 監控和診斷
```typescript
// 開啟診斷模式進行除錯
localStorage.setItem('auth_diagnostic_mode', 'true')

// 檢查 Supabase 連接
const { data, error } = await supabase
  .from('profiles')
  .select('count')
  .single()
```

### 3. 效能最佳化
```typescript
// 使用 React.memo 避免不必要重渲染
export const StatusIndicator = React.memo(({ status }) => {
  // 元件實作
})

// 程式碼分割
const AdminDashboard = lazy(() => import('./admin/AdminDashboard'))
```

## 故障排除指南

### 常見問題解決

#### 1. RLS 權限錯誤
```bash
# 檢查用戶權限
SELECT auth.uid(), auth.role();

# 檢查 RLS 政策
SELECT * FROM pg_policies WHERE tablename = 'energy_entries';
```

#### 2. 檔案上傳失敗
```typescript
// 檢查 Storage 政策
const { data, error } = await supabase.storage
  .from('evidence')
  .list('test', { limit: 1 })
```

#### 3. 認證問題診斷
```typescript
// 使用診斷工具
import { diagnoseAuthState } from './utils/authDiagnostics'
const diagnosis = await diagnoseAuthState()
console.log('認證診斷:', diagnosis)
```

## 開發最佳實踐

### 1. 程式碼規範
- 使用 TypeScript 嚴格模式
- 遵循 ESLint 規則
- 統一的錯誤處理模式

### 2. 元件設計原則
- 單一職責原則
- Props 介面清晰
- 錯誤邊界保護

### 3. 狀態管理
- 最小狀態原則
- 狀態就近管理
- 避免不必要的全域狀態

### 4. 安全考量
- 永遠驗證用戶輸入
- 依賴後端 RLS 政策
- 不在前端存儲敏感資料

## 相關文檔

- [API 文檔](./API_DOCUMENTATION.md) - 完整的 API 說明
- [前端架構文檔](./FRONTEND_ARCHITECTURE.md) - 前端系統架構
- [資料庫架構](./DATABASE_SCHEMA.md) - 資料庫設計
- [認證診斷工具](./AUTH_DIAGNOSTICS_USAGE.md) - 認證問題診斷

## 版本歷史

| 版本 | 日期 | 變更內容 | 作者 |
|------|------|----------|------|
| 2.0 | 2025-09-12 | 更新為實際實作指南，移除理論架構 | System |
| 1.0 | 2025-09-09 | 初始企業架構實施指南 | System |

---
**最後更新**: 2025-09-12  
**狀態**: 實作完成  
**維護團隊**: 全端開發組
