/**
 * FileTypeIcon - 檔案類型圖示元件
 *
 * 用途：根據檔案類型顯示對應的圖示
 * 適用於：所有能源頁面的檔案顯示功能
 *
 * 圖示顏色規範：
 * - PDF: 紅色 (#DC2626)
 * - Excel: 綠色 (#16A34A)
 * - Word: 藍色 (#2563EB)
 * - 其他檔案: 灰色 (#666666)
 * - 圖片: 直接顯示縮圖（不使用此元件）
 * - 無檔案: 📁 emoji
 */

import { FileType } from '../../utils/energy/fileTypeDetector'

export interface FileTypeIconProps {
  /** 檔案類型 */
  fileType: FileType
  /** 圖示大小（px），預設 36 */
  size?: number
  /** 自訂 className */
  className?: string
}

/**
 * FileTypeIcon 元件
 *
 * @example
 * ```tsx
 * // PDF 檔案（紅色）
 * <FileTypeIcon fileType="pdf" />
 *
 * // Excel 檔案（綠色，自訂大小）
 * <FileTypeIcon fileType="excel" size={48} />
 *
 * // Word 檔案（藍色）
 * <FileTypeIcon fileType="word" />
 *
 * // 其他檔案（灰色）
 * <FileTypeIcon fileType="other" />
 *
 * // 無檔案（資料夾 emoji）
 * <FileTypeIcon fileType="none" />
 * ```
 */
export function FileTypeIcon({ fileType, size = 36, className }: FileTypeIconProps): JSX.Element {
  // PDF: 紅色圖示
  if (fileType === 'pdf') {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
        <path
          d="M14 2H6C5.46957 2 4.96086 2.21071 4.58579 2.58579C4.21071 2.96086 4 3.46957 4 4V20C4 20.5304 4.21071 21.0391 4.58579 21.4142C4.96086 21.7893 5.46957 22 6 22H18C18.5304 22 19.0391 21.7893 19.4142 21.4142C19.7893 21.0391 20 20.5304 20 20V8L14 2Z"
          stroke="#DC2626"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path d="M14 2V8H20" stroke="#DC2626" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <text x="12" y="17" fontSize="7" fill="#DC2626" textAnchor="middle" fontWeight="bold">
          PDF
        </text>
      </svg>
    )
  }

  // Excel: 綠色圖示
  if (fileType === 'excel') {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
        <path
          d="M14 2H6C5.46957 2 4.96086 2.21071 4.58579 2.58579C4.21071 2.96086 4 3.46957 4 4V20C4 20.5304 4.21071 21.0391 4.58579 21.4142C4.96086 21.7893 5.46957 22 6 22H18C18.5304 22 19.0391 21.7893 19.4142 21.4142C19.7893 21.0391 20 20.5304 20 20V8L14 2Z"
          stroke="#16A34A"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path d="M14 2V8H20" stroke="#16A34A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <text x="12" y="17" fontSize="6.5" fill="#16A34A" textAnchor="middle" fontWeight="bold">
          XLS
        </text>
      </svg>
    )
  }

  // Word: 藍色圖示
  if (fileType === 'word') {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
        <path
          d="M14 2H6C5.46957 2 4.96086 2.21071 4.58579 2.58579C4.21071 2.96086 4 3.46957 4 4V20C4 20.5304 4.21071 21.0391 4.58579 21.4142C4.96086 21.7893 5.46957 22 6 22H18C18.5304 22 19.0391 21.7893 19.4142 21.4142C19.7893 21.0391 20 20.5304 20 20V8L14 2Z"
          stroke="#2563EB"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path d="M14 2V8H20" stroke="#2563EB" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <text x="12" y="17" fontSize="6.5" fill="#2563EB" textAnchor="middle" fontWeight="bold">
          DOC
        </text>
      </svg>
    )
  }

  // 其他檔案: 灰色圖示
  if (fileType === 'other') {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
        <path
          d="M14 2H6C5.46957 2 4.96086 2.21071 4.58579 2.58579C4.21071 2.96086 4 3.46957 4 4V20C4 20.5304 4.21071 21.0391 4.58579 21.4142C4.96086 21.7893 5.46957 22 6 22H18C18.5304 22 19.0391 21.7893 19.4142 21.4142C19.7893 21.0391 20 20.5304 20 20V8L14 2Z"
          stroke="#666666"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path d="M14 2V8H20" stroke="#666666" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    )
  }

  // 無檔案: 資料夾 emoji
  if (fileType === 'none') {
    return <span className={`text-[24px] ${className || ''}`}>📁</span>
  }

  // Image 類型: 預設顯示文件 emoji（實際應該顯示圖片縮圖，這個元件不處理）
  return <span className={`text-[24px] ${className || ''}`}>📄</span>
}

export default FileTypeIcon