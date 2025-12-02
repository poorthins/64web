import { useState, useEffect, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { EvidenceFile, getEntryFiles } from '../../api/files'
import { MemoryFile } from '../../services/documentHandler'
import { EntryStatus } from '../../components/StatusSwitcher'
import { ToastType } from '../../components/Toast'
import { useEditPermissions } from '../../hooks/useEditPermissions'
import { useApprovalStatus } from '../../hooks/useApprovalStatus'
import { useFrontendStatus } from '../../hooks/useFrontendStatus'
import { useStatusBanner } from '../../hooks/useStatusBanner'
import { useRole } from '../../hooks/useRole'
import { useEnergyData } from '../../hooks/useEnergyData'
import { useEnergySubmit } from '../../hooks/useEnergySubmit'
import { useEnergyClear } from '../../hooks/useEnergyClear'
import { useGhostFileCleaner } from '../../hooks/useGhostFileCleaner'
import { useThumbnailLoader } from '../../hooks/useThumbnailLoader'
import { useReviewMode } from '../../hooks/useReviewMode'
import { useSubmitGuard } from '../../hooks/useSubmitGuard'
import { upsertEnergyEntry, UpsertEntryInput, getEntryByPageKeyAndYear, deleteEnergyEntry } from '../../api/entries'
import { submitEnergyEntry } from '../../api/v2/entryAPI'
import { designTokens } from '../../utils/designTokens'
import { generateRecordId } from '../../utils/idGenerator'
import SharedPageLayout from '../../layouts/SharedPageLayout'
import ConfirmClearModal from '../../components/ConfirmClearModal'
import { ImageLightbox } from './common/ImageLightbox'
import { MeterManagementSection } from './components/MeterManagementSection'
import { HeatValueSection } from './components/HeatValueSection'
import { NaturalGasBillSection } from './components/NaturalGasBillSection'
import { HeatValue, NaturalGasMeter, NaturalGasBill, NaturalGasBillRecord, BillEditingGroup, HeatValueEditingState } from '../../types/naturalGasTypes'
import { calculateBillingDays, getDaysInMonth, parseROCDate, validateRocDate, rocToISO, isoToROC, rocToDate } from '../../utils/bill/dateCalculations'
import { calculateMonthlyDistribution } from '../../utils/bill/monthlyDistribution'
import { useNaturalGasData } from './hooks/useNaturalGasData'
import { useNaturalGasSubmit } from './hooks/useNaturalGasSubmit'
import { useMonthlyCalculation } from './hooks/useMonthlyCalculation'
import { useNaturalGasValidation } from './hooks/useNaturalGasValidation'
import { useNaturalGasHeatValue } from './hooks/useNaturalGasHeatValue'
import { useNaturalGasMeter } from './hooks/useNaturalGasMeter'
import { useNaturalGasAdminSave } from './hooks/useNaturalGasAdminSave'

const NaturalGasPage = () => {
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
  const [heatValue, setHeatValue] = useState(9000)
  const [meters, setMeters] = useState<NaturalGasMeter[]>([])  // ⭐ 天然氣錶清單
  const [newMeterInput, setNewMeterInput] = useState('')  // ⭐ 新錶號輸入

  // ⭐ Type 2 架構：分離「當前編輯」和「已保存群組」
  const createEmptyBill = (): NaturalGasBillRecord => ({
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

  const [savedGroups, setSavedGroups] = useState<NaturalGasBillRecord[]>([])

  // 狀態管理
  const [currentEntryId, setCurrentEntryId] = useState<string | null>(null)
  const [initialStatus, setInitialStatus] = useState<EntryStatus>('submitted')
  const [hasSubmittedBefore, setHasSubmittedBefore] = useState(false)
  const [showSuccessModal, setShowSuccessModal] = useState(false)
  const [showClearModal, setShowClearModal] = useState(false)
  const [filesToDelete, setFilesToDelete] = useState<string[]>([])  // ⭐ 待刪除檔案

  // ⭐ Type 2 架構：低位熱值臨時編輯狀態
  const [currentEditingHeatValue, setCurrentEditingHeatValue] = useState<HeatValueEditingState>({
    month: 1,  // 預設選擇 1 月
    value: 0,
    memoryFiles: [],
    evidenceFiles: []
  })

  // ⭐ 已暫存的月度熱值（點「儲存」後的數據）
  const [monthlyHeatValues, setMonthlyHeatValues] = useState<Record<number, number>>({})  // 各月熱值
  const [monthlyHeatValueFiles, setMonthlyHeatValueFiles] = useState<Record<number, EvidenceFile[]>>({})  // 各月已上傳檔案
  const [monthlyHeatValueMemoryFiles, setMonthlyHeatValueMemoryFiles] = useState<Record<number, MemoryFile[]>>({})  // 各月暫存檔案
  const [showMonthPicker, setShowMonthPicker] = useState(false)  // 月份選擇器顯示狀態

  const pageKey = 'natural_gas'

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

  // ⭐ 縮圖載入
  const thumbnails = useThumbnailLoader({
    records: savedGroups,
    fileExtractor: (record) => record.evidenceFiles || []
  })

  // ==================== Type 2 操作函式 ====================

  // ⭐ 低位熱值操作函式

  // 選擇月份（載入該月數據到編輯區，如果已填寫則載入；否則清空）
  const handleSelectMonth = (month: number) => {
    const existingValue = monthlyHeatValues[month]
    const existingMemoryFiles = monthlyHeatValueMemoryFiles[month] || []
    const existingEvidenceFiles = monthlyHeatValueFiles[month] || []  // ✅ 載入已上傳的檔案

    setCurrentEditingHeatValue({
      month,
      value: existingValue || 0,
      memoryFiles: existingMemoryFiles,
      evidenceFiles: existingEvidenceFiles  // ✅ 編輯模式時顯示已存在檔案
    })

    setShowMonthPicker(false)
  }

  // 儲存低位熱值到已暫存狀態 / 關閉查看框（審核通過後）
  const handleSaveHeatValueToState = () => {
    const { month, value, memoryFiles } = currentEditingHeatValue

    if (month === null) {
      setError('請選擇月份')
      return
    }

    // ⭐ 審核通過後：只關閉編輯框，不儲存數據
    if (approvalStatus.isApproved) {
      setCurrentEditingHeatValue({
        month: 1,
        value: 0,
        memoryFiles: [],
        evidenceFiles: []
      })
      return
    }

    // 驗證：熱值必須填寫
    if (!value || value === 0) {
      setError('請填寫低位熱值')
      return
    }

    // 判斷是新增還是編輯
    const isEdit = monthlyHeatValues[month] !== undefined

    // 儲存到已暫存狀態
    setMonthlyHeatValues(prev => ({
      ...prev,
      [month]: value
    }))

    setMonthlyHeatValueMemoryFiles(prev => ({
      ...prev,
      [month]: memoryFiles
    }))

    // 重置編輯區（保持月份選擇，清空數值和檔案）
    setCurrentEditingHeatValue({
      month,
      value: 0,
      memoryFiles: [],
      evidenceFiles: []
    })

    setToast({
      message: isEdit ? '已更新' : '已暫存',
      type: 'success'
    })
  }

  // 編輯已填月份（從進度表點鉛筆）
  const handleEditHeatValueMonth = (month: number) => {
    handleSelectMonth(month)
  }

  // ⭐ 帳單操作函式

  // 新增/編輯帳單：保存當前編輯的記錄
  const addRecordToCurrentGroup = () => {
    const { groupId, records, memoryFiles } = currentEditingGroup

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
  const updateCurrentGroupRecord = (id: string, field: keyof NaturalGasBillRecord, value: any) => {
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
      records: groupRecords.map(r => ({ ...r })),  // ⭐ 保留所有欄位（memoryFiles + evidenceFiles）
      memoryFiles: groupRecords[0]?.memoryFiles || []  // ⭐ 載入群組級別的 memoryFiles
    })

    setToast({ message: '已載入帳單群組到編輯區', type: 'info' })
  }

  // 刪除已保存的群組
  const deleteSavedGroup = (groupId: string) => {
    setSavedGroups(prev => prev.filter(r => r.groupId !== groupId))
  }

  // 刪除佐證檔案（Type 2 架構）
  const handleDeleteEvidence = async (fileId: string) => {
    setFilesToDelete(prev => [...prev, fileId])
  }

  // ⭐ 統一儲存函數
  const handleSave = async () => {
    if (isReviewMode && reviewEntryId) {
      await handleAdminSave()
    } else {
      await hookHandleSave()
    }
  }

  // 🔍 Debug: 審核狀態檢查
  useEffect(() => {
    console.log('🔍 [NaturalGas] Approval status debug:', {
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

  // useEnergyClear Hook - 處理清除邏輯
  const { clear: clearEnergy, clearing } = useEnergyClear(
    currentEntryId,
    frontendStatus?.currentStatus || initialStatus
  )

  // ⭐ Type 2 資料載入 Hook
  useNaturalGasData({
    pageKey,
    loadedEntry,
    loadedFiles,
    dataLoading,
    savedGroups,
    setSavedGroups,
    setMeters,
    setHeatValue,
    setMonthlyHeatValues,  // ⭐ 新增
    setHeatValueFiles: setMonthlyHeatValueFiles,  // ⭐ 改用月度版本
    setInitialStatus,
    setCurrentEntryId
    // setCurrentStatus 是可選的，暫時省略
  })

  // ⭐ 月份計算 Hook
  const { monthlyProgress, monthlyTotals, totalUsage, filledMonthsCount } = useMonthlyCalculation({
    savedGroups,
    year
  })

  // ⭐ 管理員儲存 Hook
  const {
    handleAdminSave,
    saving: adminSaving,
    error: adminError,
    success: adminSuccess,
    clearError: clearAdminError,
    clearSuccess: clearAdminSuccess
  } = useNaturalGasAdminSave({
    pageKey,
    year,
    reviewEntryId,
    savedGroups,
    meters,
    heatValue,
    monthlyHeatValues,
    monthlyHeatValueFiles,
    monthlyHeatValueMemoryFiles,
    monthlyTotals,
    filesToDelete,
    setFilesToDelete,
    setCurrentEditingGroup,
    setMonthlyHeatValueMemoryFiles,
    setCurrentEditingHeatValue,
    reload,
    reloadApprovalStatus
  })

  // ⭐ Type 2 提交 Hook
  const {
    handleSubmit,
    handleSave: hookHandleSave,  // ⭐ 重命名，稍後覆蓋
    submitting,
    submitError,
    submitSuccess: submitSuccessMsg,
    setSubmitError,
    setSubmitSuccess
  } = useNaturalGasSubmit({
    pageKey,
    year,
    savedGroups,
    meters,
    heatValue,
    monthlyHeatValues,  // ⭐ 傳遞月度熱值
    heatValueFiles: monthlyHeatValueFiles,  // ⭐ 改用月度版本
    heatValueMemoryFiles: monthlyHeatValueMemoryFiles,  // ⭐ 改用月度版本
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

  // ⭐ 驗證 Hook
  const {
    validateGroup,
    validateMeter,
    checkDuplicateMeter
  } = useNaturalGasValidation()

  // ⭐ 天然氣錶管理函式
  const addMeterFromInput = () => {
    // ⭐ 使用驗證 Hook
    const meterValidation = validateMeter(newMeterInput)
    if (!meterValidation.isValid) {
      setError(meterValidation.error || '錶號驗證失敗')
      return
    }

    const trimmed = newMeterInput.trim()

    // ⭐ 使用重複檢查 Hook
    const duplicateCheck = checkDuplicateMeter(trimmed, meters)
    if (!duplicateCheck.isValid) {
      setError(duplicateCheck.error || '錶號重複')
      return
    }

    const newMeter: NaturalGasMeter = {
      id: generateRecordId(),
      meterNumber: trimmed
    }
    setMeters(prev => [...prev, newMeter])
    setNewMeterInput('')
  }

  const deleteMeter = (id: string) => {
    // ⭐ Type 2 架構：檢查 savedGroups 中是否有使用此錶號
    const usedByBills = savedGroups.filter(b => b.meterId === id)
    if (usedByBills.length > 0) {
      setError('此錶號已被帳單使用，無法刪除')
      return
    }

    setMeters(prev => prev.filter(m => m.id !== id))
  }

  // ⚠️ 舊的驗證/提交/清除邏輯已被 useNaturalGasSubmit hook 取代，這些函式已刪除
  // - validateData() → 移至 useNaturalGasValidation hook
  // - handleSubmit() → useNaturalGasSubmit.handleSubmit()
  // - handleSave() → useNaturalGasSubmit.handleSave()

  // ⭐ Type 2 清除邏輯
  const handleClearConfirm = async () => {
    try {
      // 收集所有檔案（包含編輯中和已保存的）
      const allFiles = [
        ...currentEditingGroup.records.flatMap(r => r.evidenceFiles || []),
        ...savedGroups.flatMap(r => r.evidenceFiles || []),
        ...Object.values(monthlyHeatValueFiles).flat()  // ⭐ 月度熱值檔案
      ]
      const allMemoryFiles = [
        ...currentEditingGroup.memoryFiles,  // ✅ 展開陣列
        ...savedGroups.flatMap(r => r.memoryFiles || []),  // ✅ 使用 flatMap
        ...currentEditingHeatValue.memoryFiles,  // ✅ 展開陣列
        ...Object.values(monthlyHeatValueMemoryFiles).flat()  // ⭐ 月度暫存熱值檔案
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

      // ⭐ 重置低位熱值相關狀態
      setCurrentEditingHeatValue({
        month: 1,
        value: 0,
        memoryFiles: [],
        evidenceFiles: []
      })
      setMonthlyHeatValues({})
      setMonthlyHeatValueFiles({})
      setMonthlyHeatValueMemoryFiles({})

      setCurrentEntryId(null)
      setShowClearModal(false)
    } catch (err) {
      console.error('清除失敗:', err)
      setError('清除失敗，請重試')
    }
  }

  // ⚠️ 舊的資料載入 useEffect 已被 useNaturalGasData hook 取代（Line 272-286）

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
        category: 'N',
        title: '天然氣',
        subtitle: 'Natural Gas',
        categoryPosition: { left: 720, top: 39 },
        iconColor: '#49A1C7'
      }}
      statusBanner={banner ? {
        approvalStatus,
        isReviewMode,
        accentColor: '#49A1C7'
      } : undefined}
      instructionText="請輸入各月份低位熱值並上傳熱值報表；可於填寫進度表中點選「        」修改資料；建立表號清單後，上傳繳費<br />單據並填寫天然氣帳單資訊；點選「＋ 新增下一筆資料」以填寫下一月份數據，系統將自動計算各月份使用量。"
      bottomActionBar={{
        currentStatus: frontendStatus?.currentStatus || initialStatus,
        submitting,
        onSubmit: handleSubmit, // 來自 useNaturalGasSubmit hook
        onSave: handleSave, // 來自 useNaturalGasSubmit hook
        onClear: () => setShowClearModal(true), // TODO: 實作 Type 2 清除
        show: !isReadOnly && !approvalStatus.isApproved && !isReviewMode,
        accentColor: '#49A1C7'
      }}
      reviewSection={isReviewMode ? {
        isReviewMode,
        reviewEntryId,
        reviewUserId,
        currentEntryId,
        pageKey,
        year,
        category: 'N',
        amount: totalUsage,
        unit: 'm³',
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
      {/* 低位熱值編輯區 */}
      <HeatValueSection
        monthlyHeatValues={monthlyHeatValues}
        monthlyHeatValueFiles={monthlyHeatValueFiles}
        monthlyHeatValueMemoryFiles={monthlyHeatValueMemoryFiles}
        currentEditingHeatValue={currentEditingHeatValue}
        showMonthPicker={showMonthPicker}
        canEdit={editPermissions.canEdit}
        isApproved={approvalStatus.isApproved}
        onSelectMonth={handleSelectMonth}
        onEditHeatValueMonth={handleEditHeatValueMonth}
        onSaveHeatValue={handleSaveHeatValueToState}
        onToggleMonthPicker={setShowMonthPicker}
        onHeatValueChange={(value) => {
          setCurrentEditingHeatValue(prev => ({
            ...prev,
            value
          }))
        }}
        onMemoryFilesChange={(month, files) => {
          setCurrentEditingHeatValue(prev => ({
            ...prev,
            memoryFiles: files
          }))
        }}
        onFilesChange={(month, files) => {
          setCurrentEditingHeatValue(prev => ({
            ...prev,
            evidenceFiles: files
          }))
          setMonthlyHeatValueFiles(prev => ({
            ...prev,
            [month]: files
          }))
        }}
        onDeleteEvidence={handleDeleteEvidence}
        onError={setError}
        onLightboxOpen={setLightboxSrc}
      />

      {/* 錶號管理區塊 */}
      <MeterManagementSection
        meters={meters}
        savedGroups={savedGroups}
        newMeterInput={newMeterInput}
        onNewMeterInputChange={setNewMeterInput}
        onAddMeter={addMeterFromInput}
        onDeleteMeter={deleteMeter}
        canEdit={editPermissions.canEdit}
        isApproved={approvalStatus.isApproved}
      />

      {/* 帳單編輯區 */}
      <NaturalGasBillSection
        currentEditingGroup={currentEditingGroup}
        setCurrentEditingGroup={setCurrentEditingGroup}
        savedGroups={savedGroups}
        meters={meters}
        canEdit={editPermissions.canEdit}
        isApproved={approvalStatus.isApproved}
        submitting={submitting}
        isReadOnly={isReadOnly}
        onUpdateRecord={updateCurrentGroupRecord}
        onDeleteRecord={removeRecordFromCurrentGroup}
        onAddRecord={addRecordToCurrentGroup}
        onEditGroup={loadGroupToEditor}
        onDeleteGroup={deleteSavedGroup}
        onDeleteEvidence={handleDeleteEvidence}
        onPreviewImage={(src) => setLightboxSrc(src)}
        approvalStatus={approvalStatus}
        thumbnails={thumbnails}
      />
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

export default NaturalGasPage
