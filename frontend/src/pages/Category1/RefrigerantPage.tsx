import { useState, useEffect, useMemo, useCallback } from 'react';
import { AlertCircle, X, Trash2 } from 'lucide-react'
import EvidenceUpload from '../../components/EvidenceUpload';
import { MemoryFile } from '../../components/EvidenceUpload';
import { EntryStatus } from '../../components/StatusSwitcher';
import BottomActionBar from '../../components/BottomActionBar';
import { useEditPermissions } from '../../hooks/useEditPermissions';
import { useFrontendStatus } from '../../hooks/useFrontendStatus';
import { updateEntryStatus, getEntryByPageKeyAndYear, upsertEnergyEntry } from '../../api/entries';
import { getEntryFiles, EvidenceFile, uploadEvidenceWithEntry, updateFileEntryAssociation, getFileUrl, deleteEvidenceFile } from '../../api/files';
import { supabase } from '../../lib/supabaseClient';
import { designTokens } from '../../utils/designTokens';
import { DocumentHandler } from '../../services/documentHandler';


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
  console.log('🔄 RefrigerantPage: Component started rendering')
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
  const [fileUrls, setFileUrls] = useState<Record<string, string>>({});
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setLightboxSrc(null) }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);






  // 修正後的檔案預覽URL函數 - 使用 signed URL
  const getFilePreviewUrl = (memoryFile?: MemoryFile, evidenceFile?: EvidenceFile): string => {
    try {
      // 優先使用已上傳的 Supabase 檔案 - 使用 signed URL
      if (evidenceFile?.file_path) {
        // 確保不是誤存的 blob URL
        if (evidenceFile.file_path.startsWith('blob:')) {
          console.warn('❌ 檔案路徑錯誤：不應該是 blob URL', {
            fileId: evidenceFile.id,
            filePath: evidenceFile.file_path
          })
          return ''
        }

        // 使用預先載入的 signed URL
        if (fileUrls[evidenceFile.id]) {
          console.log('📂 使用已載入的 signed URL:', {
            fileId: evidenceFile.id,
            fileName: evidenceFile.file_name,
            hasUrl: !!fileUrls[evidenceFile.id]
          })
          return fileUrls[evidenceFile.id]
        }

        console.log('⏳ Signed URL 尚未載入:', {
          fileId: evidenceFile.id,
          fileName: evidenceFile.file_name
        })
        return '' // 等待 signed URL 載入
      }

      // 記憶體檔案（尚未上傳）
      if (memoryFile) {
        // 如果已有 preview URL，直接使用
        if (memoryFile.preview) {
          console.log('🖼️ 使用記憶體檔案 preview URL:', {
            fileName: memoryFile.file_name,
            preview: memoryFile.preview
          })
          return memoryFile.preview
        }

        // 否則從 File 物件建立
        if (memoryFile.file && memoryFile.file instanceof File) {
          const blobUrl = URL.createObjectURL(memoryFile.file)
          console.log('🔗 建立新的 blob URL:', {
            fileName: memoryFile.file_name,
            blobUrl
          })
          return blobUrl
        }
      }

      return ''
    } catch (error) {
      console.error('❌ 取得預覽 URL 失敗:', {
        error,
        memoryFile: memoryFile?.file_name,
        evidenceFile: evidenceFile?.file_name
      })
      return ''
    }
  }

  const getFirstFile = (data: RefrigerantData) => {
    const memoryFile = data.memoryFiles?.[0]
    const evidenceFile = data.evidenceFiles?.[0]
    return { memoryFile, evidenceFile }
  }

  // 取得檔案資訊的輔助函數
  const getFileInfo = (memoryFile?: MemoryFile, evidenceFile?: EvidenceFile) => {
    if (evidenceFile) {
      return {
        name: evidenceFile.file_name,
        type: evidenceFile.mime_type,
        size: evidenceFile.file_size
      }
    }
    if (memoryFile) {
      return {
        name: memoryFile.file_name,
        type: memoryFile.mime_type,
        size: memoryFile.file?.size
      }
    }
    return null
  }

  // 檢查檔案是否為圖片
  const isImageFile = (memoryFile?: MemoryFile, evidenceFile?: EvidenceFile): boolean => {
    const mimeType = memoryFile?.mime_type || evidenceFile?.mime_type || ''
    const fileName = memoryFile?.file_name || evidenceFile?.file_name || ''

    return mimeType.startsWith('image/') ||
           /\.(jpg|jpeg|png|gif|bmp|webp)$/i.test(fileName)
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
  console.log('🔄 RefrigerantPage: About to initialize useFrontendStatus')
  const frontendStatus = useFrontendStatus({
    initialStatus,
    entryId: currentEntryId,
    onStatusChange: () => {},
    onError: (error) => {
      console.error('❌ RefrigerantPage: Status error:', error)
    },
    onSuccess: () => {}
  })
  console.log('✅ RefrigerantPage: useFrontendStatus initialized:', frontendStatus)

  const { currentStatus, handleDataChanged, handleSubmitSuccess, isInitialLoad } = frontendStatus
  console.log('🔄 RefrigerantPage: About to initialize useEditPermissions, currentStatus:', currentStatus)
  const editPermissions = useEditPermissions(currentStatus)
  console.log('✅ RefrigerantPage: useEditPermissions initialized:', editPermissions)

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
    console.log('🔄 RefrigerantPage: useEffect loadData started')
    const loadData = async () => {
      try {
        // ========== 診斷 Supabase Storage 問題 ==========
        console.log('🔍 ===== Supabase Storage 診斷開始 =====')

        // 1. 檢查 Supabase 設定
        console.log('📍 Supabase 專案 URL:', (supabase as any).supabaseUrl || 'URL無法取得')
        console.log('📍 Storage URL:', (supabase.storage as any).url || 'Storage URL無法取得')

        // 2. 測試 Storage 連線
        const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets()
        console.log('🗂️ Buckets 列表:', buckets?.map(b => b.name))
        if (bucketsError) console.error('❌ 無法列出 buckets:', bucketsError)

        // 3. 測試 evidence bucket
        const { data: testList, error: listError } = await supabase.storage
          .from('evidence')
          .list()
        console.log('📁 Evidence bucket 根目錄:', testList ? '可訪問' : '無法訪問')
        if (listError) console.error('❌ Evidence bucket 錯誤:', listError)

        // 4. 測試特定路徑
        const testPath = '14aa8e2d-ff2f-4163-8c3d-d3f893a9127c/refrigerant/2025/other'
        const { data: files, error: filesError } = await supabase.storage
          .from('evidence')
          .list(testPath)
        console.log(`📂 路徑 ${testPath}:`, files?.length || 0, '個檔案')
        if (files && files.length > 0) {
          console.log('檔案列表:', files.map(f => f.name))

          // 5. 測試取得檔案 URL
          const testFile = files[0]
          const { data: urlData } = supabase.storage
            .from('evidence')
            .getPublicUrl(`${testPath}/${testFile.name}`)
          console.log('🔗 測試檔案 URL:', urlData.publicUrl)

          // 6. 測試 URL 是否可訪問
          try {
            const response = await fetch(urlData.publicUrl)
            console.log('🌐 URL 訪問結果:', response.status, response.statusText)
          } catch (fetchError) {
            console.error('❌ 無法訪問 URL:', fetchError)
          }
        }

        console.log('🔍 ===== Supabase Storage 診斷結束 =====')
        // ========== 診斷程式碼結束 ==========

        // 原本的 loadData 程式碼繼續...
        console.log('🔄 RefrigerantPage: loadData executing, pageKey:', pageKey, 'year:', year)
        setSubmitting(true)
        console.log('🔄 RefrigerantPage: About to call getEntryByPageKeyAndYear')
        const existingEntry = await getEntryByPageKeyAndYear(pageKey, year)
        console.log('✅ RefrigerantPage: getEntryByPageKeyAndYear completed:', existingEntry)

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
                console.log('🔄 RefrigerantPage: Filtering files for refrigerant, total files:', files.length)
                const refrigerantFiles = files.filter(f =>
                  f.file_type === 'other' && f.page_key === pageKey
                )
                console.log('✅ RefrigerantPage: Found refrigerant files:', refrigerantFiles.length)

                // 按順序將檔案分配給設備項目
                updated = updated.map((item: any, index: number) => {
                  // 簡單按索引順序分配檔案
                  const assignedFile = refrigerantFiles[index] || null

                  console.log(`📁 設備 ${index + 1} 分配檔案:`, assignedFile?.file_name || '無')

                  return {
                    ...item,
                    evidenceFiles: assignedFile ? [assignedFile] : [],
                    memoryFiles: [],
                    proofFile: null
                  }
                })
              } catch (e) {
                console.error('❌ RefrigerantPage: Failed to load files:', e)
                // 載入檔案失敗時，確保資料結構完整
                updated = updated.map((item: any) => ({
                  ...item,
                  evidenceFiles: [],
                  proofFile: null
                }))
              }
            }

            const withExample = withExampleFirst(updated.filter((r: RefrigerantData) => !r.isExample))
            setRefrigerantData(withExample)
          }

          handleDataChanged()
        }

        isInitialLoad.current = false
      } catch (error) {
        console.error('❌ RefrigerantPage: 載入資料失敗:', error)
        // 即使載入失敗也要設置基礎狀態，避免無限載入
        setSubmitting(false)
        // 確保有基本的空白資料
        const emptyData = withExampleFirst([{
          id: 1,
          brandName: '',
          modelNumber: '',
          equipmentLocation: '',
          refrigerantType: '',
          fillAmount: 0,
          unit: 'kg',
          proofFile: null,
          memoryFiles: []
        }])
        setRefrigerantData(emptyData)
      } finally {
        setSubmitting(false)
      }
    }
    loadData()
  }, [])

  // 載入已上傳檔案的 signed URLs
  useEffect(() => {
    const loadFileUrls = async () => {
      console.log('🔗 開始載入檔案 signed URLs...')
      const urls: Record<string, string> = {}

      for (const item of refrigerantData) {
        if (item.evidenceFiles && item.evidenceFiles.length > 0) {
          for (const file of item.evidenceFiles) {
            try {
              console.log(`🔗 載入檔案 ${file.file_name} 的 signed URL...`)
              const url = await getFileUrl(file.file_path)
              urls[file.id] = url
              console.log(`✅ 成功載入 ${file.file_name} 的 signed URL`)
            } catch (error) {
              console.error(`❌ 載入檔案 ${file.file_name} 的 URL 失敗:`, error)
            }
          }
        }
      }

      console.log(`🔗 完成載入 ${Object.keys(urls).length} 個檔案的 signed URLs`)
      setFileUrls(urls)
    }

    const hasEvidenceFiles = refrigerantData.some(item => item.evidenceFiles && item.evidenceFiles.length > 0)
    if (hasEvidenceFiles) {
      loadFileUrls()
    } else {
      console.log('🔗 無需載入檔案 URLs - 沒有已上傳的檔案')
    }
  }, [refrigerantData])

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

      // 上傳前先刪除舊的冷媒檔案
      if (hasSubmittedBefore && currentEntryId) {
        try {
          console.log('🗑️ [RefrigerantPage] 刪除舊檔案開始')
          // 取得舊檔案
          const oldFiles = await getEntryFiles(currentEntryId)
          const oldRefrigerantFiles = oldFiles.filter(f =>
            f.file_type === 'other' && f.page_key === pageKey
          )

          console.log(`🗑️ [RefrigerantPage] 找到 ${oldRefrigerantFiles.length} 個舊檔案需要刪除`)

          // 刪除 Storage 和資料庫記錄
          for (const oldFile of oldRefrigerantFiles) {
            try {
              // 刪除 Storage 檔案
              const { error: storageError } = await supabase.storage
                .from('evidence')
                .remove([oldFile.file_path])

              if (storageError) {
                console.warn('❌ [RefrigerantPage] Storage 刪除失敗:', storageError)
              } else {
                console.log('✅ [RefrigerantPage] Storage 檔案刪除成功:', oldFile.file_name)
              }

              // 刪除資料庫記錄
              await deleteEvidenceFile(oldFile.id)
              console.log('✅ [RefrigerantPage] 資料庫記錄刪除成功:', oldFile.file_name)
            } catch (fileError) {
              console.warn('❌ [RefrigerantPage] 刪除單個檔案失敗:', oldFile.file_name, fileError)
            }
          }
        } catch (error) {
          console.warn('❌ [RefrigerantPage] 刪除舊檔案失敗:', error)
          // 繼續執行上傳，不因為刪除失敗而中止
        }
      }

      // 上傳新檔案
      const uploadedFiles: EvidenceFile[] = []
      for (const [index, item] of userRows.entries()) {
        if (item.memoryFiles && item.memoryFiles.length > 0) {
          for (const memoryFile of item.memoryFiles) {
            try {
              const uploadedFile = await uploadEvidenceWithEntry(memoryFile.file, {
                entryId: entry_id,
                pageKey: pageKey,
                year: year,
                category: 'other'
              })
              uploadedFiles.push(uploadedFile)
              console.log(`✅ [RefrigerantPage] 設備 ${index + 1} 檔案上傳成功:`, uploadedFile.file_name)
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

  const handleClearConfirm = async () => {
    console.log('🗑️ [RefrigerantPage] ===== CLEAR BUTTON CLICKED =====')

    const clearSuccess = DocumentHandler.handleClear({
      currentStatus: currentStatus,
      title: '冷媒資料清除',
      message: '確定要清除所有冷媒使用資料嗎？此操作無法復原。',
      onClear: () => {
        setSubmitting(true)
        try {
          console.log('🗑️ [RefrigerantPage] Starting complete clear operation...')

          // 清理記憶體檔案
          refrigerantData.forEach(item => {
            if (item.memoryFiles) {
              DocumentHandler.clearAllMemoryFiles(item.memoryFiles)
            }
          })

          // 原有的清除邏輯保持不變
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
          }]))
          setHasSubmittedBefore(false)
          setShowClearConfirmModal(false)

          // 成功訊息需要設定到適當的狀態管理中

        } catch (error) {
          console.error('❌ [RefrigerantPage] Clear operation failed:', error)
          // 錯誤訊息需要設定到適當的狀態管理中
        } finally {
          console.log('🗑️ [RefrigerantPage] Clear operation finished, resetting loading state')
          setSubmitting(false)
        }
      }
    })

    if (!clearSuccess && currentStatus === 'approved') {
      // 錯誤訊息需要設定到適當的狀態管理中
    }
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
                          // 一般列：檔案顯示區域
                          <div className="w-36 mx-auto">
                            {(() => {
                              const { memoryFile, evidenceFile } = getFirstFile(data)
                              const hasFile = memoryFile || evidenceFile
                              const fileInfo = getFileInfo(memoryFile, evidenceFile)
                              const previewUrl = getFilePreviewUrl(memoryFile, evidenceFile)
                              const isImage = fileInfo?.type?.startsWith('image/') ||
                                             (fileInfo?.name && /\.(jpg|jpeg|png|gif|bmp|webp)$/i.test(fileInfo.name))

                              if (hasFile) {
                                return (
                                  <div className="rounded-lg border border-gray-200 overflow-hidden w-36 mx-auto">
                                    {/* 圖片預覽區 */}
                                    <div className="p-2 bg-gray-50">
                                      {isImage && previewUrl ? (
                                        <img
                                          src={previewUrl}
                                          alt={fileInfo?.name || '設備照片'}
                                          className="w-full h-24 object-cover rounded cursor-pointer hover:opacity-90"
                                          onClick={() => {
                                            // 根據檔案類型使用不同的 URL 策略
                                            if (evidenceFile && fileUrls[evidenceFile.id]) {
                                              // 已上傳的檔案：使用 signed URL
                                              setLightboxSrc(fileUrls[evidenceFile.id])
                                            } else if (memoryFile && memoryFile.preview) {
                                              // 記憶體檔案：使用 preview URL
                                              setLightboxSrc(memoryFile.preview)
                                            } else if (previewUrl) {
                                              // 備用：使用原本的 preview URL
                                              setLightboxSrc(previewUrl)
                                            }
                                          }}
                                          onError={(e) => {
                                            console.error('❌ 圖片載入失敗:', {
                                              src: previewUrl,
                                              fileName: fileInfo?.name,
                                              evidenceFileId: evidenceFile?.id,
                                              hasSignedUrl: evidenceFile ? !!fileUrls[evidenceFile.id] : false
                                            })
                                            // 載入失敗時顯示占位圖
                                            const imgElement = e.currentTarget
                                            const container = imgElement.parentElement
                                            if (container) {
                                              container.innerHTML = `
                                                <div class="w-full h-24 bg-red-50 rounded flex flex-col items-center justify-center text-red-500 text-xs">
                                                  <svg class="w-8 h-8 mb-1" fill="currentColor" viewBox="0 0 20 20">
                                                    <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd"/>
                                                  </svg>
                                                  <span>載入失敗</span>
                                                </div>
                                              `
                                            }
                                          }}
                                        />
                                      ) : isImage && !previewUrl ? (
                                        // 圖片載入中
                                        <div className="w-full h-24 bg-blue-50 rounded flex items-center justify-center">
                                          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                                        </div>
                                      ) : (
                                        // 非圖片檔案顯示圖標
                                        <div className="w-full h-24 bg-blue-50 rounded flex items-center justify-center">
                                          <svg className="w-10 h-10 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                                            <path d="M9 2a2 2 0 00-2 2v8a2 2 0 002 2h6a2 2 0 002-2V6.414A2 2 0 0016.414 5L14 2.586A2 2 0 0012.586 2H9z"/>
                                          </svg>
                                        </div>
                                      )}
                                    </div>

                                    {/* 檔案資訊 */}
                                    <div className="px-2 py-1 bg-white border-t">
                                      <p className="text-xs text-gray-700 truncate" title={fileInfo?.name}>
                                        {fileInfo?.name || '未知檔案'}
                                      </p>
                                      <p className="text-xs text-gray-500">
                                        {fileInfo?.size ? `${Math.round(fileInfo.size / 1024)} KB` : ''}
                                      </p>
                                    </div>

                                    {/* 刪除按鈕 */}
                                    <button
                                      className="w-full py-1.5 text-xs text-red-600 hover:bg-red-50 border-t border-gray-200 flex items-center justify-center space-x-1 transition-colors"
                                      onClick={() => {
                                        if (memoryFile) {
                                          updateEntry(data.id, 'memoryFiles', [])
                                        }
                                        if (evidenceFile) {
                                          updateEntry(data.id, 'evidenceFiles', [])
                                        }
                                      }}
                                    >
                                      <Trash2 className="h-3 w-3" />
                                      <span>移除</span>
                                    </button>
                                  </div>
                                )
                              } else {
                                // 沒有檔案時，顯示上傳區域
                                return (
                                  <EvidenceUpload
                                    key={`upload-${data.id}`}
                                    pageKey={pageKey}
                                    month={index}  // 使用實際索引作為月份識別符
                                    files={data.evidenceFiles || EMPTY_FILES}
                                    onFilesChange={(files) => updateEntry(data.id, 'evidenceFiles', files)}
                                    memoryFiles={data.memoryFiles || []}
                                    onMemoryFilesChange={handleMemoryFilesChange(data.id)}
                                    maxFiles={1}
                                    kind="other"
                                    disabled={submitting}
                                    mode="edit"
                                    hideFileCount={true}
                                  />
                                )
                              }
                            })()}
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
