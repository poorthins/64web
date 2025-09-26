# 管理員頁面重構 PRD v2.0 - 完整詳細版

---
**版本**: 2.0  
**日期**: 2025-09-22  
**狀態**: 開發規格確認  
**目的**: 提供完整的開發指引，包含詳細的 API 連接和介面設計規格

---

## 📋 專案概述

### 專案目標
重新設計碳足跡盤查系統的管理員介面，建立現代化、直觀、高效的管理後台。

### 核心價值
- **簡化操作流程**：減少管理員的操作步驟
- **提升工作效率**：批量操作、快速導航
- **優化視覺體驗**：現代化設計語言

### 技術限制
- 必須相容現有 Supabase 資料庫結構
- 保持現有 API 的向後相容性
- 支援漸進式部署

---

## 🎯 功能需求詳細規格

### 1. 用戶管理模組

#### 1.1 用戶列表頁面
**功能描述**：顯示所有系統用戶，提供搜尋、篩選、快速操作功能。

**資料來源 API**：
```typescript
// API: frontend/src/api/adminUsers.ts
interface UserListAPI {
  endpoint: listUsers()
  returns: Promise<UserProfile[]>
  
  UserProfile {
    id: string
    display_name: string
    email: string
    company?: string
    role: 'admin' | 'user'
    is_active: boolean
    created_at: string
    last_login?: string
    filling_config?: {
      diesel_generator_mode: 'refuel' | 'test'
      visible_categories: string[]
      target_year: number
    }
  }
}
```

**介面設計規格**：
```
┌─────────────────────────────────────────────────────┐
│ 🔍 搜尋列                                           │
│ [輸入姓名/Email/公司...]  [篩選▼] [+ 新增用戶]      │
├─────────────────────────────────────────────────────┤
│ 用戶卡片網格（每行 3 個）                           │
│ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐  │
│ │ 👤 張三      │ │ 👤 李四      │ │ 👤 王五      │  │
│ │ 三媽臭臭鍋   │ │ 鼎泰豐       │ │ 麥當勞       │  │
│ │ user@xxx     │ │ lee@xxx      │ │ wang@xxx     │  │
│ │             │ │             │ │             │  │
│ │ 2024年度     │ │ 2024年度     │ │ 2024年度     │  │
│ │ 4/14 類別    │ │ 7/14 類別    │ │ 14/14 類別   │  │
│ │             │ │             │ │             │  │
│ │ [📄][👁️][✏️][📊] │ │ [📄][👁️][✏️][📊] │ │ [📄][👁️][✏️][📊] │  │
│ └─────────────┘ └─────────────┘ └─────────────┘  │
└─────────────────────────────────────────────────────┘
```

**互動邏輯**：
- 搜尋：即時搜尋（debounce 500ms）
- 篩選：角色（全部/管理員/用戶）、狀態（全部/啟用/停用）
- 卡片按鈕：
  - 📄 查看填報 → `/admin/user-submissions/${userId}`
  - 👁️ 查看審核 → `/admin/reviews?userId=${userId}`
  - ✏️ 編輯 → `/admin/edit-user/${userId}`
  - 📊 匯出 → 開啟匯出對話框

#### 1.2 建立用戶頁面
**功能描述**：建立新用戶帳號，設定權限和填報配置。

**API 連接**：
```typescript
// API: frontend/src/api/adminUsers.ts
interface CreateUserAPI {
  endpoint: createUser(userData)
  payload: {
    email: string
    password: string
    display_name: string
    company?: string
    job_title?: string
    phone?: string
    role: 'admin' | 'user'
    filling_config: {
      diesel_generator_mode: 'refuel' | 'test'
      visible_categories: string[]
      target_year: number
    }
  }
  returns: Promise<{ user: User, error?: Error }>
}
```

**介面設計規格**：
```
┌─────────────────────────────────────────────────────┐
│ ← 返回用戶管理    建立新用戶                        │
├─────────────────────────────────────────────────────┤
│                                                     │
│ 基本資料                                            │
│ ┌─────────────────────────────────────────────┐   │
│ │ 姓名 *         [_______________]             │   │
│ │ Email *        [_______________]             │   │
│ │ 密碼 *         [_______________]             │   │
│ │ 確認密碼 *     [_______________]             │   │
│ │ 公司           [_______________]             │   │
│ │ 職稱           [_______________]             │   │
│ │ 電話           [_______________]             │   │
│ │ 角色           (●) 一般用戶  ( ) 管理員      │   │
│ └─────────────────────────────────────────────┘   │
│                                                     │
│ 填報設定                                            │
│ ┌─────────────────────────────────────────────┐   │
│ │ 目標年度       [2024_____▼]                 │   │
│ │                                              │   │
│ │ 可見類別（至少選擇一項）                      │   │
│ │ 範疇一 [全選]                                │   │
│ │ □ WD-40  □ 乙炔  □ 冷媒  □ 化糞池          │   │
│ │ □ 天然氣  □ 尿素  □ 柴油(發電機)            │   │
│ │ □ 柴油  □ 汽油  □ 液化石油氣                │   │
│ │ □ 滅火器  □ 焊條                            │   │
│ │                                              │   │
│ │ 範疇二                                       │   │
│ │ □ 外購電力                                   │   │
│ │                                              │   │
│ │ 範疇三                                       │   │
│ │ □ 員工通勤                                   │   │
│ │                                              │   │
│ │ 柴油發電機版本                               │   │
│ │ (●) 加油版  ( ) 測試版                      │   │
│ └─────────────────────────────────────────────┘   │
│                                                     │
│ [取消]                              [建立用戶]      │
└─────────────────────────────────────────────────────┘
```

**表單驗證規則**：
- Email：必填、格式驗證、唯一性檢查
- 密碼：必填、最少 6 字元、確認密碼相符
- 姓名：必填、2-50 字元
- 類別：至少選擇一個
- 年度：必填、合理範圍（2020-2030）

#### 1.3 編輯用戶頁面
**功能描述**：修改用戶資料、調整權限配置、查看用戶統計。

**API 連接**：
```typescript
// 取得用戶資料
interface GetUserAPI {
  endpoint: getUserById(userId)
  returns: Promise<UserProfile>
}

// 更新用戶資料
interface UpdateUserAPI {
  endpoint: updateUser(userId, userData)
  payload: Partial<CreateUserPayload>
  returns: Promise<{ success: boolean }>
}

// 切換用戶狀態
interface ToggleUserStatusAPI {
  endpoint: toggleUserStatus(userId)
  returns: Promise<{ is_active: boolean }>
}
```

**介面設計規格**：
```
┌─────────────────────────────────────────────────────┐
│ ← 返回    編輯用戶                    [停用用戶]    │
├───────────────────────┬─────────────────────────────┤
│ 主要內容區（2/3）      │ 側邊欄（1/3）              │
│                       │                             │
│ 基本資料              │ 🚀 快速操作                 │
│ [表單同建立頁面]       │ ┌───────────────────┐     │
│                       │ │ 📄 查看填報記錄     │     │
│ 填報設定              │ │ 👁️ 查看審核狀態    │     │
│                       │ │ 🔑 重設密碼        │     │
│ [表單同建立頁面]       │ │ 📊 匯出用戶資料    │     │
│                       │ └───────────────────┘     │
│                       │                             │
│                       │ 📈 用戶統計                 │
│                       │ ┌───────────────────┐     │
│                       │ │ 註冊日期：2024-01  │     │
│                       │ │ 最後登入：昨天     │     │
│                       │ │ 填報進度：4/14     │     │
│                       │ │ 已提交：3筆        │     │
│                       │ │ 已通過：1筆        │     │
│                       │ └───────────────────┘     │
│                       │                             │
│ [取消]    [儲存變更]   │ 👤 帳戶狀態                │
│                       │ ┌───────────────────┐     │
│                       │ │ 狀態：✅ 啟用中    │     │
│                       │ │ 角色：一般用戶     │     │
│                       │ │ 年度：2024         │     │
│                       │ └───────────────────┘     │
└───────────────────────┴─────────────────────────────┘
```

### 2. 填報審核模組

#### 2.1 填報管理頁面
**功能描述**：查看所有填報記錄、執行審核操作、管理審核流程。

**API 連接**：
```typescript
// 取得填報記錄
interface GetSubmissionsAPI {
  endpoint: getSubmissions(filters?)
  params: {
    status?: 'submitted' | 'approved' | 'rejected'
    userId?: string
    category?: string
    year?: number
    orderBy?: 'submitTime' | 'userName' | 'category'
    order?: 'asc' | 'desc'
  }
  returns: Promise<SubmissionRecord[]>
}

// 審核操作
interface ReviewAPI {
  endpoint: reviewEntry(entryId, action, notes?)
  payload: {
    action: 'approve' | 'reject'
    notes?: string  // 退回時必填
  }
  returns: Promise<{ success: boolean }>
}
```

**介面設計規格**：
```
┌─────────────────────────────────────────────────────┐
│ 填報管理                                            │
├─────────────────────────────────────────────────────┤
│ 狀態篩選（點擊切換）                                │
│ ┌──────────┐ ┌──────────┐ ┌──────────┐           │
│ │ 📝 已提交 │ │ ✅ 已通過 │ │ ❌ 已退回 │           │
│ │    15    │ │    28    │ │     7    │           │
│ └──────────┘ └──────────┘ └──────────┘           │
├─────────────────────────────────────────────────────┤
│ 篩選條件                                            │
│ [用戶▼] [類別▼] [年度▼] [排序：最新提交▼]         │
├─────────────────────────────────────────────────────┤
│ 記錄列表                                            │
│ ┌─────────────────────────────────────────────┐   │
│ │ 張三 - WD-40              已提交 2024-12-20   │   │
│ │ 三媽臭臭鍋 | 2024年度                        │   │
│ │ 總量：250.5 公升 | 檔案：3個                  │   │
│ │                     [✅ 通過] [❌ 退回]       │   │
│ ├─────────────────────────────────────────────┤   │
│ │ 李四 - 天然氣             已退回 2024-12-19   │   │
│ │ 鼎泰豐 | 2024年度                            │   │
│ │ 總量：1,250 立方公尺 | 檔案：2個              │   │
│ │ ┌───────────────────────────────────────┐   │   │
│ │ │ 📝 退回原因：使用量異常偏高，請確認     │   │   │
│ │ │ 退回時間：2024-12-20 09:15              │   │   │
│ │ └───────────────────────────────────────┘   │   │
│ ├─────────────────────────────────────────────┤   │
│ │ 王五 - 外購電力           已通過 2024-12-18   │   │
│ │ 麥當勞 | 2024年度                            │   │
│ │ 總量：5,000 度 | 檔案：4個                    │   │
│ │ ✅ 已通過（2024-12-18 15:30）                │   │
│ └─────────────────────────────────────────────┘   │
│                                                     │
│ [上一頁] 第 1 頁，共 5 頁 [下一頁]                  │
└─────────────────────────────────────────────────────┘
```

**退回對話框設計**：
```
┌─────────────────────────────────────────┐
│ 退回原因                        [X]     │
├─────────────────────────────────────────┤
│ 請說明退回原因：                        │
│ ┌───────────────────────────────────┐ │
│ │                                   │ │
│ │ (輸入退回原因，必填...)            │ │
│ │                                   │ │
│ └───────────────────────────────────┘ │
│                                        │
│ 常用原因：                             │
│ [數據異常] [缺少證明] [格式錯誤]        │
│                                        │
│ [取消]              [確認退回]          │
└─────────────────────────────────────────┐
```

### 3. 資料匯出模組

#### 3.1 單一用戶匯出
**功能描述**：匯出特定用戶的所有填報資料。

**API 連接**：
```typescript
interface ExportUserDataAPI {
  endpoint: exportUserData(userId, options)
  payload: {
    includeBasicInfo: boolean
    includeSubmissions: boolean
    includeApproved: boolean
    includeRejected: boolean
    includeNotes: boolean
    includeFiles: boolean
    format: 'xlsx'
    year?: number
  }
  returns: Promise<Blob>  // Excel 檔案
}
```

**匯出對話框設計**：
```
┌─────────────────────────────────────────┐
│ 匯出用戶資料                    [X]     │
├─────────────────────────────────────────┤
│ 用戶：張三（三媽臭臭鍋）                │
│                                        │
│ 選擇匯出內容：                         │
│ ☑ 基本資料                            │
│ ☑ 已提交記錄                          │
│ ☑ 已通過記錄                          │
│ ☑ 已退回記錄                          │
│ ☑ 包含退回原因                        │
│ ☑ 檔案清單                            │
│                                        │
│ 年度：[2024 ▼]                        │
│ 格式：Excel (.xlsx)                    │
│                                        │
│ 預計檔案大小：約 2.5 MB                 │
│                                        │
│ [取消]              [開始匯出]          │
└─────────────────────────────────────────┐
```

### 4. 統計儀表板

#### 4.1 主控台頁面
**功能描述**：系統概覽、快速導航、統計資訊展示。

**API 連接**：
```typescript
interface DashboardAPI {
  // 統計資料
  endpoint: getDashboardStats()
  returns: {
    totalUsers: number
    activeUsers: number
    submissions: {
      submitted: number
      approved: number
      rejected: number
    }
    recentActivities: Activity[]
  }
}
```

**介面設計規格**：
```
┌─────────────────────────────────────────────────────┐
│ 管理員總控制台                                      │
├─────────────────────────────────────────────────────┤
│ 系統統計（3個卡片，點擊跳轉）                       │
│ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐│
│ │ 📝 已提交    │ │ ✅ 已通過    │ │ ❌ 已退回    ││
│ │              │ │              │ │              ││
│ │     15       │ │     28       │ │      7       ││
│ │              │ │              │ │              ││
│ │ 待審核中     │ │ 審核完成     │ │ 需要修正     ││
│ └──────────────┘ └──────────────┘ └──────────────┘│
├─────────────────────────────────────────────────────┤
│ 用戶概覽                              [+ 新增用戶]  │
│ ┌─────────────────────────────────────────────┐   │
│ │ 總用戶：45 | 活躍：42 | 停用：3              │   │
│ └─────────────────────────────────────────────┘   │
│                                                     │
│ [用戶列表展示區域...]                              │
└─────────────────────────────────────────────────────┘
```

---

## 🎨 設計系統規格

### 色彩系統
```scss
// 主要色彩
$primary: #2563eb;      // 主色調（藍色）
$success: #10b981;      // 成功（綠色）
$error: #ef4444;        // 錯誤（紅色）
$warning: #f59e0b;      // 警告（橙色）

// 狀態色彩
$submitted: #3b82f6;    // 已提交
$approved: #10b981;     // 已通過
$rejected: #ef4444;     // 已退回

// 背景色彩
$bg-primary: #ffffff;
$bg-secondary: #f9fafb;
$bg-tertiary: #f3f4f6;

// 邊框色彩
$border-light: #e5e7eb;
$border-medium: #d1d5db;
```

### 間距系統
```scss
// 基於 8px 網格系統
$spacing-xs: 4px;
$spacing-sm: 8px;
$spacing-md: 16px;
$spacing-lg: 24px;
$spacing-xl: 32px;
$spacing-2xl: 48px;
```

### 字型系統
```scss
// 字體大小
$text-xs: 12px;
$text-sm: 14px;
$text-base: 16px;
$text-lg: 18px;
$text-xl: 20px;
$text-2xl: 24px;

// 字重
$font-normal: 400;
$font-medium: 500;
$font-semibold: 600;
$font-bold: 700;
```

### 元件規格
```scss
// 按鈕
.button {
  height: 40px;
  padding: 0 16px;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
}

// 卡片
.card {
  padding: 24px;
  border-radius: 8px;
  border: 1px solid $border-light;
  background: $bg-primary;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

// 輸入框
.input {
  height: 40px;
  padding: 0 12px;
  border-radius: 6px;
  border: 1px solid $border-medium;
  font-size: 14px;
}
```

---

## 🔧 技術實作規格

### API 整合模式

#### 1. API 呼叫層級架構
```
頁面元件 (Pages)
    ↓
自定義 Hooks (useUserData, useSubmissions)
    ↓
API 函數 (adminUsers.ts, adminSubmissions.ts)
    ↓
Supabase Client
```

#### 2. 錯誤處理模式
```typescript
// 統一錯誤處理
try {
  setLoading(true);
  const data = await apiCall();
  setData(data);
} catch (error) {
  console.error('API Error:', error);
  setError(getErrorMessage(error));
  showErrorToast(error.message);
} finally {
  setLoading(false);
}
```

#### 3. 載入狀態管理
```typescript
interface LoadingStates {
  initial: boolean;      // 初次載入
  refreshing: boolean;   // 重新整理
  submitting: boolean;   // 提交中
  deleting: boolean;     // 刪除中
}
```

#### 4. 快取策略
```typescript
// 使用 React Query 或類似模式
const cacheOptions = {
  staleTime: 5 * 60 * 1000,    // 5 分鐘
  cacheTime: 10 * 60 * 1000,   // 10 分鐘
  refetchOnWindowFocus: false,
  retry: 2
};
```

### 資料流程圖

#### 用戶建立流程
```
使用者填寫表單
    ↓
表單驗證（前端）
    ↓
呼叫 createUser API
    ↓
Supabase Auth 建立帳號
    ↓
Supabase DB 建立 profile
    ↓
成功：跳轉用戶列表
失敗：顯示錯誤訊息
```

#### 審核流程
```
管理員點擊「通過/退回」
    ↓
顯示確認對話框
    ↓
呼叫 reviewEntry API
    ↓
更新 energy_entries.status
    ↓
記錄 review_history
    ↓
更新前端列表
    ↓
顯示成功訊息
```

### 權限控制

#### 路由保護
```typescript
// 管理員路由保護
<ProtectedRoute requiredRole="admin">
  <AdminDashboard />
</ProtectedRoute>
```

#### API 權限檢查
```typescript
// 後端 RLS 政策
CREATE POLICY "admin_only" ON profiles
  FOR ALL USING (
    auth.uid() IN (
      SELECT id FROM profiles WHERE role = 'admin'
    )
  );
```

---

## 📊 資料庫結構（參考）

### profiles 表擴展
```sql
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS filling_config JSONB DEFAULT '{
  "diesel_generator_mode": "refuel",
  "visible_categories": [],
  "target_year": 2024
}'::jsonb;
```

### energy_entries 狀態
```sql
-- 狀態只有 3 種
CHECK (status IN ('submitted', 'approved', 'rejected'))
```

### review_history 記錄
```sql
CREATE TABLE IF NOT EXISTS review_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_id UUID REFERENCES energy_entries(id),
  old_status TEXT,
  new_status TEXT,
  review_notes TEXT,
  reviewer_id UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 🚀 開發優先級

### P0 - 必要功能（第一階段）
1. 用戶列表和搜尋
2. 建立用戶（基本資料）
3. 審核功能（通過/退回）
4. 狀態篩選和顯示

### P1 - 重要功能（第二階段）
1. 編輯用戶資料
2. 類別和年度設定
3. 退回原因管理
4. 用戶快速導航

### P2 - 增值功能（第三階段）
1. 單一用戶匯出
2. 批量操作
3. 進階篩選
4. 統計圖表

---

## 📝 注意事項

### 開發建議
1. **漸進式開發**：先完成核心功能，再加入進階功能
2. **模組化設計**：每個功能獨立模組，便於維護
3. **錯誤優先**：先處理錯誤情況，再處理正常流程
4. **響應式設計**：優先桌面版，再適配平板

### 安全考量
1. **永不信任前端**：所有權限驗證在後端
2. **防止 SQL 注入**：使用參數化查詢
3. **敏感資料加密**：密碼等敏感資料加密存儲
4. **操作日誌**：記錄所有管理員操作

### 效能考量
1. **分頁載入**：大量資料分頁處理
2. **延遲載入**：非必要資料延遲載入
3. **防抖處理**：搜尋等操作加入防抖
4. **快取策略**：合理使用快取減少請求

---

**文件狀態**: 完整版 v2.0 - 可依實際需求調整