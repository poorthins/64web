import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Upload, AlertCircle, CheckCircle, Loader2, X, Trash2 } from 'lucide-react'
import EvidenceUpload from '../../components/EvidenceUpload'
import StatusSwitcher, { EntryStatus, canEdit, canUploadFiles, getButtonText } from '../../components/StatusSwitcher'
import StatusIndicator from '../../components/StatusIndicator'
import Toast, { ToastType } from '../../components/Toast'
import BottomActionBar from '../../components/BottomActionBar'
import { useEditPermissions } from '../../hooks/useEditPermissions'
import { useFrontendStatus } from '../../hooks/useFrontendStatus'
import { listMSDSFiles, listUsageEvidenceFiles, commitEvidence, deleteEvidence, getEntryFiles, updateFileEntryAssociation, debugDatabaseContent, EvidenceFile } from '../../api/files'
import { upsertEnergyEntry, sumMonthly, UpsertEntryInput, updateEntryStatus, getEntryByPageKeyAndYear } from '../../api/entries'
import { supabase } from '../../lib/supabaseClient'
import { designTokens } from '../../utils/designTokens'
import { debugRLSOperation, diagnoseAuthState } from '../../utils/authDiagnostics'
import { logDetailedAuthStatus } from '../../utils/authHelpers'
import EvidenceFileManager, { FileManagerData } from '../../components/common/EvidenceFileManager'


// 自定義 debounce 函式
function debounce<T extends (...args: any[]) => any>(func: T, wait: number): T {
  let timeout: NodeJS.Timeout | null = null
  return ((...args: any[]) => {
    if (timeout) clearTimeout(timeout)
    timeout = setTimeout(() => func(...args), wait)
  }) as T
}

interface MonthData {
  month: number
  quantity: number
  totalUsage: number
  files: EvidenceFile[]
}

const WD40Page = () => {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
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
      // 狀態變更時的回調處理
      console.log('Status changed to:', newStatus)
    },
    onError: (error) => setError(error),
    onSuccess: (message) => {
      // 使用 Toast 顯示狀態變更通知
      setToast({ message, type: 'success' })
      
      // 同時設置 success 用於傳統的成功訊息顯示
      setSuccess(message)
    }
  })

  const { currentStatus, handleDataChanged, handleSubmitSuccess, isInitialLoad } = frontendStatus
  
  // 表單資料
  const [year] = useState(new Date().getFullYear())
  const [unitCapacity, setUnitCapacity] = useState<number>(0)
  const [carbonRate, setCarbonRate] = useState<number>(0)
  const [msdsFiles, setMsdsFiles] = useState<EvidenceFile[]>([])
  const [monthlyData, setMonthlyData] = useState<MonthData[]>(
    Array.from({ length: 12 }, (_, i) => ({
      month: i + 1,
      quantity: 0,
      totalUsage: 0,
      files: []
    }))
  )
  const [fileManagerData, setFileManagerData] = useState<FileManagerData | null>(null)

  const pageKey = 'wd40'
  
  // 編輯權限控制
  const editPermissions = useEditPermissions(currentStatus || 'draft')
  
  // 判斷是否有資料
  const hasAnyData = useMemo(() => {
    const hasMonthlyData = monthlyData?.some(m => m.quantity > 0) || false
    const hasBasicData = unitCapacity > 0 || carbonRate > 0
    const hasFiles = (msdsFiles?.length || 0) > 0
    return hasMonthlyData || hasBasicData || hasFiles
  }, [monthlyData, unitCapacity, carbonRate, msdsFiles])
  
  // 允許所有狀態編輯
  const isReadOnly = false

  const monthNames = [
    '1月', '2月', '3月', '4月', '5月', '6月',
    '7月', '8月', '9月', '10月', '11月', '12月'
  ]

  // 組件清理 - 確保離開頁面時清除所有狀態
  useEffect(() => {
    return () => {
      // 重置所有表單狀態
      setUnitCapacity(0)
      setCarbonRate(0)
      setMsdsFiles([])
      setMonthlyData(Array.from({ length: 12 }, (_, i) => ({
        month: i + 1,
        quantity: 0,
        totalUsage: 0,
        files: []
      })))
      setError(null)
      setSuccess(null)
    }
  }, [])

  // 載入檔案和資料（支援完整編輯功能）
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true)
        setError(null)

        // 並行載入基本資料
        const [msdsFiles, existingEntry] = await Promise.all([
          listMSDSFiles(pageKey),
          getEntryByPageKeyAndYear(pageKey, year)
        ])

        console.log('🔍 [WD40] Loading entry:', {
          existingEntry: existingEntry ? {
            id: existingEntry.id,
            status: existingEntry.status,
            hasPayload: !!existingEntry.payload
          } : null,
          msdsFilesCount: msdsFiles?.length || 0
        })

        // 如果有已提交記錄
        if (existingEntry && existingEntry.status !== 'draft') {
          setHasSubmittedBefore(true)
          setCurrentEntryId(existingEntry.id)
          setInitialStatus(existingEntry.status as EntryStatus)

          // 載入表單資料
          if (existingEntry.payload?.monthly) {
            const entryMonthly = existingEntry.payload.monthly
            
            // 解析 notes 中的參數
            let loadedUnitCapacity = 0
            let loadedCarbonRate = 0
            
            if (existingEntry.payload.notes) {
              const unitCapacityMatch = existingEntry.payload.notes.match(/單位容量: ([\d.]+)/)
              const carbonRateMatch = existingEntry.payload.notes.match(/含碳率: ([\d.]+)/)
              
              if (unitCapacityMatch) {
                loadedUnitCapacity = parseFloat(unitCapacityMatch[1]) || 0
                setUnitCapacity(loadedUnitCapacity)
              }
              if (carbonRateMatch) {
                loadedCarbonRate = parseFloat(carbonRateMatch[1]) || 0
                setCarbonRate(loadedCarbonRate)
              }
            }
            
            // 恢復各月份的數量資料（使用正確的 unitCapacity 值）
            const restoredMonthlyData = monthlyData.map((data, index) => {
              const monthKey = (index + 1).toString()
              const monthUsage = entryMonthly[monthKey] || 0
              const calculatedQuantity = (monthUsage > 0 && loadedUnitCapacity > 0) ? monthUsage / loadedUnitCapacity : 0
              
              return {
                ...data,
                quantity: calculatedQuantity,
                totalUsage: monthUsage
              }
            })
            
            console.log('📝 [WD40] Entry details:', {
              entryId: existingEntry.id,
              payloadKeys: Object.keys(existingEntry.payload || {}),
              monthlyKeys: Object.keys(existingEntry.payload?.monthly || {})
            })

            // 診斷資料庫內容
            await debugDatabaseContent(existingEntry.id)

            // 載入已關聯的檔案
            try {
              const entryFiles = await getEntryFiles(existingEntry.id)
              console.log('📁 [WD40] Loaded entry files:', {
                totalCount: entryFiles.length,
                files: entryFiles.map(f => ({
                  id: f.id,
                  name: f.file_name,
                  path: f.file_path,
                  entry_id: f.entry_id
                }))
              })
              
              // 從檔案路徑分類檔案
              const msdsEntryFiles = entryFiles.filter(f => f.file_path.includes('/msds/'))
              const monthlyEntryFiles = entryFiles.filter(f => f.file_path.includes('/usage_evidence/'))
              
              console.log('📋 [WD40] File classification:', {
                msdsCount: msdsEntryFiles.length,
                monthlyCount: monthlyEntryFiles.length,
                msdsPaths: msdsEntryFiles.map(f => f.file_path),
                monthlyPaths: monthlyEntryFiles.map(f => f.file_path)
              })
              
              // 設置 MSDS 檔案
              const allMsdsFiles = [...msdsFiles, ...msdsEntryFiles]
              setMsdsFiles(allMsdsFiles)
              console.log('📋 [WD40] Total MSDS files after merge:', allMsdsFiles.length)
              
              // 分配月份檔案到對應月份
              const updatedMonthlyData = restoredMonthlyData.map((data, index) => {
                const month = index + 1
                const monthFiles = monthlyEntryFiles.filter(file => {
                  // 從檔案路徑提取月份：/usage_evidence/{month}/
                  const monthMatch = file.file_path.match(/\/usage_evidence\/(\d+)\//)
                  const extractedMonth = monthMatch ? parseInt(monthMatch[1]) : null
                  console.log(`📅 [WD40] File ${file.file_name} path analysis:`, {
                    path: file.file_path,
                    monthMatch: monthMatch?.[0],
                    extractedMonth,
                    targetMonth: month,
                    matches: extractedMonth === month
                  })
                  return extractedMonth === month
                })
                
                if (monthFiles.length > 0) {
                  console.log(`📅 [WD40] Month ${month} assigned ${monthFiles.length} files:`, 
                    monthFiles.map(f => f.file_name))
                }
                
                return {
                  ...data,
                  files: monthFiles
                }
              })
              
              console.log('📅 [WD40] Monthly file distribution:', 
                updatedMonthlyData.map((data, i) => `月${i+1}: ${data.files.length}個檔案`).join(', ')
              )
              setMonthlyData(updatedMonthlyData)
            } catch (fileError) {
              console.error('❌ [WD40] Failed to load entry files:', fileError)
              // 即使檔案載入失敗，也要設置恢復的月份資料
              setMonthlyData(restoredMonthlyData)
            }
          }
        } else {
          // 新記錄處理
          const initialMsdsFiles = msdsFiles || []
          setMsdsFiles(initialMsdsFiles)

          // 載入暫存檔案
          const monthlyFilesArray = await Promise.all(
            Array.from({ length: 12 }, (_, i) => 
              listUsageEvidenceFiles(pageKey, i + 1)
            )
          )

          const updatedMonthlyData = monthlyData.map((data, index) => ({
            ...data,
            files: monthlyFilesArray[index] || []
          }))
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

  // 計算總使用量
  useEffect(() => {
    setMonthlyData(prev => 
      prev.map(data => ({
        ...data,
        totalUsage: data.quantity * unitCapacity
      }))
    )
  }, [unitCapacity])

  // 草稿功能已完全移除

  // 離開頁面提醒
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      // 檢查是否有填寫資料但未提交
      const hasData = unitCapacity > 0 || carbonRate > 0 || 
                     monthlyData.some(d => d.quantity > 0) ||
                     msdsFiles.length > 0
      
      if (hasData && !hasSubmittedBefore) {
        e.preventDefault()
        e.returnValue = '您有資料尚未提交，離開將會遺失資料。是否確定離開？'
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [unitCapacity, carbonRate, monthlyData, msdsFiles, hasSubmittedBefore])

  const updateMonthData = (index: number, field: 'quantity', value: number) => {
    setMonthlyData(prev => {
      const newData = [...prev]
      // 確保 value 是有效的數字，處理 NaN 情況
      const safeValue = isNaN(value) ? 0 : value
      const safeUnitCapacity = isNaN(unitCapacity) ? 0 : unitCapacity
      
      newData[index] = { 
        ...newData[index], 
        [field]: safeValue,
        totalUsage: field === 'quantity' ? safeValue * safeUnitCapacity : newData[index].totalUsage
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

  const getTotalUsage = () => {
    return monthlyData.reduce((sum, data) => sum + data.totalUsage, 0)
  }

  const validateData = () => {
    const errors: string[] = []
    
    if (msdsFiles.length === 0) {
      errors.push('請上傳 MSDS 安全資料表')
    }

    if (unitCapacity <= 0) {
      errors.push('請輸入單位容量')
    }

    if (carbonRate <= 0) {
      errors.push('請輸入含碳率')
    }

    monthlyData.forEach((data, index) => {
      if (data.quantity > 0 && data.files.length === 0) {
        errors.push(`${monthNames[index]}有使用量但未上傳使用證明`)
      }
    })

    return errors
  }

  const handleSubmit = async () => {
    console.log('=== WD-40 提交除錯開始 ===')
    
    const errors = validateData()
    if (errors.length > 0) {
      setError('請修正以下問題：\n' + errors.join('\n'))
      return
    }

    setSubmitting(true)
    setError(null)
    setSuccess(null)

    try {
      // 步驟1：詳細認證狀態診斷
      console.log('🔍 執行詳細認證診斷...')
      await logDetailedAuthStatus()
      
      const authDiagnosis = await diagnoseAuthState()
      if (!authDiagnosis.isAuthenticated) {
        console.error('❌ 認證診斷失敗:', authDiagnosis)
        throw new Error(`認證失效: ${authDiagnosis.userError?.message || authDiagnosis.sessionError?.message || '未知原因'}`)
      }

      // 步驟2：檢查當前表單狀態
      console.log('📊 當前表單狀態:', {
        pageKey,
        year,
        unitCapacity,
        carbonRate,
        monthlyDataCount: monthlyData.length,
        hasData: monthlyData.some(d => d.quantity > 0)
      })

      // 步驟3：準備每月數據
      const monthly: Record<string, number> = {}
      monthlyData.forEach(data => {
        if (data.quantity > 0) {
          monthly[data.month.toString()] = data.totalUsage
        }
      })
      console.log('📋 處理後的每月數據:', monthly)

      // 步驟4：建立填報輸入資料
      const entryInput: UpsertEntryInput = {
        page_key: pageKey,
        period_year: year,
        unit: 'ML',
        monthly: monthly,
        notes: `單位容量: ${unitCapacity} ML/瓶, 含碳率: ${carbonRate}%`
      }
      console.log('📝 準備提交的 entryInput:', entryInput)

      // 步驟5：使用診斷包裝執行關鍵操作
      const { entry_id } = await debugRLSOperation(
        '新增或更新能源填報記錄',
        async () => await upsertEnergyEntry(entryInput, true)
      )
      console.log('✅ upsertEnergyEntry 完成，entry_id:', entry_id)

      // 步驟6：設置 entryId（如果是新建的記錄）
      if (!currentEntryId) {
        setCurrentEntryId(entry_id)
      }

      // 步驟7：使用改進的錯誤恢復機制關聯檔案
      const allFiles = [
        ...msdsFiles,
        ...monthlyData.flatMap(m => m.files)
      ]
      
      console.log('🔗 [WD40] All files before association:', {
        totalFiles: allFiles.length,
        msdsFilesCount: msdsFiles.length,
        monthlyFilesCount: monthlyData.flatMap(m => m.files).length,
        fileDetails: allFiles.map(f => ({
          id: f.id,
          name: f.file_name,
          entry_id: f.entry_id || 'NOT_ASSOCIATED',
          hasEntryId: !!f.entry_id
        }))
      })
      
      const unassociatedFiles = allFiles.filter(f => !f.entry_id)
      console.log('📎 [WD40] Unassociated files to link:', {
        count: unassociatedFiles.length,
        files: unassociatedFiles.map(f => ({
          id: f.id,
          name: f.file_name,
          path: f.file_path
        }))
      })
      
      if (unassociatedFiles.length > 0) {
        
        // 使用 Promise.allSettled 允許部分失敗
        const results = await Promise.allSettled(
          unassociatedFiles.map(file => 
            updateFileEntryAssociation(file.id, entry_id)
          )
        )
        
        // 統計結果
        const succeeded = results.filter(r => r.status === 'fulfilled').length
        const failed = results.filter(r => r.status === 'rejected').length
        
        console.log('✅ [WD40] Association results:', {
          totalAttempts: results.length,
          succeeded,
          failed,
          detailedResults: results.map((result, index) => ({
            fileId: unassociatedFiles[index].id,
            fileName: unassociatedFiles[index].file_name,
            status: result.status,
            error: result.status === 'rejected' ? result.reason : null
          }))
        })
        
        // 記錄失敗詳情並提供用戶反饋
        if (failed > 0) {
          const failures = results
            .map((r, i) => ({ result: r, file: unassociatedFiles[i] }))
            .filter(({ result }) => result.status === 'rejected')
            .map(({ file, result }) => ({
              fileName: file.file_name,
              error: (result as PromiseRejectedResult).reason
            }))
          
          console.error('檔案關聯失敗詳情:', failures)
          
          // 設置用戶可見的警告
          if (succeeded > 0) {
            setToast({ 
              message: `部分檔案關聯成功 (${succeeded}/${unassociatedFiles.length})，${failed} 個檔案關聯失敗`, 
              type: 'error' 
            })
          } else {
            setToast({ 
              message: `所有檔案關聯失敗，請檢查網路連線後重新提交`, 
              type: 'error' 
            })
          }
        } else {
          setToast({ 
            message: `所有檔案 (${succeeded} 個) 已成功關聯`, 
            type: 'success' 
          })
        }
        
        // 更新本地檔案狀態（標記成功關聯的）
        const successfulIndices = results
          .map((r, i) => ({ result: r, index: i }))
          .filter(({ result }) => result.status === 'fulfilled')
          .map(({ index }) => index)
        
        successfulIndices.forEach(index => {
          unassociatedFiles[index].entry_id = entry_id
        })
        
        // 更新本地狀態
        setMsdsFiles(prev => prev.map(f => {
          const updated = unassociatedFiles.find(uf => uf.id === f.id)
          return updated ? { ...f, entry_id: updated.entry_id } : f
        }))
        
        setMonthlyData(prev => prev.map(monthData => ({
          ...monthData,
          files: monthData.files.map(f => {
            const updated = unassociatedFiles.find(uf => uf.id === f.id)
            return updated ? { ...f, entry_id: updated.entry_id } : f
          })
        })))
      }

      // 步驟8：自動清理草稿資料（提交成功後）
      // 草稿清理功能已移除

      // 步驟9：處理狀態轉換 - 提交成功時自動更新狀態
      await handleSubmitSuccess()

      // 步驟10：計算並顯示成功訊息
      const totalUsage = sumMonthly(monthly)
      console.log('📊 計算總使用量:', totalUsage)
      
      setSuccess(`提交成功！年度總使用量：${totalUsage.toFixed(2)} ML`)
      
      setHasSubmittedBefore(true)
      setShowSuccessModal(true)
      
      console.log('=== ✅ WD-40 提交成功完成 ===')

    } catch (error) {
      console.error('=== ❌ WD-40 提交失敗 ===')
      console.error('錯誤類型:', error?.constructor?.name)
      console.error('錯誤訊息:', error instanceof Error ? error.message : String(error))
      console.error('完整錯誤物件:', error)
      
      // 失敗後的詳細認證診斷
      console.log('🔍 執行失敗後的認證診斷...')
      try {
        await logDetailedAuthStatus()
      } catch (diagError) {
        console.error('診斷過程中發生錯誤:', diagError)
      }
      
      // 檢查是否為 RLS 錯誤
      if (error instanceof Error && (
        error.message.toLowerCase().includes('rls') ||
        error.message.toLowerCase().includes('row level security') ||
        error.message.toLowerCase().includes('permission') ||
        error.message.toLowerCase().includes('policy')
      )) {
        console.error('🚨 檢測到 RLS 權限錯誤！')
        console.error('💡 可能原因分析:', {
          認證狀態: '檢查 auth.uid() 是否為 null',
          RLS政策: '檢查相關表格的 RLS 政策設定',
          時機問題: '可能在 token 過期瞬間執行操作',
          建議: '查看上方詳細診斷結果找出根本原因'
        })
      }
      
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

  const handleClearAll = () => {
    setUnitCapacity(0)
    setCarbonRate(0)
    handleMsdsFilesChange([])
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
    <div 
      className="min-h-screen bg-green-50"
    >
      {/* 主要內容區域 - 簡化結構，移除多層嵌套 */}
      <div className="max-w-4xl mx-auto px-6 py-8 space-y-6">
        
        {/* 頁面標題 - 無背景框 */}
        <div className="text-center mb-8">
          <h1 
            className="text-4xl font-semibold mb-3" 
            style={{ color: designTokens.colors.textPrimary }}
          >
            WD-40 使用數量填報
          </h1>
          <p 
            className="text-lg" 
            style={{ color: designTokens.colors.textSecondary }}
          >
            請上傳 MSDS 文件並填入各月份使用數據進行碳排放計算
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

        {/* MSDS 安全資料表與基本參數 */}
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
            MSDS 安全資料表與基本參數
          </h2>
          
          <div className="space-y-6">
            {/* MSDS 檔案上傳 */}
            <div>
              <label 
                className="block text-base font-medium mb-3" 
                style={{ color: designTokens.colors.textPrimary }}
              >
                MSDS 安全資料表
              </label>
              <EvidenceUpload
                pageKey={pageKey}
                files={msdsFiles}
                onFilesChange={setMsdsFiles}
                maxFiles={3}
                kind="msds"
                disabled={submitting}
              />
            </div>
            
            {/* 基本參數輸入 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label 
                  className="block text-base font-medium mb-2" 
                  style={{ color: designTokens.colors.textPrimary }}
                >
                  單位容量 (ML/瓶)
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.1"
                  value={unitCapacity || ''}
                  onChange={(e) => {
                    const inputValue = e.target.value.trim()
                    const numValue = inputValue === '' ? 0 : parseFloat(inputValue)
                    setUnitCapacity(isNaN(numValue) ? 0 : numValue)
                  }}
                  disabled={isReadOnly}
                  className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:border-transparent transition-all ${
                    isReadOnly ? 'bg-gray-100 cursor-not-allowed' : ''
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
                  placeholder="請輸入單位容量"
                />
              </div>
              
              <div>
                <label 
                  className="block text-base font-medium mb-2" 
                  style={{ color: designTokens.colors.textPrimary }}
                >
                  含碳率 (%)
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  value={carbonRate || ''}
                  onChange={(e) => {
                    const inputValue = e.target.value.trim()
                    const numValue = inputValue === '' ? 0 : parseFloat(inputValue)
                    setCarbonRate(isNaN(numValue) ? 0 : numValue)
                  }}
                  disabled={isReadOnly}
                  className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:border-transparent transition-all ${
                    isReadOnly ? 'bg-gray-100 cursor-not-allowed' : ''
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
                      總量：{data.totalUsage.toFixed(2)} ML
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

        {/* 檔案管理系統 (使用共用元件測試) */}
        <div
          className="rounded-lg border p-6"
          style={{
            backgroundColor: designTokens.colors.cardBg,
            borderColor: designTokens.colors.border,
            boxShadow: designTokens.shadows.sm
          }}
        >
          <div className="mb-6">
            <h2
              className="text-xl font-medium mb-2"
              style={{ color: designTokens.colors.textPrimary }}
            >
              🧪 檔案管理系統測試
            </h2>
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
              <p className="text-base text-amber-700">
                <strong>開發測試：</strong>這是新的共用檔案管理元件，用於測試和驗證檔案載入功能。
                它會自動載入已關聯的檔案並與現有檔案上傳功能共存。
              </p>
            </div>
          </div>

          <EvidenceFileManager
            pageKey={pageKey}
            entryId={currentEntryId}
            year={year}
            onFilesChange={setFileManagerData}
            currentStatus={currentStatus}
            supportedTypes={['msds', 'usage_evidence']}
            className="bg-gray-50 p-4 rounded-lg"
          />

          {/* 調試資訊 */}
          {fileManagerData && (
            <div className="mt-4 bg-gray-100 p-3 rounded text-xs">
              <strong>檔案統計：</strong>
              <div>MSDS 檔案: {fileManagerData.msds.length} 個</div>
              <div>月份檔案: {Object.values(fileManagerData.monthly).reduce((sum, files) => sum + files.length, 0)} 個</div>
              <div>分配情況: {Object.entries(fileManagerData.monthly)
                .filter(([_, files]) => files.length > 0)
                .map(([month, files]) => `${month}月:${files.length}個`)
                .join(', ') || '無'}</div>
            </div>
          )}
        </div>

        {/* 底部空間，避免內容被固定底部欄遮擋 */}
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
                  <div className="text-base space-y-1">
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
                  onMouseEnter={(e) => {
                    (e.target as HTMLButtonElement).style.backgroundColor = '#dc2626';
                  }}
                  onMouseLeave={(e) => {
                    (e.target as HTMLButtonElement).style.backgroundColor = designTokens.colors.error;
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
                      • 更新月份使用量數據
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
                  onClick={handleClearAll}
                  className="px-4 py-2 text-white rounded-lg transition-colors font-medium"
                  style={{ backgroundColor: designTokens.colors.error }}
                  onMouseEnter={(e) => {
                    (e.target as HTMLButtonElement).style.backgroundColor = '#dc2626';
                  }}
                  onMouseLeave={(e) => {
                    (e.target as HTMLButtonElement).style.backgroundColor = designTokens.colors.error;
                  }}
                >
                  確定清除
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

export default WD40Page
