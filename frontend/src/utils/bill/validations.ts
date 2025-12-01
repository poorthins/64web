/**
 * 帳單驗證與覆蓋度計算工具
 */

/**
 * 帳單資料介面（簡化版）
 */
export interface BillData {
  billingStart: string      // ROC 格式: "113/01/01"
  billingEnd: string        // ROC 格式: "113/02/28"
  billingUnits: number      // 計費用量
}

/**
 * 計算指定月份被帳單涵蓋的天數百分比
 *
 * 用途：顯示該月份的資料完整度（例如：80% 表示該月有 80% 天數有帳單覆蓋）
 *
 * @param month 月份 (1-12)
 * @param bills 所有帳單資料
 * @returns 覆蓋百分比 (0-100)
 */
export const calculateMonthCoverage = (month: number, bills: BillData[]): number => {
  const year = new Date().getFullYear()
  const daysInMonth = new Date(year, month, 0).getDate() // 該月總天數
  let coveredDays = 0

  bills.forEach(bill => {
    if (!bill.billingStart || !bill.billingEnd || bill.billingUnits <= 0) return

    try {
      const [startYear, startMonth, startDay] = bill.billingStart.split('/').map(Number)
      const [endYear, endMonth, endDay] = bill.billingEnd.split('/').map(Number)

      // 計算該帳單與指定月份的重疊天數
      const billStartDate = new Date(startYear + 1911, startMonth - 1, startDay)
      const billEndDate = new Date(endYear + 1911, endMonth - 1, endDay)
      const monthStartDate = new Date(year, month - 1, 1)
      const monthEndDate = new Date(year, month - 1, daysInMonth)

      // 找出重疊期間
      const overlapStart = new Date(Math.max(billStartDate.getTime(), monthStartDate.getTime()))
      const overlapEnd = new Date(Math.min(billEndDate.getTime(), monthEndDate.getTime()))

      if (overlapStart <= overlapEnd) {
        const overlapDays = Math.ceil((overlapEnd.getTime() - overlapStart.getTime()) / (1000 * 60 * 60 * 24)) + 1
        coveredDays += Math.max(0, overlapDays)
      }
    } catch {
      // 日期解析失敗，跳過
    }
  })

  // 確保不超過100%
  return Math.min(100, (coveredDays / daysInMonth) * 100)
}
