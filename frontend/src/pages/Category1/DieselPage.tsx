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
import { generateRecordId } from '../../utils/idGenerator';
import { MobileEnergyRecord as DieselRecord, CurrentEditingGroup, EvidenceGroup } from './common/mobileEnergyTypes'
import { LAYOUT_CONSTANTS } from './common/mobileEnergyConstants'
import { createEmptyRecords, prepareSubmissionData } from './common/mobileEnergyUtils'
import { DIESEL_CONFIG } from './common/mobileEnergyConfig'
import { MobileEnergyUsageSection } from './common/MobileEnergyUsageSection'
import { MobileEnergyGroupListSection } from './common/MobileEnergyGroupListSection'
import { ImageLightbox } from './common/ImageLightbox'
import type { MemoryFile } from '../../services/documentHandler';


export default function DieselPage() {
  // 審核模式檢測
  const { isReviewMode, reviewEntryId, reviewUserId } = useReviewMode()

  const pageKey = DIESEL_CONFIG.pageKey
  const [year] = useState(new Date().getFullYear())
  const [initialStatus, setInitialStatus] = useState<EntryStatus>('submitted')
  const [currentEntryId, setCurrentEntryId] = useState<string | null>(null)
  const { executeSubmit, submitting } = useSubmitGuard()
  const [showClearConfirmModal, setShowClearConfirmModal] = useState(false)

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
  const [savedGroups, setSavedGroups] = useState<DieselRecord[]>([])

  // ⭐ 缩图加载（使用统一 hook，Type 2：从群组中提取 evidenceFiles）
  const thumbnails = useThumbnailLoader({
    records: savedGroups,
    fileExtractor: (record) => record.evidenceFiles || []
  })

  // ⭐ Type 2 共用輔助函數
  const helpers = useType2Helpers<DieselRecord>(pageKey, year)

  // ⭐ 保留舊的 dieselData（提交時用）
  const dieselData = useMemo(() => {
    return savedGroups
  }, [savedGroups])

  // 檢查是否有填寫任何資料
  // ⭐ TODO: 重構載入邏輯以配合新架構
  // 第一步：載入記錄資料
  useEffect(() => {
    if (loadedEntry && !dataLoading) {
      const entryStatus = loadedEntry.status as EntryStatus
      setInitialStatus(entryStatus)
      setCurrentEntryId(loadedEntry.id)
      setCurrentStatus(entryStatus)

      // 從 payload 取得能源使用資料
      const dataFieldName = DIESEL_CONFIG.dataFieldName
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
      const dieselFiles = loadedFiles.filter(f =>
        f.file_type === 'other' && f.page_key === pageKey
      )

      if (dieselFiles.length > 0) {
        const cleanAndAssignFiles = async () => {
          const validDieselFiles = await cleanFiles(dieselFiles)

          setSavedGroups(prev => {
            return prev.map((item) => {
              // ⭐ Type 2 关键：使用 split(',').includes() 过滤
              const filesForThisRecord = validDieselFiles.filter(f =>
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

  // ⭐ 新架構的 Helper Functions


  // 在當前編輯群組新增記錄
  const addRecordToCurrentGroup = () => {
    setCurrentEditingGroup(prev => ({
      ...prev,
      records: [...prev.records, {
        id: generateRecordId(),
        date: '',
        quantity: 0,
        evidenceFiles: [],
        memoryFiles: [],
        groupId: prev.groupId || undefined
      }]
    }))
  }

  // 更新當前編輯群組的記錄
  const updateCurrentGroupRecord = (recordId: string, field: keyof DieselRecord, value: any) => {
    setCurrentEditingGroup(prev => ({
      ...prev,
      records: prev.records.map(r =>
        r.id === recordId ? { ...r, [field]: value } : r
      )
    }))
  }

  // 刪除當前編輯群組的記錄
  const removeRecordFromCurrentGroup = (recordId: string) => {
    setCurrentEditingGroup(prev => ({
      ...prev,
      records: prev.records.filter(r => r.id !== recordId)
    }))
  }

  // 保存群組：新增或更新
  const saveCurrentGroup = () => {
    const { groupId, records, memoryFiles } = currentEditingGroup

    // 判斷是編輯模式還是新增模式
    const isEditMode = groupId !== null

    // ✅ 只在新增模式驗證（編輯模式的資料已經驗證過了）
    if (!isEditMode) {
      // 驗證：至少要有一筆記錄
      if (records.length === 0) {
        setError('請至少新增一筆記錄')
        return
      }

      // 驗證：至少有一筆「有效」記錄（有日期或數量）
      const hasValidData = records.some(r =>
        r.date.trim() !== '' || r.quantity > 0
      )
      if (!hasValidData) {
        setError('請至少填寫一筆有效數據（日期或數量）')
        return
      }
    }

    const targetGroupId = isEditMode ? groupId : generateRecordId()

    // ⭐ 過濾出有效記錄（有日期或數量的記錄）
    const validRecords = records.filter(r =>
      r.date.trim() !== '' || r.quantity > 0
    )

    // 將 groupId 和 memoryFiles 套用到有效記錄
    const recordsWithGroupId = validRecords.map(r => ({
      ...r,
      groupId: targetGroupId,
      memoryFiles: [...memoryFiles]
    }))

    if (isEditMode) {
      // 編輯模式：更新該群組（移除舊的，加入新的）
      setSavedGroups(prev => [
        ...recordsWithGroupId,
        ...prev.filter(r => r.groupId !== groupId)
      ])
      // 不顯示通知（只是前端內存操作）
    } else {
      // 新增模式：加入已保存列表
      setSavedGroups(prev => [...recordsWithGroupId, ...prev])
      // 不顯示通知（只是前端內存操作）
    }

    // 清空編輯區（準備下一個群組），預設 3 格
    setCurrentEditingGroup({
      groupId: null,
      records: createEmptyRecords(),
      memoryFiles: []
    })
  }

  // 載入群組到編輯區（點「編輯群組」）
  const loadGroupToEditor = (groupId: string) => {
    // 檢查當前編輯區是否有未保存的資料
    const currentHasData = currentEditingGroup.records.some(r =>
      r.date.trim() !== '' || r.quantity > 0
    ) || currentEditingGroup.memoryFiles.length > 0

    // 如果有未保存的資料，提示用戶
    if (currentHasData && currentEditingGroup.groupId === null) {
      // 當前是新增模式且有資料，先保存
      if (!window.confirm('目前編輯區有未保存的資料，是否先保存後再載入其他群組？')) {
        return
      }
      saveCurrentGroup()
    }

    // 從 savedGroups 找出該群組的所有記錄
    const groupRecords = savedGroups.filter(r => r.groupId === groupId)

    if (groupRecords.length === 0) return

    // ✅ 不從列表移除，只複製到編輯區
    setCurrentEditingGroup({
      groupId,
      records: groupRecords,
      memoryFiles: groupRecords[0]?.memoryFiles || []
    })
    // 不顯示通知（只是前端內存操作）
  }

  // 刪除已保存的群組
  const deleteSavedGroup = (groupId: string) => {
    setSavedGroups(prev => prev.filter(r => r.groupId !== groupId))
    // 不顯示通知（只是前端內存操作）
  }

  // 記錄要刪除的檔案 ID
  const handleDeleteEvidence = (fileId: string) => {
    setFilesToDelete(prev => [...prev, fileId])
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
          unit: DIESEL_CONFIG.unit,
          monthly: { '1': totalQuantity },
          status: isDraft ? 'saved' : 'submitted',
          notes: `${DIESEL_CONFIG.title}使用共 ${savedGroups.length} 筆記錄`,
          payload: {
            dieselData: cleanedEnergyData
          }
        })

        const groupsMap = helpers.buildGroupsMap(savedGroups)
        await helpers.uploadGroupFiles(groupsMap, response.entry_id)
        await helpers.deleteMarkedFiles(filesToDelete, setFilesToDelete)

        setCurrentEntryId(response.entry_id)

        // ⭐ 提交時不手動設置 submitSuccess，由 handleSubmitSuccess() 設置
        // 暫存時才手動設置
        if (isDraft) {
          setSubmitSuccess('暫存成功')
        }

        await reload()
        if (!isDraft) {
          await handleSubmitSuccess()  // 會設置 success('提交成功，狀態已更新為已提交')
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
    // 審核模式：使用 useAdminSave hook
    if (isReviewMode && reviewEntryId) {
      await executeSubmit(async () => {
        setSubmitError(null)
        setSubmitSuccess(null)

        // 先同步編輯區修改
        const finalSavedGroups = helpers.syncEditingGroupChanges(currentEditingGroup, savedGroups, setSavedGroups)
        const { totalQuantity, cleanedEnergyData } = prepareSubmissionData(finalSavedGroups)
        const filesToUpload = helpers.collectAdminFilesToUpload(finalSavedGroups)

        await adminSave({
          updateData: {
            unit: DIESEL_CONFIG.unit,
            amount: totalQuantity,
            payload: {
              monthly: { '1': totalQuantity },
              dieselData: cleanedEnergyData
            }
          },
          files: filesToUpload
        })

        await helpers.deleteMarkedFilesAsAdmin(filesToDelete, setFilesToDelete)
        await reload()
        reloadApprovalStatus()
        setCurrentEditingGroup(prev => ({ ...prev, memoryFiles: [] }))
        setSuccess('✅ 儲存成功！資料已更新')
      }).catch(error => {
        setSubmitError(error instanceof Error ? error.message : '暫存失敗')
        throw error
      })
      return
    }

    // ⭐ 一般暫存模式：先同步編輯區，再調用 submitData
    // submitData 內部會呼叫 executeSubmit，所以這裡不需要
    helpers.syncEditingGroupChanges(currentEditingGroup, savedGroups, setSavedGroups)
    await submitData(true)
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
      setShowClearConfirmModal(false)

      // 重新載入審核狀態，清除狀態橫幅
      await reload()
      reloadApprovalStatus()

      setSuccess('資料已完全清除')
    } catch (error) {
      setError(error instanceof Error ? error.message : '清除失敗，請重試')
    }
  };


  // ✅ 群組分組邏輯：按 groupId 分組

  const evidenceGroups = useMemo((): EvidenceGroup[] => {
    // ⭐ 按 dieselData 順序收集唯一的 groupId（保持順序）
    const seenGroupIds = new Set<string>()
    const groupIds: string[] = []

    dieselData.forEach(record => {
      if (record.groupId && !seenGroupIds.has(record.groupId)) {
        seenGroupIds.add(record.groupId)
        groupIds.push(record.groupId)
      }
    })

    // ⭐ 按收集到的順序建立 groups（所有群組平等）
    const result: EvidenceGroup[] = []

    groupIds.forEach(groupId => {
      const records = dieselData.filter((r: DieselRecord) => r.groupId === groupId)
      const evidence = records.find((r: DieselRecord) => r.evidenceFiles && r.evidenceFiles.length > 0)?.evidenceFiles?.[0]
      result.push({ groupId, evidence: evidence || null, records })
    })

    // ✅ 排序：空白群組置頂，其他按時間新→舊
    return result.sort((a, b) => {
      const aIsEmpty = a.records.every((r: DieselRecord) =>
        !r.date.trim() &&
        r.quantity === 0 &&
        (!r.memoryFiles || r.memoryFiles.length === 0)
      ) && !a.evidence

      const bIsEmpty = b.records.every((r: DieselRecord) =>
        !r.date.trim() &&
        r.quantity === 0 &&
        (!r.memoryFiles || r.memoryFiles.length === 0)
      ) && !b.evidence

      if (aIsEmpty && !bIsEmpty) return -1  // 空白群組在前
      if (!aIsEmpty && bIsEmpty) return 1
      return 0  // 保持原順序（新的在前）
    })
  }, [dieselData])

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
          category: DIESEL_CONFIG.category,
          title: DIESEL_CONFIG.title,
          subtitle: DIESEL_CONFIG.subtitle,
          iconColor: DIESEL_CONFIG.iconColor,
          categoryPosition: DIESEL_CONFIG.categoryPosition
        }}
        statusBanner={{
          approvalStatus,
          isReviewMode,
          accentColor: DIESEL_CONFIG.iconColor
        }}
        instructionText={DIESEL_CONFIG.instructionText}
      bottomActionBar={{
        currentStatus,
        submitting,
        onSubmit: handleSubmit,
        onSave: handleSave,
        onClear: handleClear,
        show: !isReadOnly && !approvalStatus.isApproved && !isReviewMode,
        accentColor: DIESEL_CONFIG.iconColor
      }}
      reviewSection={{
        isReviewMode,
        reviewEntryId,
        reviewUserId,
        currentEntryId,
        pageKey,
        year,
        category: DIESEL_CONFIG.title,
        amount: dieselData.reduce((sum, item) => sum + item.quantity, 0),
        unit: DIESEL_CONFIG.unit,
        role,
        onSave: handleSave,
        isSaving: submitting
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
      {/* 使用數據區塊 */}
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
        onDeleteEvidence={handleDeleteEvidence}
        iconColor={DIESEL_CONFIG.iconColor}
      />

      {/* 資料列表區塊 */}
      <MobileEnergyGroupListSection
        savedGroups={savedGroups}
        thumbnails={thumbnails}
        isReadOnly={isReadOnly}
        approvalStatus={approvalStatus}
        onEditGroup={loadGroupToEditor}
        onDeleteGroup={deleteSavedGroup}
        onPreviewImage={(src) => setLightboxSrc(src)}
        iconColor={DIESEL_CONFIG.iconColor}
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