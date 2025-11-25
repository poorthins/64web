/**
 * 檔案上傳常量
 *
 * Type 3 架構統一使用這些常量，確保檔案類型限制一致性
 */

/** Type 3 允許的檔案類型（圖片、PDF、Excel） */
export const TYPE3_ALLOWED_FILE_TYPES = 'image/*,application/pdf,.xlsx,.xls'

/** Type 3 檔案大小限制（MB） */
export const TYPE3_MAX_FILE_SIZE_MB = 10

/** Type 3 上傳提示文字 */
export const TYPE3_FILE_UPLOAD_HINT = `支援圖片、PDF、Excel 格式，最大 ${TYPE3_MAX_FILE_SIZE_MB}MB`
