import React, { useState, useMemo, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Download, X, Eye, CheckCircle, Loader2, AlertCircle } from 'lucide-react';
import StatusIndicator from '../../components/StatusIndicator';
import { EntryStatus } from '../../components/StatusSwitcher';
import BottomActionBar from '../../components/BottomActionBar';
import { useEditPermissions } from '../../hooks/useEditPermissions';
import { useGhostFileCleaner } from '../../hooks/useGhostFileCleaner';
import { useFrontendStatus } from '../../hooks/useFrontendStatus';
import { useEnergyData } from '../../hooks/useEnergyData';
import { useEnergyClear } from '../../hooks/useEnergyClear';
import { useSubmitGuard } from '../../hooks/useSubmitGuard';
import { useApprovalStatus } from '../../hooks/useApprovalStatus';
import { useStatusBanner, getBannerColorClasses } from '../../hooks/useStatusBanner';
import { useRole } from '../../hooks/useRole';
import { upsertEnergyEntry } from '../../api/entries';
import { smartOverwriteFiles } from '../../api/smartFileOverwrite';
import { supabase } from '../../lib/supabaseClient';
import ReviewSection from '../../components/ReviewSection';
import { EvidenceFile } from '../../api/files';
import { designTokens } from '../../utils/designTokens';
import EvidenceUpload, { MemoryFile } from '../../components/EvidenceUpload';

export default function CommutePage() {
  const [searchParams] = useSearchParams();

  // 審核模式檢測
  const isReviewMode = searchParams.get('mode') === 'review'
  const reviewEntryId = searchParams.get('entryId')
  const reviewUserId = searchParams.get('userId')

  const pageKey = 'employee_commute'
  const [year] = useState(new Date().getFullYear())
  const [initialStatus, setInitialStatus] = useState<EntryStatus>('submitted');
  const [currentEntryId, setCurrentEntryId] = useState<string | null>(null);
  const [hasSubmittedBefore, setHasSubmittedBefore] = useState(false);
  const [excelFile, setExcelFile] = useState<EvidenceFile[]>([]);
  const [mapScreenshots, setMapScreenshots] = useState<EvidenceFile[]>([]);
  const [excelMemoryFiles, setExcelMemoryFiles] = useState<MemoryFile[]>([]);
  const [mapMemoryFiles, setMapMemoryFiles] = useState<MemoryFile[]>([]);
  const [enlargedExampleImage, setEnlargedExampleImage] = useState<string | null>(null);

  // 防止重複提交
  const { executeSubmit, submitting } = useSubmitGuard()

  // 前端狀態管理 Hook
  const frontendStatus = useFrontendStatus({
    initialStatus,
    entryId: currentEntryId,
    onStatusChange: () => {},
    onError: (error) => console.error('[CommuteePage] Status error:', error),
    onSuccess: (message) => console.log('[CommuteePage] Status success:', message)
  })

  const { currentStatus, handleDataChanged, handleSubmitSuccess, isInitialLoad } = frontendStatus

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

  // 清除 Hook
  const {
    clear,
    clearing: clearLoading,
    error: clearError
  } = useEnergyClear(currentEntryId, currentStatus)

  // 角色檢查 Hook
  const { role } = useRole()
  const isReadOnly = isReviewMode && role !== 'admin'

  // 編輯權限控制
  const editPermissions = useEditPermissions(currentStatus, isReadOnly)

  // 幽靈檔案清理 Hook
  const { cleanFiles } = useGhostFileCleaner()
  
  // 範例圖片 URL（需要放在 public 資料夾或使用實際 URL）
  const exampleImages = [
    '/examples/commute-distance-example1.png', // 南區到公司範例
    '/examples/commute-distance-example2.png'  // 永康到公司範例
  ]

  // 判斷是否有資料
  const hasAnyData = useMemo(() => {
    return excelMemoryFiles.length > 0 || mapMemoryFiles.length > 0 ||
           excelFile.length > 0 || mapScreenshots.length > 0
  }, [excelMemoryFiles, mapMemoryFiles, excelFile, mapScreenshots])

  // 處理鍵盤事件 (ESC 關閉範例圖片)
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (enlargedExampleImage === null) return

      if (event.key === 'Escape') {
        setEnlargedExampleImage(null)
      }
    }

    if (enlargedExampleImage !== null) {
      document.addEventListener('keydown', handleKeyDown)
      return () => document.removeEventListener('keydown', handleKeyDown)
    }

    return undefined
  }, [enlargedExampleImage])

  // 載入 entry 資料
  useEffect(() => {
    if (loadedEntry && !dataLoading) {
      setInitialStatus(loadedEntry.status as EntryStatus)
      setCurrentEntryId(loadedEntry.id)
      setHasSubmittedBefore(true)

      if (!isInitialLoad.current) {
        handleDataChanged()
      }
      isInitialLoad.current = false
    } else if (loadedEntry === null && !dataLoading) {
      // 無記錄，重置狀態
      setCurrentEntryId(null)
      setHasSubmittedBefore(false)
      setInitialStatus('saved')
      isInitialLoad.current = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadedEntry, dataLoading])

  // 載入檔案
  useEffect(() => {
    if (loadedFiles.length > 0) {
      const cleanAndAssignFiles = async () => {
        const validFiles = await cleanFiles(loadedFiles)

        // 分類檔案（簡化：所有 other 類型都是通勤相關）
        const excelFiles = validFiles.filter(f => f.file_type === 'other' && f.file_name.includes('.xlsx'))
        const mapFiles = validFiles.filter(f => f.file_type === 'other' && !f.file_name.includes('.xlsx'))

        setExcelFile(excelFiles)
        setMapScreenshots(mapFiles)
      }
      cleanAndAssignFiles()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadedFiles])

  const handleSubmit = async () => {
    await executeSubmit(async () => {
      // 建立填報輸入資料
      const entryInput = {
        page_key: pageKey,
        period_year: year,
        unit: '公里',
        monthly: { '1': 0 }, // 只上傳檔案，不記錄數值
        notes: '員工通勤資料',
        payload: {}
      }

      // 新增或更新 energy_entries（使用 false 避免 RLS 錯誤）
      const { entry_id } = await upsertEnergyEntry(entryInput, false)

      if (!currentEntryId) {
        setCurrentEntryId(entry_id)
      }

      // 使用智慧型檔案覆蓋（累積模式：保留舊檔案 + 追加新檔案）
      await smartOverwriteFiles([
        {
          itemKey: 'excel',
          newFiles: excelMemoryFiles,
          existingFiles: excelFile,
          fileType: 'other' as const,
          mode: 'append' as const  // 累積模式：保留舊檔案
        },
        {
          itemKey: 'map',
          newFiles: mapMemoryFiles,
          existingFiles: mapScreenshots,
          fileType: 'other' as const,
          mode: 'append' as const  // 累積模式：保留舊檔案
        }
      ], {
        entryId: entry_id,
        pageKey,
        year,
        debug: true
      })

      // 重新載入檔案
      await reload()

      // 清空記憶體檔案
      setExcelMemoryFiles([])
      setMapMemoryFiles([])

      // 提交成功
      await handleSubmitSuccess();

      // 重新載入審核狀態，更新狀態橫幅
      reloadApprovalStatus()

      setHasSubmittedBefore(true)
      alert('員工通勤數據已保存！');
    }).catch(error => {
      console.error('[CommuteePage] Submit error:', error)
      alert(error instanceof Error ? error.message : '提交失敗，請重試');
    })
  };

  const handleSave = async () => {
    await executeSubmit(async () => {
      // 建立填報輸入資料
      const entryInput = {
        page_key: pageKey,
        period_year: year,
        unit: '公里',
        monthly: { '1': 0 }, // 只上傳檔案，不記錄數值
        notes: '員工通勤資料',
        payload: {}
      }

      // 📝 管理員審核模式：直接更新現有 entry
      if (isReviewMode && reviewEntryId) {
        console.log('📝 管理員審核模式：直接更新 entry', reviewEntryId)
        const { error: updateError } = await supabase
          .from('energy_entries')
          .update({
            unit: '公里',
            amount: 0,
            payload: {},
            notes: '員工通勤資料',
            updated_at: new Date().toISOString()
          })
          .eq('id', reviewEntryId)

        if (updateError) {
          throw new Error(`更新失敗：${updateError.message}`)
        }

        await reload()
        reloadApprovalStatus()
        alert('✅ 儲存成功！資料已更新')
        return
      }

      // 新增或更新 energy_entries（使用 true 保持現有狀態）
      const { entry_id } = await upsertEnergyEntry(entryInput, true)

      if (!currentEntryId) {
        setCurrentEntryId(entry_id)
      }

      // 使用智慧型檔案覆蓋（累積模式：保留舊檔案 + 追加新檔案）
      await smartOverwriteFiles([
        {
          itemKey: 'excel',
          newFiles: excelMemoryFiles,
          existingFiles: excelFile,
          fileType: 'other' as const,
          mode: 'append' as const  // 累積模式：保留舊檔案
        },
        {
          itemKey: 'map',
          newFiles: mapMemoryFiles,
          existingFiles: mapScreenshots,
          fileType: 'other' as const,
          mode: 'append' as const  // 累積模式：保留舊檔案
        }
      ], {
        entryId: entry_id,
        pageKey,
        year,
        debug: true
      })

      // 重新載入檔案
      await reload()

      // 清空記憶體檔案
      setExcelMemoryFiles([])
      setMapMemoryFiles([])

      // 重新載入審核狀態，更新狀態橫幅
      reloadApprovalStatus()

      // 儲存成功訊息（不改變狀態）
      alert('員工通勤數據已儲存！');
    }).catch(error => {
      console.error('[CommuteePage] Save error:', error)
      alert(error instanceof Error ? error.message : '儲存失敗，請重試');
    })
  };

  // Excel 檔案變更處理
  const handleExcelFilesChange = (files: EvidenceFile[]) => {
    setExcelFile(files)
    // 用戶需要手動輸入 employeeCount 和 averageDistance
  }

  // 下載範例檔案
  const downloadTemplate = () => {
    const link = document.createElement('a')
    link.href = '/examples/commute-template.xlsx'
    link.download = '員工通勤範例檔案.xlsx'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const handleClear = async () => {
    try {
      console.log('🗑️ [CommuteePage] ===== CLEAR BUTTON CLICKED =====')

      // 收集所有檔案
      const allFiles = [...excelFile, ...mapScreenshots]
      const allMemoryFiles = [excelMemoryFiles, mapMemoryFiles]

      // 使用 Hook 清除
      await clear({
        filesToDelete: allFiles,
        memoryFilesToClean: allMemoryFiles
      })

      // 重置前端狀態
      setExcelMemoryFiles([])
      setMapMemoryFiles([])
      setExcelFile([])
      setMapScreenshots([])
      setCurrentEntryId(null)
      setHasSubmittedBefore(false)

      alert('資料已完全清除')
    } catch (error) {
      console.error('❌ [CommuteePage] Clear operation failed:', error)
      alert(error instanceof Error ? error.message : '清除失敗，請重試')
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
    <>
    <div className="min-h-screen bg-green-50">
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

          <h1 className="text-4xl font-semibold mb-3" style={{ color: designTokens.colors.textPrimary }}>
            員工通勤 使用數量填報
          </h1>
          <p className="text-lg" style={{ color: designTokens.colors.textSecondary }}>
            {isReviewMode
              ? '管理員審核模式 - 檢視填報內容和相關檔案'
              : '請上傳員工通勤資料和距離佐證文件'
            }
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

        {/* 步驟 1：下載範例檔案 */}
        <div
          className="rounded-lg border p-6"
          style={{
            backgroundColor: '#ffffff',
            borderColor: '#e5e7eb',
            boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)'
          }}
        >
          <div className="flex items-center mb-4">
            <span className="flex items-center justify-center w-8 h-8 rounded-full bg-green-600 text-white font-bold mr-3">
              1
            </span>
            <h2 className="text-2xl font-semibold">下載範例檔案</h2>
          </div>

          <p className="text-lg text-gray-600 mb-4">
            下載 Excel 範例檔案，包含員工資料表和出勤表兩個工作表
          </p>

          <button
            onClick={downloadTemplate}
            className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
          >
            <Download className="w-5 h-5 mr-2" />
            下載範例檔案
          </button>

          {/* 範例資料說明 */}
          <div className="mt-4 p-4 bg-gray-50 rounded">
            <p className="text-base font-medium text-gray-700 mb-2">範例資料格式：</p>
            <div className="text-base text-gray-600 space-y-1">
              <p>• Sheet 1 - 員工資料：姓名、居住地、交通工具、通勤距離</p>
              <p>• Sheet 2 - 出勤表：每位員工每月出勤天數</p>
            </div>
          </div>
        </div>

        {/* 步驟 2：上傳員工通勤資料 */}
        <div
          className="rounded-lg border p-6"
          style={{
            backgroundColor: '#ffffff',
            borderColor: '#e5e7eb',
            boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)'
          }}
        >
          <div className="flex items-center mb-4">
            <span className="flex items-center justify-center w-8 h-8 rounded-full bg-green-600 text-white font-bold mr-3">
              2
            </span>
            <h2 className="text-2xl font-semibold">上傳員工通勤資料</h2>
          </div>

          <p className="text-lg text-gray-600 mb-4">
            請上傳填寫完成的員工通勤 Excel 檔案
          </p>

          <EvidenceUpload
            pageKey={pageKey}
            files={excelFile}
            onFilesChange={handleExcelFilesChange}
            memoryFiles={excelMemoryFiles}
            onMemoryFilesChange={setExcelMemoryFiles}
            maxFiles={1}
            kind="other"
            mode={isReadOnly || approvalStatus.isApproved ? "view" : "edit"}
            disabled={submitting || isReadOnly || approvalStatus.isApproved || !editPermissions.canUploadFiles}
          />
        </div>

        {/* 步驟 3：上傳距離佐證 */}
        <div
          className="rounded-lg border p-6"
          style={{
            backgroundColor: '#ffffff',
            borderColor: '#e5e7eb',
            boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)'
          }}
        >
          <div className="flex items-center mb-4">
            <span className="flex items-center justify-center w-8 h-8 rounded-full bg-green-600 text-white font-bold mr-3">
              3
            </span>
            <h2 className="text-2xl font-semibold">上傳通勤距離佐證資料</h2>
          </div>

          <p className="text-lg text-gray-600 mb-4">
            請上傳 Google Maps 路線規劃截圖，顯示從員工居住地之區公所或鄉公所至公司的距離，並請選擇與員工實際通勤方式相符的交通工具進行路線規劃。
          </p>

          {/* 範例圖片 */}
          <div className="mb-6">
            <p className="text-base font-medium text-gray-700 mb-3">參考範例：</p>
            <div className="grid grid-cols-2 gap-4">
              <div className="border rounded-lg overflow-hidden">
                <img
                  src={exampleImages[0]}
                  alt="台南市南區到公司"
                  className="w-full h-32 object-cover cursor-pointer hover:opacity-80 transition-opacity"
                  onClick={() => setEnlargedExampleImage(exampleImages[0])}
                  title="點擊放大檢視"
                />
                <p className="text-sm text-center py-2 bg-gray-50">
                  台南市南區 → 公司 (4.9 km)
                </p>
              </div>
              <div className="border rounded-lg overflow-hidden">
                <img
                  src={exampleImages[1]}
                  alt="台南市永康區到公司"
                  className="w-full h-32 object-cover cursor-pointer hover:opacity-80 transition-opacity"
                  onClick={() => setEnlargedExampleImage(exampleImages[1])}
                  title="點擊放大檢視"
                />
                <p className="text-sm text-center py-2 bg-gray-50">
                  台南市永康區 → 公司 (6.7 km)
                </p>
              </div>
            </div>
          </div>

          <EvidenceUpload
            pageKey={pageKey}
            files={mapScreenshots}
            onFilesChange={setMapScreenshots}
            memoryFiles={mapMemoryFiles}
            onMemoryFilesChange={setMapMemoryFiles}
            maxFiles={10}
            kind="other"
            mode={isReadOnly || approvalStatus.isApproved ? "view" : "edit"}
            disabled={submitting || isReadOnly || approvalStatus.isApproved || !editPermissions.canUploadFiles}
          />
        </div>


        {/* 底部空間，避免內容被固定底部欄遮擋 */}
        <div className="h-20"></div>
      </div>

      {/* 底部操作欄 - 唯讀模式下隱藏，審核通過時也隱藏 */}
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

      {/* 審核區塊 - 只在審核模式顯示 */}
      {isReviewMode && (
        <ReviewSection
          entryId={reviewEntryId || currentEntryId || `employee_commute_${year}`}
          userId={reviewUserId || "current_user"}
          category="員工通勤"
          userName={reviewUserId || "用戶"}
          amount={0}
          unit="公里"
          role={role}
          onSave={handleSave}
          isSaving={submitting}
          onApprove={() => {
            console.log('✅ 員工通勤填報審核通過 - 由 ReviewSection 處理')
          }}
          onReject={(reason) => {
            console.log('❌ 員工通勤填報已退回 - 由 ReviewSection 處理:', reason)
          }}
        />
      )}


      {/* 圖片放大 Modal - 範例圖片 */}
      {enlargedExampleImage && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
          <div className="relative max-w-4xl max-h-screen p-4">
              <img
                src={enlargedExampleImage}
                alt="放大檢視 - 範例圖片"
                className="max-w-full max-h-full object-contain"
              />

              {/* 關閉按鈕 */}
              <button
                onClick={() => setEnlargedExampleImage(null)}
                className="absolute top-2 right-2 p-2 bg-white bg-opacity-20 hover:bg-opacity-30 rounded-full text-white transition-all"
                title="關閉 (ESC)"
              >
                <X className="w-6 h-6" />
              </button>

              {/* 圖片資訊 */}
              <div className="absolute bottom-2 left-2 bg-black bg-opacity-50 text-white px-3 py-1 rounded">
                範例圖片
              </div>
            </div>

            {/* 點擊背景關閉 */}
            <div
              className="absolute inset-0 -z-10"
              onClick={() => setEnlargedExampleImage(null)}
            />
          </div>
        )}
      </div>
    </>
  );
}