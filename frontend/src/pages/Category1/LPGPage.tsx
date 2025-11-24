import { useState, useEffect, useMemo, useRef } from 'react';
import { EntryStatus } from '../../components/StatusSwitcher';
import ConfirmClearModal from '../../components/ConfirmClearModal'
import SharedPageLayout from '../../layouts/SharedPageLayout'
import { useFrontendStatus } from '../../hooks/useFrontendStatus';
import { useApprovalStatus } from '../../hooks/useApprovalStatus';
import { useReviewMode } from '../../hooks/useReviewMode'
import { useEnergyData } from '../../hooks/useEnergyData'
import { useEnergyClear } from '../../hooks/useEnergyClear'
import { useSubmitGuard } from '../../hooks/useSubmitGuard'
import { useGhostFileCleaner } from '../../hooks/useGhostFileCleaner'
import { useRole } from '../../hooks/useRole'
import { useAdminSave } from '../../hooks/useAdminSave'
import { generateRecordId } from '../../utils/idGenerator';
import { MobileEnergyRecord } from './common/mobileEnergyTypes'
import { createEmptyRecords } from './common/mobileEnergyUtils'
import { LPG_CONFIG } from './common/mobileEnergyConfig'
import { MobileEnergyGroupListSection } from './common/MobileEnergyGroupListSection'
import { ImageLightbox } from './common/ImageLightbox'
import { useThumbnailLoader } from '../../hooks/useThumbnailLoader'
import type { MemoryFile } from '../../services/documentHandler';
import { useLPGSpecManager } from './hooks/useLPGSpecManager'
import { LPGSpecInputFields } from './components/LPGSpecInputFields'
import { LPGSpecListSection } from './components/LPGSpecListSection'
import { LPGUsageInputFields } from './components/LPGUsageInputFields'
import { useType3Helpers } from '../../hooks/useType3Helpers'
import { submitEnergyEntry } from '../../api/v2/entryAPI'

export default function LPGPage() {
  // 審核模式檢測
  const { isReviewMode, reviewEntryId, reviewUserId } = useReviewMode()

  const pageKey = LPG_CONFIG.pageKey
  const [year] = useState(new Date().getFullYear())
  const [initialStatus, setInitialStatus] = useState<EntryStatus>('submitted')
  const [currentEntryId, setCurrentEntryId] = useState<string | null>(null)
  const { executeSubmit, submitting } = useSubmitGuard()
  const [showClearConfirmModal, setShowClearConfirmModal] = useState(false)

  // 圖片放大 lightbox
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);

  // 本地通知狀態
  const [error, setError] = useState<string | null>(null);
  const [adminSuccess, setAdminSuccess] = useState<string | null>(null);

  // 資料列表區 ref（用於自動滾動）
  const dataListRef = useRef<HTMLDivElement>(null);

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

  // 審核狀態 Hook
  const { reload: reloadApprovalStatus, ...approvalStatus } = useApprovalStatus(pageKey, year)

  // 審核模式下只有管理員可編輯，或已通過審核則所有人唯讀
  const isReadOnly = (isReviewMode && role !== 'admin') || approvalStatus.isApproved

  // 資料載入 Hook
  const entryIdToLoad = isReviewMode && reviewEntryId ? reviewEntryId : undefined
  const {
    entry: loadedEntry,
    files: loadedFiles,
    loading: dataLoading,
    reload
  } = useEnergyData(pageKey, year, entryIdToLoad)

  // 管理員儲存 Hook
  const { save: adminSave } = useAdminSave(pageKey, reviewEntryId)

  // 清除 Hook
  const {
    clear,
    clearing: clearLoading
  } = useEnergyClear(currentEntryId, currentStatus)

  // 幽靈檔案清理 Hook
  const { cleanFiles } = useGhostFileCleaner()

  // ⭐ Type 3 輔助函數 Hook
  const type3Helpers = useType3Helpers<
    { id: string; name: string; memoryFiles?: MemoryFile[] },
    MobileEnergyRecord
  >(pageKey, year)

  // 本地提交狀態（取代舊的 useMultiRecordSubmit）
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null)

  // ⭐ 規格管理 Hook
  const {
    savedSpecs,
    setSavedSpecs,
    currentEditingSpec,
    editingSpecId,
    updateCurrentSpec,
    saveCurrentSpec,
    editSpec,
    deleteSpec,
    cancelEdit
  } = useLPGSpecManager()

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

  // 縮圖載入（LPG：合併規格 + 使用記錄）
  const allRecordsForThumbnails = useMemo(() => {
    return [...savedSpecs, ...savedGroups]
  }, [savedSpecs, savedGroups])

  const thumbnails = useThumbnailLoader({
    records: allRecordsForThumbnails,
    fileExtractor: (record) => record.evidenceFiles || []
  })


  // ==================== 載入邏輯 ====================

  // 第一步：載入記錄資料
  useEffect(() => {
    if (loadedEntry && !dataLoading) {
      const entryStatus = loadedEntry.status as EntryStatus
      setInitialStatus(entryStatus)
      setCurrentEntryId(loadedEntry.id)
      setCurrentStatus(entryStatus)

      // 載入規格資料
      if (loadedEntry.payload?.lpgData?.specs) {
        const specs = loadedEntry.payload.lpgData.specs.map((item: any) => ({
          ...item,
          id: String(item.id),
          evidenceFiles: [],
          memoryFiles: []
        }))
        setSavedSpecs(specs)
      }

      // 載入使用記錄
      if (loadedEntry.payload?.lpgData?.usageRecords) {
        const records = loadedEntry.payload.lpgData.usageRecords.map((item: any) => ({
          ...item,
          id: String(item.id || generateRecordId()),
          evidenceFiles: [],
          memoryFiles: [],
        }))
        setSavedGroups(records)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadedEntry, dataLoading])

  // 第二步：檔案載入後分配到記錄
  useEffect(() => {
    if (dataLoading) return

    if (loadedFiles.length > 0) {
      const lpgFiles = loadedFiles.filter(f =>
        f.file_type === 'other' && f.page_key === pageKey
      )

      if (lpgFiles.length > 0) {
        const cleanAndAssignFiles = async () => {
          const validFiles = await cleanFiles(lpgFiles)

          // 分配規格佐證（直接過濾）
          setSavedSpecs(prev => prev.map(spec => ({
            ...spec,
            evidenceFiles: validFiles.filter(f => f.record_id === spec.id)
          })))

          // 分配使用佐證（支援 comma-separated IDs）
          setSavedGroups(prev => prev.map(record => {
            const recordFiles = validFiles.filter(f => {
              const ids = f.record_id?.split(',') || []
              return ids.includes(record.id)
            })
            return { ...record, evidenceFiles: recordFiles }
          }))
        }

        cleanAndAssignFiles()
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadedFiles, pageKey, dataLoading])

  // ==================== 規格管理邏輯 ====================

  const handleSaveSpec = () => {
    // 唯讀模式：直接清空編輯區，不執行任何驗證
    if (isReadOnly && editingSpecId) {
      cancelEdit()
      return
    }

    try {
      saveCurrentSpec()
    } catch (error: any) {
      setError(error.message)
    }
  }

  const handleEditSpec = (id: string) => {
    editSpec(id)
  }

  const handleDeleteSpec = (id: string) => {
    // 檢查是否有使用記錄
    const hasUsageRecords = savedGroups.some(r => r.specId === id)

    if (hasUsageRecords) {
      setError('此品項已有使用記錄，無法刪除')
      return
    }

    deleteSpec(id)
    // 不需要 removeRecordMapping - 檔案會在清除時一併處理
  }

  // ==================== 使用記錄管理邏輯 ====================

  const addRecordToCurrentGroup = () => {
    setCurrentEditingGroup(prev => ({
      ...prev,
      records: [...prev.records, {
        id: generateRecordId(),
        date: '',
        quantity: 0,
        specId: '',
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

  // ⭐ 清除當前群組的佐證資料（memoryFiles + evidenceFiles）
  const clearCurrentGroupEvidence = () => {
    setCurrentEditingGroup(prev => ({
      ...prev,
      memoryFiles: [],
      records: prev.records.map(r => ({
        ...r,
        evidenceFiles: []
      }))
    }))
  }

  const saveCurrentGroup = () => {
    const { groupId, records, memoryFiles } = currentEditingGroup

    // 唯讀模式：直接還原資料到列表，不執行任何驗證
    if (isReadOnly && groupId) {
      setSavedGroups(prev => {
        const otherRecords = prev.filter(r => r.groupId !== groupId)
        return [...otherRecords, ...records]
      })
      setCurrentEditingGroup({
        groupId: null,
        records: createEmptyRecords(),
        memoryFiles: []
      })
      return
    }

    // ✅ 驗證 1：必須先建立規格
    if (savedSpecs.length === 0) {
      setError('請先建立品項後再填寫使用數據')
      return
    }

    const isEditMode = groupId !== null

    // 過濾出有效記錄
    const validRecords = records.filter(r =>
      r.date.trim() !== '' || r.quantity > 0 || r.specId
    )

    // ✅ 只在新增模式驗證
    if (!isEditMode) {
      if (validRecords.length === 0) {
        setError('請至少填寫一筆有效數據')
        return
      }

      // ✅ 驗證 2：有資料的記錄必須選擇規格
      const hasInvalidRecords = validRecords.some(r => !r.specId)
      if (hasInvalidRecords) {
        setError('請為每筆記錄選擇品項')
        return
      }
    }

    const targetGroupId = isEditMode ? groupId : generateRecordId()

    // 只保存有效記錄
    const updatedRecords = validRecords.map(record => ({
      ...record,
      groupId: targetGroupId,
      memoryFiles: [...memoryFiles]
    }))

    if (isEditMode) {
      // 編輯模式：更新群組
      setSavedGroups(prev => {
        const otherRecords = prev.filter(r => r.groupId !== targetGroupId)
        return [...otherRecords, ...updatedRecords]
      })
    } else {
      // 新增模式：加入群組
      setSavedGroups(prev => [...prev, ...updatedRecords])
    }

    // 清空編輯區
    setCurrentEditingGroup({
      groupId: null,
      records: createEmptyRecords(),
      memoryFiles: []
    })

    // 不顯示通知（只是前端內存操作）
  }

  const editGroup = (groupId: string) => {
    const groupRecords = savedGroups.filter(r => r.groupId === groupId)
    const firstRecord = groupRecords[0]

    setCurrentEditingGroup({
      groupId,
      records: groupRecords.map(r => ({
        ...r,
        memoryFiles: []
      })),
      memoryFiles: firstRecord?.memoryFiles || []
    })

    setSavedGroups(prev => prev.filter(r => r.groupId !== groupId))
  }

  const deleteGroup = (groupId: string) => {
    setSavedGroups(prev => prev.filter(r => r.groupId !== groupId))
    // 不需要 removeRecordMapping - 檔案會在清除時一併處理
  }

  // ==================== 提交邏輯 ====================

  const submitData = async (status: 'submitted' | 'saved') => {
    try {
      // 驗證規格存在
      type3Helpers.validateSpecsExist(savedSpecs)

      // 驗證使用記錄有對應規格
      type3Helpers.validateUsageRecordsHaveSpec(savedGroups)

      // 建立群組映射
      const groupsMap = type3Helpers.buildGroupsMap(savedGroups)

      // 計算總量
      const totalQuantity = savedGroups.reduce((sum, r) => sum + r.quantity, 0)

      // 準備 payload
      const payload = {
        monthly: { '1': totalQuantity },
        lpgData: {
          specs: savedSpecs.map(s => ({ id: s.id, name: s.name })),
          usageRecords: Array.from(groupsMap.values()).flat().map(r => ({
            id: r.id,
            date: r.date,
            quantity: r.quantity,
            specId: r.specId,
            groupId: r.groupId
          }))
        }
      }

      // 提交 entry
      const { entry_id } = await submitEnergyEntry({
        page_key: pageKey,
        period_year: year,
        unit: LPG_CONFIG.unit,
        monthly: payload.monthly,
        notes: `${LPG_CONFIG.title}使用共 ${savedGroups.length} 筆記錄`,
        extraPayload: payload,
        status
      })

      // 上傳規格檔案
      await type3Helpers.uploadSpecFiles(savedSpecs, entry_id)

      // 上傳使用記錄檔案
      await type3Helpers.uploadGroupFiles(groupsMap, entry_id)

      setCurrentEntryId(entry_id)
      await reload()
      reloadApprovalStatus()

      return {
        success: true,
        message: status === 'submitted' ? '提交成功' : '暫存成功'
      }
    } catch (err: any) {
      throw new Error(err.message || `${status === 'submitted' ? '提交' : '暫存'}失敗`)
    }
  }

  const handleSubmit = async () => {
    await executeSubmit(async () => {
      const result = await submitData('submitted')
      setSubmitSuccess(result.message)
      await handleSubmitSuccess()
    }).catch(error => {
      setSubmitError(error instanceof Error ? error.message : '提交失敗，請重試')
    })
  }

  const handleSave = async () => {
    await executeSubmit(async () => {
      setSubmitError(null)

      // 管理員審核模式的特殊處理
      if (isReviewMode && reviewEntryId) {
        const groupsMap = type3Helpers.buildGroupsMap(savedGroups)
        const totalQuantity = savedGroups.reduce((sum, r) => sum + r.quantity, 0)

        const payload = {
          monthly: { '1': totalQuantity },
          lpgData: {
            specs: savedSpecs.map(s => ({ id: s.id, name: s.name })),
            usageRecords: Array.from(groupsMap.values()).flat().map(r => ({
              id: r.id,
              date: r.date,
              quantity: r.quantity,
              specId: r.specId,
              groupId: r.groupId
            }))
          }
        }

        // 收集管理員檔案
        const files = [
          // 規格檔案
          ...savedSpecs.flatMap(spec =>
            spec.memoryFiles?.filter(mf => mf.file && mf.file.size > 0).map(mf => ({
              file: mf.file,
              metadata: { recordId: spec.id, allRecordIds: [spec.id] }
            })) || []
          ),
          // 使用記錄檔案
          ...type3Helpers.collectAdminFilesToUpload(savedGroups)
        ]

        await adminSave({
          updateData: {
            unit: LPG_CONFIG.unit,
            amount: totalQuantity,
            payload
          },
          files
        })

        await reload()
        reloadApprovalStatus()
        setCurrentEditingGroup(prev => ({ ...prev, memoryFiles: [] }))
        setAdminSuccess('儲存成功')
        return
      }

      // 一般暫存
      const result = await submitData('saved')
      setSubmitSuccess(result.message)
      reloadApprovalStatus()
    }).catch(error => {
      console.error('❌ 暫存失敗:', error)
      setSubmitError(error instanceof Error ? error.message : '暫存失敗')
    })
  }

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
    } catch (error) {
      setError(error instanceof Error ? error.message : '清除失敗，請重試')
    }
  };

  // ⭐ 不需要 evidenceGroups，直接傳 savedGroups 給 MobileEnergyGroupListSection

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
          category: LPG_CONFIG.category,
          title: LPG_CONFIG.title,
          subtitle: LPG_CONFIG.subtitle,
          iconColor: LPG_CONFIG.iconColor,
          categoryPosition: LPG_CONFIG.categoryPosition
        }}
        statusBanner={{
          approvalStatus,
          isReviewMode,
          accentColor: LPG_CONFIG.iconColor
        }}
        instructionText={LPG_CONFIG.instructionText}
        bottomActionBar={{
          currentStatus,
          submitting,
          onSubmit: handleSubmit,
          onSave: handleSave,
          onClear: handleClear,
          show: !isReadOnly && !approvalStatus.isApproved && !isReviewMode,
          accentColor: LPG_CONFIG.iconColor
        }}
        reviewSection={{
          isReviewMode,
          reviewEntryId,
          reviewUserId,
          currentEntryId,
          pageKey,
          year,
          category: LPG_CONFIG.title,
          amount: savedGroups.reduce((sum, item) => sum + item.quantity, 0),
          unit: LPG_CONFIG.unit,
          role,
          onSave: handleSave,
          isSaving: submitting
        }}
        notificationState={{
          success: submitSuccess || adminSuccess,
          error: submitError || error,
          clearSuccess: () => {
            setSubmitSuccess(null)
            setAdminSuccess(null)
          },
          clearError: () => {
            setSubmitError(null)
            setError(null)
          }
        }}
      >
        {/* ==================== 區塊 1：規格設定 ==================== */}
        <LPGSpecInputFields
          spec={currentEditingSpec}
          onFieldChange={updateCurrentSpec}
          onSave={handleSaveSpec}
          editingSpecId={editingSpecId}
          isReadOnly={isReadOnly}
          thumbnails={thumbnails}
          onImageClick={(src) => setLightboxSrc(src)}
        />

        {/* ==================== 區塊 2：規格列表 ==================== */}
        <LPGSpecListSection
          specs={savedSpecs}
          thumbnails={thumbnails}
          onEdit={handleEditSpec}
          onDelete={handleDeleteSpec}
          onImageClick={(src) => setLightboxSrc(src)}
          isReadOnly={isReadOnly}
        />

        {/* ==================== 區塊 3：使用數據 ==================== */}
        <div style={{ marginTop: '116.75px', marginLeft: '367px' }}>
          <div className="flex items-center gap-[29px]">
            <div className="w-[42px] h-[42px] rounded-[10px] flex items-center justify-center flex-shrink-0" style={{ backgroundColor: LPG_CONFIG.iconColor }}>
              <svg xmlns="http://www.w3.org/2000/svg" width="29" height="29" viewBox="0 0 29 29" fill="none">
                <path d="M25.375 6.04163C25.375 8.04366 20.5061 9.66663 14.5 9.66663C8.4939 9.66663 3.625 8.04366 3.625 6.04163M25.375 6.04163C25.375 4.03959 20.5061 2.41663 14.5 2.41663C8.4939 2.41663 3.625 4.03959 3.625 6.04163M25.375 6.04163V22.9583C25.375 24.9641 20.5417 26.5833 14.5 26.5833C8.45833 26.5833 3.625 24.9641 3.625 22.9583V6.04163M25.375 14.5C25.375 16.5058 20.5417 18.125 14.5 18.125C8.45833 18.125 3.625 16.5058 3.625 14.5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <div className="flex flex-col justify-center h-[86px]">
              <h3 className="text-[28px] font-bold text-black">
                使用數據
              </h3>
            </div>
          </div>
        </div>

        <LPGUsageInputFields
          currentGroup={currentEditingGroup}
          onUpdate={updateCurrentGroupRecord}
          onUpdateSpecId={updateCurrentGroupSpecId}
          onDelete={removeRecordFromCurrentGroup}
          onAddRecord={addRecordToCurrentGroup}
          onFileChange={(files) => setCurrentEditingGroup(prev => ({ ...prev, memoryFiles: files }))}
          onRemoveEvidence={clearCurrentGroupEvidence}
          specs={savedSpecs}
          isReadOnly={isReadOnly}
          thumbnails={thumbnails}
          onImageClick={(src) => setLightboxSrc(src)}
        />

        {/* 新增群組按鈕 */}
        <div className="flex justify-center" style={{ marginTop: '46px' }}>
          <button
            onClick={saveCurrentGroup}
            disabled={submitting}
            style={{
              width: '237px',
              height: '46.25px',
              flexShrink: 0,
              borderRadius: '7px',
              border: '1px solid rgba(0, 0, 0, 0.50)',
              background: submitting ? '#9CA3AF' : '#000',
              boxShadow: '0 4px 4px 0 rgba(0, 0, 0, 0.25)',
              cursor: submitting ? 'not-allowed' : 'pointer',
              color: '#FFF',
              textAlign: 'center',
              fontFamily: 'var(--sds-typography-body-font-family)',
              fontSize: '20px',
              fontStyle: 'normal',
              fontWeight: 'var(--sds-typography-body-font-weight-regular)',
              lineHeight: '100%'
            }}
          >
            {currentEditingGroup.groupId ? '儲存變更' : '+ 新增群組'}
          </button>
        </div>

        {/* ==================== 區塊 4：資料列表 ==================== */}
        <div ref={dataListRef}>
          <MobileEnergyGroupListSection
            savedGroups={savedGroups}
            thumbnails={thumbnails}
            isReadOnly={isReadOnly}
            approvalStatus={approvalStatus}
            isReviewMode={isReviewMode}
            onEditGroup={editGroup}
            onDeleteGroup={deleteGroup}
            onPreviewImage={(src) => setLightboxSrc(src)}
            iconColor={LPG_CONFIG.iconColor}
          />
        </div>
      </SharedPageLayout>

      {/* 圖片 Lightbox */}
      <ImageLightbox
        src={lightboxSrc}
        onClose={() => setLightboxSrc(null)}
      />

      {/* 清除確認 Modal */}
      <ConfirmClearModal
        show={showClearConfirmModal}
        onCancel={() => setShowClearConfirmModal(false)}
        onConfirm={handleClearConfirm}
        isClearing={clearLoading}
      />
    </>
  )
}