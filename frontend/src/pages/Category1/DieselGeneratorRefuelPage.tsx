import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { AlertCircle, CheckCircle, Loader2, X, Trash2, Plus } from 'lucide-react'
import EvidenceUpload, { MemoryFile } from '../../components/EvidenceUpload'
import { EntryStatus } from '../../components/StatusSwitcher'
import StatusIndicator from '../../components/StatusIndicator'
import Toast, { ToastType } from '../../components/Toast'
import BottomActionBar from '../../components/BottomActionBar'
import { useEditPermissions } from '../../hooks/useEditPermissions'
import { useFrontendStatus } from '../../hooks/useFrontendStatus'
import { commitEvidence, getEntryFiles, EvidenceFile, uploadEvidenceWithEntry } from '../../api/files'
import { upsertEnergyEntry, UpsertEntryInput, getEntryByPageKeyAndYear } from '../../api/entries'
import { designTokens } from '../../utils/designTokens'
import { getCategoryInfo } from '../../utils/categoryConstants'
import { DocumentHandler } from '../../services/documentHandler'

// 柴油發電機測試記錄資料結構
interface TestRecord {
  id: string
  annualTestFrequency: number // 年度測試頻率(次)
  testDuration: number       // 測試時間(分)
  generatorLocation: string  // 發電機位置
  powerRating: number        // 發電功率(kW)
  files: EvidenceFile[]      // 佐證檔案
  memoryFiles?: MemoryFile[] // 記憶體暫存檔案
}

const DieselGeneratorPage = () => {
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

  const { currentStatus: frontendCurrentStatus, handleSubmitSuccess, handleDataChanged, isInitialLoad } = frontendStatus
  const currentStatus = frontendCurrentStatus || initialStatus
  const isUpdating = false

  // 表單資料
  const [year] = useState(new Date().getFullYear())
  const [testRecords, setTestRecords] = useState<TestRecord[]>([
    {
      id: crypto.randomUUID(),
      annualTestFrequency: 0,
      testDuration: 0,
      generatorLocation: '',
      powerRating: 0,
      files: [],
      memoryFiles: []
    }
  ])

  const pageKey = 'diesel_generator'

  // 編輯權限控制
  const editPermissions = useEditPermissions(currentStatus)

  // 判斷是否有資料
  const hasAnyData = useMemo(() => {
    const hasTestRecords = testRecords.some(r =>
      r.annualTestFrequency > 0 ||
      r.testDuration > 0 ||
      r.generatorLocation !== '' ||
      r.powerRating > 0 ||
      r.files.length > 0 ||
      (r.memoryFiles && r.memoryFiles.length > 0)
    )
    return hasTestRecords
  }, [testRecords])

  // 唯讀模式判斷
  const isReadOnly = false

  // 載入草稿和檔案
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true)
        setError(null)

        // 檢查是否已有非草稿記錄
        const existingEntry = await getEntryByPageKeyAndYear(pageKey, year)
        if (existingEntry && existingEntry.status !== 'draft') {
          setInitialStatus(existingEntry.status as EntryStatus)
          setCurrentEntryId(existingEntry.id)
          setHasSubmittedBefore(true)

          // 載入已提交的記錄數據供編輯
          // 優先從 extraPayload 讀取
          if (existingEntry.extraPayload?.testRecords && existingEntry.extraPayload?.mode === 'refuel') {
            // 載入相關檔案
            let updatedRecords = existingEntry.extraPayload.testRecords

            if (existingEntry.id) {
              try {
                const files = await getEntryFiles(existingEntry.id)

                // 更新測試記錄中的檔案
                updatedRecords = existingEntry.extraPayload.testRecords.map((record: any) => {
                  const associatedFiles = files.filter(f =>
                    f.file_type === 'usage_evidence' &&
                    f.page_key === pageKey
                  )

                  return {
                    ...record,
                    files: associatedFiles
                  }
                })
              } catch (fileError) {
                console.error('Failed to load files:', fileError)
              }
            }

            setTestRecords(updatedRecords)
            handleDataChanged()
          } else if (existingEntry.extraPayload?.mode === 'test') {
            // 如果是測試模式的資料，不載入到refuel頁面
            console.warn('Found test mode data, skipping load in refuel mode page')
          } else if (!existingEntry.extraPayload?.mode) {
            // 處理無模式標記的舊資料，預設為加油模式
            console.log('Loading legacy data without mode, assuming refuel mode')
            if (existingEntry.extraPayload?.testRecords) {
              let updatedRecords = existingEntry.extraPayload.testRecords

              if (existingEntry.id) {
                try {
                  const files = await getEntryFiles(existingEntry.id)
                  updatedRecords = existingEntry.extraPayload.testRecords.map((record: any) => {
                    const associatedFiles = files.filter(f =>
                      f.file_type === 'usage_evidence' &&
                      f.page_key === pageKey
                    )
                    return { ...record, files: associatedFiles }
                  })
                } catch (fileError) {
                  console.error('Failed to load files:', fileError)
                }
              }

              setTestRecords(updatedRecords)
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
  }, [])

  const addTestRecord = () => {
    setTestRecords(prev => [...prev, {
      id: crypto.randomUUID(),
      annualTestFrequency: 0,
      testDuration: 0,
      generatorLocation: '',
      powerRating: 0,
      files: [],
      memoryFiles: []
    }])
  }

  const removeTestRecord = (id: string) => {
    if (testRecords.length > 1) {
      setTestRecords(prev => prev.filter(record => record.id !== id))
    }
  }

  const updateTestRecord = (id: string, field: keyof TestRecord, value: any) => {
    setTestRecords(prev => prev.map(record =>
      record.id === id ? { ...record, [field]: value } : record
    ))
  }

  const handleTestFilesChange = (recordId: string, files: EvidenceFile[]) => {
    updateTestRecord(recordId, 'files', files)
  }

  const handleMemoryFilesChange = (recordId: string, files: MemoryFile[]) => {
    console.log('📁 [DieselGeneratorPage] Memory files changed for record:', recordId, files.length)
    updateTestRecord(recordId, 'memoryFiles', files)
  }

  const getTotalTestTime = () => {
    return testRecords.reduce((sum, record) => sum + (record.testDuration || 0), 0)
  }

  const validateData = () => {
    const errors: string[] = []

    testRecords.forEach((record, index) => {
      if (record.annualTestFrequency <= 0) {
        errors.push(`第${index + 1}筆記錄年度測試頻率必須大於0次`)
      }
      if (record.testDuration <= 0) {
        errors.push(`第${index + 1}筆記錄測試時間必須大於0分鐘`)
      }
      if (!record.generatorLocation.trim()) {
        errors.push(`第${index + 1}筆記錄未填入發電機位置`)
      }
      if (record.powerRating <= 0) {
        errors.push(`第${index + 1}筆記錄發電功率必須大於0kW`)
      }

      // 檢查已上傳檔案 OR 記憶體檔案
      const totalFiles = record.files.length + (record.memoryFiles?.length || 0)
      if (totalFiles === 0) {
        errors.push(`第${index + 1}筆記錄未上傳測試佐證資料`)
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
      console.log('🔍 ========== 柴油發電機提交診斷開始 ==========')
      console.log('🔍 [1] pageKey:', pageKey)

      // 獲取正確的 category 資訊
      const categoryInfo = getCategoryInfo(pageKey)
      console.log('🔍 [2] categoryInfo:', categoryInfo)

      // 將測試記錄轉換為月份資料格式 (直接使用年度總測試時間)
      const monthly: Record<string, number> = {}
      const totalTestTime = getTotalTestTime()

      if (totalTestTime > 0) {
        // 將總測試時間放到12月
        monthly['12'] = totalTestTime
      }

      console.log('🔍 [3] monthly:', monthly)

      const entryInput: UpsertEntryInput = {
        page_key: pageKey,
        period_year: year,
        unit: '分鐘',
        monthly: monthly,
        extraPayload: {
          mode: 'refuel',
          testRecords: testRecords.map(record => ({
            id: record.id,
            annualTestFrequency: record.annualTestFrequency,
            testDuration: record.testDuration,
            generatorLocation: record.generatorLocation,
            powerRating: record.powerRating
          })),
          totalTestTime: getTotalTestTime(),
          notes: `柴油發電機測試記錄，共${testRecords.length}筆記錄`
        }
      }

      console.log('🔍 [4] entryInput:', entryInput)

      const { entry_id } = await upsertEnergyEntry(entryInput, true)

      if (!currentEntryId) {
        setCurrentEntryId(entry_id)
      }

      // 上傳測試記錄記憶體檔案
      for (const record of testRecords) {
        if (record.memoryFiles && record.memoryFiles.length > 0) {
          console.log(`📁 [DieselGeneratorPage] Uploading ${record.memoryFiles.length} files for record ${record.id}...`)
          for (const memoryFile of record.memoryFiles) {
            await uploadEvidenceWithEntry(memoryFile.file, {
              entryId: entry_id,
              pageKey: pageKey,
              year: year,
              category: 'usage_evidence'
            })
          }
        }
      }

      await commitEvidence({
        entryId: entry_id,
        pageKey: pageKey
      })

      await handleSubmitSuccess()

      // 清空記憶體檔案
      setTestRecords(prev => prev.map(record => ({
        ...record,
        memoryFiles: []
      })))

      setSuccess(`年度總測試時間：${totalTestTime} 分鐘`)
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
    console.log('🗑️ [DieselGeneratorPage] ===== CLEAR BUTTON CLICKED =====')

    const clearSuccess = DocumentHandler.handleClear({
      currentStatus: currentStatus,
      title: '柴油發電機測試資料清除',
      message: '確定要清除所有柴油發電機測試資料嗎？此操作無法復原。',
      onClear: () => {
        setSubmitting(true)
        try {
          console.log('🗑️ [DieselGeneratorPage] Starting complete clear operation...')

          // 清理記憶體檔案
          testRecords.forEach(record => {
            if (record.memoryFiles) {
              DocumentHandler.clearAllMemoryFiles(record.memoryFiles)
            }
          })

          // 清除測試資料
          setTestRecords([{
            id: crypto.randomUUID(),
            annualTestFrequency: 0,
            testDuration: 0,
            generatorLocation: '',
            powerRating: 0,
            files: [],
            memoryFiles: []
          }])
          setHasSubmittedBefore(false)
          setError(null)
          setSuccess(null)
          setShowClearConfirmModal(false)

          setToast({
            message: '資料已清除',
            type: 'success'
          })

        } catch (error) {
          console.error('❌ [DieselGeneratorPage] Clear operation failed:', error)
          setError('清除操作失敗，請重試')
        } finally {
          console.log('🗑️ [DieselGeneratorPage] Clear operation finished, resetting loading state')
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
            柴油發電機測試記錄
          </h1>
          <p
            className="text-base"
            style={{ color: designTokens.colors.textSecondary }}
          >
            請記錄發電機測試資料並上傳相關佐證文件
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


        {/* 測試記錄區塊 */}
        <div
          className="rounded-lg border p-6"
          style={{
            backgroundColor: designTokens.colors.cardBg,
            borderColor: designTokens.colors.border,
            boxShadow: designTokens.shadows.sm
          }}
        >
          <div className="mb-6">
            <h2
              className="text-xl font-medium"
              style={{ color: designTokens.colors.textPrimary }}
            >
              測試記錄
            </h2>
          </div>

          {/* 總測試時間統計 */}
          <div
            className="mb-6 p-4 rounded-lg"
            style={{ backgroundColor: designTokens.colors.accentLight }}
          >
            <div className="flex justify-between items-center">
              <span
                className="text-sm font-medium"
                style={{ color: designTokens.colors.textPrimary }}
              >
                總測試時間：
              </span>
              <span
                className="text-lg font-bold"
                style={{ color: designTokens.colors.accentSecondary }}
              >
                {getTotalTestTime()} 分鐘
              </span>
            </div>
          </div>

          <div className="space-y-4">
            {testRecords.map((record, index) => (
              <div
                key={record.id}
                className="border rounded-lg p-4"
                style={{ borderColor: designTokens.colors.border }}
              >
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-medium">記錄 #{index + 1}</h3>
                  {editPermissions.canEdit && testRecords.length > 1 && (
                    <button
                      onClick={() => removeTestRecord(record.id)}
                      className="text-red-500 hover:text-red-700 p-1"
                      disabled={submitting}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  {/* 年度測試頻率 */}
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      年度測試頻率 (次)
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={record.annualTestFrequency || ''}
                      onChange={(e) => updateTestRecord(record.id, 'annualTestFrequency', parseInt(e.target.value) || 0)}
                      className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:border-transparent transition-all"
                      style={{
                        color: designTokens.colors.textPrimary,
                        borderColor: designTokens.colors.border
                      }}
                      disabled={submitting || !editPermissions.canEdit}
                      placeholder="12"
                    />
                  </div>

                  {/* 測試時間 */}
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      測試時間 (分鐘)
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={record.testDuration || ''}
                      onChange={(e) => updateTestRecord(record.id, 'testDuration', parseInt(e.target.value) || 0)}
                      className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:border-transparent transition-all"
                      style={{
                        color: designTokens.colors.textPrimary,
                        borderColor: designTokens.colors.border
                      }}
                      disabled={submitting || !editPermissions.canEdit}
                      placeholder="30"
                    />
                  </div>

                  {/* 發電機位置 */}
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      發電機位置
                    </label>
                    <input
                      type="text"
                      value={record.generatorLocation}
                      onChange={(e) => updateTestRecord(record.id, 'generatorLocation', e.target.value)}
                      className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:border-transparent transition-all"
                      style={{
                        color: designTokens.colors.textPrimary,
                        borderColor: designTokens.colors.border
                      }}
                      disabled={submitting || !editPermissions.canEdit}
                      placeholder="例：1樓機房"
                    />
                  </div>

                  {/* 發電功率 */}
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      發電功率 (kW)
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.1"
                      value={record.powerRating || ''}
                      onChange={(e) => updateTestRecord(record.id, 'powerRating', parseFloat(e.target.value) || 0)}
                      className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:border-transparent transition-all"
                      style={{
                        color: designTokens.colors.textPrimary,
                        borderColor: designTokens.colors.border
                      }}
                      disabled={submitting || !editPermissions.canEdit}
                      placeholder="100.0"
                    />
                  </div>
                </div>

                {/* 測試佐證檔案 */}
                <div>
                  <label className="block text-sm font-medium mb-2">
                    測試佐證資料
                  </label>
                  <EvidenceUpload
                    pageKey={pageKey}
                    month={index + 1}
                    files={record.files}
                    onFilesChange={(files) => handleTestFilesChange(record.id, files)}
                    memoryFiles={record.memoryFiles || []}
                    onMemoryFilesChange={(files) => handleMemoryFilesChange(record.id, files)}
                    maxFiles={3}
                    disabled={submitting || !editPermissions.canUploadFiles}
                    kind="usage_evidence"
                    mode="edit"
                  />
                </div>
              </div>
            ))}
          </div>

          {/* 新增記錄按鈕 */}
          {editPermissions.canEdit && (
            <button
              onClick={addTestRecord}
              disabled={submitting}
              className="w-full py-3 bg-green-500 hover:bg-green-600 text-white rounded-lg font-medium transition-colors"
            >
              + 新增測試記錄
            </button>
          )}
        </div>

        {/* 底部空間 */}
        <div className="h-20"></div>
      </div>

      {/* 錯誤模態框 */}
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
                    操作失敗
                  </h3>
                  <p
                    className="text-sm"
                    style={{ color: designTokens.colors.textSecondary }}
                  >
                    {error}
                  </p>
                </div>
              </div>
              <div className="flex justify-end">
                <button
                  onClick={() => setError(null)}
                  className="px-4 py-2 text-white rounded-lg transition-colors font-medium"
                  style={{ backgroundColor: designTokens.colors.error }}
                >
                  確認
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 成功模態框 */}
      {showSuccessModal && success && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
          <div
            className="bg-white rounded-lg shadow-lg max-w-md w-full"
            style={{ borderRadius: designTokens.borderRadius.lg }}
          >
            <div className="p-6">
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

export default DieselGeneratorPage