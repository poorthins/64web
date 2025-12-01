import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Trash2 } from 'lucide-react'
import { EvidenceFile } from '../../api/files'
import { MemoryFile } from '../../services/documentHandler'
import { EntryStatus } from '../../components/StatusSwitcher'
import { ToastType } from '../../components/Toast'
import { FileTypeIcon } from '../../components/energy/FileTypeIcon'
import { getFileType } from '../../utils/energy/fileTypeDetector'
import { useEditPermissions } from '../../hooks/useEditPermissions'
import { useApprovalStatus } from '../../hooks/useApprovalStatus'
import { useFrontendStatus } from '../../hooks/useFrontendStatus'
import { useStatusBanner } from '../../hooks/useStatusBanner'
import { useRole } from '../../hooks/useRole'
import { useAdminSave } from '../../hooks/useAdminSave'
import { useEnergyData } from '../../hooks/useEnergyData'
import { useEnergyClear } from '../../hooks/useEnergyClear'
import { useGhostFileCleaner } from '../../hooks/useGhostFileCleaner'
import { useThumbnailLoader } from '../../hooks/useThumbnailLoader'
import { useType2Helpers } from '../../hooks/useType2Helpers'
import { generateRecordId } from '../../utils/idGenerator'
import SharedPageLayout from '../../layouts/SharedPageLayout'
import ConfirmClearModal from '../../components/ConfirmClearModal'
import { FileDropzone } from '../../components/FileDropzone'
import { createMemoryFile } from '../../utils/fileUploadHelpers'
import { ImageLightbox } from '../Category1/common/ImageLightbox'
import { MobileEnergyGroupListSection } from '../Category1/common/MobileEnergyGroupListSection'
import { ElectricityBillInputFields } from './components/ElectricityBillInputFields'
import { ElectricityMeterManagementSection } from './components/ElectricityMeterManagementSection'
import { ElectricityMeter, ElectricityBillRecord, BillEditingGroup } from '../../types/electricityTypes'
import { useElectricityData } from './hooks/useElectricityData'
import { useElectricitySubmit } from './hooks/useElectricitySubmit'
import { useElectricityAdminSave } from './hooks/useElectricityAdminSave'
import { useMonthlyCalculation } from '../Category1/hooks/useMonthlyCalculation'
import { useElectricityValidation } from './hooks/useElectricityValidation'

const ElectricityBillPage = () => {
  const [searchParams] = useSearchParams()

  // 審核模式檢測
  const isReviewMode = searchParams.get('mode') === 'review'
  const reviewEntryId = searchParams.get('entryId')
  const reviewUserId = searchParams.get('userId')

  // 基本狀態
  const [error, setError] = useState<string | null>(null)
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null)
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null)

  // 表單資料
  const [year] = useState(new Date().getFullYear())
  const [meters, setMeters] = useState<ElectricityMeter[]>([])  // ⭐ 電表清單
  const [newMeterInput, setNewMeterInput] = useState('')  // ⭐ 新表號輸入

  // ⭐ Type 2 架構：分離「當前編輯」和「已保存群組」
  const createEmptyBill = (): ElectricityBillRecord => ({
    id: generateRecordId(),
    meterId: undefined,
    billingStart: '',
    billingEnd: '',
    billingUnits: 0,
    files: [],
    memoryFiles: [],
    evidenceFiles: []
  })

  const [currentEditingGroup, setCurrentEditingGroup] = useState<BillEditingGroup>({
    groupId: null,
    records: [createEmptyBill()],
    memoryFiles: []
  })

  const [savedGroups, setSavedGroups] = useState<ElectricityBillRecord[]>([])
  const [filesToDelete, setFilesToDelete] = useState<string[]>([])  // ⭐ 待刪除的檔案ID

  // 狀態管理
  const [currentEntryId, setCurrentEntryId] = useState<string | null>(null)
  const [initialStatus, setInitialStatus] = useState<EntryStatus>('submitted')
  const [hasSubmittedBefore, setHasSubmittedBefore] = useState(false)
  const [showSuccessModal, setShowSuccessModal] = useState(false)
  const [showClearModal, setShowClearModal] = useState(false)

  const pageKey = 'electricity'

  // 前端狀態管理
  const frontendStatus = useFrontendStatus({
    initialStatus,
    entryId: currentEntryId,
    onStatusChange: () => {},
    onError: (err: string) => setError(err),
    onSuccess: (msg: string) => setToast({ message: msg, type: 'success' })
  })

  const { reload: reloadApprovalStatus, ...approvalStatus } = useApprovalStatus(pageKey, year)

  // 狀態橫幅 Hook
  const banner = useStatusBanner(approvalStatus, isReviewMode)

  // 角色檢查
  const { role } = useRole()

  // 審核模式下只有管理員可編輯
  const isReadOnly = isReviewMode && role !== 'admin'

  const effectiveStatus = (approvalStatus?.status || frontendStatus?.currentStatus || initialStatus) as EntryStatus
  const editPermissions = useEditPermissions(effectiveStatus, isReadOnly, role ?? undefined)
  const { cleanFiles } = useGhostFileCleaner()

  // useEnergyClear Hook - 處理清除邏輯
  const { clear: clearEnergy, clearing } = useEnergyClear(
    currentEntryId,
    frontendStatus?.currentStatus || initialStatus
  )

  // ⭐ Type 2 Helpers
  const helpers = useType2Helpers<ElectricityBillRecord>(pageKey, year)

  // ⭐ 縮圖載入
  const thumbnails = useThumbnailLoader({
    records: savedGroups,
    fileExtractor: (record) => record.evidenceFiles || []
  })

  // ==================== Type 2 操作函式 ====================

  // 新增/編輯帳單：保存當前編輯的記錄
  const addRecordToCurrentGroup = () => {
    const { groupId, records, memoryFiles } = currentEditingGroup

    // ⭐ 審核通過後：只關閉編輯框，不儲存數據
    if (approvalStatus.isApproved) {
      setCurrentEditingGroup({
        groupId: null,
        records: [createEmptyBill()],
        memoryFiles: []
      })
      return
    }

    // 判斷是編輯模式還是新增模式
    const isEditMode = groupId !== null

    // ⭐ 過濾出完整填寫的記錄
    const validationResult = validateGroup(records)

    // 驗證失敗：顯示錯誤
    if (!validationResult.isValid) {
      setError(validationResult.error || '請填寫完整資料')
      return
    }

    // 沒有有效記錄：顯示提示
    if (validationResult.validRecords.length === 0) {
      setError('請至少填寫一筆完整的帳單資料')
      return
    }

    // 決定 groupId：編輯模式使用原 groupId，新增模式產生新 ID
    const finalGroupId = isEditMode ? groupId : generateRecordId()

    // 將 groupId 和 memoryFiles 套用到有效記錄
    const recordsWithGroupId = validationResult.validRecords.map(r => ({
      ...r,
      groupId: finalGroupId,
      memoryFiles: [...memoryFiles]
    }))

    if (isEditMode) {
      // 編輯模式：更新該群組（移除舊的，加入新的）
      setSavedGroups(prev => [
        ...recordsWithGroupId,
        ...prev.filter(r => r.groupId !== groupId)
      ])
    } else {
      // 新增模式：加入已保存列表
      setSavedGroups(prev => [...recordsWithGroupId, ...prev])
    }

    // 重置編輯區為一筆空白記錄
    setCurrentEditingGroup({
      groupId: null,
      records: [createEmptyBill()],
      memoryFiles: []
    })
  }

  // 更新編輯區的帳單欄位
  const updateCurrentGroupRecord = (id: string, field: keyof ElectricityBillRecord, value: any) => {
    setCurrentEditingGroup(prev => ({
      ...prev,
      records: prev.records.map(record =>
        record.id === id ? { ...record, [field]: value } : record
      )
    }))
  }

  // 從編輯區移除帳單
  const removeRecordFromCurrentGroup = (id: string) => {
    setCurrentEditingGroup(prev => ({
      ...prev,
      records: prev.records.filter(r => r.id !== id)
    }))
  }

  // 載入群組到編輯區
  const loadGroupToEditor = (groupId: string) => {
    const groupRecords = savedGroups.filter(r => r.groupId === groupId)
    if (groupRecords.length === 0) return

    setCurrentEditingGroup({
      groupId,
      records: groupRecords.map(r => ({ ...r })),
      memoryFiles: groupRecords[0]?.memoryFiles || []
    })

    setToast({ message: '已載入帳單群組到編輯區', type: 'info' })

    // 滾動到編輯區
    setTimeout(() => {
      document.querySelector('[data-section="bill-editing"]')?.scrollIntoView({
        behavior: 'smooth',
        block: 'start'
      })
    }, 100)
  }

  // 刪除已保存的群組
  const deleteSavedGroup = (groupId: string) => {
    setSavedGroups(prev => prev.filter(r => r.groupId !== groupId))
  }

  // 刪除佐證檔案（Type 2 架構）
  const handleDeleteEvidence = async (fileId: string) => {
    setFilesToDelete(prev => [...prev, fileId])
  }

  // 🔍 Debug: 審核狀態檢查
  useEffect(() => {
    console.log('🔍 [Electricity] Approval status debug:', {
      approvalStatus,
      isApproved: approvalStatus.isApproved,
      status: approvalStatus.status,
      effectiveStatus,
      editPermissions,
      isReviewMode
    })
  }, [approvalStatus, effectiveStatus, editPermissions, isReviewMode])

  // useEnergyData Hook - 自動載入 entry 和 files
  const entryIdToLoad = isReviewMode && reviewEntryId ? reviewEntryId : undefined
  const {
    entry: loadedEntry,
    files: loadedFiles,
    loading: dataLoading,
    error: dataError,
    reload
  } = useEnergyData(pageKey, year, entryIdToLoad)

  // 統一 loading 狀態
  const loading = dataLoading

  // ⭐ Type 2 資料載入 Hook
  useElectricityData({
    pageKey,
    loadedEntry,
    loadedFiles,
    dataLoading,
    savedGroups,
    setSavedGroups,
    setMeters,
    setInitialStatus,
    setCurrentEntryId
  })

  // ⭐ 月份計算 Hook（共用天然氣的）
  const { monthlyProgress, monthlyTotals, totalUsage, filledMonthsCount } = useMonthlyCalculation({
    savedGroups,
    year
  })

  // ⭐ Type 2 提交 Hook
  const {
    handleSubmit,
    handleSave: hookHandleSave,
    submitting,
    submitError,
    submitSuccess: submitSuccessMsg,
    setSubmitError,
    setSubmitSuccess
  } = useElectricitySubmit({
    pageKey,
    year,
    savedGroups,
    meters,
    monthlyTotals,
    filesToDelete,
    setFilesToDelete,
    setCurrentEntryId,
    reload,
    reloadApprovalStatus,
    handleSubmitSuccess: async () => {
      // ⭐ handleSubmitSuccess 會自動設置 submitSuccess
    }
  })

  // ⭐ 管理員儲存 Hook
  const {
    handleAdminSave,
    saving: adminSaving,
    error: adminError,
    success: adminSuccess,
    clearError: clearAdminError,
    clearSuccess: clearAdminSuccess
  } = useElectricityAdminSave({
    pageKey,
    year,
    reviewEntryId,
    savedGroups,
    meters,
    monthlyTotals,
    filesToDelete,
    setFilesToDelete,
    setCurrentEditingGroup,
    reload,
    reloadApprovalStatus
  })

  // ⭐ 驗證 Hook
  const {
    validateGroup,
    validateMeter,
    checkDuplicateMeter
  } = useElectricityValidation()

  // ⭐ 統一儲存函數
  const handleSave = async () => {
    if (isReviewMode && reviewEntryId) {
      await handleAdminSave()
    } else {
      await hookHandleSave()
    }
  }

  // 清除確認處理
  const handleClearConfirm = async () => {
    try {
      // 收集所有檔案（包含編輯中和已保存的）
      const allFiles = [
        ...currentEditingGroup.records.flatMap(r => r.evidenceFiles || []),
        ...savedGroups.flatMap(r => r.evidenceFiles || [])
      ]
      const allMemoryFiles = [
        ...currentEditingGroup.memoryFiles,
        ...savedGroups.flatMap(r => r.memoryFiles || [])
      ]

      // 使用 Hook 清除
      await clearEnergy({
        filesToDelete: allFiles,
        memoryFilesToClean: allMemoryFiles
      })

      // 重置前端狀態
      setCurrentEditingGroup({
        groupId: null,
        records: [createEmptyBill()],
        memoryFiles: []
      })
      setSavedGroups([])
      setMeters([])
      setNewMeterInput('')
      setShowClearModal(false)

      setToast({ message: '已清除所有資料', type: 'success' })
    } catch (err) {
      setError(err instanceof Error ? err.message : '清除失敗')
    }
  }

  // ⭐ 電表管理函式
  const addMeterFromInput = () => {
    // ⭐ 使用驗證 Hook
    const meterValidation = validateMeter(newMeterInput)
    if (!meterValidation.isValid) {
      setError(meterValidation.error || '表號驗證失敗')
      return
    }

    const trimmed = newMeterInput.trim()

    // ⭐ 使用重複檢查 Hook
    const duplicateCheck = checkDuplicateMeter(trimmed, meters)
    if (!duplicateCheck.isValid) {
      setError(duplicateCheck.error || '表號重複')
      return
    }

    const newMeter: ElectricityMeter = {
      id: generateRecordId(),
      meterNumber: trimmed
    }
    setMeters(prev => [...prev, newMeter])
    setNewMeterInput('')
  }

  const deleteMeter = (id: string) => {
    // ⭐ Type 2 架構：檢查 savedGroups 中是否有使用此表號
    const usedByBills = savedGroups.filter(b => b.meterId === id)
    if (usedByBills.length > 0) {
      setError('此表號已被帳單使用，無法刪除')
      return
    }

    setMeters(prev => prev.filter(m => m.id !== id))
  }

  return (
    <>
    {/* 隱藏數字輸入框箭頭 */}
    <style>
      {`
        .custom-number-input::-webkit-inner-spin-button,
        .custom-number-input::-webkit-outer-spin-button {
          -webkit-appearance: none;
          margin: 0;
        }
        .custom-number-input[type=number] {
          -moz-appearance: textfield;
        }
      `}
    </style>
    <SharedPageLayout
      pageHeader={{
        category: 'P',
        title: '外購電力',
        subtitle: 'Purchased Electricity',
        categoryPosition: { left: 683, top: 39 },
        iconColor: '#60B389'
      }}
      statusBanner={banner ? {
        approvalStatus,
        isReviewMode,
        accentColor: '#60B389'
      } : undefined}
      instructionText="請先建立表號清單；接著選擇表號，以上傳繳費單據、填寫帳單資料；<br />點選「＋ 新增下一筆資料」填寫下一月份數據，系統將自動計算各月份使用量。"
      bottomActionBar={{
        currentStatus: frontendStatus?.currentStatus || initialStatus,
        submitting,
        onSubmit: handleSubmit,
        onSave: handleSave,
        onClear: () => setShowClearModal(true),
        show: !isReadOnly && !approvalStatus.isApproved && !isReviewMode,
        accentColor: '#60B389'
      }}
      reviewSection={isReviewMode ? {
        isReviewMode,
        reviewEntryId,
        reviewUserId,
        currentEntryId,
        pageKey,
        year,
        category: 'P',
        amount: totalUsage,
        unit: 'kWh',
        role: role || null,
        onSave: handleSave,
        isSaving: adminSaving
      } : undefined}
      notificationState={{
        success: submitSuccessMsg || adminSuccess,
        error: error || submitError || adminError,
        clearSuccess: () => {
          setSubmitSuccess(null)
          clearAdminSuccess()
        },
        clearError: () => {
          setError(null)
          setSubmitError(null)
          clearAdminError()
        }
      }}
    >
      {/* 表號管理區塊 */}
      <ElectricityMeterManagementSection
        meters={meters}
        savedGroups={savedGroups}
        newMeterInput={newMeterInput}
        onNewMeterInputChange={setNewMeterInput}
        onAddMeter={addMeterFromInput}
        onDeleteMeter={deleteMeter}
        canEdit={editPermissions.canEdit}
        isApproved={approvalStatus.isApproved}
      />

      {/* 使用數據 - Type 2 架構 */}
      <div style={{ marginTop: '13.75px' }}>
        {/* 使用數據標題 */}
        <div data-section="bill-editing" style={{ marginTop: '103px', marginLeft: '367px' }}>
          <div className="flex items-center gap-[29px]">
            <div className="w-[42px] h-[42px] rounded-[10px] flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#60B389' }}>
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

        {/* 藍色容器框 - 上傳區 + 表單 */}
        <div style={{ marginTop: '34px' }} className="flex justify-center">
          <div
            style={{
              width: '1005px',
              minHeight: '487px',
              borderRadius: '28px',
              border: '1px solid rgba(0, 0, 0, 0.25)',
              background: '#60B389',
              padding: '27px 49px 38px 49px',
              display: 'flex',
              gap: '49px',
              alignItems: 'flex-start'
            }}
          >
            {/* 左側：檔案上傳區 */}
            <div style={{ width: '358px', flexShrink: 0, position: 'relative' }}>
              {/* 繳費單據標籤 - 與表號水平對齊 */}
              <label style={{
                position: 'absolute',
                top: '0',
                left: '0',
                color: '#000',
                fontFamily: 'Inter',
                fontSize: '20px',
                fontWeight: 400,
                lineHeight: 'normal'
              }}>
                繳費單據
              </label>

              {/* 上傳框 - 距離藍色框頂部 68px */}
              <div style={{ position: 'absolute', top: '41px', left: '0' }}>
                <FileDropzone
                  width="358px"
                  height="308px"
                  accept=".xlsx,.xls,.pdf,.jpg,.jpeg,.png,.gif,.webp,.bmp,.svg,image/*,application/pdf,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                  multiple={false}
                  onFileSelect={(files) => {
                    if (editPermissions.canEdit && !approvalStatus.isApproved) {
                      const file = files[0]
                      const memoryFile = createMemoryFile(file)
                      setCurrentEditingGroup(prev => ({
                        ...prev,
                        memoryFiles: [memoryFile]
                      }))
                    }
                  }}
                  disabled={
                    !editPermissions.canEdit ||
                    approvalStatus.isApproved ||
                    submitting ||
                    currentEditingGroup.memoryFiles.length > 0 ||
                    (currentEditingGroup.records[0]?.evidenceFiles?.length || 0) > 0
                  }
                  readOnly={!editPermissions.canEdit || approvalStatus.isApproved}
                  file={currentEditingGroup.memoryFiles[0] || null}
                  onRemove={() => {
                    setCurrentEditingGroup(prev => ({
                      ...prev,
                      memoryFiles: []
                    }))
                  }}
                  showFileActions={editPermissions.canEdit && !approvalStatus.isApproved}
                  onFileClick={(file) => {
                    if (file.preview) {
                      setLightboxSrc(file.preview)
                    }
                  }}
                  primaryText="點擊或拖放檔案暫存"
                  secondaryText="支援所有檔案格式，最大 10MB"
                />

                {/* ⭐ 已儲存的佐證檔案（可刪除） */}
                {currentEditingGroup.records[0]?.evidenceFiles && currentEditingGroup.records[0].evidenceFiles.length > 0 && (
                  <div style={{ marginTop: '19px', width: '358px' }}>
                    {currentEditingGroup.records[0].evidenceFiles.map((file) => {
                      const isImage = file.mime_type.startsWith('image/')
                      const thumbnailUrl = thumbnails[file.id]

                      return (
                        <div
                          key={file.id}
                          style={{
                            borderRadius: '28px',
                            border: '1px solid rgba(0, 0, 0, 0.25)',
                            background: '#FFF',
                            display: 'flex',
                            alignItems: 'center',
                            padding: '16px 21px',
                            gap: '12px',
                            marginBottom: '12px'
                          }}
                        >
                          {/* 檔案縮圖 */}
                          <div
                            style={{
                              width: '48px',
                              height: '48px',
                              borderRadius: '8px',
                              overflow: 'hidden',
                              flexShrink: 0,
                              cursor: isImage ? 'pointer' : 'default',
                              background: '#f0f0f0',
                              border: '1px solid rgba(0, 0, 0, 0.1)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                            onClick={() => {
                              if (isImage && thumbnailUrl) {
                                setLightboxSrc(thumbnailUrl)
                              }
                            }}
                          >
                            {isImage && thumbnailUrl ? (
                              <img
                                src={thumbnailUrl}
                                alt={file.file_name}
                                style={{
                                  width: '100%',
                                  height: '100%',
                                  objectFit: 'cover',
                                }}
                              />
                            ) : (
                              <FileTypeIcon fileType={getFileType(file.mime_type, file.file_name)} size={36} />
                            )}
                          </div>

                          {/* 檔名 */}
                          <div className="flex-1 overflow-hidden">
                            <p className="text-[14px] font-medium text-black truncate">
                              {file.file_name}
                            </p>
                            <p className="text-[12px] text-gray-500">
                              {file.file_size ? (file.file_size / 1024).toFixed(1) : '0.0'} KB
                            </p>
                          </div>

                          {/* 刪除按鈕 */}
                          {editPermissions.canEdit && !approvalStatus.isApproved && (
                            <button
                              onClick={() => {
                                // ✅ 標記檔案為待刪除
                                handleDeleteEvidence(file.id)

                                // 從 records 中移除該檔案
                                setCurrentEditingGroup(prev => ({
                                  ...prev,
                                  records: prev.records.map((r, idx) => {
                                    if (idx === 0 && r.evidenceFiles) {
                                      return {
                                        ...r,
                                        evidenceFiles: r.evidenceFiles.filter(f => f.id !== file.id)
                                      }
                                    }
                                    return r
                                  })
                                }))
                              }}
                              className="p-2 text-black hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                              title="刪除檔案"
                            >
                              <Trash2 style={{ width: '32px', height: '32px' }} />
                            </button>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* 右側：表單區域 */}
            <div style={{ flex: 1 }}>
              <ElectricityBillInputFields
                currentGroup={currentEditingGroup}
                onUpdate={updateCurrentGroupRecord}
                onDelete={removeRecordFromCurrentGroup}
                meters={meters}
                isReadOnly={isReadOnly || (approvalStatus.isApproved && !isReviewMode)}
              />
            </div>
          </div>
        </div>

        {/* 新增下一筆資料 / 儲存變更按鈕 - 在藍色框外 */}
        <div style={{ marginTop: '46px' }} className="flex justify-center">
          <button
            onClick={addRecordToCurrentGroup}
            disabled={!editPermissions.canEdit && !approvalStatus.isApproved}
            style={{
              width: '227px',
              height: '52px',
              borderRadius: '8px',
              background: '#000',
              border: 'none',
              color: '#FFF',
              fontFamily: 'Inter',
              fontSize: '20px',
              fontWeight: 400,
              cursor: (editPermissions.canEdit || approvalStatus.isApproved) ? 'pointer' : 'not-allowed',
              opacity: (editPermissions.canEdit || approvalStatus.isApproved) ? 1 : 0.5,
              transition: 'background 0.2s, opacity 0.2s'
            }}
            className="hover:opacity-80"
          >
            {currentEditingGroup.groupId ? '儲存變更' : '+ 新增下一筆資料'}
          </button>
        </div>

        {/* ⭐ Type 2 資料列表 */}
        {savedGroups.length > 0 && (
          <div style={{ marginTop: '34px' }}>
            <MobileEnergyGroupListSection
              savedGroups={savedGroups as any}
              thumbnails={thumbnails}
              isReadOnly={isReadOnly}
              approvalStatus={approvalStatus}
              isReviewMode={isReviewMode}
              onEditGroup={loadGroupToEditor}
              onDeleteGroup={deleteSavedGroup}
              onPreviewImage={(src) => setLightboxSrc(src)}
              iconColor="#60B389"
            />
          </div>
        )}
      </div>
    </SharedPageLayout>

    {/* 清除確認 Modal */}
    <ConfirmClearModal
      show={showClearModal}
      onConfirm={handleClearConfirm}
      onCancel={() => setShowClearModal(false)}
      isClearing={clearing}
    />

    {/* 圖片放大檢視 */}
    <ImageLightbox
      src={lightboxSrc}
      onClose={() => setLightboxSrc(null)}
    />
    </>
  )
}

export default ElectricityBillPage
