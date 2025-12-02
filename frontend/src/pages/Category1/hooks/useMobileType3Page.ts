/**
 * useMobileType3Page - Type 3 頁面共用邏輯 Hook
 *
 * 用於 WD40、LPG、Acetylene、WeldingRod、FireExtinguisher 等頁面
 * 支援兩種模式：quantity（數量累計）和 weight（重量累計）
 */

import { useState, useEffect, useMemo, useRef } from 'react'
import { EntryStatus } from '../../../components/StatusSwitcher'
import { useFrontendStatus } from '../../../hooks/useFrontendStatus'
import { useApprovalStatus } from '../../../hooks/useApprovalStatus'
import { useReviewMode } from '../../../hooks/useReviewMode'
import { useEnergyData } from '../../../hooks/useEnergyData'
import { useEnergyClear } from '../../../hooks/useEnergyClear'
import { useSubmitGuard } from '../../../hooks/useSubmitGuard'
import { useGhostFileCleaner } from '../../../hooks/useGhostFileCleaner'
import { useRole } from '../../../hooks/useRole'
import { useAdminSave } from '../../../hooks/useAdminSave'
import { generateRecordId } from '../../../utils/idGenerator'
import { MobileEnergyRecord } from '../common/mobileEnergyTypes'
import { createEmptyRecords } from '../common/mobileEnergyUtils'
import { MobileEnergyConfig } from '../common/mobileEnergyConfig'
import { useThumbnailLoader } from '../../../hooks/useThumbnailLoader'
import type { MemoryFile } from '../../../services/documentHandler'
import { useType3Helpers } from '../../../hooks/useType3Helpers'
import { submitEnergyEntry } from '../../../api/v2/entryAPI'
import { uploadEvidenceFile, deleteEvidenceFile } from '../../../api/v2/fileAPI'
import { getFileUrl } from '../../../api/files'

// ==================== 型別定義 ====================

/** 全局檔案配置 */
export interface GlobalFileConfig {
  /** 檔案唯一標識 key（例如：inspectionReport） */
  key: string
  /** 後端檔案類型（例如：annual_evidence） */
  fileType: 'msds' | 'usage_evidence' | 'other' | 'heat_value_evidence' | 'annual_evidence' | 'nameplate_evidence' | 'sf6_nameplate' | 'sf6_certificate'
  /** 是否必填 */
  required?: boolean
  /** 顯示標籤（可選，用於 UI） */
  label?: string
}

export interface MobileType3PageOptions<TSpec = { id: string; name: string; memoryFiles?: MemoryFile[] }> {
  /** 頁面配置 */
  config: MobileEnergyConfig
  /** Payload 資料欄位名稱（例如：lpgData, wd40Data, weldingRodData） */
  dataFieldName: string
  /** 規格管理 Hook */
  useSpecManager: () => {
    savedSpecs: TSpec[]
    setSavedSpecs: React.Dispatch<React.SetStateAction<TSpec[]>>
    currentEditingSpec: TSpec | null
    editingSpecId: string | null
    updateCurrentSpec: (field: keyof TSpec, value: any) => void
    saveCurrentSpec: () => void
    editSpec: (id: string) => void
    deleteSpec: (id: string) => void
    cancelEdit: () => void
  }
  /** 計算模式：quantity（數量累計）或 weight（重量累計） */
  mode?: 'quantity' | 'weight'
  /** 規格名稱解析函數（weight 模式專用） */
  parseSpecName?: (name: string) => { name: string; unitWeight: number } | null
  /** 全局檔案配置（可選，用於滅火器等需要額外全局佐證的頁面） */
  globalFiles?: GlobalFileConfig[]
}

// ==================== Hook ====================

export function useMobileType3Page<TSpec extends { id: string; name: string; memoryFiles?: MemoryFile[]; evidenceFiles?: any[] }>(
  options: MobileType3PageOptions<TSpec>
) {
  const { config, dataFieldName, useSpecManager, mode = 'quantity', parseSpecName, globalFiles } = options

  // ==================== 基礎狀態 ====================

  const { isReviewMode, reviewEntryId, reviewUserId } = useReviewMode()
  const pageKey = config.pageKey
  const [year] = useState(new Date().getFullYear())
  const [initialStatus, setInitialStatus] = useState<EntryStatus>('submitted')
  const [currentEntryId, setCurrentEntryId] = useState<string | null>(null)
  const { executeSubmit, submitting } = useSubmitGuard()
  const [showClearConfirmModal, setShowClearConfirmModal] = useState(false)
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [adminSuccess, setAdminSuccess] = useState<string | null>(null)
  const dataListRef = useRef<HTMLDivElement>(null)

  // ==================== Hooks ====================

  const frontendStatus = useFrontendStatus({
    initialStatus,
    entryId: currentEntryId,
    onStatusChange: () => {},
    onError: () => {},
    onSuccess: () => {}
  })

  const { currentStatus, setCurrentStatus, handleSubmitSuccess } = frontendStatus
  const { role } = useRole()
  const { reload: reloadApprovalStatus, ...approvalStatus } = useApprovalStatus(pageKey, year)
  const isReadOnly = (isReviewMode && role !== 'admin') || approvalStatus.isApproved

  const entryIdToLoad = isReviewMode && reviewEntryId ? reviewEntryId : undefined
  const {
    entry: loadedEntry,
    files: loadedFiles,
    loading: dataLoading,
    reload
  } = useEnergyData(pageKey, year, entryIdToLoad)

  const { save: adminSave } = useAdminSave(pageKey, reviewEntryId)
  const { clear, clearing: clearLoading } = useEnergyClear(currentEntryId, currentStatus)
  const { cleanFiles } = useGhostFileCleaner()

  const type3Helpers = useType3Helpers<TSpec, MobileEnergyRecord>(pageKey, year)

  // 本地提交狀態
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null)

  // ==================== 規格管理 ====================

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
  } = useSpecManager()

  // ==================== 使用記錄管理 ====================

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

  // ==================== 全局檔案管理（可選功能） ====================

  // 全局檔案狀態：{ [key]: MemoryFile | null }
  const [globalFilesState, setGlobalFilesState] = useState<Record<string, MemoryFile | null>>(() => {
    if (!globalFiles) return {}
    return globalFiles.reduce((acc, config) => ({ ...acc, [config.key]: null }), {})
  })

  // ⭐ 追蹤使用者刪除的檔案（防止 useEffect 重新載入）
  const deletedGlobalFilesRef = useRef<Set<string>>(new Set())

  // 載入全局檔案（從 loadedFiles）
  useEffect(() => {
    if (!globalFiles || !loadedFiles || loadedFiles.length === 0) return

    globalFiles.forEach((config) => {
      // ⭐ 跳過使用者已刪除的檔案
      if (deletedGlobalFilesRef.current.has(config.key)) {
        return
      }

      const backendFile = loadedFiles.find(f => f.file_type === config.fileType)

      // ⭐ 找不到檔案時，什麼都不做（像 UreaPage 一樣）
      if (!backendFile) {
        return
      }

      // 如果當前有記憶體檔案（使用者剛上傳），不要覆蓋
      const currentFile = globalFilesState[config.key]
      if (currentFile && currentFile.id.startsWith('memory-')) {
        return
      }

      // 如果已經是同一個檔案，不要重複載入
      if (currentFile && currentFile.id === backendFile.id) {
        return
      }

      // 異步載入 URL
      getFileUrl(backendFile.file_path).then(url => {
        // ⭐ 再次檢查使用者是否已刪除（防止 race condition）
        if (deletedGlobalFilesRef.current.has(config.key)) {
          return
        }

        setGlobalFilesState(prev => ({
          ...prev,
          [config.key]: {
            id: backendFile.id,
            file: null as any,
            preview: url,
            file_name: backendFile.file_name,
            file_size: backendFile.file_size,
            mime_type: backendFile.mime_type
          }
        }))
      }).catch(error => {
        console.error(`載入全局檔案 ${config.key} 失敗:`, error)
      })
    })
  }, [loadedFiles, globalFiles])

  // 更新全局檔案
  const updateGlobalFile = (key: string) => (file: MemoryFile | null) => {
    if (file === null) {
      // ⭐ 刪除檔案：加入刪除記錄（防止 useEffect 重新載入）
      deletedGlobalFilesRef.current.add(key)
    } else {
      // ⭐ 上傳新檔案：清除刪除記錄（允許後續 reload）
      deletedGlobalFilesRef.current.delete(key)
    }
    setGlobalFilesState(prev => ({ ...prev, [key]: file }))
  }

  // 上傳全局檔案（內部函數）
  const uploadGlobalFiles = async (entryId: string) => {
    if (!globalFiles) return

    for (const config of globalFiles) {
      const file = globalFilesState[config.key]

      // 只上傳新檔案（記憶體檔案）
      if (!file || !file.id.startsWith('memory-')) continue

      // 先刪除舊檔案（如果存在）
      const existingFile = loadedFiles?.find(f => f.file_type === config.fileType)
      if (existingFile) {
        await deleteEvidenceFile(existingFile.id)
      }

      // 上傳新檔案
      const uploadResult = await uploadEvidenceFile(file.file, {
        page_key: pageKey,
        period_year: year,
        file_type: config.fileType,
        entry_id: entryId,
        standard: '64'
      })

      // ⭐ 上傳成功後，用後端 ID 更新 state（防止 useEffect 跳過）
      setGlobalFilesState(prev => ({
        ...prev,
        [config.key]: {
          ...file,
          id: uploadResult.file_id  // 替換為後端 ID
        }
      }))
    }
  }

  // ==================== 縮圖載入 ====================

  const allRecordsForThumbnails = useMemo(() => {
    return [...savedSpecs, ...savedGroups]
  }, [savedSpecs, savedGroups])

  const thumbnails = useThumbnailLoader({
    records: allRecordsForThumbnails,
    fileExtractor: (record) => record.evidenceFiles || []
  })

  // ==================== 計算總量 ====================

  const reviewAmount = useMemo(() => {
    if (mode === 'weight' && parseSpecName) {
      // Weight 模式：quantity * unitWeight
      let totalWeight = 0
      savedGroups.forEach(record => {
        const spec = savedSpecs.find(s => s.id === record.specId)
        if (spec && record.quantity) {
          const parsed = parseSpecName(spec.name)
          if (parsed) {
            totalWeight += record.quantity * parsed.unitWeight
          }
        }
      })
      return totalWeight
    }
    // Quantity 模式：直接累計
    return savedGroups.reduce((sum, r) => sum + r.quantity, 0)
  }, [savedGroups, savedSpecs, mode, parseSpecName])

  // ==================== 資料載入邏輯 ====================

  // 第一步：載入記錄資料
  useEffect(() => {
    if (loadedEntry && !dataLoading) {
      const entryStatus = loadedEntry.status as EntryStatus
      setInitialStatus(entryStatus)
      setCurrentEntryId(loadedEntry.id)
      setCurrentStatus(entryStatus)

      const payload = loadedEntry.payload || loadedEntry.extraPayload

      // 載入規格資料
      if (payload?.[dataFieldName]?.specs) {
        const specs = payload[dataFieldName].specs.map((item: any) => ({
          ...item,
          id: String(item.id),
          evidenceFiles: [],
          memoryFiles: []
        }))
        setSavedSpecs(specs)
      }

      // 載入使用記錄
      if (payload?.[dataFieldName]?.usageRecords) {
        const records = payload[dataFieldName].usageRecords.map((item: any) => ({
          ...item,
          id: String(item.id || generateRecordId()),
          evidenceFiles: [],
          memoryFiles: []
        }))
        setSavedGroups(records)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadedEntry, dataLoading, dataFieldName])

  // 第二步：檔案載入後分配到記錄
  useEffect(() => {
    if (dataLoading) return

    if (loadedFiles.length > 0) {
      const pageFiles = loadedFiles.filter(f =>
        f.file_type === 'other' && f.page_key === pageKey
      )

      if (pageFiles.length > 0) {
        const cleanAndAssignFiles = async () => {
          const validFiles = await cleanFiles(pageFiles)

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
    const hasUsageRecords = savedGroups.some(r => r.specId === id)

    if (hasUsageRecords) {
      setError('此品項已有使用記錄，無法刪除')
      return
    }

    deleteSpec(id)
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

    if (savedSpecs.length === 0) {
      setError('請先建立品項後再填寫使用數據')
      return
    }

    const isEditMode = groupId !== null
    const validRecords = records.filter(r =>
      r.date.trim() !== '' || r.quantity > 0 || r.specId
    )

    if (!isEditMode) {
      if (validRecords.length === 0) {
        setError('請至少填寫一筆有效數據')
        return
      }

      const hasInvalidRecords = validRecords.some(r => !r.specId)
      if (hasInvalidRecords) {
        setError('請為每筆記錄選擇品項')
        return
      }
    }

    const targetGroupId = isEditMode ? groupId : generateRecordId()

    const updatedRecords = validRecords.map(record => ({
      ...record,
      groupId: targetGroupId,
      memoryFiles: [...memoryFiles]
    }))

    if (isEditMode) {
      setSavedGroups(prev => {
        const otherRecords = prev.filter(r => r.groupId !== targetGroupId)
        return [...otherRecords, ...updatedRecords]
      })
    } else {
      setSavedGroups(prev => [...prev, ...updatedRecords])
    }

    setCurrentEditingGroup({
      groupId: null,
      records: createEmptyRecords(),
      memoryFiles: []
    })
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
  }

  // ==================== 提交邏輯 ====================

  const submitData = async (status: 'submitted' | 'saved') => {
    try {
      // ⭐ 檢查是否有任何可提交的內容
      const hasSpecs = savedSpecs.length > 0
      const hasGroups = savedGroups.length > 0
      const hasGlobalFiles = globalFiles && Object.values(globalFilesState).some(f => f !== null)

      if (!hasSpecs && !hasGroups && !hasGlobalFiles) {
        throw new Error('沒有可提交的資料')
      }

      // ⭐ 只有在有 specs/groups 時才驗證它們
      if (hasSpecs || hasGroups) {
        if (hasSpecs) {
          // 有品項才需要驗證
          type3Helpers.validateSpecsExist(savedSpecs)
        }
        if (hasGroups) {
          // 有使用記錄才需要驗證
          type3Helpers.validateUsageRecordsHaveSpec(savedGroups)
        }
      }

      const groupsMap = type3Helpers.buildGroupsMap(savedGroups)

      // 計算總量（根據 mode）
      let amount = 0
      if (mode === 'weight' && parseSpecName) {
        savedGroups.forEach(record => {
          const spec = savedSpecs.find(s => s.id === record.specId)
          if (spec && record.quantity) {
            const parsed = parseSpecName(spec.name)
            if (parsed) {
              amount += record.quantity * parsed.unitWeight
            }
          }
        })
      } else {
        amount = savedGroups.reduce((sum, r) => sum + r.quantity, 0)
      }

      // 準備 payload
      const payload = {
        monthly: { '1': amount },
        [dataFieldName]: {
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
        unit: config.unit,
        monthly: payload.monthly,
        notes: `${config.title}使用共 ${savedGroups.length} 筆記錄`,
        extraPayload: payload,
        status
      })

      // 上傳規格檔案
      await type3Helpers.uploadSpecFiles(savedSpecs, entry_id)

      // 上傳使用記錄檔案
      await type3Helpers.uploadGroupFiles(groupsMap, entry_id)

      // ⭐ 上傳全局檔案（如果有配置）
      await uploadGlobalFiles(entry_id)

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

        // 計算總量
        let amount = 0
        if (mode === 'weight' && parseSpecName) {
          savedGroups.forEach(record => {
            const spec = savedSpecs.find(s => s.id === record.specId)
            if (spec && record.quantity) {
              const parsed = parseSpecName(spec.name)
              if (parsed) {
                amount += record.quantity * parsed.unitWeight
              }
            }
          })
        } else {
          amount = savedGroups.reduce((sum, r) => sum + r.quantity, 0)
        }

        const payload = {
          monthly: { '1': amount },
          [dataFieldName]: {
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
          ...savedSpecs.flatMap(spec =>
            spec.memoryFiles?.filter(mf => mf.file && mf.file.size > 0).map(mf => ({
              file: mf.file,
              metadata: { recordId: spec.id, allRecordIds: [spec.id] }
            })) || []
          ),
          ...type3Helpers.collectAdminFilesToUpload(savedGroups)
        ]

        await adminSave({
          updateData: {
            unit: config.unit,
            amount,
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
    setShowClearConfirmModal(true)
  }

  const handleClearConfirm = async () => {
    try {
      // ⭐ 收集全局檔案的記憶體檔案
      const globalMemoryFiles = Object.values(globalFilesState).filter(f => f !== null) as MemoryFile[]

      // 檢查是否真的有東西可以清除
      const hasSpecs = savedSpecs.length > 0
      const hasGroups = savedGroups.length > 0
      const hasGlobalFiles = globalMemoryFiles.length > 0

      if (!hasSpecs && !hasGroups && !hasGlobalFiles && !currentEntryId) {
        setError('沒有可清除的資料')
        setShowClearConfirmModal(false)
        return
      }

      const specFiles = savedSpecs.flatMap(s => s.evidenceFiles || [])
      const usageFiles = [
        ...currentEditingGroup.records.flatMap(r => r.evidenceFiles || []),
        ...savedGroups.flatMap(r => r.evidenceFiles || [])
      ]

      // ⭐ 收集全局檔案的後端文件（根據 file_type）
      const globalBackendFiles = globalFiles && loadedFiles
        ? loadedFiles.filter(f => globalFiles.some(config => config.fileType === f.file_type))
        : []

      const allFiles = [...specFiles, ...usageFiles, ...globalBackendFiles]

      const allMemoryFiles = [
        ...savedSpecs.flatMap(s => s.memoryFiles || []),
        ...currentEditingGroup.memoryFiles,
        ...savedGroups.flatMap(r => r.memoryFiles || []),
        ...globalMemoryFiles
      ]

      // ⭐ 如果有 entryId，調用 clear 刪除後端資料
      if (currentEntryId) {
        await clear({
          filesToDelete: allFiles,
          memoryFilesToClean: allMemoryFiles
        })
      } else {
        // ⭐ 沒有 entryId，只清除前端記憶體檔案
        allMemoryFiles.forEach(mf => {
          if (mf.preview) {
            URL.revokeObjectURL(mf.preview)
          }
        })
      }

      setSavedSpecs([])
      setCurrentEditingGroup({
        groupId: null,
        records: createEmptyRecords(),
        memoryFiles: []
      })
      setSavedGroups([])
      setCurrentEntryId(null)
      setShowClearConfirmModal(false)

      // ⭐ 清除全局檔案狀態
      if (globalFiles) {
        setGlobalFilesState(globalFiles.reduce((acc, config) => ({ ...acc, [config.key]: null }), {}))
        deletedGlobalFilesRef.current.clear()
      }

      await reload()
      reloadApprovalStatus()
    } catch (error) {
      setError(error instanceof Error ? error.message : '清除失敗,請重試')
    }
  }

  // ==================== 回傳扁平物件 ====================

  return {
    // Config & Basic
    config,
    pageKey,
    year,
    role,
    isReviewMode,
    reviewEntryId,
    reviewUserId,
    approvalStatus,
    isReadOnly,
    currentStatus,
    submitting,
    executeSubmit,  // ⭐ 暴露給頁面重用（避免雙重 submitting 狀態）
    currentEntryId,
    setCurrentEntryId,

    // Data Loading
    loadedFiles,  // ⭐ 暴露已上傳的檔案（供頁面載入額外佐證，如檢修表）
    dataLoading,

    // Specs
    savedSpecs,
    currentEditingSpec,
    editingSpecId,
    updateCurrentSpec,
    handleSaveSpec,
    handleEditSpec,
    handleDeleteSpec,

    // Usage Groups
    currentEditingGroup,
    setCurrentEditingGroup,
    savedGroups,
    addRecordToCurrentGroup,
    updateCurrentGroupRecord,
    updateCurrentGroupSpecId,
    removeRecordFromCurrentGroup,
    clearCurrentGroupEvidence,
    saveCurrentGroup,
    editGroup,
    deleteGroup,

    // Submit & Actions
    handleSubmit,
    handleSave,
    handleClear,
    handleClearConfirm,
    submitData,
    handleSubmitSuccess,
    reload,
    reloadApprovalStatus,

    // Review
    reviewAmount,
    reviewUnit: config.unit,

    // Global Files (可選功能)
    globalFilesState,  // ⭐ 全局檔案狀態
    updateGlobalFile,  // ⭐ 更新全局檔案函數

    // UI State
    dataListRef,
    thumbnails,
    lightboxSrc,
    setLightboxSrc,
    showClearConfirmModal,
    setShowClearConfirmModal,
    clearLoading,

    // Notifications
    submitError,
    submitSuccess,
    adminSuccess,
    error,
    setSubmitError,
    setSubmitSuccess,
    clearSuccess: () => {
      setSubmitSuccess(null)
      setAdminSuccess(null)
    },
    clearError: () => {
      setSubmitError(null)
      setError(null)
    }
  }
}
