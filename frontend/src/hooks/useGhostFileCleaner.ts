import { useCallback } from 'react'
import { getFileUrl, deleteEvidenceFile, type EvidenceFile } from '../api/files'

/**
 * useGhostFileCleaner Hook
 *
 * 處理幽靈檔案問題：資料庫有記錄，但 Supabase Storage 實體檔案不存在（404）
 *
 * 核心功能：
 * - 驗證檔案是否存在於 Storage
 * - 自動刪除幽靈檔案的資料庫記錄
 * - 回傳有效檔案清單
 * - 防止頁面因 404 錯誤崩潰
 *
 * @returns {{ cleanFiles: (files: EvidenceFile[]) => Promise<EvidenceFile[]> }}
 *
 * @example
 * const { cleanFiles } = useGhostFileCleaner()
 *
 * useEffect(() => {
 *   if (loadedFiles.length > 0) {
 *     const cleanup = async () => {
 *       const validFiles = await cleanFiles(loadedFiles)
 *       setMyFiles(validFiles)
 *     }
 *     cleanup()
 *   }
 * }, [loadedFiles])
 */
export function useGhostFileCleaner() {
  /**
   * 驗證檔案是否存在於 Storage
   * @param file - 要驗證的檔案
   * @returns Promise<boolean> - true = 存在, false = 不存在（幽靈檔案）
   *
   * 註：加入重試邏輯，避免因 Supabase Storage 同步延遲而誤刪剛上傳的檔案
   */
  const validateFileExists = useCallback(async (file: EvidenceFile): Promise<boolean> => {
    try {
      await getFileUrl(file.file_path)
      return true  // 成功取得 = 檔案存在
    } catch (error) {
      // ⚠️ 第一次失敗 - 可能是 Storage 同步延遲
      console.warn(`⚠️ [useGhostFileCleaner] First validation failed for ${file.id} (${file.file_name}), retrying in 800ms...`)

      // 等待 800ms 讓 Storage 同步
      await new Promise(resolve => setTimeout(resolve, 800))

      try {
        await getFileUrl(file.file_path)
        console.log(`✅ [useGhostFileCleaner] Retry succeeded for ${file.id} (Storage sync delay)`)
        return true  // 重試成功 = 檔案存在（只是延遲）
      } catch (retryError) {
        // 重試後仍失敗 = 真正的幽靈檔案
        console.warn(`👻 [useGhostFileCleaner] Ghost file confirmed after retry: ${file.id} (${file.file_name})`)
        return false
      }
    }
  }, [])

  /**
   * 清理幽靈檔案（資料庫有記錄但 Storage 沒檔案）
   * @param files - 要清理的檔案清單
   * @returns Promise<EvidenceFile[]> - 只包含有效檔案的清單
   */
  const cleanFiles = useCallback(async (files: EvidenceFile[]): Promise<EvidenceFile[]> => {
    const validFiles: EvidenceFile[] = []

    for (const file of files) {
      const exists = await validateFileExists(file)

      if (exists) {
        validFiles.push(file)  // 有效 → 保留
      } else {
        // 幽靈檔案 → 從資料庫刪除記錄
        try {
          await deleteEvidenceFile(file.id)
          console.log(`🗑️ Deleted ghost file record: ${file.id}`)
        } catch (err) {
          console.error('Failed to delete ghost file:', err)
        }
      }
    }

    return validFiles
  }, [validateFileExists])

  return { cleanFiles }
}
