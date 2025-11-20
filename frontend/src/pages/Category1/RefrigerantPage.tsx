import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom'
import SharedPageLayout from '../../layouts/SharedPageLayout'
import ConfirmClearModal from '../../components/ConfirmClearModal'
import SuccessModal from '../../components/SuccessModal'
import { EntryStatus } from '../../components/StatusSwitcher';
import { ImageLightbox } from './shared/mobile/components/ImageLightbox'
import Toast from '../../components/Toast';
import { useFrontendStatus } from '../../hooks/useFrontendStatus';
import { useApprovalStatus } from '../../hooks/useApprovalStatus';
import { useReviewMode } from '../../hooks/useReviewMode';
import { useEnergyData } from '../../hooks/useEnergyData'
import { useEnergyClear } from '../../hooks/useEnergyClear'
import { useRole } from '../../hooks/useRole'
import { useAdminSave } from '../../hooks/useAdminSave'
import type { AdminSaveParams } from '../../hooks/useAdminSave'
import { getFileUrl, adminDeleteEvidence } from '../../api/files';
import { submitEnergyEntry } from '../../api/v2/entryAPI';
import { uploadEvidenceFile } from '../../api/v2/fileAPI';
import { RefrigerantInputFields } from './components/RefrigerantInputFields'
import { RefrigerantListSection } from './components/RefrigerantListSection'
import { generateRecordId } from '../../utils/idGenerator'
import { calculateTotalWeightInKg } from '../../utils/unitConversions'
import type { MemoryFile } from '../../components/FileDropzone'
import type { EvidenceFile } from '../../api/files'

export interface RefrigerantDevice {
  id: string
  brandModel: string
  equipmentType: string
  equipmentLocation: string
  refrigerantType: string
  fillAmount: number
  unit: 'gram' | 'kg'
  memoryFiles: MemoryFile[]
  evidenceFiles?: EvidenceFile[]
}

const createEmptyDevice = (): RefrigerantDevice => ({
  id: generateRecordId(),
  brandModel: '',
  equipmentType: '',
  equipmentLocation: '',
  refrigerantType: '',
  fillAmount: 0,
  unit: 'kg',
  memoryFiles: []
})

export default function RefrigerantPage() {
  const [searchParams] = useSearchParams()

  // 審核模式檢測
  const { isReviewMode } = useReviewMode()
  const reviewEntryId = searchParams.get('entryId')
  const reviewUserId = searchParams.get('userId')

  const pageKey = 'refrigerant'
  const [year] = useState(new Date().getFullYear())
  const [initialStatus, setInitialStatus] = useState<EntryStatus>('submitted')
  const [currentEntryId, setCurrentEntryId] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  // 圖片放大 lightbox
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null)

  // 設備管理狀態
  const [savedDevices, setSavedDevices] = useState<RefrigerantDevice[]>([])
  const [currentEditingDevice, setCurrentEditingDevice] = useState<RefrigerantDevice>(createEmptyDevice())
  const [editingDeviceId, setEditingDeviceId] = useState<string | null>(null)

  // 更新當前編輯設備的欄位
  const updateCurrentDevice = (field: keyof RefrigerantDevice, value: any) => {
    setCurrentEditingDevice(prev => ({ ...prev, [field]: value }))
  }

  // 保存當前設備
  const saveCurrentDevice = () => {
    const device = currentEditingDevice

    // 驗證：至少要有一個欄位有值
    const hasValidData =
      device.brandModel.trim() !== '' ||
      device.equipmentLocation.trim() !== '' ||
      device.refrigerantType.trim() !== '' ||
      device.fillAmount > 0

    if (!hasValidData) {
      throw new Error('請至少填寫一個欄位')
    }

    const isEditMode = editingDeviceId !== null

    if (isEditMode) {
      // 編輯模式：更新設備
      setSavedDevices(prev => prev.map(d =>
        d.id === editingDeviceId ? device : d
      ))
    } else {
      // 新增模式：加入設備
      setSavedDevices(prev => [...prev, device])
    }

    // 清空編輯區
    setEditingDeviceId(null)
    setCurrentEditingDevice(createEmptyDevice())

    return isEditMode ? '設備已更新' : '設備已新增'
  }

  // 載入設備到編輯區
  const editDevice = (id: string) => {
    const device = savedDevices.find(d => d.id === id)
    if (!device) return

    setCurrentEditingDevice(device)
    setEditingDeviceId(id)
    return '設備已載入到編輯區'
  }

  // 刪除設備
  const deleteDevice = (id: string) => {
    setSavedDevices(prev => prev.filter(d => d.id !== id))
    return '設備已刪除'
  }

  // 通知狀態
  const [localError, setLocalError] = useState<string | null>(null)
  const [localSuccess, setLocalSuccess] = useState<string | null>(null)
  const [showClearConfirmModal, setShowClearConfirmModal] = useState(false)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setLightboxSrc(null) }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const frontendStatus = useFrontendStatus({
    initialStatus,
    entryId: currentEntryId
  })

  const { currentStatus, setCurrentStatus, handleDataChanged, handleSubmitSuccess, isInitialLoad } = frontendStatus

  // 角色檢查 Hook
  const { role } = useRole()

  // 審核狀態 Hook（需要提前，因為 isReadOnly 依賴它）
  const { reload: reloadApprovalStatus, ...approvalStatus } = useApprovalStatus(pageKey, year)

  const isReadOnly = approvalStatus.isApproved || (isReviewMode && role !== 'admin')

  // 管理員審核儲存 Hook
  const { save: adminSave } = useAdminSave(pageKey, reviewEntryId)

  // 資料載入 Hook
  const entryIdToLoad = isReviewMode && reviewEntryId ? reviewEntryId : undefined
  const {
    entry: loadedEntry,
    files: loadedFiles,
    loading: dataLoading,
    reload
  } = useEnergyData(pageKey, year, entryIdToLoad)

  const {
    clear,
    clearing: clearLoading
  } = useEnergyClear(currentEntryId, currentStatus)

  // 提交狀態管理
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null)

  // 縮圖管理（用於圖片預覽）
  const [thumbnails, setThumbnails] = useState<Record<string, string>>({})

  // 展開/收合狀態管理
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set())

  // 載入資料
  useEffect(() => {
    if (loadedEntry && !dataLoading) {
      const entryStatus = loadedEntry.status as EntryStatus
      setInitialStatus(entryStatus)
      setCurrentStatus(entryStatus)
      setCurrentEntryId(loadedEntry.id)

      // 從 payload 取得冷媒設備資料
      if (loadedEntry.payload?.refrigerantData) {
        const updated = loadedEntry.payload.refrigerantData.map((item: any) => ({
          ...item,
          id: String(item.id),
          evidenceFiles: [],
          memoryFiles: []
        }))

        setSavedDevices(updated)
      }

      if (!isInitialLoad.current) {
        handleDataChanged()
      }
      isInitialLoad.current = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadedEntry, dataLoading])

  // 檔案載入後分配到設備
  useEffect(() => {
    if (dataLoading) return

    if (loadedFiles.length > 0 && savedDevices.length > 0) {
      const refrigerantFiles = loadedFiles.filter(f =>
        f.file_type === 'other' && f.page_key === pageKey
      )

      if (refrigerantFiles.length > 0) {
        setSavedDevices(prev => {
          return prev.map((device) => {
            const recordFiles = refrigerantFiles.filter(f => f.record_id === device.id)
            return {
              ...device,
              evidenceFiles: recordFiles
            }
          })
        })
      }
    }
  }, [loadedFiles, pageKey, dataLoading, savedDevices.length])

  // ⭐ 生成縮圖（只為圖片檔案）
  useEffect(() => {
    savedDevices.forEach(async (device) => {
      const evidenceFile = device.evidenceFiles?.[0]
      if (evidenceFile && evidenceFile.mime_type.startsWith('image/') && !thumbnails[evidenceFile.id]) {
        try {
          const url = await getFileUrl(evidenceFile.file_path)
          setThumbnails(prev => ({
            ...prev,
            [evidenceFile.id]: url
          }))
        } catch {
          // Silently ignore thumbnail errors
        }
      }
    })
  }, [savedDevices, thumbnails])

  // 初始化時展開所有分組
  useEffect(() => {
    if (savedDevices.length > 0) {
      const allTypes = new Set(savedDevices.map(d => d.equipmentType || '未分類'))
      setExpandedGroups(allTypes)
    }
  }, [savedDevices.length])

  // 切換展開狀態
  const toggleGroup = (equipmentType: string) => {
    setExpandedGroups(prev => {
      const next = new Set(prev)
      if (next.has(equipmentType)) {
        next.delete(equipmentType)
      } else {
        next.add(equipmentType)
      }
      return next
    })
  }

  // 高階函數：統一處理通知的包裝器
  const withNotification = <T extends any[]>(
    fn: (...args: T) => string | undefined
  ) => (...args: T) => {
    try {
      const message = fn(...args)
      if (message) setLocalSuccess(message)
    } catch (error) {
      setLocalError(error instanceof Error ? error.message : '操作失敗')
    }
  }

  const handleSaveDevice = withNotification(saveCurrentDevice)
  const handleEditDevice = withNotification(editDevice)
  const handleDeleteDevice = withNotification(deleteDevice)

  // 提取乾淨的設備資料（去除 memoryFiles 和 evidenceFiles）
  const prepareCleanedData = (devices: RefrigerantDevice[]) => {
    return devices.map(r => ({
      id: r.id,
      brandModel: r.brandModel,
      equipmentType: r.equipmentType,
      equipmentLocation: r.equipmentLocation,
      refrigerantType: r.refrigerantType,
      fillAmount: r.fillAmount,
      unit: r.unit
    }))
  }

  // 統一提交函數（提交和暫存）
  const submitData = async (isDraft: boolean) => {
    if (savedDevices.length === 0) {
      throw new Error('請至少新增一個設備')
    }

    setSubmitting(true)
    try {
      const totalFillAmount = calculateTotalWeightInKg(savedDevices)
      const cleanedData = prepareCleanedData(savedDevices)

      // 1. 提交 entry
      const response = await submitEnergyEntry({
        page_key: pageKey,
        period_year: year,
        unit: 'kg',
        monthly: { '1': totalFillAmount },  // Type 1 不需要月份資料，給預設值
        status: isDraft ? 'saved' : 'submitted',
        notes: `冷媒設備共 ${savedDevices.length} 台`,
        payload: {
          refrigerantData: cleanedData
        }
      })

      // 2. 上傳檔案
      for (const device of savedDevices) {
        if (device.memoryFiles?.length > 0) {
          for (const file of device.memoryFiles) {
            await uploadEvidenceFile(file.file, {
              page_key: pageKey,
              period_year: year,
              file_type: 'other',
              entry_id: response.entry_id,
              record_id: device.id,
              standard: '64'
            })
          }
        }
      }

      setCurrentEntryId(response.entry_id)
      setSubmitSuccess(isDraft ? '暫存成功' : '提交成功')

      await reload()

      // 只有「提交」才需要更新狀態為 submitted
      if (!isDraft) {
        await handleSubmitSuccess()
      }

      reloadApprovalStatus()
    } finally {
      setSubmitting(false)
    }
  }

  const handleSubmit = async () => {
    try {
      await submitData(false)
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : '提交失敗')
    }
  }

  // 收集要上傳和刪除的檔案
  const collectFilesForAdminSave = () => {
    const filesToUpload: AdminSaveParams['files'] = []
    const filesToDelete: string[] = []

    savedDevices.forEach((record, index) => {
      if (record.memoryFiles && record.memoryFiles.length > 0) {
        record.memoryFiles.forEach(mf => {
          filesToUpload.push({
            file: mf.file,
            metadata: {
              recordIndex: index,
              fileType: 'other' as const,
              recordId: record.id
            }
          })
        })

        const oldFiles = loadedFiles.filter(f =>
          f.record_id === record.id && f.file_type === 'other'
        )
        oldFiles.forEach(f => filesToDelete.push(f.id))
      }
    })

    return { filesToUpload, filesToDelete }
  }

  // 刪除舊檔案
  const deleteOldFiles = async (fileIds: string[]) => {
    if (fileIds.length > 0) {
      for (const fileId of fileIds) {
        try {
          await adminDeleteEvidence(fileId)
        } catch {
          // Continue on error
        }
      }
    }
  }

  const handleSave = async () => {
    // 管理員審核模式
    if (isReviewMode && reviewEntryId) {
      setSubmitting(true)
      try {
        const totalFillAmount = calculateTotalWeightInKg(savedDevices)
        const cleanedData = prepareCleanedData(savedDevices)
        const { filesToUpload, filesToDelete } = collectFilesForAdminSave()

        await deleteOldFiles(filesToDelete)

        await adminSave({
          updateData: {
            unit: 'kg',
            amount: totalFillAmount,
            payload: {
              refrigerantData: cleanedData
            }
          },
          files: filesToUpload
        })

        await reload()
        reloadApprovalStatus()
        setSubmitSuccess('管理員儲存成功')
      } finally {
        setSubmitting(false)
      }
      return
    }

    // 一般暫存
    await submitData(true)
  }

  const handleClear = () => {
    setShowClearConfirmModal(true);
  };

  const handleClearConfirm = async () => {
    try {
      const allFiles = savedDevices.flatMap(r => r.evidenceFiles || [])
      const allMemoryFiles = savedDevices.map(r => r.memoryFiles || [])

      await clear({
        filesToDelete: allFiles,
        memoryFilesToClean: allMemoryFiles
      })

      setSavedDevices([])
      setCurrentEntryId(null)
      setShowClearConfirmModal(false)
      setLocalSuccess('資料已完全清除')
    } catch (error) {
      setLocalError(error instanceof Error ? error.message : '清除失敗，請重試')
    }
  }

  return (
    <SharedPageLayout
      pageHeader={{
        category: "R",
        title: "冷媒",
        subtitle: "Refrigerant",
        categoryPosition: { left: 753, top: 39 },
        iconColor: "#6197C5"
      }}
      statusBanner={{
        approvalStatus,
        isReviewMode
      }}
      instructionText="請填寫設備資訊，並上傳設備銘牌照片作為佐證，完成後請點選「+ 新增設備」，填寫至所有設備資料皆登錄完成。<br />系統會自動將資料彙整至下方列表，若列表項目顯示為綠色，表示該筆資料尚未完整，請點選「編輯」進行確認與補充。"
      bottomActionBar={{
        currentStatus,
        submitting,
        onSubmit: handleSubmit,
        onSave: handleSave,
        onClear: handleClear,
        show: !isReadOnly && !approvalStatus.isApproved && !isReviewMode,
        customNotifications: true  // 由頁面自己處理通知，不要母版自動顯示
      }}
      reviewSection={{
        isReviewMode,
        reviewEntryId,
        reviewUserId,
        currentEntryId,
        pageKey,
        year,
        category: "冷媒",
        amount: calculateTotalWeightInKg(savedDevices),
        unit: "kg",
        role,
        onSave: handleSave,
        isSaving: submitting
      }}
      notificationState={{
        success: submitSuccess,
        error: submitError,
        clearSuccess: () => setSubmitSuccess(null),
        clearError: () => setSubmitError(null)
      }}
    >
      {/* 輸入欄位組件（含保存按鈕） */}
      <RefrigerantInputFields
        device={currentEditingDevice}
        onFieldChange={updateCurrentDevice}
        onSave={handleSaveDevice}
        editingDeviceId={editingDeviceId}
        isReadOnly={isReadOnly}
        thumbnails={thumbnails}
        onImageClick={setLightboxSrc}
      />

      {/* 設備列表組件 */}
      <RefrigerantListSection
        devices={savedDevices}
        expandedGroups={expandedGroups}
        thumbnails={thumbnails}
        onToggleGroup={toggleGroup}
        onEdit={handleEditDevice}
        onDelete={handleDeleteDevice}
        onImageClick={setLightboxSrc}
        isReadOnly={isReadOnly}
      />

      {/* 清除確認彈窗 */}
      <ConfirmClearModal
        show={showClearConfirmModal}
        onConfirm={handleClearConfirm}
        onCancel={() => setShowClearConfirmModal(false)}
        isClearing={clearLoading}
      />

      {/* Lightbox：點圖放大 */}
      <ImageLightbox
        src={lightboxSrc}
        zIndex={9999}
        onClose={() => setLightboxSrc(null)}
      />

      {/* 成功提示彈窗（管理員儲存、一般提交） */}
      <SuccessModal
        show={!!submitSuccess}
        onClose={() => setSubmitSuccess(null)}
        type="save"
      />

      {/* 區域性即時反饋 Toast（新增/編輯/刪除設備） */}
      {localError && (
        <Toast
          message={localError}
          type="error"
          onClose={() => setLocalError(null)}
        />
      )}

      {localSuccess && (
        <Toast
          message={localSuccess}
          type="success"
          onClose={() => setLocalSuccess(null)}
        />
      )}
    </SharedPageLayout>
  );
}