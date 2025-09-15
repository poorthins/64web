# 前端架構文檔 - 碳足跡盤查系統

---
title: 前端系統架構
version: 2.0
last_updated: 2025-09-12
author: System Architecture
---

## 系統概覽

基於 React 18 + TypeScript + Supabase 的現代化前端應用，採用功能模塊化架構設計。

## 變更摘要
- 移除草稿功能完整架構
- 新增檔案編輯功能架構
- 更新狀態管理策略
- 增強錯誤處理機制

## 技術棧

### 核心技術
```typescript
{
  "react": "^18.2.0",           // UI 框架
  "typescript": "^5.2.2",       // 類型系統
  "vite": "^5.2.0",            // 建置工具
  "@supabase/supabase-js": "^2.38.0"  // 後端服務
}
```

### 狀態管理
```typescript
{
  "@tanstack/react-query": "^5.12.2",  // 伺服器狀態
  "zustand": "^4.4.7",                // 輕量狀態管理
  "react-hook-form": "^7.48.2"        // 表單狀態
}
```

### 開發工具
```typescript
{
  "vitest": "^1.0.4",          // 單元測試
  "@playwright/test": "^1.40.0", // E2E 測試
  "storybook": "^7.6.3"        // 元件開發
}
```

## 專案結構

```
frontend/src/
├── api/                          # API 層 - Supabase 整合
│   ├── adminMetrics.ts           # 管理員統計資料
│   ├── adminSubmissions.ts       # 管理員提交管理
│   ├── adminUsers.ts             # 管理員用戶管理
│   ├── entries.ts                # 能源記錄核心 API
│   ├── files.ts                  # 檔案管理 API（含編輯功能）
│   └── reviewEnhancements.ts     # 審核增強功能
│
├── components/                   # 共用元件
│   ├── AdminRoute.tsx            # 管理員路由守衛
│   ├── UserRoute.tsx             # 用戶路由守衛
│   ├── BottomActionBar.tsx       # 底部操作欄（新增）
│   ├── EvidenceUpload.tsx        # 檔案上傳元件
│   ├── StatusIndicator.tsx       # 狀態指示器（新增）
│   ├── Sidebar.tsx               # 側邊欄導航
│   ├── Breadcrumb.tsx            # 麵包屑導航
│   ├── Toast.tsx                 # 通知提示
│   └── ErrorBoundary.tsx         # 錯誤邊界
│
├── contexts/                     # React Context
│   ├── AuthContext.tsx           # 認證狀態管理
│   └── NavigationContext.tsx     # 導航狀態管理
│
├── hooks/                        # 自訂 Hooks
│   ├── useEditPermissions.ts     # 編輯權限檢查
│   ├── useFrontendStatus.ts      # 前端狀態管理
│   ├── useRole.ts                # 角色檢查
│   ├── useStatusManager.ts       # 狀態管理器
│   └── useUserProfile.ts         # 用戶資料管理
│
├── layouts/                      # 佈局元件
│   └── ProtectedLayout.tsx       # 受保護頁面佈局
│
├── pages/                        # 頁面元件
│   ├── Category1/                # 範疇一能源類別（12個）
│   ├── Category2/                # 範疇二能源類別（1個）
│   ├── Category3/                # 範疇三能源類別（1個）
│   ├── admin/                    # 管理頁面
│   ├── Dashboard.tsx             # 使用者儀表板
│   ├── Login.tsx                 # 登入頁面
│   └── HomePage.tsx              # 首頁
│
├── routes/                       # 路由配置
│   └── AppRouter.tsx             # 主路由配置
│
├── utils/                        # 工具函數
│   ├── authHelpers.ts            # 認證工具函數
│   ├── authDiagnostics.ts        # 認證診斷工具
│   ├── categoryConstants.ts      # 類別常數定義
│   ├── designTokens.ts           # 設計系統
│   └── databaseStats.ts          # 資料庫統計
│
├── types/                        # TypeScript 類型
│   └── carbon.ts                 # 碳排放相關類型
│
└── lib/                          # 第三方庫配置
    └── supabaseClient.ts         # Supabase 客戶端
```

## 核心架構模式

### 1. 資料流架構

```
UI Components → API Layer → Supabase → RLS Policies → PostgreSQL
     ↑                                                      ↓
  State Management ←←←←← Error Handling ←←←←←← Response Data
```

### 2. 認證流程

```
App.tsx → AuthProvider → validateAuth() → Supabase Auth → RLS Context
   ↓              ↓           ↓             ↓              ↓
Protected Routes → Auth Context → Token Validation → Row-Level Security
```

### 3. 狀態管理策略

#### 全域狀態 (Context API)
- **AuthContext**: 用戶認證狀態
- **NavigationContext**: 導航狀態

#### 伺服器狀態 (React Query - 未來)
- API 響應快取
- 背景重新整理
- 樂觀更新

#### 本地狀態 (useState + useReducer)
- 表單資料
- UI 互動狀態
- 暫時性資料

## 14個能源類別頁面

### 範疇一 - 直接排放（12個頁面）

| Page Key | 頁面檔名 | 中文名稱 | 單位 |
|----------|----------|----------|------|
| `wd40` | WD40Page.tsx | WD-40 | ML |
| `acetylene` | AcetylenePage.tsx | 乙炔 | kg |
| `refrigerant` | RefrigerantPage.tsx | 冷媒 | kg |
| `septictank` | SepticTankPage.tsx | 化糞池 | person |
| `natural_gas` | NaturalGasPage.tsx | 天然氣 | m³ |
| `urea` | UreaPage.tsx | 尿素 | kg |
| `diesel_generator` | DieselGeneratorPage.tsx | 柴油(發電機) | L |
| `diesel` | DieselPage.tsx | 柴油 | L |
| `gasoline` | GasolinePage.tsx | 汽油 | L |
| `lpg` | LPGPage.tsx | 液化石油氣 | kg |
| `fire_extinguisher` | FireExtinguisherPage.tsx | 滅火器 | kg |
| `welding_rod` | WeldingRodPage.tsx | 焊條 | kg |

### 範疇二 - 間接排放（1個頁面）

| Page Key | 頁面檔名 | 中文名稱 | 單位 |
|----------|----------|----------|------|
| `electricity_bill` | ElectricityBillPage.tsx | 外購電力 | kWh |

### 範疇三 - 其他間接排放（1個頁面）

| Page Key | 頁面檔名 | 中文名稱 | 單位 |
|----------|----------|----------|------|
| `employee_commute` | CommuteePage.tsx | 員工通勤 | person-km |

## 元件架構

### 共用元件層級

```
App.tsx
├── AuthProvider
├── NavigationProvider
└── ProtectedLayout
    ├── Sidebar
    ├── Breadcrumb
    └── MainContent
        ├── [Category Pages]
        ├── BottomActionBar
        └── StatusIndicator
```

### 元件職責

#### 路由守衛
- **AdminRoute**: 檢查管理員權限
- **UserRoute**: 檢查用戶權限
- **ProtectedLayout**: 統一的認證檢查

#### 核心功能元件
- **EvidenceUpload**: 檔案上傳與管理（支援編輯功能）
- **StatusIndicator**: 記錄狀態顯示
- **BottomActionBar**: 統一的底部操作介面
- **Toast**: 統一的通知系統

#### 導航元件
- **Sidebar**: 主導航選單
- **Breadcrumb**: 路徑指示
- **RoleBasedHomePage**: 角色導向首頁

### 頁面元件模式

所有 Category 頁面遵循統一模式：

```typescript
interface CategoryPageStructure {
  // 狀態管理
  loading: boolean
  submitting: boolean
  year: number
  monthlyData: MonthData[]
  
  // 檔案管理
  msdsFiles: EvidenceFile[]
  evidenceFiles: Record<number, EvidenceFile[]>
  
  // 業務邏輯
  handleSubmit: () => Promise<void>
  loadExistingData: () => Promise<void>
  
  // UI 結構
  render: () => JSX.Element // 統一的佈局結構
}
```

## 資料流詳解

### 1. 頁面載入流程

```typescript
// 1. 認證檢查
useEffect(() => {
  validateAuth()
}, [])

// 2. 載入現有資料
useEffect(() => {
  loadExistingData()
}, [year])

// 3. 載入關聯檔案
useEffect(() => {
  if (existingEntry) {
    loadAssociatedFiles(existingEntry.id)
  }
}, [existingEntry])
```

### 2. 提交流程（更新後）

```typescript
const handleSubmit = async () => {
  try {
    // 1. 驗證資料
    validateFormData()
    
    // 2. 提交能源記錄（直接為 submitted 狀態）
    const { entry_id } = await upsertEnergyEntry(entryInput)
    
    // 3. 處理檔案關聯（錯誤恢復機制）
    const results = await Promise.allSettled(
      unassociatedFiles.map(file => 
        updateFileEntryAssociation(file.id, entry_id)
      )
    )
    
    // 4. 處理部分成功情況
    handlePartialSuccess(results)
    
    // 5. 顯示成功訊息
    showSuccessMessage()
  } catch (error) {
    handleError(error)
  }
}
```

### 3. 檔案編輯流程（新功能）

```typescript
const handleFileEdit = async (entryId: string) => {
  try {
    // 1. 載入現有檔案
    const existingFiles = await getEntryFiles(entryId)
    
    // 2. 允許用戶增刪檔案
    // - 上傳新檔案
    // - 刪除不需要的檔案
    // - 重新關聯檔案
    
    // 3. 批量更新檔案關聯
    await updateFileAssociations()
    
    // 4. 重新載入頁面資料
    await loadExistingData()
  } catch (error) {
    handleFileEditError(error)
  }
}
```

## 錯誤處理架構

### 1. 錯誤邊界

```typescript
// src/shared/components/ErrorBoundary.tsx
class ErrorBoundary extends React.Component {
  // 捕獲 React 元件錯誤
  componentDidCatch(error, errorInfo) {
    logError(error, errorInfo)
  }
}
```

### 2. API 錯誤處理

```typescript
// 統一的錯誤處理模式
try {
  const result = await apiCall()
  return result
} catch (error) {
  // RLS 錯誤分析
  const rlsError = analyzeRLSError(error)
  
  if (rlsError.isRLSError) {
    handleRLSError(rlsError)
  } else {
    handleGenericError(error)
  }
}
```

### 3. 錯誤恢復機制

```typescript
// Promise.allSettled 模式
const results = await Promise.allSettled(operations)
const failed = results.filter(r => r.status === 'rejected')

if (failed.length > 0) {
  // 部分失敗處理
  showPartialErrorMessage()
  // 可選：實施重試邏輯
}
```

## 安全性架構

### 1. 路由保護

```typescript
// 角色基礎的路由保護
<Route path="/admin/*" element={
  <AdminRoute fallback={<Dashboard />}>
    <AdminPages />
  </AdminRoute>
} />

<Route path="/user/*" element={
  <UserRoute>
    <UserPages />
  </UserRoute>
} />
```

### 2. RLS 整合

```typescript
// 所有 API 呼叫都通過認證檢查
const { data, error } = await supabase
  .from('energy_entries')
  .select('*')
  .eq('owner_id', user.id)  // RLS 會自動檢查
```

### 3. 敏感資料保護

- 前端不存儲敏感資料
- Token 自動過期處理
- 診斷日誌過濾敏感資訊

## 效能優化策略

### 1. 程式碼分割

```typescript
// 動態載入頁面元件
const WD40Page = lazy(() => import('./pages/Category1/WD40Page'))
const AdminDashboard = lazy(() => import('./pages/admin/AdminDashboard'))
```

### 2. 快取策略

```typescript
// React Query 快取配置（建議實施）
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5分鐘
      cacheTime: 10 * 60 * 1000, // 10分鐘
    },
  },
})
```

### 3. 最佳化渲染

```typescript
// React.memo 避免不必要重新渲染
export const StatusIndicator = React.memo(({ status }) => {
  // 只在 status 改變時重新渲染
})
```

## 測試架構

### 1. 單元測試 (Vitest)

```typescript
// 元件測試
describe('EvidenceUpload', () => {
  it('should upload files correctly', async () => {
    // 測試檔案上傳邏輯
  })
})

// Hook 測試
describe('useEditPermissions', () => {
  it('should check edit permissions correctly', () => {
    // 測試權限邏輯
  })
})
```

### 2. 整合測試

```typescript
// API 整合測試
describe('entries API', () => {
  it('should upsert energy entry', async () => {
    const result = await upsertEnergyEntry(mockData)
    expect(result.entry_id).toBeDefined()
  })
})
```

### 3. E2E 測試 (Playwright)

```typescript
// 完整流程測試
test('complete energy entry flow', async ({ page }) => {
  await page.goto('/wd40')
  await page.fill('[name="quantity"]', '10')
  await page.click('button:has-text("提交填報")')
  await expect(page.locator('.success-message')).toBeVisible()
})
```

## 最近的架構變更

### 移除的功能
1. **草稿功能完全移除**
   - 移除所有 draft 狀態處理
   - 移除自動儲存機制
   - 移除草稿載入邏輯

2. **簡化狀態流程**
   - 移除 under_review 狀態
   - 簡化為：submitted → approved/rejected

### 新增的功能
1. **檔案編輯功能**
   - 支援已提交記錄的檔案編輯
   - 檔案重新關聯機制
   - 錯誤恢復處理

2. **增強錯誤處理**
   - Promise.allSettled 模式
   - 詳細的錯誤診斷
   - RLS 錯誤分析

3. **認證診斷工具**
   - 開發環境自動啟用
   - 詳細的認證狀態監控
   - RLS 操作包裝器

## 開發最佳實踐

### 1. 元件設計原則
- 單一職責原則
- 可重用性優先
- Props 介面清晰
- 錯誤處理完備

### 2. 狀態管理原則
- 最小狀態原則
- 狀態就近管理
- 避免不必要的全域狀態

### 3. 效能考量
- 避免不必要的重新渲染
- 適當使用 useMemo 和 useCallback
- 實施程式碼分割

### 4. 安全考量
- 永遠驗證用戶輸入
- 依賴後端 RLS 進行安全控制
- 不在前端存儲敏感資料

## 未來架構規劃

### 短期計劃
1. 實施 React Query 進行狀態管理優化
2. 完善測試覆蓋率
3. 效能監控實施

### 長期計劃
1. 微前端架構考慮
2. PWA 功能實施
3. 國際化支援

## 相關文檔

- [API 文檔](./API_DOCUMENTATION.md)
- [前端開發指引](./FRONTEND_DEVELOPMENT_GUIDE.md)
- [資料庫架構](./DATABASE_SCHEMA.md)
- [認證診斷工具](./AUTH_DIAGNOSTICS_USAGE.md)

## 版本歷史

| 版本 | 日期 | 變更內容 | 作者 |
|------|------|----------|------|
| 2.0 | 2025-09-12 | 完整前端架構文檔，移除 draft，新增檔案編輯 | System |
| 1.0 | 2025-09-09 | 初始前端架構建立 | System |

---
**最後更新**: 2025-09-12  
**架構狀態**: 穩定  
**維護團隊**: 前端開發組