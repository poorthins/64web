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
import { useRole } from '../../hooks/useRole'
import { useAdminSave } from '../../hooks/useAdminSave'
import { submitEnergyEntry } from '../../api/v2/entryAPI'
import { generateRecordId } from '../../utils/idGenerator';
import { LAYOUT_CONSTANTS } from './common/mobileEnergyConstants'
import { SEPTIC_TANK_CONFIG } from './common/mobileEnergyConfig'
import { ImageLightbox } from './common/ImageLightbox'
import { SepticTankUsageSection, SepticTankRecord, SepticTankCurrentEditingGroup } from './common/SepticTankUsageSection'
import { SepticTankCalendarView } from './common/SepticTankCalendarView'
import { useThumbnailLoader } from '../../hooks/useThumbnailLoader'
import { useType2Helpers } from '../../hooks/useType2Helpers'
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

// ⭐ 準備提交資料的輔助函數（簡化版）
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

  return {
    totalHours,
    cleanedData
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

  // 資料載入 Hook
  const entryIdToLoad = isReviewMode && reviewEntryId ? reviewEntryId : undefined
  const {
    entry: loadedEntry,
    files: loadedFiles,
    loading: dataLoading,
    error: dataError,
    reload
  } = useEnergyData(pageKey, year, entryIdToLoad)

  // 審核狀態 Hook（必須在 isReadOnly 之前）
  const { reload: reloadApprovalStatus, ...approvalStatus } = useApprovalStatus(pageKey, year)

  // 審核模式下只有管理員可編輯
  // ⭐ 唯讀條件：審核通過 OR 審核模式（非管理員）
  const isReadOnly =
    approvalStatus.isApproved ||  // 審核通過後唯讀
    (isReviewMode && role !== 'admin')  // 審核模式（非管理員）唯讀

  const editPermissions = useEditPermissions(currentStatus, isReadOnly, role ?? undefined)

  // 管理員儲存 Hook
  const { save: adminSave } = useAdminSave(pageKey, reviewEntryId)

  // 獨立狀態（替代 useMultiRecordSubmit）
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null)
  const [filesToDelete, setFilesToDelete] = useState<string[]>([])

  // 清除 Hook
  const {
    clear,
    clearing: clearLoading
  } = useEnergyClear(currentEntryId, currentStatus)

  // 幽靈檔案清理 Hook
  const { cleanFiles } = useGhostFileCleaner()

  // ⭐ 新架構：分離「當前編輯」和「已保存群組」
  const [currentEditingGroup, setCurrentEditingGroup] = useState<SepticTankCurrentEditingGroup>({
    groupId: null,
    records: createEmptyRecords(),
    memoryFiles: []
  })

  // 已保存的群組
  const [savedGroups, setSavedGroups] = useState<SepticTankRecord[]>([])

  // 縮圖載入（使用統一 hook，Type 2：從群組中提取 evidenceFiles）
  // ⭐ 合併 savedGroups 和 currentEditingGroup 的記錄以載入所有縮圖
  const allRecordsForThumbnails = useMemo(() => {
    const editingRecords = currentEditingGroup.groupId !== null ? currentEditingGroup.records : []
    return [...savedGroups, ...editingRecords]
  }, [savedGroups, currentEditingGroup.groupId, currentEditingGroup.records])

  const thumbnails = useThumbnailLoader({
    records: allRecordsForThumbnails,
    fileExtractor: (record) => record.evidenceFiles || []
  })

  // ⭐ Type 2 共用輔助函數
  const helpers = useType2Helpers<SepticTankRecord>(pageKey, year)

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
            groupId: item.groupId || generateRecordId(), // ⭐ 自動生成缺失的 groupId
            evidenceFiles: [],
            memoryFiles: [],
          }))

          // 載入到 savedGroups
          setSavedGroups(updated)
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadedEntry, dataLoading])

  // 第二步：檔案載入後分配到記錄
  useEffect(() => {
    if (dataLoading || loadedFiles.length === 0) {
      return
    }

    const processFiles = async () => {
      if (savedGroups.length > 0) {
        const usageFiles = loadedFiles.filter(f =>
          f.file_type === 'other' && f.page_key === pageKey
        )

        if (usageFiles.length > 0) {
          const validFiles = await cleanFiles(usageFiles)

          setSavedGroups(prev =>
            prev.map(item => {
              // ⭐ Type 2 關鍵：支援新舊兩種格式
              // - 新版：record_ids (JSON 陣列)
              // - 舊版：record_id (逗號分隔字串)
              const filesForThisRecord = validFiles.filter(f => {
                // 優先使用新版 record_ids 陣列
                if (f.record_ids && Array.isArray(f.record_ids)) {
                  return f.record_ids.includes(item.id)
                }

                // 回退到舊版 record_id 字串
                if (f.record_id) {
                  const recordIds = f.record_id.split(',').map(id => id.trim())
                  return recordIds.includes(item.id)
                }

                return false
              })

              return {
                ...item,
                evidenceFiles: filesForThisRecord
                // ⚠️ 不要清除 memoryFiles！
              }
            })
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

      // ⭐ 修改：允許 hours = 0（只要不是 null/undefined）
      const hasValidData = records.some(r =>
        r.month >= 1 && r.month <= 12 && r.hours !== null && r.hours !== undefined
      )
      if (!hasValidData) {
        setError('請至少填寫一筆有效數據（月份和工時）')
        return
      }
    }

    const targetGroupId = isEditMode ? groupId : generateRecordId()

    // ⭐ 修改：過濾出有效記錄（月份有效且 hours 不是 null/undefined）
    const validRecords = records.filter(r =>
      r.month >= 1 && r.month <= 12 && r.hours !== null && r.hours !== undefined
    )

    // 將 groupId 和 memoryFiles 套用到有效記錄
    const recordsWithGroupId = validRecords.map(r => ({
      ...r,
      groupId: targetGroupId,
      memoryFiles: [...memoryFiles]
    }))

    // ⭐ 方案 B：自動覆蓋重複的月份
    // ⭐ 修改：收集所有有效月份（包括 hours = 0）
    const monthsToSave = recordsWithGroupId
      .filter(r => r.month >= 1 && r.month <= 12)
      .map(r => r.month)

    // 判斷是否保留舊記錄
    const shouldKeepRecord = (r: SepticTankRecord): boolean => {
      // ⭐ 修正：只刪除當前編輯的群組的記錄
      // 其他群組的記錄保留（即使月份相同也允許，因為不同設施可以有相同月份）
      if (r.groupId === targetGroupId) return false

      // 其他群組保留
      return true
    }

    setSavedGroups(prev => {
      const filtered = prev.filter(shouldKeepRecord)
      return [...recordsWithGroupId, ...filtered]
    })

    // 不顯示通知（只是前端內存操作）

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
    setSavedGroups(prev => prev.filter(r => r.groupId !== groupId))
    // 不顯示通知（只是前端內存操作）
  }

  // 記錄要刪除的檔案 ID（編輯模式刪除舊檔案）
  const handleDeleteEvidence = (fileId: string) => {
    setFilesToDelete(prev => [...prev, fileId])
  }

  // ⭐ 統一提交函數（提交和暫存）
  const submitData = async (isDraft: boolean) => {
    if (savedGroups.length === 0) {
      throw new Error('請至少新增一個群組')
    }

    await executeSubmit(async () => {
      setSubmitError(null)
      setSubmitSuccess(null)

      try {
        const { totalHours, cleanedData } = prepareSubmissionData(savedGroups)

        const response = await submitEnergyEntry({
          page_key: 'septic_tank',
          period_year: year,
          unit: SEPTIC_TANK_CONFIG.unit,
          monthly: { '1': totalHours },
          status: isDraft ? 'saved' : 'submitted',
          notes: `${SEPTIC_TANK_CONFIG.title}使用共 ${savedGroups.length} 筆記錄`,
          payload: {
            septicTankData: cleanedData
          }
        })

        const groupsMap = helpers.buildGroupsMap(savedGroups)
        await helpers.uploadGroupFiles(groupsMap, response.entry_id)

        setCurrentEntryId(response.entry_id)
        setSubmitSuccess(isDraft ? '暫存成功' : '提交成功')

        // ⭐ 修正：先刪除標記的檔案，再 reload（避免新舊並存）
        await helpers.deleteMarkedFiles(filesToDelete, setFilesToDelete)
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
    // 審核模式：使用 useAdminSave hook
    if (isReviewMode && reviewEntryId) {
      await executeSubmit(async () => {
        setSubmitError(null)
        setSubmitSuccess(null)

        // ⭐ 先同步編輯區修改
        const finalSavedGroups = helpers.syncEditingGroupChanges(currentEditingGroup, savedGroups, setSavedGroups)
        const { totalHours, cleanedData } = prepareSubmissionData(finalSavedGroups)
        const filesToUpload = helpers.collectAdminFilesToUpload(finalSavedGroups)

        await adminSave({
          updateData: {
            unit: SEPTIC_TANK_CONFIG.unit,
            amount: totalHours,
            payload: {
              monthly: { '1': totalHours },
              septicTankData: cleanedData
            }
          },
          files: filesToUpload
        })

        // ⭐ 修正：先刪除標記的檔案，再 reload（避免新舊並存）
        await helpers.deleteMarkedFilesAsAdmin(filesToDelete, setFilesToDelete)
        await reload()
        reloadApprovalStatus()
        setCurrentEditingGroup({ groupId: null, records: createEmptyRecords(), memoryFiles: [] })
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
          onDeleteEvidence={handleDeleteEvidence}
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
      </SharedPageLayout>
    </>
  );
}