import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Upload, AlertCircle, CheckCircle, Loader2, X, Trash2, Eye } from 'lucide-react'
import ReviewSection from '../../components/ReviewSection'
import EvidenceUpload, { MemoryFile } from '../../components/EvidenceUpload'
import StatusSwitcher, { EntryStatus, canEdit, canUploadFiles, getButtonText } from '../../components/StatusSwitcher'
import Toast, { ToastType } from '../../components/Toast'
import BottomActionBar from '../../components/BottomActionBar'
import { useEditPermissions } from '../../hooks/useEditPermissions'
import { useFrontendStatus } from '../../hooks/useFrontendStatus'
import { useApprovalStatus } from '../../hooks/useApprovalStatus'
import { useEnergyData } from '../../hooks/useEnergyData'
import { useEnergySubmit } from '../../hooks/useEnergySubmit'
import { useEnergyClear } from '../../hooks/useEnergyClear'
import { useSubmitGuard } from '../../hooks/useSubmitGuard'
import { useGhostFileCleaner } from '../../hooks/useGhostFileCleaner'
import { useReloadWithFileSync } from '../../hooks/useReloadWithFileSync'
import { useSubmissions } from '../admin/hooks/useSubmissions'
import { useRole } from '../../hooks/useRole'
import { useAdminSave } from '../../hooks/useAdminSave'
import { listMSDSFiles, listUsageEvidenceFiles, commitEvidence, deleteEvidence, EvidenceFile, uploadEvidenceWithEntry } from '../../api/files'
import { upsertEnergyEntry, sumMonthly, UpsertEntryInput, updateEntryStatus, getEntryByPageKeyAndYear } from '../../api/entries'
import { designTokens } from '../../utils/designTokens'

interface MonthData {
  month: number
  quantity: number      // 使用數量 (支)
  files: EvidenceFile[]
}

const createInitialMonthlyData = (): MonthData[] => {
  return Array.from({ length: 12 }, (_, i) => ({
    month: i + 1,
    quantity: 0,
    files: []
  }))
}

const WeldingRodPage = () => {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  // 審核模式檢測
  const isReviewMode = searchParams.get('mode') === 'review'
  const reviewEntryId = searchParams.get('entryId')
  const reviewUserId = searchParams.get('userId')

  // 角色檢查
  const { role } = useRole()

  // 審核模式下只有管理員可編輯
  const isReadOnly = isReviewMode && role !== 'admin'

  // 管理員審核儲存 Hook
  const { save: adminSave, saving: adminSaving } = useAdminSave('welding_rod', reviewEntryId)

  const [loading, setLoading] = useState(true)
  const { executeSubmit, submitting } = useSubmitGuard()
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [hasSubmittedBefore, setHasSubmittedBefore] = useState(false)
  const [showSuccessModal, setShowSuccessModal] = useState(false)
  const [showClearConfirmModal, setShowClearConfirmModal] = useState(false)
  const [currentEntryId, setCurrentEntryId] = useState<string | null>(null)
  const [initialStatus, setInitialStatus] = useState<EntryStatus>('submitted')
  const [hasChanges, setHasChanges] = useState(false)
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null)
  
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

  const { currentStatus: frontendCurrentStatus, handleSubmitSuccess, handleDataChanged, isInitialLoad } = frontendStatus
  
  // 表單資料
  const [year] = useState(new Date().getFullYear())
  const [unitWeight, setUnitWeight] = useState<number>(0)     // 單位重量 (KG/支)
  const [carbonContent, setCarbonContent] = useState<number>(0) // 含碳率 (%)
  const [msdsFiles, setMsdsFiles] = useState<EvidenceFile[]>([])
  const [msdsMemoryFiles, setMsdsMemoryFiles] = useState<MemoryFile[]>([])
  const [monthlyData, setMonthlyData] = useState<MonthData[]>(createInitialMonthlyData())
  const [monthlyMemoryFiles, setMonthlyMemoryFiles] = useState<MemoryFile[][]>(
    Array.from({ length: 12 }, () => [])
  )

  const pageKey = 'welding_rod'
  
  // 編輯權限控制
  const editPermissions = useEditPermissions(frontendCurrentStatus || 'submitted', isReviewMode, role)

  const monthNames = [
    '1月', '2月', '3月', '4月', '5月', '6月',
    '7月', '8月', '9月', '10月', '11月', '12月'
  ]

  // 審核模式資料載入
  const entryIdToLoad = isReviewMode && reviewEntryId ? reviewEntryId : undefined

  // 使用 useEnergyData Hook 載入資料
  const {
    entry: loadedEntry,
    files: loadedFiles,
    loading: dataLoading,
    error: dataError,
    reload
  } = useEnergyData(pageKey, year, entryIdToLoad)

  // 審核狀態檢查 Hook
  const approvalStatus = useApprovalStatus(pageKey, year)

  // 審核 API hook
  const { reviewSubmission } = useSubmissions()

  // 幽靈檔案清理 Hook - 必須在使用它的 useEffect 之前宣告
  const { cleanFiles } = useGhostFileCleaner()

  // Reload 同步 Hook
  const { reloadAndSync } = useReloadWithFileSync(reload)

  // 同步 loading 狀態
  useEffect(() => {
    setLoading(dataLoading)
  }, [dataLoading])

  // 同步 error 狀態
  useEffect(() => {
    if (dataError) {
      setError(dataError)
    }
  }, [dataError])

  // 處理載入的 entry 資料
  useEffect(() => {
    if (loadedEntry?.payload) {
      // 新格式：從 extraPayload 讀取
      // 前端變數：unitWeight, carbonContent
      // 後端欄位：unitCapacity, carbonRate（提交時對應）
      if (loadedEntry.payload.unitCapacity !== undefined) {
        setUnitWeight(loadedEntry.payload.unitCapacity || 0)
        setCarbonContent(loadedEntry.payload.carbonRate || 0)
      } else if (loadedEntry.payload.unitWeight !== undefined) {
        // 向後相容：舊的 unitWeight/carbonContent 格式
        setUnitWeight(loadedEntry.payload.unitWeight || 0)
        setCarbonContent(loadedEntry.payload.carbonContent || 0)
      } else if (loadedEntry.payload.notes) {
        // 向後相容：從 notes 解析（最舊資料格式）
        const entryUnitWeight = loadedEntry.payload.notes?.match(/單位重量: ([\d.]+)/)?.[1]
        const entryCarbonContent = loadedEntry.payload.notes?.match(/含碳率: ([\d.]+)/)?.[1]
        if (entryUnitWeight) setUnitWeight(parseFloat(entryUnitWeight))
        if (entryCarbonContent) setCarbonContent(parseFloat(entryCarbonContent))
      }

      // 設定狀態
      const newStatus = loadedEntry.status as EntryStatus
      setCurrentEntryId(loadedEntry.id)
      setHasSubmittedBefore(loadedEntry.status !== 'draft')
      setInitialStatus(newStatus)
      frontendStatus.setFrontendStatus(newStatus)  // 同步前端狀態

      isInitialLoad.current = false
    } else if (loadedEntry === null && !dataLoading) {
      // 新記錄：重置狀態
      setHasSubmittedBefore(false)
      setCurrentEntryId(null)
      setInitialStatus('draft' as EntryStatus)
      frontendStatus.setFrontendStatus('draft' as EntryStatus)  // 同步前端狀態
      setUnitWeight(0)
      setCarbonContent(0)
      isInitialLoad.current = false
    }
  }, [loadedEntry, dataLoading])

  // 處理載入的檔案
  useEffect(() => {
    if (loadedFiles.length > 0) {
      // ✅ 先清理幽靈檔案，再分類
      const cleanAndAssignFiles = async () => {
        const validFiles = await cleanFiles(loadedFiles)
        console.log('✅ [WeldingRodPage] Valid files after cleanup:', validFiles.length)

        // 分類檔案：MSDS
        const msdsFilesFromLoad = validFiles.filter(f => f.file_type === 'msds')
        setMsdsFiles(msdsFilesFromLoad)

        // ✅ 使用函數式更新，確保獲取最新的 monthlyData
        setMonthlyData(currentMonthlyData => {
          // 深拷貝 monthlyData，避免引用問題
          const newMonthlyData = currentMonthlyData.map(data => ({
            ...data,
            files: [...data.files]  // 深拷貝 files
          }))

          // ✅ 累加檔案而非覆蓋
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

          // ✅ 從 payload 載入數量
          if (loadedEntry?.payload) {
            newMonthlyData.forEach(data => {
              const monthKey = data.month.toString()
              if (loadedEntry.payload.monthlyQuantity?.[monthKey]) {
                data.quantity = loadedEntry.payload.monthlyQuantity[monthKey]
              } else if (loadedEntry.payload.monthly?.[monthKey]) {
                const totalWeight = loadedEntry.payload.monthly[monthKey]
                data.quantity = unitWeight > 0 ? Math.round(totalWeight / unitWeight) : 0
              }
            })
          }

          return newMonthlyData
        })

        if (loadedEntry?.id) {
          handleDataChanged()
        }
      }

      cleanAndAssignFiles()
    } else if (!dataLoading && loadedEntry === null) {
      // 新記錄：清空檔案
      setMsdsFiles([])
      setMonthlyData(createInitialMonthlyData())
    }
  }, [loadedFiles, loadedEntry, dataLoading, cleanFiles])


  // 監聽表單變更
  useEffect(() => {
    if (!isInitialLoad.current && hasSubmittedBefore) {
      setHasChanges(true)
    }
  }, [unitWeight, carbonContent, monthlyData, msdsFiles, hasSubmittedBefore])

  const updateMonthData = (index: number, field: 'quantity', value: number) => {
    setMonthlyData(prev => {
      const newData = [...prev]
      const safeValue = isNaN(value) ? 0 : value

      newData[index] = {
        ...newData[index],
        [field]: safeValue
      }
      return newData
    })
  }

  const handleMonthFilesChange = (month: number, files: EvidenceFile[]) => {
    setMonthlyData(prev => prev.map(data => 
      data.month === month ? { ...data, files } : data
    ))
  }

  const handleMsdsFilesChange = (files: EvidenceFile[]) => {
    setMsdsFiles(files)
  }

  const handleMonthMemoryFilesChange = (month: number, memFiles: MemoryFile[]) => {
    setMonthlyMemoryFiles(prev => {
      const newFiles = [...prev]
      newFiles[month - 1] = memFiles
      return newFiles
    })
  }

  const getTotalWeight = () => {
    return monthlyData.reduce((sum, data) => sum + (data.quantity * unitWeight), 0)
  }

  const getTotalQuantity = () => {
    return monthlyData.reduce((sum, data) => sum + data.quantity, 0)
  }

  const validateData = () => {
    const errors: string[] = []

    // MSDS 檢查：已上傳檔案 OR 記憶體檔案
    const totalMsdsFiles = msdsFiles.length + msdsMemoryFiles.length
    if (totalMsdsFiles === 0) {
      errors.push('請上傳銲條檢驗報告')
    }

    if (unitWeight <= 0) {
      errors.push('請輸入單位重量')
    }

    if (carbonContent <= 0) {
      errors.push('請輸入含碳率')
    }

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


  // 使用 useEnergySubmit Hook
  const { submit, save, submitting: hookSubmitting, error: submitError, success: submitSuccess } = useEnergySubmit(pageKey, year)

  // 使用 useEnergyClear Hook
  const { clear, clearing } = useEnergyClear(currentEntryId, frontendCurrentStatus)

  // 提交處理函式
  const handleSubmit = async () => {
    const errors = validateData()
    if (errors.length > 0) {
      setError('請修正以下問題:\n' + errors.join('\n'))
      return
    }

    await executeSubmit(async () => {
      setError(null)
      setSuccess(null)

      // 準備每月數據 (以重量為單位)
      const monthly: Record<string, number> = {}
      const monthlyQuantity: Record<string, number> = {}
      monthlyData.forEach(data => {
        if (data.quantity > 0) {
          monthly[data.month.toString()] = data.quantity * unitWeight  // 即時計算總重量
          monthlyQuantity[data.month.toString()] = data.quantity
        }
      })

      // 分開 MSDS 檔案和月份檔案
      const monthlyFiles: MemoryFile[][] = monthlyMemoryFiles

      // 使用 Hook 提交（符合 Hook 的參數格式）
      await submit({
        formData: {
          unit: 'KG',
          monthly: monthly,
          monthlyQuantity: monthlyQuantity,
          unitCapacity: unitWeight,      // 將 unitWeight 對應到 unitCapacity
          carbonRate: carbonContent      // 將 carbonContent 對應到 carbonRate
        },
        msdsFiles: msdsMemoryFiles,
        monthlyFiles: monthlyFiles
      })


      // 提交成功後處理
      await handleSubmitSuccess()
      await reloadAndSync()  // 重新載入資料並等待同步完成

      // 清空 memory files
      setMsdsMemoryFiles([])
      setMonthlyData(prev => prev.map(data => ({ ...data, memoryFiles: [] })))

      setHasChanges(false)
      setHasSubmittedBefore(true)

      const totalWeight = sumMonthly(monthly)
      const totalQuantity = getTotalQuantity()
      setSuccess(`年度總使用量：${totalQuantity} 支 (${totalWeight.toFixed(2)} KG)`)
      setShowSuccessModal(true)
    }).catch(error => {
      console.error('焊條提交失敗:', error)
      setError(error instanceof Error ? error.message : '提交失敗')
    })
  }

  // 暫存處理函式（不驗證）
  const handleSave = async () => {
    await executeSubmit(async () => {
      setError(null)
      setSuccess(null)

      // 審核模式：使用 useAdminSave hook
      if (isReviewMode && reviewEntryId) {
        console.log('📝 管理員審核模式：使用 useAdminSave hook', reviewEntryId)

        // 準備檔案列表
        const filesToUpload: Array<{
          file: File
          metadata: {
            month?: number
            fileType: 'usage_evidence' | 'msds' | 'other'
          }
        }> = []

        // 收集 MSDS 檔案
        msdsMemoryFiles.forEach((mf) => {
          filesToUpload.push({
            file: mf.file,
            metadata: {
              fileType: 'msds' as const
            }
          })
        })

        // 收集每月使用量佐證檔案
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

        // 準備每月數據
        const monthly: Record<string, number> = {}
        const monthlyQuantity: Record<string, number> = {}
        monthlyData.forEach(data => {
          if (data.quantity > 0) {
            monthly[data.month.toString()] = data.quantity * unitWeight
            monthlyQuantity[data.month.toString()] = data.quantity
          }
        })

        await adminSave({
          updateData: {
            unit: 'KG',
            amount: getTotalWeight(),
            payload: {
              monthly,
              monthlyQuantity,
              unitCapacity: unitWeight,
              carbonRate: carbonContent
            }
          },
          files: filesToUpload
        })

        await reloadAndSync()
        approvalStatus.reload()

        // ✅ 額外等待，確保 useEffect 的異步操作完成
        // 100ms (reloadAndSync) + 150ms = 250ms 總延遲
        await new Promise(resolve => setTimeout(resolve, 150))

        // 清空記憶體檔案（在 reloadAndSync 之後，避免檔案暫時消失）
        setMsdsMemoryFiles([])
        setMonthlyMemoryFiles(Array.from({ length: 12 }, () => []))

        setToast({ message: '✅ 儲存成功！資料已更新', type: 'success' })
        return
      }

      // 非審核模式：原本的邏輯
      // 準備每月數據 (以重量為單位)
      const monthly: Record<string, number> = {}
      const monthlyQuantity: Record<string, number> = {}
      monthlyData.forEach(data => {
        if (data.quantity > 0) {
          monthly[data.month.toString()] = data.quantity * unitWeight
          monthlyQuantity[data.month.toString()] = data.quantity
        }
      })

      // 分開 MSDS 檔案和月份檔案
      const monthlyFiles: MemoryFile[][] = monthlyMemoryFiles

      // 使用 Hook 暫存
      const entry_id = await save({
        formData: {
          unit: 'KG',
          monthly: monthly,
          monthlyQuantity: monthlyQuantity,
          unitCapacity: unitWeight,
          carbonRate: carbonContent
        },
        msdsFiles: msdsMemoryFiles,
        monthlyFiles: monthlyFiles
      })

      // 設定 entry ID
      setCurrentEntryId(entry_id)
      await reloadAndSync()

      // 清空 memory files
      setMsdsMemoryFiles([])
      setMonthlyData(prev => prev.map(data => ({ ...data, memoryFiles: [] })))

      setToast({
        message: '暫存成功！資料已儲存',
        type: 'success'
      })
    }).catch(error => {
      console.error('❌ 暫存失敗:', error)
      setError(error instanceof Error ? error.message : '暫存失敗')
    })
  }

  const handleClear = async () => {
    try {
      // 收集所有要刪除的檔案
      const allFiles = [...msdsFiles]
      monthlyData.forEach(data => {
        allFiles.push(...data.files)
      })

      // 收集所有記憶體檔案
      const allMemoryFiles = [msdsMemoryFiles, ...monthlyMemoryFiles]

      // 使用 Hook 清除
      await clear({
        filesToDelete: allFiles,
        memoryFilesToClean: allMemoryFiles
      })

      // 清除前端狀態
      setUnitWeight(0)
      setCarbonContent(0)
      setMsdsFiles([])
      setMsdsMemoryFiles([])
      setMonthlyData(createInitialMonthlyData())
      setMonthlyMemoryFiles(Array.from({ length: 12 }, () => []))
      setHasChanges(false)
      setCurrentEntryId(null)
      setHasSubmittedBefore(false)

      // 關閉確認模態框
      setShowClearConfirmModal(false)

      setToast({
        message: '資料已清除',
        type: 'success'
      })
    } catch (error) {
      console.error('清除失敗:', error)
      setError(error instanceof Error ? error.message : '清除失敗')
    }
  }

  // Loading 狀態
  if (loading) {
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
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-green-50">
      <div className="max-w-4xl mx-auto px-6 py-8 space-y-6">

        {/* 審核狀態通知 */}
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
          <div className="bg-green-100 border-l-4 border-green-500 text-green-700 p-4 mb-6 rounded-r-lg">
            <div className="flex items-center">
              <div className="text-2xl mr-3">🎉</div>
              <div>
                <p className="font-bold text-lg">恭喜您已審核通過！</p>
                <p className="text-sm mt-1">此填報已完成審核，資料已鎖定無法修改。</p>
                {approvalStatus.reviewedAt && (
                  <p className="text-xs mt-2 opacity-75">
                    審核完成時間：{new Date(approvalStatus.reviewedAt).toLocaleString()}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {!isReviewMode && approvalStatus.isRejected && (
          <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-6 rounded-r-lg">
            <div className="flex items-center">
              <div className="text-2xl mr-3">⚠️</div>
              <div className="flex-1">
                <p className="font-bold text-lg">填報已被退回</p>
                <p className="text-sm mt-1 font-medium">退回原因：{approvalStatus.rejectionReason}</p>
                <p className="text-xs mt-2">請根據上述原因修正後重新提交。修正完成後，資料將重新進入審核流程。</p>
                {approvalStatus.reviewedAt && (
                  <p className="text-xs mt-2 opacity-75">
                    退回時間：{new Date(approvalStatus.reviewedAt).toLocaleString()}
                  </p>
                )}
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
            className="text-3xl font-semibold mb-3"
            style={{ color: designTokens.colors.textPrimary }}
          >
            焊條使用量填報
          </h1>
          <p
            className="text-base"
            style={{ color: designTokens.colors.textSecondary }}
          >
            {isReviewMode
              ? '管理員審核模式 - 檢視填報內容和相關檔案'
              : '請填寫焊條使用量及上傳相關檢驗報告'
            }
          </p>
        </div>

        {/* 重新提交提示 */}
        {hasSubmittedBefore && !showSuccessModal && (
          <div 
            className="rounded-lg p-4 border-l-4"
            style={{ 
              backgroundColor: '#f0f9ff',
              borderColor: designTokens.colors.accentBlue
            }}
          >
            <div className="flex items-start">
              <CheckCircle 
                className="h-5 w-5 mt-0.5 mr-3" 
                style={{ color: designTokens.colors.accentBlue }} 
              />
              <div>
                <h3 
                  className="text-sm font-medium mb-1" 
                  style={{ color: designTokens.colors.accentBlue }}
                >
                  資料已提交
                </h3>
                <p 
                  className="text-sm" 
                  style={{ color: designTokens.colors.textSecondary }}
                >
                  您可以繼續編輯資料，修改後請再次點擊「提交填報」以更新記錄。
                </p>
              </div>
            </div>
          </div>
        )}

        {/* 銲條檢驗報告與基本資料（已調整順序：先輸入欄位，後上傳） */}
        <div 
          className="rounded-lg border p-6"
          style={{ 
            backgroundColor: designTokens.colors.cardBg,
            borderColor: designTokens.colors.border,
            boxShadow: designTokens.shadows.sm
          }}
        >
          <h2 
            className="text-xl font-medium mb-6 text-center" 
            style={{ color: designTokens.colors.textPrimary }}
          >
            銲條檢驗報告與基本資料
          </h2>
          
          <div className="space-y-6">
            {/* 基本參數輸入（移到最上面） */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label 
                  className="block text-sm font-medium mb-2" 
                  style={{ color: designTokens.colors.textPrimary }}
                >
                  單位重量 (KG/支)
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={unitWeight || ''}
                  onChange={(e) => {
                    const inputValue = e.target.value.trim()
                    const numValue = inputValue === '' ? 0 : parseFloat(inputValue)
                    setUnitWeight(isNaN(numValue) ? 0 : numValue)
                  }}
                  disabled={isReadOnly || approvalStatus.isApproved || submitting || !editPermissions.canEdit}
                  className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:border-transparent transition-all ${
                    isReadOnly || approvalStatus.isApproved ? 'bg-gray-100 cursor-not-allowed' : ''
                  }`}
                  style={{
                    color: designTokens.colors.textPrimary,
                    borderColor: designTokens.colors.border,
                    borderRadius: designTokens.borderRadius.md
                  }}
                  onFocus={(e) => {
                    if (editPermissions.canEdit) {
                      (e.target as HTMLInputElement).style.borderColor = designTokens.colors.accentPrimary;
                      (e.target as HTMLInputElement).style.boxShadow = `0 0 0 3px ${designTokens.colors.accentPrimary}20`
                    }
                  }}
                  onBlur={(e) => {
                    (e.target as HTMLInputElement).style.borderColor = designTokens.colors.border;
                    (e.target as HTMLInputElement).style.boxShadow = 'none'
                  }}
                  placeholder="請輸入單位重量"
                />
              </div>
              
              <div>
                <label 
                  className="block text-sm font-medium mb-2" 
                  style={{ color: designTokens.colors.textPrimary }}
                >
                  含碳率(如無檢驗報告請填100)
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  value={carbonContent || ''}
                  onChange={(e) => {
                    const inputValue = e.target.value.trim()
                    const numValue = inputValue === '' ? 0 : parseFloat(inputValue)
                    setCarbonContent(isNaN(numValue) ? 0 : numValue)
                  }}
                  disabled={isReadOnly || approvalStatus.isApproved || submitting || !editPermissions.canEdit}
                  className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:border-transparent transition-all ${
                    isReadOnly || approvalStatus.isApproved ? 'bg-gray-100 cursor-not-allowed' : ''
                  }`}
                  style={{
                    color: designTokens.colors.textPrimary,
                    borderColor: designTokens.colors.border,
                    borderRadius: designTokens.borderRadius.md
                  }}
                  onFocus={(e) => {
                    if (editPermissions.canEdit) {
                      (e.target as HTMLInputElement).style.borderColor = designTokens.colors.accentPrimary;
                      (e.target as HTMLInputElement).style.boxShadow = `0 0 0 3px ${designTokens.colors.accentPrimary}20`
                    }
                  }}
                  onBlur={(e) => {
                    (e.target as HTMLInputElement).style.borderColor = designTokens.colors.border;
                    (e.target as HTMLInputElement).style.boxShadow = 'none'
                  }}
                  placeholder="請輸入含碳率"
                />
              </div>
            </div>

            {/* 銲條檢驗報告上傳（原本的 MSDS 上傳，移到下面並更名） */}
            <div>
              <label 
                className="block text-sm font-medium mb-3" 
                style={{ color: designTokens.colors.textPrimary }}
              >
                銲條單位重量佐證與檢驗報告上傳
              </label>
              <EvidenceUpload
                pageKey={pageKey}
                files={msdsFiles}
                onFilesChange={handleMsdsFilesChange}
                memoryFiles={msdsMemoryFiles}
                onMemoryFilesChange={setMsdsMemoryFiles}
                maxFiles={3}
                disabled={submitting || !editPermissions.canUploadFiles}
                kind="msds"  // 維持後端型別，僅前端顯示改名
                mode={isReadOnly || approvalStatus.isApproved ? "view" : "edit"}
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
            className="text-xl font-medium mb-6" 
            style={{ color: designTokens.colors.textPrimary }}
          >
            月份使用量數據
          </h2>

          {/* 使用量統計 */}
          <div 
            className="mb-6 p-4 rounded-lg"
            style={{ backgroundColor: designTokens.colors.accentLight }}
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex justify-between items-center">
                <span 
                  className="text-sm font-medium"
                  style={{ color: designTokens.colors.textPrimary }}
                >
                  年度總數量：
                </span>
                <span 
                  className="text-lg font-bold"
                  style={{ color: designTokens.colors.accentSecondary }}
                >
                  {getTotalQuantity()} 支
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span 
                  className="text-sm font-medium"
                  style={{ color: designTokens.colors.textPrimary }}
                >
                  年度總重量：
                </span>
                <span 
                  className="text-lg font-bold"
                  style={{ color: designTokens.colors.accentSecondary }}
                >
                  {getTotalWeight().toFixed(2)} KG
                </span>
              </div>
            </div>
          </div>
          
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
                  {data.quantity > 0 && (
                    <span
                      className="text-sm font-medium px-2 py-1 rounded"
                      style={{
                        color: designTokens.colors.accentSecondary,
                        backgroundColor: designTokens.colors.accentLight
                      }}
                    >
                      重量：{(data.quantity * unitWeight).toFixed(2)} KG
                    </span>
                  )}
                </div>

                <div className="space-y-4">
                  <div>
                    <label 
                      className="block text-sm font-medium mb-2" 
                      style={{ color: designTokens.colors.textPrimary }}
                    >
                      使用數量 (支)
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={data.quantity || ''}
                      onChange={(e) => {
                        const inputValue = e.target.value.trim()
                        const numValue = inputValue === '' ? 0 : parseInt(inputValue)
                        updateMonthData(index, 'quantity', isNaN(numValue) ? 0 : numValue)
                      }}
                      disabled={isReadOnly || approvalStatus.isApproved || submitting || !editPermissions.canEdit}
                      className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:border-transparent transition-all ${
                        isReadOnly || approvalStatus.isApproved ? 'bg-gray-100 cursor-not-allowed' : ''
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
                      className="block text-sm font-medium mb-2" 
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
                      onMemoryFilesChange={(memFiles) => handleMonthMemoryFilesChange(data.month, memFiles)}
                      maxFiles={3}
                      disabled={submitting || !editPermissions.canUploadFiles}
                      kind="usage_evidence"
                      mode={isReadOnly || approvalStatus.isApproved ? "view" : "edit"}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 審核區塊 - 只在審核模式顯示 */}
        {isReviewMode && (
          <ReviewSection
            entryId={reviewEntryId || currentEntryId || `welding_rod_${year}`}
            userId={reviewUserId || "current_user"}
            category="焊條"
            userName="填報用戶" // 可以從用戶資料獲取
            amount={getTotalQuantity()}
            unit="支"
            role={role}
            onSave={handleSave}
            isSaving={submitting}
            onApprove={() => {
              // ReviewSection 會處理 API 呼叫和導航
              // 這裡可以加入額外的本地狀態處理（如果需要）
            }}
            onReject={(reason) => {
              // ReviewSection 會處理 API 呼叫和導航
              // 這裡可以加入額外的本地狀態處理（如果需要）
            }}
          />
        )}

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
                    className="text-lg font-semibold mb-2"
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
                <button
                  onClick={() => setShowSuccessModal(false)}
                  className="px-6 py-2 text-white rounded-lg transition-colors font-medium"
                  style={{ backgroundColor: designTokens.colors.accentPrimary }}
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
                    className="text-lg font-semibold mb-2"
                    style={{ color: designTokens.colors.textPrimary }}
                  >
                    確認清除
                  </h3>
                  <p 
                    className="text-sm"
                    style={{ color: designTokens.colors.textSecondary }}
                  >
                    清除後，這一頁所有資料都會被移除，確定要繼續嗎？
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
                  onClick={handleClear}
                  disabled={clearing}
                  className="px-4 py-2 text-white rounded-lg transition-colors font-medium flex items-center justify-center"
                  style={{
                    backgroundColor: clearing ? '#9ca3af' : designTokens.colors.error,
                    opacity: clearing ? 0.7 : 1
                  }}
                  onMouseEnter={(e) => {
                    if (!clearing) {
                      (e.target as HTMLButtonElement).style.backgroundColor = '#dc2626';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!clearing) {
                      (e.target as HTMLButtonElement).style.backgroundColor = designTokens.colors.error;
                    }
                  }}
                >
                  {clearing ? (
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

      {/* 底部操作欄 - 審核模式下隱藏，審核通過時也隱藏 */}
      {!isReviewMode && !approvalStatus.isApproved && (
        <BottomActionBar
          currentStatus={frontendCurrentStatus || 'submitted'}
          currentEntryId={currentEntryId}
          isUpdating={false}
          editPermissions={editPermissions}
          submitting={submitting}
          saving={submitting}
          onSubmit={handleSubmit}
          onSave={handleSave}
          onClear={() => setShowClearConfirmModal(true)}
          designTokens={designTokens}
          hasSubmittedBefore={hasSubmittedBefore}
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

export default WeldingRodPage
