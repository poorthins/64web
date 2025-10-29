/**
 * DieselGeneratorRefuelPage - 柴油發電機加油記錄填報頁面
 *
 * 檔案儲存架構:
 * - Supabase Storage 路徑: other/2025/diesel_generator/
 * - 資料庫記錄識別: page_key = 'diesel_generator' + record_index = 0/1/2/3
 * - 單一統一資料夾，使用 record_index 欄位區分不同記錄的檔案
 *
 * 與其他頁面不同:
 * - 其他頁面: 單筆記錄 → page_key 唯一識別
 * - 柴油發電機頁面: 多筆記錄 → page_key + record_index 組合識別
 */
