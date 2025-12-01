/**
 * useBillValidation - 通用帳單驗證邏輯（天然氣 + 電力）
 *
 * 負責：
 * - 帳單記錄欄位驗證
 * - 群組完整性驗證
 * - 錶號管理驗證
 * - 提交前驗證（可選，透過 config 擴展）
 */

import { useCallback } from 'react'
import { validateRocDate, calculateBillingDays } from '../utils/bill/dateCalculations'

// ==================== 泛型型別定義 ====================

interface BaseBillRecord {
  id: string
  meterId?: string
  billingStart: string
  billingEnd: string
  billingUnits: number
}

interface BaseMeter {
  id: string
  meterNumber: string
}

export interface ValidationResult {
  isValid: boolean
  error?: string
}

export interface GroupValidationResult<TRecord> {
  isValid: boolean
  validRecords: TRecord[]
  error?: string
}

// ==================== Config 參數 ====================

export interface BillValidationConfig<TRecord extends BaseBillRecord> {
  /** 額外的提交前驗證（如天然氣的熱值範圍檢查） */
  extraSubmitValidation?: (savedGroups: TRecord[], meters: BaseMeter[]) => ValidationResult
  /** 錶號名稱（用於錯誤訊息，如「錶號」或「表號」） */
  meterName?: string
}

// ==================== Hook 主體 ====================

export function useBillValidation<TRecord extends BaseBillRecord>(
  config?: BillValidationConfig<TRecord>
) {
  const meterName = config?.meterName || '錶號'

  /**
   * 驗證單筆帳單記錄
   */
  const validateBillRecord = useCallback((bill: TRecord): ValidationResult => {
    // 檢查必填欄位
    if (!bill.meterId) {
      return { isValid: false, error: `請選擇${meterName}` }
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
  }, [meterName])

  /**
   * 驗證群組（過濾出有效記錄）
   */
  const validateGroup = useCallback((records: TRecord[]): GroupValidationResult<TRecord> => {
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
      return { isValid: false, error: `${meterName}不能為空` }
    }

    return { isValid: true }
  }, [meterName])

  /**
   * 檢查錶號是否重複
   */
  const checkDuplicateMeter = useCallback((
    meterNumber: string,
    existingMeters: BaseMeter[]
  ): ValidationResult => {
    const trimmed = meterNumber.trim()
    const isDuplicate = existingMeters.some(m => m.meterNumber === trimmed)

    if (isDuplicate) {
      return { isValid: false, error: `此${meterName}已存在` }
    }

    return { isValid: true }
  }, [meterName])

  /**
   * 提交前驗證（基礎驗證 + 可選的額外驗證）
   */
  const validateBeforeSubmit = useCallback((
    savedGroups: TRecord[],
    meters: BaseMeter[]
  ): ValidationResult => {
    // 驗證：至少要有一筆帳單資料
    if (savedGroups.length === 0) {
      return { isValid: false, error: '請至少新增一筆帳單資料' }
    }

    // 驗證：至少要有一個錶號
    if (meters.length === 0) {
      return { isValid: false, error: `請至少新增一個${meterName}` }
    }

    // 額外驗證（如天然氣的熱值範圍）
    if (config?.extraSubmitValidation) {
      return config.extraSubmitValidation(savedGroups, meters)
    }

    return { isValid: true }
  }, [meterName, config])

  return {
    validateBillRecord,
    validateGroup,
    validateMeter,
    checkDuplicateMeter,
    validateBeforeSubmit
  }
}
