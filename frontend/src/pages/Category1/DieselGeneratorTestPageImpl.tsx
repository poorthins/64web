import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { AlertCircle, CheckCircle, Loader2, X } from 'lucide-react'
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

// 柴油發電機測試資料結構
interface TestData {
  generatorLocation: string      // 發電機位置
  powerRating: number           // 發電功率 (kW)
  testFrequency: string         // 發動測試頻率
  testDuration: number          // 測試時間(分)
  annualTestTime: number        // 年總測試時間(分)
  nameplateFiles: EvidenceFile[] // 發電機銘牌檔案
  nameplateMemoryFiles?: MemoryFile[] // 記憶體暫存檔案
}

const DieselGeneratorTestPage = () => {
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
  const [testData, setTestData] = useState<TestData>({
    generatorLocation: '',
    powerRating: 0,
    testFrequency: '',
    testDuration: 0,
    annualTestTime: 0,
    nameplateFiles: [],
    nameplateMemoryFiles: []
  })

  const pageKey = 'diesel_generator'

  // 編輯權限控制
  const editPermissions = useEditPermissions(currentStatus)

  // 判斷是否有資料
  const hasAnyData = useMemo(() => {
    return testData.generatorLocation !== '' ||
           testData.powerRating > 0 ||
           testData.testFrequency !== '' ||
           testData.testDuration > 0 ||
           testData.annualTestTime > 0 ||
           testData.nameplateFiles.length > 0 ||
           (testData.nameplateMemoryFiles && testData.nameplateMemoryFiles.length > 0)
  }, [testData])

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
          if (existingEntry.extraPayload?.testData && existingEntry.extraPayload?.mode === 'test') {
            let loadedTestData = existingEntry.extraPayload.testData

            if (existingEntry.id) {
              try {
                const files = await getEntryFiles(existingEntry.id)
                const nameplateFiles = files.filter(f =>
                  f.file_type === 'annual_evidence' &&
                  f.page_key === pageKey
                )

                loadedTestData = {
                  ...loadedTestData,
                  nameplateFiles: nameplateFiles
                }
              } catch (fileError) {
                console.error('Failed to load files:', fileError)
              }
            }

            setTestData(loadedTestData)
            handleDataChanged()
          } else if (existingEntry.extraPayload?.mode === 'refuel') {
            // 如果是加油模式的資料，不載入到測試頁面
            console.warn('Found refuel mode data, skipping load in test mode page')
          }
        }

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

  const updateTestData = <K extends keyof TestData>(field: K, value: TestData[K]) => {
    setTestData(prev => ({ ...prev, [field]: value }))
  }

  const handleNameplateFilesChange = (files: EvidenceFile[]) => {
    updateTestData('nameplateFiles', files)
  }

  const handleNameplateMemoryFilesChange = (files: MemoryFile[]) => {
    console.log('📁 [DieselGeneratorTestPage] Nameplate memory files changed:', files.length)
    updateTestData('nameplateMemoryFiles', files)
  }

  const validateData = () => {
    const errors: string[] = []

    if (!testData.generatorLocation.trim()) {
      errors.push('請填寫發電機位置')
    }
    if (testData.powerRating <= 0) {
      errors.push('發電功率必須大於0')
    }
    if (!testData.testFrequency.trim()) {
      errors.push('請填寫發動測試頻率')
    }
    if (testData.testDuration <= 0) {
      errors.push('測試時間必須大於0分鐘')
    }
    if (testData.annualTestTime <= 0) {
      errors.push('年總測試時間必須大於0分鐘')
    }

    // 檢查發電機銘牌檔案
    const totalFiles = testData.nameplateFiles.length + (testData.nameplateMemoryFiles?.length || 0)
    if (totalFiles === 0) {
      errors.push('請上傳發電機銘牌佐證資料')
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
      console.log('🔍 ========== 柴油發電機測試提交診斷開始 ==========')
      console.log('🔍 [1] pageKey:', pageKey)

      // 獲取正確的 category 資訊
      const categoryInfo = getCategoryInfo(pageKey)
      console.log('🔍 [2] categoryInfo:', categoryInfo)

      // 計算年度總測試時間作為使用量
      const annualUsage = testData.annualTestTime

      console.log('🔍 [3] annualUsage:', annualUsage)

      const entryInput: UpsertEntryInput = {
        page_key: pageKey,
        period_year: year,
        unit: '分鐘',
        monthly: {
          // 將年度總測試時間平均分配到12個月（或者可以根據實際測試時間分配）
          '12': annualUsage
        },
        extraPayload: {
          mode: 'test',
          testData: {
            generatorLocation: testData.generatorLocation,
            powerRating: testData.powerRating,
            testFrequency: testData.testFrequency,
            testDuration: testData.testDuration,
            annualTestTime: testData.annualTestTime
          },
          notes: `柴油發電機測試記錄 - ${testData.generatorLocation}`
        }
      }

      console.log('🔍 [4] entryInput:', entryInput)

      const { entry_id } = await upsertEnergyEntry(entryInput, true)

      if (!currentEntryId) {
        setCurrentEntryId(entry_id)
      }

      // 上傳發電機銘牌記憶體檔案
      if (testData.nameplateMemoryFiles && testData.nameplateMemoryFiles.length > 0) {
        console.log(`📁 [DieselGeneratorTestPage] Uploading ${testData.nameplateMemoryFiles.length} nameplate files...`)
        for (const memoryFile of testData.nameplateMemoryFiles) {
          await uploadEvidenceWithEntry(memoryFile.file, {
            entryId: entry_id,
            pageKey: pageKey,
            year: year,
            category: 'annual_evidence'
          })
        }
      }

      await commitEvidence({
        entryId: entry_id,
        pageKey: pageKey
      })

      await handleSubmitSuccess()

      setSuccess(`發電機測試資料已提交成功\n年度總測試時間：${testData.annualTestTime} 分鐘`)
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
    console.log('Status change requested:', newStatus)
  }

  const handleClearAll = async () => {
    console.log('🗑️ [DieselGeneratorTestPage] ===== CLEAR BUTTON CLICKED =====')

    const clearSuccess = DocumentHandler.handleClear({
      currentStatus: currentStatus,
      title: '柴油發電機測試資料清除',
      message: '確定要清除所有柴油發電機測試資料嗎？此操作無法復原。',
      onClear: () => {
        setSubmitting(true)
        try {
          console.log('🗑️ [DieselGeneratorTestPage] Starting complete clear operation...')

          // 清理記憶體檔案
          if (testData.nameplateMemoryFiles) {
            DocumentHandler.clearAllMemoryFiles(testData.nameplateMemoryFiles)
          }

          // 清除所有測試資料
          setTestData({
            generatorLocation: '',
            powerRating: 0,
            testFrequency: '',
            testDuration: 0,
            annualTestTime: 0,
            nameplateFiles: [],
            nameplateMemoryFiles: []
          })

          setHasSubmittedBefore(false)
          setError(null)
          setSuccess(null)
          setShowClearConfirmModal(false)

          setToast({
            message: '資料已清除',
            type: 'success'
          })

        } catch (error) {
          console.error('❌ [DieselGeneratorTestPage] Clear operation failed:', error)
          setError('清除操作失敗，請重試')
        } finally {
          console.log('🗑️ [DieselGeneratorTestPage] Clear operation finished, resetting loading state')
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
            請填寫發電機測試資料並上傳發電機銘牌佐證文件
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

        {/* 測試資料表單 */}
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
              發電機測試資料
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* 發電機位置 */}
            <div>
              <label className="block text-sm font-medium mb-2">
                發電機位置
              </label>
              <input
                type="text"
                value={testData.generatorLocation}
                onChange={(e) => updateTestData('generatorLocation', e.target.value)}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:border-transparent transition-all"
                style={{
                  color: designTokens.colors.textPrimary,
                  borderColor: designTokens.colors.border
                }}
                disabled={submitting || !editPermissions.canEdit}
                placeholder="例：1樓機房、地下室等"
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
                value={testData.powerRating || ''}
                onChange={(e) => updateTestData('powerRating', parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:border-transparent transition-all"
                style={{
                  color: designTokens.colors.textPrimary,
                  borderColor: designTokens.colors.border
                }}
                disabled={submitting || !editPermissions.canEdit}
                placeholder="0.0"
              />
            </div>

            {/* 發動測試頻率 */}
            <div>
              <label className="block text-sm font-medium mb-2">
                發動測試頻率
              </label>
              <select
                value={testData.testFrequency}
                onChange={(e) => updateTestData('testFrequency', e.target.value)}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:border-transparent transition-all"
                style={{
                  color: designTokens.colors.textPrimary,
                  borderColor: designTokens.colors.border
                }}
                disabled={submitting || !editPermissions.canEdit}
              >
                <option value="">請選擇測試頻率</option>
                <option value="每週">每週</option>
                <option value="每月">每月</option>
                <option value="每季">每季</option>
                <option value="半年">半年</option>
                <option value="每年">每年</option>
                <option value="其他">其他</option>
              </select>
            </div>

            {/* 測試時間(分) */}
            <div>
              <label className="block text-sm font-medium mb-2">
                測試時間 (分鐘)
              </label>
              <input
                type="number"
                min="0"
                value={testData.testDuration || ''}
                onChange={(e) => updateTestData('testDuration', parseInt(e.target.value) || 0)}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:border-transparent transition-all"
                style={{
                  color: designTokens.colors.textPrimary,
                  borderColor: designTokens.colors.border
                }}
                disabled={submitting || !editPermissions.canEdit}
                placeholder="例：30"
              />
            </div>

            {/* 年總測試時間(分) */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium mb-2">
                年總測試時間 (分鐘)
              </label>
              <input
                type="number"
                min="0"
                value={testData.annualTestTime || ''}
                onChange={(e) => updateTestData('annualTestTime', parseInt(e.target.value) || 0)}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:border-transparent transition-all"
                style={{
                  color: designTokens.colors.textPrimary,
                  borderColor: designTokens.colors.border
                }}
                disabled={submitting || !editPermissions.canEdit}
                placeholder="例：1440 (每月30分鐘 × 12個月 = 360分鐘 × 4次 = 1440分鐘)"
              />
            </div>
          </div>

          {/* 發電機銘牌上傳 */}
          <div className="mt-6">
            <label className="block text-sm font-medium mb-2">
              發電機銘牌佐證資料
            </label>
            <EvidenceUpload
              pageKey={pageKey}
              month={1}
              files={testData.nameplateFiles}
              onFilesChange={handleNameplateFilesChange}
              memoryFiles={testData.nameplateMemoryFiles || []}
              onMemoryFilesChange={handleNameplateMemoryFilesChange}
              maxFiles={5}
              disabled={submitting || !editPermissions.canUploadFiles}
              kind="annual_evidence"
              mode="edit"
            />
            <p className="text-xs text-gray-500 mt-1">
              請上傳發電機銘牌照片或相關技術規格文件
            </p>
          </div>
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

export default DieselGeneratorTestPage