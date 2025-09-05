import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Upload, AlertCircle, CheckCircle, Loader2, FileText, Calculator, Database } from 'lucide-react'
import EvidenceUpload from '../../components/EvidenceUpload'
import { loadDraftWithFallback, saveDraftWithBackup, cleanupAfterSubmission, DraftPayload } from '../../api/drafts'
import { listEvidence, commitEvidence, deleteEvidence, EvidenceFile } from '../../api/files'
import { upsertEnergyEntry, sumMonthly, UpsertEntryInput } from '../../api/entries'
import { runAllDatabaseTests, DatabaseTestResults } from '../../utils/databaseTest'
// 導入測試工具（僅開發環境）
if (import.meta.env.DEV) {
  import('../../utils/testDatabaseConnection')
}

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
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [hasSubmittedBefore, setHasSubmittedBefore] = useState(false)
  const [showSuccessModal, setShowSuccessModal] = useState(false)
  const [showClearConfirmModal, setShowClearConfirmModal] = useState(false)
  
  // 資料庫測試狀態 (僅開發環境)
  const [dbTestResults, setDbTestResults] = useState<DatabaseTestResults | null>(null)
  const [dbTesting, setDbTesting] = useState(false)
  const [showDbTest, setShowDbTest] = useState(false)
  
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

  const pageKey = 'wd40'
  const isInitialLoad = useRef(true)

  const monthNames = [
    '1月', '2月', '3月', '4月', '5月', '6月',
    '7月', '8月', '9月', '10月', '11月', '12月'
  ]

  // 載入草稿和檔案
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true)
        setError(null)

        // 載入草稿
        const draft = await loadDraftWithFallback(pageKey)
        if (draft) {
          if (draft.unitCapacity) setUnitCapacity(draft.unitCapacity)
          if (draft.carbonRate) setCarbonRate(draft.carbonRate)
          if (draft.monthly) {
            setMonthlyData(prev => prev.map(data => ({
              ...data,
              quantity: draft.monthly?.[data.month.toString()] || 0,
              totalUsage: (draft.monthly?.[data.month.toString()] || 0) * (draft.unitCapacity || 0)
            })))
          }
        }

        // 載入所有檔案（不再區分月份和MSDS）
        const allFiles = await listEvidence(pageKey)
        setMsdsFiles(allFiles)

        // 清空月份檔案（不再使用月份區分）
        setMonthlyData(prev => prev.map(data => ({
          ...data,
          files: []
        })))

        isInitialLoad.current = false
      } catch (error) {
        console.error('Error loading data:', error)
        setError(error instanceof Error ? error.message : '載入資料失敗')
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

  // 建立草稿 payload
  const createDraftPayload = useCallback((): DraftPayload => {
    const monthly: { [key: string]: number } = {}
    monthlyData.forEach(data => {
      monthly[data.month.toString()] = data.quantity
    })

    return {
      year,
      unitCapacity,
      carbonRate,
      monthly
    }
  }, [year, unitCapacity, carbonRate, monthlyData])

  // 自動保存草稿（debounced）
  const debouncedSaveDraft = useCallback(
    debounce(async (payload: DraftPayload) => {
      if (isInitialLoad.current) return
      
      try {
        await saveDraftWithBackup(pageKey, payload)
        setHasUnsavedChanges(false)
      } catch (error) {
        console.warn('Auto-save failed:', error)
      }
    }, 2000),
    []
  )

  // 監聽表單變更
  useEffect(() => {
    if (!isInitialLoad.current) {
      setHasUnsavedChanges(true)
      const payload = createDraftPayload()
      debouncedSaveDraft(payload)
    }
  }, [unitCapacity, carbonRate, monthlyData, createDraftPayload, debouncedSaveDraft])

  // 離開頁面提醒
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault()
        e.returnValue = '你有尚未提交的變更，是否離開？'
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [hasUnsavedChanges])

  const updateMonthData = (index: number, field: 'quantity', value: number) => {
    setMonthlyData(prev => {
      const newData = [...prev]
      newData[index] = { 
        ...newData[index], 
        [field]: value,
        totalUsage: field === 'quantity' ? value * unitCapacity : newData[index].totalUsage
      }
      return newData
    })
  }

  const handleMonthFilesChange = (month: number, files: EvidenceFile[]) => {
    setMonthlyData(prev => prev.map(data => 
      data.month === month ? { ...data, files } : data
    ))
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
    const errors = validateData()
    if (errors.length > 0) {
      setError('請修正以下問題：\n' + errors.join('\n'))
      return
    }

    setSubmitting(true)
    setError(null)
    setSuccess(null)

    try {
      // 1. 準備每月數據
      const monthly: Record<string, number> = {}
      monthlyData.forEach(data => {
        if (data.quantity > 0) {
          monthly[data.month.toString()] = data.totalUsage
        }
      })

      // 2. 建立填報輸入資料
      const entryInput: UpsertEntryInput = {
        page_key: pageKey,
        period_year: year,
        unit: 'ML',
        monthly: monthly,
        notes: `單位容量: ${unitCapacity} ML/瓶, 含碳率: ${carbonRate}%`
      }

      // 3. 新增或更新 energy_entries
      const { entry_id } = await upsertEnergyEntry(entryInput)

      // 4. 提交所有檔案
      await commitEvidence({
        entryId: entry_id,
        pageKey: pageKey
      })

      // 5. 自動清理草稿資料（提交成功後）
      await cleanupAfterSubmission(pageKey)

      // 6. 計算並顯示成功訊息
      const totalUsage = sumMonthly(monthly)
      setSuccess(`年度總使用量：${totalUsage.toFixed(2)} ML`)
      setHasUnsavedChanges(false)
      setHasSubmittedBefore(true)
      setShowSuccessModal(true)

      // 移除自動關閉，讓用戶手動確認

    } catch (error) {
      console.error('Submit error:', error)
      setError(error instanceof Error ? error.message : '提交失敗')
    } finally {
      setSubmitting(false)
    }
  }

  const handleReupload = () => {
    // 重新載入頁面以獲取最新狀態
    window.location.reload()
  }

  const handleClearAll = () => {
    // 清除所有表單資料
    setUnitCapacity(0)
    setCarbonRate(0)
    setMsdsFiles([])
    setMonthlyData(Array.from({ length: 12 }, (_, i) => ({
      month: i + 1,
      quantity: 0,
      totalUsage: 0,
      files: []
    })))
    
    // 清除狀態
    setHasUnsavedChanges(false)
    setHasSubmittedBefore(false)
    setError(null)
    setSuccess(null)
    
    // 可選：清除草稿數據
    try {
      // 這裡可以調用 API 來清除草稿，如果需要的話
      // clearDraft(pageKey)
    } catch (error) {
      console.warn('Failed to clear draft:', error)
    }
  }

  // 資料庫連接測試函數 (僅開發環境)
  const handleRunDatabaseTests = async () => {
    if (!import.meta.env.DEV) return
    
    setDbTesting(true)
    setDbTestResults(null)
    
    try {
      console.log('🚀 Starting database connection tests...')
      const results = await runAllDatabaseTests()
      setDbTestResults(results)
      
      if (results.overall) {
        console.log('✅ All database tests passed!')
      } else {
        console.log('⚠️ Some database tests failed')
      }
    } catch (error) {
      console.error('❌ Database test suite failed:', error)
      setDbTestResults({
        overall: false,
        tests: [{
          name: '測試執行',
          success: false,
          message: `測試執行失敗: ${error instanceof Error ? error.message : '未知錯誤'}`,
          error: error instanceof Error ? error.message : '未知錯誤'
        }],
        timestamp: new Date().toLocaleString()
      })
    } finally {
      setDbTesting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#F5F5F5' }}>
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4" style={{ color: '#4CAF50' }} />
          <p style={{ color: '#212121' }}>載入中...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#F5F5F5' }}>
      {/* 主要內容區域 - 移除白色大方塊包裝，直接在灰色背景上放置內容 */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 頁面標題 - 使用品牌綠色 */}
        <div className="mb-8 flex flex-col items-center justify-center text-center">
          <h1 className="text-3xl font-bold" style={{ color: '#4CAF50' }}>WD-40 碳排放計算</h1>
          <p className="mt-2" style={{ color: '#212121' }}>請上傳 MSDS 文件並填入各月份使用數據進行碳排放計算</p>
        </div>

        {/* 錯誤訊息模態框 */}
        {error && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4 transform animate-in zoom-in-95 duration-300">
              <div className="p-6">
                <div className="flex items-start space-x-3 mb-4">
                  <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <AlertCircle className="h-5 w-5 text-red-500" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">發生錯誤</h3>
                    <div className="text-sm text-gray-700 space-y-1">
                      {error.split('\n').map((line, index) => (
                        <div key={index} className={index === 0 ? 'font-medium text-red-600' : 'pl-2'}>
                          {line.startsWith('請修正以下問題：') ? (
                            <div className="font-medium text-red-600 mb-2">{line}</div>
                          ) : line ? (
                            <div className="flex items-start space-x-2 py-1">
                              <div className="w-1.5 h-1.5 bg-red-400 rounded-full mt-2 flex-shrink-0"></div>
                              <span>{line}</span>
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
                    className="px-4 py-2 text-white rounded-lg transition-colors font-medium"
                    style={{ backgroundColor: '#F44336' }}
                    onMouseEnter={(e) => {
                      const target = e.target as HTMLButtonElement;
                      target.style.backgroundColor = '#D32F2F';
                    }}
                    onMouseLeave={(e) => {
                      const target = e.target as HTMLButtonElement;
                      target.style.backgroundColor = '#F44336';
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
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 transform transition-all">
              <div className="p-6">
                {/* 右上角關閉按鈕 */}
                <div className="flex justify-end mb-2">
                  <button
                    onClick={() => setShowSuccessModal(false)}
                    className="text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                <div className="flex items-center justify-center w-12 h-12 mx-auto rounded-full mb-4" style={{ backgroundColor: '#E8F5E8' }}>
                  <CheckCircle className="h-6 w-6" style={{ color: '#4CAF50' }} />
                </div>
                <h3 className="text-lg font-medium text-center mb-2" style={{ color: '#212121' }}>提交成功！</h3>
                <p className="text-center mb-4" style={{ color: '#212121' }}>{success}</p>
                <div className="rounded-lg p-4 mb-4" style={{ backgroundColor: '#F5F5F5' }}>
                  <p className="text-sm mb-2" style={{ color: '#212121' }}>您的資料已成功儲存，您可以：</p>
                  <ul className="text-sm space-y-1" style={{ color: '#212121' }}>
                    <li>• 隨時回來查看或修改資料</li>
                    <li>• 重新上傳新的證明文件</li>
                    <li>• 更新月份使用量數據</li>
                  </ul>
                </div>
                <div className="flex justify-center">
                  <button
                    onClick={() => setShowSuccessModal(false)}
                    className="px-6 py-2 text-white rounded-lg transition-colors font-medium"
                    style={{ backgroundColor: '#4CAF50' }}
                    onMouseEnter={(e) => {
                      const target = e.target as HTMLButtonElement;
                      target.style.backgroundColor = '#388E3C';
                    }}
                    onMouseLeave={(e) => {
                      const target = e.target as HTMLButtonElement;
                      target.style.backgroundColor = '#4CAF50';
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
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4 transform animate-in zoom-in-95 duration-300">
              <div className="p-6">
                <div className="flex items-start space-x-3 mb-4">
                  <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <svg className="h-5 w-5 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">確認清除</h3>
                    <p className="text-sm text-gray-700">
                      如果按清除，這一頁所有資料都會被清除，確定嗎？
                    </p>
                  </div>
                </div>
                <div className="flex justify-end space-x-3">
                  <button
                    onClick={() => setShowClearConfirmModal(false)}
                    className="px-4 py-2 border text-gray-700 rounded-lg transition-colors font-medium"
                    style={{ borderColor: '#E0E0E0', backgroundColor: '#FFFFFF' }}
                    onMouseEnter={(e) => {
                      if (!submitting) {
                        const target = e.target as HTMLButtonElement;
                        target.style.backgroundColor = '#F5F5F5';
                        target.style.borderColor = '#BDBDBD';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!submitting) {
                        const target = e.target as HTMLButtonElement;
                        target.style.backgroundColor = '#FFFFFF';
                        target.style.borderColor = '#E0E0E0';
                      }
                    }}
                  >
                    取消
                  </button>
                  <button
                    onClick={() => {
                      // 這裡會實現清除功能
                      handleClearAll()
                      setShowClearConfirmModal(false)
                    }}
                    className="px-4 py-2 text-white rounded-lg transition-colors font-medium"
                    style={{ backgroundColor: '#F44336' }}
                    onMouseEnter={(e) => {
                      const target = e.target as HTMLButtonElement;
                      target.style.backgroundColor = '#D32F2F';
                    }}
                    onMouseLeave={(e) => {
                      const target = e.target as HTMLButtonElement;
                      target.style.backgroundColor = '#F44336';
                    }}
                  >
                    確定
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 重新編輯提示 - 使用品牌藍色 */}
        {hasSubmittedBefore && !showSuccessModal && (
          <div className="mb-6 rounded-lg p-4" style={{ backgroundColor: '#E3F2FD', borderLeft: '4px solid #2196F3' }}>
            <div className="flex items-start">
              <CheckCircle className="h-5 w-5 mt-0.5" style={{ color: '#2196F3' }} />
              <div className="ml-3 flex-1">
                <h3 className="text-sm font-medium" style={{ color: '#1976D2' }}>資料已提交</h3>
                <p className="mt-1 text-sm" style={{ color: '#1976D2' }}>
                  您可以繼續編輯資料，修改後請再次點擊「提交填報」以更新記錄。
                </p>
              </div>
            </div>
          </div>
        )}

        {/* MSDS 安全資料表與基本參數 - 使用品牌藍色調 */}
        <div className="bg-white shadow rounded-lg mb-6">
          <div className="px-6 py-4 rounded-t-lg" style={{ backgroundColor: '#E3F2FD', borderBottom: '1px solid #BBDEFB' }}>
            <h2 className="text-lg font-medium" style={{ color: '#2196F3' }}>MSDS 安全資料表與基本參數</h2>
          </div>
          
          <div className="p-6 space-y-6">
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: '#212121' }}>
                MSDS 安全資料表
              </label>
              <EvidenceUpload
                pageKey={pageKey}
                files={msdsFiles}
                onFilesChange={setMsdsFiles}
                maxFiles={3}
                disabled={submitting}
                kind="msds"
              />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: '#212121' }}>
                  單位容量 (ML/瓶)
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.1"
                  value={unitCapacity || ''}
                  onChange={(e) => setUnitCapacity(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:border-transparent transition-colors"
                  style={{ 
                    color: '#212121'
                  }}
                  onFocus={(e) => {
                    (e.target as HTMLInputElement).style.borderColor = '#2196F3';
                    (e.target as HTMLInputElement).style.boxShadow = '0 0 0 2px rgba(33, 150, 243, 0.2)'
                  }}
                  onBlur={(e) => {
                    (e.target as HTMLInputElement).style.borderColor = '#D1D5DB';
                    (e.target as HTMLInputElement).style.boxShadow = 'none'
                  }}
                  placeholder="請輸入單位容量"
                  disabled={submitting}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: '#212121' }}>
                  含碳率 (%)
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  value={carbonRate || ''}
                  onChange={(e) => setCarbonRate(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:border-transparent transition-colors"
                  style={{ 
                    color: '#212121'
                  }}
                  onFocus={(e) => {
                    (e.target as HTMLInputElement).style.borderColor = '#2196F3';
                    (e.target as HTMLInputElement).style.boxShadow = '0 0 0 2px rgba(33, 150, 243, 0.2)'
                  }}
                  onBlur={(e) => {
                    (e.target as HTMLInputElement).style.borderColor = '#D1D5DB';
                    (e.target as HTMLInputElement).style.boxShadow = 'none'
                  }}
                  placeholder="請輸入含碳率"
                  disabled={submitting}
                />
              </div>
            </div>
          </div>
        </div>

        {/* 月份使用量數據 */}
        <div className="bg-white shadow rounded-lg mb-6">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-medium" style={{ color: '#212121' }}>月份使用量數據</h2>
          </div>
          
          <div className="p-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {monthlyData.map((data, index) => (
                <div key={data.month} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-base font-medium" style={{ color: '#212121' }}>
                      {monthNames[index]}
                    </h3>
                    {data.totalUsage > 0 && (
                      <span className="text-sm" style={{ color: '#757575' }}>
                        總量：{data.totalUsage.toFixed(2)} ML
                      </span>
                    )}
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium mb-1" style={{ color: '#212121' }}>
                        使用數量 (瓶)
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="0.1"
                        value={data.quantity || ''}
                        onChange={(e) => updateMonthData(index, 'quantity', parseFloat(e.target.value) || 0)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:border-transparent transition-colors"
                        style={{ 
                          color: '#212121'
                        }}
                        onFocus={(e) => {
                          (e.target as HTMLInputElement).style.borderColor = '#2196F3';
                          (e.target as HTMLInputElement).style.boxShadow = '0 0 0 2px rgba(33, 150, 243, 0.2)'
                        }}
                        onBlur={(e) => {
                          (e.target as HTMLInputElement).style.borderColor = '#D1D5DB';
                          (e.target as HTMLInputElement).style.boxShadow = 'none'
                        }}
                        placeholder="0"
                        disabled={submitting}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-1" style={{ color: '#212121' }}>
                        使用證明
                      </label>
                      <EvidenceUpload
                        pageKey={pageKey}
                        month={data.month}
                        files={data.files}
                        onFilesChange={(files) => handleMonthFilesChange(data.month, files)}
                        maxFiles={3}
                        disabled={submitting}
                        kind="usage_evidence"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 開發環境資料庫測試區域 */}
        {import.meta.env.DEV && (
          <div className="bg-white shadow rounded-lg mb-6 border-l-4 border-orange-500">
            <div className="px-6 py-4 bg-orange-50 rounded-t-lg border-b border-orange-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Database className="h-5 w-5 text-orange-600" />
                  <h2 className="text-lg font-medium text-orange-800">資料庫連接測試</h2>
                  <span className="px-2 py-1 bg-orange-200 text-orange-800 text-xs font-medium rounded-full">
                    DEV ONLY
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setShowDbTest(!showDbTest)}
                    className="px-3 py-1 text-orange-600 border border-orange-300 rounded-md hover:bg-orange-100 transition-colors text-sm"
                  >
                    {showDbTest ? '隱藏測試' : '顯示測試'}
                  </button>
                  {!showDbTest && dbTestResults && (
                    <div className={`px-2 py-1 rounded text-xs font-medium ${
                      dbTestResults.overall 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {dbTestResults.overall ? '✅ 通過' : '❌ 失敗'}
                    </div>
                  )}
                </div>
              </div>
              {showDbTest && (
                <p className="text-sm text-orange-700 mt-2">
                  這個工具可以測試 Supabase 資料庫連接、讀取權限和寫入權限
                </p>
              )}
            </div>
            
            {showDbTest && (
              <div className="p-6">
                <div className="space-y-4">
                  {/* 測試按鈕 */}
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-base font-medium text-gray-900">執行資料庫連接測試</h3>
                      <p className="text-sm text-gray-600">測試 Supabase 連接、讀取和寫入權限</p>
                    </div>
                    <button
                      onClick={handleRunDatabaseTests}
                      disabled={dbTesting}
                      className="px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 disabled:bg-gray-400 transition-colors flex items-center space-x-2"
                    >
                      {dbTesting ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>測試中...</span>
                        </>
                      ) : (
                        <>
                          <Database className="w-4 h-4" />
                          <span>執行測試</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* 測試結果 */}
                  {dbTestResults && (
                    <div className="mt-6 space-y-4">
                      {/* 整體狀態 */}
                      <div className={`p-4 rounded-lg border-l-4 ${
                        dbTestResults.overall 
                          ? 'bg-green-50 border-green-400' 
                          : 'bg-red-50 border-red-400'
                      }`}>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            {dbTestResults.overall ? (
                              <CheckCircle className="w-5 h-5 text-green-600" />
                            ) : (
                              <AlertCircle className="w-5 h-5 text-red-600" />
                            )}
                            <h4 className={`font-medium ${
                              dbTestResults.overall ? 'text-green-800' : 'text-red-800'
                            }`}>
                              整體測試結果: {dbTestResults.overall ? '通過' : '失敗'}
                            </h4>
                          </div>
                          <span className="text-xs text-gray-500">{dbTestResults.timestamp}</span>
                        </div>
                        <p className={`text-sm mt-1 ${
                          dbTestResults.overall ? 'text-green-700' : 'text-red-700'
                        }`}>
                          {dbTestResults.tests.filter(t => t.success).length} / {dbTestResults.tests.length} 項測試通過
                        </p>
                      </div>

                      {/* 個別測試結果 */}
                      <div className="space-y-3">
                        <h5 className="text-sm font-medium text-gray-900">詳細測試結果</h5>
                        {dbTestResults.tests.map((test, index) => (
                          <div key={index} className="bg-gray-50 rounded-lg p-3">
                            <div className="flex items-start justify-between">
                              <div className="flex items-center space-x-2">
                                {test.success ? (
                                  <CheckCircle className="w-4 h-4 text-green-500 mt-0.5" />
                                ) : (
                                  <AlertCircle className="w-4 h-4 text-red-500 mt-0.5" />
                                )}
                                <div>
                                  <h6 className="text-sm font-medium text-gray-900">{test.name}</h6>
                                  <p className={`text-sm ${test.success ? 'text-green-600' : 'text-red-600'}`}>
                                    {test.message}
                                  </p>
                                </div>
                              </div>
                              <span className={`px-2 py-1 rounded text-xs font-medium ${
                                test.success 
                                  ? 'bg-green-100 text-green-800' 
                                  : 'bg-red-100 text-red-800'
                              }`}>
                                {test.success ? '通過' : '失敗'}
                              </span>
                            </div>
                            
                            {/* 錯誤詳情 */}
                            {test.error && (
                              <div className="mt-2 p-2 bg-red-100 border border-red-200 rounded text-xs text-red-700">
                                <strong>錯誤:</strong> {test.error}
                              </div>
                            )}
                            
                            {/* 詳細資訊 */}
                            {test.details && (
                              <details className="mt-2">
                                <summary className="text-xs text-gray-500 cursor-pointer hover:text-gray-700">
                                  詳細資訊
                                </summary>
                                <pre className="mt-1 text-xs bg-white p-2 border rounded overflow-x-auto text-gray-700">
                                  {JSON.stringify(test.details, null, 2)}
                                </pre>
                              </details>
                            )}
                          </div>
                        ))}
                      </div>

                      {/* 說明 */}
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                        <div className="flex items-start space-x-2">
                          <AlertCircle className="w-4 h-4 text-blue-600 mt-0.5" />
                          <div className="text-xs text-blue-800">
                            <p className="font-medium mb-1">測試說明:</p>
                            <ul className="space-y-1 ml-2">
                              <li>• <strong>連接測試:</strong> 檢查 Supabase 基本連接和認證狀態</li>
                              <li>• <strong>讀取測試:</strong> 檢查是否能查詢 energy_entries 表</li>
                              <li>• <strong>寫入測試:</strong> 檢查是否能新增資料 (會自動清理)</li>
                              <li>• <strong>Console 輸出:</strong> 更多詳細資訊請查看瀏覽器 Console</li>
                            </ul>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* 初始說明 */}
                  {!dbTestResults && !dbTesting && (
                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                      <div className="text-center">
                        <Database className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                        <p className="text-sm text-gray-600">點擊「執行測試」來檢查資料庫連接狀態</p>
                        <p className="text-xs text-gray-500 mt-1">測試結果將同時顯示在這裡和瀏覽器 Console</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* 底部空間，避免內容被固定底部欄遮擋 */}
        <div className="h-20"></div>
      </div>

      {/* 底部操作欄 - 修正：只佔主要內容區域寬度，不延伸到側邊欄 */}
      <div className="fixed bottom-0 left-0 right-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white border-t border-gray-200 px-4 py-3 shadow-lg rounded-t-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="text-sm" style={{ color: '#212121' }}>
                  {hasUnsavedChanges ? (
                    <span className="flex items-center">
                      {/* 自動儲存小點使用品牌橘色 */}
                      <span 
                        className="w-2 h-2 rounded-full mr-2 animate-pulse" 
                        style={{ backgroundColor: '#FF9800' }}
                      ></span>
                      自動儲存中...
                    </span>
                  ) : (
                    <span className="flex items-center">
                      {/* 已儲存小點使用品牌綠色 */}
                      <span 
                        className="w-2 h-2 rounded-full mr-2" 
                        style={{ backgroundColor: '#4CAF50' }}
                      ></span>
                      已自動儲存
                    </span>
                  )}
                </div>
              </div>
              
              <div className="flex items-center space-x-3">
                {/* 開發環境資料庫測試快速按鈕 */}
                {import.meta.env.DEV && (
                  <button 
                    onClick={handleRunDatabaseTests}
                    disabled={dbTesting}
                    className="px-3 py-2 border text-orange-600 rounded-md transition-colors flex items-center space-x-2 text-sm"
                    style={{ 
                      borderColor: '#FB923C',
                      backgroundColor: dbTesting ? '#FED7AA' : '#FFFFFF'
                    }}
                    onMouseEnter={(e) => {
                      if (!dbTesting) {
                        (e.target as HTMLButtonElement).style.backgroundColor = '#FED7AA';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!dbTesting) {
                        (e.target as HTMLButtonElement).style.backgroundColor = '#FFFFFF';
                      }
                    }}
                  >
                    {dbTesting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>測試中</span>
                      </>
                    ) : (
                      <>
                        <Database className="w-4 h-4" />
                        <span>DB 測試</span>
                        {dbTestResults && (
                          <span className={`ml-1 ${dbTestResults.overall ? 'text-green-600' : 'text-red-600'}`}>
                            {dbTestResults.overall ? '✓' : '✗'}
                          </span>
                        )}
                      </>
                    )}
                  </button>
                )}
                
                {/* 清除按鈕 */}
                <button 
                  onClick={() => setShowClearConfirmModal(true)}
                  disabled={submitting}
                  className="px-4 py-2 border text-gray-700 rounded-md disabled:cursor-not-allowed transition-colors flex items-center space-x-2"
                  style={{ 
                    borderColor: '#E0E0E0',
                    backgroundColor: '#FFFFFF'
                  }}
                  onMouseEnter={(e) => {
                    if (!submitting) {
                      const target = e.target as HTMLButtonElement;
                      target.style.backgroundColor = '#F5F5F5';
                      target.style.borderColor = '#BDBDBD';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!submitting) {
                      const target = e.target as HTMLButtonElement;
                      target.style.backgroundColor = '#FFFFFF';
                      target.style.borderColor = '#E0E0E0';
                    }
                  }}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  <span>清除</span>
                </button>
                
                {/* 提交按鈕使用品牌綠色 */}
                <button 
                onClick={handleSubmit}
                disabled={submitting}
                className="px-6 py-2 text-white rounded-md disabled:cursor-not-allowed transition-colors flex items-center space-x-2"
                style={{ 
                  backgroundColor: submitting ? '#BDBDBD' : '#4CAF50'
                }}
                onMouseEnter={(e) => {
                  if (!submitting) {
                    const target = e.target as HTMLButtonElement;
                    target.style.backgroundColor = '#388E3C';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!submitting) {
                    const target = e.target as HTMLButtonElement;
                    target.style.backgroundColor = '#4CAF50';
                  }
                }}
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>提交中...</span>
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4" />
                    <span>提交填報</span>
                  </>
                )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default WD40Page
