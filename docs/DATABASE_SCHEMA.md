```markdown
# 碳足跡盤查系統 - 資料庫架構文檔

---
title: 資料庫架構文檔
version: 2.3
last_updated: 2025-09-16
author: Database Architecture Team
---

## 系統概述

基於 Supabase 的企業碳排放盤查系統，支援完整的能源資料填報、審核和管理流程。

## 核心功能需求

### 1. 用戶管理系統

#### 用戶角色
- **管理員 (admin)**：可以建立用戶、審核資料、查看所有用戶資料
- **一般用戶 (user)**：只能管理自己的能源資料

#### 用戶資料結構
- email（登入帳號）
- display_name（顯示名稱）
- company（公司名稱）
- job_title（職稱）
- phone（聯絡電話）
- password（密碼）
- report_start_date（填寫區間開始日期）
- report_end_date（填寫區間結束日期）

#### 用戶建立流程
- 只有管理員可以建立新用戶
- 建立時需設定所有基本資料和密碼
- 需設定該用戶的填寫區間（例如：2024-12-04 到 2025-12-04）

### 2. 能源資料填報系統

#### 支援的能源類別（14種）
1. WD-40
2. 乙炔
3. 冷媒
4. 化糞池
5. 天然氣
6. 尿素
7. 柴油(發電機)
8. 柴油
9. 汽油
10. 液化石油氣
11. 滅火器
12. 焊條
13. 外購電力
14. 員工通勤

#### 資料填報規則
- 每個用戶每個類別每年只能有一筆已提交記錄
- 新填寫時頁面顯示空白表單
- 已提交的資料可以載入編輯並更新（覆蓋舊資料）
- 提交時直接儲存為 'submitted' 狀態
- 只在用戶點擊「提交」按鈕時才儲存到資料庫
- 使用量必須大於 0
- 期間開始日期不能晚於結束日期

#### 佐證檔案
- 用戶可上傳檔案作為佐證
- 檔案與能源記錄關聯
- 已提交的資料可編輯時，檔案也可增刪
- 儲存在 Supabase Storage

### 3. 審核工作流程

#### 資料狀態流程
```
submitted → approved / rejected
```

#### 狀態說明
- **submitted**：已提交，等待審核
- **approved**：已通過（記錄會被鎖定，變為唯讀）
- **rejected**：已退回（可修正後重新提交）

#### 審核功能
- 只有管理員可以審核
- 可以新增審核備註
- 已通過的記錄會自動鎖定，無法修改
- 記錄審核狀態（目前狀態儲存在 energy_entries.status）

### 4. 權限控制

#### 一般用戶權限
- 只能查看、編輯自己的資料
- 可以上傳、刪除佐證檔案
- 無法查看其他用戶資料
- 已通過的資料變為唯讀

#### 管理員權限
- 可以查看所有用戶資料
- 可以建立新用戶
- 可以審核所有提交的資料
- 可以查看完整的審核歷史
- 可以匯出報表

### 5. 報表匯出功能

#### 匯出內容
- 所有用戶填寫的能源使用資料
- 包含基本資料、使用量、狀態、審核資訊等

#### 匯出格式
- Excel 格式 (.xlsx)
- 只有管理員可以執行匯出

## 技術架構

### 資料庫結構（4張表）

#### profiles（用戶表）
- 儲存用戶基本資料和權限
- 包含填寫區間設定
- **新增：filling_config (JSONB) - 用戶填報設定**

##### filling_config 欄位說明
儲存用戶的個人化填報設定，格式為 JSONB：
```json
{
  "diesel_generator_mode": "refuel"  // 柴油發電機模式：refuel(加油) 或 test(測試)
}
```

預設值：`{"diesel_generator_mode": "refuel"}`

用途：
- 決定用戶在柴油發電機頁面看到的記錄類型
- 管理員在建立用戶時設定
- 未來可擴充其他類別的個人化設定

#### energy_entries（能源記錄表）
- 核心業務資料表
- 包含審核狀態管理
- 支援鎖定機制
- 狀態只有：submitted, approved, rejected
- 每個 owner_id + page_key + period_year 組合只有一筆（自動覆蓋）

##### 欄位說明
| 欄位名稱 | 資料類型 | 是否可空 | 預設值 | 說明 |
|---------|---------|---------|--------|------|
| id | uuid | NO | gen_random_uuid() | 主鍵 |
| owner_id | uuid | NO | - | 擁有者 ID |
| period_start | date | NO | - | 期間開始日期 |
| period_end | date | NO | - | 期間結束日期 |
| period_year | integer | NO | - | 填報年度 |
| category | text | NO | - | 能源類別名稱 |
| scope | smallint | YES | - | 範疇 (1/2/3) |
| unit | text | NO | - | 單位 |
| amount | numeric | NO | - | 總使用量 |
| total_amount | numeric | YES | - | 總碳排量 |
| notes | text | YES | - | 備註 |
| payload | jsonb | YES | - | 詳細資料 (月份數據等) |
| status | text | NO | 'submitted' | 狀態 |
| is_locked | boolean | YES | false | 是否鎖定 |
| reviewer_id | uuid | YES | - | 審核者 ID |
| review_notes | text | YES | - | 審核備註 |
| reviewed_at | timestamp | YES | - | 審核時間 |
| created_at | timestamp | YES | now() | 建立時間 |
| updated_at | timestamp | YES | now() | 更新時間 |
| page_key | text | YES | - | 頁面鍵值 |

#### entry_files（佐證檔案表）
- 檔案 metadata 管理
- 關聯到 energy_entries
- **2.3 版更新：新增 file_type 欄位**

##### 欄位說明
| 欄位名稱 | 資料類型 | 是否可空 | 預設值 | 說明 |
|---------|---------|---------|--------|------|
| id | uuid | NO | gen_random_uuid() | 主鍵 |
| owner_id | uuid | NO | - | 擁有者 ID |
| entry_id | uuid | NO | - | 關聯的能源記錄 ID |
| file_path | text | NO | - | Storage 中的檔案路徑 |
| file_name | text | NO | - | 原始檔案名稱 |
| mime_type | text | YES | - | 檔案 MIME 類型 |
| file_size | bigint | YES | - | 檔案大小（bytes） |
| created_at | timestamp with time zone | NO | now() | 建立時間 |
| month | integer | YES | - | 月份（1-12），非月份檔案為 NULL |
| page_key | text | YES | - | 能源類別頁面鍵值 |
| file_type | varchar(20) | NO | 'usage_evidence' | 檔案類型（v2.3 新增） |

##### file_type 欄位說明（v2.3 新增）
- `msds`: MSDS 安全資料表
- `usage_evidence`: 月份使用證明
- `annual_evidence`: 年度佐證（如化糞池）
- `other`: 其他類型檔案

##### 檔案類型使用邏輯
- MSDS 檔案：`file_type = 'msds'`，`month = NULL`
- 月份使用證明：`file_type = 'usage_evidence'`，`month = 1-12`
- 年度佐證：`file_type = 'annual_evidence'`，`month = NULL`
- 其他檔案：`file_type = 'other'`

##### 約束條件
- `check_file_type`: file_type 必須為 ('msds', 'usage_evidence', 'annual_evidence', 'other') 其中之一

#### review_history（審核歷史表）
- 狀態變更記錄（觸發器自動記錄）
- 審計追蹤功能
- **RLS 政策**：
  - `Allow insert for review history`：允許認證用戶插入（觸發器需要）
  - `history_admin_only`：只有管理員可以查看歷史記錄

### 安全性設計

#### Row Level Security (RLS)
- 確保用戶只能存取自己的資料
- 管理員有特殊權限查看所有資料
- review_history 表允許觸發器寫入，但只有管理員能查看

#### 資料完整性
- 外鍵約束確保資料一致性
- 檢查約束確保資料有效性
- 唯一約束防止重複提交

### 自動化機制

#### 觸發器功能
- `update_entries_timestamp`：自動更新時間戳
- `log_entry_status_changes`：記錄狀態變更到 review_history
- `prevent_duplicate_entries`：防止重複提交
- 通過後自動鎖定

## 移除的功能

### 草稿功能（完全移除）
- **不再有 draft 狀態**
- **不自動儲存任何資料**
- **不自動載入未提交的資料**
- **每次進入頁面都是空白表單（除非有已提交的記錄）**

### 審核中狀態（簡化流程）
- **移除 under_review 狀態**
- **簡化為：提交 → 通過/退回**

## 前端狀態顯示

### 用戶端狀態指示（純前端判斷）
- **空白**：灰色圓點 + "請開始填寫資料"
- **填寫中**：黃色脈動圓點 + "請完成填寫並提交"（有資料但未提交）
- **已提交**：藍色圓點 + "已提交待審"
- **已通過**：綠色圓點 + "審核通過（已鎖定）"
- **已退回**：紅色圓點 + "已退回 - 請修正問題"
- **訂正中**：橘色脈動圓點 + "訂正中 - 請完成修改後重新提交"（退回後有修改）

## 測試用戶

### 管理員
- Email: admin@test.com
- 姓名: Timmy
- 公司: 山椒魚永續工程股份有限公司
- 角色: admin

### 一般用戶
- Email: user@test.com
- 姓名: Winnie
- 公司: 三媽臭臭鍋
- 角色: user

## 成功標準

1. **功能完整性**：所有填報、審核、管理功能正常運作
2. **資料安全性**：權限控制正確，用戶無法存取他人資料
3. **系統穩定性**：無資料衝突、無重複提交問題
4. **使用體驗**：操作流程清楚直觀，狀態顯示明確
5. **效能表現**：頁面載入快速，API 回應及時
6. **擴展性**：架構支援未來功能擴展

## 未來優化考量

### review_history 表
- 目前保留用於審計追蹤
- 未來可考慮移除以簡化系統（只保留當前狀態）
- 或定期清理舊記錄以節省儲存空間

## 最新功能更新

### 檔案編輯功能
- 已提交的記錄支援檔案增刪改操作
- 檔案可重新關聯到不同的 entry_id
- 支援錯誤恢復機制 (Promise.allSettled)

### API 功能增強
- 新增 `getEntryFiles(entry_id)` 函數
- 新增 `deleteEvidenceFile(file_id)` 函數  
- 新增 `updateFileEntryAssociation(file_id, entry_id)` 函數
- 增強錯誤處理和診斷工具

## 版本歷史

| 版本 | 日期 | 變更內容 | 作者 |
|------|------|----------|------|
| 2.3 | 2025-09-16 | 新增 file_type 欄位，改善檔案分類機制，支援年度佐證類型 | System |
| 2.2 | 2025-09-12 | 新增檔案編輯功能，移除 draft 狀態 | System |
| 2.1 | 2025-09-11 | 修正 review_history RLS 政策 | System |
| 2.0 | 2025-09-10 | 狀態簡化，更新資料表結構 | System |
| 1.0 | 2025-09-09 | 初始資料庫架構設計 | System |

---
**最後更新**: 2025-09-16  
**狀態**: 已部署  
**維護團隊**: 提米林