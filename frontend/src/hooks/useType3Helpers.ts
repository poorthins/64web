import { useType2Helpers } from './useType2Helpers'
import { uploadEvidenceFile } from '../api/v2/fileAPI'
import type { MemoryFile } from '../services/documentHandler'

/**
 * Type 3 頁面共用的輔助函數 Hook
 *
 * Type 3 = Type 2 + 規格管理（Dual List）
 *
 * 特徵：
 * - Specs（規格）：單一 record_id
 * - Usage Records（使用記錄）：comma-separated record_ids（繼承 Type 2）
 *
 * @param pageKey - 頁面 key（如 'wd40', 'lpg'）
 * @param year - 期間年份
 * @returns Type 2 的所有函數 + Type 3 特有函數
 */
export function useType3Helpers<
  TSpec extends { id: string; memoryFiles?: MemoryFile[] },
  TUsage extends { id: string; groupId?: string; memoryFiles?: MemoryFile[]; specId?: string }
>(pageKey: string, year: number) {

  // 繼承 Type 2 的所有輔助函數
  const type2Helpers = useType2Helpers<TUsage>(pageKey, year)

  /**
   * 輔助函數 #7（Type 3 特有）：上傳規格檔案
   *
   * ⭐ 關鍵差異：使用單一 record_id，不是 comma-separated
   */
  const uploadSpecFiles = async (specs: TSpec[], entryId: string) => {
    for (const spec of specs) {
      if (spec.memoryFiles && spec.memoryFiles.length > 0) {
        const newFiles = spec.memoryFiles.filter(mf => mf.file && mf.file.size > 0)

        for (const mf of newFiles) {
          await uploadEvidenceFile(mf.file, {
            page_key: pageKey,
            period_year: year,
            file_type: 'other',
            entry_id: entryId,
            record_id: spec.id,  // ⭐ 單一 ID，不是 comma-separated
            standard: '64'
          })
        }
      }
    }
  }

  /**
   * 輔助函數 #8（Type 3 特有）：驗證規格存在
   */
  const validateSpecsExist = (specs: TSpec[]) => {
    if (specs.length === 0) {
      throw new Error('請至少建立一個品項')
    }
  }

  /**
   * 輔助函數 #9（Type 3 特有）：驗證使用記錄有對應規格
   */
  const validateUsageRecordsHaveSpec = (records: TUsage[]) => {
    const hasInvalidRecords = records.some(r => !r.specId)
    if (hasInvalidRecords) {
      throw new Error('請為每筆記錄選擇品項')
    }
  }

  return {
    // Type 2 的 6 個函數
    ...type2Helpers,

    // Type 3 特有的 3 個函數
    uploadSpecFiles,
    validateSpecsExist,
    validateUsageRecordsHaveSpec
  }
}
