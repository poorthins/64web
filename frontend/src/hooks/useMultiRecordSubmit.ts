import { useState } from 'react'
import { upsertEnergyEntry, type UpsertEntryInput } from '../api/entries'
import { debugRLSOperation } from '../utils/authDiagnostics'
import { type MemoryFile } from '../services/documentHandler'

/**
 * 多記錄提交參數介面
 */
export interface MultiRecordSubmitParams {
  entryInput: UpsertEntryInput           // upsertEnergyEntry 的參數
  recordData: Array<{                    // 記錄陣列
    id: string
    memoryFiles?: MemoryFile[]
    allRecordIds?: string[]              // ⭐ 新增：群組的所有 recordId
  }>
  uploadRecordFiles: (                   // 上傳函數（來自 useRecordFileMapping）
    id: string,
    files: MemoryFile[],
    entryId: string,
    fileType?: string,
    allRecordIds?: string[]              // ⭐ 新增參數
  ) => Promise<string[]>                 // ⭐ 回傳檔案 ID 陣列（與 useRecordFileMapping 匹配）
  onSuccess?: (entry_id: string) => Promise<void>  // 成功回調（接收 entry_id）
}

/**
 * Hook 回傳值介面
 */
export interface UseMultiRecordSubmitReturn {
  submit: (params: MultiRecordSubmitParams) => Promise<string>  // 提交（完整驗證）
  save: (params: MultiRecordSubmitParams) => Promise<string>    // 暫存（跳過驗證）
  submitting: boolean
  error: string | null
  success: string | null
  clearError: () => void
  clearSuccess: () => void
}

/**
 * 多記錄提交 Hook
 *
 * 專門處理多記錄頁面（動態陣列）的提交與暫存邏輯：
 * - 三階段提交：entry → 檔案 → fileMapping
 * - 支援 submit（提交）和 save（暫存）
 * - 與 useRecordFileMapping 無縫配合
 * - 訊息格式與 useEnergySubmit 統一
 *
 * 適用頁面：
 * - DieselPage（柴油）
 * - GasolinePage（汽油）
 * - RefrigerantPage（冷媒）
 * - DieselStationarySourcesPage（柴油固定源）
 *
 * @param pageKey - 能源類別識別碼（如 'diesel'）
 * @param year - 填報年度
 * @returns UseMultiRecordSubmitReturn
 *
 * @example
 * const { submit, save, submitting } = useMultiRecordSubmit('diesel', 2025)
 *
 * await submit({
 *   entryInput: { page_key, period_year, unit, monthly, extraPayload },
 *   recordData: dieselData,
 *   uploadRecordFiles,
 *   onSuccess: async (entry_id) => {
 *     setCurrentEntryId(entry_id)
 *     await reload()
 *   }
 * })
 */
export function useMultiRecordSubmit(
  pageKey: string,
  year: number
): UseMultiRecordSubmitReturn {
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  /**
   * 提交或暫存的內部函式
   *
   * @param params - 提交參數
   * @param isDraft - 是否為暫存模式（true=暫存不驗證, false=提交需驗證）
   * @returns entry_id - 成功後回傳 entry ID
   */
  const submitOrSave = async (
    params: MultiRecordSubmitParams,
    isDraft: boolean
  ): Promise<string> => {
    setSubmitting(true)
    setError(null)
    setSuccess(null)

    try {
      // 步驟 1：儲存 entry（根據 isDraft 決定 status）
      const { entry_id } = await debugRLSOperation(
        isDraft ? '暫存多記錄能源填報' : '提交多記錄能源填報',
        async () => await upsertEnergyEntry(
          params.entryInput,
          false,                             // preserveStatus: 總是更新狀態，不保持原狀態
          isDraft ? 'saved' : 'submitted'    // initialStatus: 暫存用 saved，提交用 submitted
        )
      )

      // 步驟 2：上傳所有記錄的檔案
      for (const record of params.recordData) {
        if (record.memoryFiles && record.memoryFiles.length > 0) {
          await params.uploadRecordFiles(
            record.id,
            record.memoryFiles,
            entry_id,
            undefined,  // fileType
            record.allRecordIds  // ⭐ 傳遞 allRecordIds
          )
        }
      }

      // 步驟 3：執行成功回調（傳入 entry_id）
      if (params.onSuccess) {
        await params.onSuccess(entry_id)
      }

      // 步驟 4：設定成功訊息（⭐ 與 useEnergySubmit 統一格式）
      if (isDraft) {
        setSuccess('暫存成功！資料已儲存，可稍後繼續編輯')
      } else {
        const recordCount = params.recordData.length
        setSuccess(`提交成功！共 ${recordCount} 筆記錄`)
      }

      return entry_id

    } catch (err) {
      console.error('❌ [useMultiRecordSubmit] 失敗:', err)
      const errorMessage = err instanceof Error ? err.message : '操作失敗'
      setError(errorMessage)
      throw err

    } finally {
      setSubmitting(false)
    }
  }

  /**
   * 清除錯誤訊息
   */
  const clearError = () => {
    setError(null)
  }

  /**
   * 清除成功訊息
   */
  const clearSuccess = () => {
    setSuccess(null)
  }

  return {
    submit: (params: MultiRecordSubmitParams) => submitOrSave(params, false),  // 提交：完整驗證
    save: (params: MultiRecordSubmitParams) => submitOrSave(params, true),     // 暫存：跳過驗證
    submitting,
    error,
    success,
    clearError,
    clearSuccess
  }
}
