# Refactor: `monthly` → `usage` 重構計畫

**日期：** 2025-10-23
**狀態：** 📋 待執行
**優先級：** P2 (技術債償還)

---

## 問題描述

### 當前狀況

`monthly` 這個名稱是災難性的抽象錯誤：

**情境 A：確實代表月份**
- 外購電力：`{ '1': 100, '2': 200, ..., '12': 150 }` - 12 個月用電度數
- WD40/乙炔：`{ '1': 50, '2': 30, ... }` - 每月使用量
- ✅ 名稱符合語意

**情境 B：濫用作為總量容器**
- 柴油/尿素/冷媒：`{ '1': 5000 }` - 年度總量硬塞在 key '1'
- 這些頁面根本沒有「月份」概念
- ❌ 名稱完全誤導

### Linus 判斷

> "Bad programmers worry about the code. Good programmers worry about data structures and their relationships."

**問題根源：**
- 資料結構：`Record<string, number>` - key 可以代表任何東西
- 錯誤命名：`monthly` - 暗示 key 必定是月份
- 結果：50% 的使用場景在說謊

**正確做法：**
- 這是「使用量的鍵值對應」，不是「月份資料」
- 應該叫 `usage` 或 `amounts`，語意中立
- 讓使用方決定 key 的意義（月份 or 其他）

---

## 影響範圍

### 📁 前端檔案（26 個）

**能源頁面 (15 個)**
- Category1: `AcetylenePage`, `DieselPage`, `DieselGeneratorPage`, `DieselGeneratorRefuelPage`, `DieselGeneratorTestPageImpl`, `FireExtinguisherPage`, `GasolinePage`, `LPGPage`, `NaturalGasPage`, `RefrigerantPage`, `SepticTankPage`, `UreaPage`, `WD40Page`, `WeldingRodPage`
- Category2: `ElectricityBillPage`
- Category3: `CommuteePage`

**核心 API/Hook (5 個)**
- `api/entries.ts` - `UpsertEntryInput` interface, `sumMonthly()`, `validateMonthlyData()`
- `hooks/useEnergySubmit.ts` - `SubmitParams` interface
- `hooks/useMultiRecordSubmit.ts`
- `hooks/useEnergyPage.ts`
- `components/MonthlyProgressGrid.tsx`

**測試檔案 (3 個)**
- `__tests__/api/entries.test.ts`
- `__tests__/api/urea.test.ts`
- `__tests__/api/electricity-bill.test.ts`
- `hooks/__tests__/useEnergySubmit.test.ts`

**管理介面 (2 個)**
- `pages/admin/utils/exportUtils.ts`
- `components/common/EvidenceFileManager.tsx`

### 🗄️ 資料庫

**表：** `energy_entries`
**欄位：** `payload` (JSONB)
**路徑：** `payload.monthly` → `payload.usage`

**估計受影響記錄數：** 未知（需查詢）

---

## 執行計畫

### Phase 1: 資料庫遷移腳本準備

**1.1 撰寫 SQL 遷移腳本**

```sql
-- migration_monthly_to_usage.sql
-- ⚠️ 先在測試環境驗證！

BEGIN;

-- 備份：先複製一份原始資料
CREATE TABLE energy_entries_backup_20251023 AS
SELECT * FROM energy_entries;

-- 更新：將 payload.monthly 改名為 payload.usage
UPDATE energy_entries
SET payload = jsonb_set(
  payload - 'monthly',  -- 移除舊 key
  '{usage}',            -- 新 key 路徑
  payload->'monthly'    -- 舊值
)
WHERE payload ? 'monthly';  -- 只更新有 monthly 的記錄

-- 驗證：檢查是否有遺漏
SELECT
  COUNT(*) as records_with_monthly,
  COUNT(*) FILTER (WHERE payload ? 'usage') as records_with_usage
FROM energy_entries;

-- ⚠️ 只有當 records_with_monthly = 0 時才 COMMIT
COMMIT;
-- ROLLBACK;  -- 測試時用這個
```

**1.2 測試環境驗證**
```bash
# 備份測試資料庫
pg_dump carbondb_test > backup_test_$(date +%Y%m%d).sql

# 執行遷移
psql carbondb_test < migration_monthly_to_usage.sql

# 驗證資料完整性
psql carbondb_test -c "SELECT page_key, COUNT(*),
  COUNT(*) FILTER (WHERE payload ? 'monthly') as old_count,
  COUNT(*) FILTER (WHERE payload ? 'usage') as new_count
FROM energy_entries GROUP BY page_key;"
```

### Phase 2: TypeScript 型別定義修改

**策略：先改 interface，讓編譯器告訴我們哪裡要改**

**2.1 修改 `api/entries.ts`**
```typescript
// 修改前
export interface UpsertEntryInput {
  page_key: string
  period_year: number
  unit: string
  monthly: Record<string, number>  // ❌
  notes?: string
  payload?: any
  extraPayload?: any
}

// 修改後
export interface UpsertEntryInput {
  page_key: string
  period_year: number
  unit: string
  usage: Record<string, number>  // ✅ 改這裡
  notes?: string
  payload?: any
  extraPayload?: any
}

// 函式改名（可選，保持向後相容）
export function sumUsage(usage: Record<string, number>): number {
  return Object.values(usage).reduce((sum, value) => {
    const numValue = Number(value) || 0
    return sum + (numValue >= 0 ? numValue : 0)
  }, 0)
}

// 或保持函式名不變（參數改名即可）
export function sumMonthly(usage: Record<string, number>): number {
  // 實作不變
}
```

**2.2 修改 `hooks/useEnergySubmit.ts`**
```typescript
export interface SubmitParams {
  formData: {
    unitCapacity?: number
    carbonRate?: number
    usage: Record<string, number>  // ✅ 改這裡
    monthlyQuantity?: Record<string, number>
    unit: string
    notes?: string
    extraPayload?: any
  }
  msdsFiles: MemoryFile[]
  monthlyFiles: MemoryFile[][]
  evidenceFiles?: MemoryFile[]
}

// Line 94, 99-100 同步修改
const entryInput: UpsertEntryInput = {
  page_key: pageKey,
  period_year: year,
  unit: params.formData.unit,
  usage: params.formData.usage,  // ✅ 改這裡
  extraPayload: params.formData.extraPayload || {
    unitCapacity: params.formData.unitCapacity,
    carbonRate: params.formData.carbonRate,
    usage: params.formData.usage,  // ✅ 改這裡
    monthlyQuantity: params.formData.monthlyQuantity,
    notes: params.formData.notes || ''
  }
}

// Line 190
const totalUsage = sumUsage(params.formData.usage)  // ✅ 改這裡
```

**2.3 編譯檢查**
```bash
cd frontend
npm run type-check
# TypeScript 會報錯所有需要修改的地方
```

### Phase 3: 批次修改能源頁面

**模式識別：所有頁面都有類似結構**

**修改模式 A：月份資料頁面（電力、WD40）**
```typescript
// 修改前
const monthly: Record<string, number> = {}
Object.entries(monthlyTotals).forEach(([month, value]) => {
  if (value > 0) {
    monthly[month] = value
  }
})

await submitEnergy({
  formData: {
    monthly,
    unit: 'kWh',
    ...
  }
})

// 修改後
const usage: Record<string, number> = {}
Object.entries(monthlyTotals).forEach(([month, value]) => {
  if (value > 0) {
    usage[month] = value
  }
})

await submitEnergy({
  formData: {
    usage,
    unit: 'kWh',
    ...
  }
})
```

**修改模式 B：單一總量頁面（柴油、尿素）**
```typescript
// 修改前
await submitEnergy({
  formData: {
    monthly: { '1': totalQuantity },
    unit: 'L',
    ...
  }
})

// 修改後
await submitEnergy({
  formData: {
    usage: { '1': totalQuantity },
    unit: 'L',
    ...
  }
})
```

**批次修改指令（實作細節）**
```bash
# 全域搜尋替換（謹慎使用）
# 建議先用 git 確保可以 rollback

# 1. 變數宣告
find frontend/src/pages -name "*.tsx" -exec sed -i 's/const monthly: Record<string, number>/const usage: Record<string, number>/g' {} +

# 2. 物件 key 使用
# 這個比較複雜，需要手動逐檔案檢查
```

### Phase 4: 資料庫讀取邏輯相容

**在 `useEnergyData` 或類似 hook 中加入向後相容：**
```typescript
// 讀取時先找新欄位，找不到再找舊欄位
const usage = entry.payload?.usage || entry.payload?.monthly || {}
```

**⚠️ 注意：這只是過渡期策略，遷移完成後應該移除**

### Phase 5: 測試更新

**5.1 更新單元測試**
- `__tests__/api/entries.test.ts`
- `__tests__/api/urea.test.ts`
- `__tests__/api/electricity-bill.test.ts`
- `hooks/__tests__/useEnergySubmit.test.ts`

**5.2 執行測試**
```bash
cd frontend
npm test -- --coverage
```

**5.3 E2E 測試（手動）**
- 測試每個能源頁面的提交功能
- 測試管理介面的資料顯示
- 測試匯出功能

### Phase 6: 生產環境部署

**6.1 部署前檢查清單**
- [ ] 測試環境資料庫遷移成功
- [ ] 所有 TypeScript 編譯錯誤解決
- [ ] 單元測試 100% 通過
- [ ] E2E 測試通過
- [ ] Rollback 腳本準備完成

**6.2 Rollback 腳本**
```sql
-- rollback_usage_to_monthly.sql
BEGIN;

UPDATE energy_entries
SET payload = jsonb_set(
  payload - 'usage',
  '{monthly}',
  payload->'usage'
)
WHERE payload ? 'usage';

COMMIT;
```

**6.3 部署步驟**
1. 通知所有用戶：「系統維護 10 分鐘」
2. 停止前端服務
3. 備份生產資料庫
4. 執行遷移腳本
5. 驗證資料完整性
6. 部署新版前端
7. 執行煙霧測試
8. 恢復服務

---

## 風險分析

### 🔴 高風險

1. **資料庫遷移失敗**
   - 機率：中
   - 影響：所有歷史資料無法讀取
   - 緩解：完整備份 + 測試環境驗證 + Rollback 腳本

2. **TypeScript 編譯錯誤遺漏**
   - 機率：低（編譯器會抓）
   - 影響：前端無法啟動
   - 緩解：完整編譯檢查 + CI/CD 擋住

### 🟡 中風險

3. **測試未更新導致隱藏回歸**
   - 機率：中
   - 影響：特定場景功能異常
   - 緩解：完整測試覆蓋 + 手動 E2E

4. **管理介面讀取舊資料失敗**
   - 機率：低
   - 影響：部分資料顯示錯誤
   - 緩解：向後相容邏輯

### 🟢 低風險

5. **效能影響**
   - 機率：極低（只是欄位改名）
   - 影響：微乎其微

---

## 檢查清單

### 開發階段
- [ ] SQL 遷移腳本撰寫完成
- [ ] 測試環境資料庫遷移驗證
- [ ] `api/entries.ts` 型別定義修改
- [ ] `hooks/useEnergySubmit.ts` 型別定義修改
- [ ] 所有能源頁面變數改名（15 個）
- [ ] 所有 Hook 更新（4 個）
- [ ] 管理介面更新（2 個）
- [ ] 測試檔案更新（4 個）

### 測試階段
- [ ] TypeScript 編譯通過（零錯誤）
- [ ] 單元測試通過（覆蓋率 > 80%）
- [ ] 手動測試：提交新記錄（每種能源類別）
- [ ] 手動測試：讀取舊記錄（向後相容）
- [ ] 手動測試：管理介面顯示
- [ ] 手動測試：資料匯出功能

### 部署階段
- [ ] 生產資料庫完整備份
- [ ] Rollback 腳本測試完成
- [ ] 維護通知發送
- [ ] 前端服務停止
- [ ] 資料庫遷移執行
- [ ] 資料完整性驗證
- [ ] 新版前端部署
- [ ] 煙霧測試通過
- [ ] 服務恢復

---

## 結論

這是一次**正確的技術債償還**。

**Linus 視角：**
- 問題真實存在：名稱錯誤導致 50% 場景語意混亂
- 沒有捷徑：唯一解法是改名 + 遷移
- 風險可控：TypeScript 編譯器 + 測試 + 備份策略
- 值得做：消除特殊情況（「這個 monthly 其實不是 monthly」）

**執行時機建議：**
- ✅ 現在有完整計畫
- ✅ 影響範圍明確
- ⚠️ 需要排程維護視窗（建議週末或低峰期）
- ⚠️ 需要完整測試環境驗證

**預估工時：**
- 開發：4-6 小時
- 測試：2-3 小時
- 部署：1 小時（含維護視窗）
- **總計：7-10 小時**

---

**參考資料：**
- Linus Torvalds on data structures: [Git Parable](https://tom.preston-werner.com/2009/05/19/the-git-parable.html)
- PostgreSQL JSONB operations: https://www.postgresql.org/docs/current/functions-json.html
- TypeScript refactoring best practices: https://www.typescriptlang.org/docs/handbook/declaration-files/do-s-and-don-ts.html
