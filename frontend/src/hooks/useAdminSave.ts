import { useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { uploadEvidenceWithEntry } from '../api/files'

/**
 * 管理員儲存參數
 */
export interface AdminSaveParams {
  updateData: {
    unit: string
    amount: number
    payload: Record<string, unknown>  // JSONB 欄位，每個能源類型結構不同
  }
  files: Array<{
    file: File
    metadata: {
      recordIndex?: number
      month?: number
      fileType?: 'msds' | 'usage_evidence' | 'other' | 'heat_value_evidence' | 'annual_evidence' | 'nameplate_evidence' | 'sf6_nameplate' | 'sf6_certificate'
      allRecordIds?: string[]
      recordId?: string
    }
  }>
}

/**
 * 失敗的檔案資訊
 */
export interface FailedFile {
  fileName: string
  error: string
}

/**
 * useAdminSave Hook 返回值
 */
export interface UseAdminSaveReturn {
  save: (params: AdminSaveParams) => Promise<FailedFile[]>
  saving: boolean
  error: string | null
  clearError: () => void
}

/**
 * 管理員審核儲存 Hook
 *
 * 處理管理員在審核模式下的編輯與儲存功能：
 * - 更新 entry 資料（unit, amount, payload）
 * - 批次上傳檔案到 Storage
 * - 完整錯誤處理
 *
 * @param pageKey - 能源類別識別碼（如 'electricity', 'diesel'）
 * @param reviewEntryId - 審核模式下的 entry ID（從 URL ?entryId=xxx 取得）
 * @returns UseAdminSaveReturn
 *
 * @example
 * // 審核模式下使用
 * const [searchParams] = useSearchParams()
 * const reviewEntryId = searchParams.get('entryId')
 *
 * const { save, saving } = useAdminSave('electricity', reviewEntryId)
 *
 * const failedFiles = await save({
 *   updateData: {
 *     unit: 'kWh',
 *     amount: 1000,
 *     payload: { monthly, billData, meters, notes }
 *   },
 *   files: bills.flatMap((bill, i) =>
 *     (billMemoryFiles[bill.id] || []).map(mf => ({
 *       file: mf.file,
 *       metadata: { recordIndex: i, fileType: 'usage_evidence' }
 *     }))
 *   )
 * })
 *
 * if (failedFiles.length > 0) {
 *   console.warn('部分檔案上傳失敗:', failedFiles)
 * }
 */
export function useAdminSave(
  pageKey: string,
  reviewEntryId: string | null
): UseAdminSaveReturn {
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  /**
   * 儲存管理員編輯的資料
   * @returns 失敗的檔案列表（空陣列表示全部成功）
   */
  const save = async (params: AdminSaveParams): Promise<FailedFile[]> => {
    // 驗證 reviewEntryId
    if (!reviewEntryId) {
      const errorMessage = '缺少 reviewEntryId，無法儲存'
      setError(errorMessage)
      throw new Error(errorMessage)
    }

    console.log('📝 [useAdminSave] Starting save:', {
      pageKey,
      reviewEntryId,
      filesCount: params.files.length
    })

    setSaving(true)
    setError(null)
    const failedFiles: FailedFile[] = []

    try {
      // 步驟 1：更新資料庫
      console.log('📝 [useAdminSave] Step 1: Updating database...')
      const { data: updateData, error: updateError } = await supabase
        .from('energy_entries')
        .update({
          ...params.updateData,
          updated_at: new Date().toISOString()
        })
        .eq('id', reviewEntryId)
        .select('id')
        .maybeSingle()

      if (updateError) {
        console.error('❌ [useAdminSave] Database update failed:', updateError)
        throw new Error(`資料庫更新失敗：${updateError.message}`)
      } else if (!updateData) {
        console.error('❌ [useAdminSave] Update returned no data - blocked by RLS Policy')
        throw new Error('更新失敗：權限不足或記錄不存在')
      }

      console.log('✅ [useAdminSave] Database updated successfully:', updateData.id)

      // 步驟 2：批次上傳檔案
      if (params.files.length > 0) {
        console.log(`📝 [useAdminSave] Step 2: Uploading ${params.files.length} files...`)

        for (const { file, metadata } of params.files) {
          try {
            await uploadEvidenceWithEntry(file, {
              entryId: reviewEntryId,
              pageKey,
              standard: '64',
              ...metadata
            })
          } catch (uploadError) {
            const errorMessage = uploadError instanceof Error
              ? uploadError.message
              : '未知錯誤'

            console.error('⚠️ [useAdminSave] File upload failed:', {
              fileName: file.name,
              error: errorMessage
            })

            failedFiles.push({
              fileName: file.name,
              error: errorMessage
            })
          }
        }

        if (failedFiles.length > 0) {
          console.warn(`⚠️ [useAdminSave] ${failedFiles.length}/${params.files.length} files failed to upload`)
        } else {
          console.log('✅ [useAdminSave] All files uploaded successfully')
        }
      }

      console.log('✅ [useAdminSave] Save completed')
      return failedFiles

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '儲存失敗'
      console.error('❌ [useAdminSave] Save failed:', err)
      setError(errorMessage)
      throw err
    } finally {
      setSaving(false)
    }
  }

  /**
   * 清除錯誤訊息
   */
  const clearError = () => {
    setError(null)
  }

  return {
    save,
    saving,
    error,
    clearError
  }
}
