# 下次會話啟動指南

**最後更新：** 2025-10-09
**當前狀態：** CommuteePage 重構完成 + UreaPage Bug 修復完成，14 頁面全部完成

---

## 🎉 重構完成！

### 14 個能源頁面全部完成

所有能源類別頁面已完成 Hook 架構套用和 Bug 修復：
- ✅ 範疇一（12 頁）：WD40, Acetylene, LPG, WeldingRod, Refrigerant, Diesel, Gasoline, NaturalGas, Urea, FireExtinguisher, SepticTank, DieselGenerator
- ✅ 範疇二（1 頁）：Electricity
- ✅ 範疇三（1 頁）：CommuteePage

---

## 📊 今日完成項目（2025-10-09）

### ✅ Bug 修復（2 個）

1. **UreaPage RLS 錯誤**
   - 問題：管理員退回後重新編輯出現 RLS 政策阻擋
   - 修復：將 `preserveStatus: true` 改為 `false`
   - 參考：Bug #8（RefrigerantPage 相同問題）

2. **UreaPage 檔案分配錯誤**
   - 問題：兩個佐證資料全部跑到第一筆
   - 根因：上傳用字串 key，載入用 slice
   - 修復：上傳用數字 key，載入用 month 過濾
   - 參考：DieselPage Bug #2 相同模式

### ✅ 頁面重構（1 個）

**CommuteePage（員工通勤）完整重構**
- 套用 5 個 Hook（useEnergyData, useEnergyClear, useSubmitGuard, useApprovalStatus, useGhostFileCleaner）
- 刪除 120+ 行重複邏輯
- 修復 totalMiles 未定義 bug
- 移除假的 Excel 自動解析功能
- 統一檔案結構為陣列
- 移除員工人數和通勤距離輸入欄位（改為純檔案上傳）
- 添加審核狀態 banners 和 Loading 狀態

**程式碼統計：**
- 509 → ~570 行（邏輯減少 120 行，UI 增加 11 行）

---

## 🎯 下一步建議

### 選項 1：完整回歸測試

**目的：** 驗證所有 14 個頁面的核心功能正常運作

**測試項目（每個頁面）：**
- [ ] 首次填報 → 提交成功
- [ ] 重新進入頁面 → 載入舊資料
- [ ] 修改後提交 → 更新成功
- [ ] 檔案上傳/刪除 → 即時顯示
- [ ] 清除功能 → 資料清空
- [ ] 管理員退回 → 重新編輯提交（測試 RLS）
- [ ] Approved 狀態 → 唯讀模式

**重點關注：**
- UreaPage（今日修復 2 個 Bug，需驗證）
- CommuteePage（今日重構，需驗證）
- 多記錄頁面（Diesel, Urea, DieselGenerator）- 驗證檔案月份分配

**預估時間：** 2-3 小時

---

### 選項 2：效能優化

**目標：** 優化檔案上傳和載入速度

**可能方向：**
- 批次上傳檔案（Promise.all）
- 圖片壓縮
- 延遲載入（Lazy loading）
- 快取機制

---

### 選項 3：文件整理

**目標：** 整理重構文件，撰寫總結報告

**待整理文件：**
- REFACTORING_LOG.md（已完整記錄）
- HOOKS.md（需更新最終版本）
- REFACTORING_PLAN.md（需更新完成狀態）
- 撰寫 FINAL_REPORT.md（重構總結）

---

## 📊 當前進度總覽

### 已完成頁面（✅ 14/14）

#### 範疇一（12 頁）
- ✅ **WD40Page** - 標準 Hook 模式
- ✅ **AcetylenePage** - 標準 Hook 模式
- ✅ **LPGPage** - 特殊模式（notes 欄位衝突）
- ✅ **WeldingRodPage** - 標準 Hook 模式
- ✅ **RefrigerantPage** - 設備清單模式 + UI/UX 優化
- ✅ **DieselPage** - 多記錄模式
- ✅ **GasolinePage** - 標準 Hook 模式
- ✅ **NaturalGasPage** - 標準 Hook 模式
- ✅ **UreaPage** - 多記錄模式（今日修復 2 Bug）
- ✅ **FireExtinguisherPage** - 標準 Hook 模式
- ✅ **SepticTankPage** - 日期區間計算
- ✅ **DieselGeneratorPage** - 機器清單模式

#### 範疇二（1 頁）
- ✅ **ElectricityPage** - 電費單結構

#### 範疇三（1 頁）
- ✅ **CommuteePage** - 純檔案上傳模式（今日重構完成）

### 已完成項目（✅ Stage 1-3）

#### Stage 1：資料載入邏輯（✅ 完成）
- ✅ 建立 `useEnergyData` Hook
- ✅ 從 WD40Page 移除 loadData useEffect
- ✅ 淨減少約 180 行
- ✅ 測試通過

**Hook 功能：**
- 載入 entry 記錄（`getEntryByPageKeyAndYear`）
- 載入檔案清單（`getEntryFiles`）
- 提供 `reload()` 函式供手動重新載入
- 完整錯誤處理

#### Stage 2：提交邏輯（✅ 完成）
- ✅ 建立 `useEnergySubmit` Hook
- ✅ 從 WD40Page 簡化 handleSubmit（221→55 行）
- ✅ 淨減少約 309 行
- ✅ 測試通過

**Hook 功能：**
- 呼叫 `upsertEnergyEntry` 儲存資料
- 批次上傳記憶體檔案（MSDS + 月份檔案）
- 使用 `Promise.allSettled` 允許部分失敗
- 完整錯誤處理和成功訊息

**修復問題：**
- ✅ 資料庫遞迴錯誤（is_admin 函式加 `SECURITY DEFINER`）
- ✅ 檔案消失問題（提交後加 `await reload()`）

#### Stage 3：清除邏輯（✅ 完成）
- ✅ 建立 `useEnergyClear` Hook
- ✅ 從 WD40Page 簡化 handleClearAll（71→39 行）
- ✅ 刪除 `clearLoading` state
- ✅ 測試通過

**Hook 功能：**
- 檢查狀態（`approved` 不能清除）
- 刪除所有檔案（從資料庫和 Storage）
- 刪除 entry 記錄
- 清理記憶體檔案的 preview URLs

**額外修正：**
- ✅ 修正 approved 狀態檔案刪除問題（EvidenceUpload.tsx 加入 `mode === 'view'` 檢查）

---

### 重構統計

**已完成頁面程式碼統計：**
- WD40Page: 1512 → 1205 行（-307 行）
- AcetylenePage: ~1200 → ~900 行（-300 行）
- LPGPage: ~1100 → ~950 行（-150 行，特殊處理）
- WeldingRodPage: ~1300 → ~1050 行（-250 行）
- RefrigerantPage: ~950 → ~900 行（-50 行，已較精簡）

**Hook 總行數：**
- useEnergyData: 160 行
- useEnergySubmit: 204 行
- useEnergyClear: 135 行
- **總計：499 行**

**淨效果：** 5 個頁面減少 ~1057 行，邏輯統一，可維護性大幅提升

---

## 📋 14 個能源頁面分析結果

### 分類統計
- **🟢 高度適用（8 個，53%）**：可直接套用 3 個 Hook
- **🟡 需要調整（3 個，20%）**：需要小幅修改
- **🔴 特殊結構（3 個，20%）**：結構差異大，需要特別處理

### 優先順序（推薦處理順序）

#### 第一批：高度適用（直接套用）
1. ✅ AcetylenePage （乙炔）
2. ✅ LPGPage （液化石油氣）← 特殊處理
3. ✅ WeldingRodPage （焊條）
4. **DieselPage** （柴油）← **下次從這裡開始**
5. GasolinePage （汽油）
6. NaturalGasPage （天然氣）
7. UreaPage （尿素）
8. FireExtinguisherPage （滅火器）

#### 第二批：需要調整
9. ✅ RefrigerantPage （冷媒）- 設備清單結構 + UI/UX 優化
10. DieselGeneratorPage （柴油發電機）- 機器清單結構
11. SepticTankPage （化糞池）- 日期區間計算

#### 第三批：特殊結構
12. ElectricityPage （外購電力）- 電費單結構
13. RefuelPage （加油）- 油品類型選擇
14. CommuteePage （員工通勤）- 交通工具計算

**詳細分析請見：** `PAGES_ANALYSIS.md`

---

## 🚀 下次會話快速啟動命令

```bash
# 1. 打開目標檔案
code frontend/src/pages/Category1/AcetylenePage.tsx

# 2. 打開參考範本
code frontend/src/pages/Category1/WD40Page.tsx

# 3. 打開檢查清單
code recons_doc/MIGRATION_CHECKLIST.md
```

---

## 📚 相關文件索引

### 核心文件
- **MIGRATION_CHECKLIST.md** - 標準遷移流程（必讀）
- **PAGES_ANALYSIS.md** - 14 頁面詳細分析
- **HOOKS.md** - 三個 Hook 的完整文件和範例

### 歷史記錄
- **REFACTORING_LOG.md** - 完整重構日誌
- **REFACTORING_PLAN.md** - 重構計畫和策略
- **WORKFLOW.md** - 系統工作流程說明

---

## 🔥 重要提醒

### 2025-10-03 RefrigerantPage 經驗
1. **✅ Loading 狀態是必須的**：
   - 任何非同步載入都要顯示 Loading 畫面
   - 避免讓用戶看到空白畫面
   - 使用 `if (dataLoading) return <Loader>`

2. **✅ maxFiles 限制要有 UI 反饋**：
   - 達到上限 → 隱藏上傳區（`{!isAtMaxCapacity && <UploadArea>}`）
   - 低於上限 → 顯示上傳區

3. **✅ 檔案顯示要根據數量調整排版**：
   - maxFiles=1：垂直卡片排版（更美觀）
   - maxFiles>1：橫向列表排版（節省空間）

4. **✅ 成功彈窗要統一**：
   - 所有頁面的提交成功彈窗應長得一模一樣
   - 複製 WD40Page 的成功彈窗模式

### 2025-10-02 LPG 頁面經驗
1. **⚠️ LPG 特殊案例**：
   - 不能使用 `useEnergySubmit` Hook
   - 原因：Hook 會覆蓋 `notes` 欄位為空字串
   - LPG 需要 `notes` 儲存單位重量資料
   - 解決：直接調用 `upsertEnergyEntry` API

2. **⚠️ useApprovalStatus 參數錯誤**：
   - 正確：`useApprovalStatus(pageKey, year)`
   - 錯誤：`useApprovalStatus({ currentStatus, entryId })`

3. **⚠️ 檔案上傳後必須 reload**：
   - 上傳完檔案要加 `await reload()`
   - 否則前端看不到新上傳的檔案

4. **⚠️ Clear 函式參數**：
   - 必須傳入 `{ filesToDelete, memoryFilesToClean }`
   - 不能空調用 `clear()`

### 技術問題解決方案（舊問題）
1. **資料庫 RLS 遞迴**：is_admin() 函式已加 `SECURITY DEFINER`
2. **Approved 狀態檔案刪除**：EvidenceUpload 已修正 mode 檢查
3. **Type 錯誤**：統一從 documentHandler 匯入 MemoryFile

### 測試檢查清單
每改一個頁面必須測試：
- [ ] 首次填報 → 提交成功
- [ ] 重新進入頁面 → 載入舊資料
- [ ] 修改後提交 → 更新成功
- [ ] 檔案上傳/刪除 → 即時顯示
- [ ] 清除功能 → 資料清空
- [ ] Approved 狀態 → 唯讀模式

### Never Break Userspace
- ✅ 現有功能不能壞
- ✅ 一次改一個頁面
- ✅ 改完立刻測試
- ✅ 發現問題立即修正

---

## 💡 後續規劃

### 短期目標（本週）
- 套用 Hook 到前 4 個高度適用頁面
- 每改一個就測試一個
- 發現問題即時調整 Hook

### 中期目標（下週）
- 完成所有 8 個高度適用頁面
- 處理 3 個需要調整的頁面
- 撰寫特殊頁面處理策略

### 長期目標（未來）
- 處理 3 個特殊結構頁面
- 建立後端 API（submit-with-files, delete-with-files）
- 進一步優化檔案上傳流程

---

## 📞 問題處理

**如果遇到問題：**
1. 檢查 `REFACTORING_LOG.md` 的「經驗教訓」章節
2. 參考 `HOOKS.md` 的 FAQ 部分
3. 對照 `WD40Page.tsx` 的完成範例
4. 查看 `MIGRATION_CHECKLIST.md` 的常見問題

---

**準備好了嗎？讓我們從 AcetylenePage 開始吧！** 🚀
