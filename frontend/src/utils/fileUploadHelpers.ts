/**
 * 檔案上傳輔助函式
 *
 * 提供統一的檔案處理邏輯，避免在多個元件中重複相同程式碼
 */

import { MemoryFile } from '../components/FileDropzone'
import { generateMemoryFileId } from './idGenerator'

/**
 * 將瀏覽器的 File 物件轉換成 MemoryFile（記憶體暫存檔案）
 *
 * 用途：
 * - 在使用者上傳檔案時，先存在記憶體（草稿模式）
 * - 提交表單時才真正上傳到伺服器
 *
 * @param file - 瀏覽器原生 File 物件
 * @returns MemoryFile 物件（包含預覽 URL、ID 等資訊）
 *
 * @example
 * ```tsx
 * onFileSelect={(files) => {
 *   if (files[0]) {
 *     const memoryFile = createMemoryFile(files[0])
 *     onFileChange([memoryFile])
 *   }
 * }}
 * ```
 */
export function createMemoryFile(file: File): MemoryFile {
  return {
    id: generateMemoryFileId(),  // ⭐ 修復：使用 generateMemoryFileId() 產生 memory- 開頭的 ID
    file,
    preview: URL.createObjectURL(file),
    file_name: file.name,
    file_size: file.size,
    mime_type: file.type
  }
}

/**
 * 批次轉換多個檔案為 MemoryFile
 *
 * @param files - FileList 或 File 陣列
 * @returns MemoryFile 陣列
 *
 * @example
 * ```tsx
 * onFileSelect={(files) => {
 *   const memoryFiles = createMemoryFiles(files)
 *   onFileChange(memoryFiles)
 * }}
 * ```
 */
export function createMemoryFiles(files: FileList | File[]): MemoryFile[] {
  return Array.from(files).map(createMemoryFile)
}
