# 山椒魚組織型碳足跡盤查系統 - 前端開發指引

---
title: 前端開發指引
version: 2.0
last_updated: 2025-09-12
author: Frontend Development Team
---

## 專案概述

這是一個企業級碳排放盤查和能源管理系統，專門用於企業進行範疇一、二、三的碳足跡追蹤作業。系統採用現代化的 JAMstack 架構，基於 React + TypeScript + Supabase 技術棧構建。

### 核心業務流程
1. **用戶認證與授權** - 基於 Supabase Auth 的安全認證
2. **能源資料填報** - 支援 12 種範疇一能源類別的月度資料輸入
3. **佐證檔案管理** - 檔案上傳、預覽、管理功能
4. **資料審核流程** - 管理員審核用戶提交的資料
5. **報表統計分析** - 碳排放數據的統計與視覺化

### 範疇一能源類別 (12 種)
**固體燃料與化學品：**
- WD-40 (氣霧式潤滑劑)
- 乙炔 (焊接氣體)
- 冷媒 (空調製冷)
- 化糞池 (有機廢棄物處理)
- 尿素 (DEF柴油車尾氣處理)
- 焊條 (電焊材料)
- 滅火器 (消防設備)

**液體燃料：**
- 天然氣 (管線瓦斯)
- 柴油 (車輛燃料)
- 汽油 (車輛燃料) 
- 液化石油氣 (LPG)
- 柴油(發電機) (備用發電)

## 技術架構

### 前端技術棧
```typescript
// 核心框架
React: "^18.2.0"
TypeScript: "^5.2.2"
Vite: "^5.2.0"

// 狀態管理與資料獲取
Zustand: "^4.4.7"                    // 輕量化狀態管理
React Query: "^5.12.2"               // 伺服器狀態管理
React Hook Form: "^7.48.2"           // 表單管理
Zod: "^3.22.4"                       // 資料驗證

// UI 與樣式
Tailwind CSS: "^3.4.3"               // CSS 框架
Lucide React: "^0.542.0"             // 圖標庫
Recharts: "^2.10.3"                  // 圖表組件

// 路由與導航
React Router DOM: "^6.22.3"          // 路由管理

// 後端整合
Supabase JS: "^2.38.0"               // 後端服務
Axios: "^1.6.2"                      // HTTP 客戶端

// 開發與測試工具
Vitest: "^1.0.4"                     // 單元測試
Playwright: "^1.40.0"                // E2E 測試
Storybook: "^7.6.3"                  // 組件開發
ESLint + Prettier                    // 代碼品質
```

### 專案結構
```
frontend/
├── src/
│   ├── api/                    # API 層 - Supabase 整合
│   │   ├── entries.ts          # 能源記錄 API
│   │   ├── files.ts            # 檔案管理 API
│   │   ├── adminUsers.ts       # 用戶管理 API
│   │   └── adminMetrics.ts     # 統計數據 API
│   │
│   ├── components/             # 通用組件
│   │   ├── Sidebar.tsx         # 側邊欄導航
│   │   ├── AdminRoute.tsx      # 管理員路由守衛
│   │   ├── UserRoute.tsx       # 用戶路由守衛
│   │   ├── EvidenceUpload.tsx  # 檔案上傳組件
│   │   └── ...
│   │
│   ├── contexts/               # React Context
│   │   ├── AuthContext.tsx     # 認證狀態管理
│   │   └── NavigationContext.tsx # 導航狀態
│   │
│   ├── features/               # 功能模塊 (新架構)
│   │   ├── admin/              # 管理功能
│   │   │   ├── components/
│   │   │   ├── services/
│   │   │   └── stores/
│   │   └── ...
│   │
│   ├── layouts/                # 布局組件
│   │   └── ProtectedLayout.tsx # 受保護的頁面布局
│   │
│   ├── lib/                    # 工具庫
│   │   └── supabaseClient.ts   # Supabase 客戶端
│   │
│   ├── pages/                  # 頁面組件
│   │   ├── Category1/          # 範疇一能源類別 (12個頁面)
│   │   │   ├── WD40Page.tsx           # WD-40 潤滑劑
│   │   │   ├── AcetylenePage.tsx      # 乙炔氣體
│   │   │   ├── RefrigerantPage.tsx    # 冷媒
│   │   │   ├── SepticTankPage.tsx     # 化糞池
│   │   │   ├── NaturalGasPage.tsx     # 天然氣
│   │   │   ├── UreaPage.tsx           # 尿素
│   │   │   ├── DieselGeneratorPage.tsx # 柴油(發電機)
│   │   │   ├── DieselPage.tsx         # 柴油
│   │   │   ├── GasolinePage.tsx       # 汽油
│   │   │   ├── LPGPage.tsx            # 液化石油氣
│   │   │   ├── FireExtinguisherPage.tsx # 滅火器
│   │   │   └── WeldingRodPage.tsx     # 焊條
│   │   ├── Category2/          # 範疇二
│   │   │   └── ElectricityBillPage.tsx
│   │   ├── Category3/          # 範疇三
│   │   │   └── CommuteePage.tsx
│   │   ├── admin/              # 管理頁面
│   │   └── ...
│   │
│   ├── routes/                 # 路由配置
│   │   └── AppRouter.tsx
│   │
│   ├── services/               # 業務服務
│   │   └── authService.ts      # 認證服務
│   │
│   ├── shared/                 # 共享資源 (新架構)
│   │   ├── components/
│   │   ├── hooks/
│   │   ├── types/
│   │   └── utils/
│   │
│   └── utils/                  # 工具函數
│       ├── designTokens.ts     # 統一設計語言
│       ├── testEntries.ts      # 測試工具
│       └── ...
│
├── public/                     # 靜態資源
├── tests/                      # 測試文件
│   ├── e2e/                   # E2E 測試
│   └── setup.ts
│
├── .storybook/                # Storybook 配置
├── playwright.config.ts        # Playwright 配置
├── tailwind.config.js         # Tailwind 配置
├── tsconfig.json              # TypeScript 配置
└── vite.config.ts             # Vite 配置
```

## 核心組件架構

### 1. BottomActionBar 組件
統一的底部操作欄組件，用於所有範疇一頁面：

```typescript
// src/components/BottomActionBar.tsx
interface BottomActionBarProps {
  pageKey: string              // 頁面標識符 (必須使用 const 變數)
  onSave: () => Promise<void>  // 儲存草稿回調
  onSubmit: () => Promise<void> // 提交回調
  canSubmit: boolean           // 是否可提交
  hasChanges: boolean          // 是否有變更
  loading?: boolean            // 載入狀態
}
```

**使用範例：**
```typescript
export default function SomePage() {
  const pageKey = 'natural_gas' // 統一格式：使用 const 變數
  
  return (
    <div>
      {/* 頁面內容 */}
      <BottomActionBar
        pageKey={pageKey}
        onSave={handleSave}
        onSubmit={handleSubmit}
        canSubmit={canSubmit}
        hasChanges={hasChanges}
      />
    </div>
  )
}
```

### 2. StatusIndicator 組件
統一的狀態指示器，顯示資料審核狀態：

```typescript
interface StatusIndicatorProps {
  status: EntryStatus          // 狀態值
  className?: string           // 自定義樣式
}

// 支援的狀態類型
type EntryStatus = 'submitted' | 'approved' | 'rejected'
```

#### 視覺設計配置
```typescript
const statusConfig = {
  submitted: { color: '#3b82f6', text: '已提交' },
  approved: { color: '#10b981', text: '已通過' },
  rejected: { color: '#ef4444', text: '已退回' }
}
```

#### 響應式策略
- **桌面版**：圓點 + 文字顯示
- **手機版**：僅圓點 + tooltip 提示

#### 實時更新機制
- **輪詢更新**：每30秒檢查狀態變更
- **手動刷新**：用戶操作後立即查詢
- **WebSocket (未來)**：即時推送狀態變更

#### 快取策略
```typescript
// React Query 快取配置
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30000, // 30秒內認為資料新鮮
      cacheTime: 300000, // 5分鐘快取時間
    },
  },
});
```

### 3. Design Tokens 系統
統一的設計語言配置 (`src/utils/designTokens.ts`)：

```typescript
export const designTokens = {
  colors: {
    background: '#f8fffe',
    cardBg: '#ffffff',
    border: '#e0f2f1',
    textPrimary: '#1f2937',
    textSecondary: '#546e7a',
    accentPrimary: '#4caf50',
    accentSecondary: '#26a69a',
    accentLight: '#e8f5e8',
    accentBlue: '#5dade2',
    primary: '#2E7D32',
    blue: '#1976D2',
    orange: '#FF9800',
    error: '#ef4444',
    warning: '#f59e0b',
    success: '#10b981'
  },
  spacing: { xs: '4px', sm: '8px', md: '16px', lg: '24px', xl: '32px', xxl: '48px' },
  shadows: {
    sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
    md: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
    lg: '0 10px 15px -3px rgb(0 0 0 / 0.1)'
  },
  borderRadius: { sm: '6px', md: '8px', lg: '12px' }
}
```

## pageKey 命名規範

所有範疇一頁面必須遵循統一的 pageKey 定義格式：

```typescript
// ✅ 正確格式
export default function WD40Page() {
  const pageKey = 'wd40'
  // 使用 pageKey 變數
  return <BottomActionBar pageKey={pageKey} ... />
}

// ❌ 錯誤格式
export default function WD40Page() {
  // 直接寫死字串
  return <BottomActionBar pageKey="wd40" ... />
}
```

**已實現的 pageKey 對照表：**
| 能源類別 | pageKey | 頁面檔名 |
|---------|---------|----------|
| WD-40 | `wd40` | WD40Page.tsx |
| 乙炔 | `acetylene` | AcetylenePage.tsx |
| 冷媒 | `refrigerant` | RefrigerantPage.tsx |
| 化糞池 | `septictank` | SepticTankPage.tsx |
| 天然氣 | `natural_gas` | NaturalGasPage.tsx |
| 尿素 | `urea` | UreaPage.tsx |
| 柴油(發電機) | `diesel_generator_refuel`, `diesel_generator_test` | DieselGeneratorPage.tsx |
| 柴油 | `diesel` | DieselPage.tsx |
| 汽油 | `gasoline` | GasolinePage.tsx |
| 液化石油氣 | `lpg` | LPGPage.tsx |
| 焊條 | `welding_rod` | WeldingRodPage.tsx |
| 滅火器 | `fire_extinguisher`, `fire_extinguisher_maintenance` | FireExtinguisherPage.tsx |

## 核心業務模組

### 1. 認證與授權系統

#### AuthContext 實現
```typescript
// src/contexts/AuthContext.tsx
import React, { createContext, useContext, useEffect, useState } from 'react'
import { User } from '@supabase/supabase-js'
import { supabase } from '../lib/supabaseClient'

interface AuthContextType {
  user: User | null
  loading: boolean
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true
})

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // 取得初始 session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      setLoading(false)
    })

    // 監聽認證狀態變化
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user ?? null)
        setLoading(false)
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  const value = {
    user,
    loading
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}
```

#### 路由守衛實現
```typescript
// src/components/AdminRoute.tsx
import React from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

interface AdminRouteProps {
  children: React.ReactNode
}

const AdminRoute: React.FC<AdminRouteProps> = ({ children }) => {
  const { user, loading } = useAuth()

  if (loading) {
    return <div>Loading...</div>
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  // 檢查用戶角色 (從 user metadata 或 profiles 表獲取)
  const isAdmin = user.user_metadata?.role === 'admin'
  
  if (!isAdmin) {
    return <Navigate to="/dashboard" replace />
  }

  return <>{children}</>
}

export default AdminRoute
```

### 2. 能源資料填報系統

#### 支援的能源類別
```typescript
// 14種能源類別配置
const ENERGY_CATEGORIES = {
  // 範疇一 - 直接溫室氣體排放
  scope1: {
    'wd40': { name: 'WD-40', unit: 'ML', scope: 1 },
    'acetylene': { name: '乙炔', unit: 'kg', scope: 1 },
    'refrigerant': { name: '冷媒', unit: 'kg', scope: 1 },
    'septic_tank': { name: '化糞池', unit: 'person', scope: 1 },
    'natural_gas': { name: '天然氣', unit: 'm³', scope: 1 },
    'urea': { name: '尿素', unit: 'kg', scope: 1 },
    'diesel_generator': { name: '柴油(發電機)', unit: 'L', scope: 1 },
    'diesel': { name: '柴油', unit: 'L', scope: 1 },
    'gasoline': { name: '汽油', unit: 'L', scope: 1 },
    'lpg': { name: '液化石油氣', unit: 'kg', scope: 1 },
    'fire_extinguisher': { name: '滅火器', unit: 'kg', scope: 1 },
    'welding_rod': { name: '焊條', unit: 'kg', scope: 1 }
  },
  // 範疇二 - 能源間接溫室氣體排放
  scope2: {
    'electricity': { name: '外購電力', unit: 'kWh', scope: 2 }
  },
  // 範疇三 - 其他間接溫室氣體排放
  scope3: {
    'commute': { name: '員工通勤', unit: 'person-km', scope: 3 }
  }
}
```

#### 能源填報頁面架構
```typescript
// src/pages/Category1/WD40Page.tsx (範例)
interface MonthData {
  month: number
  quantity: number
  totalUsage: number
  files: EvidenceFile[]
}

const WD40Page = () => {
  // 狀態管理
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [year] = useState(new Date().getFullYear())
  const [unitCapacity, setUnitCapacity] = useState<number>(0)
  const [carbonRate, setCarbonRate] = useState<number>(0)
  const [monthlyData, setMonthlyData] = useState<MonthData[]>(
    Array.from({ length: 12 }, (_, i) => ({
      month: i + 1,
      quantity: 0,
      totalUsage: 0,
      files: []
    }))
  )

  // Auto-save functionality removed - direct submission only

  // 提交邏輯
  const handleSubmit = async () => {
    const monthly: Record<string, number> = {}
    monthlyData.forEach(data => {
      if (data.quantity > 0) {
        monthly[data.month.toString()] = data.totalUsage
      }
    })

    const entryInput: UpsertEntryInput = {
      page_key: 'wd40',
      period_year: year,
      unit: 'ML',
      monthly: monthly,
      notes: `單位容量: ${unitCapacity} ML/瓶, 含碳率: ${carbonRate}%`
    }

    try {
      // 1. 新增或更新 energy_entries
      const { entry_id } = await upsertEnergyEntry(entryInput)
      
      // 2. 提交所有檔案
      await commitEvidence({
        entryId: entry_id,
        pageKey: 'wd40'
      })
      
      // 3. 清理草稿
      await cleanupAfterSubmission('wd40')
      
      // 4. 顯示成功訊息
      const totalUsage = sumMonthly(monthly)
      setSuccess(`年度總使用量：${totalUsage.toFixed(2)} ML`)
    } catch (error) {
      setError(error instanceof Error ? error.message : '提交失敗')
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 頁面標題 */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-green-600">WD-40 碳排放計算</h1>
        <p className="mt-2 text-gray-600">請上傳 MSDS 文件並填入各月份使用數據</p>
      </div>

      {/* MSDS 安全資料表與基本參數 */}
      <div className="bg-white shadow rounded-lg mb-6">
        <div className="px-6 py-4 bg-blue-50 border-b">
          <h2 className="text-lg font-medium text-blue-800">MSDS 安全資料表與基本參數</h2>
        </div>
        <div className="p-6 space-y-6">
          {/* MSDS 檔案上傳 */}
          <EvidenceUpload
            pageKey="wd40"
            files={msdsFiles}
            onFilesChange={setMsdsFiles}
            maxFiles={3}
            kind="msds"
          />
          
          {/* 基本參數輸入 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium mb-2">
                單位容量 (ML/瓶)
              </label>
              <input
                type="number"
                value={unitCapacity || ''}
                onChange={(e) => setUnitCapacity(parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">
                含碳率 (%)
              </label>
              <input
                type="number"
                value={carbonRate || ''}
                onChange={(e) => setCarbonRate(parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:border-blue-500"
              />
            </div>
          </div>
        </div>
      </div>

      {/* 月份使用量數據 */}
      <div className="bg-white shadow rounded-lg mb-6">
        <div className="px-6 py-4 border-b">
          <h2 className="text-lg font-medium">月份使用量數據</h2>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {monthlyData.map((data, index) => (
              <div key={data.month} className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-base font-medium">
                    {index + 1}月
                  </h3>
                  {data.totalUsage > 0 && (
                    <span className="text-sm text-gray-500">
                      總量：{data.totalUsage.toFixed(2)} ML
                    </span>
                  )}
                </div>

                <div className="space-y-4">
                  {/* 使用數量輸入 */}
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      使用數量 (瓶)
                    </label>
                    <input
                      type="number"
                      value={data.quantity || ''}
                      onChange={(e) => updateMonthData(index, 'quantity', parseFloat(e.target.value) || 0)}
                      className="w-full px-3 py-2 border rounded-md"
                    />
                  </div>

                  {/* 使用證明上傳 */}
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      使用證明
                    </label>
                    <EvidenceUpload
                      pageKey="wd40"
                      month={data.month}
                      files={data.files}
                      onFilesChange={(files) => handleMonthFilesChange(data.month, files)}
                      maxFiles={3}
                      kind="usage_evidence"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 底部操作欄 */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600">
              {hasUnsavedChanges ? '自動儲存中...' : '已自動儲存'}
            </div>
            
            <div className="flex items-center space-x-3">
              <button 
                onClick={() => setShowClearConfirmModal(true)}
                className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
              >
                清除
              </button>
              
              <button 
                onClick={handleSubmit}
                disabled={submitting}
                className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-gray-400"
              >
                {submitting ? '提交中...' : '提交填報'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
```

### 3. API 層級設計

#### 能源記錄 API
```typescript
// src/api/entries.ts
export interface UpsertEntryInput {
  page_key: string
  period_year: number
  unit: string
  monthly: Record<string, number>
  notes?: string
}

export interface EnergyEntry {
  id: string
  owner_id: string
  period_start?: string
  period_end?: string
  category: string
  scope?: string
  unit: string
  amount: number
  notes?: string
  payload: any
  created_at: string
  updated_at: string
  page_key: string
  period_year: number
  status: string
}

/**
 * 新增或更新能源填報記錄
 */
export async function upsertEnergyEntry(input: UpsertEntryInput): Promise<UpsertEntryResult> {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      throw new Error('使用者未登入')
    }

    const total = sumMonthly(input.monthly)
    const category = getCategoryFromPageKey(input.page_key)

    const entryData = {
      owner_id: user.id,
      page_key: input.page_key,
      period_year: input.period_year,
      category: category,
      unit: input.unit,
      amount: total,
      payload: {
        monthly: input.monthly,
        notes: input.notes ?? null
      },
      status: 'submitted',
      period_start: `${input.period_year}-01-01`,
      period_end: `${input.period_year}-12-31`
    }

    // 先檢查是否已存在記錄
    const { data: existingEntry } = await supabase
      .from('energy_entries')
      .select('id')
      .eq('owner_id', user.id)
      .eq('page_key', input.page_key)
      .eq('period_year', input.period_year)
      .maybeSingle()

    let data, error

    if (existingEntry) {
      // 更新現有記錄
      const updateResult = await supabase
        .from('energy_entries')
        .update(entryData)
        .eq('id', existingEntry.id)
        .select('id')
        .single()
      
      data = updateResult.data
      error = updateResult.error
    } else {
      // 插入新記錄
      const insertResult = await supabase
        .from('energy_entries')
        .insert(entryData)
        .select('id')
        .single()
      
      data = insertResult.data
      error = insertResult.error
    }

    if (error) {
      console.error('Error upserting energy entry:', error)
      throw new Error(`儲存填報記錄失敗: ${error.message}`)
    }

    return {
      entry_id: data.id
    }
  } catch (error) {
    console.error('Error in upsertEnergyEntry:', error)
    if (error instanceof Error) {
      throw error
    }
    throw new Error('儲存填報記錄時發生未知錯誤')
  }
}

/**
 * 取得使用者的能源填報記錄
 */
export async function getUserEntries(pageKey?: string, year?: number): Promise<EnergyEntry[]> {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      throw new Error('使用者未登入')
    }

    let query = supabase
      .from('energy_entries')
      .select('*')
      .eq('owner_id', user.id)
      .order('period_year', { ascending: false })
      .order('created_at', { ascending: false })

    if (pageKey) {
      query = query.eq('page_key', pageKey)
    }

    if (year) {
      query = query.eq('period_year', year)
    }

    const { data, error } = await query

    if (error) {
      console.error('Error getting user entries:', error)
      throw new Error(`取得填報記錄失敗: ${error.message}`)
    }

    return data || []
  } catch (error) {
    console.error('Error in getUserEntries:', error)
    if (error instanceof Error) {
      throw error
    }
    throw new Error('取得填報記錄時發生未知錯誤')
  }
}
```

#### 檔案管理 API
```typescript
// src/api/files.ts
export interface EvidenceFile {
  id: string
  file_path: string
  file_name: string
  mime_type: string
  file_size: number
  page_key: string
  month?: number
  created_at: string
}

/**
 * 上傳佐證檔案到 Supabase Storage
 */
export async function uploadEvidence(
  file: File, 
  pageKey: string, 
  month?: number
): Promise<EvidenceFile> {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      throw new Error('使用者未登入')
    }

    // 生成唯一檔案名
    const fileExtension = file.name.split('.').pop()
    const fileName = `${user.id}/${pageKey}/${month ? `month_${month}/` : ''}${Date.now()}.${fileExtension}`

    // 上傳到 Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('evidence')
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false
      })

    if (uploadError) {
      throw new Error(`檔案上傳失敗: ${uploadError.message}`)
    }

    // 記錄到資料庫
    const { data, error } = await supabase
      .from('evidence_files')
      .insert({
        file_path: uploadData.path,
        file_name: file.name,
        mime_type: file.type,
        file_size: file.size,
        page_key: pageKey,
        month: month || null
      })
      .select()
      .single()

    if (error) {
      throw new Error(`記錄檔案失敗: ${error.message}`)
    }

    return data
  } catch (error) {
    console.error('Error uploading evidence:', error)
    throw error
  }
}

/**
 * 取得佐證檔案列表
 */
export async function listEvidence(pageKey: string, month?: number): Promise<EvidenceFile[]> {
  try {
    let query = supabase
      .from('evidence_files')
      .select('*')
      .eq('page_key', pageKey)
      .order('created_at', { ascending: false })

    if (month !== undefined) {
      query = query.eq('month', month)
    } else {
      query = query.is('month', null)
    }

    const { data, error } = await query

    if (error) {
      console.error('Error listing evidence:', error)
      throw new Error(`取得檔案列表失敗: ${error.message}`)
    }

    return data || []
  } catch (error) {
    console.error('Error in listEvidence:', error)
    throw error
  }
}
```


### 4. 通用組件設計

#### 檔案上傳組件
```typescript
// src/components/EvidenceUpload.tsx
interface EvidenceUploadProps {
  pageKey: string
  month?: number
  files: EvidenceFile[]
  onFilesChange: (files: EvidenceFile[]) => void
  maxFiles?: number
  disabled?: boolean
  kind?: 'msds' | 'usage_evidence'
}

const EvidenceUpload: React.FC<EvidenceUploadProps> = ({
  pageKey,
  month,
  files,
  onFilesChange,
  maxFiles = 5,
  disabled = false,
  kind = 'usage_evidence'
}) => {
  const [uploading, setUploading] = useState(false)
  const [dragActive, setDragActive] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = async (selectedFiles: FileList | null) => {
    if (!selectedFiles || selectedFiles.length === 0) return
    
    const remainingSlots = maxFiles - files.length
    if (remainingSlots <= 0) {
      alert(`最多只能上傳 ${maxFiles} 個檔案`)
      return
    }

    const filesToUpload = Array.from(selectedFiles).slice(0, remainingSlots)
    setUploading(true)

    try {
      const uploadPromises = filesToUpload.map(file => 
        uploadEvidence(file, pageKey, month)
      )
      
      const uploadedFiles = await Promise.all(uploadPromises)
      onFilesChange([...files, ...uploadedFiles])
    } catch (error) {
      console.error('Upload failed:', error)
      alert(error instanceof Error ? error.message : '檔案上傳失敗')
    } finally {
      setUploading(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragActive(false)
    if (disabled || uploading) return
    handleFileSelect(e.dataTransfer.files)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    if (!disabled && !uploading) {
      setDragActive(true)
    }
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setDragActive(false)
  }

  return (
    <div className="space-y-4">
      {/* 上傳區域 */}
      <div
        className={`
          border-2 border-dashed rounded-lg p-6 transition-colors cursor-pointer
          ${dragActive ? 'border-blue-400 bg-blue-50' : 'border-gray-300'}
          ${disabled ? 'bg-gray-50 cursor-not-allowed' : 'hover:border-gray-400'}
        `}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => !disabled && !uploading && fileInputRef.current?.click()}
      >
        <div className="text-center">
          {uploading ? (
            <div className="flex flex-col items-center">
              <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-2"></div>
              <p className="text-sm text-gray-600">上傳中...</p>
            </div>
          ) : (
            <div className="flex flex-col items-center">
              <Upload className="w-12 h-12 text-gray-400 mb-4" />
              <div className="space-y-2">
                <p className="text-sm font-medium text-gray-900">
                  點擊上傳檔案或拖拽檔案到此處
                </p>
                <p className="text-xs text-gray-500">
                  支援 PDF, JPG, PNG 格式，單檔最大 50MB
                </p>
                <p className="text-xs text-gray-500">
                  最多可上傳 {maxFiles} 個檔案 ({files.length}/{maxFiles})
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept=".pdf,.jpg,.jpeg,.png"
        onChange={(e) => handleFileSelect(e.target.files)}
        className="hidden"
      />

      {/* 已上傳檔案列表 */}
      {files.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-gray-900">已上傳檔案</h4>
          <div className="space-y-2">
            {files.map((file) => (
              <div
                key={file.id}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
              >
                <div className="flex items-center space-x-3">
                  <FileText className="w-5 h-5 text-blue-500" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {file.file_name}
                    </p>
                    <p className="text-xs text-gray-500">
                      {(file.file_size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => handlePreview(file)}
                    className="p-1 text-blue-600 hover:text-blue-800"
                    title="預覽"
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(file)}
                    className="p-1 text-red-600 hover:text-red-800"
                    title="刪除"
                    disabled={disabled || uploading}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default EvidenceUpload
```

### 5. 管理員功能

#### 用戶管理
```typescript
// src/api/adminUsers.ts
export interface User {
  id: string
  display_name: string
  role: string
  is_active: boolean
  entries_count: number
}

/**
 * 從 profiles 表格取得所有使用者資料
 */
export async function listUsers(): Promise<UserProfile[]> {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, display_name, role, is_active')
      .eq('role', 'user')
      .order('display_name', { ascending: true })

    if (error) {
      console.error('Error fetching users:', error)
      throw new Error(`無法取得使用者列表: ${error.message}`)
    }

    return data || []
  } catch (error) {
    console.error('Error in listUsers:', error)
    if (error instanceof Error) {
      throw error
    }
    throw new Error('取得使用者列表時發生未知錯誤')
  }
}

/**
 * 結合使用者資料與填報統計
 */
export async function combineUsersWithCounts(): Promise<User[]> {
  try {
    const [users, entriesCountMap] = await Promise.all([
      listUsers(),
      countEntriesByOwner()
    ])

    const usersWithCounts: User[] = users.map(user => ({
      ...user,
      entries_count: entriesCountMap.get(user.id) || 0
    }))

    return usersWithCounts
  } catch (error) {
    console.error('Error in combineUsersWithCounts:', error)
    if (error instanceof Error) {
      throw error
    }
    throw new Error('結合使用者資料時發生未知錯誤')
  }
}
```

#### 管理員儀表板
```typescript
// src/pages/admin/AdminDashboard.tsx
const AdminDashboard = () => {
  const [stats, setStats] = useState({
    totalUsers: 0,
    activeUsers: 0,
    totalEntries: 0,
    pendingEntries: 0
  })

  useEffect(() => {
    loadDashboardData()
  }, [])

  const loadDashboardData = async () => {
    try {
      const [users, entries] = await Promise.all([
        combineUsersWithCounts(),
        getAllEntries()
      ])

      setStats({
        totalUsers: users.length,
        activeUsers: users.filter(u => u.is_active).length,
        totalEntries: entries.length,
        pendingEntries: entries.filter(e => e.status === 'submitted').length
      })
    } catch (error) {
      console.error('Failed to load dashboard data:', error)
    }
  }

  return (
    <div className="space-y-6">
      {/* 統計卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Users className="w-6 h-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">總用戶數</p>
              <p className="text-2xl font-bold text-gray-900">{stats.totalUsers}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <UserCheck className="w-6 h-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">活躍用戶</p>
              <p className="text-2xl font-bold text-gray-900">{stats.activeUsers}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="p-2 bg-purple-100 rounded-lg">
              <FileText className="w-6 h-6 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">填報記錄</p>
              <p className="text-2xl font-bold text-gray-900">{stats.totalEntries}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="p-2 bg-orange-100 rounded-lg">
              <Clock className="w-6 h-6 text-orange-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">待審核</p>
              <p className="text-2xl font-bold text-gray-900">{stats.pendingEntries}</p>
            </div>
          </div>
        </div>
      </div>

      {/* 圖表區域 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 填報趨勢圖 */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-medium text-gray-900 mb-4">填報趨勢</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={monthlyStats}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="entries" stroke="#3B82F6" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* 能源類別分佈 */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-medium text-gray-900 mb-4">能源類別分佈</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={categoryStats}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={renderCustomizedLabel}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {categoryStats.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}
```

## 資料庫整合

### RLS (Row Level Security) 政策
系統依賴 Supabase 的 RLS 政策來確保資料安全：

```sql
-- energy_entries 表的 RLS 政策
CREATE POLICY "Users can view own entries" ON energy_entries
  FOR SELECT USING (auth.uid() = owner_id);

CREATE POLICY "Users can insert own entries" ON energy_entries
  FOR INSERT WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Users can update own entries" ON energy_entries
  FOR UPDATE USING (auth.uid() = owner_id);

-- 管理員可以查看所有記錄
CREATE POLICY "Admins can view all entries" ON energy_entries
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );
```

### 資料表關聯
```typescript
// 主要資料表關聯
interface DatabaseSchema {
  profiles: {
    id: string // UUID (對應 Supabase Auth)
    email: string
    display_name: string
    role: 'admin' | 'user'
    is_active: boolean
  }

  energy_entries: {
    id: string
    owner_id: string // 外鍵 → profiles.id
    page_key: string // 能源類別標識
    category: string // 能源類別名稱
    scope: number // 1, 2, 3
    period_year: number
    amount: number // 年度總量
    unit: string
    payload: {
      monthly: Record<string, number> // 月度數據
      notes?: string
    }
    status: 'draft' | 'submitted' | 'approved' | 'rejected'
  }

  evidence_files: {
    id: string
    entry_id?: string // 外鍵 → energy_entries.id (可選)
    file_path: string // Storage 路徑
    page_key: string
    month?: number // 月份 (1-12) 或 null (MSDS)
    file_name: string
    mime_type: string
    file_size: number
  }

}
```

## 狀態管理策略

### 1. 認證狀態 - AuthContext
```typescript
// 全域認證狀態，提供給整個應用程式
const authState = {
  user: User | null,
  loading: boolean,
  isAdmin: boolean
}
```

### 2. 表單狀態 - Local State + React Hook Form
```typescript
// 每個填報頁面的本地狀態
const formState = {
  // 基本資訊
  year: number,
  unitCapacity: number,
  carbonRate: number,
  
  // 月度資料
  monthlyData: MonthData[],
  
  // 檔案狀態
  msdsFiles: EvidenceFile[],
  
  // UI 狀態
  loading: boolean,
  submitting: boolean,
  hasUnsavedChanges: boolean
}
```

### 3. 快取狀態 - React Query (未來)
```typescript
// API 資料快取 (建議未來實施)
const queryKeys = {
  entries: ['entries'] as const,
  entry: (id: string) => ['entries', id] as const,
  userEntries: (userId: string) => ['entries', 'user', userId] as const,
  files: (pageKey: string, month?: number) => ['files', pageKey, month] as const,
}

// 使用範例
const { data: entries, isLoading, error } = useQuery({
  queryKey: queryKeys.userEntries(user.id),
  queryFn: () => getUserEntries(),
  enabled: !!user.id
})
```

## 測試策略

### 單元測試
```typescript
// src/api/__tests__/entries.test.ts
describe('entries API', () => {
  test('upsertEnergyEntry should create new entry', async () => {
    const mockInput: UpsertEntryInput = {
      page_key: 'wd40',
      period_year: 2024,
      unit: 'ML',
      monthly: { '1': 10, '2': 15 },
      notes: 'Test entry'
    }

    const result = await upsertEnergyEntry(mockInput)
    
    expect(result).toHaveProperty('entry_id')
    expect(typeof result.entry_id).toBe('string')
  })

  test('getUserEntries should return user entries only', async () => {
    const entries = await getUserEntries()
    
    expect(Array.isArray(entries)).toBe(true)
    entries.forEach(entry => {
      expect(entry.owner_id).toBe(mockUser.id)
    })
  })
})
```

### 組件測試
```typescript
// src/components/__tests__/EvidenceUpload.test.tsx
describe('EvidenceUpload', () => {
  test('should render upload area', () => {
    render(
      <EvidenceUpload
        pageKey="wd40"
        files={[]}
        onFilesChange={jest.fn()}
      />
    )

    expect(screen.getByText('點擊上傳檔案或拖拽檔案到此處')).toBeInTheDocument()
  })

  test('should handle file selection', async () => {
    const mockOnFilesChange = jest.fn()
    const { container } = render(
      <EvidenceUpload
        pageKey="wd40"
        files={[]}
        onFilesChange={mockOnFilesChange}
      />
    )

    const fileInput = container.querySelector('input[type="file"]')
    const file = new File(['test content'], 'test.pdf', { type: 'application/pdf' })

    fireEvent.change(fileInput, { target: { files: [file] } })

    await waitFor(() => {
      expect(mockOnFilesChange).toHaveBeenCalled()
    })
  })
})

// src/components/__tests__/StatusIndicator.test.tsx
describe('StatusIndicator', () => {
  test('should render different status correctly', () => {
    const { rerender } = render(<StatusIndicator status="submitted" />)
    expect(screen.getByText('已提交')).toBeInTheDocument()

    rerender(<StatusIndicator status="approved" />)
    expect(screen.getByText('已通過')).toBeInTheDocument()

    rerender(<StatusIndicator status="rejected" />)
    expect(screen.getByText('已退回')).toBeInTheDocument()
  })

  test('should apply correct color styling', () => {
    render(<StatusIndicator status="approved" />)
    const indicator = screen.getByTestId('status-indicator')
    expect(indicator).toHaveStyle({ color: '#10b981' })
  })
})
```

### E2E 測試
```typescript
// tests/e2e/energy-entry.spec.ts
test('complete energy entry flow', async ({ page }) => {
  // 登入
  await page.goto('/login')
  await page.fill('[name="email"]', 'test@example.com')
  await page.fill('[name="password"]', 'password')
  await page.click('button[type="submit"]')

  // 導航到 WD-40 頁面
  await page.goto('/category1/wd40')
  
  // 填寫基本參數
  await page.fill('[name="unitCapacity"]', '500')
  await page.fill('[name="carbonRate"]', '85')

  // 填寫月度資料
  await page.fill('[data-month="1"] input[name="quantity"]', '10')
  
  // 上傳檔案
  await page.setInputFiles('[type="file"]', 'test-files/msds.pdf')
  
  // 提交表單
  await page.click('button:has-text("提交填報")')
  
  // 驗證成功訊息
  await expect(page.locator('.success-message')).toBeVisible()
})
```

## 部署與維護

### 環境配置
```bash
# .env (開發環境)
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_APP_ENV=development

# .env.production (生產環境)
VITE_SUPABASE_URL=https://your-prod-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-prod-anon-key
VITE_APP_ENV=production
```

### 建置與部署
```bash
# 安裝依賴
npm install

# 開發環境
npm run dev

# 生產建置
npm run build

# 預覽建置結果
npm run preview

# 測試
npm run test
npm run test:e2e

# 代碼品質檢查
npm run lint
npm run type-check
npm run format:check
```

### Docker 部署
```dockerfile
# frontend/Dockerfile
FROM node:18-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/nginx.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

### 性能監控
```typescript
// src/utils/performance.ts
export const trackPageLoad = (pageName: string) => {
  const startTime = performance.now()
  
  return () => {
    const endTime = performance.now()
    const loadTime = endTime - startTime
    
    // 發送到監控服務
    if (window.gtag) {
      window.gtag('event', 'page_load_time', {
        page_name: pageName,
        value: Math.round(loadTime)
      })
    }
    
    console.log(`${pageName} loaded in ${loadTime.toFixed(2)}ms`)
  }
}

// 使用範例
const WD40Page = () => {
  useEffect(() => {
    const trackLoad = trackPageLoad('WD40Page')
    return trackLoad
  }, [])
  
  // ...
}
```

### 錯誤監控
```typescript
// src/utils/errorTracking.ts
export const captureError = (error: Error, context?: Record<string, any>) => {
  // 發送到錯誤追蹤服務 (如 Sentry)
  console.error('Application error:', error, context)
  
  // 可以整合 Sentry
  // Sentry.captureException(error, { extra: context })
}

// 全域錯誤處理
window.addEventListener('unhandledrejection', (event) => {
  captureError(new Error(event.reason), {
    type: 'unhandledrejection',
    promise: event.promise
  })
})
```

## 開發最佳實踐

### 1. 代碼組織
- 按功能模塊組織代碼，而不是按文件類型
- 使用絕對路徑導入，避免複雜的相對路徑
- 保持組件單一職責，避免過大的組件文件

### 2. 類型安全
- 為所有 API 響應定義 TypeScript 類型
- 使用 Zod 進行運行時資料驗證
- 避免使用 `any` 類型，使用具體的類型定義

### 3. 性能優化
- 使用 React.memo 優化不必要的重新渲染
- 實施虛擬滾動處理大量資料列表
- 使用動態導入進行代碼分割

### 4. 可訪問性
- 為所有互動元素提供適當的 ARIA 標籤
- 確保鍵盤導航支援
- 提供適當的顏色對比度

### 5. 安全性
- 永遠不在前端代碼中暴露敏感資訊
- 依賴後端 RLS 政策進行資料安全
- 實施適當的輸入驗證和清理

## 故障排除

### 常見問題

#### 1. Supabase 連接問題
```typescript
// 檢查環境變數
console.log('Supabase URL:', import.meta.env.VITE_SUPABASE_URL)
console.log('Supabase Key:', import.meta.env.VITE_SUPABASE_ANON_KEY?.substring(0, 10) + '...')

// 測試連接
const testConnection = async () => {
  try {
    const { data, error } = await supabase.from('profiles').select('count').single()
    console.log('Connection test:', { data, error })
  } catch (error) {
    console.error('Connection failed:', error)
  }
}
```

#### 2. RLS 政策問題
```sql
-- 檢查當前用戶
SELECT auth.uid(), auth.jwt();

-- 檢查 RLS 政策
SELECT * FROM pg_policies WHERE tablename = 'energy_entries';

-- 測試查詢權限
SELECT * FROM energy_entries WHERE owner_id = auth.uid();
```

#### 3. 檔案上傳問題
```typescript
// 檢查 Storage 政策
const testStorageAccess = async () => {
  try {
    const { data, error } = await supabase.storage
      .from('evidence')
      .list('test', {
        limit: 1
      })
    console.log('Storage access test:', { data, error })
  } catch (error) {
    console.error('Storage access failed:', error)
  }
}
```

### 開發工具

#### 1. React Developer Tools
- 安裝 React DevTools 瀏覽器擴展
- 使用 Profiler 分析組件性能
- 檢查組件狀態和 props

#### 2. Supabase Dashboard
- 使用 Supabase Dashboard 監控資料庫
- 查看 RLS 政策執行情況
- 監控 API 請求和錯誤

#### 3. Network Tab
- 監控 API 請求和響應
- 檢查請求標頭和認證資訊
- 分析網路性能

## 結論

這份前端開發指引基於實際的專案架構和現有代碼，提供了完整的開發框架和最佳實踐。通過遵循這些指導原則，開發團隊可以：

1. **快速上手** - 清晰的專案結構和代碼範例
2. **保持一致性** - 統一的開發規範和模式
3. **確保品質** - 完善的測試策略和錯誤處理
4. **提升性能** - 優化建議和監控機制
5. **安全可靠** - 基於 RLS 的安全架構

系統採用現代化的技術棧和企業級的架構設計，為未來的擴展和維護奠定了堅實的基礎。隨著業務需求的變化，這個架構可以靈活適應並持續演進。

## 版本歷史

| 版本 | 日期 | 變更內容 | 作者 |
|------|------|----------|------|
| 2.0 | 2025-09-12 | 移除草稿功能，更新為實際開發指引 | Frontend Team |
| 1.0 | 2025-09-09 | 初始前端開發指引 | Frontend Team |

---
**最後更新**: 2025-09-12  
**狀態**: 已完成  
**維護團隊**: 前端開發組