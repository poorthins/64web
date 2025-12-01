/**
 * useElectricityAdminSave - 電力管理員儲存邏輯
 */

import { useState } from 'react'
import { useAdminSave } from '../../../hooks/useAdminSave'
import { useType2Helpers } from '../../../hooks/useType2Helpers'
import type { ElectricityBillRecord } from '../../../types/electricityTypes'

interface UseElectricityAdminSaveParams {
  pageKey: string
  year: number
  reviewEntryId: string | null
  savedGroups: ElectricityBillRecord[]
  meters: Array<{ id: string; meterNumber: string }>
  monthlyTotals: Record<string, number>
  filesToDelete: string[]
  setFilesToDelete: (ids: string[]) => void
  setCurrentEditingGroup: (group: any) => void
  reload: () => Promise<void>
  reloadApprovalStatus: () => void
}

export function useElectricityAdminSave({
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
}: UseElectricityAdminSaveParams) {
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const { save: adminSave } = useAdminSave(pageKey, reviewEntryId)
  const helpers = useType2Helpers<ElectricityBillRecord>(pageKey, year)

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

      // 組裝 payload
      await adminSave({
        updateData: {
          unit: 'kWh',
          amount: totalQuantity,
          payload: {
            monthly,
            billData: cleanedBillData,
            meterData: cleanedMeterData
          }
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

      setSuccess('✅ 儲存成功！資料已更新')
    } catch (err) {
      console.error('❌ [Electricity] 管理員儲存失敗:', err)
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
