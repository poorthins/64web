/**
 * useMonthlyCalculation - 天然氣月份使用量計算 Hook
 *
 * 負責：
 * - 計算每月總使用量（m³）
 * - 計算月份覆蓋度（該月被帳單涵蓋的天數百分比）
 * - 產生 MonthStatus 陣列供進度格子使用
 */

import { useMemo } from 'react'
import { NaturalGasBillRecord } from '../../../types/naturalGasTypes'
import { calculateMonthlyDistribution } from '../../../utils/bill/monthlyDistribution'
import { getDaysInMonth, parseROCDate } from '../../../utils/bill/dateCalculations'

export interface MonthStatus {
  month: number
  usage: number
  status: 'complete' | 'partial' | 'empty'
  coverage: number
  details?: string
}

interface UseMonthlyCalculationParams {
  savedGroups: NaturalGasBillRecord[]
  year: number
}

export function useMonthlyCalculation({ savedGroups, year }: UseMonthlyCalculationParams) {
  // 計算每月總使用量和覆蓋度
  const monthlyData = useMemo(() => {
    const totals: Record<number, number> = {}
    const statuses: Record<number, {
      status: 'empty' | 'partial' | 'complete'
      percentage: number
      coveredDays: number
      daysInMonth: number
    }> = {}

    // 初始化 12 個月
    for (let month = 1; month <= 12; month++) {
      const daysInMonth = getDaysInMonth(month, year - 1911)
      statuses[month] = {
        status: 'empty',
        percentage: 0,
        coveredDays: 0,
        daysInMonth
      }
      totals[month] = 0
    }

    // 計算每筆帳單的月份分配和覆蓋天數
    savedGroups.forEach(bill => {
      // 計算用量分配
      const distribution = calculateMonthlyDistribution(bill, year)
      Object.entries(distribution).forEach(([month, usage]) => {
        const monthNum = Number(month)
        totals[monthNum] = (totals[monthNum] || 0) + usage
      })

      // 計算覆蓋天數
      if (bill.billingStart && bill.billingEnd) {
        const startParts = parseROCDate(bill.billingStart)
        const endParts = parseROCDate(bill.billingEnd)

        if (startParts && endParts) {
          const [startYear, startMonth, startDay] = startParts
          const [endYear, endMonth, endDay] = endParts

          const startISOYear = startYear + 1911
          const endISOYear = endYear + 1911
          const billStart = new Date(startISOYear, startMonth - 1, startDay)
          const billEnd = new Date(endISOYear, endMonth - 1, endDay)

          // 計算與目標年份的交集
          const targetYearStart = new Date(year, 0, 1)
          const targetYearEnd = new Date(year, 11, 31, 23, 59, 59)
          const effectiveStart = new Date(Math.max(billStart.getTime(), targetYearStart.getTime()))
          const effectiveEnd = new Date(Math.min(billEnd.getTime(), targetYearEnd.getTime()))

          // 只計算在目標年份內的覆蓋天數
          if (effectiveStart <= effectiveEnd) {
            const startEffMonth = effectiveStart.getMonth() + 1
            const endEffMonth = effectiveEnd.getMonth() + 1
            const startEffDay = effectiveStart.getDate()
            const endEffDay = effectiveEnd.getDate()

            if (startEffMonth === endEffMonth) {
              // 同月份
              statuses[startEffMonth].coveredDays += (endEffDay - startEffDay + 1)
            } else {
              // 跨月份
              const daysInStartMonth = getDaysInMonth(startEffMonth, year - 1911)
              statuses[startEffMonth].coveredDays += (daysInStartMonth - startEffDay + 1)
              statuses[endEffMonth].coveredDays += endEffDay
            }
          }
        }
      }
    })

    // 更新狀態
    Object.keys(statuses).forEach(monthStr => {
      const month = Number(monthStr)
      const status = statuses[month]

      // 確保不超過該月總天數
      status.coveredDays = Math.min(status.coveredDays, status.daysInMonth)

      // 計算百分比和狀態
      if (status.coveredDays === 0) {
        status.status = 'empty'
        status.percentage = 0
      } else if (status.coveredDays >= status.daysInMonth) {
        status.status = 'complete'
        status.percentage = 100
      } else {
        status.status = 'partial'
        status.percentage = Math.round((status.coveredDays / status.daysInMonth) * 100)
      }
    })

    return { totals, statuses }
  }, [savedGroups, year])

  // 轉換為 MonthStatus 陣列
  const monthlyProgress: MonthStatus[] = useMemo(() => {
    return Array.from({ length: 12 }, (_, i) => {
      const month = i + 1
      const usage = monthlyData.totals[month] || 0
      const statusData = monthlyData.statuses[month]

      return {
        month,
        usage,
        status: statusData.status,
        coverage: statusData.percentage,
        details: usage > 0 ? `${usage.toFixed(2)} m³` : undefined
      }
    })
  }, [monthlyData])

  // 計算總用量（用於提交時的統計）
  const totalUsage = useMemo(() => {
    return Object.values(monthlyData.totals).reduce((sum, val) => sum + val, 0)
  }, [monthlyData.totals])

  // 計算已填寫月份數
  const filledMonthsCount = useMemo(() => {
    return Object.values(monthlyData.totals).filter(v => v > 0).length
  }, [monthlyData.totals])

  return {
    monthlyProgress,
    monthlyTotals: monthlyData.totals,
    totalUsage,
    filledMonthsCount
  }
}
