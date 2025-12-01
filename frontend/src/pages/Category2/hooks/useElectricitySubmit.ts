/**
 * useElectricitySubmit - 電費頁面提交邏輯 Hook
 *
 * 處理 Type 2 架構的提交/暫存邏輯：
 * - 準備提交資料（billData, meterData）
 * - 計算月份統計
 * - 上傳群組檔案（Type 2 架構）
 * - 刪除標記的檔案
 */

import { useState, useCallback } from 'react'
import { submitEnergyEntry } from '../../../api/v2/entryAPI'
import { useType2Helpers } from '../../../hooks/useType2Helpers'
import { useSubmitGuard } from '../../../hooks/useSubmitGuard'
import { ElectricityBillRecord, ElectricityMeter } from '../../../types/electricityTypes'

interface UseElectricitySubmitParams {
  pageKey: string
  year: number
  savedGroups: ElectricityBillRecord[]
  meters: ElectricityMeter[]
  monthlyTotals: Record<number, number>
  filesToDelete: string[]
  setFilesToDelete: (files: string[]) => void
  setCurrentEntryId: (id: string) => void
  reload: () => Promise<void>
  reloadApprovalStatus: () => void
  handleSubmitSuccess: () => Promise<void>
}

export function useElectricitySubmit(params: UseElectricitySubmitParams) {
  const {
    pageKey,
    year,
    savedGroups,
    meters,
    monthlyTotals,
    filesToDelete,
    setFilesToDelete,
    setCurrentEntryId,
    reload,
    reloadApprovalStatus,
    handleSubmitSuccess
  } = params

  const { executeSubmit, submitting } = useSubmitGuard()
  const helpers = useType2Helpers<ElectricityBillRecord>(pageKey, year)

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

    // 驗證：至少要有一個表號
    if (meters.length === 0) {
      throw new Error('請至少新增一個電表表號')
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
          unit: 'kWh',
          monthly,
          status: isDraft ? 'saved' : 'submitted',
          notes: `外購電力使用共 ${savedGroups.length} 筆帳單，${meters.length} 個表號`,
          payload: {
            billData: cleanedBillData,
            meterData: cleanedMeterData
          }
        })

        const entryId = response.entry_id
        setCurrentEntryId(entryId)

        // ⭐ 上傳帳單群組檔案（Type 2 架構）
        const groupsMap = helpers.buildGroupsMap(savedGroups)
        await helpers.uploadGroupFiles(groupsMap, entryId)

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
