import { useState, useEffect } from 'react';
import { EntryStatus } from '../../components/StatusSwitcher';
import ConfirmClearModal from '../../components/ConfirmClearModal'
import SharedPageLayout from '../../layouts/SharedPageLayout'
import { useEditPermissions } from '../../hooks/useEditPermissions';
import { useFrontendStatus } from '../../hooks/useFrontendStatus';
import { useApprovalStatus } from '../../hooks/useApprovalStatus';
import { useReviewMode } from '../../hooks/useReviewMode'
import { useEnergyData } from '../../hooks/useEnergyData'
import { useEnergyClear } from '../../hooks/useEnergyClear'
import { useGhostFileCleaner } from '../../hooks/useGhostFileCleaner'
import { useRole } from '../../hooks/useRole'
import { useAdminSave } from '../../hooks/useAdminSave'
import { EvidenceFile, getFileUrl, adminDeleteEvidence, deleteEvidence } from '../../api/files';
import { submitEnergyEntry } from '../../api/v2/entryAPI';
import { uploadEvidenceFile } from '../../api/v2/fileAPI';
import Toast from '../../components/Toast';
import { SF6Record } from './shared/mobile/mobileEnergyTypes'
import { LAYOUT_CONSTANTS } from './shared/mobile/mobileEnergyConstants'
import { SF6_CONFIG } from './shared/mobileEnergyConfig'
import { MobileEnergyUsageSection } from './shared/mobile/components/MobileEnergyUsageSection'
import { SF6ListSection } from './components/SF6ListSection'
import { ImageLightbox } from './shared/mobile/components/ImageLightbox'
import { MemoryFile } from '../../components/FileDropzone'
// 新的 hooks 和組件
import { useSF6DeviceManager } from './hooks/useSF6DeviceManager'
import { useSF6Notifications } from './hooks/useSF6Notifications'
import SF6InputFields from './components/SF6InputFields'

// Settings Icon (使用者提供)
const SettingsIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="29" height="29" viewBox="0 0 29 29" fill="none">
    <path d="M14.5 18.125C16.5711 18.125 18.25 16.4461 18.25 14.375C18.25 12.3039 16.5711 10.625 14.5 10.625C12.4289 10.625 10.75 12.3039 10.75 14.375C10.75 16.4461 12.4289 18.125 14.5 18.125Z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M23.4167 18.125C23.2508 18.4653 23.1969 18.8506 23.2626 19.2247C23.3283 19.5988 23.5103 19.9423 23.7833 20.2042L23.8575 20.2783C24.0789 20.4996 24.2548 20.7607 24.3748 21.0469C24.4948 21.333 24.5566 21.6388 24.5566 21.9475C24.5566 22.2562 24.4948 22.562 24.3748 22.8481C24.2548 23.1343 24.0789 23.3954 23.8575 23.6167C23.6361 23.8381 23.375 24.014 23.0889 24.134C22.8028 24.254 22.497 24.3158 22.1883 24.3158C21.8796 24.3158 21.5738 24.254 21.2876 24.134C21.0015 24.014 20.7404 23.8381 20.5191 23.6167L20.445 23.5425C20.1831 23.2695 19.8396 23.0875 19.4655 23.0218C19.0914 22.9561 18.7061 23.01 18.3658 23.1759C18.0318 23.3357 17.7555 23.5901 17.5738 23.9062C17.392 24.2224 17.313 24.5864 17.3467 24.9492V25.125C17.3467 25.7471 17.0997 26.3437 16.6598 26.7836C16.2199 27.2235 15.6233 27.4705 15.0012 27.4705C14.3791 27.4705 13.7825 27.2235 13.3426 26.7836C12.9027 26.3437 12.6558 25.7471 12.6558 25.125V25.0146C12.6146 24.6389 12.4619 24.2846 12.2178 23.9972C11.9737 23.7098 11.6498 23.5023 11.2867 23.4017C10.9463 23.2358 10.561 23.1819 10.1869 23.2476C9.8128 23.3133 9.46932 23.4953 9.20748 23.7683L9.13332 23.8425C8.91199 24.0639 8.65086 24.2398 8.36472 24.3598C8.07858 24.4798 7.77279 24.5416 7.46407 24.5416C7.15536 24.5416 6.84956 24.4798 6.56342 24.3598C6.27729 24.2398 6.01615 24.0639 5.79482 23.8425C5.57341 23.6211 5.39752 23.36 5.27751 23.0739C5.1575 22.7878 5.09569 22.482 5.09569 22.1733C5.09569 21.8646 5.1575 21.5588 5.27751 21.2726C5.39752 20.9865 5.57341 20.7254 5.79482 20.504L5.86898 20.4299C6.14197 20.168 6.3239 19.8246 6.38962 19.4505C6.45534 19.0763 6.40141 18.691 6.23548 18.3507C6.07567 18.0167 5.82126 17.7404 5.50509 17.5586C5.18892 17.3768 4.82496 17.2978 4.46215 17.3316H4.28665C3.66456 17.3316 3.06794 17.0846 2.62806 16.6447C2.18818 16.2049 1.94115 15.6082 1.94115 14.9862C1.94115 14.3641 2.18818 13.7674 2.62806 13.3276C3.06794 12.8877 3.66456 12.6407 4.28665 12.6407H4.39707C4.77276 12.5995 5.12706 12.4468 5.41448 12.2027C5.7019 11.9586 5.90937 11.6347 6.00998 11.2716C6.17591 10.9313 6.22984 10.546 6.16412 10.1719C6.0984 9.79774 5.91647 9.45426 5.64348 9.19242L5.56932 9.11825C5.34791 8.89692 5.17202 8.63579 5.05201 8.34965C4.932 8.06351 4.87019 7.75771 4.87019 7.449C4.87019 7.14029 4.932 6.83449 5.05201 6.54835C5.17202 6.26221 5.34791 6.00108 5.56932 5.77975C5.79065 5.55834 6.05179 5.38245 6.33792 5.26244C6.62406 5.14243 6.92986 5.08062 7.23857 5.08062C7.54729 5.08062 7.85308 5.14243 8.13922 5.26244C8.42536 5.38245 8.6865 5.55834 8.90782 5.77975L8.98198 5.85392C9.24382 6.12691 9.5873 6.30883 9.96146 6.37455C10.3356 6.44027 10.7209 6.38634 11.0612 6.22042H11.1353C11.4694 6.06061 11.7457 5.8062 11.9275 5.49003C12.1092 5.17386 12.1883 4.80989 12.1545 4.44708V4.27159C12.1545 3.64949 12.4015 3.05288 12.8414 2.613C13.2813 2.17312 13.8779 1.92609 14.5 1.92609C15.1221 1.92609 15.7187 2.17312 16.1586 2.613C16.5985 3.05288 16.8455 3.64949 16.8455 4.27159V4.38201C16.8792 4.74481 16.9583 5.10878 17.1401 5.42495C17.3218 5.74113 17.5981 5.99553 17.9322 6.15534C18.2725 6.32127 18.6578 6.3752 19.0319 6.30948C19.4061 6.24376 19.7496 6.06183 20.0114 5.78884L20.0856 5.71467C20.3069 5.49326 20.5681 5.31737 20.8542 5.19736C21.1403 5.07735 21.4461 5.01554 21.7549 5.01554C22.0636 5.01554 22.3694 5.07735 22.6555 5.19736C22.9416 5.31737 23.2028 5.49326 23.4241 5.71467C23.6455 5.936 23.8214 6.19714 23.9414 6.48327C24.0614 6.76941 24.1232 7.07521 24.1232 7.38392C24.1232 7.69263 24.0614 7.99843 23.9414 8.28457C23.8214 8.5707 23.6455 8.83184 23.4241 9.05317L23.35 9.12734C23.077 9.38918 22.895 9.73266 22.8293 10.1068C22.7636 10.481 22.8175 10.8662 22.9834 11.2066V11.2808C23.1432 11.6149 23.3976 11.8912 23.7138 12.0729C24.0299 12.2547 24.3939 12.3337 24.7567 12.3V12.3742C25.3788 12.3742 25.9754 12.6212 26.4153 13.0611C26.8552 13.501 27.1022 14.0976 27.1022 14.7197C27.1022 15.3418 26.8552 15.9384 26.4153 16.3783C25.9754 16.8182 25.3788 17.0652 24.7567 17.0652H24.6463C24.2835 17.099 23.9195 17.178 23.6033 17.3598C23.2872 17.5416 23.0328 17.8179 22.873 18.152V18.125Z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
)

export default function SF6Page() {
  // ========== 基本設定 ==========
  const pageKey = SF6_CONFIG.pageKey
  const [year] = useState(new Date().getFullYear())
  const [initialStatus, setInitialStatus] = useState<EntryStatus>('submitted')
  const [currentEntryId, setCurrentEntryId] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  // ========== 審核模式 ==========
  const { isReviewMode, reviewEntryId, reviewUserId } = useReviewMode()

  // ========== 整合業務邏輯 Hooks ==========
  // 設備管理（新 Hook）
  const {
    currentEditingGroup,
    savedDevices,
    setSavedDevices,
    updateCurrentDevice,
    saveCurrentDevice,
    loadDeviceToEditor,
    deleteSavedDevice,
    updateNameplateFiles,
    updateCertificateFiles
  } = useSF6DeviceManager()

  // 通知管理（新 Hook）
  const {
    error,
    success,
    setError,
    setSuccess,
    showClearConfirmModal,
    setShowClearConfirmModal
  } = useSF6Notifications()

  // 其他 UI 狀態
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);
  const [thumbnails, setThumbnails] = useState<{ [key: string]: string }>({});

  // ========== 其他 Hooks ==========
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

  // 資料載入 Hook
  const entryIdToLoad = isReviewMode && reviewEntryId ? reviewEntryId : undefined
  const {
    entry: loadedEntry,
    files: loadedFiles,
    loading: dataLoading,
    reload
  } = useEnergyData(pageKey, year, entryIdToLoad)

  // 審核狀態 Hook
  const { reload: reloadApprovalStatus, ...approvalStatus } = useApprovalStatus(pageKey, year)

  // 審核通過或審核模式下只有管理員可編輯
  const isReadOnly = approvalStatus.isApproved || (isReviewMode && role !== 'admin')

  const editPermissions = useEditPermissions(currentStatus, isReadOnly, role ?? undefined)

  // 管理員儲存 Hook
  const { save: adminSave, saving: adminSaving } = useAdminSave(pageKey, reviewEntryId)

  // 提交狀態管理
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null)

  // 清除 Hook
  const {
    clear,
    clearing: clearLoading
  } = useEnergyClear(currentEntryId, currentStatus)

  // 幽靈檔案清理 Hook
  const { cleanFiles } = useGhostFileCleaner()

  // ========== 資料載入邏輯 ==========
  // 第一步：Entry 載入後解析資料
  useEffect(() => {
    if (loadedEntry && !dataLoading) {
      const entryStatus = loadedEntry.status as EntryStatus
      setInitialStatus(entryStatus)
      setCurrentEntryId(loadedEntry.id)
      setCurrentStatus(entryStatus)

      // 從 payload 取得 SF6 資料
      const dataFieldName = SF6_CONFIG.dataFieldName
      if (loadedEntry.payload?.[dataFieldName]) {
        const dataArray = Array.isArray(loadedEntry.payload[dataFieldName])
          ? loadedEntry.payload[dataFieldName]
          : []

        if (dataArray.length > 0) {
          const updated = dataArray.map((item: any) => ({
            ...item,
            id: String(item.id),
            nameplateFiles: [],
            certificateFiles: [],
            memoryNameplateFiles: [],
            memoryCertificateFiles: [],
          }))

          setSavedDevices(updated)
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadedEntry, dataLoading])

  // 第二步：檔案載入後分配到記錄
  useEffect(() => {
    if (dataLoading) return

    if (loadedFiles.length > 0 && savedDevices.length > 0) {
      const sf6Files = loadedFiles.filter(f =>
        f.file_type === 'other' && f.page_key === pageKey
      )

      if (sf6Files.length > 0) {
        const cleanAndAssignFiles = async () => {
          const validSF6Files = await cleanFiles(sf6Files)

          setSavedDevices(prev => {
            return prev.map((device) => {
              // 分別取得銘牌和證明文件
              const nameplateFiles = validSF6Files.filter(f => f.record_id === `${device.id}-nameplate`)
              const certificateFiles = validSF6Files.filter(f => f.record_id === `${device.id}-certificate`)

              return {
                ...device,
                nameplateFiles,
                certificateFiles,
                memoryNameplateFiles: [],
                memoryCertificateFiles: []
              }
            })
          })
        }

        cleanAndAssignFiles()
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadedFiles, pageKey, dataLoading])

  // ========== 事件處理 ==========

  // 準備乾淨的設備資料（移除前端專用欄位）
  const prepareCleanedDeviceData = () => {
    return savedDevices.map(({
      id,
      location,
      sf6Weight,
      model,
      leakageRate,
      groupId
    }) => ({
      id,
      location,
      sf6Weight,
      model,
      leakageRate,
      groupId
    }))
  }

  // 處理設備檔案上傳（銘牌和證明文件）
  const handleDeviceFilesUpload = async (entryId: string) => {
    console.log('📤 [handleDeviceFilesUpload] 開始處理檔案，設備數量:', savedDevices.length)

    for (const device of savedDevices) {
      console.log('📤 [handleDeviceFilesUpload] 處理設備:', {
        deviceId: device.id,
        memoryNameplateFilesCount: device.memoryNameplateFiles?.length || 0,
        memoryCertificateFilesCount: device.memoryCertificateFiles?.length || 0
      })

      // 銘牌照片：先檢查有沒有新檔案（file.size > 0 的才是真的新檔案）
      if (device.memoryNameplateFiles && device.memoryNameplateFiles.length > 0) {
        const newFiles = device.memoryNameplateFiles.filter(f => f.file && f.file.size > 0)

        if (newFiles.length > 0) {
          // 有新檔案才刪除舊的
          const oldNameplateFiles = loadedFiles.filter(f =>
            f.record_id === `${device.id}-nameplate` && f.file_type === 'other'
          )
          for (const oldFile of oldNameplateFiles) {
            try {
              await deleteEvidence(oldFile.id)
            } catch {
              // Continue on error
            }
          }

          // 上傳新檔案
          for (const file of newFiles) {
            await uploadEvidenceFile(file.file, {
              page_key: pageKey,
              period_year: year,
              file_type: 'other',
              entry_id: entryId,
              record_id: `${device.id}-nameplate`,
              standard: '64'
            })
          }
        }
      }

      // 證明文件：先檢查有沒有新檔案（file.size > 0 的才是真的新檔案）
      if (device.memoryCertificateFiles && device.memoryCertificateFiles.length > 0) {
        const newFiles = device.memoryCertificateFiles.filter(f => f.file && f.file.size > 0)

        if (newFiles.length > 0) {
          // 有新檔案才刪除舊的
          const oldCertificateFiles = loadedFiles.filter(f =>
            f.record_id === `${device.id}-certificate` && f.file_type === 'other'
          )
          for (const oldFile of oldCertificateFiles) {
            try {
              await deleteEvidence(oldFile.id)
            } catch {
              // Continue on error
            }
          }

          // 上傳新檔案
          for (const file of newFiles) {
            await uploadEvidenceFile(file.file, {
              page_key: pageKey,
              period_year: year,
              file_type: 'other',
              entry_id: entryId,
              record_id: `${device.id}-certificate`,
              standard: '64'
            })
          }
        }
      }
    }
  }

  // 統一提交函數（提交和暫存）
  const submitData = async (isDraft: boolean) => {
    if (savedDevices.length === 0) {
      throw new Error('請至少新增一個設備')
    }

    setSubmitting(true)
    try {
      const totalWeight = savedDevices.reduce((sum, device) => sum + device.sf6Weight, 0)
      const cleanedDeviceData = prepareCleanedDeviceData()

      // 1. 提交 entry
      const response = await submitEnergyEntry({
        page_key: pageKey,
        period_year: year,
        unit: SF6_CONFIG.unit,
        monthly: { '1': totalWeight },
        status: isDraft ? 'saved' : 'submitted',
        notes: `${SF6_CONFIG.title}使用共 ${savedDevices.length} 台設備`,
        payload: {
          [SF6_CONFIG.dataFieldName]: cleanedDeviceData
        }
      })

      // 2. 上傳檔案
      await handleDeviceFilesUpload(response.entry_id)

      setCurrentEntryId(response.entry_id)
      setSubmitSuccess(isDraft ? '暫存成功' : '提交成功')

      await reload()

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
      setError(error instanceof Error ? error.message : '提交失敗')
      setSubmitError(error instanceof Error ? error.message : '提交失敗')
    }
  };

  // 收集管理員儲存所需的檔案（上傳和刪除清單）
  const collectFilesForAdminSave = () => {
    const filesToUpload: Array<{
      file: File
      metadata: {
        recordIndex: number
        fileType: 'other'
        recordId?: string
      }
    }> = []
    const filesToDelete: string[] = []

    savedDevices.forEach((device, index) => {
      // 銘牌照片：只上傳新檔案（file.size > 0 的才是真的新檔案）
      if (device.memoryNameplateFiles && device.memoryNameplateFiles.length > 0) {
        const newFiles = device.memoryNameplateFiles.filter((mf: MemoryFile) => mf.file && mf.file.size > 0)

        if (newFiles.length > 0) {
          newFiles.forEach((mf: MemoryFile) => {
            filesToUpload.push({
              file: mf.file,
              metadata: {
                recordIndex: index,
                fileType: 'other',
                recordId: `${device.id}-nameplate`
              }
            })
          })

          // 刪除舊的銘牌檔案
          const oldNameplateFiles = loadedFiles.filter(f =>
            f.record_id === `${device.id}-nameplate` && f.file_type === 'other'
          )
          oldNameplateFiles.forEach(f => filesToDelete.push(f.id))
        }
      }

      // 證明文件：只上傳新檔案（file.size > 0 的才是真的新檔案）
      if (device.memoryCertificateFiles && device.memoryCertificateFiles.length > 0) {
        const newFiles = device.memoryCertificateFiles.filter((mf: MemoryFile) => mf.file && mf.file.size > 0)

        if (newFiles.length > 0) {
          newFiles.forEach((mf: MemoryFile) => {
            filesToUpload.push({
              file: mf.file,
              metadata: {
                recordIndex: index,
                fileType: 'other',
                recordId: `${device.id}-certificate`
              }
            })
          })

          // 刪除舊的證明文件
          const oldCertificateFiles = loadedFiles.filter(f =>
            f.record_id === `${device.id}-certificate` && f.file_type === 'other'
          )
          oldCertificateFiles.forEach(f => filesToDelete.push(f.id))
        }
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
        const totalWeight = savedDevices.reduce((sum, device) => sum + device.sf6Weight, 0)
        const cleanedDeviceData = prepareCleanedDeviceData()
        const { filesToUpload, filesToDelete } = collectFilesForAdminSave()

        await deleteOldFiles(filesToDelete)

        await adminSave({
          updateData: {
            unit: SF6_CONFIG.unit,
            amount: totalWeight,
            payload: {
              monthly: { '1': totalWeight },
              [SF6_CONFIG.dataFieldName]: cleanedDeviceData
            }
          },
          files: filesToUpload
        })

        await reload()
        reloadApprovalStatus()
        setSuccess('管理員儲存成功')
        setSubmitSuccess('管理員儲存成功')
      } finally {
        setSubmitting(false)
      }
      return
    }

    // 一般暫存
    try {
      await submitData(true)
    } catch (error) {
      console.error('❌ 暫存失敗:', error)
      setError(error instanceof Error ? error.message : '暫存失敗')
      setSubmitError(error instanceof Error ? error.message : '暫存失敗')
    }
  };

  const handleClear = () => {
    setShowClearConfirmModal(true);
  };

  const handleClearConfirm = async () => {
    try {
      // 收集所有檔案
      const allFiles = [
        ...savedDevices.flatMap(d => [...(d.nameplateFiles || []), ...(d.certificateFiles || [])])
      ]
      const allMemoryFiles = [
        ...currentEditingGroup.memoryNameplateFiles,
        ...currentEditingGroup.memoryCertificateFiles,
        ...savedDevices.flatMap(d => [
          ...(d.memoryNameplateFiles || []),
          ...(d.memoryCertificateFiles || [])
        ])
      ]

      // 使用 Hook 清除
      await clear({
        filesToDelete: allFiles,
        memoryFilesToClean: allMemoryFiles
      })

      // 重置前端狀態（使用 Hook 的 setter）
      setSavedDevices([])
      setCurrentEntryId(null)
      setShowClearConfirmModal(false)

      // 重新載入
      await reload()
      reloadApprovalStatus()

      setSuccess('資料已完全清除')
    } catch (error) {
      setError(error instanceof Error ? error.message : '清除失敗，請重試')
    }
  };

  // ========== 輔助邏輯 ==========
  // 只為圖片檔案生成縮圖
  useEffect(() => {
    savedDevices.forEach(async (device) => {
      // 載入銘牌照片縮圖
      const nameplateFile = device.nameplateFiles?.[0]
      if (nameplateFile &&
          nameplateFile.mime_type.startsWith('image/') &&
          !thumbnails[nameplateFile.id]) {
        try {
          const url = await getFileUrl(nameplateFile.file_path)
          setThumbnails(prev => ({
            ...prev,
            [nameplateFile.id]: url
          }))
        } catch (error) {
          console.warn('Failed to generate thumbnail for', nameplateFile.file_name, error)
        }
      }

      // 載入證明文件縮圖
      const certificateFile = device.certificateFiles?.[0]
      if (certificateFile &&
          certificateFile.mime_type.startsWith('image/') &&
          !thumbnails[certificateFile.id]) {
        try {
          const url = await getFileUrl(certificateFile.file_path)
          setThumbnails(prev => ({
            ...prev,
            [certificateFile.id]: url
          }))
        } catch (error) {
          console.warn('Failed to generate thumbnail for', certificateFile.file_name, error)
        }
      }
    })
  }, [savedDevices, thumbnails])

  // ========== UI 渲染 ==========
  return (
    <>
      {/* 隱藏瀏覽器原生數字輸入框的上下箭頭 */}
      <style>{`
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
          category: SF6_CONFIG.category,
          title: SF6_CONFIG.title,
          subtitle: SF6_CONFIG.subtitle,
          iconColor: SF6_CONFIG.iconColor,
          categoryPosition: SF6_CONFIG.categoryPosition
        }}
        statusBanner={{
          approvalStatus,
          isReviewMode,
          accentColor: SF6_CONFIG.iconColor
        }}
        instructionText={SF6_CONFIG.instructionText}
        bottomActionBar={{
          currentStatus,
          submitting,
          onSubmit: handleSubmit,
          onSave: handleSave,
          onClear: handleClear,
          show: !isReadOnly && !approvalStatus.isApproved && !isReviewMode,
          accentColor: SF6_CONFIG.iconColor
        }}
        reviewSection={{
          isReviewMode,
          reviewEntryId,
          reviewUserId,
          currentEntryId,
          pageKey,
          year,
          category: SF6_CONFIG.title,
          amount: savedDevices.reduce((sum, device) => sum + device.sf6Weight, 0),
          unit: SF6_CONFIG.unit,
          role,
          onSave: handleSave,
          isSaving: adminSaving || submitting
        }}
        notificationState={{
          success: submitSuccess,
          error: submitError,
          clearSuccess: () => setSubmitSuccess(null),
          clearError: () => setSubmitError(null)
        }}
      >
        {/* 使用數據區塊 - 使用新組件 SF6InputFields */}
        <MobileEnergyUsageSection
          isReadOnly={isReadOnly}
          submitting={submitting}
          approvalStatus={approvalStatus}
          editPermissions={editPermissions}
          currentEditingGroup={{
            groupId: currentEditingGroup.groupId,
            records: [],
            memoryFiles: []
          }}
          setCurrentEditingGroup={() => {}}
          addRecordToCurrentGroup={() => {}}
          updateCurrentGroupRecord={() => {}}
          removeRecordFromCurrentGroup={() => {}}
          saveCurrentGroup={() => saveCurrentDevice(setSuccess, setError)}
          thumbnails={thumbnails}
          onPreviewImage={(src) => setLightboxSrc(src)}
          onError={(msg) => setError(msg)}
          iconColor={SF6_CONFIG.iconColor}
          title="GCB 氣體斷路氣設備資料"
          icon={<SettingsIcon />}
          saveButtonNewText="+ 新增設備"
          saveButtonText="變更儲存"
          renderInputFields={() => (
            <SF6InputFields
              record={currentEditingGroup.record}
              memoryNameplateFiles={currentEditingGroup.memoryNameplateFiles}
              memoryCertificateFiles={currentEditingGroup.memoryCertificateFiles}
              isReadOnly={isReadOnly}
              onRecordChange={updateCurrentDevice}
              onNameplateFilesChange={updateNameplateFiles}
              onCertificateFilesChange={updateCertificateFiles}
              onImagePreview={(src) => setLightboxSrc(src)}
            />
          )}
        />

        {/* 資料列表區塊 */}
        <SF6ListSection
          savedDevices={savedDevices}
          thumbnails={thumbnails}
          isReadOnly={isReadOnly}
          approvalStatus={approvalStatus}
          onEditDevice={(deviceId) => loadDeviceToEditor(deviceId, setSuccess)}
          onDeleteDevice={(deviceId) => deleteSavedDevice(deviceId)}
          onPreviewImage={(src: string) => setLightboxSrc(src)}
          iconColor={SF6_CONFIG.iconColor}
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
