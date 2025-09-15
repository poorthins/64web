/**
 * 進度指示器和視覺反饋工具函式
 * 用於統一管理表格行顏色編碼和進度計算邏輯
 */

import { MonthStatus } from '../components/MonthlyProgressGrid'

// 資料項目的通用介面
export interface ProgressDataItem {
  actualUsage: number
  percentage: number
}

/**
 * 根據完成百分比返回對應的 Tailwind CSS 類別
 * @param percentage 完成百分比 (0-100)
 * @returns Tailwind CSS 類別字串
 */
export const getRowColorClass = (percentage: number): string => {
  if (percentage === 100) return 'bg-green-50 transition-colors duration-200'
  if (percentage > 0 && percentage < 100) return 'bg-red-50 transition-colors duration-200'
  return ''
}

/**
 * 計算已完成的月份數量（100%完成的項目）
 * @param data 包含 actualUsage 和 percentage 的資料陣列
 * @returns 已完成的月份數量
 */
export const calculateCompletedMonths = (data: ProgressDataItem[]): number => {
  return data.filter(item => item.actualUsage > 0 && item.percentage === 100).length
}

/**
 * 計算總進度百分比
 * @param completedMonths 已完成的月份數
 * @param totalMonths 總月份數（預設為 12）
 * @returns 進度百分比 (0-100)
 */
export const calculateProgressPercentage = (completedMonths: number, totalMonths: number = 12): number => {
  return Math.round((completedMonths / totalMonths) * 100)
}

/**
 * 取得進度條的顏色類別
 * @param completedMonths 已完成的月份數
 * @param totalMonths 總月份數
 * @returns 進度條的 CSS 類別
 */
export const getProgressBarColorClass = (completedMonths: number, totalMonths: number = 12): string => {
  return completedMonths === totalMonths ? 'bg-green-600' : 'bg-red-600'
}

/**
 * 取得進度文字的顏色類別
 * @param completedMonths 已完成的月份數
 * @param totalMonths 總月份數
 * @returns 進度文字的 CSS 類別
 */
export const getProgressTextColorClass = (completedMonths: number, totalMonths: number = 12): string => {
  return completedMonths === totalMonths ? 'text-green-600' : 'text-red-600'
}

/**
 * 生成進度指示器的 JSX 元素（可選，如果需要統一的元件）
 * @param completedMonths 已完成的月份數
 * @param totalMonths 總月份數
 * @param className 額外的 CSS 類別
 * @returns 進度指示器 JSX 元素的屬性物件
 */
export const getProgressIndicatorProps = (completedMonths: number, totalMonths: number = 12, className: string = '') => {
  const progressPercentage = calculateProgressPercentage(completedMonths, totalMonths)
  const progressBarColorClass = getProgressBarColorClass(completedMonths, totalMonths)
  const progressTextColorClass = getProgressTextColorClass(completedMonths, totalMonths)
  
  return {
    className: `mb-4 p-3 rounded-lg bg-gray-100 ${className}`,
    progressPercentage,
    progressBarColorClass,
    progressTextColorClass,
    completedMonths,
    totalMonths
  }
}

// ===== 月度分配計算功能 =====

/**
 * 計算日期範圍之間的天數（包含起始日）
 */
export const calculateDaysBetween = (startDate: string, endDate: string): number => {
  const start = new Date(startDate)
  const end = new Date(endDate)
  const diffTime = Math.abs(end.getTime() - start.getTime())
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1
}

/**
 * 計算特定月份在指定期間內的天數
 */
export const calculateMonthDays = (year: number, month: number, startDate: string, endDate: string): number => {
  const monthStart = new Date(year, month - 1, 1)
  const monthEnd = new Date(year, month, 0) // 該月最後一天
  const periodStart = new Date(startDate)
  const periodEnd = new Date(endDate)

  const overlapStart = new Date(Math.max(monthStart.getTime(), periodStart.getTime()))
  const overlapEnd = new Date(Math.min(monthEnd.getTime(), periodEnd.getTime()))

  if (overlapStart > overlapEnd) return 0

  return Math.ceil((overlapEnd.getTime() - overlapStart.getTime()) / (1000 * 60 * 60 * 24)) + 1
}

/**
 * 月度分配資料介面
 */
export interface MonthlyAllocation {
  month: number
  days: number
  percentage: number
  usage: number
}

/**
 * 計算帳單的月度分配
 * @param startDate 開始日期
 * @param endDate 結束日期
 * @param totalUsage 總使用量
 * @param year 年份
 * @returns 月度分配陣列
 */
export const calculateMonthlyAllocation = (
  startDate: string,
  endDate: string,
  totalUsage: number,
  year: number
): MonthlyAllocation[] => {
  if (!startDate || !endDate || totalUsage <= 0) return []

  const totalDays = calculateDaysBetween(startDate, endDate)
  const allocations: MonthlyAllocation[] = []

  // 計算每月覆蓋天數和分配
  for (let month = 1; month <= 12; month++) {
    const monthDays = calculateMonthDays(year, month, startDate, endDate)
    
    if (monthDays > 0) {
      const monthTotalDays = new Date(year, month, 0).getDate()
      const coverage = (monthDays / monthTotalDays) * 100
      const allocatedUsage = totalUsage * (monthDays / totalDays)

      allocations.push({
        month,
        days: monthDays,
        percentage: coverage,
        usage: allocatedUsage
      })
    }
  }

  return allocations
}

/**
 * 天然氣帳單資料介面（用於月度分析）
 */
export interface BillDataForAnalysis {
  billingStartDate: string
  billingEndDate: string
  actualUnits: number
  paymentYearMonth?: string
}

/**
 * 分析天然氣帳單的月度進度
 * @param billData 帳單資料陣列
 * @param year 年份
 * @returns 12個月份的狀態陣列
 */
export const analyzeNaturalGasProgress = (
  billData: BillDataForAnalysis[],
  year: number
): MonthStatus[] => {
  // 初始化12個月份的狀態
  const monthStatuses: MonthStatus[] = Array(12).fill(null).map((_, index) => ({
    month: index + 1,
    status: 'empty' as const,
    coverage: 0,
    details: undefined
  }))

  // 處理每筆帳單
  billData.forEach((bill, billIndex) => {
    if (!bill.billingStartDate || !bill.billingEndDate || !bill.actualUnits || bill.actualUnits <= 0) {
      return
    }

    const allocations = calculateMonthlyAllocation(
      bill.billingStartDate,
      bill.billingEndDate,
      bill.actualUnits,
      year
    )

    // 將分配結果累加到對應月份
    allocations.forEach(({ month, percentage, usage }) => {
      const monthIndex = month - 1
      monthStatuses[monthIndex].coverage += percentage
      
      // 更新詳細資訊
      const billPeriod = `${bill.billingStartDate} ~ ${bill.billingEndDate}`
      if (!monthStatuses[monthIndex].details) {
        monthStatuses[monthIndex].details = billPeriod
      } else {
        monthStatuses[monthIndex].details += `; ${billPeriod}`
      }
    })
  })

  // 更新每個月份的最終狀態
  monthStatuses.forEach(monthStatus => {
    if (monthStatus.coverage >= 95) {
      monthStatus.status = 'complete'
    } else if (monthStatus.coverage >= 30) {
      monthStatus.status = 'partial'
    } else {
      monthStatus.status = 'empty'
    }

    // 限制覆蓋率不超過100%
    monthStatus.coverage = Math.min(monthStatus.coverage, 100)
  })

  return monthStatuses
}

/**
 * 電費單月度結果介面（用於月度分析）
 */
export interface ElectricityMonthlyResult {
  month: string
  billingPeriod: string
  billingDays: number
  billingUsage: number
  percentage: number
  actualUsage: number
}

/**
 * 分析電費單的月度進度
 * @param monthlyResults 月度分攤結果陣列
 * @returns 12個月份的狀態陣列
 */
export const analyzeElectricityProgress = (
  monthlyResults: ElectricityMonthlyResult[]
): MonthStatus[] => {
  return monthlyResults.map(result => {
    const monthNumber = parseInt(result.month.split('/')[1])
    
    let status: 'complete' | 'partial' | 'empty' = 'empty'
    if (result.percentage >= 95) {
      status = 'complete'
    } else if (result.percentage >= 30) {
      status = 'partial'
    }

    const details = result.percentage > 0 ? 
      `${result.billingPeriod} (${result.billingDays}天，用電${result.actualUsage.toFixed(2)}kWh)` : 
      undefined

    return {
      month: monthNumber,
      status,
      coverage: Math.min(result.percentage, 100),
      details
    }
  })
}