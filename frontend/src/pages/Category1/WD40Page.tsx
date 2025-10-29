import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Upload, AlertCircle, CheckCircle, Loader2, X, Trash2, Edit, Eye } from 'lucide-react'
import { DocumentHandler } from '../../services/documentHandler'
import EnergyFileManager from '../../components/EnergyFileManager'
import StatusSwitcher, { EntryStatus, canEdit, canUploadFiles, getButtonText } from '../../components/StatusSwitcher'
import StatusIndicator from '../../components/StatusIndicator'
import Toast, { ToastType } from '../../components/Toast'
import BottomActionBar from '../../components/BottomActionBar'
import EvidenceUpload from '../../components/EvidenceUpload'
import { useEditPermissions } from '../../hooks/useEditPermissions'
import { useFrontendStatus } from '../../hooks/useFrontendStatus'
import { useApprovalStatus } from '../../hooks/useApprovalStatus'
import { useStatusBanner, getBannerColorClasses } from '../../hooks/useStatusBanner'
import { useEnergyPageLoader } from '../../hooks/useEnergyPageLoader'
import { useEnergySubmit } from '../../hooks/useEnergySubmit'
import { useEnergyClear } from '../../hooks/useEnergyClear'
import { useSubmitGuard } from '../../hooks/useSubmitGuard'
import { useReloadWithFileSync } from '../../hooks/useReloadWithFileSync'
import { useRole } from '../../hooks/useRole'
import { useAdminSave } from '../../hooks/useAdminSave'
import {
  commitEvidence,
  debugDatabaseContent,
  deleteEvidenceFile,
  EvidenceFile,
  getEntryFiles,
  listMSDSFiles,
  listUsageEvidenceFiles,
  updateFileEntryAssociation,
  uploadEvidenceWithEntry
} from '../../api/files'
import { MemoryFile } from '../../components/EvidenceUpload'
import ReviewSection from '../../components/ReviewSection'
import { useSubmissions } from '../admin/hooks/useSubmissions'

import { upsertEnergyEntry, sumMonthly, UpsertEntryInput, updateEntryStatus, getEntryByPageKeyAndYear, getEntryById, deleteEnergyEntry } from '../../api/entries'
import { supabase } from '../../lib/supabaseClient'
import { designTokens } from '../../utils/designTokens'
import { debugRLSOperation, diagnoseAuthState } from '../../utils/authDiagnostics'
import { logDetailedAuthStatus } from '../../utils/authHelpers'

// 增強的檔案去重工具函數
function deduplicateFilesByID(files: EvidenceFile[], context: string = ''): EvidenceFile[] {
  // 按 ID 去重，如果有重複的 ID，優先保留最新的（created_at 最新）
  const deduplicated = Array.from(
    new Map(files.map(file => [file.id, file])).values()
  )

  return deduplicated
}

// 自定義 debounce 函式
function debounce<T extends (...args: any[]) => any>(func: T, wait: number): T {
  let timeout: NodeJS.Timeout | null = null
  return ((...args: any[]) => {
    if (timeout) clearTimeout(timeout)
    timeout = setTimeout(() => func(...args), wait)
  }) as T
}

interface MonthData {
  month: number
  quantity: number
  totalUsage: number
  files: EvidenceFile[]
}

const WD40Page = () => {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  // 審核模式檢測
  const isReviewMode = searchParams.get('mode') === 'review'
  const reviewEntryId = searchParams.get('entryId')
  const reviewUserId = searchParams.get('userId')

  const [loading, setLoading] = useState(true)
  // 防止重複提交
  const { executeSubmit, submitting } = useSubmitGuard()
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [hasSubmittedBefore, setHasSubmittedBefore] = useState(false)
  const [showSuccessModal, setShowSuccessModal] = useState(false)
  const [showClearConfirmModal, setShowClearConfirmModal] = useState(false)
  const [currentEntryId, setCurrentEntryId] = useState<string | null>(null)
  const [initialStatus, setInitialStatus] = useState<EntryStatus>('submitted')
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null)
  const [existingEntry, setExistingEntry] = useState<any>(null)
  
  // 前端狀態管理 Hook
  const frontendStatus = useFrontendStatus({
    initialStatus,
    entryId: currentEntryId,
    onStatusChange: (newStatus) => {
      // 狀態變更時的回調處理
    },
    onError: (error) => setError(error),
    onSuccess: (message) => {
      // 使用 Toast 顯示狀態變更通知
      setToast({ message, type: 'success' })

      // 同時設置 success 用於傳統的成功訊息顯示
      setSuccess(message)
    }
  })

  const { currentStatus, setCurrentStatus, handleDataChanged, handleSubmitSuccess, isInitialLoad } = frontendStatus

  // 審核 API hook
  const { reviewSubmission } = useSubmissions()

  // 角色檢查
  const { role } = useRole()

  // 表單資料
  const [year] = useState(new Date().getFullYear())
  const pageKey = 'wd40'

  // 資料載入 Hook - 統一處理 entry 和 files 的載入與分類
  const entryIdToLoad = isReviewMode && reviewEntryId ? reviewEntryId : undefined
  const {
    entry: loadedEntry,
    files: loadedFiles,
    loading: dataLoading,
    error: dataError,
    reload
  } = useEnergyPageLoader({
    pageKey,
    year,
    entryId: entryIdToLoad,
    onEntryLoad: (entry) => {
      // 載入基本參數（新結構優先，舊結構備用）
      if (entry.payload.unitCapacity !== undefined) {
        setUnitCapacity(entry.payload.unitCapacity || 0)
        setCarbonRate(entry.payload.carbonRate || 0)
      } else if (entry.payload.notes) {
        // 從舊結構的 notes 解析
        const unitMatch = entry.payload.notes.match(/單位容量: ([\d.]+)/)
        const carbonMatch = entry.payload.notes.match(/含碳率: ([\d.]+)/)
        if (unitMatch) setUnitCapacity(parseFloat(unitMatch[1]) || 0)
        if (carbonMatch) setCarbonRate(parseFloat(carbonMatch[1]) || 0)
      }

      const entryStatus = entry.status as EntryStatus
      setCurrentEntryId(entry.id)
      setHasSubmittedBefore(true)
      setInitialStatus(entryStatus)
      setCurrentStatus(entryStatus)  // 同步前端狀態
      setExistingEntry(entry)

      // 載入月份數據
      if (entry.payload.monthly) {
        const newMonthlyData = Array.from({ length: 12 }, (_, i) => {
          const month = i + 1
          const monthKey = month.toString()
          const quantity = entry.payload.monthlyQuantity?.[monthKey] || 0
          const totalUsage = entry.payload.monthly[monthKey] || 0
          return {
            month,
            quantity,
            totalUsage,
            files: []
          }
        })
        setMonthlyData(newMonthlyData)
      }
    },
    onFilesLoad: (files) => {
      // 分類 MSDS 檔案
      const msds = files.filter(f => f.file_type === 'msds')
      setMsdsFiles(msds)

      // 分配月份檔案（避免重複）
      setMonthlyData(prev => prev.map(data => ({
        ...data,
        files: files.filter(f => f.file_type === 'usage_evidence' && f.month === data.month)
      })))
    }
  })

  // 審核狀態檢查 Hook
  const { reload: reloadApprovalStatus, ...approvalStatus } = useApprovalStatus(pageKey, year)

  // 狀態橫幅 Hook
  const banner = useStatusBanner(approvalStatus, isReviewMode)

  // 提交 Hook
  const {
    submit,
    save,
    submitting: submitLoading,
    error: submitError,
    success: submitSuccess,
    clearError: clearSubmitError,
    clearSuccess: clearSubmitSuccess
  } = useEnergySubmit(pageKey, year, approvalStatus.status)  // ✅ 使用資料庫狀態，不是前端狀態

  // 清除 Hook
  const {
    clear,
    clearing: clearLoading,
    error: clearError,
    clearError: clearClearError
  } = useEnergyClear(currentEntryId, currentStatus)


  // 檔案同步 reload Hook
  const { reloadAndSync } = useReloadWithFileSync(reload)

  const [unitCapacity, setUnitCapacity] = useState<number>(0)
  const [carbonRate, setCarbonRate] = useState<number>(0)
  const [monthlyData, setMonthlyData] = useState<MonthData[]>(
    Array.from({ length: 12 }, (_, i) => ({
      month: i + 1,
      quantity: 0,
      totalUsage: 0,
      files: []
    }))
  )

  // 檔案管理模式
  const [fileManagerMode, setFileManagerMode] = useState<'edit' | 'view'>('view')
  const [hasFileChanges, setHasFileChanges] = useState(false)

  // MSDS 檔案狀態
  const [msdsFiles, setMsdsFiles] = useState<EvidenceFile[]>([])

  // 記憶體暫存檔案狀態
  const [msdsMemoryFiles, setMsdsMemoryFiles] = useState<MemoryFile[]>([])
  const [monthlyMemoryFiles, setMonthlyMemoryFiles] = useState<MemoryFile[][]>(
    Array.from({ length: 12 }, () => [])
  )

  // 編輯權限控制
  const editPermissions = useEditPermissions(currentStatus || 'saved')
  
  // 判斷是否有資料
  const hasAnyData = useMemo(() => {
    const hasMonthlyData = monthlyData?.some(m => m.quantity > 0) || false
    const hasBasicData = unitCapacity > 0 || carbonRate > 0
    const hasMemoryFiles = msdsMemoryFiles.length > 0 || monthlyMemoryFiles.some(files => files.length > 0)
    return hasMonthlyData || hasBasicData || hasMemoryFiles
  }, [monthlyData, unitCapacity, carbonRate, msdsMemoryFiles, monthlyMemoryFiles])
  
  // 審核模式下只有管理員可編輯
  const isReadOnly = isReviewMode && role !== 'admin'

  // 管理員審核儲存 Hook
  const { save: adminSave, saving: adminSaving } = useAdminSave(pageKey, reviewEntryId)

  const monthNames = [
    '1月', '2月', '3月', '4月', '5月', '6月',
    '7月', '8月', '9月', '10月', '11月', '12月'
  ]

  // 組件清理 - 確保離開頁面時清除所有狀態
  useEffect(() => {
    return () => {
      // 重置所有表單狀態
      setUnitCapacity(0)
      setCarbonRate(0)
      setMonthlyData(Array.from({ length: 12 }, (_, i) => ({
        month: i + 1,
        quantity: 0,
        totalUsage: 0,
        files: []
      })))
      setMsdsMemoryFiles([])
      setMonthlyMemoryFiles(Array.from({ length: 12 }, () => []))
      setError(null)
      setSuccess(null)
    }
  }, [])


  // 計算總使用量
  useEffect(() => {
    setMonthlyData(prev => 
      prev.map(data => ({
        ...data,
        totalUsage: data.quantity * unitCapacity
      }))
    )
  }, [unitCapacity])

  // 草稿功能已完全移除

  // 離開頁面提醒
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      // 檢查是否有填寫資料但未提交
      const hasData = unitCapacity > 0 || carbonRate > 0 ||
                     monthlyData.some(d => d.quantity > 0) ||
                     msdsFiles.length > 0 ||
                     msdsMemoryFiles.length > 0 ||
                     monthlyMemoryFiles.some(files => files.length > 0)
      
      if (hasData && !hasSubmittedBefore) {
        e.preventDefault()
        e.returnValue = '您有資料尚未提交，離開將會遺失資料。是否確定離開？'
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [unitCapacity, carbonRate, monthlyData, msdsFiles, hasSubmittedBefore])

  const updateMonthData = (index: number, field: 'quantity', value: number) => {
    setMonthlyData(prev => {
      const newData = [...prev]
      // 確保 value 是有效的數字，處理 NaN 情況
      const safeValue = isNaN(value) ? 0 : value
      const safeUnitCapacity = isNaN(unitCapacity) ? 0 : unitCapacity
      
      newData[index] = { 
        ...newData[index], 
        [field]: safeValue,
        totalUsage: field === 'quantity' ? safeValue * safeUnitCapacity : newData[index].totalUsage
      }
      return newData
    })
  }


  const handleMonthFilesChange = (month: number, files: EvidenceFile[]) => {
    setMonthlyData(prev => prev.map(data =>
      data.month === month ? { ...data, files } : data
    ))
  }

  const handleMsdsFilesChange = (files: EvidenceFile[]) => {
    setMsdsFiles(files)
  }

  // 記憶體檔案處理函數
  const handleMsdsMemoryFilesChange = (files: MemoryFile[]) => {
    setMsdsMemoryFiles(files)
  }

  const handleMonthMemoryFilesChange = (month: number, files: MemoryFile[]) => {
    setMonthlyMemoryFiles(prev => {
      const newFiles = [...prev]
      newFiles[month - 1] = files
      return newFiles
    })
  }

  const getTotalUsage = () => {
    return monthlyData.reduce((sum, data) => sum + data.totalUsage, 0)
  }

  const validateData = () => {
    const errors: string[] = []

    // MSDS 檢查：已上傳檔案 OR 記憶體檔案
    const totalMsdsFiles = msdsFiles.length + msdsMemoryFiles.length

    if (totalMsdsFiles === 0) {
      errors.push('請上傳 MSDS 安全資料表')
    }

    if (unitCapacity <= 0) {
      errors.push('請輸入單位容量')
    }

    if (carbonRate <= 0) {
      errors.push('請輸入含碳率')
    }

    // 月份檔案檢查：已上傳檔案 OR 記憶體檔案
    monthlyData.forEach((data, index) => {
      if (data.quantity > 0) {
        const monthMemoryFiles = monthlyMemoryFiles[index] || []
        const totalFiles = data.files.length + monthMemoryFiles.length

        if (totalFiles === 0) {
          errors.push(`${monthNames[index]}有使用量但未上傳使用證明`)
        }
      }
    })

    return errors
  }

  const handleSubmit = async () => {
    // 驗證資料
    const errors = validateData()
    if (errors.length > 0) {
      setError('請修正以下問題：\n' + errors.join('\n'))
      return
    }

    await executeSubmit(async () => {
      setError(null)
      setSuccess(null)

      // 準備每月數據
      const monthly: Record<string, number> = {}
      const monthlyQuantity: Record<string, number> = {}
      monthlyData.forEach(data => {
        if (data.quantity > 0) {
          monthly[data.month.toString()] = data.totalUsage
          monthlyQuantity[data.month.toString()] = data.quantity
        }
      })

      // 呼叫 Hook 提交
      const entry_id = await submit({
        formData: {
          unitCapacity,
          carbonRate,
          monthly,
          monthlyQuantity,
          unit: 'ML'
        },
        msdsFiles: msdsMemoryFiles,
        monthlyFiles: monthlyMemoryFiles
      })

      // 更新 currentEntryId（不做判斷，直接設定）
      setCurrentEntryId(entry_id)

      // 重新載入後端資料並等待同步完成
      await reloadAndSync()

      // 清空記憶體檔案
      setMsdsMemoryFiles([])
      setMonthlyMemoryFiles(Array.from({ length: 12 }, () => []))

      // 處理狀態轉換
      await frontendStatus.handleSubmitSuccess()

      // 重新載入審核狀態，更新狀態橫幅
      reloadApprovalStatus()

      setHasSubmittedBefore(true)
      setShowSuccessModal(true)
    }).catch(error => {
      console.error('❌ 提交失敗:', error)
      setError(error instanceof Error ? error.message : '提交失敗')
    })
  }

  const handleSave = async () => {
    await executeSubmit(async () => {
      setError(null)
      setSuccess(null)

      // 準備每月數據
      const monthly: Record<string, number> = {}
      const monthlyQuantity: Record<string, number> = {}
      monthlyData.forEach(data => {
        if (data.quantity > 0) {
          monthly[data.month.toString()] = data.totalUsage
          monthlyQuantity[data.month.toString()] = data.quantity
        }
      })

      const totalAmount = Object.values(monthly).reduce((sum, val) => sum + val, 0)

      // 審核模式：使用 useAdminSave hook
      if (isReviewMode && reviewEntryId) {
        console.log('📝 管理員審核模式：使用 useAdminSave hook', reviewEntryId)

        // 準備月份檔案列表
        const filesToUpload: Array<{
          file: File
          metadata: {
            month: number
            fileType: 'usage_evidence' | 'msds' | 'other'
          }
        }> = []

        // 收集每個月份的使用證明檔案
        monthlyMemoryFiles.forEach((memFiles, monthIndex) => {
          if (memFiles && memFiles.length > 0) {
            memFiles.forEach(mf => {
              filesToUpload.push({
                file: mf.file,
                metadata: {
                  month: monthIndex + 1,
                  fileType: 'usage_evidence' as const
                }
              })
            })
          }
        })

        // 收集 MSDS 檔案
        msdsMemoryFiles.forEach((mf, index) => {
          filesToUpload.push({
            file: mf.file,
            metadata: {
              month: index + 1,
              fileType: 'msds' as const
            }
          })
        })

        // 從舊區塊中提取 payload 資料
        await adminSave({
          updateData: {
            unit: 'ML',
            amount: totalAmount,
            payload: {
              unitCapacity,
              carbonRate,
              monthly,
              monthlyQuantity
            },
            updated_at: new Date().toISOString()
          },
          files: filesToUpload
        })

        // 清空記憶體檔案
        setMsdsMemoryFiles([])
        setMonthlyMemoryFiles(Array.from({ length: 12 }, () => []))

        await reloadAndSync()
        reloadApprovalStatus()
        setToast({ message: '[SUCCESS] 儲存成功！資料已更新', type: 'success' })
        return
      }

      // 非審核模式：原本的邏輯
      const entry_id = await save({
        formData: {
          unitCapacity,
          carbonRate,
          monthly,
          monthlyQuantity,
          unit: 'ML'
        },
        msdsFiles: msdsMemoryFiles,
        monthlyFiles: monthlyMemoryFiles
      })

      setCurrentEntryId(entry_id)
      await reloadAndSync()
      setMsdsMemoryFiles([])
      setMonthlyMemoryFiles(Array.from({ length: 12 }, () => []))
      reloadApprovalStatus()
      setToast({ message: '暫存成功！資料已儲存', type: 'success' })
    }).catch(error => {
      console.error('❌ 儲存失敗:', error)
      setError(error instanceof Error ? error.message : '儲存失敗')
    })
  }

  const handleStatusChange = async (newStatus: EntryStatus) => {
    // 手動狀態變更（會更新資料庫）
    try {
      if (currentEntryId) {
        await updateEntryStatus(currentEntryId, newStatus)
      }
      frontendStatus.setFrontendStatus(newStatus)
    } catch (error) {
      setError(error instanceof Error ? error.message : '狀態更新失敗')
    }
  }

  const handleClearAll = async () => {
    try {
      // 收集所有要刪除的檔案
      const allFiles = [...msdsFiles]
      monthlyData.forEach(data => {
        allFiles.push(...data.files)
      })

      // 呼叫 Hook 清除
      await clear({
        filesToDelete: allFiles,
        memoryFilesToClean: [msdsMemoryFiles, ...monthlyMemoryFiles]
      })

      // 清除成功後，重置前端狀態
      setCurrentEntryId(null)
      setHasSubmittedBefore(false)
      setUnitCapacity(0)
      setCarbonRate(0)
      handleMsdsFilesChange([])
      setMsdsMemoryFiles([])
      setMonthlyMemoryFiles(Array.from({ length: 12 }, () => []))
      setMonthlyData(Array.from({ length: 12 }, (_, i) => ({
        month: i + 1,
        quantity: 0,
        totalUsage: 0,
        files: []
      })))

      setError(null)
      setShowClearConfirmModal(false)
      setSuccess('資料已完全清除')

    } catch (error) {
      console.error('❌ 清除操作失敗:', error)
      const errorMessage = error instanceof Error ? error.message : '清除操作失敗，請重試'
      setError(errorMessage)
      setShowClearConfirmModal(false)
    }
  }

  // Loading 狀態
  if (dataLoading) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ backgroundColor: designTokens.colors.background }}
      >
        <div className="text-center">
          <Loader2
            className="w-12 h-12 animate-spin mx-auto mb-4"
            style={{ color: designTokens.colors.accentPrimary }}
          />
          <p style={{ color: designTokens.colors.textPrimary }}>載入中...</p>
        </div>
      </div>
    )
  }

  return (
    <div 
      className="min-h-screen bg-green-50"
    >
      {/* 主要內容區域 - 簡化結構，移除多層嵌套 */}
      <div className="max-w-4xl mx-auto px-6 py-8 space-y-6">

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

        {/* 頁面標題 - 無背景框 */}
        <div className="text-center mb-8">
          {/* 審核模式指示器 */}
          {isReviewMode && (
            <div className="mb-4 p-3 bg-orange-100 border-2 border-orange-300 rounded-lg">
              <div className="flex items-center justify-center">
                <Eye className="w-5 h-5 text-orange-600 mr-2" />
                <span className="text-orange-800 font-medium">
                  📋 審核模式 - 查看填報內容
                </span>
              </div>
              <p className="text-sm text-orange-600 mt-1">
                所有輸入欄位已鎖定，僅供審核查看
              </p>
            </div>
          )}

          <h1
            className="text-4xl font-semibold mb-3"
            style={{ color: designTokens.colors.textPrimary }}
          >
            WD-40 使用數量填報
          </h1>
          <p
            className="text-lg"
            style={{ color: designTokens.colors.textSecondary }}
          >
            {isReviewMode
              ? '管理員審核模式 - 檢視填報內容和相關檔案'
              : '請上傳 MSDS 文件並填入各月份使用數據進行碳排放計算'
            }
          </p>
        </div>


        {/* MSDS 安全資料表與基本參數 */}
        <div 
          className="rounded-lg border p-6"
          style={{ 
            backgroundColor: designTokens.colors.cardBg,
            borderColor: designTokens.colors.border,
            boxShadow: designTokens.shadows.sm
          }}
        >
          <h2 
            className="text-2xl font-medium mb-6" 
            style={{ color: designTokens.colors.textPrimary }}
          >
            MSDS 安全資料表與基本參數
          </h2>
          
          <div className="space-y-6">
            {/* MSDS 檔案上傳 */}
            <div>
              <label 
                className="block text-base font-medium mb-3" 
                style={{ color: designTokens.colors.textPrimary }}
              >
                MSDS 安全資料表
              </label>
              <EvidenceUpload
                pageKey={pageKey}
                files={msdsFiles}
                onFilesChange={setMsdsFiles}
                maxFiles={3}
                kind="msds"
                disabled={submitting || isReadOnly || approvalStatus.isApproved}
                mode={isReadOnly || approvalStatus.isApproved ? "view" : "edit"}
                            isAdminReviewMode={isReviewMode && role === 'admin'}
                memoryFiles={msdsMemoryFiles}
                onMemoryFilesChange={handleMsdsMemoryFilesChange}
              />
            </div>
            
            {/* 基本參數輸入 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label
                  className="block text-base font-medium mb-2"
                  style={{ color: designTokens.colors.textPrimary }}
                >
                  單位容量 (ML/瓶)
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.1"
                  value={unitCapacity || ''}
                  onChange={(e) => {
                    const inputValue = e.target.value.trim()
                    const numValue = inputValue === '' ? 0 : parseFloat(inputValue)
                    setUnitCapacity(isNaN(numValue) ? 0 : numValue)
                  }}
                  disabled={isReadOnly || approvalStatus.isApproved}
                  className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:border-transparent transition-all ${
                    isReadOnly || approvalStatus.isApproved ? 'bg-gray-100 cursor-not-allowed' : ''
                  }`}
                  style={{
                    color: designTokens.colors.textPrimary,
                    borderColor: designTokens.colors.border,
                    borderRadius: designTokens.borderRadius.md
                  }}
                  onFocus={(e) => {
                    if (!isReadOnly && !approvalStatus.isApproved) {
                      (e.target as HTMLInputElement).style.borderColor = designTokens.colors.accentPrimary;
                      (e.target as HTMLInputElement).style.boxShadow = `0 0 0 3px ${designTokens.colors.accentPrimary}20`
                    }
                  }}
                  onBlur={(e) => {
                    (e.target as HTMLInputElement).style.borderColor = designTokens.colors.border;
                    (e.target as HTMLInputElement).style.boxShadow = 'none'
                  }}
                  placeholder="請輸入單位容量"
                />
              </div>

              <div>
                <label
                  className="block text-base font-medium mb-2"
                  style={{ color: designTokens.colors.textPrimary }}
                >
                  含碳率 (%)
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  value={carbonRate || ''}
                  onChange={(e) => {
                    const inputValue = e.target.value.trim()
                    const numValue = inputValue === '' ? 0 : parseFloat(inputValue)
                    setCarbonRate(isNaN(numValue) ? 0 : numValue)
                  }}
                  disabled={isReadOnly || approvalStatus.isApproved}
                  className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:border-transparent transition-all ${
                    isReadOnly || approvalStatus.isApproved ? 'bg-gray-100 cursor-not-allowed' : ''
                  }`}
                  style={{
                    color: designTokens.colors.textPrimary,
                    borderColor: designTokens.colors.border,
                    borderRadius: designTokens.borderRadius.md
                  }}
                  onFocus={(e) => {
                    if (!isReadOnly && !approvalStatus.isApproved) {
                      (e.target as HTMLInputElement).style.borderColor = designTokens.colors.accentPrimary;
                      (e.target as HTMLInputElement).style.boxShadow = `0 0 0 3px ${designTokens.colors.accentPrimary}20`
                    }
                  }}
                  onBlur={(e) => {
                    (e.target as HTMLInputElement).style.borderColor = designTokens.colors.border;
                    (e.target as HTMLInputElement).style.boxShadow = 'none'
                  }}
                  placeholder="請輸入含碳率"
                />
              </div>
            </div>
          </div>
        </div>

        {/* 月份使用量數據 */}
        <div 
          className="rounded-lg border p-6"
          style={{ 
            backgroundColor: designTokens.colors.cardBg,
            borderColor: designTokens.colors.border,
            boxShadow: designTokens.shadows.sm
          }}
        >
          <h2 
            className="text-2xl font-medium mb-6" 
            style={{ color: designTokens.colors.textPrimary }}
          >
            月份使用量數據
          </h2>
          
          {/* 響應式 Grid 佈局 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {monthlyData.map((data, index) => (
              <div 
                key={data.month} 
                className="border rounded-lg p-4"
                style={{ 
                  borderColor: designTokens.colors.border,
                  backgroundColor: '#fafbfc'
                }}
              >
                <div className="flex items-center justify-between mb-4">
                  <h3 
                    className="text-base font-medium" 
                    style={{ color: designTokens.colors.textPrimary }}
                  >
                    {monthNames[index]}
                  </h3>
                  {data.totalUsage > 0 && (
                    <span 
                      className="text-base font-medium px-2 py-1 rounded"
                      style={{ 
                        color: designTokens.colors.accentSecondary,
                        backgroundColor: designTokens.colors.accentLight
                      }}
                    >
                      總量：{data.totalUsage.toFixed(2)} ML
                    </span>
                  )}
                </div>

                <div className="space-y-4">
                  <div>
                    <label 
                      className="block text-base font-medium mb-2" 
                      style={{ color: designTokens.colors.textPrimary }}
                    >
                      使用數量 (瓶)
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.1"
                      value={data.quantity || ''}
                      onChange={(e) => {
                        const inputValue = e.target.value.trim()
                        const numValue = inputValue === '' ? 0 : parseFloat(inputValue)
                        updateMonthData(index, 'quantity', isNaN(numValue) ? 0 : numValue)
                      }}
                      disabled={isReadOnly || approvalStatus.isApproved}
                      className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:border-transparent transition-all ${
                        isReadOnly || approvalStatus.isApproved ? 'bg-gray-100 cursor-not-allowed' : ''
                      }`}
                      style={{
                        color: designTokens.colors.textPrimary,
                        borderColor: designTokens.colors.border
                      }}
                      onFocus={(e) => {
                        if (!isReadOnly && !approvalStatus.isApproved) {
                          (e.target as HTMLInputElement).style.borderColor = designTokens.colors.accentPrimary;
                          (e.target as HTMLInputElement).style.boxShadow = `0 0 0 2px ${designTokens.colors.accentPrimary}20`
                        }
                      }}
                      onBlur={(e) => {
                        (e.target as HTMLInputElement).style.borderColor = designTokens.colors.border;
                        (e.target as HTMLInputElement).style.boxShadow = 'none'
                      }}
                      placeholder="0"
                    />
                  </div>

                  <div>
                    <label 
                      className="block text-base font-medium mb-2" 
                      style={{ color: designTokens.colors.textPrimary }}
                    >
                      使用證明
                    </label>
                    <EvidenceUpload
                      pageKey={pageKey}
                      month={data.month}
                      files={data.files}
                      onFilesChange={(files) => handleMonthFilesChange(data.month, files)}
                      maxFiles={3}
                      kind="usage_evidence"
                      disabled={submitting || isReadOnly || approvalStatus.isApproved}
                      mode={isReadOnly || approvalStatus.isApproved ? "view" : "edit"}
                            isAdminReviewMode={isReviewMode && role === 'admin'}
                      memoryFiles={monthlyMemoryFiles[data.month - 1] || []}
                      onMemoryFilesChange={(files) => handleMonthMemoryFilesChange(data.month, files)}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>


        {/* 底部空間，避免內容被固定底部欄遮擋 */}
        <div className="h-20"></div>
      </div>

      {/* 錯誤訊息模態框 */}
      {(error || dataError) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
          <div
            className="bg-white rounded-lg shadow-lg max-w-md w-full"
            style={{ borderRadius: designTokens.borderRadius.lg }}
          >
            <div className="p-6">
              <div className="flex items-start space-x-3 mb-4">
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: `${designTokens.colors.error}15` }}
                >
                  <AlertCircle
                    className="h-5 w-5"
                    style={{ color: designTokens.colors.error }}
                  />
                </div>
                <div className="flex-1">
                  <h3
                    className="text-xl font-semibold mb-2"
                    style={{ color: designTokens.colors.textPrimary }}
                  >
                    發生錯誤
                  </h3>
                  <div className="text-base space-y-1">
                    {(error || dataError || '').split('\n').map((line, index) => (
                      <div key={index}>
                        {line.startsWith('請修正以下問題：') ? (
                          <div
                            className="font-medium mb-2"
                            style={{ color: designTokens.colors.error }}
                          >
                            {line}
                          </div>
                        ) : line ? (
                          <div className="flex items-start space-x-2 py-1">
                            <div
                              className="w-1.5 h-1.5 rounded-full mt-2 flex-shrink-0"
                              style={{ backgroundColor: designTokens.colors.error }}
                            ></div>
                            <span style={{ color: designTokens.colors.textSecondary }}>
                              {line}
                            </span>
                          </div>
                        ) : null}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <div className="flex justify-end">
                <button
                  onClick={() => setError(null)}
                  className="px-4 py-2 rounded-lg transition-colors font-medium text-white"
                  style={{ backgroundColor: designTokens.colors.error }}
                  onMouseEnter={(e) => {
                    (e.target as HTMLButtonElement).style.backgroundColor = '#dc2626';
                  }}
                  onMouseLeave={(e) => {
                    (e.target as HTMLButtonElement).style.backgroundColor = designTokens.colors.error;
                  }}
                >
                  確定
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 成功提示模態框 */}
      {showSuccessModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
          <div 
            className="bg-white rounded-lg shadow-lg max-w-md w-full"
            style={{ borderRadius: designTokens.borderRadius.lg }}
          >
            <div className="p-6">
              <div className="flex justify-end mb-2">
                <button
                  onClick={() => setShowSuccessModal(false)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="text-center">
                <div 
                  className="w-12 h-12 mx-auto rounded-full mb-4 flex items-center justify-center"
                  style={{ backgroundColor: designTokens.colors.accentLight }}
                >
                  <CheckCircle 
                    className="h-6 w-6" 
                    style={{ color: designTokens.colors.accentPrimary }} 
                  />
                </div>
                <h3 
                  className="text-lg font-medium mb-2"
                  style={{ color: designTokens.colors.textPrimary }}
                >
                  提交成功！
                </h3>
                <p 
                  className="mb-4"
                  style={{ color: designTokens.colors.textSecondary }}
                >
                  {success}
                </p>
                <div 
                  className="rounded-lg p-4 mb-4 text-left"
                  style={{ backgroundColor: '#f8f9fa' }}
                >
                  <p 
                    className="text-base mb-2 font-medium"
                    style={{ color: designTokens.colors.textPrimary }}
                  >
                    您的資料已成功儲存，您可以：
                  </p>
                  <ul className="text-base space-y-1">
                    <li style={{ color: designTokens.colors.textSecondary }}>
                      • 隨時回來查看或修改資料
                    </li>
                    <li style={{ color: designTokens.colors.textSecondary }}>
                      • 重新上傳新的證明文件
                    </li>
                    <li style={{ color: designTokens.colors.textSecondary }}>
                      • 更新月份使用量數據
                    </li>
                  </ul>
                </div>
                <button
                  onClick={() => setShowSuccessModal(false)}
                  className="px-6 py-2 text-white rounded-lg transition-colors font-medium"
                  style={{ backgroundColor: designTokens.colors.accentPrimary }}
                  onMouseEnter={(e) => {
                    (e.target as HTMLButtonElement).style.backgroundColor = '#388e3c';
                  }}
                  onMouseLeave={(e) => {
                    (e.target as HTMLButtonElement).style.backgroundColor = designTokens.colors.accentPrimary;
                  }}
                >
                  確認
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 清除確認模態框 */}
      {showClearConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
          <div 
            className="bg-white rounded-lg shadow-lg max-w-md w-full"
            style={{ borderRadius: designTokens.borderRadius.lg }}
          >
            <div className="p-6">
              <div className="flex items-start space-x-3 mb-4">
                <div 
                  className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: `${designTokens.colors.warning}15` }}
                >
                  <AlertCircle 
                    className="h-5 w-5" 
                    style={{ color: designTokens.colors.warning }} 
                  />
                </div>
                <div className="flex-1">
                  <h3 
                    className="text-xl font-semibold mb-2"
                    style={{ color: designTokens.colors.textPrimary }}
                  >
                    確認清除
                  </h3>
                  <p 
                    className="text-base"
                    style={{ color: designTokens.colors.textSecondary }}
                  >
                    清除後，這一頁所有資料都會被移除，包括已上傳到伺服器的檔案也會被永久刪除。此操作無法復原，確定要繼續嗎？
                  </p>
                </div>
              </div>
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setShowClearConfirmModal(false)}
                  className="px-4 py-2 border rounded-lg transition-colors font-medium"
                  style={{ 
                    borderColor: designTokens.colors.border,
                    color: designTokens.colors.textSecondary
                  }}
                >
                  取消
                </button>
                <button
                  onClick={handleClearAll}
                  disabled={clearLoading}
                  className="px-4 py-2 text-white rounded-lg transition-colors font-medium flex items-center justify-center"
                  style={{
                    backgroundColor: clearLoading ? '#9ca3af' : designTokens.colors.error,
                    opacity: clearLoading ? 0.7 : 1
                  }}
                  onMouseEnter={(e) => {
                    if (!clearLoading) {
                      (e.target as HTMLButtonElement).style.backgroundColor = '#dc2626';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!clearLoading) {
                      (e.target as HTMLButtonElement).style.backgroundColor = designTokens.colors.error;
                    }
                  }}
                >
                  {clearLoading ? (
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
        </div>
      )}

      {/* 底部操作欄 - 唯讀模式下隱藏，審核通過時也隱藏 */}
      {!isReadOnly && !approvalStatus.isApproved && !isReviewMode && (
        <BottomActionBar
        currentStatus={currentStatus}
        currentEntryId={currentEntryId}
        isUpdating={false}
        hasSubmittedBefore={hasSubmittedBefore}
        hasAnyData={hasAnyData}
        banner={banner}
        editPermissions={editPermissions}
        submitting={submitting}
        saving={submitting}
        onSubmit={handleSubmit}
        onSave={handleSave}
        onClear={() => setShowClearConfirmModal(true)}
        designTokens={designTokens}
      />
      )}

      {/* 審核區塊 - 只在審核模式顯示 */}
      {isReviewMode && (
        <ReviewSection
          entryId={reviewEntryId || currentEntryId || `wd40_${year}`}
          userId={reviewUserId || "current_user"}
          category="WD-40"
          userName="填報用戶" // 可以從用戶資料獲取
          amount={monthlyData.reduce((sum, data) => sum + data.quantity, 0)}
          unit="瓶"
          role={role}
          onSave={handleSave}
          isSaving={submitting}
          onApprove={() => {
            // ReviewSection 會處理 API 呼叫和導航
            // 這裡可以加入額外的本地狀態處理（如果需要）
          }}
          onReject={(reason) => {
            // ReviewSection 會處理 API 呼叫和導航
            // 這裡可以加入額外的本地狀態處理（如果需要）
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

      {/* Hook 錯誤訊息 */}
      {submitError && !toast && (
        <Toast
          message={submitError}
          type="error"
          onClose={clearSubmitError}
        />
      )}

      {/* Hook 成功訊息 */}
      {submitSuccess && !toast && (
        <Toast
          message={submitSuccess}
          type="success"
          onClose={clearSubmitSuccess}
        />
      )}
    </div>
  )
}

export default WD40Page
