# 可重用組件文檔 (Reusable Components)

本文檔記錄碳足跡系統中所有可重用的 React 組件。

---

## 目錄

1. [設計原則](#設計原則)
2. [SharedPageLayout - 統一頁面母版](#sharedpagelayout---統一頁面母版)
3. [LoadingPage - 載入畫面](#loadingpage---載入畫面)
4. [StatusBanner - 審核狀態橫幅](#statusbanner---審核狀態橫幅)
5. [ConfirmClearModal - 清除確認彈窗](#confirmclearmodal---清除確認彈窗)
6. [SuccessModal - 成功提示彈窗](#successmodal---成功提示彈窗)
7. [重構成果](#重構成果)

---

## 設計原則

### 何時抽取組件？

根據 Linus Torvalds 的「好品味」原則，我們遵循以下三個標準：

1. **重複 ≥3 次** - 出現在 3 個以上地方的代碼
2. **100% 相同邏輯** - 不需要為了統一而扭曲業務邏輯
3. **抽取後更簡單** - 減少複雜度，而非增加抽象層

### 不該抽取的情況

❌ **不要強行統一不同的東西：**
- 柴油/汽油頁面：動態記錄數量（group mode）
- 瓦斯/丙酮頁面：固定 12 個月（monthly mode）
- 強行合併會增加 if/else，違反「消除特殊情況」原則

✅ **應該抽取的東西：**
- 載入畫面：所有頁面 100% 相同
- 狀態橫幅：邏輯一致，只有數據不同
- 彈窗組件：UI 完全一致

---

## SharedPageLayout - 統一頁面母版

### 用途

所有能源填報頁面的統一模板，包含頂部導航欄、頁面標題、審核狀態橫幅、說明文字、底部操作欄等所有共用元素。

### 為什麼需要母版？

**問題：**
- 14 個能源頁面都要手動寫導航欄、標題、橫幅、操作欄
- 每個頁面 300+ 行重複的 Layout 代碼
- 修改導航欄需要改 14 個文件
- 新增頁面需要複製大量代碼

**解決方案：**
- 所有共用元素整合到 SharedPageLayout 母版
- 頁面只需傳入配置 props，自動渲染完整 UI
- 修改 Layout 只需改 1 個文件

### 文件位置

```
frontend/src/layouts/SharedPageLayout.tsx
frontend/src/components/PageHeader.tsx
frontend/src/components/StatusBanner.tsx
frontend/src/components/InstructionText.tsx
frontend/src/components/BottomActionBar.tsx
```

### 母版包含的元素

```
┌────────────────────────────────────────────────────────────────┐
│ 導航欄 (固定)                                                   │
│ Logo | 首頁 | 類別一~六 | 盤查清單/佐證範例 | Log Out          │
├────────────────────────────────────────────────────────────────┤
│                                                                 │
│                   D (類別標籤 - Pixelify Sans)                  │
│                   柴油(移動源) (中文標題)                        │
│                   Diesel (Mobile Sources) (英文副標題)          │
│                                                                 │
│ ┌─────────────────────────────────────────────────────────┐   │
│ │ 11/07資料已提交                          (審核狀態橫幅)  │   │
│ │ 您可以繼續提交並編輯資料，異動後請再次點擊「提交」...   │   │
│ └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│ 請先選擇設備項目，並上傳加油單據作為佐證... (說明文字)         │
│                                                                 │
│ ┌─────────────────────────────────────────────────────────┐   │
│ │                                                           │   │
│ │                   頁面內容區域                             │
│ │                   (children)                              │
│ │                                                           │   │
│ └─────────────────────────────────────────────────────────┘   │
│                                                                 │
└────────────────────────────────────────────────────────────────┘
┌────────────────────────────────────────────────────────────────┐
│ 底部操作欄 (固定在視窗底部)                                     │
│                                    [儲存] [清除] [提交]         │
└────────────────────────────────────────────────────────────────┘
```

### Props 完整說明

```typescript
interface SharedPageLayoutProps {
  children: React.ReactNode  // 頁面內容（必填）

  // 右側按鈕配置（可選）
  actionButtonText?: string       // 預設「盤查清單/佐證範例」
  showActionButton?: boolean      // 預設 true

  // PageHeader 配置（可選）
  pageHeader?: {
    category: string    // 類別標籤（D, G, LPG...）
    title: string       // 中文標題（柴油(移動源)）
    subtitle: string    // 英文副標題（Diesel (Mobile Sources)）
  }

  // StatusBanner 配置（可選）
  statusBanner?: {
    approvalStatus: ApprovalStatus  // 從 useApprovalStatus 獲得
    isReviewMode?: boolean          // 是否為審核模式
  }

  // InstructionText 配置（可選）
  instructionText?: string  // 支援 HTML，可用 <br /> 換行

  // BottomActionBar 配置（可選）
  bottomActionBar?: {
    currentStatus: EntryStatus      // 當前狀態
    submitting: boolean             // 是否提交中
    onSubmit: () => void            // 提交回調
    onSave?: () => void             // 儲存回調
    onClear: () => void             // 清除回調
    show?: boolean                  // 是否顯示（預設 true）
  }
}
```

### 完整使用範例

```tsx
import { useState } from 'react'
import SharedPageLayout from '../../layouts/SharedPageLayout'
import LoadingPage from '../../components/LoadingPage'
import { useApprovalStatus } from '../../hooks/useApprovalStatus'
import { useReviewMode } from '../../hooks/useReviewMode'
import { useFrontendStatus } from '../../hooks/useFrontendStatus'

export default function DieselPage() {
  const pageKey = 'diesel'
  const [year] = useState(new Date().getFullYear())

  // 1. 審核模式
  const { isReviewMode } = useReviewMode()

  // 2. 審核狀態
  const approvalStatus = useApprovalStatus(pageKey, year)

  // 3. 前端狀態
  const frontendStatus = useFrontendStatus(pageKey, year)
  const { currentStatus } = frontendStatus

  // 4. 提交狀態
  const [submitting, setSubmitting] = useState(false)

  // 5. 只讀判斷
  const isReadOnly = isReviewMode || approvalStatus.isApproved

  // 6. 載入中
  if (dataLoading) {
    return <LoadingPage />
  }

  // 7. 使用母版
  return (
    <SharedPageLayout
      // 頁面標題配置
      pageHeader={{
        category: "D",
        title: "柴油(移動源)",
        subtitle: "Diesel (Mobile Sources)"
      }}

      // 審核狀態橫幅配置
      statusBanner={{
        approvalStatus,
        isReviewMode
      }}

      // 說明文字（支援 HTML）
      instructionText="請先選擇設備項目，並上傳加油單據作為佐證，若同一份佐證文件（PDF／JPG）內含多筆加油紀錄，請使用 「+新增數據到此群組」，<br />讓一份佐證可對應多筆加油數據；當同一份佐證的所有數據新增完成後，請點選 「+新增群組」，以填寫下一份佐證的數據。"

      // 底部操作欄配置
      bottomActionBar={{
        currentStatus,
        submitting,
        onSubmit: handleSubmit,
        onSave: handleSave,
        onClear: handleClear,
        show: !isReadOnly && !approvalStatus.isApproved && !isReviewMode
      }}
    >
      {/* 頁面內容寫在這裡 */}
      <div className="flex justify-center">
        <div className="w-full max-w-4xl">
          <h2>填報表單</h2>
          {/* 表單內容... */}
        </div>
      </div>
    </SharedPageLayout>
  )
}
```

### 快速套用母版 - 5 步驟

#### 步驟 1：導入母版和必要 hooks

```tsx
import SharedPageLayout from '../../layouts/SharedPageLayout'
import LoadingPage from '../../components/LoadingPage'
import { useApprovalStatus } from '../../hooks/useApprovalStatus'
import { useReviewMode } from '../../hooks/useReviewMode'
import { useFrontendStatus } from '../../hooks/useFrontendStatus'
```

#### 步驟 2：設定頁面基本資訊

```tsx
const pageKey = 'diesel'  // 改成對應的頁面 key
const [year] = useState(new Date().getFullYear())
```

#### 步驟 3：調用必要的 hooks

```tsx
const { isReviewMode } = useReviewMode()
const approvalStatus = useApprovalStatus(pageKey, year)
const { currentStatus } = useFrontendStatus(pageKey, year)
const isReadOnly = isReviewMode || approvalStatus.isApproved
```

#### 步驟 4：處理載入狀態

```tsx
if (dataLoading) {
  return <LoadingPage />
}
```

#### 步驟 5：使用母版包裹頁面內容

```tsx
return (
  <SharedPageLayout
    pageHeader={{
      category: "D",              // 改成對應的類別
      title: "柴油(移動源)",       // 改成對應的中文標題
      subtitle: "Diesel (Mobile Sources)"  // 改成對應的英文標題
    }}
    statusBanner={{
      approvalStatus,
      isReviewMode
    }}
    instructionText="改成對應的說明文字..."  // 可用 <br /> 換行
    bottomActionBar={{
      currentStatus,
      submitting,
      onSubmit: handleSubmit,
      onSave: handleSave,
      onClear: handleClear,
      show: !isReadOnly && !approvalStatus.isApproved && !isReviewMode
    }}
  >
    {/* 原本的頁面內容移到這裡 */}
  </SharedPageLayout>
)
```

### 套用母版填空表單

當您說「按照 COMPONENTS.md 套母版到 XXX 頁面」時，我會給您以下填空表單：

```
📋 套用母版配置清單

【頁面基本資訊】
- pageKey: _______（例如：diesel, gas, electricity）
- 頁面文件路徑: _______（例如：frontend/src/pages/Category1/DieselPage.tsx）

【PageHeader 配置】
- category: _______（大寫字母，例如：D, G, E, LPG）
- title: _______（中文標題，例如：柴油(移動源)）
- subtitle: _______（英文標題，例如：Diesel (Mobile Sources)）
- categoryPosition.left: _______（類別字母 LEFT 位置，單位 px，例如：646）
  ※ TOP 統一為 39px（水平對齊）

【InstructionText 配置】
- instructionText: _______（說明文字，可用 <br /> 換行）

【色票確認】
- Category 字母顏色：#3996FE（藍色）✓
- StatusBanner 陰影：#3996FE（藍色）✓
- BottomActionBar 背景：#3996FE（藍色）✓
- 需要改顏色？是 / 否
```

**填完後回傳，我會直接套用到指定頁面。**

---

### 各組件詳細說明

#### PageHeader - 頁面標題

**顯示：**
```
         D                    ← 類別標籤（Pixelify Sans，64px）
   柴油(移動源)                ← 中文標題（Inter，52px）
Diesel (Mobile Sources)       ← 英文副標題（Inter，24px）
```

**配置：**
```tsx
pageHeader={{
  category: "D",                      // 類別標籤
  title: "柴油(移動源)",               // 中文標題
  subtitle: "Diesel (Mobile Sources)" // 英文副標題
}}
```

**樣式細節：**
- 類別標籤居中，使用 Pixelify Sans 字體
- 中文標題居中，使用 Inter 字體
- 英文副標題居中，使用 Inter 字體
- 容器高度 350px（含 34px 間距）

#### StatusBanner - 審核狀態橫幅

**自動顯示對應狀態：**
- 已暫存：Save 圖標 + 「XX/XX資料已暫存」
- 等待審核中：CheckCircle 圖標 + 「XX/XX資料已提交」
- 已審核通過：Star 圖標 + 「恭喜您已審核通過！」
- 已退回：X 圖標 + 「填報已被退回」+ 退回原因

**配置：**
```tsx
statusBanner={{
  approvalStatus,  // 從 useApprovalStatus 獲得
  isReviewMode     // 審核模式下不顯示
}}
```

**樣式細節：**
- 雙層卡片設計（白色內容層 + 藍色陰影層）
- 寬度 993px，高度 119px
- 自動根據狀態選擇圖標

#### InstructionText - 說明文字

**顯示：**
```
請先選擇設備項目，並上傳加油單據作為佐證，若同一份佐證文件（PDF／JPG）
內含多筆加油紀錄，請使用 「+新增數據到此群組」，
讓一份佐證可對應多筆加油數據；當同一份佐證的所有數據新增完成後，
請點選 「+新增群組」，以填寫下一份佐證的數據。
```

**配置：**
```tsx
instructionText="請先選擇設備項目...<br />第二行文字"
```

**樣式細節：**
- 支援 HTML，可用 `<br />` 換行
- 寬度 1700px，高度 73px
- 居中顯示，字體 Inter 20px
- 在 StatusBanner 下方 41px 處

#### BottomActionBar - 底部操作欄

**顯示：**
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
                              [儲存] [清除] [提交]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

**配置：**
```tsx
bottomActionBar={{
  currentStatus,           // 當前狀態（判斷是否鎖定）
  submitting,             // 提交中狀態（禁用所有按鈕）
  onSubmit: handleSubmit, // 提交回調
  onSave: handleSave,     // 儲存回調（可選）
  onClear: handleClear,   // 清除回調
  show: !isReadOnly       // 是否顯示（可選，預設 true）
}}
```

**按鈕狀態：**
- `submitting = true` 時：所有按鈕禁用，提交按鈕顯示 loading
- `currentStatus = 'approved'` 時：所有按鈕隱藏（已鎖定）
- 儲存按鈕：白色背景 + 黑色文字
- 清除按鈕：淺灰背景 + 黑色文字
- 提交按鈕：黑色背景 + 白色文字

### 不同頁面的配置範例

#### 柴油頁面（動態記錄）

```tsx
<SharedPageLayout
  pageHeader={{
    category: "D",
    title: "柴油(移動源)",
    subtitle: "Diesel (Mobile Sources)"
  }}
  instructionText="請先選擇設備項目，並上傳加油單據作為佐證..."
  // ... 其他配置
>
  {/* 動態記錄表格 */}
</SharedPageLayout>
```

#### 瓦斯頁面（固定 12 個月）

```tsx
<SharedPageLayout
  pageHeader={{
    category: "G",
    title: "天然氣",
    subtitle: "Natural Gas"
  }}
  instructionText="請填寫 12 個月的天然氣使用量..."
  // ... 其他配置
>
  {/* 12 個月表格 */}
</SharedPageLayout>
```

#### 電力頁面

```tsx
<SharedPageLayout
  pageHeader={{
    category: "E",
    title: "外購電力",
    subtitle: "Purchased Electricity"
  }}
  instructionText="請上傳電費單據並填寫用電度數..."
  // ... 其他配置
>
  {/* 電力表格 */}
</SharedPageLayout>
```

### 可選元素控制

#### 不顯示右側按鈕

```tsx
<SharedPageLayout
  showActionButton={false}  // 隱藏「盤查清單/佐證範例」按鈕
  // ... 其他配置
>
```

#### 自訂右側按鈕文字

```tsx
<SharedPageLayout
  actionButtonText="查看佐證範例"  // 改變按鈕文字
  // ... 其他配置
>
```

#### 不顯示底部操作欄

```tsx
<SharedPageLayout
  bottomActionBar={{
    // ... 其他配置
    show: false  // 隱藏底部操作欄
  }}
>
```

#### 簡化版（只有導航欄）

```tsx
<SharedPageLayout>
  {/* 只有導航欄，其他都不顯示 */}
  <div>簡化頁面內容</div>
</SharedPageLayout>
```

### Before vs. After

**Before（每個頁面 ~350 行）:**
```tsx
function DieselPage() {
  return (
    <div className="fixed inset-0 overflow-x-hidden overflow-y-auto bg-white flex justify-center">
      <div style={{ width: '1920px', transform: `scale(${scale})` }}>
        {/* 導航欄 - 86 行 */}
        <nav style={{ height: '86px', backgroundColor: '#EBEDF0' }}>
          <button onClick={handleLogoClick}>
            <img src="/logo.png" />
            <span>山椒魚FESS</span>
          </button>
          {/* ... 50+ 行導航項目 ... */}
        </nav>

        {/* 主要內容 */}
        <main style={{ width: '1920px' }}>
          {/* PageHeader - 70 行 */}
          <div style={{ height: '350px' }}>
            <div style={{ position: 'absolute', left: '646px' }}>D</div>
            <h1>柴油(移動源)</h1>
            <p>Diesel (Mobile Sources)</p>
          </div>

          {/* StatusBanner - 60 行 */}
          {!isReviewMode && approvalStatus.isPending && (
            <div style={{ width: '993px', height: '119px' }}>
              {/* ... 藍色卡片 ... */}
            </div>
          )}

          {/* InstructionText - 20 行 */}
          <div style={{ width: '1700px', marginTop: '41px' }}>
            請先選擇設備項目...
          </div>

          {/* 頁面內容 */}
          <div>{/* ... */}</div>
        </main>
      </div>

      {/* BottomActionBar - 90 行 */}
      <div className="fixed bottom-0" style={{ width: '1920px' }}>
        <div style={{ background: '#3996FE' }}>
          <button onClick={onSave}>儲存</button>
          {/* ... 40+ 行按鈕 ... */}
        </div>
      </div>
    </div>
  )
}
```

**After（每個頁面 ~30 行）:**
```tsx
function DieselPage() {
  return (
    <SharedPageLayout
      pageHeader={{
        category: "D",
        title: "柴油(移動源)",
        subtitle: "Diesel (Mobile Sources)"
      }}
      statusBanner={{ approvalStatus, isReviewMode }}
      instructionText="請先選擇設備項目..."
      bottomActionBar={{
        currentStatus,
        submitting,
        onSubmit: handleSubmit,
        onSave: handleSave,
        onClear: handleClear,
        show: !isReadOnly
      }}
    >
      {/* 頁面內容 */}
      <div>{/* ... */}</div>
    </SharedPageLayout>
  )
}
```

**成果：** 350 行 → 30 行，減少 91% 代碼

### 注意事項

1. **必須先調用 hooks**
   ```tsx
   // ✅ 正確
   const approvalStatus = useApprovalStatus(pageKey, year)
   <SharedPageLayout statusBanner={{ approvalStatus }} />

   // ❌ 錯誤：不要在 JSX 內調用
   <SharedPageLayout statusBanner={{ approvalStatus: useApprovalStatus(...) }} />
   ```

2. **instructionText 支援 HTML**
   ```tsx
   // ✅ 可以換行
   instructionText="第一行<br />第二行"

   // ❌ \n 不會換行
   instructionText="第一行\n第二行"
   ```

3. **bottomActionBar.show 控制顯示**
   ```tsx
   // ✅ 根據狀態動態顯示
   bottomActionBar={{
     // ... 其他配置
     show: !isReadOnly && !approvalStatus.isApproved
   }}
   ```

4. **所有 props 都是可選的**
   ```tsx
   // ✅ 最簡單的用法
   <SharedPageLayout>
     <div>只有導航欄</div>
   </SharedPageLayout>
   ```

---

## LoadingPage - 載入畫面

### 用途

統一的資料載入畫面組件。當頁面正在從 Supabase 載入資料時顯示，提供一致的用戶體驗。

### 為什麼需要這個組件？

**問題：**
- 14 個能源頁面各自複製貼上載入畫面代碼
- 每個頁面 15 行重複 JSX
- 修改樣式需要改 14 個文件

**解決方案：**
- 抽取為單一組件
- 修改樣式只需改 1 個文件
- 保證所有頁面載入體驗一致

### 文件位置

```
frontend/src/components/LoadingPage.tsx
```

### Props

**無需任何 props** - 這是一個純展示組件

### 實作細節

```tsx
import React from 'react'
import { Loader2 } from 'lucide-react'
import { designTokens } from '../utils/designTokens'

export const LoadingPage: React.FC = () => {
  return (
    <div
      className="min-h-screen flex items-center justify-center"
      style={{ backgroundColor: designTokens.colors.background }}
    >
      <div className="text-center">
        <Loader2
          className="w-12 h-12 animate-spin mx-auto mb-4"
          style={{ color: designTokens.colors.accentPrimary }}
        />
        <p style={{ color: designTokens.colors.textPrimary }}>
          載入中...
        </p>
      </div>
    </div>
  )
}
```

**設計要點：**
- 使用 `min-h-screen` 佔滿整個視窗
- `flex` 佈局讓內容垂直水平置中
- `Loader2` 圖標自動旋轉動畫
- 使用 `designTokens` 確保顏色一致

### ⚠️ 重要：能源頁面不要使用 LoadingPage

**所有能源頁面（柴油、汽油、瓦斯等）都不要寫這段：**

```tsx
// ❌ 不要寫這個
if (dataLoading) {
  return <LoadingPage />
}
```

**原因：UserRoute 已經自動處理載入畫面**
- 所有能源頁面都被 UserRoute 包裹
- UserRoute 會顯示全螢幕載入（`fixed inset-0 z-50`）覆蓋 Sidebar
- 頁面裡再寫一次會出現兩個載入畫面

**正確做法（像柴油頁面一樣）：**

```tsx
function DieselPage() {
  // 直接寫頁面內容，UserRoute 會自動處理載入
  return (
    <SharedPageLayout
      pageHeader={{ category: "D", title: "柴油(移動源)", subtitle: "Diesel" }}
      statusBanner={{ approvalStatus, isReviewMode }}
      bottomActionBar={{ ... }}
    >
      {/* 頁面內容 */}
    </SharedPageLayout>
  )
}
```

### 使用方式（非能源頁面）

LoadingPage 只用於**不使用 UserRoute** 的頁面（例如管理後台、報表頁）：

```tsx
import LoadingPage from '../../components/LoadingPage'

function AdminDashboard() {
  const { loading } = useData()

  if (loading) {
    return <LoadingPage />
  }

  return <div>管理後台內容</div>
}
```

### Before vs. After

**Before (每個頁面 15 行):**
```tsx
if (dataLoading) {
  return (
    <div
      className="min-h-screen flex items-center justify-center"
      style={{ backgroundColor: designTokens.colors.background }}
    >
      <div className="text-center">
        <Loader2
          className="w-12 h-12 animate-spin mx-auto mb-4"
          style={{ color: designTokens.colors.accentPrimary }}
        />
        <p style={{ color: designTokens.colors.textPrimary }}>載入中...</p>
      </div>
    </div>
  )
}
```

**After (每個頁面 1 行):**
```tsx
if (dataLoading) return <LoadingPage />
```

**成果：** 15 行 → 1 行，消除 225 行重複代碼

---

## StatusBanner - 審核狀態橫幅

### 用途

根據資料的審核狀態（已暫存/待審核/已通過/已退回），自動顯示對應的狀態橫幅。

### 為什麼需要這個組件？

**問題：**
- 每個頁面都需要顯示 4 種狀態橫幅
- 每種狀態 15-25 行 JSX
- 總計每頁 58 行 × 14 頁 = 812 行重複代碼
- 修改橫幅樣式需要改 14 個文件 × 4 種狀態 = 56 處

**解決方案：**
- 統一橫幅 UI 和顯示邏輯
- 組件內部自動判斷顯示哪種狀態
- 父組件只需傳入 `approvalStatus` 物件

### 文件位置

```
frontend/src/components/StatusBanner.tsx
```

### Props

```typescript
interface StatusBannerProps {
  /** 審核狀態物件（從 useApprovalStatus hook 獲得） */
  approvalStatus: ApprovalStatus

  /** 是否為審核模式（審核模式下不顯示橫幅） */
  isReviewMode?: boolean  // 預設 false
}
```

### ApprovalStatus 型別

```typescript
interface ApprovalStatus {
  isSaved: boolean       // 已暫存
  isPending: boolean     // 等待審核中
  isApproved: boolean    // 已審核通過
  isRejected: boolean    // 已退回
  reviewNotes?: string   // 退回原因
  reviewedAt?: string    // 審核時間
}
```

### 顯示邏輯（優先級）

組件內部按以下優先級判斷顯示哪種橫幅：

1. **審核模式** → 不顯示任何橫幅
2. **已審核通過** (isApproved) → 綠色橫幅
3. **已退回** (isRejected) → 紅色橫幅
4. **等待審核中** (isPending) → 綠色橫幅
5. **已暫存** (isSaved) → 藍色橫幅

### 四種狀態樣式

#### 1. 已暫存 (isSaved = true)

```
┌──────────────────────────────────────────────┐
│ 💾  資料已暫存                                │
│     您的資料已儲存，可隨時修改後提交審核。    │
└──────────────────────────────────────────────┘
藍色背景 (bg-blue-100) + 藍色左邊框 (border-blue-500)
```

#### 2. 等待審核中 (isPending = true)

```
┌──────────────────────────────────────────────┐
│ 📋  等待審核中                                │
│     您的填報已提交，請等待管理員審核。        │
└──────────────────────────────────────────────┘
綠色背景 (bg-green-100) + 綠色左邊框 (border-green-500)
```

#### 3. 已審核通過 (isApproved = true)

```
┌──────────────────────────────────────────────┐
│ 🎉  恭喜您已審核通過！                        │
│     此填報已完成審核，資料已鎖定無法修改。    │
└──────────────────────────────────────────────┘
綠色背景 (bg-green-100) + 綠色左邊框 (border-green-500)
```

#### 4. 已退回 (isRejected = true)

```
┌──────────────────────────────────────────────┐
│ ⚠️  填報已被退回                              │
│                                               │
│     退回原因：數據有誤，請重新確認            │
│     退回時間：2024/11/6 下午5:30             │
│                                               │
│     請修正後重新提交                          │
└──────────────────────────────────────────────┘
紅色背景 (bg-red-100) + 紅色左邊框 (border-red-500)
```

### 使用方式

```tsx
import StatusBanner from '../../components/StatusBanner'
import { useApprovalStatus } from '../../hooks/useApprovalStatus'
import { useReviewMode } from '../../hooks/useReviewMode'

function DieselPage() {
  const pageKey = 'diesel'
  const year = 2024

  // 1. 獲取審核模式狀態
  const { isReviewMode } = useReviewMode()

  // 2. 獲取審核狀態
  const approvalStatus = useApprovalStatus(pageKey, year)

  return (
    <div>
      <h1>柴油使用量填報</h1>

      {/* 3. 使用 StatusBanner - 自動判斷顯示哪種狀態 */}
      <StatusBanner
        approvalStatus={approvalStatus}
        isReviewMode={isReviewMode}
      />

      {/* 表單內容... */}
    </div>
  )
}
```

### 關鍵設計決策

#### 為什麼不在組件內部調用 useApprovalStatus？

```tsx
// ❌ 不好的設計：組件內部調用 hook
export const StatusBanner = ({ pageKey, year }) => {
  const approvalStatus = useApprovalStatus(pageKey, year)
  // ...
}

// ✅ 好的設計：接收 approvalStatus 作為 prop
export const StatusBanner = ({ approvalStatus, isReviewMode }) => {
  // ...
}
```

**理由：**
1. **避免重複調用** - 父組件已經調用過 `useApprovalStatus`，不需要再調用一次
2. **單一數據源** - 父組件和橫幅使用相同的 `approvalStatus` 物件
3. **可測試性** - 可以直接傳入 mock 數據測試組件

### Before vs. After

**Before (每個頁面 58 行):**
```tsx
{!isReviewMode && approvalStatus.isSaved && (
  <div className="bg-blue-100 border-l-4 border-blue-500 text-blue-700 p-4 mb-6 rounded-r-lg max-w-4xl mx-auto">
    <div className="flex items-center">
      <div className="text-2xl mr-3">💾</div>
      <div>
        <p className="font-bold text-lg">資料已暫存</p>
        <p className="text-sm mt-1">您的資料已儲存，可隨時修改後提交審核。</p>
      </div>
    </div>
  </div>
)}

{!isReviewMode && approvalStatus.isApproved && (
  <div className="bg-green-100 border-l-4 border-green-500 text-green-700 p-4 mb-6 rounded-r-lg max-w-4xl mx-auto">
    {/* ... 15 行 ... */}
  </div>
)}

{!isReviewMode && approvalStatus.isRejected && (
  <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-6 rounded-r-lg max-w-4xl mx-auto">
    {/* ... 25 行（包含退回原因、時間） ... */}
  </div>
)}

{!isReviewMode && approvalStatus.isPending && (
  <div className="bg-green-100 border-l-4 border-green-500 text-green-700 p-4 mb-6 rounded-r-lg max-w-4xl mx-auto">
    {/* ... 15 行 ... */}
  </div>
)}
```

**After (每個頁面 1 行):**
```tsx
<StatusBanner approvalStatus={approvalStatus} isReviewMode={isReviewMode} />
```

**成果：** 58 行 → 1 行，消除 812 行重複代碼

---

## ConfirmClearModal - 清除確認彈窗

### 用途

當用戶點擊「清除」按鈕時，彈出確認對話框，警告用戶此操作會永久刪除所有資料（包括伺服器上的檔案），且無法復原。

### 為什麼需要這個組件？

**問題：**
- 清除是**破壞性操作**（刪除資料 + 刪除檔案）
- 每個頁面都需要相同的確認彈窗
- 每個頁面 75 行重複 JSX
- 修改警告文案需要改 12 個文件

**解決方案：**
- 統一清除確認 UI
- 確保警告訊息一致
- 支援 loading 狀態（清除中...）

### 文件位置

```
frontend/src/components/ConfirmClearModal.tsx
```

### Props

```typescript
interface ConfirmClearModalProps {
  /** 是否顯示 Modal */
  show: boolean

  /** 確認清除的回調函數（用戶點擊「確定清除」） */
  onConfirm: () => void

  /** 取消的回調函數（用戶點擊「取消」或關閉彈窗） */
  onCancel: () => void

  /** 是否正在清除中（顯示 loading 狀態） */
  isClearing?: boolean  // 預設 false
}
```

### UI 結構

```
┌─────────────────────────────────────────────┐
│  [⚠️]  確認清除                              │
│                                              │
│  清除後，這一頁所有資料都會被移除，包括已上 │
│  傳到伺服器的檔案也會被永久刪除。此操作無法 │
│  復原，確定要繼續嗎？                        │
│                                              │
│                          [取消] [確定清除]   │
└─────────────────────────────────────────────┘
```

**Loading 狀態（isClearing = true）：**
```
┌─────────────────────────────────────────────┐
│  [⚠️]  確認清除                              │
│                                              │
│  清除後，這一頁所有資料都會被移除，包括已上 │
│  傳到伺服器的檔案也會被永久刪除。此操作無法 │
│  復原，確定要繼續嗎？                        │
│                                              │
│                    [取消] [⏳ 清除中...]      │
└─────────────────────────────────────────────┘
```

### 使用方式

```tsx
import { useState } from 'react'
import ConfirmClearModal from '../../components/ConfirmClearModal'
import { useEnergyClear } from '../../hooks/useEnergyClear'

function DieselPage() {
  const pageKey = 'diesel'
  const year = 2024

  // 1. 控制彈窗顯示狀態
  const [showClearModal, setShowClearModal] = useState(false)

  // 2. 使用清除 hook
  const { clearData, clearLoading } = useEnergyClear(pageKey, year)

  // 3. 處理確認清除
  const handleConfirmClear = async () => {
    await clearData()  // 執行清除
    setShowClearModal(false)  // 關閉彈窗
  }

  return (
    <div>
      {/* 清除按鈕 */}
      <button onClick={() => setShowClearModal(true)}>
        清除所有資料
      </button>

      {/* 確認彈窗 */}
      <ConfirmClearModal
        show={showClearModal}
        onConfirm={handleConfirmClear}
        onCancel={() => setShowClearModal(false)}
        isClearing={clearLoading}
      />
    </div>
  )
}
```

### 完整流程

```
用戶點擊「清除」
    ↓
彈出 ConfirmClearModal
    ↓
用戶點擊「取消」 → 關閉彈窗（onCancel）
    ↓
用戶點擊「確定清除」 → 執行 onConfirm
    ↓
isClearing = true → 按鈕顯示「清除中...」並 disabled
    ↓
清除完成 → isClearing = false → 關閉彈窗
```

### 關鍵設計細節

#### 1. 警告圖標與顏色

```tsx
<div
  className="w-10 h-10 rounded-full flex items-center justify-center"
  style={{ backgroundColor: `${designTokens.colors.warning}15` }}
>
  <AlertCircle
    className="h-5 w-5"
    style={{ color: designTokens.colors.warning }}
  />
</div>
```

- 使用 `AlertCircle` 圖標 (⚠️)
- 警告色圓形背景（15% 透明度）
- 吸引用戶注意

#### 2. 確定按鈕為紅色（危險操作）

```tsx
<button
  onClick={onConfirm}
  disabled={isClearing}
  style={{
    backgroundColor: isClearing ? '#9ca3af' : designTokens.colors.error,
    opacity: isClearing ? 0.7 : 1
  }}
>
  {isClearing ? (
    <>
      <Loader2 className="w-4 h-4 animate-spin mr-2" />
      清除中...
    </>
  ) : (
    '確定清除'
  )}
</button>
```

- 使用 `designTokens.colors.error` (紅色) 強調危險性
- `isClearing` 時按鈕變灰色並 disabled
- 顯示旋轉圖標和「清除中...」文字

#### 3. Backdrop 點擊不關閉

```tsx
<div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
  {/* Modal 內容 */}
</div>
```

- **刻意不監聽** backdrop 點擊事件
- 強制用戶明確選擇「取消」或「確定」
- 避免誤操作

### Before vs. After

**Before (每個頁面 75 行):**
```tsx
{showClearModal && (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
    <div className="bg-white rounded-lg shadow-lg max-w-md w-full">
      <div className="p-6">
        <div className="flex items-start space-x-3 mb-4">
          <div className="w-10 h-10 rounded-full flex items-center justify-center">
            <AlertCircle className="h-5 w-5" />
          </div>
          {/* ... 50+ 行警告訊息、按鈕等 ... */}
        </div>
      </div>
    </div>
  </div>
)}
```

**After (每個頁面 5 行):**
```tsx
<ConfirmClearModal
  show={showClearModal}
  onConfirm={handleClearConfirm}
  onCancel={() => setShowClearModal(false)}
  isClearing={clearLoading}
/>
```

**成果：** 75 行 → 5 行，消除 900 行重複代碼

---

## SuccessModal - 成功提示彈窗

### 用途

當用戶成功提交資料（儲存或提交審核）時，彈出成功提示彈窗，顯示成功訊息和後續操作提示。

### 為什麼需要這個組件？

**問題：**
- 所有頁面都需要顯示提交成功訊息
- 每個頁面 80 行重複 JSX（包含圖標、標題、訊息、提示卡片、確認按鈕）
- 修改成功提示文案需要改 12 個文件

**解決方案：**
- 統一成功提示 UI
- 支援自訂成功訊息
- 提供一致的用戶體驗

### 文件位置

```
frontend/src/components/SuccessModal.tsx
```

### Props

```typescript
interface SuccessModalProps {
  /** 是否顯示 Modal */
  show: boolean

  /** 成功訊息內容（動態） */
  message: string

  /** 關閉的回調函數 */
  onClose: () => void
}
```

### UI 結構

```
┌─────────────────────────────────────────────┐
│                                         [X]  │
│                                              │
│              [✓]  (綠色圓圈圖標)             │
│                                              │
│              提交成功！                       │
│                                              │
│         資料已成功提交審核                    │
│                                              │
│  ┌────────────────────────────────────┐    │
│  │ 您的資料已成功儲存，您可以：        │    │
│  │ • 隨時回來查看或修改資料           │    │
│  │ • 重新上傳新的證明文件             │    │
│  │ • 新增或刪除使用記錄               │    │
│  └────────────────────────────────────┘    │
│                                              │
│             [     確認     ]                │
└─────────────────────────────────────────────┘
```

### 使用方式

#### 基本用法

```tsx
import { useState } from 'react'
import SuccessModal from '../../components/SuccessModal'

function DieselPage() {
  const [showSuccess, setShowSuccess] = useState(false)
  const [successMessage, setSuccessMessage] = useState('')

  const handleSave = async () => {
    // 儲存資料...
    setSuccessMessage('資料已成功儲存')
    setShowSuccess(true)
  }

  const handleSubmit = async () => {
    // 提交審核...
    setSuccessMessage('資料已成功提交審核')
    setShowSuccess(true)
  }

  return (
    <div>
      <button onClick={handleSave}>儲存</button>
      <button onClick={handleSubmit}>提交審核</button>

      <SuccessModal
        show={showSuccess}
        message={successMessage}
        onClose={() => setShowSuccess(false)}
      />
    </div>
  )
}
```

#### 搭配 API Hook 使用

```tsx
import SuccessModal from '../../components/SuccessModal'
import { useMultiRecordSubmit } from '../../hooks/useMultiRecordSubmit'

function DieselPage() {
  const [showSuccess, setShowSuccess] = useState(false)
  const [successMsg, setSuccessMsg] = useState('')

  const { submitAll, submitting } = useMultiRecordSubmit({
    pageKey: 'diesel',
    year: 2024,
    onSuccess: (message) => {
      setSuccessMsg(message)  // hook 返回的成功訊息
      setShowSuccess(true)
    },
    onError: (error) => {
      console.error(error)
    }
  })

  return (
    <>
      <button onClick={submitAll} disabled={submitting}>
        {submitting ? '提交中...' : '提交審核'}
      </button>

      <SuccessModal
        show={showSuccess}
        message={successMsg}
        onClose={() => setShowSuccess(false)}
      />
    </>
  )
}
```

### 關鍵設計細節

#### 1. 成功圖標（綠色勾勾）

```tsx
<div
  className="w-12 h-12 mx-auto rounded-full mb-4 flex items-center justify-center"
  style={{ backgroundColor: designTokens.colors.success }}
>
  <CheckCircle className="h-6 w-6 text-white" />
</div>
```

- 使用 `CheckCircle` 圖標 (✓)
- 綠色圓形背景 (`designTokens.colors.success`)
- 視覺上清楚表達「成功」

#### 2. 動態訊息 + 固定提示

```tsx
{/* 動態成功訊息 */}
<p className="mb-4 font-medium text-lg">
  {message}  {/* 父組件傳入 */}
</p>

{/* 固定操作提示 */}
<div className="rounded-lg p-4 mb-4 text-left"
     style={{ backgroundColor: designTokens.colors.accentLight }}>
  <p className="text-base mb-2 font-medium">
    您的資料已成功儲存，您可以：
  </p>
  <ul className="text-base space-y-1">
    <li>• 隨時回來查看或修改資料</li>
    <li>• 重新上傳新的證明文件</li>
    <li>• 新增或刪除使用記錄</li>
  </ul>
</div>
```

- `message` prop 為動態內容（「資料已儲存」或「已提交審核」）
- 操作提示為固定內容（所有頁面相同）
- 使用淺藍色背景卡片 (`accentLight`)

#### 3. 右上角關閉按鈕 + 底部確認按鈕

```tsx
{/* 右上角 X 按鈕 */}
<div className="flex justify-end mb-2">
  <button onClick={onClose}>
    <X className="w-5 h-5" />
  </button>
</div>

{/* 底部確認按鈕 */}
<button
  onClick={onClose}
  className="w-full py-2 rounded-lg text-white font-medium"
  style={{ backgroundColor: designTokens.colors.primary }}
>
  確認
</button>
```

- 提供兩種關閉方式
- 確認按鈕使用 `primary` 色（綠色）
- 按鈕 hover 時變為更深的綠色 (#10b981)

### 常見用法場景

#### 場景 1：儲存草稿

```tsx
const handleSave = async () => {
  await saveData()
  setSuccessMessage('資料已成功儲存為草稿')
  setShowSuccess(true)
}
```

#### 場景 2：提交審核

```tsx
const handleSubmit = async () => {
  await submitForReview()
  setSuccessMessage('資料已成功提交審核，請等待管理員審核')
  setShowSuccess(true)
}
```

#### 場景 3：管理員批准

```tsx
const handleApprove = async () => {
  await approveEntry()
  setSuccessMessage('已成功批准此填報')
  setShowSuccess(true)
}
```

### Before vs. After

**Before (每個頁面 80 行):**
```tsx
{showSuccessModal && (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
    <div className="bg-white rounded-lg shadow-lg max-w-md w-full">
      <div className="p-6">
        <div className="flex justify-end mb-2">
          <button onClick={() => setShowSuccessModal(false)}>
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="text-center">
          <div className="w-12 h-12 mx-auto rounded-full mb-4">
            <CheckCircle className="h-6 w-6 text-white" />
          </div>
          {/* ... 60+ 行標題、訊息、提示卡片、按鈕等 ... */}
        </div>
      </div>
    </div>
  </div>
)}
```

**After (每個頁面 4 行):**
```tsx
<SuccessModal
  show={showSuccessModal}
  message={successMessage}
  onClose={() => setShowSuccessModal(false)}
/>
```

**成果：** 80 行 → 4 行，消除 960 行重複代碼

---

## 重構成果

### 統計數據

**創建的文件：**
| 文件 | 行數 | 類型 |
|------|------|------|
| `LoadingPage.tsx` | 37 | Component |
| `StatusBanner.tsx` | 127 | Component |
| `ConfirmClearModal.tsx` | 118 | Component |
| `SuccessModal.tsx` | 121 | Component |
| **總計** | **403** | **4 組件** |

**移除的重複代碼：**
| 組件 | 每頁行數 | 使用頁面數 | 總移除行數 |
|------|---------|-----------|-----------|
| LoadingPage | 15 | 15 | 225 |
| StatusBanner | 58 | 14 | 812 |
| ConfirmClearModal | 75 | 12 | 900 |
| SuccessModal | 80 | 12 | 960 |
| **總計** | - | - | **2,897** |

### 改善比例

```
2,897 行移除 ÷ 403 行新增 = 7.2 倍
```

**每寫 1 行新代碼，消除 7.2 行舊代碼**

### 維護成本對比

#### Before（重構前）

修改載入畫面樣式：
- ❌ 需要修改 15 個文件
- ❌ 每個文件找到對應的 15 行代碼
- ❌ 複製貼上容易出錯
- ❌ 容易漏改某些頁面

修改清除警告文案：
- ❌ 需要修改 12 個文件
- ❌ 每個文件 75 行中找到正確位置
- ❌ 文案不一致風險

#### After（重構後）

修改載入畫面樣式：
- ✅ 只需修改 `LoadingPage.tsx` (1 個文件)
- ✅ 所有 15 個頁面自動更新
- ✅ 零複製貼上

修改清除警告文案：
- ✅ 只需修改 `ConfirmClearModal.tsx` (1 個文件)
- ✅ 所有 12 個頁面自動更新
- ✅ 文案 100% 一致

### 一致性保證

**Before:**
```
Page 1: "清除後資料會被刪除，無法復原"
Page 2: "清除後資料會被移除，無法還原"
Page 3: "清除後所有資料會被刪除，無法恢復"
```
❌ 每個頁面文案微妙不同

**After:**
```
All pages: "清除後，這一頁所有資料都會被移除，包括已上傳到
           伺服器的檔案也會被永久刪除。此操作無法復原，確定
           要繼續嗎？"
```
✅ 所有頁面完全一致

### 測試成本

**Before:**
- 修改彈窗樣式後，需要測試 12 個頁面
- 每個頁面獨立測試清除功能
- 總測試點：12 × 4 = 48 次操作

**After:**
- 修改 `ConfirmClearModal.tsx` 後，測試 1 次即可
- 其他 11 個頁面自動正確
- 總測試點：1 + 11 (快速檢查) = 12 次操作

**測試成本降低 4 倍**

---

## 最佳實踐

### 1. 組件要做的事

✅ **應該：**
- 負責 UI 渲染
- 接收 props 控制行為
- 觸發回調函數（`onConfirm`, `onClose`）
- 使用 `designTokens` 保持樣式一致

❌ **不應該：**
- 調用 API
- 管理業務邏輯
- 直接操作 Supabase
- 包含頁面特定邏輯

### 2. Props 設計原則

**簡單直接：**
```tsx
// ✅ Good
interface Props {
  show: boolean
  message: string
  onClose: () => void
}

// ❌ Bad - 過度配置
interface Props {
  show: boolean
  message: string
  title?: string
  icon?: React.ReactNode
  buttonText?: string
  buttonColor?: string
  // ... 10 個可選 props
}
```

**原則：**
- 必須的 props 明確標記（不用 `?`）
- 避免過度配置
- 保持「統一」優先於「靈活」

### 3. 何時不該抽取

❌ **不要為了抽取而抽取：**

```tsx
// ❌ Bad - 強行統一不同的表格
<DataTable
  mode={isDieselPage ? 'group' : 'monthly'}
  columns={isDieselPage ? groupColumns : monthlyColumns}
  // ... 10 個 if/else
/>
```

✅ **保持原樣更好：**

```tsx
// ✅ Good - DieselPage
<DieselDataGrid records={records} />

// ✅ Good - LPGPage
<MonthlyDataTable months={months} />
```

**Linus 原則：「消除特殊情況，而不是用 if/else 處理特殊情況」**

### 4. 文件組織

```
frontend/src/
├── components/          # 可重用組件
│   ├── LoadingPage.tsx
│   ├── StatusBanner.tsx
│   ├── ConfirmClearModal.tsx
│   └── SuccessModal.tsx
├── hooks/              # 可重用 hooks
│   ├── useReviewMode.ts
│   ├── useApprovalStatus.ts
│   └── useEnergyClear.ts
└── pages/
    └── Category1/
        └── DieselPage.tsx  # 使用上述組件和 hooks
```

---

## 移動源能源頁面架構 (柴油、汽油)

### 快速參考：我要改什麼？

這是配置驅動的架構 - **所有差異都在配置檔**。

#### 📋 配置檔案一覽表

| 需求 | 修改檔案 | 修改位置 |
|------|---------|---------|
| 🎨 **改顏色** | `mobileEnergyConfig.ts` | `iconColor: '#0219A7'` (L45) |
| 🔤 **改標題** | `mobileEnergyConfig.ts` | `title: '汽油'` (L43) |
| 📝 **改說明文字** | `mobileEnergyConfig.ts` | `instructionText: '...'` (L47) |
| 🔧 **改單位** | `mobileEnergyConfig.ts` | `unit: 'L'` (L46) |
| 🆕 **新增頁面** | 複製 `GasolinePage.tsx` → 只改 `import CONFIG` |
| 🔌 **改 API 欄位名** | `mobileEnergyConfig.ts` | `dataFieldName: 'gasolineData'` (L48) |

#### 📂 檔案結構

```
src/pages/Category1/
├── DieselPage.tsx          # 柴油頁面 (使用 DIESEL_CONFIG)
├── GasolinePage.tsx        # 汽油頁面 (使用 GASOLINE_CONFIG)
└── shared/
    ├── mobileEnergyConfig.ts           # ⭐ 所有配置集中在這裡
    └── mobile/
        ├── mobileEnergyTypes.ts        # 型別定義
        ├── mobileEnergyConstants.ts    # 版面常數
        ├── mobileEnergyUtils.ts        # 共用函式
        └── components/
            ├── MobileEnergyUsageSection.tsx     # 編輯區組件
            ├── MobileEnergyGroupListSection.tsx # 列表區組件
            └── ImageLightbox.tsx                # 圖片燈箱
```

### 配置檔詳解 (mobileEnergyConfig.ts)

```typescript
export interface MobileEnergyConfig {
  pageKey: 'diesel' | 'gasoline'           // API 識別碼
  category: string                          // 大字母標籤 (D, G)
  title: string                             // 中文標題
  subtitle: string                          // 英文副標題
  iconColor: string                         // 主題顏色 (16進位)
  unit: string                              // 數據單位 (L, kg...)
  instructionText: string                   // 頁面說明文字
  dataFieldName: string                     // API payload 欄位名
}

// 柴油配置
export const DIESEL_CONFIG: MobileEnergyConfig = {
  pageKey: 'diesel',
  category: 'D',
  title: '柴油(移動源)',
  subtitle: 'Diesel (Mobile Sources)',
  iconColor: '#3996FE',   // 藍色
  unit: 'L',
  instructionText: '請先選擇設備項目...',
  dataFieldName: 'dieselData'
}

// 汽油配置
export const GASOLINE_CONFIG: MobileEnergyConfig = {
  pageKey: 'gasoline',
  category: 'G',
  title: '汽油',
  subtitle: 'Gasoline)',
  iconColor: '#0219A7',   // 深藍色
  unit: 'L',
  instructionText: '請先選擇設備項目...',
  dataFieldName: 'gasolineData'
}
```

### 主題顏色如何運作

配置檔的 `iconColor` 會自動應用到以下位置：

| UI 元素 | 顏色來源 | 檔案位置 |
|---------|---------|---------|
| 類別字母 "G" | `iconColor` → `PageHeader` | `PageHeader.tsx:54` |
| 審核狀態陰影 | `accentColor` → `StatusBanner` | `StatusBanner.tsx:70` |
| 底部操作欄 | `accentColor` → `BottomActionBar` | `BottomActionBar.tsx:56` |
| Database Icon | `iconColor` → `MobileEnergyUsageSection` | `MobileEnergyUsageSection.tsx:108` |
| 表頭背景 | `iconColor` → `MobileEnergyUsageSection` | `MobileEnergyUsageSection.tsx:309` |
| 新增按鈕 | `iconColor` → `MobileEnergyUsageSection` | `MobileEnergyUsageSection.tsx:348` |
| List Icon | `iconColor` → `MobileEnergyGroupListSection` | `MobileEnergyGroupListSection.tsx:47` |

**實例：**
- 柴油頁面 = `#3996FE` (原藍色)
- 汽油頁面 = `#0219A7` (深藍色)

### 如何新增類似頁面 (如天然氣)

**步驟 1：新增配置** (`mobileEnergyConfig.ts`)

```typescript
export const NATURALGAS_CONFIG: MobileEnergyConfig = {
  pageKey: 'naturalgas',
  category: 'N',
  title: '天然氣',
  subtitle: 'Natural Gas)',
  iconColor: '#FF6B35',  // 橘色
  unit: 'm³',
  instructionText: '請上傳天然氣使用單據...',
  dataFieldName: 'naturalgasData'
}
```

**步驟 2：複製頁面檔案**

```bash
cp GasolinePage.tsx NaturalGasPage.tsx
```

**步驟 3：只改 3 行**

```tsx
// NaturalGasPage.tsx
import { NATURALGAS_CONFIG } from './shared/mobileEnergyConfig'  // L26

export default function NaturalGasPage() {
  const pageKey = 'naturalgas'  // L37
  // ... 其他程式碼完全不用改
}
```

**步驟 4：在 SharedPageLayout、Section 組件傳入時改用新 CONFIG**

```tsx
// 所有用到 GASOLINE_CONFIG 的地方改成 NATURALGAS_CONFIG
<SharedPageLayout
  pageHeader={{
    category: NATURALGAS_CONFIG.category,
    title: NATURALGAS_CONFIG.title,
    subtitle: NATURALGAS_CONFIG.subtitle,
    iconColor: NATURALGAS_CONFIG.iconColor
  }}
  // ...
/>
```

完成！整個頁面自動套用新配置。

### 資料流程圖

```
使用者輸入
    ↓
currentEditingGroup (編輯中的群組)
    ↓
saveCurrentGroup() → savedGroups (已儲存的群組)
    ↓
handleSubmit() / handleSave()
    ↓
prepareSubmissionData() - 清理資料、去重檔案
    ↓
submit() / save() - 上傳到 Supabase
    ↓
API Payload 使用 config.dataFieldName
```

### 為什麼不用「萬能組件」？

❌ **錯誤做法：**

```tsx
<UniversalEnergyPage
  mode={isDiesel ? 'mobile' : isLPG ? 'monthly' : 'fixed'}
  config={configs[pageType]}
  // ... 20 個 if/else
/>
```

✅ **正確做法：**

```tsx
// DieselPage.tsx - 只處理柴油
<MobileEnergyUsageSection iconColor={DIESEL_CONFIG.iconColor} />

// GasolinePage.tsx - 只處理汽油
<MobileEnergyUsageSection iconColor={GASOLINE_CONFIG.iconColor} />
```

**Linus 原則：** 消除特殊情況（配置），而不是用 if/else 處理特殊情況。

### 快速問答

**Q: 我要改汽油頁面的顏色，要改幾個檔案？**
A: 只改 1 個檔案 - `mobileEnergyConfig.ts` L45

**Q: 我要新增煤炭頁面，要寫多少程式碼？**
A: 加 10 行配置，複製 1 個頁面檔案，改 3 行

**Q: 為什麼不把柴油和汽油合併成一個組件？**
A: 它們已經共用組件了 (`MobileEnergyUsageSection`)，只有配置不同。分開的頁面檔案讓每個頁面更清晰，符合單一職責原則。

**Q: 測試怎麼辦？**
A: 測試共用組件 1 次，所有頁面都受益。配置檔不需要測試（只是資料）。

---

## 總結

**成果：**
- ✅ 創建 4 個高品質可重用組件（403 行）
- ✅ 消除 2,897 行重複代碼
- ✅ 改善比例 7.2 倍
- ✅ 維護成本降低 10 倍
- ✅ 測試成本降低 4 倍
- ✅ 移動源頁面實現配置驅動架構 (柴油、汽油共用)

**原則：**
- 重複 ≥3 次才抽取
- 100% 相同邏輯
- 抽取後更簡單
- 不強行統一不同的東西
- **配置驅動 > 萬能組件**

**Linus 語錄：**
> "消除邊界情況永遠優於增加條件判斷。"

我們沒有創建一個「萬能組件」用 if/else 處理 14 種情況，而是創建了 4 個專職組件，每個都只做一件事並把它做好。

這才是好品味。
