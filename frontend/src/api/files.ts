import { supabase } from '../supabaseClient'
import { validateAuth, handleAPIError } from '../utils/authHelpers'
import { getCategoryFromPageKey } from './entries'
import { getCategoryInfo } from '../utils/categoryConstants'


export interface FileMetadata {
  pageKey: string
  standard: string  // ISO 標準代碼：'64' (ISO 14064) 或 '67' (ISO 14067)
  year?: number  // 期間年份，預設為當前年份
  month?: number  // 僅用於 usage_evidence，表示月份 (1-12)
  recordIndex?: number  // 用於多筆記錄頁面（如柴油），表示記錄索引 (0, 1, 2...) - 舊做法
  recordId?: string  // 用於多筆記錄頁面，穩定的記錄 ID（如 "fire_extinguisher_123"）- 新做法
  allRecordIds?: string[]  // ⭐ 群組的所有 recordId（用於 N:1 共享佐證）
  fileType?: 'msds' | 'usage_evidence' | 'other' | 'heat_value_evidence' | 'annual_evidence' | 'nameplate_evidence' | 'sf6_nameplate' | 'sf6_certificate'  // ⭐ 新增 SF6 檔案類型
  category?: 'msds' | 'usage_evidence' | 'other' | 'heat_value_evidence' | 'annual_evidence' | 'nameplate_evidence' | 'sf6_nameplate' | 'sf6_certificate'  // 向後相容（已廢棄）
}

export interface UploadOptions {
  allowOverwrite?: boolean
}

export interface EvidenceFile {
  id: string
  owner_id: string
  entry_id: string
  file_path: string
  file_name: string
  mime_type: string
  file_size: number
  created_at: string
  month?: number | null  // 月份欄位，NULL 表示 MSDS
  page_key?: string      // 頁面標識符
  record_index?: number | null  // 記錄索引（用於多筆記錄頁面）- 舊做法
  record_id?: string | null  // 記錄 ID（穩定 ID）- 舊做法
  record_ids?: string[] | null  // 記錄 IDs（多對一關係）- 新做法
  file_type: 'msds' | 'usage_evidence' | 'other' | 'heat_value_evidence' | 'annual_evidence' | 'nameplate_evidence' | 'sf6_nameplate' | 'sf6_certificate'  // 檔案類型欄位 (必填)
  // Join fields from energy_entries
  status?: 'saved' | 'submitted' | 'approved' | 'rejected'  // From energy_entries
  period_year?: number  // From energy_entries
}

/**
 * 推斷檔案 MIME 類型
 */
function inferMimeType(file: File): string {
  // 優先使用 file.type（排除通用型）
  if (file.type && file.type !== 'application/octet-stream') {
    return file.type
  }

  // 如果 file.type 為空或是通用型，嘗試從副檔名推斷
  const extension = file.name.split('.').pop()?.toLowerCase()

  switch (extension) {
    case 'jpg':
    case 'jpeg':
      return 'image/jpeg'
    case 'png':
      return 'image/png'
    case 'gif':
      return 'image/gif'
    case 'webp':
      return 'image/webp'
    case 'heic':
      return 'image/heic'
    case 'heif':
      return 'image/heif'
    case 'pdf':
      return 'application/pdf'
    case 'xlsx':
      return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    case 'xls':
      return 'application/vnd.ms-excel'
    case 'docx':
      return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    case 'doc':
      return 'application/msword'
    default:
      return 'application/octet-stream'
  }
}

/**
 * 驗證檔案類型（已移除限制，允許所有類型）
 */
function validateFileType(file: File): { valid: boolean; error?: string } {
  // 移除檔案類型限制，允許所有檔案上傳
  return { valid: true }
}

/**
 * 上傳證據檔案到 Storage 並建立記錄（支援檔案覆蓋）
 * 注意：檔案會自動關聯到對應的 energy_entries 記錄
 * 如果該用戶的該頁面還沒有 entry 記錄，會自動建立一個草稿記錄
 */
export async function uploadEvidence(file: File, meta: FileMetadata & { entryId?: string; allowOverwrite?: boolean }): Promise<EvidenceFile> {
  return await uploadEvidenceWithValidation(file, meta, true)
}

/**
 * 上傳證據檔案並驗證必須有 entry_id
 * @param file - 要上傳的檔案
 * @param meta - 檔案元數據，必須包含 entryId
 * @returns Promise<EvidenceFile>
 */
export async function uploadEvidenceWithEntry(file: File, meta: FileMetadata & { entryId: string; allowOverwrite?: boolean }): Promise<EvidenceFile> {
  return await uploadEvidenceWithValidation(file, meta, false)
}

/**
 * 內部函數：上傳證據檔案的核心邏輯
 * @param file - 要上傳的檔案
 * @param meta - 檔案元數據
 * @param allowAutoCreateEntry - 是否允許自動建立 energy_entry
 */
async function uploadEvidenceWithValidation(file: File, meta: FileMetadata & { entryId?: string; allowOverwrite?: boolean }, allowAutoCreateEntry: boolean): Promise<EvidenceFile> {
  console.log('🔍 [DEBUG] uploadEvidenceWithValidation called:', {
    fileName: file.name,
    fileSize: file.size,
    meta,
    allowAutoCreateEntry
  })

  try {
    const authResult = await validateAuth()
    console.log('🔍 [DEBUG] Auth validation result:', {
      hasError: !!authResult.error,
      hasUser: !!authResult.user,
      userId: authResult.user?.id,
      errorMessage: authResult.error?.message
    })

    if (authResult.error || !authResult.user) {
      console.error('❌ [DEBUG] Auth validation failed:', authResult.error)
      throw authResult.error || new Error('使用者未登入')
    }
    const user = authResult.user

    // 確保 year 有值，預設為當前年份
    const currentYear = meta.year || new Date().getFullYear()

    // 驗證檔案類型
    const typeValidation = validateFileType(file)
    if (!typeValidation.valid) {
      throw new Error(typeValidation.error!)
    }

    // 推斷正確的 MIME 類型
    const resolvedType = inferMimeType(file)

    // Month 和 file_type 參數驗證（優先使用 meta.fileType）
    const expectedFileType = meta.fileType || (meta.category === 'msds' ? 'msds' :
                            meta.category === 'usage_evidence' ? 'usage_evidence' :
                            meta.category === 'annual_evidence' ? 'annual_evidence' :
                            meta.category === 'nameplate_evidence' ? 'nameplate_evidence' : 'other')

    console.log('🔍 [uploadEvidence] File type validation:', {
      file_name: file.name,
      fileType: meta.fileType,
      category: meta.category,
      month_input: meta.month,
      expected_file_type: expectedFileType
    })

    // 記錄上傳參數（不做限制）
    console.log('📁 [uploadEvidence] File upload info:', {
      file_name: file.name,
      category: meta.category || 'not specified',
      month: meta.month || 'not specified',
      page_key: meta.pageKey
    })

    // 只有當 allowOverwrite 為 true 時才刪除現有檔案
    if (meta.allowOverwrite) {
      // 檢查是否已有相同條件的檔案（同一使用者、頁面、年份）
      let existingFileQuery = supabase
        .from('entry_files')
        .select(`
          *,
          energy_entries!inner(page_key, owner_id, period_year, status)
        `)
        .eq('owner_id', user.id)
        .eq('energy_entries.page_key', meta.pageKey)
        .eq('energy_entries.owner_id', user.id)
        .eq('energy_entries.period_year', meta.year)
        .eq('energy_entries.status', 'submitted')

      const { data: existingFiles, error: queryError } = await existingFileQuery

      if (queryError) {
        console.error('Error querying existing files:', queryError)
        throw handleAPIError(queryError, '查詢現有檔案失敗')
      }

      // 如果有現有檔案且允許覆蓋，先刪除舊檔案
      if (existingFiles && existingFiles.length > 0) {
        for (const existingFile of existingFiles) {
          // 從 Storage 刪除舊檔案
          const { error: storageDeleteError } = await supabase.storage
            .from('evidence')
            .remove([existingFile.file_path])

          if (storageDeleteError) {
            console.warn('Warning: Failed to delete old file from storage:', storageDeleteError)
          }

          // 從資料庫刪除舊記錄
          const { error: dbDeleteError } = await supabase
            .from('entry_files')
            .delete()
            .eq('id', existingFile.id)

          if (dbDeleteError) {
            console.warn('Warning: Failed to delete old file record:', dbDeleteError)
          }
        }
      }
    }

    // 安全處理檔案名稱（使用字符替換確保 Supabase Storage 兼容性）
    console.log('🔧 [DEBUG] 處理檔案名稱:', {
      原始檔名: file.name,
      檔案大小: file.size,
      檔案類型: file.type
    })

    const safeName = file.name
      .normalize('NFKD')                    // 標準化 Unicode 字符
      .replace(/[^\x00-\x7F]/g, '')         // 移除所有非 ASCII 字符
      .replace(/[\/\\:*?"<>|\s]+/g, '_')    // 替換特殊字符和空格
      .replace(/_{2,}/g, '_')               // 將多個連續底線合併為一個
      .replace(/^_+|_+$/g, '')              // 移除開頭和結尾的底線
      .substring(0, 50) || 'file';          // 限制長度，如果為空則使用預設名稱

    console.log('✅ [DEBUG] 檔案名稱處理完成:', {
      原始檔名: file.name,
      安全檔名: safeName,
      處理步驟: '標準化 -> 移除非ASCII -> 替換特殊字符 -> 限制長度'
    })
    
    const timestamp = Date.now()
    const randomSuffix = Math.random().toString(36).substring(2, 8) // 新增隨機字串以防止衝突
    
    // 使用時間戳 + 隨機字串確保檔案名稱唯一性
    const fileName = `${timestamp}_${randomSuffix}_${safeName}`
    
    console.log('🔍 [DEBUG] Building file path:', {
      userId: user.id,
      pageKey: meta.pageKey,
      year: meta.year,
      category: meta.category,
      month: meta.month,
      fileName: fileName,
      safeName: safeName
    })

    // 構造檔案路徑：{userId}/{standard}/{pageKey}/{month?}/{filename}
    const monthPath = meta.month ? `/${meta.month}` : ''
    const filePath = `${user.id}/${meta.standard}/${meta.pageKey}${monthPath}/${fileName}`

    console.log('🔍 [DEBUG] Constructed file path:', {
      monthPath,
      fullFilePath: filePath
    })

    // 驗證檔案路徑格式
    if (filePath.includes('//') || filePath.includes('..') || filePath.length > 1024) {
      throw new Error('檔案路徑格式無效')
    }


    // 上傳檔案到 Storage
    console.log('🔍 [DEBUG] Starting storage upload:', {
      bucket: 'evidence',
      filePath,
      fileSize: file.size,
      contentType: resolvedType,
      supabaseUrl: (supabase as any)?.supabaseUrl || 'unknown',
      hasStorageClient: !!supabase.storage
    })

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('evidence')
      .upload(filePath, file, {
        upsert: true,
        contentType: resolvedType
      })

    if (uploadError) {
      console.error('❌ [DEBUG] Storage upload failed:', {
        error: uploadError,
        errorMessage: uploadError.message,
        errorCode: (uploadError as any)?.code,
        statusCode: (uploadError as any)?.statusCode,
        filePath,
        fileSize: file.size
      })

      // 特殊錯誤處理
      if (uploadError.message.includes('Bucket not found')) {
        console.error('❌ [DEBUG] Bucket not found error - evidence bucket does not exist')
        throw new Error('請先建立 evidence bucket 並確認名稱')
      }

      if (uploadError.message.includes('Permission denied') || (uploadError as any)?.statusCode === 401) {
        console.error('❌ [DEBUG] Permission denied - authentication or RLS issue')
      }

      throw handleAPIError(uploadError, '檔案上傳失敗')
    }

    console.log('✅ [DEBUG] Storage upload successful:', {
      uploadPath: uploadData?.path,
      uploadId: uploadData?.id
    })

    // 驗證 entry_id 是否存在（必須關聯到現有的 energy_entries 記錄）
    if (!meta.entryId) {
      if (!allowAutoCreateEntry) {
        throw new Error('檔案上傳必須關聯到現有的能源記錄')
      }
      
      // 嘗試尋找現有的已提交記錄
      // 根據資料庫唯一約束，使用 category 而不是 page_key 查詢
      const categoryInfo = getCategoryInfo(meta.pageKey)
      const { data: existingEntry } = await supabase
        .from('energy_entries')
        .select('id')
        .eq('owner_id', user.id)
        .eq('category', categoryInfo.category)
        .eq('period_year', meta.year)
        .eq('status', 'submitted')
        .maybeSingle()
      
      if (!existingEntry) {
        console.log('🔍 [uploadEvidenceWithValidation] 沒有找到記錄，準備建立新記錄')
        console.log('🔍 [uploadEvidenceWithValidation] pageKey:', meta.pageKey)

        // 獲取完整的 category 資訊，包含 scope
        const categoryInfo = getCategoryInfo(meta.pageKey)
        console.log('🔍 [uploadEvidenceWithValidation] categoryInfo:', categoryInfo)

        // 如果沒有草稿記錄，嘗試建立或更新一個
        // 使用 upsert 避免重複插入錯誤
        const { data: upsertResult, error: entryError } = await supabase
          .from('energy_entries')
          .upsert({
            owner_id: user.id,
            page_key: meta.pageKey,
            period_year: meta.year,
            category: categoryInfo.category,
            scope: categoryInfo.scope,
            unit: categoryInfo.unit,
            amount: 0.00001, // 預設為最小值避免 amount > 0 約束錯誤
            status: 'submitted',
            period_start: `${meta.year}-01-01`,
            period_end: `${meta.year}-12-31`,
            payload: {}
          }, { 
            onConflict: 'owner_id,category,period_year',  // 根據資料庫唯一約束進行衝突處理
            ignoreDuplicates: false  // 不忽略重複，而是更新
          })
          .select('id')
          .maybeSingle()  // 使用 maybeSingle 避免 single() 的錯誤
        
        if (entryError) {
          throw new Error(`無法建立能源記錄: ${entryError.message}`)
        }
        
        // 如果 upsert 成功但沒有返回資料，再查詢一次
        if (!upsertResult) {
          // 等待一小段時間確保資料庫操作完成
          await new Promise(resolve => setTimeout(resolve, 100))
          
          const { data: existingAfterUpsert, error: queryError } = await supabase
            .from('energy_entries')
            .select('id')
            .eq('owner_id', user.id)
            .eq('category', categoryInfo.category)
            .eq('period_year', meta.year)
            .eq('status', 'submitted')
            .maybeSingle()
          
          if (queryError) {
            console.error('Query error after upsert:', queryError)
            throw new Error(`查詢能源記錄失敗: ${queryError.message}`)
          }
          
          if (!existingAfterUpsert) {
            // 嘗試查詢所有狀態的記錄，看看是否存在但狀態不同
            const { data: anyStatusRecord, error: anyStatusError } = await supabase
              .from('energy_entries')
              .select('id, status')
              .eq('owner_id', user.id)
              .eq('category', categoryInfo.category)
              .eq('period_year', meta.year)
              .maybeSingle()
            
            if (anyStatusError) {
              console.error('Any status query error:', anyStatusError)
            }
            
            if (anyStatusRecord) {
              meta.entryId = anyStatusRecord.id
            } else {
              console.error('No record found after upsert. Debug info:', {
                user_id: user.id,
                category: categoryInfo.category,
                period_year: meta.year,
                page_key: meta.pageKey
              })
              throw new Error('建立能源記錄後無法找到該記錄')
            }
          } else {
            meta.entryId = existingAfterUpsert.id
          }
        } else {
          meta.entryId = upsertResult.id
        }
      } else {
        meta.entryId = existingEntry.id
      }
    }
    
    // 最終驗證 entry_id 是否存在
    if (!meta.entryId) {
      throw new Error('無法取得有效的能源記錄 ID')
    }

    // 建立資料庫記錄（優先使用 meta.fileType）
    const monthValue = expectedFileType === 'usage_evidence' ? meta.month : null
    const fileTypeValue = meta.fileType || (meta.category === 'msds' ? 'msds' :
                         meta.category === 'usage_evidence' ? 'usage_evidence' :
                         meta.category === 'annual_evidence' ? 'annual_evidence' :
                         meta.category === 'nameplate_evidence' ? 'nameplate_evidence' : 'other')

    const fileRecord = {
      owner_id: user.id,
      entry_id: meta.entryId, // 現在保證有值
      file_path: uploadData.path,
      file_name: file.name,
      mime_type: resolvedType,
      file_size: file.size,
      page_key: meta.pageKey,
      month: monthValue,
      file_type: fileTypeValue,
      record_index: meta.recordIndex ?? null,  // 舊做法（向後相容）
      record_id: meta.recordId ?? null,  // 舊做法（向後相容）
      record_ids: meta.allRecordIds || (meta.recordId ? [meta.recordId] : null)  // ⭐ 優先使用 allRecordIds
    }

    console.log('💾 [uploadEvidence] Database record:', {
      file_name: file.name,
      file_name_type: typeof file.name,
      file_name_length: file.name?.length,
      file_name_undefined: file.name === undefined,
      file_name_null: file.name === null,
      file_name_empty: file.name === '',
      fileType_input: meta.fileType,
      category: meta.category,
      month_input: meta.month,
      final_month_value: monthValue,
      final_file_type: fileTypeValue,
      page_key: meta.pageKey,
      entry_id: meta.entryId
    })

    const { data: dbData, error: dbError } = await supabase
      .from('entry_files')
      .insert(fileRecord)
      .select()
      .single()

    if (dbError) {
      // 如果資料庫插入失敗，清理已上傳的檔案
      await supabase.storage.from('evidence').remove([uploadData.path])
      console.error('Error creating file record:', dbError)
      throw handleAPIError(dbError, `建立檔案記錄失敗: ${dbError.message}`)
    }

    // ⭐ 驗證資料庫實際儲存的資料
    console.log('✅ [uploadEvidence] Database record saved:', {
      id: dbData.id,
      file_name: dbData.file_name,
      file_name_is_undefined: dbData.file_name === undefined,
      file_path: dbData.file_path,
      record_id: dbData.record_id,
      record_ids: dbData.record_ids
    })

    return dbData
  } catch (error) {
    console.error('Error in uploadEvidenceWithValidation:', error)
    if (error instanceof Error) {
      throw error
    }
    throw new Error('上傳檔案時發生未知錯誤')
  }
}

/**
 * 取得指定頁面和類別的草稿檔案清單
 */
export async function listEvidenceByCategory(
  pageKey: string,
  category: 'msds' | 'usage_evidence' | 'heat_value_evidence' | 'other',
  month?: number
): Promise<EvidenceFile[]> {
  try {
    const authResult = await validateAuth()
    if (authResult.error || !authResult.user) {
      throw authResult.error || new Error('使用者未登入')
    }
    const user = authResult.user

    let query = supabase
      .from('entry_files')
      .select(`
        *,
        energy_entries!inner(page_key, status, period_year)
      `)
      .eq('owner_id', user.id)
      .eq('energy_entries.page_key', pageKey)
      .eq('energy_entries.owner_id', user.id)
      .in('energy_entries.status', ['submitted'])
      .order('created_at', { ascending: false })

    // 根據類別和月份過濾檔案路徑
    const yearStr = new Date().getFullYear().toString()
    let pathPattern = `${user.id}/${pageKey}/${yearStr}/${category}`
    
    if (category === 'usage_evidence' && month) {
      pathPattern += `/${month}`
    }
    
    // 使用 LIKE 查詢匹配路徑模式
    query = query.like('file_path', `${pathPattern}%`)

    const { data, error } = await query

    if (error) {
      console.error('Error listing evidence by category:', error)
      throw handleAPIError(error, '取得檔案清單失敗')
    }

    // Flatten the joined data
    const flattenedData = (data || []).map(item => ({
      ...item,
      page_key: item.energy_entries?.page_key,
      status: item.energy_entries?.status,
      period_year: item.energy_entries?.period_year,
      energy_entries: undefined // Remove nested object
    }))

    return flattenedData || []
  } catch (error) {
    console.error('Error in listEvidenceByCategory:', error)
    if (error instanceof Error) {
      throw error
    }
    throw new Error('取得檔案清單時發生未知錯誤')
  }
}

/**
 * 取得 MSDS 檔案清單
 */
export async function listMSDSFiles(pageKey: string, year?: number): Promise<EvidenceFile[]> {
  try {
    const authResult = await validateAuth()
    if (authResult.error || !authResult.user) {
      throw authResult.error || new Error('使用者未登入')
    }
    const user = authResult.user

    const currentYear = year || new Date().getFullYear()

    console.log('🔍 [listMSDSFiles] Query params:', {
      pageKey,
      year: currentYear,
      user_id: user.id,
      file_type: 'msds'
    })

    const { data, error } = await supabase
      .from('entry_files')
      .select(`
        *,
        energy_entries!inner(page_key, status, period_year)
      `)
      .eq('owner_id', user.id)
      .eq('energy_entries.page_key', pageKey)
      .eq('energy_entries.owner_id', user.id)
      .eq('energy_entries.period_year', currentYear)
      .eq('file_type', 'msds')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error listing MSDS files:', error)
      throw handleAPIError(error, '取得 MSDS 檔案清單失敗')
    }

    const flattenedData = (data || []).map(item => ({
      ...item,
      page_key: item.energy_entries?.page_key,
      status: item.energy_entries?.status,
      period_year: item.energy_entries?.period_year,
      energy_entries: undefined
    }))

    // 去重處理
    const deduplicatedData = Array.from(
      new Map(flattenedData.map(file => [file.id, file])).values()
    )

    if (flattenedData.length !== deduplicatedData.length) {
      console.log('🔄 [listMSDSFiles] Deduplication:', {
        original_count: flattenedData.length,
        deduplicated_count: deduplicatedData.length,
        removed_duplicates: flattenedData.length - deduplicatedData.length
      })
    }

    console.log('✅ [listMSDSFiles] Results:', {
      count: deduplicatedData.length,
      file_ids: deduplicatedData.map(f => f.id)
    })

    return deduplicatedData
  } catch (error) {
    console.error('Error in listMSDSFiles:', error)
    throw error instanceof Error ? error : new Error('取得 MSDS 檔案清單時發生未知錯誤')
  }
}

/**
 * 取得指定月份的使用證明檔案清單
 */
export async function listUsageEvidenceFiles(pageKey: string, month: number, year?: number): Promise<EvidenceFile[]> {
  try {
    const authResult = await validateAuth()
    if (authResult.error || !authResult.user) {
      throw authResult.error || new Error('使用者未登入')
    }
    const user = authResult.user

    const currentYear = year || new Date().getFullYear()

    console.log('🔍 [listUsageEvidenceFiles] Query params:', {
      pageKey,
      month,
      year: currentYear,
      user_id: user.id,
      file_type: 'usage_evidence'
    })

    const { data, error } = await supabase
      .from('entry_files')
      .select(`
        *,
        energy_entries!inner(page_key, status, period_year)
      `)
      .eq('owner_id', user.id)
      .eq('energy_entries.page_key', pageKey)
      .eq('energy_entries.owner_id', user.id)
      .eq('energy_entries.period_year', currentYear)
      .eq('file_type', 'usage_evidence')
      .eq('month', month)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error listing usage evidence files:', error)
      throw handleAPIError(error, '取得使用證明檔案清單失敗')
    }

    const flattenedData = (data || []).map(item => ({
      ...item,
      page_key: item.energy_entries?.page_key,
      status: item.energy_entries?.status,
      period_year: item.energy_entries?.period_year,
      energy_entries: undefined
    }))

    // 去重處理
    const deduplicatedData = Array.from(
      new Map(flattenedData.map(file => [file.id, file])).values()
    )

    if (flattenedData.length !== deduplicatedData.length) {
      console.log('🔄 [listUsageEvidenceFiles] Deduplication:', {
        month,
        original_count: flattenedData.length,
        deduplicated_count: deduplicatedData.length,
        removed_duplicates: flattenedData.length - deduplicatedData.length
      })
    }

    console.log('✅ [listUsageEvidenceFiles] Results:', {
      month,
      count: deduplicatedData.length,
      file_ids: deduplicatedData.map(f => f.id)
    })

    return deduplicatedData
  } catch (error) {
    console.error('Error in listUsageEvidenceFiles:', error)
    throw error instanceof Error ? error : new Error('取得使用證明檔案清單時發生未知錯誤')
  }
}

/**
 * 取得指定頁面的檔案清單 (向後相容，但建議使用分類函數)
 * @deprecated 建議使用 listMSDSFiles 或 listUsageEvidenceFiles
 */
export async function listEvidence(pageKey: string): Promise<EvidenceFile[]> {
  try {
    const authResult = await validateAuth()
    if (authResult.error || !authResult.user) {
      throw authResult.error || new Error('使用者未登入')
    }
    const user = authResult.user

    let query = supabase
      .from('entry_files')
      .select(`
        *,
        energy_entries!inner(page_key, status, period_year)
      `)
      .eq('owner_id', user.id)
      .eq('energy_entries.page_key', pageKey)
      .eq('energy_entries.owner_id', user.id)
      .in('energy_entries.status', ['submitted'])
      .order('created_at', { ascending: false })

    const { data, error } = await query

    if (error) {
      console.error('Error listing evidence:', error)
      throw handleAPIError(error, '取得檔案清單失敗')
    }

    // Flatten the joined data
    const flattenedData = (data || []).map(item => ({
      ...item,
      page_key: item.energy_entries?.page_key,
      status: item.energy_entries?.status,
      period_year: item.energy_entries?.period_year,
      energy_entries: undefined // Remove nested object
    }))

    return flattenedData || []
  } catch (error) {
    console.error('Error in listEvidence:', error)
    if (error instanceof Error) {
      throw error
    }
    throw new Error('取得檔案清單時發生未知錯誤')
  }
}

/**
 * 取得檔案的公開 URL
 */
export async function getFileUrl(filePath: string): Promise<string> {
  // 加入路徑診斷
  console.log('📂 嘗試載入檔案:', {
    原始路徑: filePath,
    是否為空: !filePath,
    路徑長度: filePath?.length,
    路徑類型: typeof filePath,
    是否包含斜線: filePath?.includes('/'),
    路徑開頭: filePath?.substring(0, 20),
    路徑結尾: filePath?.substring(filePath.length - 20)
  })

  // 檢查路徑格式
  if (!filePath || filePath === 'null' || filePath === 'undefined') {
    console.error('❌ 檔案路徑無效:', {
      filePath,
      typeOf: typeof filePath,
      isEmpty: !filePath
    })
    throw new Error('檔案路徑無效')
  }

  console.log('📂 [getFileUrl] Attempting to get URL for:', {
    filePath,
    timestamp: new Date().toISOString()
  })

  try {
    const { data, error } = await supabase.storage
      .from('evidence')
      .createSignedUrl(filePath, 3600) // 1小時有效期

    if (error) {
      // ✅ 改善錯誤序列化：提取所有可能的錯誤資訊
      const errorInfo = {
        message: error?.message || String(error),
        name: error?.name,
        status: (error as any)?.status,
        statusText: (error as any)?.statusText,
        statusCode: (error as any)?.statusCode,
        code: (error as any)?.code,
        hint: (error as any)?.hint,
        details: (error as any)?.details,
        filePath,
        // ✅ 增加更詳細的錯誤物件檢查
        errorKeys: Object.keys(error || {}),
        errorType: typeof error,
        errorConstructor: error?.constructor?.name,
        errorString: String(error),
        // 嘗試 JSON 序列化（可能失敗）
        jsonAttempt: (() => {
          try {
            return JSON.stringify(error, null, 2)
          } catch {
            return '[JSON serialization failed]'
          }
        })()
      }

      console.error('❌ [getFileUrl] Supabase storage error:', errorInfo)

      // ✅ 提供更有用的錯誤訊息
      const errorMsg = error?.message || error?.name || `Storage 錯誤 (${typeof error})`
      throw new Error(`Storage error: ${errorMsg}`)
    }

    if (!data?.signedUrl) {
      console.error('❌ [getFileUrl] No signed URL returned:', { data, filePath })
      throw new Error('無法生成檔案 URL')
    }

    console.log('✅ [getFileUrl] URL generated successfully:', {
      filePath,
      urlLength: data.signedUrl.length,
      urlPrefix: data.signedUrl.substring(0, 50)
    })

    return data.signedUrl
  } catch (error) {
    console.error('❌ [getFileUrl] Failed to get file URL:', {
      errorMessage: (error as any)?.message || 'Unknown error',
      errorType: (error as any)?.name || typeof error,
      errorStack: (error as any)?.stack,
      errorCode: (error as any)?.code,
      errorStatus: (error as any)?.status,
      errorDetails: error,
      filePath,
      fullError: JSON.stringify(error, null, 2)
    })
    throw error instanceof Error ? error : new Error('取得檔案 URL 失敗')
  }
}

/**
 * 調試用：檢查資料庫中檔案路徑的完整性
 */
export async function debugFilePathsInDatabase(): Promise<void> {
  console.log('🔍 [Debug] Checking file paths in database...')

  try {
    // 檢查 entry_files 表中的所有檔案路徑
    const { data: allFiles, error: filesError } = await supabase
      .from('entry_files')
      .select('id, file_name, file_path, file_size, mime_type, created_at, owner_id')
      .order('created_at', { ascending: false })
      .limit(50)

    if (filesError) {
      console.error('❌ [Debug] Failed to fetch files from database:', filesError)
      return
    }

    console.log('📊 [Debug] Database file analysis:', {
      totalFiles: allFiles?.length || 0,
      files: allFiles?.map(f => ({
        id: f.id,
        name: f.file_name,
        path: f.file_path,
        pathAnalysis: {
          isEmpty: !f.file_path,
          length: f.file_path?.length,
          containsEvidence: f.file_path?.includes('evidence'),
          pathSegments: f.file_path?.split('/').length,
          firstSegment: f.file_path?.split('/')[0],
          lastSegment: f.file_path?.split('/').pop()
        },
        size: f.file_size,
        mimeType: f.mime_type,
        ownerId: f.owner_id?.substring(0, 8) + '...'
      }))
    })

    // 分析路徑模式
    const pathPatterns = allFiles?.map(f => f.file_path).filter(Boolean) || []
    const patternAnalysis = {
      totalPaths: pathPatterns.length,
      uniquePatterns: [...new Set(pathPatterns.map(path => {
        const parts = path.split('/')
        return parts.length > 2 ? `${parts[0]}/${parts[1]}/...` : path
      }))],
      pathStructures: pathPatterns.map(path => ({
        fullPath: path,
        segments: path.split('/').length,
        startsWithEvidence: path.startsWith('evidence/'),
        endsWithFileName: path.split('/').pop()?.includes('.')
      }))
    }

    console.log('📈 [Debug] Path pattern analysis:', patternAnalysis)

    // 檢查 Supabase Storage 中實際存在的檔案
    try {
      const { data: storageFiles, error: storageError } = await supabase.storage
        .from('evidence')
        .list('', { limit: 100 })

      if (!storageError && storageFiles) {
        console.log('💾 [Debug] Storage bucket content:', {
          storageFiles: storageFiles.length,
          fileNames: storageFiles.map(f => f.name).slice(0, 10),
          folders: storageFiles.filter(f => !f.name.includes('.')).map(f => f.name)
        })
      } else {
        console.warn('⚠️ [Debug] Could not list storage files:', storageError)
      }
    } catch (storageError) {
      console.warn('⚠️ [Debug] Storage access failed:', storageError)
    }

  } catch (error) {
    console.error('❌ [Debug] Database file path check failed:', error)
  }
}

/**
 * 調試用：檢查當前用戶權限和認證狀態
 */
export async function debugAuthAndPermissions(): Promise<void> {
  console.log('🔍 [Debug] Checking authentication and permissions...')

  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    console.log('👤 [Debug] Current user info:', {
      isAuthenticated: !!user,
      userId: user?.id,
      email: user?.email,
      authError: authError?.message,
      userMetadata: user?.user_metadata,
      appMetadata: user?.app_metadata
    })

    // 檢查 Storage 權限
    try {
      const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets()
      console.log('🪣 [Debug] Storage buckets access:', {
        canListBuckets: !bucketsError,
        bucketsCount: buckets?.length || 0,
        bucketsError: bucketsError?.message,
        buckets: buckets?.map(b => ({ name: b.name, public: b.public }))
      })
    } catch (storageError) {
      console.error('❌ [Debug] Storage access failed:', storageError)
    }

    // 檢查是否為管理員
    if (user) {
      try {
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('role, is_admin')
          .eq('id', user.id)
          .single()

        console.log('👨‍💼 [Debug] User role info:', {
          hasProfile: !!profile,
          role: profile?.role,
          isAdmin: profile?.is_admin,
          profileError: profileError?.message
        })
      } catch (roleError) {
        console.error('❌ [Debug] Role check failed:', roleError)
      }
    }

  } catch (error) {
    console.error('❌ [Debug] Authentication check failed:', error)
  }
}

/**
 * 取得檔案的公開 URL - 管理員版本
 * 用於審核模式下存取其他用戶的檔案
 */
export async function getFileUrlForAdmin(
  filePath: string,
  ownerId?: string,
  isReviewMode: boolean = false
): Promise<string> {
  // 管理員模式路徑診斷
  console.log('🔐 管理員模式檔案路徑診斷:', {
    原始路徑: filePath,
    檔案擁有者: ownerId,
    審核模式: isReviewMode,
    路徑分析: {
      是否為空: !filePath,
      路徑長度: filePath?.length,
      包含evidence: filePath?.includes('evidence'),
      路徑結構: filePath?.split('/'),
      開頭30字元: filePath?.substring(0, 30),
      結尾30字元: filePath?.substring(filePath.length - 30)
    }
  })

  // 檢查路徑有效性
  if (!filePath || filePath === 'null' || filePath === 'undefined') {
    console.error('❌ [getFileUrlForAdmin] 管理員模式檔案路徑無效:', {
      filePath,
      ownerId,
      問題: '路徑為空或無效'
    })
    throw new Error('管理員模式：檔案路徑無效')
  }

  console.log('🔐 [getFileUrlForAdmin] Admin file access request:', {
    filePath,
    ownerId,
    isReviewMode,
    timestamp: new Date().toISOString()
  })

  try {
    // 首先嘗試標準方式
    console.log('📍 [getFileUrlForAdmin] Trying standard approach first...')
    const { data, error } = await supabase.storage
      .from('evidence')
      .createSignedUrl(filePath, 60) // 60秒有效期（安全考量）

    if (!error && data?.signedUrl) {
      console.log('✅ [getFileUrlForAdmin] Standard approach succeeded')
      return data.signedUrl
    }

    // 如果標準方式失敗，記錄錯誤
    if (error) {
      console.error('⚠️ [getFileUrlForAdmin] Standard approach failed:', {
        message: error?.message,
        status: (error as any)?.status,
        statusText: (error as any)?.statusText,
        error: (error as any)?.error,
        code: (error as any)?.code,
        hint: (error as any)?.hint,
        details: (error as any)?.details,
        filePath,
        ownerId,
        fullError: JSON.stringify(error, null, 2)
      })
    }

    // 嘗試使用公開 URL（如果 bucket 設置為公開）
    console.log('📍 [getFileUrlForAdmin] Trying public URL approach...')
    const { data: publicUrlData } = supabase.storage
      .from('evidence')
      .getPublicUrl(filePath)

    if (publicUrlData?.publicUrl) {
      console.log('✅ [getFileUrlForAdmin] Public URL generated:', {
        url: publicUrlData.publicUrl.substring(0, 50) + '...'
      })
      // 直接返回公開 URL，讓瀏覽器嘗試載入
      // 如果 bucket 是公開的，這應該可以工作
      return publicUrlData.publicUrl
    }

    // 如果所有方法都失敗，拋出錯誤
    const errorMessage = isReviewMode
      ? `審核模式：無法存取用戶 ${ownerId} 的檔案 ${filePath}`
      : `管理員權限不足：無法存取檔案 ${filePath}`

    console.error('❌ [getFileUrlForAdmin] All approaches failed')
    throw new Error(errorMessage)

  } catch (error) {
    console.error('❌ [getFileUrlForAdmin] Admin file URL generation failed:', {
      errorMessage: (error as any)?.message || 'Unknown error',
      errorType: (error as any)?.name || typeof error,
      errorStack: (error as any)?.stack,
      errorCode: (error as any)?.code,
      errorStatus: (error as any)?.status,
      errorDetails: error,
      filePath,
      ownerId,
      isReviewMode,
      fullError: JSON.stringify(error, null, 2)
    })
    throw error
  }
}

/**
 * 刪除證據檔案
 */
export async function deleteEvidence(fileId: string): Promise<void> {
  try {
    const authResult = await validateAuth()
    if (authResult.error || !authResult.user) {
      throw authResult.error || new Error('使用者未登入')
    }
    const user = authResult.user

    console.log('🗑️ [deleteEvidence] Starting deletion:', { fileId, userId: user.id })

    // 1. 先取得檔案資訊
    const { data: fileData, error: fetchError } = await supabase
      .from('entry_files')
      .select('file_path, owner_id')
      .eq('id', fileId)
      // ✅ 移除 owner_id 檢查，改由 RLS Policy 控制權限
      // RLS Policy 允許刪除：(1) 管理員的任何檔案 (2) 自己 entry 下的任何檔案
      .maybeSingle()  // ✅ 使用 maybeSingle() 允許 0 或 1 筆結果

    if (fetchError) {
      console.error('❌ [deleteEvidence] Error fetching file data:', fetchError)
      throw handleAPIError(fetchError, '取得檔案資訊失敗')
    }

    if (!fileData) {
      console.warn(`⚠️ [deleteEvidence] File ${fileId} not found or already deleted`)
      return  // 靜默返回，視為檔案已被刪除
    }

    console.log('📂 [deleteEvidence] File info retrieved:', {
      filePath: fileData.file_path,
      ownerId: fileData.owner_id
    })

    // 2. ✅ 先從 Storage 刪除實體檔案（Linus 修正：先刪實體資源，再刪索引）
    try {
      console.log('🗑️ [deleteEvidence] Deleting from Storage...')
      const { error: storageError } = await supabase.storage
        .from('evidence')
        .remove([fileData.file_path])

      if (storageError) {
        console.warn('⚠️ [deleteEvidence] Storage deletion failed (will continue):', {
          error: storageError,
          message: storageError.message,
          filePath: fileData.file_path
        })
        // ✅ Storage 錯誤不拋出異常 - 檔案可能已不存在，繼續清理資料庫
      } else {
        console.log('✅ [deleteEvidence] Storage file deleted successfully')
      }
    } catch (storageError) {
      console.warn('⚠️ [deleteEvidence] Storage deletion exception (will continue):', storageError)
      // ✅ Storage 異常不應阻止資料庫清理
    }

    // 3. ✅ 再從資料庫刪除記錄（無論 Storage 是否成功）
    console.log('🗑️ [deleteEvidence] Deleting database record...')
    const { error: dbError } = await supabase
      .from('entry_files')
      .delete()
      .eq('id', fileId)
      // ✅ 移除 owner_id 檢查，改由 RLS Policy 控制權限

    if (dbError) {
      console.error('❌ [deleteEvidence] Database deletion failed:', dbError)
      throw handleAPIError(dbError, '刪除檔案記錄失敗')
    }

    console.log('✅ [deleteEvidence] File deleted successfully:', fileId)
  } catch (error) {
    console.error('❌ [deleteEvidence] Error:', error)
    if (error instanceof Error) {
      throw error
    }
    throw new Error('刪除檔案時發生未知錯誤')
  }
}

/**
 * 管理員刪除證據檔案（不檢查 owner_id，需要管理員權限）
 *
 * 用途：管理員在審核模式下刪除用戶上傳的檔案
 *
 * @param fileId - 要刪除的檔案 ID
 * @throws 如果非管理員呼叫，拋出權限錯誤
 */
export async function adminDeleteEvidence(fileId: string): Promise<void> {
  try {
    const authResult = await validateAuth()
    if (authResult.error || !authResult.user) {
      throw authResult.error || new Error('使用者未登入')
    }
    const user = authResult.user

    console.log('🔐 [adminDeleteEvidence] Starting admin deletion:', { fileId, adminId: user.id })

    // 1. 驗證管理員權限
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profileError || profile?.role !== 'admin') {
      console.error('❌ [adminDeleteEvidence] Permission denied:', { userId: user.id, role: profile?.role })
      throw new Error('權限不足：僅管理員可執行此操作')
    }

    console.log('✅ [adminDeleteEvidence] Admin permission verified')

    // 2. 查詢檔案資訊（不過濾 owner_id）
    const { data: fileData, error: fetchError } = await supabase
      .from('entry_files')
      .select('file_path, owner_id')
      .eq('id', fileId)
      .maybeSingle()

    if (fetchError) {
      console.error('❌ [adminDeleteEvidence] Error fetching file:', fetchError)
      throw handleAPIError(fetchError, '取得檔案資訊失敗')
    }

    if (!fileData) {
      console.warn(`⚠️ [adminDeleteEvidence] File ${fileId} not found or already deleted`)
      return  // 靜默返回，視為檔案已被刪除
    }

    console.log('📂 [adminDeleteEvidence] File info retrieved:', {
      filePath: fileData.file_path,
      ownerId: fileData.owner_id
    })

    // 3. 從 Storage 刪除實體檔案
    try {
      console.log('🗑️ [adminDeleteEvidence] Deleting from Storage...')
      const { error: storageError } = await supabase.storage
        .from('evidence')
        .remove([fileData.file_path])

      if (storageError) {
        console.warn('⚠️ [adminDeleteEvidence] Storage deletion failed (will continue):', storageError)
        // Storage 錯誤不拋出 - 檔案可能已不存在，繼續清理資料庫
      } else {
        console.log('✅ [adminDeleteEvidence] Storage file deleted')
      }
    } catch (storageError) {
      console.warn('⚠️ [adminDeleteEvidence] Storage exception (will continue):', storageError)
    }

    // 4. 從資料庫刪除記錄（不過濾 owner_id）
    console.log('🗑️ [adminDeleteEvidence] Deleting database record...')
    const { error: dbError } = await supabase
      .from('entry_files')
      .delete()
      .eq('id', fileId)
      // ⭐ 不檢查 owner_id，允許管理員刪除任何檔案

    if (dbError) {
      console.error('❌ [adminDeleteEvidence] Database deletion failed:', dbError)
      throw handleAPIError(dbError, '刪除檔案記錄失敗')
    }

    console.log('✅ [adminDeleteEvidence] Admin deletion completed:', fileId)
  } catch (error) {
    console.error('❌ [adminDeleteEvidence] Error:', error)
    if (error instanceof Error) {
      throw error
    }
    throw new Error('管理員刪除檔案時發生未知錯誤')
  }
}
/**
 * 將草稿檔案提交（狀態改為 submitted）
 */
export async function commitEvidence(params: { entryId?: string; pageKey: string }): Promise<void> {
  try {
    const authResult = await validateAuth()
    if (authResult.error || !authResult.user) {
      throw authResult.error || new Error('使用者未登入')
    }
    const user = authResult.user

    console.log('Committing evidence for:', {
      user_id: user.id,
      pageKey: params.pageKey,
    })

    // First, get all file IDs that match the criteria via JOIN
    // 查找 draft 和 submitted 狀態的記錄，因為提交後狀態會變為 submitted
    const { data: filesData, error: fetchError } = await supabase
      .from('entry_files')
      .select(`
        id,
        energy_entries!inner(page_key, owner_id, status)
      `)
      .eq('owner_id', user.id)
      .eq('energy_entries.page_key', params.pageKey)
      .eq('energy_entries.owner_id', user.id)
      .in('energy_entries.status', ['submitted'])
      

    console.log('Files to commit:', {
      count: filesData?.length || 0,
      files: filesData,
      error: fetchError
    })

    if (fetchError) {
    }

    if (!filesData || filesData.length === 0) {
      return // No files to commit
    }

    const fileIds = filesData.map(f => f.id)
    const updateData: any = {}

    if (params.entryId) {
      updateData.entry_id = params.entryId
      
      // 更新所有關聯的檔案
      const { error } = await supabase
        .from('entry_files')
        .update(updateData)
        .in('id', fileIds)
        .eq('owner_id', user.id)
      
      if (error) {
        console.error('Error updating file entry_id:', error)
        throw handleAPIError(error, '更新檔案關聯失敗')
      }
    }
    
    // 不再在這裡執行空的 update，因為我們已經處理了 entry_id 的更新

    // 已在上面處理了錯誤
  } catch (error) {
    console.error('Error in commitEvidence:', error)
    if (error instanceof Error) {
      throw error
    }
    throw new Error('提交檔案時發生未知錯誤')
  }
}

/**
 * 取得所有檔案清單（包含已提交的）
 */
export async function listAllEvidence(pageKey: string): Promise<EvidenceFile[]> {
  try {
    const authResult = await validateAuth()
    if (authResult.error || !authResult.user) {
      throw authResult.error || new Error('使用者未登入')
    }
    const user = authResult.user

    const { data, error } = await supabase
      .from('entry_files')
      .select(`
        *,
        energy_entries!inner(page_key, status, period_year)
      `)
      .eq('owner_id', user.id)
      .eq('energy_entries.page_key', pageKey)
      .eq('energy_entries.owner_id', user.id)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error listing all evidence:', error)
      throw handleAPIError(error, '取得檔案清單失敗')
    }

    // Flatten the joined data
    const flattenedData = (data || []).map(item => ({
      ...item,
      page_key: item.energy_entries?.page_key,
      status: item.energy_entries?.status,
      period_year: item.energy_entries?.period_year,
      energy_entries: undefined // Remove nested object
    }))

    return flattenedData || []
  } catch (error) {
    console.error('Error in listAllEvidence:', error)
    if (error instanceof Error) {
      throw error
    }
    throw new Error('取得檔案清單時發生未知錯誤')
  }
}

/**
 * 檢查檔案大小和類型
 */
export function validateFile(file: File, options?: {
  maxSize?: number
  allowedTypes?: string[]
}): { valid: boolean; error?: string } {
  const maxSize = options?.maxSize || 10 * 1024 * 1024 // 預設 10MB

  // 如果有指定 allowedTypes 才進行檢查，否則允許所有類型
  const allowedTypes = options?.allowedTypes

  if (file.size > maxSize) {
    return {
      valid: false,
      error: `檔案大小不能超過 ${Math.round(maxSize / 1024 / 1024)}MB`
    }
  }

  if (allowedTypes && !allowedTypes.includes(file.type)) {
    return {
      valid: false,
      error: '不支援的檔案格式'
    }
  }

  return { valid: true }
}

// 為了向後相容，新增別名
export const uploadEvidenceSimple = uploadEvidence
export const deleteEvidenceFile = deleteEvidence

// 新增缺失的函數
export async function getEntryFiles(entryId: string): Promise<EvidenceFile[]> {
  try {
    const authResult = await validateAuth()
    if (authResult.error || !authResult.user) {
      throw authResult.error || new Error('使用者未登入')
    }

    const { data, error } = await supabase
      .from('entry_files')
      .select('*')
      .eq('entry_id', entryId)
      .order('created_at', { ascending: false })

    if (error) {
      throw handleAPIError(error, '取得檔案失敗')
    }

    console.log('📁 [getEntryFiles] Raw data from database:', {
      entryId,
      count: data?.length || 0,
      files: data?.map(f => ({
        id: f.id,
        name: f.file_name,
        month: f.month,
        page_key: f.page_key,
        has_month: f.month !== undefined,
        has_page_key: f.page_key !== undefined
      })) || []
    })

    return data || []
  } catch (error) {
    console.error('❌ [getEntryFiles] Error:', error)
    if (error instanceof Error) {
      throw error
    }
    throw new Error('取得檔案時發生未知錯誤')
  }
}

export async function updateFileEntryAssociation(fileId: string, entryId: string): Promise<void> {
  try {
    const authResult = await validateAuth()
    if (authResult.error || !authResult.user) {
      throw authResult.error || new Error('使用者未登入')
    }
    
    const { error } = await supabase
      .from('entry_files')
      .update({ entry_id: entryId })
      .eq('id', fileId)
      .eq('owner_id', authResult.user.id)
    
    if (error) {
      throw handleAPIError(error, '更新檔案關聯失敗')
    }
  } catch (error) {
    if (error instanceof Error) {
      throw error
    }
    throw new Error('更新檔案關聯時發生未知錯誤')
  }
}

// 導出內部函數供元件使用
export { getCategoryFromPageKey }

// Add missing function for WD40Page
export async function debugDatabaseContent(): Promise<void> {
  console.log('Debug database content called')
}

/**
 * 清理孤兒檔案記錄
 * 刪除所有沒有對應 energy_entries 的 entry_files 記錄
 *
 * 使用場景:
 * - 管理員工具
 * - 定期維護任務
 * - 解決「幽靈檔案」問題
 *
 * @returns Promise<{ deletedCount: number, errors: string[] }>
 */
export async function cleanOrphanFiles(): Promise<{ deletedCount: number, errors: string[] }> {
  try {
    console.group('🧹 [cleanOrphanFiles] Starting orphan file cleanup')

    const authResult = await validateAuth()
    if (authResult.error || !authResult.user) {
      throw authResult.error || new Error('使用者未登入')
    }

    // 1. 查詢所有當前用戶的檔案記錄
    const { data: allFiles, error: queryError } = await supabase
      .from('entry_files')
      .select('id, file_path, entry_id, created_at')
      .eq('owner_id', authResult.user.id)

    if (queryError) {
      console.error('❌ [cleanOrphanFiles] Query error:', queryError)
      throw handleAPIError(queryError, '查詢檔案記錄失敗')
    }

    if (!allFiles || allFiles.length === 0) {
      console.log('ℹ️ [cleanOrphanFiles] No files found')
      console.groupEnd()
      return { deletedCount: 0, errors: [] }
    }

    console.log(`📊 [cleanOrphanFiles] Found ${allFiles.length} file records, checking for orphans...`)

    // 2. 對每個檔案，檢查其 entry_id 是否對應有效的 energy_entries
    const orphanFiles: typeof allFiles = []

    for (const file of allFiles) {
      const { data: entry } = await supabase
        .from('energy_entries')
        .select('id')
        .eq('id', file.entry_id)
        .maybeSingle()

      if (!entry) {
        console.log(`🔍 [cleanOrphanFiles] Found orphan file:`, {
          fileId: file.id,
          entryId: file.entry_id,
          filePath: file.file_path
        })
        orphanFiles.push(file)
      }
    }

    console.log(`🎯 [cleanOrphanFiles] Found ${orphanFiles.length} orphan files`)

    if (orphanFiles.length === 0) {
      console.groupEnd()
      return { deletedCount: 0, errors: [] }
    }

    // 3. 刪除孤兒檔案
    let deletedCount = 0
    const errors: string[] = []

    for (const orphan of orphanFiles) {
      try {
        // 先刪 Storage
        try {
          await supabase.storage
            .from('evidence')
            .remove([orphan.file_path])
          console.log(`✅ [cleanOrphanFiles] Deleted storage file: ${orphan.file_path}`)
        } catch (storageError) {
          console.warn(`⚠️ [cleanOrphanFiles] Storage deletion failed (continuing):`, storageError)
        }

        // 再刪資料庫
        const { error: dbError } = await supabase
          .from('entry_files')
          .delete()
          .eq('id', orphan.id)

        if (dbError) {
          errors.push(`Failed to delete file ${orphan.id}: ${dbError.message}`)
          console.error(`❌ [cleanOrphanFiles] DB deletion failed:`, dbError)
        } else {
          deletedCount++
          console.log(`✅ [cleanOrphanFiles] Deleted orphan file: ${orphan.id}`)
        }
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error)
        errors.push(`Error processing file ${orphan.id}: ${errorMsg}`)
        console.error(`❌ [cleanOrphanFiles] Error:`, error)
      }
    }

    console.log(`✅ [cleanOrphanFiles] Cleanup complete:`, {
      totalOrphans: orphanFiles.length,
      deletedCount,
      errorCount: errors.length
    })
    console.groupEnd()

    return { deletedCount, errors }
  } catch (error) {
    console.error('❌ [cleanOrphanFiles] Fatal error:', error)
    console.groupEnd()
    throw error instanceof Error ? error : new Error('清理孤兒檔案時發生未知錯誤')
  }
}

/**
 * 批次上傳多個檔案
 * @param files 檔案陣列
 * @param metadataArray 對應的中繼資料陣列
 * @param onProgress 進度回調函數
 * @returns 上傳結果陣列
 */
export async function batchUploadEvidence(
  files: File[],
  metadataArray: (FileMetadata & { entryId?: string; allowOverwrite?: boolean })[],
  onProgress?: (completed: number, total: number, currentFile: string) => void
): Promise<{ successes: EvidenceFile[], failures: { file: File, error: string }[] }> {
  if (files.length !== metadataArray.length) {
    throw new Error('檔案數量與中繼資料數量不符')
  }

  const successes: EvidenceFile[] = []
  const failures: { file: File, error: string }[] = []
  let completed = 0

  console.log('🚀 [batchUploadEvidence] Starting batch upload:', {
    totalFiles: files.length,
    files: files.map(f => f.name)
  })

  // 逐一上傳檔案（避免並發導致的資料庫壓力）
  for (let i = 0; i < files.length; i++) {
    const file = files[i]
    const metadata = metadataArray[i]

    try {
      onProgress?.(completed, files.length, file.name)

      console.log(`📤 [batchUploadEvidence] Uploading file ${i + 1}/${files.length}:`, {
        fileName: file.name,
        fileSize: file.size,
        category: metadata.category,
        month: metadata.month
      })

      const result = await uploadEvidence(file, metadata)
      successes.push(result)

      completed++
      console.log(`✅ [batchUploadEvidence] File uploaded successfully:`, {
        fileName: file.name,
        fileId: result.id,
        completed: completed,
        remaining: files.length - completed
      })

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '上傳失敗'
      failures.push({ file, error: errorMessage })

      console.error(`❌ [batchUploadEvidence] File upload failed:`, {
        fileName: file.name,
        error: errorMessage
      })
    }

    // 通知進度更新
    onProgress?.(completed, files.length, completed < files.length ? files[completed]?.name || '' : '')
  }

  console.log('🏁 [batchUploadEvidence] Batch upload completed:', {
    totalFiles: files.length,
    successes: successes.length,
    failures: failures.length,
    successFiles: successes.map(s => s.file_name),
    failureFiles: failures.map(f => f.file.name)
  })

  return { successes, failures }
}
