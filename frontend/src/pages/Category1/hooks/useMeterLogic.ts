/**
 * useMeterLogic - 錶號管理邏輯（通用）
 *
 * 封裝錶號的新增、刪除邏輯，適用於天然氣和電力
 */

import { useState } from 'react'
import { generateRecordId } from '../../../utils/idGenerator'
import { useNaturalGasValidation } from './useNaturalGasValidation'

interface BaseMeter {
  id: string
  meterNumber: string
}

interface BaseBillRecord {
  id: string
  meterId?: string
}

interface UseMeterLogicParams<TMeter extends BaseMeter, TBillRecord extends BaseBillRecord> {
  meters: TMeter[]
  setMeters: (meters: TMeter[] | ((prev: TMeter[]) => TMeter[])) => void
  savedGroups: TBillRecord[]
  onError: (error: string) => void
}

export function useMeterLogic<TMeter extends BaseMeter, TBillRecord extends BaseBillRecord>({
  meters,
  setMeters,
  savedGroups,
  onError
}: UseMeterLogicParams<TMeter, TBillRecord>) {
  const [newMeterInput, setNewMeterInput] = useState('')
  const { validateMeter, checkDuplicateMeter } = useNaturalGasValidation()

  /**
   * 從輸入框新增錶號
   */
  const addMeterFromInput = () => {
    // 驗證錶號
    const meterValidation = validateMeter(newMeterInput)
    if (!meterValidation.isValid) {
      onError(meterValidation.error || '錶號驗證失敗')
      return
    }

    const trimmed = newMeterInput.trim()

    // 檢查重複
    const duplicateCheck = checkDuplicateMeter(trimmed, meters)
    if (!duplicateCheck.isValid) {
      onError(duplicateCheck.error || '錶號重複')
      return
    }

    // 新增錶號
    const newMeter = {
      id: generateRecordId(),
      meterNumber: trimmed
    } as TMeter

    setMeters(prev => [...prev, newMeter])
    setNewMeterInput('')
  }

  /**
   * 刪除錶號（檢查是否被帳單使用）
   */
  const deleteMeter = (id: string) => {
    // 檢查是否被帳單使用
    const usedByBills = savedGroups.filter(b => b.meterId === id)
    if (usedByBills.length > 0) {
      onError('此錶號已被帳單使用，無法刪除')
      return
    }

    setMeters(prev => prev.filter(m => m.id !== id))
  }

  return {
    newMeterInput,
    setNewMeterInput,
    addMeterFromInput,
    deleteMeter
  }
}
