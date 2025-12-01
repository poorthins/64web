/**
 * useNaturalGasValidation - 天然氣頁面驗證邏輯 Hook
 *
 * 負責：
 * - 帳單記錄欄位驗證
 * - 群組完整性驗證
 * - 錶號管理驗證
 * - 提交前驗證
 */

import { useCallback } from 'react'
import { NaturalGasBillRecord, NaturalGasMeter } from '../../../types/naturalGasTypes'
import { validateRocDate, calculateBillingDays } from '../../../utils/bill/dateCalculations'

export interface ValidationResult {
  isValid: boolean
  error?: string
}

export interface GroupValidationResult {
  isValid: boolean
  validRecords: NaturalGasBillRecord[]
  error?: string
}

export function useNaturalGasValidation() {

  /**
   * 驗證單筆帳單記錄
   */
  const validateBillRecord = useCallback((bill: NaturalGasBillRecord): ValidationResult => {
    // 檢查必填欄位
    if (!bill.meterId) {
      return { isValid: false, error: '請選擇表號' }
    }

    if (!bill.billingStart || !bill.billingEnd) {
      return { isValid: false, error: '請填寫計費起訖日期' }
    }

    // 驗證日期格式
    if (!validateRocDate(bill.billingStart)) {
      return { isValid: false, error: '計費起日格式錯誤，請使用 年/月/日（民國）格式' }
    }

    if (!validateRocDate(bill.billingEnd)) {
      return { isValid: false, error: '計費訖日格式錯誤，請使用 年/月/日（民國）格式' }
    }

    // 驗證日期邏輯
    const days = calculateBillingDays(bill.billingStart, bill.billingEnd)
    if (days <= 0) {
      return { isValid: false, error: '計費訖日必須晚於計費起日' }
    }

    // 驗證度數
    if (!bill.billingUnits || bill.billingUnits <= 0) {
      return { isValid: false, error: '請填寫有效的計費度數' }
    }

    return { isValid: true }
  }, [])

  /**
   * 驗證群組（過濾出有效記錄）
   */
  const validateGroup = useCallback((records: NaturalGasBillRecord[]): GroupValidationResult => {
    const validRecords = records.filter(r => {
      // 只保留完整填寫的記錄
      return r.meterId &&
             r.billingStart &&
             r.billingEnd &&
             r.billingUnits > 0
    })

    if (validRecords.length === 0) {
      return {
        isValid: false,
        validRecords: [],
        error: '請至少填寫一筆完整的帳單資料'
      }
    }

    // 進一步驗證每筆記錄的格式
    for (const record of validRecords) {
      const result = validateBillRecord(record)
      if (!result.isValid) {
        return {
          isValid: false,
          validRecords: [],
          error: result.error
        }
      }
    }

    return {
      isValid: true,
      validRecords
    }
  }, [validateBillRecord])

  /**
   * 驗證錶號（檢查是否為空）
   */
  const validateMeter = useCallback((meterNumber: string): ValidationResult => {
    const trimmed = meterNumber.trim()

    if (trimmed.length === 0) {
      return { isValid: false, error: '錶號不能為空' }
    }

    return { isValid: true }
  }, [])

  /**
   * 檢查錶號是否重複
   */
  const checkDuplicateMeter = useCallback((
    meterNumber: string,
    existingMeters: NaturalGasMeter[]
  ): ValidationResult => {
    const trimmed = meterNumber.trim()
    const isDuplicate = existingMeters.some(m => m.meterNumber === trimmed)

    if (isDuplicate) {
      return { isValid: false, error: '此錶號已存在' }
    }

    return { isValid: true }
  }, [])

  /**
   * 提交前驗證
   */
  const validateBeforeSubmit = useCallback((
    savedGroups: NaturalGasBillRecord[],
    meters: NaturalGasMeter[],
    heatValue: number
  ): ValidationResult => {
    // 驗證：至少要有一筆帳單資料
    if (savedGroups.length === 0) {
      return { isValid: false, error: '請至少新增一筆帳單資料' }
    }

    // 驗證：至少要有一個錶號
    if (meters.length === 0) {
      return { isValid: false, error: '請至少新增一個天然氣錶號' }
    }

    // 驗證：低位熱值必須在範圍內
    if (heatValue < 8000 || heatValue > 12000) {
      return { isValid: false, error: '低位熱值必須在 8000-12000 kcal/m³ 範圍內' }
    }

    return { isValid: true }
  }, [])

  return {
    validateBillRecord,
    validateGroup,
    validateMeter,
    checkDuplicateMeter,
    validateBeforeSubmit
  }
}
