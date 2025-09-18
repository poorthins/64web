import { useState, useMemo, useEffect, useRef } from 'react';
import { Upload, Trash2, Loader2, AlertCircle, CheckCircle } from 'lucide-react';
import EvidenceUpload from '../../components/EvidenceUpload';
import { MemoryFile } from '../../components/EvidenceUpload';
import StatusIndicator from '../../components/StatusIndicator';
import BottomActionBar from '../../components/BottomActionBar';
import { EntryStatus } from '../../components/StatusSwitcher';
import { useEditPermissions } from '../../hooks/useEditPermissions';
import { useFrontendStatus } from '../../hooks/useFrontendStatus';
import { updateEntryStatus, getEntryByPageKeyAndYear, upsertEnergyEntry, UpsertEntryInput } from '../../api/entries';
import { listUsageEvidenceFiles, commitEvidence, getEntryFiles, updateFileEntryAssociation, EvidenceFile, uploadEvidenceWithEntry } from '../../api/files';
import { designTokens } from '../../utils/designTokens';
import { debugRLSOperation, diagnoseAuthState } from '../../utils/authDiagnostics';
import { logDetailedAuthStatus } from '../../utils/authHelpers';
import { DocumentHandler } from '../../services/documentHandler';


interface MonthData {
  month: number;
  hours: number;          // 當月總工時
}

interface AnnualEvidence {
  files: EvidenceFile[];  // 年度佐證資料
  memoryFiles?: MemoryFile[];  // 記憶體暫存檔案
}

const monthLabels = ["1月","2月","3月","4月","5月","6月","7月","8月","9月","10月","11月","12月"];

export default function SepticTankPage() {
  const pageKey = 'septic_tank'
  const currentYear = new Date().getFullYear()
  const [loading, setLoading] = useState(true)
  const [initialStatus, setInitialStatus] = useState<EntryStatus>('submitted')
  const [currentEntryId, setCurrentEntryId] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [hasSubmittedBefore, setHasSubmittedBefore] = useState(false)
  const [hasChanges, setHasChanges] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [monthlyData, setMonthlyData] = useState<MonthData[]>(
    Array.from({ length: 12 }, (_, i) => ({
      month: i + 1,
      hours: 0
    }))
  );
  const [annualEvidence, setAnnualEvidence] = useState<AnnualEvidence>({ files: [], memoryFiles: [] });

  // 前端狀態管理 Hook
  const frontendStatus = useFrontendStatus({
    initialStatus,
    entryId: currentEntryId,
    onStatusChange: (newStatus) => {
      console.log('Status changed to:', newStatus)
    },
    onError: (error) => setError(error),
    onSuccess: (message) => setSuccess(message)
  })

  const { currentStatus, handleDataChanged, handleSubmitSuccess, isInitialLoad } = frontendStatus
  
  // 編輯權限控制
  const editPermissions = useEditPermissions(currentStatus)
  
  // 判斷是否有資料
  const hasAnyData = useMemo(() => {
    const hasMonthlyData = monthlyData.some(m => m.hours > 0)
    const hasFiles = annualEvidence.files.length > 0
    const hasMemoryFiles = (annualEvidence.memoryFiles || []).length > 0
    return hasMonthlyData || hasFiles || hasMemoryFiles
  }, [monthlyData, annualEvidence])
  
  // 允許所有狀態編輯
  const isReadOnly = false

  // 年總工時（自動計算）
  const yearlyTotal = useMemo(
    () => monthlyData.reduce((sum, data) => sum + (Number.isFinite(data.hours) ? data.hours : 0), 0),
    [monthlyData]
  );

  // 載入檔案和資料（支援完整編輯功能）
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true)
        setError(null)

        // 並行載入基本資料
        const [existingEntry] = await Promise.all([
          getEntryByPageKeyAndYear(pageKey, currentYear)
        ])

        console.log('🔍 [SepticTank] Loading entry:', {
          existingEntry: existingEntry ? {
            id: existingEntry.id,
            status: existingEntry.status,
            hasPayload: !!existingEntry.payload
          } : null
        })

        // 如果有已提交記錄
        if (existingEntry && existingEntry.status !== 'draft') {
          setHasSubmittedBefore(true)
          setCurrentEntryId(existingEntry.id)
          setInitialStatus(existingEntry.status as EntryStatus)

          // 載入表單資料
          if (existingEntry.payload?.septicTankData) {
            // 優先從新結構讀取
            const restoredData = existingEntry.payload.septicTankData

            console.log('📝 [SepticTank] Loading from extraPayload septicTankData:', {
              entryId: existingEntry.id,
              payloadKeys: Object.keys(existingEntry.payload || {}),
              septicTankDataLength: restoredData?.length || 0
            })

            // 載入已關聯的檔案
            try {
              const entryFiles = await getEntryFiles(existingEntry.id)
              console.log('📁 [SepticTank] Loaded entry files:', {
                totalCount: entryFiles.length,
                files: entryFiles.map(f => ({
                  id: f.id,
                  name: f.file_name,
                  path: f.file_path,
                  entry_id: f.entry_id
                }))
              })

              // 所有檔案都歸類為年度佐證資料（化糞池使用 usage_evidence 類別）
              const annualFiles = entryFiles.filter(f =>
                f.file_type === 'usage_evidence' && f.page_key === pageKey
              )

              console.log('📋 [SepticTank] Annual evidence files:', {
                annualCount: annualFiles.length,
                annualPaths: annualFiles.map(f => f.file_path)
              })

              // 設置月份數據（僅工時，無檔案）
              const updatedMonthlyData = restoredData.map((data: any) => ({
                month: data.month,
                hours: data.hours || 0
              }))

              setMonthlyData(updatedMonthlyData)
              setAnnualEvidence({ files: annualFiles, memoryFiles: [] })
            } catch (fileError) {
              console.error('❌ [SepticTank] Failed to load entry files:', fileError)
              // 即使檔案載入失敗，也要繼續處理表單資料
              const updatedMonthlyData = restoredData.map((data: any) => ({
                month: data.month,
                hours: data.hours || 0
              }))
              setMonthlyData(updatedMonthlyData)
              setAnnualEvidence({ files: [], memoryFiles: [] })
            }
          } else if (existingEntry.payload?.monthly) {
            // 向後相容：從 monthly 推算
            console.log('📝 [SepticTank] Falling back to monthly data for backward compatibility')
            const restoredData = Object.keys(existingEntry.payload.monthly).map(month => ({
              month: parseInt(month),
              hours: existingEntry.payload.monthly[month]
            }))

            // 載入已關聯的檔案
            try {
              const entryFiles = await getEntryFiles(existingEntry.id)
              const annualFiles = entryFiles.filter(f =>
                f.file_type === 'usage_evidence' && f.page_key === pageKey
              )

              // 補全12個月的數據
              const fullYearData = Array.from({ length: 12 }, (_, i) => {
                const monthData = restoredData.find(d => d.month === i + 1)
                return {
                  month: i + 1,
                  hours: monthData ? monthData.hours : 0
                }
              })

              setMonthlyData(fullYearData)
              setAnnualEvidence({ files: annualFiles, memoryFiles: [] })
            } catch (fileError) {
              console.error('❌ [SepticTank] Failed to load entry files:', fileError)
              const fullYearData = Array.from({ length: 12 }, (_, i) => {
                const monthData = restoredData.find(d => d.month === i + 1)
                return {
                  month: i + 1,
                  hours: monthData ? monthData.hours : 0
                }
              })
              setMonthlyData(fullYearData)
              setAnnualEvidence({ files: [], memoryFiles: [] })
            }
          }
        } else {
          // 新記錄處理
          // 載入年度佐證暫存檔案
          try {
            const annualFiles = await listUsageEvidenceFiles(pageKey, 0)
            setAnnualEvidence({ files: annualFiles, memoryFiles: [] })
          } catch (error) {
            console.error('Failed to load annual evidence files:', error)
            setAnnualEvidence({ files: [], memoryFiles: [] })
          }
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

  // 監聽表單變更
  useEffect(() => {
    if (!isInitialLoad.current && hasSubmittedBefore) {
      setHasChanges(true)
    }
  }, [monthlyData, annualEvidence, hasSubmittedBefore])

  const updateMonthData = (index: number, field: keyof MonthData, value: any) => {
    setMonthlyData(prev => {
      const newData = [...prev];
      newData[index] = { ...newData[index], [field]: value };
      return newData;
    });
  };

  const updateAnnualEvidence = (files: EvidenceFile[]) => {
    setAnnualEvidence({ files });
  };

  const validateData = () => {
    const errors: string[] = [];

    const hasHours = monthlyData.some(data => data.hours > 0);
    const hasFiles = annualEvidence.files.length > 0;
    const hasMemoryFiles = (annualEvidence.memoryFiles || []).length > 0;

    if (hasHours && !hasFiles && !hasMemoryFiles) {
      errors.push('已填入工時數據但未上傳年度佐證資料');
    }

    return errors;
  };

  const handleSubmit = async () => {
    console.log('=== 化糞池工時提交除錯開始 ===')
    
    const errors = validateData();
    if (errors.length > 0) {
      setError('請修正以下問題：\n' + errors.join('\n'));
      return;
    }
    
    setSubmitting(true);
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

      // 步驟2：準備化糞池數據（轉換為月份格式以符合 API）
      const monthly: Record<string, number> = {}
      monthlyData.forEach((data, index) => {
        if (data.hours > 0) {
          monthly[(index + 1).toString()] = data.hours
        }
      })

      // 步驟3：建立填報輸入資料
      const entryInput: UpsertEntryInput = {
        page_key: pageKey,
        period_year: currentYear,
        unit: '小時',
        monthly: monthly,
        extraPayload: {
          septicTankData: monthlyData,
          yearlyTotal: yearlyTotal,
          notes: `化糞池工時記錄，年總工時：${yearlyTotal.toFixed(1)} 小時`
        }
      }

      // 步驟4：使用診斷包裝執行關鍵操作
      const { entry_id } = await debugRLSOperation(
        '新增或更新能源填報記錄',
        async () => await upsertEnergyEntry(entryInput, true)
      )

      // 步驟5：設置 entryId（如果是新建的記錄）
      if (!currentEntryId) {
        setCurrentEntryId(entry_id)
      }

      // 步驟5.5：批次上傳記憶體檔案
      console.log('📁 [SepticTank] Starting memory files upload...')
      const memoryFiles = annualEvidence.memoryFiles || []
      console.log('📁 [SepticTank] Memory files to upload:', {
        memoryFilesCount: memoryFiles.length
      })

      const uploadedFiles: EvidenceFile[] = []

      try {
        // 上傳年度佐證記憶體檔案
        if (memoryFiles.length > 0) {
          console.log(`📁 [SepticTank] Uploading ${memoryFiles.length} annual evidence memory files...`)
          for (const memoryFile of memoryFiles) {
            const uploadedFile = await uploadEvidenceWithEntry(memoryFile.file, {
              entryId: entry_id,
              pageKey,
              year: currentYear,
              category: 'usage_evidence'
            })
            uploadedFiles.push(uploadedFile)
            console.log(`✅ [SepticTank] Annual evidence file uploaded: ${uploadedFile.file_name}`)
          }
        }

        console.log(`✅ [SepticTank] All memory files uploaded successfully: ${uploadedFiles.length} files`)

        // 清空記憶體檔案
        setAnnualEvidence(prev => ({
          ...prev,
          memoryFiles: []
        }))

        // 更新檔案狀態
        const newAnnualFiles = [...annualEvidence.files, ...uploadedFiles]
        setAnnualEvidence(prev => ({
          ...prev,
          files: newAnnualFiles
        }))

      } catch (uploadError) {
        console.error('❌ [SepticTank] Memory files upload failed:', uploadError)
        throw new Error(`檔案上傳失敗: ${uploadError instanceof Error ? uploadError.message : '未知錯誤'}`)
      }

      // 步驟6：使用改進的錯誤恢復機制關聯檔案
      const allFiles = annualEvidence.files
      const unassociatedFiles = allFiles.filter(f => !f.entry_id)
      
      if (unassociatedFiles.length > 0) {
        console.log(`🔗 準備關聯 ${unassociatedFiles.length} 個檔案`)
        
        // 使用 Promise.allSettled 允許部分失敗
        const results = await Promise.allSettled(
          unassociatedFiles.map(file => 
            updateFileEntryAssociation(file.id, entry_id)
          )
        )
        
        // 統計結果
        const succeeded = results.filter(r => r.status === 'fulfilled').length
        const failed = results.filter(r => r.status === 'rejected').length
        
        console.log(`📊 檔案關聯結果: ${succeeded} 成功, ${failed} 失敗`)
        
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
        setAnnualEvidence(prev => ({
          ...prev,
          files: prev.files.map(f => {
            const updated = unassociatedFiles.find(uf => uf.id === f.id)
            return updated ? { ...f, entry_id: updated.entry_id } : f
          })
        }))
      }

      // 步驟7：處理狀態轉換
      await handleSubmitSuccess()
      
      setHasChanges(false)
      setHasSubmittedBefore(true)

      setSuccess(`化糞池工時數據已提交，總計 ${yearlyTotal.toFixed(1)} 小時`)
      
      console.log('=== ✅ 化糞池工時提交成功完成 ===')

    } catch (error) {
      console.error('=== ❌ 化糞池工時提交失敗 ===')
      console.error('錯誤訊息:', error instanceof Error ? error.message : String(error))
      setError(error instanceof Error ? error.message : '提交失敗')
    } finally {
      setSubmitting(false)
    }
  };

  const handleClear = async () => {
    console.log('🗑️ [SepticTankPage] ===== CLEAR BUTTON CLICKED =====')

    const clearSuccess = DocumentHandler.handleClear({
      currentStatus: currentStatus,
      title: '化糞池資料清除',
      message: '確定要清除所有化糞池使用資料嗎？此操作無法復原。',
      onClear: () => {
        setSubmitting(true)
        try {
          console.log('🗑️ [SepticTankPage] Starting complete clear operation...')

          // 清理記憶體檔案
          if (annualEvidence.memoryFiles) {
            DocumentHandler.clearAllMemoryFiles(annualEvidence.memoryFiles)
          }

          // 原有的清除邏輯保持不變
          setMonthlyData(prev =>
            prev.map(data => ({
              ...data,
              hours: 0
            }))
          )
          setAnnualEvidence({ files: [], memoryFiles: [] })
          setHasChanges(false)
          setError(null)
          setSuccess(null)

          setSuccess('資料已清除')

        } catch (error) {
          console.error('❌ [SepticTankPage] Clear operation failed:', error)
          setError('清除操作失敗，請重試')
        } finally {
          console.log('🗑️ [SepticTankPage] Clear operation finished, resetting loading state')
          setSubmitting(false)
        }
      }
    })

    if (!clearSuccess && currentStatus === 'approved') {
      setError('已通過的資料無法清除')
    }
  };

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
      {/* 主要內容區域 */}
      <div className="max-w-4xl mx-auto px-6 py-8 space-y-6">

        {/* 頁面標題 - 無背景框 */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-center mb-2">
            化糞池 使用數量填報
          </h1>
          <p className="text-lg text-center text-gray-600 mb-6">
            請上傳 MSDS 文件並填入各月份使用數據進行碳排放計算
          </p>
        </div>

        {/* 重新提交提示 */}
        {hasSubmittedBefore && !success && (
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
            年度佐證資料
          </h2>
          <div className="bg-gray-50 rounded-lg p-4">
            <EvidenceUpload
              pageKey={pageKey}
              files={annualEvidence.files}
              onFilesChange={updateAnnualEvidence}
              memoryFiles={annualEvidence.memoryFiles || []}
              onMemoryFilesChange={(files) => setAnnualEvidence(prev => ({ ...prev, memoryFiles: files }))}
              maxFiles={10}
              disabled={submitting || !editPermissions.canUploadFiles}
              kind="other"
              mode="edit"
            />
          </div>
          <p className="text-sm text-gray-600 mt-3">
            請上傳年度相關的佐證文件（如 MSDS 文件、使用紀錄、Excel統計表等），支援多檔案上傳。<br/>
            支援格式：圖片 (JPG, PNG)、PDF、Excel (XLSX, XLS)
          </p>
        </div>

        {/* 月份工時數據 */}
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
            月份工時數據
          </h2>

          {/* 月份網格布局 */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            {monthlyData.map((data, index) => (
              <div
                key={data.month}
                className="border border-gray-200 rounded-lg p-4 bg-white hover:shadow-md transition-shadow flex flex-col items-center"
              >
                {/* 月份標題 */}
                <span className="text-2xl font-bold text-gray-900 mb-3">
                  {monthLabels[index]}
                </span>

                {/* 輸入框（已隱藏上下箭頭，刪掉「小時」） */}
                <input
                  type="number"
                  min={0}
                  step={0.1}
                  value={data.hours === 0 ? "" : data.hours}
                  onFocus={(e) => {
                    if (e.target.value === "0") e.target.value = "";
                  }}
                  onBlur={(e) => {
                    if (e.target.value === "") {
                      updateMonthData(index, "hours", 0);
                    }
                  }}
                  onChange={(e) => {
                    const val = e.target.value;
                    updateMonthData(
                      index,
                      "hours",
                      val === "" ? 0 : parseFloat(val)
                    );
                  }}
                  className="
                    w-24 px-3 py-2 text-lg text-center
                    border border-gray-300 rounded-lg
                    focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500
                    hover:border-brand-300 transition-colors duration-200

                    [appearance:textfield]
                    [&::-webkit-outer-spin-button]:appearance-none
                    [&::-webkit-inner-spin-button]:appearance-none
                  "
                  placeholder="工時"
                  aria-label={`${monthLabels[index]} 總工時`}
                />
              </div>
            ))}
          </div>

          {/* 年度合計 */}
          <div className="bg-gradient-to-r from-brand-100 to-brand-50 rounded-lg p-4 border-2 border-brand-300">
            <div className="flex items-center justify-center space-x-4">
              <div className="flex items-center space-x-2">
                <span className="text-lg font-bold text-brand-800">年度合計</span>
              </div>
              <div className="px-6 py-3 bg-gradient-to-r from-brand-600 to-brand-700 text-white font-bold text-xl rounded-lg shadow-lg">
                {yearlyTotal.toFixed(1)} 小時
              </div>
            </div>
          </div>
        </div>

        {/* 年度佐證資料 */}


        {/* 底部空間，避免內容被固定底部欄遮擋 */}
        <div className="h-20"></div>
      </div>

      {/* 錯誤訊息模態框 */}
      {error && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
          <div 
            className="bg-white rounded-lg shadow-lg max-w-md w-full"
            style={{ borderRadius: designTokens.borderRadius?.lg || '0.5rem' }}
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
                            className="font-medium mb-2 text-lg"
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
                            <span className="text-base" style={{ color: designTokens.colors.textSecondary }}>
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

      {/* 統一底部操作欄 */}
      <BottomActionBar
        currentStatus={currentStatus}
        currentEntryId={currentEntryId}
        isUpdating={false}
        hasSubmittedBefore={hasSubmittedBefore}
        hasAnyData={hasAnyData}
        editPermissions={editPermissions}
        submitting={submitting}
        onSubmit={handleSubmit}
        onClear={handleClear}
        designTokens={designTokens}
      />
    </div>
  );
}
