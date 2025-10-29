# 管理員介面視覺重構計劃

> **日期：** 2025-10-23
> **狀態：** 規劃中
> **預估時間：** 5 小時

---

## 目標

將 `admin_interface_v3.html` 的 Apple Human Interface Guidelines (HIG) 設計完全套用到現有 React 管理員介面。

**核心原則：**
- ✅ 保持所有現有功能不變
- ✅ 保持 React Router 路由結構不變
- ✅ 後端 API 完全不受影響
- ✅ 漸進式重構，每階段可回滾

---

## 前置確認

### 1. 路由策略
**決策：** 保持 React Router 多頁面結構

**理由：**
- URL 導航是 Web 的基本特性
- 支援分享連結、瀏覽器歷史、書籤
- 符合現代 SPA 最佳實踐
- 已實作完成，無需重寫

**現有路由：**
```
/app/admin                → AdminDashboard（用戶列表）
/app/admin/users/:id      → UserDetailPage（用戶詳情）
/app/admin/create         → CreateUser（創建用戶）
/app/admin/edit/:id       → EditUser（編輯用戶）
```

### 2. 後端相容性
**確認結果：** ✅ 完全相容

- `department` 欄位在後端 **不存在**
- 前端可直接移除，不影響任何 API
- 無需修改 `backend/app.py`

### 3. 測試環境
**現狀：** 本地開發中，未部署

**優勢：**
- 無生產環境壓力
- 可充分測試每個改動
- 無用戶在線影響
- 可隨時回滾

### 4. 風險控制策略
**方法：** Git 逐階段提交

```bash
# 每階段完成後
git add .
git commit -m "feat(admin): 階段X - [改動描述]"

# 出問題立即回滾
git revert HEAD
```

---

## 執行計劃：6 個階段

### 階段 1：建立設計系統基礎

**時間：** 30 分鐘
**目標：** 定義全局 CSS 變數和 Tailwind 配置

#### 改動檔案
1. `tailwind.config.js`
2. `src/styles/design-tokens.css`（新建）

#### 具體內容

**1.1 Tailwind Config 擴展**
```javascript
// tailwind.config.js
module.exports = {
  theme: {
    extend: {
      colors: {
        'apple-blue': '#007aff',
        'apple-gray-3': '#e8e8ed',
        'apple-gray-4': '#f5f5f7',
      },
      fontSize: {
        'display': '48px',
        'title-lg': '32px',
        'title': '24px',
        'body-lg': '18px',
        'body': '16px',
        'caption': '14px',
      },
      spacing: {
        'xs': '6px',
        'sm': '10px',
        'md': '14px',
        'lg': '20px',
        'xl': '32px',
      },
      borderRadius: {
        'sm': '8px',
        'md': '12px',
        'lg': '16px',
      },
      boxShadow: {
        'apple-sm': '0 1px 3px 0 rgba(0, 0, 0, 0.04)',
        'apple-md': '0 4px 12px -2px rgba(0, 0, 0, 0.08)',
      }
    }
  }
}
```

**1.2 CSS 變數定義**
```css
/* src/styles/design-tokens.css */
:root {
  /* Colors */
  --apple-blue: #007aff;
  --apple-text-primary: #1d1d1f;
  --apple-text-secondary: #86868b;
  --apple-gray-3: #e8e8ed;
  --apple-gray-4: #f5f5f7;
  --color-success: #34c759;
  --color-warning: #ff9500;
  --color-error: #ff3b30;

  /* Status Colors - Light Backgrounds */
  --status-submitted-bg: #dbeafe;
  --status-submitted-border: #bfdbfe;
  --status-submitted-text: #1e40af;

  --status-approved-bg: #dcfce7;
  --status-approved-border: #bbf7d0;
  --status-approved-text: #166534;

  --status-rejected-bg: #fee2e2;
  --status-rejected-border: #fecaca;
  --status-rejected-text: #991b1b;

  /* Spacing */
  --spacing-xs: 6px;
  --spacing-sm: 10px;
  --spacing-md: 14px;
  --spacing-lg: 20px;
  --spacing-xl: 32px;

  /* Border Radius */
  --radius-sm: 8px;
  --radius-md: 12px;
  --radius-lg: 16px;

  /* Shadows */
  --shadow-sm: 0 1px 3px 0 rgba(0, 0, 0, 0.04);
  --shadow-md: 0 4px 12px -2px rgba(0, 0, 0, 0.08);
}
```

#### 驗證步驟
```bash
npm run dev
# 確認無編譯錯誤
# 頁面應該沒有視覺變化（只是定義變數）
```

#### Git Commit
```bash
git add tailwind.config.js src/styles/design-tokens.css
git commit -m "feat(admin): 階段1 - 建立 Apple HIG 設計系統基礎"
```

---

### 階段 2：重構 UserCard 組件

**時間：** 45 分鐘
**目標：** 簡化卡片設計，突出公司名稱

#### 改動檔案
1. `src/pages/admin/components/UserCard.tsx`
2. `src/pages/admin/AdminDashboard.tsx`

#### 具體改動

**2.1 UserCard.tsx - 簡化資訊顯示**

**移除欄位：**
- avatar emoji (表情符號頭像)
- department (部門)
- entries (記錄數)
- submissionDate (提交日期)
- lastActivity (最後活動時間)

**保留並重新設計：**
```tsx
// 當前設計 (複雜)
<div className="user-card">
  <div className="avatar">👤</div>
  <div className="name">王小明</div>
  <div className="department">技術部</div>
  <div className="email">wang@company.com</div>
  <div className="stats">15 筆記錄</div>
  <div className="date">2025-10-20</div>
</div>

// 新設計 (簡潔)
<div className="user-card">
  <div className="company text-[32px] font-bold text-center">
    示例科技有限公司
  </div>
  <div className="user-info text-[16px] text-gray-500 text-center">
    王小明 · wang@company.com
  </div>
</div>
```

**卡片樣式：**
```tsx
className="
  bg-white rounded-lg shadow-sm hover:shadow-md
  transition-all duration-300 cursor-pointer
  flex flex-col justify-center items-center text-center
  min-h-[220px] p-12
  hover:scale-[1.02] hover:-translate-y-1
"
```

**2.2 AdminDashboard.tsx - 調整 Grid 佈局**

```tsx
// 當前（動態列數）
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">

// 新設計（固定 3 列）
<div className="grid grid-cols-3 gap-5">
```

#### 驗證步驟
- [ ] 用戶卡片顯示公司名稱（大字）和姓名/Email（小字）
- [ ] 卡片高度一致（min-height: 220px）
- [ ] 一行固定顯示 3 個卡片
- [ ] 點擊卡片能進入用戶詳情頁
- [ ] Hover 效果正常（放大、上移、陰影）

#### Git Commit
```bash
git add src/pages/admin/components/UserCard.tsx src/pages/admin/AdminDashboard.tsx
git commit -m "feat(admin): 階段2 - 重構 UserCard 為簡潔設計"
```

---

### 階段 3：重構 AdminDashboard 主頁

**時間：** 45 分鐘
**目標：** 放大標題、統計卡片、搜尋框和按鈕

#### 改動檔案
1. `src/pages/admin/AdminDashboard.tsx`
2. `src/pages/admin/components/PageHeader.tsx`
3. `src/pages/admin/components/SearchBar.tsx`

#### 具體改動

**3.1 標題區塊**

```tsx
// PageHeader.tsx
<div className="text-center">
  <h1 className="text-[48px] font-bold mb-2">
    管理員控制台
  </h1>
  <p className="text-[18px] text-gray-600">
    用戶提交狀態管理與統計概覽
  </p>
</div>
```

**3.2 統計卡片**

```tsx
// 數字放大
<p className="text-5xl font-bold">  {/* 從 text-3xl 改為 text-5xl */}
  {statistics.totalUsers}
</p>

// Padding 加大
<div className="p-8">  {/* 從 p-6 改為 p-8 */}
```

**3.3 搜尋框**

```tsx
// SearchBar.tsx
<input
  className="
    w-full px-6 py-4          // 從 px-4 py-2 加大
    text-[16px]               // 明確字體大小
    border border-gray-300
    rounded-lg
    focus:outline-none focus:border-blue-500
  "
  placeholder="搜尋用戶名稱、信箱或部門..."
/>
```

**3.4 按鈕統一樣式**

```tsx
// 所有按鈕
<button className="px-8 py-4 text-[16px]">  {/* 從 px-4 py-2 加大 */}
  + 新增用戶
</button>
```

#### 驗證步驟
- [ ] 標題居中且字體為 48px
- [ ] 統計卡片數字清晰易讀
- [ ] 搜尋框和按鈕尺寸一致且夠大
- [ ] 搜尋功能正常
- [ ] 點擊統計卡片能切換對應 tab

#### Git Commit
```bash
git add src/pages/admin/AdminDashboard.tsx src/pages/admin/components/
git commit -m "feat(admin): 階段3 - 放大 AdminDashboard 視覺元素"
```

---

### 階段 4：重構 UserDetailPage

**時間：** 90 分鐘
**目標：** 放大基本資訊、創建填報紀錄網格組件

#### 改動檔案
1. `src/pages/admin/UserDetailPage.tsx`
2. `src/pages/admin/components/SubmissionGrid.tsx`（新建）

#### 4.1 放大基本資訊區塊

**區段標題：**
```tsx
// 從 18px → 24px
<h3 className="text-[24px] font-semibold mb-4">
  基本資訊
</h3>
```

**標籤和數值：**
```tsx
// 標籤：14px → 16px
<span className="text-[16px] text-gray-600">
  目標年份
</span>

// 數值：14px → 28px
<span className="text-[28px] font-medium">
  2025
</span>
```

**能源類別標籤：**
```tsx
// 13px → 16px，padding 加大
<span className="
  inline-block px-[18px] py-2
  text-[16px] font-medium
  bg-green-100 text-green-800
  rounded-xl
">
  汽油
</span>
```

#### 4.2 創建 SubmissionGrid 組件（核心改動）

**新建檔案：** `src/pages/admin/components/SubmissionGrid.tsx`

```tsx
import React from 'react'
import { useNavigate } from 'react-router-dom'

interface Submission {
  id: string
  page_key: string
  category: string
  status: 'submitted' | 'approved' | 'rejected'
  owner_id: string
}

interface SubmissionGridProps {
  submissions: Submission[]
  energyCategories: { id: string; name: string }[]
  pageMap: Record<string, string>
}

const SubmissionGrid: React.FC<SubmissionGridProps> = ({
  submissions,
  energyCategories,
  pageMap
}) => {
  const navigate = useNavigate()

  const getCategoryName = (pageKey: string, category?: string) => {
    const found = energyCategories.find(c => c.id === pageKey)?.name
    if (found) return found
    if (category) {
      const found2 = energyCategories.find(c => c.id === category)?.name
      if (found2) return found2
    }
    return pageKey || category || '未知類別'
  }

  const getStatusText = (status: string) => {
    const map = {
      'submitted': '待審核',
      'approved': '已核准',
      'rejected': '已拒絕'
    }
    return map[status as keyof typeof map] || status
  }

  const getStatusStyles = (status: string) => {
    const styles = {
      'submitted': {
        bg: 'bg-blue-100',
        border: 'border-blue-200',
        text: 'text-blue-800',
        dot: 'bg-blue-500'
      },
      'approved': {
        bg: 'bg-green-100',
        border: 'border-green-200',
        text: 'text-green-800',
        dot: 'bg-green-500'
      },
      'rejected': {
        bg: 'bg-red-100',
        border: 'border-red-200',
        text: 'text-red-800',
        dot: 'bg-red-500'
      }
    }
    return styles[status as keyof typeof styles] || styles.submitted
  }

  const handleClick = (submission: Submission) => {
    const pagePath = pageMap[submission.page_key] || pageMap[submission.category]
    if (pagePath) {
      navigate(`${pagePath}?mode=review&userId=${submission.owner_id}&entryId=${submission.id}`)
    }
  }

  if (submissions.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        尚無填報記錄
      </div>
    )
  }

  return (
    <div className="grid grid-cols-[repeat(auto-fill,minmax(250px,1fr))] gap-4">
      {submissions.map(submission => {
        const statusStyle = getStatusStyles(submission.status)

        return (
          <div
            key={submission.id}
            onClick={() => handleClick(submission)}
            className={`
              ${statusStyle.bg} ${statusStyle.border} ${statusStyle.text}
              border-2 rounded-xl p-6
              cursor-pointer transition-all duration-200
              hover:shadow-md
              flex flex-col items-center justify-center
              min-h-[120px] gap-3
            `}
          >
            {/* 能源類別名稱 */}
            <div className="text-[18px] font-semibold text-center">
              {getCategoryName(submission.page_key, submission.category)}
            </div>

            {/* 狀態指示 */}
            <div className="flex items-center gap-2">
              <div className={`w-[14px] h-[14px] rounded-full ${statusStyle.dot}`} />
              <span className="text-[15px] font-semibold">
                {getStatusText(submission.status)}
              </span>
            </div>
          </div>
        )
      })}
    </div>
  )
}

export default SubmissionGrid
```

#### 4.3 在 UserDetailPage 中使用

```tsx
import SubmissionGrid from './components/SubmissionGrid'

// 在 render 中替換原本的列表
<SubmissionGrid
  submissions={userSubmissions}
  energyCategories={energyCategories}
  pageMap={pageMap}
/>
```

#### 驗證步驟
- [ ] 基本資訊字體正確放大
- [ ] 填報紀錄以網格方式顯示
- [ ] 每個卡片背景顏色正確（藍/綠/紅）
- [ ] 點擊卡片能導航到對應能源頁面審核模式
- [ ] 狀態圓點和文字正確顯示
- [ ] 無填報紀錄時顯示空狀態提示

#### Git Commit
```bash
git add src/pages/admin/UserDetailPage.tsx src/pages/admin/components/SubmissionGrid.tsx
git commit -m "feat(admin): 階段4 - 重構 UserDetailPage 和填報紀錄網格"
```

---

### 階段 5：重構表單頁面

**時間：** 30 分鐘
**目標：** 移除 department 欄位、統一表單樣式

#### 改動檔案
1. `src/pages/admin/CreateUser.tsx`
2. `src/pages/admin/EditUser.tsx`

#### 5.1 移除 department 欄位

**CreateUser.tsx**
```tsx
// 移除前
<div className="form-row">
  <input name="company" />
  <input name="department" />  // ← 刪除這個
</div>

// 移除後
<div className="form-row">
  <input name="company" />
</div>
```

**EditUser.tsx** - 同樣處理

#### 5.2 調整表單佈局

**CreateUser - 新佈局：**
- 第一行：姓名、Email
- 第二行：密碼、公司名稱
- 第三行：目標年份

**EditUser - 新佈局：**
- 第一行：姓名、Email
- 第二行：公司名稱、目標年份
- 第三行：帳戶狀態

#### 5.3 統一表單元素樣式

```tsx
// Input 樣式
<input className="
  w-full px-4 py-3
  text-[16px]
  border border-gray-300 rounded-lg
  focus:outline-none focus:border-blue-500
" />

// Label 樣式
<label className="text-[16px] font-medium text-gray-700 mb-2">
  姓名 <span className="text-red-500">*</span>
</label>

// Button 樣式
<button className="px-8 py-4 text-[16px] font-medium">
  建立用戶
</button>
```

#### 5.4 移除 JavaScript 中的 department 處理

**CreateUser.tsx**
```tsx
// 移除
const handleSubmit = (e) => {
  const data = {
    name: formData.name,
    email: formData.email,
    company: formData.company,
    department: formData.department,  // ← 刪除
    target_year: formData.target_year
  }
}
```

**EditUser.tsx** - 同樣處理

#### 驗證步驟
- [ ] CreateUser 表單顯示正確（無 department）
- [ ] EditUser 表單顯示正確（無 department）
- [ ] 創建用戶功能正常，資料正確保存
- [ ] 編輯用戶功能正常，資料正確更新
- [ ] 表單驗證正常（必填欄位檢查）
- [ ] 提交成功後正確導航

#### Git Commit
```bash
git add src/pages/admin/CreateUser.tsx src/pages/admin/EditUser.tsx
git commit -m "feat(admin): 階段5 - 移除 department 欄位並統一表單樣式"
```

---

### 階段 6：整體測試與優化

**時間：** 60 分鐘
**目標：** 全面測試，確保零破壞

#### 6.1 功能測試清單

**路由導航：**
- [ ] `/app/admin` - AdminDashboard 正確載入
- [ ] `/app/admin/users/:id` - UserDetailPage 正確載入並顯示用戶資料
- [ ] `/app/admin/create` - CreateUser 表單正確顯示
- [ ] `/app/admin/edit/:id` - EditUser 表單正確顯示且資料回填
- [ ] 瀏覽器前進/後退按鈕正常工作

**AdminDashboard（用戶列表）：**
- [ ] 統計卡片數字正確（總用戶數、待審核、已通過、已退回）
- [ ] 點擊統計卡片能切換到對應 tab
- [ ] 搜尋框能正常搜尋用戶（名稱/Email/公司）
- [ ] 篩選器能正常篩選狀態
- [ ] 用戶卡片正確顯示公司名稱和姓名/Email
- [ ] 點擊用戶卡片能進入用戶詳情頁
- [ ] 新增用戶按鈕能導航到 CreateUser

**UserDetailPage（用戶詳情）：**
- [ ] 基本資訊正確顯示（名稱、Email、公司、角色）
- [ ] 目標年份以大字體顯示
- [ ] 能源類別標籤正確顯示
- [ ] 填報紀錄以網格方式顯示
- [ ] 填報紀錄卡片背景顏色正確區分狀態
- [ ] 點擊填報紀錄能導航到審核頁面（帶 mode=review 參數）
- [ ] 編輯用戶按鈕能導航到 EditUser
- [ ] 統計資訊正確（已通過/待審核/已退回數量）

**CreateUser（創建用戶）：**
- [ ] 表單所有欄位正確顯示（無 department）
- [ ] 必填欄位驗證正常
- [ ] Email 格式驗證正常
- [ ] 能源類別多選框正常
- [ ] 「全選」按鈕正常工作
- [ ] 提交成功後導航回 AdminDashboard
- [ ] 新建用戶出現在列表中

**EditUser（編輯用戶）：**
- [ ] 表單正確回填用戶資料（無 department）
- [ ] Email 欄位正確禁用
- [ ] 能源類別正確勾選現有權限
- [ ] 帳戶狀態下拉選單正常
- [ ] 更新成功後導航回 UserDetailPage
- [ ] 更新後資料正確顯示

**提交審核流程：**
- [ ] 從 AdminDashboard 的 submitted tab 點擊項目能導航
- [ ] 從 UserDetailPage 的填報紀錄點擊能導航
- [ ] 導航 URL 包含正確的 mode、userId、entryId 參數
- [ ] 審核頁面能正確顯示（如果已實作）

#### 6.2 響應式測試

測試不同螢幕尺寸：
- [ ] 1920x1080（桌面）
- [ ] 1366x768（小螢幕筆電）
- [ ] 1024x768（平板橫向）

確認：
- [ ] 用戶卡片 grid 在小螢幕上正常顯示
- [ ] 填報紀錄網格自動調整列數
- [ ] 表單在小螢幕上可用
- [ ] 無橫向滾動條（除非內容確實過寬）

#### 6.3 視覺細節檢查

- [ ] 所有字體大小符合設計（48/32/24/18/16/14px）
- [ ] 間距一致（使用設計系統定義的值）
- [ ] 圓角一致（8/12/16px）
- [ ] 顏色符合 Apple HIG（藍色 #007aff、灰色系統）
- [ ] Hover 效果流暢
- [ ] 過渡動畫時間一致（200-300ms）
- [ ] 陰影效果一致

#### 6.4 Console 檢查

```bash
# 開啟瀏覽器 DevTools Console
# 檢查無以下錯誤：
```

- [ ] 無 React warnings
- [ ] 無 TypeScript errors
- [ ] 無 404 錯誤（找不到資源）
- [ ] 無未處理的 Promise rejections
- [ ] 無 CORS 錯誤

#### 6.5 效能檢查

- [ ] 頁面載入時間 < 2 秒
- [ ] 用戶列表渲染流暢（即使有 50+ 用戶）
- [ ] 搜尋/篩選回應即時（< 100ms）
- [ ] 無明顯的畫面閃爍或重排

#### 6.6 對比原 HTML 設計

開啟 `admin_interface_v3.html` 並排對比：

**AdminDashboard：**
- [ ] 標題居中且大小一致
- [ ] 統計卡片佈局和大小一致
- [ ] 用戶卡片簡潔度一致（只顯示公司+姓名）
- [ ] 卡片高度和間距一致

**UserDetailPage：**
- [ ] 基本資訊區塊字體大小一致
- [ ] 填報紀錄網格外觀一致
- [ ] 狀態顏色區分一致（藍/綠/紅）

#### 6.7 已知問題記錄

如果發現問題但不影響主要功能，記錄在此：

```
# 已知問題清單（如有）
1. [問題描述]
   - 影響程度：低/中/高
   - 計劃修復時間：[時間]
   - Workaround：[暫時解決方案]
```

#### Git Commit
```bash
git add .
git commit -m "feat(admin): 階段6 - 完成整體測試與優化"
```

---

## Git 提交策略總結

### Commit Message 規範

```bash
feat(admin): 階段1 - 建立 Apple HIG 設計系統基礎
feat(admin): 階段2 - 重構 UserCard 為簡潔設計
feat(admin): 階段3 - 放大 AdminDashboard 視覺元素
feat(admin): 階段4 - 重構 UserDetailPage 和填報紀錄網格
feat(admin): 階段5 - 移除 department 欄位並統一表單樣式
feat(admin): 階段6 - 完成整體測試與優化
```

### 回滾策略

**如果某階段出問題：**
```bash
# 查看最近的 commits
git log --oneline -5

# 回滾最後一個 commit（保留改動）
git reset --soft HEAD~1

# 回滾最後一個 commit（丟棄改動）
git reset --hard HEAD~1

# 或使用 revert（更安全）
git revert HEAD
```

**回滾到特定階段：**
```bash
# 列出所有階段的 commit hash
git log --oneline --grep="feat(admin): 階段"

# 回滾到階段 3
git reset --hard <階段3的commit-hash>
```

---

## 預期結果

### 視覺效果
✅ 完全匹配 `admin_interface_v3.html` 的設計
✅ Apple HIG 風格一致（顏色、間距、圓角、陰影）
✅ 簡潔清晰的資訊層級
✅ 大字體易讀性

### 功能完整性
✅ 所有現有功能保持不變
✅ 路由導航正常
✅ 搜尋/篩選正常
✅ CRUD 操作正常
✅ 審核流程正常

### 技術品質
✅ TypeScript 無錯誤
✅ React 無 warnings
✅ 響應式設計正常
✅ 效能無明顯下降
✅ Console 無錯誤

### 維護性
✅ 設計系統建立（可重用）
✅ 組件化良好（SubmissionGrid）
✅ Git 歷史清晰（6 個階段提交）
✅ 可隨時回滾到任一階段

---

## 時間預估

| 階段 | 內容 | 預估時間 |
|------|------|----------|
| 1 | 設計系統基礎 | 30 分鐘 |
| 2 | UserCard 重構 | 45 分鐘 |
| 3 | AdminDashboard 重構 | 45 分鐘 |
| 4 | UserDetailPage 重構 | 90 分鐘 |
| 5 | 表單頁面重構 | 30 分鐘 |
| 6 | 整體測試優化 | 60 分鐘 |
| **總計** | | **約 5 小時** |

**實際時間可能因以下因素浮動：**
- 對現有代碼的熟悉程度
- 測試發現的問題數量
- TypeScript 型別問題處理
- 響應式設計調整

---

## 風險評估

### 低風險項目 ✅
- 建立設計系統（只是定義變數）
- 移除 department（後端不存在此欄位）
- 調整字體大小和間距
- 修改 CSS class names

### 中風險項目 ⚠️
- 重構 UserCard（可能影響點擊事件）
- 創建 SubmissionGrid（新組件需充分測試）
- 調整 Grid 佈局（可能在小螢幕有問題）

### 零風險保證 🛡️
- 每階段 commit，隨時可回滾
- 本地測試，無生產環境影響
- 後端 API 完全不動
- 路由結構完全保持

---

## 開始執行檢查清單

在開始執行前，確認：

- [ ] Git 工作目錄乾淨（無未提交改動）
- [ ] 當前在 `main` 分支（或建立新的 feature 分支）
- [ ] `npm run dev` 能正常啟動
- [ ] 瀏覽器 DevTools 已開啟（監控 Console）
- [ ] 準備好 `admin_interface_v3.html` 作為設計參考
- [ ] 預留 5 小時不受干擾的時間

---

## 執行時注意事項

### DO ✅
- 每階段完成立即測試
- 每階段測試通過立即 commit
- 發現問題立即記錄
- 參考 HTML 設計確保視覺一致
- 保持 Console 監控

### DON'T ❌
- 不要同時改多個階段
- 不要跳過測試直接進入下階段
- 不要修改後端代碼
- 不要改變路由結構
- 不要破壞現有功能

---

## 完成標準

**視覺達標：**
- 管理員介面外觀與 `admin_interface_v3.html` 一致
- 字體大小、間距、顏色符合 Apple HIG
- 用戶卡片簡潔只顯示關鍵資訊
- 填報紀錄網格清晰區分狀態

**功能達標：**
- 所有 CRUD 操作正常
- 路由導航正常
- 搜尋篩選正常
- 審核流程正常

**技術達標：**
- 無 TypeScript 錯誤
- 無 Console 錯誤或 warnings
- 響應式設計正常
- 效能無明顯下降

**文檔達標：**
- 6 個清晰的 Git commits
- 問題記錄完整
- 可隨時參考此文檔

---

## 參考資料

- **設計原檔：** `admin_interface_v3.html`
- **Apple HIG：** https://developer.apple.com/design/human-interface-guidelines/
- **Tailwind Docs：** https://tailwindcss.com/docs
- **React Router：** https://reactrouter.com/

---

**最後更新：** 2025-10-23
**狀態：** 待執行
**預計完成：** 執行開始後 5 小時內
