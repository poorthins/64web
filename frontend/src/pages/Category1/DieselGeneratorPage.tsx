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

// 柴油發電機加油記錄資料結構
interface RefuelRecord {
  id: string
  refuelDate: string      // 加油日期 YYYY-MM-DD
  refuelVolume: number    // 加油量(公升)
  files: EvidenceFile[]   // 佐證檔案
  memoryFiles?: MemoryFile[]  // 記憶體暫存檔案
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
  const [refuelRecords, setRefuelRecords] = useState<RefuelRecord[]>([
    {
      id: crypto.randomUUID(),
      refuelDate: '',
      refuelVolume: 0,
      files: [],
      memoryFiles: []
    }
  ])

  const pageKey = 'diesel_generator'

  // 編輯權限控制
  const editPermissions = useEditPermissions(currentStatus)

  // 判斷是否有資料
  const hasAnyData = useMemo(() => {
    const hasRefuelRecords = refuelRecords.some(r => r.refuelDate !== '' || r.refuelVolume > 0 || r.files.length > 0 || (r.memoryFiles && r.memoryFiles.length > 0))
    return hasRefuelRecords
  }, [refuelRecords])

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
          if (existingEntry.extraPayload?.refuelRecords) {
            // 載入相關檔案
            let updatedRecords = existingEntry.extraPayload.refuelRecords

            if (existingEntry.id) {
              try {
                const files = await getEntryFiles(existingEntry.id)

                // 更新加油記錄中的檔案
                updatedRecords = existingEntry.extraPayload.refuelRecords.map((record: any) => {
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

            setRefuelRecords(updatedRecords)
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

  const addRefuelRecord = () => {
    setRefuelRecords(prev => [...prev, {
      id: crypto.randomUUID(),
      refuelDate: '',
      refuelVolume: 0,
      files: [],
      memoryFiles: []
    }])
  }

  const removeRefuelRecord = (id: string) => {
    if (refuelRecords.length > 1) {
      setRefuelRecords(prev => prev.filter(record => record.id !== id))
    }
  }

  const updateRefuelRecord = (id: string, field: keyof RefuelRecord, value: any) => {
    setRefuelRecords(prev => prev.map(record =>
      record.id === id ? { ...record, [field]: value } : record
    ))
  }

  const handleRefuelFilesChange = (recordId: string, files: EvidenceFile[]) => {
    updateRefuelRecord(recordId, 'files', files)
  }

  const handleMemoryFilesChange = (recordId: string, files: MemoryFile[]) => {
    console.log('📁 [DieselGeneratorPage] Memory files changed for record:', recordId, files.length)
    updateRefuelRecord(recordId, 'memoryFiles', files)
  }

  const getTotalVolume = () => {
    return refuelRecords.reduce((sum, record) => sum + (record.refuelVolume || 0), 0)
  }

  const validateData = () => {
    const errors: string[] = []

    refuelRecords.forEach((record, index) => {
      if (!record.refuelDate) {
        errors.push(`第${index + 1}筆記錄未填入加油日期`)
      }
      if (record.refuelVolume <= 0) {
        errors.push(`第${index + 1}筆記錄加油量必須大於0`)
      }

      // 檢查已上傳檔案 OR 記憶體檔案
      const totalFiles = record.files.length + (record.memoryFiles?.length || 0)
      if (totalFiles === 0) {
        errors.push(`第${index + 1}筆記錄未上傳加油單據`)
      }
    })

    // 檢查日期重複
    const dates = refuelRecords.map(record => record.refuelDate).filter(date => date)
    const duplicates = dates.filter((date, index) => dates.indexOf(date) !== index)
    if (duplicates.length > 0) {
      errors.push(`有重複的加油日期：${duplicates.join(', ')}`)
    }

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

      // 將日期記錄轉換為月份資料格式
      const monthly: Record<string, number> = {}

      refuelRecords.forEach(record => {
        if (record.refuelDate && record.refuelVolume > 0) {
          const month = new Date(record.refuelDate).getMonth() + 1
          monthly[month.toString()] = (monthly[month.toString()] || 0) + record.refuelVolume
        }
      })

      console.log('🔍 [3] monthly:', monthly)

      const entryInput: UpsertEntryInput = {
        page_key: pageKey,
        period_year: year,
        unit: categoryInfo.unit,
        monthly: monthly,
        extraPayload: {
          refuelRecords: refuelRecords.map(record => ({
            id: record.id,
            refuelDate: record.refuelDate,
            refuelVolume: record.refuelVolume
          })),
          totalVolume: getTotalVolume(),
          notes: `柴油發電機加油記錄，共${refuelRecords.length}筆記錄`
        }
      }

      console.log('🔍 [4] entryInput:', entryInput)

      const { entry_id } = await upsertEnergyEntry(entryInput, true)

      if (!currentEntryId) {
        setCurrentEntryId(entry_id)
      }

      // 上傳加油記錄記憶體檔案
      for (const record of refuelRecords) {
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

      const totalVolume = getTotalVolume()
      setSuccess(`年度總加油量：${totalVolume.toFixed(2)} 公升`)
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

  const handleClearAll = () => {
    setRefuelRecords([{
      id: crypto.randomUUID(),
      refuelDate: '',
      refuelVolume: 0,
      files: [],
      memoryFiles: []
    }])
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
    <div className="min-h-screen bg-green-50">
      <div className="max-w-4xl mx-auto px-6 py-8 space-y-6">

        {/* 頁面標題 */}
        <div className="text-center mb-8">
          <h1
            className="text-3xl font-semibold mb-3"
            style={{ color: designTokens.colors.textPrimary }}
          >
            柴油發電機加油記錄
          </h1>
          <p
            className="text-base"
            style={{ color: designTokens.colors.textSecondary }}
          >
            請記錄發電機加油日期、加油量並上傳加油單據
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

        {/* 加油記錄區塊 */}
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
              加油記錄
            </h2>
          </div>

          {/* 總加油量統計 */}
          <div
            className="mb-6 p-4 rounded-lg"
            style={{ backgroundColor: designTokens.colors.accentLight }}
          >
            <div className="flex justify-between items-center">
              <span
                className="text-sm font-medium"
                style={{ color: designTokens.colors.textPrimary }}
              >
                總加油量：
              </span>
              <span
                className="text-lg font-bold"
                style={{ color: designTokens.colors.accentSecondary }}
              >
                {getTotalVolume().toFixed(2)} 公升
              </span>
            </div>
          </div>

          <div className="space-y-4">
            {refuelRecords.map((record, index) => (
              <div
                key={record.id}
                className="border rounded-lg p-4"
                style={{ borderColor: designTokens.colors.border }}
              >
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-medium">記錄 #{index + 1}</h3>
                  {editPermissions.canEdit && refuelRecords.length > 1 && (
                    <button
                      onClick={() => removeRefuelRecord(record.id)}
                      className="text-red-500 hover:text-red-700 p-1"
                      disabled={submitting}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  {/* 加油日期 */}
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      加油日期
                    </label>
                    <input
                      type="date"
                      value={record.refuelDate}
                      onChange={(e) => updateRefuelRecord(record.id, 'refuelDate', e.target.value)}
                      className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:border-transparent transition-all"
                      style={{
                        color: designTokens.colors.textPrimary,
                        borderColor: designTokens.colors.border
                      }}
                      disabled={submitting || !editPermissions.canEdit}
                    />
                  </div>

                  {/* 加油量 */}
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      加油量 (公升)
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.1"
                      value={record.refuelVolume || ''}
                      onChange={(e) => updateRefuelRecord(record.id, 'refuelVolume', parseFloat(e.target.value) || 0)}
                      className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:border-transparent transition-all"
                      style={{
                        color: designTokens.colors.textPrimary,
                        borderColor: designTokens.colors.border
                      }}
                      disabled={submitting || !editPermissions.canEdit}
                      placeholder="0.0"
                    />
                  </div>
                </div>

                {/* 加油單據檔案 */}
                <div>
                  <label className="block text-sm font-medium mb-2">
                    加油單據
                  </label>
                  <EvidenceUpload
                    pageKey={pageKey}
                    month={index + 1}
                    files={record.files}
                    onFilesChange={(files) => handleRefuelFilesChange(record.id, files)}
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
              onClick={addRefuelRecord}
              disabled={submitting}
              className="w-full py-3 bg-green-500 hover:bg-green-600 text-white rounded-lg font-medium transition-colors"
            >
              + 新增記錄
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