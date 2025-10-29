import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Upload, AlertCircle, CheckCircle, Loader2, X, Trash2, Eye } from 'lucide-react'
import EvidenceUpload from '../../components/EvidenceUpload'
import StatusSwitcher, { EntryStatus } from '../../components/StatusSwitcher'
import StatusIndicator from '../../components/StatusIndicator'
import Toast, { ToastType } from '../../components/Toast'
import BottomActionBar from '../../components/BottomActionBar'
import { useEditPermissions } from '../../hooks/useEditPermissions'
import { useFrontendStatus } from '../../hooks/useFrontendStatus'
import { useApprovalStatus } from '../../hooks/useApprovalStatus'
import { useStatusBanner, getBannerColorClasses } from '../../hooks/useStatusBanner'
import { useEnergyData } from '../../hooks/useEnergyData'
import { useEnergySubmit } from '../../hooks/useEnergySubmit'
import { useEnergyClear } from '../../hooks/useEnergyClear'
import { useSubmitGuard } from '../../hooks/useSubmitGuard'
import { useGhostFileCleaner } from '../../hooks/useGhostFileCleaner'
import { useReloadWithFileSync } from '../../hooks/useReloadWithFileSync'
import { useRole } from '../../hooks/useRole'
import { useAdminSave } from '../../hooks/useAdminSave'
import { sumMonthly, updateEntryStatus } from '../../api/entries'
import { EvidenceFile } from '../../api/files'
import { MemoryFile } from '../../components/EvidenceUpload'
import ReviewSection from '../../components/ReviewSection'
import { supabase } from '../../lib/supabaseClient'
import { designTokens } from '../../utils/designTokens'


interface MonthData {
  month: number
  quantity: number
  totalUsage: number
  files: EvidenceFile[]
}

const AcetylenePage = () => {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  // 審核模式檢測
  const isReviewMode = searchParams.get('mode') === 'review'
  const reviewEntryId = searchParams.get('entryId')
  const reviewUserId = searchParams.get('userId')

  const { executeSubmit, submitting } = useSubmitGuard()
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [hasSubmittedBefore, setHasSubmittedBefore] = useState(false)
  const [showSuccessModal, setShowSuccessModal] = useState(false)
  const [showClearConfirmModal, setShowClearConfirmModal] = useState(false)
  const [currentEntryId, setCurrentEntryId] = useState<string | null>(null)
  const [initialStatus, setInitialStatus] = useState<EntryStatus>('submitted')
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null)
  const [lastLoadedEntryId, setLastLoadedEntryId] = useState<string | null>(null)
  
  // 前端狀態管理 Hook
  const frontendStatus = useFrontendStatus({
    initialStatus,
    entryId: currentEntryId,
    onStatusChange: (newStatus) => {
      console.log('Status changed to:', newStatus)
    },
    onError: (error) => setError(error),
    onSuccess: (message) => {
      setToast({ message, type: 'success' })
      setSuccess(message)
    }
  })

  const { currentStatus, setCurrentStatus, handleDataChanged, handleSubmitSuccess, isInitialLoad } = frontendStatus

  // 表單資料
  const [year] = useState(new Date().getFullYear())
  const pageKey = 'acetylene'

  // 資料載入 Hook
  const entryIdToLoad = isReviewMode && reviewEntryId ? reviewEntryId : undefined
  const {
    entry: loadedEntry,
    files: loadedFiles,
    loading: dataLoading,
    error: dataError,
    reload
  } = useEnergyData(pageKey, year, entryIdToLoad)

  // 審核狀態檢查 Hook
  const { reload: reloadApprovalStatus, ...approvalStatus } = useApprovalStatus(pageKey, year)

  // 狀態橫幅 Hook
  const banner = useStatusBanner(approvalStatus, isReviewMode)

  // 提交 Hook
  const {
    submit,
    save,
    submitting: submitLoading,
    error: submitError,
    success: submitSuccess,
    clearError: clearSubmitError,
    clearSuccess: clearSubmitSuccess
  } = useEnergySubmit(pageKey, year, approvalStatus.status)  // ✅ 使用資料庫狀態

  // 角色檢查
  const { role } = useRole()

  // 清除 Hook
  const {
    clear,
    clearing: clearLoading,
    error: clearError,
    clearError: clearClearError
  } = useEnergyClear(currentEntryId, currentStatus)

  // 幽靈檔案清理 Hook
  const { cleanFiles } = useGhostFileCleaner()

  // 檔案同步 reload Hook
  const { reloadAndSync } = useReloadWithFileSync(reload)

  const [unitWeight, setUnitWeight] = useState<number>(0)
  const [unitWeightFiles, setUnitWeightFiles] = useState<EvidenceFile[]>([])
  const [unitWeightMemoryFiles, setUnitWeightMemoryFiles] = useState<MemoryFile[]>([])
  const [monthlyData, setMonthlyData] = useState<MonthData[]>(
    Array.from({ length: 12 }, (_, i) => ({
      month: i + 1,
      quantity: 0,
      totalUsage: 0,
      files: []
    }))
  )
  const [monthlyMemoryFiles, setMonthlyMemoryFiles] = useState<MemoryFile[][]>(
    Array.from({ length: 12 }, () => [])
  )

  // 編輯權限控制
  const editPermissions = useEditPermissions(currentStatus)

  // 判斷是否有資料
  const hasAnyData = useMemo(() => {
    const hasMonthlyData = monthlyData?.some(m => m.quantity > 0) || false
    const hasBasicData = unitWeight > 0
    const hasFiles = (unitWeightFiles?.length || 0) > 0
    const hasMemoryFiles = unitWeightMemoryFiles.length > 0 || monthlyMemoryFiles.some(files => files.length > 0)
    return hasMonthlyData || hasBasicData || hasFiles || hasMemoryFiles
  }, [monthlyData, unitWeight, unitWeightFiles, unitWeightMemoryFiles, monthlyMemoryFiles])
  
  // 審核模式下只有管理員可編輯
  const isReadOnly = isReviewMode && role !== 'admin'

  // 管理員審核儲存 Hook
  const { save: adminSave, saving: adminSaving } = useAdminSave(pageKey, reviewEntryId)

  const monthNames = [
    '1月', '2月', '3月', '4月', '5月', '6月',
    '7月', '8月', '9月', '10月', '11月', '12月'
  ]

  // 處理載入的 entry：將資料載入到表單狀態
  useEffect(() => {
    if (loadedEntry?.payload) {
      // ⚠️ 判斷是否應該載入表單資料
      // - 首次載入：必須載入
      // - 切換到不同 entry（如審核模式）：必須載入
      // - 相同 entry reload（如提交後）：不覆蓋使用者輸入
      const isNewEntry = loadedEntry.id !== lastLoadedEntryId
      const shouldLoadFormData = isInitialLoad.current || isNewEntry

      // 設定 entry 資訊（總是更新）
      const entryStatus = loadedEntry.status as EntryStatus
      setCurrentEntryId(loadedEntry.id)
      setHasSubmittedBefore(true)
      setInitialStatus(entryStatus)
      setCurrentStatus(entryStatus)  // 同步前端狀態

      // 只在首次載入或切換 entry 時設定表單欄位
      if (!shouldLoadFormData) return


      console.log('✅ [Acetylene] Loading existing entry (initial load):', {
        id: loadedEntry.id,
        status: loadedEntry.status,
        hasPayload: !!loadedEntry.payload
      })

      // 載入單位重量（新結構優先，舊結構備用）
      let loadedUnitWeight = 0
      if (loadedEntry.payload.unitCapacity !== undefined) {
        loadedUnitWeight = loadedEntry.payload.unitCapacity || 0
      } else if (loadedEntry.payload.notes) {
        const unitWeightMatch = loadedEntry.payload.notes.match(/單位重量: ([\d.]+)/)
        if (unitWeightMatch) {
          loadedUnitWeight = parseFloat(unitWeightMatch[1]) || 0
        }
      }
      setUnitWeight(loadedUnitWeight)

      // 載入月份數據（新結構優先）
      if (loadedEntry.payload.monthly) {
        const newMonthlyData = Array.from({ length: 12 }, (_, i) => {
          const month = i + 1
          const monthKey = month.toString()
          const quantity = loadedEntry.payload.monthlyQuantity?.[monthKey] || 0
          const totalUsage = loadedEntry.payload.monthly[monthKey] || 0
          return {
            month,
            quantity,
            totalUsage,
            files: []
          }
        })
        setMonthlyData(newMonthlyData)
      }

      // 記錄已載入的 entry ID
      setLastLoadedEntryId(loadedEntry.id)
      isInitialLoad.current = false
    } else if (loadedEntry === null && !dataLoading) {
      // 沒有 entry，重置為初始狀態
      console.log('📝 [AcetylenePage] No existing entry found')
      setCurrentEntryId(null)
      setHasSubmittedBefore(false)
      setInitialStatus('saved')
      setUnitWeight(0)
      setMonthlyData(Array.from({ length: 12 }, (_, i) => ({
        month: i + 1,
        quantity: 0,
        totalUsage: 0,
        files: []
      })))
      setLastLoadedEntryId(null)
      isInitialLoad.current = false
    }
  }, [loadedEntry, dataLoading])

  // 處理載入的檔案：分類到 MSDS 和月份檔案
  useEffect(() => {
    if (loadedFiles.length > 0) {
      console.log('📁 [AcetylenePage] Loading files:', loadedFiles.length)

      // ✅ 先清理幽靈檔案，再分類
      const cleanAndAssignFiles = async () => {
        const validFiles = await cleanFiles(loadedFiles)
        console.log('✅ [AcetylenePage] Valid files after cleanup:', validFiles.length)

        // 分類 MSDS 檔案
        const msds = validFiles.filter(f => f.file_type === 'msds')
        setUnitWeightFiles(msds)

        // 分配月份檔案（避免重複） - 深拷貝避免引用問題
        const newMonthlyData = monthlyData.map(data => ({
          ...data,
          files: [...data.files]  // 深拷貝 files 陣列
        }))
        validFiles
          .filter(f => f.file_type === 'usage_evidence' && f.month)
          .forEach(file => {
            const monthIndex = file.month! - 1
            if (monthIndex >= 0 && monthIndex < 12) {
              const exists = newMonthlyData[monthIndex].files.some(
                ef => ef.id === file.id
              )
              if (!exists) {
                newMonthlyData[monthIndex].files.push(file)
              }
            }
          })

        // ✅ 更新 monthlyData 狀態，讓檔案顯示在 UI
        setMonthlyData(newMonthlyData)
        // ✅ 不清空 memoryFiles - 讓新上傳的檔案保留
        // 只在 submit 成功、clear 操作、cleanup 時才清空
      }

      cleanAndAssignFiles()
    }
  }, [loadedFiles, cleanFiles])


  // 離開頁面提醒
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      const hasData = monthlyData.some(d => d.quantity > 0)
      
      if (hasData && !hasSubmittedBefore) {
        e.preventDefault()
        e.returnValue = '您有資料尚未提交，離開將會遺失資料。是否確定離開？'
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [monthlyData, hasSubmittedBefore])

  // 單位重量變更時自動計算總使用量
  useEffect(() => {
    if (unitWeight > 0) {
      const updatedData = monthlyData.map(data => ({
        ...data,
        totalUsage: data.quantity * unitWeight
      }))
      setMonthlyData(updatedData)
    }
  }, [unitWeight])

  const updateMonthData = (index: number, field: keyof MonthData, value: any) => {
    setMonthlyData(prev => {
      const newData = [...prev]
      newData[index] = { ...newData[index], [field]: value }
      
      // 當修改瓶數且有單位重量時，自動計算總使用量
      if (field === 'quantity' && unitWeight > 0) {
        newData[index].totalUsage = (value as number) * unitWeight
      } else if (field === 'quantity' && unitWeight === 0) {
        // 如果沒有單位重量，總使用量等於瓶數
        newData[index].totalUsage = value as number
      }
      
      return newData
    })
  }

  const handleMonthFilesChange = (month: number, files: EvidenceFile[]) => {
    setMonthlyData(prev => prev.map(data =>
      data.month === month ? { ...data, files } : data
    ))
  }

  const handleUnitWeightFilesChange = (files: EvidenceFile[]) => {
    setUnitWeightFiles(files)
  }

  const handleUnitWeightMemoryFilesChange = (files: MemoryFile[]) => {
    console.log('📁 [AcetylenePage] Unit weight memory files changed:', files.length)
    setUnitWeightMemoryFiles(files)
  }

  const handleMonthMemoryFilesChange = (month: number, files: MemoryFile[]) => {
    console.log(`📁 [AcetylenePage] Month ${month} memory files changed:`, files.length)
    setMonthlyMemoryFiles(prev => {
      const newFiles = [...prev]
      newFiles[month - 1] = files
      return newFiles
    })
  }

  const getTotalUsage = () => {
    return monthlyData.reduce((sum, data) => sum + data.totalUsage, 0)
  }

  const validateData = () => {
    const errors: string[] = []

    console.log('🔍 [AcetylenePage] Validating data...', {
      unitWeightFiles: unitWeightFiles.length,
      unitWeightMemoryFiles: unitWeightMemoryFiles.length,
      monthlyMemoryFiles: monthlyMemoryFiles.map((files, i) => ({ month: i + 1, count: files.length }))
    })

    monthlyData.forEach((data, index) => {
      if (data.quantity > 0) {
        const monthMemoryFiles = monthlyMemoryFiles[index] || []
        const totalFiles = data.files.length + monthMemoryFiles.length
        if (totalFiles === 0) {
          errors.push(`${monthNames[index]}有使用量但未上傳使用證明`)
        }
      }
    })

    return errors
  }

  const handleSubmit = async () => {
    // 驗證資料
    const errors = validateData()
    if (errors.length > 0) {
      setError('請修正以下問題：\n' + errors.join('\n'))
      return
    }

    await executeSubmit(async () => {
      setError(null)
      setSuccess(null)

      // 準備每月數據
      const monthly: Record<string, number> = {}
      const monthlyQuantity: Record<string, number> = {}
      monthlyData.forEach(data => {
        if (data.quantity > 0) {
          monthly[data.month.toString()] = data.totalUsage
          monthlyQuantity[data.month.toString()] = data.quantity
        }
      })

      // 呼叫 Hook 提交
      const entry_id = await submit({
        formData: {
          unitCapacity: unitWeight,
          carbonRate: 0, // 乙炔不需要碳排係數
          monthly,
          monthlyQuantity,
          unit: 'kg'
        },
        msdsFiles: unitWeightMemoryFiles,
        monthlyFiles: monthlyMemoryFiles
      })

      // 更新 currentEntryId
      setCurrentEntryId(entry_id)

      // 重新載入後端資料並等待同步完成
      await reloadAndSync()

      // 清空記憶體檔案
      setUnitWeightMemoryFiles([])
      setMonthlyMemoryFiles(Array.from({ length: 12 }, () => []))

      // 處理狀態轉換
      await handleSubmitSuccess()

      // 重新載入審核狀態，更新狀態橫幅
      reloadApprovalStatus()

      setHasSubmittedBefore(true)
      setShowSuccessModal(true)

      const totalUsage = sumMonthly(monthly)
      setSuccess(`提交成功！年度總使用量：${totalUsage.toFixed(2)} kg`)
    }).catch(error => {
      console.error('❌ 提交失敗:', error)
      setError(error instanceof Error ? error.message : '提交失敗')
    })
  }

  const handleSave = async () => {
    await executeSubmit(async () => {
      setError(null)
      setSuccess(null)

      // 準備每月數據
      const monthly: Record<string, number> = {}
      const monthlyQuantity: Record<string, number> = {}
      monthlyData.forEach(data => {
        if (data.quantity > 0) {
          monthly[data.month.toString()] = data.totalUsage
          monthlyQuantity[data.month.toString()] = data.quantity
        }
      })

      const totalAmount = Object.values(monthly).reduce((sum, val) => sum + val, 0)

      // 審核模式：使用 useAdminSave hook
      if (isReviewMode && reviewEntryId) {
        console.log('📝 管理員審核模式：使用 useAdminSave hook', reviewEntryId)

        // 準備月份檔案列表
        const filesToUpload: Array<{
          file: File
          metadata: {
            month: number
            fileType: 'usage_evidence' | 'msds' | 'other'
          }
        }> = []

        // 收集每個月份的使用證明檔案
        monthlyMemoryFiles.forEach((memFiles, monthIndex) => {
          if (memFiles && memFiles.length > 0) {
            memFiles.forEach(mf => {
              filesToUpload.push({
                file: mf.file,
                metadata: {
                  month: monthIndex + 1,
                  fileType: 'usage_evidence' as const
                }
              })
            })
          }
        })

        // 收集 MSDS 檔案
        unitWeightMemoryFiles.forEach((mf, index) => {
          filesToUpload.push({
            file: mf.file,
            metadata: {
              month: index + 1,
              fileType: 'msds' as const
            }
          })
        })

        // 從舊區塊中提取 payload 資料
        await adminSave({
          updateData: {
            unit: 'kg',
            amount: totalAmount,
            payload: {
              unitCapacity: unitWeight,
              carbonRate: 0,
              monthly,
              monthlyQuantity
            }
          },
          files: filesToUpload
        })


        await reloadAndSync()
        reloadApprovalStatus()
        // 清空記憶體檔案（在 reloadAndSync 之後，避免檔案暫時消失）
        setUnitWeightMemoryFiles([])
        setMonthlyMemoryFiles(Array.from({ length: 12 }, () => []))

        setToast({ message: '[SUCCESS] 儲存成功！資料已更新', type: 'success' })
        return
      }

      // 非審核模式：原本的邏輯
      const entry_id = await save({
        formData: {
          unitCapacity: unitWeight,
          carbonRate: 0,
          monthly,
          monthlyQuantity,
          unit: 'kg'
        },
        msdsFiles: unitWeightMemoryFiles,
        monthlyFiles: monthlyMemoryFiles
      })

      // 更新 currentEntryId
      setCurrentEntryId(entry_id)

      // 重新載入後端資料並等待同步完成
      await reloadAndSync()

      // 清空記憶體檔案
      setUnitWeightMemoryFiles([])
      setMonthlyMemoryFiles(Array.from({ length: 12 }, () => []))

      // 重新載入審核狀態，更新狀態橫幅
      reloadApprovalStatus()

      // 暫存成功，更新狀態（但不觸發 handleSubmitSuccess）
      setToast({ message: '暫存成功！資料已儲存', type: 'success' })
    }).catch(error => {
      console.error('❌ 暫存失敗:', error)
      setError(error instanceof Error ? error.message : '暫存失敗')
    })
  }

  const handleClearAll = async () => {
    try {
      // 收集所有要刪除的檔案
      const allFiles = [...unitWeightFiles]
      monthlyData.forEach(data => {
        allFiles.push(...data.files)
      })

      // 呼叫 Hook 清除
      await clear({
        filesToDelete: allFiles,
        memoryFilesToClean: [unitWeightMemoryFiles, ...monthlyMemoryFiles]
      })

      // 清除成功後，重置前端狀態
      setCurrentEntryId(null)
      setHasSubmittedBefore(false)
      setInitialStatus('saved')
      setUnitWeight(0)
      setUnitWeightFiles([])
      setUnitWeightMemoryFiles([])
      setMonthlyMemoryFiles(Array.from({ length: 12 }, () => []))
      setMonthlyData(Array.from({ length: 12 }, (_, i) => ({
        month: i + 1,
        quantity: 0,
        totalUsage: 0,
        files: []
      })))

      setError(null)
      setShowClearConfirmModal(false)
      setSuccess('資料已完全清除')

    } catch (error) {
      console.error('❌ 清除操作失敗:', error)
      const errorMessage = error instanceof Error ? error.message : '清除操作失敗，請重試'
      setError(errorMessage)
      setShowClearConfirmModal(false)
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
      {/* 主要內容區域 - 簡化結構，移除多層嵌套 */}
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

          <h1 className="text-3xl font-semibold mb-3" style={{ color: designTokens.colors.textPrimary }}>
            乙炔使用數量填報
          </h1>
          <p className="text-base" style={{ color: designTokens.colors.textSecondary }}>
            請填入各月份乙炔使用數據進行碳排放計算
          </p>
        </div>

        {/* 審核狀態橫幅 - 統一管理 */}
        {banner && (
          <div className={`border-l-4 p-4 mb-6 rounded-r-lg ${getBannerColorClasses(banner.type)}`}>
            <div className="flex items-center">
              <div className="text-2xl mr-3">{banner.icon}</div>
              <div className="flex-1">
                <p className="font-bold text-lg">{banner.title}</p>
                {banner.message && <p className="text-sm mt-1">{banner.message}</p>}
                {banner.reason && (
                  <div className="mt-3 p-3 bg-red-50 rounded-md border border-red-200">
                    <p className="text-base font-bold text-red-800 mb-1">退回原因：</p>
                    <p className="text-lg font-semibold text-red-900">{banner.reason}</p>
                  </div>
                )}
                {banner.reviewedAt && (
                  <p className="text-xs mt-2 opacity-75">
                    {banner.type === 'rejected' ? '退回時間' : '審核完成時間'}：
                    {new Date(banner.reviewedAt).toLocaleString()}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* 單位重量設定 */}
        <div 
          className="rounded-lg border p-6 mb-6"
          style={{ 
            backgroundColor: designTokens.colors.cardBg,
            borderColor: designTokens.colors.border,
            boxShadow: designTokens.shadows.sm
          }}
        >
          <h2 className="text-xl font-medium mb-4" style={{ color: designTokens.colors.textPrimary }}>
            單位重量設定
          </h2>
          <div className="space-y-6">
            {/* 單位重量輸入 */}
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: designTokens.colors.textPrimary }}>
                單位重量 (kg/瓶) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={unitWeight || ''}
                onChange={(e) => setUnitWeight(parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                style={{ borderColor: designTokens.colors.border }}
                placeholder="請輸入每瓶乙炔的標準重量"
                disabled={isReadOnly || dataLoading || submitting}
              />
              <p className="mt-1 text-sm" style={{ color: designTokens.colors.textSecondary }}>
                請填寫單瓶乙炔的標準重量（公斤），系統將自動計算總使用量
              </p>
            </div>
            
            {/* 單位重量佐證檔案 */}
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: designTokens.colors.textPrimary }}>
                單位重量佐證資料
              </label>
              <p className="text-sm mb-3" style={{ color: designTokens.colors.textSecondary }}>
                請上傳規格書、採購單據或其他可證明單位重量的文件（支援 PDF、JPG、PNG 格式）
              </p>
              <EvidenceUpload
                pageKey={pageKey}
                files={unitWeightFiles}
                onFilesChange={handleUnitWeightFilesChange}
                memoryFiles={unitWeightMemoryFiles}
                onMemoryFilesChange={handleUnitWeightMemoryFilesChange}
                mode={isReadOnly || approvalStatus.isApproved ? 'view' : 'edit'}
                      isAdminReviewMode={isReviewMode && role === 'admin'}
                maxFiles={3}
                kind="msds"
                disabled={submitting || isReadOnly || approvalStatus.isApproved}
              />
            </div>
          </div>
        </div>

        {/* 月份使用量數據 */}
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
            月份使用量數據
          </h2>

          {/* 響應式 Grid 佈局 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {monthlyData.map((data, index) => (
              <div
                key={data.month}
                className="border rounded-lg p-4"
                style={{
                  borderColor: designTokens.colors.border,
                  backgroundColor: '#fafbfc'
                }}
              >
                <div className="flex items-center justify-between mb-4">
                  <h3
                    className="text-base font-medium"
                    style={{ color: designTokens.colors.textPrimary }}
                  >
                    {monthNames[index]}
                  </h3>
                  {data.totalUsage > 0 && (
                    <span
                      className="text-base font-medium px-2 py-1 rounded"
                      style={{
                        color: designTokens.colors.accentSecondary,
                        backgroundColor: designTokens.colors.accentLight
                      }}
                    >
                      總量：{data.totalUsage.toFixed(2)} kg
                    </span>
                  )}
                </div>

                <div className="space-y-4">
                  <div>
                    <label
                      className="block text-base font-medium mb-2"
                      style={{ color: designTokens.colors.textPrimary }}
                    >
                      使用數量 (瓶)
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.1"
                      value={data.quantity || ''}
                      onChange={(e) => {
                        const inputValue = e.target.value.trim()
                        const numValue = inputValue === '' ? 0 : parseFloat(inputValue)
                        updateMonthData(index, 'quantity', isNaN(numValue) ? 0 : numValue)
                      }}
                      disabled={isReadOnly}
                      className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:border-transparent transition-all ${
                        isReadOnly ? 'bg-gray-100 cursor-not-allowed' : ''
                      }`}
                      style={{
                        color: designTokens.colors.textPrimary,
                        borderColor: designTokens.colors.border
                      }}
                      onFocus={(e) => {
                        if (editPermissions.canEdit) {
                          (e.target as HTMLInputElement).style.borderColor = designTokens.colors.accentPrimary;
                          (e.target as HTMLInputElement).style.boxShadow = `0 0 0 2px ${designTokens.colors.accentPrimary}20`
                        }
                      }}
                      onBlur={(e) => {
                        (e.target as HTMLInputElement).style.borderColor = designTokens.colors.border;
                        (e.target as HTMLInputElement).style.boxShadow = 'none'
                      }}
                      placeholder="0"
                    />
                  </div>

                  <div>
                    <label
                      className="block text-base font-medium mb-2"
                      style={{ color: designTokens.colors.textPrimary }}
                    >
                      使用證明
                    </label>
                    <EvidenceUpload
                      pageKey={pageKey}
                      month={data.month}
                      files={data.files}
                      onFilesChange={(files) => handleMonthFilesChange(data.month, files)}
                      memoryFiles={monthlyMemoryFiles[data.month - 1] || []}
                      onMemoryFilesChange={(files) => handleMonthMemoryFilesChange(data.month, files)}
                      mode={isReadOnly || approvalStatus.isApproved ? 'view' : 'edit'}
                      isAdminReviewMode={isReviewMode && role === 'admin'}
                      maxFiles={3}
                      kind="usage_evidence"
                      disabled={submitting || isReadOnly || approvalStatus.isApproved}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 底部空間，避免內容被固定底部欄遮擋 */}
        <div className="h-20"></div>
      </div>

      {/* 錯誤訊息模態框 */}
      {error && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
          <div className="bg-white rounded-lg shadow-lg max-w-md w-full" style={{ borderRadius: designTokens.borderRadius.lg }}>
            <div className="p-6">
              <div className="flex items-start space-x-3 mb-4">
                <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `${designTokens.colors.error}15` }}>
                  <AlertCircle className="h-5 w-5" style={{ color: designTokens.colors.error }} />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold mb-2" style={{ color: designTokens.colors.textPrimary }}>
                    發生錯誤
                  </h3>
                  <div className="text-sm space-y-1">
                    {error.split('\n').map((line, index) => (
                      <div key={index}>
                        {line.startsWith('請修正以下問題：') ? (
                          <div className="font-medium mb-2" style={{ color: designTokens.colors.error }}>
                            {line}
                          </div>
                        ) : line ? (
                          <div className="flex items-start space-x-2 py-1">
                            <div className="w-1.5 h-1.5 rounded-full mt-2 flex-shrink-0" style={{ backgroundColor: designTokens.colors.error }}></div>
                            <span style={{ color: designTokens.colors.textSecondary }}>{line}</span>
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
                  onMouseEnter={(e) => {
                    (e.target as HTMLButtonElement).style.backgroundColor = '#dc2626'
                  }}
                  onMouseLeave={(e) => {
                    (e.target as HTMLButtonElement).style.backgroundColor = designTokens.colors.error
                  }}
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
          <div className="bg-white rounded-lg shadow-lg max-w-md w-full" style={{ borderRadius: designTokens.borderRadius.lg }}>
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
                <div className="w-12 h-12 mx-auto rounded-full mb-4 flex items-center justify-center" style={{ backgroundColor: designTokens.colors.accentLight }}>
                  <CheckCircle className="h-6 w-6" style={{ color: designTokens.colors.accentPrimary }} />
                </div>
                <h3 className="text-lg font-medium mb-2" style={{ color: designTokens.colors.textPrimary }}>
                  提交成功！
                </h3>
                <p className="mb-4" style={{ color: designTokens.colors.textSecondary }}>
                  {success}
                </p>
                <div className="rounded-lg p-4 mb-4 text-left" style={{ backgroundColor: '#f8f9fa' }}>
                  <p className="text-sm mb-2 font-medium" style={{ color: designTokens.colors.textPrimary }}>
                    您的資料已成功儲存，您可以：
                  </p>
                  <ul className="text-sm space-y-1">
                    <li style={{ color: designTokens.colors.textSecondary }}>• 隨時回來查看或修改資料</li>
                    <li style={{ color: designTokens.colors.textSecondary }}>• 重新上傳新的證明文件</li>
                    <li style={{ color: designTokens.colors.textSecondary }}>• 更新月份使用量數據</li>
                  </ul>
                </div>
                <button
                  onClick={() => setShowSuccessModal(false)}
                  className="px-6 py-2 text-white rounded-lg transition-colors font-medium"
                  style={{ backgroundColor: designTokens.colors.accentPrimary }}
                  onMouseEnter={(e) => {
                    (e.target as HTMLButtonElement).style.backgroundColor = '#388e3c'
                  }}
                  onMouseLeave={(e) => {
                    (e.target as HTMLButtonElement).style.backgroundColor = designTokens.colors.accentPrimary
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
          <div className="bg-white rounded-lg shadow-lg max-w-md w-full" style={{ borderRadius: designTokens.borderRadius.lg }}>
            <div className="p-6">
              <div className="flex items-start space-x-3 mb-4">
                <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `${designTokens.colors.warning}15` }}>
                  <AlertCircle className="h-5 w-5" style={{ color: designTokens.colors.warning }} />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold mb-2" style={{ color: designTokens.colors.textPrimary }}>
                    確認清除
                  </h3>
                  <p className="text-sm" style={{ color: designTokens.colors.textSecondary }}>
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

      {/* 底部操作欄 - 唯讀模式和 approved 狀態下隱藏 */}
      {!isReadOnly && !approvalStatus.isApproved && !isReviewMode && (
        <BottomActionBar
          currentStatus={currentStatus}
          currentEntryId={currentEntryId}
          isUpdating={false}
          hasSubmittedBefore={hasSubmittedBefore}
          hasAnyData={hasAnyData}
          banner={banner}
          editPermissions={editPermissions}
          submitting={submitting}
          saving={submitting}
          onSubmit={handleSubmit}
          onSave={handleSave}
          onClear={() => setShowClearConfirmModal(true)}
          designTokens={designTokens}
        />
      )}

      {/* 審核區塊 - 只在審核模式顯示 */}
      {isReviewMode && currentEntryId && (
        <ReviewSection
          entryId={reviewEntryId || currentEntryId}
          userId={reviewUserId || "current_user"}
          category="乙炔"
          userName={reviewUserId || "用戶"}
          amount={monthlyData.reduce((sum, data) => sum + data.quantity, 0)}
          unit="支"
          role={role}
          onSave={handleSave}
          isSaving={submitting}
          onApprove={() => {
            console.log('✅ 乙炔填報審核通過 - 由 ReviewSection 處理')
          }}
          onReject={(reason) => {
            console.log('❌ 乙炔填報已退回 - 由 ReviewSection 處理:', reason)
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

export default AcetylenePage
