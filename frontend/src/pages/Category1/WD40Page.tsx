import { useState, useEffect, useMemo } from 'react';
import { EntryStatus } from '../../components/StatusSwitcher';
import ConfirmClearModal from '../../components/ConfirmClearModal'
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
import { MobileEnergyRecord, EvidenceGroup } from './shared/mobile/mobileEnergyTypes'
import { LAYOUT_CONSTANTS } from './shared/mobile/mobileEnergyConstants'
import { createEmptyRecords, prepareSubmissionData } from './shared/mobile/mobileEnergyUtils'
import { WD40_CONFIG } from './shared/mobileEnergyConfig'
import { MobileEnergyUsageSection } from './shared/mobile/components/MobileEnergyUsageSection'
import { MobileEnergyGroupListSection } from './shared/mobile/components/MobileEnergyGroupListSection'
import { ImageLightbox } from './shared/mobile/components/ImageLightbox'
import type { MemoryFile } from '../../services/documentHandler';
import { useWD40SpecManager } from './hooks/useWD40SpecManager'
import { WD40SpecInputFields } from './components/WD40SpecInputFields'
import { WD40SpecListSection } from './components/WD40SpecListSection'
import { WD40UsageInputFields } from './components/WD40UsageInputFields'


export default function WD40Page() {
  // 審核模式檢測
  const { isReviewMode, reviewEntryId, reviewUserId } = useReviewMode()

  const pageKey = WD40_CONFIG.pageKey
  const [year] = useState(new Date().getFullYear())
  const [initialStatus, setInitialStatus] = useState<EntryStatus>('submitted')
  const [currentEntryId, setCurrentEntryId] = useState<string | null>(null)
  const { executeSubmit, submitting } = useSubmitGuard()
  const [showClearConfirmModal, setShowClearConfirmModal] = useState(false)

  // 圖片放大 lightbox
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);
  const [thumbnails, setThumbnails] = useState<{ [key: string]: string }>({});

  // ⭐ 本地通知狀態（用於操作級別的通知，如保存規格、編輯群組等）
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // 前端狀態管理 Hook
  const frontendStatus = useFrontendStatus({
    initialStatus,
    entryId: currentEntryId,
    onStatusChange: () => {},
    onError: () => {},
    onSuccess: () => {}
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

  // ⭐ 規格管理 Hook
  const {
    savedSpecs,
    setSavedSpecs,
    currentEditingSpec,
    editingSpecId,
    updateCurrentSpec,
    saveCurrentSpec,
    editSpec,
    deleteSpec
  } = useWD40SpecManager()

  // 使用記錄管理（群組模式）
  const [currentEditingGroup, setCurrentEditingGroup] = useState<{
    groupId: string | null
    records: MobileEnergyRecord[]
    memoryFiles: MemoryFile[]
  }>({
    groupId: null,
    records: createEmptyRecords(),
    memoryFiles: []
  })

  const [savedGroups, setSavedGroups] = useState<MobileEnergyRecord[]>([])

  const wd40Data = useMemo(() => {
    return savedGroups
  }, [savedGroups])

  // ==================== 資料載入邏輯 ====================

  // 第一步：載入記錄資料
  useEffect(() => {
    if (loadedEntry && !dataLoading) {
      const entryStatus = loadedEntry.status as EntryStatus
      setInitialStatus(entryStatus)
      setCurrentEntryId(loadedEntry.id)
      setCurrentStatus(entryStatus)

      const payload = loadedEntry.payload || loadedEntry.extraPayload

      // ⭐ 載入規格列表
      if (payload?.wd40Data?.specs) {
        const specs = payload.wd40Data.specs.map((s: any) => ({
          ...s,
          evidenceFiles: [],
          memoryFiles: []
        }))
        setSavedSpecs(specs)
      }

      // ⭐ 載入使用記錄
      if (payload?.wd40Data?.usageRecords) {
        console.log('🔍 [reload] 資料庫回傳的 usageRecords:', payload.wd40Data.usageRecords)
        const records = payload.wd40Data.usageRecords.map((r: any) => ({
          ...r,
          id: String(r.id || generateRecordId()),
          evidenceFiles: [],
          memoryFiles: []
        }))
        console.log('🔍 [reload] 處理後的 records:', records)
        setSavedGroups(records)
      }

      // 載入檔案映射
      if (payload?.fileMapping) {
        loadFileMapping(payload)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadedEntry, dataLoading])

  // 第二步：檔案載入後分配到記錄
  useEffect(() => {
    if (dataLoading) return

    if (loadedFiles.length > 0) {
      const wd40Files = loadedFiles.filter(f =>
        f.file_type === 'other' && f.page_key === pageKey
      )

      if (wd40Files.length > 0) {
        const cleanAndAssignFiles = async () => {
          const validFiles = await cleanFiles(wd40Files)

          // 分配規格佐證
          setSavedSpecs(prev => prev.map(spec => ({
            ...spec,
            evidenceFiles: getRecordFiles(spec.id, validFiles)
          })))

          // 分配使用佐證（透過 record.id）
          setSavedGroups(prev => prev.map(record => ({
            ...record,
            evidenceFiles: getRecordFiles(record.id, validFiles)
          })))
        }

        cleanAndAssignFiles()
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadedFiles, pageKey, dataLoading])

  // ==================== 規格管理邏輯 ====================

  // 包裝保存函數（處理通知）
  const handleSaveSpec = () => {
    try {
      const message = saveCurrentSpec()
      setSuccess(message)
    } catch (error: any) {
      setError(error.message)
    }
  }

  // 包裝編輯函數
  const handleEditSpec = (id: string) => {
    const message = editSpec(id)
    if (message) setSuccess(message)
  }

  // ⭐ Linus 驗證：刪除規格前檢查是否有使用記錄
  const handleDeleteSpec = (id: string) => {
    // 檢查是否有使用記錄
    const hasUsageRecords = savedGroups.some(r => r.specId === id)

    if (hasUsageRecords) {
      setError('此品項已有使用記錄，無法刪除')
      return
    }

    if (!window.confirm('確定要刪除此品項嗎？')) return

    const message = deleteSpec(id)
    removeRecordMapping(id)
    setSuccess(message)
  }

  // ==================== 使用記錄管理邏輯 ====================

  const addRecordToCurrentGroup = () => {
    setCurrentEditingGroup(prev => ({
      ...prev,
      records: [...prev.records, {
        id: generateRecordId(),
        date: '',
        quantity: 0,
        specId: '',  // ⭐ 初始化 specId
        evidenceFiles: [],
        memoryFiles: [],
        groupId: prev.groupId || undefined
      }]
    }))
  }

  const updateCurrentGroupRecord = (recordId: string, field: keyof MobileEnergyRecord, value: any) => {
    setCurrentEditingGroup(prev => ({
      ...prev,
      records: prev.records.map(r =>
        r.id === recordId ? { ...r, [field]: value } : r
      )
    }))
  }

  // ⭐ 更新記錄的 specId（品項選擇）
  const updateCurrentGroupSpecId = (recordId: string, specId: string) => {
    setCurrentEditingGroup(prev => ({
      ...prev,
      records: prev.records.map(r =>
        r.id === recordId ? { ...r, specId } : r
      )
    }))
  }

  const removeRecordFromCurrentGroup = (recordId: string) => {
    setCurrentEditingGroup(prev => ({
      ...prev,
      records: prev.records.filter(r => r.id !== recordId)
    }))
  }

  // ⭐ Linus 驗證：保存群組時的完整驗證
  const saveCurrentGroup = () => {
    const { groupId, records, memoryFiles } = currentEditingGroup

    // ✅ Linus 驗證 1：必須先建立規格
    if (savedSpecs.length === 0) {
      setError('請先建立品項後再填寫使用數據')
      return
    }

    const isEditMode = groupId !== null

    // ⭐ 過濾出有效記錄（有日期或數量或品項的記錄）
    const validRecords = records.filter(r =>
      r.date.trim() !== '' || r.quantity > 0 || r.specId
    )

    // ✅ 只在新增模式驗證
    if (!isEditMode) {
      if (validRecords.length === 0) {
        setError('請至少填寫一筆有效數據')
        return
      }

      // ✅ Linus 驗證 2：有資料的記錄必須選擇規格
      const hasInvalidRecords = validRecords.some(r => !r.specId)
      if (hasInvalidRecords) {
        setError('請為每筆記錄選擇品項')
        return
      }
    }

    const targetGroupId = isEditMode ? groupId : generateRecordId()

    // ⭐ 只保存有效記錄
    const recordsWithGroupId = validRecords.map(r => ({
      ...r,
      groupId: targetGroupId,
      memoryFiles: [...memoryFiles]
    }))

    if (isEditMode) {
      setSavedGroups(prev => [
        ...recordsWithGroupId,
        ...prev.filter(r => r.groupId !== groupId)
      ])
      setSuccess('群組已更新')
    } else {
      setSavedGroups(prev => [...recordsWithGroupId, ...prev])
      setSuccess('群組已新增')
    }

    setCurrentEditingGroup({
      groupId: null,
      records: createEmptyRecords(),
      memoryFiles: []
    })
  }

  const loadGroupToEditor = (groupId: string) => {
    const currentHasData = currentEditingGroup.records.some(r =>
      r.date.trim() !== '' || r.quantity > 0
    ) || currentEditingGroup.memoryFiles.length > 0

    if (currentHasData && currentEditingGroup.groupId === null) {
      if (!window.confirm('目前編輯區有未保存的資料，是否先保存後再載入其他群組？')) {
        return
      }
      saveCurrentGroup()
    }

    const groupRecords = savedGroups.filter(r => r.groupId === groupId)

    if (groupRecords.length === 0) return

    setCurrentEditingGroup({
      groupId,
      records: groupRecords,
      memoryFiles: groupRecords[0]?.memoryFiles || []
    })

    setSuccess('群組已載入到編輯區')
  }

  const deleteSavedGroup = (groupId: string) => {
    if (!window.confirm('確定要刪除此群組嗎？')) return

    setSavedGroups(prev => prev.filter(r => r.groupId !== groupId))
    removeRecordMapping(groupId)
    setSuccess('群組已刪除')
  }

  // ==================== 提交邏輯 ====================

  const handleSubmit = async () => {
    await executeSubmit(async () => {
      // ⭐ Linus 驗證：必須有規格
      if (savedSpecs.length === 0) {
        throw new Error('請至少建立一個品項')
      }

      // ⭐ Linus 驗證：必須有使用記錄
      if (savedGroups.length === 0) {
        throw new Error('請至少新增一筆使用記錄')
      }

      // 清理規格資料（移除 File 物件）
      const cleanedSpecs = savedSpecs.map(s => ({
        id: s.id,
        name: s.name
      }))

      // 清理使用記錄
      const { totalQuantity, cleanedEnergyData, deduplicatedRecordData } = prepareSubmissionData(wd40Data)

      // ⭐ 合併品項和使用數據的檔案上傳列表
      const allRecordData = [
        ...savedSpecs.map(spec => ({
          id: spec.id,
          memoryFiles: spec.memoryFiles || [],
          allRecordIds: [spec.id]  // 品項只有單一 ID
        })),
        ...deduplicatedRecordData
      ]

      await submit({
        entryInput: {
          page_key: pageKey,
          period_year: year,
          unit: WD40_CONFIG.unit,
          monthly: { '1': totalQuantity },
          notes: `${WD40_CONFIG.title}使用共 ${wd40Data.length} 筆記錄`,
          extraPayload: {
            wd40Data: {
              specs: cleanedSpecs,
              usageRecords: cleanedEnergyData
            },
            fileMapping: getFileMappingForPayload()
          }
        },
        recordData: allRecordData,  // ⭐ 包含品項和使用數據的佐證
        uploadRecordFiles,
        onSuccess: async (entry_id) => {
          setCurrentEntryId(entry_id)
          await reload()
        }
      })

      await handleSubmitSuccess();
      reloadApprovalStatus()
    }).catch(error => {
      setError(error instanceof Error ? error.message : '提交失敗，請重試');
    })
  };

  const handleSave = async () => {
    await executeSubmit(async () => {
      setError(null)
      setSuccess(null)

      console.log('🔍 [handleSave] 儲存前的 savedGroups:', savedGroups)
      console.log('🔍 [handleSave] 儲存前的 wd40Data:', wd40Data)

      const cleanedSpecs = savedSpecs.map(s => ({
        id: s.id,
        name: s.name
      }))

      const { totalQuantity, cleanedEnergyData, deduplicatedRecordData } = prepareSubmissionData(wd40Data)
      console.log('🔍 [handleSave] cleanedEnergyData:', cleanedEnergyData)

      // ⭐ 合併品項和使用數據的檔案上傳列表
      const allRecordData = [
        ...savedSpecs.map(spec => ({
          id: spec.id,
          memoryFiles: spec.memoryFiles || [],
          allRecordIds: [spec.id]  // 品項只有單一 ID
        })),
        ...deduplicatedRecordData
      ]

      if (isReviewMode && reviewEntryId) {
        const filesToUpload = currentEditingGroup.memoryFiles.map((mf: MemoryFile) => ({
          file: mf.file,
          metadata: {
            recordIndex: 0,
            allRecordIds: currentEditingGroup.records.map(r => r.id)
          }
        }))

        await adminSave({
          updateData: {
            unit: WD40_CONFIG.unit,
            amount: totalQuantity,
            payload: {
              monthly: { '1': totalQuantity },
              wd40Data: {
                specs: cleanedSpecs,
                usageRecords: cleanedEnergyData
              },
              fileMapping: getFileMappingForPayload()
            }
          },
          files: filesToUpload
        })

        await reload()
        reloadApprovalStatus()
        setCurrentEditingGroup(prev => ({ ...prev, memoryFiles: [] }))
        setSuccess('✅ 儲存成功！資料已更新')
        return
      }

      await save({
        entryInput: {
          page_key: pageKey,
          period_year: year,
          unit: WD40_CONFIG.unit,
          monthly: { '1': totalQuantity },
          notes: `${WD40_CONFIG.title}使用共 ${wd40Data.length} 筆記錄`,
          extraPayload: {
            wd40Data: {
              specs: cleanedSpecs,
              usageRecords: cleanedEnergyData
            },
            fileMapping: getFileMappingForPayload()
          }
        },
        recordData: allRecordData,  // ⭐ 包含品項和使用數據的佐證
        uploadRecordFiles,
        onSuccess: async (entry_id) => {
          setCurrentEntryId(entry_id)
          await reload()
        }
      })

      reloadApprovalStatus()
      // ⭐ 不需要 setSuccess，save() 會觸發 submitSuccess，由 useEffect 統一處理
    }).catch(error => {
      console.error('❌ 暫存失敗:', error)
      setError(error instanceof Error ? error.message : '暫存失敗')
    })
  };

  const handleClear = () => {
    setShowClearConfirmModal(true);
  };

  const handleClearConfirm = async () => {
    try {
      // 收集所有檔案（規格佐證 + 使用佐證）
      const specFiles = savedSpecs.flatMap(s => s.evidenceFiles || [])
      const usageFiles = [
        ...currentEditingGroup.records.flatMap(r => r.evidenceFiles || []),
        ...savedGroups.flatMap(r => r.evidenceFiles || [])
      ]
      const allFiles = [...specFiles, ...usageFiles]

      const allMemoryFiles = [
        ...savedSpecs.flatMap(s => s.memoryFiles || []),
        ...currentEditingGroup.memoryFiles,
        ...savedGroups.flatMap(r => r.memoryFiles || [])
      ]

      await clear({
        filesToDelete: allFiles,
        memoryFilesToClean: allMemoryFiles
      })

      // 重置所有狀態
      setSavedSpecs([])
      setCurrentEditingGroup({
        groupId: null,
        records: createEmptyRecords(),
        memoryFiles: []
      })
      setSavedGroups([])
      setCurrentEntryId(null)
      setShowClearConfirmModal(false)

      await reload()
      reloadApprovalStatus()

      setSuccess('資料已完全清除')
    } catch (error) {
      setError(error instanceof Error ? error.message : '清除失敗，請重試')
    }
  };

  // 群組分組邏輯
  const evidenceGroups = useMemo((): EvidenceGroup[] => {
    const seenGroupIds = new Set<string>()
    const groupIds: string[] = []

    wd40Data.forEach(record => {
      if (record.groupId && !seenGroupIds.has(record.groupId)) {
        seenGroupIds.add(record.groupId)
        groupIds.push(record.groupId)
      }
    })

    const result: EvidenceGroup[] = []

    groupIds.forEach(groupId => {
      const records = wd40Data.filter((r: MobileEnergyRecord) => r.groupId === groupId)
      const evidence = records.find((r: MobileEnergyRecord) => r.evidenceFiles && r.evidenceFiles.length > 0)?.evidenceFiles?.[0]
      result.push({ groupId, evidence: evidence || null, records })
    })

    return result.sort((a, b) => {
      const aIsEmpty = a.records.every((r: MobileEnergyRecord) =>
        !r.date.trim() &&
        r.quantity === 0 &&
        (!r.memoryFiles || r.memoryFiles.length === 0)
      ) && !a.evidence

      const bIsEmpty = b.records.every((r: MobileEnergyRecord) =>
        !r.date.trim() &&
        r.quantity === 0 &&
        (!r.memoryFiles || r.memoryFiles.length === 0)
      ) && !b.evidence

      if (aIsEmpty && !bIsEmpty) return -1
      if (!aIsEmpty && bIsEmpty) return 1
      return 0
    })
  }, [wd40Data])

  // 生成縮圖
  useEffect(() => {
    // 規格佐證縮圖
    savedSpecs.forEach(async (spec) => {
      const evidenceFile = spec.evidenceFiles?.[0]
      if (evidenceFile &&
          evidenceFile.mime_type.startsWith('image/') &&
          !thumbnails[evidenceFile.id]) {
        try {
          const url = await getFileUrl(evidenceFile.file_path)
          setThumbnails(prev => ({
            ...prev,
            [evidenceFile.id]: url
          }))
        } catch (error) {
          console.warn('Failed to generate thumbnail for spec', spec.name, error)
        }
      }
    })

    // 使用佐證縮圖
    evidenceGroups.forEach(async (group) => {
      if (group.evidence &&
          group.evidence.mime_type.startsWith('image/') &&
          !thumbnails[group.evidence.id]) {
        try {
          const url = await getFileUrl(group.evidence.file_path)
          setThumbnails(prev => ({
            ...prev,
            [group.evidence!.id]: url
          }))
        } catch (error) {
          console.warn('Failed to generate thumbnail for group', group.groupId, error)
        }
      }
    })
  }, [savedSpecs, evidenceGroups])

  return (
    <>
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
          category: WD40_CONFIG.category,
          title: WD40_CONFIG.title,
          subtitle: WD40_CONFIG.subtitle,
          iconColor: WD40_CONFIG.iconColor,
          categoryPosition: WD40_CONFIG.categoryPosition
        }}
        statusBanner={{
          approvalStatus,
          isReviewMode,
          accentColor: WD40_CONFIG.iconColor
        }}
        instructionText={WD40_CONFIG.instructionText}
        bottomActionBar={{
          currentStatus,
          submitting,
          onSubmit: handleSubmit,
          onSave: handleSave,
          onClear: handleClear,
          show: !isReadOnly && !approvalStatus.isApproved && !isReviewMode,
          accentColor: WD40_CONFIG.iconColor
        }}
        reviewSection={{
          isReviewMode,
          reviewEntryId,
          reviewUserId,
          currentEntryId,
          pageKey,
          year,
          category: WD40_CONFIG.title,
          amount: wd40Data.reduce((sum, item) => sum + item.quantity, 0),
          unit: WD40_CONFIG.unit,
          role,
          onSave: handleSave,
          isSaving: submitLoading
        }}
        notificationState={{
          success: submitSuccess,
          error: submitError,
          clearSuccess: clearSubmitSuccess,
          clearError: clearSubmitError
        }}
      >
      {/* ==================== 區塊 1：規格設定 ==================== */}
      <WD40SpecInputFields
        spec={currentEditingSpec}
        onFieldChange={updateCurrentSpec}
        onSave={handleSaveSpec}
        editingSpecId={editingSpecId}
        isReadOnly={isReadOnly}
      />

      {/* ==================== 區塊 2：規格列表 ==================== */}
      <WD40SpecListSection
        specs={savedSpecs}
        thumbnails={thumbnails}
        onEdit={handleEditSpec}
        onDelete={handleDeleteSpec}
        onImageClick={(src) => setLightboxSrc(src)}
        isReadOnly={isReadOnly}
      />

      {/* ==================== 區塊 3：使用數據 ==================== */}
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
        onPreviewImage={(src) => setLightboxSrc(src)}
        onError={(msg) => setError(msg)}
        iconColor={WD40_CONFIG.iconColor}
        renderInputFields={({ currentGroup, onUpdate, onDelete, isReadOnly: readOnly }) => (
          <WD40UsageInputFields
            currentGroup={currentGroup}
            onUpdate={onUpdate}
            onUpdateSpecId={updateCurrentGroupSpecId}
            onDelete={onDelete}
            specs={savedSpecs}
            isReadOnly={readOnly}
            iconColor={WD40_CONFIG.iconColor}
          />
        )}
      />

      {/* ==================== 區塊 4：資料列表 ==================== */}
      <MobileEnergyGroupListSection
        savedGroups={savedGroups}
        thumbnails={thumbnails}
        isReadOnly={isReadOnly}
        approvalStatus={approvalStatus}
        onEditGroup={loadGroupToEditor}
        onDeleteGroup={deleteSavedGroup}
        onPreviewImage={(src) => setLightboxSrc(src)}
        iconColor={WD40_CONFIG.iconColor}
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

      {/* ⭐ 本地操作通知（保存規格、編輯群組等） */}
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

    </SharedPageLayout>
    </>
  );
}
