import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom'
import SharedPageLayout from '../../layouts/SharedPageLayout'
import ConfirmClearModal from '../../components/ConfirmClearModal'
import { EntryStatus } from '../../components/StatusSwitcher';
import ReviewSection from '../../components/ReviewSection'
import { ImageLightbox } from './shared/mobile/components/ImageLightbox'
import Toast from '../../components/Toast';
import { useEditPermissions } from '../../hooks/useEditPermissions';
import { useFrontendStatus } from '../../hooks/useFrontendStatus';
import { useApprovalStatus } from '../../hooks/useApprovalStatus';
import { useReviewMode } from '../../hooks/useReviewMode';
import { useEnergyData } from '../../hooks/useEnergyData'
import { useMultiRecordSubmit } from '../../hooks/useMultiRecordSubmit'
import { useEnergyClear } from '../../hooks/useEnergyClear'
import { useSubmitGuard } from '../../hooks/useSubmitGuard'
import { useRecordFileMapping } from '../../hooks/useRecordFileMapping'
import { useReloadWithFileSync } from '../../hooks/useReloadWithFileSync'
import { useRole } from '../../hooks/useRole'
import { useAdminSave } from '../../hooks/useAdminSave'
import { upsertEnergyEntry } from '../../api/entries';
import { getFileUrl } from '../../api/files';
// 新的 hooks 和組件
import { useRefrigerantDeviceManager, RefrigerantDevice } from './hooks/useRefrigerantDeviceManager'
import { useEnergyPageNotifications } from './hooks/useEnergyPageNotifications'
import { RefrigerantInputFields } from './components/RefrigerantInputFields'
import { RefrigerantListSection } from './components/RefrigerantListSection'

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
  const { executeSubmit, submitting } = useSubmitGuard()

  // 圖片放大 lightbox
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null)

  // 🔧 使用新的 hooks
  const {
    savedDevices,
    setSavedDevices,
    currentEditingDevice,
    editingDeviceId,
    updateCurrentDevice,
    saveCurrentDevice,
    editDevice,
    deleteDevice
  } = useRefrigerantDeviceManager()

  const {
    error: localError,
    success: localSuccess,
    setError: setLocalError,
    setSuccess: setLocalSuccess,
    showClearConfirmModal,
    setShowClearConfirmModal
  } = useEnergyPageNotifications()

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setLightboxSrc(null) }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // 前端狀態管理 Hook
  const frontendStatus = useFrontendStatus({
    initialStatus,
    entryId: currentEntryId,
    onStatusChange: () => {},
    onError: () => {},  // 錯誤由母版統一處理
    onSuccess: () => {}  // 成功由母版統一處理
  })

  const { currentStatus, setCurrentStatus, handleDataChanged, handleSubmitSuccess, isInitialLoad } = frontendStatus

  // 角色檢查 Hook
  const { role } = useRole()
  const isReadOnly = isReviewMode && role !== 'admin'

  // 管理員審核儲存 Hook
  const { save: adminSave } = useAdminSave(pageKey, reviewEntryId)

  const editPermissions = useEditPermissions(currentStatus, isReadOnly, role ?? undefined)

  // 資料載入 Hook
  const entryIdToLoad = isReviewMode && reviewEntryId ? reviewEntryId : undefined
  const {
    entry: loadedEntry,
    files: loadedFiles,
    loading: dataLoading,
    reload
  } = useEnergyData(pageKey, year, entryIdToLoad)

  // Reload 同步 Hook
  const { reloadAndSync } = useReloadWithFileSync(reload)

  // 審核狀態 Hook
  const { reload: reloadApprovalStatus, ...approvalStatus } = useApprovalStatus(pageKey, year)

  // 提交 Hook（多記錄專用）
  const {
    submit,
    save
  } = useMultiRecordSubmit(pageKey, year)

  // 清除 Hook
  const {
    clear,
    clearing: clearLoading
  } = useEnergyClear(currentEntryId, currentStatus)

  // 檔案映射 Hook
  const {
    uploadRecordFiles,
    getRecordFiles,
    loadFileMapping,
    getFileMappingForPayload,
    removeRecordMapping
  } = useRecordFileMapping(pageKey, currentEntryId)

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
        loadFileMapping(loadedEntry.payload)
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
            const recordFiles = getRecordFiles(device.id, refrigerantFiles)
            return {
              ...device,
              evidenceFiles: recordFiles
            }
          })
        })
      }
    }
  }, [loadedFiles, pageKey, dataLoading, getRecordFiles])

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
        } catch (error) {
          console.warn('Failed to generate thumbnail for', evidenceFile.file_name, error)
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

  // 包裝保存函數以處理通知
  const handleSaveDevice = () => {
    try {
      const message = saveCurrentDevice()
      setLocalSuccess(message)
    } catch (error) {
      setLocalError(error instanceof Error ? error.message : '保存失敗')
    }
  }

  // 包裝編輯函數以處理通知
  const handleEditDevice = (id: string) => {
    const message = editDevice(id)
    if (message) setLocalSuccess(message)
  }

  // 包裝刪除函數以處理通知和確認
  const handleDeleteDevice = (id: string) => {
    if (!window.confirm('確定要刪除此設備嗎？')) return
    const message = deleteDevice(id)
    removeRecordMapping(id)
    setLocalSuccess(message)
  }

  const handleSubmit = async () => {
    if (savedDevices.length === 0) {
      throw new Error('請至少新增一個設備')
    }

    await executeSubmit(async () => {
      const totalFillAmount = savedDevices.reduce((sum, item) => {
        const amountInKg = item.unit === 'gram' ? item.fillAmount / 1000 : item.fillAmount
        return sum + amountInKg
      }, 0)

      const cleanedData = savedDevices.map(r => ({
        id: r.id,
        brandModel: r.brandModel,
        equipmentType: r.equipmentType,
        equipmentLocation: r.equipmentLocation,
        refrigerantType: r.refrigerantType,
        fillAmount: r.fillAmount,
        unit: r.unit
      }))

      await submit({
        entryInput: {
          page_key: pageKey,
          period_year: year,
          unit: 'kg',
          monthly: { '1': totalFillAmount },
          notes: `冷媒設備共 ${savedDevices.length} 台`,
          extraPayload: {
            refrigerantData: cleanedData
          }
        },
        recordData: savedDevices,
        uploadRecordFiles,
        onSuccess: async (entry_id) => {
          await upsertEnergyEntry({
            page_key: pageKey,
            period_year: year,
            unit: 'kg',
            monthly: { '1': totalFillAmount },
            notes: `冷媒設備共 ${savedDevices.length} 台`,
            extraPayload: {
              refrigerantData: cleanedData,
              fileMapping: getFileMappingForPayload()
            }
          }, true)

          setCurrentEntryId(entry_id)
          await reload()
        }
      })

      await handleSubmitSuccess()
      reloadApprovalStatus()
    })
  }

  const handleSave = async () => {
    await executeSubmit(async () => {
      const totalFillAmount = savedDevices.reduce((sum, item) => {
        const amountInKg = item.unit === 'gram' ? item.fillAmount / 1000 : item.fillAmount
        return sum + amountInKg
      }, 0)

      const cleanedData = savedDevices.map(r => ({
        id: r.id,
        brandModel: r.brandModel,
        equipmentType: r.equipmentType,
        equipmentLocation: r.equipmentLocation,
        refrigerantType: r.refrigerantType,
        fillAmount: r.fillAmount,
        unit: r.unit
      }))

      // 管理員審核模式
      if (isReviewMode && reviewEntryId) {
        const filesToUpload: Array<{
          file: File
          metadata: {
            recordIndex: number
            fileType: 'usage_evidence' | 'msds' | 'other'
          }
        }> = []

        savedDevices.forEach((record, index) => {
          if (record.memoryFiles && record.memoryFiles.length > 0) {
            record.memoryFiles.forEach(mf => {
              filesToUpload.push({
                file: mf.file,
                metadata: {
                  recordIndex: index,
                  fileType: 'other' as const
                }
              })
            })
          }
        })

        await adminSave({
          updateData: {
            unit: 'kg',
            amount: totalFillAmount,
            payload: {
              refrigerantData: cleanedData,
              fileMapping: getFileMappingForPayload()
            }
          },
          files: filesToUpload
        })

        await reloadAndSync()
        reloadApprovalStatus()
        setSavedDevices(prev => prev.map(r => ({ ...r, memoryFiles: [] })))
        return
      }

      // 一般暫存
      await save({
        entryInput: {
          page_key: pageKey,
          period_year: year,
          unit: 'kg',
          monthly: { '1': totalFillAmount },
          notes: `冷媒設備共 ${savedDevices.length} 台`,
          extraPayload: {
            refrigerantData: cleanedData
          }
        },
        recordData: savedDevices,
        uploadRecordFiles,
        onSuccess: async (entry_id) => {
          await upsertEnergyEntry({
            page_key: pageKey,
            period_year: year,
            unit: 'kg',
            monthly: { '1': totalFillAmount },
            notes: `冷媒設備共 ${savedDevices.length} 台`,
            extraPayload: {
              refrigerantData: cleanedData,
              fileMapping: getFileMappingForPayload()
            }
          }, true)

          setCurrentEntryId(entry_id)
          await reload()
        }
      })

      reloadApprovalStatus()
    })
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
        submitSuccessMessage: '冷媒設備資料已提交！',
        saveSuccessMessage: () => isReviewMode ? '儲存成功！資料已更新' : '暫存成功！資料已儲存'
      }}
    >
      {/* 輸入欄位組件（含保存按鈕） */}
      <RefrigerantInputFields
        device={currentEditingDevice}
        onFieldChange={updateCurrentDevice}
        onSave={handleSaveDevice}
        editingDeviceId={editingDeviceId}
        isReadOnly={isReadOnly}
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

      {/* 審核區塊 */}
      {isReviewMode && (
        <div className="max-w-4xl mx-auto mt-8">
          <ReviewSection
            entryId={reviewEntryId || currentEntryId || `refrigerant_${year}`}
            userId={reviewUserId || "current_user"}
            category="冷媒"
            userName="填報用戶"
            amount={savedDevices.reduce((sum, item) => {
              const amountInKg = item.unit === 'gram' ? item.fillAmount / 1000 : item.fillAmount
              return sum + amountInKg
            }, 0)}
            unit="kg"
            role={role}
            onSave={handleSave}
            isSaving={submitting}
            onApprove={() => {}}
            onReject={() => {}}
          />
        </div>
      )}

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