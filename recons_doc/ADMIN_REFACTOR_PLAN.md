# 管理介面小範圍重構計畫

**日期**：2025-10-30
**目標**：修復 Priority 1-2 的程式碼重複和維護性問題
**預估時間**：4-6 小時
**策略**：增量式重構，每步可回滾

---

## 測試現狀

**總測試數**：20+ 測試檔案
**當前狀態**：26/26 測試套件失敗（但這些失敗與重構無關，是既有問題）

**受影響的測試**：
- `adminUsers.test.ts` - 會受 Priority 1B 影響（API 轉換邏輯）
- 其他測試不受影響（都是 energy 相關或 hooks）

**測試策略**：
1. 不修復既有的測試失敗（不在此次重構範圍）
2. 確保重構後 `adminUsers.test.ts` 仍能通過
3. 手動測試管理介面的關鍵功能

---

## Priority 1A：統一能源類別配置

### 問題
能源類別配置散落在 3 個地方：
1. `AdminDashboard.tsx` 第 33-48 行：`energyCategories` 陣列
2. `AdminDashboard.tsx` 第 82-97 行：`pageMap` 物件
3. `data/mockData.ts` 第 151-171 行：`energyCategories` 陣列

**風險**：新增類別要改 3 處，容易漏改

### 解決方案
建立單一事實來源：`frontend/src/pages/admin/data/energyConfig.ts`

```typescript
export interface EnergyCategory {
  id: string
  name: string
  scope: 1 | 2 | 3
  route: string
  hasVersion?: boolean
}

export const ENERGY_CONFIG: readonly EnergyCategory[] = [
  { id: 'wd40', name: 'WD-40', scope: 1, route: '/app/wd40' },
  { id: 'acetylene', name: '乙炔', scope: 1, route: '/app/acetylene' },
  // ... 其他 14 個類別
]

// 工具函式
export function getCategoryName(pageKey: string, fallback?: string): string
export function getPageRoute(pageKey: string): string | null
export function getCategoriesByScope(scope: 1 | 2 | 3): EnergyCategory[]
```

### 受影響檔案
1. **新增**：`frontend/src/pages/admin/data/energyConfig.ts`
2. **修改**：`AdminDashboard.tsx` - 移除重複定義，使用 energyConfig
3. **修改**：`data/mockData.ts` - 從 energyConfig 導入（或刪除重複）

### 測試影響
- 無測試直接依賴這些配置
- 手動測試：AdminDashboard 能正確顯示類別名稱

### Git Commit
```bash
git add frontend/src/pages/admin/data/energyConfig.ts
git add frontend/src/pages/admin/AdminDashboard.tsx
git add frontend/src/pages/admin/data/mockData.ts
git commit -m "refactor(admin): 統一能源類別配置到 energyConfig.ts"
```

---

## Priority 1B：統一 API 轉換邏輯

### 問題
API ↔ UI 資料轉換邏輯散落在 3 個地方：
1. `AdminDashboard.tsx` 第 104-123 行：`convertAPIUserToUIUser`
2. `EditUser.tsx` 第 80-96 行：`convertAPIUserToFormData`
3. `CreateUser.tsx` 第 147-162 行：建立用戶時的轉換

**風險**：API 格式改變要改 3 處

### 解決方案
建立轉換層：`frontend/src/pages/admin/utils/userTransformers.ts`

```typescript
import { UserProfile, CreateUserData, UserUpdateData } from '../../../api/adminUsers'

// API → UI User (for AdminDashboard)
export function apiUserToUIUser(apiUser: UserProfile): User

// API → Form Data (for EditUser)
export function apiUserToFormData(apiUser: UserProfile): UserFormData

// Form Data → Create User Data (for CreateUser)
export function formDataToCreateUserData(form: UserFormData): CreateUserData

// Form Data → Update User Data (for EditUser)
export function formDataToUpdateUserData(form: UserFormData): UserUpdateData
```

### 受影響檔案
1. **新增**：`frontend/src/pages/admin/utils/userTransformers.ts`
2. **修改**：`AdminDashboard.tsx` - 使用 `apiUserToUIUser`
3. **修改**：`EditUser.tsx` - 使用 `apiUserToFormData` 和 `formDataToUpdateUserData`
4. **修改**：`CreateUser.tsx` - 使用 `formDataToCreateUserData`

### 測試影響
- **受影響**：`adminUsers.test.ts` - 但只是改 import 路徑
- **手動測試**：
  - AdminDashboard 用戶列表顯示正確
  - EditUser 載入資料正確
  - CreateUser 建立成功

### Git Commit
```bash
git add frontend/src/pages/admin/utils/userTransformers.ts
git add frontend/src/pages/admin/AdminDashboard.tsx
git add frontend/src/pages/admin/EditUser.tsx
git add frontend/src/pages/admin/CreateUser.tsx
git commit -m "refactor(admin): 統一 API 轉換邏輯到 userTransformers.ts"
```

---

## Priority 2C：簡化統計邏輯

### 問題
`AdminDashboard.tsx` 第 131-163 行的統計計算有 3 個資料來源：
1. 從 `metrics` API
2. 從 `submissions` 陣列計算
3. 預設值（0）

**風險**：數字會跳來跳去，邏輯複雜

### 解決方案
只用一個資料源：`metrics` API

```typescript
const statistics = useMemo(() => ({
  totalUsers: users.length,
  submitted: metrics?.pendingReviews ?? 0,
  approved: metrics?.approvedReviews ?? 0,
  rejected: metrics?.needsFixReviews ?? 0
}), [metrics, users.length])
```

如果 `metrics` 未載入，顯示 0 或 Loading 狀態。

### 受影響檔案
1. **修改**：`AdminDashboard.tsx` - 簡化 statistics 邏輯

### 測試影響
- 無測試
- **手動測試**：
  - Dashboard 統計卡片數字正確
  - 數字不會在載入過程中跳動

### Git Commit
```bash
git add frontend/src/pages/admin/AdminDashboard.tsx
git commit -m "refactor(admin): 簡化統計邏輯，只使用 metrics API"
```

---

## Priority 2D：抽取匯出邏輯到 hook

### 問題
匯出邏輯重複在：
1. `EditUser.tsx` 第 294-340 行：47 行匯出邏輯
2. `AdminDashboard.tsx` 第 340-372 行：32 行匯出邏輯（類似）

**風險**：改匯出邏輯要改兩處

### 解決方案
建立共用 hook：`frontend/src/pages/admin/hooks/useUserExport.ts`

```typescript
export function useUserExport(userId: string, userName: string) {
  const [isExporting, setIsExporting] = useState(false)
  const [progress, setProgress] = useState<{
    status: string
    current?: number
    total?: number
  } | null>(null)

  const exportUser = async () => {
    // 40 行匯出邏輯集中在這裡
  }

  return { exportUser, isExporting, progress }
}
```

### 受影響檔案
1. **新增**：`frontend/src/pages/admin/hooks/useUserExport.ts`
2. **修改**：`EditUser.tsx` - 使用 hook
3. **修改**：`AdminDashboard.tsx` - 使用 hook（如果需要）

### 測試影響
- 無測試
- **手動測試**：
  - EditUser 的「下載 ZIP」按鈕正常
  - 進度條正常顯示
  - 檔案下載成功

### Git Commit
```bash
git add frontend/src/pages/admin/hooks/useUserExport.ts
git add frontend/src/pages/admin/EditUser.tsx
git add frontend/src/pages/admin/AdminDashboard.tsx
git commit -m "refactor(admin): 抽取匯出邏輯到 useUserExport hook"
```

---

## 執行順序

**重要**：按順序執行，確保每步獨立且可回滾

1. ✅ Priority 1A：統一能源類別配置（低風險）
2. ✅ Priority 1B：統一 API 轉換邏輯（中風險）
3. ✅ Priority 2C：簡化統計邏輯（低風險）
4. ✅ Priority 2D：抽取匯出邏輯（低風險）
5. ✅ 手動測試所有功能

每完成一個 Priority：
- 跑一次編譯：`npm run build`
- 測試基本功能
- Git commit

---

## 手動測試清單

### AdminDashboard
- [ ] 統計卡片數字正確（總用戶數、待審核、已通過、已退回）
- [ ] 點擊統計卡片能切換 tab
- [ ] 搜尋功能正常
- [ ] 用戶卡片顯示正確（公司名稱、姓名、Email）
- [ ] 點擊用戶卡片能進入詳情頁

### EditUser
- [ ] 用戶資料正確回填
- [ ] 修改後能成功更新
- [ ] 「下載 ZIP」功能正常
- [ ] 進度條顯示正確

### CreateUser
- [ ] 表單驗證正常
- [ ] 能成功建立用戶
- [ ] 建立後出現在用戶列表

---

## 回滾策略

如果某個 Priority 出問題：

```bash
# 查看最近的 commits
git log --oneline -5

# 回滾最後一個 commit（保留改動）
git reset --soft HEAD~1

# 回滾最後一個 commit（丟棄改動）
git reset --hard HEAD~1
```

---

## 預期成果

### 程式碼品質
- **能源類別配置**：3 處重複 → 1 處
- **API 轉換邏輯**：3 處重複 → 1 處（4 個函式）
- **統計計算**：30 行複雜邏輯 → 10 行簡單邏輯
- **匯出邏輯**：2 處重複（79 行）→ 1 個 hook（40 行）

### 維護性改善
- 新增能源類別：改 1 個檔案
- API 格式變更：改 1 個檔案
- 匯出邏輯調整：改 1 個檔案

### 功能完整性
- ✅ 所有現有功能正常運作
- ✅ 無破壞性變更
- ✅ 編譯無錯誤

---

## 開始前檢查

- [ ] Git 工作目錄乾淨
- [ ] 在正確的分支
- [ ] `npm run dev` 能啟動
- [ ] 確認有時間完成（4-6 小時）

---

**準備好了就開始執行 Priority 1A！**
