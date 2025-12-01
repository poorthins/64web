# 重構中控台

> 每次打開這個文件，就知道現在要做什麼

**上次更新：** 2025-01-27
**當前進度：** 15 / 16 頁完成 ✅（Type 1 ✅，Type 2 ✅，Type 3 ✅，Type 4 🚧 1/2，Type 5 ✅）

---

## 🎯 現在要做什麼

### 當前任務

```
[x] 重構 RefrigerantPage（第 1/16 頁）- Type 1 ✅ 完成
[x] 重構 SF6Page（第 2/16 頁）- Type 1 ✅ 完成
[x] 重構 GeneratorTestPage（第 3/16 頁）- Type 1 ✅ 完成
[x] 完成 Type 2 批次（第 4-8/16 頁）- Type 2（一筆佐證 → 多筆資料）✅ 完成
[x] 重構 WD40Page（第 9/16 頁）- Type 3 Pilot ✅ 完成
[x] 重構 LPGPage（第 10/16 頁）- Type 3 ✅ 完成
[x] 重構 AcetylenePage（第 11/16 頁）- Type 3 ✅ 完成
[x] 重構 WeldingRodPage（第 12/16 頁）- Type 3 ✅ 完成
[x] 重構 FireExtinguisherPage（第 13/16 頁）- Type 3 ✅ 完成（全局檔案功能）
[x] 重構 CommuteePage（第 16/16 頁）- Type 5 ✅ 完成（30 分鐘）
[x] 重構 NaturalGasPage（第 14/16 頁）- Type 4 ✅ 完成（2 小時）
```

**Type 4 批次進度：1/2 完成 🚧**

### 🎉 重要里程碑：Type 3 全局檔案功能

**日期：** 2025-01-25
**成就：** Type 3 架構新增全局檔案支援（Global Files）

- ✅ 滅火器頁面從 291 行簡化到 159 行（減少 45%）
- ✅ 零破壞性：其他 4 個 Type 3 頁面完全不受影響
- ✅ 自動管理：載入、上傳、刪除、狀態同步全自動
- ✅ 消除 Bug：解決了上傳後佐證顯示錯誤的狀態衝突問題

### 🎉 重要里程碑：Type 4 開始（2025-01-27）

**成就：** NaturalGasPage 重構完成 - Type 2 架構 + 自訂 Hooks
- ✅ **程式碼瘦身**：2100 行 → 1211 行（**-42%，削減 889 行**）
- ✅ **建立 3 個專用 Hooks**（502 行新檔案）：
  - `useNaturalGasSubmit.ts` (205 行) - Type 2 提交邏輯
  - `useNaturalGasData.ts` (139 行) - Type 2 資料載入與檔案分配
  - `useMonthlyCalculation.ts` (158 行) - 月份用量與覆蓋度計算
- ✅ **刪除重複程式碼**：
  - 165 行日期/月份計算函式（改用 utils）
  - 650 行舊帳單管理、驗證、提交邏輯
  - 120 行舊資料載入 useEffect
- ✅ **Type 2 UI 替換**：
  - `<MobileEnergyUsageSection>` 編輯卡（支援多筆帳單共用佐證）
  - `<MobileEnergyGroupListSection>` 資料列表
  - `<NaturalGasBillInputFields>` 自訂輸入欄位
- ✅ **TypeScript 品質**：0 個編譯錯誤 ✅
- ✅ **向後相容**：自動補 groupId，舊資料無痛升級

**關鍵技術特點：**
- Type 2 架構：一份佐證綁定多筆帳單（record_id 使用逗號分隔）
- 月份覆蓋度計算：精確計算帳單期間與目標年份的交集
- 低位熱值管理：固定 record_id = 'heat_value'
- 錶號清單：支援多個天然氣錶

**待完成（已標記 TODO）：**
- 泛型化共用組件（避免 `as any`）
- 實作 Type 2 檔案刪除邏輯
- 建立 useNaturalGasValidation hook
- 整合 HeatValueSection 和 MeterSection

下一步：
**Type 4 完結**：ElectricityBillPage（電錶 + 帳單，最後一頁）

---

## 📚 文件導航

| 文件 | 用途 | 何時打開 |
|------|------|---------|
| **[CODE_QUALITY_CHECKLIST.md](CODE_QUALITY_CHECKLIST.md)** | 程式碼品質標準檢查清單 | **每次重構/新增功能前必看** |
| **[page-classification.md](page-classification.md)** | 16 個頁面的分類（Type 1-5） | 開始重構新頁面時 |
| **[data-contracts-v2.md](data-contracts-v2.md)** | 前後端資料格式定義 | 寫 API 或組資料時 |
| **[PROGRESS.md](PROGRESS.md)** | 進度追蹤 + 心得記錄 | 完成一頁後更新 |
| **[type1-sop.md](type1-sop.md)** | Type 1 頁面重構步驟 | 重構 Type 1 頁面時 |
| **[type2-sop.md](type2-sop.md)** | Type 2 頁面重構步驟 | 重構 Type 2 頁面時 |
| **[type3-sop.md](type3-sop.md)** | Type 3 頁面重構步驟 + 7 題問卷 | 重構/新增 Type 3 頁面時 |

---

## 🛠️ 技術棧

### 前端
- **框架：** React 18 + TypeScript + Vite
- **狀態管理：** React Hooks
- **路由：** React Router
- **HTTP 客戶端：** Fetch API
- **數據庫：** Supabase Client

**新 API（✅ 使用）：**
- `frontend/src/api/v2/entryAPI.ts` - 提交 API
- `frontend/src/api/v2/fileAPI.ts` - 檔案上傳 API
- `frontend/src/api/v2/carbonAPI.ts` - 碳排放計算 API

**舊 Hooks（❌ 重構後刪除）：**
- `useMultiRecordSubmit` - 舊的提交 hook（Type A 用）✅ RefrigerantPage 已移除
- `useEnergySubmit` - 舊的提交 hook（Type B 用）
- `useRecordFileMapping` - 舊的檔案映射 hook ✅ RefrigerantPage, SF6Page 已移除
- `prepareSubmissionData` - 舊的資料準備函數

### 後端
- **框架：** Flask (Python)
- **數據庫：** Supabase (PostgreSQL)
- **驗證：** Pydantic v2
- **測試：** pytest
- **認證：** JWT (Supabase Auth)

**新 API（✅ 已實作）：**
- `/api/carbon/calculate` - 碳排放計算（16 tests passed）
- `/api/entries/submit` - 提交能源條目（16 tests passed）
- `/api/files/upload` - 檔案上傳（29 tests passed）

### 已知問題

#### Supabase Python Client 沒有 Transaction
- **問題：** 不支援原生 transaction
- **解決方案：** 使用 pseudo-transaction（手動 rollback）
- **範例：** 參考 `backend/src/services/file_service.py`

#### 前端直接呼叫 Supabase（❌ 要改掉）
- **問題：** 商業邏輯在前端
- **解決方案：** 全部改用後端 API
- **進度：** 14 / 16 頁完成 ✅

---

## 📊 進度總覽

**Type 1（一筆佐證 → 一筆資料）：** 3 / 3 ✅ (RefrigerantPage ✅, SF6Page ✅, GeneratorTestPage ✅)
**Type 2（一筆佐證 → 多筆資料）：** 5 / 5 ✅ (DieselPage ✅, GasolinePage ✅, UreaPage ✅, SepticTankPage ✅, DieselStationarySourcesPage ✅)
**Type 3（規格 + 使用記錄）：** 5 / 5 ✅ (WD40Page ✅, LPGPage ✅, AcetylenePage ✅, WeldingRodPage ✅, FireExtinguisherPage ✅)
**Type 4（電錶 + 帳單）：** 0 / 2 🔜
**Type 5（Excel 上傳）：** 1 / 1 ✅ (CommuteePage ✅)

---

## 🔄 工作流程

### 重構一個頁面（標準流程）

```
0. 檢查品質標準 ⭐️ 必做
   → 打開 CODE_QUALITY_CHECKLIST.md
   → 確認檔案結構標準、程式碼品質標準（P0/P1/P2）
   → 注意提取與重用標準（避免重複程式碼）

1. 查類型
   → 打開 page-classification.md
   → 找到頁面是 Type 1/2/3/4/5

2. 看格式
   → 在 page-classification.md 看該 Type 的資料結構
   → 確認佐證關係（1:1 還是 1:多）

3. 寫後端
   → 照著資料結構寫 Pydantic schema
   → 實作 service 邏輯
   → 寫測試

4. 改前端
   → 移除舊 hooks
   → 改用新 API (entryAPI, fileAPI)
   → 測試

5. 驗證品質 ⭐️ 必做
   → 執行 CODE_QUALITY_CHECKLIST.md 中的驗證指令
   → 確認無 P0 問題，優先修復 P1 問題
   → 跑 TypeScript 編譯：npx --prefix frontend tsc --noEmit

6. 記錄
   → 更新 PROGRESS.md
   → 記錄遇到的問題和心得
   → 更新 README.md 的「當前任務」
```

### 遇到問題怎麼辦

| 問題 | 查哪裡 |
|------|--------|
| 不知道程式碼品質標準 | CODE_QUALITY_CHECKLIST.md |
| 不知道是否該提取共用程式碼 | CODE_QUALITY_CHECKLIST.md → 提取與重用標準 |
| 不知道頁面是什麼類型 | page-classification.md |
| 不知道資料格式怎麼組 | data-contracts-v2.md |
| 不知道用哪個 API | 看「技術棧」的新 API 清單 |
| 遇到 bug | PROGRESS.md 記錄，下次避免 |

---

## 🎯 下一步

**已完成批次回顧：**
- ✅ Type 1（3 頁）- 6 小時完成（RefrigerantPage, SF6Page, GeneratorTestPage）
- ✅ Type 2（5 頁）- 完成（DieselPage, GasolinePage, UreaPage, SepticTankPage, DieselStationarySourcesPage）
- ✅ Type 3（5 頁）- 完成（WD40Page, LPGPage, AcetylenePage, WeldingRodPage, FireExtinguisherPage）
- ✅ Type 5（1 頁）- 2 小時完成（CommuteePage）

**當前進度：14/16 頁完成（87.5%）**

---

### 下一個批次：Type 4（2 頁，最複雜）

**Type 4 特性：電錶 + 帳單（雙重資料來源）**
- 頁面 1：NaturalGasPage（天然氣）
- 頁面 2：ElectricityBillPage（外購電力）

**Type 4 挑戰：**
- 資料來源 1：電錶讀數（monthly data）
- 資料來源 2：帳單掃描（佐證檔案）
- 需要同步兩種資料並計算總量

**預估工作：**
- 研究 Type 4 架構（雙重資料源）
- 設計資料結構和 API schema
- 選擇 Pilot 頁面（建議：NaturalGasPage）
- 預計 2-3 天完成

---

**批次計畫：**
- 批次 1：Type 1（3 頁）- ✅ 完成（6h）
- 批次 2：Type 2（5 頁）- ✅ 完成
- 批次 3：Type 5（1 頁）- ✅ 完成（2h）
- 批次 4：Type 3（5 頁）- ✅ 完成
- 批次 5：Type 4（2 頁）- 🔜 下一個

**總計：預計 8.5 天完成全部 16 頁（目前 87.5% 完成）**

---

**下一個：Type 4 批次（2 頁，預計 2-3 天）**
