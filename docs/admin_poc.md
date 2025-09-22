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
// 模擬填報記錄（包含不同狀態和審核資訊）
const mockSubmissions = [
  // 待審核記錄
  {
    id: 'sub-001',
    userId: 'user-001',
    userName: '張三',
    company: '三媽臭臭鍋',
    category: '天然氣',
    status: 'pending',
    submitTime: '2024-09-18 14:30',
    totalAmount: '1,250',
    unit: 'm³',
    fileCount: 5
  },
  {
    id: 'sub-002',
    userId: 'user-002',
    userName: '李四',
    company: '鼎泰豐',
    category: '外購電力',
    status: 'pending',
    submitTime: '2024-09-17 10:15',
    totalAmount: '25,400',
    unit: 'kWh',
    fileCount: 12
  },
  
  // 已通過記錄
  {
    id: 'sub-003',
    userId: 'user-002',
    userName: '李四',
    company: '鼎泰豐',
    category: '員工通勤',
    status: 'approved',
    submitTime: '2024-09-13 15:45',
    totalAmount: '2,400',
    unit: 'person-km',
    fileCount: 4,
    approvedAt: '2024-09-14 09:20',
    approvedBy: '管理員 Timmy'
  },
  
  // 已退回記錄
  {
    id: 'sub-004',
    userId: 'user-003',
    userName: '王五',
    company: '麥當勞',
    category: '冷媒',
    status: 'rejected',
    submitTime: '2024-09-12 13:20',
    totalAmount: '25',
    unit: 'kg',
    fileCount: 2,
    rejectionReason: '佐證檔案不齊全，缺少MSDS安全資料表，請補充相關證明文件後重新提交。',
    rejectedAt: '2024-09-13 16:45',
    rejectedBy: '管理員 Timmy'
  },
  {
    id: 'sub-005',
    userId: 'user-001',
    userName: '張三',
    company: '三媽臭臭鍋',
    category: '汽油',
    status: 'rejected',
    submitTime: '2024-09-10 11:30',
    totalAmount: '320',
    unit: 'L',
    fileCount: 3,
    rejectionReason: '使用量數據異常，8月份填報量過高，請確認數據正確性。',
    rejectedAt: '2024-09-11 14:20',
    rejectedBy: '管理員 Timmy'
  },
  
  // 已提交記錄
  {
    id: 'sub-006',
    userId: 'user-004',
    userName: '陳六',
    company: '7-ELEVEN',
    category: 'WD-40',
    status: 'submitted',
    submitTime: '2024-09-15 11:30',
    totalAmount: '150',
    unit: 'ML',
    fileCount: 3
  }
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
- **🆕 審核操作功能**
- 分頁功能

#### 審核功能設計
```typescript
// 待審核狀態：顯示審核按鈕
interface PendingActions {
  onApprove: (recordId: string) => void
  onReject: (recordId: string, reason: string) => void
}

// 已退回狀態：顯示退回原因
interface RejectedRecord extends SubmissionRecord {
  rejectionReason: string
  rejectedAt: string
  rejectedBy: string
}
```

#### 審核操作 UI 設計
```typescript
// 待審核記錄的操作區
<div className="flex gap-2 mt-3">
  <button 
    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
    onClick={() => handleApprove(record.id)}
  >
    ✅ 通過
  </button>
  <button 
    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
    onClick={() => setRejectingId(record.id)}
  >
    ❌ 退回
  </button>
</div>

// 退回原因輸入彈窗
{rejectingId && (
  <RejectModal
    recordId={rejectingId}
    onConfirm={handleReject}
    onCancel={() => setRejectingId(null)}
  />
)}

// 已退回記錄的原因顯示
{record.status === 'rejected' && (
  <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
    <div className="text-sm text-red-800">
      <span className="font-medium">退回原因：</span>
      {record.rejectionReason}
    </div>
    <div className="text-xs text-red-600 mt-1">
      {record.rejectedAt} 由 {record.rejectedBy} 退回
    </div>
  </div>
)}
```

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
  
  // 🆕 審核相關欄位
  rejectionReason?: string    // 退回原因
  rejectedAt?: string        // 退回時間
  rejectedBy?: string        // 退回者
  approvedAt?: string        // 通過時間
  approvedBy?: string        // 通過者
}
```

#### 退回原因彈窗元件
```typescript
interface RejectModalProps {
  recordId: string
  onConfirm: (recordId: string, reason: string) => void
  onCancel: () => void
}

const RejectModal: React.FC<RejectModalProps> = ({ recordId, onConfirm, onCancel }) => {
  const [reason, setReason] = useState('')
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <h3 className="text-lg font-semibold mb-4">退回填報記錄</h3>
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            退回原因 <span className="text-red-500">*</span>
          </label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="請說明退回原因..."
            className="w-full px-3 py-2 border border-gray-300 rounded-lg resize-none"
            rows={4}
          />
        </div>
        <div className="flex gap-3 justify-end">
          <button
            onClick={onCancel}
            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            取消
          </button>
          <button
            onClick={() => onConfirm(recordId, reason)}
            disabled={!reason.trim()}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
          >
            確認退回
          </button>
        </div>
      </div>
    </div>
  )
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
   - **🆕 審核操作測試**
     - 待審核記錄顯示審核按鈕
     - 通過按鈕功能
     - 退回彈窗和原因輸入
     - 已退回記錄顯示原因

5. **🆕 審核工作流測試**
   - 點擊「待審核」狀態卡片
   - 確認記錄有審核按鈕
   - 測試通過操作（狀態變更）
   - 測試退回操作（彈窗 + 原因輸入）
   - 退回後在「已退回」狀態查看原因顯示

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

### Task 3: 填報管理頁面 + 審核功能
```
實現填報管理頁面，包含狀態篩選、記錄列表、排序功能，以及完整的審核操作功能（通過/退回按鈕、退回原因彈窗、已退回記錄的原因顯示）
```

每個任務都提供詳細的技術規格和假資料，確保 Claude Code 能夠準確實現設計需求。