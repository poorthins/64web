import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Upload, AlertCircle, CheckCircle, Loader2, X, Trash2 } from 'lucide-react'
import EvidenceUpload, { MemoryFile } from '../../components/EvidenceUpload'
import StatusSwitcher, { EntryStatus, canEdit, canUploadFiles, getButtonText } from '../../components/StatusSwitcher'
import StatusIndicator from '../../components/StatusIndicator'
import Toast, { ToastType } from '../../components/Toast'
import BottomActionBar from '../../components/BottomActionBar'
import { useEditPermissions } from '../../hooks/useEditPermissions'
import { useFrontendStatus } from '../../hooks/useFrontendStatus'
import { listMSDSFiles, listUsageEvidenceFiles, commitEvidence, deleteEvidence, EvidenceFile, uploadEvidenceWithEntry } from '../../api/files'
import { upsertEnergyEntry, sumMonthly, UpsertEntryInput, updateEntryStatus, getEntryByPageKeyAndYear } from '../../api/entries'
import { getEntryFiles } from '../../api/files'
import { designTokens } from '../../utils/designTokens'
import { DocumentHandler } from '../../services/documentHandler'


interface MonthData {
  month: number
  quantity: number      // 使用數量 (桶)
  totalUsage: number    // 總重量 (KG)
  files: EvidenceFile[]
  memoryFiles: MemoryFile[]  // 暫存檔案
}

const LPGPage = () => {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
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

  const { currentStatus: frontendCurrentStatus, handleSubmitSuccess, handleDataChanged } = frontendStatus
  const currentStatus = frontendCurrentStatus || initialStatus
  const isUpdating = false
  
  // 表單資料
  const [year] = useState(new Date().getFullYear())
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

  const pageKey = 'lpg'
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
  
  // 唯讀模式判斷
  const isReadOnly = false

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

  // 載入檔案（移除草稿功能）
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true)
        setError(null)

        // 草稿功能已移除

        // 載入重量佐證檔案
        const weightProofFilesList = await listMSDSFiles(pageKey)
        setWeightProofFiles(weightProofFilesList)

        // 檢查是否已有非草稿記錄
        const existingEntry = await getEntryByPageKeyAndYear(pageKey, year)
        if (existingEntry && existingEntry.status !== 'draft') {
          setInitialStatus(existingEntry.status as EntryStatus)
          setCurrentEntryId(existingEntry.id)
          setHasSubmittedBefore(true)
          
          // 載入已提交的記錄數據供編輯
          if (existingEntry.payload?.monthly) {
            const entryMonthly = existingEntry.payload.monthly
            const entryUnitWeight = existingEntry.payload.notes?.match(/單位重量: ([\d.]+)/)?.[1]
            
            if (entryUnitWeight) setUnitWeight(parseFloat(entryUnitWeight))
          }
        }
        // 如果是草稿記錄或無記錄，保持表單空白狀態

        // 載入各月份的使用證明檔案
        let updatedMonthlyData = Array.from({ length: 12 }, (_, i) => {
          const month = i + 1
          // 從已提交記錄中取得數量資料（僅針對非草稿記錄）
          let quantity = 0
          if (existingEntry && existingEntry.status !== 'draft' && existingEntry.payload?.monthly?.[month.toString()]) {
            const totalUsage = existingEntry.payload.monthly[month.toString()]
            const entryUnitWeight = existingEntry.payload.notes?.match(/單位重量: ([\d.]+)/)?.[1]
            if (entryUnitWeight && parseFloat(entryUnitWeight) > 0) {
              quantity = totalUsage / parseFloat(entryUnitWeight)
            }
          }

          const totalUsage = quantity * unitWeight

          return {
            month,
            quantity,
            totalUsage,
            files: [] as EvidenceFile[],
            memoryFiles: [] as MemoryFile[]
          }
        })
        
        // 載入相關檔案
        if (existingEntry && existingEntry.id) {
          try {
            const files = await getEntryFiles(existingEntry.id)
            
            // 分類檔案到對應的月份
            const monthlyFiles = files.filter(f => f.month && f.file_type === 'usage_evidence')
            
            // 更新月份檔案
            updatedMonthlyData = updatedMonthlyData.map(data => ({
              ...data,
              files: monthlyFiles.filter(f => f.month === data.month) as EvidenceFile[]
            }))
            
            // 處理狀態變更
            handleDataChanged()
          } catch (fileError) {
            console.error('Failed to load files for LPG records:', fileError)
          }
        }
        
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

    setSubmitting(true)
    setError(null)
    setSuccess(null)

    try {
      // 準備每月數據
      const monthly: Record<string, number> = {}
      monthlyData.forEach(data => {
        if (data.quantity > 0) {
          monthly[data.month.toString()] = data.totalUsage
        }
      })

      const entryInput: UpsertEntryInput = {
        page_key: pageKey,
        period_year: year,
        unit: 'KG',
        monthly: monthly,
        notes: `單位重量: ${unitWeight} KG/桶`
      }

      const { entry_id } = await upsertEnergyEntry(entryInput, true)

      if (!currentEntryId) {
        setCurrentEntryId(entry_id)
      }

      // 上傳重量佐證檔案
      for (const memFile of weightProofMemoryFiles) {
        await uploadEvidenceWithEntry(memFile.file, {
          entryId: entry_id,
          pageKey: pageKey,
          year: new Date().getFullYear(),
          category: 'other'
        })
      }

      // 上傳各月份檔案
      for (const monthData of monthlyData) {
        if (monthData.memoryFiles.length > 0) {
          for (const memFile of monthData.memoryFiles) {
            await uploadEvidenceWithEntry(memFile.file, {
              entryId: entry_id,
              pageKey: pageKey,
              year: new Date().getFullYear(),
              category: 'usage_evidence',
              month: monthData.month
            })
          }
        }
      }

      // 清空 memory files
      setWeightProofMemoryFiles([])
      setMonthlyData(prev => prev.map(data => ({ ...data, memoryFiles: [] })))

      await commitEvidence({
        entryId: entry_id,
        pageKey: pageKey
      })

      // 草稿清理功能已移除
      await handleSubmitSuccess()

      const totalUsage = sumMonthly(monthly)
      setSuccess(`年度總使用量：${totalUsage.toFixed(2)} KG`)
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
    // 狀態變更由 StatusSwitcher 組件處理
    console.log('Status change requested:', newStatus)
  }

  const handleClearAll = async () => {
    console.log('🗑️ [LPGPage] ===== CLEAR BUTTON CLICKED =====')

    const clearSuccess = DocumentHandler.handleClear({
      currentStatus: currentStatus,
      title: '液化石油氣資料清除',
      message: '確定要清除所有液化石油氣使用資料嗎？此操作無法復原。',
      onClear: () => {
        setSubmitting(true)
        try {
          console.log('🗑️ [LPGPage] Starting complete clear operation...')

          // 清理記憶體檔案
          DocumentHandler.clearAllMemoryFiles(weightProofMemoryFiles)
          monthlyData.forEach(monthData => {
            DocumentHandler.clearAllMemoryFiles(monthData.memoryFiles)
          })

          // 原有的清除邏輯保持不變
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

          setHasSubmittedBefore(false)
          setError(null)
          setSuccess(null)
          setShowClearConfirmModal(false)

          setToast({
            message: '資料已清除',
            type: 'success'
          })

        } catch (error) {
          console.error('❌ [LPGPage] Clear operation failed:', error)
          setError('清除操作失敗，請重試')
        } finally {
          console.log('🗑️ [LPGPage] Clear operation finished, resetting loading state')
          setSubmitting(false)
        }
      }
    })

    if (!clearSuccess && currentStatus === 'approved') {
      setToast({
        message: '已通過的資料無法清除',
        type: 'error'
      })
    }
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
                placeholder="請輸入一桶的重量"
                disabled={submitting || !editPermissions.canEdit}
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
                disabled={submitting || !editPermissions.canUploadFiles}
                kind="other"
                mode="edit"
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
                      memoryFiles={data.memoryFiles}
                      onMemoryFilesChange={(memFiles) => handleMonthMemoryFilesChange(data.month, memFiles)}
                      maxFiles={3}
                      disabled={submitting || !editPermissions.canUploadFiles}
                      kind="usage_evidence"
                      mode="edit"
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
                >
                  確定清除
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 底部操作欄 */}
      <BottomActionBar
        currentStatus={currentStatus}
        currentEntryId={currentEntryId}
        isUpdating={isUpdating}
        hasSubmittedBefore={hasSubmittedBefore}
        hasAnyData={hasAnyData}
        editPermissions={editPermissions}
        submitting={submitting}
        onSubmit={handleSubmit}
        onClear={() => setShowClearConfirmModal(true)}
        designTokens={designTokens}
      />

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