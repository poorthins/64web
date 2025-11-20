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
import { getFileUrl, deleteEvidence } from '../../api/files';
import Toast from '../../components/Toast';
import { generateRecordId } from '../../utils/idGenerator';
import { MobileEnergyRecord as UreaRecord, CurrentEditingGroup, EvidenceGroup } from './shared/mobile/mobileEnergyTypes'
import { LAYOUT_CONSTANTS } from './shared/mobile/mobileEnergyConstants'
import { createEmptyRecords, prepareSubmissionData } from './shared/mobile/mobileEnergyUtils'
import { UREA_CONFIG } from './shared/mobileEnergyConfig'
import { MobileEnergyUsageSection } from './shared/mobile/components/MobileEnergyUsageSection'
import { MobileEnergyGroupListSection } from './shared/mobile/components/MobileEnergyGroupListSection'
import { ImageLightbox } from './shared/mobile/components/ImageLightbox'
import { SDSUploadSection } from '../../components/SDSUploadSection'
import type { MemoryFile } from '../../services/documentHandler';


export default function UreaPage() {
  // 審核模式檢測
  const { isReviewMode, reviewEntryId, reviewUserId } = useReviewMode()

  const pageKey = UREA_CONFIG.pageKey
  const [year] = useState(new Date().getFullYear())
  const [initialStatus, setInitialStatus] = useState<EntryStatus>('submitted')
  const [currentEntryId, setCurrentEntryId] = useState<string | null>(null)
  const { executeSubmit, submitting } = useSubmitGuard()
  const [showClearConfirmModal, setShowClearConfirmModal] = useState(false)

  // 圖片放大 lightbox
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [thumbnails, setThumbnails] = useState<{ [key: string]: string }>({});  // ⭐ 檔案縮圖 URL

  // ⭐ 尿素特有：SDS 安全資料表
  const [sdsFile, setSdsFile] = useState<MemoryFile | null>(null);

  // ⭐ 追蹤待刪除的檔案 ID（編輯模式刪除舊檔案時使用）
  const [filesToDelete, setFilesToDelete] = useState<string[]>([]);

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
  // 當前正在編輯的群組（對應 Figma 上方「使用數據」區）
  const [currentEditingGroup, setCurrentEditingGroup] = useState<{
    groupId: string | null      // null = 新增模式，有值 = 編輯模式
    records: UreaRecord[]     // 該群組的記錄
    memoryFiles: MemoryFile[]   // 暫存佐證
  }>({
    groupId: null,
    records: createEmptyRecords(),
    memoryFiles: []
  })

  // 已保存的群組（對應 Figma 下方「資料列表」區）
  const [savedGroups, setSavedGroups] = useState<UreaRecord[]>([])

  // ⭐ 保留舊的 ureaData（提交時用）
  const ureaData = useMemo(() => {
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
      const dataFieldName = UREA_CONFIG.dataFieldName
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
    if (dataLoading || loadedFiles.length === 0) return

    const processFiles = async () => {
      // ✅ 處理使用數據的佐證檔案
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

      // ✅ 處理 SDS 檔案（使用 Hook）
      const msdsFiles = loadedFiles.filter(f => f.file_type === 'msds' && f.page_key === pageKey)
      const sdsFiles = getRecordFiles('sds_upload', msdsFiles)

      if (sdsFiles.length > 0) {
        const validSdsFiles = await cleanFiles(sdsFiles)
        const sdsFile = validSdsFiles[0]

        if (sdsFile) {
          const fileUrl = await getFileUrl(sdsFile.file_path)
          setSdsFile({
            id: sdsFile.id,
            file: new File([], sdsFile.file_name, { type: sdsFile.mime_type }),
            preview: fileUrl,
            file_name: sdsFile.file_name,
            file_size: sdsFile.file_size,
            mime_type: sdsFile.mime_type
          })
        }
      }
    }

    processFiles()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadedFiles, pageKey, dataLoading, savedGroups.length])

  // ⭐ 輔助函數：刪除資料庫的舊 SDS 檔案（覆蓋邏輯）
  const deleteOldSdsFiles = async (entryId: string) => {
    const oldSdsFiles = loadedFiles.filter(f =>
      f.file_type === 'msds' &&
      f.page_key === pageKey &&
      f.entry_id === entryId
    )

    if (oldSdsFiles.length === 0) {
      return
    }

    for (const file of oldSdsFiles) {
      try {
        await deleteEvidence(file.id)
      } catch (error) {
        console.error('刪除舊 SDS 檔案失敗:', file.file_name, error)
      }
    }
  }

  // ⭐ 新架構的 Helper Functions

  // 判斷 SDS 檔案是否為新上傳（需要上傳到伺服器）
  // 使用 TypeScript 類型守衛，檢查通過後 TypeScript 知道 file 不是 null
  const isNewSdsFile = (file: MemoryFile | null): file is MemoryFile => {
    return !!(file && file.id.startsWith('memory-'))
  }

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
  const updateCurrentGroupRecord = (recordId: string, field: keyof UreaRecord, value: any) => {
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

  // 記錄要刪除的檔案 ID（編輯模式刪除舊檔案）
  const handleDeleteEvidence = (fileId: string) => {
    setFilesToDelete(prev => [...prev, fileId])
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

    // 將 groupId 套用到有效記錄
    // ⚠️ 注意：不要把 memoryFiles 存到 savedGroups，因為這些檔案只應該在提交時上傳一次
    // 如果存到 savedGroups，重新載入後會導致重複顯示（memoryFiles + evidenceFiles）
    const recordsWithGroupId = validRecords.map(r => ({
      ...r,
      groupId: targetGroupId,
      memoryFiles: isEditMode ? [] : [...memoryFiles]  // 編輯模式清空，新增模式保留
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
      // ⭐ 尿素頁面：驗證 SDS 必須上傳
      if (!sdsFile) {
        setError('請先上傳 SDS 安全資料表')
        return
      }

      // ✅ 使用統一的資料準備函數
      const { totalQuantity, cleanedEnergyData, deduplicatedRecordData } = prepareSubmissionData(ureaData)

      // ⭐ 使用 hook 的 submit 函數
      await submit({
        entryInput: {
          page_key: pageKey,
          period_year: year,
          unit: UREA_CONFIG.unit,
          monthly: { '1': totalQuantity },
          notes: `${UREA_CONFIG.title}使用共 ${ureaData.length} 筆記錄`,
          extraPayload: {
            [UREA_CONFIG.dataFieldName]: cleanedEnergyData,
            fileMapping: getFileMappingForPayload()
          }
        },
        recordData: deduplicatedRecordData,  // ⭐ 使用去重後的資料（含 allRecordIds）
        uploadRecordFiles,
        onSuccess: async (entry_id) => {
          // ⭐ 上傳 SDS 檔案（只上傳新檔案，跳過已儲存的）
          if (isNewSdsFile(sdsFile)) {
            await deleteOldSdsFiles(entry_id)  // 先刪除舊的 SDS 檔案
            await uploadRecordFiles('sds_upload', [sdsFile], entry_id, 'msds', ['sds_upload'])
          }

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

      // 審核模式：使用 useAdminSave hook
      if (isReviewMode && reviewEntryId) {
        console.log('📝 管理員審核模式：使用 useAdminSave hook', reviewEntryId)

        // ⭐ 準備完整資料集：合併 savedGroups 和 currentEditingGroup（避免遺失編輯中的資料）
        let completeDataSet = [...savedGroups]

        // 如果 currentEditingGroup 有資料，合併進去
        const hasEditingData = currentEditingGroup.records.some(r =>
          r.date.trim() !== '' || r.quantity > 0
        ) || currentEditingGroup.memoryFiles.length > 0

        if (hasEditingData) {
          const targetGroupId = currentEditingGroup.groupId || generateRecordId()
          const recordsWithGroupId = currentEditingGroup.records.map(r => ({
            ...r,
            groupId: targetGroupId,
            memoryFiles: [...currentEditingGroup.memoryFiles]
          }))

          if (currentEditingGroup.groupId) {
            // 編輯模式：更新現有群組
            completeDataSet = [
              ...recordsWithGroupId,
              ...completeDataSet.filter(r => r.groupId !== currentEditingGroup.groupId)
            ]
          } else {
            // 新增模式：加入群組
            completeDataSet = [...recordsWithGroupId, ...completeDataSet]
          }
        }

        // ✅ 從完整資料集計算
        const { totalQuantity, cleanedEnergyData } = prepareSubmissionData(completeDataSet)

        // ⭐ 從完整資料集收集檔案（按 groupId 分組去重）
        const groupMap = new Map<string, UreaRecord[]>()
        completeDataSet.forEach(record => {
          if (!record.groupId) return
          if (!groupMap.has(record.groupId)) {
            groupMap.set(record.groupId, [])
          }
          groupMap.get(record.groupId)!.push(record)
        })

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
                  fileType: 'other'  // 使用數據的佐證檔案
                }
              })
            })
          }
        })

        // ⭐ 添加 SDS 檔案到上傳列表（只上傳新檔案）
        if (isNewSdsFile(sdsFile)) {
          await deleteOldSdsFiles(reviewEntryId)  // 先刪除舊的 SDS 檔案
          filesToUpload.push({
            file: sdsFile.file,
            metadata: {
              recordIndex: 0,
              allRecordIds: ['sds_upload'],
              fileType: 'msds'  // SDS 安全資料表
            }
          })
        }

        await adminSave({
          updateData: {
            unit: UREA_CONFIG.unit,
            amount: totalQuantity,
            payload: {
              monthly: { '1': totalQuantity },
              [UREA_CONFIG.dataFieldName]: cleanedEnergyData,
              fileMapping: getFileMappingForPayload()
            }
          },
          files: filesToUpload
        })

        await reload()

        // 批次刪除被移除的檔案
        if (filesToDelete.length > 0) {
          for (const fileId of filesToDelete) {
            try {
              await deleteEvidence(fileId)
              console.log('✅ 已刪除檔案:', fileId)
            } catch (error) {
              console.error('❌ 刪除檔案失敗:', fileId, error)
            }
          }
          setFilesToDelete([])  // 清空待刪除列表
        }

        reloadApprovalStatus()
        setCurrentEditingGroup({ groupId: null, records: createEmptyRecords(), memoryFiles: [] })
        setSuccess('✅ 儲存成功！資料已更新')
        return
      }

      // ✅ 非審核模式：使用 save hook（跳過驗證）
      const { totalQuantity, cleanedEnergyData, deduplicatedRecordData } = prepareSubmissionData(ureaData)
      await save({
        entryInput: {
          page_key: pageKey,
          period_year: year,
          unit: UREA_CONFIG.unit,
          monthly: { '1': totalQuantity },
          notes: `${UREA_CONFIG.title}使用共 ${ureaData.length} 筆記錄`,
          extraPayload: {
            [UREA_CONFIG.dataFieldName]: cleanedEnergyData,
            fileMapping: getFileMappingForPayload()
          }
        },
        recordData: deduplicatedRecordData,  // ⭐ 包含 allRecordIds
        uploadRecordFiles,
        onSuccess: async (entry_id) => {
          // ⭐ 上傳 SDS 檔案（只上傳新檔案，跳過已儲存的）
          if (isNewSdsFile(sdsFile)) {
            await deleteOldSdsFiles(entry_id)  // 先刪除舊的 SDS 檔案
            await uploadRecordFiles('sds_upload', [sdsFile], entry_id, 'msds', ['sds_upload'])
          }

          // ⭐ 簡化為 2 行（原本 ~55 行）
          setCurrentEntryId(entry_id)
          await reload()

          // 批次刪除被移除的檔案
          if (filesToDelete.length > 0) {
            for (const fileId of filesToDelete) {
              try {
                await deleteEvidence(fileId)
                console.log('✅ 已刪除檔案:', fileId)
              } catch (error) {
                console.error('❌ 刪除檔案失敗:', fileId, error)
              }
            }
            setFilesToDelete([])  // 清空待刪除列表
          }
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

  // ⭐ 清除 SDS 檔案的輔助函數
  const clearSDSFile = () => {
    if (sdsFile?.preview) {
      URL.revokeObjectURL(sdsFile.preview)
    }
    setSdsFile(null)
  }

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
      clearSDSFile()  // ⭐ 清除 SDS 檔案
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


  // ✅ 群組分組邏輯：按 groupId 分組（優化版：單次掃描）
  const evidenceGroups = useMemo((): EvidenceGroup[] => {
    // 單次掃描完成分組
    const groups = new Map<string, UreaRecord[]>()

    ureaData.forEach(record => {
      if (!record.groupId) return
      if (!groups.has(record.groupId)) {
        groups.set(record.groupId, [])
      }
      groups.get(record.groupId)!.push(record)
    })

    // 轉換 + 排序
    return Array.from(groups.entries())
      .map(([groupId, records]) => ({
        groupId,
        records,
        evidence: records.find((r: UreaRecord) => r.evidenceFiles?.length)?.evidenceFiles?.[0] || null
      }))
      .sort((a, b) => {
        const aIsEmpty = a.records.every((r: UreaRecord) =>
          !r.date.trim() &&
          r.quantity === 0 &&
          (!r.memoryFiles || r.memoryFiles.length === 0)
        ) && !a.evidence

        const bIsEmpty = b.records.every((r: UreaRecord) =>
          !r.date.trim() &&
          r.quantity === 0 &&
          (!r.memoryFiles || r.memoryFiles.length === 0)
        ) && !b.evidence

        if (aIsEmpty && !bIsEmpty) return -1  // 空白群組在前
        if (!aIsEmpty && bIsEmpty) return 1
        return 0  // 保持原順序（新的在前）
      })
  }, [ureaData])

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
          category: UREA_CONFIG.category,
          title: UREA_CONFIG.title,
          subtitle: UREA_CONFIG.subtitle,
          iconColor: UREA_CONFIG.iconColor,
          categoryPosition: UREA_CONFIG.categoryPosition
        }}
        statusBanner={{
          approvalStatus,
          isReviewMode,
          accentColor: UREA_CONFIG.iconColor
        }}
        instructionText={UREA_CONFIG.instructionText}
      bottomActionBar={{
        currentStatus,
        submitting,
        onSubmit: handleSubmit,
        onSave: handleSave,
        onClear: handleClear,
        show: !isReadOnly && !approvalStatus.isApproved && !isReviewMode,
        accentColor: UREA_CONFIG.iconColor
      }}
      reviewSection={{
        isReviewMode,
        reviewEntryId,
        reviewUserId,
        currentEntryId,
        pageKey,
        year,
        category: UREA_CONFIG.title,
        amount: ureaData.reduce((sum, item) => sum + item.quantity, 0),
        unit: UREA_CONFIG.unit,
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
      {/* ⭐ SDS 安全資料表上傳區（尿素特有） */}
      <SDSUploadSection
        isReadOnly={isReadOnly}
        submitting={submitting}
        canUploadFiles={editPermissions.canUploadFiles}
        sdsFile={sdsFile}
        setSdsFile={setSdsFile}
        onError={(msg) => setError(msg)}
        onPreviewImage={(src) => setLightboxSrc(src)}
        iconColor={UREA_CONFIG.iconColor}
      />

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
        iconColor={UREA_CONFIG.iconColor}
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
        iconColor={UREA_CONFIG.iconColor}
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
    </SharedPageLayout>
    </>
  );
}