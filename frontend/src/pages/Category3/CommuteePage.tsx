import React, { useState, useMemo, useEffect } from 'react';
import { Download, Upload, FileSpreadsheet, Map, X, Trash2, ChevronLeft, ChevronRight } from 'lucide-react';
import StatusIndicator from '../../components/StatusIndicator';
import { EntryStatus } from '../../components/StatusSwitcher';
import BottomActionBar from '../../components/BottomActionBar';
import { useEditPermissions } from '../../hooks/useEditPermissions';
import { useFrontendStatus } from '../../hooks/useFrontendStatus';
import { updateEntryStatus, getEntryByPageKeyAndYear, upsertEnergyEntry } from '../../api/entries';
import { getEntryFiles, getFileUrl } from '../../api/files';
import { designTokens } from '../../utils/designTokens';
import EvidenceFileManager, { FileManagerData } from '../../components/common/EvidenceFileManager';

export default function CommutePage() {
  const pageKey = 'employee_commute'
  const [year] = useState(new Date().getFullYear())
  const [initialStatus, setInitialStatus] = useState<EntryStatus>('submitted');
  const [currentEntryId, setCurrentEntryId] = useState<string | null>(null);
  const [hasSubmittedBefore, setHasSubmittedBefore] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [employeeCount, setEmployeeCount] = useState<number>(0);
  const [averageDistance, setAverageDistance] = useState<number>(0);
  const [excelFile, setExcelFile] = useState<File | null>(null);
  const [mapScreenshots, setMapScreenshots] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [enlargedImageIndex, setEnlargedImageIndex] = useState<number | null>(null);
  const [enlargedExampleImage, setEnlargedExampleImage] = useState<string | null>(null);
  const [fileManagerData, setFileManagerData] = useState<FileManagerData | null>(null);

  // 前端狀態管理 Hook
  const frontendStatus = useFrontendStatus({
    initialStatus,
    entryId: currentEntryId,
    onStatusChange: (newStatus) => {
      console.log('Status changed to:', newStatus)
    },
    onError: (error) => console.error('Status error:', error),
    onSuccess: (message) => console.log('Status success:', message)
  })

  const { currentStatus, handleDataChanged, handleSubmitSuccess, isInitialLoad } = frontendStatus
  
  // 編輯權限控制
  const editPermissions = useEditPermissions(currentStatus)
  
  // 範例圖片 URL（需要放在 public 資料夾或使用實際 URL）
  const exampleImages = [
    '/examples/commute-distance-example1.png', // 南區到公司範例
    '/examples/commute-distance-example2.png'  // 永康到公司範例
  ]

  // 判斷是否有資料
  const hasAnyData = useMemo(() => {
    return employeeCount > 0 || averageDistance > 0 || excelFile !== null || mapScreenshots.length > 0
  }, [employeeCount, averageDistance, excelFile, mapScreenshots])

  // 允許所有狀態編輯
  const isReadOnly = false

  // 處理鍵盤事件 (ESC 關閉，左右箭頭切換圖片)
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (enlargedImageIndex === null && enlargedExampleImage === null) return

      switch (event.key) {
        case 'Escape':
          setEnlargedImageIndex(null)
          setEnlargedExampleImage(null)
          break
        case 'ArrowLeft':
          if (enlargedImageIndex !== null && enlargedImageIndex > 0) {
            setEnlargedImageIndex(enlargedImageIndex - 1)
          }
          break
        case 'ArrowRight':
          if (enlargedImageIndex !== null && enlargedImageIndex < previewUrls.length - 1) {
            setEnlargedImageIndex(enlargedImageIndex + 1)
          }
          break
      }
    }

    if (enlargedImageIndex !== null || enlargedExampleImage !== null) {
      document.addEventListener('keydown', handleKeyDown)
      return () => document.removeEventListener('keydown', handleKeyDown)
    }

    return undefined
  }, [enlargedImageIndex, enlargedExampleImage, previewUrls.length])

  // 載入現有記錄
  useEffect(() => {
    const loadData = async () => {
      try {
        setSubmitting(true)

        // 檢查是否已有非草稿記錄
        const existingEntry = await getEntryByPageKeyAndYear(pageKey, year)
        if (existingEntry && existingEntry.status !== 'draft') {
          setInitialStatus(existingEntry.status as EntryStatus)
          setCurrentEntryId(existingEntry.id)
          setHasSubmittedBefore(true)

          // 載入已提交的記錄數據供編輯
          if (existingEntry.payload?.employeeCount) {
            setEmployeeCount(existingEntry.payload.employeeCount)
          }
          if (existingEntry.payload?.averageDistance) {
            setAverageDistance(existingEntry.payload.averageDistance)
          }

          // 檔案載入由 EvidenceFileManager 元件處理

          // 處理狀態變更
          handleDataChanged()
        }
        // 如果是草稿記錄或無記錄，保持表單空白狀態

        isInitialLoad.current = false
      } catch (error) {
        console.error('Error loading commute data:', error)
      } finally {
        setSubmitting(false)
      }
    }

    loadData()
  }, [])

  const handleSubmit = async () => {
    if (employeeCount <= 0 || averageDistance <= 0) {
      alert('請填寫完整的員工人數和平均通勤距離');
      return;
    }
    
    setSubmitting(true);
    try {
      // 計算年度通勤碳排放（簡化計算，放在第1個月）
      const annualCommuteEmission = employeeCount * averageDistance * 2 * 250 // 2倍(來回) * 250工作日

      // 建立填報輸入資料
      const entryInput = {
        page_key: pageKey,
        period_year: year,
        unit: 'km',
        monthly: { '1': annualCommuteEmission }, // 放在第1個月
        notes: `員工人數: ${employeeCount} 人, 平均通勤距離: ${averageDistance} 公里, 年度總通勤距離: ${annualCommuteEmission} 公里`
      }

      // 新增或更新 energy_entries
      const { entry_id } = await upsertEnergyEntry(entryInput)

      // 設置 entryId
      if (!currentEntryId) {
        setCurrentEntryId(entry_id)
      }

      // 提交成功時自動更新狀態
      await handleSubmitSuccess();
      setHasSubmittedBefore(true)
      alert(`員工通勤數據已保存！\n員工人數：${employeeCount} 人\n平均通勤距離：${averageDistance} 公里\n年度總通勤距離：${annualCommuteEmission} 公里`);
    } catch (error) {
      console.error('Submit error:', error)
      alert(error instanceof Error ? error.message : '提交失敗，請重試');
    } finally {
      setSubmitting(false);
    }
  };

  // 處理 Excel 檔案上傳
  const handleExcelUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setExcelFile(file)

      // 模擬從 Excel 解析出的資料（實際需要後端解析）
      setEmployeeCount(25) // 示例：25 位員工
      setAverageDistance(5.8) // 示例：平均通勤距離 5.8 公里
    }
  }

  // 處理地圖截圖上傳（多檔案）
  const handleMapScreenshots = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    setMapScreenshots(prev => [...prev, ...files])

    // 建立預覽 URL
    const newUrls = files.map(file => URL.createObjectURL(file))
    setPreviewUrls(prev => [...prev, ...newUrls])
  }

  // 移除截圖
  const removeScreenshot = (index: number) => {
    setMapScreenshots(prev => prev.filter((_, i) => i !== index))
    URL.revokeObjectURL(previewUrls[index])
    setPreviewUrls(prev => prev.filter((_, i) => i !== index))
  }

  // 下載範例檔案
  const downloadTemplate = () => {
    // 實際實作時需要產生或下載 Excel 範例檔
    alert('範例檔案下載功能將在後續實作')
    console.log('下載範例檔案')
  }

  const handleClear = () => {
    if (confirm('確定要清除所有數據嗎？此操作無法復原。')) {
      setEmployeeCount(0);
      setAverageDistance(0);
      setExcelFile(null);
      setMapScreenshots([]);
      // 清理預覽 URL
      previewUrls.forEach(url => URL.revokeObjectURL(url));
      setPreviewUrls([]);
      setHasSubmittedBefore(false)
    }
  };

  return (
    <>
    <div className="min-h-screen bg-green-50">
      <div className="max-w-4xl mx-auto px-6 py-8 space-y-6">

        {/* 頁面標題 - 無背景框 */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-center mb-2">
            員工通勤 使用數量填報
          </h1>
          <p className="text-lg text-center text-gray-600 mb-6">
            請上傳 MSDS 文件並填入各月份使用數據進行碳排放計算
          </p>
        </div>

        {/* 說明區塊 */}
        <div
          className="rounded-lg p-4 border-l-4"
          style={{
            backgroundColor: '#f0f9ff',
            borderColor: '#3b82f6'
          }}
        >
          <p className="text-base text-blue-700">
            請下載範例檔案，填寫員工通勤資料後上傳。系統將自動計算通勤產生的碳排放量。
          </p>
        </div>

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

        {/* 步驟 2：上傳填寫完成的檔案 */}
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

          <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
            <FileSpreadsheet className="w-12 h-12 text-gray-400 mx-auto mb-4" />

            {excelFile ? (
              <div className="space-y-2">
                <p className="text-base text-green-600">已選擇檔案：{excelFile.name}</p>
                <p className="text-sm text-gray-500">檔案大小：{(excelFile.size / 1024).toFixed(1)} KB</p>
                <button
                  onClick={() => setExcelFile(null)}
                  className="text-base text-red-600 hover:text-red-800"
                >
                  移除檔案
                </button>
                {/* 顯示解析出的資料 */}
                {employeeCount > 0 && averageDistance > 0 && (
                  <div className="mt-3 p-3 bg-green-50 rounded border">
                    <p className="text-base text-green-700">
                      已解析：{employeeCount} 位員工，平均通勤距離 {averageDistance} 公里
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <>
                <p className="text-lg text-gray-600 mb-4">
                  拖曳檔案至此處或點擊選擇檔案
                </p>
                <input
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={handleExcelUpload}
                  className="hidden"
                  id="excel-upload"
                />
                <label
                  htmlFor="excel-upload"
                  className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 cursor-pointer"
                >
                  <Upload className="w-5 h-5 mr-2" />
                  選擇檔案
                </label>
              </>
            )}
          </div>
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

          {/* 上傳區域 */}
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-6">
            <input
              type="file"
              multiple
              accept="image/*"
              onChange={handleMapScreenshots}
              className="hidden"
              id="map-upload"
            />
            <label
              htmlFor="map-upload"
              className="flex flex-col items-center cursor-pointer"
            >
              <Map className="w-12 h-12 text-gray-400 mb-3" />
              <span className="text-lg text-gray-600 mb-2">點擊上傳 Google Maps 截圖</span>
              <span className="text-base text-gray-500">支援多檔案上傳，無數量限制</span>
            </label>
          </div>

          {/* 已上傳的截圖預覽 */}
          {previewUrls.length > 0 && (
            <div className="mt-4">
              <p className="text-base font-medium text-gray-700 mb-2">
                已上傳 {previewUrls.length} 個檔案
              </p>
              <div className="grid grid-cols-3 gap-3">
                {previewUrls.map((url, index) => (
                  <div key={index} className="relative group">
                    <img
                      src={url}
                      alt={`截圖 ${index + 1}`}
                      className="w-full h-24 object-cover rounded border cursor-pointer hover:opacity-80 transition-opacity"
                      onClick={() => setEnlargedImageIndex(index)}
                      title="點擊放大檢視"
                    />
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        removeScreenshot(index);
                      }}
                      className="absolute top-1 right-1 p-1 bg-red-600 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                      title="刪除這張圖片"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* 統一檔案管理 (使用共用元件) */}
        <div
          className="rounded-lg border p-6"
          style={{
            backgroundColor: '#ffffff',
            borderColor: '#e5e7eb',
            boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)'
          }}
        >
          <div className="flex items-center mb-4">
            <span className="flex items-center justify-center w-8 h-8 rounded-full bg-purple-600 text-white font-bold mr-3">
              4
            </span>
            <h2 className="text-2xl font-semibold">佐證檔案管理系統</h2>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                  <span className="text-white text-xs font-bold">i</span>
                </div>
              </div>
              <div className="ml-3">
                <h4 className="text-base font-medium text-blue-800 mb-1">自動檔案管理</h4>
                <p className="text-base text-blue-700">
                  系統會自動載入和顯示已上傳的佐證檔案，確保檔案在重新進入頁面時不會遺失。
                  這裡會顯示所有與此填報項目關聯的檔案。
                </p>
              </div>
            </div>
          </div>

          <EvidenceFileManager
            pageKey={pageKey}
            entryId={currentEntryId}
            year={year}
            onFilesChange={setFileManagerData}
            currentStatus={currentStatus}
            supportedTypes={['usage_evidence']}
            className="bg-gray-50 p-4 rounded-lg"
          />
        </div>

        {/* 底部空間，避免內容被固定底部欄遮擋 */}
        <div className="h-20"></div>
      </div>

      {/* 底部操作欄 */}
      <BottomActionBar
        currentStatus={currentStatus}
        currentEntryId={currentEntryId}
        isUpdating={false}
        editPermissions={editPermissions}
        submitting={submitting}
        onSubmit={handleSubmit}
        onClear={handleClear}
        hasAnyData={hasAnyData}
        designTokens={designTokens}
      />

      {/* 圖片放大 Modal - 用戶上傳的圖片 */}
      {enlargedImageIndex !== null && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
          <div className="relative max-w-4xl max-h-screen p-4">
              <img
                src={previewUrls[enlargedImageIndex]}
                alt={`放大檢視 - 截圖 ${enlargedImageIndex + 1}`}
                className="max-w-full max-h-full object-contain"
              />

              {/* 關閉按鈕 */}
              <button
                onClick={() => setEnlargedImageIndex(null)}
                className="absolute top-2 right-2 p-2 bg-white bg-opacity-20 hover:bg-opacity-30 rounded-full text-white transition-all"
                title="關閉 (ESC)"
              >
                <X className="w-6 h-6" />
              </button>

              {/* 左右切換按鈕 */}
              {previewUrls.length > 1 && (
                <>
                  {enlargedImageIndex > 0 && (
                    <button
                      onClick={() => setEnlargedImageIndex(enlargedImageIndex - 1)}
                      className="absolute left-2 top-1/2 transform -translate-y-1/2 p-2 bg-white bg-opacity-20 hover:bg-opacity-30 rounded-full text-white transition-all"
                      title="上一張 (←)"
                    >
                      <ChevronLeft className="w-6 h-6" />
                    </button>
                  )}
                  {enlargedImageIndex < previewUrls.length - 1 && (
                    <button
                      onClick={() => setEnlargedImageIndex(enlargedImageIndex + 1)}
                      className="absolute right-2 top-1/2 transform -translate-y-1/2 p-2 bg-white bg-opacity-20 hover:bg-opacity-30 rounded-full text-white transition-all"
                      title="下一張 (→)"
                    >
                      <ChevronRight className="w-6 h-6" />
                    </button>
                  )}
                </>
              )}

              {/* 圖片資訊 */}
              <div className="absolute bottom-2 left-2 bg-black bg-opacity-50 text-white px-3 py-1 rounded">
                {enlargedImageIndex + 1} / {previewUrls.length}
              </div>
            </div>

            {/* 點擊背景關閉 */}
            <div
              className="absolute inset-0 -z-10"
              onClick={() => setEnlargedImageIndex(null)}
            />
          </div>
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