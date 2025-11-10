# DieselPage 重構戰略地圖

**目標**：將 DieselPage（1559 行）作為模板，建立可重用架構供其他 13 個能源頁面使用

---

## 📦 可提取的元件/工具（前端重用）

### 🟢 優先級 1：檔案處理相關（14 頁都會用）

#### `utils/energy/fileTypeDetector.ts`
```typescript
// 提取函數：
- getFileType(mimeType, fileName): FileType
- isImageFile(mimeType): boolean
- isPdfFile(mimeType): boolean
```
**用途**：判斷檔案類型（image/pdf/excel/word/other）
**位置**：DieselPage.tsx 第 119-143 行

#### `components/energy/FileTypeIcon.tsx`
```typescript
// Props: { fileType: FileType, size?: number }
// 回傳：PDF 紅色、Excel 綠色、Word 藍色、其他灰色 SVG icon
```
**用途**：顯示檔案類型圖示
**位置**：DieselPage.tsx 第 150-193 行（`renderFileTypeIcon`）
**額外出現**：第 1372-1416 行（資料列表區塊，重複邏輯）

---

### 🟡 優先級 2：輸入表單相關

#### `components/energy/RecordInputRow.tsx`
```typescript
// Props: {
//   record: { id, date, quantity }
//   onUpdate: (id, field, value) => void
//   onDelete: (id) => void
//   showDelete: boolean
//   disabled: boolean
// }
```
**用途**：日期 + 數量輸入行（帶刪除按鈕）
**位置**：DieselPage.tsx 第 1114-1203 行

#### `components/energy/FileUploadArea.tsx`
```typescript
// Props: {
//   memoryFiles: MemoryFile[]
//   onFileChange: (file: File) => void
//   onFileRemove: (index: number) => void
//   maxFiles: number
//   disabled: boolean
// }
```
**用途**：檔案上傳區 + 已上傳檔案列表
**位置**：DieselPage.tsx 第 952-1086 行

---

### 🟡 優先級 3：資料列表相關

#### `components/energy/GroupListItem.tsx`
```typescript
// Props: {
//   index: number
//   groupId: string
//   records: DieselRecord[]
//   evidenceFile?: EvidenceFile
//   memoryFile?: MemoryFile
//   onEdit: (groupId) => void
//   onDelete: (groupId) => void
//   disabled: boolean
// }
```
**用途**：群組列表項（編號 + 檔案預覽 + 筆數 + 操作按鈕）
**位置**：DieselPage.tsx 第 1291-1464 行

---

### 🔵 優先級 4：工具函數

#### `utils/energy/dataPreparation.ts`
```typescript
// 提取函數：
- prepareSubmissionData(records): PreparedData
- validateRecords(records): ValidationResult
```
**用途**：準備提交資料、驗證記錄
**位置**：DieselPage.tsx 第 196-205 行（`prepareSubmissionData`）

#### `utils/common/idGenerator.ts`（已存在）
✅ 已提取，繼續使用

---

## 🔧 需要重構的部分（改善架構）

### ❌ 問題 1：重複的檔案類型判斷邏輯

**位置**：
- 第 150-193 行：`renderFileTypeIcon` 函數
- 第 1347-1416 行：資料列表區塊的檔案 icon 渲染（90% 重複）

**重構方案**：
提取成 `<FileTypeIcon>` 元件後，兩處都改用元件

---

### ❌ 問題 2：過長的 JSX 結構（900+ 行）

**位置**：第 856-1559 行
**問題**：整個 return 區塊 700 行，難以維護

**重構方案**：
```
return (
  <SharedPageLayout ...>
    <DataInputSection />      ← 第 906-1270 行
    <DataListSection />        ← 第 1272-1472 行
    <ReviewSection />          ← 第 1475-1495 行
    <Modals />                 ← 第 1500-1550 行
  </SharedPageLayout>
)
```
拆成 4 個子元件，每個 100-200 行

---

### ❌ 問題 3：狀態管理分散

**現狀**：
```typescript
const [currentEditingGroup, setCurrentEditingGroup] = useState(...)
const [savedGroups, setSavedGroups] = useState(...)
const [lightboxSrc, setLightboxSrc] = useState(...)
const [thumbnails, setThumbnails] = useState({})
const [downloadingFileId, setDownloadingFileId] = useState(...)
// ... 共 10+ 個 state
```

**重構方案**：
考慮使用 `useReducer` 統一管理：
```typescript
const [state, dispatch] = useReducer(dieselPageReducer, initialState)
// dispatch({ type: 'ADD_RECORD', payload: ... })
```
或保持現狀（如果清晰的話）

---

### ⚠️ 問題 4：useEffect 沒有清理

**位置**：第 839-855 行
```typescript
useEffect(() => {
  evidenceGroups.forEach(async (group) => {
    // 生成縮圖
  })
}, [evidenceGroups])
```

**問題**：
1. 沒有 cleanup 函數，可能導致 memory leak
2. forEach 內使用 async，可能造成 race condition

**重構方案**：
```typescript
useEffect(() => {
  let cancelled = false

  const loadThumbnails = async () => {
    for (const group of evidenceGroups) {
      if (cancelled) break
      // 載入縮圖
    }
  }

  loadThumbnails()

  return () => { cancelled = true }
}, [evidenceGroups])
```

---

## 🔒 需要加強資安的地方

### 🚨 高風險 1：檔案上傳缺少後端驗證

**位置**：第 972-979 行
```typescript
<input
  type="file"
  accept=".xlsx,.xls,.pdf,..." // ❌ 只有前端驗證
/>
```

**問題**：
- 攻擊者可以繞過前端限制，上傳任意檔案（.exe, .sh, .php）
- 可能造成：
  - 儲存空間濫用
  - 惡意腳本上傳（如果 Storage 設定不當）
  - 檔案類型混淆攻擊

**解決方案（後端）**：
```python
# backend/api/files.py

ALLOWED_MIME_TYPES = {
    'application/pdf',
    'image/jpeg',
    'image/png',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
}

MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB

def validate_uploaded_file(file):
    # 1. 檢查檔案大小
    if file.size > MAX_FILE_SIZE:
        raise ValueError("File too large")

    # 2. 檢查 MIME type（不信任 Content-Type header）
    actual_mime = magic.from_buffer(file.read(2048), mime=True)
    if actual_mime not in ALLOWED_MIME_TYPES:
        raise ValueError(f"Invalid file type: {actual_mime}")

    # 3. 檢查檔案內容（PDF/Excel/圖片格式驗證）
    validate_file_structure(file, actual_mime)

    return True
```

---

### 🚨 高風險 2：檔案刪除權限檢查不足

**位置**：
- 第 1071-1083 行：刪除記憶體檔案（前端邏輯）
- 第 1453-1460 行：刪除群組按鈕

**問題**：
```typescript
onClick={() => {
  setCurrentEditingGroup(prev => ({
    ...prev,
    memoryFiles: prev.memoryFiles.filter((_, i) => i !== index)
  }))
}}
```
- 只檢查 `isReadOnly` 和 `approvalStatus.isApproved`
- 沒有檢查使用者是否為檔案擁有者
- 潛在問題：如果前端被繞過，可以刪除別人的檔案

**解決方案（後端）**：
```python
# backend/api/files.py

def delete_evidence_file(file_id: str, user_id: str):
    # 1. 檢查檔案是否存在
    file = db.query(EvidenceFile).filter(id=file_id).first()
    if not file:
        raise HTTPException(404, "File not found")

    # 2. 檢查權限（只有檔案擁有者或 admin 可刪除）
    if file.owner_id != user_id and not is_admin(user_id):
        raise HTTPException(403, "Forbidden")

    # 3. 檢查 entry 狀態（已審核通過不可刪除）
    entry = db.query(Entry).filter(id=file.entry_id).first()
    if entry and entry.approval_status == 'approved':
        raise HTTPException(403, "Cannot delete file from approved entry")

    # 4. 刪除
    storage.delete(file.file_path)
    db.delete(file)
    db.commit()
```

---

### ⚠️ 中風險 3：XSS 風險（檔案名稱顯示）

**位置**：第 1050-1060 行
```typescript
<p style={{...}}>
  {file.file.name}  {/* ❌ 未消毒的使用者輸入 */}
</p>
```

**問題**：
- 如果攻擊者上傳檔案名為 `<img src=x onerror=alert(1)>.pdf`
- 可能觸發 XSS（取決於 React 的轉義行為）

**解決方案（前端）**：
```typescript
// utils/common/sanitizer.ts
export function sanitizeFileName(fileName: string): string {
  return fileName
    .replace(/[<>]/g, '')  // 移除 HTML 標籤
    .trim()
    .slice(0, 255)  // 限制長度
}

// 使用：
<p>{sanitizeFileName(file.file.name)}</p>
```

**解決方案（後端）**：
```python
import re

def sanitize_filename(filename: str) -> str:
    # 1. 移除路徑遍歷字元
    filename = filename.replace('..', '').replace('/', '').replace('\\', '')

    # 2. 移除特殊字元
    filename = re.sub(r'[<>:"|?*]', '', filename)

    # 3. 限制長度
    return filename[:255]
```

---

### ⚠️ 中風險 4：檔案下載 URL 暴露

**位置**：第 765-788 行
```typescript
const handleDownloadFile = async (file: EvidenceFile) => {
  const fileUrl = await getFileUrl(file.file_path)  // 取得公開 URL
  const link = document.createElement('a')
  link.href = fileUrl
  link.click()
}
```

**問題**：
- 如果 `getFileUrl()` 回傳永久公開 URL → 任何人都能下載
- 如果使用 Supabase Storage 的 signed URL，但沒設定短過期時間 → 可被分享

**解決方案（後端）**：
```python
# backend/api/files.py

def get_file_url(file_id: str, user_id: str):
    # 1. 檢查權限
    file = db.query(EvidenceFile).filter(id=file_id).first()
    entry = db.query(Entry).filter(id=file.entry_id).first()

    # 2. 只有 entry 的擁有者、admin、審核者可下載
    if not (
        entry.owner_id == user_id or
        is_admin(user_id) or
        is_reviewer(user_id)
    ):
        raise HTTPException(403, "Forbidden")

    # 3. 生成短期 signed URL（60 秒）
    signed_url = storage.create_signed_url(
        file.file_path,
        expires_in=60
    )

    return signed_url
```

---

### 🔵 低風險 5：前端檔案大小驗證可繞過

**位置**：第 974-978 行（只有 accept 限制，沒有大小檢查）

**問題**：
- 攻擊者可以上傳 1GB 的檔案，耗盡 quota

**解決方案（前端）**：
```typescript
const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
  const file = e.target.files?.[0]
  if (!file) return

  // 檢查大小
  if (file.size > LAYOUT_CONSTANTS.MAX_FILE_SIZE_MB * 1024 * 1024) {
    setError(`檔案過大，請上傳小於 ${LAYOUT_CONSTANTS.MAX_FILE_SIZE_MB}MB 的檔案`)
    return
  }

  // 繼續上傳
}
```

**解決方案（後端更重要）**：見「高風險 1」

---

## 🌐 需要放到後端的邏輯

### 🔴 必須後端化 1：檔案驗證

**現狀**：只有前端 `accept` 屬性
**應該**：後端檢查 MIME type、檔案結構、大小
**見**：高風險 1

---

### 🔴 必須後端化 2：權限檢查

**現狀**：
```typescript
disabled={isReadOnly || approvalStatus.isApproved}
```
只在前端檢查，可以繞過

**應該**：
- 每個 API 呼叫都檢查權限（後端）
- 檢查：使用者 ID、entry 擁有者、admin 角色、審核狀態

---

### 🟡 建議後端化 3：資料驗證

**位置**：`prepareSubmissionData` 函數（第 196-205 行）

**現狀**：前端驗證記錄完整性
**應該**：後端也要驗證：
```python
def validate_diesel_records(records: List[Dict]):
    for record in records:
        # 1. 檢查日期格式
        if not re.match(r'^\d{4}-\d{2}-\d{2}$', record['date']):
            raise ValueError("Invalid date format")

        # 2. 檢查數量合理性
        if record['quantity'] <= 0 or record['quantity'] > 100000:
            raise ValueError("Invalid quantity")

        # 3. 檢查是否有佐證
        if not record.get('evidenceFiles'):
            raise ValueError("Evidence file required")

    return True
```

---

### 🟡 建議後端化 4：重複提交檢測

**現狀**：前端使用 `useSubmitGuard` 防止連點
**問題**：可以繞過前端防護

**應該**：後端加入 idempotency key：
```python
# 前端送出時帶上唯一 ID
const submissionId = generateUUID()
await submitData({ ...data, submissionId })

# 後端檢查
def submit_entry(data: Dict, submission_id: str):
    # 檢查是否已提交過
    existing = redis.get(f"submission:{submission_id}")
    if existing:
        raise HTTPException(409, "Duplicate submission")

    # 處理提交
    entry = create_entry(data)

    # 記錄提交（10 分鐘過期）
    redis.setex(f"submission:{submission_id}", 600, "1")

    return entry
```

---

## 📊 重構優先級建議

### Phase 1：提取可重用元件（1-2 天）
1. ✅ 提取 `fileTypeDetector.ts`
2. ✅ 提取 `FileTypeIcon.tsx`
3. ✅ 提取 `RecordInputRow.tsx`
4. ✅ 提取 `FileUploadArea.tsx`
5. ✅ 提取 `GroupListItem.tsx`

**完成後**：DieselPage 從 1559 行 → 約 900 行

---

### Phase 2：後端資安加強（1 天）
1. 🔒 檔案上傳驗證（MIME type + size + structure）
2. 🔒 檔案刪除權限檢查
3. 🔒 檔案下載權限 + signed URL
4. 🔒 API 權限檢查統一化

**完成後**：關閉主要資安漏洞

---

### Phase 3：重構剩餘結構（1 天）
1. 🔧 修正 `useEffect` cleanup
2. 🔧 拆分 JSX（4 個子元件）
3. 🔧 XSS 防護（檔案名消毒）

**完成後**：DieselPage 從 900 行 → 約 600 行，架構清晰

---

### Phase 4：模板化（0.5 天）
1. 📝 建立 `ENERGY_PAGE_TEMPLATE.md`
2. 📝 記錄如何複製 DieselPage 到其他頁面
3. 📝 更新 STRUCTURE_RULES.md

**完成後**：可以開始重構其他 13 個頁面

---

## 🎯 最終目標

### DieselPage 重構後架構
```typescript
// DieselPage.tsx (約 600 行)

import { FileTypeIcon } from '@/components/energy/FileTypeIcon'
import { RecordInputRow } from '@/components/energy/RecordInputRow'
import { FileUploadArea } from '@/components/energy/FileUploadArea'
import { GroupListItem } from '@/components/energy/GroupListItem'
import { getFileType } from '@/utils/energy/fileTypeDetector'

export default function DieselPage() {
  // 1. Hooks（200 行）
  const { entry, files, ... } = useEnergyData(...)
  const { handleSubmit, ... } = useMultiRecordSubmit(...)

  // 2. 狀態管理（50 行）
  const [currentEditingGroup, setCurrentEditingGroup] = useState(...)

  // 3. 事件處理（150 行）
  const handleSave = async () => { ... }

  // 4. JSX 結構（200 行）
  return (
    <SharedPageLayout>
      <DataInputSection />   {/* 使用 FileUploadArea + RecordInputRow */}
      <DataListSection />     {/* 使用 GroupListItem + FileTypeIcon */}
      <ReviewSection />
      <Modals />
    </SharedPageLayout>
  )
}
```

### 其他 13 個頁面
- 複製 DieselPage 模板
- 修改：pageKey、欄位名稱、驗證邏輯
- 重用：所有元件和工具

---

**最後更新**：2025-11-10
**建立者**：Linus Mode
**目的**：系統性重構 DieselPage，建立可重用架構