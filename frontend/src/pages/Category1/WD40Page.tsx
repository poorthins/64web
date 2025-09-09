import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Upload, AlertCircle, CheckCircle, Loader2, X, Trash2 } from 'lucide-react'
import EvidenceUpload from '../../components/EvidenceUpload'
import StatusSwitcher, { EntryStatus, canEdit, canUploadFiles, getButtonText } from '../../components/StatusSwitcher'
import Toast, { ToastType } from '../../components/Toast'
import { useEditPermissions } from '../../hooks/useEditPermissions'
import { useStatusManager } from '../../hooks/useStatusManager'
import { loadDraftWithFallback, saveDraftWithBackup, cleanupAfterSubmission, DraftPayload } from '../../api/drafts'
import { listMSDSFiles, listUsageEvidenceFiles, commitEvidence, deleteEvidence, EvidenceFile } from '../../api/files'
import { upsertEnergyEntry, sumMonthly, UpsertEntryInput, updateEntryStatus, getEntryByPageKeyAndYear } from '../../api/entries'

// 設計 tokens - 基於山椒魚永續工程 LOGO 配色
const designTokens = {
  colors: {
    background: '#f8fffe',
    cardBg: '#ffffff',
    border: '#e0f2f1',
    textPrimary: '#1f2937',
    textSecondary: '#546e7a',
    accentPrimary: '#4caf50',
    accentSecondary: '#26a69a',
    accentLight: '#e8f5e8',
    accentBlue: '#5dade2',
    error: '#ef4444',
    warning: '#f59e0b',
    success: '#10b981'
  },
  spacing: {
    xs: '4px',
    sm: '8px',
    md: '16px',
    lg: '24px',
    xl: '32px',
    xxl: '48px'
  },
  shadows: {
    sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
    md: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
    lg: '0 10px 15px -3px rgb(0 0 0 / 0.1)'
  },
  borderRadius: {
    sm: '6px',
    md: '8px',
    lg: '12px'
  }
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
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [hasSubmittedBefore, setHasSubmittedBefore] = useState(false)
  const [showSuccessModal, setShowSuccessModal] = useState(false)
  const [showClearConfirmModal, setShowClearConfirmModal] = useState(false)
  const [currentEntryId, setCurrentEntryId] = useState<string | null>(null)
  const [initialStatus, setInitialStatus] = useState<EntryStatus>('draft')
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null)
  
  // 狀態管理 Hook
  const statusManager = useStatusManager({
    initialStatus,
    entryId: currentEntryId,
    onStatusChange: (newStatus) => {
      // 狀態變更時的回調處理
      console.log('Status changed to:', newStatus)
    },
    onError: (error) => setError(error),
    onSuccess: (message) => {
      // 使用 Toast 顯示狀態變更通知
      setToast({ message, type: 'success' })
      
      // 同時設置 success 用於傳統的成功訊息顯示
      setSuccess(message)
    }
  })

  const { currentStatus, isUpdating, handleSubmitSuccess, handleDataModified } = statusManager
  
  // 表單資料
  const [year] = useState(new Date().getFullYear())
  const [unitCapacity, setUnitCapacity] = useState<number>(0)
  const [carbonRate, setCarbonRate] = useState<number>(0)
  const [msdsFiles, setMsdsFiles] = useState<EvidenceFile[]>([])
  const [monthlyData, setMonthlyData] = useState<MonthData[]>(
    Array.from({ length: 12 }, (_, i) => ({
      month: i + 1,
      quantity: 0,
      totalUsage: 0,
      files: []
    }))
  )

  const pageKey = 'wd40'
  const isInitialLoad = useRef(true)
  
  // 編輯權限控制
  const editPermissions = useEditPermissions(currentStatus)

  const monthNames = [
    '1月', '2月', '3月', '4月', '5月', '6月',
    '7月', '8月', '9月', '10月', '11月', '12月'
  ]

  // 載入草稿和檔案
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true)
        setError(null)

        // 載入草稿
        const draft = await loadDraftWithFallback(pageKey)
        if (draft) {
          if (draft.unitCapacity) setUnitCapacity(draft.unitCapacity)
          if (draft.carbonRate) setCarbonRate(draft.carbonRate)
        }

        // 載入 MSDS 檔案
        const msdsFilesList = await listMSDSFiles(pageKey)
        setMsdsFiles(msdsFilesList)

        // 檢查是否已有提交的記錄
        const existingEntry = await getEntryByPageKeyAndYear(pageKey, year)
        if (existingEntry) {
          setInitialStatus(existingEntry.status as EntryStatus)
          setCurrentEntryId(existingEntry.id)
          setHasSubmittedBefore(true)
          
          // 如果有已提交的記錄，從 payload 中載入數據
          if (existingEntry.payload?.monthly) {
            const entryMonthly = existingEntry.payload.monthly
            const entryUnitCapacity = existingEntry.payload.notes?.match(/單位容量: ([\d.]+)/)?.[1]
            const entryCarbonRate = existingEntry.payload.notes?.match(/含碳率: ([\d.]+)/)?.[1]
            
            if (entryUnitCapacity) setUnitCapacity(parseFloat(entryUnitCapacity))
            if (entryCarbonRate) setCarbonRate(parseFloat(entryCarbonRate))
          }
        }

        // 載入各月份的使用證明檔案，同時保留草稿中的數量資料
        const updatedMonthlyData = await Promise.all(
          Array.from({ length: 12 }, async (_, i) => {
            const month = i + 1
            const usageFiles = await listUsageEvidenceFiles(pageKey, month)
            
            // 優先從已提交記錄中取得數量資料，其次是草稿
            let quantity = 0
            if (existingEntry?.payload?.monthly?.[month.toString()]) {
              // 從已提交記錄計算回原始數量（總使用量 / 單位容量）
              const totalUsage = existingEntry.payload.monthly[month.toString()]
              const entryUnitCapacity = existingEntry.payload.notes?.match(/單位容量: ([\d.]+)/)?.[1]
              if (entryUnitCapacity && parseFloat(entryUnitCapacity) > 0) {
                quantity = totalUsage / parseFloat(entryUnitCapacity)
              }
            } else if (draft?.monthly?.[month.toString()]) {
              quantity = draft.monthly[month.toString()]
            }
            
            const totalUsage = quantity * (unitCapacity || draft?.unitCapacity || 0)
            
            return {
              month,
              quantity,
              totalUsage,
              files: usageFiles
            }
          })
        )
        
        setMonthlyData(updatedMonthlyData)

        isInitialLoad.current = false
      } catch (error) {
        console.error('Error loading data:', error)
        setError(error instanceof Error ? error.message : '載入資料失敗')
      } finally {
        setLoading(false)
      }
    }

    loadData()
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

  // 建立草稿 payload
  const createDraftPayload = useCallback((): DraftPayload => {
    const monthly: { [key: string]: number } = {}
    monthlyData.forEach(data => {
      monthly[data.month.toString()] = data.quantity
    })

    return {
      year,
      unitCapacity,
      carbonRate,
      monthly
    }
  }, [year, unitCapacity, carbonRate, monthlyData])

  // 自動保存草稿（debounced）
  const debouncedSaveDraft = useCallback(
    debounce(async (payload: DraftPayload) => {
      if (isInitialLoad.current) return
      
      try {
        await saveDraftWithBackup(pageKey, payload)
        setHasUnsavedChanges(false)
      } catch (error) {
        console.warn('Auto-save failed:', error)
      }
    }, 2000),
    []
  )

  // 監聽表單變更
  useEffect(() => {
    if (!isInitialLoad.current) {
      setHasUnsavedChanges(true)
      const payload = createDraftPayload()
      debouncedSaveDraft(payload)
      
      // 觸發狀態檢測 - 如果在已提交狀態下修改資料，自動回退為草稿
      handleDataModified()
    }
  }, [unitCapacity, carbonRate, monthlyData, createDraftPayload, debouncedSaveDraft, handleDataModified])

  // 離開頁面提醒
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault()
        e.returnValue = '你有尚未提交的變更，是否離開？'
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [hasUnsavedChanges])

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
    
    // 檔案變更時也觸發狀態檢測
    if (!isInitialLoad.current) {
      handleDataModified()
    }
  }

  const handleMsdsFilesChange = (files: EvidenceFile[]) => {
    setMsdsFiles(files)
    
    // MSDS 檔案變更時也觸發狀態檢測
    if (!isInitialLoad.current) {
      handleDataModified()
    }
  }

  const getTotalUsage = () => {
    return monthlyData.reduce((sum, data) => sum + data.totalUsage, 0)
  }

  const validateData = () => {
    const errors: string[] = []
    
    if (msdsFiles.length === 0) {
      errors.push('請上傳 MSDS 安全資料表')
    }

    if (unitCapacity <= 0) {
      errors.push('請輸入單位容量')
    }

    if (carbonRate <= 0) {
      errors.push('請輸入含碳率')
    }

    monthlyData.forEach((data, index) => {
      if (data.quantity > 0 && data.files.length === 0) {
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

    setSubmitting(true)
    setError(null)
    setSuccess(null)

    try {
      // 1. 準備每月數據
      const monthly: Record<string, number> = {}
      monthlyData.forEach(data => {
        if (data.quantity > 0) {
          monthly[data.month.toString()] = data.totalUsage
        }
      })

      // 2. 建立填報輸入資料
      const entryInput: UpsertEntryInput = {
        page_key: pageKey,
        period_year: year,
        unit: 'ML',
        monthly: monthly,
        notes: `單位容量: ${unitCapacity} ML/瓶, 含碳率: ${carbonRate}%`
      }

      // 3. 新增或更新 energy_entries (保持現有狀態，讓狀態管理器處理轉換)
      const { entry_id } = await upsertEnergyEntry(entryInput, true)

      // 4. 設置 entryId（如果是新建的記錄）
      if (!currentEntryId) {
        setCurrentEntryId(entry_id)
      }

      // 5. 提交所有檔案（更新檔案的 entry_id 關聯）
      await commitEvidence({
        entryId: entry_id,
        pageKey: pageKey
      })

      // 6. 自動清理草稿資料（提交成功後）
      await cleanupAfterSubmission(pageKey)

      // 7. 處理狀態轉換 - 自動將狀態改為已提交
      await handleSubmitSuccess()

      // 8. 計算並顯示成功訊息
      const totalUsage = sumMonthly(monthly)
      setSuccess(`年度總使用量：${totalUsage.toFixed(2)} ML`)
      setHasUnsavedChanges(false)
      setHasSubmittedBefore(true)
      setShowSuccessModal(true)

    } catch (error) {
      console.error('Submit error:', error)
      setError(error instanceof Error ? error.message : '提交失敗')
    } finally {
      setSubmitting(false)
    }
  }

  const handleStatusChange = async (newStatus: EntryStatus) => {
    // 使用狀態管理器的更新函數
    await statusManager.updateStatus(newStatus)
  }

  const handleClearAll = () => {
    setUnitCapacity(0)
    setCarbonRate(0)
    handleMsdsFilesChange([])
    setMonthlyData(Array.from({ length: 12 }, (_, i) => ({
      month: i + 1,
      quantity: 0,
      totalUsage: 0,
      files: []
    })))
    
    setHasUnsavedChanges(false)
    setHasSubmittedBefore(false)
    setError(null)
    setSuccess(null)
    setShowClearConfirmModal(false)
  }

  // Loading 狀態
  if (loading) {
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
        
        {/* 頁面標題 - 無背景框 */}
        <div className="text-center mb-8">
          <h1 
            className="text-3xl font-semibold mb-3" 
            style={{ color: designTokens.colors.textPrimary }}
          >
            WD-40 使用數量填報
          </h1>
          <p 
            className="text-base" 
            style={{ color: designTokens.colors.textSecondary }}
          >
            請上傳 MSDS 文件並填入各月份使用數據進行碳排放計算
          </p>
        </div>

        {/* 重新提交提示 */}
        {hasSubmittedBefore && !showSuccessModal && (
          <div 
            className="rounded-lg p-4 border-l-4"
            style={{ 
              backgroundColor: '#f0f9ff',
              borderColor: designTokens.colors.accentBlue
            }}
          >
            <div className="flex items-start">
              <CheckCircle 
                className="h-5 w-5 mt-0.5 mr-3" 
                style={{ color: designTokens.colors.accentBlue }} 
              />
              <div>
                <h3 
                  className="text-sm font-medium mb-1" 
                  style={{ color: designTokens.colors.accentBlue }}
                >
                  資料已提交
                </h3>
                <p 
                  className="text-sm" 
                  style={{ color: designTokens.colors.textSecondary }}
                >
                  您可以繼續編輯資料，修改後請再次點擊「提交填報」以更新記錄。
                </p>
              </div>
            </div>
          </div>
        )}

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
            className="text-xl font-medium mb-6" 
            style={{ color: designTokens.colors.textPrimary }}
          >
            MSDS 安全資料表與基本參數
          </h2>
          
          <div className="space-y-6">
            {/* MSDS 檔案上傳 */}
            <div>
              <label 
                className="block text-sm font-medium mb-3" 
                style={{ color: designTokens.colors.textPrimary }}
              >
                MSDS 安全資料表
              </label>
              <EvidenceUpload
                pageKey={pageKey}
                files={msdsFiles}
                onFilesChange={handleMsdsFilesChange}
                maxFiles={3}
                disabled={submitting || !editPermissions.canUploadFiles}
                kind="msds"
              />
            </div>
            
            {/* 基本參數輸入 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label 
                  className="block text-sm font-medium mb-2" 
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
                  className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:border-transparent transition-all ${
                    !editPermissions.canEdit ? 'bg-gray-100 cursor-not-allowed' : ''
                  }`}
                  style={{ 
                    color: designTokens.colors.textPrimary,
                    borderColor: designTokens.colors.border,
                    borderRadius: designTokens.borderRadius.md
                  }}
                  onFocus={(e) => {
                    if (editPermissions.canEdit) {
                      (e.target as HTMLInputElement).style.borderColor = designTokens.colors.accentPrimary;
                      (e.target as HTMLInputElement).style.boxShadow = `0 0 0 3px ${designTokens.colors.accentPrimary}20`
                    }
                  }}
                  onBlur={(e) => {
                    (e.target as HTMLInputElement).style.borderColor = designTokens.colors.border;
                    (e.target as HTMLInputElement).style.boxShadow = 'none'
                  }}
                  placeholder="請輸入單位容量"
                  disabled={submitting || !editPermissions.canEdit}
                />
              </div>
              
              <div>
                <label 
                  className="block text-sm font-medium mb-2" 
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
                  className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:border-transparent transition-all ${
                    !editPermissions.canEdit ? 'bg-gray-100 cursor-not-allowed' : ''
                  }`}
                  style={{ 
                    color: designTokens.colors.textPrimary,
                    borderColor: designTokens.colors.border,
                    borderRadius: designTokens.borderRadius.md
                  }}
                  onFocus={(e) => {
                    if (editPermissions.canEdit) {
                      (e.target as HTMLInputElement).style.borderColor = designTokens.colors.accentPrimary;
                      (e.target as HTMLInputElement).style.boxShadow = `0 0 0 3px ${designTokens.colors.accentPrimary}20`
                    }
                  }}
                  onBlur={(e) => {
                    (e.target as HTMLInputElement).style.borderColor = designTokens.colors.border;
                    (e.target as HTMLInputElement).style.boxShadow = 'none'
                  }}
                  placeholder="請輸入含碳率"
                  disabled={submitting || !editPermissions.canEdit}
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
            className="text-xl font-medium mb-6" 
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
                      className="text-sm font-medium px-2 py-1 rounded"
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
                      className="block text-sm font-medium mb-2" 
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
                      className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:border-transparent transition-all ${
                        !editPermissions.canEdit ? 'bg-gray-100 cursor-not-allowed' : ''
                      }`}
                      style={{ 
                        color: designTokens.colors.textPrimary,
                        borderColor: designTokens.colors.border
                      }}
                      onFocus={(e) => {
                        if (editPermissions.canEdit) {
                          (e.target as HTMLInputElement).style.borderColor = designTokens.colors.accentPrimary;
                          (e.target as HTMLInputElement).style.boxShadow = `0 0 0 2px ${designTokens.colors.accentPrimary}20`
                        }
                      }}
                      onBlur={(e) => {
                        (e.target as HTMLInputElement).style.borderColor = designTokens.colors.border;
                        (e.target as HTMLInputElement).style.boxShadow = 'none'
                      }}
                      placeholder="0"
                      disabled={submitting || !editPermissions.canEdit}
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
                      maxFiles={3}
                      disabled={submitting || !editPermissions.canUploadFiles}
                      kind="usage_evidence"
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
                    className="text-sm mb-2 font-medium"
                    style={{ color: designTokens.colors.textPrimary }}
                  >
                    您的資料已成功儲存，您可以：
                  </p>
                  <ul className="text-sm space-y-1">
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
                    className="text-lg font-semibold mb-2"
                    style={{ color: designTokens.colors.textPrimary }}
                  >
                    確認清除
                  </h3>
                  <p 
                    className="text-sm"
                    style={{ color: designTokens.colors.textSecondary }}
                  >
                    清除後，這一頁所有資料都會被移除，確定要繼續嗎？
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
                  className="px-4 py-2 text-white rounded-lg transition-colors font-medium"
                  style={{ backgroundColor: designTokens.colors.error }}
                  onMouseEnter={(e) => {
                    (e.target as HTMLButtonElement).style.backgroundColor = '#dc2626';
                  }}
                  onMouseLeave={(e) => {
                    (e.target as HTMLButtonElement).style.backgroundColor = designTokens.colors.error;
                  }}
                >
                  確定清除
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 底部操作欄 - 所有元素在同一行 */}
      <div className="fixed bottom-0 left-64 xl:left-64 lg:left-56 md:left-48 sm:left-44 right-4 z-40">
        <div 
          className="border-t"
          style={{ 
            backgroundColor: designTokens.colors.cardBg,
            borderColor: designTokens.colors.border,
            boxShadow: designTokens.shadows.lg
          }}
        >
          <div className="max-w-4xl mx-auto px-6 py-4">
            <div className="flex items-center justify-between">
              {/* 左側: 自動儲存狀態 */}
              <div className="flex items-center space-x-2">
                {hasUnsavedChanges ? (
                  <>
                    <div 
                      className="w-2 h-2 rounded-full animate-pulse"
                      style={{ backgroundColor: designTokens.colors.warning }}
                    ></div>
                    <span 
                      className="text-sm"
                      style={{ color: designTokens.colors.textSecondary }}
                    >
                      自動儲存中...
                    </span>
                  </>
                ) : (
                  <>
                    <div 
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: designTokens.colors.success }}
                    ></div>
                    <span 
                      className="text-sm"
                      style={{ color: designTokens.colors.textSecondary }}
                    >
                      已自動儲存
                    </span>
                  </>
                )}
              </div>
              
              {/* 中間: 狀態切換器 */}
              <div className="flex items-center">
                {currentEntryId && (
                  <div className="flex items-center space-x-2">
                    {isUpdating && (
                      <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                    )}
                    <StatusSwitcher
                      currentStatus={currentStatus}
                      onStatusChange={handleStatusChange}
                      disabled={submitting || isUpdating}
                      className="bg-white rounded-lg px-4 py-2 border"
                    />
                  </div>
                )}
              </div>
              
              {/* 右側: 操作按鈕 */}
              <div className="flex items-center space-x-3">
                {/* 清除按鈕 - 只在可編輯狀態下顯示 */}
                {editPermissions.canEdit && (
                  <button 
                    onClick={() => setShowClearConfirmModal(true)}
                    disabled={submitting || isUpdating}
                    className="px-4 py-2 border rounded-lg disabled:cursor-not-allowed transition-colors flex items-center space-x-2 font-medium disabled:opacity-50"
                    style={{ 
                      borderColor: designTokens.colors.border,
                      color: designTokens.colors.textSecondary
                    }}
                    onMouseEnter={(e) => {
                      if (!submitting) {
                        (e.target as HTMLButtonElement).style.backgroundColor = '#f3f4f6';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!submitting) {
                        (e.target as HTMLButtonElement).style.backgroundColor = 'transparent';
                      }
                    }}
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>清除</span>
                  </button>
                )}
                
                {/* 提交按鈕 - 根據狀態顯示不同文字 */}
                {editPermissions.canEdit ? (
                  <button 
                    onClick={handleSubmit}
                    disabled={submitting || isUpdating}
                    className="px-6 py-2 text-white rounded-lg disabled:cursor-not-allowed transition-colors flex items-center space-x-2 font-medium disabled:opacity-50"
                    style={{ 
                      backgroundColor: (submitting || isUpdating) ? '#9ca3af' : designTokens.colors.accentPrimary
                    }}
                    onMouseEnter={(e) => {
                      if (!submitting && !isUpdating) {
                        (e.target as HTMLButtonElement).style.backgroundColor = '#388e3c';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!submitting && !isUpdating) {
                        (e.target as HTMLButtonElement).style.backgroundColor = designTokens.colors.accentPrimary;
                      }
                    }}
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>提交中...</span>
                      </>
                    ) : (
                      <>
                        <Upload className="w-4 h-4" />
                        <span>
                          {currentStatus === 'draft' ? '提交填報' : 
                           currentStatus === 'rejected' ? '更新提交' : 
                           '更新提交'}
                        </span>
                      </>
                    )}
                  </button>
                ) : (
                  <div 
                    className="px-6 py-2 text-white rounded-lg flex items-center space-x-2 font-medium"
                    style={{ backgroundColor: '#4caf50' }}
                  >
                    <CheckCircle className="w-4 h-4" />
                    <span>已核准</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

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

export default WD40Page
