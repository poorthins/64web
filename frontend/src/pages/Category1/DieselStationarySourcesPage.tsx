import { useState, useEffect, useMemo } from 'react';
import { EntryStatus } from '../../components/StatusSwitcher';
import ConfirmClearModal from '../../components/ConfirmClearModal'
import SharedPageLayout from '../../layouts/SharedPageLayout'
import { useEditPermissions } from '../../hooks/useEditPermissions';
import { useFrontendStatus } from '../../hooks/useFrontendStatus';
import { useApprovalStatus } from '../../hooks/useApprovalStatus';
import { useReviewMode } from '../../hooks/useReviewMode'
import { useEnergyData } from '../../hooks/useEnergyData'
import { useEnergyClear } from '../../hooks/useEnergyClear'
import { useSubmitGuard } from '../../hooks/useSubmitGuard'
import { useGhostFileCleaner } from '../../hooks/useGhostFileCleaner'
import { useSubmissions } from '../admin/hooks/useSubmissions'
import { useRole } from '../../hooks/useRole'
import { useAdminSave } from '../../hooks/useAdminSave'
import { EvidenceFile } from '../../api/files'
import { submitEnergyEntry } from '../../api/v2/entryAPI'
import { useThumbnailLoader } from '../../hooks/useThumbnailLoader'
import { useType2Helpers } from '../../hooks/useType2Helpers'
import Toast from '../../components/Toast';
import { generateRecordId } from '../../utils/idGenerator';
import { MobileEnergyRecord as DieselGeneratorRecord, CurrentEditingGroup, EvidenceGroup } from './common/mobileEnergyTypes'
import { LAYOUT_CONSTANTS } from './common/mobileEnergyConstants'
import { createEmptyRecords, prepareSubmissionData } from './common/mobileEnergyUtils'
import { DIESEL_GENERATOR_CONFIG } from './common/mobileEnergyConfig'
import { MobileEnergyUsageSection } from './common/MobileEnergyUsageSection'
import { MobileEnergyGroupListSection } from './common/MobileEnergyGroupListSection'
import { ImageLightbox } from './common/ImageLightbox'
import type { MemoryFile } from '../../services/documentHandler';


export default function DieselStationarySourcesPage() {
  const { isReviewMode, reviewEntryId, reviewUserId } = useReviewMode()

  const pageKey = DIESEL_GENERATOR_CONFIG.pageKey
  const [year] = useState(new Date().getFullYear())
  const [initialStatus, setInitialStatus] = useState<EntryStatus>('submitted')
  const [currentEntryId, setCurrentEntryId] = useState<string | null>(null)
  const { executeSubmit, submitting } = useSubmitGuard()
  const [showClearConfirmModal, setShowClearConfirmModal] = useState(false)

  // 柴油發電機專用：設備類型
  const [deviceType, setDeviceType] = useState<string>('')
  const [customDeviceType, setCustomDeviceType] = useState<string>('')

  // 圖片放大 lightbox
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // 前端狀態管理 Hook
  const frontendStatus = useFrontendStatus({
    initialStatus,
    entryId: currentEntryId,
    onStatusChange: () => {},
    onError: (error) => setError(error),
    onSuccess: (message) => setSuccess(message)
  })

  const { currentStatus, setCurrentStatus, handleSubmitSuccess } = frontendStatus

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
    reload
  } = useEnergyData(pageKey, year, entryIdToLoad)

  // 審核狀態 Hook
  const { reload: reloadApprovalStatus, ...approvalStatus } = useApprovalStatus(pageKey, year)

  // 管理員儲存 Hook
  const { save: adminSave, saving: adminSaving } = useAdminSave(pageKey, reviewEntryId)

  // 清除 Hook
  const {
    clear,
    clearing: clearLoading,
    error: clearError,
    clearError: clearClearError
  } = useEnergyClear(currentEntryId, currentStatus)

  // 幽靈檔案清理 Hook
  const { cleanFiles } = useGhostFileCleaner()

  // ⭐ 新架构状态管理（替代旧 hooks）
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null)
  const [filesToDelete, setFilesToDelete] = useState<string[]>([])

  // ⭐ 新架構：分離「當前編輯」和「已保存群組」
  // 當前正在編輯的群組（對應 Figma 上方「使用數據」區）
  const [currentEditingGroup, setCurrentEditingGroup] = useState<CurrentEditingGroup>({
    groupId: null,
    records: createEmptyRecords(),
    memoryFiles: []
  })

  // 已保存的群組（對應 Figma 下方「資料列表」區）
  const [savedGroups, setSavedGroups] = useState<DieselGeneratorRecord[]>([])

  // ⭐ 缩图加载（使用统一 hook，Type 2：从群组中提取 evidenceFiles）
  const thumbnails = useThumbnailLoader({
    records: savedGroups,
    fileExtractor: (record) => record.evidenceFiles || []
  })

  // ⭐ Type 2 共用輔助函數
  const helpers = useType2Helpers<DieselGeneratorRecord>(pageKey, year)

  // ⭐ 保留舊的 dieselGeneratorData（提交時用）
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

          // ⭐ 載入到 savedGroups（新架構）
          setSavedGroups(updated)
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadedEntry, dataLoading])

  // 第二步：檔案載入後分配到記錄
  useEffect(() => {
    if (dataLoading) return

    if (loadedFiles.length > 0 && savedGroups.length > 0) {
      const dieselGeneratorFiles = loadedFiles.filter(f =>
        f.file_type === 'other' && f.page_key === pageKey
      )

      if (dieselGeneratorFiles.length > 0) {
        const cleanAndAssignFiles = async () => {
          const validDieselGeneratorFiles = await cleanFiles(dieselGeneratorFiles)

          setSavedGroups(prev => {
            return prev.map((item) => {
              // ⭐ Type 2 关键：使用 split(',').includes() 过滤
              const filesForThisRecord = validDieselGeneratorFiles.filter(f =>
                f.record_id && f.record_id.split(',').includes(item.id)
              )
              return {
                ...item,
                evidenceFiles: filesForThisRecord
                // ⚠️ 不清除 memoryFiles
              }
            })
          })
        }

        cleanAndAssignFiles()
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadedFiles, pageKey, dataLoading, savedGroups.length])

  // 記錄要刪除的檔案 ID
  const handleDeleteEvidence = (fileId: string) => {
    setFilesToDelete(prev => [...prev, fileId])
  }

  // ==================== 操作函式 ====================

  // 新增記錄到當前群組
  const addRecordToCurrentGroup = () => {
    setCurrentEditingGroup(prev => ({
      ...prev,
      records: [...prev.records, {
        id: generateRecordId(),
        date: '',
        quantity: 0,
        evidenceFiles: [],
        memoryFiles: [],
        groupId: prev.groupId || undefined,
        deviceType: deviceType === '其他' ? customDeviceType : deviceType,
        deviceName: ''
      }]
    }))
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

    // ⭐ 過濾出有效記錄（有日期或數量的記錄）
    const validRecords = currentEditingGroup.records.filter(r =>
      r.date.trim() !== '' || r.quantity > 0
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

    // 不顯示通知（只是前端內存操作）
  }

  const handleEditGroup = (groupId: string) => {
    const groupRecords = savedGroups.filter(r => r.groupId === groupId)
    if (groupRecords.length === 0) return

    const firstRecord = groupRecords[0]

    if (firstRecord.deviceType) {
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
      memoryFiles: firstRecord.memoryFiles || []
    })
  }

  // 刪除群組
  const handleDeleteGroup = (groupId: string) => {
    setSavedGroups(prev => prev.filter(r => r.groupId !== groupId))
    // 不顯示通知（只是前端內存操作）
  }

  // ⭐ 統一提交函數（替代旧 hooks）
  const submitData = async (isDraft: boolean) => {
    if (savedGroups.length === 0) {
      throw new Error('請至少新增一個群組')
    }

    await executeSubmit(async () => {
      setSubmitError(null)
      setSubmitSuccess(null)

      try {
        const { totalQuantity, cleanedEnergyData } = prepareSubmissionData(savedGroups)

        const response = await submitEnergyEntry({
          page_key: pageKey,
          period_year: year,
          unit: DIESEL_GENERATOR_CONFIG.unit,
          monthly: { '1': totalQuantity },
          status: isDraft ? 'saved' : 'submitted',
          notes: `${DIESEL_GENERATOR_CONFIG.title}使用共 ${savedGroups.length} 筆記錄`,
          payload: {
            dieselGeneratorData: cleanedEnergyData
          }
        })

        const groupsMap = helpers.buildGroupsMap(savedGroups)
        await helpers.uploadGroupFiles(groupsMap, response.entry_id)
        await helpers.deleteMarkedFiles(filesToDelete, setFilesToDelete)

        setCurrentEntryId(response.entry_id)
        setSubmitSuccess(isDraft ? '暫存成功' : '提交成功')

        await reload()
        if (!isDraft) {
          await handleSubmitSuccess()
        }
        reloadApprovalStatus()

      } catch (error) {
        setSubmitError(error instanceof Error ? error.message : '操作失敗')
        throw error
      }
    })
  }

  const handleSubmit = () => submitData(false)

  const handleSave = async () => {
    await executeSubmit(async () => {
      setSubmitError(null)
      setSubmitSuccess(null)

      // 先同步編輯區修改
      const finalSavedGroups = helpers.syncEditingGroupChanges(currentEditingGroup, savedGroups, setSavedGroups)
      const { totalQuantity, cleanedEnergyData } = prepareSubmissionData(finalSavedGroups)

      // 審核模式：使用 useAdminSave hook
      if (isReviewMode && reviewEntryId) {
        const filesToUpload = helpers.collectAdminFilesToUpload(finalSavedGroups)

        await adminSave({
          updateData: {
            unit: DIESEL_GENERATOR_CONFIG.unit,
            amount: totalQuantity,
            payload: {
              monthly: { '1': totalQuantity },
              dieselGeneratorData: cleanedEnergyData
            }
          },
          files: filesToUpload
        })

        await helpers.deleteMarkedFilesAsAdmin(filesToDelete, setFilesToDelete)
        await reload()
        reloadApprovalStatus()
        setCurrentEditingGroup(prev => ({ ...prev, memoryFiles: [] }))
        setSubmitSuccess('✅ 儲存成功！資料已更新')
        return
      }

      // 一般暫存：調用 submitData
      await submitData(true)
    }).catch(error => {
      setSubmitError(error instanceof Error ? error.message : '暫存失敗')
    })
  }

  const handleClear = () => {
    setShowClearConfirmModal(true);
  };

  const handleClearConfirm = async () => {
    try {
      // 收集所有檔案和記憶體檔案（包含編輯中和已保存的）
      const allFiles = [
        ...currentEditingGroup.records.flatMap(r => r.evidenceFiles || []),
        ...savedGroups.flatMap(r => r.evidenceFiles || [])
      ]
      const allMemoryFiles = [
        currentEditingGroup.memoryFiles,
        ...savedGroups.map(r => r.memoryFiles || [])
      ]

      // 使用 Hook 清除
      await clear({
        filesToDelete: allFiles,
        memoryFilesToClean: allMemoryFiles
      })

      // 重置前端狀態（新架構），預設 3 格
      setCurrentEditingGroup({
        groupId: null,
        records: createEmptyRecords(),
        memoryFiles: []
      })
      setSavedGroups([])
      setCurrentEntryId(null)
      setDeviceType('')
      setCustomDeviceType('')
      setShowClearConfirmModal(false)

      // 重新載入審核狀態，清除狀態橫幅
      await reload()
      reloadApprovalStatus()

      setSuccess('資料已完全清除')
    } catch (error) {
      setError(error instanceof Error ? error.message : '清除失敗，請重試')
    }
  };


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
        submitting: submitting || clearLoading || adminSaving,
        onSubmit: handleSubmit,
        onSave: handleSave,
        onClear: () => setShowClearConfirmModal(true),
        show: !isReadOnly && !approvalStatus.isApproved && !isReviewMode,
        accentColor: DIESEL_GENERATOR_CONFIG.iconColor
      }}
      reviewSection={{
        isReviewMode,
        reviewEntryId,
        reviewUserId,
        currentEntryId,
        pageKey,
        year,
        category: DIESEL_GENERATOR_CONFIG.title,
        amount: savedGroups.reduce((sum, record) => sum + record.quantity, 0),
        unit: DIESEL_GENERATOR_CONFIG.unit,
        role,
        onSave: handleSave,
        isSaving: adminSaving
      }}
      notificationState={{
        success: submitSuccess || success,
        error: submitError || error,
        clearSuccess: () => {
          setSubmitSuccess(null);
          setSuccess(null);
        },
        clearError: () => {
          setSubmitError(null);
          setError(null);
        }
      }}
    >
      {/* 使用數據區 */}
      <MobileEnergyUsageSection
        isReadOnly={isReadOnly}
        submitting={submitting}
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
        onDeleteEvidence={handleDeleteEvidence}
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
        approvalStatus={approvalStatus}
        onEditGroup={handleEditGroup}
        onDeleteGroup={handleDeleteGroup}
        thumbnails={thumbnails}
        onPreviewImage={setLightboxSrc}
        iconColor={DIESEL_GENERATOR_CONFIG.iconColor}
      />

      {/* Toast 訊息 */}
      {error && (
        <Toast
          message={error}
          type="error"
          onClose={() => setError(null)}
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
        onConfirm={handleClearConfirm}
        onCancel={() => setShowClearConfirmModal(false)}
        isClearing={clearLoading}
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
