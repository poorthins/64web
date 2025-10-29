import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom'
import { AlertCircle, X, Trash2, Eye, Loader2, CheckCircle } from 'lucide-react'
import EvidenceUpload from '../../components/EvidenceUpload';
import { MemoryFile } from '../../components/EvidenceUpload';
import { EntryStatus } from '../../components/StatusSwitcher';
import BottomActionBar from '../../components/BottomActionBar';
import ReviewSection from '../../components/ReviewSection'
import { useEditPermissions } from '../../hooks/useEditPermissions';
import { useFrontendStatus } from '../../hooks/useFrontendStatus';
import { useApprovalStatus } from '../../hooks/useApprovalStatus';
import { useEnergyData } from '../../hooks/useEnergyData'
import { useMultiRecordSubmit } from '../../hooks/useMultiRecordSubmit'
import { useEnergyClear } from '../../hooks/useEnergyClear'
import { useSubmitGuard } from '../../hooks/useSubmitGuard'
import { useGhostFileCleaner } from '../../hooks/useGhostFileCleaner'
import { useRecordFileMapping } from '../../hooks/useRecordFileMapping'
import { useSubmissions } from '../admin/hooks/useSubmissions'
import { useRole } from '../../hooks/useRole'
import { useAdminSave } from '../../hooks/useAdminSave'
import { updateEntryStatus, getEntryByPageKeyAndYear, upsertEnergyEntry, deleteEnergyEntry } from '../../api/entries';
import { getEntryFiles, EvidenceFile, uploadEvidenceWithEntry, updateFileEntryAssociation, deleteEvidenceFile } from '../../api/files';
import { supabase } from '../../lib/supabaseClient';
import { designTokens } from '../../utils/designTokens';
import { DocumentHandler } from '../../services/documentHandler';
import Toast, { ToastType } from '../../components/Toast';


interface RefrigerantData {
  id: string;  // ⭐ 改用 string（穩定的 recordId）
  brandName: string;      // 廠牌名稱
  modelNumber: string;    // 型號
  equipmentLocation: string;
  refrigerantType: string;
  fillAmount: number;
  unit: 'gram' | 'kg';
  proofFile: File | null;
  evidenceFiles?: EvidenceFile[];
  memoryFiles?: MemoryFile[];
  isExample?: boolean; // 範例列
}



// 固定的「範例列」，會放在第一列、不可編輯/不可刪除/不參與送出
const EXAMPLE_ROW: RefrigerantData = {
  id: 'example',  // ⭐ 字串 ID
  brandName: '三洋',
  modelNumber: 'SR-480BV5',
  equipmentLocation: 'A棟5樓529辦公室',
  refrigerantType: 'HFC-134a',
  fillAmount: 120,
  unit: 'gram',
  proofFile: null,
  isExample: true,
};

// 把 rows 排序成：範例列永遠第一，其餘照原順序
const withExampleFirst = (rows: RefrigerantData[]) => {
  const others = rows.filter(r => !r.isExample);
  return [EXAMPLE_ROW, ...others];
};

export default function RefrigerantPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  // 審核模式檢測
  const isReviewMode = searchParams.get('mode') === 'review'
  const reviewEntryId = searchParams.get('entryId')
  const reviewUserId = searchParams.get('userId')

  const pageKey = 'refrigerant'
  const [year] = useState(new Date().getFullYear())
  const [initialStatus, setInitialStatus] = useState<EntryStatus>('submitted')
  const [currentEntryId, setCurrentEntryId] = useState<string | null>(null)
  const { executeSubmit, submitting } = useSubmitGuard()
  const [hasSubmittedBefore, setHasSubmittedBefore] = useState(false)
  const [showSuccessModal, setShowSuccessModal] = useState(false)
  const [showClearConfirmModal, setShowClearConfirmModal] = useState(false)

  // 圖片放大 lightbox
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setLightboxSrc(null) }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // 前端狀態管理 Hook
  const frontendStatus = useFrontendStatus({
    initialStatus,
    entryId: currentEntryId,
    onStatusChange: () => {},
    onError: (error) => setError(error),
    onSuccess: (message) => setSuccess(message)
  })

  const { currentStatus, setCurrentStatus, handleDataChanged, handleSubmitSuccess, isInitialLoad } = frontendStatus

  // 角色檢查 Hook
  const { role } = useRole()
  const isReadOnly = isReviewMode && role !== 'admin'

  // 管理員審核儲存 Hook
  const { save: adminSave, saving: adminSaving } = useAdminSave(pageKey, reviewEntryId)

  const editPermissions = useEditPermissions(currentStatus, isReadOnly)

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

  // 審核 API hook
  const { reviewSubmission } = useSubmissions()

  // 提交 Hook（多記錄專用）
  const {
    submit,
    save,
    submitting: submitLoading,
    error: submitError,
    success: submitSuccess,
    clearError: clearSubmitError,
    clearSuccess: clearSubmitSuccess
  } = useMultiRecordSubmit(pageKey, year)

  // 清除 Hook
  const {
    clear,
    clearing: clearLoading,
    error: clearError,
    clearError: clearClearError
  } = useEnergyClear(currentEntryId, currentStatus)

  // 幽靈檔案清理 Hook
  const { cleanFiles } = useGhostFileCleaner()

  // 檔案映射 Hook
  const {
    uploadRecordFiles,
    getRecordFiles,
    loadFileMapping,
    getFileMappingForPayload,
    removeRecordMapping
  } = useRecordFileMapping(pageKey, currentEntryId)

  const [refrigerantData, setRefrigerantData] = useState<RefrigerantData[]>(
    withExampleFirst([
      {
        id: `${pageKey}_${Date.now()}`,  // ⭐ 穩定的 recordId
        brandName: '',
        modelNumber: '',
        equipmentLocation: '',
        refrigerantType: '',
        fillAmount: 0,
        unit: 'kg',
        proofFile: null,
        memoryFiles: []
      },
    ])
  );

  // 只看「非範例」列是否有資料
  const hasAnyData = useMemo(() => {
    const userRows = refrigerantData.filter(r => !r.isExample)
    return userRows.some(r =>
      r.brandName.trim() !== '' ||
      r.modelNumber.trim() !== '' ||
      r.equipmentLocation.trim() !== '' ||
      r.fillAmount > 0 ||
      (r.memoryFiles && r.memoryFiles.length > 0)
    )
  }, [refrigerantData])

  // 第一步：載入設備資料（不等檔案）
  useEffect(() => {
    if (loadedEntry && !dataLoading) {
      const entryStatus = loadedEntry.status as EntryStatus
      setInitialStatus(entryStatus)
      setCurrentStatus(entryStatus)  // 同步前端狀態
      setCurrentEntryId(loadedEntry.id)
      setHasSubmittedBefore(true)

      // 從 payload 取得冷媒設備資料
      if (loadedEntry.payload?.refrigerantData) {
        // 先載入設備資料，檔案欄位暫時為空（不阻塞顯示）
        const updated = loadedEntry.payload.refrigerantData.map((item: any) => ({
          ...item,
          id: String(item.id),  // ⭐ 強制轉換成 string（向後相容舊資料）
          evidenceFiles: [],  // 先空著，稍後由檔案載入 useEffect 分配
          memoryFiles: [],
          proofFile: null
        }))

        const withExample = withExampleFirst(updated.filter((r: RefrigerantData) => !r.isExample))
        setRefrigerantData(withExample)  // 立即顯示設備資料

        // ⭐ 載入 fileMapping（還原檔案映射表）
        loadFileMapping(loadedEntry.payload)
      }

      if (!isInitialLoad.current) {
        handleDataChanged()
      }
      isInitialLoad.current = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadedEntry, dataLoading])

  // 第二步：檔案載入後分配到設備（不阻塞）
  useEffect(() => {
    // ⭐ 防止 Race Condition：等待檔案載入完成
    if (dataLoading) {
      console.log('🔍 [RefrigerantPage] 等待檔案載入中...')
      return
    }

    if (loadedFiles.length > 0 && refrigerantData.length > 1) {
      // 檔案過濾：只取 file_type='other' 的檔案
      const refrigerantFiles = loadedFiles.filter(f =>
        f.file_type === 'other' && f.page_key === pageKey
      )

      if (refrigerantFiles.length > 0) {
        // ✅ 先清理幽靈檔案，再分配
        const cleanAndAssignFiles = async () => {
          const validFiles = await cleanFiles(refrigerantFiles)
          console.log('✅ [RefrigerantPage] Valid files after cleanup:', validFiles.length)

          setRefrigerantData(prev => {
            const userRows = prev.filter(r => !r.isExample)
            // ⭐ 使用 recordId 查詢檔案（不再用陣列索引）
            const updated = userRows.map((item) => {
              const recordFiles = getRecordFiles(item.id, validFiles)
              return {
                ...item,
                evidenceFiles: recordFiles,
                memoryFiles: []  // ✅ 清空 memoryFiles，避免重複提交
              }
            })
            return withExampleFirst(updated)
          })
        }

        cleanAndAssignFiles()
      }
    }
  }, [loadedFiles, pageKey, dataLoading, cleanFiles, getRecordFiles])

  const addNewEntry = () => {
    const newEntry: RefrigerantData = {
      id: `${pageKey}_${Date.now()}`,  // ⭐ 穩定的 recordId
      brandName: '',
      modelNumber: '',
      equipmentLocation: '',
      refrigerantType: '',
      fillAmount: 0,
      unit: 'kg',
      proofFile: null,
      memoryFiles: []
    };
    setRefrigerantData(prev => withExampleFirst([...prev.filter(r => !r.isExample), newEntry]));
  };

  const removeEntry = (id: string) => {  // ⭐ 改成 string
    const row = refrigerantData.find(r => r.id === id)
    if (row?.isExample) return; // 範例不可刪
    const others = refrigerantData.filter(r => !r.isExample)
    if (others.length > 1) {
      setRefrigerantData(withExampleFirst(others.filter(r => r.id !== id)))
      // ⭐ 清理映射表
      removeRecordMapping(id)
    }
  };

  const updateEntry = useCallback((id: string, field: keyof RefrigerantData, value: any) => {  // ⭐ 改成 string
    setRefrigerantData(prev => {
      const target = prev.find(r => r.id === id);
      if (target?.isExample) return prev;

      return withExampleFirst(
        prev
          .filter(r => !r.isExample)
          .map(item => item.id === id ? { ...item, [field]: value } : item)
      );
    });
  }, []);

  // 為每個設備項目建立穩定的 callback
  const handleMemoryFilesChange = useCallback((id: string) => {  // ⭐ 改成 string
    return (files: MemoryFile[]) => updateEntry(id, 'memoryFiles', files);
  }, [updateEntry]);

  const handleSubmit = async () => {
    const errors: string[] = [];
    const userRows = refrigerantData.filter(r => !r.isExample)

    userRows.forEach((data, index) => {
      if (!data.brandName.trim()) errors.push(`第${index + 1}項廠牌名稱不能為空`);
      if (!data.modelNumber.trim()) errors.push(`第${index + 1}項型號不能為空`);
      if (!data.equipmentLocation.trim()) errors.push(`第${index + 1}項設備位置不能為空`);
      if (!data.refrigerantType.trim()) errors.push(`第${index + 1}項冷媒類型不能為空`);
      if (data.fillAmount <= 0) errors.push(`第${index + 1}項填充量必須大於0`);

      const hasMemoryFiles = data.memoryFiles && data.memoryFiles.length > 0
      const hasEvidenceFiles = data.evidenceFiles && data.evidenceFiles.length > 0
      if (!hasMemoryFiles && !hasEvidenceFiles) errors.push(`第${index + 1}項未上傳佐證資料`);
    });

    if (errors.length > 0) {
      setError('請修正以下問題：\n' + errors.join('\n'));
      return;
    }

    await executeSubmit(async () => {
      const totalFillAmount = userRows.reduce((sum, item) => {
        const amountInKg = item.unit === 'gram' ? item.fillAmount / 1000 : item.fillAmount
        return sum + amountInKg
      }, 0)

      const cleanedData = userRows.map(r => ({
        id: r.id,
        brandName: r.brandName,
        modelNumber: r.modelNumber,
        equipmentLocation: r.equipmentLocation,
        refrigerantType: r.refrigerantType,
        fillAmount: r.fillAmount,
        unit: r.unit
      }))

      // ⭐ 使用 hook 的 submit 函數
      await submit({
        entryInput: {
          page_key: pageKey,
          period_year: year,
          unit: 'kg',
          monthly: { '1': totalFillAmount },
          notes: `冷媒設備共 ${userRows.length} 台`,
          extraPayload: {
            refrigerantData: cleanedData
          }
        },
        recordData: userRows,
        uploadRecordFiles,
        onSuccess: async (entry_id) => {
          // 第二次儲存含 fileMapping
          await upsertEnergyEntry({
            page_key: pageKey,
            period_year: year,
            unit: 'kg',
            monthly: { '1': totalFillAmount },
            notes: `冷媒設備共 ${userRows.length} 台`,
            extraPayload: {
              refrigerantData: cleanedData,
              fileMapping: getFileMappingForPayload()
            }
          }, true)

          setCurrentEntryId(entry_id)
          await reload()
          setHasSubmittedBefore(true)
        }
      })

      await handleSubmitSuccess();

      // 重新載入審核狀態，更新狀態橫幅
      reloadApprovalStatus()

      setSuccess('冷媒設備資料已保存！');
      setShowSuccessModal(true)
    }).catch(error => {
      setError(error instanceof Error ? error.message : '提交失敗，請重試');
    })
  };

  const handleSave = async () => {
    await executeSubmit(async () => {
      setError(null)
      setSuccess(null)

      const userRows = refrigerantData.filter(r => !r.isExample)
      const totalFillAmount = userRows.reduce((sum, item) => {
        const amountInKg = item.unit === 'gram' ? item.fillAmount / 1000 : item.fillAmount
        return sum + amountInKg
      }, 0)

      const cleanedData = userRows.map(r => ({
        id: r.id,
        brandName: r.brandName,
        modelNumber: r.modelNumber,
        equipmentLocation: r.equipmentLocation,
        refrigerantType: r.refrigerantType,
        fillAmount: r.fillAmount,
        unit: r.unit
      }))

      // 📝 管理員審核模式：使用 useAdminSave hook
      if (isReviewMode && reviewEntryId) {
        console.log('📝 管理員審核模式：使用 useAdminSave hook', reviewEntryId)

        // 準備檔案列表
        const filesToUpload: Array<{
          file: File
          metadata: {
            recordIndex: number
            fileType: 'usage_evidence' | 'msds' | 'other'
          }
        }> = []

        // 收集每筆設備的銘牌檔案
        userRows.forEach((record, recordIndex) => {
          if (record.memoryFiles && record.memoryFiles.length > 0) {
            record.memoryFiles.forEach(mf => {
              filesToUpload.push({
                file: mf.file,
                metadata: {
                  recordIndex,
                  fileType: 'other' as const
                }
              })
            })
          }
        })

        await adminSave({
          updateData: {
            unit: 'kg',
            amount: totalFillAmount,
            payload: {
              refrigerantData: cleanedData,
              fileMapping: getFileMappingForPayload()
            }
          },
          files: filesToUpload
        })

        // 清空記憶體檔案
        setRefrigerantData(prev => {
          const userRows = prev.filter(r => !r.isExample)
          const cleared = userRows.map(r => ({ ...r, memoryFiles: [] }))
          return withExampleFirst(cleared)
        })

        await reload()
        reloadApprovalStatus()
        setSuccess('✅ 儲存成功！資料已更新')
        return
      }

      // ⭐ 使用 hook 的 save 函數（跳過驗證）
      await save({
        entryInput: {
          page_key: pageKey,
          period_year: year,
          unit: 'kg',
          monthly: { '1': totalFillAmount },
          notes: `冷媒設備共 ${userRows.length} 台`,
          extraPayload: {
            refrigerantData: cleanedData
          }
        },
        recordData: userRows,
        uploadRecordFiles,
        onSuccess: async (entry_id) => {
          await upsertEnergyEntry({
            page_key: pageKey,
            period_year: year,
            unit: 'kg',
            monthly: { '1': totalFillAmount },
            notes: `冷媒設備共 ${userRows.length} 台`,
            extraPayload: {
              refrigerantData: cleanedData,
              fileMapping: getFileMappingForPayload()
            }
          }, true)

          setCurrentEntryId(entry_id)
          await reload()
          setHasSubmittedBefore(true)
        }
      })

      // 重新載入審核狀態，更新狀態橫幅
      reloadApprovalStatus()

      setSuccess('暫存成功！資料已儲存')
    }).catch(error => {
      console.error('❌ 暫存失敗:', error)
      setError(error instanceof Error ? error.message : '暫存失敗')
    })
  };

  const handleClear = () => {
    setShowClearConfirmModal(true);
  };

  const handleClearConfirm = async () => {
    try {
      // 收集所有檔案和記憶體檔案（排除範例列）
      const allFiles = refrigerantData
        .filter(r => !r.isExample)
        .flatMap(r => r.evidenceFiles || [])

      const allMemoryFiles = refrigerantData
        .filter(r => !r.isExample)
        .map(r => r.memoryFiles || [])

      // 使用 Hook 清除
      await clear({
        filesToDelete: allFiles,
        memoryFilesToClean: allMemoryFiles
      })

      // 重置前端狀態
      setRefrigerantData(withExampleFirst([{
        id: `${pageKey}_${Date.now()}`,  // ⭐ 穩定的 recordId
        brandName: '',
        modelNumber: '',
        equipmentLocation: '',
        refrigerantType: '',
        fillAmount: 0,
        unit: 'kg',
        proofFile: null,
        memoryFiles: []
      }]))
      setCurrentEntryId(null)
      setHasSubmittedBefore(false)
      setShowClearConfirmModal(false)
      setSuccess('資料已完全清除')
    } catch (error) {
      setError(error instanceof Error ? error.message : '清除失敗，請重試')
    }
  };

  const handleStatusChange = async (newStatus: EntryStatus) => {
    try {
      if (currentEntryId) await updateEntryStatus(currentEntryId, newStatus as 'draft' | 'submitted' | 'approved' | 'rejected')
      frontendStatus.setFrontendStatus(newStatus)
    } catch (error) {
      console.error('Status update failed:', error)
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
      <div className="px-6 py-8">
        <div className="text-center mb-8">
          {/* 審核模式指示器 */}
          {isReviewMode && (
            <div className="mb-4 p-3 bg-orange-100 border-2 border-orange-300 rounded-lg max-w-4xl mx-auto">
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
            冷媒使用量填報
          </h1>
          <p className="text-base" style={{ color: designTokens.colors.textSecondary }}>
            {isReviewMode
              ? '管理員審核模式 - 檢視填報內容和相關檔案'
              : '請上傳設備後方的銘牌做為佐證文件，並完整填寫冷媒種類與填充量等設備資料'
            }
          </p>
        </div>

        {/* 審核狀態橫幅 */}
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
          <div className="bg-green-100 border-l-4 border-green-500 text-green-700 p-4 mb-6 rounded-r-lg max-w-4xl mx-auto">
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
          <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-6 rounded-r-lg max-w-4xl mx-auto">
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
          <div className="bg-blue-100 border-l-4 border-blue-500 text-blue-700 p-4 mb-6 rounded-r-lg max-w-4xl mx-auto">
            <div className="flex items-center">
              <div className="text-2xl mr-3">📋</div>
              <div>
                <p className="font-bold text-lg">等待審核中</p>
                <p className="text-sm mt-1">您的填報已提交，請等待管理員審核。</p>
              </div>
            </div>
          </div>
        )}

        {/* 外層白色卡片：置中 + 自動包住內容寬度 */}
        <div className="flex justify-center">
          <div
            className="rounded-lg border p-6 mx-auto w-fit"
            style={{
              backgroundColor: designTokens.colors.cardBg,
              borderColor: designTokens.colors.border,
              boxShadow: designTokens.shadows.sm,
            }}
          >
            <h3 className="text-lg font-medium mb-4 text-center" style={{ color: designTokens.colors.textPrimary }}>
              冷媒設備資料
            </h3>

            {/* 這層控制填寫區總寬度（表格 + 下方按鈕都一起） */}
            <div className="w-[1300px] mx-auto">{/* ← 調整填寫區寬度：把 1800 改成你要的值，例如 w-[1600px] */}
            <table className="w-full table-fixed border-collapse bg-white border border-gray-200 rounded-lg">
              <thead>
                <tr className="bg-brand-500">
                  <th className="px-3 py-4 text-center text-base font-semibold text-white border-r border-brand-400/30 min-w-[120px]">廠牌名稱</th>
                  <th className="px-3 py-4 text-center text-base font-semibold text-white border-r border-brand-400/30 min-w-[130px]">型號</th>
                  <th className="px-3 py-4 text-center text-base font-semibold text-white border-r border-brand-400/30 min-w-[160px]">設備位置</th>
                  <th className="px-3 py-4 text-center text-base font-semibold text-white border-r border-brand-400/30 min-w-[120px]">冷媒類型</th>
                  <th className="px-3 py-4 text-center text-base font-semibold text-white border-r border-brand-400/30 min-w-[100px]">填充量</th>
                  <th className="px-3 py-4 text-center text-base font-semibold text-white border-r border-brand-400/30 min-w-[80px]">單位</th>
                  <th className="px-3 py-4 text-center text-base font-semibold text-white border-r border-brand-400/30 w-64">佐證資料</th>
                  <th className="px-3 py-4 text-center text-base font-semibold text-white whitespace-nowrap min-w-[80px]">編輯</th>
                </tr>
              </thead>

              <tbody>
                {refrigerantData.map((data, index) => {
                  if (data.isExample) {
                    return (
                      <tr key={data.id} className="bg-gray-50 border-b border-gray-100 text-center">
                        <td className="px-3 py-4 text-gray-700">{data.brandName}</td>
                        <td className="px-3 py-4 text-gray-700">{data.modelNumber}</td>
                        <td className="px-3 py-4 text-gray-700 whitespace-nowrap">{data.equipmentLocation}</td>
                        <td className="px-3 py-4 text-gray-700">{data.refrigerantType}</td>
                        <td className="px-3 py-4 text-gray-700">{data.fillAmount}</td>
                        <td className="px-3 py-4 text-gray-700">{data.unit === 'gram' ? '公克' : '公斤'}</td>
                        <td className="px-3 py-4">
                          <div className="flex flex-col items-center space-y-2">
                            <img
                              src="/refrigerant-example.png"
                              alt="範例：三陽SR-480BV5 銘牌"
                              className="w-44 h-auto rounded border cursor-zoom-in"
                              loading="lazy"
                              onClick={() => setLightboxSrc('/refrigerant-example.png')}
                            />
                          </div>
                        </td>
                        <td className="px-3 py-4 text-center">
                          <span className="inline-block px-2 py-1 text-xs rounded bg-gray-200 text-gray-700 select-none">範例</span>
                        </td>
                      </tr>
                    )
                  }

                  return (
                    <tr key={data.id} className="hover:bg-brand-50 transition-colors duration-200 border-b border-gray-100">
                      <td className="px-3 py-4 break-words">
                        <input
                          type="text"
                          value={data.brandName}
                          onChange={(e) => updateEntry(data.id, 'brandName', e.target.value)}
                          disabled={isReadOnly || approvalStatus.isApproved}
                          className={`w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 hover:border-brand-300 transition-colors duration-200 ${
                            isReviewMode || approvalStatus.isApproved ? 'bg-gray-100 cursor-not-allowed' : ''
                          }`}
                        />
                      </td>
                      <td className="px-3 py-4 break-words">
                        <input
                          type="text"
                          value={data.modelNumber}
                          onChange={(e) => updateEntry(data.id, 'modelNumber', e.target.value)}
                          disabled={isReadOnly || approvalStatus.isApproved}
                          className={`w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 hover:border-brand-300 transition-colors duration-200 ${
                            isReviewMode || approvalStatus.isApproved ? 'bg-gray-100 cursor-not-allowed' : ''
                          }`}
                        />
                      </td>
                      <td className="px-3 py-4 break-words">
                        <input
                          type="text"
                          value={data.equipmentLocation}
                          onChange={(e) => updateEntry(data.id, 'equipmentLocation', e.target.value)}
                          disabled={isReadOnly || approvalStatus.isApproved}
                          className={`w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 hover:border-brand-300 transition-colors duration-200 ${
                            isReviewMode || approvalStatus.isApproved ? 'bg-gray-100 cursor-not-allowed' : ''
                          }`}
                        />
                      </td>
                      <td className="px-3 py-4 break-words">
                        <input
                          type="text"
                          value={data.refrigerantType}
                          onChange={(e) => updateEntry(data.id, 'refrigerantType', e.target.value)}
                          disabled={isReadOnly || approvalStatus.isApproved}
                          className={`w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 hover:border-brand-300 transition-colors duration-200 ${
                            isReviewMode || approvalStatus.isApproved ? 'bg-gray-100 cursor-not-allowed' : ''
                          }`}
                        />
                      </td>
                      <td className="px-3 py-4">
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={data.fillAmount || ''}
                          onChange={(e) => updateEntry(data.id, 'fillAmount', parseFloat(e.target.value) || 0)}
                          disabled={isReadOnly || approvalStatus.isApproved}
                          className={`w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 hover:border-brand-300 transition-colors duration-200 ${
                            isReviewMode || approvalStatus.isApproved ? 'bg-gray-100 cursor-not-allowed' : ''
                          }`}
                        />
                      </td>
                      <td className="px-3 py-4">
                        <select
                          value={data.unit}
                          onChange={(e) => updateEntry(data.id, 'unit', e.target.value as 'gram' | 'kg')}
                          disabled={isReadOnly || approvalStatus.isApproved}
                          className={`w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 hover:border-brand-300 transition-colors duration-200 bg-white ${
                            isReviewMode || approvalStatus.isApproved ? 'bg-gray-100 cursor-not-allowed' : ''
                          }`}
                        >
                          <option value="kg">公斤</option>
                          <option value="gram">公克</option>
                        </select>
                      </td>
                      <td className="px-3 py-4 text-center">
                        {data.isExample ? (
                          // 範例列：顯示範例圖片
                          <div className="flex flex-col items-center space-y-2">
                            <img
                              src="/refrigerant-example.png"
                              alt="範例：三洋SR-480BV5 銘牌"
                              className="w-44 h-auto rounded border cursor-zoom-in"
                              loading="lazy"
                              onClick={() => setLightboxSrc('/refrigerant-example.png')}
                            />
                          </div>
                        ) : (
                          <EvidenceUpload
                            key={`upload-${data.id}`}
                            pageKey={`${pageKey}_device_${data.id}`}
                            files={data.evidenceFiles || []}
                            onFilesChange={(files) => updateEntry(data.id, 'evidenceFiles', files)}
                            memoryFiles={data.memoryFiles || []}
                            onMemoryFilesChange={handleMemoryFilesChange(data.id)}
                            maxFiles={1}
                            kind="other"
                            disabled={submitting || !editPermissions.canUploadFiles}
                            mode={isReadOnly || approvalStatus.isApproved ? "view" : "edit"}
                            isAdminReviewMode={isReviewMode && role === 'admin'}
                          />
                        )}
                      </td>
                      <td className="px-3 py-4">
                        <div className="flex justify-center">
                          {refrigerantData.filter(r => !r.isExample).length > 1 && (
                            <button
                              onClick={() => removeEntry(data.id)}
                              disabled={isReadOnly || approvalStatus.isApproved}
                              className={`text-red-500 hover:text-red-700 p-1 rounded-lg hover:bg-red-50 transition-colors duration-200 ${
                                isReviewMode || approvalStatus.isApproved ? 'opacity-50 cursor-not-allowed' : ''
                              }`}
                              title="刪除此項目"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>

            {/* 按鈕也在 1800px 寬度裡，白卡片會完整包住 */}
            <div className="mt-6">
              <button
                onClick={addNewEntry}
                disabled={isReadOnly || approvalStatus.isApproved}
                className={`w-full py-3 bg-green-500 hover:bg-green-600 text-white rounded-lg font-medium transition-colors ${
                  isReviewMode || approvalStatus.isApproved ? 'opacity-50 cursor-not-allowed bg-gray-400 hover:bg-gray-400' : ''
                }`}
              >
                + 新增設備
              </button>
            </div>
            </div>
          </div>
        </div>

        {/* 審核區塊 - 只在審核模式顯示 */}
        {isReviewMode && (
          <div className="max-w-4xl mx-auto mt-8">
            <ReviewSection
              entryId={reviewEntryId || currentEntryId || `refrigerant_${year}`}
              userId={reviewUserId || "current_user"}
              category="冷媒"
              userName="填報用戶"
              amount={refrigerantData
                .filter(r => !r.isExample)
                .reduce((sum, item) => {
                  const amountInKg = item.unit === 'gram' ? item.fillAmount / 1000 : item.fillAmount
                  return sum + amountInKg
                }, 0)}
              unit="kg"
              role={role}
              onSave={handleSave}
              isSaving={submitting}
              onApprove={() => {
                // ReviewSection 會處理 API 呼叫和導航
              }}
              onReject={(reason) => {
                // ReviewSection 會處理 API 呼叫和導航
              }}
            />
          </div>
        )}

        <div className="h-20"></div>
      </div>

      {!isReadOnly && !approvalStatus.isApproved && !isReviewMode && (
        <BottomActionBar
          currentStatus={currentStatus}
          currentEntryId={currentEntryId}
          isUpdating={false}
          hasSubmittedBefore={hasSubmittedBefore}
          hasAnyData={hasAnyData}
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
                  onClick={handleClearConfirm}
                  disabled={clearLoading}
                  className="px-4 py-2 text-white rounded-lg transition-colors flex items-center justify-center"
                  style={{
                    backgroundColor: clearLoading ? '#9ca3af' : designTokens.colors.error,
                    opacity: clearLoading ? 0.7 : 1
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

      {/* Lightbox：點圖放大 */}
      {lightboxSrc && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70"
          onClick={() => setLightboxSrc(null)}
        >
          <img
            src={lightboxSrc}
            alt="範例銘牌放大"
            className="max-w-[90vw] max-h-[90vh] rounded shadow-xl cursor-zoom-out"
            onClick={(e) => e.stopPropagation()}
          />
          <button
            className="absolute top-4 right-4 text-white text-3xl leading-none hover:text-gray-300"
            aria-label="Close"
            onClick={() => setLightboxSrc(null)}
          >
            <X className="w-8 h-8" />
          </button>
        </div>
      )}

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

      {/* 提交成功彈窗 */}
      {showSuccessModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
          <div className="bg-white rounded-lg shadow-lg max-w-md w-full">
            <div className="p-6">
              {/* 關閉按鈕 */}
              <div className="flex justify-end mb-2">
                <button
                  onClick={() => setShowSuccessModal(false)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                  aria-label="關閉"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* 內容區 */}
              <div className="text-center">
                {/* 成功圖示 */}
                <div
                  className="w-12 h-12 mx-auto rounded-full mb-4 flex items-center justify-center"
                  style={{ backgroundColor: designTokens.colors.success }}
                >
                  <CheckCircle className="h-6 w-6 text-white" />
                </div>

                {/* 標題 */}
                <h3
                  className="text-lg font-medium mb-2"
                  style={{ color: designTokens.colors.textPrimary }}
                >
                  提交成功！
                </h3>

                {/* 成功訊息 */}
                <p
                  className="mb-4"
                  style={{ color: designTokens.colors.textSecondary }}
                >
                  {success}
                </p>

                {/* 提示資訊卡片 */}
                <div
                  className="rounded-lg p-4 mb-4 text-left"
                  style={{ backgroundColor: designTokens.colors.accentLight }}
                >
                  <p
                    className="text-base mb-2 font-medium"
                    style={{ color: designTokens.colors.textPrimary }}
                  >
                    您的資料已成功儲存，您可以：
                  </p>
                  <ul
                    className="text-base space-y-1"
                    style={{ color: designTokens.colors.textSecondary }}
                  >
                    <li>• 隨時回來查看或修改資料</li>
                    <li>• 重新上傳新的證明文件</li>
                    <li>• 更新月份使用量數據</li>
                  </ul>
                </div>

                {/* 確認按鈕 */}
                <button
                  onClick={() => setShowSuccessModal(false)}
                  className="w-full py-2 rounded-lg text-white font-medium transition-colors"
                  style={{ backgroundColor: designTokens.colors.primary }}
                  onMouseEnter={(e) => {
                    (e.target as HTMLButtonElement).style.backgroundColor = '#10b981';
                  }}
                  onMouseLeave={(e) => {
                    (e.target as HTMLButtonElement).style.backgroundColor = designTokens.colors.primary;
                  }}
                >
                  確認
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
