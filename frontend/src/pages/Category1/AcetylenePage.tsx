import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Upload, AlertCircle, CheckCircle, Loader2, X, Trash2 } from 'lucide-react'
import EvidenceUpload from '../../components/EvidenceUpload'
import StatusSwitcher, { EntryStatus } from '../../components/StatusSwitcher'
import StatusIndicator from '../../components/StatusIndicator'
import Toast, { ToastType } from '../../components/Toast'
import BottomActionBar from '../../components/BottomActionBar'
import { useEditPermissions } from '../../hooks/useEditPermissions'
import { useFrontendStatus } from '../../hooks/useFrontendStatus'
import { upsertEnergyEntry, sumMonthly, UpsertEntryInput, getEntryByPageKeyAndYear, updateEntryStatus } from '../../api/entries'
import { listMSDSFiles, listUsageEvidenceFiles, commitEvidence, deleteEvidence, deleteEvidenceFile, getEntryFiles, updateFileEntryAssociation, debugDatabaseContent, EvidenceFile, uploadEvidenceWithEntry } from '../../api/files'
import { MemoryFile } from '../../components/EvidenceUpload'
import { designTokens } from '../../utils/designTokens'


interface MonthData {
  month: number
  quantity: number
  totalUsage: number
  files: EvidenceFile[]
}

const AcetylenePage = () => {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [clearLoading, setClearLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [hasSubmittedBefore, setHasSubmittedBefore] = useState(false)
  const [showSuccessModal, setShowSuccessModal] = useState(false)
  const [showClearConfirmModal, setShowClearConfirmModal] = useState(false)
  const [currentEntryId, setCurrentEntryId] = useState<string | null>(null)
  const [initialStatus, setInitialStatus] = useState<EntryStatus>('submitted')
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

  const { currentStatus, handleDataChanged, handleSubmitSuccess, isInitialLoad } = frontendStatus
  
  // 表單資料
  const [year] = useState(new Date().getFullYear())
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

  const pageKey = 'acetylene'
  
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
  
  // 允許所有狀態編輯
  const isReadOnly = false

  const monthNames = [
    '1月', '2月', '3月', '4月', '5月', '6月',
    '7月', '8月', '9月', '10月', '11月', '12月'
  ]

  // 載入檔案和資料（支援完整編輯功能）
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true)
        setError(null)

        // 載入基本資料
        const existingEntry = await getEntryByPageKeyAndYear(pageKey, year)

        console.log('🚀 [AcetylenePage] Starting file loading process:', {
          pageKey,
          year,
          hasExistingEntry: !!existingEntry
        })

        // 如果有現有記錄，載入資料
        if (existingEntry) {
          console.log('✅ [Acetylene] Loading existing entry:', {
            id: existingEntry.id,
            status: existingEntry.status,
            hasPayload: !!existingEntry.payload,
            monthlyKeys: Object.keys(existingEntry.payload?.monthly || {})
          })

          // 只有非草稿狀態才算真正提交過
          setHasSubmittedBefore(existingEntry.status !== 'draft')
          setCurrentEntryId(existingEntry.id)
          setInitialStatus(existingEntry.status as EntryStatus)

          // 載入表單資料
          if (existingEntry.payload?.monthly) {
            const entryMonthly = existingEntry.payload.monthly

            // 載入單位重量（新結構優先，舊結構備用）
            let loadedUnitWeight = 0

            console.log('📝 [Acetylene] Loading parameters from payload:', {
              hasNewStructure: !!existingEntry.payload.unitWeight,
              unitWeight: existingEntry.payload.unitWeight,
              hasNotes: !!existingEntry.payload.notes
            })

            // 優先使用新結構的資料
            if (existingEntry.payload.unitWeight) {
              loadedUnitWeight = existingEntry.payload.unitWeight
              console.log('✅ [Acetylene] Using new structure data:', { loadedUnitWeight })
            }
            // 回退到舊結構（從 notes 解析）
            else if (existingEntry.payload.notes) {
              console.log('⚠️ [Acetylene] Falling back to parsing notes for legacy data')
              const unitWeightMatch = existingEntry.payload.notes.match(/單位重量: ([\d.]+)/)

              if (unitWeightMatch) {
                loadedUnitWeight = parseFloat(unitWeightMatch[1]) || 0
              }
              console.log('📊 [Acetylene] Parsed from notes:', { loadedUnitWeight })
            }

            setUnitWeight(loadedUnitWeight)

            // 恢復各月份的數量資料（新結構優先）
            const restoredMonthlyData = monthlyData.map((data, index) => {
              const monthKey = (index + 1).toString()
              const monthUsage = entryMonthly[monthKey] || 0

              let quantity = 0

              // 優先使用新結構的瓶數資料
              if (existingEntry.payload.monthlyQuantity && existingEntry.payload.monthlyQuantity[monthKey]) {
                quantity = existingEntry.payload.monthlyQuantity[monthKey]
                console.log(`📅 [Acetylene] Month ${monthKey}: Using stored quantity ${quantity}`)
              }
              // 回退到計算瓶數（舊邏輯）
              else if (monthUsage > 0 && loadedUnitWeight > 0) {
                quantity = monthUsage / loadedUnitWeight
                console.log(`📅 [Acetylene] Month ${monthKey}: Calculated quantity ${quantity} from usage ${monthUsage} / unitWeight ${loadedUnitWeight}`)
              }

              return {
                ...data,
                quantity,
                totalUsage: monthUsage
              }
            })

            console.log('📝 [Acetylene] Entry details:', {
              entryId: existingEntry.id,
              payloadKeys: Object.keys(existingEntry.payload || {}),
              monthlyKeys: Object.keys(existingEntry.payload?.monthly || {})
            })

            // 診斷資料庫內容
            await debugDatabaseContent()

            // 載入檔案：使用 file_type 進行精確查詢
            try {
              console.log('📁 [AcetylenePage] Loading files with file_type queries')

              // 並行載入單位重量和所有月份檔案
              const [unitWeightFilesFromAPI, ...monthlyFilesArrays] = await Promise.all([
                listMSDSFiles(pageKey),  // 使用 MSDS 查詢作為單位重量檔案
                ...Array.from({ length: 12 }, (_, i) =>
                  listUsageEvidenceFiles(pageKey, i + 1)
                )
              ])

              console.log('📁 [AcetylenePage] File loading results:', {
                unitWeightCount: unitWeightFilesFromAPI.length,
                monthlyTotals: monthlyFilesArrays.map((files, i) =>
                  `月${i+1}: ${files.length}個檔案`
                ).join(', ')
              })

              // 設置單位重量檔案
              setUnitWeightFiles(unitWeightFilesFromAPI)

              // 分配月份檔案
              const updatedMonthlyData = restoredMonthlyData.map((data, index) => {
                const monthFiles = monthlyFilesArrays[index] || []

                return {
                  ...data,
                  files: monthFiles
                }
              })

              console.log('📅 [AcetylenePage] Final monthly data summary:',
                updatedMonthlyData.map((data, i) =>
                  `月${i+1}: ${data.files.length}個檔案`
                ).join(', ')
              )

              setMonthlyData(updatedMonthlyData)
            } catch (fileError) {
              console.error('❌ [AcetylenePage] Failed to load files:', fileError)
              // 即使檔案載入失敗，也要設置恢復的月份資料
              setMonthlyData(restoredMonthlyData)
            }
          }
        } else {
          // 新記錄處理：使用相同的 file_type 查詢
          console.log('📝 [AcetylenePage] No existing entry found, loading temporary files')
          setHasSubmittedBefore(false)
          setCurrentEntryId(null)
          setInitialStatus('draft' as EntryStatus)

          // 並行載入檔案
          const [unitWeightFilesFromAPI, ...monthlyFilesArrays] = await Promise.all([
            listMSDSFiles(pageKey),
            ...Array.from({ length: 12 }, (_, i) =>
              listUsageEvidenceFiles(pageKey, i + 1)
            )
          ])

          setUnitWeightFiles(unitWeightFilesFromAPI)

          const updatedMonthlyData = monthlyData.map((data, index) => {
            const monthFiles = monthlyFilesArrays[index] || []

            return {
              ...data,
              files: monthFiles
            }
          })
          setMonthlyData(updatedMonthlyData)
        }

        isInitialLoad.current = false
      } catch (error) {
        console.error('載入資料失敗:', error)
        setError(error instanceof Error ? error.message : '載入失敗')
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [])


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
    console.log('=== Acetylene 提交除錯開始 ===')

    const errors = validateData()
    if (errors.length > 0) {
      setError('請修正以下問題：\n' + errors.join('\n'))
      return
    }

    setSubmitting(true)
    setError(null)
    setSuccess(null)

    try {
      // 步驟1：準備每月數據
      const monthly: Record<string, number> = {}
      const monthlyQuantity: Record<string, number> = {}
      monthlyData.forEach(data => {
        if (data.quantity > 0) {
          monthly[data.month.toString()] = data.totalUsage
          monthlyQuantity[data.month.toString()] = data.quantity
        }
      })
      console.log('📋 處理後的每月數據:', { monthly, monthlyQuantity })

      // 步驟2：建立填報輸入資料（使用新的 payload 結構）
      const entryInput: UpsertEntryInput = {
        page_key: pageKey,
        period_year: year,
        unit: 'kg',
        monthly: monthly,
        extraPayload: {
          unitWeight,
          monthly,
          monthlyQuantity,
          notes: '' // 純備註，目前為空
        }
      }
      console.log('📝 準備提交的 entryInput:', entryInput)

      // 步驟3：新增或更新能源填報記錄
      const { entry_id } = await upsertEnergyEntry(entryInput, true)
      console.log('✅ upsertEnergyEntry 完成，entryId:', entry_id)

      // 步驟4：設置 entryId（如果是新建的記錄）
      if (!currentEntryId) {
        setCurrentEntryId(entry_id)
      }

      // 步驟5：批次上傳記憶體檔案
      console.log('📁 [AcetylenePage] Uploading memory files...', {
        unitWeightMemoryFiles: unitWeightMemoryFiles.length,
        monthlyMemoryFiles: monthlyMemoryFiles.map((files, i) => ({ month: i + 1, count: files.length }))
      })

      // 上傳單位重量記憶體檔案
      if (unitWeightMemoryFiles.length > 0) {
        console.log(`📁 [AcetylenePage] Uploading ${unitWeightMemoryFiles.length} unit weight memory files...`)
        for (const memoryFile of unitWeightMemoryFiles) {
          try {
            await uploadEvidenceWithEntry(memoryFile.file, {
              pageKey: pageKey,
              year: year,
              category: 'msds',
              entryId: entry_id
            })
            console.log(`✅ [AcetylenePage] Uploaded unit weight memory file: ${memoryFile.file_name}`)
          } catch (error) {
            console.error(`❌ [AcetylenePage] Failed to upload unit weight memory file ${memoryFile.file_name}:`, error)
            throw new Error(`上傳單位重量檔案 "${memoryFile.file_name}" 失敗`)
          }
        }
      }

      // 上傳月份記憶體檔案
      for (let month = 1; month <= 12; month++) {
        const monthFiles = monthlyMemoryFiles[month - 1] || []
        if (monthFiles.length > 0) {
          console.log(`📁 [AcetylenePage] Uploading ${monthFiles.length} memory files for month ${month}...`)
          for (const memoryFile of monthFiles) {
            try {
              await uploadEvidenceWithEntry(memoryFile.file, {
                pageKey: pageKey,
                year: year,
                category: 'usage_evidence',
                month: month,
                entryId: entry_id
              })
              console.log(`✅ [AcetylenePage] Uploaded month ${month} memory file: ${memoryFile.file_name}`)
            } catch (error) {
              console.error(`❌ [AcetylenePage] Failed to upload month ${month} memory file ${memoryFile.file_name}:`, error)
              throw new Error(`上傳 ${month}月檔案 "${memoryFile.file_name}" 失敗`)
            }
          }
        }
      }

      // 步驟6：關聯檔案
      const allFiles = [
        ...unitWeightFiles,
        ...monthlyData.flatMap(m => m.files)
      ]

      console.log('🔗 [Acetylene] All files before association:', {
        totalFiles: allFiles.length,
        unitWeightFilesCount: unitWeightFiles.length,
        monthlyFilesCount: monthlyData.flatMap(m => m.files).length
      })

      // 提交所有檔案
      await commitEvidence({
        entryId: entry_id,
        pageKey: pageKey
      })

      // 步驟7：處理狀態轉換 - 提交成功時自動更新狀態
      await handleSubmitSuccess()

      // 步驟8：計算並顯示成功訊息
      const totalUsage = sumMonthly(monthly)
      console.log('📆 計算總使用量:', totalUsage)

      setSuccess(`提交成功！年度總使用量：${totalUsage.toFixed(2)} kg`)

      setHasSubmittedBefore(true)
      setShowSuccessModal(true)

      console.log('=== ✅ Acetylene 提交成功完成 ===')

    } catch (error) {
      console.error('=== ❌ Acetylene 提交失敗 ===')
      console.error('錯誤類型:', error?.constructor?.name)
      console.error('錯誤訊息:', error instanceof Error ? error.message : String(error))
      console.error('完整錯誤物件:', error)

      console.log('=== 🔍 除錯結束 ===')
      setError(error instanceof Error ? error.message : '提交失敗')
    } finally {
      setSubmitting(false)
    }
  }

  const handleStatusChange = async (newStatus: EntryStatus) => {
    // 手動狀態變更（會更新資料庫）
    try {
      if (currentEntryId) {
        await updateEntryStatus(currentEntryId, newStatus)
      }
      frontendStatus.setFrontendStatus(newStatus)
    } catch (error) {
      setError(error instanceof Error ? error.message : '狀態更新失敗')
    }
  }

  const handleClearAll = async () => {
    console.log('🗑️ [AcetylenePage] ===== CLEAR BUTTON CLICKED =====')

    // 立即設置載入狀態
    setClearLoading(true)

    try {
      console.log('🗑️ [AcetylenePage] Starting complete clear operation...')
      // 1. 刪除後端檔案
      const deletionErrors: string[] = []

      // 刪除單位重量佐證檔案
      if (unitWeightFiles.length > 0) {
        console.log(`🗑️ [AcetylenePage] Deleting ${unitWeightFiles.length} unit weight files from backend...`)
        for (const file of unitWeightFiles) {
          try {
            await deleteEvidenceFile(file.id)
            console.log(`✅ [AcetylenePage] Deleted unit weight file: ${file.file_name}`)
          } catch (error) {
            const errorMsg = `刪除單位重量檔案 "${file.file_name}" 失敗`
            console.error(`❌ [AcetylenePage] ${errorMsg}:`, error)
            deletionErrors.push(errorMsg)
          }
        }
      }

      // 刪除月份用量佐證檔案
      for (const monthData of monthlyData) {
        if (monthData.files.length > 0) {
          console.log(`🗑️ [AcetylenePage] Deleting ${monthData.files.length} files for month ${monthData.month}...`)
          for (const file of monthData.files) {
            try {
              await deleteEvidenceFile(file.id)
              console.log(`✅ [AcetylenePage] Deleted monthly file: ${file.file_name} (month ${monthData.month})`)
            } catch (error) {
              const errorMsg = `刪除 ${monthData.month}月檔案 "${file.file_name}" 失敗`
              console.error(`❌ [AcetylenePage] ${errorMsg}:`, error)
              deletionErrors.push(errorMsg)
            }
          }
        }
      }

      // 2. 清除前端狀態
      console.log('🧹 [AcetylenePage] Clearing frontend states...')
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

      setHasSubmittedBefore(false)
      setError(null)
      setSuccess(null)
      setShowClearConfirmModal(false)

      // 3. 顯示結果訊息
      if (deletionErrors.length > 0) {
        const errorMessage = `清除完成，但有 ${deletionErrors.length} 個檔案刪除失敗：\n${deletionErrors.join('\n')}`
        console.warn('⚠️ [AcetylenePage] Clear completed with errors:', errorMessage)
        setError(errorMessage)
      } else {
        const totalDeleted = unitWeightFiles.length + monthlyData.reduce((sum, month) => sum + month.files.length, 0)
        const successMessage = totalDeleted > 0 ?
          `已成功清除所有資料並刪除 ${totalDeleted} 個檔案` :
          '已成功清除所有資料'
        console.log('✅ [AcetylenePage] Clear completed successfully:', successMessage)
        setSuccess(successMessage)
      }

    } catch (error) {
      console.error('❌ [AcetylenePage] Clear operation failed:', error)
      setError('清除操作失敗，請重試')
      setShowClearConfirmModal(false)
    } finally {
      console.log('🗑️ [AcetylenePage] Clear operation finished, resetting loading state')
      setClearLoading(false)
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
          <h1 className="text-3xl font-semibold mb-3" style={{ color: designTokens.colors.textPrimary }}>
            乙炔使用數量填報
          </h1>
          <p className="text-base" style={{ color: designTokens.colors.textSecondary }}>
            請填入各月份乙炔使用數據進行碳排放計算
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
                  className="text-base font-medium mb-1"
                  style={{ color: designTokens.colors.accentBlue }}
                >
                  資料已提交
                </h3>
                <p
                  className="text-base"
                  style={{ color: designTokens.colors.textSecondary }}
                >
                  您可以繼續編輯資料，修改後請再次點擊「提交填報」以更新記錄。
                </p>
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
                disabled={loading}
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
                mode="edit"
                maxFiles={3}
                kind="msds"
                disabled={loading}
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
                      mode="edit"
                      maxFiles={3}
                      kind="usage_evidence"
                      disabled={submitting}
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

      {/* 底部操作欄 */}
      <BottomActionBar
        currentStatus={currentStatus}
        currentEntryId={currentEntryId}
        isUpdating={false}
        hasSubmittedBefore={hasSubmittedBefore}
        hasAnyData={hasAnyData}
        editPermissions={editPermissions}
        submitting={submitting}
        onSubmit={handleSubmit}
        onClear={() => setShowClearConfirmModal(true)}
        designTokens={designTokens}
      />

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
