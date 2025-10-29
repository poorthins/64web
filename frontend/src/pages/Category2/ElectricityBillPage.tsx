import { useState, useEffect, useMemo, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import { AlertCircle, CheckCircle, Loader2, X, Trash2, Plus, Eye } from 'lucide-react'
import EvidenceUpload, { MemoryFile } from '../../components/EvidenceUpload'
import { EntryStatus } from '../../components/StatusSwitcher'
import Toast, { ToastType } from '../../components/Toast'
import BottomActionBar from '../../components/BottomActionBar'
import ReviewSection from '../../components/ReviewSection'
import { useEditPermissions } from '../../hooks/useEditPermissions'
import { useFrontendStatus } from '../../hooks/useFrontendStatus'
import { useApprovalStatus } from '../../hooks/useApprovalStatus'
import { useStatusBanner, getBannerColorClasses } from '../../hooks/useStatusBanner'
import { useEnergyData } from '../../hooks/useEnergyData'
import { useEnergySubmit } from '../../hooks/useEnergySubmit'
import { useEnergyClear } from '../../hooks/useEnergyClear'
import { useSubmitGuard } from '../../hooks/useSubmitGuard'
import { useGhostFileCleaner } from '../../hooks/useGhostFileCleaner'
import { useRole } from '../../hooks/useRole'
import { useAdminSave } from '../../hooks/useAdminSave'
import { commitEvidence, getEntryFiles, EvidenceFile, uploadEvidenceWithEntry, deleteEvidenceFile } from '../../api/files'
import { upsertEnergyEntry, UpsertEntryInput, updateEntryStatus, getEntryByPageKeyAndYear, deleteEnergyEntry } from '../../api/entries'
import { supabase } from '../../lib/supabaseClient'
import { designTokens } from '../../utils/designTokens'
import MonthlyProgressGrid, { MonthStatus } from '../../components/MonthlyProgressGrid'
import { DocumentHandler } from '../../services/documentHandler'

// 電表資料結構
interface Meter {
  id: string
  meterNumber: string  // 電表電號
}

// 簡化的帳單資料結構
interface SimpleBillData {
  id: string
  meterId?: string     // ⭐ 新增：關聯到哪個電表
  paymentMonth: number // 繳費月份 (1-12)
  billingStart: string // 計費開始日期 (民國年格式)
  billingEnd: string   // 計費結束日期 (民國年格式)
  billingDays: number  // 計費天數 (自動計算)
  billingUnits: number // 用電度數
  files: EvidenceFile[]
}


const ElectricityBillPage = () => {
  const [searchParams] = useSearchParams()

  // 審核模式檢測
  const isReviewMode = searchParams.get('mode') === 'review'
  const reviewEntryId = searchParams.get('entryId')
  const reviewUserId = searchParams.get('userId')

  // 基本狀態
  const { executeSubmit, submitting } = useSubmitGuard()
  const [error, setError] = useState<string | null>(null)
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null)

  // 表單資料
  const [year] = useState(new Date().getFullYear())
  const [meters, setMeters] = useState<Meter[]>([])  // ⭐ 電表清單
  const [bills, setBills] = useState<SimpleBillData[]>([])

  // 狀態管理
  const [currentEntryId, setCurrentEntryId] = useState<string | null>(null)
  const [initialStatus, setInitialStatus] = useState<EntryStatus>('submitted')
  const [hasSubmittedBefore, setHasSubmittedBefore] = useState(false)
  const [showSuccessModal, setShowSuccessModal] = useState(false)
  const [showClearModal, setShowClearModal] = useState(false)

  // ⭐ 電表管理狀態
  const [newMeterNumber, setNewMeterNumber] = useState('')

  // 記憶體檔案狀態
  const [billMemoryFiles, setBillMemoryFiles] = useState<Record<string, MemoryFile[]>>({})

  const pageKey = 'electricity'

  // 前端狀態管理
  const frontendStatus = useFrontendStatus({
    initialStatus,
    entryId: currentEntryId,
    onStatusChange: () => {},
    onError: (err: string) => setError(err),
    onSuccess: (msg: string) => setToast({ message: msg, type: 'success' })
  })

  const { reload: reloadApprovalStatus, ...approvalStatus } = useApprovalStatus(pageKey, year)
  const banner = useStatusBanner(approvalStatus, isReviewMode)

  // 角色檢查 Hook
  const { role } = useRole()
  const isReadOnly = isReviewMode && role !== 'admin'

  const effectiveStatus = (approvalStatus?.status || frontendStatus?.currentStatus || initialStatus) as EntryStatus
  const editPermissions = useEditPermissions(effectiveStatus, isReadOnly)
  const { cleanFiles } = useGhostFileCleaner()

  // 🔍 Debug: 審核狀態檢查
  useEffect(() => {
    console.log('🔍 [Electricity] Approval status debug:', {
      approvalStatus,
      isApproved: approvalStatus.isApproved,
      status: approvalStatus.status,
      effectiveStatus,
      editPermissions,
      isReviewMode
    })
  }, [approvalStatus, effectiveStatus, editPermissions, isReviewMode])

  // useEnergyData Hook - 自動載入 entry 和 files
  const entryIdToLoad = isReviewMode && reviewEntryId ? reviewEntryId : undefined
  const {
    entry: loadedEntry,
    files: loadedFiles,
    loading: dataLoading,
    error: dataError,
    reload
  } = useEnergyData(pageKey, year, entryIdToLoad)

  // 統一 loading 狀態
  const loading = dataLoading

  // useEnergySubmit Hook - 處理提交邏輯
  const { submit: submitEnergy, save: saveEnergy, submitting: energySubmitting, success: submitSuccess } = useEnergySubmit(pageKey, year, approvalStatus.status)  // ✅ 使用資料庫狀態

  // useEnergyClear Hook - 處理清除邏輯
  const { clear: clearEnergy, clearing } = useEnergyClear(
    currentEntryId,
    frontendStatus?.currentStatus || initialStatus
  )

  // useAdminSave Hook - 管理員審核模式儲存
  const { save: adminSave, saving: adminSaving } = useAdminSave(pageKey, reviewEntryId)

  // 監聽帳單變化，確保月份格子即時更新
  useEffect(() => {
    console.log('帳單資料更新，月份格子將重新渲染', {
      帳單數量: bills.length,
      帳單內容: bills.map(b => ({
        id: b.id,
        開始: b.billingStart,
        結束: b.billingEnd,
        度數: b.billingUnits
      }))
    })
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

  // ROC 日期轉 ISO 日期 (113/1/5 → 2024-01-05)
  const rocToISO = (rocDate: string): string => {
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

  // ISO 日期轉 ROC 日期 (2024-01-05 → 113/1/5)
  const isoToROC = (isoDate: string): string => {
    try {
      if (!isoDate) return ''
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

  // ROC 日期轉 Date 物件（用於日期比較）
  const rocToDate = (rocDate: string): Date | null => {
    if (!rocDate || !validateRocDate(rocDate)) return null
    const [rocYear, month, day] = rocDate.split('/').map(Number)
    const isoYear = rocYear + 1911
    return new Date(isoYear, month - 1, day)
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

  // 判斷兩個日期區間是否重疊
  const isDateRangeOverlapping = (
    start1: string,
    end1: string,
    start2: string,
    end2: string
  ): boolean => {
    const date1Start = rocToDate(start1)
    const date1End = rocToDate(end1)
    const date2Start = rocToDate(start2)
    const date2End = rocToDate(end2)

    // 如果任何日期無效，視為不重疊
    if (!date1Start || !date1End || !date2Start || !date2End) {
      return false
    }

    // 重疊條件：start1 <= end2 AND end1 >= start2
    return date1Start <= date2End && date1End >= date2Start
  }

  // 檢測所有帳單的重疊情況
  const detectDateOverlaps = (bills: SimpleBillData[]): Map<string, string[]> => {
    const overlaps = new Map<string, string[]>()

    // 只檢查有完整日期的帳單
    const validBills = bills.filter(b => b.billingStart && b.billingEnd)

    for (let i = 0; i < validBills.length; i++) {
      for (let j = i + 1; j < validBills.length; j++) {
        const billA = validBills[i]
        const billB = validBills[j]

        if (isDateRangeOverlapping(
          billA.billingStart, billA.billingEnd,
          billB.billingStart, billB.billingEnd
        )) {
          // 記錄重疊關係
          if (!overlaps.has(billA.id)) overlaps.set(billA.id, [])
          if (!overlaps.has(billB.id)) overlaps.set(billB.id, [])

          // 找到原始索引（用於顯示「第幾張帳單」）
          const originalIndexA = bills.findIndex(b => b.id === billA.id)
          const originalIndexB = bills.findIndex(b => b.id === billB.id)

          overlaps.get(billA.id)!.push(`第${originalIndexB + 1}張帳單`)
          overlaps.get(billB.id)!.push(`第${originalIndexA + 1}張帳單`)
        }
      }
    }

    return overlaps
  }

  // ⭐ 即時計算帳單重疊狀態
  const billOverlaps = useMemo(() => {
    return detectDateOverlaps(bills)
  }, [bills])

  // 簡化的月份分配計算（⭐ 加入目標年份過濾）
  const calculateMonthlyDistribution = (bill: SimpleBillData, targetYear: number): Record<number, number> => {
    if (!bill.billingStart || !bill.billingEnd || !bill.billingUnits || bill.billingDays <= 0) {
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
      const effectiveUnits = bill.billingUnits * (effectiveDays / bill.billingDays)

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
        原始天數: bill.billingDays,
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

  // 計算每月總使用量和狀態 - 使用 useMemo 確保即時更新
  const monthlyData = useMemo(() => {
    console.log('重新計算月份資料，帳單數:', bills.length)

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
      // ⭐ 計算用量分配（傳入目標年份）
      const distribution = calculateMonthlyDistribution(bill, year)
      Object.entries(distribution).forEach(([month, usage]) => {
        const monthNum = Number(month)
        totals[monthNum] = (totals[monthNum] || 0) + usage
      })

      // 計算覆蓋天數（✅ 移除 billingUnits > 0 條件，只要有日期就計算覆蓋度）
      if (bill.billingStart && bill.billingEnd) {
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

    console.log('月份狀態更新:', statuses)
    return { totals, statuses }
  }, [bills])

  const monthlyTotals = monthlyData.totals


  // 計算月份涵蓋度（該月被帳單涵蓋的天數百分比）
  const calculateMonthCoverage = (month: number, bills: SimpleBillData[]): number => {
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

  // 月份進度狀態
  const monthlyProgress: MonthStatus[] = useMemo(() => {
    // 計算年度總量
    const yearlyTotal = Object.values(monthlyTotals).reduce((sum, usage) => sum + usage, 0)
    // 預期每月平均用量（如果有資料的話）
    const expectedMonthlyTotal = yearlyTotal > 0 ? yearlyTotal / 12 : 0

    return Array.from({ length: 12 }, (_, i) => {
      const month = i + 1
      const usage = monthlyTotals[month] || 0

      // 計算百分比 - 基於該月帳單涵蓋天數的概念
      let coverage = 0
      let status: 'complete' | 'partial' | 'empty' = 'empty'

      if (usage > 0) {
        // 檢查該月是否被帳單完全涵蓋
        const monthCoverage = calculateMonthCoverage(month, bills)

        if (monthCoverage >= 100) {
          // 該月被完全涵蓋
          coverage = 100
          status = 'complete'
        } else if (monthCoverage > 0) {
          // 該月被部分涵蓋
          coverage = monthCoverage
          status = 'partial'
        }
      }

      return {
        month,
        status,
        coverage,
        details: usage > 0 ? `${usage.toFixed(2)} 度` : undefined
      }
    })
  }, [monthlyTotals, bills])

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
        const distribution = calculateMonthlyDistribution(updated, year)
        const affectedMonths = Object.keys(distribution).map(Number)
        console.log(`帳單 ${id} 影響月份:`, affectedMonths, '分配:', distribution)

        // 影響月份將在下次 render 時自動更新
      }

      return updated
    }))
  }

  // 新增帳單
  const addBill = () => {
    const newBill: SimpleBillData = {
      id: Date.now().toString(),
      meterId: bills[bills.length - 1]?.meterId || '',  // ⭐ 自動帶入上一張的電表
      paymentMonth: bills.length + 1,  // 自動設定期數（第1期、第2期...）
      billingStart: '',
      billingEnd: '',
      billingDays: 0,
      billingUnits: 0,
      files: []
    }
    setBills(prev => [...prev, newBill])
  }

  // 移除帳單
  const removeBill = (id: string) => {
    setBills(prev => prev.filter(bill => bill.id !== id))
  }

  // ⭐ 電表管理函式
  const addMeterFromInput = () => {
    const trimmed = newMeterNumber.trim()
    if (!trimmed) {
      setError('請輸入電表電號')
      return
    }

    // 檢查重複
    if (meters.some(m => m.meterNumber === trimmed)) {
      setError('此電表電號已存在')
      return
    }

    const newMeter: Meter = {
      id: Date.now().toString(),
      meterNumber: trimmed
    }
    setMeters(prev => [...prev, newMeter])
    setNewMeterNumber('')
    setToast({ message: '電表新增成功', type: 'success' })
  }

  const deleteMeter = (id: string) => {
    // 檢查是否有帳單使用此電表
    const usedByBills = bills.filter(b => b.meterId === id)
    if (usedByBills.length > 0) {
      setError(`無法刪除：有 ${usedByBills.length} 張帳單正在使用此電表`)
      return
    }

    setMeters(prev => prev.filter(m => m.id !== id))
    setToast({ message: '電表刪除成功', type: 'success' })
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

      // ⭐ 檢查電表選擇
      if (!bill.meterId) {
        errors.push(`第${billNum}筆繳費單：請選擇電表電號`)
      }

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

      // 檢查帳單檔案（包含已提交檔案和記憶體暫存檔案）
      const billMemoryFilesForThisBill = billMemoryFiles[bill.id] || []
      const totalBillFiles = bill.files.length + billMemoryFilesForThisBill.length
      if (totalBillFiles === 0) {
        errors.push(`第${billNum}筆繳費單：請上傳繳費單檔案`)
      }
    })

    // ⭐ 檢測帳單時間重疊
    const overlaps = detectDateOverlaps(bills)
    if (overlaps.size > 0) {
      overlaps.forEach((conflictsWith, billId) => {
        const billIndex = bills.findIndex(b => b.id === billId)
        errors.push(
          `第${billIndex + 1}張帳單的計費期間與 ${conflictsWith.join('、')} 重疊，請調整日期以避免重複計算`
        )
      })
    }

    // ✅ 移除「必須填滿 12 個月」的強制檢查
    // 使用者可以只填部分月份，稍後繼續填寫
    // entries.ts 的 total > 0 檢查已確保至少有一個月有資料

    return errors
  }

  // 提交資料
  const handleSubmit = async () => {
    // ✅ 防止重複提交
    if (submitting || energySubmitting) {
      console.log('⚠️ 已經在提交中，忽略重複點擊')
      return
    }

    const errors = validateData()
    if (errors.length > 0) {
      setError(errors.join('\n'))
      return
    }

    try {
      // 建立月份資料（電力不需要熱值轉換）
      const monthly: Record<string, number> = {}
      Object.entries(monthlyTotals).forEach(([month, usage]) => {
        if (usage > 0) {
          monthly[month] = usage  // 直接使用度數
        }
      })

      // 準備帳單資料
      const billData = bills.map(bill => ({
        id: bill.id,
        meterId: bill.meterId,  // ⭐ 保存電表關聯
        paymentMonth: bill.paymentMonth,
        billingStartDate: bill.billingStart,
        billingEndDate: bill.billingEnd,
        billingDays: bill.billingDays,
        billingUnits: bill.billingUnits
      }))

      // ✅ 加入除錯日誌
      console.log('📤 [Electricity] 準備提交的 billData:', billData)
      console.log('📤 [Electricity] 帳單數量:', bills.length)
      console.log('📤 [Electricity] 檔案數量:', Object.keys(billMemoryFiles).length)

      // ✅ 使用 Hook 提交（不傳帳單檔案）
      const entry_id = await submitEnergy({
        formData: {
          monthly,
          unit: 'kWh',
          extraPayload: {
            billData,
            meters,  // ⭐ 保存電表清單
            notes: `外購電力用量填報 - ${bills.length}筆繳費單`
          }
        },
        msdsFiles: [],  // 電力不需要熱值佐證檔案
        monthlyFiles: Array(12).fill([])  // ✅ 空陣列，不用這個參數
      })

      // ✅ 複製要上傳的檔案陣列（避免 state 清空後丟失）
      const billFilesToUpload = bills.map((bill, i) => ({
        index: i,
        files: [...(billMemoryFiles[bill.id] || [])]
      }))

      // ✅ 立刻清空記憶體檔案（在上傳前，避免重複顯示）
      setBillMemoryFiles({})

      // ✅ 手動上傳每張帳單的檔案（使用複製的陣列）
      for (const { index, files } of billFilesToUpload) {
        for (const memFile of files) {
          try {
            await uploadEvidenceWithEntry(memFile.file, {
              entryId: entry_id,
              pageKey,
              standard: '64',
              recordIndex: index,  // ✅ 用帳單索引，支援無限帳單
              fileType: 'usage_evidence'  // ✅ 明確指定檔案類型，避免預設為 'other'
            })
          } catch (error) {
            console.error(`上傳第 ${index} 筆帳單的檔案失敗:`, error)
          }
        }
      }

      setCurrentEntryId(entry_id)

      // ✅ 重新載入資料（包含剛上傳的檔案）
      await reload()

      // 更新前端狀態
      await frontendStatus?.handleSubmitSuccess()

      // 重新載入審核狀態，更新狀態橫幅
      reloadApprovalStatus()

      // 顯示成功訊息（使用 Hook 的成功訊息）
      const totalUsage = Object.values(monthlyTotals).reduce((sum, usage) => sum + usage, 0)
      const filledMonths = Object.values(monthlyTotals).filter(v => v > 0).length
      setToast({
        message: `提交成功！已填寫 ${filledMonths}/12 個月，您可以隨時回來繼續填寫`,
        type: 'success'
      })
      setShowSuccessModal(true)
      setHasSubmittedBefore(true)

    } catch (error) {
      console.error('❌ [Electricity] 提交失敗:', error)
      setError(error instanceof Error ? error.message : '提交失敗')
    }
  }

  // 暫存資料（不驗證）
  const handleSave = async () => {
    // ✅ 防止重複提交
    if (submitting || energySubmitting) {
      console.log('⚠️ 已經在暫存中，忽略重複點擊')
      return
    }

    try {
      // 建立月份資料（電力不需要熱值轉換）
      const monthly: Record<string, number> = {}
      Object.entries(monthlyTotals).forEach(([month, usage]) => {
        if (usage > 0) {
          monthly[month] = usage  // 直接使用度數
        }
      })

      // 準備帳單資料
      const billData = bills.map(bill => ({
        id: bill.id,
        meterId: bill.meterId,  // ⭐ 保存電表關聯
        paymentMonth: bill.paymentMonth,
        billingStartDate: bill.billingStart,
        billingEndDate: bill.billingEnd,
        billingDays: bill.billingDays,
        billingUnits: bill.billingUnits
      }))

      // 📝 管理員審核模式：使用 useAdminSave hook
      if (isReviewMode && reviewEntryId) {
        const totalAmount = Object.values(monthly).reduce((sum, val) => sum + val, 0)

        await adminSave({
          updateData: {
            unit: 'kWh',
            amount: totalAmount,
            payload: {
              monthly,
              billData,
              meters,
              notes: `外購電力用量填報 - ${bills.length}筆繳費單`
            }
          },
          files: bills.flatMap((bill, i) =>
            (billMemoryFiles[bill.id] || []).map(mf => ({
              file: mf.file,
              metadata: { recordIndex: i, fileType: 'usage_evidence' as const }
            }))
          )
        })

        // 清空記憶體檔案
        setBillMemoryFiles({})

        // 重新載入資料
        await reload()
        reloadApprovalStatus()
        setToast({ message: '✅ 儲存成功！資料已更新', type: 'success' })
        return
      }

      // ✅ 使用 Hook 暫存（不傳帳單檔案）
      const entry_id = await saveEnergy({
        formData: {
          monthly,
          unit: 'kWh',
          extraPayload: {
            billData,
            meters,  // ⭐ 保存電表清單
            notes: `外購電力用量填報 - ${bills.length}筆繳費單`
          }
        },
        msdsFiles: [],
        monthlyFiles: Array(12).fill([])
      })

      // ✅ 複製要上傳的檔案陣列（避免 state 清空後丟失）
      const billFilesToUpload = bills.map((bill, i) => ({
        index: i,
        files: [...(billMemoryFiles[bill.id] || [])]
      }))

      // ✅ 立刻清空記憶體檔案（在上傳前，避免重複顯示）
      setBillMemoryFiles({})

      // ✅ 手動上傳每張帳單的檔案（使用複製的陣列）
      for (const { index, files } of billFilesToUpload) {
        for (const memFile of files) {
          try {
            await uploadEvidenceWithEntry(memFile.file, {
              entryId: entry_id,
              pageKey,
              standard: '64',
              recordIndex: index,
              fileType: 'usage_evidence'
            })
          } catch (error) {
            console.error(`上傳第 ${index} 筆帳單的檔案失敗:`, error)
          }
        }
      }

      setCurrentEntryId(entry_id)

      // ✅ 重新載入資料（包含剛上傳的檔案）
      await reload()

      // 重新載入審核狀態，更新狀態橫幅
      reloadApprovalStatus()

      // 暫存成功，顯示訊息（但不觸發 handleSubmitSuccess）
      setToast({
        message: '暫存成功！資料已儲存',
        type: 'success'
      })

    } catch (error) {
      console.error('❌ [Electricity] 暫存失敗:', error)
      setError(error instanceof Error ? error.message : '暫存失敗')
    }
  }

  // 清除所有資料
  const handleClear = async () => {
    try {
      // 收集所有檔案（所有帳單檔案）
      const allFilesToDelete: EvidenceFile[] = []
      bills.forEach(bill => {
        allFilesToDelete.push(...bill.files)
      })

      // 收集所有記憶體檔案
      const allMemoryFilesToClean: MemoryFile[] = []
      Object.values(billMemoryFiles).forEach(files => {
        allMemoryFilesToClean.push(...files)
      })

      // 使用 Hook 清除
      await clearEnergy({
        filesToDelete: allFilesToDelete,
        memoryFilesToClean: allMemoryFilesToClean
      })

      // ✅ 清除成功後，重置前端狀態
      setCurrentEntryId(null)
      setHasSubmittedBefore(false)
      setBillMemoryFiles({})
      setMeters([])  // ⭐ 清除電表清單
      setNewMeterNumber('')  // ⭐ 清除輸入框
      setBills([{  // 重置為一張空白帳單
        id: Date.now().toString(),
        meterId: '',  // ⭐ 加入電表欄位
        paymentMonth: 1,
        billingStart: '',
        billingEnd: '',
        billingDays: 0,
        billingUnits: 0,
        files: []
      }])

      // ✅ 關閉確認彈窗
      setShowClearModal(false)

      // ✅ 顯示成功訊息
      setToast({ message: '資料已完全清除', type: 'success' })
      setError(null)

    } catch (error) {
      console.error('❌ 清除操作失敗:', error)
      const errorMessage = error instanceof Error ? error.message : '清除操作失敗，請重試'
      setError(errorMessage)
      setShowClearModal(false)
    }
  }

  // 處理 Hook 載入的資料
  useEffect(() => {
    const processLoadedData = async () => {
      // ⭐ 等待資料載入完成（避免在 files = [] 時執行）
      if (dataLoading) {
        console.log('🔍 [ElectricityPage] 等待資料載入中...')
        return
      }

      if (!loadedEntry) {
        return
      }

      try {
        // 設置基本狀態
        setInitialStatus(loadedEntry.status as EntryStatus)
        setCurrentEntryId(loadedEntry.id)
        setHasSubmittedBefore(true)

        // ⭐ 載入電表清單
        const metersSource = loadedEntry.payload?.meters || loadedEntry.extraPayload?.meters
        if (metersSource && Array.isArray(metersSource)) {
          setMeters(metersSource)
          console.log('📥 [Electricity] Loaded meters:', metersSource.length)
        }

        // 載入帳單資料（從 payload.billData 讀取）
        const billDataSource = loadedEntry.payload?.billData || loadedEntry.extraPayload?.billData
        console.log('📥 [Electricity] billDataSource:', billDataSource)
        console.log('📥 [Electricity] payload:', loadedEntry.payload)
        console.log('📥 [Electricity] extraPayload:', loadedEntry.extraPayload)

        if (billDataSource && Array.isArray(billDataSource) && billDataSource.length > 0) {
          console.log('📊 [Electricity] Loading bill data from payload:', {
            billCount: billDataSource.length,
            source: loadedEntry.payload?.billData ? 'payload' : 'extraPayload'
          })

          // 清理幽靈檔案
          const validFiles = await cleanFiles(loadedFiles)

          const billDataWithFiles = billDataSource.map((bill: any, index: number) => {
            try {
              const correctPaymentMonth = bill.paymentMonth || (index + 1)

              // ✅ 根據帳單索引（record_index）關聯檔案，不用 paymentMonth
              const associatedFiles = validFiles.filter(f =>
                f.file_type === 'usage_evidence' &&
                f.page_key === pageKey &&
                f.record_index === index  // ✅ 用 recordIndex
              )

              return {
                id: bill.id || Date.now().toString(),
                meterId: bill.meterId || '',  // ⭐ 載入電表關聯
                paymentMonth: correctPaymentMonth,
                billingStart: bill.billingStartDate || '',
                billingEnd: bill.billingEndDate || '',
                billingDays: bill.billingDays || 0,
                billingUnits: bill.billingUnits || 0,
                files: associatedFiles  // ✅ 正確關聯
              }
            } catch (error) {
              console.warn(`載入帳單 ${bill.id} 的檔案時發生錯誤:`, error)
              return {
                id: bill.id || Date.now().toString(),
                meterId: bill.meterId || '',  // ⭐ 載入電表關聯
                paymentMonth: bill.paymentMonth || (index + 1),
                billingStart: bill.billingStartDate || '',
                billingEnd: bill.billingEndDate || '',
                billingDays: bill.billingDays || 0,
                billingUnits: bill.billingUnits || 0,
                files: []
              }
            }
          })

          setBills(billDataWithFiles)
          console.log('✅ [Electricity] Successfully loaded', billDataWithFiles.length, 'bills')
        } else {
          // ✅ 如果沒有資料，確保至少有一張空白帳單
          console.log('⚠️ [Electricity] 沒有載入到帳單資料')
          if (bills.length === 0) {
            console.log('📝 [Electricity] 新增空白帳單（來自 else 分支）')
            addBill()
          }
        }

      } catch (error) {
        console.error('處理載入資料時發生錯誤:', error)
        setError('載入資料失敗')
      }
    }

    processLoadedData()
  }, [loadedEntry, loadedFiles, pageKey, dataLoading])

  // 初始化時新增一筆空白帳單（只有在沒有資料可載入時）
  useEffect(() => {
    if (!loading && bills.length === 0 && !loadedEntry) {
      console.log('📝 [Electricity] 沒有資料可載入，新增空白帳單')
      addBill()
    }
  }, [loading, bills.length, loadedEntry])

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

        {/* 審核狀態橫幅 - 統一管理 */}
        {banner && (
          <div className={`border-l-4 p-4 mb-6 rounded-r-lg ${getBannerColorClasses(banner.type)}`}>
            <div className="flex items-center">
              <div className="text-2xl mr-3">{banner.icon}</div>
              <div className="flex-1">
                <p className="font-bold text-lg">{banner.title}</p>
                {banner.message && <p className="text-sm mt-1">{banner.message}</p>}
                {banner.reason && (
                  <div className="mt-3 p-3 bg-red-50 rounded-md border border-red-200">
                    <p className="text-base font-bold text-red-800 mb-1">退回原因：</p>
                    <p className="text-lg font-semibold text-red-900">{banner.reason}</p>
                  </div>
                )}
                {banner.reviewedAt && (
                  <p className="text-xs mt-2 opacity-75">
                    {banner.type === 'rejected' ? '退回時間' : '審核完成時間'}：
                    {new Date(banner.reviewedAt).toLocaleString()}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* 審核模式指示器 */}
        {isReviewMode && (
          <div className="mb-4 p-3 bg-orange-100 border-2 border-orange-300 rounded-lg">
            <div className="flex items-center justify-center">
              <Eye className="w-5 h-5 text-orange-600 mr-2" />
              <span className="text-orange-800 font-medium">
                📋 審核模式 - 查看填報內容
              </span>
            </div>
            <p className="text-sm text-orange-600 mt-1 text-center">
              所有輸入欄位已鎖定，僅供審核查看
            </p>
          </div>
        )}

        {/* 月份進度格子 - 移到最上面 */}
        <div
          className="rounded-lg border p-6"
          style={{
            backgroundColor: designTokens.colors.cardBg,
            borderColor: designTokens.colors.border,
            boxShadow: designTokens.shadows.sm
          }}
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

        {/* ⭐ 電表管理區塊 - 分離顯示與編輯邏輯 */}
        {/* 顯示條件：有電表資料 OR 有編輯權限 */}
        {(meters.length > 0 || (!isReadOnly && !approvalStatus.isApproved)) && (
          <div className="bg-white border border-gray-300 rounded-lg p-4 mb-6">
            <h3 className="text-sm font-medium text-gray-700 mb-3">⚡ 電表清單</h3>

            {/* 新增電表輸入框 - 編輯模式 + 管理員審核模式 */}
            {!isReadOnly && !approvalStatus.isApproved && (
              <div className="flex gap-2 mb-3">
                <input
                  type="text"
                  value={newMeterNumber}
                  onChange={(e) => setNewMeterNumber(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && addMeterFromInput()}
                  placeholder="輸入電表電號"
                  className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  disabled={submitting}
                />
                <button
                  onClick={addMeterFromInput}
                  disabled={submitting || !newMeterNumber.trim()}
                  className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white text-sm rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  新增
                </button>
              </div>
            )}

            {/* 電表列表 - 永遠顯示（如果有資料） */}
            {meters.length === 0 ? (
              <p className="text-xs text-gray-400 text-center py-2">尚無電表</p>
            ) : (
              <div className="space-y-1">
                {meters.map(meter => (
                  <div
                    key={meter.id}
                    className="flex items-center justify-between px-3 py-2 bg-gray-50 rounded text-sm"
                  >
                    <span className="text-gray-900">{meter.meterNumber}</span>
                    {/* 刪除按鈕 - 編輯模式 + 管理員審核模式 */}
                    {!isReadOnly && !approvalStatus.isApproved && (
                      <button
                        onClick={() => deleteMeter(meter.id)}
                        className="text-xs text-red-600 hover:underline"
                      >
                        刪除
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 新增帳單按鈕 */}
        {!isReadOnly && !approvalStatus.isApproved && (
          <button
            onClick={addBill}
            disabled={submitting}
            className="w-full py-4 bg-green-500 hover:bg-green-600 text-white rounded-lg font-semibold text-lg transition-colors shadow-md hover:shadow-lg"
          >
            ➕ 新增電費繳費單
          </button>
        )}

        {/* 帳單卡片列表 */}
        {bills.length > 0 && (
          <div className="space-y-4">
            {bills.map((bill, index) => (
              <div
                key={bill.id}
                className={`
                  bg-white border-2 rounded-xl p-6 transition-all
                  ${billOverlaps.has(bill.id)
                    ? 'border-red-500 bg-red-50'
                    : 'border-gray-200 hover:border-green-300'
                  }
                `}
              >
                {/* ⭐ 重疊警告訊息 */}
                {billOverlaps.has(bill.id) && (
                  <div className="mb-4 p-3 bg-red-100 border border-red-300 rounded-lg">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                      <div className="text-sm text-red-700">
                        <strong>⚠️ 時間重疊警告：</strong>
                        <br />
                        此帳單的計費期間與 {billOverlaps.get(bill.id)!.join('、')} 重疊，請調整日期以避免重複計算。
                      </div>
                    </div>
                  </div>
                )}

                {/* 卡片標題 */}
                <div className="flex items-center justify-between mb-6 pb-4 border-b-2 border-gray-100">
                  <h3 className="text-lg font-semibold text-green-700 flex items-center gap-2">
                    📄 電費繳費單
                  </h3>
                  {!isReadOnly && !approvalStatus.isApproved && bills.length > 1 && (
                    <button
                      onClick={() => removeBill(bill.id)}
                      className="w-8 h-8 bg-red-500 hover:bg-red-600 text-white rounded-md flex items-center justify-center transition-all hover:scale-110"
                      disabled={submitting}
                      title="刪除帳單"
                    >
                      ×
                    </button>
                  )}
                </div>

                {/* ⭐ 電表選擇 */}
                <div className="mb-4">
                  <label className="block text-sm font-medium mb-3 text-gray-700">
                    電表電號 <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={bill.meterId || ''}
                    onChange={(e) => handleBillChange(bill.id, 'meterId', e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all"
                    disabled={submitting || isReadOnly || approvalStatus.isApproved}
                  >
                    <option value="">請選擇電表</option>
                    {meters.map(meter => (
                      <option key={meter.id} value={meter.id}>
                        {meter.meterNumber}
                      </option>
                    ))}
                  </select>
                </div>

                {/* 計費期間 */}
                <div className="mb-4">
                  <label className="block text-sm font-medium mb-3 text-gray-700">
                    計費期間
                  </label>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="block text-xs text-gray-500 mb-2">開始日期</span>
                      <input
                        type="date"
                        value={rocToISO(bill.billingStart)}
                        onChange={(e) => handleBillChange(bill.id, 'billingStart', isoToROC(e.target.value))}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all"
                        disabled={submitting || isReadOnly || approvalStatus.isApproved}
                      />
                    </div>
                    <div>
                      <span className="block text-xs text-gray-500 mb-2">結束日期</span>
                      <input
                        type="date"
                        value={rocToISO(bill.billingEnd)}
                        onChange={(e) => handleBillChange(bill.id, 'billingEnd', isoToROC(e.target.value))}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all"
                        disabled={submitting || isReadOnly || approvalStatus.isApproved}
                      />
                    </div>
                  </div>
                </div>

                {/* 自動計算天數 */}
                {bill.billingDays > 0 && (
                  <div className="bg-gray-50 rounded-lg p-3 text-center mb-4">
                    <span className="text-gray-600 text-sm">
                      計費天數：<strong className="text-green-700 text-base">{bill.billingDays} 天</strong>（自動計算）
                    </span>
                  </div>
                )}

                {/* 用電度數 */}
                <div className="mb-4">
                  <label className="block text-sm font-medium mb-3 text-gray-700">
                    用電度數 (度)
                  </label>
                  <input
                    type="number"
                    placeholder="0"
                    min="0"
                    step="0.1"
                    value={bill.billingUnits || ''}
                    onChange={(e) => handleBillChange(bill.id, 'billingUnits', Number(e.target.value) || 0)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    disabled={submitting || isReadOnly || approvalStatus.isApproved}
                  />
                </div>

                {/* 帳單檔案 */}
                <div>
                  <label className="block text-sm font-medium mb-3 text-gray-700">
                    電費繳費單檔案
                  </label>
                  <EvidenceUpload
                    pageKey={pageKey}
                    files={bill.files}
                    onFilesChange={(files) => handleBillChange(bill.id, 'files', files)}
                    memoryFiles={billMemoryFiles[bill.id] || []}
                    onMemoryFilesChange={(files) => setBillMemoryFiles(prev => ({...prev, [bill.id]: files}))}
                    maxFiles={3}
                    kind="usage_evidence"
                    mode={isReadOnly || approvalStatus.isApproved ? "view" : "edit"}
                    disabled={submitting || isReadOnly || approvalStatus.isApproved}
                    isAdminReviewMode={isReviewMode && role === 'admin'}
                  />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* 審核區域 */}
        {isReviewMode && reviewEntryId && reviewUserId && (
          <ReviewSection
            entryId={reviewEntryId}
            userId={reviewUserId}
            category="外購電力使用量"
            userName="填報用戶"
            amount={Object.values(monthlyTotals).reduce((sum, usage) => sum + usage, 0)}
            unit="kWh"
            role={role}
            onSave={handleSave}
            isSaving={submitting || energySubmitting}
            onApprove={() => reload()}
            onReject={() => reload()}
          />
        )}

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
                disabled={clearing}
                className="px-4 py-2 text-white rounded-lg transition-colors font-medium flex items-center justify-center"
                style={{
                  backgroundColor: clearing ? '#9ca3af' : designTokens.colors.error,
                  opacity: clearing ? 0.7 : 1
                }}
                onMouseEnter={(e) => {
                  if (!clearing) {
                    (e.target as HTMLButtonElement).style.backgroundColor = '#dc2626';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!clearing) {
                    (e.target as HTMLButtonElement).style.backgroundColor = designTokens.colors.error;
                  }
                }}
              >
                {clearing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    清除中...
                  </>
                ) : (
                  '確定清除'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 底部操作欄 - 只在非唯讀模式且未通過時顯示 */}
      {!isReadOnly && !approvalStatus.isApproved && !isReviewMode && (
        <BottomActionBar
          currentStatus={frontendStatus?.currentStatus || initialStatus}
          currentEntryId={currentEntryId}
          isUpdating={submitting}
          hasSubmittedBefore={hasSubmittedBefore}
          hasAnyData={bills.length > 0 && bills.some(bill => bill.billingUnits > 0)}
          banner={banner}
          editPermissions={editPermissions}
          submitting={submitting}
          saving={submitting}
          onSubmit={handleSubmit}
          onSave={handleSave}
          onClear={() => setShowClearModal(true)}
          designTokens={designTokens}
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
