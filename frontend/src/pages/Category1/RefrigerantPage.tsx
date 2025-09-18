import { useState, useEffect, useMemo, useCallback } from 'react';
import { AlertCircle, X, Trash2 } from 'lucide-react'
import EvidenceUpload from '../../components/EvidenceUpload';
import { MemoryFile } from '../../components/EvidenceUpload';
import { EntryStatus } from '../../components/StatusSwitcher';
import BottomActionBar from '../../components/BottomActionBar';
import { useEditPermissions } from '../../hooks/useEditPermissions';
import { useFrontendStatus } from '../../hooks/useFrontendStatus';
import { updateEntryStatus, getEntryByPageKeyAndYear, upsertEnergyEntry } from '../../api/entries';
import { getEntryFiles, EvidenceFile, uploadEvidenceWithEntry, updateFileEntryAssociation } from '../../api/files';
import { designTokens } from '../../utils/designTokens';


interface RefrigerantData {
  id: number;
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
  id: -1,
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
  const pageKey = 'refrigerant'
  const [year] = useState(new Date().getFullYear())
  const [initialStatus, setInitialStatus] = useState<EntryStatus>('submitted')
  const [currentEntryId, setCurrentEntryId] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [hasSubmittedBefore, setHasSubmittedBefore] = useState(false)
  const [showClearConfirmModal, setShowClearConfirmModal] = useState(false)
  const EMPTY_FILES = useMemo(() => [], []);   // 穩定的空陣列（避免每次都是新的 []）
  const NOOP = useCallback(() => {}, []);   // 穩定的空函式（避免每次都是新的 ()=>{}）

  // 圖片放大 lightbox
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setLightboxSrc(null) }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // 判斷是否為圖片檔案
  const isImageFile = (fileName: string) => {
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp']
    return imageExtensions.some(ext => fileName.toLowerCase().endsWith(ext))
  }

  const [refrigerantData, setRefrigerantData] = useState<RefrigerantData[]>(
    withExampleFirst([
      {
        id: 1,
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

  // 前端狀態管理 Hook
  const frontendStatus = useFrontendStatus({
    initialStatus,
    entryId: currentEntryId,
    onStatusChange: () => {},
    onError: (error) => console.error('Status error:', error),
    onSuccess: () => {}
  })

  const { currentStatus, handleDataChanged, handleSubmitSuccess, isInitialLoad } = frontendStatus
  const editPermissions = useEditPermissions(currentStatus)

  // 只看「非範例」列是否有資料
  const hasAnyData = useMemo(() => {
    const userRows = refrigerantData.filter(r => !r.isExample)
    return userRows.some(r =>
      r.brandName.trim() !== '' ||
      r.modelNumber.trim() !== '' ||
      r.equipmentLocation.trim() !== '' ||
      r.refrigerantType.trim() !== '' ||
      r.fillAmount > 0 ||
      (r.memoryFiles && r.memoryFiles.length > 0)
    )
  }, [refrigerantData])
  
  const isReadOnly = false

  // 載入現有記錄
  useEffect(() => {
    const loadData = async () => {
      try {
        setSubmitting(true)
        const existingEntry = await getEntryByPageKeyAndYear(pageKey, year)

        if (existingEntry) {
          setInitialStatus(existingEntry.status as EntryStatus)
          setCurrentEntryId(existingEntry.id)
          setHasSubmittedBefore(true)

          if (existingEntry.payload?.refrigerantData) {
            let updated = existingEntry.payload.refrigerantData

            updated = updated.map((item: any) => {
              if (item.equipmentType && !item.brandName && !item.modelNumber) {
                const parts = item.equipmentType.split('/')
                return {
                  ...item,
                  brandName: parts[0] || '',
                  modelNumber: parts[1] || '',
                  equipmentType: undefined
                }
              }
              return item
            })

            if (existingEntry.id) {
              try {
                const files = await getEntryFiles(existingEntry.id)
                const refrigerantFiles = files.filter(f =>
                  f.file_type === 'usage_evidence' && f.page_key === pageKey
                )

                updated = updated.map((item: any, index: number) => {
                  const itemFiles = refrigerantFiles.filter(f => {
                    if (f.file_path.includes(`refrigerant_item_${item.id}`)) return true
                    if (f.file_path.includes(`${index + 1}`) || refrigerantFiles.indexOf(f) === index) return true
                    return false
                  })
                  return { ...item, evidenceFiles: itemFiles, proofFile: null }
                })
              } catch (e) {
                console.error('Failed to load files:', e)
              }
            }

            const withExample = withExampleFirst(updated.filter((r: RefrigerantData) => !r.isExample))
            setRefrigerantData(withExample)
          }

          handleDataChanged()
        }

        isInitialLoad.current = false
      } catch (error) {
        console.error('載入資料失敗:', error)
      } finally {
        setSubmitting(false)
      }
    }
    loadData()
  }, [])

  const addNewEntry = () => {
    const newEntry: RefrigerantData = {
      id: Date.now(),
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

  const removeEntry = (id: number) => {
    const row = refrigerantData.find(r => r.id === id)
    if (row?.isExample) return; // 範例不可刪
    const others = refrigerantData.filter(r => !r.isExample)
    if (others.length > 1) {
      setRefrigerantData(withExampleFirst(others.filter(r => r.id !== id)))
    }
  };

  const updateEntry = useCallback((id: number, field: keyof RefrigerantData, value: any) => {
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
  const handleMemoryFilesChange = useCallback((id: number) => {
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
      const hasFiles = data.memoryFiles && data.memoryFiles.length > 0
      if (!hasFiles) errors.push(`第${index + 1}項未上傳佐證資料`);
    });

    if (errors.length > 0) {
      alert('請修正以下問題：\n' + errors.join('\n'));
      return;
    }

    setSubmitting(true);
    try {
      const totalFillAmount = userRows.reduce((sum, item) => {
        const amountInKg = item.unit === 'gram' ? item.fillAmount / 1000 : item.fillAmount
        return sum + amountInKg
      }, 0)

      const entryInput = {
        page_key: pageKey,
        period_year: year,
        unit: 'kg',
        monthly: { '1': totalFillAmount },
        extraPayload: {
          refrigerantData: userRows,
          totalFillAmount: totalFillAmount,
          notes: `冷媒設備共 ${userRows.length} 台`
        }
      }

      const { entry_id } = await upsertEnergyEntry(entryInput, true)
      if (!currentEntryId) setCurrentEntryId(entry_id)

      const uploadedFiles: EvidenceFile[] = []
      for (const [index, item] of userRows.entries()) {
        if (item.memoryFiles && item.memoryFiles.length > 0) {
          for (const memoryFile of item.memoryFiles) {
            try {
              const uploadedFile = await uploadEvidenceWithEntry(memoryFile.file, {
                entryId: entry_id,
                pageKey: pageKey,
                year: year,
                category: 'usage_evidence'
              })
              uploadedFiles.push(uploadedFile)
            } catch (uploadError) {
              throw new Error(`上傳第 ${index + 1} 項設備檔案失敗: ${uploadError instanceof Error ? uploadError.message : '未知錯誤'}`)
            }
          }
        }
      }

      setRefrigerantData(prev => {
        const updated = prev.map(item => {
          if (item.isExample) return item
          return { ...item, proofFile: null, memoryFiles: [] }
        })
        return updated
      })

      await handleSubmitSuccess();
      setHasSubmittedBefore(true)
      alert('冷媒設備資料已保存！');
    } catch (error) {
      alert(error instanceof Error ? error.message : '提交失敗，請重試');
    } finally {
      setSubmitting(false);
    }
  };

  const handleClear = () => {
    setShowClearConfirmModal(true);
  };

  const handleClearConfirm = () => {
    setRefrigerantData(withExampleFirst([{
      id: 1,
      brandName: '',
      modelNumber: '',
      equipmentLocation: '',
      refrigerantType: '',
      fillAmount: 0,
      unit: 'kg',
      proofFile: null,
      memoryFiles: []
    }]));
    setHasSubmittedBefore(false);
    setShowClearConfirmModal(false);
  };

  const handleStatusChange = async (newStatus: EntryStatus) => {
    try {
      if (currentEntryId) await updateEntryStatus(currentEntryId, newStatus)
      frontendStatus.setFrontendStatus(newStatus)
    } catch (error) {
      console.error('Status update failed:', error)
    }
  }

  return (
    <div className="min-h-screen bg-green-50">
      <div className="px-6 py-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-semibold mb-3" style={{ color: designTokens.colors.textPrimary }}>
            冷媒使用量填報
          </h1>
          <p className="text-base" style={{ color: designTokens.colors.textSecondary }}>
            請上傳設備後方的銘牌做為佐證文件，並完整填寫冷媒種類與填充量等設備資料
          </p>
        </div>

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
                {refrigerantData.map((data) => {
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
                          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 hover:border-brand-300 transition-colors duration-200"
                        />
                      </td>
                      <td className="px-3 py-4 break-words">
                        <input
                          type="text"
                          value={data.modelNumber}
                          onChange={(e) => updateEntry(data.id, 'modelNumber', e.target.value)}
                          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 hover:border-brand-300 transition-colors duration-200"
                        />
                      </td>
                      <td className="px-3 py-4 break-words">
                        <input
                          type="text"
                          value={data.equipmentLocation}
                          onChange={(e) => updateEntry(data.id, 'equipmentLocation', e.target.value)}
                          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 hover:border-brand-300 transition-colors duration-200"
                        />
                      </td>
                      <td className="px-3 py-4 break-words">
                        <input
                          type="text"
                          value={data.refrigerantType}
                          onChange={(e) => updateEntry(data.id, 'refrigerantType', e.target.value)}
                          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 hover:border-brand-300 transition-colors duration-200"
                        />
                      </td>
                      <td className="px-3 py-4">
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={data.fillAmount || ''}
                          onChange={(e) => updateEntry(data.id, 'fillAmount', parseFloat(e.target.value) || 0)}
                          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 hover:border-brand-300 transition-colors duration-200"
                        />
                      </td>
                      <td className="px-3 py-4">
                        <select
                          value={data.unit}
                          onChange={(e) => updateEntry(data.id, 'unit', e.target.value as 'gram' | 'kg')}
                          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 hover:border-brand-300 transition-colors duration-200 bg-white"
                        >
                          <option value="kg">公斤</option>
                          <option value="gram">公克</option>
                        </select>
                      </td>
                      <td className="px-3 py-4 text-center">
                        {data.memoryFiles && data.memoryFiles.length > 0 ? (
                          // 已上傳：顯示預覽框
                          <div className="rounded overflow-hidden w-36 mx-auto border border-gray-200">
                            {/* 上層：顯示縮圖或檔案圖標 */}
                            <div className="p-2">
                              {/* 根據檔案類型顯示不同內容 */}
                              {data.memoryFiles && data.memoryFiles[0] && (data.memoryFiles[0].file.type.startsWith('image/') || isImageFile(data.memoryFiles[0].file_name)) ? (
                                // 圖片檔案：顯示縮圖
                                <img
                                  src={URL.createObjectURL(data.memoryFiles[0].file)}
                                  alt={data.memoryFiles[0].file_name}
                                  className="w-full h-16 object-cover rounded cursor-pointer hover:opacity-80 transition-opacity"
                                  onClick={() => data.memoryFiles && data.memoryFiles[0] && setLightboxSrc(URL.createObjectURL(data.memoryFiles[0].file))}
                                />
                              ) : (
                                // 非圖片檔案：顯示檔案圖標
                                <div className="w-full h-16 bg-blue-100 rounded flex items-center justify-center">
                                  <svg className="w-8 h-8 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                                    <path d="M9 2a2 2 0 00-2 2v8a2 2 0 002 2h6a2 2 0 002-2V6.414A2 2 0 0016.414 5L14 2.586A2 2 0 0012.586 2H9z"/>
                                  </svg>
                                </div>
                              )}

                              {/* 檔名和大小 */}
                              <div className="mt-1">
                                <div className="text-xs text-blue-600 truncate" title={data.memoryFiles?.[0]?.file_name}>
                                  {data.memoryFiles?.[0]?.file_name}
                                </div>
                                <div className="text-xs text-blue-500">
                                  {data.memoryFiles?.[0] ? Math.round(data.memoryFiles[0].file.size / 1024) : 0} KB
                                </div>
                              </div>
                            </div>

                            {/* 下層：移除按鈕 */}
                            <button
                              className="w-full py-1 text-xs text-red-600 hover:bg-red-50 border-t border-gray-200 flex items-center justify-center"
                              onClick={() => updateEntry(data.id, 'memoryFiles', [])}
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          </div>
                        ) : (
                          // 未上傳：顯示上傳區域
                          <div className="w-36 mx-auto">
                            <EvidenceUpload
                              key={`upload-${data.id}`}  // 加上穩定的 key
                              pageKey={pageKey}
                              files={EMPTY_FILES}  // 使用穩定的空陣列
                              onFilesChange={NOOP}  // 使用穩定的空函數
                              memoryFiles={data.memoryFiles || []}
                              onMemoryFilesChange={handleMemoryFilesChange(data.id)}
                              maxFiles={1}
                              kind="usage_evidence"
                              disabled={submitting}
                              mode="edit"
                            />
                          </div>
                        )}
                      </td>
                      <td className="px-3 py-4">
                        <div className="flex justify-center">
                          {refrigerantData.filter(r => !r.isExample).length > 1 && (
                            <button
                              onClick={() => removeEntry(data.id)}
                              className="text-red-500 hover:text-red-700 p-1 rounded-lg hover:bg-red-50 transition-colors duration-200"
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
                className="w-full py-3 bg-green-500 hover:bg-green-600 text-white rounded-lg font-medium transition-colors"
              >
                + 新增設備
              </button>
            </div>
            </div>
          </div>
        </div>

        <div className="h-20"></div>
      </div>

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
    </div>
  );
}
