import { useState, useEffect, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Trash2 } from 'lucide-react'
import { EvidenceFile, getEntryFiles } from '../../api/files'
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
import MonthlyProgressGrid, { MonthStatus } from '../../components/MonthlyProgressGrid'
import SharedPageLayout from '../../layouts/SharedPageLayout'
import ConfirmClearModal from '../../components/ConfirmClearModal'
import { FileDropzone } from '../../components/FileDropzone'
import { createMemoryFile } from '../../utils/fileUploadHelpers'
import { ImageLightbox } from './common/ImageLightbox'
import { MobileEnergyUsageSection } from './common/MobileEnergyUsageSection'
import { MobileEnergyGroupListSection } from './common/MobileEnergyGroupListSection'
import { NaturalGasBillInputFields } from './components/NaturalGasBillInputFields'
import { MonthlyHeatValueGrid } from './components/MonthlyHeatValueGrid'
import { MonthlyHeatValueInput } from './components/MonthlyHeatValueInput'
import { HeatValueReportUpload } from './components/HeatValueReportUpload'
import { MeterManagementSection } from './components/MeterManagementSection'
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
      {/* 低位熱值填寫進度 */}
      <div style={{ marginTop: '103px', marginLeft: '367px' }}>
        <div className="flex items-center gap-[29px]">
          <div className="w-[42px] h-[42px] rounded-[10px] flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#49A1C7' }}>
            <svg xmlns="http://www.w3.org/2000/svg" width="31" height="31" viewBox="0 0 31 31" fill="none">
              <path d="M15.4999 28.4167C22.6336 28.4167 28.4166 22.6337 28.4166 15.5C28.4166 8.36636 22.6336 2.58337 15.4999 2.58337C8.36624 2.58337 2.58325 8.36636 2.58325 15.5C2.58325 22.6337 8.36624 28.4167 15.4999 28.4167Z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M15.4999 23.25C19.7801 23.25 23.2499 19.7802 23.2499 15.5C23.2499 11.2198 19.7801 7.75004 15.4999 7.75004C11.2197 7.75004 7.74992 11.2198 7.74992 15.5C7.74992 19.7802 11.2197 23.25 15.4999 23.25Z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M15.4999 18.0834C16.9267 18.0834 18.0833 16.9268 18.0833 15.5C18.0833 14.0733 16.9267 12.9167 15.4999 12.9167C14.0732 12.9167 12.9166 14.0733 12.9166 15.5C12.9166 16.9268 14.0732 18.0834 15.4999 18.0834Z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <div className="flex flex-col justify-center h-[86px]">
            <h3 className="text-[28px] font-bold text-black">
              低位熱值填寫進度
            </h3>
          </div>
        </div>
      </div>

      {/* 月曆檢視 - 完全照抄化糞池樣式 */}
      <div style={{ marginTop: '34px', marginBottom: '32px' }}>
        {/* 整個月曆區域 - 包含顏色說明和網格，一起置中 */}
        <div className="flex justify-center">
          <div>
            {/* 顏色說明區 - 在月份框框往上28px處，靠左對齊月曆 */}
            {/* 月度低位熱值進度表格 */}
            <MonthlyHeatValueGrid
              monthlyHeatValues={monthlyHeatValues}
              monthlyHeatValueFiles={monthlyHeatValueFiles}
              monthlyHeatValueMemoryFiles={monthlyHeatValueMemoryFiles}
              canEdit={editPermissions.canEdit}
              isApproved={approvalStatus.isApproved}
              onEdit={handleEditHeatValueMonth}
            />
          </div>
        </div>
      </div>

      {/* 低位熱值標題 */}
      <div data-section="heat-value" style={{ marginTop: '103px', marginLeft: '367px' }}>
        <div className="flex items-center gap-[29px]">
          <div className="w-[42px] h-[42px] rounded-[10px] flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#49A1C7' }}>
            <svg xmlns="http://www.w3.org/2000/svg" width="29" height="29" viewBox="0 0 29 29" fill="none">
              <path d="M25.375 6.04175C25.375 8.04378 20.5061 9.66675 14.5 9.66675C8.4939 9.66675 3.625 8.04378 3.625 6.04175M25.375 6.04175C25.375 4.03972 20.5061 2.41675 14.5 2.41675C8.4939 2.41675 3.625 4.03972 3.625 6.04175M25.375 6.04175V22.9584C25.375 24.9642 20.5417 26.5834 14.5 26.5834C8.45833 26.5834 3.625 24.9642 3.625 22.9584V6.04175M25.375 14.5001C25.375 16.5059 20.5417 18.1251 14.5 18.1251C8.45833 18.1251 3.625 16.5059 3.625 14.5001" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <div className="flex flex-col justify-center h-[86px]">
            <h3 className="text-[28px] font-bold text-black">
              低位熱值
            </h3>
          </div>
        </div>
      </div>

      {/* 填寫框 - Type 3 樣式 */}
      <div className="flex justify-center" style={{ marginTop: '39px' }}>
        <div
          style={{
            width: '1005px',
            minHeight: '520px',
            flexShrink: 0,
            borderRadius: '37px',
            background: '#49A1C7',
            paddingTop: '27px',
            paddingLeft: '49px',
            paddingRight: '49px',
            paddingBottom: '45px'
          }}
        >
          {/* ⭐ 月份與低位熱值區域 - 左右並排 */}
          <MonthlyHeatValueInput
            selectedMonth={currentEditingHeatValue.month || 1}
            onMonthChange={handleSelectMonth}
            showMonthPicker={showMonthPicker}
            onToggleMonthPicker={setShowMonthPicker}
            heatValue={currentEditingHeatValue.value}
            onHeatValueChange={(value) => {
              setCurrentEditingHeatValue(prev => ({
                ...prev,
                value
              }))
            }}
            canEdit={editPermissions.canEdit}
            isApproved={approvalStatus.isApproved}
          />

          {/* 熱值報表上傳 */}
          <HeatValueReportUpload
            selectedMonth={currentEditingHeatValue.month || 1}
            monthlyMemoryFiles={{
              [currentEditingHeatValue.month || 1]: currentEditingHeatValue.memoryFiles
            }}
            monthlyFiles={{
              ...monthlyHeatValueFiles,
              [currentEditingHeatValue.month || 1]: currentEditingHeatValue.evidenceFiles || []  // ✅ 編輯模式顯示已載入的檔案
            }}
            onMemoryFilesChange={(month, files) => {
              setCurrentEditingHeatValue(prev => ({
                ...prev,
                memoryFiles: files
              }))
            }}
            onFilesChange={(month, files) => {
              // ✅ 同時更新編輯狀態和全局狀態
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
            canEdit={editPermissions.canEdit}
            isApproved={approvalStatus.isApproved}
          />
        </div>
      </div>

      {/* ⭐ 儲存低位熱值按鈕 / 關閉查看框按鈕（審核通過後） */}
      <div style={{ marginTop: '46px' }} className="flex justify-center">
        <button
          onClick={handleSaveHeatValueToState}
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
          {currentEditingHeatValue.month && monthlyHeatValues[currentEditingHeatValue.month] !== undefined ? '變更儲存' : '儲存'}
        </button>
      </div>

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

      {/* 使用數據 - Type 2 架構 */}
      <div style={{ marginTop: '13.75px' }}>
        {/* 使用數據標題 */}
        <div data-section="bill-editing" style={{ marginTop: '103px', marginLeft: '367px' }}>
          <div className="flex items-center gap-[29px]">
            <div className="w-[42px] h-[42px] rounded-[10px] flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#49A1C7' }}>
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
              background: '#49A1C7',
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
              <NaturalGasBillInputFields
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
            disabled={!editPermissions.canEdit || approvalStatus.isApproved || submitting}
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
              cursor: editPermissions.canEdit && !approvalStatus.isApproved && !submitting ? 'pointer' : 'not-allowed',
              opacity: editPermissions.canEdit && !approvalStatus.isApproved && !submitting ? 1 : 0.5,
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
              onEditGroup={loadGroupToEditor}
              onDeleteGroup={deleteSavedGroup}
              onPreviewImage={(src) => setLightboxSrc(src)}
              iconColor="#49A1C7"
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

export default NaturalGasPage
