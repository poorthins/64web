import { useState, useEffect, useMemo } from 'react';
import { Upload, Trash2, CheckCircle } from 'lucide-react'
import FileUpload from '../../components/FileUpload';
import StatusIndicator from '../../components/StatusIndicator';
import { EntryStatus } from '../../components/StatusSwitcher';
import BottomActionBar from '../../components/BottomActionBar';
import { useEditPermissions } from '../../hooks/useEditPermissions';
import { useFrontendStatus } from '../../hooks/useFrontendStatus';
import { updateEntryStatus, getEntryByPageKeyAndYear, upsertEnergyEntry } from '../../api/entries';
import { getEntryFiles, EvidenceFile } from '../../api/files';
import { designTokens } from '../../utils/designTokens';


interface RefrigerantData {
  id: number;
  equipmentType: string;
  equipmentLocation: string;
  refrigerantType: string;
  fillAmount: number;
  unit: 'gram' | 'kg';
  proofFile: File | null;
  evidenceFiles?: EvidenceFile[]; // 新增：存儲已上傳的佐證檔案
}

export default function RefrigerantPage() {
  const pageKey = 'refrigerant'
  const [year] = useState(new Date().getFullYear())
  const [initialStatus, setInitialStatus] = useState<EntryStatus>('submitted')
  const [currentEntryId, setCurrentEntryId] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [hasSubmittedBefore, setHasSubmittedBefore] = useState(false)
  const [refrigerantData, setRefrigerantData] = useState<RefrigerantData[]>([
    {
      id: 1,
      equipmentType: '',
      equipmentLocation: '',
      refrigerantType: '',
      fillAmount: 0,
      unit: 'kg',
      proofFile: null
    }
  ]);

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
  
  // 判斷是否有資料
  const hasAnyData = useMemo(() => {
    const hasRefrigerantData = refrigerantData.some(r =>
      r.equipmentType.trim() !== '' ||
      r.equipmentLocation.trim() !== '' ||
      r.refrigerantType.trim() !== '' ||
      r.fillAmount > 0 ||
      r.proofFile !== null ||
      (r.evidenceFiles && r.evidenceFiles.length > 0)
    )
    return hasRefrigerantData
  }, [refrigerantData])
  
  // 允許所有狀態編輯
  const isReadOnly = false

  // 載入現有記錄
  useEffect(() => {
    const loadData = async () => {
      try {
        setSubmitting(true)
        console.log(`Loading existing data for ${pageKey}, year: ${year}`)
        
        // 檢查是否已有非草稿記錄
        const existingEntry = await getEntryByPageKeyAndYear(pageKey, year)
        
        if (existingEntry) {
          console.log('Found existing entry:', existingEntry)
          setInitialStatus(existingEntry.status as EntryStatus)
          setCurrentEntryId(existingEntry.id)
          setHasSubmittedBefore(true)
          
          // 載入已提交的記錄數據供編輯
          if (existingEntry.payload?.refrigerantData) {
            // 載入相關檔案
            let updatedRefrigerantData = existingEntry.payload.refrigerantData
            
            if (existingEntry.id) {
              try {
                const files = await getEntryFiles(existingEntry.id)
                console.log(`📁 [RefrigerantPage] Loaded ${files.length} files for entry ${existingEntry.id}`)

                // 過濾出冷媒相關的檔案
                const refrigerantFiles = files.filter(f =>
                  f.kind === 'usage_evidence' &&
                  f.page_key === pageKey
                )

                console.log(`📁 [RefrigerantPage] Found ${refrigerantFiles.length} refrigerant files:`,
                  refrigerantFiles.map(f => ({ id: f.id, name: f.file_name, path: f.file_path })))

                // 更新冷媒記錄中的檔案
                updatedRefrigerantData = existingEntry.payload.refrigerantData.map((item: any, index: number) => {
                  // 假設檔案按照記錄順序關聯，或可以根據檔案名稱/路徑匹配
                  const itemFiles = refrigerantFiles.filter(f => {
                    // 嘗試從檔案路徑或名稱匹配到對應的記錄
                    // 這裡使用簡單的索引匹配，實際應用可能需要更複雜的邏輯
                    return f.file_path.includes(`${index + 1}`) ||
                           f.file_path.includes(`item_${item.id}`) ||
                           refrigerantFiles.indexOf(f) === index
                  })

                  return {
                    ...item,
                    evidenceFiles: itemFiles,
                    // 保持 proofFile 為 null，因為這是 File 型別，用於新上傳
                    proofFile: null
                  }
                })

                console.log(`📁 [RefrigerantPage] Updated refrigerant data with files:`,
                  updatedRefrigerantData.map((item: any) => ({
                    id: item.id,
                    filesCount: item.evidenceFiles?.length || 0
                  })))
              } catch (fileError) {
                console.error('❌ [RefrigerantPage] Failed to load files:', fileError)
              }
            }
            
            setRefrigerantData(updatedRefrigerantData)
          }
          
          // 設定狀態
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
      equipmentType: '',
      equipmentLocation: '',
      refrigerantType: '',
      fillAmount: 0,
      unit: 'kg',
      proofFile: null
    };
    setRefrigerantData([...refrigerantData, newEntry]);
    
    // 草稿功能已移除
  };

  const removeEntry = (id: number) => {
    if (refrigerantData.length > 1) {
      setRefrigerantData(refrigerantData.filter(item => item.id !== id));
      
      // 草稿功能已移除
    }
  };

  const updateEntry = (id: number, field: keyof RefrigerantData, value: any) => {
    setRefrigerantData(prev => 
      prev.map(item => 
        item.id === id ? { ...item, [field]: value } : item
      )
    );
    
    // 草稿功能已移除
  };

  const handleSubmit = async () => {
    const errors: string[] = [];
    
    refrigerantData.forEach((data, index) => {
      if (!data.equipmentType.trim()) {
        errors.push(`第${index + 1}項設備類型不能為空`);
      }
      if (!data.equipmentLocation.trim()) {
        errors.push(`第${index + 1}項設備位置不能為空`);
      }
      if (!data.refrigerantType.trim()) {
        errors.push(`第${index + 1}項冷媒類型不能為空`);
      }
      if (data.fillAmount <= 0) {
        errors.push(`第${index + 1}項填充量必須大於0`);
      }
      // 檢查是否有佐證檔案（新上傳或已存在的）
      const hasFiles = data.proofFile !== null || (data.evidenceFiles && data.evidenceFiles.length > 0)
      if (!hasFiles) {
        errors.push(`第${index + 1}項未上傳佐證資料`);
      }
    });

    if (errors.length > 0) {
      alert('請修正以下問題：\n' + errors.join('\n'));
      return;
    }
    
    setSubmitting(true);
    try {
      // 計算總填充量（轉換為統一單位kg）
      const totalFillAmount = refrigerantData.reduce((sum, item) => {
        const amountInKg = item.unit === 'gram' ? item.fillAmount / 1000 : item.fillAmount
        return sum + amountInKg
      }, 0)

      // 建立填報輸入資料
      const entryInput = {
        page_key: pageKey,
        period_year: year,
        unit: 'kg',
        monthly: { '1': totalFillAmount }, // 冷媒通常記錄在第1個月
        notes: `冷媒設備共 ${refrigerantData.length} 台，總填充量: ${totalFillAmount} kg`
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
      alert('冷媒設備資料已保存！');
    } catch (error) {
      console.error('Submit error:', error)
      alert(error instanceof Error ? error.message : '提交失敗，請重試');
    } finally {
      setSubmitting(false);
    }
  };

  const handleClear = () => {
    if (confirm('確定要清除所有數據嗎？此操作無法復原。')) {
      setRefrigerantData([{
        id: 1,
        equipmentType: '',
        equipmentLocation: '',
        refrigerantType: '',
        fillAmount: 0,
        unit: 'kg',
        proofFile: null
      }]);
      setHasSubmittedBefore(false)
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
      console.error('Status update failed:', error)
    }
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
            冷媒 使用數量填報
          </h1>
          <p className="text-lg text-center text-gray-600 mb-6">
            請上傳 MSDS 文件並填入各月份使用數據進行碳排放計算
          </p>
        </div>

        {/* 冷媒設備資料 */}
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
            冷媒設備資料
          </h2>

          <div className="flex justify-end mb-6">
            <button
              onClick={addNewEntry}
              disabled={isReadOnly}
              className={`px-4 py-2 rounded-lg font-medium transition-colors duration-200 flex items-center space-x-2 ${
                isReadOnly
                  ? 'bg-gray-400 text-gray-200 cursor-not-allowed'
                  : 'bg-brand-500 hover:bg-brand-600 text-white'
              }`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              <span>新增設備</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse bg-white border border-gray-200 rounded-lg">
            <thead>
              <tr className="bg-gradient-to-r from-brand-500 to-brand-600">
                <th className="px-4 py-4 text-center text-base font-semibold text-white border-r border-brand-400/30">設備類型</th>
                <th className="px-4 py-4 text-center text-base font-semibold text-white border-r border-brand-400/30">設備位置</th>
                <th className="px-4 py-4 text-center text-base font-semibold text-white border-r border-brand-400/30">冷媒類型</th>
                <th className="px-4 py-4 text-center text-base font-semibold text-white border-r border-brand-400/30">填充量</th>
                <th className="px-4 py-4 text-center text-base font-semibold text-white border-r border-brand-400/30">單位</th>
                <th className="px-4 py-4 text-center text-base font-semibold text-white border-r border-brand-400/30">佐證資料</th>
                <th className="px-4 py-4 text-center text-base font-semibold text-white whitespace-nowrap">編輯</th>
              </tr>
            </thead>
            <tbody>
              {refrigerantData.map((data) => (
                <tr key={data.id} className="hover:bg-brand-50 transition-colors duration-200 border-b border-gray-100">
                  <td className="px-4 py-4">
                    <input
                      type="text"
                      value={data.equipmentType}
                      onChange={(e) => updateEntry(data.id, 'equipmentType', e.target.value)}
                      className="w-full px-3 py-2 text-base border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 hover:border-brand-300 transition-colors duration-200"
                      placeholder="例：冷氣機"
                    />
                  </td>
                  <td className="px-4 py-4">
                    <input
                      type="text"
                      value={data.equipmentLocation}
                      onChange={(e) => updateEntry(data.id, 'equipmentLocation', e.target.value)}
                      className="w-full px-3 py-2 text-base border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 hover:border-brand-300 transition-colors duration-200"
                      placeholder="例：辦公室A棟"
                    />
                  </td>
                  <td className="px-4 py-4">
                    <input
                      type="text"
                      value={data.refrigerantType}
                      onChange={(e) => updateEntry(data.id, 'refrigerantType', e.target.value)}
                      className="w-full px-3 py-2 text-base border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 hover:border-brand-300 transition-colors duration-200"
                      placeholder="例：R-410A"
                    />
                  </td>
                  <td className="px-4 py-4">
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={data.fillAmount || ''}
                      onChange={(e) => updateEntry(data.id, 'fillAmount', parseFloat(e.target.value) || 0)}
                      className="w-full px-3 py-2 text-base border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 hover:border-brand-300 transition-colors duration-200"
                      placeholder="0"
                    />
                  </td>
                  <td className="px-4 py-4">
                    <select
                      value={data.unit}
                      onChange={(e) => updateEntry(data.id, 'unit', e.target.value as 'gram' | 'kg')}
                      className="w-full px-3 py-2 text-base border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 hover:border-brand-300 transition-colors duration-200 bg-white min-w-[90px]"
                    >
                      <option value="kg">公斤</option>
                      <option value="gram">公克</option>
                    </select>
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex flex-col items-center space-y-2">
                      {/* 顯示已上傳的檔案 */}
                      {data.evidenceFiles && data.evidenceFiles.length > 0 ? (
                        <div className="w-full">
                          <div className="text-sm text-green-600 mb-1">已上傳檔案:</div>
                          {data.evidenceFiles.map((file, fileIndex) => (
                            <div key={file.id} className="flex items-center justify-between bg-green-50 border border-green-200 rounded p-2 mb-1">
                              <span className="text-sm text-green-700 truncate" title={file.file_name}>
                                {file.file_name}
                              </span>
                              <div className="flex items-center space-x-1">
                                <CheckCircle className="w-3 h-3 text-green-500" />
                                <span className="text-sm text-green-600">
                                  {Math.round(file.file_size / 1024)}KB
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-sm text-gray-500 mb-1">無已上傳檔案</div>
                      )}

                      {/* 檔案上傳元件 */}
                      <div className="w-36">
                        <FileUpload
                          onFileSelect={(file) => updateEntry(data.id, 'proofFile', file)}
                          accept=".jpg,.jpeg,.png,.pdf"
                          maxSize={5 * 1024 * 1024}
                          currentFile={data.proofFile}
                          placeholder="上傳新佐證"
                        />
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex justify-center">
                      {refrigerantData.length > 1 && (
                        <button
                          onClick={() => removeEntry(data.id)}
                          className="text-red-500 hover:text-red-700 p-2 rounded-lg hover:bg-red-50 transition-colors duration-200"
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
              ))}
            </tbody>
            </table>
          </div>
        </div>

        {/* 底部空間，避免內容被固定底部欄遮擋 */}
        <div className="h-20"></div>
      </div>

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
        onClear={handleClear}
        designTokens={designTokens}
      />
    </div>
  );
}
