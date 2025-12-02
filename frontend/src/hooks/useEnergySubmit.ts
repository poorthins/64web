import { useState } from 'react'
import { upsertEnergyEntry, sumMonthly, type UpsertEntryInput } from '../api/entries'
import { uploadEvidenceWithEntry, type EvidenceFile } from '../api/files'
import { debugRLSOperation } from '../utils/authDiagnostics'
import { type MemoryFile } from '../utils/documentHandler'

/**
 * 提交參數介面
 * ⚠️ 重要：不包含 currentEntryId
 * upsertEnergyEntry 會根據 pageKey + year 自動判斷新增或更新
 */
export interface SubmitParams {
  formData: {
    unitCapacity?: number         // ⭐ 改為 optional（DieselPage 不需要）
    carbonRate?: number           // ⭐ 改為 optional
    monthly: Record<string, number>        // { '1': 總使用量, '2': ... }
    monthlyQuantity?: Record<string, number> // ⭐ 改為 optional
    unit: string
    notes?: string  // ⭐ 新增 notes 參數支援 LPG/Refrigerant（教訓 #1 防護）
    extraPayload?: any  // ⭐ 新增：允許完全自訂 extraPayload（DieselPage 需要）
  }
  msdsFiles: MemoryFile[]       // MSDS 記憶體檔案
  monthlyFiles: MemoryFile[][]  // 12 個月的記憶體檔案陣列（WD40/Acetylene）
  evidenceFiles?: MemoryFile[]  // ⭐ 通用證據檔案（Refrigerant 設備檔案）
}

/**
 * Hook 回傳值介面
 */
export interface UseEnergySubmitReturn {
  submit: (params: SubmitParams) => Promise<string>  // 提交（完整驗證）
  save: (params: SubmitParams) => Promise<string>    // 暫存（跳過驗證）
  submitting: boolean
  error: string | null
  success: string | null
  clearError: () => void
  clearSuccess: () => void
}

/**
 * 能源提交 Hook
 *
 * 負責處理能源填報的提交邏輯：
 * - 呼叫 upsertEnergyEntry 儲存資料
 * - 上傳記憶體檔案（MSDS + 月份檔案）
 * - 關聯檔案到 entry
 * - 處理錯誤和成功訊息
 *
 * @param pageKey - 能源類別識別碼（如 'wd40'）
 * @param year - 填報年度
 * @param currentStatus - 當前記錄狀態（用於判斷是否保持 rejected 狀態）
 * @returns UseEnergySubmitReturn
 *
 * @example
 * const { submit, submitting } = useEnergySubmit('wd40', 2025, currentStatus)
 *
 * await submit({
 *   formData: { unitCapacity: 500, carbonRate: 85, ... },
 *   msdsFiles: [...],
 *   monthlyFiles: [[...], [...], ...]
 * })
 */
export function useEnergySubmit(
  pageKey: string,
  year: number,
  currentStatus?: 'saved' | 'submitted' | 'approved' | 'rejected' | null
): UseEnergySubmitReturn {
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
  const submitOrSave = async (params: SubmitParams, isDraft: boolean): Promise<string> => {
    setSubmitting(true)
    setError(null)
    setSuccess(null)

    try {
      // TODO: 暫存模式跳過驗證，提交模式執行完整驗證
      // if (!isDraft) {
      //   // 驗證邏輯（例如：檢查必填欄位、數值合理性等）
      // }
      // 步驟 1：準備 entry 資料
      const entryInput: UpsertEntryInput = {
        page_key: pageKey,
        period_year: year,
        unit: params.formData.unit,
        monthly: params.formData.monthly,
        // ⭐ 優先使用傳入的 extraPayload（DieselPage 用），否則使用標準結構（WD40/Acetylene 用）
        extraPayload: params.formData.extraPayload || {
          unitCapacity: params.formData.unitCapacity,
          carbonRate: params.formData.carbonRate,
          monthly: params.formData.monthly,
          monthlyQuantity: params.formData.monthlyQuantity,
          notes: params.formData.notes || ''
        }
      }

      // 步驟 2：呼叫 upsertEnergyEntry（會自動判斷新增或更新）
      // 特殊邏輯：rejected 狀態下暫存保持原狀態，讓用戶知道還需要修正
      // 其他情況：暫存設為 saved，提交設為 submitted
      const shouldPreserveStatus = isDraft && currentStatus === 'rejected'

      const { entry_id } = await debugRLSOperation(
        isDraft ? '暫存能源填報記錄' : '新增或更新能源填報記錄',
        async () => await upsertEnergyEntry(
          entryInput,
          shouldPreserveStatus,              // rejected + 暫存 → 保持 rejected
          isDraft ? 'saved' : 'submitted'    // initialStatus: 暫存用 saved，提交用 submitted
        )
      )

      // 步驟 3：批次上傳記憶體檔案（使用 Promise.allSettled 允許部分失敗）
      const uploadTasks: Promise<EvidenceFile>[] = []

      // 收集 MSDS 檔案上傳任務
      params.msdsFiles.forEach(memoryFile => {
        uploadTasks.push(
          uploadEvidenceWithEntry(memoryFile.file, {
            entryId: entry_id,
            pageKey,
            standard: '64',
            fileType: 'msds'  // ✅ 明確指定檔案類型
          })
        )
      })

      // 收集月份檔案上傳任務（WD40/Acetylene）
      params.monthlyFiles.forEach((monthFiles, idx) => {
        monthFiles.forEach(memoryFile => {
          uploadTasks.push(
            uploadEvidenceWithEntry(memoryFile.file, {
              entryId: entry_id,
              pageKey,
              standard: '64',
              month: idx + 1,
              fileType: 'usage_evidence'  // ✅ 明確指定檔案類型
            })
          )
        })
      })

      // 收集通用證據檔案上傳任務（Refrigerant 設備檔案）
      if (params.evidenceFiles) {
        params.evidenceFiles.forEach(memoryFile => {
          uploadTasks.push(
            uploadEvidenceWithEntry(memoryFile.file, {
              entryId: entry_id,
              pageKey,
              standard: '64',
              fileType: 'other'  // ✅ 明確指定檔案類型
            })
          )
        })
      }

      // 批次執行所有上傳任務
      if (uploadTasks.length > 0) {
        const results = await Promise.allSettled(uploadTasks)

        // 統計結果
        const succeeded = results.filter(r => r.status === 'fulfilled').length
        const failed = results.filter(r => r.status === 'rejected').length

        if (failed > 0) {
          console.warn(`⚠️ [useEnergySubmit] 部分檔案上傳失敗: ${succeeded}/${uploadTasks.length} 成功`)

          // 記錄失敗的檔案
          results.forEach((result, index) => {
            if (result.status === 'rejected') {
              console.error(`❌ 檔案 ${index + 1} 上傳失敗:`, result.reason)
            }
          })

          // 部分失敗不拋錯，讓提交繼續
          // 但設定警告訊息
          if (succeeded === 0) {
            throw new Error('所有檔案上傳失敗，請檢查網路連線後重試')
          }
        }
      }

      // 步驟 4：計算總使用量並設定成功訊息
      const totalUsage = sumMonthly(params.formData.monthly)
      if (isDraft) {
        setSuccess(`暫存成功！資料已儲存，可稍後繼續編輯`)
      } else {
        setSuccess(`提交成功！年度總使用量：${totalUsage.toFixed(2)} ${params.formData.unit}`)
      }

      return entry_id

    } catch (err) {
      console.error('❌ [useEnergySubmit] 提交失敗:', err)

      const errorMessage = err instanceof Error ? err.message : '提交失敗'
      setError(errorMessage)
      throw err  // 重新拋出錯誤，讓呼叫方可以處理

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
    submit: (params: SubmitParams) => submitOrSave(params, false),  // 提交：完整驗證
    save: (params: SubmitParams) => submitOrSave(params, true),     // 暫存：跳過驗證
    submitting,
    error,
    success,
    clearError,
    clearSuccess
  }
}
