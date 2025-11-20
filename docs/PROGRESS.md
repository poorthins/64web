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
| 4 | DieselPage | 🔜 | - | - | - | 群組記錄典型 |
| 5 | GasolinePage | 🔜 | - | - | - | 和 Diesel 幾乎一樣 |
| 6 | DieselStationarySourcesPage | 🔜 | - | - | - | 固定源 |
| 7 | SepticTankPage | 🔜 | - | - | - | 設施群組 |
| 8 | UreaPage | 🔜 | - | - | - | 有 SDS 管理 |

### Type 3：先設定規格 → 一筆佐證 → 多筆使用記錄（5 頁）

| # | 頁面 | 狀態 | 開始 | 完成 | 耗時 | 備註 |
|---|------|------|------|------|------|------|
| 9 | WD40Page | 🔜 | - | - | - | 已有 spec manager |
| 10 | FireExtinguisherPage | 🔜 | - | - | - | 檢修記錄 |
| 11 | AcetylenePage | 🔜 | - | - | - | 鋼瓶規格 |
| 12 | LPGPage | 🔜 | - | - | - | 液化石油氣 |
| 13 | WeldingRodPage | 🔜 | - | - | - | MSDS 管理 |

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
