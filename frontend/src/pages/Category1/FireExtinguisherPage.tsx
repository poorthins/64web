import { useState, useCallback, useEffect, useRef } from 'react'
import { Plus, Trash2, Shield, AlertCircle, CheckCircle, Upload, Loader2 } from 'lucide-react'
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

interface FireExtinguisherRecord {
  id: string
  equipmentType: string    // 設備類型
  quantity: number         // 數量
  isRefilled: boolean      // 該年度是否填充
  refilledAmount?: number  // 填充量（可選）
  unit: string            // 單位
  location: string        // 位置
}

interface FireExtinguisherData {
  year: number
  records: FireExtinguisherRecord[]
  totalEquipment: number
}

const equipmentTypes = ['乾粉式', '二氧化碳式', '泡沫式', '海龍式', '其他']
const unitOptions = ['kg', 'L', '瓶', '個']

export default function FireExtinguisherPage() {
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
  
  const [data, setData] = useState<FireExtinguisherData>({
    year: currentYear,
    records: [],
    totalEquipment: 0
  })

  const [evidenceFiles, setEvidenceFiles] = useState<EvidenceFile[]>([])

  const [newRecord, setNewRecord] = useState<Omit<FireExtinguisherRecord, 'id'>>({
    equipmentType: '乾粉式',
    quantity: 0,
    isRefilled: false,
    refilledAmount: undefined,
    unit: 'kg',
    location: ''
  })

  const [showSuccess, setShowSuccess] = useState(false)
  const [showError, setShowError] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const pageKey = 'fire_extinguisher'
  
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

  const calculateTotals = useCallback((records: FireExtinguisherRecord[]) => {
    const totalEquipment = records.reduce((sum, record) => sum + record.quantity, 0)
    return { totalEquipment }
  }, [])

  const addRecord = useCallback(() => {
    if (!newRecord.location || newRecord.quantity <= 0) {
      setErrorMessage('請填寫完整的滅火器記錄資訊')
      setShowError(true)
      return
    }

    if (newRecord.isRefilled && (!newRecord.refilledAmount || newRecord.refilledAmount <= 0)) {
      setErrorMessage('請填寫填充量')
      setShowError(true)
      return
    }

    const record: FireExtinguisherRecord = {
      id: `fire_extinguisher_${Date.now()}`,
      ...newRecord,
      refilledAmount: newRecord.isRefilled ? newRecord.refilledAmount : undefined
    }

    setData(prevData => {
      const newRecords = [...prevData.records, record]
      const totals = calculateTotals(newRecords)
      
      return {
        ...prevData,
        records: newRecords,
        ...totals
      }
    })

    setNewRecord({
      equipmentType: '乾粉式',
      quantity: 0,
      isRefilled: false,
      refilledAmount: undefined,
      unit: 'kg',
      location: ''
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

  const handleSubmit = useCallback(async () => {
    console.log('=== 滅火器填報提交除錯開始 ===')
    
    if (evidenceFiles.length === 0) {
      setError('請上傳消防安全設備檢修表')
      return
    }

    if (data.records.length === 0) {
      setError('請至少新增一筆滅火器記錄')
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

      // 步驟2：準備滅火器數據（轉換為月份格式以符合 API）
      const monthly: Record<string, number> = {
        '1': data.totalEquipment || 0 // 總設備數量記錄在1月
      }

      // 步驟3：建立填報輸入資料
      const entryInput: UpsertEntryInput = {
        page_key: pageKey,
        period_year: currentYear,
        unit: '台',
        monthly: monthly,
        notes: `滅火器填報記錄，總設備數量：${data.totalEquipment} 台，共 ${data.records.length} 筆記錄`,
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

      setSuccess(`滅火器填報已提交，總設備數量 ${data.totalEquipment} 台`)
      setShowSuccess(true)
      setTimeout(() => setShowSuccess(false), 3000)
      
      console.log('=== ✅ 滅火器填報提交成功完成 ===')

    } catch (error) {
      console.error('=== ❌ 滅火器填報提交失敗 ===')
      console.error('錯誤訊息:', error instanceof Error ? error.message : String(error))
      setError(error instanceof Error ? error.message : '提交失敗')
      setErrorMessage(error instanceof Error ? error.message : '提交失敗，請稍後重試')
      setShowError(true)
    } finally {
      setSubmitting(false)
    }
  }, [data, evidenceFiles, currentYear, currentEntryId, handleSubmitSuccess, pageKey])

  const handleClear = useCallback(() => {
    if (window.confirm('確定要清除所有數據嗎？此操作無法復原。')) {
      setData({
        year: currentYear,
        records: [],
        totalEquipment: 0
      })
      setNewRecord({
        equipmentType: '乾粉式',
        quantity: 0,
        isRefilled: false,
        refilledAmount: undefined,
        unit: 'kg',
        location: ''
      })
      setEvidenceFiles([])
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

        // 載入檢修表檔案
        const msdsFilesList = await listMSDSFiles(pageKey)
        setEvidenceFiles(msdsFilesList)

        // 檢查是否已有非草稿記錄
        const existingEntry = await getEntryByPageKeyAndYear(pageKey, currentYear)
        if (existingEntry && existingEntry.status !== 'draft') {
          setInitialStatus(existingEntry.status as EntryStatus)
          setCurrentEntryId(existingEntry.id)
          setHasSubmittedBefore(true)
          
          // 載入已提交的記錄數據供編輯
          if (existingEntry.payload?.fireExtinguisherData) {
            const fireExtinguisherData = existingEntry.payload.fireExtinguisherData
            
            // 載入相關檔案
            if (existingEntry.id) {
              try {
                const files = await getEntryFiles(existingEntry.id)
                
                // 分類檔案到對應的記錄
                const msdsFiles = files.filter(f => f.kind === 'msds' && f.page_key === pageKey)
                
                setEvidenceFiles(msdsFiles)
                setData(fireExtinguisherData)
              } catch (fileError) {
                console.error('Failed to load files for fire extinguisher records:', fileError)
                setData(fireExtinguisherData)
              }
            } else {
              setData(fireExtinguisherData)
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
  }, [data, evidenceFiles, hasSubmittedBefore])

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
            滅火器 使用數量填報
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

        {/* 消防安全設備檢修表上傳 */}
        <div
          className="rounded-lg border p-6"
          style={{
            backgroundColor: designTokens.colors.cardBg,
            borderColor: designTokens.colors.border,
            boxShadow: designTokens.shadows.sm
          }}
        >
          <h2
            className="text-2xl font-medium mb-4"
            style={{ color: designTokens.colors.textPrimary }}
          >
            消防安全設備檢修表
          </h2>
          
          <div>
            <label 
              className="block text-base font-medium mb-2"
              style={{ color: designTokens.colors.textPrimary }}
            >
              佐證資料
            </label>
            <EvidenceUpload
              pageKey={pageKey}
              files={evidenceFiles}
              onFilesChange={setEvidenceFiles}
              maxFiles={3}
              disabled={submitting || !editPermissions.canUploadFiles}
              kind="msds"
            />
            <p 
              className="text-sm mt-1"
              style={{ color: designTokens.colors.textSecondary }}
            >
              請上傳消防安全設備檢修表或相關證明文件
            </p>
          </div>
        </div>

        {/* 新增滅火器記錄表單 */}
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
              新增滅火器記錄
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
              <div>
                <label className="block text-base font-medium mb-2" style={{ color: designTokens.colors.textPrimary }}>
                  設備類型
                </label>
                <select
                  value={newRecord.equipmentType}
                  onChange={(e) => setNewRecord(prev => ({ ...prev, equipmentType: e.target.value }))}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  style={{ borderColor: designTokens.colors.border }}
                >
                  {equipmentTypes.map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-base font-medium mb-2" style={{ color: designTokens.colors.textPrimary }}>
                  數量
                </label>
                <input
                  type="number"
                  min="1"
                  value={newRecord.quantity || ''}
                  onChange={(e) => setNewRecord(prev => ({ ...prev, quantity: parseInt(e.target.value) || 0 }))}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  style={{ borderColor: designTokens.colors.border }}
                  placeholder="輸入數量"
                />
              </div>
              
              <div>
                <label className="block text-base font-medium mb-2" style={{ color: designTokens.colors.textPrimary }}>
                  該年度是否填充
                </label>
                <select
                  value={newRecord.isRefilled ? 'yes' : 'no'}
                  onChange={(e) => setNewRecord(prev => ({ 
                    ...prev, 
                    isRefilled: e.target.value === 'yes',
                    refilledAmount: e.target.value === 'yes' ? prev.refilledAmount : undefined
                  }))}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  style={{ borderColor: designTokens.colors.border }}
                >
                  <option value="no">否</option>
                  <option value="yes">是</option>
                </select>
              </div>
              
              {newRecord.isRefilled && (
                <div>
                  <label className="block text-base font-medium mb-2" style={{ color: designTokens.colors.textPrimary }}>
                    填充量
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    value={newRecord.refilledAmount || ''}
                    onChange={(e) => setNewRecord(prev => ({ ...prev, refilledAmount: parseFloat(e.target.value) || 0 }))}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    style={{ borderColor: designTokens.colors.border }}
                    placeholder="輸入填充量"
                  />
                </div>
              )}
              
              <div>
                <label className="block text-base font-medium mb-2" style={{ color: designTokens.colors.textPrimary }}>
                  單位
                </label>
                <select
                  value={newRecord.unit}
                  onChange={(e) => setNewRecord(prev => ({ ...prev, unit: e.target.value }))}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  style={{ borderColor: designTokens.colors.border }}
                >
                  {unitOptions.map(unit => (
                    <option key={unit} value={unit}>{unit}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-base font-medium mb-2" style={{ color: designTokens.colors.textPrimary }}>
                  位置
                </label>
                <input
                  type="text"
                  value={newRecord.location}
                  onChange={(e) => setNewRecord(prev => ({ ...prev, location: e.target.value }))}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  style={{ borderColor: designTokens.colors.border }}
                  placeholder="設備所在位置"
                />
              </div>
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

        {/* 滅火器記錄列表 */}
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
            滅火器記錄列表
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
                  <Shield className="w-5 h-5 text-red-600" />
                  <div className="grid grid-cols-1 md:grid-cols-6 gap-2 text-base">
                    <div>
                      <span className="font-medium">{record.equipmentType}</span>
                    </div>
                    <div>
                      <span style={{ color: designTokens.colors.textSecondary }}>
                        數量: {record.quantity}
                      </span>
                    </div>
                    <div>
                      <span className={`px-2 py-1 rounded-md text-sm ${
                        record.isRefilled ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                      }`}>
                        {record.isRefilled ? '已填充' : '未填充'}
                      </span>
                    </div>
                    {record.isRefilled && record.refilledAmount && (
                      <div>
                        <span style={{ color: designTokens.colors.textSecondary }}>
                          填充量: {record.refilledAmount} {record.unit}
                        </span>
                      </div>
                    )}
                    <div>
                      <span style={{ color: designTokens.colors.textSecondary }}>
                        單位: {record.unit}
                      </span>
                    </div>
                    <div>
                      <span style={{ color: designTokens.colors.textSecondary }}>
                        位置: {record.location}
                      </span>
                    </div>
                  </div>
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
                <p className="text-base" style={{ color: designTokens.colors.textSecondary }}>總設備數量</p>
                <p className="text-3xl font-bold text-blue-600">{data.totalEquipment} 台</p>
              </div>
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <p className="text-base" style={{ color: designTokens.colors.textSecondary }}>記錄筆數</p>
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