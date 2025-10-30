/**
 * GasolinePage - 汽油使用量填報頁面
 *
 * 檔案儲存架構：
 * - Supabase Storage 路徑：other/2025/gasoline/
 * - 資料庫記錄識別：page_key = 'gasoline' + record_index = 0/1/2/3
 * - 單一統一資料夾，使用 record_index 欄位區分不同記錄的檔案
 *
 * 與其他頁面不同：
 * - 其他頁面：單筆記錄 → page_key 唯一識別
 * - 汽油頁面：多筆記錄 → page_key + record_index 組合識別
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom'
import { AlertCircle, X, Trash2, Eye, Loader2, CheckCircle, Download } from 'lucide-react'
import EvidenceUpload from '../../components/EvidenceUpload';
import { MemoryFile } from '../../components/EvidenceUpload';
import { EntryStatus } from '../../components/StatusSwitcher';
import BottomActionBar from '../../components/BottomActionBar';
import ReviewSection from '../../components/ReviewSection'
import { useEditPermissions } from '../../hooks/useEditPermissions';
import { useFrontendStatus } from '../../hooks/useFrontendStatus';
import { useApprovalStatus } from '../../hooks/useApprovalStatus';
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


interface GasolineRecord {
  id: string;  // ⭐ 改為 string 型別（穩定的 recordId）
  date: string;              // 使用日期
  quantity: number;          // 使用量(L)
  evidenceFiles?: EvidenceFile[];
  memoryFiles?: MemoryFile[];
  groupId?: string;          // ⭐ 群組 ID（undefined = 未上傳區）
}

export default function GasolinePage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  // 審核模式檢測
  const isReviewMode = searchParams.get('mode') === 'review'
  const reviewEntryId = searchParams.get('entryId')
  const reviewUserId = searchParams.get('userId')

  const pageKey = 'gasoline'
  const [year] = useState(new Date().getFullYear())
  const [initialStatus, setInitialStatus] = useState<EntryStatus>('submitted')
  const [currentEntryId, setCurrentEntryId] = useState<string | null>(null)
  const { executeSubmit, submitting } = useSubmitGuard()
  const [hasSubmittedBefore, setHasSubmittedBefore] = useState(false)
  const [showSuccessModal, setShowSuccessModal] = useState(false)
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

  const editPermissions = useEditPermissions(currentStatus, isReadOnly, role)

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

  // ⭐ 初始化時給一個 groupId
  const [initialGroupId] = useState(generateRecordId())
  const [gasolineData, setGasolineData] = useState<GasolineRecord[]>([
    {
      id: generateRecordId(),
      date: '',
      quantity: 0,
      evidenceFiles: [],
      memoryFiles: [],
      groupId: initialGroupId  // ⭐ 給第一筆記錄一個 groupId
    },
  ]);

  // 檢查是否有填寫任何資料
  const hasAnyData = useMemo(() => {
    return gasolineData.some(r =>
      r.date.trim() !== '' ||
      r.quantity > 0 ||
      (r.memoryFiles && r.memoryFiles.length > 0)
    )
  }, [gasolineData])

  // 第一步：載入記錄資料（不等檔案）
  useEffect(() => {
    if (loadedEntry && !dataLoading) {
      const entryStatus = loadedEntry.status as EntryStatus
      setInitialStatus(entryStatus)
      setCurrentEntryId(loadedEntry.id)
      setHasSubmittedBefore(true)

      // ⭐ 同步前端狀態
      setCurrentStatus(entryStatus)

      // 從 payload 取得汽油使用資料
      if (loadedEntry.payload?.gasolineData) {
        // 確保 gasolineData 是陣列
        const dataArray = Array.isArray(loadedEntry.payload.gasolineData)
          ? loadedEntry.payload.gasolineData
          : []

        if (dataArray.length > 0) {
          // 先載入記錄資料，檔案欄位暫時為空（不阻塞顯示）
          const updated = dataArray.map((item: any) => ({
            ...item,
            id: String(item.id || generateRecordId()),  // ⭐ 確保 id 是字串型別
            evidenceFiles: [],  // 先空著，稍後由檔案載入 useEffect 分配
            memoryFiles: [],
          }))

          // ⭐ 檢查是否已有空白記錄，沒有才添加
          const hasBlankRecord = updated.some((r: GasolineRecord) =>
            r.date.trim() === '' &&
            r.quantity === 0 &&
            (!r.memoryFiles || r.memoryFiles.length === 0)
          )

          let finalData = updated
          if (!hasBlankRecord) {
            const newGroupId = generateRecordId()
            const blankRecord: GasolineRecord = {
              id: generateRecordId(),
              date: '',
              quantity: 0,
              evidenceFiles: [],
              memoryFiles: [],
              groupId: newGroupId
            }
            finalData = [blankRecord, ...updated]
            console.log(`🔍 [GasolinePage] 添加空白群組`)
          } else {
            console.log(`🔍 [GasolinePage] 已有空白群組，不重複添加`)
          }

          console.log(`🔍 [GasolinePage] Loaded records: ${updated.length}`)
          setGasolineData(finalData)

          // ⭐ 載入檔案映射表
          const payload = loadedEntry.payload || loadedEntry.extraPayload
          if (payload) {
            loadFileMapping(payload)
          }
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadedEntry, dataLoading])

  // 第二步：檔案載入後分配到記錄（非破壞性更新）
  useEffect(() => {
    // ⭐ 等待檔案載入完成（避免在 files = [] 時執行）
    if (dataLoading) {
      console.log('🔍 [GasolinePage] 等待檔案載入中...')
      return
    }

    if (loadedFiles.length > 0 && gasolineData.length > 1) {
      // 檔案過濾：只取 file_type='other' 且 page_key === pageKey 的檔案
      const gasolineFiles = loadedFiles.filter(f =>
        f.file_type === 'other' && f.page_key === pageKey
      )

      if (gasolineFiles.length > 0) {
        // ✅ 先清理所有檔案,再分配給記錄(避免 EvidenceUpload 載入幽靈檔案)
        const cleanAndAssignFiles = async () => {
          console.log('🔍 [GasolinePage] Starting ghost file cleanup for', gasolineFiles.length, 'files')

          // 第一階段：清理所有幽靈檔案（使用 Hook）
          const validGasolineFiles = await cleanFiles(gasolineFiles)
          console.log('✅ [GasolinePage] Cleanup complete. Valid files:', validGasolineFiles.length)

          // ⭐ 第二階段：使用 recordId 分配檔案（非破壞性更新）
          setGasolineData(prev => {
            console.log(`📂 [GasolinePage] Updating ${prev.length} records with files`)

            const updatedRows = prev.map((item) => {
              // ✅ 使用 recordId 查找檔案，取代陣列索引
              const filesForThisRecord = getRecordFiles(item.id, validGasolineFiles)

              return {
                ...item,  // ✅ 保留所有原有資料（id, date, quantity）
                evidenceFiles: filesForThisRecord,
                memoryFiles: []  // ✅ 清空 memoryFiles，避免重複提交
              }
            })

            console.log(`✅ [GasolinePage] Assigned files to ${updatedRows.filter(r => r.evidenceFiles && r.evidenceFiles.length > 0).length} records`)
            return updatedRows
          })
        }

        cleanAndAssignFiles()
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadedFiles, pageKey, dataLoading])

  const addNewEntry = () => {
    const lastRecord = gasolineData[gasolineData.length - 1]

    const newEntry: GasolineRecord = {
      id: generateRecordId(),  // ⭐ 使用 generateRecordId
      date: '',
      quantity: 0,
      evidenceFiles: lastRecord?.evidenceFiles || [],  // ✅ 自動帶入上一筆的檔案
      memoryFiles: lastRecord?.memoryFiles || []  // ✅ 也複製記憶體檔案
    };
    setGasolineData(prev => [...prev, newEntry]);
  };

  const removeEntry = (id: string) => {  // ⭐ 改為 string 型別
    if (gasolineData.length > 1) {
      // ⭐ 移除檔案映射
      removeRecordMapping(id)
      setGasolineData(prev => prev.filter(r => r.id !== id))
    }
  };

  const updateEntry = useCallback((id: string, field: keyof GasolineRecord, value: any) => {  // ⭐ 改為 string 型別
    setGasolineData(prev => prev.map(item => item.id === id ? { ...item, [field]: value } : item));
  }, []);

  // 為每個記錄建立穩定的 callback
  const handleMemoryFilesChange = useCallback((id: string) => {  // ⭐ 改為 string 型別
    return (files: MemoryFile[]) => updateEntry(id, 'memoryFiles', files);
  }, [updateEntry]);

  // ✅ 刪除佐證（清空所有使用該檔案的記錄，群組保留）
  const deleteEvidence = async (evidenceId: string) => {
    try {
      // Check if admin in review mode
      if (role === 'admin' && isReviewMode) {
        await adminDeleteEvidence(evidenceId)
      } else {
        await deleteEvidenceFile(evidenceId)
      }

      // ⭐ 清空所有使用這個檔案的記錄（但保留 groupId）
      setGasolineData(prev => prev.map(record =>
        record.evidenceFiles?.[0]?.id === evidenceId
          ? { ...record, evidenceFiles: [], memoryFiles: [] }  // ⭐ 群組變成空群組
          : record
      ))

      setSuccess('佐證已刪除，群組已變成空群組')
    } catch (error) {
      setError(error instanceof Error ? error.message : '刪除佐證失敗')
    }
  }

  // ✅ 群組的暫存檔案（Key = 群組 ID，Value = 暫存檔案）
  const [groupMemoryFiles, setGroupMemoryFiles] = useState<Record<string, MemoryFile[]>>({})

  // ✅ 新增佐證群組
  const addNewGroup = () => {
    const newGroupId = generateRecordId()

    // 建立第一筆空記錄
    const newRecord: GasolineRecord = {
      id: generateRecordId(),
      date: '',
      quantity: 0,
      evidenceFiles: [],
      memoryFiles: [],
      groupId: newGroupId
    }

    // ⭐ 新記錄放在最前面（新的在上方）
    setGasolineData(prev => [newRecord, ...prev])

    // 初始化該群組的 memoryFiles
    setGroupMemoryFiles(prev => ({
      ...prev,
      [newGroupId]: []
    }))

    setSuccess('已新增佐證群組')
  }


  // ✅ 在特定群組新增記錄
  const addRecordToGroup = (groupId: string) => {
    const newRecord: GasolineRecord = {
      id: generateRecordId(),
      date: '',
      quantity: 0,
      evidenceFiles: [],
      memoryFiles: [],
      groupId: groupId  // ⭐ 直接使用 groupId，不再特殊處理
    }

    setGasolineData(prev => [...prev, newRecord])
  }

  // ✅ 刪除整個群組（包含所有記錄）
  const deleteGroup = (groupId: string) => {
    const groupRecords = gasolineData.filter(r => r.groupId === groupId)

    if (!window.confirm(`刪除此群組後，所有 ${groupRecords.length} 筆記錄將一併刪除。確定要刪除嗎？`)) {
      return
    }

    // ⭐ 直接刪除該群組的所有記錄
    setGasolineData(prev => prev.filter(r => r.groupId !== groupId))

    // 清除該群組的 memoryFiles
    setGroupMemoryFiles(prev => {
      const newMap = { ...prev }
      delete newMap[groupId]
      return newMap
    })

    // ⭐ 移除檔案映射
    removeRecordMapping(groupId)

    setSuccess('群組已刪除')
  }

  const handleSubmit = async () => {
    await executeSubmit(async () => {
      const totalQuantity = gasolineData.reduce((sum, item) => sum + item.quantity, 0)

      // ✅ 清理 payload：只送基本資料，移除 File 物件
      const cleanedGasolineData = gasolineData.map(r => ({
        id: r.id,
        date: r.date,
        quantity: r.quantity,
        groupId: r.groupId  // ⭐ 保存 groupId
      }))

      // ⭐ 建立群組 → recordIds 映射表
      const groupRecordIds = new Map<string, string[]>()
      gasolineData.forEach(record => {
        if (record.groupId) {
          if (!groupRecordIds.has(record.groupId)) {
            groupRecordIds.set(record.groupId, [])
          }
          groupRecordIds.get(record.groupId)!.push(record.id)
        }
      })

      // ⭐ 去重：每個群組只保留第一個 record 的 memoryFiles（避免重複上傳）
      const seenGroupIds = new Set<string>()
      const deduplicatedRecordData = gasolineData.map(record => {
        const allRecordIds = record.groupId ? groupRecordIds.get(record.groupId) : [record.id]

        if (record.groupId && seenGroupIds.has(record.groupId)) {
          // 同群組的第 2+ 筆記錄：清空 memoryFiles（不重複上傳）
          return { ...record, memoryFiles: [], allRecordIds }
        }
        if (record.groupId) {
          seenGroupIds.add(record.groupId)
        }
        return { ...record, allRecordIds }
      })

      // ⭐ 使用 hook 的 submit 函數
      await submit({
        entryInput: {
          page_key: pageKey,
          period_year: year,
          unit: 'L',
          monthly: { '1': totalQuantity },
          notes: `汽油使用共 ${gasolineData.length} 筆記錄`,
          extraPayload: {
            gasolineData: cleanedGasolineData,
            fileMapping: getFileMappingForPayload()  // ⭐ 第一次就存完整資料
          }
        },
        recordData: deduplicatedRecordData,  // ⭐ 使用去重後的資料（含 allRecordIds）
        uploadRecordFiles,
        onSuccess: async (entry_id) => {
          // ⭐ 簡化為只有收尾工作
          setCurrentEntryId(entry_id)
          await reload()
          setHasSubmittedBefore(true)
        }
      })

      await handleSubmitSuccess();

      // 重新載入審核狀態，更新狀態橫幅
      reloadApprovalStatus()

      setShowSuccessModal(true)
    }).catch(error => {
      setError(error instanceof Error ? error.message : '提交失敗，請重試');
    })
  };

  const handleSave = async () => {
    await executeSubmit(async () => {
      setError(null)
      setSuccess(null)

      const totalQuantity = gasolineData.reduce((sum, item) => sum + item.quantity, 0)

      // 審核模式：使用 useAdminSave hook
      if (isReviewMode && reviewEntryId) {
        console.log('📝 管理員審核模式：使用 useAdminSave hook', reviewEntryId)

        const cleanedGasolineData = gasolineData.map(r => ({
          id: r.id,
          date: r.date,
          quantity: r.quantity,
          groupId: r.groupId
        }))

        // 準備檔案列表：從 groupMemoryFiles 收集所有檔案
        const filesToUpload = evidenceGroups.flatMap((group, groupIndex) => {
          const memFiles = groupMemoryFiles[group.groupId] || []
          const recordIndex = gasolineData.findIndex(r => r.groupId === group.groupId)
          
          // Collect all record IDs in this group
          const groupRecordIds = group.records.map((r: any) => r.id)
          
          return memFiles.map(mf => ({
            file: mf.file,
            metadata: {
              recordIndex: recordIndex >= 0 ? recordIndex : groupIndex,
              allRecordIds: groupRecordIds
            }
          }))
        })

        await adminSave({
          updateData: {
            unit: 'L',
            amount: totalQuantity,
            payload: {
              monthly: { '1': totalQuantity },
              gasolineData: cleanedGasolineData,
              fileMapping: getFileMappingForPayload()
            }
          },
          files: filesToUpload
        })

        await reload()
        reloadApprovalStatus()
        // 清空記憶體檔案（在 reload 之後，避免檔案暫時消失）
        setGroupMemoryFiles({})
        setSuccess('✅ 儲存成功！資料已更新')
        return
      }

      // 非審核模式：原本的邏輯
      // ✅ 清理 payload：只送基本資料，移除 File 物件
      const cleanedGasolineData = gasolineData.map(r => ({
        id: r.id,
        date: r.date,
        quantity: r.quantity,
        groupId: r.groupId  // ⭐ 保存 groupId
      }))

      // ⭐ 建立群組 → recordIds 映射表
      const groupRecordIds = new Map<string, string[]>()
      gasolineData.forEach(record => {
        if (record.groupId) {
          if (!groupRecordIds.has(record.groupId)) {
            groupRecordIds.set(record.groupId, [])
          }
          groupRecordIds.get(record.groupId)!.push(record.id)
        }
      })

      // ⭐ 去重 + 附加 allRecordIds
      const seenGroupIds = new Set<string>()
      const deduplicatedRecordData = gasolineData.map(record => {
        const allRecordIds = record.groupId ? groupRecordIds.get(record.groupId) : [record.id]

        if (record.groupId && seenGroupIds.has(record.groupId)) {
          // 同群組的第 2+ 筆記錄：清空 memoryFiles（不重複上傳）
          return { ...record, memoryFiles: [], allRecordIds }
        }
        if (record.groupId) {
          seenGroupIds.add(record.groupId)
        }
        return { ...record, allRecordIds }
      })

      // ⭐ 使用 hook 的 save 函數（跳過驗證）
      await save({
        entryInput: {
          page_key: pageKey,
          period_year: year,
          unit: 'L',
          monthly: { '1': totalQuantity },
          notes: `汽油使用共 ${gasolineData.length} 筆記錄`,
          extraPayload: {
            gasolineData: cleanedGasolineData,
            fileMapping: getFileMappingForPayload()  // ⭐ 第一次就存 fileMapping
          }
        },
        recordData: deduplicatedRecordData,  // ⭐ 包含 allRecordIds
        uploadRecordFiles,
        onSuccess: async (entry_id) => {
          // ⭐ 簡化為 3 行（原本 ~55 行）
          setCurrentEntryId(entry_id)
          await reload()
          setHasSubmittedBefore(true)
        }
      })

      // 重新載入審核狀態，更新狀態橫幅
      reloadApprovalStatus()

      setSuccess('暫存成功！資料已儲存')
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
      // 收集所有檔案和記憶體檔案
      const allFiles = gasolineData.flatMap(r => r.evidenceFiles || [])
      const allMemoryFiles = gasolineData.map(r => r.memoryFiles || [])

      // 使用 Hook 清除
      await clear({
        filesToDelete: allFiles,
        memoryFilesToClean: allMemoryFiles
      })

      // 重置前端狀態
      const newGroupId = generateRecordId()
      setGasolineData([{
        id: generateRecordId(),  // ⭐ 使用 generateRecordId
        date: '',
        quantity: 0,
        evidenceFiles: [],
        memoryFiles: [],
        groupId: newGroupId  // ⭐ 添加 groupId
      }])
      setCurrentEntryId(null)
      setHasSubmittedBefore(false)
      setShowClearConfirmModal(false)
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
    records: GasolineRecord[]
  }

  const evidenceGroups = useMemo((): EvidenceGroup[] => {
    // ⭐ 按 gasolineData 順序收集唯一的 groupId（保持順序）
    const seenGroupIds = new Set<string>()
    const groupIds: string[] = []

    gasolineData.forEach(record => {
      if (record.groupId && !seenGroupIds.has(record.groupId)) {
        seenGroupIds.add(record.groupId)
        groupIds.push(record.groupId)
      }
    })

    // ⭐ 按收集到的順序建立 groups（所有群組平等）
    const result: EvidenceGroup[] = []

    groupIds.forEach(groupId => {
      const records = gasolineData.filter(r => r.groupId === groupId)
      const evidence = records.find(r => r.evidenceFiles && r.evidenceFiles.length > 0)?.evidenceFiles?.[0]
      result.push({ groupId, evidence: evidence || null, records })
    })

    // ✅ 排序：空白群組置頂，其他按時間新→舊
    return result.sort((a, b) => {
      const aIsEmpty = a.records.every(r =>
        !r.date.trim() &&
        r.quantity === 0 &&
        (!r.memoryFiles || r.memoryFiles.length === 0)
      ) && !a.evidence

      const bIsEmpty = b.records.every(r =>
        !r.date.trim() &&
        r.quantity === 0 &&
        (!r.memoryFiles || r.memoryFiles.length === 0)
      ) && !b.evidence

      if (aIsEmpty && !bIsEmpty) return -1  // 空白群組在前
      if (!aIsEmpty && bIsEmpty) return 1
      return 0  // 保持原順序（新的在前）
    })
  }, [gasolineData])

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

  // Loading 狀態
  if (dataLoading) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ backgroundColor: designTokens.colors.background }}
      >
        <div className="text-center">
          <Loader2
            className="w-12 h-12 animate-spin mx-auto mb-4"
            style={{ color: designTokens.colors.accentPrimary }}
          />
          <p style={{ color: designTokens.colors.textPrimary }}>載入中...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-green-50">
      <div className="px-6 py-8">
        <div className="text-center mb-8">
          {/* 審核模式指示器 */}
          {isReviewMode && (
            <div className="mb-4 p-3 bg-orange-100 border-2 border-orange-300 rounded-lg max-w-4xl mx-auto">
              <div className="flex items-center justify-center">
                <Eye className="w-5 h-5 text-orange-600 mr-2" />
                <span className="text-orange-800 font-medium">
                  📋 審核模式 - 查看填報內容
                </span>
              </div>
              <p className="text-sm text-orange-600 mt-1">
                所有輸入欄位已鎖定，僅供審核查看
              </p>
            </div>
          )}

          <h1 className="text-3xl font-semibold mb-3" style={{ color: designTokens.colors.textPrimary }}>
            汽油使用量填報
          </h1>
          <p className="text-base" style={{ color: designTokens.colors.textSecondary }}>
            {isReviewMode
              ? '管理員審核模式 - 檢視填報內容和相關檔案'
              : '請上傳加油單或發票作為佐證文件，並完整填寫使用日期與使用量'
            }
          </p>
        </div>

        {/* 審核狀態橫幅 */}
        {!isReviewMode && approvalStatus.isSaved && (
          <div className="bg-blue-100 border-l-4 border-blue-500 text-blue-700 p-4 mb-6 rounded-r-lg max-w-4xl mx-auto">
            <div className="flex items-center">
              <div className="text-2xl mr-3">💾</div>
              <div>
                <p className="font-bold text-lg">資料已暫存</p>
                <p className="text-sm mt-1">您的資料已儲存，可隨時修改後提交審核。</p>
              </div>
            </div>
          </div>
        )}

        {!isReviewMode && approvalStatus.isApproved && (
          <div className="bg-green-100 border-l-4 border-green-500 text-green-700 p-4 mb-6 rounded-r-lg max-w-4xl mx-auto">
            <div className="flex items-center">
              <div className="text-2xl mr-3">🎉</div>
              <div>
                <p className="font-bold text-lg">恭喜您已審核通過！</p>
                <p className="text-sm mt-1">此填報已完成審核，資料已鎖定無法修改。</p>
              </div>
            </div>
          </div>
        )}

        {!isReviewMode && approvalStatus.isRejected && (
          <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-6 rounded-r-lg max-w-4xl mx-auto">
            <div className="flex items-start">
              <div className="text-2xl mr-3 mt-0.5">⚠️</div>
              <div className="flex-1">
                <p className="font-bold text-lg">填報已被退回</p>
                <p className="text-sm mt-2">
                  <span className="font-semibold">退回原因：</span>
                  {approvalStatus.reviewNotes || '無'}
                </p>
                {approvalStatus.reviewedAt && (
                  <p className="text-xs mt-1 text-red-600">
                    退回時間：{new Date(approvalStatus.reviewedAt).toLocaleString('zh-TW')}
                  </p>
                )}
                <p className="text-sm mt-2 text-red-600">
                  請修正後重新提交
                </p>
              </div>
            </div>
          </div>
        )}

        {!isReviewMode && approvalStatus.isPending && (
          <div className="bg-green-100 border-l-4 border-green-500 text-green-700 p-4 mb-6 rounded-r-lg max-w-4xl mx-auto">
            <div className="flex items-center">
              <div className="text-2xl mr-3">📋</div>
              <div>
                <p className="font-bold text-lg">等待審核中</p>
                <p className="text-sm mt-1">您的填報已提交，請等待管理員審核。</p>
              </div>
            </div>
          </div>
        )}

        {/* 外層白色卡片：置中 + 自動包住內容寬度 */}
        <div className="flex justify-center">
          <div
            className="rounded-lg border p-6 mx-auto w-fit"
            style={{
              backgroundColor: designTokens.colors.cardBg,
              borderColor: designTokens.colors.border,
              boxShadow: designTokens.shadows.sm,
            }}
          >
            <h3 className="text-2xl font-bold mb-6 text-center" style={{ color: designTokens.colors.textPrimary }}>
              汽油使用記錄
            </h3>

            {/* 控制填寫區總寬度 */}
            <div className="w-[1000px] mx-auto space-y-6">

              {/* 新增群組按鈕（移到這裡） */}
              {!isReadOnly && !approvalStatus.isApproved && !isReviewMode && (
                <div className="flex justify-center py-4">
                  <button
                    onClick={addNewGroup}
                    disabled={submitting}
                    className="px-8 py-3 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-xl font-semibold shadow-md hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-3"
                  >
                    <span className="text-2xl">+</span>
                    <span>新增佐證群組</span>
                  </button>
                </div>
              )}

              {/* 群組卡片渲染 */}
              <div className="space-y-6">
                {evidenceGroups.map((group, groupIndex) => {
                  const groupId = group.groupId
                  const currentMemoryFiles = groupMemoryFiles[groupId] || []

                  if (group.evidence === null) {
                    // ==================== 空群組（藍色） ====================
                    return (
                      <div
                        key={groupId}
                        className="bg-gradient-to-br from-blue-50 to-blue-100/50 border-2 border-blue-200 rounded-xl p-6 shadow-md"
                      >
                        <div className="flex items-center justify-between mb-5">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-blue-200 flex items-center justify-center">
                              <span className="text-2xl">📁</span>
                            </div>
                            <div>
                              <h4 className="text-lg font-bold text-blue-900">
                                佐證群組
                              </h4>
                              <p className="text-sm text-blue-700">
                                {group.records.length} 筆記錄
                              </p>
                            </div>
                          </div>
                          <button
                            onClick={() => deleteGroup(groupId)}
                            disabled={isReadOnly || approvalStatus.isApproved}
                            className="px-4 py-2 text-sm bg-red-500 hover:bg-red-600 text-white rounded-lg font-medium shadow-sm hover:shadow transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            刪除群組
                          </button>
                        </div>

                        {/* 大型上傳區 */}
                        <div className="mb-6 bg-white rounded-xl p-5 shadow-sm border border-gray-200">
                          <EvidenceUpload
                            pageKey={`${pageKey}_${groupId}`}
                            files={[]}
                            onFilesChange={() => {}}
                            memoryFiles={currentMemoryFiles}
                            onMemoryFilesChange={(files) => {
                              // 自動套用到該群組的所有記錄
                              setGasolineData(prev => prev.map(record => {
                                if (record.groupId === groupId) {
                                  return { ...record, memoryFiles: [...files] }
                                }
                                return record
                              }))

                              // 更新群組的 memoryFiles（保留用於顯示）
                              setGroupMemoryFiles(prev => ({
                                ...prev,
                                [groupId]: files
                              }))

                              if (files.length > 0) {
                                setSuccess(`已自動套用佐證到 ${group.records.length} 筆記錄`)
                              }
                            }}
                            maxFiles={1}
                            kind="other"
                            disabled={submitting || !editPermissions.canUploadFiles}
                            mode={isReadOnly || approvalStatus.isApproved ? "view" : "edit"}
                            isAdminReviewMode={isReviewMode && role === 'admin'}
                          />
                        </div>

                        {/* 記錄列表 */}
                        <table className="w-full table-fixed border-collapse bg-white rounded-xl overflow-hidden shadow-sm mb-4">
                          <thead>
                            <tr className="bg-gradient-to-r from-blue-400 to-blue-500">
                              <th className="px-3 py-3 text-center text-sm font-semibold text-white w-[180px]">使用日期</th>
                              <th className="px-3 py-3 text-center text-sm font-semibold text-white w-[120px]">使用量(L)</th>
                              <th className="px-3 py-3 text-center text-sm font-semibold text-white w-[80px]">操作</th>
                            </tr>
                          </thead>
                          <tbody>
                            {group.records.map((record) => (
                              <tr key={record.id} className="hover:bg-blue-50 transition-colors border-b border-gray-100 last:border-b-0">
                                <td className="px-3 py-3">
                                  <input
                                    type="date"
                                    value={record.date}
                                    onChange={(e) => updateEntry(record.id, 'date', e.target.value)}
                                    disabled={isReadOnly || approvalStatus.isApproved}
                                    className={`w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 hover:border-blue-300 transition-colors ${
                                      isReadOnly || approvalStatus.isApproved ? 'bg-gray-100 cursor-not-allowed' : ''
                                    }`}
                                  />
                                </td>
                                <td className="px-3 py-3">
                                  <input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={record.quantity || ''}
                                    onChange={(e) => updateEntry(record.id, 'quantity', parseFloat(e.target.value) || 0)}
                                    disabled={isReadOnly || approvalStatus.isApproved}
                                    className={`w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 hover:border-blue-300 transition-colors ${
                                      isReadOnly || approvalStatus.isApproved ? 'bg-gray-100 cursor-not-allowed' : ''
                                    }`}
                                  />
                                </td>
                                <td className="px-3 py-3">
                                  <div className="flex justify-center">
                                    {group.records.length > 1 && (
                                      <button
                                        onClick={() => removeEntry(record.id)}
                                        disabled={isReadOnly || approvalStatus.isApproved}
                                        className={`text-red-500 hover:text-red-700 p-1 rounded-lg hover:bg-red-50 transition-colors ${
                                          isReadOnly || approvalStatus.isApproved ? 'opacity-50 cursor-not-allowed' : ''
                                        }`}
                                        title="刪除此記錄"
                                      >
                                        <Trash2 className="w-4 h-4" />
                                      </button>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>

                        {/* 新增記錄到此群組 */}
                        <button
                          onClick={() => addRecordToGroup(groupId)}
                          disabled={isReadOnly || approvalStatus.isApproved}
                          className={`w-full py-3 border-2 border-dashed border-blue-300 hover:bg-blue-50 text-blue-700 bg-white rounded-xl font-semibold transition-all hover:shadow-sm ${
                            isReadOnly || approvalStatus.isApproved ? 'opacity-50 cursor-not-allowed' : ''
                          } flex items-center justify-center gap-2`}
                        >
                          <span className="text-xl">+</span>
                          <span>新增記錄到此群組</span>
                        </button>
                      </div>
                    )
                  } else {
                    // ==================== 有佐證的群組 ====================
                    return (
                      <div
                        key={groupId}
                        className="bg-white border-2 border-gray-200 rounded-xl p-6 shadow-md hover:shadow-lg transition-shadow"
                      >
                        {/* 群組標題 */}
                        <div className="flex items-center gap-3 mb-6">
                          <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
                            <span className="text-2xl">✅</span>
                          </div>
                          <div>
                            <h4 className="text-lg font-bold text-gray-900">已上傳佐證</h4>
                            <p className="text-sm text-gray-600">{group.records.length} 筆記錄</p>
                          </div>
                        </div>

                        <div className="flex gap-6">
                          {/* 左側：佐證預覽 */}
                          <div className="w-64 flex-shrink-0">
                            <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl overflow-hidden shadow-sm border border-gray-200">
                              {/* ⭐ 根據檔案類型分別渲染：圖片可點擊，PDF 靜態顯示 */}
                              {group.evidence.mime_type.startsWith('image/') ? (
                                // 圖片：可點擊放大
                                <div
                                  className="cursor-pointer hover:opacity-90 transition-opacity group relative"
                                  onClick={async () => {
                                    const url = await getFileUrl(group.evidence!.file_path)
                                    setLightboxSrc(url)
                                  }}
                                >
                                  <img
                                    src={thumbnails[group.evidence.id] || '/汽油.png'}
                                    alt="佐證資料"
                                    className="w-full h-48 object-cover"
                                    loading="lazy"
                                    onError={(e) => {
                                      (e.target as HTMLImageElement).src = '/汽油.png'
                                    }}
                                  />
                                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-all flex items-center justify-center">
                                    <Eye className="w-8 h-8 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                                  </div>
                                </div>
                              ) : (
                                // PDF：靜態顯示 + 下載按鈕
                                <div className="relative">
                                  <div className="w-full h-48 flex items-center justify-center bg-gray-100">
                                    <span className="text-8xl">📄</span>
                                  </div>
                                  {/* PDF 下載按鈕 */}
                                  <button
                                    onClick={() => handleDownloadFile(group.evidence!)}
                                    disabled={downloadingFileId === group.evidence!.id}
                                    className="absolute top-2 right-2 bg-blue-500 hover:bg-blue-600 text-white p-2 rounded-lg shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                    title={downloadingFileId === group.evidence!.id ? '下載中...' : '下載 PDF'}
                                  >
                                    {downloadingFileId === group.evidence!.id ? (
                                      <Loader2 className="w-5 h-5 animate-spin" />
                                    ) : (
                                      <Download className="w-5 h-5" />
                                    )}
                                  </button>
                                </div>
                              )}
                              <div className="p-3 bg-white border-t border-gray-200">
                                <p className="text-sm text-gray-900 font-medium truncate" title={group.evidence.file_name}>
                                  {group.evidence.file_name}
                                </p>
                                <p className="text-xs text-gray-500 mt-1">
                                  {(group.evidence.file_size / 1024).toFixed(1)} KB
                                </p>
                              </div>
                              {/* 刪除按鈕 */}
                              <div className="p-3 border-t border-gray-200 space-y-2 bg-white">
                                <button
                                  onClick={() => {
                                    if (window.confirm('刪除此佐證後，群組將變成空群組，記錄保留。確定要刪除嗎？')) {
                                      deleteEvidence(group.evidence!.id)
                                    }
                                  }}
                                  disabled={isReadOnly || approvalStatus.isApproved}
                                  className={`w-full py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg font-medium shadow-sm hover:shadow transition-all flex items-center justify-center gap-2 ${
                                    isReadOnly || approvalStatus.isApproved ? 'opacity-50 cursor-not-allowed' : ''
                                  }`}
                                >
                                  <Trash2 className="w-4 h-4" />
                                  刪除佐證
                                </button>
                                <button
                                  onClick={() => deleteGroup(groupId)}
                                  disabled={isReadOnly || approvalStatus.isApproved}
                                  className={`w-full py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-lg font-medium shadow-sm hover:shadow transition-all disabled:opacity-50 disabled:cursor-not-allowed`}
                                >
                                  刪除群組
                                </button>
                              </div>
                            </div>
                          </div>

                          {/* 右側：記錄列表 */}
                          <div className="flex-1">

                            <table className="w-full table-fixed border-collapse bg-white rounded-xl overflow-hidden shadow-sm mb-4">
                              <thead>
                                <tr className="bg-gradient-to-r from-green-500 to-green-600">
                                  <th className="px-3 py-3 text-center text-sm font-semibold text-white w-[180px]">使用日期</th>
                                  <th className="px-3 py-3 text-center text-sm font-semibold text-white w-[120px]">使用量(L)</th>
                                  <th className="px-3 py-3 text-center text-sm font-semibold text-white w-[80px]">操作</th>
                                </tr>
                              </thead>
                              <tbody>
                                {group.records.map((record) => (
                                  <tr key={record.id} className="hover:bg-green-50 transition-colors border-b border-gray-100 last:border-b-0">
                                    <td className="px-3 py-3">
                                      <input
                                        type="date"
                                        value={record.date}
                                        onChange={(e) => updateEntry(record.id, 'date', e.target.value)}
                                        disabled={isReadOnly || approvalStatus.isApproved}
                                        className={`w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 hover:border-green-300 transition-colors ${
                                          isReadOnly || approvalStatus.isApproved ? 'bg-gray-100 cursor-not-allowed' : ''
                                        }`}
                                      />
                                    </td>
                                    <td className="px-3 py-3">
                                      <input
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        value={record.quantity || ''}
                                        onChange={(e) => updateEntry(record.id, 'quantity', parseFloat(e.target.value) || 0)}
                                        disabled={isReadOnly || approvalStatus.isApproved}
                                        className={`w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 hover:border-green-300 transition-colors ${
                                          isReadOnly || approvalStatus.isApproved ? 'bg-gray-100 cursor-not-allowed' : ''
                                        }`}
                                      />
                                    </td>
                                    <td className="px-3 py-3">
                                      <div className="flex justify-center">
                                        <button
                                          onClick={() => removeEntry(record.id)}
                                          disabled={isReadOnly || approvalStatus.isApproved}
                                          className={`text-red-500 hover:text-red-700 p-1 rounded-lg hover:bg-red-50 transition-colors ${
                                            isReadOnly || approvalStatus.isApproved ? 'opacity-50 cursor-not-allowed' : ''
                                          }`}
                                          title="刪除此記錄"
                                        >
                                          <Trash2 className="w-4 h-4" />
                                        </button>
                                      </div>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>

                            {/* 新增記錄到此群組 */}
                            <button
                              onClick={() => addRecordToGroup(groupId)}
                              disabled={isReadOnly || approvalStatus.isApproved}
                              className={`w-full py-3 border-2 border-dashed border-green-300 bg-white hover:bg-green-50 text-green-700 rounded-xl font-semibold transition-all hover:shadow-sm ${
                                isReadOnly || approvalStatus.isApproved ? 'opacity-50 cursor-not-allowed' : ''
                              } flex items-center justify-center gap-2`}
                            >
                              <span className="text-xl">+</span>
                              <span>新增記錄到此群組</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    )
                  }
                })}
              </div>
            </div>
          </div>
        </div>

        {/* 審核區塊 - 只在審核模式顯示 */}
        {isReviewMode && (
          <div className="max-w-4xl mx-auto mt-8">
            <ReviewSection
              entryId={reviewEntryId || currentEntryId || `gasoline_${year}`}
              userId={reviewUserId || "current_user"}
              category="汽油"
              userName="填報用戶"
              amount={gasolineData.reduce((sum, item) => sum + item.quantity, 0)}
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
      </div>

      {!isReadOnly && !approvalStatus.isApproved && !isReviewMode && (
        <BottomActionBar
          currentStatus={currentStatus}
          currentEntryId={currentEntryId}
          isUpdating={false}
          hasSubmittedBefore={hasSubmittedBefore}
          hasAnyData={hasAnyData}
          editPermissions={editPermissions}
          submitting={submitting}
          saving={submitting}
          onSubmit={handleSubmit}
          onSave={handleSave}
          onClear={handleClear}
          designTokens={designTokens}
        />
      )}

      {/* 清除確認模態框 */}
      {showClearConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
          <div
            className="bg-white rounded-lg shadow-lg max-w-md w-full"
            style={{ borderRadius: designTokens.borderRadius.lg }}
          >
            <div className="p-6">
              <div className="flex items-start space-x-3 mb-4">
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: `${designTokens.colors.warning}15` }}
                >
                  <AlertCircle
                    className="h-5 w-5"
                    style={{ color: designTokens.colors.warning }}
                  />
                </div>
                <div className="flex-1">
                  <h3
                    className="text-xl font-semibold mb-2"
                    style={{ color: designTokens.colors.textPrimary }}
                  >
                    確認清除
                  </h3>
                  <p
                    className="text-base"
                    style={{ color: designTokens.colors.textSecondary }}
                  >
                    清除後，這一頁所有資料都會被移除，包括已上傳到伺服器的檔案也會被永久刪除。此操作無法復原，確定要繼續嗎？
                  </p>
                </div>
              </div>
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setShowClearConfirmModal(false)}
                  className="px-4 py-2 border rounded-lg transition-colors font-medium"
                  style={{
                    borderColor: designTokens.colors.border,
                    color: designTokens.colors.textSecondary
                  }}
                >
                  取消
                </button>
                <button
                  onClick={handleClearConfirm}
                  disabled={clearLoading}
                  className="px-4 py-2 text-white rounded-lg transition-colors font-medium flex items-center justify-center"
                  style={{
                    backgroundColor: clearLoading ? '#9ca3af' : designTokens.colors.error,
                    opacity: clearLoading ? 0.7 : 1
                  }}
                  onMouseEnter={(e) => {
                    if (!clearLoading) {
                      (e.target as HTMLButtonElement).style.backgroundColor = '#dc2626';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!clearLoading) {
                      (e.target as HTMLButtonElement).style.backgroundColor = designTokens.colors.error;
                    }
                  }}
                >
                  {clearLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      清除中...
                    </>
                  ) : (
                    '確定清除'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Lightbox：點圖放大 */}
      {lightboxSrc && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70"
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
        </div>
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
      {showSuccessModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
          <div className="bg-white rounded-lg shadow-lg max-w-md w-full">
            <div className="p-6">
              {/* 關閉按鈕 */}
              <div className="flex justify-end mb-2">
                <button
                  onClick={() => setShowSuccessModal(false)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                  aria-label="關閉"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* 內容區 */}
              <div className="text-center">
                {/* 成功圖示 */}
                <div
                  className="w-12 h-12 mx-auto rounded-full mb-4 flex items-center justify-center"
                  style={{ backgroundColor: designTokens.colors.success }}
                >
                  <CheckCircle className="h-6 w-6 text-white" />
                </div>

                {/* 標題 */}
                <h3
                  className="text-lg font-medium mb-2"
                  style={{ color: designTokens.colors.textPrimary }}
                >
                  提交成功！
                </h3>

                {/* 成功訊息 */}
                <p
                  className="mb-4 font-medium text-lg"
                  style={{ color: designTokens.colors.textPrimary }}
                >
                  {success}
                </p>

                {/* 提示資訊卡片 */}
                <div
                  className="rounded-lg p-4 mb-4 text-left"
                  style={{ backgroundColor: designTokens.colors.accentLight }}
                >
                  <p
                    className="text-base mb-2 font-medium"
                    style={{ color: designTokens.colors.textPrimary }}
                  >
                    您的資料已成功儲存，您可以：
                  </p>
                  <ul
                    className="text-base space-y-1"
                    style={{ color: designTokens.colors.textSecondary }}
                  >
                    <li>• 隨時回來查看或修改資料</li>
                    <li>• 重新上傳新的證明文件</li>
                    <li>• 新增或刪除使用記錄</li>
                  </ul>
                </div>

                {/* 確認按鈕 */}
                <button
                  onClick={() => setShowSuccessModal(false)}
                  className="w-full py-2 rounded-lg text-white font-medium transition-colors"
                  style={{ backgroundColor: designTokens.colors.primary }}
                  onMouseEnter={(e) => {
                    (e.target as HTMLButtonElement).style.backgroundColor = '#10b981';
                  }}
                  onMouseLeave={(e) => {
                    (e.target as HTMLButtonElement).style.backgroundColor = designTokens.colors.primary;
                  }}
                >
                  確認
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
