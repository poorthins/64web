import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Upload, AlertCircle, CheckCircle, Loader2, X, Trash2 } from 'lucide-react'
import FileUpload from '../../components/FileUpload'
import EvidenceUpload from '../../components/EvidenceUpload'
import StatusSwitcher, { EntryStatus } from '../../components/StatusSwitcher'
import StatusIndicator from '../../components/StatusIndicator'
import Toast, { ToastType } from '../../components/Toast'
import BottomActionBar from '../../components/BottomActionBar'
import { useEditPermissions } from '../../hooks/useEditPermissions'
import { useFrontendStatus } from '../../hooks/useFrontendStatus'
import { upsertEnergyEntry, sumMonthly, UpsertEntryInput, getEntryByPageKeyAndYear, updateEntryStatus } from '../../api/entries'
import { getEntryFiles, EvidenceFile, commitEvidence } from '../../api/files'
import { designTokens } from '../../utils/designTokens'


interface MonthData {
  month: number
  quantity: number
  totalUsage: number
  proofFile: File | null
  files: Array<any>
}

const AcetylenePage = () => {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
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
  const [monthlyData, setMonthlyData] = useState<MonthData[]>(
    Array.from({ length: 12 }, (_, i) => ({
      month: i + 1,
      quantity: 0,
      totalUsage: 0,
      proofFile: null,
      files: []
    }))
  )

  const pageKey = 'acetylene'
  
  // 編輯權限控制
  const editPermissions = useEditPermissions(currentStatus)
  
  // 判斷是否有資料
  const hasAnyData = useMemo(() => {
    const hasMonthlyData = monthlyData.some(m => m.quantity > 0)
    const hasFiles = monthlyData.some(m => m.proofFile !== null)
    return hasMonthlyData || hasFiles
  }, [monthlyData])
  
  // 允許所有狀態編輯
  const isReadOnly = false

  const monthNames = [
    '1月', '2月', '3月', '4月', '5月', '6月',
    '7月', '8月', '9月', '10月', '11月', '12月'
  ]

  // 載入資料
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true)
        setError(null)
        console.log(`Loading existing data for ${pageKey}, year: ${year}`)

        // 檢查是否已有記錄
        const existingEntry = await getEntryByPageKeyAndYear(pageKey, year)
        
        if (existingEntry) {
          console.log('Found existing entry:', existingEntry)
          setInitialStatus(existingEntry.status as EntryStatus)
          setCurrentEntryId(existingEntry.id)
          setHasSubmittedBefore(true)
          
          // 從notes 解析單位重量
          if (existingEntry.payload?.notes) {
            const unitWeightMatch = existingEntry.payload.notes.match(/單位重量:\s*([\d.]+)\s*kg\/瓶/)
            if (unitWeightMatch) {
              setUnitWeight(parseFloat(unitWeightMatch[1]))
            }
          }
          
          // 解析月度資料
          if (existingEntry.payload?.monthly) {
            const parsedUnitWeight = unitWeight > 0 ? unitWeight : 
              (existingEntry.payload?.notes?.match(/單位重量:\s*([\d.]+)\s*kg\/瓶/)?.[1] ? 
                parseFloat(existingEntry.payload.notes.match(/單位重量:\s*([\d.]+)\s*kg\/瓶/)[1]) : 0)
            
            const newMonthlyData = monthlyData.map((data, index) => {
              const monthKey = (index + 1).toString()
              const totalUsage = existingEntry.payload.monthly[monthKey] || 0
              const quantity = parsedUnitWeight > 0 ? Math.round(totalUsage / parsedUnitWeight) : totalUsage
              
              return {
                ...data,
                quantity: quantity,
                totalUsage: totalUsage
              }
            })
            
            // 載入相關檔案
            if (existingEntry.id) {
              try {
                const files = await getEntryFiles(existingEntry.id)
                
                // 分類檔案
                const unitWeightFilesList: EvidenceFile[] = []
                const monthlyFilesList = new Map<number, EvidenceFile[]>()
                
                files.forEach(file => {
                  if (file.file_path.includes('/unit_weight/')) {
                    unitWeightFilesList.push(file)
                  } else if (file.month) {
                    if (!monthlyFilesList.has(file.month)) {
                      monthlyFilesList.set(file.month, [])
                    }
                    monthlyFilesList.get(file.month)!.push(file)
                  }
                })
                
                setUnitWeightFiles(unitWeightFilesList)
                
                // 更新月度檔案
                const updatedMonthlyData = newMonthlyData.map(data => ({
                  ...data,
                  files: monthlyFilesList.get(data.month) || []
                }))
                setMonthlyData(updatedMonthlyData)
              } catch (fileError) {
                console.error('Failed to load files:', fileError)
                setMonthlyData(newMonthlyData)
              }
            } else {
              setMonthlyData(newMonthlyData)
            }
          }
          
          // 設定狀態
          handleDataChanged()
        }
        
        isInitialLoad.current = false
      } catch (error) {
        console.error('載入資料失敗:', error)
        setError('載入資料失敗，請重試')
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
    setHasUnsavedChanges(true)
  }

  const getTotalUsage = () => {
    return monthlyData.reduce((sum, data) => sum + data.totalUsage, 0)
  }

  const validateData = () => {
    const errors: string[] = []

    monthlyData.forEach((data, index) => {
      if (data.quantity > 0 && !data.proofFile) {
        errors.push(`${monthNames[index]}有使用量但未上傳使用證明`)
      }
    })

    return errors
  }

  const handleSubmit = async () => {
    // 驗證單位重量
    if (!unitWeight || unitWeight <= 0) {
      setError('請填寫單位重量')
      return
    }
    
    const errors = validateData()
    if (errors.length > 0) {
      setError('請修正以下問題：\n' + errors.join('\n'))
      return
    }

    setSubmitting(true)
    setError(null)
    setSuccess(null)

    try {
      // 準備每月數據
      const monthly: Record<string, number> = {}
      let hasData = false
      
      monthlyData.forEach(data => {
        if (data.quantity > 0) {
          monthly[data.month.toString()] = data.totalUsage
          hasData = true
        }
      })
      
      if (!hasData) {
        setError('請至少填寫一個月份的使用量')
        setSubmitting(false)
        return
      }

      // 建立填報輸入資料，將單位重量儲存在 notes
      const entryInput: UpsertEntryInput = {
        page_key: pageKey,
        period_year: year,
        unit: 'kg',
        monthly: monthly,
        notes: `單位重量: ${unitWeight} kg/瓶`
      }

      // 新增或更新 energy_entries
      const { entry_id } = await upsertEnergyEntry(entryInput, true)

      // 設置 entryId
      if (!currentEntryId) {
        setCurrentEntryId(entry_id)
      }
      
      // 提交所有檔案
      await commitEvidence({
        entryId: entry_id,
        pageKey: pageKey
      })


      // 處理狀態轉換 - 提交成功時自動更新狀態
      await handleSubmitSuccess()

      // 計算並顯示成功訊息
      const totalUsage = sumMonthly(monthly)
      setSuccess(`年度總使用量：${totalUsage.toFixed(2)} kg`)
      setHasUnsavedChanges(false)
      setHasSubmittedBefore(true)
      setShowSuccessModal(true)

    } catch (error) {
      console.error('Submit error:', error)
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
    setMonthlyData(Array.from({ length: 12 }, (_, i) => ({
      month: i + 1,
      quantity: 0,
      totalUsage: 0,
      proofFile: null,
      files: []
    })))
    
    setHasUnsavedChanges(false)
    setHasSubmittedBefore(false)
    setError(null)
    setSuccess(null)
    setShowClearConfirmModal(false)
  }

  return (
    <div className="min-h-screen bg-green-50">
      {/* 主要內容區域 */}
      <div className="max-w-6xl mx-auto px-6 py-8 space-y-6">
        
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
                <h3 className="text-sm font-medium mb-1" style={{ color: designTokens.colors.accentBlue }}>
                  資料已提交
                </h3>
                <p className="text-sm" style={{ color: designTokens.colors.textSecondary }}>
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
                onFilesChange={setUnitWeightFiles}
                maxFiles={3}
                kind="unit_weight"
                disabled={loading}
              />
            </div>
          </div>
        </div>

        {/* 月份使用量數據表格 */}
        <div 
          className="rounded-lg border p-6"
          style={{ 
            backgroundColor: designTokens.colors.cardBg,
            borderColor: designTokens.colors.border,
            boxShadow: designTokens.shadows.sm
          }}
        >
          <h2 className="text-xl font-medium mb-6" style={{ color: designTokens.colors.textPrimary }}>
            月份使用量數據
          </h2>
          
          <div className="overflow-x-auto shadow-lg rounded-xl border border-gray-200">
            <table className="w-full border-collapse bg-white">
              <thead>
                <tr className="bg-gradient-to-r from-brand-500 to-brand-600">
                  <th className="px-6 py-4 text-left text-sm font-semibold text-white border-r border-brand-400/30">月份</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-white border-r border-brand-400/30">使用瓶數</th>
                  <th className="px-6 py-4 text-center text-sm font-semibold text-white">使用證明</th>
                </tr>
              </thead>
              <tbody>
                {monthlyData.map((data, index) => (
                  <tr key={index} className="hover:bg-brand-50 transition-colors duration-200 border-b border-gray-100">
                    <td className="px-6 py-4 text-sm font-medium text-gray-800 bg-gray-50/50">
                      <div className="flex items-center space-x-2">
                        <div className="w-2 h-2 bg-brand-400 rounded-full"></div>
                        <span>{monthNames[index]}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-2">
                        <input
                          type="number"
                          min="0"
                          step="1"
                          value={data.quantity || ''}
                          onChange={(e) => updateMonthData(index, 'quantity', parseFloat(e.target.value) || 0)}
                          className={`flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 hover:border-brand-300 transition-colors duration-200 ${
                            isReadOnly ? 'bg-gray-100 cursor-not-allowed' : ''
                          }`}
                          placeholder="0"
                          disabled={submitting || isReadOnly}
                        />
                        <span className="text-sm text-gray-600">瓶</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex justify-center">
                        <div className="w-36">
                          <FileUpload
                            onFileSelect={(file) => updateMonthData(index, 'proofFile', file)}
                            accept=".jpg,.jpeg,.png,.pdf"
                            maxSize={5 * 1024 * 1024}
                            currentFile={data.proofFile}
                            placeholder="上傳證明"
                          />
                        </div>
                      </div>
                    </td>
                  </tr>
                ))}
                <tr className="bg-gradient-to-r from-brand-100 to-brand-50 border-t-2 border-brand-300">
                  <td className="px-6 py-5 text-sm font-bold text-brand-800">
                    <div className="flex items-center space-x-2">
                      <div className="w-3 h-3 bg-brand-600 rounded-full"></div>
                      <span>年度總計</span>
                    </div>
                  </td>
                  <td className="px-6 py-5">
                    <div className="px-4 py-3 bg-gradient-to-r from-brand-600 to-brand-700 text-white font-bold text-lg rounded-lg text-center shadow-lg">
                      {getTotalUsage().toFixed(2)} kg
                    </div>
                  </td>
                  <td className="px-6 py-5 text-sm text-gray-400 italic text-center"></td>
                </tr>
              </tbody>
            </table>
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
                    (e.target as HTMLButtonElement).style.backgroundColor = '#dc2626'
                  }}
                  onMouseLeave={(e) => {
                    (e.target as HTMLButtonElement).style.backgroundColor = designTokens.colors.error
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

export default AcetylenePage
