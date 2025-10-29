import { useState, useEffect } from 'react'
import { getEntryByPageKeyAndYear, getEntryById, type EnergyEntry } from '../api/entries'
import { getEntryFiles, type EvidenceFile } from '../api/files'

/**
 * useEnergyData Hook 返回值
 */
export interface UseEnergyDataReturn {
  entry: EnergyEntry | null
  files: EvidenceFile[]
  loading: boolean
  error: string | null
  reload: () => Promise<void>
}

/**
 * 能源資料載入 Hook
 *
 * 專注於「從資料庫載入資料」這一件事：
 * - 載入 entry 記錄（根據 pageKey + year 或指定的 entryId）
 * - 載入關聯的檔案
 * - 處理載入錯誤
 * - 提供重新載入功能
 *
 * 不負責：
 * - 表單狀態管理（unitCapacity, carbonRate, monthlyData）
 * - 記憶體檔案管理
 * - 提交/審核邏輯
 *
 * @param pageKey - 頁面識別碼 (e.g., 'wd40')
 * @param year - 年份
 * @param entryId - 可選的 entry ID（用於審核模式，載入指定的 entry）
 * @returns UseEnergyDataReturn
 *
 * @example
 * // 一般模式：載入使用者自己的資料
 * const { entry, files, loading, error } = useEnergyData('wd40', 2025)
 *
 * @example
 * // 審核模式：載入指定的 entry
 * const entryIdToLoad = isReviewMode ? reviewEntryId : undefined
 * const { entry, files, loading, error } = useEnergyData('wd40', 2025, entryIdToLoad)
 */
export function useEnergyData(
  pageKey: string,
  year: number,
  entryId?: string | null
): UseEnergyDataReturn {
  // 狀態管理
  const [entry, setEntry] = useState<EnergyEntry | null>(null)
  const [files, setFiles] = useState<EvidenceFile[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  /**
   * 載入資料的核心函式
   */
  const loadData = async () => {
    setLoading(true)
    setError(null)

    try {
      // 1. 載入 entry 記錄
      let loadedEntry: EnergyEntry | null = null

      if (entryId) {
        // 審核模式：載入指定的 entry
        loadedEntry = await getEntryById(entryId)
      } else {
        // 一般模式：載入使用者自己的 entry
        loadedEntry = await getEntryByPageKeyAndYear(pageKey, year)
      }

      setEntry(loadedEntry)

      // 2. 如果有 entry，載入關聯檔案（所有狀態都載入，不判斷草稿）
      if (loadedEntry?.id) {
        let loadedFiles = await getEntryFiles(loadedEntry.id)

        // 檔案去重：使用 Map 確保每個 file.id 只出現一次
        const uniqueFiles = Array.from(
          new Map(loadedFiles.map(f => [f.id, f])).values()
        )

        console.log('🔍 [useEnergyData] Files loaded for entry:', loadedEntry.id, 'Count:', uniqueFiles.length, uniqueFiles)
        setFiles(uniqueFiles)
      } else {
        // 沒有 entry，清空檔案
        console.log('🔍 [useEnergyData] No entry, clearing files')
        setFiles([])
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '載入資料失敗'
      console.error('❌ [useEnergyData] Data load failed:', err)
      setError(errorMessage)

      // 載入失敗時清空狀態
      setEntry(null)
      setFiles([])
    } finally {
      setLoading(false)
    }
  }

  /**
   * 初始化：自動載入資料
   */
  useEffect(() => {
    loadData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pageKey, year, entryId])

  /**
   * 重新載入函式（供外部呼叫）
   */
  const reload = async () => {
    await loadData()
  }

  return {
    entry,
    files,
    loading,
    error,
    reload
  }
}
