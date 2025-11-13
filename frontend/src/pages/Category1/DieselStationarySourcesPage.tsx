import { useState, useEffect, useMemo } from 'react';
import { EntryStatus } from '../../components/StatusSwitcher';
import ConfirmClearModal from '../../components/ConfirmClearModal'
import SuccessModal from '../../components/SuccessModal'
import SharedPageLayout from '../../layouts/SharedPageLayout'
import { useEditPermissions } from '../../hooks/useEditPermissions';
import { useFrontendStatus } from '../../hooks/useFrontendStatus';
import { useApprovalStatus } from '../../hooks/useApprovalStatus';
import { useReviewMode } from '../../hooks/useReviewMode'
import { useEnergyData } from '../../hooks/useEnergyData'
import { useMultiRecordSubmit } from '../../hooks/useMultiRecordSubmit'
import { useEnergyClear } from '../../hooks/useEnergyClear'
import { useSubmitGuard } from '../../hooks/useSubmitGuard'
import { useGhostFileCleaner } from '../../hooks/useGhostFileCleaner'
import { useRecordFileMapping } from '../../hooks/useRecordFileMapping'
import { useSubmissions } from '../admin/hooks/useSubmissions'
import { useRole } from '../../hooks/useRole'
import { useAdminSave } from '../../hooks/useAdminSave'
import { EvidenceFile, getFileUrl } from '../../api/files';
import Toast from '../../components/Toast';
import { generateRecordId } from '../../utils/idGenerator';
import { MobileEnergyRecord as DieselGeneratorRecord, CurrentEditingGroup, EvidenceGroup } from './shared/mobile/mobileEnergyTypes'
import { LAYOUT_CONSTANTS } from './shared/mobile/mobileEnergyConstants'
import { createEmptyRecords, prepareSubmissionData } from './shared/mobile/mobileEnergyUtils'
import { DIESEL_GENERATOR_CONFIG } from './shared/mobileEnergyConfig'
import { MobileEnergyUsageSection } from './shared/mobile/components/MobileEnergyUsageSection'
import { MobileEnergyGroupListSection } from './shared/mobile/components/MobileEnergyGroupListSection'
import { ImageLightbox } from './shared/mobile/components/ImageLightbox'
import type { MemoryFile } from '../../services/documentHandler';


export default function DieselStationarySourcesPage() {
  // 審核模式檢測
  const { isReviewMode, reviewEntryId, reviewUserId } = useReviewMode()

  const pageKey = DIESEL_GENERATOR_CONFIG.pageKey
  const [year] = useState(new Date().getFullYear())
  const [initialStatus, setInitialStatus] = useState<EntryStatus>('submitted')
  const [currentEntryId, setCurrentEntryId] = useState<string | null>(null)
  const { executeSubmit, submitting } = useSubmitGuard()
  const [showSuccessModal, setShowSuccessModal] = useState(false)
  const [successModalType, setSuccessModalType] = useState<'save' | 'submit'>('submit')
  const [showClearConfirmModal, setShowClearConfirmModal] = useState(false)

  // 柴油發電機專用：設備類型
  const [deviceType, setDeviceType] = useState<string>('')
  const [customDeviceType, setCustomDeviceType] = useState<string>('')

  // 圖片放大 lightbox
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [thumbnails, setThumbnails] = useState<{ [key: string]: string }>({});

  // 前端狀態管理 Hook
  const frontendStatus = useFrontendStatus({
    initialStatus,
    entryId: currentEntryId,
    onStatusChange: () => {},
    onError: (error) => setError(error),
    onSuccess: (message) => setSuccess(message)
  })

  const { currentStatus, setCurrentStatus, handleSubmitSuccess, handleDataChanged, isInitialLoad } = frontendStatus

  // 角色檢查
  const { role } = useRole()

  // 審核模式下只有管理員可編輯
  const isReadOnly = isReviewMode && role !== 'admin'

  const editPermissions = useEditPermissions(currentStatus, isReadOnly, role ?? undefined)

  // 資料載入 Hook
  const entryIdToLoad = isReviewMode && reviewEntryId ? reviewEntryId : undefined
  const {
    entry: loadedEntry,
    files: loadedFiles,
    loading: dataLoading,
    error: dataError,
    reload
  } = useEnergyData(pageKey, year, entryIdToLoad)

  // 審核狀態 Hook
  const { reload: reloadApprovalStatus, ...approvalStatus } = useApprovalStatus(pageKey, year)

  // 審核 API hook
  const { reviewSubmission } = useSubmissions()

  // 管理員儲存 Hook
  const { save: adminSave, saving: adminSaving } = useAdminSave(pageKey, reviewEntryId)

  // 提交 Hook（多記錄專用）
  const {
    submit,
    save,
    submitting: submitLoading,
    error: submitError,
    success: submitSuccess,
    clearError: clearSubmitError,
    clearSuccess: clearSubmitSuccess
  } = useMultiRecordSubmit(pageKey, year)

  // 清除 Hook
  const {
    clear,
    clearing: clearLoading,
    error: clearError,
    clearError: clearClearError
  } = useEnergyClear(currentEntryId, currentStatus)

  // 幽靈檔案清理 Hook
  const { cleanFiles } = useGhostFileCleaner()

  // 檔案映射 Hook
  const {
    uploadRecordFiles,
    getRecordFiles,
    loadFileMapping,
    getFileMappingForPayload,
    removeRecordMapping
  } = useRecordFileMapping(pageKey, currentEntryId)

  // 分離「當前編輯」和「已保存群組」
  const [currentEditingGroup, setCurrentEditingGroup] = useState<{
    groupId: string | null
    records: DieselGeneratorRecord[]
    memoryFiles: MemoryFile[]
  }>({
    groupId: null,
    records: createEmptyRecords(),
    memoryFiles: []
  })

  // 已保存的群組
  const [savedGroups, setSavedGroups] = useState<DieselGeneratorRecord[]>([])

  // 提交時用的資料
  const dieselGeneratorData = useMemo(() => {
    return savedGroups
  }, [savedGroups])

  // 載入記錄資料
  useEffect(() => {
    if (loadedEntry && !dataLoading) {
      const entryStatus = loadedEntry.status as EntryStatus
      setInitialStatus(entryStatus)
      setCurrentEntryId(loadedEntry.id)
      setCurrentStatus(entryStatus)

      // 從 payload 取得能源使用資料
      const dataFieldName = DIESEL_GENERATOR_CONFIG.dataFieldName
      if (loadedEntry.payload?.[dataFieldName]) {
        const dataArray = Array.isArray(loadedEntry.payload[dataFieldName])
          ? loadedEntry.payload[dataFieldName]
          : []

        if (dataArray.length > 0) {
          const updated = dataArray.map((item: any) => ({
            ...item,
            id: String(item.id || generateRecordId()),
            evidenceFiles: [],
            memoryFiles: [],
          }))

          setSavedGroups(updated)

          // 載入檔案映射表
          const payload = loadedEntry.payload || loadedEntry.extraPayload
          if (payload) {
            loadFileMapping(payload)
          }
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadedEntry, dataLoading])

  // 檔案載入後分配到記錄
  useEffect(() => {
    if (dataLoading) return

    if (loadedFiles.length > 0 && savedGroups.length > 0) {
      const dieselGeneratorFiles = loadedFiles.filter(f =>
        f.file_type === 'other' && f.page_key === pageKey
      )

      if (dieselGeneratorFiles.length > 0) {
        const cleanAndAssignFiles = async () => {
          const validFiles = await cleanFiles(dieselGeneratorFiles)

          setSavedGroups(prev => {
            return prev.map((item) => {
              const filesForThisRecord = getRecordFiles(item.id, validFiles)
              return {
                ...item,
                evidenceFiles: filesForThisRecord,
                memoryFiles: []
              }
            })
          })
        }

        cleanAndAssignFiles()
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadedFiles, dataLoading])

  // 生成縮圖
  useEffect(() => {
    const generateThumbnails = async () => {
      const newThumbnails: { [key: string]: string } = {}

      for (const record of savedGroups) {
        if (record.evidenceFiles && record.evidenceFiles.length > 0) {
          for (const file of record.evidenceFiles) {
            if (file.mime_type?.startsWith('image/') && !newThumbnails[file.id]) {
              try {
                const url = await getFileUrl(file.file_path)
                newThumbnails[file.id] = url
              } catch (err) {
                console.error('Failed to load thumbnail:', err)
              }
            }
          }
        }
      }

      setThumbnails(prev => ({ ...prev, ...newThumbnails }))
    }

    if (savedGroups.length > 0) {
      generateThumbnails()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [savedGroups])

  // ==================== 操作函式 ====================

  // 新增記錄到當前群組
  const addRecordToCurrentGroup = () => {
    setCurrentEditingGroup(prev => {
      const newRecords = [...prev.records, {
        id: generateRecordId(),
        date: '',
        quantity: 0,
        evidenceFiles: [],
        memoryFiles: [],
        groupId: prev.groupId,
        deviceType: deviceType === '其他' ? customDeviceType : deviceType,
        deviceName: ''
      }]
      return {
        ...prev,
        records: newRecords
      }
    })
  }

  // 更新當前群組記錄
  const updateCurrentGroupRecord = (id: string, field: 'date' | 'quantity', value: any) => {
    setCurrentEditingGroup(prev => ({
      ...prev,
      records: prev.records.map(record =>
        record.id === id ? { ...record, [field]: value } : record
      )
    }))
  }

  // 從當前群組刪除記錄
  const removeRecordFromCurrentGroup = (id: string) => {
    setCurrentEditingGroup(prev => ({
      ...prev,
      records: prev.records.filter(record => record.id !== id)
    }))
  }

  // 保存當前群組到 savedGroups
  const saveCurrentGroup = () => {
    if (!deviceType) {
      setError('請選擇設備類型')
      return
    }

    if (deviceType === '其他' && !customDeviceType.trim()) {
      setError('請輸入自訂設備類型')
      return
    }

    const finalDeviceType = deviceType === '其他' ? customDeviceType : deviceType

    // 過濾有效記錄
    const validRecords = currentEditingGroup.records.filter(r =>
      r.date && r.quantity > 0
    )

    if (validRecords.length === 0) {
      setError('請至少填寫一筆加油記錄')
      return
    }

    if (currentEditingGroup.memoryFiles.length === 0) {
      setError('請上傳佐證文件')
      return
    }

    const isEditMode = currentEditingGroup.groupId !== null
    const groupId = currentEditingGroup.groupId || generateRecordId()

    // 將 deviceType 加到每筆記錄
    const recordsWithGroup = validRecords.map(r => ({
      ...r,
      groupId,
      deviceType: finalDeviceType,
      memoryFiles: currentEditingGroup.memoryFiles
    }))

    setSavedGroups(prev => {
      if (isEditMode) {
        // 編輯模式：替換舊群組
        return prev.map(r =>
          r.groupId === groupId ? recordsWithGroup.find(nr => nr.id === r.id) || r : r
        ).filter(r => r.groupId !== groupId || recordsWithGroup.some(nr => nr.id === r.id))
          .concat(recordsWithGroup.filter(nr => !prev.some(r => r.id === nr.id)))
      } else {
        // 新增模式
        return [...prev, ...recordsWithGroup]
      }
    })

    // 重置編輯區
    setCurrentEditingGroup({
      groupId: null,
      records: createEmptyRecords(),
      memoryFiles: []
    })

    // 重置設備類型選擇
    setDeviceType('')
    setCustomDeviceType('')

    setSuccess(isEditMode ? '群組已更新' : '群組已新增')
  }

  // 編輯群組
  const handleEditGroup = (groupId: string) => {
    const groupRecords = savedGroups.filter(r => r.groupId === groupId)
    if (groupRecords.length === 0) return

    // 載入設備類型
    const firstRecord = groupRecords[0]
    if (firstRecord.deviceType) {
      // 檢查是否為預設選項
      const isStandardType = ['發電機', '鍋爐', '蓄熱式焚化爐'].includes(firstRecord.deviceType)
      if (isStandardType) {
        setDeviceType(firstRecord.deviceType)
        setCustomDeviceType('')
      } else {
        setDeviceType('其他')
        setCustomDeviceType(firstRecord.deviceType)
      }
    }

    setCurrentEditingGroup({
      groupId,
      records: groupRecords.map(r => ({ ...r, memoryFiles: [] })),
      memoryFiles: []
    })
  }

  // 刪除群組
  const handleDeleteGroup = (groupId: string) => {
    setSavedGroups(prev => prev.filter(r => r.groupId !== groupId))
    removeRecordMapping(groupId)
    setSuccess('群組已刪除')
  }

  // 儲存（草稿）
  const handleSave = async () => {
    if (savedGroups.length === 0) {
      setError('請先新增至少一個群組')
      return
    }

    await executeSubmit(async () => {
      const { cleanedRecords, filesToUpload, fileMapping } = prepareSubmissionData(savedGroups, pageKey)

      if (filesToUpload.length > 0) {
        await uploadRecordFiles(filesToUpload, fileMapping)
      }

      const entry_id = await save(cleanedRecords, fileMapping)

      if (!currentEntryId) {
        setCurrentEntryId(entry_id)
      }

      setSuccessModalType('save')
      setShowSuccessModal(true)
      reload()
      reloadApprovalStatus()
    })
  }

  // 提交審核
  const handleSubmit = async () => {
    if (savedGroups.length === 0) {
      setError('請先新增至少一個群組')
      return
    }

    await executeSubmit(async () => {
      const { cleanedRecords, filesToUpload, fileMapping } = prepareSubmissionData(savedGroups, pageKey)

      if (filesToUpload.length > 0) {
        await uploadRecordFiles(filesToUpload, fileMapping)
      }

      const entry_id = await submit(cleanedRecords, fileMapping)

      if (!currentEntryId) {
        setCurrentEntryId(entry_id)
      }

      await handleSubmitSuccess()

      setSuccessModalType('submit')
      setShowSuccessModal(true)
      reload()
      reloadApprovalStatus()
    })
  }

  // 清除所有資料
  const handleClear = async () => {
    await clear()
    setSavedGroups([])
    setCurrentEditingGroup({
      groupId: null,
      records: createEmptyRecords(),
      memoryFiles: []
    })
    setDeviceType('')
    setCustomDeviceType('')
    setShowClearConfirmModal(false)
    reload()
    reloadApprovalStatus()
  }

  // 管理員儲存
  const handleAdminSave = async () => {
    if (!reviewEntryId || role !== 'admin') return

    await executeSubmit(async () => {
      const { cleanedRecords, filesToUpload, fileMapping } = prepareSubmissionData(savedGroups, pageKey)

      if (filesToUpload.length > 0) {
        await uploadRecordFiles(filesToUpload, fileMapping)
      }

      await adminSave(cleanedRecords, fileMapping)

      setSuccess('資料已更新')
      reload()
      reloadApprovalStatus()
    })
  }

  return (
    <SharedPageLayout
      pageHeader={{
        category: DIESEL_GENERATOR_CONFIG.category,
        title: DIESEL_GENERATOR_CONFIG.title,
        subtitle: DIESEL_GENERATOR_CONFIG.subtitle,
        iconColor: DIESEL_GENERATOR_CONFIG.iconColor,
        categoryPosition: DIESEL_GENERATOR_CONFIG.categoryPosition
      }}
      statusBanner={{
        approvalStatus,
        isReviewMode,
        accentColor: DIESEL_GENERATOR_CONFIG.iconColor
      }}
      instructionText={DIESEL_GENERATOR_CONFIG.instructionText}
      bottomActionBar={{
        currentStatus,
        submitting: submitting || submitLoading || clearLoading || adminSaving,
        onSubmit: handleSubmit,
        onSave: isReviewMode && role === 'admin' ? handleAdminSave : handleSave,
        onClear: () => setShowClearConfirmModal(true),
        show: !isReviewMode || role === 'admin',
        accentColor: DIESEL_GENERATOR_CONFIG.iconColor
      }}
    >
      {/* 使用數據區 */}
      <MobileEnergyUsageSection
        isReadOnly={isReadOnly}
        submitting={submitting || submitLoading}
        approvalStatus={approvalStatus}
        editPermissions={editPermissions}
        currentEditingGroup={currentEditingGroup}
        setCurrentEditingGroup={setCurrentEditingGroup}
        addRecordToCurrentGroup={addRecordToCurrentGroup}
        updateCurrentGroupRecord={updateCurrentGroupRecord}
        removeRecordFromCurrentGroup={removeRecordFromCurrentGroup}
        saveCurrentGroup={saveCurrentGroup}
        thumbnails={thumbnails}
        onPreviewImage={setLightboxSrc}
        onError={setError}
        iconColor={DIESEL_GENERATOR_CONFIG.iconColor}
        config={DIESEL_GENERATOR_CONFIG}
        deviceType={deviceType}
        customDeviceType={customDeviceType}
        onDeviceTypeChange={setDeviceType}
        onCustomDeviceTypeChange={setCustomDeviceType}
      />

      {/* 資料列表區 */}
      <MobileEnergyGroupListSection
        savedGroups={savedGroups}
        isReadOnly={isReadOnly}
        submitting={submitting || submitLoading}
        approvalStatus={approvalStatus}
        editPermissions={editPermissions}
        onEditGroup={handleEditGroup}
        onDeleteGroup={handleDeleteGroup}
        thumbnails={thumbnails}
        onPreviewImage={setLightboxSrc}
        iconColor={DIESEL_GENERATOR_CONFIG.iconColor}
        unit={DIESEL_GENERATOR_CONFIG.unit}
      />

      {/* Toast 訊息 */}
      {error && (
        <Toast
          message={error}
          type="error"
          onClose={() => {
            setError(null)
            clearSubmitError()
            clearClearError()
          }}
        />
      )}
      {success && (
        <Toast
          message={success}
          type="success"
          onClose={() => setSuccess(null)}
        />
      )}

      {/* 清除確認彈窗 */}
      <ConfirmClearModal
        show={showClearConfirmModal}
        onConfirm={handleClear}
        onCancel={() => setShowClearConfirmModal(false)}
        isClearing={clearLoading}
      />

      {/* 成功彈窗 */}
      <SuccessModal
        show={showSuccessModal}
        message={successModalType === 'save' ? '資料已成功儲存' : '資料已成功提交審核'}
        onClose={() => setShowSuccessModal(false)}
      />

      {/* 圖片放大 Lightbox */}
      {lightboxSrc && (
        <ImageLightbox
          src={lightboxSrc}
          onClose={() => setLightboxSrc(null)}
        />
      )}
    </SharedPageLayout>
  )
}
