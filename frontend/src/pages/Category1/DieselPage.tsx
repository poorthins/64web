/**
 * DieselPage - 柴油使用量填報頁面
 *
 * 檔案儲存架構：
 * - Supabase Storage 路徑：other/2025/diesel/
 * - 資料庫記錄識別：page_key = 'diesel' + record_index = 0/1/2/3
 * - 單一統一資料夾，使用 record_index 欄位區分不同記錄的檔案
 *
 * 與其他頁面不同：
 * - 其他頁面：單筆記錄 → page_key 唯一識別
 * - 柴油頁面：多筆記錄 → page_key + record_index 組合識別
 */

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom'
import { X, Trash2, Eye, Loader2, Download, Pencil } from 'lucide-react'
import EvidenceUpload from '../../components/EvidenceUpload';
import { MemoryFile } from '../../components/EvidenceUpload';
import { EntryStatus } from '../../components/StatusSwitcher';
import ReviewSection from '../../components/ReviewSection'
import LoadingPage from '../../components/LoadingPage'
import ConfirmClearModal from '../../components/ConfirmClearModal'
import SuccessModal from '../../components/SuccessModal'
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
import { useSubmissions } from '../admin/hooks/useSubmissions'
import { useRole } from '../../hooks/useRole'
import { useAdminSave } from '../../hooks/useAdminSave'
import { updateEntryStatus, getEntryByPageKeyAndYear, upsertEnergyEntry, deleteEnergyEntry } from '../../api/entries';
import { getEntryFiles, EvidenceFile, uploadEvidenceWithEntry, updateFileEntryAssociation, deleteEvidenceFile, adminDeleteEvidence, getFileUrl } from '../../api/files';
import { supabase } from '../../lib/supabaseClient';
import { designTokens } from '../../utils/designTokens';
import { DocumentHandler } from '../../services/documentHandler';
import Toast, { ToastType } from '../../components/Toast';
import { generateRecordId } from '../../utils/idGenerator';

// ==================== 常數定義 ====================
const LAYOUT_CONSTANTS = {
  // 容器尺寸
  CONTAINER_WIDTH: 1102,
  CONTAINER_MIN_HEIGHT: 555,

  // 編輯區 - 左側上傳區
  EDITOR_UPLOAD_WIDTH: 358,
  EDITOR_UPLOAD_HEIGHT: 308,

  // 編輯區 - 右側表單
  EDITOR_FORM_WIDTH: 599,
  EDITOR_FORM_MIN_HEIGHT: 250,
  EDITOR_FORM_HEADER_HEIGHT: 58,

  // 間距
  EDITOR_GAP: 47,
  SECTION_TOP_MARGIN: 103,
  SECTION_BOTTOM_MARGIN: 34,
  LIST_TOP_MARGIN: 116.75,

  // 檔案上傳
  MAX_FILES_PER_GROUP: 1,
  MAX_FILE_SIZE_MB: 10,

  // 預設記錄數
  DEFAULT_RECORDS_COUNT: 3,

  // 列表項目
  GROUP_LIST_WIDTH: 924,
  GROUP_LIST_HEIGHT: 87,

  // z-index
  MODAL_Z_INDEX: 20000
} as const

interface DieselRecord {
  id: string;  // ⭐ 改為 string 型別（穩定的 recordId）
  date: string;              // 使用日期
  quantity: number;          // 使用量(L)
  evidenceFiles?: EvidenceFile[];
  memoryFiles?: MemoryFile[];
  groupId?: string;          // ⭐ 群組 ID（undefined = 未上傳區）
}

// ==================== 工具函數 ====================

/**
 * 建立指定數量的空白記錄
 * @param count - 記錄數量，預設為 3
 * @returns DieselRecord[] - 空白記錄陣列
 */
const createEmptyRecords = (count: number = LAYOUT_CONSTANTS.DEFAULT_RECORDS_COUNT): DieselRecord[] => {
  return Array.from({ length: count }, () => ({
    id: generateRecordId(),
    date: '',
    quantity: 0,
    evidenceFiles: [],
    memoryFiles: [],
    groupId: undefined
  }))
}

/**
 * 檔案類型定義
 */
type FileType = 'image' | 'pdf' | 'excel' | 'word' | 'other' | 'none'

/**
 * 判斷檔案類型
 * @param mimeType - MIME 類型
 * @param fileName - 檔案名稱
 * @returns FileType - 檔案類型
 */
const getFileType = (mimeType?: string, fileName?: string): FileType => {
  if (!mimeType && !fileName) return 'none'

  // 圖片
  if (mimeType?.startsWith('image/')) return 'image'

  // PDF
  if (mimeType === 'application/pdf') return 'pdf'

  // Excel
  if (
    mimeType?.includes('excel') ||
    mimeType?.includes('spreadsheet') ||
    fileName?.match(/\.(xlsx?|xls)$/i)
  ) return 'excel'

  // Word
  if (
    mimeType?.includes('wordprocessingml') ||
    mimeType === 'application/msword' ||
    fileName?.match(/\.(docx?|doc)$/i)
  ) return 'word'

  return 'other'
}

/**
 * 渲染檔案類型 icon
 * @param fileType - 檔案類型
 * @returns JSX.Element - icon 元素
 */
const renderFileTypeIcon = (fileType: FileType): JSX.Element => {
  switch (fileType) {
    case 'pdf':
      return (
        <svg width="36" height="36" viewBox="0 0 24 24" fill="none">
          <path d="M14 2H6C5.46957 2 4.96086 2.21071 4.58579 2.58579C4.21071 2.96086 4 3.46957 4 4V20C4 20.5304 4.21071 21.0391 4.58579 21.4142C4.96086 21.7893 5.46957 22 6 22H18C18.5304 22 19.0391 21.7893 19.4142 21.4142C19.7893 21.0391 20 20.5304 20 20V8L14 2Z" stroke="#DC2626" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M14 2V8H20" stroke="#DC2626" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          <text x="12" y="17" fontSize="7" fill="#DC2626" textAnchor="middle" fontWeight="bold">PDF</text>
        </svg>
      )

    case 'excel':
      return (
        <svg width="36" height="36" viewBox="0 0 24 24" fill="none">
          <path d="M14 2H6C5.46957 2 4.96086 2.21071 4.58579 2.58579C4.21071 2.96086 4 3.46957 4 4V20C4 20.5304 4.21071 21.0391 4.58579 21.4142C4.96086 21.7893 5.46957 22 6 22H18C18.5304 22 19.0391 21.7893 19.4142 21.4142C19.7893 21.0391 20 20.5304 20 20V8L14 2Z" stroke="#16A34A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M14 2V8H20" stroke="#16A34A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          <text x="12" y="17" fontSize="6.5" fill="#16A34A" textAnchor="middle" fontWeight="bold">XLS</text>
        </svg>
      )

    case 'word':
      return (
        <svg width="36" height="36" viewBox="0 0 24 24" fill="none">
          <path d="M14 2H6C5.46957 2 4.96086 2.21071 4.58579 2.58579C4.21071 2.96086 4 3.46957 4 4V20C4 20.5304 4.21071 21.0391 4.58579 21.4142C4.96086 21.7893 5.46957 22 6 22H18C18.5304 22 19.0391 21.7893 19.4142 21.4142C19.7893 21.0391 20 20.5304 20 20V8L14 2Z" stroke="#2563EB" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M14 2V8H20" stroke="#2563EB" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          <text x="12" y="17" fontSize="6.5" fill="#2563EB" textAnchor="middle" fontWeight="bold">DOC</text>
        </svg>
      )

    case 'other':
      return (
        <svg width="36" height="36" viewBox="0 0 24 24" fill="none">
          <path d="M14 2H6C5.46957 2 4.96086 2.21071 4.58579 2.58579C4.21071 2.96086 4 3.46957 4 4V20C4 20.5304 4.21071 21.0391 4.58579 21.4142C4.96086 21.7893 5.46957 22 6 22H18C18.5304 22 19.0391 21.7893 19.4142 21.4142C19.7893 21.0391 20 20.5304 20 20V8L14 2Z" stroke="#666666" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M14 2V8H20" stroke="#666666" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      )

    case 'none':
      return <span className="text-[24px]">📁</span>

    default:
      return <span className="text-[24px]">📄</span>
  }
}

/**
 * 準備提交/儲存的資料
 * @param dieselData - 柴油使用記錄
 * @returns 準備好的資料物件
 */
const prepareSubmissionData = (dieselData: DieselRecord[]) => {
  const totalQuantity = dieselData.reduce((sum, item) => sum + item.quantity, 0)

  // 清理 payload：只送基本資料，移除 File 物件
  const cleanedDieselData = dieselData.map((r: DieselRecord) => ({
    id: r.id,
    date: r.date,
    quantity: r.quantity,
    groupId: r.groupId
  }))

  // 建立群組 → recordIds 映射表
  const groupRecordIds = new Map<string, string[]>()
  dieselData.forEach(record => {
    if (record.groupId) {
      if (!groupRecordIds.has(record.groupId)) {
        groupRecordIds.set(record.groupId, [])
      }
      groupRecordIds.get(record.groupId)!.push(record.id)
    }
  })

  // 去重：每個群組只保留第一個 record 的 memoryFiles
  const seenGroupIds = new Set<string>()
  const deduplicatedRecordData = dieselData.map(record => {
    const allRecordIds = record.groupId ? groupRecordIds.get(record.groupId) : [record.id]

    if (record.groupId && seenGroupIds.has(record.groupId)) {
      return { ...record, memoryFiles: [], allRecordIds }
    }
    if (record.groupId) {
      seenGroupIds.add(record.groupId)
    }
    return { ...record, allRecordIds }
  })

  return {
    totalQuantity,
    cleanedDieselData,
    deduplicatedRecordData
  }
}

export default function DieselPage() {
  const navigate = useNavigate()

  // 審核模式檢測
  const { isReviewMode, reviewEntryId, reviewUserId } = useReviewMode()

  // 文件上傳的 ref
  const fileInputRef = useRef<HTMLInputElement>(null)

  const pageKey = 'diesel'
  const [year] = useState(new Date().getFullYear())
  const [initialStatus, setInitialStatus] = useState<EntryStatus>('submitted')
  const [currentEntryId, setCurrentEntryId] = useState<string | null>(null)
  const { executeSubmit, submitting } = useSubmitGuard()
  const [showSuccessModal, setShowSuccessModal] = useState(false)
  const [successModalType, setSuccessModalType] = useState<'save' | 'submit'>('submit')
  const [showClearConfirmModal, setShowClearConfirmModal] = useState(false)

  // 圖片放大 lightbox
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [thumbnails, setThumbnails] = useState<{ [key: string]: string }>({});  // ⭐ 檔案縮圖 URL
  const [downloadingFileId, setDownloadingFileId] = useState<string | null>(null); // 下載中的檔案 ID

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
    onError: (error) => setError(error),
    onSuccess: (message) => setSuccess(message)
  })

  const { currentStatus, setCurrentStatus, handleSubmitSuccess, handleDataChanged, isInitialLoad } = frontendStatus

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

  // 審核 API hook
  const { reviewSubmission } = useSubmissions()

  // 管理員儲存 Hook
  const { save: adminSave, saving: adminSaving } = useAdminSave(pageKey, reviewEntryId)

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
    clearing: clearLoading,
    error: clearError,
    clearError: clearClearError
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
    records: DieselRecord[]     // 該群組的記錄
    memoryFiles: MemoryFile[]   // 暫存佐證
  }>({
    groupId: null,
    records: createEmptyRecords(),
    memoryFiles: []
  })

  // 已保存的群組（對應 Figma 下方「資料列表」區）
  const [savedGroups, setSavedGroups] = useState<DieselRecord[]>([])

  // ⭐ 保留舊的 dieselData（提交時用）
  const dieselData = useMemo(() => {
    return savedGroups
  }, [savedGroups])

  // 檢查是否有填寫任何資料
  const hasAnyData = useMemo(() => {
    return dieselData.some((r: DieselRecord) =>
      r.date.trim() !== '' ||
      r.quantity > 0 ||
      (r.memoryFiles && r.memoryFiles.length > 0)
    )
  }, [dieselData])

  // ⭐ TODO: 重構載入邏輯以配合新架構
  // 第一步：載入記錄資料
  useEffect(() => {
    if (loadedEntry && !dataLoading) {
      const entryStatus = loadedEntry.status as EntryStatus
      setInitialStatus(entryStatus)
      setCurrentEntryId(loadedEntry.id)
      setCurrentStatus(entryStatus)

      // 從 payload 取得柴油使用資料
      if (loadedEntry.payload?.dieselData) {
        const dataArray = Array.isArray(loadedEntry.payload.dieselData)
          ? loadedEntry.payload.dieselData
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
    if (dataLoading) return

    if (loadedFiles.length > 0 && savedGroups.length > 0) {
      const dieselFiles = loadedFiles.filter(f =>
        f.file_type === 'other' && f.page_key === pageKey
      )

      if (dieselFiles.length > 0) {
        const cleanAndAssignFiles = async () => {
          const validDieselFiles = await cleanFiles(dieselFiles)

          setSavedGroups(prev => {
            return prev.map((item) => {
              const filesForThisRecord = getRecordFiles(item.id, validDieselFiles)
              return {
                ...item,
                evidenceFiles: filesForThisRecord,
                memoryFiles: []
              }
            })
          })
        }

        cleanAndAssignFiles()
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadedFiles, pageKey, dataLoading])

  // ⭐ 新架構的 Helper Functions

  // 處理檔案選擇（整個白色框框點擊上傳）
  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files
    if (!selectedFiles || selectedFiles.length === 0) return

    // 檢查檔案數量
    if (currentEditingGroup.memoryFiles.length >= 1) {
      setError('已達到最大檔案數量限制 (1 個)')
      return
    }

    // 建立 MemoryFile
    const file = selectedFiles[0]
    let preview = ''
    if (file.type.startsWith('image/')) {
      preview = URL.createObjectURL(file)
    }

    const memoryFile: MemoryFile = {
      id: `memory-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      file,
      preview,
      file_name: file.name,
      file_size: file.size,
      mime_type: file.type
    }

    // 更新 memoryFiles
    setCurrentEditingGroup(prev => ({
      ...prev,
      memoryFiles: [memoryFile]
    }))

    // 清空 input value
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
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
  const updateCurrentGroupRecord = (recordId: string, field: keyof DieselRecord, value: any) => {
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

    // 將 groupId 和 memoryFiles 套用到所有記錄
    const recordsWithGroupId = records.map(r => ({
      ...r,
      groupId: targetGroupId,
      memoryFiles: [...memoryFiles]
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
      // ✅ 使用統一的資料準備函數
      const { totalQuantity, cleanedDieselData, deduplicatedRecordData } = prepareSubmissionData(dieselData)

      // ⭐ 使用 hook 的 submit 函數
      await submit({
        entryInput: {
          page_key: pageKey,
          period_year: year,
          unit: 'L',
          monthly: { '1': totalQuantity },
          notes: `柴油使用共 ${dieselData.length} 筆記錄`,
          extraPayload: {
            dieselData: cleanedDieselData,
            fileMapping: getFileMappingForPayload()  // ⭐ 第一次就存完整資料
          }
        },
        recordData: deduplicatedRecordData,  // ⭐ 使用去重後的資料（含 allRecordIds）
        uploadRecordFiles,
        onSuccess: async (entry_id) => {
          // ⭐ 簡化為只有收尾工作
          setCurrentEntryId(entry_id)
          await reload()
        }
      })

      await handleSubmitSuccess();

      // 重新載入審核狀態，更新狀態橫幅
      reloadApprovalStatus()

      setSuccessModalType('submit')
      setShowSuccessModal(true)
    }).catch(error => {
      setError(error instanceof Error ? error.message : '提交失敗，請重試');
    })
  };

  const handleSave = async () => {
    await executeSubmit(async () => {
      setError(null)
      setSuccess(null)

      // ✅ 使用統一的資料準備函數
      const { totalQuantity, cleanedDieselData, deduplicatedRecordData } = prepareSubmissionData(dieselData)

      // 審核模式：使用 useAdminSave hook
      if (isReviewMode && reviewEntryId) {
        console.log('📝 管理員審核模式：使用 useAdminSave hook', reviewEntryId)

        // ⭐ 新架構：準備檔案列表（從當前編輯群組收集）
        const filesToUpload = currentEditingGroup.memoryFiles.map((mf: MemoryFile) => ({
          file: mf.file,
          metadata: {
            recordIndex: 0,
            allRecordIds: currentEditingGroup.records.map(r => r.id)
          }
        }))

        await adminSave({
          updateData: {
            unit: 'L',
            amount: totalQuantity,
            payload: {
              monthly: { '1': totalQuantity },
              dieselData: cleanedDieselData,
              fileMapping: getFileMappingForPayload()
            }
          },
          files: filesToUpload
        })

        await reload()
        reloadApprovalStatus()
        // 清空記憶體檔案（在 reload 之後，避免檔案暫時消失）
        setCurrentEditingGroup(prev => ({ ...prev, memoryFiles: [] }))
        setSuccess('✅ 儲存成功！資料已更新')
        return
      }

      // 非審核模式：使用統一的資料準備函數（已在函數開頭準備好）
      // ⭐ 使用 hook 的 save 函數（跳過驗證）
      await save({
        entryInput: {
          page_key: pageKey,
          period_year: year,
          unit: 'L',
          monthly: { '1': totalQuantity },
          notes: `柴油使用共 ${dieselData.length} 筆記錄`,
          extraPayload: {
            dieselData: cleanedDieselData,
            fileMapping: getFileMappingForPayload()  // ⭐ 第一次就存 fileMapping
          }
        },
        recordData: deduplicatedRecordData,  // ⭐ 包含 allRecordIds
        uploadRecordFiles,
        onSuccess: async (entry_id) => {
          // ⭐ 簡化為 2 行（原本 ~55 行）
          setCurrentEntryId(entry_id)
          await reload()
        }
      })

      // 重新載入審核狀態，更新狀態橫幅
      reloadApprovalStatus()

      setSuccess('暫存成功！資料已儲存')
      setSuccessModalType('save')
      setShowSuccessModal(true)
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

  // PDF 檔案下載處理
  const handleDownloadFile = async (file: EvidenceFile) => {
    try {
      setDownloadingFileId(file.id)

      // 獲取檔案下載 URL（60秒有效期）
      const fileUrl = await getFileUrl(file.file_path)

      // 觸發下載
      const link = document.createElement('a')
      link.href = fileUrl
      link.download = file.file_name
      link.target = '_blank'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)

    } catch (error) {
      console.error('下載檔案失敗:', error)
      setError('下載檔案失敗，請稍後再試')
    } finally {
      setDownloadingFileId(null)
    }
  }

  // ✅ 群組分組邏輯：按 groupId 分組
  interface EvidenceGroup {
    groupId: string  // 群組 ID
    evidence: EvidenceFile | null  // null = 未上傳佐證
    records: DieselRecord[]
  }

  const evidenceGroups = useMemo((): EvidenceGroup[] => {
    // ⭐ 按 dieselData 順序收集唯一的 groupId（保持順序）
    const seenGroupIds = new Set<string>()
    const groupIds: string[] = []

    dieselData.forEach(record => {
      if (record.groupId && !seenGroupIds.has(record.groupId)) {
        seenGroupIds.add(record.groupId)
        groupIds.push(record.groupId)
      }
    })

    // ⭐ 按收集到的順序建立 groups（所有群組平等）
    const result: EvidenceGroup[] = []

    groupIds.forEach(groupId => {
      const records = dieselData.filter((r: DieselRecord) => r.groupId === groupId)
      const evidence = records.find((r: DieselRecord) => r.evidenceFiles && r.evidenceFiles.length > 0)?.evidenceFiles?.[0]
      result.push({ groupId, evidence: evidence || null, records })
    })

    // ✅ 排序：空白群組置頂，其他按時間新→舊
    return result.sort((a, b) => {
      const aIsEmpty = a.records.every((r: DieselRecord) =>
        !r.date.trim() &&
        r.quantity === 0 &&
        (!r.memoryFiles || r.memoryFiles.length === 0)
      ) && !a.evidence

      const bIsEmpty = b.records.every((r: DieselRecord) =>
        !r.date.trim() &&
        r.quantity === 0 &&
        (!r.memoryFiles || r.memoryFiles.length === 0)
      ) && !b.evidence

      if (aIsEmpty && !bIsEmpty) return -1  // 空白群組在前
      if (!aIsEmpty && bIsEmpty) return 1
      return 0  // 保持原順序（新的在前）
    })
  }, [dieselData])

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
      {/* 隱藏瀏覽器原生日曆圖示 */}
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
      `}</style>

      <SharedPageLayout
        pageHeader={{
          category: "D",
          title: "柴油(移動源)",
          subtitle: "Diesel (Mobile Sources)"
        }}
        statusBanner={{
          approvalStatus,
          isReviewMode
        }}
        instructionText="請先選擇設備項目，並上傳加油單據作為佐證，若同一份佐證文件（PDF／JPG）內含多筆加油紀錄，請使用 「+新增數據到此群組」，<br />讓一份佐證可對應多筆加油數據；當同一份佐證的所有數據新增完成後，請點選 「+新增群組」，以填寫下一份佐證的數據。"
      bottomActionBar={{
        currentStatus,
        submitting,
        onSubmit: handleSubmit,
        onSave: handleSave,
        onClear: handleClear,
        show: !isReadOnly && !approvalStatus.isApproved && !isReviewMode
      }}
    >
      {/* 審核模式指示器 */}
      {isReviewMode && (
        <div className="mb-4 p-3 bg-orange-100 border-2 border-orange-300 rounded-lg mx-auto" style={{ maxWidth: '993px' }}>
          <div className="flex items-center justify-center">
            <Eye className="w-5 h-5 text-orange-600 mr-2" />
            <span className="text-orange-800 font-medium">
              📋 審核模式 - 查看填報內容
            </span>
          </div>
          <p className="text-sm text-orange-600 mt-1 text-center">
            所有輸入欄位已鎖定，僅供審核查看
          </p>
        </div>
      )}

      {/* 使用數據標題 - icon 距離左邊界 367px，在說明文字下方 103px */}
      <div style={{ marginTop: '103px', marginLeft: '367px' }}>
        <div className="flex items-center gap-[29px]">
          {/* Database Icon */}
          <div className="w-[42px] h-[42px] bg-[#3996fe] rounded-[10px] flex items-center justify-center flex-shrink-0">
            <svg xmlns="http://www.w3.org/2000/svg" width="29" height="29" viewBox="0 0 29 29" fill="none">
              <path d="M25.375 6.04163C25.375 8.04366 20.5061 9.66663 14.5 9.66663C8.4939 9.66663 3.625 8.04366 3.625 6.04163M25.375 6.04163C25.375 4.03959 20.5061 2.41663 14.5 2.41663C8.4939 2.41663 3.625 4.03959 3.625 6.04163M25.375 6.04163V22.9583C25.375 24.9641 20.5417 26.5833 14.5 26.5833C8.45833 26.5833 3.625 24.9641 3.625 22.9583V6.04163M25.375 14.5C25.375 16.5058 20.5417 18.125 14.5 18.125C8.45833 18.125 3.625 16.5058 3.625 14.5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>

          {/* 標題文字 */}
          <div className="flex flex-col justify-center h-[86px]">
            <h3 className="text-[28px] font-bold text-black">
              使用數據
            </h3>
          </div>
        </div>
      </div>

      {/* ==================== 使用數據區塊 - 標題底部往下 34px，頁面置中 ==================== */}
      <div style={{ marginTop: `${LAYOUT_CONSTANTS.SECTION_BOTTOM_MARGIN}px`, marginBottom: '32px' }} className="flex justify-center">
        <div
          className="bg-[#ebedf0] rounded-[37px]"
          style={{
            width: `${LAYOUT_CONSTANTS.CONTAINER_WIDTH}px`,
            minHeight: `${LAYOUT_CONSTANTS.CONTAINER_MIN_HEIGHT}px`,
            flexShrink: 0,
            padding: '38px 0 38px 49px'
          }}
        >
          {/* 標題區 - 358px × 73px，文字靠左上對齊 */}
          <div style={{
            width: `${LAYOUT_CONSTANTS.EDITOR_UPLOAD_WIDTH}px`,
            height: '73px',
            marginBottom: '0',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'flex-start',
            alignItems: 'flex-start'
          }}>
            <h4 className="text-[24px] font-bold" style={{ lineHeight: '1.2', marginBottom: '8px', color: '#000' }}>佐證文件</h4>
            <p className="text-[18px] text-gray-500" style={{ lineHeight: '1.2' }}>* 加油單據上需註明 年、月、日</p>
          </div>

          {/* 框框容器 */}
          <div className="flex" style={{ gap: `${LAYOUT_CONSTANTS.EDITOR_GAP}px`, alignItems: 'flex-start' }}>
            {/* 左側：佐證上傳區 */}
            <div style={{ width: `${LAYOUT_CONSTANTS.EDITOR_UPLOAD_WIDTH}px` }} className="flex-shrink-0">
              {/* 上傳區 - 整個白色框框可點擊上傳 */}
              <div
                className="bg-white flex flex-col items-center justify-center cursor-pointer hover:bg-blue-50 transition-colors"
                style={{
                  width: `${LAYOUT_CONSTANTS.EDITOR_UPLOAD_WIDTH}px`,
                  height: `${LAYOUT_CONSTANTS.EDITOR_UPLOAD_HEIGHT}px`,
                  flexShrink: 0,
                  border: '1px solid rgba(0, 0, 0, 0.25)',
                  borderRadius: '25px',
                  padding: '20px'
                }}
                onClick={() => {
                  if (!isReadOnly && !approvalStatus.isApproved && !submitting && editPermissions.canUploadFiles && currentEditingGroup.memoryFiles.length === 0) {
                    fileInputRef.current?.click()
                  }
                }}
              >
                {/* 隱藏的文件輸入 */}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls,.pdf,.jpg,.jpeg,.png,.gif,.webp,.bmp,.svg,image/*,application/pdf,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                  onChange={handleFileInputChange}
                  className="hidden"
                  disabled={isReadOnly || approvalStatus.isApproved || submitting || !editPermissions.canUploadFiles}
                />

                <div className="flex flex-col items-center justify-center text-center pointer-events-none">
                  <svg xmlns="http://www.w3.org/2000/svg" width="48" height="40" viewBox="0 0 48 40" fill="none" className="mb-4">
                    <path d="M31.9999 27.9951L23.9999 19.9951M23.9999 19.9951L15.9999 27.9951M23.9999 19.9951V37.9951M40.7799 32.7751C42.7306 31.7116 44.2716 30.0288 45.1597 27.9923C46.0477 25.9558 46.2323 23.6815 45.6843 21.5285C45.1363 19.3754 43.8869 17.4661 42.1333 16.102C40.3796 14.7378 38.2216 13.9966 35.9999 13.9951H33.4799C32.8746 11.6536 31.7462 9.47975 30.1798 7.63707C28.6134 5.79439 26.6496 4.33079 24.4361 3.3563C22.2226 2.38181 19.817 1.9218 17.4002 2.01085C14.9833 2.0999 12.6181 2.73569 10.4823 3.87042C8.34649 5.00515 6.49574 6.60929 5.06916 8.56225C3.64259 10.5152 2.6773 12.7662 2.24588 15.1459C1.81446 17.5256 1.92813 19.9721 2.57835 22.3016C3.22856 24.6311 4.3984 26.7828 5.99992 28.5951" stroke="#1E1E1E" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  <p className="text-[16px] text-black font-medium mb-1">點擊或拖放檔案暫存</p>
                  <p className="text-[14px] text-gray-500">支援所有檔案格式，最大 10MB</p>
                </div>
              </div>

              {/* 已上傳檔案列表 */}
              {currentEditingGroup.memoryFiles.length > 0 && currentEditingGroup.memoryFiles.map((file, index) => (
                <div
                  key={index}
                  style={{
                    marginTop: '19px',
                    width: '358px',
                    height: '78px',
                    flexShrink: 0,
                    borderRadius: '28px',
                    border: '1px solid rgba(0, 0, 0, 0.25)',
                    background: '#FFF',
                    display: 'flex',
                    alignItems: 'center',
                    paddingLeft: '21px',
                    paddingRight: '16px',
                    position: 'relative'
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
                      cursor: file.file.type.startsWith('image/') ? 'pointer' : 'default',
                      background: '#f0f0f0',
                      border: '1px solid rgba(0, 0, 0, 0.1)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                    onClick={() => {
                      if (file.file.type.startsWith('image/')) {
                        const url = URL.createObjectURL(file.file)
                        setLightboxSrc(url)
                      }
                    }}
                  >
                    {file.file.type.startsWith('image/') ? (
                      <img
                        src={URL.createObjectURL(file.file)}
                        alt={file.file.name}
                        style={{
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover'
                        }}
                      />
                    ) : (
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M14 2H6C5.46957 2 4.96086 2.21071 4.58579 2.58579C4.21071 2.96086 4 3.46957 4 4V20C4 20.5304 4.21071 21.0391 4.58579 21.4142C4.96086 21.7893 5.46957 22 6 22H18C18.5304 22 19.0391 21.7893 19.4142 21.4142C19.7893 21.0391 20 20.5304 20 20V8L14 2Z" stroke="#666" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M14 2V8H20" stroke="#666" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    )}
                  </div>

                  {/* 檔案名稱 */}
                  <div style={{ flex: 1, marginLeft: '12px', overflow: 'hidden' }}>
                    <p style={{
                      fontSize: '14px',
                      fontWeight: 500,
                      color: '#000',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap'
                    }}>
                      {file.file.name}
                    </p>
                    <p style={{
                      fontSize: '12px',
                      color: '#666',
                      marginTop: '2px'
                    }}>
                      {(file.file.size / 1024).toFixed(1)} KB
                    </p>
                  </div>

                  {/* 刪除按鈕 */}
                  <button
                    onClick={() => {
                      setCurrentEditingGroup(prev => ({
                        ...prev,
                        memoryFiles: prev.memoryFiles.filter((_, i) => i !== index)
                      }))
                    }}
                    disabled={isReadOnly || approvalStatus.isApproved}
                    className="p-2 text-black hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                    title="刪除檔案"
                  >
                    <Trash2 style={{ width: '32px', height: '28px' }} />
                  </button>
                </div>
              ))}
            </div>

            {/* 右側：輸入表單區域（含按鈕） */}
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {/* 輸入表單 - 完整框框 - 動態高度 */}
              <div
                style={{
                  width: `${LAYOUT_CONSTANTS.EDITOR_FORM_WIDTH}px`,
                  minHeight: `${LAYOUT_CONSTANTS.EDITOR_UPLOAD_HEIGHT}px`,
                  borderRadius: '30px',
                  overflow: 'hidden'
                }}
              >
              {/* 表頭 - 藍色區域 58px */}
              <div className="bg-[#3996fe] flex items-center" style={{ height: `${LAYOUT_CONSTANTS.EDITOR_FORM_HEADER_HEIGHT}px`, paddingLeft: '43px', paddingRight: '16px' }}>
                <div style={{ width: '199px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span className="text-white text-[20px] font-medium">加油日期</span>
                </div>
                <div style={{ width: '27px' }}></div>
                <div style={{ width: '230px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span className="text-white text-[20px] font-medium">加油量 (L)</span>
                </div>
                <div style={{ width: '40px' }}></div> {/* 刪除按鈕空間 */}
              </div>

              {/* 輸入行 - 白色區域 - 動態高度 */}
              <div className="bg-white" style={{ minHeight: '250px', paddingLeft: '43px', paddingRight: '16px', paddingTop: '16px', paddingBottom: '16px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
                {currentEditingGroup.records.map((record, index) => (
                  <div key={record.id} className="flex items-center" style={{ gap: '27px' }}>
                    {/* 日期輸入框（帶右側日曆圖示） */}
                    <div className="relative" style={{ width: '199px' }}>
                      <input
                        id={`date-input-${record.id}`}
                        type="date"
                        value={record.date}
                        onChange={(e) => updateCurrentGroupRecord(record.id, 'date', e.target.value)}
                        disabled={isReadOnly || approvalStatus.isApproved}
                        className="rounded-[5px] focus:outline-none focus:ring-2 focus:ring-blue-500"
                        style={{
                          width: '199px',
                          height: '52px',
                          border: '1px solid rgba(0, 0, 0, 0.25)',
                          background: '#FFF',
                          flexShrink: 0,
                          color: '#000',
                          fontFamily: 'Inter',
                          fontSize: '20px',
                          fontWeight: 400,
                          lineHeight: 'normal',
                          paddingLeft: '20px',
                          paddingRight: '48px',
                          paddingTop: '0',
                          paddingBottom: '0',
                          colorScheme: 'light',
                          WebkitAppearance: 'none',
                          MozAppearance: 'textfield'
                        }}
                      />
                      {/* 日曆圖示（右側，可點擊） */}
                      <div
                        className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer"
                        onClick={() => {
                          const input = document.getElementById(`date-input-${record.id}`) as HTMLInputElement
                          if (input && !input.disabled) {
                            input.showPicker?.()
                          }
                        }}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="27" height="23" viewBox="0 0 27 23" fill="none">
                          <path d="M18 1.89673V5.69037M9 1.89673V5.69037M3.375 9.48401H23.625M5.625 3.79355H21.375C22.6176 3.79355 23.625 4.64278 23.625 5.69037V18.9681C23.625 20.0157 22.6176 20.8649 21.375 20.8649H5.625C4.38236 20.8649 3.375 20.0157 3.375 18.9681V5.69037C3.375 4.64278 4.38236 3.79355 5.625 3.79355Z" stroke="#1E1E1E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </div>
                    </div>

                    {/* 加油量輸入框 */}
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={record.quantity || ''}
                      onChange={(e) => updateCurrentGroupRecord(record.id, 'quantity', parseFloat(e.target.value) || 0)}
                      disabled={isReadOnly || approvalStatus.isApproved}
                      placeholder="100"
                      className="rounded-[5px] focus:outline-none focus:ring-2 focus:ring-blue-500"
                      style={{
                        width: '230px',
                        height: '52px',
                        border: '1px solid rgba(0, 0, 0, 0.25)',
                        background: '#FFF',
                        flexShrink: 0,
                        color: '#000',
                        fontFamily: 'Inter',
                        fontSize: '20px',
                        fontWeight: 400,
                        lineHeight: 'normal',
                        paddingLeft: '20px',
                        paddingRight: '20px',
                        paddingTop: '0',
                        paddingBottom: '0',
                        WebkitAppearance: 'none',
                        MozAppearance: 'textfield'
                      }}
                    />

                    {/* 刪除按鈕（每行都有，但最後一行且只有一行時不顯示） */}
                    {currentEditingGroup.records.length > 1 ? (
                      <button
                        onClick={() => removeRecordFromCurrentGroup(record.id)}
                        disabled={isReadOnly || approvalStatus.isApproved}
                        className="p-2 text-black hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                        title="刪除此記錄"
                      >
                        <Trash2 style={{ width: '32px', height: '28px' }} />
                      </button>
                    ) : (
                      <div className="w-9 h-9"></div>
                    )}
                  </div>
                ))}
                </div>
              </div>
            </div>

            {/* 新增數據按鈕 */}
            <button
              onClick={addRecordToCurrentGroup}
              disabled={isReadOnly || approvalStatus.isApproved}
              style={{
                marginTop: '35px',
                width: '599px',
                height: '46px',
                flexShrink: 0,
                background: '#3996FE',
                border: 'none',
                borderRadius: '5px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center',
                color: '#FFF',
                textAlign: 'center',
                fontFamily: 'var(--sds-typography-body-font-family)',
                fontSize: '20px',
                fontStyle: 'normal',
                fontWeight: 400,
                lineHeight: '100%',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
              className="hover:opacity-90"
            >
              + 新增數據到此群組
            </button>
          </div>
          </div>
        </div>
      </div>

      {/* 保存群組按鈕 - 灰色框框下方 46px */}
      <div className="flex justify-center" style={{ marginTop: '46px' }}>
        <button
          onClick={saveCurrentGroup}
          style={{
            width: '237px',
            height: '46.25px',
            flexShrink: 0,
            borderRadius: '7px',
            border: '1px solid rgba(0, 0, 0, 0.50)',
            background: '#000',
            boxShadow: '0 4px 4px 0 rgba(0, 0, 0, 0.25)',
            cursor: 'pointer',
            color: '#FFF',
            textAlign: 'center',
            fontFamily: 'var(--sds-typography-body-font-family)',
            fontSize: '20px',
            fontStyle: 'normal',
            fontWeight: 'var(--sds-typography-body-font-weight-regular)',
            lineHeight: '100%'
          }}
        >
          {currentEditingGroup.groupId === null ? '+ 新增群組' : '變更儲存'}
        </button>
      </div>

      {/* ==================== 資料列表區塊 ==================== */}
      <div className="max-w-6xl mx-auto px-4 mb-8" style={{ marginTop: '116.75px' }}>
        <div className="flex items-center gap-3" style={{ marginBottom: '80px' }}>
          <div className="w-[42px] h-[42px] bg-[#3996fe] rounded-[10px] flex items-center justify-center">
            <svg className="w-[34px] h-[34px] text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </div>
          <h3 style={{
            color: '#000',
            fontFamily: 'Inter',
            fontSize: '28px',
            fontStyle: 'normal',
            fontWeight: 500,
            lineHeight: '42px'
          }}>資料列表</h3>
        </div>

        {/* 群組列表 */}
        <div className="space-y-4 flex flex-col items-center">
          {Array.from(new Set(savedGroups.map(r => r.groupId))).map((groupId, index) => {
            const groupRecords = savedGroups.filter(r => r.groupId === groupId)
            const firstRecord = groupRecords[0]
            const evidenceFile = firstRecord?.evidenceFiles?.[0]
            const memoryFile = firstRecord?.memoryFiles?.[0]
            const hasFile = evidenceFile || memoryFile

            return (
              <div
                key={groupId}
                className="flex items-center"
                style={{
                  width: `${LAYOUT_CONSTANTS.GROUP_LIST_WIDTH}px`,
                  height: `${LAYOUT_CONSTANTS.GROUP_LIST_HEIGHT}px`,
                  flexShrink: 0,
                  borderRadius: '28px',
                  border: '1px solid rgba(0, 0, 0, 0.25)',
                  background: '#FFF',
                  paddingLeft: '26px',
                  gap: '39px'
                }}
              >
                {/* 編號 */}
                <div className="w-[42px] h-[42px] bg-black rounded-full flex items-center justify-center">
                  <span className="text-white text-[18px] font-medium">{index + 1}</span>
                </div>

                {/* 檔案預覽 */}
                <div
                  className="flex items-center justify-center"
                  style={{
                    width: '55.769px',
                    height: '55.769px',
                    flexShrink: 0,
                    borderRadius: '10px',
                    border: '1px solid rgba(0, 0, 0, 0.25)',
                    background: '#EBEDF0',
                    overflow: 'hidden',
                    cursor: (() => {
                      const mimeType = evidenceFile?.mime_type || memoryFile?.mime_type || memoryFile?.file?.type
                      return mimeType?.startsWith('image/') ? 'pointer' : 'default'
                    })()
                  }}
                  onClick={() => {
                    const mimeType = evidenceFile?.mime_type || memoryFile?.mime_type || memoryFile?.file?.type
                    // 只有圖片可以點擊預覽
                    if (mimeType?.startsWith('image/')) {
                      if (evidenceFile) {
                        getFileUrl(evidenceFile.file_path).then(url => setLightboxSrc(url))
                      } else if (memoryFile?.file) {
                        const url = URL.createObjectURL(memoryFile.file)
                        setLightboxSrc(url)
                      }
                    }
                  }}
                >
                  {(() => {
                    const mimeType = evidenceFile?.mime_type || memoryFile?.mime_type || memoryFile?.file?.type
                    const fileName = evidenceFile?.file_name || memoryFile?.file_name

                    // 1. 圖片：顯示縮圖
                    if (mimeType?.startsWith('image/')) {
                      if (evidenceFile) {
                        const thumbnailUrl = thumbnails[evidenceFile.id]
                        return thumbnailUrl ? (
                          <img src={thumbnailUrl} alt="preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                          <span className="text-[24px]">🖼️</span>
                        )
                      } else if (memoryFile) {
                        const previewUrl = memoryFile.preview || (memoryFile.file ? URL.createObjectURL(memoryFile.file) : '')
                        return previewUrl ? (
                          <img src={previewUrl} alt="preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                          <span className="text-[24px]">🖼️</span>
                        )
                      }
                    }

                    // 2. PDF：紅色 icon
                    if (mimeType === 'application/pdf') {
                      return (
                        <svg width="36" height="36" viewBox="0 0 24 24" fill="none">
                          <path d="M14 2H6C5.46957 2 4.96086 2.21071 4.58579 2.58579C4.21071 2.96086 4 3.46957 4 4V20C4 20.5304 4.21071 21.0391 4.58579 21.4142C4.96086 21.7893 5.46957 22 6 22H18C18.5304 22 19.0391 21.7893 19.4142 21.4142C19.7893 21.0391 20 20.5304 20 20V8L14 2Z" stroke="#DC2626" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          <path d="M14 2V8H20" stroke="#DC2626" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          <text x="12" y="17" fontSize="7" fill="#DC2626" textAnchor="middle" fontWeight="bold">PDF</text>
                        </svg>
                      )
                    }

                    // 3. Excel：綠色 icon
                    if (mimeType?.includes('excel') || mimeType?.includes('spreadsheet') ||
                        fileName?.match(/\.(xlsx?|xls)$/i)) {
                      return (
                        <svg width="36" height="36" viewBox="0 0 24 24" fill="none">
                          <path d="M14 2H6C5.46957 2 4.96086 2.21071 4.58579 2.58579C4.21071 2.96086 4 3.46957 4 4V20C4 20.5304 4.21071 21.0391 4.58579 21.4142C4.96086 21.7893 5.46957 22 6 22H18C18.5304 22 19.0391 21.7893 19.4142 21.4142C19.7893 21.0391 20 20.5304 20 20V8L14 2Z" stroke="#16A34A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          <path d="M14 2V8H20" stroke="#16A34A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          <text x="12" y="17" fontSize="6.5" fill="#16A34A" textAnchor="middle" fontWeight="bold">XLS</text>
                        </svg>
                      )
                    }

                    // 4. Word：藍色 icon
                    if (mimeType?.includes('wordprocessingml') || mimeType === 'application/msword' ||
                        fileName?.match(/\.(docx?|doc)$/i)) {
                      return (
                        <svg width="36" height="36" viewBox="0 0 24 24" fill="none">
                          <path d="M14 2H6C5.46957 2 4.96086 2.21071 4.58579 2.58579C4.21071 2.96086 4 3.46957 4 4V20C4 20.5304 4.21071 21.0391 4.58579 21.4142C4.96086 21.7893 5.46957 22 6 22H18C18.5304 22 19.0391 21.7893 19.4142 21.4142C19.7893 21.0391 20 20.5304 20 20V8L14 2Z" stroke="#2563EB" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          <path d="M14 2V8H20" stroke="#2563EB" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          <text x="12" y="17" fontSize="6.5" fill="#2563EB" textAnchor="middle" fontWeight="bold">DOC</text>
                        </svg>
                      )
                    }

                    // 5. 其他檔案：灰色 icon
                    if (hasFile) {
                      return (
                        <svg width="36" height="36" viewBox="0 0 24 24" fill="none">
                          <path d="M14 2H6C5.46957 2 4.96086 2.21071 4.58579 2.58579C4.21071 2.96086 4 3.46957 4 4V20C4 20.5304 4.21071 21.0391 4.58579 21.4142C4.96086 21.7893 5.46957 22 6 22H18C18.5304 22 19.0391 21.7893 19.4142 21.4142C19.7893 21.0391 20 20.5304 20 20V8L14 2Z" stroke="#666666" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          <path d="M14 2V8H20" stroke="#666666" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      )
                    }

                    // 6. 無檔案：資料夾 icon
                    return <span className="text-[24px]">📁</span>
                  })()}
                </div>

                {/* 檔名 */}
                <div className="flex-1">
                  <p className="text-[16px] text-black font-medium">
                    {evidenceFile?.file_name || memoryFile?.file_name || '無佐證'}
                  </p>
                  <p className="text-[15px] text-gray-500">
                    {evidenceFile ? `${(evidenceFile.file_size / 1024).toFixed(1)} KB` : memoryFile ? `${(memoryFile.file_size / 1024).toFixed(1)} KB` : ''}
                  </p>
                </div>

                {/* 使用數據 */}
                <div className="text-center">
                  <p className="text-[24px] text-black">/ 使用數據</p>
                </div>

                {/* 筆數 */}
                <div className="text-center">
                  <p className="text-[28px] font-medium text-black">{groupRecords.length} 筆</p>
                </div>

                {/* 操作按鈕組 */}
                <div className="flex items-center" style={{ gap: '8px', marginRight: '20px' }}>
                  {/* 編輯按鈕 */}
                  <button
                    onClick={() => loadGroupToEditor(groupId!)}
                    disabled={isReadOnly || approvalStatus.isApproved}
                    className="p-2 text-black hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    title="編輯群組"
                  >
                    <Pencil className="w-6 h-6" />
                  </button>

                  {/* 刪除按鈕 */}
                  <button
                    onClick={() => deleteSavedGroup(groupId!)}
                    disabled={isReadOnly || approvalStatus.isApproved}
                    className="p-2 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    title="刪除群組"
                  >
                    <Trash2 className="w-7 h-7" style={{ color: '#DC2626' }} />
                  </button>
                </div>
              </div>
            )
          })}

          {savedGroups.length === 0 && (
            <div className="text-center py-8 text-gray-400">
              尚無已新增的群組
            </div>
          )}
        </div>
      </div>

      {/* 審核區塊 - 只在審核模式顯示 */}
      {isReviewMode && (
        <div className="max-w-4xl mx-auto mt-8">
          <ReviewSection
            entryId={reviewEntryId || currentEntryId || `diesel_${year}`}
            userId={reviewUserId || "current_user"}
            category="柴油"
            userName="填報用戶"
            amount={dieselData.reduce((sum, item) => sum + item.quantity, 0)}
            unit="L"
            role={role}
            onSave={handleSave}
            isSaving={submitLoading}
            onApprove={() => {
              // ReviewSection 會處理 API 呼叫和導航
            }}
            onReject={(reason) => {
              // ReviewSection 會處理 API 呼叫和導航
            }}
          />
        </div>
      )}

      <div className="h-20"></div>

      {/* 清除確認模態框 */}
      <ConfirmClearModal
        show={showClearConfirmModal}
        onConfirm={handleClearConfirm}
        onCancel={() => setShowClearConfirmModal(false)}
        isClearing={clearLoading}
      />

      {/* Lightbox：點圖放大 */}
      {lightboxSrc && createPortal(
        <div
          className="fixed inset-0 flex items-center justify-center bg-black/70"
          style={{ zIndex: LAYOUT_CONSTANTS.MODAL_Z_INDEX }}
          onClick={() => setLightboxSrc(null)}
        >
          <img
            src={lightboxSrc}
            alt="佐證放大"
            className="max-w-[90vw] max-h-[90vh] rounded shadow-xl cursor-zoom-out"
            onClick={(e) => e.stopPropagation()}
          />
          <button
            className="absolute top-4 right-4 text-white text-3xl leading-none hover:text-gray-300"
            aria-label="Close"
            onClick={() => setLightboxSrc(null)}
          >
            <X className="w-8 h-8" />
          </button>
        </div>,
        document.body
      )}

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

      {/* 提交成功彈窗 */}
      <SuccessModal
        show={showSuccessModal}
        message={success || ''}
        type={successModalType}
        onClose={() => setShowSuccessModal(false)}
      />
    </SharedPageLayout>
    </>
  );
}
