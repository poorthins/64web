# 管理員頁面重構 POC 實施計畫

## 🎯 POC 目標
驗證新管理員介面設計的可行性，實現核心功能的原型版本，為正式開發提供技術和設計驗證。

## 📋 POC 範圍與限制

### ✅ 包含功能
- 4個核心頁面的前端實現
- 基本交互功能（點擊、表單驗證、篩選）
- 假資料模擬真實場景
- 響應式設計驗證

### ❌ 暫不包含
- 後端 API 整合
- 真實資料庫操作
- 複雜的狀態管理
- 完整的錯誤處理

## 🏗️ 技術架構

### 基礎設定
```
技術棧：React 18 + TypeScript + Tailwind CSS
專案結構：在現有 frontend 中新增 POC 資料夾
路由：使用 React Router 獨立 POC 路由
樣式：Tailwind CSS + 自定義 CSS
圖標：Emoji 符號（確保跨平台相容）
```

### 檔案結構
```
frontend/src/
├── pages/admin/poc/
│   ├── components/           # POC 專用元件
│   │   ├── StatusCard.tsx    # 統計卡片元件
│   │   ├── UserCard.tsx      # 用戶卡片元件
│   │   ├── FilterBar.tsx     # 篩選欄元件
│   │   └── ListItem.tsx      # 列表項目元件
│   │
│   ├── data/                 # 假資料
│   │   ├── mockUsers.ts      # 模擬用戶資料
│   │   ├── mockStatistics.ts # 模擬統計資料
│   │   └── mockSubmissions.ts # 模擬填報資料
│   │
│   ├── AdminDashboardPOC.tsx     # 主控台
│   ├── CreateUserPOC.tsx         # 建立用戶
│   ├── EditUserPOC.tsx           # 編輯用戶
│   ├── StatisticsDetailPOC.tsx   # 填報管理
│   └── index.tsx                 # POC 入口
│
└── routes/poc.tsx            # POC 路由設定
```

## 📝 詳細實施規格

### 1. 管理員主控台 (AdminDashboardPOC.tsx)

#### 功能需求
- 4個統計卡片（一行排列）
- 用戶管理區域
- 搜尋和篩選
- 用戶卡片列表

#### 元件結構
```typescript
interface StatisticsCard {
  icon: string
  title: string
  value: number
  status: 'submitted' | 'pending' | 'approved' | 'rejected'
  onClick: () => void
}

interface UserCard {
  id: string
  name: string
  email: string
  company: string
  targetYear: number
  visibleCategories: number
  totalCategories: number
  submittedCount: number
  isActive: boolean
}
```

#### 假資料需求
```typescript
// 模擬統計資料
const mockStatistics = {
  submitted: 42,
  pending: 7,
  approved: 28,
  rejected: 7
}

// 模擬用戶資料（至少 6 個用戶，包含不同狀態）
const mockUsers = [
  { name: '張三', company: '三媽臭臭鍋', status: 'active', ... },
  { name: '李四', company: '鼎泰豐', status: 'active', ... },
  { name: '王五', company: '麥當勞', status: 'inactive', ... },
  // ... 更多用戶
]
```

### 2. 建立用戶頁面 (CreateUserPOC.tsx)

#### 功能需求
- 基本資料表單
- 14個能源類別選擇（按範疇分組）
- 目標年份輸入
- 柴油發電機版本選擇
- 表單驗證

#### 表單結構
```typescript
interface CreateUserForm {
  // 基本資料
  name: string
  email: string
  password: string
  confirmPassword: string
  company?: string
  jobTitle?: string
  phone?: string
  role: 'user' | 'admin'
  
  // 填報設定
  targetYear: number
  dieselGeneratorMode: 'refuel' | 'test'
  visibleCategories: string[]
}
```

#### 能源類別資料
```typescript
const energyCategories = {
  scope1: [
    { key: 'wd40', name: 'WD-40' },
    { key: 'acetylene', name: '乙炔' },
    { key: 'refrigerant', name: '冷媒' },
    { key: 'septictank', name: '化糞池' },
    { key: 'natural_gas', name: '天然氣' },
    { key: 'urea', name: '尿素' },
    { key: 'diesel_generator', name: '柴油（發電機）' },
    { key: 'diesel', name: '柴油' },
    { key: 'gasoline', name: '汽油' },
    { key: 'lpg', name: '液化石油氣' },
    { key: 'fire_extinguisher', name: '滅火器' },
    { key: 'welding_rod', name: '焊條' }
  ],
  scope2: [
    { key: 'electricity_bill', name: '外購電力' }
  ],
  scope3: [
    { key: 'employee_commute', name: '員工通勤' }
  ]
}
```

### 3. 編輯用戶頁面 (EditUserPOC.tsx)

#### 功能需求
- 主要內容區（表單）
- 側邊欄（快速操作 + 統計）
- 用戶狀態切換
- 預填現有資料

#### 佈局結構
```typescript
// 主輔佈局
<div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
  <div className="lg:col-span-2">
    {/* 主要表單內容 */}
    <EditUserForm />
  </div>
  <div className="lg:col-span-1">
    {/* 側邊欄 */}
    <UserSidebar />
  </div>
</div>
```

### 4. 填報管理頁面 (StatisticsDetailPOC.tsx)

#### 功能需求
- 4個狀態卡片（可點擊切換）
- 篩選功能（用戶、類別、排序）
- 記錄列表顯示
- 分頁功能

#### 資料結構
```typescript
interface SubmissionRecord {
  id: string
  userId: string
  userName: string
  company: string
  category: string
  status: 'submitted' | 'pending' | 'approved' | 'rejected'
  submitTime: string
  totalAmount: string
  unit: string
  fileCount: number
}
```

## 🎨 設計系統

### 色彩配置
```css
/* 主要色彩 */
--primary-blue: #2563eb
--success-green: #059669
--warning-orange: #ea580c
--error-red: #dc2626

/* 狀態色彩 */
--submitted: #dbeafe (淺藍)
--pending: #fed7aa (淺橘)
--approved: #dcfce7 (淺綠)
--rejected: #fee2e2 (淺紅)

/* 中性色彩 */
--gray-50: #f9fafb
--gray-100: #f3f4f6
--gray-200: #e5e7eb
--gray-600: #4b5563
--gray-900: #111827
```

### 間距系統
```css
/* 基於 Tailwind 的 8px 系統 */
--spacing-xs: 4px    /* space-1 */
--spacing-sm: 8px    /* space-2 */
--spacing-md: 16px   /* space-4 */
--spacing-lg: 24px   /* space-6 */
--spacing-xl: 32px   /* space-8 */
```

## 📱 響應式設計要求

### 斷點設定
```css
/* 手機版 */
@media (max-width: 768px) {
  .status-cards { grid-template-columns: repeat(2, 1fr); }
  .main-layout { grid-template-columns: 1fr; }
}

/* 平板版 */
@media (min-width: 768px) and (max-width: 1024px) {
  .status-cards { grid-template-columns: repeat(4, 1fr); }
}

/* 桌面版 */
@media (min-width: 1024px) {
  .main-layout { grid-template-columns: 2fr 1fr; }
}
```

## 🧪 測試場景

### 功能測試
1. **主控台測試**
   - 4個統計卡片點擊跳轉
   - 用戶搜尋和篩選
   - 快速導航按鈕功能

2. **建立用戶測試**
   - 表單驗證（必填欄位、Email 格式、密碼確認）
   - 類別選擇（至少選一個、全選功能）
   - 成功提交模擬

3. **編輯用戶測試**
   - 資料預填和修改
   - 狀態切換功能
   - 側邊欄快速操作

4. **填報管理測試**
   - 狀態卡片切換
   - 篩選和排序功能
   - 列表項目點擊

### 響應式測試
- iPhone SE (375px)
- iPad (768px)
- Desktop (1024px+)

## 🚀 實施時程

### Week 1: 基礎架構
**Day 1-2: 環境設定**
- 建立 POC 資料夾結構
- 設定路由和基礎元件
- 準備假資料

**Day 3-5: 主控台實現**
- AdminDashboardPOC 完整功能
- 統計卡片和用戶列表
- 基本交互測試

### Week 2: 核心頁面
**Day 1-3: 建立用戶頁面**
- CreateUserPOC 表單實現
- 14個類別選擇功能
- 表單驗證邏輯

**Day 4-5: 編輯用戶頁面**
- EditUserPOC 主輔佈局
- 側邊欄功能實現
- 狀態切換功能

### Week 3: 填報管理
**Day 1-3: 填報管理頁面**
- StatisticsDetailPOC 實現
- 狀態篩選和列表顯示
- 篩選和排序功能

**Day 4-5: 整合測試**
- 跨頁面導航測試
- 響應式設計調整
- 細節優化

## ✅ 驗收標準

### 功能完整性
- [ ] 4個頁面基本功能正常
- [ ] 頁面間導航流暢
- [ ] 表單驗證正確
- [ ] 篩選功能有效

### 設計還原度
- [ ] 視覺設計符合原型
- [ ] 交互體驗順暢
- [ ] 響應式適配良好
- [ ] 色彩和間距一致

### 技術品質
- [ ] TypeScript 類型完整
- [ ] 元件結構清晰
- [ ] 程式碼可讀性高
- [ ] 無 console 錯誤

## 📋 交付物清單

1. **完整的 POC 程式碼**
   - 4個頁面元件
   - 共用元件庫
   - 假資料檔案

2. **部署版本**
   - 可訪問的線上 POC
   - 操作說明文檔

3. **技術文檔**
   - 元件 API 說明
   - 資料結構定義
   - 已知問題清單

4. **下一步建議**
   - 正式開發優先級
   - 技術風險評估
   - 預估工作量

---

## 🎯 Claude Code 執行建議

將此計畫分為 3 個主要任務提交給 Claude Code：

### Task 1: 基礎架構 + 主控台
```
實現 POC 基礎架構和管理員主控台頁面，包含統計卡片、用戶列表、搜尋篩選功能
```

### Task 2: 用戶管理頁面
```
實現建立用戶和編輯用戶頁面，包含完整表單、類別選擇、側邊欄功能
```

### Task 3: 填報管理頁面
```
實現填報管理頁面，包含狀態篩選、記錄列表、排序功能
```

每個任務都提供詳細的技術規格和假資料，確保 Claude Code 能夠準確實現設計需求。