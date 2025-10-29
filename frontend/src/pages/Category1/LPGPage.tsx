import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Upload, AlertCircle, CheckCircle, Loader2, X, Trash2, Eye } from 'lucide-react'
import EvidenceUpload from '../../components/EvidenceUpload'
import StatusSwitcher, { EntryStatus } from '../../components/StatusSwitcher'
import StatusIndicator from '../../components/StatusIndicator'
import Toast, { ToastType } from '../../components/Toast'
import BottomActionBar from '../../components/BottomActionBar'
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
import { sumMonthly, updateEntryStatus } from '../../api/entries'
import { EvidenceFile } from '../../api/files'
import { MemoryFile } from '../../components/EvidenceUpload'
import ReviewSection from '../../components/ReviewSection'
import { supabase } from '../../lib/supabaseClient'
import { designTokens } from '../../utils/designTokens'


interface MonthData {
  month: number
  quantity: number      // 使用數量 (桶)
  totalUsage: number    // 總重量 (KG)
  files: EvidenceFile[]
  memoryFiles: MemoryFile[]  // 暫存檔案
}

const LPGPage = () => {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  // 審核模式檢測
  const isReviewMode = searchParams.get('mode') === 'review'
  const reviewEntryId = searchParams.get('entryId')
  const reviewUserId = searchParams.get('userId')

  const { executeSubmit, submitting } = useSubmitGuard()
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [hasSubmittedBefore, setHasSubmittedBefore] = useState(false)
  const [showSuccessModal, setShowSuccessModal] = useState(false)
  const [showClearConfirmModal, setShowClearConfirmModal] = useState(false)
  const [currentEntryId, setCurrentEntryId] = useState<string | null>(null)
  const [initialStatus, setInitialStatus] = useState<EntryStatus>('submitted')
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null)
  
  // 狀態管理 Hook
  const frontendStatus = useFrontendStatus({
    initialStatus,
    entryId: currentEntryId
  })

  const { currentStatus: frontendCurrentStatus, setCurrentStatus, handleSubmitSuccess, handleDataChanged } = frontendStatus
  const currentStatus = frontendCurrentStatus || initialStatus
  const isUpdating = false

  // 表單資料
  const [year] = useState(new Date().getFullYear())
  const pageKey = 'lpg'

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
      const entryStatus = entry.status as EntryStatus
      setInitialStatus(entryStatus)
      setCurrentStatus(entryStatus)  // 同步前端狀態
      setCurrentEntryId(entry.id)
      setHasSubmittedBefore(true)

      // 載入單位重量
      const entryUnitWeight = entry.payload?.notes?.match(/單位重量: ([\d.]+)/)?.[1]
      if (entryUnitWeight) {
        setUnitWeight(parseFloat(entryUnitWeight))
      }

      // 載入月份數據
      if (entry.payload?.monthly) {
        const monthly = entry.payload.monthly
        const weight = entryUnitWeight ? parseFloat(entryUnitWeight) : 0

        setMonthlyData(prev => prev.map(data => {
          const totalUsage = monthly[data.month.toString()] || 0
          const quantity = weight > 0 ? totalUsage / weight : 0
          return {
            ...data,
            quantity,
            totalUsage,
            files: []  // 檔案由 onFilesLoad 處理
          }
        }))
      }
    },
    onFilesLoad: (files) => {
      // 載入重量證明檔案
      const msdsFiles = files.filter(f => f.file_type === 'msds' || f.file_type === 'other')
      setWeightProofFiles(msdsFiles)

      // 分配月份檔案
      setMonthlyData(prev => prev.map(data => ({
        ...data,
        files: files.filter(f => 
          f.month === data.month && f.file_type === 'usage_evidence'
        ) as EvidenceFile[]
      })))
    }
  })

  // 審核狀態 Hook
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
  } = useEnergySubmit(pageKey, year, approvalStatus.status)  // ✅ 使用資料庫狀態

  // 角色檢查
  const { role } = useRole()

  // 清除 Hook
  const {
    clear,
    clearing: clearLoading,
    error: clearError,
    clearError: clearClearError
  } = useEnergyClear(currentEntryId, currentStatus)


  // Reload 同步 Hook
  const { reloadAndSync } = useReloadWithFileSync(reload)

  const [unitWeight, setUnitWeight] = useState<number>(0) // 單位重量 (KG/桶)
  const [weightProofFiles, setWeightProofFiles] = useState<EvidenceFile[]>([])
  const [weightProofMemoryFiles, setWeightProofMemoryFiles] = useState<MemoryFile[]>([])
  const [monthlyData, setMonthlyData] = useState<MonthData[]>(
    Array.from({ length: 12 }, (_, i) => ({
      month: i + 1,
      quantity: 0,
      totalUsage: 0,
      files: [] as EvidenceFile[],
      memoryFiles: [] as MemoryFile[]
    }))
  )

  const isInitialLoad = useRef(true)
  
  // 編輯權限控制
  const editPermissions = useEditPermissions(currentStatus)

  // 判斷是否有資料
  const hasAnyData = useMemo(() => {
    const hasMonthlyData = monthlyData.some(m => m.quantity > 0)
    const hasBasicData = unitWeight > 0
    const hasFiles = weightProofFiles.length > 0
    const hasMemoryFiles = weightProofMemoryFiles.length > 0 ||
                          monthlyData.some(m => m.memoryFiles.length > 0)
    return hasMonthlyData || hasBasicData || hasFiles || hasMemoryFiles
  }, [monthlyData, unitWeight, weightProofFiles, weightProofMemoryFiles])

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
      setUnitWeight(0)
      setWeightProofFiles([])
      setMonthlyData(Array.from({ length: 12 }, (_, i) => ({
        month: i + 1,
        quantity: 0,
        totalUsage: 0,
        files: [],
        memoryFiles: []
      })))
      setError(null)
      setSuccess(null)
    }
  }, [])


  // 計算總使用量
  useEffect(() => {
    setMonthlyData(prev => 
      prev.map(data => ({
        ...data,
        totalUsage: data.quantity * unitWeight
      }))
    )
  }, [unitWeight])

  // 移除自動狀態變更邏輯

  const updateMonthData = (index: number, field: 'quantity', value: number) => {
    setMonthlyData(prev => {
      const newData = [...prev]
      const safeValue = isNaN(value) ? 0 : value
      const safeUnitWeight = isNaN(unitWeight) ? 0 : unitWeight
      
      newData[index] = { 
        ...newData[index], 
        [field]: safeValue,
        totalUsage: field === 'quantity' ? safeValue * safeUnitWeight : newData[index].totalUsage
      }
      return newData
    })
  }

  const handleMonthFilesChange = (month: number, files: EvidenceFile[]) => {
    setMonthlyData(prev => prev.map(data =>
      data.month === month ? { ...data, files } : data
    ))
  }

  const handleMonthMemoryFilesChange = (month: number, memFiles: MemoryFile[]) => {
    setMonthlyData(prev => prev.map(data =>
      data.month === month ? { ...data, memoryFiles: memFiles } : data
    ))
  }

  const getTotalUsage = () => {
    return monthlyData.reduce((sum, data) => sum + data.totalUsage, 0)
  }

  const validateData = () => {
    const errors: string[] = []

    if (weightProofFiles.length === 0 && weightProofMemoryFiles.length === 0) {
      errors.push('請上傳重量證明資料')
    }

    if (unitWeight <= 0) {
      errors.push('請輸入一桶液化石油氣重量')
    }

    monthlyData.forEach((data, index) => {
      if (data.quantity > 0 && data.files.length === 0 && data.memoryFiles.length === 0) {
        errors.push(`${monthNames[index]}有使用量但未上傳使用證明`)
      }
    })

    return errors
  }

  const handleSubmit = async () => {
    const errors = validateData()
    if (errors.length > 0) {
      setError('請修正以下問題：\n' + errors.join('\n'))
      return
    }

    await executeSubmit(async () => {
      // 準備每月數據
      const monthly: Record<string, number> = {}
      const monthlyQuantity: Record<string, number> = {}
      monthlyData.forEach(data => {
        if (data.quantity > 0) {
          monthly[data.month.toString()] = data.totalUsage
          monthlyQuantity[data.month.toString()] = data.quantity
        }
      })

      // 準備月份檔案陣列（12個月）
      const monthlyFiles: MemoryFile[][] = monthlyData.map(data => data.memoryFiles)

      // ⭐ 使用 Hook 提交（教訓 #1 防護：notes 參數）
      const entry_id = await submit({
        formData: {
          unitCapacity: 0,  // LPG 不使用
          carbonRate: 0,    // LPG 不使用
          monthly,
          monthlyQuantity,
          unit: 'KG',
          notes: `單位重量: ${unitWeight} KG/桶`  // ⭐ 傳入 notes
        },
        msdsFiles: [],
        monthlyFiles,
        evidenceFiles: weightProofMemoryFiles  // ⭐ 重量佐證檔案
      })

      if (!currentEntryId) {
        setCurrentEntryId(entry_id)
      }

      // ⭐ 教訓 #4 防護：確保 reload 在檔案上傳後執行
      await reloadAndSync()

      // 清空記憶體檔案
      setWeightProofMemoryFiles([])
      setMonthlyData(prev => prev.map(data => ({ ...data, memoryFiles: [] })))

      await handleSubmitSuccess()

      // 重新載入審核狀態，更新狀態橫幅
      reloadApprovalStatus()

      setHasSubmittedBefore(true)
      setShowSuccessModal(true)
      // ⭐ Hook 已自動設定 success 訊息，不需要手動設定
    }).catch(error => {
      console.error('Submit error:', error)
      // ⭐ Hook 會 throw error，但我們用本地 error 狀態顯示錯誤訊息
      setError(error instanceof Error ? error.message : '提交失敗')
    })
    // ⭐ Hook 已自動管理 submitLoading 狀態
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
        monthlyData.forEach((data, monthIndex) => {
          if (data.memoryFiles && data.memoryFiles.length > 0) {
            data.memoryFiles.forEach(mf => {
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
        weightProofMemoryFiles.forEach((mf, index) => {
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
            unit: 'KG',
            amount: totalAmount,
            payload: {
              unitCapacity: 0,
              carbonRate: 0,
              monthly,
              monthlyQuantity,
              notes: `單位重量: ${unitWeight} KG/桶`
            },
          },
          files: filesToUpload
        })
        // 清空記憶體檔案
        setWeightProofMemoryFiles([])
        setMonthlyData(prev => prev.map(data => ({ ...data, memoryFiles: [] })))


        await reloadAndSync()
        reloadApprovalStatus()
        setToast({ message: '[SUCCESS] 儲存成功！資料已更新', type: 'success' })
        return
      }

      // 準備月份檔案陣列（12個月）
      const monthlyFiles: MemoryFile[][] = monthlyData.map(data => data.memoryFiles)

      // 非審核模式：原本的邏輯
      const entry_id = await save({
        formData: {
          unitCapacity: 0,
          carbonRate: 0,
          monthly,
          monthlyQuantity,
          unit: 'KG',
          notes: `單位重量: ${unitWeight} KG/桶`
        },
        msdsFiles: [],
        monthlyFiles,
        evidenceFiles: weightProofMemoryFiles
      })

      if (!currentEntryId) {
        setCurrentEntryId(entry_id)
      }

      await reloadAndSync()

      // 清空記憶體檔案
      setWeightProofMemoryFiles([])
      setMonthlyData(prev => prev.map(data => ({ ...data, memoryFiles: [] })))

      // 重新載入審核狀態，更新狀態橫幅
      reloadApprovalStatus()

      // 暫存成功，更新狀態（但不觸發 handleSubmitSuccess）
      setToast({ message: '暫存成功！資料已儲存', type: 'success' })
    }).catch(error => {
      console.error('❌ 暫存失敗:', error)
      setError(error instanceof Error ? error.message : '暫存失敗')
    })
  }

  const handleStatusChange = async (newStatus: EntryStatus) => {
    // 狀態變更由 StatusSwitcher 組件處理
    console.log('Status change requested:', newStatus)
  }

  const handleClearAll = async () => {
    if (currentStatus === 'approved') {
      setToast({
        message: '已通過的資料無法清除',
        type: 'error'
      })
      return
    }

    setShowClearConfirmModal(true)
  }

  const confirmClear = async () => {
    try {
      // 收集所有要刪除的檔案
      const allFiles = [...weightProofFiles]
      monthlyData.forEach(data => {
        allFiles.push(...data.files)
      })

      // 收集所有記憶體檔案
      const allMemoryFiles = [weightProofMemoryFiles, ...monthlyData.map(d => d.memoryFiles)]

      // 呼叫 Hook 清除
      await clear({
        filesToDelete: allFiles,
        memoryFilesToClean: allMemoryFiles
      })

      // 清除成功後，重置前端狀態
      setCurrentEntryId(null)
      setHasSubmittedBefore(false)
      setUnitWeight(0)
      setWeightProofFiles([])
      setWeightProofMemoryFiles([])
      setMonthlyData(Array.from({ length: 12 }, (_, i) => ({
        month: i + 1,
        quantity: 0,
        totalUsage: 0,
        files: [],
        memoryFiles: []
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
    <div className="min-h-screen bg-green-50">
      <div className="max-w-4xl mx-auto px-6 py-8 space-y-6">
        
        {/* 頁面標題 */}
        <div className="text-center mb-8">
          <h1
            className="text-3xl font-semibold mb-3"
            style={{ color: designTokens.colors.textPrimary }}
          >
            液化石油氣使用量填報
          </h1>
          <p
            className="text-base"
            style={{ color: designTokens.colors.textSecondary }}
          >
            請填入一桶液化石油氣重量並上傳佐證資料，然後填入各月份使用數據進行碳排放計算
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

        {/* 液化石油氣規格設定與佐證資料 */}
        <div 
          className="rounded-lg border p-6"
          style={{ 
            backgroundColor: designTokens.colors.cardBg,
            borderColor: designTokens.colors.border,
            boxShadow: designTokens.shadows.sm
          }}
        >
          <h2 
            className="text-xl font-medium mb-6 text-center" 
            style={{ color: designTokens.colors.textPrimary }}
          >
            液化石油氣規格設定
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* 左邊：單位重量設定 */}
            <div>
              <label 
                className="block text-sm font-medium mb-2" 
                style={{ color: designTokens.colors.textPrimary }}
              >
                一桶液化石油氣重量 (KG/桶)
              </label>
              <input
                type="number"
                min="0"
                step="0.1"
                value={unitWeight || ''}
                onChange={(e) => {
                  const inputValue = e.target.value.trim()
                  const numValue = inputValue === '' ? 0 : parseFloat(inputValue)
                  setUnitWeight(isNaN(numValue) ? 0 : numValue)
                }}
                className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:border-transparent transition-all ${
                  isReadOnly ? 'bg-gray-100 cursor-not-allowed' : ''
                }`}
                style={{
                  color: designTokens.colors.textPrimary,
                  borderColor: designTokens.colors.border,
                  borderRadius: designTokens.borderRadius.md
                }}
                onFocus={(e) => {
                  if (!isReadOnly) {
                    (e.target as HTMLInputElement).style.borderColor = designTokens.colors.accentPrimary;
                    (e.target as HTMLInputElement).style.boxShadow = `0 0 0 3px ${designTokens.colors.accentPrimary}20`
                  }
                }}
                onBlur={(e) => {
                  (e.target as HTMLInputElement).style.borderColor = designTokens.colors.border;
                  (e.target as HTMLInputElement).style.boxShadow = 'none'
                }}
                placeholder="請輸入一桶的重量"
                disabled={isReadOnly || submitting}
              />
              <p 
                className="text-xs mt-1" 
                style={{ color: designTokens.colors.textSecondary }}
              >
                請填入單桶液化石油氣的實際重量（例如：20 KG）
              </p>
            </div>
            
            {/* 右邊：佐證資料上傳 */}
            <div>
              <label
                className="block text-sm font-medium mb-2"
                style={{ color: designTokens.colors.textPrimary }}
              >
                重量證明資料
              </label>
              <EvidenceUpload
                pageKey={pageKey}
                files={weightProofFiles}
                onFilesChange={setWeightProofFiles}
                memoryFiles={weightProofMemoryFiles}
                onMemoryFilesChange={setWeightProofMemoryFiles}
                maxFiles={3}
                disabled={submitting || isReadOnly || approvalStatus.isApproved}
                kind="other"
                mode={isReadOnly || approvalStatus.isApproved ? 'view' : 'edit'}
                      isAdminReviewMode={isReviewMode && role === 'admin'}
              />
              <p
                className="text-xs mt-1"
                style={{ color: designTokens.colors.textSecondary }}
              >
                請上傳液化石油氣重量證明或購買單據
              </p>
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
            className="text-xl font-medium mb-6" 
            style={{ color: designTokens.colors.textPrimary }}
          >
            月份使用量數據
          </h2>

          {/* 使用量統計 */}
          <div 
            className="mb-6 p-4 rounded-lg"
            style={{ backgroundColor: designTokens.colors.accentLight }}
          >
            <div className="flex justify-between items-center">
              <span 
                className="text-sm font-medium"
                style={{ color: designTokens.colors.textPrimary }}
              >
                年度總重量：
              </span>
              <span 
                className="text-lg font-bold"
                style={{ color: designTokens.colors.accentSecondary }}
              >
                {getTotalUsage().toFixed(2)} KG
              </span>
            </div>
          </div>
          
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
                      className="text-sm font-medium px-2 py-1 rounded"
                      style={{ 
                        color: designTokens.colors.accentSecondary,
                        backgroundColor: designTokens.colors.accentLight
                      }}
                    >
                      總重：{data.totalUsage.toFixed(2)} KG
                    </span>
                  )}
                </div>

                <div className="space-y-4">
                  <div>
                    <label 
                      className="block text-sm font-medium mb-2" 
                      style={{ color: designTokens.colors.textPrimary }}
                    >
                      使用數量 (桶)
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
                      className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:border-transparent transition-all ${
                        isReadOnly ? 'bg-gray-100 cursor-not-allowed' : ''
                      }`}
                      style={{
                        color: designTokens.colors.textPrimary,
                        borderColor: designTokens.colors.border
                      }}
                      onFocus={(e) => {
                        if (!isReadOnly) {
                          (e.target as HTMLInputElement).style.borderColor = designTokens.colors.accentPrimary;
                          (e.target as HTMLInputElement).style.boxShadow = `0 0 0 2px ${designTokens.colors.accentPrimary}20`
                        }
                      }}
                      onBlur={(e) => {
                        (e.target as HTMLInputElement).style.borderColor = designTokens.colors.border;
                        (e.target as HTMLInputElement).style.boxShadow = 'none'
                      }}
                      placeholder="0"
                      disabled={isReadOnly || submitting}
                    />
                  </div>

                  <div>
                    <label 
                      className="block text-sm font-medium mb-2" 
                      style={{ color: designTokens.colors.textPrimary }}
                    >
                      使用證明
                    </label>
                    <EvidenceUpload
                      pageKey={pageKey}
                      month={data.month}
                      files={data.files}
                      onFilesChange={(files) => handleMonthFilesChange(data.month, files)}
                      memoryFiles={data.memoryFiles}
                      onMemoryFilesChange={(memFiles) => handleMonthMemoryFilesChange(data.month, memFiles)}
                      maxFiles={3}
                      disabled={submitting || isReadOnly || approvalStatus.isApproved}
                      kind="usage_evidence"
                      mode={isReadOnly || approvalStatus.isApproved ? 'view' : 'edit'}
                      isAdminReviewMode={isReviewMode && role === 'admin'}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 底部空間 */}
        <div className="h-20"></div>
      </div>

      {/* 錯誤訊息模態框 */}
      {error && (
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
                    className="text-lg font-semibold mb-2"
                    style={{ color: designTokens.colors.textPrimary }}
                  >
                    發生錯誤
                  </h3>
                  <div className="text-sm space-y-1">
                    {error.split('\n').map((line, index) => (
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
                      • 更新使用記錄數據
                    </li>
                  </ul>
                </div>
                <button
                  onClick={() => setShowSuccessModal(false)}
                  className="px-6 py-2 text-white rounded-lg transition-colors font-medium"
                  style={{ backgroundColor: designTokens.colors.accentPrimary }}
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
                  onClick={confirmClear}
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

      {/* 底部操作欄 - 唯讀模式和 approved 狀態下隱藏 */}
      {!isReadOnly && !approvalStatus.isApproved && !isReviewMode && (
        <BottomActionBar
          currentStatus={currentStatus}
          currentEntryId={currentEntryId}
          isUpdating={isUpdating}
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
      {isReviewMode && currentEntryId && (
        <ReviewSection
          entryId={reviewEntryId || currentEntryId}
          userId={reviewUserId || "current_user"}
          category="液化石油氣"
          userName={reviewUserId || "用戶"}
          amount={monthlyData.reduce((sum, data) => sum + data.totalUsage, 0)}
          unit="KG"
          role={role}
          onSave={handleSave}
          isSaving={submitting}
          onApprove={() => {
            console.log('✅ 液化石油氣填報審核通過 - 由 ReviewSection 處理')
          }}
          onReject={(reason) => {
            console.log('❌ 液化石油氣填報已退回 - 由 ReviewSection 處理:', reason)
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

export default LPGPage