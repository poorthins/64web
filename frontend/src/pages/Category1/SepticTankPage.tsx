import { useState, useMemo, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Loader2, AlertCircle, CheckCircle, X } from 'lucide-react';
import EvidenceUpload from '../../components/EvidenceUpload';
import { MemoryFile } from '../../components/EvidenceUpload';
import BottomActionBar from '../../components/BottomActionBar';
import { EntryStatus } from '../../components/StatusSwitcher';
import ReviewSection from '../../components/ReviewSection';
import { useEditPermissions } from '../../hooks/useEditPermissions';
import { useGhostFileCleaner } from '../../hooks/useGhostFileCleaner';
import { useFrontendStatus } from '../../hooks/useFrontendStatus';
import { useStatusBanner, getBannerColorClasses } from '../../hooks/useStatusBanner';
import { useEnergyData } from '../../hooks/useEnergyData';
import { useEnergySubmit } from '../../hooks/useEnergySubmit';
import { useEnergyClear } from '../../hooks/useEnergyClear';
import { useApprovalStatus } from '../../hooks/useApprovalStatus';
import { useRole } from '../../hooks/useRole'
import { useAdminSave } from '../../hooks/useAdminSave';
import { updateEntryStatus } from '../../api/entries';
import { EvidenceFile } from '../../api/files';
import { supabase } from '../../lib/supabaseClient';
import { designTokens } from '../../utils/designTokens';


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
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  // 審核模式檢測
  const isReviewMode = searchParams.get('mode') === 'review'
  const reviewEntryId = searchParams.get('entryId')
  const reviewUserId = searchParams.get('userId')

  const pageKey = 'septic_tank'
  const [year] = useState(new Date().getFullYear())
  const [initialStatus, setInitialStatus] = useState<EntryStatus>('submitted')
  const [currentEntryId, setCurrentEntryId] = useState<string | null>(null)
  const [hasSubmittedBefore, setHasSubmittedBefore] = useState(false)
  const [showSuccessModal, setShowSuccessModal] = useState(false)
  const [showClearConfirmModal, setShowClearConfirmModal] = useState(false)
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
    onStatusChange: () => {},
    onError: (error) => setError(error),
    onSuccess: (message) => setSuccess(message)
  })

  const { currentStatus, setCurrentStatus, handleDataChanged, handleSubmitSuccess, isInitialLoad } = frontendStatus

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

  // 狀態橫幅 Hook
  const banner = useStatusBanner(approvalStatus, isReviewMode)

  // 提交 Hook
  const { submit, save, submitting } = useEnergySubmit(pageKey, year, approvalStatus.status)  // ✅ 使用資料庫狀態

  // 角色檢查
  const { role } = useRole()

  // 審核模式下只有管理員可編輯
  const isReadOnly = isReviewMode && role !== 'admin'

  const editPermissions = useEditPermissions(currentStatus, isReadOnly, role)

  // 清除 Hook
  const {
    clear,
    clearing: clearLoading,
    error: clearError,
    clearError: clearClearError
  } = useEnergyClear(currentEntryId, currentStatus)

  // 幽靈檔案清理 Hook
  const { cleanFiles } = useGhostFileCleaner()

  // 管理員審核儲存 Hook
  const { save: adminSave, saving: adminSaving } = useAdminSave(pageKey, reviewEntryId)

  // 年總工時（自動計算）
  const yearlyTotal = useMemo(
    () => monthlyData.reduce((sum, data) => sum + (Number.isFinite(data.hours) ? data.hours : 0), 0),
    [monthlyData]
  );

  // 判斷是否有資料
  const hasAnyData = useMemo(() => {
    const hasMonthlyData = monthlyData.some(m => m.hours > 0)
    const hasFiles = annualEvidence.files.length > 0
    const hasMemoryFiles = (annualEvidence.memoryFiles || []).length > 0
    return hasMonthlyData || hasFiles || hasMemoryFiles
  }, [monthlyData, annualEvidence])

  // 第一步：載入記錄資料
  useEffect(() => {
    if (loadedEntry && !dataLoading) {
      const entryStatus = loadedEntry.status as EntryStatus
      setInitialStatus(entryStatus)
      setCurrentStatus(entryStatus)  // 同步前端狀態
      setCurrentEntryId(loadedEntry.id)
      setHasSubmittedBefore(true)

      // 從 payload 載入月份數據
      // ✅ 向後相容：同時支援新格式 septicTankData 和舊格式 monthly
      if (loadedEntry.payload?.septicTankData) {
        // 新格式：septicTankData
        setMonthlyData(loadedEntry.payload.septicTankData)
        console.log(`🔍 [SepticTankPage] Loaded ${loadedEntry.payload.septicTankData.length} months from septicTankData`)
      } else if (loadedEntry.payload?.monthly) {
        // 舊格式：monthly（向後相容）
        const restoredData = Object.keys(loadedEntry.payload.monthly).map(month => ({
          month: parseInt(month),
          hours: loadedEntry.payload.monthly[month]
        }))

        const fullYearData = Array.from({ length: 12 }, (_, i) => {
          const monthData = restoredData.find(d => d.month === i + 1)
          return {
            month: i + 1,
            hours: monthData ? monthData.hours : 0
          }
        })
        setMonthlyData(fullYearData)
        console.log(`🔍 [SepticTankPage] Loaded from monthly (backward compatibility)`)
      }

      if (!isInitialLoad.current) {
        handleDataChanged()
      }
      isInitialLoad.current = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadedEntry, dataLoading])

  // 第二步：檔案載入後分配（年度佐證資料）
  useEffect(() => {
    if (loadedFiles.length > 0) {
      const cleanAndAssignFiles = async () => {
        console.log('🔍 [SepticTankPage] Starting ghost file cleanup for', loadedFiles.length, 'files')

        // 清理幽靈檔案
        const validFiles = await cleanFiles(loadedFiles)
        console.log('✅ [SepticTankPage] Cleanup complete. Valid files:', validFiles.length)

        // 過濾年度佐證檔案（file_type='other'）
        const annualFiles = validFiles.filter(f =>
          f.file_type === 'other' && f.page_key === pageKey
        )

        console.log(`✅ [SepticTankPage] Assigned ${annualFiles.length} annual evidence files`)
        setAnnualEvidence({ files: annualFiles, memoryFiles: [] })
      }

      cleanAndAssignFiles()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadedFiles, pageKey])

  const updateMonthData = (index: number, field: keyof MonthData, value: any) => {
    setMonthlyData(prev => {
      const newData = [...prev];
      newData[index] = { ...newData[index], [field]: value };
      return newData;
    });
  };

  const updateAnnualEvidence = (files: EvidenceFile[]) => {
    setAnnualEvidence(prev => ({ ...prev, files }));
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
    const errors = validateData();
    if (errors.length > 0) {
      setError('請修正以下問題：\n' + errors.join('\n'));
      return;
    }

    try {
      // 準備月份數據
      const monthly: Record<string, number> = {}
      monthlyData.forEach((data, index) => {
        if (data.hours > 0) {
          monthly[(index + 1).toString()] = data.hours
        }
      })

      // 使用 useEnergySubmit Hook 提交
      const entry_id = await submit({
        formData: {
          unit: '小時',
          monthly: monthly,
          extraPayload: {
            septicTankData: monthlyData,
            yearlyTotal: yearlyTotal,
            notes: `化糞池工時記錄，年總工時：${yearlyTotal.toFixed(1)} 小時`
          }
        },
        msdsFiles: [],
        monthlyFiles: [],
        evidenceFiles: annualEvidence.memoryFiles || []
      })

      if (!currentEntryId) setCurrentEntryId(entry_id)

      // 重新載入
      await reload()

      await handleSubmitSuccess()
      setHasSubmittedBefore(true)

      // 重新載入審核狀態，更新狀態橫幅
      reloadApprovalStatus()

      setShowSuccessModal(true)
    } catch (error) {
      setError(error instanceof Error ? error.message : '提交失敗，請重試');
    }
  };

  const handleSave = async () => {
    try {
      // 準備月份數據（不驗證）
      const monthly: Record<string, number> = {}
      monthlyData.forEach((data, index) => {
        if (data.hours > 0) {
          monthly[(index + 1).toString()] = data.hours
        }
      })

      const totalHours = Object.values(monthly).reduce((sum, val) => sum + val, 0)

      // 審核模式：使用 useAdminSave hook
      if (isReviewMode && reviewEntryId) {
        console.log('📝 管理員審核模式：使用 useAdminSave hook', reviewEntryId)

        // 準備年度佐證檔案
        const filesToUpload: Array<{
          file: File
          metadata: {
            month?: number
            fileType?: 'msds' | 'usage_evidence' | 'other'
          }
        }> = [];

        // 收集年度佐證檔案
        (annualEvidence.memoryFiles || []).forEach((mf: { file: File }, index: number) => {
          filesToUpload.push({
            file: mf.file,
            metadata: {
              month: index + 1,
              fileType: 'other' as const
            }
          })
        })

        await adminSave({
          updateData: {
            unit: '小時',
            amount: totalHours,
            payload: {
              monthly,
              septicTankData: monthlyData,
              yearlyTotal: yearlyTotal,
              notes: `化糞池工時記錄，年總工時：${yearlyTotal.toFixed(1)} 小時`
            }
          },
          files: filesToUpload
        })

        await reload()
        reloadApprovalStatus()
        // 清空記憶體檔案（在 reload 之後，避免檔案暫時消失）
        setAnnualEvidence(prev => ({ ...prev, memoryFiles: [] }))
        setSuccess('✅ 儲存成功！資料已更新')
        setShowSuccessModal(true)
        return
      }

      // 非審核模式：原本的邏輯
      // 使用 save Hook 暫存
      const entry_id = await save({
        formData: {
          unit: '小時',
          monthly: monthly,
          extraPayload: {
            septicTankData: monthlyData,
            yearlyTotal: yearlyTotal,
            notes: `化糞池工時記錄，年總工時：${yearlyTotal.toFixed(1)} 小時`
          }
        },
        msdsFiles: [],
        monthlyFiles: [],
        evidenceFiles: annualEvidence.memoryFiles || []
      })

      if (!currentEntryId) setCurrentEntryId(entry_id)

      // 清空記憶體檔案
      setAnnualEvidence(prev => ({ ...prev, memoryFiles: [] }))

      // 重新載入
      await reload()

      // 重新載入審核狀態，更新狀態橫幅
      reloadApprovalStatus()

      setSuccess('資料已暫存')
      setShowSuccessModal(true)
    } catch (error) {
      setError(error instanceof Error ? error.message : '暫存失敗，請重試');
    }
  };

  const handleClear = async () => {
    setShowClearConfirmModal(true)
  }

  const confirmClear = async () => {
    setShowClearConfirmModal(false)

    try {
      await clear({
        filesToDelete: annualEvidence.files,
        memoryFilesToClean: [annualEvidence.memoryFiles || []]
      })

      // 清除前端狀態
      setMonthlyData(Array.from({ length: 12 }, (_, i) => ({
        month: i + 1,
        hours: 0
      })))
      setAnnualEvidence({ files: [], memoryFiles: [] })
      setCurrentEntryId(null)
      setHasSubmittedBefore(false)
      setSuccess('資料已完全清除')

      console.log('✅ [SepticTankPage] All data cleared successfully')
    } catch (error) {
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
            請填入各月份工時數據並上傳年度佐證資料進行碳排放計算
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
              maxFiles={15}
              disabled={submitting || isReadOnly || approvalStatus.isApproved}
              kind="other"
              mode={isReadOnly || approvalStatus.isApproved ? "view" : "edit"}
                            isAdminReviewMode={isReviewMode && role === 'admin'}
            />
          </div>
          <p className="text-sm text-gray-600 mt-3">
            請上傳年度相關的佐證文件（如 MSDS 文件、使用紀錄、Excel統計表等），支援多檔案上傳。<br/>
            支援所有檔案類型，最大 10MB
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
                  disabled={isReadOnly || approvalStatus.isApproved}
                  className={`
                    w-24 px-3 py-2 text-lg text-center
                    border border-gray-300 rounded-lg
                    focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500
                    hover:border-brand-300 transition-colors duration-200

                    [appearance:textfield]
                    [&::-webkit-outer-spin-button]:appearance-none
                    [&::-webkit-inner-spin-button]:appearance-none

                    ${isReadOnly || approvalStatus.isApproved ? 'bg-gray-100 cursor-not-allowed' : ''}
                  `}
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

        {/* 底部空間，避免內容被固定底部欄遮擋 */}
        <div className="h-20"></div>
      </div>

      {/* 成功提交模態框 */}
      {showSuccessModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
          <div
            className="bg-white rounded-lg shadow-lg max-w-md w-full"
            style={{ borderRadius: designTokens.borderRadius?.lg || '0.5rem' }}
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
                      • 更新月份工時數據
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

      {/* 審核區塊 - 只在審核模式顯示 */}
      {isReviewMode && currentEntryId && (
        <ReviewSection
          entryId={reviewEntryId || currentEntryId}
          userId={reviewUserId || "current_user"}
          category="化糞池"
          userName={reviewUserId || "用戶"}
          amount={monthlyData.reduce((sum, data) => sum + data.hours, 0)}
          unit="小時"
          role={role}
          onSave={handleSave}
          isSaving={submitting}
          onApprove={() => {
            console.log('✅ 化糞池填報審核通過 - 由 ReviewSection 處理')
          }}
          onReject={(reason) => {
            console.log('❌ 化糞池填報已退回 - 由 ReviewSection 處理:', reason)
          }}
        />
      )}

      {/* 統一底部操作欄 - 唯讀模式下隱藏，審核通過時也隱藏 */}
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
          onClear={handleClear}
          designTokens={designTokens}
        />
      )}

      {/* 清除確認模態框 */}
      {showClearConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
          <div
            className="bg-white rounded-lg shadow-lg max-w-md w-full"
            style={{ borderRadius: designTokens.borderRadius?.lg || '0.5rem' }}
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
                    確定要清除所有化糞池使用資料嗎？此操作無法復原。
                  </p>
                </div>
              </div>
              <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3">
                <button
                  onClick={confirmClear}
                  disabled={clearLoading}
                  className="flex-1 px-4 py-2 rounded-lg font-medium text-white transition-colors disabled:opacity-50"
                  style={{ backgroundColor: designTokens.colors.error }}
                >
                  {clearLoading ? '清除中...' : '確認清除'}
                </button>
                <button
                  onClick={() => setShowClearConfirmModal(false)}
                  disabled={clearLoading}
                  className="flex-1 px-4 py-2 rounded-lg font-medium transition-colors border disabled:opacity-50"
                  style={{
                    color: designTokens.colors.textPrimary,
                    borderColor: designTokens.colors.border,
                    backgroundColor: 'white'
                  }}
                >
                  取消
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
