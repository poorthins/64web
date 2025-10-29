import { useState } from 'react'
import { deleteEnergyEntry } from '../api/entries'
import { deleteEvidenceFile, cleanOrphanFiles, type EvidenceFile } from '../api/files'
import { DocumentHandler, type MemoryFile } from '../services/documentHandler'
import type { EntryStatus } from '../components/StatusSwitcher'

/**
 * 清除參數介面
 */
export interface ClearParams {
  filesToDelete: EvidenceFile[]        // 要刪除的檔案清單
  memoryFilesToClean: MemoryFile[] | MemoryFile[][]   // ⭐ 支援一維或二維陣列
}

/**
 * Hook 回傳值介面
 */
export interface UseEnergyClearReturn {
  clear: (params: ClearParams) => Promise<void>
  clearing: boolean
  error: string | null
  clearError: () => void
}

/**
 * 能源清除 Hook
 *
 * 負責處理清除填報記錄的所有邏輯：
 * - 檢查狀態（approved 不能清除）
 * - 刪除所有檔案（從資料庫和 Storage）
 * - 刪除 entry 記錄
 * - 清理記憶體檔案的 preview URLs
 * - 錯誤處理
 *
 * @param entryId - 要清除的 entry ID
 * @param currentStatus - 當前狀態
 * @returns UseEnergyClearReturn
 *
 * @example
 * const { clear, clearing, error } = useEnergyClear(currentEntryId, currentStatus)
 *
 * const handleClear = async () => {
 *   await clear({
 *     filesToDelete: [...msdsFiles, ...monthlyFiles],
 *     memoryFilesToClean: [msdsMemoryFiles, ...monthlyMemoryFiles]
 *   })
 *
 *   // 清除成功後，清空前端狀態
 *   setFormData(initialState)
 * }
 */
export function useEnergyClear(
  entryId: string | null,
  currentStatus: EntryStatus | null
): UseEnergyClearReturn {
  const [clearing, setClearing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  /**
   * 清除函式
   *
   * @param params - 清除參數
   * @throws 如果狀態為 approved 或 entryId 不存在
   */
  const clear = async (params: ClearParams): Promise<void> => {
    // 檢查 1：entry ID 是否存在
    if (!entryId) {
      setError('沒有可清除的資料')
      throw new Error('沒有可清除的資料')
    }

    // 檢查 2：approved 狀態不能清除
    if (currentStatus === 'approved') {
      setError('已通過審核的資料無法清除')
      throw new Error('已通過審核的資料無法清除')
    }

    setClearing(true)
    setError(null)

    try {
      const failures: string[] = []

      // 步驟 1：刪除所有檔案（收集失敗訊息）
      if (params.filesToDelete.length > 0) {
        for (const file of params.filesToDelete) {
          try {
            await deleteEvidenceFile(file.id)
          } catch (err) {
            const fileName = file.file_name || file.id
            failures.push(`檔案 ${fileName} 刪除失敗`)
            console.warn(`⚠️ [useEnergyClear] 刪除檔案失敗 (${file.id}):`, err)
          }
        }
      }

      // 步驟 2：刪除 entry 記錄
      try {
        await deleteEnergyEntry(entryId)
      } catch (err) {
        console.error('❌ [useEnergyClear] 刪除 entry 失敗:', err)
        throw new Error('刪除記錄失敗，請重試')
      }

      // 步驟 3：清理孤兒檔案（漏網之魚）
      try {
        const { deletedCount, errors } = await cleanOrphanFiles()
        if (deletedCount > 0) {
          console.log(`🧹 [useEnergyClear] 清理了 ${deletedCount} 個孤兒檔案`)
        }
        if (errors.length > 0) {
          failures.push(...errors)
        }
      } catch (err) {
        console.warn('⚠️ [useEnergyClear] 清理孤兒檔案失敗:', err)
        // 不拋錯，因為主要清除已完成
      }

      // 步驟 4：清理記憶體檔案（釋放 blob URLs）
      // ⭐ 支援一維或二維陣列
      const filesToClean = Array.isArray(params.memoryFilesToClean[0])
        ? (params.memoryFilesToClean as MemoryFile[][])
        : [params.memoryFilesToClean as MemoryFile[]]

      filesToClean.forEach(memFiles => {
        DocumentHandler.clearAllMemoryFiles(memFiles)
      })

      // 步驟 5：如果有失敗，拋出詳細錯誤
      if (failures.length > 0) {
        const errorMessage = `清除未完全成功：\n${failures.join('\n')}`
        console.warn('⚠️ [useEnergyClear] 部分清除失敗:', failures)
        throw new Error(errorMessage)
      }

      console.log('✅ [useEnergyClear] 清除成功')

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '清除操作失敗'
      console.error('❌ [useEnergyClear] 清除失敗:', err)
      setError(errorMessage)
      throw err  // 重新拋出錯誤，讓呼叫方可以處理

    } finally {
      setClearing(false)
    }
  }

  /**
   * 清除錯誤訊息
   */
  const clearError = () => {
    setError(null)
  }

  return {
    clear,
    clearing,
    error,
    clearError
  }
}
