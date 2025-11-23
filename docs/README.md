# 重構中控台

> 每次打開這個文件，就知道現在要做什麼

**上次更新：** 2025-01-21
**當前進度：** 8 / 16 頁完成 ✅（Type 1 ✅ 完成，Type 2 ✅ 完成 🎉）

---

## 🎯 現在要做什麼

### 當前任務

```
[x] 重構 RefrigerantPage（第 1/16 頁）- Type 1 ✅ 完成
[x] 重構 SF6Page（第 2/16 頁）- Type 1 ✅ 完成
[x] 重構 GeneratorTestPage（第 3/16 頁）- Type 1 ✅ 完成
[x] 完成 Type 2 批次（第 4-8/16 頁）- Type 2（一筆佐證 → 多筆資料）✅ 完成
```

**Type 1 & Type 2 已完成！下一步：Type 3 或 Type 5**
1. 選擇方向：Type 3（規格 + 使用記錄）或 Type 5（Excel 上傳，最簡單）
2. 打開 [page-classification.md](page-classification.md) 研究選定類型特徵
3. 打開對應的 SOP（type3-sop.md 或 type5-sop.md，如果尚未建立則需先建立）
4. 執行重構並更新 [PROGRESS.md](PROGRESS.md)

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
- `/api/entries/submit` - 提交能源條目（15 tests passed）
- `/api/files/upload` - 檔案上傳（29 tests passed）

### 已知問題

#### Supabase Python Client 沒有 Transaction
- **問題：** 不支援原生 transaction
- **解決方案：** 使用 pseudo-transaction（手動 rollback）
- **範例：** 參考 `backend/src/services/file_service.py`

#### 前端直接呼叫 Supabase（❌ 要改掉）
- **問題：** 商業邏輯在前端
- **解決方案：** 全部改用後端 API
- **進度：** 3 / 16 頁完成 ✅ RefrigerantPage, SF6Page, GeneratorTestPage

---

## 📊 進度總覽

**Type 1（一筆佐證 → 一筆資料）：** 3 / 3 ✅ (RefrigerantPage ✅, SF6Page ✅, GeneratorTestPage ✅)
**Type 2（一筆佐證 → 多筆資料）：** 5 / 5 ✅ (DieselPage ✅, GasolinePage ✅, UreaPage ✅, SepticTankPage ✅, DieselStationarySourcesPage ✅)
**Type 3（規格 + 使用記錄）：** 1 / 5 (WD40Page ✅ - 已完成通知規範化)
**Type 4（電錶 + 帳單）：** 0 / 2 🔜
**Type 5（Excel 上傳）：** 0 / 1 🔜

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

Type 1 完成回顧：
1. ✅ RefrigerantPage 完成（2025-01-18，2h）
2. ✅ SF6Page 完成（2025-01-19，3h）
3. ✅ GeneratorTestPage 完成（2025-01-19，1h）
4. ✅ Type 1 批次總耗時：6 小時（提前完成）

下一個批次：Type 2（一筆佐證 → 多筆資料）
- 研究 Type 2 架構（groupId + records）
- 選擇 Pilot 頁面（建議：DieselPage）
- 規劃 Type 2 重構策略

---

**批次計畫：**
- 批次 1：Type 1（3 頁）- ✅ 完成（6h）
- 批次 2：Type 2（5 頁）- 2 天
- 批次 3：Type 5（1 頁）- 0.5 天
- 批次 4：Type 3（5 頁）- 3 天
- 批次 5：Type 4（2 頁）- 2 天

**總計：約 8.5 天完成全部 16 頁**

---

**下一個：Type 2 批次（5 頁，預計 2 天）**
