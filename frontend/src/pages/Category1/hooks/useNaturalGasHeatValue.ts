/**
 * useNaturalGasHeatValue - 天然氣低位熱值管理 Hook
 *
 * 功能：
 * - 管理月度低位熱值數據和檔案
 * - 處理編輯、儲存、查看邏輯
 * - 審核通過後提供只讀模式
 */

import { useState } from 'react'
import { EvidenceFile } from '../../../api/files'
import { MemoryFile } from '../../../services/documentHandler'
import { HeatValueEditingState } from '../../../types/naturalGasTypes'

type ToastType = 'info' | 'success' | 'warning' | 'error'

interface UseNaturalGasHeatValueParams {
  isApproved: boolean
  onError: (msg: string) => void
  onToast: (msg: { message: string; type: ToastType }) => void
}

export function useNaturalGasHeatValue({
  isApproved,
  onError,
  onToast
}: UseNaturalGasHeatValueParams) {

  // 當前編輯狀態
  const [currentEditingHeatValue, setCurrentEditingHeatValue] = useState<HeatValueEditingState>({
    month: 1,
    value: 0,
    memoryFiles: [],
    evidenceFiles: []
  })

  // 已暫存的月度數據
  const [monthlyHeatValues, setMonthlyHeatValues] = useState<Record<number, number>>({})
  const [monthlyHeatValueFiles, setMonthlyHeatValueFiles] = useState<Record<number, EvidenceFile[]>>({})
  const [monthlyHeatValueMemoryFiles, setMonthlyHeatValueMemoryFiles] = useState<Record<number, MemoryFile[]>>({})

  // UI 狀態
  const [showMonthPicker, setShowMonthPicker] = useState(false)

  /** 選擇月份並載入數據到編輯區 */
  const handleSelectMonth = (month: number) => {
    const existingValue = monthlyHeatValues[month]
    const existingMemoryFiles = monthlyHeatValueMemoryFiles[month] || []
    const existingEvidenceFiles = monthlyHeatValueFiles[month] || []

    setCurrentEditingHeatValue({
      month,
      value: existingValue || 0,
      memoryFiles: existingMemoryFiles,
      evidenceFiles: existingEvidenceFiles
    })

    setShowMonthPicker(false)
  }

  /** 儲存熱值到狀態 / 關閉查看框（審核通過後） */
  const handleSaveToState = () => {
    const { month, value, memoryFiles } = currentEditingHeatValue

    if (month === null) {
      onError('請選擇月份')
      return
    }

    // 審核通過後：只關閉編輯框
    if (isApproved) {
      setCurrentEditingHeatValue({
        month: 1,
        value: 0,
        memoryFiles: [],
        evidenceFiles: []
      })
      return
    }

    // 驗證
    if (!value || value === 0) {
      onError('請填寫低位熱值')
      return
    }

    const isEdit = monthlyHeatValues[month] !== undefined

    // 儲存到狀態
    setMonthlyHeatValues(prev => ({ ...prev, [month]: value }))
    setMonthlyHeatValueMemoryFiles(prev => ({ ...prev, [month]: memoryFiles }))

    // 重置編輯區
    setCurrentEditingHeatValue({
      month,
      value: 0,
      memoryFiles: [],
      evidenceFiles: []
    })

    onToast({
      message: isEdit ? '已更新' : '已暫存',
      type: 'success'
    })
  }

  /** 清空所有熱值數據 */
  const reset = () => {
    setCurrentEditingHeatValue({
      month: 1,
      value: 0,
      memoryFiles: [],
      evidenceFiles: []
    })
    setMonthlyHeatValues({})
    setMonthlyHeatValueFiles({})
    setMonthlyHeatValueMemoryFiles({})
  }

  /** 清空上傳後的 memoryFiles（避免幽靈檔案） */
  const clearUploadedMemoryFiles = () => {
    setMonthlyHeatValueMemoryFiles({})
    setCurrentEditingHeatValue(prev => ({
      ...prev,
      memoryFiles: [],
      evidenceFiles: []
    }))
  }

  return {
    // 狀態
    currentEditingHeatValue,
    setCurrentEditingHeatValue,
    monthlyHeatValues,
    setMonthlyHeatValues,
    monthlyHeatValueFiles,
    setMonthlyHeatValueFiles,
    monthlyHeatValueMemoryFiles,
    setMonthlyHeatValueMemoryFiles,
    showMonthPicker,
    setShowMonthPicker,

    // 操作
    handleSelectMonth,
    handleSaveToState,
    reset,
    clearUploadedMemoryFiles
  }
}
