-- Migration: Add total_amount field to energy_entries
-- Date: 2025-09-04
-- Description: Add total_amount numeric field with check constraint and migrate existing data

BEGIN;

-- 1. 新增 total_amount 欄位
ALTER TABLE public.energy_entries 
ADD COLUMN total_amount numeric;

-- 2. 加入 check constraint：total_amount >= 0
ALTER TABLE public.energy_entries 
ADD CONSTRAINT energy_entries_total_amount_check 
CHECK (total_amount >= 0);

-- 3. 將舊資料 amount 的值同步到 total_amount（僅當 total_amount 為 null）
UPDATE public.energy_entries 
SET total_amount = amount 
WHERE total_amount IS NULL 
  AND amount IS NOT NULL 
  AND amount >= 0;

-- 4. 為 total_amount 添加註釋
COMMENT ON COLUMN public.energy_entries.total_amount IS '總使用量（每月明細的加總）';

COMMIT;

-- 驗證 Migration
SELECT 
  id,
  category,
  amount,
  total_amount,
  unit,
  period_year
FROM public.energy_entries 
WHERE total_amount IS NOT NULL
LIMIT 5;