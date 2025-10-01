import { useState, useEffect, useCallback } from 'react'
import {
  getEntryByPageKeyAndYear,
  upsertEnergyEntry,
  deleteEnergyEntry,
  sumMonthly,
  type EnergyEntry,
  type UpsertEntryInput
} from '../api/entries'
import {
  getEntryFiles,
  uploadEvidenceWithEntry,
  commitEvidence,
  deleteEvidenceFile,
  type EvidenceFile
} from '../api/files'
import { type MemoryFile } from '../components/EvidenceUpload'
import { getCategoryInfo } from '../utils/categoryConstants'

/**
 * submit 函式參數
 */
export interface SubmitParams {
  formData: any
  msdsFiles?: MemoryFile[]
  monthlyFiles?: MemoryFile[][]
}

/**
 * useEnergyPage Hook 返回值
 */
export interface UseEnergyPageReturn {
  // 資料載入
  entry: EnergyEntry | null
  loading: boolean

  // 檔案管理
  files: EvidenceFile[]
  deleteFile: (fileId: string) => Promise<void>

  // 提交
  submit: (params: SubmitParams) => Promise<void>
  submitting: boolean

  // 清除
  clear: () => Promise<void>
  clearing: boolean

  // 訊息
  error: string | null
  success: string | null
  clearError: () => void
  clearSuccess: () => void
}

/**
 * 能源填報頁面統一 Hook
 * 處理資料載入、檔案管理、提交和清除功能
 *
 * @param pageKey - 頁面識別碼 (e.g., 'wd40', 'acetylene')
 * @param year - 年份
 * @returns UseEnergyPageReturn
 *
 * @example
 * const {
 *   entry,
 *   loading,
 *   files,
 *   deleteFile,
 *   submit,
 *   clear
 * } = useEnergyPage('wd40', 2025)
 *
 * // 提交時傳入記憶體檔案
 * await submit({
 *   formData: { monthly: {...}, unit: 'ML' },
 *   msdsFiles: [msdsFile1, msdsFile2],
 *   monthlyFiles: [[file1], [file2], ...] // 12個月
 * })
 */
export function useEnergyPage(pageKey: string, year: number): UseEnergyPageReturn {
  // 狀態管理
  const [entry, setEntry] = useState<EnergyEntry | null>(null)
  const [loading, setLoading] = useState(true)
  const [files, setFiles] = useState<EvidenceFile[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [clearing, setClearing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  /**
   * 初始化：載入現有資料
   */
  useEffect(() => {
    const loadData = async () => {
      console.log('📂 [useEnergyPage] Loading data:', { pageKey, year })
      setLoading(true)
      setError(null)

      try {
        // 載入 entry 記錄
        const existingEntry = await getEntryByPageKeyAndYear(pageKey, year)
        setEntry(existingEntry)

        // 如果有 entry，載入關聯檔案
        if (existingEntry?.id) {
          const entryFiles = await getEntryFiles(existingEntry.id)
          setFiles(entryFiles)
          console.log('✅ [useEnergyPage] Loaded files:', entryFiles.length)
        }

        console.log('✅ [useEnergyPage] Data loaded successfully')
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : '載入資料失敗'
        console.error('❌ [useEnergyPage] Load error:', err)
        setError(errorMessage)
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [pageKey, year])

  /**
   * 刪除已上傳的檔案
   */
  const deleteFile = useCallback(async (fileId: string) => {
    console.log('🗑️ [useEnergyPage] Deleting file:', fileId)
    setError(null)

    try {
      await deleteEvidenceFile(fileId)
      setFiles(prev => prev.filter(f => f.id !== fileId))
      setSuccess('檔案已刪除')
      setTimeout(() => setSuccess(null), 3000)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '刪除檔案失敗'
      console.error('❌ [useEnergyPage] Delete file error:', err)
      setError(errorMessage)
      throw err
    }
  }, [])

  /**
   * 提交資料和檔案
   */
  const submit = useCallback(async (params: SubmitParams) => {
    const { formData, msdsFiles, monthlyFiles } = params

    console.log('📤 [useEnergyPage] Submitting data:', {
      pageKey,
      year,
      formData,
      msdsFilesCount: msdsFiles?.length || 0,
      monthlyFilesCount: monthlyFiles?.flat().length || 0
    })

    setSubmitting(true)
    setError(null)
    setSuccess(null)

    try {
      // 1. 計算 monthly 總和
      const total = sumMonthly(formData.monthly)
      console.log('📊 [useEnergyPage] Total amount:', total)

      if (total <= 0) {
        throw new Error('總使用量必須大於 0')
      }

      // 2. 建立/更新 entry
      const categoryInfo = getCategoryInfo(pageKey)
      const { entry_id } = await upsertEnergyEntry({
        page_key: pageKey,
        period_year: year,
        unit: formData.unit || categoryInfo.unit,
        monthly: formData.monthly,
        payload: formData,
        notes: formData.notes
      })

      console.log('✅ [useEnergyPage] Entry upserted:', entry_id)

      // 3. 上傳 MSDS 檔案（如果有）
      if (msdsFiles && msdsFiles.length > 0) {
        console.log(`📤 [useEnergyPage] Uploading ${msdsFiles.length} MSDS files...`)

        for (const memFile of msdsFiles) {
          await uploadEvidenceWithEntry(memFile.file, {
            entryId: entry_id,
            pageKey,
            year,
            category: 'msds'
          })
        }

        console.log('✅ [useEnergyPage] MSDS files uploaded')
      }

      // 4. 上傳月份檔案（如果有）
      if (monthlyFiles) {
        console.log('📤 [useEnergyPage] Uploading monthly files...')

        for (let month = 1; month <= 12; month++) {
          const files = monthlyFiles[month - 1] || []

          if (files.length > 0) {
            console.log(`📤 [useEnergyPage] Uploading ${files.length} files for month ${month}`)

            for (const memFile of files) {
              await uploadEvidenceWithEntry(memFile.file, {
                entryId: entry_id,
                pageKey,
                year,
                category: 'usage_evidence',
                month
              })
            }
          }
        }

        console.log('✅ [useEnergyPage] Monthly files uploaded')
      }

      // 5. 提交檔案（更新狀態）
      await commitEvidence({ entryId: entry_id, pageKey })
      console.log('✅ [useEnergyPage] Evidence committed')

      // 6. 重新載入資料
      const updatedEntry = await getEntryByPageKeyAndYear(pageKey, year)
      setEntry(updatedEntry)

      if (updatedEntry?.id) {
        const updatedFiles = await getEntryFiles(updatedEntry.id)
        setFiles(updatedFiles)
      }

      // 7. 顯示成功訊息
      const unit = formData.unit || categoryInfo.unit
      setSuccess(`提交成功！年度總使用量：${total.toFixed(2)} ${unit}`)
      console.log('✅ [useEnergyPage] Submit completed successfully')

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '提交失敗'
      console.error('❌ [useEnergyPage] Submit error:', err)
      setError(errorMessage)
      throw err
    } finally {
      setSubmitting(false)
    }
  }, [pageKey, year])

  /**
   * 清除所有資料
   */
  const clear = useCallback(async () => {
    console.log('🧹 [useEnergyPage] Clearing all data')
    setClearing(true)
    setError(null)

    try {
      if (!entry?.id) {
        throw new Error('沒有可清除的資料')
      }

      // 刪除 entry 記錄（會級聯刪除所有關聯檔案）
      await deleteEnergyEntry(entry.id)
      console.log('✅ [useEnergyPage] Entry and associated files deleted')

      // 清空狀態
      setEntry(null)
      setFiles([])

      setSuccess('資料已清除')
      console.log('✅ [useEnergyPage] Clear completed successfully')

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '清除失敗'
      console.error('❌ [useEnergyPage] Clear error:', err)
      setError(errorMessage)
      throw err
    } finally {
      setClearing(false)
    }
  }, [entry])

  /**
   * 清除錯誤訊息
   */
  const clearError = useCallback(() => {
    setError(null)
  }, [])

  /**
   * 清除成功訊息
   */
  const clearSuccess = useCallback(() => {
    setSuccess(null)
  }, [])

  return {
    // 資料載入
    entry,
    loading,

    // 檔案管理
    files,
    deleteFile,

    // 提交
    submit,
    submitting,

    // 清除
    clear,
    clearing,

    // 訊息
    error,
    success,
    clearError,
    clearSuccess
  }
}
