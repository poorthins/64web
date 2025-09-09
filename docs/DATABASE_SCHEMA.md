# 山椒魚組織型碳足跡盤查系統 - 資料庫架構文檔 v4.0

## 系統概述

本系統是一個基於 Supabase 的企業碳排放盤查和能源管理系統，支援範疇一、二、三的完整碳足跡追蹤作業。系統採用現代化的 JAMstack 架構，結合 Supabase Auth 認證和 Row Level Security (RLS) 進行權限控制，並包含完整的批閱審核流程。

### 技術架構
- **資料庫**: PostgreSQL (Supabase)
- **認證系統**: Supabase Auth
- **權限控制**: Row Level Security (RLS)
- **前端框架**: React + TypeScript + Vite
- **批閱系統**: 單表設計的審核工作流程
- **API 設計**: 函數式 API，取代視圖查詢
- **文檔更新時間**: 2025年9月9日

---

## 系統架構優化歷程

**v4.0 重大改進**：
- 從複雜的雙表同步架構簡化為穩定的單表設計
- 移除 `entry_reviews` 表，所有批閱功能整合到 `energy_entries`
- 移除所有視圖，改用安全的函數 API
- 解決了關聯查詢錯誤和無限循環觸發器問題
- 符合 Supabase 安全最佳實踐

---

## 資料表結構概覽

| 表格名稱 | 類型 | 欄位數量 | 主鍵 | 用途 |
|---------|------|---------|------|------|
| profiles | 用戶管理表 | 11 | id | 管理系統用戶基本資料與權限設定 |
| energy_entries | 能源記錄表 | 20 | id | 儲存各類能源使用紀錄 (核心業務資料，包含批閱功能) |
| entry_files | 佐證檔案表 | 8 | id | 儲存能源記錄的佐證檔案 |
| form_drafts | 表單草稿表 | 5 | id | 自動儲存用戶填寫中的表單資料 |
| review_history | 批閱歷史表 | 7 | id | 記錄完整的審核歷史軌跡 |

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

### 2. energy_entries (能源使用記錄表) **[核心表格]**

**用途**: 儲存各類能源使用紀錄，系統核心業務資料，整合所有批閱功能

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
| status | TEXT | NULL | 'submitted' | 狀態 (draft/submitted/under_review/approved/rejected) |
| total_amount | NUMERIC | NULL | null | 年度總使用量 |
| reviewer_id | UUID | FK, NULL | null | 批閱者ID，參考 profiles.id |
| review_notes | TEXT | NULL | null | 批閱備註 |
| reviewed_at | TIMESTAMP WITH TIME ZONE | NULL | null | 批閱時間 |
| is_locked | BOOLEAN | NULL | false | 記錄鎖定狀態（已批准的記錄會被鎖定） |

**支援的能源類別**:
- **範疇一**: WD-40, 乙炔, 冷媒, 化糞池, 天然氣, 尿素, 柴油(發電機), 柴油, 汽油, 液化石油氣, 滅火器, 焊條
- **範疇二**: 外購電力
- **範疇三**: 員工通勤

**批閱狀態流程**:
```
draft → submitted → under_review → approved/rejected
             ↑                          ↓
          可重新提交                   已批准記錄被鎖定
```

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

### 4. form_drafts (表單草稿表)

**用途**: 自動儲存用戶填寫中的表單資料，防止意外遺失

| 欄位名稱 | 資料類型 | 約束 | 預設值 | 說明 |
|---------|---------|------|-------|------|
| id | UUID | PK, NOT NULL | gen_random_uuid() | 系統主鍵 |
| owner_id | UUID | FK, NOT NULL | null | 用戶ID，參考 profiles.id |
| page_key | TEXT | NOT NULL | null | 頁面識別碼 (對應能源類別) |
| payload | JSONB | NOT NULL | null | 表單資料內容 |
| updated_at | TIMESTAMP WITH TIME ZONE | NOT NULL | now() | 最後更新時間 |

### 5. review_history (批閱歷史表)

**用途**: 記錄完整的審核歷史軌跡，保存所有狀態變更記錄

| 欄位名稱 | 資料類型 | 約束 | 預設值 | 說明 |
|---------|---------|------|-------|------|
| id | UUID | PK, NOT NULL | gen_random_uuid() | 系統主鍵 |
| entry_id | UUID | FK, NOT NULL | null | 能源記錄ID，參考 energy_entries.id |
| reviewer_id | UUID | FK, NULL | null | 批閱者ID，參考 profiles.id |
| old_status | TEXT | NULL | null | 變更前狀態 |
| new_status | TEXT | NULL | null | 變更後狀態 |
| review_notes | TEXT | NULL | null | 批閱備註 |
| created_at | TIMESTAMP WITH TIME ZONE | NULL | now() | 記錄建立時間 |

---

## 資料表關聯圖

```
profiles (用戶管理)
    ├── energy_entries (能源記錄，整合批閱功能) [1:N]
    │   ├── entry_files (佐證檔案) [1:N]
    │   └── review_history (批閱歷史) [1:N]
    └── form_drafts (表單草稿) [1:N]
```

### 外鍵約束詳細

| 來源表 | 來源欄位 | 參考表 | 參考欄位 | 約束名稱 | 刪除規則 | 更新規則 |
|--------|---------|--------|---------|----------|----------|----------|
| energy_entries | owner_id | profiles | id | fk_energy_entries_owner | CASCADE | NO ACTION |
| energy_entries | reviewer_id | profiles | id | fk_energy_entries_reviewer | SET NULL | NO ACTION |
| entry_files | entry_id | energy_entries | id | fk_entry_files_entry | CASCADE | NO ACTION |
| entry_files | owner_id | profiles | id | fk_entry_files_owner | CASCADE | NO ACTION |
| form_drafts | owner_id | profiles | id | fk_form_drafts_owner | CASCADE | NO ACTION |
| review_history | entry_id | energy_entries | id | fk_review_history_entry | CASCADE | NO ACTION |
| review_history | reviewer_id | profiles | id | fk_review_history_reviewer | SET NULL | NO ACTION |

---

## API 設計 (函數式介面)

**v4.0 重大改變**: 系統移除了所有視圖，改用安全的函數 API

### 核心 API 函數

#### 統計查詢
```sql
-- 取得填報統計
SELECT * FROM get_entry_review_stats();

-- 取得詳細進度
SELECT * FROM get_entry_progress_detail();

-- 取得批閱歷史
SELECT * FROM get_review_history_detail();
```

#### 管理員功能
```sql
-- 管理員統計
SELECT * FROM admin_get_review_stats(2025);

-- 管理員進度查詢
SELECT * FROM admin_get_progress_detail(user_id, 2025, 'submitted');

-- 儀表板統計
SELECT * FROM admin_get_dashboard_stats(2025);

-- 用戶進度查詢
SELECT * FROM get_user_progress(user_id, 2025);
```

#### 批閱操作
```sql
-- 單筆批閱
SELECT admin_review_entry(entry_id, 'approved', '批准通過');

-- 批量批閱
SELECT batch_review_entries(ARRAY[entry_id1, entry_id2], 'approved', '批量批准');

-- 解鎖記錄
SELECT unlock_entry(entry_id);
```

---

## 約束條件

### 主鍵約束
所有表格都使用 UUID 作為主鍵：
- `profiles_pkey`: profiles.id
- `energy_entries_pkey`: energy_entries.id  
- `entry_files_pkey`: entry_files.id
- `form_drafts_pkey`: form_drafts.id
- `review_history_pkey`: review_history.id

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
- `chk_energy_entries_status`: 狀態只能是 'draft', 'submitted', 'under_review', 'approved', 'rejected'
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
- `idx_energy_entries_reviewer_id`: 批閱者查詢優化
- `idx_energy_entries_is_locked`: 鎖定狀態查詢優化
- `idx_energy_entries_reviewed_at`: 批閱時間查詢優化
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

**review_history 表**:
- `review_history_pkey`: 主鍵 (唯一)
- `idx_review_history_entry_id`: 能源記錄關聯查詢優化
- `idx_review_history_reviewer_id`: 批閱者查詢優化
- `idx_review_history_created_at`: 時間查詢優化

---

## 權限控制 (RLS 政策)

### Row Level Security 狀態
所有表格都已啟用 RLS：
- profiles: ENABLED
- energy_entries: ENABLED
- entry_files: ENABLED
- form_drafts: ENABLED
- review_history: ENABLED

### RLS 政策詳細

**profiles 表**:
- `profiles_select_own`: 用戶只能查看自己的資料 `(id = auth.uid())`
- `profiles_select_all_admin`: 管理員可以查看所有用戶資料
- `profiles_update_own`: 用戶只能更新自己的資料 `(id = auth.uid())`

**energy_entries 表** (核心權限控制):
- `energy_entries_select_own`: 用戶查看自己的能源記錄 `(auth.uid() = owner_id)`
- `energy_entries_select_all_admin`: 管理員查看所有用戶記錄
- `energy_entries_insert_own`: 用戶新增自己的記錄
- `energy_entries_update_own`: 用戶更新自己未鎖定的記錄 `(auth.uid() = owner_id AND (is_locked IS NULL OR is_locked = FALSE))`
- `energy_entries_update_all_admin`: 管理員可以更新所有記錄
- `energy_entries_delete_own`: 用戶刪除自己的記錄 `(auth.uid() = owner_id)`

**entry_files 表**:
- `entry_files_select_admin`: 管理員查看所有檔案
- `entry_files_select_all_admin`: 管理員查看所有佐證檔案
- `entry_files_insert_policy`: 用戶上傳檔案到自己的記錄
- `entry_files_update_policy`: 用戶更新自己的檔案 `(owner_id = auth.uid())`
- `entry_files_update_all_admin`: 管理員可以更新所有檔案
- `entry_files_delete_policy`: 用戶刪除自己的檔案 `(owner_id = auth.uid())`

**form_drafts 表**:
- `form_drafts_select_admin`: 管理員查看所有草稿
- `form_drafts_insert_policy`: 用戶建立自己的草稿
- `form_drafts_update_policy`: 用戶更新自己的草稿 `(owner_id = auth.uid())`
- `form_drafts_delete_policy`: 用戶刪除自己的草稿 `(owner_id = auth.uid())`

**review_history 表**:
- `review_history_select_admin`: 管理員查看批閱歷史

---

## 自定義函數

### 權限檢查函數

**is_admin()**
- **回傳類型**: BOOLEAN
- **安全性**: SECURITY INVOKER
- **用途**: 檢查當前用戶是否為管理員
- **邏輯**: 查詢 profiles 表檢查用戶角色是否為 'admin'
- **設定**: SET search_path TO public, pg_temp

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

### 批閱系統函數

**handle_review_update()**
- **回傳類型**: TRIGGER
- **安全性**: SECURITY DEFINER
- **用途**: 處理批閱狀態變更，管理記錄鎖定狀態
- **設定**: SET search_path TO public, pg_temp

**log_review_history()**
- **回傳類型**: TRIGGER
- **安全性**: SECURITY DEFINER
- **用途**: 記錄狀態變更歷史
- **設定**: SET search_path TO public, pg_temp

**admin_review_entry(entry_id, status, review_notes)**
- **回傳類型**: BOOLEAN
- **安全性**: SECURITY DEFINER
- **用途**: 管理員批閱單筆記錄
- **設定**: SET search_path TO public, pg_temp

**batch_review_entries(entry_ids, status, review_notes)**
- **回傳類型**: INTEGER
- **安全性**: SECURITY DEFINER
- **用途**: 批量批閱多筆記錄
- **設定**: SET search_path TO public, pg_temp

**unlock_entry(entry_id)**
- **回傳類型**: BOOLEAN
- **安全性**: SECURITY DEFINER
- **用途**: 解鎖已批准的記錄
- **設定**: SET search_path TO public, pg_temp

### 統計查詢函數

**get_entry_review_stats()**
- **回傳類型**: TABLE
- **安全性**: SECURITY INVOKER
- **用途**: 取得填報統計資料
- **設定**: SET search_path TO public, pg_temp

**get_entry_progress_detail()**
- **回傳類型**: TABLE
- **安全性**: SECURITY INVOKER
- **用途**: 取得詳細進度資料
- **設定**: SET search_path TO public, pg_temp

**get_review_history_detail()**
- **回傳類型**: TABLE
- **安全性**: SECURITY INVOKER
- **用途**: 取得批閱歷史記錄
- **設定**: SET search_path TO public, pg_temp

**admin_get_review_stats(year)**
- **回傳類型**: TABLE
- **安全性**: SECURITY DEFINER
- **用途**: 管理員取得批閱統計資料
- **設定**: SET search_path TO public, pg_temp

**admin_get_progress_detail(user_id, year, status)**
- **回傳類型**: TABLE
- **安全性**: SECURITY DEFINER
- **用途**: 管理員取得詳細進度資料
- **設定**: SET search_path TO public, pg_temp

**admin_get_dashboard_stats(year)**
- **回傳類型**: TABLE
- **安全性**: SECURITY DEFINER
- **用途**: 管理員儀表板統計
- **設定**: SET search_path TO public, pg_temp

**get_user_progress(user_id, year)**
- **回傳類型**: TABLE
- **安全性**: SECURITY DEFINER
- **用途**: 取得用戶填報進度
- **設定**: SET search_path TO public, pg_temp

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
- **安全性**: SECURITY DEFINER
- **用途**: 防止重複提交，自動覆蓋舊資料
- **設定**: SET search_path TO public, pg_temp

---

## 觸發器配置

| 觸發器名稱 | 作用表 | 觸發時機 | 觸發事件 | 執行函數 |
|-----------|--------|----------|----------|----------|
| prevent_duplicate_submission | energy_entries | BEFORE | INSERT | prevent_duplicate_submission() |
| trigger_handle_review_update | energy_entries | BEFORE | UPDATE | handle_review_update() |
| trigger_log_review_history | energy_entries | AFTER | UPDATE | log_review_history() |
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

### 2. 批閱流程規則
- **狀態流程**: draft → submitted → under_review → approved/rejected
- **鎖定機制**: 已批准的記錄自動鎖定，用戶無法修改
- **權限分離**: 只有管理員可以進行批閱操作
- **歷史追蹤**: 所有狀態變更都會記錄在 review_history 表中
- **單表設計**: 所有批閱功能整合在 energy_entries 表中

### 3. API 使用規則
- **無視圖依賴**: 所有查詢都通過函數 API
- **權限檢查**: 函數內建權限驗證
- **安全設計**: 所有函數都設有 search_path 保護

---

## 系統特色

### 架構優勢
- **簡化設計**: 單表批閱系統，避免複雜的表格同步
- **穩定性**: 無觸發器循環問題
- **安全性**: 符合 Supabase 最佳實踐
- **維護性**: 架構清晰，易於擴展

### 功能完整性
- 完整的能源使用記錄管理
- 流暢的批閱工作流程
- 詳細的統計和進度追蹤
- 佐證檔案管理
- 適當的權限控制

### 技術規範
- PostgreSQL + Supabase
- 函數式 API 設計
- Row Level Security
- 觸發器自動化
- JSONB 靈活資料結構

---

## 部署狀態

**當前版本**: v4.0 (生產就緒)
**安全等級**: 符合 Supabase 標準
**維護狀態**: 穩定，易於維護
**擴展性**: 良好，支援未來功能增加

---

## 更新歷程

- **v3.0**: 複雜雙表架構，存在同步問題
- **v4.0**: 簡化為單表設計，移除視圖改用函數 API，解決所有架構問題