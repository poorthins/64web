import { useState, useCallback, useEffect, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Plus, Trash2, Calendar, Truck, AlertCircle, CheckCircle, Upload, Loader2, Eye } from 'lucide-react'
import { useFrontendStatus } from '../../hooks/useFrontendStatus'
import { useEditPermissions } from '../../hooks/useEditPermissions'
import { useRole } from '../../hooks/useRole'
import StatusIndicator from '../../components/StatusIndicator'
import EvidenceUpload, { MemoryFile } from '../../components/EvidenceUpload'
import BottomActionBar from '../../components/BottomActionBar'
import { EntryStatus } from '../../components/StatusSwitcher'
import { listMSDSFiles, listUsageEvidenceFiles, commitEvidence, deleteEvidence, deleteEvidenceFile, EvidenceFile, uploadEvidenceWithEntry, adminDeleteEvidence } from '../../api/files'
import { upsertEnergyEntry, sumMonthly, UpsertEntryInput, updateEntryStatus, getEntryByPageKeyAndYear, getEntryById } from '../../api/entries'
import ReviewSection from '../../components/ReviewSection'
import { getEntryFiles } from '../../api/files'
import { designTokens } from '../../utils/designTokens'
import { debugRLSOperation, diagnoseAuthState } from '../../utils/authDiagnostics'
import { logDetailedAuthStatus } from '../../utils/authHelpers'
import { DocumentHandler } from '../../services/documentHandler'

interface RefuelRecord {
  id: string
  date: string           // 加油日期
  quantity: number       // 加油量 (L)
  files: EvidenceFile[]  // 佐證檔案
  memoryFiles: MemoryFile[]  // 新增記憶檔案
  recordKey?: string     // 用於檔案關聯的唯一識別碼
}

interface DieselGeneratorRefuelData {
  year: number
  records: RefuelRecord[]
  totalQuantity: number  // 總加油量
}


export default function DieselGeneratorRefuelPage() {
  const [searchParams] = useSearchParams()

  // 審核模式檢測
  const isReviewMode = searchParams.get('mode') === 'review'
  const reviewEntryId = searchParams.get('entryId')
  const reviewUserId = searchParams.get('userId')

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

  const [data, setData] = useState<DieselGeneratorRefuelData>({
    year: currentYear,
    records: [],
    totalQuantity: 0
  })

  const [newRecord, setNewRecord] = useState<Omit<RefuelRecord, 'id'>>({
    date: '',
    quantity: 0,
    files: [],
    memoryFiles: []
  })

  const [showSuccess, setShowSuccess] = useState(false)
  const [showError, setShowError] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [showClearConfirmModal, setShowClearConfirmModal] = useState(false)
  const [clearLoading, setClearLoading] = useState(false)

  const pageKey = 'diesel_generator'

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

  // u89d2u8272u6aa2u67e5
  const { role } = useRole()

  const editPermissions = useEditPermissions(currentStatus || 'submitted')

  // 審核模式時為唯讀
  const isReadOnly = isReviewMode

  const calculateTotals = useCallback((records: RefuelRecord[]) => {
    const totalQuantity = records.reduce((sum, record) => sum + record.quantity, 0)
    return { totalQuantity }
  }, [])

  const addRecord = useCallback(() => {
    if (!newRecord.date || newRecord.quantity <= 0) {
      setErrorMessage('請填寫完整的加油記錄資訊')
      setShowError(true)
      return
    }

    const record: RefuelRecord = {
      id: `diesel_generator_${Date.now()}`,
      recordKey: `diesel_generator_record_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      ...newRecord,
      memoryFiles: newRecord.memoryFiles || []
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
      files: [],
      memoryFiles: []
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
      const newRecords = prevData.records.map(record => {
        if (record.id === recordId) {
          // 確保檔案具有正確的關聯標識
          const updatedFiles = files.map(file => ({
            ...file,
            // 檔案已經通過 EvidenceUpload 組件正確關聯到 entry_id
            // 這裡主要確保檔案與記錄的本地關聯
          }))
          return { ...record, files: updatedFiles }
        }
        return record
      })

      return {
        ...prevData,
        records: newRecords
      }
    })
  }, [])

  const handleRecordMemoryFileChange = useCallback((recordId: string, memFiles: MemoryFile[]) => {
    setData(prevData => ({
      ...prevData,
      records: prevData.records.map(record =>
        record.id === recordId ? { ...record, memoryFiles: memFiles } : record
      )
    }))
  }, [])

  const handleSubmit = useCallback(async () => {
    console.log('=== 柴油發電機提交除錯開始 ===')

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

      // 步驟2：準備柴油發電機數據（轉換為月份格式以符合 API）
      const monthly: Record<string, number> = {
        '1': data.totalQuantity || 0 // 總加油量記錄在1月
      }

      // 步驟3：建立填報輸入資料
      const notesText = `柴油發電機加油記錄，總加油量：${data.totalQuantity?.toFixed(2) || 0} L，共 ${data.records.length} 筆記錄`
      const entryInput: UpsertEntryInput = {
        page_key: pageKey,
        period_year: currentYear,
        unit: 'L',
        monthly: monthly,
        notes: notesText,
        extraPayload: {
          mode: 'refuel',  // 重要：標記為加油模式
          refuelData: {    // 改名避免混淆
            year: currentYear,
            records: data.records,
            totalQuantity: data.totalQuantity
          },
          notes: `柴油發電機加油記錄，總加油量：${data.totalQuantity} L`
        }
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

      // 步驟6：上傳所有記錄的檔案
      for (const record of data.records) {
        if (record.memoryFiles && record.memoryFiles.length > 0) {
          for (const memFile of record.memoryFiles) {
            await uploadEvidenceWithEntry(memFile.file, {
              entryId: entry_id,
              pageKey: pageKey,
              standard: '64',
              year: currentYear,
              fileType: 'other'
            })
          }
        }
      }

      // 清空 memory files
      setData(prevData => ({
        ...prevData,
        records: prevData.records.map(record => ({ ...record, memoryFiles: [] }))
      }))

      // 步驟7：提交所有檔案
      await debugRLSOperation(
        '提交證明檔案',
        async () => await commitEvidence({
          entryId: entry_id,
          pageKey: pageKey
        })
      )

      // 步驟8：處理狀態轉換
      await handleSubmitSuccess()

      setHasChanges(false)
      setHasSubmittedBefore(true)

      setSuccess(`柴油發電機數據已提交，總加油量 ${data.totalQuantity?.toFixed(2) || 0} L`)
      setShowSuccess(true)
      setTimeout(() => setShowSuccess(false), 3000)

      console.log('=== ✅ 柴油發電機提交成功完成 ===')

    } catch (error) {
      console.error('=== ❌ 柴油發電機提交失敗 ===')
      console.error('錯誤訊息:', error instanceof Error ? error.message : String(error))
      setError(error instanceof Error ? error.message : '提交失敗')
      setErrorMessage(error instanceof Error ? error.message : '提交失敗，請稍後重試')
      setShowError(true)
    } finally {
      setSubmitting(false)
    }
  }, [data, currentYear, currentEntryId, handleSubmitSuccess, pageKey])

  const handleClearAll = async () => {
    console.log('🗑️ [DieselGeneratorRefuelPage] ===== CLEAR BUTTON CLICKED =====')

    const clearSuccess = DocumentHandler.handleClear({
      currentStatus: currentStatus,
      title: '柴油發電機資料清除',
      message: '確定要清除所有柴油發電機加油資料嗎？此操作無法復原。',
      onClear: () => {
        setClearLoading(true)
        try {
          console.log('🗑️ [DieselGeneratorRefuelPage] Starting complete clear operation...')

          // 清理記憶體檔案
          data.records.forEach(record => {
            DocumentHandler.clearAllMemoryFiles(record.memoryFiles)
          })
          DocumentHandler.clearAllMemoryFiles(newRecord.memoryFiles)

          // 原有的清除邏輯保持不變
          setData({
            year: currentYear,
            records: [],
            totalQuantity: 0
          })
          setNewRecord({
            date: '',
            quantity: 0,
            files: [],
            memoryFiles: []
          })
          setHasChanges(false)
          setError(null)
          setSuccess(null)
          setShowClearConfirmModal(false)

          setSuccess('資料已清除')

        } catch (error) {
          console.error('❌ [DieselGeneratorRefuelPage] Clear operation failed:', error)
          setError('清除操作失敗，請重試')
          setShowClearConfirmModal(false)
        } finally {
          console.log('🗑️ [DieselGeneratorRefuelPage] Clear operation finished, resetting loading state')
          setClearLoading(false)
        }
      }
    })

    if (!clearSuccess && currentStatus === 'approved') {
      setError('已通過的資料無法清除')
    }
  }

  const handleStatusChange = async (newStatus: EntryStatus) => {
    try {
      if (currentEntryId) {
        await updateEntryStatus(currentEntryId, newStatus as 'draft' | 'submitted' | 'approved' | 'rejected')
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

        // 載入基本資料
        let existingEntry
        if (isReviewMode && reviewEntryId) {
          console.log('🔍 [DieselGeneratorRefuelPage] 審核模式 - 載入特定記錄:', reviewEntryId)
          existingEntry = await getEntryById(reviewEntryId)
        } else {
          console.log('🔍 [DieselGeneratorRefuelPage] 一般模式 - 載入用戶自己的記錄')
          existingEntry = await getEntryByPageKeyAndYear(pageKey, currentYear)
        }
        if (existingEntry && existingEntry.status !== 'draft') {
          setInitialStatus(existingEntry.status as EntryStatus)
          setCurrentEntryId(existingEntry.id)
          setHasSubmittedBefore(true)

          // 載入時檢查模式
          if (existingEntry.extraPayload?.mode === 'test') {
            // 如果是測試模式資料，顯示提示
            setError('此頁面為加油記錄模式，請切換至測試記錄頁面查看測試資料')
            return
          }

          if (existingEntry.extraPayload?.mode === 'refuel' || !existingEntry.extraPayload?.mode) {
            // 載入加油資料
            const refuelData = existingEntry.extraPayload?.refuelData

            if (refuelData) {
              // 載入相關檔案
              if (existingEntry.id) {
                try {
                  const files = await getEntryFiles(existingEntry.id)

                  // 分類檔案：檢查 file_type === 'other' 或 'usage_evidence'，且 page_key 匹配
                  const dieselGeneratorFiles = files.filter(f =>
                    (f.file_type === 'other' || f.file_type === 'usage_evidence') &&
                    f.page_key === pageKey
                  )

                  // 更新記錄的檔案 - 使用時間戳或檔案名稱規則進行關聯
                  if (refuelData.records) {
                    refuelData.records.forEach((record: any) => {
                      // 根據記錄的 recordKey 或時間範圍關聯檔案
                      const recordFiles = dieselGeneratorFiles.filter(f => {
                        // 優先使用 recordKey 關聯
                        if (record.recordKey && f.file_name.includes(record.recordKey)) {
                          return true
                        }
                        // 備選：根據時間相近性關聯（檔案創建時間接近記錄日期）
                        const recordDate = new Date(record.date)
                        const fileDate = new Date(f.created_at)
                        const timeDiff = Math.abs(fileDate.getTime() - recordDate.getTime())
                        return timeDiff < 24 * 60 * 60 * 1000 // 24小時內
                      })
                      record.files = recordFiles || []
                    })
                  }

                  setData(refuelData)
                } catch (fileError) {
                  console.error('Failed to load files for diesel generator records:', fileError)
                  setData(refuelData)
                }
              } else {
                setData(refuelData)
              }

              // 處理狀態變更
              handleDataChanged()
            }
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
  }, [isReviewMode, reviewEntryId, reviewUserId])

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
            柴油發電機 加油記錄
          </h1>
          <p className="text-lg text-center text-gray-600 mb-6">
            請記錄發電機加油資料並上傳加油發票
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
              新增加油記錄
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-base font-medium mb-2" style={{ color: designTokens.colors.textPrimary }}>
                  加油日期
                </label>
                <input
                  type="date"
                  value={newRecord.date}
                  onChange={(e) => setNewRecord(prev => ({ ...prev, date: e.target.value }))}
                  disabled={isReadOnly}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  style={{ borderColor: designTokens.colors.border }}
                />
              </div>

              <div>
                <label className="block text-base font-medium mb-2" style={{ color: designTokens.colors.textPrimary }}>
                  加油量 (L)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={newRecord.quantity || ''}
                  onChange={(e) => setNewRecord(prev => ({ ...prev, quantity: parseFloat(e.target.value) || 0 }))}
                  disabled={isReadOnly}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  style={{ borderColor: designTokens.colors.border }}
                  placeholder="輸入加油量"
                />
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium mb-2" style={{ color: designTokens.colors.textPrimary }}>
                加油發票
              </label>
              <EvidenceUpload
                pageKey={pageKey}
                files={newRecord.files}
                onFilesChange={(files) => setNewRecord(prev => ({ ...prev, files }))}
                memoryFiles={newRecord.memoryFiles}
                onMemoryFilesChange={(memFiles) => setNewRecord(prev => ({ ...prev, memoryFiles: memFiles }))}
                maxFiles={1}
                disabled={submitting || !editPermissions.canUploadFiles || isReadOnly}
                kind="other"
                mode="edit"
                isAdminReviewMode={isReviewMode && role === 'admin'}
                hideFileCount={true}
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

        {/* 加油記錄列表 */}
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
            加油記錄列表
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
                  <Truck className="w-5 h-5 text-blue-600" />
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

              {(record.files.length > 0 || record.memoryFiles?.length > 0) && (
                <div className="mt-3">
                  <EvidenceUpload
                    pageKey={pageKey}
                    files={record.files}
                    onFilesChange={(files) => handleRecordFileChange(record.id, files)}
                    memoryFiles={record.memoryFiles || []}
                    onMemoryFilesChange={(memFiles) => handleRecordMemoryFileChange(record.id, memFiles)}
                    maxFiles={1}
                    disabled={!editPermissions.canUploadFiles || isReadOnly}
                    kind="other"
                    mode="edit"
                isAdminReviewMode={isReviewMode && role === 'admin'}
                    hideFileCount={true}
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
                <p className="text-base" style={{ color: designTokens.colors.textSecondary }}>總加油量</p>
                <p className="text-3xl font-bold text-blue-600">{data.totalQuantity.toFixed(2)} L</p>
              </div>
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <p className="text-base" style={{ color: designTokens.colors.textSecondary }}>加油記錄數</p>
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

        {/* 統一底部操作欄 - 審核模式下隱藏 */}
        {!isReviewMode && (
          <BottomActionBar
          currentStatus={currentStatus}
          currentEntryId={currentEntryId}
          isUpdating={false}
          hasSubmittedBefore={hasSubmittedBefore}
          editPermissions={editPermissions}
          submitting={submitting}
          onSubmit={handleSubmit}
          onClear={() => setShowClearConfirmModal(true)}
          designTokens={designTokens}
        />
        )}

        {/* 審核區塊 - 只在審核模式顯示 */}
        {isReviewMode && currentEntryId && (
          <ReviewSection
            entryId={reviewEntryId || currentEntryId}
            userId={reviewUserId || "current_user"}
            category="柴油發電機"
            userName={reviewUserId || "用戶"}
            amount={data.totalQuantity}
            unit="L"
            onApprove={() => {
              console.log('✅ 柴油發電機填報審核通過 - 由 ReviewSection 處理')
            }}
            onReject={(reason) => {
              console.log('❌ 柴油發電機填報已退回 - 由 ReviewSection 處理:', reason)
            }}
          />
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
    </>
  )
}