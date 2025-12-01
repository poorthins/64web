/**
 * useBillSubmit - 通用帳單提交邏輯（天然氣 + 電力）
 *
 * 泛型 Hook，支援：
 * - 天然氣：unit='m³', 包含 heatValue payload
 * - 電力：unit='kWh', 不包含 heatValue
 */

import { useState, useCallback } from 'react'
import { submitEnergyEntry } from '../api/v2/entryAPI'
import { useType2Helpers } from './useType2Helpers'
import { useSubmitGuard } from './useSubmitGuard'
import { EvidenceFile } from '../api/files'
import { MemoryFile } from '../services/documentHandler'

// ==================== 泛型型別定義 ====================

interface BaseBillRecord {
  id: string
  groupId?: string
  meterId?: string
  billingStart: string
  billingEnd: string
  billingUnits: number
  files?: string[]
  memoryFiles?: MemoryFile[]
  evidenceFiles?: EvidenceFile[]
}

interface BaseMeter {
  id: string
  meterNumber: string
}

// ==================== Config 參數 ====================

export interface BillSubmitConfig {
  unit: string  // 'm³' | 'kWh'
  notes: (savedGroups: any[], meters: any[]) => string  // 自訂 notes 產生邏輯
  preparePayload: (data: {
    cleanedBillData: any[]
    cleanedMeterData: any[]
    monthly: Record<string, number>
  }) => any  // 自訂 payload 準備邏輯
  uploadExtraFiles?: (entryId: string) => Promise<void>  // 可選：上傳額外檔案（如熱值佐證）
}

// ==================== Hook 參數 ====================

interface UseBillSubmitParams<TRecord extends BaseBillRecord> {
  pageKey: string
  year: number
  savedGroups: TRecord[]
  meters: BaseMeter[]
  monthlyTotals: Record<number, number>
  filesToDelete: string[]
  setFilesToDelete: (files: string[]) => void
  setCurrentEntryId: (id: string) => void
  reload: () => Promise<void>
  reloadApprovalStatus: () => void
  handleSubmitSuccess: () => Promise<void>
}

// ==================== Hook 主體 ====================

export function useBillSubmit<TRecord extends BaseBillRecord>(
  params: UseBillSubmitParams<TRecord>,
  config: BillSubmitConfig
) {
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
  const helpers = useType2Helpers<TRecord>(pageKey, year)

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
      throw new Error('請至少新增一個錶號')
    }

    await executeSubmit(async () => {
      setSubmitError(null)
      setSubmitSuccess(null)

      try {
        const { totalQuantity, monthly, cleanedBillData, cleanedMeterData } = prepareSubmissionData()

        // 使用 config 準備 payload（處理業務差異）
        const payload = config.preparePayload({
          cleanedBillData,
          cleanedMeterData,
          monthly
        })

        // 提交 Entry
        const response = await submitEnergyEntry({
          page_key: pageKey,
          period_year: year,
          unit: config.unit,
          monthly,
          status: isDraft ? 'saved' : 'submitted',
          notes: config.notes(savedGroups, meters),
          payload
        })

        const entryId = response.entry_id
        setCurrentEntryId(entryId)

        // 上傳帳單群組檔案（Type 2 架構）
        const groupsMap = helpers.buildGroupsMap(savedGroups)
        await helpers.uploadGroupFiles(groupsMap, entryId)

        // 上傳額外檔案（如熱值佐證）
        if (config.uploadExtraFiles) {
          await config.uploadExtraFiles(entryId)
        }

        // 刪除標記的檔案
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
    config,
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
