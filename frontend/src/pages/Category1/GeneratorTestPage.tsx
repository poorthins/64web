import { useState, useEffect } from 'react';
import { EntryStatus } from '../../components/StatusSwitcher';
import ConfirmClearModal from '../../components/ConfirmClearModal'
import SharedPageLayout from '../../layouts/SharedPageLayout'
import { useFrontendStatus } from '../../hooks/useFrontendStatus';
import { useApprovalStatus } from '../../hooks/useApprovalStatus';
import { useReviewMode } from '../../hooks/useReviewMode'
import { useEnergyData } from '../../hooks/useEnergyData'
import { useEnergyClear } from '../../hooks/useEnergyClear'
import { useRole } from '../../hooks/useRole'
import { useAdminSave } from '../../hooks/useAdminSave'
import type { AdminSaveParams } from '../../hooks/useAdminSave'
import { EvidenceFile, getFileUrl, adminDeleteEvidence } from '../../api/files';
import { submitEnergyEntry } from '../../api/v2/entryAPI';
import { uploadEvidenceFile, deleteEvidenceFile } from '../../api/v2/fileAPI';
import { generateRecordId } from '../../utils/idGenerator';
import { LAYOUT_CONSTANTS } from './shared/mobile/mobileEnergyConstants'
import { GENERATOR_TEST_CONFIG } from './shared/mobileEnergyConfig'
import { ImageLightbox } from './shared/mobile/components/ImageLightbox'
import { GeneratorTestInputFields } from './components/GeneratorTestInputFields'
import { GeneratorTestListSection } from './components/GeneratorTestListSection'
import type { MemoryFile } from '../../components/FileDropzone';

// 發電機測試資料結構
export interface GeneratorTest {
  id: string
  location: string
  generatorPower: number
  testFrequency: number
  testDuration: number
  memoryFiles: MemoryFile[]
  evidenceFiles?: EvidenceFile[]
}

const createEmptyTest = (): GeneratorTest => ({
  id: generateRecordId(),
  location: '',
  generatorPower: 0,
  testFrequency: 0,
  testDuration: 0,
  memoryFiles: []
})

export default function GeneratorTestPage() {
  // 審核模式檢測
  const { isReviewMode, reviewEntryId, reviewUserId } = useReviewMode()

  const pageKey = GENERATOR_TEST_CONFIG.pageKey
  const [year] = useState(new Date().getFullYear())
  const [initialStatus, setInitialStatus] = useState<EntryStatus>('submitted')
  const [currentEntryId, setCurrentEntryId] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [showClearConfirmModal, setShowClearConfirmModal] = useState(false)

  // 圖片放大 lightbox
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);

  // 測試管理狀態
  const [savedTests, setSavedTests] = useState<GeneratorTest[]>([])
  const [currentEditingTest, setCurrentEditingTest] = useState<GeneratorTest>(createEmptyTest())
  const [editingTestId, setEditingTestId] = useState<string | null>(null)

  // 更新當前編輯測試的欄位
  const updateCurrentTest = (field: keyof GeneratorTest, value: any) => {
    setCurrentEditingTest(prev => ({ ...prev, [field]: value }))
  }

  const frontendStatus = useFrontendStatus({
    initialStatus,
    entryId: currentEntryId
  })

  const { currentStatus, setCurrentStatus, handleSubmitSuccess, handleDataChanged, isInitialLoad } = frontendStatus

  // 角色檢查
  const { role } = useRole()

  // 審核狀態 Hook
  const { reload: reloadApprovalStatus, ...approvalStatus } = useApprovalStatus(pageKey, year)

  // 審核通過後鎖定（Bug #6 預防）
  const isReadOnly = approvalStatus.isApproved || (isReviewMode && role !== 'admin')

  // 管理員儲存 Hook
  const { save: adminSave } = useAdminSave(pageKey, reviewEntryId)

  // 資料載入 Hook
  const entryIdToLoad = isReviewMode && reviewEntryId ? reviewEntryId : undefined
  const {
    entry: loadedEntry,
    files: loadedFiles,
    loading: dataLoading,
    reload
  } = useEnergyData(pageKey, year, entryIdToLoad)

  // 清除 Hook
  const {
    clear,
    clearing: clearLoading
  } = useEnergyClear(currentEntryId, currentStatus)

  // 通知狀態
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null)

  // 縮圖管理
  const [thumbnails, setThumbnails] = useState<Record<string, string>>({})

  // ===== 資料載入 =====
  useEffect(() => {
    if (loadedEntry && !dataLoading) {
      const entryStatus = loadedEntry.status as EntryStatus
      setInitialStatus(entryStatus)
      setCurrentStatus(entryStatus)
      setCurrentEntryId(loadedEntry.id)

      // 從 payload 取得發電機測試資料
      if (loadedEntry.payload?.generatorTestData) {
        const updated = loadedEntry.payload.generatorTestData.map((item: any) => ({
          ...item,
          id: String(item.id),
          evidenceFiles: [],
          memoryFiles: []
        }))

        setSavedTests(updated)
      }

      if (!isInitialLoad.current) {
        handleDataChanged()
      }
      isInitialLoad.current = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadedEntry, dataLoading])

  // 檔案載入後分配到測試（reload 後清空 memoryFiles，用資料庫檔案）
  useEffect(() => {
    if (dataLoading) return

    if (loadedFiles.length > 0 && savedTests.length > 0) {
      const testFiles = loadedFiles.filter(f =>
        f.file_type === 'other' && f.page_key === pageKey
      )

      if (testFiles.length > 0) {
        setSavedTests(prev => prev.map(test => {
          const recordFiles = testFiles.filter(f => f.record_id === test.id)

          return {
            ...test,
            // reload 後清空 memoryFiles（跟 SF6Page 一樣）
            memoryFiles: [],
            // 直接用資料庫檔案
            evidenceFiles: recordFiles
          }
        }))
      }
    }
  }, [loadedFiles, pageKey, dataLoading, savedTests.length])

  // 生成縮圖（只為圖片檔案）
  useEffect(() => {
    savedTests.forEach(async (test) => {
      const evidenceFile = test.evidenceFiles?.[0]
      if (evidenceFile && evidenceFile.mime_type.startsWith('image/') && !thumbnails[evidenceFile.id]) {
        try {
          const url = await getFileUrl(evidenceFile.file_path)
          setThumbnails(prev => ({
            ...prev,
            [evidenceFile.id]: url
          }))
        } catch (error) {
          console.warn('Failed to generate thumbnail', error)
        }
      }
    })
  }, [savedTests])

  // ===== CRUD 函數 =====

  // 保存當前測試
  const saveCurrentTest = () => {
    const test = currentEditingTest

    // 驗證：至少要有一個欄位有值
    const hasValidData =
      test.location.trim() !== '' ||
      test.generatorPower > 0 ||
      test.testFrequency > 0 ||
      test.testDuration > 0

    if (!hasValidData) {
      throw new Error('請至少填寫一個欄位')
    }

    const isEditMode = editingTestId !== null

    if (isEditMode) {
      // 編輯模式：更新測試
      setSavedTests(prev => prev.map(t =>
        t.id === editingTestId ? test : t
      ))
    } else {
      // 新增模式：加入測試
      setSavedTests(prev => [...prev, test])
    }

    // 清空編輯區
    setEditingTestId(null)
    setCurrentEditingTest(createEmptyTest())

    return isEditMode ? '測試已更新' : '測試已新增'
  }

  // 載入測試到編輯區
  const editTest = (id: string) => {
    const test = savedTests.find(t => t.id === id)
    if (!test) return

    setCurrentEditingTest(test)
    setEditingTestId(id)
    return '測試已載入到編輯區'
  }

  // 刪除測試
  const deleteTest = (id: string) => {
    setSavedTests(prev => prev.filter(t => t.id !== id))
    return '測試已刪除'
  }

  // ===== 統一提交函數 =====

  // 準備乾淨的測試資料（移除前端專用欄位）
  const prepareCleanedTestData = () => {
    return savedTests.map(t => ({
      id: t.id,
      location: t.location,
      generatorPower: t.generatorPower,
      testFrequency: t.testFrequency,
      testDuration: t.testDuration
    }))
  }

  // 處理測試檔案上傳（刪除舊檔 + 上傳新檔）
  const handleTestFilesUpload = async (entryId: string) => {
    for (const test of savedTests) {
      const newFiles = test.memoryFiles.filter(f => f.file && f.file.size > 0)

      if (newFiles.length > 0) {
        // 先刪除舊佐證
        const oldFiles = loadedFiles.filter(f =>
          f.record_id === test.id && f.file_type === 'other' && f.page_key === pageKey
        )

        if (oldFiles.length > 0) {
          for (const oldFile of oldFiles) {
            try {
              await deleteEvidenceFile(oldFile.id)
            } catch (error) {
              console.warn('Failed to delete old file:', error)
              // 繼續執行，不阻斷上傳新檔案
            }
          }
        }

        // 上傳新佐證
        const file = newFiles[0].file
        await uploadEvidenceFile(file, {
          page_key: pageKey,
          period_year: year,
          file_type: 'other',
          entry_id: entryId,
          record_id: test.id
        })
      }
    }
  }

  const submitData = async (isDraft: boolean) => {
    try {
      setSubmitting(true)
      setSubmitError(null)
      setSubmitSuccess(null)

      // 1. 準備資料
      const payload = {
        generatorTestData: prepareCleanedTestData()
      }

      // 2. 提交 entry
      const { entry_id } = await submitEnergyEntry({
        page_key: pageKey,
        period_year: year,
        status: isDraft ? 'saved' : 'submitted',
        unit: '次',
        monthly: { '1': savedTests.length },
        payload
      })

      // 3. 上傳檔案
      await handleTestFilesUpload(entry_id)

      // 4. 完成
      setCurrentEntryId(entry_id)
      await reload()

      // 清空 memoryFiles（讓 useEffect 載入資料庫的新檔案）
      setSavedTests(prev => prev.map(test => ({
        ...test,
        memoryFiles: []
      })))

      // Bug #8 預防：只在提交時觸發
      if (!isDraft) {
        await handleSubmitSuccess()
      }

      await reloadApprovalStatus()

      setSubmitSuccess(isDraft ? '暫存成功' : '提交成功')

    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : '操作失敗')
    } finally {
      setSubmitting(false)
    }
  }

  const handleSubmit = () => submitData(false)

  // 收集管理員儲存所需的檔案（上傳和刪除清單）
  const collectFilesForAdminSave = () => {
    const filesToUpload: AdminSaveParams['files'] = []
    const filesToDelete: string[] = []

    savedTests.forEach((test, index) => {
      // 只上傳新檔案（file.size > 0 的才是真的新檔案）
      if (test.memoryFiles && test.memoryFiles.length > 0) {
        const newFiles = test.memoryFiles.filter((mf: MemoryFile) => mf.file && mf.file.size > 0)

        if (newFiles.length > 0) {
          newFiles.forEach((mf: MemoryFile) => {
            filesToUpload.push({
              file: mf.file,
              metadata: {
                recordIndex: index,
                fileType: 'other',
                recordId: test.id
              }
            })
          })

          // 刪除舊的佐證檔案
          const oldFiles = loadedFiles.filter(f =>
            f.record_id === test.id && f.file_type === 'other' && f.page_key === pageKey
          )
          oldFiles.forEach(f => filesToDelete.push(f.id))
        }
      }
    })

    return { filesToUpload, filesToDelete }
  }

  // 刪除舊檔案
  const deleteOldFiles = async (fileIds: string[]) => {
    if (fileIds.length > 0) {
      for (const fileId of fileIds) {
        try {
          await adminDeleteEvidence(fileId)
        } catch {
          // Continue on error
        }
      }
    }
  }

  const handleSave = async () => {
    // 管理員審核模式
    if (isReviewMode && reviewEntryId) {
      setSubmitting(true)
      try {
        // 1. 準備資料
        const payload = {
          generatorTestData: prepareCleanedTestData()
        }

        // 2. 收集檔案
        const { filesToUpload, filesToDelete } = collectFilesForAdminSave()

        // 3. 刪除舊檔案
        await deleteOldFiles(filesToDelete)

        // 4. 用 adminSave 更新資料和上傳新檔案
        await adminSave({
          updateData: {
            unit: '次',
            amount: savedTests.length,
            payload
          },
          files: filesToUpload
        })

        // 6. reload 和通知
        await reload()
        reloadApprovalStatus()
        setSubmitSuccess('管理員儲存成功')
      } finally {
        setSubmitting(false)
      }
      return
    }

    // 一般暫存
    try {
      await submitData(true)
    } catch (error) {
      console.error('❌ 暫存失敗:', error)
      setSubmitError(error instanceof Error ? error.message : '暫存失敗')
    }
  }

  const handleClear = () => {
    setShowClearConfirmModal(true);
  };

  const handleClearConfirm = async () => {
    try {
      // 收集所有檔案
      const allFiles = savedTests.flatMap(t => t.evidenceFiles || [])
      const allMemoryFiles = [
        currentEditingTest.memoryFiles,
        ...savedTests.map(t => t.memoryFiles || [])
      ]

      await clear({
        filesToDelete: allFiles,
        memoryFilesToClean: allMemoryFiles
      })

      // 重置狀態
      setSavedTests([])
      setCurrentEditingTest(createEmptyTest())
      setEditingTestId(null)
      setCurrentEntryId(null)
      setShowClearConfirmModal(false)

      await reload()
      await reloadApprovalStatus()

      setSubmitSuccess('資料已完全清除')
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : '清除失敗')
    }
  };

  return (
    <>
      {/* 隱藏瀏覽器原生日曆圖示和數字輸入框的上下箭頭 */}
      <style>{`
        input[type="date"]::-webkit-calendar-picker-indicator {
          display: none;
          -webkit-appearance: none;
        }
        input[type="date"]::-webkit-inner-spin-button,
        input[type="date"]::-webkit-outer-spin-button {
          -webkit-appearance: none;
          margin: 0;
        }
        input[type="number"]::-webkit-inner-spin-button,
        input[type="number"]::-webkit-outer-spin-button {
          -webkit-appearance: none;
          margin: 0;
        }
        input[type="number"] {
          -moz-appearance: textfield;
        }
      `}</style>

      <SharedPageLayout
        pageHeader={{
          category: GENERATOR_TEST_CONFIG.category,
          title: GENERATOR_TEST_CONFIG.title,
          subtitle: GENERATOR_TEST_CONFIG.subtitle,
          iconColor: GENERATOR_TEST_CONFIG.iconColor,
          categoryPosition: GENERATOR_TEST_CONFIG.categoryPosition
        }}
        statusBanner={{
          approvalStatus,
          isReviewMode,
          accentColor: GENERATOR_TEST_CONFIG.iconColor
        }}
        instructionText={GENERATOR_TEST_CONFIG.instructionText}
      bottomActionBar={{
        currentStatus,
        submitting,
        onSubmit: handleSubmit,
        onSave: handleSave,
        onClear: handleClear,
        show: !isReadOnly && !approvalStatus.isApproved && !isReviewMode,
        accentColor: GENERATOR_TEST_CONFIG.iconColor,
        customNotifications: true  // Bug #7 預防
      }}
      reviewSection={{
        isReviewMode,
        reviewEntryId,
        reviewUserId,
        currentEntryId,
        pageKey,
        year,
        category: GENERATOR_TEST_CONFIG.title,
        amount: savedTests.length,
        unit: GENERATOR_TEST_CONFIG.unit,
        role,
        onSave: handleSave,
        isSaving: submitting
      }}
      notificationState={{
        success: submitSuccess,
        error: submitError,
        clearSuccess: () => setSubmitSuccess(null),
        clearError: () => setSubmitError(null)
      }}
    >
      {/* 輸入區 */}
      <GeneratorTestInputFields
        test={currentEditingTest}
        onFieldChange={updateCurrentTest}
        onSave={saveCurrentTest}
        editingTestId={editingTestId}
        isReadOnly={isReadOnly}
        thumbnails={thumbnails}
        onImageClick={setLightboxSrc}
      />

      {/* 列表區 */}
      <GeneratorTestListSection
        tests={savedTests}
        thumbnails={thumbnails}
        onEdit={editTest}
        onDelete={deleteTest}
        onImageClick={setLightboxSrc}
        isReadOnly={isReadOnly}
      />

      {/* 清除確認模態框 */}
      <ConfirmClearModal
        show={showClearConfirmModal}
        onConfirm={handleClearConfirm}
        onCancel={() => setShowClearConfirmModal(false)}
        isClearing={clearLoading}
      />

      {/* Lightbox：點圖放大 */}
      <ImageLightbox
        src={lightboxSrc}
        zIndex={LAYOUT_CONSTANTS.MODAL_Z_INDEX}
        onClose={() => setLightboxSrc(null)}
      />
    </SharedPageLayout>
    </>
  );
}