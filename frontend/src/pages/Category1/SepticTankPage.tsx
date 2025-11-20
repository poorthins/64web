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
import { useRole } from '../../hooks/useRole'
import { useAdminSave } from '../../hooks/useAdminSave'
import { getFileUrl } from '../../api/files';
import Toast from '../../components/Toast';
import { generateRecordId } from '../../utils/idGenerator';
import { LAYOUT_CONSTANTS } from './shared/mobile/mobileEnergyConstants'
import { SEPTIC_TANK_CONFIG } from './shared/mobileEnergyConfig'
import { ImageLightbox } from './shared/mobile/components/ImageLightbox'
import { SepticTankUsageSection, SepticTankRecord, SepticTankCurrentEditingGroup } from './shared/mobile/components/SepticTankUsageSection'
import { SepticTankCalendarView } from './shared/mobile/components/SepticTankCalendarView'
import type { MemoryFile } from '../../services/documentHandler';

// ⭐ 創建空白記錄（預設 3 格）
const createEmptyRecords = (): SepticTankRecord[] => {
  return Array.from({ length: 3 }, () => ({
    id: generateRecordId(),
    month: 1,
    hours: 0,
    evidenceFiles: [],
    memoryFiles: [],
  }))
}

// ⭐ 按 groupId 分組記錄
const groupRecordsByGroupId = (records: SepticTankRecord[]): Map<string, SepticTankRecord[]> => {
  const map = new Map<string, SepticTankRecord[]>()
  records.forEach(record => {
    if (!record.groupId) return
    if (!map.has(record.groupId)) {
      map.set(record.groupId, [])
    }
    map.get(record.groupId)!.push(record)
  })
  return map
}

// ⭐ 收集檔案用於上傳（審核模式專用）
const collectFilesToUpload = (groupMap: Map<string, SepticTankRecord[]>): Array<{
  file: File
  metadata: {
    recordIndex: number
    allRecordIds: string[]
    fileType?: 'msds' | 'usage_evidence' | 'other'
  }
}> => {
  const filesToUpload: Array<{
    file: File
    metadata: {
      recordIndex: number
      allRecordIds: string[]
      fileType?: 'msds' | 'usage_evidence' | 'other'
    }
  }> = []

  groupMap.forEach((records) => {
    const firstRecord = records[0]
    if (firstRecord?.memoryFiles && firstRecord.memoryFiles.length > 0) {
      firstRecord.memoryFiles.forEach((mf: MemoryFile) => {
        filesToUpload.push({
          file: mf.file,
          metadata: {
            recordIndex: 0,
            allRecordIds: records.map(r => r.id),
            fileType: 'other'
          }
        })
      })
    }
  })

  return filesToUpload
}

// ⭐ 準備提交資料的輔助函數
const prepareSubmissionData = (records: SepticTankRecord[]) => {
  // 計算總工時
  const totalHours = records.reduce((sum, r) => sum + (r.hours || 0), 0)

  // 清理資料（移除暫存檔案）
  const cleanedData = records.map(r => ({
    id: r.id,
    month: r.month,
    hours: r.hours,
    groupId: r.groupId
  }))

  // 按 groupId 分組去重（避免重複上傳檔案）
  const groupMap = groupRecordsByGroupId(records)

  const deduplicatedRecordData: Array<{
    id: string
    memoryFiles: MemoryFile[]
    allRecordIds: string[]
  }> = []

  groupMap.forEach((records) => {
    const firstRecord = records[0]
    if (firstRecord?.memoryFiles && firstRecord.memoryFiles.length > 0) {
      deduplicatedRecordData.push({
        id: firstRecord.id,
        memoryFiles: firstRecord.memoryFiles,
        allRecordIds: records.map(r => r.id)
      })
    }
  })

  return {
    totalHours,
    cleanedData,
    deduplicatedRecordData
  }
}

export default function SepticTankPage() {
  // 審核模式檢測
  const { isReviewMode, reviewEntryId, reviewUserId } = useReviewMode()

  const pageKey = SEPTIC_TANK_CONFIG.pageKey
  const [year] = useState(new Date().getFullYear())
  const [initialStatus, setInitialStatus] = useState<EntryStatus>('submitted')
  const [currentEntryId, setCurrentEntryId] = useState<string | null>(null)
  const { executeSubmit, submitting } = useSubmitGuard()
  const [showClearConfirmModal, setShowClearConfirmModal] = useState(false)

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

  // 管理員儲存 Hook
  const { save: adminSave } = useAdminSave(pageKey, reviewEntryId)

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
    clearing: clearLoading
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
  const [currentEditingGroup, setCurrentEditingGroup] = useState<SepticTankCurrentEditingGroup>({
    groupId: null,
    records: createEmptyRecords(),
    memoryFiles: []
  })

  // 已保存的群組
  const [savedGroups, setSavedGroups] = useState<SepticTankRecord[]>([])

  // 保留舊的命名（提交時用）
  const septicTankData = useMemo(() => {
    return savedGroups
  }, [savedGroups])

  // 第一步：載入記錄資料
  useEffect(() => {
    if (loadedEntry && !dataLoading) {
      const entryStatus = loadedEntry.status as EntryStatus
      setInitialStatus(entryStatus)
      setCurrentEntryId(loadedEntry.id)
      setCurrentStatus(entryStatus)

      // 從 payload 取得能源使用資料
      const dataFieldName = SEPTIC_TANK_CONFIG.dataFieldName
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

          // 載入到 savedGroups
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
    if (dataLoading || loadedFiles.length === 0) return

    const processFiles = async () => {
      if (savedGroups.length > 0) {
        const usageFiles = loadedFiles.filter(f =>
          f.file_type === 'other' && f.page_key === pageKey
        )

        if (usageFiles.length > 0) {
          const validFiles = await cleanFiles(usageFiles)
          setSavedGroups(prev =>
            prev.map(item => ({
              ...item,
              evidenceFiles: getRecordFiles(item.id, validFiles),
              memoryFiles: []
            }))
          )
        }
      }
    }

    processFiles()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadedFiles, pageKey, dataLoading, savedGroups.length])

  // ⭐ Helper Functions

  // 在當前編輯群組新增記錄
  const addRecordToCurrentGroup = () => {
    setCurrentEditingGroup(prev => ({
      ...prev,
      records: [...prev.records, {
        id: generateRecordId(),
        month: 1,
        hours: 0,
        evidenceFiles: [],
        memoryFiles: [],
        groupId: prev.groupId || undefined
      }]
    }))
  }

  // 更新當前編輯群組的記錄
  const updateCurrentGroupRecord = (recordId: string, field: 'month' | 'hours', value: any) => {
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

    const isEditMode = groupId !== null

    // 只在新增模式驗證
    if (!isEditMode) {
      if (records.length === 0) {
        setError('請至少新增一筆記錄')
        return
      }

      const hasValidData = records.some(r =>
        r.month >= 1 && r.month <= 12 && r.hours > 0
      )
      if (!hasValidData) {
        setError('請至少填寫一筆有效數據（月份和工時）')
        return
      }
    }

    const targetGroupId = isEditMode ? groupId : generateRecordId()

    // ⭐ 過濾出有效記錄（有月份或工時的記錄）
    const validRecords = records.filter(r =>
      (r.month >= 1 && r.month <= 12) || r.hours > 0
    )

    // 將 groupId 和 memoryFiles 套用到有效記錄
    const recordsWithGroupId = validRecords.map(r => ({
      ...r,
      groupId: targetGroupId,
      memoryFiles: [...memoryFiles]
    }))

    // ⭐ 方案 B：自動覆蓋重複的月份
    // 收集當前要保存的所有月份
    const monthsToSave = recordsWithGroupId
      .filter(r => r.month >= 1 && r.month <= 12 && r.hours > 0)
      .map(r => r.month)

    // 判斷是否保留舊記錄
    const shouldKeepRecord = (r: SepticTankRecord): boolean => {
      // 如果是當前編輯的群組，刪除（稍後會被新記錄替換）
      if (isEditMode && r.groupId === groupId) return false
      // 如果月份在新記錄中，刪除（覆蓋）
      if (monthsToSave.includes(r.month)) return false
      // 其他保留
      return true
    }

    setSavedGroups(prev => {
      const filtered = prev.filter(shouldKeepRecord)
      return [...recordsWithGroupId, ...filtered]
    })

    if (isEditMode) {
      setSuccess('群組已更新')
    } else {
      setSuccess('群組已新增')
    }

    // 清空編輯區
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
      r.month >= 1 && r.month <= 12 && r.hours > 0
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

    // 不從列表移除，只複製到編輯區
    setCurrentEditingGroup({
      groupId,
      records: groupRecords,
      memoryFiles: groupRecords[0]?.memoryFiles || []
    })

    setSuccess('群組已載入到編輯區')
  }

  // 從月曆檢視編輯月份（找到月份所屬的群組並載入）
  const handleEditMonth = (month: number) => {
    // 找到包含此月份的記錄
    const recordWithMonth = savedGroups.find(r => r.month === month)

    if (!recordWithMonth || !recordWithMonth.groupId) {
      setError('找不到此月份的群組')
      return
    }

    // 載入整個群組
    loadGroupToEditor(recordWithMonth.groupId)
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
      const { totalHours, cleanedData, deduplicatedRecordData } = prepareSubmissionData(septicTankData)

      await submit({
        entryInput: {
          page_key: pageKey,
          period_year: year,
          unit: SEPTIC_TANK_CONFIG.unit,
          monthly: { '1': totalHours },
          notes: `${SEPTIC_TANK_CONFIG.title}使用共 ${septicTankData.length} 筆記錄`,
          extraPayload: {
            [SEPTIC_TANK_CONFIG.dataFieldName]: cleanedData,
            fileMapping: getFileMappingForPayload()
          }
        },
        recordData: deduplicatedRecordData,
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

      // 審核模式：使用 useAdminSave hook
      if (isReviewMode && reviewEntryId) {
        console.log('📝 管理員審核模式：使用 useAdminSave hook', reviewEntryId)

        // 準備完整資料集
        let completeDataSet = [...savedGroups]

        const hasEditingData = currentEditingGroup.records.some(r =>
          r.month >= 1 && r.month <= 12 && r.hours > 0
        ) || currentEditingGroup.memoryFiles.length > 0

        if (hasEditingData) {
          const targetGroupId = currentEditingGroup.groupId || generateRecordId()
          const recordsWithGroupId = currentEditingGroup.records.map(r => ({
            ...r,
            groupId: targetGroupId,
            memoryFiles: [...currentEditingGroup.memoryFiles]
          }))

          if (currentEditingGroup.groupId) {
            completeDataSet = [
              ...recordsWithGroupId,
              ...completeDataSet.filter(r => r.groupId !== currentEditingGroup.groupId)
            ]
          } else {
            completeDataSet = [...recordsWithGroupId, ...completeDataSet]
          }
        }

        const { totalHours, cleanedData } = prepareSubmissionData(completeDataSet)

        // 收集檔案（使用統一函數）
        const groupMap = groupRecordsByGroupId(completeDataSet)
        const filesToUpload = collectFilesToUpload(groupMap)

        await adminSave({
          updateData: {
            unit: SEPTIC_TANK_CONFIG.unit,
            amount: totalHours,
            payload: {
              monthly: { '1': totalHours },
              [SEPTIC_TANK_CONFIG.dataFieldName]: cleanedData,
              fileMapping: getFileMappingForPayload()
            }
          },
          files: filesToUpload
        })

        await reload()
        reloadApprovalStatus()
        setCurrentEditingGroup({ groupId: null, records: createEmptyRecords(), memoryFiles: [] })
        setSuccess('✅ 儲存成功！資料已更新')
        return
      }

      // 非審核模式
      const { totalHours, cleanedData, deduplicatedRecordData } = prepareSubmissionData(septicTankData)
      await save({
        entryInput: {
          page_key: pageKey,
          period_year: year,
          unit: SEPTIC_TANK_CONFIG.unit,
          monthly: { '1': totalHours },
          notes: `${SEPTIC_TANK_CONFIG.title}使用共 ${septicTankData.length} 筆記錄`,
          extraPayload: {
            [SEPTIC_TANK_CONFIG.dataFieldName]: cleanedData,
            fileMapping: getFileMappingForPayload()
          }
        },
        recordData: deduplicatedRecordData,
        uploadRecordFiles,
        onSuccess: async (entry_id) => {
          setCurrentEntryId(entry_id)
          await reload()
        }
      })

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
      const allFiles = [
        ...currentEditingGroup.records.flatMap(r => r.evidenceFiles || []),
        ...savedGroups.flatMap(r => r.evidenceFiles || [])
      ]
      const allMemoryFiles = [
        currentEditingGroup.memoryFiles,
        ...savedGroups.map(r => r.memoryFiles || [])
      ]

      await clear({
        filesToDelete: allFiles,
        memoryFilesToClean: allMemoryFiles
      })

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

  // 生成縮圖
  useEffect(() => {
    const generateThumbnails = async () => {
      const allFiles = [
        ...currentEditingGroup.records.flatMap(r => r.evidenceFiles || []),
        ...savedGroups.flatMap(r => r.evidenceFiles || [])
      ]

      for (const file of allFiles) {
        if (file.mime_type?.startsWith('image/') && !thumbnails[file.id]) {
          try {
            const url = await getFileUrl(file.file_path)
            setThumbnails(prev => ({
              ...prev,
              [file.id]: url
            }))
          } catch (error) {
            console.warn('Failed to generate thumbnail for', file.file_name, error)
          }
        }
      }
    }

    generateThumbnails()
  }, [currentEditingGroup.records, savedGroups, thumbnails])

  return (
    <>
      {/* 隱藏數字輸入框的上下箭頭 */}
      <style>{`
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
          category: SEPTIC_TANK_CONFIG.category,
          title: SEPTIC_TANK_CONFIG.title,
          subtitle: SEPTIC_TANK_CONFIG.subtitle,
          iconColor: SEPTIC_TANK_CONFIG.iconColor,
          categoryPosition: SEPTIC_TANK_CONFIG.categoryPosition
        }}
        statusBanner={{
          approvalStatus,
          isReviewMode,
          accentColor: SEPTIC_TANK_CONFIG.iconColor
        }}
        instructionText={SEPTIC_TANK_CONFIG.instructionText}
        bottomActionBar={{
          currentStatus,
          submitting,
          onSubmit: handleSubmit,
          onSave: handleSave,
          onClear: handleClear,
          show: !isReadOnly && !approvalStatus.isApproved && !isReviewMode,
          accentColor: SEPTIC_TANK_CONFIG.iconColor
        }}
        reviewSection={{
          isReviewMode,
          reviewEntryId,
          reviewUserId,
          currentEntryId,
          pageKey,
          year,
          category: SEPTIC_TANK_CONFIG.title,
          amount: septicTankData.reduce((sum, item) => sum + item.hours, 0),
          unit: SEPTIC_TANK_CONFIG.unit,
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
        {/* 使用數據區塊（套用模板） */}
        <SepticTankUsageSection
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
          iconColor={SEPTIC_TANK_CONFIG.iconColor}
        />

        {/* 資料列表標題 */}
        <div style={{ marginTop: '116.75px', marginLeft: '367px' }}>
          <div className="flex items-center gap-[29px]">
            {/* List Icon */}
            <div className="w-[42px] h-[42px] rounded-[10px] flex items-center justify-center flex-shrink-0" style={{ backgroundColor: SEPTIC_TANK_CONFIG.iconColor }}>
              <svg width="29" height="29" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </div>

            {/* 標題文字 */}
            <div className="flex flex-col justify-center h-[86px]">
              <h3 className="text-[28px] font-bold text-black">
                資料列表
              </h3>
            </div>
          </div>
        </div>

        {/* 月曆檢視 */}
        <SepticTankCalendarView
          savedGroups={savedGroups}
          iconColor={SEPTIC_TANK_CONFIG.iconColor}
          onEditMonth={handleEditMonth}
          isReadOnly={isReadOnly}
          approvalStatus={approvalStatus}
        />

        {/* 底部空間 */}
        <div className="h-20"></div>

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
      </SharedPageLayout>
    </>
  );
}