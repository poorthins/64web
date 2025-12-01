/**
 * 月份分配計算工具
 * 將帳單期間的用量按比例分配到各月份
 */

import { getDaysInMonth } from './dateCalculations'

/**
 * 帳單資料介面（簡化版）
 */
export interface BillData {
  billingStart: string      // ROC 格式: "113/01/01"
  billingEnd: string        // ROC 格式: "113/02/28"
  billingUnits: number      // 計費用量
}

/**
 * 將帳單期間的用量按比例分配到各月份
 *
 * 核心邏輯：
 * 1. 計算帳單期間與目標年份的交集（只計算在目標年份內的部分）
 * 2. 計算有效天數和有效用量（按比例）
 * 3. 根據有效期間分配到月份（跨月按天數比例）
 *
 * @param bill 帳單資料
 * @param targetYear 目標年份 (西元年，例: 2024)
 * @returns 月份用量對照表 { 1: 150.5, 2: 200.3, ... }
 */
export const calculateMonthlyDistribution = (bill: BillData, targetYear: number): Record<number, number> => {
  if (!bill.billingStart || !bill.billingEnd || !bill.billingUnits) {
    return {}
  }

  try {
    const [startYear, startMonth, startDay] = bill.billingStart.split('/').map(Number)
    const [endYear, endMonth, endDay] = bill.billingEnd.split('/').map(Number)

    // 轉換為西元年
    const startISOYear = startYear + 1911
    const endISOYear = endYear + 1911

    // 建立帳單期間的日期物件
    const billStart = new Date(startISOYear, startMonth - 1, startDay)
    const billEnd = new Date(endISOYear, endMonth - 1, endDay)

    // ⭐ 計算帳單總天數
    const billingDays = Math.ceil((billEnd.getTime() - billStart.getTime()) / (1000 * 60 * 60 * 24)) + 1

    // ⭐ 計算與目標年份的交集
    const targetYearStart = new Date(targetYear, 0, 1)  // 目標年份的 1 月 1 日
    const targetYearEnd = new Date(targetYear, 11, 31, 23, 59, 59)  // 目標年份的 12 月 31 日

    const effectiveStart = new Date(Math.max(billStart.getTime(), targetYearStart.getTime()))
    const effectiveEnd = new Date(Math.min(billEnd.getTime(), targetYearEnd.getTime()))

    // ⭐ 如果帳單期間與目標年份沒有交集，回傳空物件
    if (effectiveStart > effectiveEnd) {
      console.log(`⚠️ 帳單 ${bill.billingStart} ~ ${bill.billingEnd} 不在目標年份 ${targetYear} 內，跳過計算`)
      return {}
    }

    // ⭐ 計算有效天數（只計算在目標年份內的天數）
    const effectiveDays = Math.ceil((effectiveEnd.getTime() - effectiveStart.getTime()) / (1000 * 60 * 60 * 24)) + 1

    // ⭐ 計算有效用量（按比例）
    const effectiveUnits = bill.billingUnits * (effectiveDays / billingDays)

    // 根據有效期間分配到月份
    const result: Record<number, number> = {}
    const startEffMonth = effectiveStart.getMonth() + 1
    const endEffMonth = effectiveEnd.getMonth() + 1
    const startEffDay = effectiveStart.getDate()
    const endEffDay = effectiveEnd.getDate()

    // 同月份：全部有效用量歸該月
    if (startEffMonth === endEffMonth) {
      result[startEffMonth] = effectiveUnits
    } else {
      // 跨月份：按天數比例分配有效用量
      const firstMonthDays = getDaysInMonth(startEffMonth, targetYear - 1911) - startEffDay + 1
      const secondMonthDays = endEffDay

      result[startEffMonth] = (effectiveUnits * firstMonthDays / effectiveDays)
      result[endEffMonth] = (effectiveUnits * secondMonthDays / effectiveDays)
    }

    // 四捨五入到小數點後兩位
    Object.keys(result).forEach(month => {
      result[Number(month)] = Math.round(result[Number(month)] * 100) / 100
    })

    console.log(`✅ 帳單分配 (目標年份=${targetYear}):`, {
      原始期間: `${bill.billingStart} ~ ${bill.billingEnd}`,
      原始天數: billingDays,
      原始用量: bill.billingUnits,
      有效期間: `${effectiveStart.toLocaleDateString()} ~ ${effectiveEnd.toLocaleDateString()}`,
      有效天數: effectiveDays,
      有效用量: effectiveUnits.toFixed(2),
      月份分配: result
    })

    return result
  } catch (error) {
    console.error('月份分配計算失敗:', error)
    return {}
  }
}
