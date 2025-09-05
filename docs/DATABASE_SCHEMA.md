# 山椒魚組織型碳足跡盤查系統 - 資料庫架構文檔 v2.0

## 系統概述

本系統是一個基於 Supabase 的企業碳排放盤查和能源管理系統，支援範疇一、二、三的完整碳足跡追蹤作業。系統採用現代化的 JAMstack 架構，結合 Supabase Auth 認證和 Row Level Security (RLS) 進行權限控制。

### 技術架構
- **資料庫**: PostgreSQL (Supabase)
- **認證系統**: Supabase Auth
- **權限控制**: Row Level Security (RLS)
- **前端框架**: React + TypeScript + Vite
- **文檔生成時間**: 2025年9月5日 15:26:13 (UTC+8)

---

## 資料表結構概覽

| 表格名稱 | 類型 | 欄位數量 | 主鍵 | 用途 |
|---------|------|---------|------|------|
| profiles | 用戶管理表 | 11 | id | 管理系統用戶基本資料與權限設定 |
| energy_entries | 能源記錄表 | 16 | id | 儲存各類能源使用紀錄 (核心業務資料) |
| entry_files | 佐證檔案表 | 8 | id | 儲存能源記錄的佐證檔案 |
| form_drafts | 表單草稿表 | 5 | id | 自動儲存用戶填寫中的表單資料 |

---

## 詳細表格結構

### 1. profiles (用戶管理表)

**用途**: 管理系統用戶的基本資料、認證資訊與權限設定

| 欄位名稱 | 資料類型 | 約束 | 預設值 | 說明 |
|---------|---------|------|-------|------|
| id | UUID | PK, NOT NULL | gen_random_uuid() | 系統主鍵，對應 Supabase Auth user ID |
| display_name | TEXT | NULL | null | 用戶顯示名稱 |
| role | TEXT | NULL | 'user' | 用戶角色 (admin/user) |
| is_active | BOOLEAN | NOT NULL | true | 帳號啟用狀態 |
| created_at | TIMESTAMP WITH TIME ZONE | NULL | now() | 建立時間 |
| email | TEXT | NOT NULL | null | 登入信箱 |
| company | TEXT | NOT NULL | null | 所屬公司 |
| job_title | TEXT | NOT NULL | null | 職稱 |
| phone | TEXT | NOT NULL | null | 聯絡電話 |
| updated_at | TIMESTAMP WITH TIME ZONE | NULL | now() | 更新時間 |
| report_year | INTEGER | NOT NULL | 2025 | 填報年份 |

### 2. energy_entries (能源使用記錄表)

**用途**: 儲存各類能源使用紀錄，系統核心業務資料

| 欄位名稱 | 資料類型 | 約束 | 預設值 | 說明 |
|---------|---------|------|-------|------|
| id | UUID | PK, NOT NULL | gen_random_uuid() | 系統主鍵 |
| owner_id | UUID | FK, NOT NULL | null | 用戶ID，參考 profiles.id |
| period_start | DATE | NOT NULL | null | 期間開始日期 |
| period_end | DATE | NOT NULL | null | 期間結束日期 |
| category | TEXT | NOT NULL | null | 能源類別 |
| scope | SMALLINT | NULL | null | 碳排放範疇 (1,2,3) |
| unit | TEXT | NOT NULL | null | 使用單位 |
| amount | NUMERIC(18,6) | NOT NULL | null | 每月使用量 |
| notes | TEXT | NULL | null | 備註說明 |
| payload | JSONB | NULL | null | 詳細月份資料和計算參數 |
| created_at | TIMESTAMP WITH TIME ZONE | NULL | now() | 建立時間 |
| updated_at | TIMESTAMP WITH TIME ZONE | NULL | now() | 更新時間 |
| page_key | TEXT | NULL | null | 頁面識別碼 |
| period_year | INTEGER | NULL | null | 資料年份 |
| status | TEXT | NULL | 'submitted' | 狀態 (draft/submitted/approved/rejected) |
| total_amount | NUMERIC | NULL | null | 年度總使用量 |

**支援的能源類別**:
- **範疇一**: WD-40, 乙炔, 冷媒, 化糞池, 天然氣, 尿素, 柴油(發電機), 柴油, 汽油, 液化石油氣, 滅火器, 焊條
- **範疇二**: 外購電力
- **範疇三**: 員工通勤

### 3. entry_files (佐證檔案表)

**用途**: 儲存能源使用記錄的佐證檔案

| 欄位名稱 | 資料類型 | 約束 | 預設值 | 說明 |
|---------|---------|------|-------|------|
| id | UUID | PK, NOT NULL | gen_random_uuid() | 系統主鍵 |
| owner_id | UUID | FK, NOT NULL | null | 用戶ID，參考 profiles.id |
| entry_id | UUID | FK, NOT NULL | null | 能源記錄ID，參考 energy_entries.id |
| file_path | TEXT | NOT NULL | null | Supabase Storage 檔案路徑 |
| file_name | TEXT | NOT NULL | null | 原始檔案名稱 |
| mime_type | TEXT | NULL | null | 檔案類型 |
| file_size | BIGINT(64,0) | NULL | null | 檔案大小 (bytes) |
| created_at | TIMESTAMP WITH TIME ZONE | NOT NULL | now() | 上傳時間 |

**支援的檔案格式**: PDF, JPEG, JPG, PNG, GIF, WebP
**檔案大小限制**: 最大 50MB (52,428,800 bytes)

### 4. form_drafts (表單草稿表)

**用途**: 自動儲存用戶填寫中的表單資料，防止意外遺失

| 欄位名稱 | 資料類型 | 約束 | 預設值 | 說明 |
|---------|---------|------|-------|------|
| id | UUID | PK, NOT NULL | gen_random_uuid() | 系統主鍵 |
| owner_id | UUID | FK, NOT NULL | null | 用戶ID，參考 profiles.id |
| page_key | TEXT | NOT NULL | null | 頁面識別碼 (對應能源類別) |
| payload | JSONB | NOT NULL | null | 表單資料內容 |
| updated_at | TIMESTAMP WITH TIME ZONE | NOT NULL | now() | 最後更新時間 |

**支援的頁面識別碼**: wd40, acetylene, refrigerant, septic_tank, natural_gas, urea, diesel_generator, diesel, gasoline, lpg, fire_extinguisher, welding_rod, electricity, employee_commute

---

## 資料表關聯圖

```
profiles (用戶管理)
    ├── energy_entries (能源記錄) [1:N]
    │   └── entry_files (佐證檔案) [1:N]
    └── form_drafts (表單草稿) [1:N]
```

### 外鍵約束詳細

| 來源表 | 來源欄位 | 參考表 | 參考欄位 | 約束名稱 | 刪除規則 | 更新規則 |
|--------|---------|--------|---------|----------|----------|----------|
| energy_entries | owner_id | profiles | id | fk_energy_entries_owner | CASCADE | NO ACTION |
| entry_files | entry_id | energy_entries | id | fk_entry_files_entry | CASCADE | NO ACTION |
| entry_files | owner_id | profiles | id | fk_entry_files_owner | CASCADE | NO ACTION |
| form_drafts | owner_id | profiles | id | fk_form_drafts_owner | CASCADE | NO ACTION |

---

## 約束條件

### 主鍵約束
所有表格都使用 UUID 作為主鍵：
- `profiles_pkey`: profiles.id
- `energy_entries_pkey`: energy_entries.id  
- `entry_files_pkey`: entry_files.id
- `form_drafts_pkey`: form_drafts.id

### 唯一性約束
- `uq_profiles_email`: 確保 email 唯一性
- `uq_energy_entries_user_category_year`: 每用戶每類別每年只能有一筆記錄
- `uq_form_drafts_user_page`: 每用戶每頁面只能有一個草稿

### 檢查約束

**profiles 表**:
- `chk_profiles_role`: 角色只能是 'admin' 或 'user'

**energy_entries 表**:
- `chk_energy_entries_category`: 類別必須是預定義的能源類別
- `chk_energy_entries_scope`: 範疇只能是 1, 2, 或 3
- `chk_energy_entries_status`: 狀態只能是 'draft', 'submitted', 'approved', 'rejected'
- `chk_energy_entries_amount`: 使用量必須大於 0
- `chk_energy_entries_period_dates`: 開始日期必須小於等於結束日期

**entry_files 表**:
- `chk_entry_files_mime_type`: 檔案類型限制為 PDF 和圖片格式
- `chk_entry_files_size`: 檔案大小限制為 50MB 以內

**form_drafts 表**:
- `chk_form_drafts_page_key`: 頁面識別碼必須是有效的能源類別
- `chk_form_drafts_payload_json`: payload 必須是有效的 JSON 物件

---

## 索引策略

### 效能優化索引

**energy_entries 表**:
- `energy_entries_pkey`: 主鍵 (唯一)
- `idx_energy_entries_category`: 按類別查詢優化
- `idx_energy_entries_owner_year`: 用戶年份查詢優化
- `idx_energy_entries_status`: 狀態查詢優化
- `idx_energy_entries_scope`: 範疇查詢優化
- `uq_energy_entries_user_category_year`: 防重複約束 (唯一)

**entry_files 表**:
- `entry_files_pkey`: 主鍵 (唯一)
- `idx_entry_files_entry_id`: 關聯查詢優化
- `idx_entry_files_owner_id`: 用戶檔案查詢優化
- `idx_entry_files_created_at`: 時間查詢優化

**form_drafts 表**:
- `form_drafts_pkey`: 主鍵 (唯一)
- `idx_form_drafts_owner_id`: 用戶草稿查詢優化
- `idx_form_drafts_page_key`: 頁面查詢優化
- `idx_form_drafts_updated_at`: 時間查詢優化
- `uq_form_drafts_user_page`: 草稿唯一性約束 (唯一)

**profiles 表**:
- `profiles_pkey`: 主鍵 (唯一)
- `uq_profiles_email`: email 唯一性約束 (唯一)
- `idx_profiles_role`: 角色查詢優化
- `idx_profiles_is_active`: 啟用狀態查詢優化

---

## 權限控制 (RLS 政策)

### Row Level Security 狀態
所有表格都已啟用 RLS：
- profiles: ENABLED
- energy_entries: ENABLED
- entry_files: ENABLED
- form_drafts: ENABLED

### RLS 政策詳細

**profiles 表**:
- `profiles_select_own`: 用戶只能查看自己的資料 `(id = auth.uid())`
- `profiles_update_own`: 用戶只能更新自己的資料 `(id = auth.uid())`

**energy_entries 表**:
- `energy_entries_select_own`: 用戶查看自己的能源記錄 `(auth.uid() = owner_id)`
- `energy_entries_select_all_admin`: 管理員查看所有用戶記錄 (使用複雜查詢檢查管理員權限)
- `energy_entries_insert_own`: 用戶新增自己的記錄
- `energy_entries_update_own`: 用戶更新自己的記錄 `(auth.uid() = owner_id)`
- `energy_entries_delete_own`: 用戶刪除自己的記錄 `(auth.uid() = owner_id)`

**entry_files 表**:
- `entry_files_select_admin`: 管理員查看所有檔案 `is_admin()`
- `entry_files_insert_policy`: 用戶上傳檔案到自己的記錄
- `entry_files_update_policy`: 用戶更新自己的檔案 `(owner_id = auth.uid())`
- `entry_files_delete_policy`: 用戶刪除自己的檔案 `(owner_id = auth.uid())`

**form_drafts 表**:
- `form_drafts_select_admin`: 管理員查看所有草稿 `is_admin()`
- `form_drafts_insert_policy`: 用戶建立自己的草稿
- `form_drafts_update_policy`: 用戶更新自己的草稿 `(owner_id = auth.uid())`
- `form_drafts_delete_policy`: 用戶刪除自己的草稿 `(owner_id = auth.uid())`

---

## 自定義函數

### 權限檢查函數

**is_admin()**
- **回傳類型**: BOOLEAN
- **安全性**: SECURITY DEFINER
- **用途**: 檢查當前用戶是否為管理員
- **邏輯**: 查詢 profiles 表檢查用戶角色是否為 'admin'

### 認證整合函數

**handle_new_auth_user()**
- **回傳類型**: TRIGGER
- **安全性**: SECURITY DEFINER  
- **用途**: 當 Supabase Auth 建立新用戶時自動在 profiles 建立對應記錄
- **邏輯**: 插入用戶基本資料，預設角色為 'user'

### 資料管理函數

**upsert_form_draft(owner_id, page_key, payload)**
- **回傳類型**: UUID
- **安全性**: SECURITY DEFINER
- **用途**: 新增或更新表單草稿
- **邏輯**: 自動判斷 INSERT 或 UPDATE，回傳草稿 ID

### 觸發器函數

**update_updated_at_column()**
- **回傳類型**: TRIGGER
- **安全性**: SECURITY INVOKER
- **用途**: 自動更新 updated_at 欄位

**update_energy_entries_updated_at()**
- **回傳類型**: TRIGGER
- **安全性**: SECURITY INVOKER
- **用途**: 更新能源記錄時間戳並重置狀態為 'submitted'

**update_form_drafts_updated_at()**
- **回傳類型**: TRIGGER
- **安全性**: SECURITY INVOKER
- **用途**: 自動更新草稿時間戳

**prevent_duplicate_submission()**
- **回傳類型**: TRIGGER
- **安全性**: SECURITY INVOKER
- **用途**: 防止重複提交，自動覆蓋舊資料

---

## 觸發器配置

| 觸發器名稱 | 作用表 | 觸發時機 | 觸發事件 | 執行函數 |
|-----------|--------|----------|----------|----------|
| prevent_duplicate_submission | energy_entries | BEFORE | INSERT | prevent_duplicate_submission() |
| update_energy_entries_updated_at | energy_entries | BEFORE | UPDATE | update_energy_entries_updated_at() |
| update_form_drafts_updated_at | form_drafts | BEFORE | UPDATE | update_form_drafts_updated_at() |
| update_profiles_updated_at | profiles | BEFORE | UPDATE | update_updated_at_column() |

---

## 業務邏輯規則

### 1. 資料填寫規則
- **唯一性**: 每個用戶每年每類別只能有一筆能源記錄
- **覆蓋策略**: 用戶重複提交時自動覆蓋舊資料
- **狀態重置**: 資料更新時狀態自動重置為 'submitted'
- **日期驗證**: 期間開始日期必須小於等於結束日期
- **數量驗證**: 使用量必須大於 0

### 2. 檔案管理規則  
- **關聯關係**: 每筆能源記錄可上傳多個佐證檔案
- **格式限制**: 支援 PDF 和常見圖片格式
- **大小限制**: 單檔最大 50MB
- **CASCADE 刪除**: 刪除能源記錄時相關檔案一併刪除

### 3. 草稿功能規則
- **自動儲存**: 系統自動儲存用戶填寫中的資料
- **唯一性**: 每個類別維護一個草稿
- **持久化**: 提交後草稿保留供下次參考
- **覆蓋策略**: 新草稿自動覆蓋舊草稿

### 4. 權限管理規則
- **用戶權限**: 只能存取自己的資料
- **管理員權限**: 可以查看所有用戶資料
- **RLS 保護**: 所有操作都受 RLS 政策保護
- **認證整合**: 與 Supabase Auth 完全整合

---

## 資料統計

### 當前資料狀態 (2025-09-05)

| 表格 | 總記錄數 | 管理員數量 | 一般用戶數量 | 備註 |
|------|---------|------------|-------------|------|
| profiles | 2 | 1 | 1 | 系統已設定測試用戶 |
| energy_entries | 0 | 0 | 0 | 準備接收業務資料 |
| entry_files | 0 | - | - | 準備接收檔案上傳 |
| form_drafts | 0 | - | - | 準備接收草稿資料 |

---

## 系統維護注意事項

### 1. 效能監控
建議監控以下查詢的效能：
- 用戶年度資料總覽查詢
- 管理員跨用戶資料審核查詢
- 檔案關聯查詢和下載操作

### 2. 資料備份
- 定期備份核心業務資料
- 監控 Supabase Storage 使用量
- 建立資料恢復程序

### 3. 架構擴展
新增能源類別時需要更新：
- `chk_energy_entries_category` 約束條件
- `chk_form_drafts_page_key` 約束條件
- 前端對應的頁面和邏輯

### 4. 安全性維護
- 定期檢查 RLS 政策有效性
- 監控異常的資料存取模式
- 保持 Supabase 平台最新安全更新

---

## 文檔版本資訊

- **版本**: 2.0
- **建立日期**: 2025年9月5日
- **最後更新**: 2025年9月5日 15:26:13 (UTC+8)
- **資料庫架構狀態**: 生產就緒
- **系統開發**: 山椒魚永續工程股份有限公司

---

## 附錄

### A. 支援的能源類別完整列表

**範疇一 (直接排放)**:
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

**範疇二 (間接排放 - 能源)**:
1. 外購電力

**範疇三 (其他間接排放)**:
1. 員工通勤

### B. 狀態流程圖

```
用戶操作流程:
draft (草稿) → submitted (已提交) → approved/rejected (管理員審核)
                     ↑
                重複提交時重置
```

### C. 檔案格式支援

**支援格式**:
- PDF: application/pdf
- JPEG: image/jpeg, image/jpg
- PNG: image/png
- GIF: image/gif
- WebP: image/webp

**限制**:
- 單檔最大: 50MB
- 總儲存: 依 Supabase 方案限制