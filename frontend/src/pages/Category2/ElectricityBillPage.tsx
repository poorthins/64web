import { useState, useEffect, useMemo, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import { AlertCircle, CheckCircle, Loader2, X, Trash2, Plus, Eye } from 'lucide-react'
import EvidenceUpload, { MemoryFile } from '../../components/EvidenceUpload'
import { EntryStatus } from '../../components/StatusSwitcher'
import Toast, { ToastType } from '../../components/Toast'
import BottomActionBar from '../../components/BottomActionBar'
import { useEditPermissions } from '../../hooks/useEditPermissions'
import { useFrontendStatus } from '../../hooks/useFrontendStatus'
import { commitEvidence, getEntryFiles, EvidenceFile, uploadEvidenceWithEntry } from '../../api/files'
import { upsertEnergyEntry, UpsertEntryInput, updateEntryStatus, getEntryByPageKeyAndYear, getEntryById } from '../../api/entries'
import ReviewSection from '../../components/ReviewSection'
import { designTokens } from '../../utils/designTokens'
import { DocumentHandler } from '../../services/documentHandler'

// 簡化的帳單資料結構
interface SimpleBillData {
  id: string
  billingStart: string // 計費開始日期 (民國年格式)
  billingEnd: string   // 計費結束日期 (民國年格式)
  billingDays: number  // 計費天數 (自動計算)
  billingUnits: number // 用電度數
  files: EvidenceFile[]
  memoryFiles: MemoryFile[] // 記憶體暫存檔案
}


const ElectricityBillPage = () => {
  const [searchParams] = useSearchParams()

  // 審核模式檢測
  const isReviewMode = searchParams.get('mode') === 'review'
  const reviewEntryId = searchParams.get('entryId')
  const reviewUserId = searchParams.get('userId')

  // 基本狀態
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null)

  // 表單資料
  const [year] = useState(new Date().getFullYear())
  const [bills, setBills] = useState<SimpleBillData[]>([])

  // 狀態管理
  const [currentEntryId, setCurrentEntryId] = useState<string | null>(null)
  const [initialStatus, setInitialStatus] = useState<EntryStatus>('submitted')
  const [hasSubmittedBefore, setHasSubmittedBefore] = useState(false)
  const [showSuccessModal, setShowSuccessModal] = useState(false)
  const [showClearModal, setShowClearModal] = useState(false)

  const pageKey = 'electricity'

  // 前端狀態管理
  const frontendStatus = useFrontendStatus({
    initialStatus,
    entryId: currentEntryId,
    onStatusChange: () => {},
    onError: (err: string) => setError(err),
    onSuccess: (msg: string) => setToast({ message: msg, type: 'success' })
  })

  const editPermissions = useEditPermissions(frontendStatus?.currentStatus || initialStatus)

  // 監聽帳單變化，確保月份格子即時更新
  useEffect(() => {
    // monthlyTotals 會自動重新計算，因為它依賴 bills
  }, [bills])

  // 獲取指定月份的天數
  const getDaysInMonth = (month: number, rocYear: number = 113): number => {
    const year = rocYear + 1911  // 轉換為西元年
    // JavaScript Date 的月份是 0-indexed，所以用 month 作為參數時，會得到下個月的第0天（即當月最後一天）
    return new Date(year, month, 0).getDate()
  }

  // 解析民國日期字串
  const parseROCDate = (dateStr: string): [number, number, number] | null => {
    if (!dateStr || !validateRocDate(dateStr)) return null
    const [year, month, day] = dateStr.split('/').map(Number)
    return [year, month, day]
  }


  // 日期驗證函數
  const validateRocDate = (dateStr: string): boolean => {
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

  // 計算計費天數
  const calculateBillingDays = (startDate: string, endDate: string): number => {
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

  // 簡化的月份分配計算
  const calculateMonthlyDistribution = (bill: SimpleBillData): Record<number, number> => {
    if (!bill.billingStart || !bill.billingEnd || !bill.billingUnits || bill.billingDays <= 0) {
      return {}
    }

    try {
      const [startYear, startMonth, startDay] = bill.billingStart.split('/').map(Number)
      const [endYear, endMonth, endDay] = bill.billingEnd.split('/').map(Number)

      // 同月份：全部度數歸該月
      if (startMonth === endMonth && startYear === endYear) {
        return { [startMonth]: bill.billingUnits }
      }

      // 跨月份：按天數比例分配
      const result: Record<number, number> = {}
      const totalDays = bill.billingDays

      // 第一個月的天數和用量
      const daysInStartMonth = getDaysInMonth(startMonth, startYear)
      const firstMonthDays = daysInStartMonth - startDay + 1
      result[startMonth] = (bill.billingUnits * firstMonthDays / totalDays)

      // 第二個月的天數和用量
      const secondMonthDays = endDay
      result[endMonth] = (bill.billingUnits * secondMonthDays / totalDays)

      // 四捨五入到小數點後兩位
      Object.keys(result).forEach(month => {
        result[Number(month)] = Math.round(result[Number(month)] * 100) / 100
      })

      return result
    } catch {
      return {}
    }
  }

  // 計算每月總使用量和狀態 - 使用 useMemo 確保即時更新
  const monthlyData = useMemo(() => {

    const totals: Record<number, number> = {}
    const statuses: Record<number, { status: 'empty' | 'partial' | 'complete', percentage: number, coveredDays: number, daysInMonth: number }> = {}

    // 初始化12個月的狀態
    for (let month = 1; month <= 12; month++) {
      const daysInMonth = getDaysInMonth(month, 113)
      statuses[month] = {
        status: 'empty',
        percentage: 0,
        coveredDays: 0,
        daysInMonth
      }
      totals[month] = 0
    }

    // 計算每張帳單的月份分配和覆蓋天數
    bills.forEach(bill => {
      // 計算用量分配
      const distribution = calculateMonthlyDistribution(bill)
      Object.entries(distribution).forEach(([month, usage]) => {
        const monthNum = Number(month)
        totals[monthNum] = (totals[monthNum] || 0) + usage
      })

      // 計算覆蓋天數
      if (bill.billingStart && bill.billingEnd && bill.billingUnits > 0) {
        const startParts = parseROCDate(bill.billingStart)
        const endParts = parseROCDate(bill.billingEnd)
        if (startParts && endParts) {
          const [startYear, startMonth, startDay] = startParts
          const [endYear, endMonth, endDay] = endParts

          // 計算每個月的覆蓋天數
          if (startMonth === endMonth) {
            // 同月份
            statuses[startMonth].coveredDays += (endDay - startDay + 1)
          } else {
            // 開始月份
            const daysInStartMonth = getDaysInMonth(startMonth, startYear)
            statuses[startMonth].coveredDays += (daysInStartMonth - startDay + 1)
            // 結束月份
            statuses[endMonth].coveredDays += endDay
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
  }, [bills])

  const monthlyTotals = monthlyData.totals



  // 處理帳單變更 - 簡化版本專注即時更新
  const handleBillChange = (id: string, field: keyof SimpleBillData, value: any) => {
    setBills(prev => prev.map(bill => {
      if (bill.id !== id) return bill

      const updated = { ...bill, [field]: value }

      // 當日期變更時，立即重新計算天數
      if (field === 'billingStart' || field === 'billingEnd') {
        updated.billingDays = calculateBillingDays(updated.billingStart, updated.billingEnd)
      }

      // 當有完整資料時，立即計算月份分配並觸發格子更新
      if (updated.billingStart && updated.billingEnd && updated.billingUnits > 0) {
        const distribution = calculateMonthlyDistribution(updated)
        // 影響月份將在下次 render 時自動更新
      }

      return updated
    }))
  }

  // 新增帳單
  const addBill = () => {
    const newBill: SimpleBillData = {
      id: Date.now().toString(),
      billingStart: '',
      billingEnd: '',
      billingDays: 0,
      billingUnits: 0,
      files: [],
      memoryFiles: []
    }
    setBills(prev => [...prev, newBill])
  }

  // 移除帳單
  const removeBill = (id: string) => {
    setBills(prev => prev.filter(bill => bill.id !== id))
  }

  // 驗證資料
  const validateData = (): string[] => {
    const errors: string[] = []

    if (bills.length === 0) {
      errors.push('請至少新增一筆電費繳費單')
      return errors
    }

    bills.forEach((bill, index) => {
      const billNum = index + 1

      if (!bill.billingStart) {
        errors.push(`第${billNum}筆繳費單：請填入計費開始日期`)
      } else if (!validateRocDate(bill.billingStart)) {
        errors.push(`第${billNum}筆繳費單：計費開始日期格式不正確`)
      }

      if (!bill.billingEnd) {
        errors.push(`第${billNum}筆繳費單：請填入計費結束日期`)
      } else if (!validateRocDate(bill.billingEnd)) {
        errors.push(`第${billNum}筆繳費單：計費結束日期格式不正確`)
      }

      if (bill.billingDays <= 0 || bill.billingDays > 70) {
        errors.push(`第${billNum}筆繳費單：計費天數異常 (${bill.billingDays}天)`)
      }

      if (bill.billingUnits <= 0) {
        errors.push(`第${billNum}筆繳費單：請輸入用電度數`)
      }

      if (bill.files.length === 0) {
        errors.push(`第${billNum}筆繳費單：請上傳繳費單檔案`)
      }
    })

    // 檢查月份覆蓋
    const missingMonths = []
    for (let month = 1; month <= 12; month++) {
      if (!monthlyTotals[month] || monthlyTotals[month] <= 0) {
        missingMonths.push(month)
      }
    }

    if (missingMonths.length > 0) {
      errors.push(`缺少以下月份的資料：${missingMonths.join('、')}月`)
    }

    return errors
  }

  // 提交資料
  const handleSubmit = async () => {
    const errors = validateData()
    if (errors.length > 0) {
      setError(errors.join('\n'))
      return
    }

    setSubmitting(true)
    setError(null)

    try {
      // 建立月份資料
      const monthly: Record<string, number> = {}
      Object.entries(monthlyTotals).forEach(([month, usage]) => {
        if (usage > 0) {
          monthly[month] = usage // 直接使用度數，不轉換
        }
      })

      const entryInput: UpsertEntryInput = {
        page_key: pageKey,
        period_year: year,
        unit: 'kWh',
        monthly: monthly,
        notes: `外購電力用量填報 - ${bills.length}筆繳費單`,
        extraPayload: {
          monthly: monthly,
          billData: bills.map(bill => ({
            id: bill.id,
            billingStart: bill.billingStart,
            billingEnd: bill.billingEnd,
            billingDays: bill.billingDays,
            billingUnits: bill.billingUnits
          }))
        }
      }

      const { entry_id } = await upsertEnergyEntry(entryInput, true)
      setCurrentEntryId(entry_id)

      // 上傳所有帳單的佐證檔案
      for (const bill of bills) {
        if (bill.memoryFiles && bill.memoryFiles.length > 0) {
          for (const memFile of bill.memoryFiles) {
            await uploadEvidenceWithEntry(memFile.file, {
              entryId: entry_id,
              pageKey: pageKey,
              year: year,
              category: 'other'
            })
          }
        }
      }

      // 清空 memory files
      setBills(prev => prev.map(bill => ({ ...bill, memoryFiles: [] })))

      await commitEvidence({
        entryId: entry_id,
        pageKey: pageKey
      })

      await frontendStatus?.handleSubmitSuccess()
      setHasSubmittedBefore(true)

      const totalUsage = Object.values(monthlyTotals).reduce((sum, usage) => sum + usage, 0)
      setToast({
        message: `提交成功！年度總使用量：${totalUsage.toFixed(2)} 度`,
        type: 'success'
      })
      setShowSuccessModal(true)

    } catch (error) {
      // 詳細的錯誤記錄
      console.error('❌ [Electricity] 提交失敗，完整錯誤訊息:', error)
      console.error('❌ [Electricity] 錯誤類型:', error?.constructor?.name)
      console.error('❌ [Electricity] 錯誤詳情:', (error as any)?.details)
      console.error('❌ [Electricity] 錯誤提示:', (error as any)?.hint)
      console.error('❌ [Electricity] 錯誤代碼:', (error as any)?.code)
      console.error('❌ [Electricity] 錯誤堆疊:', (error as any)?.stack)

      if (error && typeof error === 'object') {
        console.error('❌ [Electricity] 錯誤物件所有屬性:', Object.keys(error))
        console.error('❌ [Electricity] 完整錯誤物件:', error)
      }

      setError(error instanceof Error ? error.message : '提交失敗')
    } finally {
      setSubmitting(false)
    }
  }

  // 清除所有資料
  const handleClear = async () => {
    console.log('🗑️ [ElectricityBillPage] ===== CLEAR BUTTON CLICKED =====')

    const clearSuccess = DocumentHandler.handleClear({
      currentStatus: frontendStatus?.currentStatus || initialStatus,
      message: '確定要清除所有數據嗎？此操作無法復原。',
      onClear: () => {
        setSubmitting(true)
        try {
          console.log('🗑️ [ElectricityBillPage] Starting complete clear operation...')

          // 清理記憶體檔案
          bills.forEach(bill => {
            DocumentHandler.clearAllMemoryFiles(bill.memoryFiles)
          })

          // 原有的清除邏輯保持不變
          setBills([])
          setError(null)
          setShowClearModal(false)

          setToast({
            message: '資料已清除',
            type: 'success'
          })

        } catch (error) {
          console.error('❌ [ElectricityBillPage] Clear operation failed:', error)
          setError('清除操作失敗，請重試')
        } finally {
          console.log('🗑️ [ElectricityBillPage] Clear operation finished, resetting loading state')
          setSubmitting(false)
        }
      }
    })

    if (!clearSuccess && (frontendStatus?.currentStatus || initialStatus) === 'approved') {
      setToast({
        message: '已通過的資料無法清除',
        type: 'error'
      })
    }
  }

  // 載入既有資料
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true)

        // 載入基本資料
        let existingEntry
        if (isReviewMode && reviewEntryId) {
          console.log('🔍 [ElectricityBillPage] 審核模式 - 載入特定記錄:', reviewEntryId)
          existingEntry = await getEntryById(reviewEntryId)
        } else {
          console.log('🔍 [ElectricityBillPage] 一般模式 - 載入用戶自己的記錄')
          existingEntry = await getEntryByPageKeyAndYear(pageKey, year)
        }

        if (existingEntry && existingEntry.status !== 'draft') {
          setInitialStatus(existingEntry.status as EntryStatus)
          setCurrentEntryId(existingEntry.id)
          setHasSubmittedBefore(true)

          // 載入帳單資料
          if (existingEntry.extraPayload?.billData && Array.isArray(existingEntry.extraPayload.billData)) {
            const billDataWithFiles = await Promise.all(
              existingEntry.extraPayload.billData.map(async (bill: any) => {
                try {
                  const files = await getEntryFiles(existingEntry.id)
                  const associatedFiles = files.filter(f =>
                    f.file_type === 'other' && f.page_key === pageKey
                  )

                  return {
                    id: bill.id || Date.now().toString(),
                    billingStart: bill.billingStart || '',
                    billingEnd: bill.billingEnd || '',
                    billingDays: bill.billingDays || 0,
                    billingUnits: bill.billingUnits || 0,
                    files: associatedFiles,
                    memoryFiles: []
                  }
                } catch {
                  return bill
                }
              })
            )

            setBills(billDataWithFiles)
          }
        }

      } catch (error) {
        setError('載入資料失敗')
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [isReviewMode, reviewEntryId, reviewUserId, year, pageKey])

  // 初始化時新增一筆空白帳單
  useEffect(() => {
    if (!loading && bills.length === 0) {
      addBill()
    }
  }, [loading, bills.length])

  // 載入中狀態
  if (loading) {
    return (
      <div className="min-h-screen bg-green-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4" style={{ color: designTokens.colors.accentPrimary }} />
          <p style={{ color: designTokens.colors.textPrimary }}>載入中...</p>
        </div>
      </div>
    )
  }


  return (
    <div className="min-h-screen bg-green-50">
      {/* 主要內容區域 - 簡化結構，移除多層嵌套 */}
      <div className="max-w-6xl mx-auto px-6 py-8 space-y-6">

        {/* 頁面標題 - 無背景框 */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-semibold mb-3" style={{ color: designTokens.colors.textPrimary }}>
            外購電力使用量填報
          </h1>
          <p className="text-base" style={{ color: designTokens.colors.textSecondary }}>
            請填入外購電力電費繳費單，系統將自動計算各月份使用量
          </p>
        </div>

        {/* 重新提交提示 */}
        {hasSubmittedBefore && (
          <div className="rounded-lg p-4 border-l-4" style={{
            backgroundColor: '#f0f9ff',
            borderColor: designTokens.colors.accentBlue
          }}>
            <div className="flex items-start">
              <CheckCircle className="h-5 w-5 mt-0.5 mr-3" style={{ color: designTokens.colors.accentBlue }} />
              <div>
                <h3 className="text-sm font-medium mb-1" style={{ color: designTokens.colors.accentBlue }}>
                  資料已提交
                </h3>
                <p className="text-sm" style={{ color: designTokens.colors.textSecondary }}>
                  您可以繼續編輯資料，修改後請再次點擊「提交填報」以更新記錄。
                </p>
              </div>
            </div>
          </div>
        )}

        {/* 電費繳費單區域 */}
        <div
          className="rounded-lg border p-6"
          style={{
            backgroundColor: designTokens.colors.cardBg,
            borderColor: designTokens.colors.border,
            boxShadow: designTokens.shadows.sm
          }}
        >
          <h3 className="text-lg font-medium mb-3" style={{ color: designTokens.colors.textPrimary }}>
            電費繳費單
          </h3>

          {/* 月份進度格子 */}
          <div
            className="border border-gray-200 rounded-lg p-4 mb-4"
            style={{ backgroundColor: designTokens.colors.cardBg }}
          >
            {/* 標題 */}
            <div className="mb-4">
              <h3 className="text-lg font-medium mb-3 text-gray-700">
                {year}年度填寫進度
              </h3>
              <div className="flex gap-6 text-base text-gray-600">
                <div className="flex items-center gap-2">
                  <span className="w-4 h-4 bg-green-100 border border-green-300 rounded"></span>
                  <span>完全填寫 (100%)</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-4 h-4 bg-red-100 border border-red-300 rounded"></span>
                  <span>部分填寫 (1-99%)</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-4 h-4 bg-gray-100 border border-gray-300 rounded"></span>
                  <span>未填寫 (0%)</span>
                </div>
              </div>
            </div>


            {/* 12格月份網格 - 顯示度數版本 */}
            <div className="monthly-progress-grid grid grid-cols-6 gap-2">
              {Array.from({ length: 12 }, (_, i) => {
                const month = i + 1
                const monthStatus = monthlyData.statuses[month]
                const monthTotal = monthlyData.totals[month] || 0

                // 根據狀態決定顏色
                let bgColor, borderColor, textColor
                if (monthStatus.status === 'complete') {
                  bgColor = 'bg-green-100 hover:bg-green-200'
                  borderColor = 'border-green-300'
                  textColor = 'text-green-700'
                } else if (monthStatus.status === 'partial') {
                  bgColor = 'bg-red-100 hover:bg-red-200'
                  borderColor = 'border-red-300'
                  textColor = 'text-red-700'
                } else {
                  bgColor = 'bg-gray-100 hover:bg-gray-200'
                  borderColor = 'border-gray-300'
                  textColor = 'text-gray-400'
                }

                // 建立詳細的 tooltip
                let tooltipContent = `${month}月 (${monthStatus.daysInMonth}天)`
                if (monthStatus.status === 'complete') {
                  tooltipContent += `\n完整覆蓋\n用量: ${monthTotal.toFixed(2)} 度`
                } else if (monthStatus.status === 'partial') {
                  tooltipContent += `\n部分覆蓋 (${monthStatus.percentage}%)\n已填: ${monthStatus.coveredDays}天\n用量: ${monthTotal.toFixed(2)} 度`
                } else {
                  tooltipContent += '\n無資料'
                }

                return (
                  <div
                    key={month}
                    className={`
                      rounded-lg p-4 text-center border-2 transition-all duration-200 cursor-help
                      ${bgColor} ${borderColor}
                    `}
                    title={tooltipContent}
                  >
                    {/* 月份標籤 */}
                    <div className="text-sm font-medium text-gray-700 mb-2">
                      {month}月
                    </div>

                    {/* 用量顯示 */}
                    <div className={`mt-2 ${textColor}`}>
                      {monthStatus.status === 'empty' ? (
                        <span className="text-2xl">○</span>
                      ) : (
                        <div className="text-lg font-bold">
                          {monthTotal.toFixed(1)} 度
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>

            {/* 響應式布局說明（手機版改為3x4） */}
            <style>{`
              @media (max-width: 640px) {
                .monthly-progress-grid {
                  grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
                }
              }
            `}</style>
          </div>

          <div className="space-y-3">
            {bills.map((bill, index) => (
              <div key={bill.id}>
                <div className="flex items-center gap-4 p-4 bg-white border border-gray-200 rounded-lg">
                  {/* 編號 */}
                  <div className="flex-shrink-0 w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                    <span className="text-sm font-medium text-green-700">{index + 1}</span>
                  </div>

                  {/* 計費期間 */}
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-600">計費期間</span>
                    <input
                      type="text"
                      placeholder="112/1/1"
                      value={bill.billingStart}
                      onChange={(e) => handleBillChange(bill.id, 'billingStart', e.target.value)}
                      className="w-32 px-3 py-1.5 border rounded focus:ring-2 focus:ring-green-500 focus:border-green-500"
                      disabled={submitting || !editPermissions.canEdit || isReviewMode}
                    />
                    <span className="text-gray-500">~</span>
                    <input
                      type="text"
                      placeholder="112/2/6"
                      value={bill.billingEnd}
                      onChange={(e) => handleBillChange(bill.id, 'billingEnd', e.target.value)}
                      className="w-32 px-3 py-1.5 border rounded focus:ring-2 focus:ring-green-500 focus:border-green-500"
                      disabled={submitting || !editPermissions.canEdit || isReviewMode}
                    />
                    {bill.billingDays > 0 && (
                      <span className="text-sm text-gray-600">({bill.billingDays}天)</span>
                    )}
                  </div>

                  {/* 用電度數 */}
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-600">用電度數</span>
                    <input
                      type="number"
                      placeholder="0"
                      min="0"
                      step="0.1"
                      value={bill.billingUnits || ''}
                      onChange={(e) => handleBillChange(bill.id, 'billingUnits', Number(e.target.value) || 0)}
                      className="w-24 px-3 py-1.5 border rounded focus:ring-2 focus:ring-green-500 focus:border-green-500"
                      disabled={submitting || !editPermissions.canEdit || isReviewMode}
                    />
                    <span className="text-sm text-gray-500">度</span>
                  </div>

                  {/* 帳單檔案 */}
                  <div className="flex-1">
                    <EvidenceUpload
                      pageKey={pageKey}
                      files={bill.files}
                      onFilesChange={(files) => handleBillChange(bill.id, 'files', files)}
                      memoryFiles={bill.memoryFiles || []}
                      onMemoryFilesChange={(memFiles) => handleBillChange(bill.id, 'memoryFiles', memFiles)}
                      maxFiles={1}
                      disabled={submitting || !editPermissions.canUploadFiles || isReviewMode}
                      kind="other"
                      mode="edit"
                    />
                  </div>

                  {/* 刪除 */}
                  {editPermissions.canEdit && bills.length > 1 && (
                    <button
                      onClick={() => removeBill(bill.id)}
                      className="text-gray-400 hover:text-red-500 text-xl leading-none"
                      disabled={submitting || isReviewMode}
                      title="刪除帳單"
                    >
                      ×
                    </button>
                  )}
                </div>

                {/* 日期格式提示 - 只在第一個帳單下方顯示 */}
                {index === 0 && (
                  <div className="text-xs text-gray-500 mt-1 ml-12">
                    格式：民國年/月/日 (例：112/1/5 或 112/01/05)
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* 新增帳單按鈕 */}
          {editPermissions.canEdit && (
            <button
              onClick={addBill}
              disabled={submitting || isReviewMode}
              className="w-full py-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-green-500 hover:text-green-600 transition-colors"
            >
              + 新增電費單
            </button>
          )}
        </div>

        {/* 底部空間 */}
        <div className="h-20"></div>
      </div>

      {/* 錯誤模態框 */}
      {error && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
          <div className="bg-white rounded-lg shadow-lg max-w-md w-full p-6">
            <div className="flex items-start space-x-3 mb-4">
              <AlertCircle className="w-6 h-6 text-red-500 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">發生錯誤</h3>
                <div className="text-sm text-gray-600 space-y-1">
                  {error.split('\n').map((line, index) => (
                    <div key={index}>{line}</div>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex justify-end">
              <button
                onClick={() => setError(null)}
                className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
              >
                確定
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 成功模態框 */}
      {showSuccessModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
          <div className="bg-white rounded-lg shadow-lg max-w-md w-full p-6">
            <div className="text-center">
              <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">提交成功！</h3>
              <p className="text-gray-600 mb-6">外購電力使用量資料已成功儲存</p>
              <button
                onClick={() => setShowSuccessModal(false)}
                className="px-6 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600"
              >
                確認
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 清除確認模態框 */}
      {showClearModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
          <div className="bg-white rounded-lg shadow-lg max-w-md w-full p-6">
            <div className="flex items-start space-x-3 mb-4">
              <AlertCircle className="w-6 h-6 text-orange-500 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">確認清除</h3>
                <p className="text-gray-600">清除後，所有繳費單資料都會被移除，確定要繼續嗎？</p>
              </div>
            </div>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowClearModal(false)}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                取消
              </button>
              <button
                onClick={handleClear}
                className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
              >
                確定清除
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 底部操作欄 - 審核模式下隱藏 */}
      {!isReviewMode && (
        <BottomActionBar
          currentStatus={frontendStatus?.currentStatus || initialStatus}
          currentEntryId={currentEntryId}
          isUpdating={submitting}
          hasSubmittedBefore={hasSubmittedBefore}
          hasAnyData={bills.length > 0 && bills.some(bill => bill.billingUnits > 0)}
          editPermissions={editPermissions}
          submitting={submitting}
          onSubmit={handleSubmit}
          onClear={() => setShowClearModal(true)}
          designTokens={designTokens}
        />
      )}

      {/* 審核區塊 - 只在審核模式顯示 */}
      {isReviewMode && currentEntryId && (
        <ReviewSection
          entryId={reviewEntryId || currentEntryId}
          userId={reviewUserId || "current_user"}
          category="外購電力"
          userName={reviewUserId || "用戶"}
          amount={bills.reduce((sum, bill) => sum + bill.billingUnits, 0)}
          unit="度"
          onApprove={() => {
            console.log('✅ 外購電力填報審核通過 - 由 ReviewSection 處理')
          }}
          onReject={(reason) => {
            console.log('❌ 外購電力填報已退回 - 由 ReviewSection 處理:', reason)
          }}
        />
      )}

      {/* Toast 通知 */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

    </div>
  )
}

export default ElectricityBillPage