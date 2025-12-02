/**
 * useNaturalGasAdminSave - 天然氣管理員儲存邏輯
 */

import { useState } from 'react'
import { uploadEvidenceWithEntry, EvidenceFile } from '../../../api/files'
import { MemoryFile } from '../../../services/documentHandler'
import { useAdminSave } from '../../../hooks/useAdminSave'
import { useType2Helpers } from '../../../hooks/useType2Helpers'
import type { NaturalGasBillRecord } from '../../../types/naturalGasTypes'

interface UploadHeatValueFilesParams {
  monthlyMemoryFiles: Record<number, MemoryFile[]>
  monthlyFiles: Record<number, EvidenceFile[]>
  entryId: string
  pageKey: string
}

/**
 * 上傳熱值檔案並合併新舊檔案 ID
 */
export async function uploadHeatValueFiles({
  monthlyMemoryFiles,
  monthlyFiles,
  entryId,
  pageKey
}: UploadHeatValueFilesParams): Promise<Record<string, string[]>> {

  const uploadedIds: Record<string, string[]> = {}

  // 步驟 1：上傳新檔案
  for (const [month, files] of Object.entries(monthlyMemoryFiles)) {
    uploadedIds[month] = []
    for (const mf of files) {
      const uploaded = await uploadEvidenceWithEntry(mf.file, {
        entryId,
        pageKey,
        standard: '64',
        fileType: 'heat_value_evidence',
        recordId: `heat_value_${month}`
      })
      uploadedIds[month].push(uploaded.id)
    }
  }

  // 步驟 2：合併舊檔案 ID
  const allFiles: Record<string, string[]> = {}

  Object.entries(monthlyFiles).forEach(([month, files]) => {
    allFiles[month] = files.map(f => f.id)
  })

  Object.entries(uploadedIds).forEach(([month, ids]) => {
    if (!allFiles[month]) allFiles[month] = []
    allFiles[month].push(...ids)
  })

  return allFiles
}

/**
 * 轉換月度熱值為 payload 格式
 */
export function buildHeatValuePayload(
  monthlyValues: Record<number, number>
): Record<string, number> {
  const result: Record<string, number> = {}
  Object.entries(monthlyValues).forEach(([month, value]) => {
    if (value > 0) result[month] = value
  })
  return result
}

// ==================== Hook ====================

interface UseNaturalGasAdminSaveParams {
  pageKey: string
  year: number
  reviewEntryId: string | null
  savedGroups: NaturalGasBillRecord[]
  meters: Array<{ id: string; meterNumber: string }>
  heatValue: number
  monthlyHeatValues: Record<number, number>
  monthlyHeatValueFiles: Record<number, EvidenceFile[]>
  monthlyHeatValueMemoryFiles: Record<number, MemoryFile[]>
  monthlyTotals: Record<string, number>
  filesToDelete: string[]
  setFilesToDelete: (ids: string[]) => void
  setCurrentEditingGroup: (group: any) => void
  setMonthlyHeatValueMemoryFiles: (files: Record<number, MemoryFile[]>) => void
  setCurrentEditingHeatValue: (state: any) => void
  reload: () => Promise<void>
  reloadApprovalStatus: () => void
}

export function useNaturalGasAdminSave({
  pageKey,
  year,
  reviewEntryId,
  savedGroups,
  meters,
  heatValue,
  monthlyHeatValues,
  monthlyHeatValueFiles,
  monthlyHeatValueMemoryFiles,
  monthlyTotals,
  filesToDelete,
  setFilesToDelete,
  setCurrentEditingGroup,
  setMonthlyHeatValueMemoryFiles,
  setCurrentEditingHeatValue,
  reload,
  reloadApprovalStatus
}: UseNaturalGasAdminSaveParams) {
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const { save: adminSave } = useAdminSave(pageKey, reviewEntryId)
  const helpers = useType2Helpers<NaturalGasBillRecord>(pageKey, year)

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

      // 上傳熱值檔案並合併 ID
      const allHeatValueFiles = await uploadHeatValueFiles({
        monthlyMemoryFiles: monthlyHeatValueMemoryFiles,
        monthlyFiles: monthlyHeatValueFiles,
        entryId: reviewEntryId,
        pageKey
      })

      // 組裝 payload
      await adminSave({
        updateData: {
          unit: 'm³',
          amount: totalQuantity,
          payload: {
            monthly,
            billData: cleanedBillData,
            meterData: cleanedMeterData,
            heatValue: {
              value: heatValue,
              monthly: buildHeatValuePayload(monthlyHeatValues),
              files: allHeatValueFiles
            }
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
      setMonthlyHeatValueMemoryFiles({})
      setCurrentEditingHeatValue((prev: any) => ({
        ...prev,
        memoryFiles: [],
        evidenceFiles: []
      }))

      setSuccess('✅ 儲存成功！資料已更新')
    } catch (err) {
      console.error('❌ [NaturalGas] 管理員儲存失敗:', err)
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
