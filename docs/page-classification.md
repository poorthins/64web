# 頁面分類與資料結構分析

> 16 個能源頁面的完整分類，基於佐證檔案關係

---

## 🎯 分類原則

**核心概念：根據「佐證檔案與資料的關係」分類**

不再用 UI 外觀或複雜度分類，改用業務邏輯的本質：

- **Type 1**：一筆佐證 → 一筆資料（設備型）
- **Type 2**：一筆佐證 → 多筆資料（群組型）
- **Type 3**：先設定規格 → 一筆佐證 → 多筆使用記錄（規格型）
- **Type 4**：先設定電錶 → 一筆佐證 → 一個帳單（電錶型）
- **Type 5**：Excel 上傳下載區（特殊型）

---

## 📊 Type 1：一筆佐證 → 一筆資料（3 頁）

### 業務邏輯

每個設備的佐證檔案對應一筆記錄，1:1 關係。

### 頁面清單

| # | 頁面名稱 | 資料特徵 | 複雜度 |
|---|---------|---------|--------|
| 1 | RefrigerantPage | 冷媒設備，每設備一筆補充記錄 | 🟢 簡單 |
| 2 | SF6Page | SF6 設備，每設備一筆補充記錄 | 🟢 簡單 |
| 3 | GeneratorTestPage | 發電機測試，每次測試一筆記錄 | 🟢 簡單 |

### 資料結構

```typescript
interface Type1SubmitRequest {
  page_key: string
  period_year: number
  status: 'draft' | 'submitted'
  notes?: string

  payload: {
    records: Array<{
      id: string
      device_id: string          // 設備 ID
      device_name: string         // 設備名稱
      date: string                // 補充日期
      quantity: number            // 數量
      evidence_file?: File        // 佐證檔案（1:1）
    }>
  }
}
```

### 重構策略

- 最簡單，從 RefrigerantPage 開始
- 建立 Type 1 SOP
- 其他兩頁直接複製 SOP

---

## 📊 Type 2：一筆佐證 → 多筆資料（5 頁）

### 業務邏輯

同一個群組（例如一台車、一個設施）有多筆使用記錄，共用一個佐證檔案。

### 頁面清單

| # | 頁面名稱 | 資料特徵 | 複雜度 |
|---|---------|---------|--------|
| 4 | DieselPage | 柴油移動源，車輛群組，每群組多筆加油記錄 | 🟡 中等 |
| 5 | DieselStationarySourcesPage | 柴油固定源，設備群組 | 🟡 中等 |
| 6 | UreaPage | 尿素，設備群組，需要 SDS 管理 | 🟡 中等 |
| 7 | SepticTankPage | 化糞池，設施群組 | 🟡 中等 |
| 8 | GasolinePage | 汽油，車輛群組，每群組多筆加油記錄 | 🟡 中等 |

### 資料結構

```typescript
interface Type2SubmitRequest {
  page_key: string
  period_year: number
  status: 'draft' | 'submitted'
  notes?: string

  payload: {
    groups: Array<{
      group_id: string
      group_name: string         // 例如：車牌號碼
      records: Array<{
        id: string
        date: string             // 使用日期
        quantity: number         // 數量
      }>
      evidence_file?: File       // 群組佐證檔案（1:多）
    }>
  }
}
```

### 重構策略

- 從 DieselPage 開始（最典型）
- 建立 Type 2 SOP
- GasolinePage 幾乎一模一樣

---

## 📊 Type 3：先設定規格 → 一筆佐證 → 多筆使用記錄（5 頁）

### 業務邏輯

兩階段流程：
1. **定義產品規格**（例如：WD40 的型號、成分）
2. **記錄使用量**（哪個月用了多少，佐證檔案是進貨單）

### 頁面清單

| # | 頁面名稱 | 資料特徵 | 複雜度 |
|---|---------|---------|--------|
| 9 | LPGPage | 液化石油氣，先定義鋼瓶規格，再記錄使用 | 🔴 複雜 |
| 10 | WD40Page | WD40，先定義產品規格，再記錄使用 | 🟡 中等 |
| 11 | AcetylenePage | 乙炔，先定義鋼瓶規格，再記錄使用 | 🔴 複雜 |
| 12 | WeldingRodPage | 焊條，先定義 MSDS，再記錄使用 | 🔴 複雜 |
| 13 | FireExtinguisherPage | 滅火器，先定義設備規格，再記錄檢修 | 🟡 中等 |

### 資料結構

```typescript
interface Type3SubmitRequest {
  page_key: string
  period_year: number
  status: 'draft' | 'submitted'
  notes?: string

  payload: {
    // 階段 1：定義規格（一次性）
    specifications: Array<{
      spec_id: string
      spec_name: string          // 產品型號
      composition?: string       // 成分
      gwp?: number              // GWP 值
    }>

    // 階段 2：使用記錄
    usage_records: Array<{
      id: string
      spec_id: string            // 對應哪個規格
      month: number              // 哪個月
      quantity: number           // 使用量
    }>

    evidence_file?: File         // 進貨單（佐證）
  }
}
```

### 重構策略

- 從 WD40Page 開始（已經有 useWD40SpecManager）
- Type 3 比較複雜，需要兩個 API
- 建立規格管理 SOP

---

## 📊 Type 4：先設定電錶 → 一筆佐證 → 一個帳單（2 頁）

### 業務邏輯

兩階段流程：
1. **定義電錶/瓦斯錶**（一次性設定）
2. **上傳帳單**（每個月的帳單，一筆佐證對一筆帳單）

### 頁面清單

| # | 頁面名稱 | 資料特徵 | 複雜度 |
|---|---------|---------|--------|
| 14 | NaturalGasPage | 天然氣，多瓦斯錶，每錶每月一張帳單 | 🔴 極複雜 |
| 15 | ElectricityBillPage | 外購電力，多電錶，每錶多張帳單 | 🔴 極複雜 |

### 資料結構

```typescript
interface Type4SubmitRequest {
  page_key: string
  period_year: number
  status: 'draft' | 'submitted'
  notes?: string

  payload: {
    // 階段 1：定義電錶（一次性）
    meters: Array<{
      meter_id: string
      meter_name: string         // 電錶名稱
      location?: string          // 位置
    }>

    // 階段 2：帳單記錄
    bills: Array<{
      id: string
      meter_id: string           // 對應哪個電錶
      start_date: string         // 起始日期
      end_date: string           // 結束日期
      usage: number              // 度數
      amount: number             // 金額
      evidence_file: File        // 帳單佐證（1:1）
    }>
  }
}
```

### 重構策略

- 最複雜，留到最後
- 保留 DocumentHandler 邏輯
- 只改提交 API 部分

---

## 📊 Type 5：Excel 上傳下載區（1 頁）

### 業務邏輯

直接上傳 Excel，後端解析。

### 頁面清單

| # | 頁面名稱 | 資料特徵 | 複雜度 |
|---|---------|---------|--------|
| 16 | CommuteePage | 員工通勤，上傳 Excel 範本 | 🟢 最簡單 |

### 資料結構

```typescript
interface Type5SubmitRequest {
  page_key: 'employee_commute'
  period_year: number
  status: 'draft' | 'submitted'
  excel_file: File               // Excel 檔案
}
```

### 重構策略

- 超簡單，30 分鐘搞定
- 直接用 `fileAPI.uploadEvidenceFile()`

---

## 📋 重構優先順序

### 批次 1：Type 1（建立信心）- 1 天

| 順序 | 頁面 | 原因 |
|-----|------|------|
| 1 | RefrigerantPage | 最簡單，建立 Type 1 SOP |
| 2 | SF6Page | 驗證 SOP 可複製 |
| 3 | GeneratorTestPage | Type 1 完成 |

**目標：** 建立 Type 1 SOP

---

### 批次 2：Type 2（鞏固）- 2 天

| 順序 | 頁面 | 原因 |
|-----|------|------|
| 4 | DieselPage | 建立 Type 2 SOP |
| 5 | GasolinePage | 和 Diesel 幾乎一樣 |
| 6 | DieselStationarySourcesPage | 固定源 |
| 7 | SepticTankPage | 設施群組 |
| 8 | UreaPage | 有 SDS 但不複雜 |

**目標：** Type 2 全部完成

---

### 批次 3：Type 5（先解決最簡單）- 0.5 天

| 順序 | 頁面 | 原因 |
|-----|------|------|
| 9 | CommuteePage | 太簡單，30 分鐘 |

**目標：** 快速勝利

---

### 批次 4：Type 3（新挑戰）- 3 天

| 順序 | 頁面 | 原因 |
|-----|------|------|
| 10 | WD40Page | 已有 spec manager，建立 Type 3 SOP |
| 11 | FireExtinguisherPage | 檢修記錄 |
| 12 | AcetylenePage | 鋼瓶規格 |
| 13 | LPGPage | 液化石油氣 |
| 14 | WeldingRodPage | MSDS 管理 |

**目標：** Type 3 全部完成

---

### 批次 5：Type 4（最後挑戰）- 2 天

| 順序 | 頁面 | 原因 |
|-----|------|------|
| 15 | NaturalGasPage | 瓦斯錶 + 帳單 |
| 16 | ElectricityBillPage | 最複雜，最後處理 |

**目標：** 全部完成

---

## ⏱️ 總時間預估

| 批次 | 頁面數 | 預計時間 |
|------|--------|---------|
| 批次 1 (Type 1) | 3 頁 | 1 天 |
| 批次 2 (Type 2) | 5 頁 | 2 天 |
| 批次 3 (Type 5) | 1 頁 | 0.5 天 |
| 批次 4 (Type 3) | 5 頁 | 3 天 |
| 批次 5 (Type 4) | 2 頁 | 2 天 |
| **總計** | **16 頁** | **約 8.5 天** |

---

## 🎯 成功標準

### 每個 Type 完成後必須滿足：

**Type 1-4：**
- ✅ 全部改用 `entryAPI.submitEnergyEntry()`
- ✅ 移除所有舊 hooks
- ✅ 單元測試通過
- ✅ 程式碼減少 20-30%

**Type 5：**
- ✅ 直接用 `fileAPI.uploadEvidenceFile()`
- ✅ 超簡化

---

## 📚 下一步

1. ✅ 完成分類（本文件）
2. ⏳ 更新 PROGRESS.md
3. ⏳ 更新 README.md
4. ⏳ 開始重構 RefrigerantPage
