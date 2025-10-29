-- 查詢焊條頁面的檔案類型分佈
SELECT 
  file_type,
  month,
  COUNT(*) as count,
  file_name
FROM entry_files ef
JOIN energy_entries ee ON ef.entry_id = ee.id
WHERE ee.page_key = 'welding_rod'
ORDER BY month, file_type;
