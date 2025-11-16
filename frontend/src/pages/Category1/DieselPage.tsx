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
import { MobileEnergyRecord as DieselRecord, CurrentEditingGroup, EvidenceGroup } from './shared/mobile/mobileEnergyTypes'
import { LAYOUT_CONSTANTS } from './shared/mobile/mobileEnergyConstants'
import { createEmptyRecords, prepareSubmissionData } from './shared/mobile/mobileEnergyUtils'
import { DIESEL_CONFIG } from './shared/mobileEnergyConfig'
import { MobileEnergyUsageSection } from './shared/mobile/components/MobileEnergyUsageSection'
import { MobileEnergyGroupListSection } from './shared/mobile/components/MobileEnergyGroupListSection'
import { ImageLightbox } from './shared/mobile/components/ImageLightbox'
import type { MemoryFile } from '../../services/documentHandler';


export default function DieselPage() {
  // 審核模式檢測
  const { isReviewMode, reviewEntryId, reviewUserId } = useReviewMode()

  const pageKey = DIESEL_CONFIG.pageKey
  const [year] = useState(new Date().getFullYear())
  const [initialStatus, setInitialStatus] = useState<EntryStatus>('submitted')
  const [currentEntryId, setCurrentEntryId] = useState<string | null>(null)
  const { executeSubmit, submitting } = useSubmitGuard()
  const [showSuccessModal, setShowSuccessModal] = useState(false)
  const [successModalType, setSuccessModalType] = useState<'save' | 'submit'>('submit')
  const [showClearConfirmModal, setShowClearConfirmModal] = useState(false)

  // 圖片放大 lightbox
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [thumbnails, setThumbnails] = useState<{ [key: string]: string }>({});  // ⭐ 檔案縮圖 URL

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
  } = useMultiRecordSubmit(pageKey, year, {
    onSubmitSuccess: () => {
      setSuccessModalType('submit')
      setShowSuccessModal(true)
    },
    onSaveSuccess: () => {
      setSuccessModalType('save')
      setShowSuccessModal(true)
    }
  })

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

  // ⭐ 新架構：分離「當前編輯」和「已保存群組」
  // 當前正在編輯的群組（對應 Figma 上方「使用數據」區）
  const [currentEditingGroup, setCurrentEditingGroup] = useState<{
    groupId: string | null      // null = 新增模式，有值 = 編輯模式
    records: DieselRecord[]     // 該群組的記錄
    memoryFiles: MemoryFile[]   // 暫存佐證
  }>({
    groupId: null,
    records: createEmptyRecords(),
    memoryFiles: []
  })

  // 已保存的群組（對應 Figma 下方「資料列表」區）
  const [savedGroups, setSavedGroups] = useState<DieselRecord[]>([])

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
              const filesForThisRecord = getRecordFiles(item.id, validDieselFiles)
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
  }, [loadedFiles, pageKey, dataLoading])

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

    // 將 groupId 和 memoryFiles 套用到所有記錄
    const recordsWithGroupId = records.map(r => ({
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
      setSuccess('群組已更新')
    } else {
      // 新增模式：加入已保存列表
      setSavedGroups(prev => [...recordsWithGroupId, ...prev])
      setSuccess('群組已新增')
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

    setSuccess('群組已載入到編輯區')
  }

  // 刪除已保存的群組
  const deleteSavedGroup = (groupId: string) => {
    if (!window.confirm('確定要刪除此群組嗎？')) return

    setSavedGroups(prev => prev.filter(r => r.groupId !== groupId))
    removeRecordMapping(groupId)
    setSuccess('群組已刪除')
  }

  const handleSubmit = async () => {
    await executeSubmit(async () => {
      // ✅ 使用統一的資料準備函數
      const { totalQuantity, cleanedEnergyData, deduplicatedRecordData } = prepareSubmissionData(dieselData)

      // ⭐ 使用 hook 的 submit 函數
      await submit({
        entryInput: {
          page_key: pageKey,
          period_year: year,
          unit: DIESEL_CONFIG.unit,
          monthly: { '1': totalQuantity },
          notes: `${DIESEL_CONFIG.title}使用共 ${dieselData.length} 筆記錄`,
          extraPayload: {
            [DIESEL_CONFIG.dataFieldName]: cleanedEnergyData,
            fileMapping: getFileMappingForPayload()
          }
        },
        recordData: deduplicatedRecordData,  // ⭐ 使用去重後的資料（含 allRecordIds）
        uploadRecordFiles,
        onSuccess: async (entry_id) => {
          // ⭐ 簡化為只有收尾工作
          setCurrentEntryId(entry_id)
          await reload()
        }
      })

      await handleSubmitSuccess();

      // 重新載入審核狀態，更新狀態橫幅
      reloadApprovalStatus()
    }).catch(error => {
      setError(error instanceof Error ? error.message : '提交失敗，請重試');
    })
  };

  const handleSave = async () => {
    await executeSubmit(async () => {
      setError(null)
      setSuccess(null)

      // ✅ 使用統一的資料準備函數
      const { totalQuantity, cleanedEnergyData, deduplicatedRecordData } = prepareSubmissionData(dieselData)

      // 審核模式：使用 useAdminSave hook
      if (isReviewMode && reviewEntryId) {
        console.log('📝 管理員審核模式：使用 useAdminSave hook', reviewEntryId)

        // ⭐ 新架構：準備檔案列表（從當前編輯群組收集）
        const filesToUpload = currentEditingGroup.memoryFiles.map((mf: MemoryFile) => ({
          file: mf.file,
          metadata: {
            recordIndex: 0,
            allRecordIds: currentEditingGroup.records.map(r => r.id)
          }
        }))

        await adminSave({
          updateData: {
            unit: DIESEL_CONFIG.unit,
            amount: totalQuantity,
            payload: {
              monthly: { '1': totalQuantity },
              [DIESEL_CONFIG.dataFieldName]: cleanedEnergyData,
              fileMapping: getFileMappingForPayload()
            }
          },
          files: filesToUpload
        })

        await reload()
        reloadApprovalStatus()
        // 清空記憶體檔案（在 reload 之後，避免檔案暫時消失）
        setCurrentEditingGroup(prev => ({ ...prev, memoryFiles: [] }))
        setSuccess('✅ 儲存成功！資料已更新')
        return
      }

      // 非審核模式：使用統一的資料準備函數（已在函數開頭準備好）
      // ⭐ 使用 hook 的 save 函數（跳過驗證）
      await save({
        entryInput: {
          page_key: pageKey,
          period_year: year,
          unit: DIESEL_CONFIG.unit,
          monthly: { '1': totalQuantity },
          notes: `${DIESEL_CONFIG.title}使用共 ${dieselData.length} 筆記錄`,
          extraPayload: {
            [DIESEL_CONFIG.dataFieldName]: cleanedEnergyData,
            fileMapping: getFileMappingForPayload()
          }
        },
        recordData: deduplicatedRecordData,  // ⭐ 包含 allRecordIds
        uploadRecordFiles,
        onSuccess: async (entry_id) => {
          // ⭐ 簡化為 2 行（原本 ~55 行）
          setCurrentEntryId(entry_id)
          await reload()
        }
      })

      // 重新載入審核狀態，更新狀態橫幅
      reloadApprovalStatus()
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

  // ⭐ 只為圖片檔案生成縮圖（PDF 不需要）
  useEffect(() => {
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
          console.warn('Failed to generate thumbnail for', group.evidence.file_name, error)
        }
      }
    })
  }, [evidenceGroups])
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
        isSaving: submitLoading
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

      {/* 提交成功彈窗 */}
      <SuccessModal
        show={showSuccessModal}
        message={success || ''}
        type={successModalType}
        onClose={() => setShowSuccessModal(false)}
      />
    </SharedPageLayout>
    </>
  );
}