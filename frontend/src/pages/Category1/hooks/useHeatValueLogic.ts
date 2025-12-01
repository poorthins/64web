/**
 * useHeatValueLogic - 低位熱值管理邏輯（天然氣專屬）
 *
 * 封裝天然氣低位熱值的編輯、儲存邏輯
 */

import { useState, useCallback } from 'react'
import { EvidenceFile } from '../../../api/files'
import { MemoryFile } from '../../../services/documentHandler'
import { HeatValueEditingState } from '../../../types/naturalGasTypes'

interface UseHeatValueLogicParams {
  isApproved: boolean
  onError: (error: string) => void
  onSuccess: (message: string) => void
}

export function useHeatValueLogic({
  isApproved,
  onError,
  onSuccess
}: UseHeatValueLogicParams) {
  const [showMonthPicker, setShowMonthPicker] = useState(false)

  const [currentEditingHeatValue, setCurrentEditingHeatValue] = useState<HeatValueEditingState>({
    month: 1,
    value: 0,
    memoryFiles: [],
    evidenceFiles: []
  })

  const [monthlyHeatValues, setMonthlyHeatValues] = useState<Record<number, number>>({})
  const [monthlyHeatValueFiles, setMonthlyHeatValueFiles] = useState<Record<number, EvidenceFile[]>>({})
  const [monthlyHeatValueMemoryFiles, setMonthlyHeatValueMemoryFiles] = useState<Record<number, MemoryFile[]>>({})

  /**
   * 選擇月份（載入該月數據到編輯區）
   */
  const handleSelectMonth = useCallback((month: number) => {
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
  }, [monthlyHeatValues, monthlyHeatValueMemoryFiles, monthlyHeatValueFiles])

  /**
   * 儲存低位熱值到已暫存狀態
   */
  const handleSaveHeatValueToState = useCallback(() => {
    const { month, value, memoryFiles } = currentEditingHeatValue

    if (month === null) {
      onError('請選擇月份')
      return
    }

    // 審核通過後：只關閉編輯框，不儲存數據
    if (isApproved) {
      setCurrentEditingHeatValue({
        month: 1,
        value: 0,
        memoryFiles: [],
        evidenceFiles: []
      })
      return
    }

    // 驗證：熱值必須填寫
    if (!value || value === 0) {
      onError('請填寫低位熱值')
      return
    }

    // 判斷是新增還是編輯
    const isEdit = monthlyHeatValues[month] !== undefined

    // 儲存到已暫存狀態
    setMonthlyHeatValues(prev => ({
      ...prev,
      [month]: value
    }))

    setMonthlyHeatValueMemoryFiles(prev => ({
      ...prev,
      [month]: memoryFiles
    }))

    // 重置編輯區
    setCurrentEditingHeatValue({
      month,
      value: 0,
      memoryFiles: [],
      evidenceFiles: []
    })

    onSuccess(isEdit ? '已更新' : '已暫存')
  }, [currentEditingHeatValue, isApproved, monthlyHeatValues, onError, onSuccess])

  /**
   * 編輯已填月份（從進度表點鉛筆）
   */
  const handleEditHeatValueMonth = useCallback((month: number) => {
    handleSelectMonth(month)
  }, [handleSelectMonth])

  return {
    // 狀態
    showMonthPicker,
    setShowMonthPicker,
    currentEditingHeatValue,
    setCurrentEditingHeatValue,
    monthlyHeatValues,
    setMonthlyHeatValues,
    monthlyHeatValueFiles,
    setMonthlyHeatValueFiles,
    monthlyHeatValueMemoryFiles,
    setMonthlyHeatValueMemoryFiles,

    // 操作函式
    handleSelectMonth,
    handleSaveHeatValueToState,
    handleEditHeatValueMonth
  }
}
