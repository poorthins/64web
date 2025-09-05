import { supabase } from '../lib/supabaseClient'
import { validateAuth, handleAPIError } from '../utils/authHelpers'

export interface FileMetadata {
  pageKey: string
  year: number
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
 * 注意：檔案需要關聯到現有的 energy_entries 記錄
 */
export async function uploadEvidence(file: File, meta: FileMetadata & { entryId?: string }): Promise<EvidenceFile> {
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

    // 檢查是否已有相同條件的檔案（同一使用者、頁面、年份）
    // 需要通過 JOIN 查詢 energy_entries 來比對 page_key
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

    // 如果有現有檔案，先刪除舊檔案
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

    // 安全處理檔案名稱（防止路徑穿越和特殊字符）
    const safeName = file.name
      .normalize('NFKD')                 // 拆分重音/特殊字
      .replace(/[^\w.\-]+/g, '_')        // 非 [A-Za-z0-9_.-] 全部變 _
      .replace(/^_+|_+$/g, '');  
    
    const timestamp = Date.now()
    
    // 不使用 URL 編碼，直接使用安全的檔案名稱
    const fileName = `${timestamp}_${safeName}`
    
    // 構造檔案路徑：{userId}/{pageKey}/{year}/{filename}
    const filePath = `${user.id}/${meta.pageKey}/${meta.year}/${fileName}`

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

    // 建立資料庫記錄
    const fileRecord = {
      owner_id: user.id,
      entry_id: meta.entryId || null, // Associate with energy_entry if provided
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
      throw handleAPIError(dbError, '建立檔案記錄失敗')
    }

    return dbData
  } catch (error) {
    console.error('Error in uploadEvidence:', error)
    if (error instanceof Error) {
      throw error
    }
    throw new Error('上傳檔案時發生未知錯誤')
  }
}

/**
 * 取得指定頁面的草稿檔案清單
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
      .eq('energy_entries.status', 'draft')
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

    // First, get all file IDs that match the criteria via JOIN
    const { data: filesData, error: fetchError } = await supabase
      .from('entry_files')
      .select(`
        id,
        energy_entries!inner(page_key, owner_id, status)
      `)
      .eq('owner_id', user.id)
      .eq('energy_entries.page_key', params.pageKey)
      .eq('energy_entries.owner_id', user.id)
      .eq('energy_entries.status', 'draft')

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
    }

    // Note: We update the status in energy_entries table, not entry_files
    // This function should coordinate with energy entry submission
    const { error } = await supabase
      .from('entry_files')
      .update(updateData)
      .in('id', fileIds)
      .eq('owner_id', user.id)

    if (error) {
      console.error('Error committing evidence:', error)
      throw handleAPIError(error, '提交檔案失敗')
    }
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
