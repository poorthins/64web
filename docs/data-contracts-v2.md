# 資料合約 v2（統一版）

> 前後端 API 的統一資料格式，所有頁面共用同一套規則

---

## 🎯 核心設計理念

### 統一心智模型

**所有頁面的 API 呼叫都長一樣：**

```typescript
const response = await submitEntry({
  page_key: 'diesel',          // 哪一頁
  period_year: 2024,           // 哪一年
  status: 'submitted',         // 要幹嘛（暫存/提交）
  payload: { ... },            // 這頁的資料（唯一不同的部分）
  notes: '備註'                // 選填
})
```

**所有回應都長一樣：**

```typescript
if (response.success) {
  console.log(response.entry_id)   // 成功 → 拿 entry_id
  console.log(response.data)       // 拿額外資料（如碳排放計算結果）
} else {
  console.error(response.error)    // 失敗 → 看錯誤訊息
}
```

**這樣前端只要記一套邏輯，適用所有 16 個頁面。**

---

## 📦 統一基礎結構

### Base Request（所有頁面共用）

```typescript
interface BaseSubmitRequest<TPayload = any> {
  page_key: string                    // 頁面識別（'diesel', 'acetylene', 'electricity', ...）
  period_year: number                 // 填報年度（2024）
  status: 'draft' | 'submitted'       // draft = 暫存，submitted = 提交審核
  notes?: string                      // 備註（最多 1000 字，選填）
  payload: TPayload                   // 這一頁的資料（每頁不同）
}
```

**驗證規則（所有頁面通用）：**
- `page_key` 必須是有效的能源類型（後端有白名單）
- `period_year` 在 2020-2100 之間
- `status` 只能是 'draft' 或 'submitted'
- `notes` 最多 1000 字

---

### Base Response（所有頁面共用）

```typescript
interface BaseResponse<TData = any> {
  success: boolean                    // 成功/失敗
  entry_id?: string                   // 條目 ID（成功時必有）
  data?: TData                        // 額外資料（選填）
  error?: string                      // 錯誤訊息（失敗時有）
  details?: any                       // 詳細錯誤（開發用，生產環境可隱藏）
}
```

**前端處理方式：**
```typescript
const res = await submitEntry(request)

if (res.success) {
  // 成功
  setCurrentEntryId(res.entry_id!)
  if (res.data?.carbon_emission) {
    showCarbonResult(res.data.carbon_emission)
  }
} else {
  // 失敗
  showError(res.error || '未知錯誤')
}
```

---

## 📦 Type A：多記錄型

### 適用頁面（9 個）
RefrigerantPage, SF6Page, DieselStationarySourcesPage, DieselPage, GasolinePage, GeneratorTestPage, SepticTankPage, UreaPage, WD40Page

---

### Payload 結構

```typescript
interface TypeAPayload {
  unit: string                        // 單位（'公升', '公斤', 't-CO2e'）

  // 主要資料：記錄陣列
  records: Array<{
    id: string                        // ⭐ 記錄 ID（前端生成，UUID）
    groupId: string | null            // 所屬群組 ID（有群組的頁面用）
    date: string                      // 日期（ISO 8601: '2024-01-15'）
    quantity: number                  // 數量（>= 0）

    // 以下視頁面需求選用
    deviceType?: string               // 設備類型
    deviceName?: string               // 設備名稱
    location?: string                 // 位置
    specification?: string            // 規格
    capacity?: number                 // 容量
  }>

  // 額外資料（選用）
  groups?: Array<{                    // 群組資訊
    groupId: string
    groupName: string
    deviceType?: string
  }>

  devices?: Array<{                   // 設備資訊（設備型頁面用）
    deviceId: string
    deviceName: string
    deviceType: string
    capacity: number
    installDate: string
  }>

  specifications?: Array<{            // 規格資訊（WD40Page 用）
    specId: string
    productName: string
    unit: string
  }>
}

// 完整的 Type A Request
type TypeASubmitRequest = BaseSubmitRequest<TypeAPayload>
```

---

### Response Data

```typescript
interface TypeAResponseData {
  carbon_emission?: {
    total: number                     // 總排放量（kgCO2e）
    monthly: MonthlyMap               // 每月排放量
    emission_factor: number           // 排放係數
    formula: string                   // 計算公式（如 "柴油 × 2.6068"）
  }
}

type TypeASubmitResponse = BaseResponse<TypeAResponseData>
```

---

### 完整範例

```typescript
// 前端提交
const request: TypeASubmitRequest = {
  page_key: 'diesel',
  period_year: 2024,
  status: 'submitted',
  notes: '車隊柴油使用記錄',

  payload: {
    unit: '公升',
    records: [
      {
        id: 'rec-uuid-001',
        groupId: 'group-1',
        date: '2024-01-15',
        quantity: 100,
        deviceType: '貨車',
        deviceName: 'ABC-1234'
      },
      {
        id: 'rec-uuid-002',
        groupId: 'group-1',
        date: '2024-02-10',
        quantity: 150,
        deviceType: '貨車',
        deviceName: 'ABC-1234'
      }
    ],
    groups: [
      { groupId: 'group-1', groupName: '車隊 A', deviceType: '貨車' }
    ]
  }
}

// 後端回應
const response: TypeASubmitResponse = {
  success: true,
  entry_id: 'entry-uuid-123',
  data: {
    carbon_emission: {
      total: 652.17,
      monthly: { '1': 260.68, '2': 391.02 },
      emission_factor: 2.6068,
      formula: '柴油 × 2.6068'
    }
  }
}
```

---

## 📦 Type B：單月型

### 適用頁面（5 個）
AcetylenePage, LPGPage, WeldingRodPage, FireExtinguisherPage, NaturalGasPage

---

### Payload 結構

```typescript
// 月份鍵值定義（嚴格限制 1-12）
type MonthKey = '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | '11' | '12'
type MonthlyMap = Partial<Record<MonthKey, number>>

interface TypeBPayload {
  unit: string                        // 單位（'公斤', '瓶', 'm³'）

  // 主要資料：12 個月份
  monthly: MonthlyMap                 // { '1': 10.5, '2': 15.0, ... }

  // 額外資料（視頁面需求）
  msds?: Array<{                      // MSDS 資料（WeldingRodPage 用）
    msdsId: string
    productName: string
    manufacturer: string
    uploadDate: string
    fileId: string
  }>

  meters?: Array<{                    // 電錶資料（NaturalGasPage 用）
    meterId: string
    meterName: string
    location: string
    monthly: MonthlyMap               // 該電錶的 12 個月份
    heatValues?: MonthlyMap           // 熱值
  }>

  inspectionRecords?: Array<{         // 檢修記錄（FireExtinguisherPage 用）
    recordId: string
    inspectionDate: string
    equipmentCount: number
    co2Emission: number
  }>
}

// 完整的 Type B Request
type TypeBSubmitRequest = BaseSubmitRequest<TypeBPayload>
```

**驗證規則：**
- `monthly` 的 key 必須是 '1' 到 '12'
- `monthly` 的 value 必須 >= 0
- 提交時至少要有 1 個月份有資料（draft 時可全空）

---

### Response Data

```typescript
interface TypeBResponseData {
  carbon_emission?: {
    total: number
    monthly: MonthlyMap
    emission_factor: number
    formula: string
  }
}

type TypeBSubmitResponse = BaseResponse<TypeBResponseData>
```

---

### 完整範例

```typescript
// 前端提交
const request: TypeBSubmitRequest = {
  page_key: 'acetylene',
  period_year: 2024,
  status: 'submitted',

  payload: {
    unit: '公斤',
    monthly: {
      '1': 10.5,
      '2': 15.0,
      '3': 20.5
    }
  }
}

// 後端回應（永遠回傳 12 個月，沒填的是 0）
const response: TypeBSubmitResponse = {
  success: true,
  entry_id: 'entry-uuid-456',
  data: {
    carbon_emission: {
      total: 123.45,
      monthly: {
        '1': 28.14, '2': 40.20, '3': 54.93,
        '4': 0, '5': 0, '6': 0,
        '7': 0, '8': 0, '9': 0,
        '10': 0, '11': 0, '12': 0
      },
      emission_factor: 2.68,
      formula: '乙炔 × 2.68'
    }
  }
}
```

---

## 📦 Type C：特殊型

### C1: ElectricityBillPage

```typescript
interface ElectricityPayload {
  meters: Array<{
    meterId: string                   // 電錶 ID
    meterName: string
    meterNumber: string

    bills: Array<{
      billId: string
      startDate: string               // ISO 8601
      endDate: string
      usage: number                   // 度數
      amount: number                  // 金額（整數）
      peakUsage?: number              // 尖峰
      offPeakUsage?: number           // 離峰
      fileIds?: string[]              // 帳單檔案 ID
    }>
  }>
}

type ElectricitySubmitRequest = BaseSubmitRequest<ElectricityPayload>

interface ElectricityResponseData {
  carbon_emission: {
    total: number
    byMeter: Record<string, number>   // 每個電錶的排放量
    emission_factor: number
  }
}

type ElectricitySubmitResponse = BaseResponse<ElectricityResponseData>
```

---

### C2: CommuteePage

```typescript
interface CommutePayload {
  file: File                          // Excel 檔案
}

type CommuteSubmitRequest = BaseSubmitRequest<CommutePayload>

interface CommuteResponseData {
  parsed_data: {
    total_records: number
    total_emission: number
  }
}

type CommuteSubmitResponse = BaseResponse<CommuteResponseData>
```

---

## 📎 檔案上傳（統一格式）

### File Upload Request

```typescript
interface FileUploadRequest {
  // 基礎資訊
  page_key: string                    // 'diesel'
  period_year: number                 // 2024
  file_type: FileType                 // 檔案類型
  standard: '64' | '67'               // 標準（預設 '64'）
  file: File                          // 檔案物件

  // 綁定資訊（視情況填）
  entry_id: string                    // ⭐ 必填：綁定的 entry
  record_id?: string                  // Type A 用：綁定到哪筆 record
  month?: number                      // Type B 用：綁定到哪個月份（1-12）
}

type FileType =
  | 'usage_evidence'                  // 使用證明
  | 'msds'                            // MSDS/SDS
  | 'bill'                            // 帳單
  | 'nameplate_evidence'              // 銘牌
  | 'heat_value_evidence'             // 熱值證明
  | 'annual_evidence'                 // 年度證明
  | 'other'                           // 其他
```

### File Upload Response

```typescript
interface FileUploadResponse {
  success: boolean
  file_id: string                     // 檔案 ID
  file_path: string                   // Storage 路徑
  file_name: string                   // 檔案名稱
  file_size: number                   // 檔案大小（bytes）
  error?: string                      // 錯誤訊息
}
```

### 檔案限制

- **大小上限**：10 MB
- **允許格式**：jpg, png, pdf, xlsx, docx, zip
- **檔名規則**：自動清理特殊字元

---

## 🔐 通用規則

### HTTP 狀態碼

| 狀態碼 | 意義 | 使用時機 |
|--------|------|---------|
| 200 | 成功 | 提交/更新成功 |
| 400 | 請求錯誤 | 資料格式錯誤、驗證失敗 |
| 401 | 未授權 | JWT token 無效或過期 |
| 403 | 禁止存取 | 沒有權限操作此頁面 |
| 404 | 找不到 | entry_id 不存在 |
| 500 | 伺服器錯誤 | 後端邏輯錯誤 |

---

### 日期格式（ISO 8601）

```typescript
// 日期
date: '2024-01-15'

// 日期時間
datetime: '2024-01-15T10:30:00Z'
```

---

### 數值精度

- 數量（quantity）：最多 2 位小數
- 排放量（emission）：最多 2 位小數
- 金額（amount）：整數

---

### ID 生成規則

**前端負責生成：**
- `record_id`：記錄 ID（UUID v4）
- `group_id`：群組 ID（UUID v4）
- `device_id`：設備 ID（UUID v4）

**後端負責生成：**
- `entry_id`：條目 ID（UUID v4）
- `file_id`：檔案 ID（UUID v4）

**為什麼這樣分？**
- 前端生成 record_id：方便在提交前就建立檔案 mapping
- 後端生成 entry_id：確保全局唯一性，且方便 transaction 管理

---

## 🎯 重構時的使用方式

### Step 1：確認頁面類型

打開 [`page-classification.md`](page-classification.md)，找到你要重構的頁面屬於哪一類。

### Step 2：複製對應的 TypeScript interface

```typescript
// Type A 頁面
type MyPageRequest = BaseSubmitRequest<TypeAPayload>
type MyPageResponse = BaseResponse<TypeAResponseData>

// Type B 頁面
type MyPageRequest = BaseSubmitRequest<TypeBPayload>
type MyPageResponse = BaseResponse<TypeBResponseData>
```

### Step 3：組資料

```typescript
// Type A 範例
const request: MyPageRequest = {
  page_key: 'diesel',
  period_year: 2024,
  status: 'submitted',
  payload: {
    unit: '公升',
    records: dieselRecords,
    groups: dieselGroups
  }
}

// 提交
const response = await entryAPI.submitEnergyEntry(request)
```

### Step 4：上傳檔案

```typescript
// Type A：綁定到 record
for (const record of records) {
  if (record.memoryFiles?.length > 0) {
    for (const file of record.memoryFiles) {
      await fileAPI.uploadEvidenceFile({
        page_key: 'diesel',
        period_year: 2024,
        file_type: 'usage_evidence',
        entry_id: response.entry_id,
        record_id: record.id,
        month: extractMonth(record.date),
        standard: '64',
        file: file
      })
    }
  }
}
```

---

## ✅ 驗證清單

重構時確保：

**前端：**
- [ ] 資料格式符合對應的 Type
- [ ] 所有必填欄位都有值
- [ ] `record_id` 使用 UUID v4
- [ ] 數值 >= 0
- [ ] 日期格式是 ISO 8601

**後端：**
- [ ] 使用 Pydantic 驗證輸入
- [ ] 回傳格式符合 `BaseResponse`
- [ ] 錯誤訊息清楚
- [ ] HTTP 狀態碼正確
- [ ] 生成 UUID v4 的 `entry_id`

---

## 🔄 版本歷史

- v2.0 (2025-01-XX) - 統一版，所有 Type 共用 Base 結構
- v1.0 (2025-01-XX) - 初版，Type A/B/C 各自定義
