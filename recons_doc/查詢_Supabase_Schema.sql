-- ============================================
-- Supabase SQL Editor 查詢命令
-- ============================================
-- 把這些 SQL 複製到 Supabase SQL Editor 執行
-- 就能看到你的資料庫實際結構
-- ============================================

-- 1️⃣ 查看 energy_entries 表結構
-- ============================================
SELECT
  column_name AS "欄位名稱",
  data_type AS "資料型別",
  is_nullable AS "可為空",
  column_default AS "預設值"
FROM information_schema.columns
WHERE table_name = 'energy_entries'
ORDER BY ordinal_position;


-- 2️⃣ 查看 entry_files 表結構
-- ============================================
SELECT
  column_name AS "欄位名稱",
  data_type AS "資料型別",
  is_nullable AS "可為空",
  column_default AS "預設值"
FROM information_schema.columns
WHERE table_name = 'entry_files'
ORDER BY ordinal_position;


-- 3️⃣ 查看 energy_entries 的索引
-- ============================================
SELECT
  indexname AS "索引名稱",
  indexdef AS "索引定義"
FROM pg_indexes
WHERE tablename = 'energy_entries';


-- 4️⃣ 查看 entry_files 的索引
-- ============================================
SELECT
  indexname AS "索引名稱",
  indexdef AS "索引定義"
FROM pg_indexes
WHERE tablename = 'entry_files';


-- 5️⃣ 查看外鍵約束
-- ============================================
SELECT
  tc.table_name AS "表名稱",
  kcu.column_name AS "欄位",
  ccu.table_name AS "參照表",
  ccu.column_name AS "參照欄位",
  tc.constraint_name AS "約束名稱"
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_name IN ('energy_entries', 'entry_files');


-- 6️⃣ 查看所有能源類別（確認尿素是否已存在）
-- ============================================
SELECT DISTINCT category AS "能源類別"
FROM energy_entries
ORDER BY category;


-- 7️⃣ 查看 payload 欄位的資料型別（確認是 JSONB）
-- ============================================
SELECT
  column_name,
  data_type,
  udt_name  -- PostgreSQL 實際型別
FROM information_schema.columns
WHERE table_name = 'energy_entries'
  AND column_name = 'payload';


-- 8️⃣ 查看 entry_files 的 file_type 列舉值
-- ============================================
SELECT DISTINCT file_type AS "檔案類型"
FROM entry_files
ORDER BY file_type;


-- 9️⃣ 查看一筆柴油記錄的 payload 結構（範例）
-- ============================================
SELECT
  id,
  category,
  page_key,
  jsonb_pretty(payload) AS "payload_結構"
FROM energy_entries
WHERE page_key = 'diesel'
LIMIT 1;


-- 🔟 查看一筆汽油記錄的 payload 結構（範例）
-- ============================================
SELECT
  id,
  category,
  page_key,
  jsonb_pretty(payload) AS "payload_結構"
FROM energy_entries
WHERE page_key = 'gasoline'
LIMIT 1;


-- 1️⃣1️⃣ 查看所有表的完整定義（最完整的）
-- ============================================
-- 這個會顯示 CREATE TABLE 語法
SELECT
  'CREATE TABLE ' || schemaname || '.' || tablename || ' (' ||
  string_agg(
    column_name || ' ' || data_type ||
    CASE WHEN character_maximum_length IS NOT NULL
      THEN '(' || character_maximum_length || ')'
      ELSE ''
    END ||
    CASE WHEN is_nullable = 'NO' THEN ' NOT NULL' ELSE '' END ||
    CASE WHEN column_default IS NOT NULL
      THEN ' DEFAULT ' || column_default
      ELSE ''
    END,
    ', '
  ) || ');' AS "CREATE_TABLE_語法"
FROM (
  SELECT
    c.table_schema AS schemaname,
    c.table_name AS tablename,
    c.column_name,
    c.data_type,
    c.character_maximum_length,
    c.is_nullable,
    c.column_default
  FROM information_schema.columns c
  WHERE c.table_name = 'energy_entries'
  ORDER BY c.ordinal_position
) sub
GROUP BY schemaname, tablename;


-- 1️⃣2️⃣ 快速檢查：確認可以儲存任意 JSON
-- ============================================
-- 測試 payload 是否真的是 JSONB（可以存任意結構）
SELECT
  pg_typeof(payload) AS "payload_型別",
  payload ? 'dieselData' AS "有_dieselData",
  payload ? 'gasolineData' AS "有_gasolineData",
  payload ? 'ureaData' AS "有_ureaData（測試用）"
FROM energy_entries
LIMIT 1;


-- ============================================
-- 📌 重點結論查詢
-- ============================================
-- 一次看清所有關鍵資訊

SELECT
  '✅ payload 是 ' || data_type || ' 型別' AS "確認事項",
  '可以存任意 JSON 結構，包括 ureaData' AS "結論"
FROM information_schema.columns
WHERE table_name = 'energy_entries'
  AND column_name = 'payload'

UNION ALL

SELECT
  '✅ entry_files 有 ' || COUNT(*) || ' 種 file_type',
  string_agg(DISTINCT file_type, ', ')
FROM entry_files

UNION ALL

SELECT
  '✅ 現有能源類別',
  string_agg(DISTINCT category, ', ')
FROM energy_entries;