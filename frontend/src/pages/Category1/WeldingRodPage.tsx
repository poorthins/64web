import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Upload, AlertCircle, CheckCircle, Loader2, X, Trash2 } from 'lucide-react'
import EvidenceUpload from '../../components/EvidenceUpload'
import StatusSwitcher, { EntryStatus, canEdit, canUploadFiles, getButtonText } from '../../components/StatusSwitcher'
import StatusIndicator from '../../components/StatusIndicator'
import Toast, { ToastType } from '../../components/Toast'
import BottomActionBar from '../../components/BottomActionBar'
import { useEditPermissions } from '../../hooks/useEditPermissions'
import { useFrontendStatus } from '../../hooks/useFrontendStatus'
import { listMSDSFiles, listUsageEvidenceFiles, commitEvidence, deleteEvidence, EvidenceFile } from '../../api/files'
import { upsertEnergyEntry, sumMonthly, UpsertEntryInput, updateEntryStatus, getEntryByPageKeyAndYear } from '../../api/entries'
import { getEntryFiles } from '../../api/files'
import { supabase } from '../../lib/supabaseClient'
import { designTokens } from '../../utils/designTokens'
import { debugRLSOperation, diagnoseAuthState } from '../../utils/authDiagnostics'
import { logDetailedAuthStatus } from '../../utils/authHelpers'

interface MonthData {
  month: number
  quantity: number      // 使用數量 (支)
  totalWeight: number   // 總重量 (KG)
  files: EvidenceFile[]
}

const WeldingRodPage = () => {
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
  const [currentStatus, setCurrentStatus] = useState<EntryStatus | null>(null)
  const [hasChanges, setHasChanges] = useState(false)
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null)
  
  // 前端狀態管理 Hook
  const frontendStatus = useFrontendStatus({
    initialStatus,
    entryId: currentEntryId,
    onStatusChange: (newStatus) => {
      console.log('Status changed to:', newStatus)
    },
    onError: (error) => setError(error),
    onSuccess: (message) => {
      setToast({ message, type: 'success' })
      setSuccess(message)
    }
  })

  const { currentStatus: frontendCurrentStatus, handleSubmitSuccess, handleDataChanged, isInitialLoad } = frontendStatus
  
  // 表單資料
  const [year] = useState(new Date().getFullYear())
  const [unitWeight, setUnitWeight] = useState<number>(0)     // 單位重量 (KG/支)
  const [carbonContent, setCarbonContent] = useState<number>(0) // 含碳率 (%)
  const [msdsFiles, setMsdsFiles] = useState<EvidenceFile[]>([])
  const [monthlyData, setMonthlyData] = useState<MonthData[]>(
    Array.from({ length: 12 }, (_, i) => ({
      month: i + 1,
      quantity: 0,
      totalWeight: 0,
      files: [] as EvidenceFile[]
    }))
  )

  const pageKey = 'welding_rod'
  
  // 編輯權限控制
  const editPermissions = useEditPermissions(frontendCurrentStatus || currentStatus || 'submitted')

  const monthNames = [
    '1月', '2月', '3月', '4月', '5月', '6月',
    '7月', '8月', '9月', '10月', '11月', '12月'
  ]

  // 載入記錄與檔案
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true)
        setError(null)

        // 讀取「檢驗報告（原 MSDS）」檔案清單
        const msdsFilesList = await listMSDSFiles(pageKey)
        setMsdsFiles(msdsFilesList)

        // 檢查是否已有非草稿記錄
        const existingEntry = await getEntryByPageKeyAndYear(pageKey, year)
        if (existingEntry && existingEntry.status !== 'draft') {
          setInitialStatus(existingEntry.status as EntryStatus)
          setCurrentStatus(existingEntry.status as EntryStatus)
          setCurrentEntryId(existingEntry.id)
          setHasSubmittedBefore(true)
          
          // 載入已提交記錄的表單數據
          if (existingEntry.payload?.monthly) {
            const entryMonthly = existingEntry.payload.monthly
            const entryUnitWeight = existingEntry.payload.notes?.match(/單位重量: ([\d.]+)/)?.[1]
            const entryCarbonContent = existingEntry.payload.notes?.match(/含碳率: ([\d.]+)/)?.[1]
            
            if (entryUnitWeight) setUnitWeight(parseFloat(entryUnitWeight))
            if (entryCarbonContent) setCarbonContent(parseFloat(entryCarbonContent))
          }
        }

        // 載入各月份使用證明檔案
        let monthlyDataWithFiles = monthlyData.map(data => ({ ...data, files: [] as EvidenceFile[] }))
        
        if (existingEntry && existingEntry.id) {
          try {
            const files = await getEntryFiles(existingEntry.id)
            const monthlyFiles = files.filter(f => f.month && f.kind === 'usage_evidence')
            monthlyDataWithFiles = monthlyDataWithFiles.map(data => ({
              ...data,
              files: monthlyFiles.filter(f => f.month === data.month) as EvidenceFile[]
            }))
            handleDataChanged()
          } catch (fileError) {
            console.error('Failed to load files for welding rod records:', fileError)
          }
        }
        
        setMonthlyData(monthlyDataWithFiles)
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

  // 監聽表單變更
  useEffect(() => {
    if (!isInitialLoad.current && hasSubmittedBefore) {
      setHasChanges(true)
    }
  }, [unitWeight, carbonContent, monthlyData, msdsFiles, hasSubmittedBefore])

  // 依單位重量自動計算各月總重量
  useEffect(() => {
    setMonthlyData(prev => 
      prev.map(data => ({
        ...data,
        totalWeight: data.quantity * unitWeight
      }))
    )
  }, [unitWeight])

  const updateMonthData = (index: number, field: 'quantity', value: number) => {
    setMonthlyData(prev => {
      const newData = [...prev]
      const safeValue = isNaN(value) ? 0 : value
      const safeUnitWeight = isNaN(unitWeight) ? 0 : unitWeight
      
      newData[index] = { 
        ...newData[index], 
        [field]: safeValue,
        totalWeight: field === 'quantity' ? safeValue * safeUnitWeight : newData[index].totalWeight
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

  const getTotalWeight = () => {
    return monthlyData.reduce((sum, data) => sum + data.totalWeight, 0)
  }

  const getTotalQuantity = () => {
    return monthlyData.reduce((sum, data) => sum + data.quantity, 0)
  }

  const validateData = () => {
    const errors: string[] = []
    
    if (msdsFiles.length === 0) {
      errors.push('請上傳銲條檢驗報告')
    }

    if (unitWeight <= 0) {
      errors.push('請輸入單位重量')
    }

    if (carbonContent <= 0) {
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
    console.log('=== 焊條提交除錯開始 ===')
    
    const errors = validateData()
    if (errors.length > 0) {
      setError('請修正以下問題：\n' + errors.join('\n'))
      return
    }

    setSubmitting(true)
    setError(null)
    setSuccess(null)

    try {
      // 步驟1：詳細認證狀態診斷
      console.log('🔍 執行詳細認證診斷...')
      await logDetailedAuthStatus()
      
      const authDiagnosis = await diagnoseAuthState()
      if (!authDiagnosis.isAuthenticated) {
        console.error('❌ 認證診斷失敗:', authDiagnosis)
        throw new Error(`認證失效: ${authDiagnosis.userError?.message || authDiagnosis.sessionError?.message || '未知原因'}`)
      }

      // 步驟2：準備每月數據 (以重量為單位)
      const monthly: Record<string, number> = {}
      monthlyData.forEach(data => {
        if (data.quantity > 0) {
          monthly[data.month.toString()] = data.totalWeight
        }
      })

      // 步驟3：建立填報輸入資料
      const entryInput: UpsertEntryInput = {
        page_key: pageKey,
        period_year: year,
        unit: 'KG',
        monthly: monthly,
        notes: `單位重量: ${unitWeight} KG/支, 含碳率: ${carbonContent}%`
      }

      // 步驟4：使用診斷包裝執行關鍵操作
      const { entry_id } = await debugRLSOperation(
        '新增或更新能源填報記錄',
        async () => await upsertEnergyEntry(entryInput, true)
      )

      // 步驟5：設置 entryId（如果是新建的記錄）
      if (!currentEntryId) {
        setCurrentEntryId(entry_id)
      }

      // 步驟6：提交所有檔案
      await debugRLSOperation(
        '提交證明檔案',
        async () => await commitEvidence({
          entryId: entry_id,
          pageKey: pageKey
        })
      )

      // 步驟7：處理狀態轉換
      await handleSubmitSuccess()
      
      setHasChanges(false)
      setHasSubmittedBefore(true)

      const totalWeight = sumMonthly(monthly)
      const totalQuantity = getTotalQuantity()
      setSuccess(`年度總使用量：${totalQuantity} 支 (${totalWeight.toFixed(2)} KG)`)
      setShowSuccessModal(true)
      
      console.log('=== ✅ 焊條提交成功完成 ===')

    } catch (error) {
      console.error('=== ❌ 焊條提交失敗 ===')
      console.error('錯誤訊息:', error instanceof Error ? error.message : String(error))
      setError(error instanceof Error ? error.message : '提交失敗')
    } finally {
      setSubmitting(false)
    }
  }

  const handleStatusChange = async (newStatus: EntryStatus) => {
    try {
      if (currentEntryId) {
        await updateEntryStatus(currentEntryId, newStatus)
      }
      frontendStatus.setFrontendStatus(newStatus)
    } catch (error) {
      setError(error instanceof Error ? error.message : '狀態更新失敗')
    }
  }

  const handleClearAll = () => {
    setUnitWeight(0)
    setCarbonContent(0)
    handleMsdsFilesChange([])
    setMonthlyData(Array.from({ length: 12 }, (_, i) => ({
      month: i + 1,
      quantity: 0,
      totalWeight: 0,
      files: []
    })))
    
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
            焊條使用量填報
          </h1>
          <p 
            className="text-base" 
            style={{ color: designTokens.colors.textSecondary }}
          >
            請上傳 <b>銲條檢驗報告</b> 並填入各月份焊條使用數據進行碳排放計算
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

        {/* 銲條檢驗報告與基本資料（已調整順序：先輸入欄位，後上傳） */}
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
            銲條檢驗報告與基本資料
          </h2>
          
          <div className="space-y-6">
            {/* 基本參數輸入（移到最上面） */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label 
                  className="block text-sm font-medium mb-2" 
                  style={{ color: designTokens.colors.textPrimary }}
                >
                  單位重量 (KG/支)
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
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
                  placeholder="請輸入單位重量"
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
                  value={carbonContent || ''}
                  onChange={(e) => {
                    const inputValue = e.target.value.trim()
                    const numValue = inputValue === '' ? 0 : parseFloat(inputValue)
                    setCarbonContent(isNaN(numValue) ? 0 : numValue)
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

            {/* 銲條檢驗報告上傳（原本的 MSDS 上傳，移到下面並更名） */}
            <div>
              <label 
                className="block text-sm font-medium mb-3" 
                style={{ color: designTokens.colors.textPrimary }}
              >
                銲條檢驗報告上傳
              </label>
              <EvidenceUpload
                pageKey={pageKey}
                files={msdsFiles}
                onFilesChange={handleMsdsFilesChange}
                maxFiles={3}
                disabled={submitting || !editPermissions.canUploadFiles}
                kind="msds"  // 維持後端型別，僅前端顯示改名
              />
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex justify-between items-center">
                <span 
                  className="text-sm font-medium"
                  style={{ color: designTokens.colors.textPrimary }}
                >
                  年度總數量：
                </span>
                <span 
                  className="text-lg font-bold"
                  style={{ color: designTokens.colors.accentSecondary }}
                >
                  {getTotalQuantity()} 支
                </span>
              </div>
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
                  {getTotalWeight().toFixed(2)} KG
                </span>
              </div>
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
                  {data.totalWeight > 0 && (
                    <span 
                      className="text-sm font-medium px-2 py-1 rounded"
                      style={{ 
                        color: designTokens.colors.accentSecondary,
                        backgroundColor: designTokens.colors.accentLight
                      }}
                    >
                      重量：{data.totalWeight.toFixed(2)} KG
                    </span>
                  )}
                </div>

                <div className="space-y-4">
                  <div>
                    <label 
                      className="block text-sm font-medium mb-2" 
                      style={{ color: designTokens.colors.textPrimary }}
                    >
                      使用數量 (支)
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={data.quantity || ''}
                      onChange={(e) => {
                        const inputValue = e.target.value.trim()
                        const numValue = inputValue === '' ? 0 : parseInt(inputValue)
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg黑 bg-opacity-50 p-4">
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
        currentStatus={frontendCurrentStatus || currentStatus || 'draft'}
        currentEntryId={currentEntryId}
        isUpdating={false}
        editPermissions={editPermissions}
        submitting={submitting}
        onSubmit={handleSubmit}
        onClear={() => setShowClearConfirmModal(true)}
        designTokens={designTokens}
        hasSubmittedBefore={hasSubmittedBefore}
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

export default WeldingRodPage
