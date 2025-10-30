import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Upload, AlertCircle, CheckCircle, Loader2, X, Trash2, Plus, Eye } from 'lucide-react'
import EvidenceUpload from '../../components/EvidenceUpload'
import StatusSwitcher, { EntryStatus, canEdit, canUploadFiles, getButtonText } from '../../components/StatusSwitcher'
import StatusIndicator from '../../components/StatusIndicator'
import Toast, { ToastType } from '../../components/Toast'
import BottomActionBar from '../../components/BottomActionBar'
import ReviewSection from '../../components/ReviewSection'
import { useEditPermissions } from '../../hooks/useEditPermissions'
import { useFrontendStatus } from '../../hooks/useFrontendStatus'
import { useApprovalStatus } from '../../hooks/useApprovalStatus'
import { useEnergyData } from '../../hooks/useEnergyData'
import { useEnergySubmit } from '../../hooks/useEnergySubmit'
import { useEnergyClear } from '../../hooks/useEnergyClear'
import { useSubmitGuard } from '../../hooks/useSubmitGuard'
import { useGhostFileCleaner } from '../../hooks/useGhostFileCleaner'
import { useRecordFileMapping } from '../../hooks/useRecordFileMapping'
import { useReloadWithFileSync } from '../../hooks/useReloadWithFileSync'
import { useSubmissions } from '../admin/hooks/useSubmissions'
import { useRole } from '../../hooks/useRole'
import { listMSDSFiles, listUsageEvidenceFiles, commitEvidence, deleteEvidence, EvidenceFile, uploadEvidenceWithEntry, deleteEvidenceFile } from '../../api/files'
import { useAdminSave } from '../../hooks/useAdminSave'
import { smartOverwriteFiles } from '../../api/smartFileOverwrite'
import { upsertEnergyEntry, sumMonthly, UpsertEntryInput, updateEntryStatus, getEntryByPageKeyAndYear } from '../../api/entries'
import { getEntryFiles } from '../../api/files'
import { designTokens } from '../../utils/designTokens'
import { getCategoryInfo } from '../../utils/categoryConstants'
import { MemoryFile } from '../../components/EvidenceUpload'
import { supabase } from '../../lib/supabaseClient'
import { DocumentHandler } from '../../services/documentHandler'
import { generateRecordId } from '../../utils/idGenerator'


// 尿素日期使用量資料結構
interface UsageRecord {
  id: string
  date: string           // 使用日期 YYYY-MM-DD
  quantity: number       // 使用量 (L)
  files: EvidenceFile[]  // 使用證明檔案
  memoryFiles?: MemoryFile[]  // 記憶體暫存檔案
}

const UreaPage = () => {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  // 審核模式檢測
  const isReviewMode = searchParams.get('mode') === 'review'
  const reviewEntryId = searchParams.get('entryId')
  const reviewUserId = searchParams.get('userId')

  const pageKey = 'urea'
  const [year] = useState(new Date().getFullYear())
  const [initialStatus, setInitialStatus] = useState<EntryStatus>('submitted')
  const [currentEntryId, setCurrentEntryId] = useState<string | null>(null)

  // 防止重複提交
  const { executeSubmit, submitting } = useSubmitGuard()
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [hasSubmittedBefore, setHasSubmittedBefore] = useState(false)
  const [showSuccessModal, setShowSuccessModal] = useState(false)
  const [showClearConfirmModal, setShowClearConfirmModal] = useState(false)
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null)

  // 前端狀態管理 Hook
  const frontendStatus = useFrontendStatus({
    initialStatus,
    entryId: currentEntryId,
    onStatusChange: () => {},
    onError: (error) => setError(error),
    onSuccess: (message) => setSuccess(message)
  })

  const { currentStatus, setCurrentStatus, handleSubmitSuccess, handleDataChanged, isInitialLoad } = frontendStatus

  // 資料載入 Hook
  const entryIdToLoad = isReviewMode && reviewEntryId ? reviewEntryId : undefined
  const {
    entry: loadedEntry,
    files: loadedFiles,
    loading: dataLoading,
    error: dataError,
    reload
  } = useEnergyData(pageKey, year, entryIdToLoad)

  // Reload 同步 Hook
  const { reloadAndSync } = useReloadWithFileSync(reload)

  // 審核狀態 Hook
  const { reload: reloadApprovalStatus, ...approvalStatus } = useApprovalStatus(pageKey, year)

  // 提交/暫存 Hook
  const { submit: submitEnergy, save: saveEnergy, submitting: energySubmitting } = useEnergySubmit(pageKey, year, approvalStatus.status)

  // 審核 API hook
  const { reviewSubmission } = useSubmissions()

  // 清除 Hook
  const {
    clear,
    clearing: clearLoading,
    error: clearError,
    clearError: clearClearError
  } = useEnergyClear(currentEntryId, currentStatus)

  // 幽靈檔案清理 Hook
  const { cleanFiles } = useGhostFileCleaner()

  // 角色檢查
  const { role } = useRole()

  // 審核模式下只有管理員可編輯
  const isReadOnly = isReviewMode && role !== 'admin'
  // 管理員審核儲存 Hook
  const { save: adminSave, saving: adminSaving } = useAdminSave(pageKey, reviewEntryId)

  // 檔案映射 Hook
  const {
    uploadRecordFiles,
    getRecordFiles,
    loadFileMapping,
    getFileMappingForPayload,
    removeRecordMapping
  } = useRecordFileMapping(pageKey, currentEntryId)

  // 檔案分配狀態追蹤（防止 race condition）
  const filesAssignedRef = useRef(false)

  // 表單資料
  const [msdsFiles, setMsdsFiles] = useState<EvidenceFile[]>([])
  // 記憶體暫存檔案狀態
  const [msdsMemoryFiles, setMsdsMemoryFiles] = useState<MemoryFile[]>([])
  const [usageRecords, setUsageRecords] = useState<UsageRecord[]>([
    {
      id: generateRecordId(),
      date: '',
      quantity: 0,
      files: [],
      memoryFiles: []
    }
  ])

  // 編輯權限控制
  const editPermissions = useEditPermissions(currentStatus, isReadOnly, role)
  
  // 判斷是否有資料
  const hasAnyData = useMemo(() => {
    const hasUsageRecords = usageRecords.some(r => r.date !== '' || r.quantity > 0 || r.files.length > 0 || (r.memoryFiles && r.memoryFiles.length > 0))
    const hasFiles = msdsFiles.length > 0 || msdsMemoryFiles.length > 0
    return hasUsageRecords || hasFiles
  }, [usageRecords, msdsFiles, msdsMemoryFiles])

  // 重置檔案分配狀態（切換頁面或重新載入時）
  useEffect(() => {
    filesAssignedRef.current = false
    console.log('🔄 [UreaPage] 已重置檔案分配狀態')
  }, [pageKey, loadedEntry?.id])

  // 第一步：載入記錄資料（不等檔案）
  useEffect(() => {
    if (loadedEntry && !dataLoading) {
      const entryStatus = loadedEntry.status as EntryStatus
      setInitialStatus(entryStatus)
      setCurrentStatus(entryStatus)  // 同步前端狀態
      setCurrentEntryId(loadedEntry.id)
      setHasSubmittedBefore(true)

      // 從 extraPayload 或 payload 取得使用記錄資料
      const records = loadedEntry.extraPayload?.usageRecords || loadedEntry.payload?.usageRecords

      if (records && Array.isArray(records)) {
        // 先載入記錄資料，檔案欄位暫時為空（不阻塞顯示）
        const updated = records.map((item: any) => ({
          ...item,
          id: String(item.id || generateRecordId()),  // ⭐ 確保 id 是字串型別
          files: [],  // 先空著，稍後由檔案載入 useEffect 分配
          memoryFiles: [],
        }))

        setUsageRecords(updated)

        // ⭐ 載入檔案映射表
        const payload = loadedEntry.extraPayload || loadedEntry.payload
        if (payload) {
          loadFileMapping(payload)
        }
      }

      if (!isInitialLoad.current) {
        handleDataChanged()
      }
      isInitialLoad.current = false
    } else if (loadedEntry === null && !dataLoading) {
      // 沒有 entry，重置為初始狀態
      setCurrentEntryId(null)
      setHasSubmittedBefore(false)
      setInitialStatus('saved')
      setUsageRecords([{
        id: generateRecordId(),
        date: '',
        quantity: 0,
        files: [],
        memoryFiles: []
      }])
      isInitialLoad.current = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadedEntry, dataLoading])

  // 第二步：檔案載入後分配到記錄（非破壞性更新）
  useEffect(() => {
    // ⭐ 加上 flag 檢查，防止無限迴圈
    if (loadedFiles.length > 0 && usageRecords.length > 0 && !filesAssignedRef.current) {
      const cleanAndAssignFiles = async () => {
        console.log('🔄 [UreaPage] 開始分配檔案...')

        // 清理幽靈檔案
        const validFiles = await cleanFiles(loadedFiles)

        // 分類 MSDS 檔案
        const msds = validFiles.filter(f => f.file_type === 'msds' && f.page_key === pageKey)
        setMsdsFiles(msds)
        console.log(`📄 [UreaPage] MSDS 檔案: ${msds.length} 個`)

        // 分類使用證明檔案
        const usageFiles = validFiles.filter(f => f.file_type === 'usage_evidence' && f.page_key === pageKey)
        console.log(`📄 [UreaPage] 使用證明檔案: ${usageFiles.length} 個`)

        if (usageFiles.length > 0) {
          // 使用 recordId 分配檔案
          setUsageRecords(prev => prev.map((item) => {
            const filesForThisRecord = getRecordFiles(item.id, usageFiles)
            console.log(`✅ [UreaPage] ${item.id.substring(0, 8)} 分配到 ${filesForThisRecord.length} 個檔案`)
            return {
              ...item,
              files: filesForThisRecord,
              memoryFiles: []
            }
          }))
        }

        // ⭐ 設定 flag，防止再次執行
        filesAssignedRef.current = true
        console.log('✅ [UreaPage] 檔案分配完成')
      }

      cleanAndAssignFiles()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadedFiles, usageRecords, pageKey])  // ⭐ 加上 usageRecords dependency

  const addUsageRecord = () => {
    setUsageRecords(prev => [...prev, {
      id: generateRecordId(),
      date: '',
      quantity: 0,
      files: [],
      memoryFiles: []
    }])
  }

  const removeUsageRecord = (id: string) => {
    if (usageRecords.length > 1) {
      // ⭐ 移除檔案映射
      removeRecordMapping(id)
      setUsageRecords(prev => prev.filter(record => record.id !== id))
    }
  }

  const updateUsageRecord = (id: string, field: keyof UsageRecord, value: any) => {
    setUsageRecords(prev => prev.map(record => 
      record.id === id ? { ...record, [field]: value } : record
    ))
  }

  const handleUsageFilesChange = (recordId: string, files: EvidenceFile[]) => {
    updateUsageRecord(recordId, 'files', files)
  }

  const handleMsdsFilesChange = (files: EvidenceFile[]) => {
    setMsdsFiles(files)
  }

  const handleMsdsMemoryFilesChange = (files: MemoryFile[]) => {
    setMsdsMemoryFiles(files)
  }

  const handleMemoryFilesChange = (recordId: string, files: MemoryFile[]) => {
    updateUsageRecord(recordId, 'memoryFiles', files)
  }

  const getTotalUsage = () => {
    return usageRecords.reduce((sum, record) => sum + (record.quantity || 0), 0)
  }

  const validateData = () => {
    const errors: string[] = []

    // 移除 MSDS 必填驗證
    // if (msdsFiles.length === 0) {
    //   errors.push('請上傳 MSDS 安全資料表')
    // }

    usageRecords.forEach((record, index) => {
      if (!record.date) {
        errors.push(`第${index + 1}筆記錄未填入使用日期`)
      }
      if (record.quantity <= 0) {
        errors.push(`第${index + 1}筆記錄使用量必須大於0`)
      }

      // 檢查已上傳檔案 OR 記憶體檔案
      const totalFiles = record.files.length + (record.memoryFiles?.length || 0)
      if (totalFiles === 0) {
        errors.push(`第${index + 1}筆記錄未上傳使用證明`)
      }
    })

    // 檢查日期重複
    const dates = usageRecords.map(record => record.date).filter(date => date)
    const duplicates = dates.filter((date, index) => dates.indexOf(date) !== index)
    if (duplicates.length > 0) {
      errors.push(`有重複的使用日期：${duplicates.join(', ')}`)
    }

    return errors
  }

  const handleSubmit = async () => {
    const errors = validateData()
    if (errors.length > 0) {
      setError('請修正以下問題：\n' + errors.join('\n'))
      return
    }

    // 防止重複提交
    if (submitting || energySubmitting) {
      console.log('⚠️ 已經在提交中，忽略重複點擊')
      return
    }

    try {
      setError(null)
      setSuccess(null)

      // 獲取正確的 category 資訊
      const categoryInfo = getCategoryInfo(pageKey)

      // 將日期記錄轉換為月份資料格式
      const monthly: Record<string, number> = {}

      usageRecords.forEach(record => {
        if (record.date && record.quantity > 0) {
          const month = new Date(record.date).getMonth() + 1
          monthly[month.toString()] = (monthly[month.toString()] || 0) + record.quantity
        }
      })

      // 清理 payload：移除 file 物件，只保留純資料
      const cleanedRecords = usageRecords.map(record => ({
        id: record.id,
        date: record.date,
        quantity: record.quantity
      }))

      // ✅ 使用 Hook 提交
      const entry_id = await submitEnergy({
        formData: {
          monthly,
          unit: categoryInfo.unit,
          extraPayload: {
            usageRecords: cleanedRecords,
            totalUsage: getTotalUsage(),
            notes: `尿素使用量，共${usageRecords.length}筆記錄`,
            fileMapping: getFileMappingForPayload()  // 保存當前 fileMapping
          }
        },
        msdsFiles: msdsMemoryFiles,  // MSDS 檔案
        monthlyFiles: Array(12).fill([])  // 空陣列
      })

      if (!currentEntryId) {
        setCurrentEntryId(entry_id)
      }

      // ✅ 手動上傳每筆記錄的檔案
      const newFileMapping: Record<string, string[]> = {}

      for (const record of usageRecords) {
        if (record.memoryFiles && record.memoryFiles.length > 0) {
          const uploadedIds = await uploadRecordFiles(record.id, record.memoryFiles, entry_id, 'usage_evidence')
          newFileMapping[record.id] = uploadedIds
          console.log(`✅ [手動累積] ${record.id.substring(0, 8)}: ${uploadedIds.length} 個檔案`)
        }
      }

      console.log('✅ fileMapping 累積完成:', Object.keys(newFileMapping))

      // 重新載入檔案
      await reload()

      // ⭐ 重置檔案分配 flag，讓 useEffect 重新執行
      filesAssignedRef.current = false

      // 清空記憶體檔案
      setMsdsMemoryFiles([])
      setUsageRecords(prev => prev.map(record => ({
        ...record,
        memoryFiles: []
      })))

      // 更新前端狀態
      await handleSubmitSuccess()

      // 重新載入審核狀態，更新狀態橫幅
      reloadApprovalStatus()

      const totalUsage = getTotalUsage()
      setSuccess(`年度總使用量：${totalUsage.toFixed(2)} 公斤`)
      setHasSubmittedBefore(true)
      setShowSuccessModal(true)

    } catch (error) {
      console.error('❌ [Urea] 提交失敗:', error)
      setError(error instanceof Error ? error.message : '提交失敗')
    }
  }

  const handleSave = async () => {
    // 防止重複提交
    if (submitting || energySubmitting) {
      console.log('⚠️ 已經在暫存中，忽略重複點擊')
      return
    }

    try {
      setError(null)
      setSuccess(null)

      // 獲取正確的 category 資訊
      const categoryInfo = getCategoryInfo(pageKey)

      // 將日期記錄轉換為月份資料格式
      const monthly: Record<string, number> = {}

      usageRecords.forEach(record => {
        if (record.date && record.quantity > 0) {
          const month = new Date(record.date).getMonth() + 1
          monthly[month.toString()] = (monthly[month.toString()] || 0) + record.quantity
        }
      })

      const totalAmount = Object.values(monthly).reduce((sum, val) => sum + val, 0)

      // 審核模式：使用 useAdminSave hook
      if (isReviewMode && reviewEntryId) {
        console.log('📝 管理員審核模式：使用 useAdminSave hook', reviewEntryId)

        const cleanedRecords = usageRecords.map(record => ({
          id: record.id,
          date: record.date,
          quantity: record.quantity
        }))

        // 準備檔案列表
        const filesToUpload: Array<{
          file: File
          metadata: {
            recordId?: string
            allRecordIds?: string[]
            fileType: 'usage_evidence' | 'msds' | 'other'
          }
        }> = []

        // 收集每筆記錄的使用證明檔案
        usageRecords.forEach((record) => {
          if (record.memoryFiles && record.memoryFiles.length > 0) {
            record.memoryFiles.forEach(mf => {
              filesToUpload.push({
                file: mf.file,
                metadata: {
                  recordId: record.id,
                  allRecordIds: [record.id],
                  fileType: 'usage_evidence' as const
                }
              })
            })
          }
        })

        // 收集 MSDS 檔案（頁面級別，不綁定特定記錄）
        msdsMemoryFiles.forEach((mf) => {
          filesToUpload.push({
            file: mf.file,
            metadata: {
              fileType: 'msds' as const
            }
          })
        })

        await adminSave({
          updateData: {
            unit: categoryInfo.unit,
            amount: totalAmount,
            payload: {
              usageRecords: cleanedRecords,
              totalUsage: getTotalUsage(),
              notes: `尿素使用量，共${usageRecords.length}筆記錄`,
              fileMapping: getFileMappingForPayload()
            }
          },
          files: filesToUpload
        })

        await reloadAndSync()
        filesAssignedRef.current = false
        reloadApprovalStatus()
        // 清空記憶體檔案（在 reloadAndSync 之後，避免檔案暫時消失）
        setMsdsMemoryFiles([])
        setUsageRecords(prev => prev.map(record => ({
          ...record,
          memoryFiles: []
        })))
        setToast({ message: '✅ 儲存成功！資料已更新', type: 'success' })
        return
      }

      // 非審核模式：原本的邏輯
      // 清理 payload：移除 file 物件，只保留純資料
      const cleanedRecords = usageRecords.map(record => ({
        id: record.id,
        date: record.date,
        quantity: record.quantity
      }))

      // ✅ 使用 Hook 暫存
      const entry_id = await saveEnergy({
        formData: {
          monthly,
          unit: categoryInfo.unit,
          extraPayload: {
            usageRecords: cleanedRecords,
            totalUsage: getTotalUsage(),
            notes: `尿素使用量，共${usageRecords.length}筆記錄`,
            fileMapping: getFileMappingForPayload()  // 保存當前 fileMapping
          }
        },
        msdsFiles: msdsMemoryFiles,  // MSDS 檔案
        monthlyFiles: Array(12).fill([])  // 空陣列
      })

      if (!currentEntryId) {
        setCurrentEntryId(entry_id)
      }

      // ✅ 手動上傳每筆記錄的檔案
      const newFileMapping: Record<string, string[]> = {}

      for (const record of usageRecords) {
        if (record.memoryFiles && record.memoryFiles.length > 0) {
          const uploadedIds = await uploadRecordFiles(record.id, record.memoryFiles, entry_id, 'usage_evidence')
          newFileMapping[record.id] = uploadedIds
          console.log(`✅ [手動累積] ${record.id.substring(0, 8)}: ${uploadedIds.length} 個檔案`)
        }
      }

      console.log('✅ fileMapping 累積完成:', Object.keys(newFileMapping))

      // 重新載入檔案
      await reload()

      // ⭐ 重置檔案分配 flag，讓 useEffect 重新執行
      filesAssignedRef.current = false

      // 清空記憶體檔案
      setMsdsMemoryFiles([])
      setUsageRecords(prev => prev.map(record => ({
        ...record,
        memoryFiles: []
      })))

      // 重新載入審核狀態，更新狀態橫幅
      reloadApprovalStatus()

      // 暫存成功，顯示訊息
      setToast({
        message: '暫存成功！資料已儲存',
        type: 'success'
      })

    } catch (error) {
      console.error('❌ [Urea] 暫存失敗:', error)
      setError(error instanceof Error ? error.message : '暫存失敗')
    }
  }

  const handleStatusChange = async (newStatus: EntryStatus) => {
    // 狀態變更由 StatusSwitcher 組件處理
    console.log('Status change requested:', newStatus)
  }

  const handleClearAll = async () => {
    try {
      // 收集所有檔案和記憶體檔案
      const allFiles = [...msdsFiles]
      usageRecords.forEach(r => allFiles.push(...(r.files || [])))
      const allMemoryFiles = usageRecords.map(r => r.memoryFiles || [])

      // 使用 Hook 清除
      await clear({
        filesToDelete: allFiles,
        memoryFilesToClean: [msdsMemoryFiles, ...allMemoryFiles]
      })

      // 重置前端狀態
      setUsageRecords([{
        id: generateRecordId(),
        date: '',
        quantity: 0,
        files: [],
        memoryFiles: []
      }])
      setMsdsFiles([])
      setMsdsMemoryFiles([])
      setCurrentEntryId(null)
      setHasSubmittedBefore(false)
      setShowClearConfirmModal(false)
      setError(null)
      setSuccess(null)

      setToast({
        message: '資料已完全清除',
        type: 'success'
      })
    } catch (error) {
      console.error('❌ Clear failed:', error)
      setError(error instanceof Error ? error.message : '清除失敗，請重試')
    }
  }

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
      <div className="max-w-4xl mx-auto px-6 py-8 space-y-6">

        {/* 頁面標題 */}
        <div className="text-center mb-8">
          {/* 審核模式指示器 */}
          {isReviewMode && (
            <div className="mb-4 p-3 bg-orange-100 border-2 border-orange-300 rounded-lg">
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

          <h1
            className="text-4xl font-semibold mb-3"
            style={{ color: designTokens.colors.textPrimary }}
          >
            尿素使用量填報
          </h1>
          <p
            className="text-lg"
            style={{ color: designTokens.colors.textSecondary }}
          >
            {isReviewMode
              ? '管理員審核模式 - 檢視填報內容和相關檔案'
              : '請上傳 MSDS 文件並記錄各日期的尿素使用量'
            }
          </p>
        </div>

        {/* 審核狀態橫幅 */}
        {!isReviewMode && approvalStatus.isSaved && (
          <div className="bg-blue-100 border-l-4 border-blue-500 text-blue-700 p-4 mb-6 rounded-r-lg">
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
          <div className="bg-green-100 border-l-4 border-green-500 text-green-700 p-4 mb-6 rounded-r-lg">
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
          <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-6 rounded-r-lg">
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
          <div className="bg-green-100 border-l-4 border-green-500 text-green-700 p-4 mb-6 rounded-r-lg">
            <div className="flex items-center">
              <div className="text-2xl mr-3">📋</div>
              <div>
                <p className="font-bold text-lg">等待審核中</p>
                <p className="text-sm mt-1">您的填報已提交，請等待管理員審核。</p>
              </div>
            </div>
          </div>
        )}

        {/* MSDS 安全資料表 */}
        <div 
          className="rounded-lg border p-6"
          style={{ 
            backgroundColor: designTokens.colors.cardBg,
            borderColor: designTokens.colors.border,
            boxShadow: designTokens.shadows.sm
          }}
        >
          <h2
            className="text-2xl font-medium mb-6"
            style={{ color: designTokens.colors.textPrimary }}
          >
            MSDS 安全資料表
          </h2>
          <p className="text-sm mb-4 text-center" style={{ color: designTokens.colors.textSecondary }}>
            請上傳尿素的 MSDS；若尿素由中油加注，則可免
          </p>
          <div>
            <EvidenceUpload
              pageKey={pageKey}
              files={msdsFiles}
              onFilesChange={handleMsdsFilesChange}
              memoryFiles={msdsMemoryFiles}
              onMemoryFilesChange={handleMsdsMemoryFilesChange}
              maxFiles={3}
              disabled={submitting || isReadOnly || approvalStatus.isApproved || !editPermissions.canUploadFiles}
              kind="msds"
              mode={isReadOnly || approvalStatus.isApproved ? "view" : "edit"}
              isAdminReviewMode={isReviewMode && role === 'admin'}
            />
          </div>
        </div>

        {/* 使用量記錄 */}
        <div 
          className="rounded-lg border p-6"
          style={{ 
            backgroundColor: designTokens.colors.cardBg,
            borderColor: designTokens.colors.border,
            boxShadow: designTokens.shadows.sm
          }}
        >
          <h2
            className="text-2xl font-medium mb-6"
            style={{ color: designTokens.colors.textPrimary }}
          >
            尿素使用量記錄
          </h2>

          {/* 使用量統計 */}
          <div 
            className="mb-6 p-4 rounded-lg"
            style={{ backgroundColor: designTokens.colors.accentLight }}
          >
            <div className="flex justify-between items-center">
              <span 
                className="text-sm font-medium"
                style={{ color: designTokens.colors.textPrimary }}
              >
                總使用量：
              </span>
              <span 
                className="text-lg font-bold"
                style={{ color: designTokens.colors.accentSecondary }}
              >
                {getTotalUsage().toFixed(2)} 公斤
              </span>
            </div>
          </div>
          
          <div className="space-y-4">
            {usageRecords.map((record, index) => (
              <div 
                key={record.id}
                className="border rounded-lg p-4"
                style={{ borderColor: designTokens.colors.border }}
              >
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-medium">記錄 #{index + 1}</h3>
                  {editPermissions.canEdit && !isReviewMode && !approvalStatus.isApproved && usageRecords.length > 1 && (
                    <button
                      onClick={() => removeUsageRecord(record.id)}
                      className="text-red-500 hover:text-red-700 p-1"
                      disabled={submitting}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  {/* 使用日期 */}
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      使用日期
                    </label>
                    <input
                      type="date"
                      value={record.date}
                      onChange={(e) => updateUsageRecord(record.id, 'date', e.target.value)}
                      className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:border-transparent transition-all ${
                        isReadOnly || approvalStatus.isApproved ? 'bg-gray-100 cursor-not-allowed' : ''
                      }`}
                      style={{
                        color: designTokens.colors.textPrimary,
                        borderColor: designTokens.colors.border
                      }}
                      disabled={submitting || isReadOnly || approvalStatus.isApproved || !editPermissions.canEdit}
                    />
                  </div>

                  {/* 使用量 */}
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      使用量 (公斤)
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.1"
                      value={record.quantity || ''}
                      onChange={(e) => updateUsageRecord(record.id, 'quantity', parseFloat(e.target.value) || 0)}
                      className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:border-transparent transition-all ${
                        isReadOnly || approvalStatus.isApproved ? 'bg-gray-100 cursor-not-allowed' : ''
                      }`}
                      style={{
                        color: designTokens.colors.textPrimary,
                        borderColor: designTokens.colors.border
                      }}
                      disabled={submitting || isReadOnly || approvalStatus.isApproved || !editPermissions.canEdit}
                      placeholder="0.0"
                    />
                  </div>
                </div>

                {/* 使用證明檔案 */}
                <div>
                  <label className="block text-sm font-medium mb-2">
                    使用證明
                  </label>
                  <EvidenceUpload
                    pageKey={pageKey}
                    month={index + 1}
                    files={record.files}
                    onFilesChange={(files) => handleUsageFilesChange(record.id, files)}
                    memoryFiles={record.memoryFiles || []}
                    onMemoryFilesChange={(files) => handleMemoryFilesChange(record.id, files)}
                    maxFiles={3}
                    disabled={submitting || isReadOnly || approvalStatus.isApproved || !editPermissions.canUploadFiles}
                    kind="usage_evidence"
                    mode={isReadOnly || approvalStatus.isApproved ? "view" : "edit"}
                    isAdminReviewMode={isReviewMode && role === 'admin'}
                  />
                </div>
              </div>
            ))}
          </div>

          {/* 新增記錄按鈕 */}
          {editPermissions.canEdit && !isReviewMode && !approvalStatus.isApproved && (
            <button
              onClick={addUsageRecord}
              disabled={submitting}
              className="w-full py-3 bg-green-500 hover:bg-green-600 text-white rounded-lg font-medium transition-colors"
            >
              + 新增記錄
            </button>
          )}
        </div>

        {/* 底部空間 */}
        <div className="h-20"></div>
      </div>

      {/* 錯誤訊息模態框 */}
      {error && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
          <div 
            className="bg-white rounded-lg shadow-lg max-w-md w-full"
            style={{ borderRadius: designTokens.borderRadius.lg }}
          >
            <div className="p-6">
              <div className="flex items-start space-x-3 mb-4">
                <div 
                  className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: `${designTokens.colors.error}15` }}
                >
                  <AlertCircle 
                    className="h-5 w-5" 
                    style={{ color: designTokens.colors.error }} 
                  />
                </div>
                <div className="flex-1">
                  <h3
                    className="text-xl font-semibold mb-2"
                    style={{ color: designTokens.colors.textPrimary }}
                  >
                    發生錯誤
                  </h3>
                  <div className="text-sm space-y-1">
                    {error.split('\n').map((line, index) => (
                      <div key={index}>
                        {line.startsWith('請修正以下問題：') ? (
                          <div 
                            className="font-medium mb-2"
                            style={{ color: designTokens.colors.error }}
                          >
                            {line}
                          </div>
                        ) : line ? (
                          <div className="flex items-start space-x-2 py-1">
                            <div 
                              className="w-1.5 h-1.5 rounded-full mt-2 flex-shrink-0"
                              style={{ backgroundColor: designTokens.colors.error }}
                            ></div>
                            <span style={{ color: designTokens.colors.textSecondary }}>
                              {line}
                            </span>
                          </div>
                        ) : null}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <div className="flex justify-end">
                <button
                  onClick={() => setError(null)}
                  className="px-4 py-2 rounded-lg transition-colors font-medium text-white"
                  style={{ backgroundColor: designTokens.colors.error }}
                >
                  確定
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 成功提示模態框 */}
      {showSuccessModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
          <div
            className="bg-white rounded-lg shadow-lg max-w-md w-full"
            style={{ borderRadius: designTokens.borderRadius.lg }}
          >
            <div className="p-6">
              <div className="flex justify-end mb-2">
                <button
                  onClick={() => setShowSuccessModal(false)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="text-center">
                <div
                  className="w-12 h-12 mx-auto rounded-full mb-4 flex items-center justify-center"
                  style={{ backgroundColor: designTokens.colors.accentLight }}
                >
                  <CheckCircle
                    className="h-6 w-6"
                    style={{ color: designTokens.colors.accentPrimary }}
                  />
                </div>
                <h3
                  className="text-lg font-medium mb-2"
                  style={{ color: designTokens.colors.textPrimary }}
                >
                  提交成功！
                </h3>
                <p
                  className="mb-4"
                  style={{ color: designTokens.colors.textSecondary }}
                >
                  {success}
                </p>
                <div
                  className="rounded-lg p-4 mb-4 text-left"
                  style={{ backgroundColor: '#f8f9fa' }}
                >
                  <p
                    className="text-base mb-2 font-medium"
                    style={{ color: designTokens.colors.textPrimary }}
                  >
                    您的資料已成功儲存，您可以：
                  </p>
                  <ul className="text-base space-y-1">
                    <li style={{ color: designTokens.colors.textSecondary }}>
                      • 隨時回來查看或修改資料
                    </li>
                    <li style={{ color: designTokens.colors.textSecondary }}>
                      • 重新上傳新的證明文件
                    </li>
                    <li style={{ color: designTokens.colors.textSecondary }}>
                      • 新增或刪除使用記錄
                    </li>
                  </ul>
                </div>
                <button
                  onClick={() => setShowSuccessModal(false)}
                  className="px-6 py-2 text-white rounded-lg transition-colors font-medium"
                  style={{ backgroundColor: designTokens.colors.accentPrimary }}
                  onMouseEnter={(e) => {
                    (e.target as HTMLButtonElement).style.backgroundColor = '#388e3c';
                  }}
                  onMouseLeave={(e) => {
                    (e.target as HTMLButtonElement).style.backgroundColor = designTokens.colors.accentPrimary;
                  }}
                >
                  確認
                </button>
              </div>
            </div>
          </div>
        </div>
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
                  onClick={handleClearAll}
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

      {/* 底部操作欄 - 唯讀模式下隱藏，審核通過時也隱藏 */}
      {!isReadOnly && !approvalStatus.isApproved && !isReviewMode && (
        <BottomActionBar
          currentStatus={currentStatus}
          currentEntryId={currentEntryId}
          isUpdating={false}
          hasSubmittedBefore={hasSubmittedBefore}
          hasAnyData={hasAnyData}
          editPermissions={editPermissions}
          submitting={submitting}
          onSubmit={handleSubmit}
          onSave={handleSave}
          onClear={() => setShowClearConfirmModal(true)}
          designTokens={designTokens}
        />
      )}

      {/* 審核區塊 - 只在審核模式顯示 */}
      {isReviewMode && (
        <ReviewSection
          entryId={reviewEntryId || currentEntryId || `urea_${year}`}
          userId={reviewUserId || "current_user"}
          category="尿素"
          userName="填報用戶"
          amount={getTotalUsage()}
          unit="公斤"
          role={role}
          onSave={handleSave}
          isSaving={energySubmitting}
          onApprove={() => {
            // ReviewSection 會處理 API 呼叫和導航
          }}
          onReject={(reason) => {
            // ReviewSection 會處理 API 呼叫和導航
          }}
        />
      )}

      {/* Toast 通知 */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  )
}

export default UreaPage