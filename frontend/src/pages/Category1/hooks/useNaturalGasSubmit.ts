/**
 * useNaturalGasSubmit - 天然氣頁面提交邏輯 Hook
 *
 * 處理 Type 2 架構的提交/暫存邏輯：
 * - 準備提交資料（billData, meterData, heatValueData）
 * - 計算月份統計
 * - 上傳群組檔案（Type 2 架構）
 * - 刪除標記的檔案
 */

import { useState, useCallback } from 'react'
import { submitEnergyEntry } from '../../../api/v2/entryAPI'
import { uploadEvidenceFile } from '../../../api/v2/fileAPI'
import { useType2Helpers } from '../../../hooks/useType2Helpers'
import { useSubmitGuard } from '../../../hooks/useSubmitGuard'
import { NaturalGasBillRecord, NaturalGasMeter } from '../../../types/naturalGasTypes'
import { EvidenceFile } from '../../../api/files'
import { MemoryFile } from '../../../utils/documentHandler'

interface UseNaturalGasSubmitParams {
  pageKey: string
  year: number
  savedGroups: NaturalGasBillRecord[]
  meters: NaturalGasMeter[]
  heatValue: number
  monthlyHeatValues: Record<number, number>  // ⭐ 新增月度熱值參數
  heatValueFiles: Record<number, EvidenceFile[]>  // ⭐ 改成月度版本
  heatValueMemoryFiles: Record<number, MemoryFile[]>  // ⭐ 改成月度版本
  monthlyTotals: Record<number, number>
  filesToDelete: string[]
  setFilesToDelete: (files: string[]) => void
  setCurrentEntryId: (id: string) => void
  reload: () => Promise<void>
  reloadApprovalStatus: () => void
  handleSubmitSuccess: () => Promise<void>
}

export function useNaturalGasSubmit(params: UseNaturalGasSubmitParams) {
  const {
    pageKey,
    year,
    savedGroups,
    meters,
    heatValue,
    monthlyHeatValues,  // ⭐ 新增
    heatValueFiles,
    heatValueMemoryFiles,
    monthlyTotals,
    filesToDelete,
    setFilesToDelete,
    setCurrentEntryId,
    reload,
    reloadApprovalStatus,
    handleSubmitSuccess
  } = params

  const { executeSubmit, submitting } = useSubmitGuard()
  const helpers = useType2Helpers<NaturalGasBillRecord>(pageKey, year)

  const [submitError, setSubmitError] = useState<string | null>(null)
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null)

  // 準備提交資料
  const prepareSubmissionData = useCallback(() => {
    // 清理資料：移除前端暫存欄位
    const cleanedBillData = savedGroups.map(({ memoryFiles, evidenceFiles, ...rest }) => rest)
    const cleanedMeterData = meters.map(m => ({ id: m.id, meterNumber: m.meterNumber }))

    // 計算總用量
    const totalQuantity = savedGroups.reduce((sum, bill) => sum + bill.billingUnits, 0)

    // 轉換 monthlyTotals (Record<number, number>) 為 monthly (Record<string, number>)
    const monthly: Record<string, number> = {}
    Object.entries(monthlyTotals).forEach(([month, usage]) => {
      if (usage > 0) {
        monthly[month] = usage
      }
    })

    return {
      totalQuantity,
      monthly,
      cleanedBillData,
      cleanedMeterData
    }
  }, [savedGroups, meters, monthlyTotals])

  // 主要提交函式
  const submitData = useCallback(async (isDraft: boolean) => {
    // 驗證：至少要有一筆帳單資料
    if (savedGroups.length === 0) {
      throw new Error('請至少新增一筆帳單資料')
    }

    // 驗證：至少要有一個錶號
    if (meters.length === 0) {
      throw new Error('請至少新增一個天然氣錶號')
    }

    await executeSubmit(async () => {
      setSubmitError(null)
      setSubmitSuccess(null)

      try {
        const { totalQuantity, monthly, cleanedBillData, cleanedMeterData } = prepareSubmissionData()

        // ⭐ 提交 Entry
        const response = await submitEnergyEntry({
          page_key: pageKey,
          period_year: year,
          unit: 'm³',
          monthly,
          status: isDraft ? 'saved' : 'submitted',
          notes: `天然氣使用共 ${savedGroups.length} 筆帳單，${meters.length} 個錶號`,
          payload: {
            billData: cleanedBillData,
            meterData: cleanedMeterData,
            heatValue: {
              value: heatValue,  // ⭐ 保留向後相容
              monthly: (() => {  // ⭐ 新增月度熱值
                const monthly: Record<string, number> = {}
                Object.entries(monthlyHeatValues).forEach(([month, value]) => {
                  if (value > 0) {
                    monthly[month] = value  // ⭐ 使用各月的實際熱值
                  }
                })
                return monthly
              })(),
              files: (() => {  // ⭐ 新增月度檔案對應
                const filesMap: Record<string, string[]> = {}
                Object.entries(heatValueFiles).forEach(([month, files]) => {
                  filesMap[month] = files.map(f => f.id)
                })
                return filesMap
              })()
            }
          }
        })

        const entryId = response.entry_id
        setCurrentEntryId(entryId)

        // ⭐ 上傳帳單群組檔案（Type 2 架構）
        const groupsMap = helpers.buildGroupsMap(savedGroups)
        await helpers.uploadGroupFiles(groupsMap, entryId)

        // ⭐ 上傳月度低位熱值佐證
        const allUploads: Promise<any>[] = []
        Object.entries(heatValueMemoryFiles).forEach(([month, files]) => {
          files.forEach(file => {
            allUploads.push(
              uploadEvidenceFile(file.file, {
                page_key: pageKey,
                period_year: year,
                file_type: 'heat_value_evidence',
                entry_id: entryId,
                record_id: `heat_value_${month}`  // ⭐ heat_value_1, heat_value_2, ..., heat_value_12
              })
            )
          })
        })
        if (allUploads.length > 0) {
          await Promise.all(allUploads)
        }

        // ⭐ 刪除標記的檔案
        await helpers.deleteMarkedFiles(filesToDelete, setFilesToDelete)

        // 提交時不手動設置 submitSuccess（由 handleSubmitSuccess 設置）
        // 暫存時才手動設置
        if (isDraft) {
          setSubmitSuccess('暫存成功')
        }

        // 重新載入資料
        await reload()
        if (!isDraft) {
          await handleSubmitSuccess()
        }
        reloadApprovalStatus()

      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : '操作失敗'
        setSubmitError(errorMsg)
        throw error
      }
    })
  }, [
    savedGroups,
    meters,
    heatValue,
    heatValueFiles,
    heatValueMemoryFiles,
    monthlyTotals,
    filesToDelete,
    executeSubmit,
    prepareSubmissionData,
    pageKey,
    year,
    setCurrentEntryId,
    helpers,
    setFilesToDelete,
    reload,
    handleSubmitSuccess,
    reloadApprovalStatus
  ])

  const handleSubmit = useCallback(() => submitData(false), [submitData])
  const handleSave = useCallback(() => submitData(true), [submitData])

  return {
    handleSubmit,
    handleSave,
    submitting,
    submitError,
    submitSuccess,
    setSubmitError,
    setSubmitSuccess
  }
}
