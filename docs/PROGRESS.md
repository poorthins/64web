# 重構工作日誌

> 記錄每一頁的進度、遇到的問題、學到的經驗

**開始日期：** 2025-01-18

---

## 📊 進度追蹤

### Type 1：一筆佐證 → 一筆資料（3 頁）

| # | 頁面 | 狀態 | 開始 | 完成 | 耗時 | 備註 |
|---|------|------|------|------|------|------|
| 1 | RefrigerantPage | ✅ | 2025-01-18 | 2025-01-18 | 2h | Pilot 頁面，建立 Type 1 SOP |
| 2 | SF6Page | ✅ | 2025-01-19 | 2025-01-19 | 3h | 修復兩個檔案優先順序 bug |
| 3 | GeneratorTestPage | ✅ | 2025-01-19 | 2025-01-19 | 1h | 應用 8 個 bug 預防措施，Type 1 全部完成 |

### Type 2：一筆佐證 → 多筆資料（5 頁）

| # | 頁面 | 狀態 | 開始 | 完成 | 耗時 | 備註 |
|---|------|------|------|------|------|------|
| 4 | DieselPage | ✅ | 2025-01-20 | 2025-01-20 | 3h | Pilot 頁面，建立 Type 2 SOP |
| 5 | GasolinePage | ✅ | 2025-01-20 | 2025-01-20 | 45min | 應用 Type 2 SOP |
| 6 | DieselStationarySourcesPage | ✅ | 2025-01-20 | 2025-01-21 | 3h | 固定源，應用通知規範 |
| 7 | SepticTankPage | ✅ | 2025-01-20 | 2025-01-21 | 2h | 設施群組，應用通知規範 |
| 8 | UreaPage | ✅ | 2025-01-20 | 2025-01-21 | 2h | 有 SDS 管理，應用通知規範 |

### Type 3：先設定規格 → 一筆佐證 → 多筆使用記錄（5 頁）

| # | 頁面 | 狀態 | 開始 | 完成 | 耗時 | 備註 |
|---|------|------|------|------|------|------|
| 9 | WD40Page | ✅ | 2025-01-20 | 2025-01-25 | 7h | Pilot 1: useType3Helpers; Pilot 2: 新架構 (Hook+Shell) 32 行 |
| 10 | LPGPage | ✅ | 2025-01-24 | 2025-01-25 | 3h | Pilot 2 完成: 750→31 行 (95.9%), Gate 通過 |
| 11 | AcetylenePage | ✅ | 2025-01-25 | 2025-01-25 | 10min | 新架構: 753→31 行 (95.9%) |
| 12 | WeldingRodPage | ✅ | 2025-01-25 | 2025-01-25 | 15min | 新架構: 802→44 行 (94.5%), weight mode |
| 13 | FireExtinguisherPage | 🔜 | - | - | - | 檢修記錄（最後一個 Type 3）|

### Type 4：先設定電錶 → 一筆佐證 → 一個帳單（2 頁）

| # | 頁面 | 狀態 | 開始 | 完成 | 耗時 | 備註 |
|---|------|------|------|------|------|------|
| 14 | NaturalGasPage | 🔜 | - | - | - | 瓦斯錶 + 帳單 |
| 15 | ElectricityBillPage | 🔜 | - | - | - | 最複雜（多電錶） |

### Type 5：Excel 上傳下載區（1 頁）

| # | 頁面 | 狀態 | 開始 | 完成 | 耗時 | 備註 |
|---|------|------|------|------|------|------|
| 16 | CommuteePage | 🔜 | - | - | - | 最簡單（30 分鐘） |

**狀態圖例：** 🔜 待開始 | ⏳ 進行中 | ✅ 完成

---

## 💡 心得累積

### ✅ 做對的事

#### 2025-01-18 - RefrigerantPage 重構成功，建立 Type 1 SOP
> 第一個 Type 1 頁面重構完成！移除 useMultiRecordSubmit (204行) 和 useRecordFileMapping (352行)，改用直接 API 呼叫。程式碼減少 ~650 行 (92.2%)，提交邏輯從雙函數 (handleSubmit + handleSave) 簡化為單一 submitData(isDraft) 函數。所有自動化測試通過 (4/4)。

#### 2025-01-18 - 統一提交函數消除重複程式碼
> 發現 handleSubmit 和 handleSave 有 90% 重複程式碼，只差在 status: 'draft' vs 'submitted'。建立統一的 submitData(isDraft: boolean) 函數後，兩個 handler 都變成一行呼叫。這是典型的 Duplicated Code smell 消除。

#### 2025-01-18 - 直接 API 呼叫比 hooks 更簡單
> 用 entryAPI.submitEnergyEntry() 和 fileAPI.uploadEvidenceFile() 取代複雜的 hooks，程式碼流程變得超級清晰：1) 組資料 → 2) 呼叫 API → 3) 處理回應 → 4) 更新狀態。不需要中間層的狀態管理。

#### 2025-01-19 - SF6Page 重構完成，移除 useRecordFileMapping
> 第二個 Type 1 頁面重構完成！複製 RefrigerantPage 的 submitData 模式，移除 useRecordFileMapping hook。修復兩個檔案優先順序相關的 bug（變更儲存失效、編輯載入舊佐證），Type 1 的重構 SOP 已經穩定可用。

#### 2025-01-19 - GeneratorTestPage 重構完成，應用全部 8 個 bug 預防措施
> 第三個 Type 1 頁面重構完成！**Type 1 批次全部完成（3/3）**。程式碼從 730 行減少到 424 行（42% 縮減），移除 useMultiRecordSubmit、useRecordFileMapping、useSubmitGuard 等舊 hooks，改用 submitEnergyEntry + uploadEvidenceFile 直接 API 呼叫。應用全部 8 個 PROGRESS.md 記錄的 bug 預防措施：named import、必填欄位、payload 不是 extraPayload、status 用 saved/submitted、recordId 設定、審核鎖定、file.size 判斷、customNotifications。TypeScript 編譯全部通過。

#### 2025-01-20 - GasolinePage 重構完成（Type 2），應用完整 Type 2 SOP
> 第二個 Type 2 頁面重構完成！**45 分鐘完成**（基於 DieselPage 的 Type 2 SOP）。移除 useMultiRecordSubmit (204行) 和 useRecordFileMapping (352行)，建立 submitData 統一提交函數 + 6 個輔助函數（buildGroupsMap, uploadGroupFiles, deleteMarkedFiles, collectAdminFilesToUpload, syncEditingGroupChanges, deleteMarkedFilesAsAdmin）。**程式碼減少約 590 行 (87%)**。關鍵修復：1) 檔案載入邏輯改用 `split(',').includes()` 過濾 record_id（Type 2 特有），2) 移除刪除確認提示（UI/UX 標準），3) reviewSection 不傳 onShowSuccess/onShowError。品質檢查全部通過（P0: 無型別重複, P1: 函數都小於 50 行, P2: 無 console.log）。TypeScript 編譯零錯誤。

#### 2025-11-21 - GasolinePage 修復管理員模式檔案刪除時序錯誤（坑 #5）
> 發現 GasolinePage 管理員儲存模式缺少 `deleteMarkedFiles()` 呼叫，導致管理員編輯佐證後，刪除的舊檔案會在 reload 時重新出現。修復方式：在 `handleSave` 管理員模式的 `await reload()` 前加上 `await deleteMarkedFiles()`（Line 492）。這是 type2-sop.md 坑 #5「檔案刪除時序錯誤」的標準修復，遵循「Delete before reload」原則。修復後 TypeScript 編譯零錯誤（GasolinePage 無編譯錯誤）。

#### 2025-11-21 - GasolinePage 修復儲存按鈕無通知問題（參照 UreaPage 模式）
> 使用者回報點「儲存」按鈕沒有任何反應（無通知彈窗）。診斷發現 GasolinePage 設置了 `customNotifications: true` 但 Toast 組件沒有正常工作。參考 UreaPage 的實現，UreaPage **不使用** `customNotifications: true`，而是讓 SharedPageLayout 通過 `notificationState` 自動顯示 SuccessModal。修復：1) 移除 `bottomActionBar` 的 `customNotifications: true`（Line 638），2) 移除 Toast 組件渲染（Line 706-720），3) 移除 Toast import（Line 30）。修復後 SharedPageLayout 會自動顯示通知：暫存 → 藍色 SuccessModal「暫存成功」，提交 → 綠色 SuccessModal「提交成功」，錯誤 → 錯誤訊息。行為與 UreaPage 完全一致。TypeScript 編譯零錯誤。**GasolinePage 現在完全符合 Type 2 標準模式。**

#### 2025-11-21 - GasolinePage 修復管理員無法刪除佐證檔案問題（坑 #3 標準修復 + 關鍵連接點補完）
> **第一階段修復（不完整）：** 管理員回報刪除使用者的舊佐證並上傳新佐證後儲存，結果新舊佐證都出現在頁面中（舊佐證沒有被刪除）。初步診斷：管理員模式的 `handleSave` 使用了 `deleteMarkedFiles()`（呼叫 `deleteEvidence`），但管理員刪除檔案必須使用 `adminDeleteEvidence` 才有權限。修復：1) import 加入 `adminDeleteEvidence`（Line 17），2) 新增 `deleteMarkedFilesAsAdmin()` 函數使用 `adminDeleteEvidence`（Line 363-375），3) 管理員模式改為呼叫 `deleteMarkedFilesAsAdmin()`（Line 506）。

> **問題持續 → 第二階段修復（完整）：** 使用者回報問題依然存在。深入對比 UreaPage 發現：**GasolinePage 缺少關鍵連接點**。管理員點刪除按鈕時，檔案 ID 沒有被記錄到 `filesToDelete` 數組，導致 `deleteMarkedFilesAsAdmin()` 雖然被呼叫但 `filesToDelete` 是空的。根本原因：`MobileEnergyUsageSection` 缺少 `onDeleteEvidence` prop（對比 UreaPage Line 813）。修復：在 Line 689 加上 `onDeleteEvidence={handleDeleteEvidence}`，完整連接刪除鏈路：點刪除 → 記錄 ID → 儲存時刪除。這是 type2-sop.md 坑 #3「使用者無法刪除管理員上傳的檔案」的對稱問題：**管理員也無法用一般 API 刪除使用者的檔案**，必須使用 admin 專用 API + **正確連接刪除回調**。TypeScript 編譯零錯誤。

#### 2025-01-23 - Type 2 優化：抽取 6 個輔助函數到 useType2Helpers
> 發現 5 個 Type 2 頁面有 60% 重複代碼（~2,100 行），其中 6 個輔助函數（buildGroupsMap, uploadGroupFiles, deleteMarkedFiles, collectAdminFilesToUpload, deleteMarkedFilesAsAdmin, syncEditingGroupChanges）完全一樣。抽取到 `useType2Helpers<T>` 泛型 hook 後，**減少 365 行重複代碼**（每頁約 73 行）。修改內容：1) 建立 `frontend/src/hooks/useType2Helpers.ts` (173 lines)，2) 更新 5 個頁面使用 hook：DieselPage, UreaPage, GasolinePage, DieselStationarySourcesPage, SepticTankPage，3) 函數改為接受參數（filesToDelete, setFilesToDelete, currentEditingGroup, savedGroups, setSavedGroups）提升可重用性，4) syncEditingGroupChanges 接受泛型結構（支援 SepticTankPage 的 SepticTankCurrentEditingGroup）。TypeScript 編譯零錯誤。**5 個 Type 2 頁面重構完成，總計減少 ~3,000 行代碼。**

#### 2025-01-23 - 扁平化目錄結構：shared/mobile/ → common/
> **問題：** Category1 有 3 個 components 資料夾（`components/` 舊架構 + `shared/mobile/components/` 新架構），路徑深度 4 層（Category1 → shared → mobile → components），命名誤導（"mobile" 實際上不是 mobile-specific）。**Linus 判斷：違反 "good taste"，不必要的複雜性。**
>
> **重構內容：** 1) 建立 `Category1/common/` 扁平目錄（2 層路徑），2) 移動 12 個檔案（8 components + 4 utils/types/config），3) 更新 10 個檔案的 import 路徑（9 pages + useType2Helpers.ts），4) 清理空目錄（shared/mobile/, shared/），5) 修復內部相對路徑（`../../../../../` → `../../../../`, `../mobileEnergy` → `./mobileEnergy`）。
>
> **結果：** 路徑深度減少 2 層（`./shared/mobile/components/XXX` → `./common/XXX`），消除誤導性命名，統一組件位置。TypeScript 編譯零錯誤（針對重構的 9 個頁面 + useType2Helpers.ts）。**15 分鐘完成，零破壞性。**符合 Linus 原則：1) 消除特殊情況（只保留一個 components 位置），2) 簡化資料結構（扁平化），3) 實用主義（3 小時換回未來無數個 5 秒鐘的思考時間）。

#### 2025-01-24 - WD40Page 重構完成，建立 useType3Helpers 與 Type 3 SOP
> **Type 3 Pilot 頁面重構完成！** 建立 `useType3Helpers` hook（9 個輔助函數，繼承 Type 2 的 6 個 + 新增 3 個 Type 3 特有函數）+ 完整的 Type 3 SOP（7 題問卷 + 6 步驟指南）。重構內容：1) 建立 `useWD40SpecManager` 管理規格 CRUD（9 個測試），2) 建立 `useType3Helpers<TSpec, TUsage>` 泛型 hook（11 個測試），3) 重構 WD40Page 從 780 行減少到 753 行（-3.5%），移除內部重複邏輯，4) 建立 `docs/type3-sop.md`（776 行，包含新增指南 + 重構 SOP）。**20 個測試全部通過（20/20）**。關鍵設計：Type 3 = Type 2 + 規格管理（Dual List），規格佐證用單一 record_id，使用記錄佐證用 comma-separated record_ids。TypeScript 編譯零錯誤。

#### 2025-01-25 - Type 3 批次完成：Hook + Shell 架構，3,058 行 → 1,093 行（64.3% 減少）
> **🎯 Type 3 重構全部完成！4 個頁面從 3,058 行減少到 1,093 行（64.3% reduction）。** 建立全新架構：`useMobileType3Page` Hook (673 行) + `MobileType3PageShell` Component (283 行)，消除 4 頁間的所有重複邏輯。每個頁面主檔縮減到 31-44 行（95%+ reduction）：LPGPage 750→31、WD40Page 753→31、AcetylenePage 753→31、WeldingRodPage 802→44（含 parseSpecName）。
>
> **新架構特點：**
> 1. **Hook 返回 ~50 個扁平欄位** — 分 7 大類（Config, Specs, Groups, Submit, Review, UI, Notifications），使用 `{...page}` 扁平展開（避免嵌套 props）
> 2. **Shell 接受 3 個動態組件** — `SpecInputFields`, `SpecListSection`, `UsageInputFields`（每個頁面實作不同的 UI）
> 3. **支援雙模式** — `mode: 'quantity'`（直接加總）vs `mode: 'weight'`（quantity × unitWeight，WeldingRod 用）
> 4. **泛型設計** — `MobileType3PageOptions<TSpec>`，支援不同規格結構（LPGSpec, WD40Spec, WeldingRodSpec）
>
> **重構流程：**
> 1. 建立 Hook + Shell（809 行，45 分鐘）
> 2. 重構 LPGPage 為 Pilot（750→31 行，15 分鐘）
> 3. Gate 測試（TypeScript 編譯 + 手動測試，10 分鐘）
> 4. 批次重構 3 頁（WD40, Acetylene, WeldingRod，25 分鐘）
> 5. 更新 Type 3 SOP（694 行，反映新架構，20 分鐘）
>
> **品質驗證：** TypeScript 編譯 4 頁零錯誤、LPGPage 手動測試全部通過（新增規格 → 使用記錄 → 上傳檔案 → 提交）。**總耗時：115 分鐘，平均每頁 29 分鐘。** 下一步：FireExtinguisherPage（最後一個 Type 3）。

#### 2025-01-24 - LPGPage 重構完成，應用 Type 3 SOP（2 小時）
> **第二個 Type 3 頁面重構完成！** 基於 WD40Page 的 Type 3 SOP，重構 LPGPage 從 776 行減少到 749 行（-3.5%）。複製使用 `useType3Helpers` + `useLPGSpecManager`（9 個測試，繼承 useWD40SpecManager 架構）。與 WD40Page 的差異僅在 UI 設計（LPG 用綠色主題 + 特殊容器設計，WD40 用青色主題 + 簡單灰色容器），核心邏輯完全一致。**Linus 的判斷：不做模板化**，因為 95% 代碼相似度是表象，真正的差異在 UI 設計（應該不同），強行統一會帶來 20+ props 的怪獸組件，違反「Good Taste」原則。當前架構已經達標：useType3Helpers 抽象了 9 個輔助函數，新增頁面只需 15 分鐘（複製 + 全局替換 + 測試）。**Type 3 批次：2/5 完成。**TypeScript 編譯零錯誤。

#### 2025-11-25 - AcetylenePage 重構完成，應用 Type 3 SOP（1 小時）
> **第三個 Type 3 頁面重構完成！** 基於 Type 3 SOP，重構 AcetylenePage 使用 `useType3Helpers` + `useAcetyleneSpecManager`。品項格式：`品名_單位重量(KG/瓶)`（例如：乙炔_20KG）。UI 優化：1) 說明文字換行改進（`mobileEnergyConfig.ts:161`），在「讓一份佐證」前換行提升可讀性，2) 綠色主題 (#9BB944) 統一應用。複用 Type 3 架構：規格設定 → 使用記錄 → 提交，與 WD40/LPG 邏輯完全一致。**Type 3 批次：3/5 完成。** TypeScript 編譯零錯誤。

#### 2025-11-25 - WeldingRodPage 重構完成 + 修復關鍵 extraPayload Bug（3 小時）
> **第四個 Type 3 頁面重構完成！** 焊條頁面採用複雜品項格式：`型號_線徑(mm)_含碳率(%)_單位重量(KG)`。重構內容：1) 建立 `useWeldingRodSpecManager`（9 個測試），2) 實作 `parseSpecName()` 解析 4 段式格式（目前簡化為 2 段式：品名_單位重量），3) UI 設計：含碳率佐證文件說明框（#95D0A7 綠色主題 + 警告三角形 icon + 混合字重排版），4) 建立 `WeldingRodSpecInputFields`、`WeldingRodSpecListSection`、`WeldingRodUsageInputFields` 三個組件。
>
> **關鍵 Bug 修復（影響所有 Type 3 頁面）：** 提交時遇到 `PGRST204: Could not find the 'extraPayload' column`。**根本原因**：資料庫 `energy_entries` 表只有 `payload` 欄位，沒有 `extraPayload`（DATABASE.md:192 確認）。**修復方案**：修改 `backend/src/services/entry_service.py:124-126`，將 `extraPayload` 合併到 `payload` 中（`final_payload.update(extraPayload)`），而非嘗試插入不存在的欄位。同步修改 `update_energy_entry()` 的 Line 245-252。**測試覆蓋**：新增 `test_extraPayload_merged_into_payload` 測試（Line 144-184），**16 個後端測試全部通過（16/16）**，包含新增的 extraPayload 合併邏輯測試。這個修復讓所有 Type 3 頁面（WD40, LPG, Acetylene, WeldingRod, FireExtinguisher）可以正常提交資料。**Type 3 批次：4/5 完成。** TypeScript 編譯零錯誤。

---

### ⚠️ 踩過的坑

#### 2025-11-18 - RefrigerantPage 連續 6 個 Bug 才能儲存成功
**情況：** 重構 RefrigerantPage 時遇到 6 個連續錯誤，每個都必須修復才能繼續

**Bug 清單：**
1. **Import 方式錯誤** - 用了 namespace import 而非 named import
2. **缺少必填欄位** - Type 1 頁面需要提供 dummy `unit` 和 `monthly`
3. **extraPayload 欄位不存在** - 資料庫沒這欄位但後端無條件加入
4. **Status 值不匹配** - 前端用 'saved'，後端 schema 只接受 'draft'
5. **Windows emoji 編碼錯誤** - cp950 無法處理 emoji，debug log 要改純文字
6. **重複儲存失敗** - 用 insert 而非 upsert，第二次儲存會違反 unique constraint

**最關鍵修復：**
```python
# backend/src/services/entry_service.py:145-148
# ❌ insert 在已存在時會報錯
result = supabase.table('energy_entries').insert(entry_data).execute()

# ✅ upsert 自動判斷 insert 或 update
result = supabase.table('energy_entries').upsert(
    entry_data,
    on_conflict='owner_id,category,period_year'
).execute()
```

**學到的教訓：**
- 「儲存」操作應該用 **upsert** 而非 insert，才能重複儲存
- Schema 驗證要配合**資料庫實際值**，不是「應該是什麼」
- Optional 欄位要檢查 `if value is not None` 才加入 SQL data
- Windows 環境的 Python console 不支援 emoji

**額外發現：**
- 雙重通知問題：頁面自己 `setSubmitSuccess` + SharedPageLayout 自動顯示
  - 解法：設置 `customNotifications: true`
- handleSubmitSuccess 誤觸發：暫存時也會把狀態改成 `submitted`
  - 解法：只在 `!isDraft` 時執行

**相關檔案：**
- `backend/src/services/entry_service.py` (upsert 修復)
- `backend/src/api/schemas/submission.py` (status 驗證)
- `backend/src/api/middleware/validation.py` (emoji 移除)
- `frontend/src/pages/Category1/RefrigerantPage.tsx` (import + dummy 值)
- `frontend/src/api/v2/entryAPI.ts` (status 型別)

---

#### 2025-11-18 - 管理員審核模式檔案上傳缺少 record_id
**情況：** 管理員編輯冷媒設備並上傳新照片後，reload 發現照片消失，且資料庫有大量 `record_id: null` 的檔案

**問題根源：**
檔案上傳時沒有設定 `record_id`，導致無法與設備關聯

**診斷過程：**
1. 初步現象：編輯 1 個設備，卻刪除了 3 個檔案
2. 加入 debug log 發現：`savedDevices` 有 2 個設備，`loadedFiles` 有 7 個檔案
3. 展開 `loadedFiles` 發現：7 個檔案中只有 2 個有 `record_id`，其餘 5 個都是 `null`
4. 追蹤上傳邏輯：`useAdminSave` 只傳 `recordIndex`，沒傳 `recordId`
5. 檢查 `files.ts:441`：`record_id: meta.recordId ?? null` → 因為沒傳所以是 `null`

**關鍵修復：**
```typescript
// frontend/src/pages/Category1/RefrigerantPage.tsx:372-379
record.memoryFiles.forEach(mf => {
  filesToUpload.push({
    file: mf.file,
    metadata: {
      recordIndex: index,
      fileType: 'other' as const,
      recordId: record.id  // ⭐ 關鍵：設定 record_id
    }
  })
})
```

**型別定義也要更新：**
```typescript
// RefrigerantPage.tsx:334-341
const filesToUpload: Array<{
  file: File
  metadata: {
    recordIndex: number
    fileType: 'usage_evidence' | 'msds' | 'other'
    recordId?: string  // ⭐ 新增此欄位
  }
}> = []
```

**學到的教訓：**
- Type 1 頁面（一個 record → 一個檔案）必須設定 `recordId`，才能正確關聯
- 檔案刪除邏輯要用 `record_id` 比對：`loadedFiles.filter(f => f.record_id === record.id)`
- Debug 時要展開 array 看完整資料，不能只看 count
- `record_id: null` 的檔案是孤兒檔案，無法被任何設備關聯

**相關檔案：**
- `frontend/src/pages/Category1/RefrigerantPage.tsx` (handleSave 增加 recordId)
- `frontend/src/api/files.ts:441` (uploadEvidence 使用 meta.recordId)
- `frontend/src/hooks/useAdminSave.ts` (傳遞 metadata)

**額外優化：**
- 移除 `window.confirm()`，管理員點「儲存編輯」直接儲存
- 清理所有 debug console.log

---

#### 2025-11-18 - 審核通過後頁面底部貼合邊界
**情況：** 管理員審核通過後，使用者回到冷媒頁面時，資料列表直接貼合視窗底部邊界，沒有留白空間。

**問題根源：**
審核通過後，`approvalStatus.isApproved = true`，導致 `bottomActionBar.show` 計算結果為 `false`（沒有儲存/提交按鈕），SharedPageLayout 的 `<main>` 元素 `paddingBottom` 從 `'120px'` 變成 `'0px'`，整個內容區域貼到視窗底部。

**診斷過程：**
1. 誤判 1：以為是 SharedPageLayout 底部 action bar 要調整 → 用戶拒絕
2. 誤判 2：修改 RefrigerantListSection 的 `marginBottom: '120px'` → 用戶說沒效果
3. 誤判 3：以為在 UserDetail 管理員頁面 → 用戶澄清「現在已經離開管理員介面了，現在是使用者回到冷媒那頁了」
4. 找到根本原因：SharedPageLayout line 422 的 `paddingBottom` 根據 `bottomActionBar.show` 動態變化

**RefrigerantPage 的 bottomActionBar.show 邏輯：**
```typescript
// frontend/src/pages/Category1/RefrigerantPage.tsx:447
show: !isReadOnly && !approvalStatus.isApproved && !isReviewMode
```
→ 審核通過後 `approvalStatus.isApproved = true`，所以 `show = false`

**SharedPageLayout 的 paddingBottom 邏輯：**
```typescript
// frontend/src/layouts/SharedPageLayout.tsx:422
paddingBottom: (bottomActionBar && bottomActionBar.show !== false) ? '120px' : '0'
```
→ `show = false` 時，`paddingBottom = '0'` ← 問題所在

**關鍵修復：**
```typescript
// frontend/src/layouts/SharedPageLayout.tsx:422
// ❌ 沒有 bottom bar 時完全沒有底部空間
paddingBottom: (bottomActionBar && bottomActionBar.show !== false) ? '120px' : '0'

// ✅ 沒有 bottom bar 時仍保留 40px 固定空間
paddingBottom: (bottomActionBar && bottomActionBar.show !== false) ? '120px' : '40px'
```

**學到的教訓：**
- 佈局組件要為「沒有底部操作欄」的情況保留合理的底部空間
- 不能假設所有頁面都有固定的底部按鈕
- `paddingBottom: '0'` 會讓內容直接貼到視窗邊界，體驗很差
- 診斷 UI 問題時要先確認「使用者在哪個頁面、什麼模式」

**相關檔案：**
- `frontend/src/layouts/SharedPageLayout.tsx:422` (修復 paddingBottom)
- `frontend/src/pages/Category1/RefrigerantPage.tsx:447` (bottomActionBar.show 邏輯)

---

#### 2025-01-18 - 管理員審核後使用者看不到上傳的檔案
**情況：** 管理員在審核模式下幫使用者上傳檔案，管理員自己能看到檔案，但使用者回到自己的頁面後看不到檔案。Console 錯誤：`Storage error: Object not found`

**問題根源：**
兩層 RLS Policy 都有問題：

1. **`entry_files` 表的 RLS Policy**：只允許查詢 `owner_id = auth.uid()` 的檔案記錄
   - 管理員上傳時 `owner_id` 是管理員 ID
   - 使用者查詢時被 RLS 擋住

2. **Storage `evidence` bucket 的 RLS Policy**（關鍵）：只允許讀取 `(foldername[1] = auth.uid())` 的檔案
   - 檔案路徑：`{管理員ID}/64/refrigerant/xxx.png`
   - 使用者 ID 不匹配管理員 ID → 被擋住

**診斷過程：**
1. 檢查資料庫記錄 → ✅ 8 筆檔案存在
2. 檢查 Storage 實體檔案 → ✅ 檔案存在（管理員能看到）
3. 檢查 `entry_files` 表 RLS Policy → ❌ 使用者無法查詢管理員上傳的記錄
4. 檢查 Storage bucket RLS Policy → ❌ 使用者無法讀取管理員資料夾的檔案（根本原因）

**關鍵修復 1：修正 `entry_files` 表 RLS Policy**
```sql
DROP POLICY IF EXISTS "files_user_access" ON entry_files;

CREATE POLICY "files_user_access"
ON entry_files
FOR ALL
USING (
  is_admin()
  OR (auth.uid() = owner_id)
  OR (
    EXISTS (
      SELECT 1 FROM energy_entries
      WHERE energy_entries.id = entry_files.entry_id
      AND energy_entries.owner_id = auth.uid()
    )
  )
);
```

**關鍵修復 2：修正 Storage bucket RLS Policy**
```sql
DROP POLICY IF EXISTS "evidence_read_own_prefix" ON storage.objects;

CREATE POLICY "evidence_read_own_or_entry_files"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'evidence'
  AND (
    auth.uid() IN (SELECT id FROM profiles WHERE role = 'admin')
    OR (storage.foldername(name))[1] = auth.uid()::text
    OR EXISTS (
      SELECT 1 FROM entry_files ef
      JOIN energy_entries ee ON ee.id = ef.entry_id
      WHERE ef.file_path = name
      AND ee.owner_id = auth.uid()
    )
  )
);
```

**學到的教訓：**
- **資料所有權檢查原則**：檢查「誰擁有這個資料」，而不是「誰上傳了這個檔案」
- **兩層 RLS 都要檢查**：檔案系統需要同時檢查資料庫 RLS 和 Storage RLS，缺一不可
- **管理員代理操作支援**：Policy 設計必須支援管理員幫使用者操作資料的場景
- **除錯順序**：資料存在 → 資料庫 RLS → Storage RLS → 檔案路徑結構

**相關檔案：**
- Supabase SQL Editor (RLS Policy 修正)
- 影響範圍：所有能源頁面的檔案讀取功能

---

#### 2025-01-18 - Linus 式程式碼清理 + 垃圾檔案刪除
**情況：** RefrigerantPage 重構完成後，進行 Linus 標準的程式碼品質檢查和垃圾檔案清理

**清理項目（16 個 code smells）：**
1. ❌ 刪除 2 個註解掉的 import
2. ❌ 刪除 4 個無用註解（emoji、redundant）
3. ❌ 刪除 3 個 console.log/warn/error
4. ❌ 刪除 3 個空 callback（useFrontendStatus）
5. ❌ 刪除 4 個 emoji/star 註解
6. ❌ 修復 1 個 race condition（setTimeout 100ms）

**Linus 原則應用：**
- **"Good Taste"** - 移除 setTimeout race condition，改用直接呼叫
- **"簡潔執念"** - 刪除所有不必要的註解和 console
- **"實用主義"** - 只保留真正有用的程式碼

**清理前後對比：**
```typescript
// ❌ 清理前 - setTimeout race condition
await reload()
setTimeout(() => reloadApprovalStatus(), 100)

// ✅ 清理後 - 直接呼叫
await reload()
reloadApprovalStatus()
```

**垃圾檔案刪除：**
- ❌ `test_refrigerant_api.py` (291 行) - RefrigerantPage 驗證腳本
- ❌ `backend/test_carbon_api_manual.py` (269 行) - Carbon API 手動測試

**舊 Hooks 檔案狀態（不能刪）：**
- `useMultiRecordSubmit.ts` - 16 個頁面仍在使用
- `useRecordFileMapping.ts` - 18 個頁面仍在使用
- 需等全部 16 頁重構完才能刪除

**學到的教訓：**
- **重構完立刻清理** - 不要等垃圾累積
- **主動發現臨時檔案** - 手動測試腳本、驗證腦本都該刪
- **真正的測試在 backend/tests/** - 手動腳本不是測試
- **檢查依賴再刪除** - 舊 hooks 還有 15 頁在用，不能刪

**相關檔案：**
- `frontend/src/pages/Category1/RefrigerantPage.tsx` (全檔案清理)

---

#### 2025-01-18 - RefrigerantPage 刪除 4 個垃圾 hooks
**情況：** RefrigerantPage 測試通過後，進行第二輪 Linus 式清理，刪除 4 個「假抽象」hooks

**刪除的 4 個垃圾 hooks：**
1. ✅ `useSubmitGuard` - 只是包裝 `useState(false)` + try/finally
2. ✅ `useRefrigerantDeviceManager` - 只是包裝 3 個 useState + 4 個 inline 函數
3. ✅ `useEnergyPageNotifications` - 只是包裝 3 個 useState
4. ✅ `useEditPermissions` - 宣告了完全沒用到

**替換方案：**
```typescript
// ❌ 刪除前 - 11 個 hooks
const { executeSubmit, submitting } = useSubmitGuard()
const { savedDevices, updateCurrentDevice, saveCurrentDevice, ... } = useRefrigerantDeviceManager()
const { error, success, setError, setSuccess, ... } = useEnergyPageNotifications()
const editPermissions = useEditPermissions(currentStatus, isReadOnly, role)

// ✅ 刪除後 - 7 個 hooks + 簡單的 useState
const [submitting, setSubmitting] = useState(false)
const [savedDevices, setSavedDevices] = useState<RefrigerantDevice[]>([])
const [currentEditingDevice, setCurrentEditingDevice] = useState(createEmptyDevice())
const [editingDeviceId, setEditingDeviceId] = useState<string | null>(null)
const [localError, setLocalError] = useState<string | null>(null)
const [localSuccess, setLocalSuccess] = useState<string | null>(null)
const [showClearConfirmModal, setShowClearConfirmModal] = useState(false)
```

**刪除的垃圾檔案：**
- ✅ `useEnergyPageNotifications.ts` - 完全沒人用
- ✅ `useRefrigerantDeviceManager.ts` - 只有 RefrigerantPage 用，已內聯
- ⏸️ `useSubmitGuard.ts` - 14 個頁面還在用，等全部重構完再刪
- ⏸️ `useEditPermissions.ts` - 15 個頁面還在用，等全部重構完再刪

**型別定義搬移：**
```typescript
// ❌ 刪除前 - 型別定義在 hook 檔案
import { RefrigerantDevice } from '../hooks/useRefrigerantDeviceManager'

// ✅ 刪除後 - 型別定義在主頁面，export 給組件用
// RefrigerantPage.tsx
export interface RefrigerantDevice { ... }

// RefrigerantInputFields.tsx
import type { RefrigerantDevice } from '../RefrigerantPage'
```

**Linus 原則應用：**
- **"Good Taste"** - 消除「為了抽象而抽象」的假 hooks
- **"簡潔執念"** - 10 行以下的 hook 不是抽象，是垃圾
- **"實用主義"** - useState 就夠了，不需要包一層

**學到的教訓：**
- **假抽象判斷標準**：如果 hook 只是包裝 useState，沒有複雜邏輯，就是垃圾
- **真正的抽象**：`useFrontendStatus`、`useApprovalStatus` 這些跨頁面共用、有複雜狀態管理的才是真抽象
- **型別定義位置**：業務型別應該定義在主頁面，export 給組件用，不要藏在 hook 裡
- **刪除順序**：先刪完全沒人用的 → 再刪只有一頁用的 → 最後刪多頁共用的

**相關檔案：**
- `frontend/src/pages/Category1/RefrigerantPage.tsx` (inline 4 個 hooks)
- `frontend/src/pages/Category1/components/RefrigerantInputFields.tsx` (更新 import)
- `frontend/src/pages/Category1/components/RefrigerantListSection.tsx` (更新 import)

---

#### 2025-01-18 - SF6Page 修復 SuccessModal TypeScript 錯誤
**情況：** SF6Page 出現編譯錯誤，傳了不存在的 `message` prop 給 SuccessModal

**錯誤原因：**
```typescript
// ❌ 錯誤寫法
<SuccessModal
  show={showSuccessModal}
  message={success || ''}  // ← SuccessModal 沒有 message prop
  type={successModalType}
  onClose={() => setShowSuccessModal(false)}
/>
```

**SuccessModal 實際介面：**
```typescript
interface SuccessModalProps {
  show: boolean
  onClose: () => void
  type?: 'save' | 'submit'  // ← 根據 type 自動決定訊息
}
```

**修復方法：**
```typescript
// ✅ 正確寫法
<SuccessModal
  show={showSuccessModal}
  type={successModalType}  // 'save' → 顯示「儲存成功！」, 'submit' → 顯示「提交成功！」
  onClose={() => setShowSuccessModal(false)}
/>
```

**學到的教訓：**
- SuccessModal 不需要傳 `message`，它會根據 `type` 自動顯示對應訊息
- 儲存成功 (`type='save'`) → 顯示藍色圖示 + "儲存成功！"
- 提交成功 (`type='submit'`) → 顯示綠色圖示 + "提交成功！"

**相關檔案：**
- `frontend/src/pages/Category1/SF6Page.tsx` (移除 message prop)
- `frontend/src/components/SuccessModal.tsx` (介面定義)

---

#### 2025-01-18 - 發現 MobileEnergyUsageSection 假抽象問題（待重構）
**情況：** 在重構 SF6Page 時，發現 `MobileEnergyUsageSection` 是一個「假抽象」組件

**問題分析：**
```typescript
// 現在的用法（SF6Page 和其他 5 頁）
<MobileEnergyUsageSection
  // 傳 25+ 個 props
  isReadOnly={isReadOnly}
  submitting={submitting}
  approvalStatus={approvalStatus}
  // ...

  // 最關鍵的問題：要用 callback 包裝組件
  renderInputFields={() => (
    <SF6InputFields {...props} />
  )}
/>

// MobileEnergyUsageSection 做了什麼？
function MobileEnergyUsageSection({ renderInputFields, ... }) {
  return (
    <div className="gray-box">
      <h1>{title}</h1>
      {renderInputFields()}  // ← 只是把你傳的組件渲染出來
      <button>儲存</button>
    </div>
  )
}
```

**為什麼是假抽象？**
1. ❌ 不處理業務邏輯（儲存、上傳、列表都要自己寫）
2. ❌ 不提供共用功能（每個頁面還是要寫一樣的程式碼）
3. ❌ 只做一件事：把你給它的組件包一層 `renderInputFields()` callback，然後原封不動渲染出來
4. ❌ 多了 25+ 個 props 要傳遞
5. ❌ 多了一層 callback 間接層，增加程式碼複雜度

**對比 RefrigerantPage 的做法（正確）：**
```typescript
// RefrigerantPage - 直接渲染，沒有中間人
<SharedPageLayout {...layoutProps}>
  <div className="gray-box">
    <h1>冷媒設備資料</h1>
    <RefrigerantInputFields {...props} />  // ← 直接渲染
  </div>
  <RefrigerantListSection {...props} />
</SharedPageLayout>
```

**影響範圍：**
使用 MobileEnergyUsageSection 的頁面（6 頁）：
1. ⏸️ DieselPage.tsx
2. ⏸️ DieselStationarySourcesPage.tsx
3. ⏸️ GasolinePage.tsx
4. ⏸️ SF6Page.tsx
5. ⏸️ UreaPage.tsx
6. ⏸️ WD40Page.tsx

不使用的頁面（獨立實作）：
- ✅ RefrigerantPage.tsx

**重構計畫：**
- **策略**：重構到哪一頁時再改，不用現在全部改
- **工作量**：每頁約 30 分鐘（刪除 MobileEnergyUsageSection，改成直接渲染）
- **優先級**：等重構到對應頁面時再處理
- **預期效果**：程式碼更清晰、少一層 callback、更容易維護

**Linus 原則：**
> "這不是抽象，這是浪費我時間追 callback 的垃圾包裝紙。" - Linus Torvalds

**相關檔案：**
- `frontend/src/pages/Category1/shared/mobile/components/MobileEnergyUsageSection.tsx` (假抽象組件)
- `frontend/src/pages/Category1/RefrigerantPage.tsx` (正確做法參考)

---

#### 2025-01-19 - SF6Page 變更儲存按鈕失效：file.id 判斷錯誤
**情況：** SF6Page 的「變更儲存」按鈕點擊後佐證資料不會更新，點「暫存」或「送出」後所有檔案都消失。

**問題根源：**
FileDropzone 給所有檔案（包括新上傳的）都自動加上前端 UUID 作為 `id`，導致用 `filter(f => !f.id)` 判斷新檔案時，**所有檔案都被過濾掉**，沒有任何檔案被上傳。

**診斷過程：**
1. 點「變更儲存」後，列表顯示新檔案 → ✅ 前端 state 正確
2. 點「暫存」後，檔案消失 → ❌ 上傳邏輯有問題
3. 加 console.log 追蹤：`newFilesCount: 0` → 沒有檔案被判定為新檔案
4. 展開 `memoryNameplateFiles`：所有檔案都有 `id` 屬性
   - 新上傳的檔案：`id: '018ba543-d724-451b-8987-42105e708f37'`（FileDropzone 生成）
   - 資料庫載入的舊檔案：`id: 'db-file-id-123'`（資料庫 ID）
5. 根本問題：`filter(f => !f.id)` 把所有檔案都過濾掉了

**錯誤邏輯：**
```typescript
// ❌ 所有檔案都有 id，包括新上傳的
const newFiles = device.memoryNameplateFiles.filter(f => !f.id)
// newFiles.length = 0 → 沒有檔案被上傳
```

**關鍵修復：**
```typescript
// ✅ 用 file.size 判斷：新檔案有真實 File 對象，舊檔案是空 File
const newFiles = device.memoryNameplateFiles.filter(f => f.file && f.file.size > 0)
```

**為什麼 file.size 有效：**
- **新上傳的檔案**：`file` 是真實的 File 對象，`file.size > 0` ✅
- **資料庫載入的舊檔案**：`file = new File([], filename)`，`file.size = 0` ❌

**修復位置：**
1. `SF6Page.tsx:264` - submitData 函數的銘牌檔案判斷
2. `SF6Page.tsx:302` - submitData 函數的證明文件判斷
3. `SF6Page.tsx:368` - 管理員模式的銘牌檔案判斷
4. `SF6Page.tsx:392` - 管理員模式的證明文件判斷

**學到的教訓：**
- **不能用 id 判斷新舊檔案** - FileDropzone 會給所有檔案加 ID（包括新上傳的）
- **file.size 是可靠的判斷依據** - 新檔案有內容，舊檔案是空 File 對象
- **診斷檔案問題要展開 array 看完整物件** - 不能只看 count
- **多個地方用同樣邏輯要一起改** - submitData 和管理員模式都要修

**相關檔案：**
- `frontend/src/pages/Category1/SF6Page.tsx:264,302,368,392` (四處修復)
- `frontend/src/components/FileDropzone.tsx` (自動生成 id 的來源)

---

#### 2025-01-19 - SF6Page 編輯設備載入舊佐證：檔案優先順序錯誤
**情況：** 編輯設備並重新上傳新佐證後，點「變更儲存」新佐證會顯示在列表，但再次點編輯時，填寫框裡顯示的是舊佐證而不是新佐證。

**測試流程：**
1. 新增數據資料 → 新增群組 ✅
2. 點編輯 → 刪除佐證 → 重新上傳新佐證 → 點「變更儲存」✅
3. 新佐證出現在資料列表 ✅
4. 再次點編輯 → ❌ 舊佐證出現在填寫框，新佐證出現在列表（應該要一致）

**問題根源：**
`loadDeviceToEditor` 優先載入**資料庫的舊檔案**，忽略了 `device.memoryNameplateFiles` 中的新檔案。

**錯誤邏輯：**
```typescript
// ❌ 總是先轉換資料庫檔案
const nameplateFilesFromDB = device.nameplateFiles || []
const memoryNameplateFiles = await Promise.all(nameplateFilesFromDB.map(...))

// 最後才檢查記憶體檔案（但已經被覆蓋了）
const memoryFile1 = memoryNameplateFiles.length > 0
  ? memoryNameplateFiles
  : (device.memoryNameplateFiles || [])
```

**關鍵修復：**
```typescript
// ✅ 優先使用記憶體檔案（新上傳的），沒有才轉換資料庫檔案（舊的）
let memoryFile1: MemoryFile[] = []

if (device.memoryNameplateFiles && device.memoryNameplateFiles.length > 0) {
  // 有記憶體檔案，直接用
  memoryFile1 = device.memoryNameplateFiles
} else if (device.nameplateFiles && device.nameplateFiles.length > 0) {
  // 沒有記憶體檔案，轉換資料庫檔案
  memoryFile1 = await Promise.all(device.nameplateFiles.map(...))
}
```

**為什麼要這樣：**
- **記憶體檔案** = 使用者剛上傳的新檔案（未存資料庫）→ 優先顯示 ✅
- **資料庫檔案** = 已提交的舊檔案 → 只在沒有新檔案時才用 ✅
- 與 `SF6ListSection` 的顯示邏輯完全一致

**修復位置：**
- `frontend/src/pages/Category1/hooks/useSF6DeviceManager.ts:163-219`

**學到的教訓：**
- **前端 state 有兩份檔案來源**：記憶體（新）和資料庫（舊）
- **顯示和編輯必須用同樣的優先順序** - 否則會出現「看到的」和「編輯的」不一致
- **記憶體檔案永遠優先** - 這是使用者最新的操作意圖

**相關檔案：**
- `frontend/src/pages/Category1/hooks/useSF6DeviceManager.ts:163-219` (修復)
- `frontend/src/pages/Category1/components/SF6ListSection.tsx:103-110` (參考邏輯)

---

#### 2025-01-19 - GeneratorTestPage 管理員編輯佐證後變回舊檔案
**情況：** 管理員在審核模式下編輯 GeneratorTestPage 的佐證資料，「變更儲存」按鈕顯示正確的新佐證，但按「儲存編輯」按鈕後，佐證就變回舊的了。一般使用者沒有這個問題。

**測試流程：**
1. 管理員進入審核模式，編輯發電機測試記錄 ✅
2. 刪除舊佐證，上傳新佐證 ✅
3. 點「變更儲存」→ 新佐證顯示在列表 ✅
4. 點「儲存編輯」（ReviewSection 的儲存按鈕）→ ❌ 佐證變回舊的

**問題根源：**
1. **缺少管理員審核模式的專屬邏輯**：`handleSave` 沒有檢查 `isReviewMode`，導致管理員儲存時走一般使用者的 `submitData` 流程
2. **useEffect 保留了 memoryFiles**：檔案分配的 useEffect 在 reload 後保留了 memoryFiles，而不是清空並載入資料庫的新檔案

**錯誤邏輯：**
```typescript
// ❌ GeneratorTestPage:323-324 - 沒有管理員模式檢查
const handleSubmit = () => submitData(false)
const handleSave = () => submitData(true)  // 管理員和一般使用者都走這裡

// ❌ GeneratorTestPage:149-157 - useEffect 保留了 memoryFiles
return {
  ...test,
  memoryFiles: test.memoryFiles || [],  // 保留了！
  evidenceFiles: shouldUseMemoryFiles ? [] : recordFiles
}
```

**關鍵修復：**
```typescript
// ✅ 1. handleSave 添加管理員審核模式的完整邏輯（複製自 SF6Page）
const handleSave = async () => {
  // 管理員審核模式
  if (isReviewMode && reviewEntryId) {
    setSubmitting(true)
    try {
      // 收集要上傳的新檔案和要刪除的舊檔案
      const filesToUpload: Array<...> = []
      const filesToDelete: string[] = []

      savedTests.forEach((test, index) => {
        // 只上傳新檔案（file.size > 0 的才是真的新檔案）
        if (test.memoryFiles && test.memoryFiles.length > 0) {
          const newFiles = test.memoryFiles.filter((mf: MemoryFile) => mf.file && mf.file.size > 0)

          if (newFiles.length > 0) {
            newFiles.forEach((mf: MemoryFile) => {
              filesToUpload.push({
                file: mf.file,
                metadata: { recordIndex: index, fileType: 'other', recordId: test.id }
              })
            })

            // 刪除舊的佐證檔案（從 loadedFiles 找）
            const oldFiles = loadedFiles.filter(f =>
              f.record_id === test.id && f.file_type === 'other' && f.page_key === pageKey
            )
            oldFiles.forEach(f => filesToDelete.push(f.id))
          }
        }
      })

      // 先刪除舊檔案
      if (filesToDelete.length > 0) {
        for (const fileId of filesToDelete) {
          try {
            await adminDeleteEvidence(fileId)
          } catch {
            // Continue on error
          }
        }
      }

      // 用 adminSave 更新資料和上傳新檔案
      await adminSave({ updateData: { unit: '次', amount: savedTests.length, payload }, files: filesToUpload })

      // reload 和通知
      await reload()
      reloadApprovalStatus()
      setSubmitSuccess('管理員儲存成功')
    } finally {
      setSubmitting(false)
    }
    return
  }

  // 一般暫存
  try {
    await submitData(true)
  } catch (error) {
    console.error('❌ 暫存失敗:', error)
    setSubmitError(error instanceof Error ? error.message : '暫存失敗')
  }
}

// ✅ 2. useEffect 清空 memoryFiles（跟 SF6Page 一樣）
useEffect(() => {
  if (dataLoading) return

  if (loadedFiles.length > 0 && savedTests.length > 0) {
    const testFiles = loadedFiles.filter(f =>
      f.file_type === 'other' && f.page_key === pageKey
    )

    if (testFiles.length > 0) {
      setSavedTests(prev => prev.map(test => {
        const recordFiles = testFiles.filter(f => f.record_id === test.id)

        return {
          ...test,
          memoryFiles: [],  // reload 後清空
          evidenceFiles: recordFiles  // 直接用資料庫檔案
        }
      }))
    }
  }
}, [loadedFiles, pageKey, dataLoading, savedTests.length])
```

**修復位置：**
- `frontend/src/pages/Category1/GeneratorTestPage.tsx:322-415` (handleSave 添加管理員模式)
- `frontend/src/pages/Category1/GeneratorTestPage.tsx:136-159` (useEffect 清空 memoryFiles)

**學到的教訓：**
- **管理員審核模式需要特殊處理**，不能走一般使用者的流程
- **reload 後必須清空 memoryFiles**，否則會顯示舊檔案
- **檔案替換的正確流程**：先刪舊檔 → 上傳新檔 → reload → useEffect 清空 memory 載入資料庫檔案
- **直接複製已驗證可用的模式**（SF6Page）比自己寫新邏輯更可靠
- **管理員權限繞過 RLS**，可以看到所有檔案（包括剛刪除的），必須用專屬邏輯

**相關檔案：**
- `frontend/src/pages/Category1/GeneratorTestPage.tsx:322-415` (handleSave 修復)
- `frontend/src/pages/Category1/GeneratorTestPage.tsx:136-159` (useEffect 修復)
- `frontend/src/pages/Category1/SF6Page.tsx:340-465` (參考範本)

---

#### 2025-11-20 - DieselPage 管理員審核按鈕通知錯誤：移除 onShowSuccess/onShowError 回調
**情況：** 管理員在 DieselPage 審核模式點擊「退回」按鈕時，顯示「提交成功」的通知而不是正確的「已退回」通知。三個審核按鈕（儲存編輯/通過審核/退回）的通知都顯示不正確。

**問題根源：**
DieselPage 傳遞了 `onShowSuccess` 和 `onShowError` 回調到 reviewSection，但 TYPE1 (GeneratorTestPage) 不使用這個模式。DieselPage 的通知系統與 ReviewSection 的內部通知邏輯產生衝突。

**錯誤邏輯：**
```typescript
// ❌ DieselPage.tsx:667-679 - 傳遞了通知回調（TYPE1 沒有這樣做）
reviewSection={{
  isReviewMode,
  reviewEntryId,
  // ...
  onSave: handleSave,
  isSaving: submitting,
  onShowSuccess: (msg) => setSubmitSuccess(msg),  // ← TYPE1 沒有這個
  onShowError: (msg) => setSubmitError(msg)       // ← TYPE1 也沒有這個
}}
```

**TYPE1 的做法（正確）：**
```typescript
// ✅ GeneratorTestPage.tsx:491-510 - 不傳遞通知回調
reviewSection={{
  isReviewMode,
  reviewEntryId,
  reviewUserId,
  currentEntryId,
  pageKey,
  year,
  category: GENERATOR_TEST_CONFIG.title,
  amount: savedTests.reduce((sum, test) => {
    return sum + (test.generatorPower * test.testFrequency * test.testDuration / 60)
  }, 0),
  unit: GENERATOR_TEST_CONFIG.unit,
  role,
  onSave: handleSave,
  isSaving: submitting
  // ← 沒有 onShowSuccess 和 onShowError
}}
```

**關鍵修復：**
```typescript
// ✅ DieselPage.tsx:667-679 - 移除通知回調，完全匹配 TYPE1
reviewSection={{
  isReviewMode,
  reviewEntryId,
  reviewUserId,
  currentEntryId,
  pageKey,
  year,
  category: DIESEL_CONFIG.title,
  amount: dieselData.reduce((sum, item) => sum + item.quantity, 0),
  unit: DIESEL_CONFIG.unit,
  role,
  onSave: handleSave,
  isSaving: submitting
  // ✅ 移除 onShowSuccess 和 onShowError
}}
```

**用戶反饋：**
「現在管理員介面的那三個按鈕所對應到的通知很怪，我點退回結果出現提交成功的通知」
「我是覺得這裡直接抄TYPE1的做法就好，因為一模一樣」

**修復位置：**
- `frontend/src/pages/Category1/DieselPage.tsx:667-679` (移除 onShowSuccess 和 onShowError)
- `frontend/src/components/ReviewSection.tsx:67-68, 108-109` (添加調試日誌，用於診斷)
- `frontend/src/layouts/SharedPageLayout.tsx:72-73, 467-468` (添加類型定義，雖然現在 DieselPage 不用了)

**學到的教訓：**
- **TYPE1 vs TYPE2 的審核模式應該一致**：ReviewSection 的使用方式應該在所有頁面保持統一
- **ReviewSection 自己處理通知**：不需要從外部傳入通知回調，它會在內部處理（使用 `alert()` 或導航）
- **遇到跨頁面的共用組件問題時優先參考 TYPE1**：TYPE1 已經經過完整測試，是可靠的範本
- **直接複製已驗證可用的模式** 比自己創造新模式更可靠

**相關檔案：**
- `frontend/src/pages/Category1/DieselPage.tsx:667-679` (修復)
- `frontend/src/pages/Category1/GeneratorTestPage.tsx:491-510` (TYPE1 參考範本)
- `frontend/src/components/ReviewSection.tsx` (共用審核組件)

---

#### [範例] 2025-01-18 - 檔案上傳忘記 await
**問題：** 檔案上傳沒等 entry_id 回傳就開始上傳，導致 entry_id 是 undefined

**錯誤寫法：**
```typescript
const response = entryAPI.submitEnergyEntry(request)  // ❌ 沒 await
await fileAPI.uploadEvidenceFile(file, {
  entry_id: response.entry_id  // undefined!
})
```

**正確寫法：**
```typescript
const response = await entryAPI.submitEnergyEntry(request)  // ✅ 有 await
await fileAPI.uploadEvidenceFile(file, {
  entry_id: response.entry_id  // 正確
})
```

---

### 🚀 效率提升技巧

#### 2025-01-18 - Type 1 SOP 建立完成，後續複製即可
> RefrigerantPage 作為 Pilot 頁面，已建立完整的 Type 1 重構 SOP。SF6Page 和 GeneratorTestPage 只需複製 submitData 函數、更新 payload 欄位名稱、調整 cleanedData 映射即可。預計每頁只需 30 分鐘。

#### 2025-01-18 - 自動化測試腳本加速驗證
> 寫了 test_refrigerant_api.py 驗證資料結構、API 流程、程式碼簡化成果。4 項測試全部通過，不用手動檢查。這個測試腳本也可以複製給其他頁面用。

---

## 📝 重要記錄

### 2025-01-18
- ✅ 建立重構文件結構
- ✅ 清理舊文件（RECONS_DOC.md, specs/）
- ✅ RefrigerantPage 重構完成（Type 1 Pilot）
- ✅ 移除 useMultiRecordSubmit、useRecordFileMapping
- ✅ 程式碼減少 650 行（92.2%）
- ✅ 所有自動化測試通過（4/4）
- ✅ 建立 Type 1 SOP，可複製到 SF6Page

### 2025-01-19
- ✅ SF6Page 重構完成（Type 1 第 2/3 頁）
- ✅ 修復兩個檔案優先順序 bug（file.id → file.size、記憶體檔案優先）
- ✅ GeneratorTestPage 重構完成（Type 1 第 3/3 頁）
- ✅ Type 1 批次全部完成（3 頁，總計 6 小時）
- ✅ 應用全部 8 個 bug 預防措施，TypeScript 編譯零錯誤

---

## 🎯 里程碑

- [x] 完成第 1 個 Type 1 頁面（RefrigerantPage）✅ 2025-01-18
- [x] 完成所有 Type 1 頁面（3/3）✅ 2025-01-19
- [ ] 完成所有 Type 2 頁面（5/5）
- [ ] 完成 Type 5 頁面（CommuteePage）
- [ ] 完成所有 Type 3 頁面（5/5）
- [ ] 完成所有 Type 4 頁面（2/2）
- [ ] 全部 16 頁完成
- [ ] 刪除舊 hooks 和 utils
- [ ] 系統測試通過

---

## 📋 使用說明

### 完成一頁後怎麼更新

1. **更新進度表**
   - 把該頁的狀態從 🔜 改成 ✅
   - 填入開始/完成日期
   - 填入耗時（例如：2 小時）

2. **記錄心得**
   - 如果學到新東西 → 加到「做對的事」
   - 如果踩到坑 → 加到「踩過的坑」
   - 如果發現提升效率的方法 → 加到「效率提升技巧」

3. **更新 README.md**
   - 把「當前任務」改成下一頁
   - 更新「當前進度」數字

### 範例更新（RefrigerantPage 完成後）

**進度表：**
```
| 1 | RefrigerantPage | ✅ | 2025-01-18 | 2025-01-18 | 2h | 第一頁，建立 Type 1 SOP |
```

**心得：**
```
#### 2025-01-18 - Type 1 頁面很簡單
> 照著 page-classification.md 組資料，30 分鐘寫完後端，1 小時改完前端，超順利。
```

**README.md 更新：**
```
當前任務：
[ ] 重構 SF6Page（第 2/16 頁）- Type 1

當前進度：1 / 16 頁完成
```

---

## 🎨 UI/UX 標準化記錄

### 縮圖佔位符統一（2025-01-20）

**問題：**
- RefrigerantPage: 永久容器 + 白色背景
- DieselPage (GroupListItem): 永久容器 + 白色背景
- SF6Page: 條件渲染 `{thumbnail && <div>}` → layout shift ❌
- GeneratorTestPage: 條件渲染 `{thumbnail && <div>}` → layout shift ❌

**問題根源：**
4 個已重構頁面有 2 種不同邏輯：
1. 永久容器（RefrigerantPage, DieselPage）→ 不跳，但白色背景不專業
2. 條件渲染（SF6Page, GeneratorTestPage）→ 載入時會跳動

**解決方案：**

1. **建立共用常數** `frontend/src/utils/energy/thumbnailConstants.tsx`
   ```tsx
   export const THUMBNAIL_PLACEHOLDER_SVG = <svg>...</svg>
   export const THUMBNAIL_BACKGROUND = '#EBEDF0'
   export const THUMBNAIL_BORDER = '1px solid rgba(0, 0, 0, 0.25)'
   ```

2. **修改 4 個組件使用統一標準：**
   - `components/energy/GroupListItem.tsx` - 白色 → 灰色 + SVG
   - `pages/Category1/components/RefrigerantListSection.tsx` - 白色 → 灰色 + SVG
   - `pages/Category1/components/SF6ListSection.tsx` - 條件渲染 → 永久容器 + SVG
   - `pages/Category1/components/GeneratorTestListSection.tsx` - 條件渲染 → 永久容器 + SVG

3. **更新 SOP 文件：**
   - `docs/type1-sop.md` 步驟 8：縮圖標準
   - `docs/type2-sop.md` 步驟 9：縮圖標準

**統一後的標準：**
```tsx
<div style={{
  background: THUMBNAIL_BACKGROUND,  // #EBEDF0
  border: THUMBNAIL_BORDER,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center'
}}>
  {thumbnail ? (
    <img src={thumbnail} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
  ) : (
    THUMBNAIL_PLACEHOLDER_SVG
  )}
</div>
```

**效果：**
- ✅ 消除 layout shift（SF6Page, GeneratorTestPage）
- ✅ 統一視覺風格（4 頁一致，淺灰色更專業）
- ✅ 程式碼不重複（SVG 只定義一次）
- ✅ 後續頁面有標準可循（寫入 SOP）

**載入過程（統一後）：**
```
階段 1: Entry 載入   → [淺灰色底 #EBEDF0 + SVG 圖示]
階段 2: Files 載入   → [淺灰色底 #EBEDF0 + SVG 圖示] (無變化)
階段 3: 縮圖載入完成 → [實際縮圖顯示] (SVG → img，無 layout shift)
```

**Code Smell 消除：**
- ✅ Duplicated Code（SVG 重複 4 次 → 1 次）
- ✅ Inconsistent Behavior（4 種邏輯 → 1 種標準）
- ✅ Magic Values（#FFF, #EBEDF0 散落各處 → 統一常數）

**修改檔案清單：**
```
新增：
  frontend/src/utils/energy/thumbnailConstants.tsx

修改（程式碼）：
  frontend/src/components/energy/GroupListItem.tsx
  frontend/src/pages/Category1/components/RefrigerantListSection.tsx
  frontend/src/pages/Category1/components/SF6ListSection.tsx
  frontend/src/pages/Category1/components/GeneratorTestListSection.tsx

修改（文件）：
  docs/type1-sop.md
  docs/type2-sop.md
  docs/PROGRESS.md
```

---

#### 2025-11-20 - ⚠️ DieselPage 雙重通知問題：錯誤解法記錄（已廢棄，請參照 UreaPage 模式）
**⚠️ 警告：本記錄為錯誤解法，請勿參考。正確解法請參照 2025-11-21 GasolinePage 修復記錄。**

**情況：** DieselPage 點「儲存」按鈕會跳兩次成功通知。

**當時的錯誤解法：** 加上 `customNotifications: true` ❌

**為什麼這是錯的：**
1. 增加了複雜度 - 需要頁面自己管理 Toast 組件
2. 不是標準模式 - UreaPage、SepticTankPage 等 Type 2 頁面都**不使用** `customNotifications`
3. 容易出錯 - GasolinePage 後來因此出現通知不顯示的問題

**正確解法（2025-11-21 從 UreaPage 學到）：**
- **不要使用** `customNotifications: true`
- 讓 SharedPageLayout 通過 `notificationState` 自動顯示通知
- 這是 UreaPage、SepticTankPage 等頁面的標準模式

**參考正確實現：**
- `frontend/src/pages/Category1/UreaPage.tsx` - Type 2 標準通知模式
- `frontend/src/pages/Category1/GasolinePage.tsx` - 已修正為正確模式

---

#### 2025-11-20 - DieselPage 管理員刪除檔案權限問題：參考 TYPE1 使用 adminDeleteEvidence
**情況：** 管理員在審核模式上傳的佐證檔案，使用者後來無法刪除。使用者反應：「管理員這邊上傳的佐證到了使用者那邊編輯會出現佐證資料刪不掉的問題」

**問題根源：**
DieselPage 的 `handleAdminSave` 函數使用 `deleteEvidence(fileId)` 刪除舊檔案：
```typescript
// Line 449 (修改前)
await deleteEvidence(fileId)
```

**為什麼會失敗：**
- `deleteEvidence` 會檢查 `owner_id = current_user_id` (files.ts:1099, 1145)
- 管理員上傳的檔案 → `owner_id = admin_id`
- 使用者後來想刪除 → `owner_id != user_id` → **刪除失敗**

**TYPE1 的做法（GeneratorTestPage）：**
GeneratorTestPage 使用 `adminDeleteEvidence` 而不是 `deleteEvidence`：
```typescript
// GeneratorTestPage.tsx:357
await adminDeleteEvidence(fileId)  // ← TYPE1 用這個
```

**adminDeleteEvidence vs deleteEvidence 差異：**
```typescript
// deleteEvidence (files.ts:1084-1160)
.eq('owner_id', user.id)  // ❌ 檢查 owner_id - 只能刪自己的檔案

// adminDeleteEvidence (files.ts:1170-1254)
// ✅ 不檢查 owner_id - 驗證管理員身份後可刪任何檔案
// Line 1181-1190: 驗證管理員權限
// Line 1237: 刪除時不過濾 owner_id
```

**修復方案：**
參考 TYPE1，將 DieselPage 改用 `adminDeleteEvidence`

**修改位置：**
1. `frontend/src/pages/Category1/DieselPage.tsx:18` - Import 區
   ```typescript
   // 加上 adminDeleteEvidence
   import { EvidenceFile, getFileUrl, deleteEvidence, adminDeleteEvidence } from '../../api/files';
   ```

2. `frontend/src/pages/Category1/DieselPage.tsx:449` - handleAdminSave 函數
   ```typescript
   // 從：
   await deleteEvidence(fileId)

   // 改為：
   await adminDeleteEvidence(fileId)
   ```

**為什麼有效：**
- `adminDeleteEvidence` 先驗證管理員身份（files.ts:1181-1190）
- 通過驗證後允許刪除任何檔案（files.ts:1237 不檢查 owner_id）
- `handleAdminSave` 只在 `isReviewMode && reviewEntryId` 時執行，已有權限保護
- RLS policy 保證非管理員無法調用此 API

**與 TYPE1 一致性：**
- GeneratorTestPage (TYPE1) 使用 `adminDeleteEvidence`
- DieselPage (TYPE2) 現在也使用 `adminDeleteEvidence`
- 統一管理員刪除檔案的做法

**測試建議：**
1. 管理員在審核模式上傳佐證 → 儲存
2. 使用者編輯 → 刪除舊佐證 → 上傳新佐證 → 儲存
3. 檢查資料庫 → 確認舊佐證已刪除，只有新佐證

**相關檔案：**
- `frontend/src/pages/Category1/DieselPage.tsx:18, 449` (加上 adminDeleteEvidence import，handleAdminSave 改用 adminDeleteEvidence)
- `frontend/src/api/files.ts:1084-1160` (deleteEvidence - 檢查 owner_id)
- `frontend/src/api/files.ts:1170-1254` (adminDeleteEvidence - 不檢查 owner_id)
- `frontend/src/pages/Category1/GeneratorTestPage.tsx:357` (TYPE1 參考實作)

---

#### 2025-11-21 - 使用者無法刪除管理員上傳的檔案：RLS Policy + API 程式碼雙修復
**情況：** 使用者無法刪除管理員在審核模式上傳的佐證檔案。使用者報告：「管理員介面上傳佐證後儲存 → 使用者這邊刪除管理員佐證後再次上傳自己的佐證後儲存 → 佐證資料出現舊的檔案」

**場景重現：**
1. 管理員在審核模式上傳檔案 → `owner_id = admin_id`
2. 使用者編輯並刪除舊檔案 → 標記為待刪除
3. 使用者儲存 → 呼叫 `deleteEvidence(fileId)`
4. API 查詢：`.eq('owner_id', user.id)` → 無匹配（因為 owner_id 是管理員）
5. Line 1109 silent return → **檔案未被刪除**
6. Reload → 舊檔案重新出現

**問題根源：**
雙層權限檢查都基於錯誤的假設（檢查檔案所有者而非 entry 所有者）：
1. **API 查詢層**：`files.ts:1099, 1146` 的 `.eq('owner_id', user.id)` 過濾掉管理員上傳的檔案
2. **RLS Policy 層**：舊 Policy 也檢查 `owner_id = auth.uid()`

**影響範圍：**
- ❌ 所有 TYPE1 頁面（RefrigerantPage, SF6Page, GeneratorTestPage）
- ❌ 所有 TYPE2 頁面（DieselPage, GasolinePage, UreaPage, WD40Page, SepticTankPage）
- ✅ 共 8 個頁面

**解決方案（兩階段）：**

**階段 1：修改 RLS Policy（用戶執行）**
```sql
DROP POLICY IF EXISTS "users_can_delete_own_files" ON entry_files;

CREATE POLICY "users_can_delete_own_entry_files"
ON entry_files
FOR DELETE
USING (
  -- 管理員可以刪除任何檔案
  auth.uid() IN (SELECT id FROM profiles WHERE role = 'admin')
  OR
  -- 或者：這個檔案的 entry 屬於當前使用者
  EXISTS (
    SELECT 1 FROM energy_entries
    WHERE energy_entries.id = entry_files.entry_id
    AND energy_entries.owner_id = auth.uid()
  )
);
```

**為什麼還不夠：** 用戶反饋「可是我現在還是有欸」→ RLS Policy 修改後仍然失敗

**階段 2：移除 API 程式碼的 owner_id 檢查（關鍵修復）**

API 程式碼在 RLS Policy 之前就先過濾了資料，導致 RLS Policy 根本沒機會執行：

```typescript
// ❌ files.ts:1095-1101 (修復前) - 查詢時過濾
const { data: fileData, error: fetchError } = await supabase
  .from('entry_files')
  .select('file_path, owner_id')
  .eq('id', fileId)
  .eq('owner_id', user.id) // ← 管理員檔案被過濾掉，返回 null
  .maybeSingle()

// ✅ files.ts:1095-1101 (修復後) - 移除 owner_id 檢查
const { data: fileData, error: fetchError } = await supabase
  .from('entry_files')
  .select('file_path, owner_id')
  .eq('id', fileId)
  // 移除 .eq('owner_id', user.id)
  // RLS Policy 會檢查是否有權限讀取此檔案
  .maybeSingle()
```

```typescript
// ❌ files.ts:1142-1146 (修復前) - 刪除時過濾
const { error: dbError } = await supabase
  .from('entry_files')
  .delete()
  .eq('id', fileId)
  .eq('owner_id', user.id)  // ← 管理員檔案無法刪除

// ✅ files.ts:1142-1146 (修復後) - 移除 owner_id 檢查
const { error: dbError } = await supabase
  .from('entry_files')
  .delete()
  .eq('id', fileId)
  // 移除 .eq('owner_id', user.id)
  // RLS Policy 會檢查是否有權限刪除此檔案
```

**修復位置：**
1. Supabase SQL Editor - RLS Policy 修改（用戶執行）
2. `frontend/src/api/files.ts:1099` - 移除查詢時的 `owner_id` 檢查
3. `frontend/src/api/files.ts:1146` - 移除刪除時的 `owner_id` 檢查

**為什麼需要兩階段修復：**
- **只改 RLS Policy**：API 查詢先過濾 → 返回 null → RLS Policy 無機會執行 ❌
- **只改 API 程式碼**：無 RLS Policy 保護 → 安全漏洞 ❌
- **雙修復**：API 不過濾 → RLS Policy 驗證權限 → 正確運作 ✅

**權限邏輯正確化：**
```
舊邏輯（錯誤）：
  檢查「誰上傳了這個檔案」(owner_id = user_id)
  → 使用者無法刪除管理員上傳的檔案

新邏輯（正確）：
  檢查「這個檔案的 entry 屬於誰」(entry.owner_id = user_id)
  → 使用者可以刪除自己 entry 下的任何檔案（不管是誰上傳的）
```

**學到的教訓：**
- **資料所有權檢查原則**：檢查「誰擁有這個資料（entry）」而非「誰上傳了這個檔案」
- **雙層權限檢查的陷阱**：API 查詢層過濾會阻止 RLS Policy 執行
- **正確做法**：API 程式碼不做 owner_id 過濾，完全交給 RLS Policy 處理權限
- **管理員代理操作支援**：管理員幫使用者上傳檔案後，使用者必須能自行管理

**相關檔案：**
- Supabase RLS Policy (新增 `users_can_delete_own_entry_files`)
- `frontend/src/api/files.ts:1099, 1146` (移除 owner_id 檢查)
- 影響範圍：所有 TYPE1 和 TYPE2 頁面（8 頁）

---


#### 2025-11-21 - ⚠️ GasolinePage 雙重通知系統衝突：錯誤解法記錄（已廢棄）
**⚠️ 警告：本記錄為錯誤解法，請勿參考。正確解法是移除 `customNotifications: true`。**

**當時的錯誤診斷：** 以為是 state 變數命名問題，需要移除自定義 Toast ❌

**真正的問題：** 根本不應該使用 `customNotifications: true`，應該參照 UreaPage 模式

**正確解法（稍後發現）：**
1. 移除 `bottomActionBar` 的 `customNotifications: true`
2. 移除 Toast 組件和 import
3. 讓 SharedPageLayout 自動顯示通知

**參考：** 請看後面的「2025-11-21 - GasolinePage 修復儲存按鈕無通知問題（參照 UreaPage 模式）」記錄

---

#### 2025-11-21 - GasolinePage handleSave 不工作：syncEditingGroupChanges 位置錯誤
**情況：** GasolinePage 點「儲存」按鈕沒反應，錯誤訊息：「請至少新增一個群組」

**使用者流程：**
1. 輸入資料到編輯區
2. **沒有**點「保存群組」按鈕
3. 直接點底部的「儲存」按鈕
4. 錯誤：`savedGroups` 是空的 → 提示「請至少新增一個群組」

**問題根源：**
`handleSave` 只在 review mode 同步編輯區，一般儲存模式沒有同步

**錯誤邏輯：**
```typescript
// ❌ GasolinePage.tsx:473-510（修復前）
const handleSave = async () => {
  await executeSubmit(async () => {
    const { totalQuantity, cleanedEnergyData } = prepareSubmissionData(savedGroups)

    if (isReviewMode && reviewEntryId) {
      const finalSavedGroups = syncEditingGroupChanges()  // ← 只在 review mode 同步
      // ... adminSave 邏輯 ...
      return
    }
    // 一般儲存
    await submitData(true)  // savedGroups 還是空的！
  })
}
```

**DieselPage 的正確做法（Line 507）：**
```typescript
// ✅ DieselPage.tsx:507 - 在所有模式前都同步
const handleSave = async () => {
  await executeSubmit(async () => {
    const finalSavedGroups = syncEditingGroupChanges()  // ⭐ 所有模式都執行
    const { totalQuantity, cleanedEnergyData } = prepareSubmissionData(finalSavedGroups)

    if (isReviewMode && reviewEntryId) {
      // ... adminSave 邏輯 ...
      return
    }
    await submitData(true)  // 使用同步後的資料
  })
}
```

**關鍵修復：**
```typescript
// ✅ GasolinePage.tsx:473-510（修復後）
const handleSave = async () => {
  await executeSubmit(async () => {
    setSubmitError(null)
    setSubmitSuccess(null)

    // ⭐ 移到最前面，所有模式都執行
    const finalSavedGroups = syncEditingGroupChanges()
    const { totalQuantity, cleanedEnergyData } = prepareSubmissionData(finalSavedGroups)

    if (isReviewMode && reviewEntryId) {
      const filesToUpload = collectAdminFilesToUpload(finalSavedGroups)
      await adminSave({
        updateData: {
          unit: GASOLINE_CONFIG.unit,
          amount: totalQuantity,
          payload: {
            monthly: { '1': totalQuantity },
            gasolineData: cleanedEnergyData
          }
        },
        files: filesToUpload
      })
      await reload()
      reloadApprovalStatus()
      setCurrentEditingGroup(prev => ({ ...prev, memoryFiles: [] }))
      setSubmitSuccess('✅ 儲存成功！資料已更新')
      return
    }

    // 一般儲存：使用同步後的 finalSavedGroups
    await submitData(true)
  }).catch(error => {
    setSubmitError(error instanceof Error ? error.message : '暫存失敗')
  })
}
```

**syncEditingGroupChanges 做什麼：**
```typescript
// Line 452-469
const syncEditingGroupChanges = () => {
  if (currentEditingGroup.groupId === null) return savedGroups

  const hasModifications = currentEditingGroup.records.some(r =>
    r.date.trim() !== '' || r.quantity > 0
  ) || currentEditingGroup.memoryFiles.length > 0

  if (!hasModifications) return savedGroups

  const { groupId, records, memoryFiles } = currentEditingGroup
  const validRecords = records.filter(r => r.date.trim() !== '' || r.quantity > 0)
  const recordsWithGroupId = validRecords.map(r => ({
    ...r,
    groupId: groupId,
    memoryFiles: [...memoryFiles]
  }))

  const finalSavedGroups = [
    ...recordsWithGroupId,
    ...savedGroups.filter(r => r.groupId !== groupId)
  ]
  setSavedGroups(finalSavedGroups)
  return finalSavedGroups
}
```

**修復位置：**
- `frontend/src/pages/Category1/GasolinePage.tsx:473-510` (handleSave 移動 syncEditingGroupChanges)

**學到的教訓：**
- **編輯區同步是所有模式的前置作業**：不論 review mode 或一般儲存，都需要先同步編輯區
- **TYPE2 特殊性**：TYPE2 頁面有「編輯區」和「已儲存列表」的雙 state，必須在儲存前同步
- **參考 Pilot 頁面**：DieselPage 已經有正確實作，直接複製即可
- **使用者體驗**：使用者期望「點儲存 = 儲存目前所有內容」，不需要額外點「保存群組」

**相關檔案：**
- `frontend/src/pages/Category1/GasolinePage.tsx:473-510` (handleSave 修復)
- `frontend/src/pages/Category1/DieselPage.tsx:507` (DieselPage 參考範本)

---

#### 2025-11-21 - 重構 DieselStationarySourcesPage + 修復 TYPE2 頁面 Hook 初始化錯誤

**重構內容：** 按照 type2-sop.md 標準重構 DieselStationarySourcesPage（柴油固定源）頁面

**重構成果：**
✅ 完整重寫 DieselStationarySourcesPage（787 行）
✅ 參考 DieselPage 成功模式，保持一致性
✅ 新增 6 個輔助函數（buildGroupsMap, uploadGroupFiles, deleteMarkedFiles, collectAdminFilesToUpload, deleteMarkedFilesAsAdmin, syncEditingGroupChanges）
✅ 修復 TypeScript 類型錯誤（groupId: null → undefined）
✅ 使用 `AdminSaveParams['files']` 型別（P0 品質標準）
✅ 簡化 handleSave 和 handleAdminSave
✅ 添加檔案刪除追蹤（filesToDelete）
✅ 支援設備類型選擇（發電機、鍋爐、蓄熱式焚化爐、其他）

**批次修復：** 同時修復了其他 4 個 TYPE2 頁面的 Hook 初始化順序錯誤：
- ✅ GasolinePage - 移動 `useThumbnailLoader` 到 `savedGroups` 之後
- ✅ SepticTankPage - 移動 `useThumbnailLoader` 到 `savedGroups` 之後
- ✅ UreaPage - 移動 `useThumbnailLoader` 到 `savedGroups` 之後
- ✅ WD40Page - 移動 `useMemo` 和 `useThumbnailLoader` 到 `savedGroups` 之後

**問題根源：**
所有 TYPE2 頁面都犯了同樣的錯誤：在 state 聲明之前就使用了該 state
```typescript
// ❌ 錯誤（line 49-52）
const thumbnails = useThumbnailLoader({
  records: savedGroups,  // 使用 savedGroups
  fileExtractor: (record) => record.evidenceFiles || []
})

// state 聲明（line 136）
const [savedGroups, setSavedGroups] = useState<Record[]>([])

// 錯誤訊息：
// Block-scoped variable 'savedGroups' used before its declaration
```

**解決方案：** Hook 初始化順序調整
```typescript
// ✅ 正確順序
// 1️⃣ 先聲明 state（line 130）
const [savedGroups, setSavedGroups] = useState<Record[]>([])

// 2️⃣ 再使用 hook（line 133-136）
const thumbnails = useThumbnailLoader({
  records: savedGroups,
  fileExtractor: (record) => record.evidenceFiles || []
})
```

**TypeScript 編譯結果：**
✅ 所有 5 個修復的頁面零錯誤
- DieselStationarySourcesPage ✅
- GasolinePage ✅
- SepticTankPage ✅
- UreaPage ✅
- WD40Page ✅

**學到的教訓：**
1. **Hook 初始化順序鐵律**：所有 React Hook 都必須在其依賴的 state 聲明之後調用
2. **type2-sop.md 的重要性**：SOP 明確指出「⭐ 已加入 useThumbnailLoader（在 savedGroups 之後）」
3. **批次修復效率**：發現一個頁面的問題後，立即檢查其他相似頁面，可以避免重複錯誤
4. **參考範本的價值**：DieselPage 作為 TYPE2 Pilot，提供了正確的程式碼結構範本

**相關檔案：**
- `frontend/src/pages/Category1/DieselStationarySourcesPage.tsx` (完整重構)
- `frontend/src/pages/Category1/GasolinePage.tsx:49-52, 130-136` (Hook 順序修復)
- `frontend/src/pages/Category1/SepticTankPage.tsx:145-149, 217-223` (Hook 順序修復)
- `frontend/src/pages/Category1/UreaPage.tsx:48-52, 131-137` (Hook 順序修復)
- `frontend/src/pages/Category1/WD40Page.tsx:51-58, 146-156` (Hook 順序修復)

**工作時長：** ~45 分鐘（1 次重構 + 4 次批次修復）

---

#### 2025-01-21 - TYPE1 & TYPE2 通知行為規範化完成
**情況：** 統一所有能源頁面的通知行為，前端內存操作不跳通知，只有後端提交才顯示通知

**實施範圍：**
- ✅ **TYPE1 (6 頁)**：UreaPage, DieselPage, DieselStationarySourcesPage, GasolinePage, WD40Page, SepticTankPage
- ✅ **文檔更新**：type1-sop.md, type2-sop.md, PROGRESS.md

**核心原則：**
**靜默操作（Silent Operations）** - 前端內存操作，不跳通知：
- 點「變更儲存」（更新群組到內存）
- 點「+新增」（新增群組到內存）
- 點「刪除群組」（從內存刪除）
- 點「載入到編輯區」（將群組資料載入編輯區）

**通知操作（Notified Operations）** - 後端提交，必須跳通知：
- 🟢 使用者點「提交」→ 綠色 SuccessModal（提交成功！）
- 🔵 使用者點「暫存」→ 藍色 SuccessModal（儲存成功！）
- 🔵 管理員點「儲存」→ 藍色 SuccessModal（儲存成功！）

**修改模式：**
```typescript
// ❌ 舊寫法
const saveCurrentGroup = () => {
  setSavedGroups(prev => [...prev, newGroup])
  setSuccess('群組已更新') // ← 刪除這行
}

const deleteSavedGroup = (groupId: string) => {
  setSavedGroups(prev => prev.filter(r => r.groupId !== groupId))
  setSuccess('群組已刪除') // ← 刪除這行
}

// ✅ 新寫法
const saveCurrentGroup = () => {
  setSavedGroups(prev => [...prev, newGroup])
  // 不顯示通知（只是前端內存操作）
}

const deleteSavedGroup = (groupId: string) => {
  setSavedGroups(prev => prev.filter(r => r.groupId !== groupId))
  // 不顯示通知（只是前端內存操作）
}
```

**修改清單：**
1. **DieselPage.tsx** (Lines 282-293, 330, 340)
   - 移除 4 個 setSuccess 調用：群組已更新、群組已新增、群組已載入到編輯區、群組已刪除

2. **DieselStationarySourcesPage.tsx** (Lines 323, 354)
   - 移除 2 個 setSuccess 調用：群組已更新/新增、群組已刪除

3. **GasolinePage.tsx**
   - 無需修改（本來就沒有群組操作通知）

4. **WD40Page.tsx** (Lines 361, 364, 400)
   - 移除 3 個 setSuccess 調用：群組已更新、群組已新增、群組已刪除

5. **SepticTankPage.tsx** (Lines 386, 443)
   - 移除 2 個 setSuccess 調用：群組已更新、群組已刪除

6. **UreaPage.tsx** (Lines 344, 348, 392)
   - 移除 3 個 setSuccess 調用：群組已更新、群組已新增、群組已刪除

**設計理念（Vibe Coding）：**
「Excel 表格類比」
- 在 Excel 加一行、刪一行、修改一行 → 不跳通知（只是內存操作）
- 點「發送」或「保存到雲端」→ 跳通知（後端提交）

**系統一致性：**
- 所有 TYPE1 頁面（RefrigerantPage, SF6Page, GeneratorTestPage）遵循此規範
- 所有 TYPE2 頁面（DieselPage, GasolinePage, UreaPage, WD40Page, SepticTankPage, DieselStationarySourcesPage）遵循此規範
- **14 個能源頁面** 通知行為完全統一

**文檔標準化：**
- ✅ type1-sop.md 新增「🔔 通知行為規範」章節
- ✅ type2-sop.md 新增「🔔 通知行為規範」章節
- ✅ 與「移除刪除確認提示」標準整合（坑 #8）
- ✅ 統一使用註釋：`// 不顯示通知（只是前端內存操作）`

**學到的教訓：**
1. **使用者體驗一致性**：相同類型的操作應該有相同的反饋模式
2. **「Excel 思維」很有效**：用熟悉的 Excel 操作類比幫助理解前端內存操作 vs 後端提交
3. **批次規範化效率高**：一次統一 6 個頁面的通知行為，避免未來不一致
4. **SOP 文檔價值**：將規範寫入 SOP，後續頁面自動遵循

**相關檔案：**
- `frontend/src/pages/Category1/DieselPage.tsx`
- `frontend/src/pages/Category1/DieselStationarySourcesPage.tsx`
- `frontend/src/pages/Category1/GasolinePage.tsx`
- `frontend/src/pages/Category1/WD40Page.tsx`
- `frontend/src/pages/Category1/SepticTankPage.tsx`
- `frontend/src/pages/Category1/UreaPage.tsx`
- `docs/type1-sop.md` (新增通知規範章節)
- `docs/type2-sop.md` (新增通知規範章節)

**工作時長：** ~30 分鐘（6 個頁面批次修改 + 文檔更新）

---
