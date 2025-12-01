/**
 * 帳單日期計算工具
 * 提供 ROC (民國年) 與 ISO 日期格式轉換，以及帳單天數計算
 */

/**
 * 取得指定月份的天數
 * @param month 月份 (1-12)
 * @param rocYear 民國年 (預設 113)
 * @returns 該月的天數
 */
export const getDaysInMonth = (month: number, rocYear: number = 113): number => {
  const year = rocYear + 1911
  return new Date(year, month, 0).getDate()
}

/**
 * 解析 ROC 日期字串為 [年, 月, 日]
 * @param dateStr ROC 格式日期字串 (例: "113/01/15")
 * @returns [年, 月, 日] 或 null (如果格式無效)
 */
export const parseROCDate = (dateStr: string): [number, number, number] | null => {
  if (!dateStr || !validateRocDate(dateStr)) return null
  const [year, month, day] = dateStr.split('/').map(Number)
  return [year, month, day]
}

/**
 * 驗證 ROC 日期格式是否有效
 * @param dateStr ROC 格式日期字串 (例: "113/01/15")
 * @returns true 如果格式有效
 */
export const validateRocDate = (dateStr: string): boolean => {
  if (!dateStr.trim()) return false

  const regex = /^(\d{2,3})\/(\d{1,2})\/(\d{1,2})$/
  if (!regex.test(dateStr)) return false

  const [yearStr, monthStr, dayStr] = dateStr.split('/')
  const year = parseInt(yearStr)
  const month = parseInt(monthStr)
  const day = parseInt(dayStr)

  return year >= 100 && year <= 150 &&
         month >= 1 && month <= 12 &&
         day >= 1 && day <= 31
}

/**
 * 將 ROC 日期轉換為 ISO 格式 (YYYY-MM-DD)
 * @param rocDate ROC 格式日期字串 (例: "113/01/15")
 * @returns ISO 格式日期字串 (例: "2024-01-15") 或空字串 (如果無效)
 */
export const rocToISO = (rocDate: string): string => {
  try {
    if (!rocDate || !validateRocDate(rocDate)) {
      console.log('🔍 [rocToISO] 無效的 ROC 日期:', rocDate)
      return ''
    }
    const [rocYear, month, day] = rocDate.split('/').map(Number)
    const isoYear = rocYear + 1911
    const result = `${isoYear}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    console.log('✅ [rocToISO] 轉換成功:', rocDate, '→', result)
    return result
  } catch (error) {
    console.error('❌ [rocToISO] 轉換失敗:', rocDate, error)
    return ''
  }
}

/**
 * 將 ISO 日期轉換為 ROC 格式
 * @param isoDate ISO 格式日期字串 (例: "2024-01-15")
 * @returns ROC 格式日期字串 (例: "113/1/15") 或空字串 (如果無效)
 */
export const isoToROC = (isoDate: string): string => {
  try {
    if (!isoDate) {
      console.log('🔍 [isoToROC] 空白日期')
      return ''
    }
    const [isoYear, month, day] = isoDate.split('-').map(Number)
    const rocYear = isoYear - 1911
    const result = `${rocYear}/${month}/${day}`
    console.log('✅ [isoToROC] 轉換成功:', isoDate, '→', result)
    return result
  } catch (error) {
    console.error('❌ [isoToROC] 轉換失敗:', isoDate, error)
    return ''
  }
}

/**
 * 將 ROC 日期字串轉換為 Date 物件
 * @param rocDate ROC 格式日期字串 (例: "113/01/15")
 * @returns Date 物件或 null (如果無效)
 */
export const rocToDate = (rocDate: string): Date | null => {
  if (!rocDate || !validateRocDate(rocDate)) return null
  const [rocYear, month, day] = rocDate.split('/').map(Number)
  const isoYear = rocYear + 1911
  return new Date(isoYear, month - 1, day)
}

/**
 * 計算兩個 ROC 日期之間的天數（含起訖日）
 * @param startDate 開始日期 (ROC 格式)
 * @param endDate 結束日期 (ROC 格式)
 * @returns 天數 (限制在 0-70 天之間)
 */
export const calculateBillingDays = (startDate: string, endDate: string): number => {
  if (!validateRocDate(startDate) || !validateRocDate(endDate)) return 0

  try {
    const [startYear, startMonth, startDay] = startDate.split('/').map(Number)
    const [endYear, endMonth, endDay] = endDate.split('/').map(Number)

    const start = new Date(startYear + 1911, startMonth - 1, startDay)
    const end = new Date(endYear + 1911, endMonth - 1, endDay)

    const diffTime = end.getTime() - start.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1

    return Math.max(0, Math.min(70, diffDays)) // 限制在70天內
  } catch {
    return 0
  }
}
