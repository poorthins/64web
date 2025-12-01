/**
 * useBillAdminSave - 通用帳單管理員儲存邏輯（天然氣 + 電力）
 *
 * 支援：
 * - 天然氣：包含 heatValue payload + 熱值檔案上傳
 * - 電力：標準帳單 payload
 */

import { useState } from 'react'
import { useAdminSave } from './useAdminSave'
import { useType2Helpers } from './useType2Helpers'

// ==================== 泛型型別定義 ====================

interface BaseBillRecord {
  id: string
  groupId?: string
  meterId?: string
  billingStart: string
  billingEnd: string
  billingUnits: number
  files?: string[]
  memoryFiles?: any[]
  evidenceFiles?: any[]
}

interface BaseMeter {
  id: string
  meterNumber: string
}

// ==================== Config 參數 ====================

export interface BillAdminSaveConfig {
  unit: string  // 'm³' | 'kWh'
  preparePayload: (data: {
    cleanedBillData: any[]
    cleanedMeterData: any[]
    monthly: Record<string, number>
  }) => any  // 自訂 payload 準備邏輯
  uploadExtraFiles?: (reviewEntryId: string) => Promise<void>  // 可選：上傳額外檔案（如熱值佐證）
  clearExtraState?: () => void  // 可選：清空額外狀態（如熱值 memoryFiles）
}

// ==================== Hook 參數 ====================

interface UseBillAdminSaveParams<TRecord extends BaseBillRecord> {
  pageKey: string
  year: number
  reviewEntryId: string | null
  savedGroups: TRecord[]
  meters: BaseMeter[]
  monthlyTotals: Record<string, number>
  filesToDelete: string[]
  setFilesToDelete: (ids: string[]) => void
  setCurrentEditingGroup: (group: any) => void
  reload: () => Promise<void>
  reloadApprovalStatus: () => void
}

// ==================== Hook 主體 ====================

export function useBillAdminSave<TRecord extends BaseBillRecord>(
  params: UseBillAdminSaveParams<TRecord>,
  config: BillAdminSaveConfig
) {
  const {
    pageKey,
    year,
    reviewEntryId,
    savedGroups,
    meters,
    monthlyTotals,
    filesToDelete,
    setFilesToDelete,
    setCurrentEditingGroup,
    reload,
    reloadApprovalStatus
  } = params

  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const { save: adminSave } = useAdminSave(pageKey, reviewEntryId)
  const helpers = useType2Helpers<TRecord>(pageKey, year)

  const handleAdminSave = async () => {
    if (!reviewEntryId) {
      setError('缺少 reviewEntryId')
      return
    }

    setSaving(true)
    setError(null)

    try {
      // 準備提交資料
      const cleanedBillData = savedGroups.map(({ memoryFiles, evidenceFiles, ...rest }) => rest)
      const cleanedMeterData = meters.map(m => ({ id: m.id, meterNumber: m.meterNumber }))
      const totalQuantity = savedGroups.reduce((sum, bill) => sum + bill.billingUnits, 0)

      // 轉換 monthlyTotals 為 monthly
      const monthly: Record<string, number> = {}
      Object.entries(monthlyTotals).forEach(([month, usage]) => {
        if (usage > 0) monthly[month] = usage
      })

      // 收集帳單檔案
      const filesToUpload = helpers.collectAdminFilesToUpload(savedGroups)

      // 上傳額外檔案（如熱值佐證）
      if (config.uploadExtraFiles) {
        await config.uploadExtraFiles(reviewEntryId)
      }

      // 組裝 payload（使用 config 處理業務差異）
      const payload = config.preparePayload({
        cleanedBillData,
        cleanedMeterData,
        monthly
      })

      // 儲存到後端
      await adminSave({
        updateData: {
          unit: config.unit,
          amount: totalQuantity,
          payload
        },
        files: filesToUpload
      })

      // 刪除舊檔案
      await helpers.deleteMarkedFilesAsAdmin(filesToDelete, setFilesToDelete)

      // 重新載入
      await reload()
      reloadApprovalStatus()

      // 清空 memoryFiles
      setCurrentEditingGroup((prev: any) => ({ ...prev, memoryFiles: [] }))

      // 清空額外狀態（如熱值 memoryFiles）
      if (config.clearExtraState) {
        config.clearExtraState()
      }

      setSuccess('✅ 儲存成功！資料已更新')
    } catch (err) {
      console.error('❌ 管理員儲存失敗:', err)
      setError(err instanceof Error ? err.message : '儲存失敗')
    } finally {
      setSaving(false)
    }
  }

  return {
    handleAdminSave,
    saving,
    error,
    success,
    clearError: () => setError(null),
    clearSuccess: () => setSuccess(null)
  }
}
