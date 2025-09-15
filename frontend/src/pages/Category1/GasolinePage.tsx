import { useState, useCallback, useEffect, useRef } from 'react'
import { Plus, Trash2, Calendar, Fuel, AlertCircle, CheckCircle, Upload, Loader2 } from 'lucide-react'
import { useFrontendStatus } from '../../hooks/useFrontendStatus'
import { useEditPermissions } from '../../hooks/useEditPermissions'
import StatusIndicator from '../../components/StatusIndicator'
import EvidenceUpload from '../../components/EvidenceUpload'
import BottomActionBar from '../../components/BottomActionBar'
import { EntryStatus } from '../../components/StatusSwitcher'
import { listMSDSFiles, listUsageEvidenceFiles, commitEvidence, deleteEvidence, EvidenceFile } from '../../api/files'
import { upsertEnergyEntry, sumMonthly, UpsertEntryInput, updateEntryStatus, getEntryByPageKeyAndYear } from '../../api/entries'
import { getEntryFiles } from '../../api/files'
import { designTokens } from '../../utils/designTokens'
import { debugRLSOperation, diagnoseAuthState } from '../../utils/authDiagnostics'
import { logDetailedAuthStatus } from '../../utils/authHelpers'

interface GasolineRecord {
  id: string
  date: string           // 使用日期 YYYY-MM-DD
  quantity: number       // 使用量 (L)
  files: EvidenceFile[]  // 佐證檔案
}

interface GasolineData {
  year: number
  records: GasolineRecord[]
  totalQuantity: number  // 總使用量
}

export default function GasolinePage() {
  const currentYear = new Date().getFullYear()
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'usage'>('usage')
  
  // 狀態管理
  const [hasSubmittedBefore, setHasSubmittedBefore] = useState(false)
  const [currentEntryId, setCurrentEntryId] = useState<string | null>(null)
  const [initialStatus, setInitialStatus] = useState<EntryStatus>('submitted')
  const [hasChanges, setHasChanges] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  
  const [data, setData] = useState<GasolineData>({
    year: currentYear,
    records: [],
    totalQuantity: 0
  })

  const [newRecord, setNewRecord] = useState<Omit<GasolineRecord, 'id'>>({
    date: '',
    quantity: 0,
    files: []
  })

  const [showSuccess, setShowSuccess] = useState(false)
  const [showError, setShowError] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const pageKey = 'gasoline'
  
  // 前端狀態管理 Hook
  const frontendStatus = useFrontendStatus({
    initialStatus,
    entryId: currentEntryId,
    onStatusChange: (newStatus) => {
      console.log('Status changed to:', newStatus)
    },
    onError: (error) => setError(error),
    onSuccess: (message) => setSuccess(message)
  })

  const { currentStatus, handleSubmitSuccess, handleDataChanged, isInitialLoad } = frontendStatus
  
  const editPermissions = useEditPermissions(currentStatus || 'submitted')

  const calculateTotals = useCallback((records: GasolineRecord[]) => {
    const totalQuantity = records.reduce((sum, record) => sum + record.quantity, 0)
    return { totalQuantity }
  }, [])

  const addRecord = useCallback(() => {
    if (!newRecord.date || newRecord.quantity <= 0) {
      setErrorMessage('請填寫完整的使用記錄資訊')
      setShowError(true)
      return
    }

    const record: GasolineRecord = {
      id: `gasoline_${Date.now()}`,
      ...newRecord
    }

    setData(prevData => {
      const newRecords = [...prevData.records, record].sort((a, b) => a.date.localeCompare(b.date))
      const totals = calculateTotals(newRecords)
      
      return {
        ...prevData,
        records: newRecords,
        ...totals
      }
    })

    setNewRecord({
      date: '',
      quantity: 0,
      files: []
    })
  }, [newRecord, calculateTotals])

  const removeRecord = useCallback((recordId: string) => {
    setData(prevData => {
      const newRecords = prevData.records.filter(record => record.id !== recordId)
      const totals = calculateTotals(newRecords)
      
      return {
        ...prevData,
        records: newRecords,
        ...totals
      }
    })
  }, [calculateTotals])

  const handleRecordFileChange = useCallback((recordId: string, files: EvidenceFile[]) => {
    setData(prevData => {
      const newRecords = prevData.records.map(record =>
        record.id === recordId ? { ...record, files } : record
      )
      
      return {
        ...prevData,
        records: newRecords
      }
    })
  }, [])

  const handleSubmit = useCallback(async () => {
    console.log('=== 汽油提交除錯開始 ===')
    
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

      // 步驟2：準備汽油數據（轉換為月份格式以符合 API）
      const monthly: Record<string, number> = {
        '1': data.totalQuantity || 0 // 總使用量記錄在1月
      }

      // 步驟3：建立填報輸入資料
      const entryInput: UpsertEntryInput = {
        page_key: pageKey,
        period_year: currentYear,
        unit: 'L',
        monthly: monthly,
        notes: `汽油使用記錄，總使用量：${data.totalQuantity?.toFixed(2) || 0} L，共 ${data.records.length} 筆記錄`,
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

      setSuccess(`汽油數據已提交，總使用量 ${data.totalQuantity?.toFixed(2) || 0} L`)
      setShowSuccess(true)
      setTimeout(() => setShowSuccess(false), 3000)
      
      console.log('=== ✅ 汽油提交成功完成 ===')

    } catch (error) {
      console.error('=== ❌ 汽油提交失敗 ===')
      console.error('錯誤訊息:', error instanceof Error ? error.message : String(error))
      setError(error instanceof Error ? error.message : '提交失敗')
      setErrorMessage(error instanceof Error ? error.message : '提交失敗，請稍後重試')
      setShowError(true)
    } finally {
      setSubmitting(false)
    }
  }, [data, currentYear, currentEntryId, handleSubmitSuccess, pageKey])

  const handleClear = useCallback(() => {
    if (window.confirm('確定要清除所有數據嗎？此操作無法復原。')) {
      setData({
        year: currentYear,
        records: [],
        totalQuantity: 0
      })
      setNewRecord({
        date: '',
        quantity: 0,
        files: []
      })
      setHasChanges(false)
      setError(null)
      setSuccess(null)
    }
  }, [currentYear])

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

  // 載入資料
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true)
        setError(null)

        // 檢查是否已有非草稿記錄
        const existingEntry = await getEntryByPageKeyAndYear(pageKey, currentYear)
        if (existingEntry && existingEntry.status !== 'draft') {
          setInitialStatus(existingEntry.status as EntryStatus)
          setCurrentEntryId(existingEntry.id)
          setHasSubmittedBefore(true)
          
          // 載入已提交的記錄數據供編輯
          if (existingEntry.payload?.gasolineData) {
            const gasolineData = existingEntry.payload.gasolineData
            
            // 載入相關檔案
            if (existingEntry.id) {
              try {
                const files = await getEntryFiles(existingEntry.id)
                
                // 分類檔案到對應的記錄
                const usageFiles = files.filter(f => f.kind === 'usage_evidence' && f.page_key === pageKey)
                
                // 更新記錄的檔案
                if (gasolineData.records) {
                  gasolineData.records.forEach((record: any) => {
                    record.files = usageFiles.filter(f => f.record_id === record.id) || []
                  })
                }
                
                setData(gasolineData)
              } catch (fileError) {
                console.error('Failed to load files for gasoline records:', fileError)
                setData(gasolineData)
              }
            } else {
              setData(gasolineData)
            }
            
            // 處理狀態變更
            handleDataChanged()
          }
        }
        // 如果是草稿記錄或無記錄，保持表單空白狀態

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
  }, [data, hasSubmittedBefore])

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
    <>
      <div className="min-h-screen bg-green-50">
      {/* 主要內容區域 */}
      <div className="max-w-4xl mx-auto px-6 py-8 space-y-6">

        {/* 頁面標題 - 無背景框 */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-center mb-2">
            汽油 使用數量填報
          </h1>
          <p className="text-lg text-center text-gray-600 mb-6">
            請上傳 MSDS 文件並填入各月份使用數據進行碳排放計算
          </p>
        </div>

        {/* 重新提交提示 */}
        {hasSubmittedBefore && !showSuccess && (
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
                  className="text-base font-medium mb-1"
                  style={{ color: designTokens.colors.accentBlue }}
                >
                  資料已提交
                </h3>
                <p
                  className="text-base"
                  style={{ color: designTokens.colors.textSecondary }}
                >
                  您可以繼續編輯資料，修改後請再次點擊「提交填報」以更新記錄。
                </p>
              </div>
            </div>
          </div>
        )}

        {/* 新增記錄表單 */}
        {editPermissions.canEdit && (
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
              新增使用記錄
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-base font-medium mb-2" style={{ color: designTokens.colors.textPrimary }}>
                  使用日期
                </label>
                <input
                  type="date"
                  value={newRecord.date}
                  onChange={(e) => setNewRecord(prev => ({ ...prev, date: e.target.value }))}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  style={{ borderColor: designTokens.colors.border }}
                />
              </div>
              
              <div>
                <label className="block text-base font-medium mb-2" style={{ color: designTokens.colors.textPrimary }}>
                  使用量 (L)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={newRecord.quantity || ''}
                  onChange={(e) => setNewRecord(prev => ({ ...prev, quantity: parseFloat(e.target.value) || 0 }))}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  style={{ borderColor: designTokens.colors.border }}
                  placeholder="輸入使用量"
                />
              </div>
            </div>
            
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2" style={{ color: designTokens.colors.textPrimary }}>
                佐證檔案
              </label>
              <EvidenceUpload
                pageKey={pageKey}
                files={newRecord.files}
                onFilesChange={(files) => setNewRecord(prev => ({ ...prev, files }))}
                maxFiles={3}
                disabled={submitting || !editPermissions.canUploadFiles}
                kind="usage_evidence"
              />
            </div>
            
            <button
              onClick={addRecord}
              className="px-4 py-2 text-white rounded-lg hover:bg-blue-600 transition-colors flex items-center space-x-2"
              style={{ backgroundColor: designTokens.colors.blue }}
            >
              <Plus className="w-4 h-4" />
              <span>新增記錄</span>
            </button>
          </div>
        )}

        {/* 使用記錄列表 */}
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
            使用記錄列表
          </h2>
          <div className="space-y-4">
            {data.records.map((record) => (
              <div
                key={record.id}
                className="border rounded-lg p-4"
                style={{
                  borderColor: designTokens.colors.border,
                  backgroundColor: '#fafbfc'
                }}
              >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-4">
                  <Fuel className="w-5 h-5 text-blue-600" />
                  <span className="font-medium text-base" style={{ color: designTokens.colors.textPrimary }}>
                    {record.date}
                  </span>
                  <span className="text-base" style={{ color: designTokens.colors.textSecondary }}>
                    {record.quantity} L
                  </span>
                </div>
                {editPermissions.canEdit && (
                  <button
                    onClick={() => removeRecord(record.id)}
                    className="p-1 text-red-500 hover:bg-red-50 rounded"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
              
              {record.files.length > 0 && (
                <div className="mt-3">
                  <EvidenceUpload
                    pageKey={pageKey}
                    files={record.files}
                    onFilesChange={(files) => handleRecordFileChange(record.id, files)}
                    maxFiles={3}
                    disabled={!editPermissions.canUploadFiles}
                    kind="usage_evidence"
                  />
                </div>
              )}
              </div>
            ))}
          </div>
        </div>

        {/* 年度總計 */}
        {data.records.length > 0 && (
          <div
            className="rounded-lg border p-6"
            style={{
              backgroundColor: designTokens.colors.cardBg,
              borderColor: designTokens.colors.border,
              boxShadow: designTokens.shadows.sm
            }}
          >
            <h3 className="text-2xl font-bold mb-4" style={{ color: designTokens.colors.textPrimary }}>
              {currentYear} 年度總計
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <p className="text-base" style={{ color: designTokens.colors.textSecondary }}>總使用量</p>
                <p className="text-3xl font-bold text-blue-600">{data.totalQuantity.toFixed(2)} L</p>
              </div>
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <p className="text-base" style={{ color: designTokens.colors.textSecondary }}>使用記錄數</p>
                <p className="text-3xl font-bold text-green-600">{data.records.length} 筆</p>
              </div>
            </div>
          </div>
        )}

        {/* 成功/錯誤提示 */}
        {showSuccess && (
          <div className="fixed top-4 right-4 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg flex items-center space-x-2 z-50">
            <CheckCircle className="w-5 h-5" />
            <span>數據已成功提交！</span>
          </div>
        )}

        {showError && (
          <div className="fixed top-4 right-4 bg-red-500 text-white px-6 py-3 rounded-lg shadow-lg flex items-center space-x-2 z-50">
            <AlertCircle className="w-5 h-5" />
            <span>{errorMessage}</span>
            <button onClick={() => setShowError(false)} className="ml-2 hover:bg-red-600 rounded p-1">×</button>
          </div>
        )}
      </div>

        {/* 底部空間，避免內容被固定底部欄遮擋 */}
        <div className="h-20"></div>
      </div>

        {/* 統一底部操作欄 */}
        <BottomActionBar
        currentStatus={currentStatus}
        currentEntryId={currentEntryId}
        isUpdating={false}
        hasSubmittedBefore={hasSubmittedBefore}
        editPermissions={editPermissions}
        submitting={submitting}
        onSubmit={handleSubmit}
        onClear={handleClear}
        designTokens={designTokens}
      />
    </>
  )
}