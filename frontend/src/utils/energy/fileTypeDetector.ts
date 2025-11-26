/**
 * 檔案類型偵測工具
 *
 * 用途：判斷檔案類型並提供相關檢查函數
 * 適用於：所有能源頁面的檔案上傳和顯示功能
 */

/**
 * 支援的檔案類型
 */
export type FileType = 'image' | 'pdf' | 'excel' | 'word' | 'other' | 'none'

/**
 * 根據檔案類型取得 icon 顏色
 *
 * @param fileType - 檔案類型
 * @returns string - icon 顏色（hex）
 *
 * @example
 * ```typescript
 * getFileIconColor('excel') // '#10B981' (綠色)
 * getFileIconColor('pdf') // '#EF4444' (紅色)
 * getFileIconColor('word') // '#3B82F6' (藍色)
 * getFileIconColor('other') // '#666' (灰色)
 * ```
 */
export function getFileIconColor(fileType: FileType): string {
  switch (fileType) {
    case 'excel':
      return '#10B981' // 綠色
    case 'pdf':
      return '#EF4444' // 紅色
    case 'word':
      return '#3B82F6' // 藍色
    case 'image':
    case 'other':
    case 'none':
    default:
      return '#666' // 灰色
  }
}

/**
 * 判斷檔案類型
 *
 * @param mimeType - MIME 類型 (例如: 'image/jpeg', 'application/pdf')
 * @param fileName - 檔案名稱 (例如: 'report.xlsx')
 * @returns FileType - 檔案類型
 *
 * @example
 * ```typescript
 * getFileType('application/pdf') // 'pdf'
 * getFileType('image/jpeg') // 'image'
 * getFileType(undefined, 'report.xlsx') // 'excel'
 * getFileType(undefined, undefined) // 'none'
 * ```
 */
export function getFileType(mimeType?: string, fileName?: string): FileType {
  // 1. 無 mimeType 和 fileName → 沒有檔案
  if (!mimeType && !fileName) return 'none'

  // 2. 圖片檔案
  if (mimeType?.startsWith('image/')) return 'image'

  // 3. PDF 檔案（檢查 MIME type 和副檔名）
  if (
    mimeType === 'application/pdf' ||
    fileName?.match(/\.pdf$/i)
  ) return 'pdf'

  // 4. Excel 檔案（檢查 MIME type 和副檔名）
  if (
    mimeType?.includes('excel') ||
    mimeType?.includes('spreadsheet') ||
    fileName?.match(/\.(xlsx?|xls)$/i)
  ) return 'excel'

  // 5. Word 檔案（檢查 MIME type 和副檔名）
  if (
    mimeType?.includes('wordprocessingml') ||
    mimeType === 'application/msword' ||
    fileName?.match(/\.(docx?|doc)$/i)
  ) return 'word'

  // 6. 其他檔案
  return 'other'
}

/**
 * 檢查是否為圖片檔案
 *
 * @param mimeType - MIME 類型
 * @returns boolean - 是否為圖片
 *
 * @example
 * ```typescript
 * isImageFile('image/jpeg') // true
 * isImageFile('application/pdf') // false
 * ```
 */
export function isImageFile(mimeType?: string): boolean {
  return mimeType?.startsWith('image/') ?? false
}

/**
 * 檢查是否為 PDF 檔案
 *
 * @param mimeType - MIME 類型
 * @returns boolean - 是否為 PDF
 *
 * @example
 * ```typescript
 * isPdfFile('application/pdf') // true
 * isPdfFile('image/jpeg') // false
 * ```
 */
export function isPdfFile(mimeType?: string): boolean {
  return mimeType === 'application/pdf'
}

/**
 * 檢查是否為 Excel 檔案
 *
 * @param mimeType - MIME 類型
 * @param fileName - 檔案名稱
 * @returns boolean - 是否為 Excel
 *
 * @example
 * ```typescript
 * isExcelFile('application/vnd.ms-excel') // true
 * isExcelFile(undefined, 'report.xlsx') // true
 * ```
 */
export function isExcelFile(mimeType?: string, fileName?: string): boolean {
  return !!(
    mimeType?.includes('excel') ||
    mimeType?.includes('spreadsheet') ||
    fileName?.match(/\.(xlsx?|xls)$/i)
  )
}

/**
 * 檢查是否為 Word 檔案
 *
 * @param mimeType - MIME 類型
 * @param fileName - 檔案名稱
 * @returns boolean - 是否為 Word
 *
 * @example
 * ```typescript
 * isWordFile('application/msword') // true
 * isWordFile(undefined, 'report.docx') // true
 * ```
 */
export function isWordFile(mimeType?: string, fileName?: string): boolean {
  return !!(
    mimeType?.includes('wordprocessingml') ||
    mimeType === 'application/msword' ||
    fileName?.match(/\.(docx?|doc)$/i)
  )
}