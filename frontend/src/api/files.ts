import { supabase } from '../lib/supabaseClient'
import { validateAuth, handleAPIError } from '../utils/authHelpers'

/**
 * 根據 page_key 推斷 category 名稱
 */
function getCategoryFromPageKey(pageKey: string): string {
  const categoryMap: Record<string, string> = {
    'wd40': 'WD-40',
    'acetylene': '乙炔',
    'refrigerant': '冷媒',
    'lpg': 'LPG',
    'diesel': '柴油',
    'gasoline': '汽油'
  }
  return categoryMap[pageKey] || pageKey.toUpperCase()
}

export interface FileMetadata {
  pageKey: string
  year: number
  category: 'msds' | 'usage_evidence'
  month?: number  // 僅用於 usage_evidence，表示月份 (1-12)
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
  // Join fields from energy_entries
  page_key?: string  // Available when joined with energy_entries
  status?: 'draft' | 'submitted' | 'approved' | 'rejected'  // From energy_entries
  period_year?: number  // From energy_entries
}

/**
 * 推斷檔案 MIME 類型
 */
function inferMimeType(file: File): string {
  // 優先使用 file.type
  if (file.type) {
    return file.type
  }

  // 如果 file.type 為空，嘗試從副檔名推斷
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
    default:
      return 'application/octet-stream'
  }
}

/**
 * 驗證檔案類型
 */
function validateFileType(file: File): { valid: boolean; error?: string } {
  const mimeType = inferMimeType(file)
  
  // 允許的類型：圖片或 PDF
  const isImage = mimeType.startsWith('image/')
  const isPdf = mimeType === 'application/pdf'
  
  if (!isImage && !isPdf) {
    return {
      valid: false,
      error: '僅允許上傳圖片或 PDF 檔案'
    }
  }
  
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
  try {
    const authResult = await validateAuth()
    if (authResult.error || !authResult.user) {
      throw authResult.error || new Error('使用者未登入')
    }
    const user = authResult.user

    // 驗證檔案類型
    const typeValidation = validateFileType(file)
    if (!typeValidation.valid) {
      throw new Error(typeValidation.error!)
    }

    // 推斷正確的 MIME 類型
    const resolvedType = inferMimeType(file)

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
        .eq('energy_entries.status', 'draft')

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

    // 安全處理檔案名稱（防止路徑穿越和特殊字符）
    const safeName = file.name
      .normalize('NFKD')                 // 拆分重音/特殊字
      .replace(/[^\w.\-]+/g, '_')        // 非 [A-Za-z0-9_.-] 全部變 _
      .replace(/^_+|_+$/g, '');  
    
    const timestamp = Date.now()
    const randomSuffix = Math.random().toString(36).substring(2, 8) // 新增隨機字串以防止衝突
    
    // 使用時間戳 + 隨機字串確保檔案名稱唯一性
    const fileName = `${timestamp}_${randomSuffix}_${safeName}`
    
    // 構造檔案路徑：{userId}/{pageKey}/{year}/{category}/{month?}/{filename}
    const categoryPath = meta.category
    const monthPath = meta.category === 'usage_evidence' && meta.month ? `/${meta.month}` : ''
    const filePath = `${user.id}/${meta.pageKey}/${meta.year}/${categoryPath}${monthPath}/${fileName}`

    // 驗證檔案路徑格式
    if (filePath.includes('//') || filePath.includes('..') || filePath.length > 1024) {
      throw new Error('檔案路徑格式無效')
    }

    console.log('Uploading file with path:', filePath) // Debug log

    // 上傳檔案到 Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('evidence')
      .upload(filePath, file, {
        upsert: true,
        contentType: resolvedType
      })

    if (uploadError) {
      console.error('Error uploading file:', uploadError)
      
      // 特殊錯誤處理
      if (uploadError.message.includes('Bucket not found')) {
        throw new Error('請先建立 evidence bucket 並確認名稱')
      }
      
      throw handleAPIError(uploadError, '檔案上傳失敗')
    }

    // 驗證 entry_id 是否存在（必須關聯到現有的 energy_entries 記錄）
    if (!meta.entryId) {
      if (!allowAutoCreateEntry) {
        throw new Error('檔案上傳必須關聯到現有的能源記錄')
      }
      
      // 嘗試尋找現有的草稿記錄
      // 根據資料庫唯一約束，使用 category 而不是 page_key 查詢
      const category = getCategoryFromPageKey(meta.pageKey)
      const { data: existingEntry } = await supabase
        .from('energy_entries')
        .select('id')
        .eq('owner_id', user.id)
        .eq('category', category)
        .eq('period_year', meta.year)
        .eq('status', 'draft')
        .maybeSingle()
      
      if (!existingEntry) {
        // 如果沒有草稿記錄，嘗試建立或更新一個
        // 使用 upsert 避免重複插入錯誤
        const { data: upsertResult, error: entryError } = await supabase
          .from('energy_entries')
          .upsert({
            owner_id: user.id,
            page_key: meta.pageKey,
            period_year: meta.year,
            category: getCategoryFromPageKey(meta.pageKey),
            unit: 'ML', // 預設單位
            amount: 0.00001, // 預設為最小值避免 amount > 0 約束錯誤
            status: 'draft',
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
            .eq('category', category)
            .eq('period_year', meta.year)
            .eq('status', 'draft')
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
              .eq('category', category)
              .eq('period_year', meta.year)
              .maybeSingle()
            
            if (anyStatusError) {
              console.error('Any status query error:', anyStatusError)
            }
            
            if (anyStatusRecord) {
              console.log('Found record with different status:', anyStatusRecord)
              meta.entryId = anyStatusRecord.id
            } else {
              console.error('No record found after upsert. Debug info:', {
                user_id: user.id,
                category,
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

    // 建立資料庫記錄
    const fileRecord = {
      owner_id: user.id,
      entry_id: meta.entryId, // 現在保證有值
      file_path: uploadData.path,
      file_name: file.name,
      mime_type: resolvedType,
      file_size: file.size
    }

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
  category: 'msds' | 'usage_evidence',
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
      .in('energy_entries.status', ['draft', 'submitted'])
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
export async function listMSDSFiles(pageKey: string): Promise<EvidenceFile[]> {
  return await listEvidenceByCategory(pageKey, 'msds')
}

/**
 * 取得指定月份的使用證明檔案清單
 */
export async function listUsageEvidenceFiles(pageKey: string, month: number): Promise<EvidenceFile[]> {
  return await listEvidenceByCategory(pageKey, 'usage_evidence', month)
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
      .in('energy_entries.status', ['draft', 'submitted'])
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
  try {
    const { data } = await supabase.storage
      .from('evidence')
      .createSignedUrl(filePath, 3600) // 1小時有效期

    if (!data?.signedUrl) {
      throw new Error('無法生成檔案 URL')
    }

    return data.signedUrl
  } catch (error) {
    console.error('Error getting file URL:', error)
    throw new Error('取得檔案 URL 失敗')
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

    // 先取得檔案資訊
    const { data: fileData, error: fetchError } = await supabase
      .from('entry_files')
      .select('file_path, owner_id')
      .eq('id', fileId)
      .eq('owner_id', user.id) // 確保只能刪除自己的檔案
      .single()

    if (fetchError) {
      console.error('Error fetching file data:', fetchError)
      throw handleAPIError(fetchError, '取得檔案資訊失敗')
    }

    if (!fileData) {
      throw new Error('檔案不存在或無權限刪除')
    }

    // 從資料庫直接刪除記錄（而不是標記為已刪除，因為entry_files沒有status欄位）
    const { error: deleteError } = await supabase
      .from('entry_files')
      .delete()
      .eq('id', fileId)
      .eq('owner_id', user.id)

    if (deleteError) {
      console.error('Error deleting file record:', deleteError)
      throw handleAPIError(deleteError, '刪除檔案記錄失敗')
    }

    // 從 Storage 刪除檔案（在資料庫更新後）
    const { error: storageError } = await supabase.storage
      .from('evidence')
      .remove([fileData.file_path])

    if (storageError) {
      console.warn('Warning: File deleted from database but storage cleanup failed:', storageError)
      // 不拋出錯誤，因為資料庫記錄已經標記為刪除
    }
  } catch (error) {
    console.error('Error in deleteEvidence:', error)
    if (error instanceof Error) {
      throw error
    }
    throw new Error('刪除檔案時發生未知錯誤')
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

    console.log('🔗 [commitEvidence] Starting with:', {
      user_id: user.id,
      pageKey: params.pageKey,
      entryId: params.entryId
    })

    // First, get all file IDs that match the criteria via JOIN
    // 查找 draft 和 submitted 狀態的記錄，因為提交後狀態會變為 submitted
    console.log('📁 [commitEvidence] Searching for files to commit...')
    const { data: filesData, error: fetchError } = await supabase
      .from('entry_files')
      .select(`
        id,
        energy_entries!inner(page_key, owner_id, status)
      `)
      .eq('owner_id', user.id)
      .eq('energy_entries.page_key', params.pageKey)
      .eq('energy_entries.owner_id', user.id)
      .in('energy_entries.status', ['draft', 'submitted'])
      
    console.log('📋 [commitEvidence] Found files:', {
      count: filesData?.length || 0,
      files: filesData,
      error: fetchError
    })

    if (fetchError) {
      console.error('Error fetching files to commit:', fetchError)
      throw handleAPIError(fetchError, '查詢檔案失敗')
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
  const allowedTypes = options?.allowedTypes || [
    'image/jpeg', 'image/png', 'image/gif',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ]

  if (file.size > maxSize) {
    return {
      valid: false,
      error: `檔案大小不能超過 ${Math.round(maxSize / 1024 / 1024)}MB`
    }
  }

  if (!allowedTypes.includes(file.type)) {
    return {
      valid: false,
      error: '不支援的檔案格式'
    }
  }

  return { valid: true }
}
