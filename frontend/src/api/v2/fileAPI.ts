/**
 * File Upload API v2
 * 對應後端 /api/files/* endpoints
 */

import { supabase } from '../../lib/supabaseClient'

/**
 * 檔案上傳元數據
 * 匹配後端 FileUploadMetadata schema
 */
export interface FileUploadMetadata {
  page_key: string
  period_year: number
  file_type: 'msds' | 'usage_evidence' | 'other' | 'heat_value_evidence' | 'annual_evidence' | 'nameplate_evidence' | 'sf6_nameplate' | 'sf6_certificate'
  month?: number
  entry_id?: string
  record_id?: string
  standard?: '64' | '67'
}

/**
 * 檔案上傳響應
 * 匹配後端 FileUploadResponse schema
 */
export interface FileUploadResponse {
  success: boolean
  file_id: string
  file_path: string
  file_name: string
  file_size: number
  message?: string
}

/**
 * 檔案刪除請求
 * 匹配後端 FileDeleteRequest schema
 */
export interface FileDeleteRequest {
  file_id: string
}

/**
 * 檔案刪除響應
 */
export interface FileDeleteResponse {
  success: boolean
  file_id: string
  message?: string
}

/**
 * 上傳證據檔案
 *
 * @param file - 檔案物件
 * @param metadata - 檔案元數據
 * @returns 上傳結果（包含 file_id）
 * @throws Error - 當上傳失敗時拋出錯誤
 *
 * @example
 * ```typescript
 * const file = document.getElementById('file-input').files[0]
 * const result = await uploadEvidenceFile(file, {
 *   page_key: 'diesel',
 *   period_year: 2024,
 *   file_type: 'usage_evidence',
 *   month: 1,
 *   entry_id: 'entry-uuid-123'
 * })
 * console.log(result.file_id) // "file-uuid-456"
 * ```
 */
export async function uploadEvidenceFile(
  file: File,
  metadata: FileUploadMetadata
): Promise<FileUploadResponse> {
  try {
    // 驗證檔案大小（10MB）
    const MAX_FILE_SIZE = 10 * 1024 * 1024
    if (file.size > MAX_FILE_SIZE) {
      throw new Error(`檔案大小超過限制（${MAX_FILE_SIZE / 1024 / 1024}MB）`)
    }

    if (file.size === 0) {
      throw new Error('檔案是空的')
    }

    // 驗證必填欄位
    if (metadata.file_type === 'usage_evidence' && !metadata.month) {
      throw new Error('usage_evidence 類型必須提供 month 參數')
    }

    // 取得認證 token
    const { data: { session }, error: authError } = await supabase.auth.getSession()

    if (authError || !session) {
      throw new Error('使用者未登入')
    }

    // 建立 FormData
    const formData = new FormData()
    formData.append('file', file)
    formData.append('page_key', metadata.page_key)
    formData.append('period_year', metadata.period_year.toString())
    formData.append('file_type', metadata.file_type)

    if (metadata.month !== undefined) {
      formData.append('month', metadata.month.toString())
    }

    if (metadata.entry_id) {
      formData.append('entry_id', metadata.entry_id)
    }

    if (metadata.record_id) {
      formData.append('record_id', metadata.record_id)
    }

    if (metadata.standard) {
      formData.append('standard', metadata.standard)
    } else {
      formData.append('standard', '64')
    }

    // 呼叫後端 API
    const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/files/upload`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session.access_token}`
        // 注意：不要設置 Content-Type，讓瀏覽器自動設置 multipart/form-data boundary
      },
      body: formData
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
      throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`)
    }

    const result = await response.json()
    return result
  } catch (error) {
    console.error('File upload failed:', error)
    throw error instanceof Error ? error : new Error('上傳檔案時發生未知錯誤')
  }
}

/**
 * 刪除證據檔案
 *
 * @param fileId - 檔案 ID
 * @returns 刪除結果
 * @throws Error - 當刪除失敗時拋出錯誤
 *
 * @example
 * ```typescript
 * const result = await deleteEvidenceFile('file-uuid-456')
 * console.log(result.success) // true
 * ```
 */
export async function deleteEvidenceFile(
  fileId: string
): Promise<FileDeleteResponse> {
  try {
    // 取得認證 token
    const { data: { session }, error: authError } = await supabase.auth.getSession()

    if (authError || !session) {
      throw new Error('使用者未登入')
    }

    // 呼叫後端 API
    const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/files/${fileId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${session.access_token}`
      }
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
      throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`)
    }

    const result = await response.json()
    return result
  } catch (error) {
    console.error('File deletion failed:', error)
    throw error instanceof Error ? error : new Error('刪除檔案時發生未知錯誤')
  }
}

/**
 * 批次上傳檔案
 *
 * @param files - 檔案陣列
 * @param metadata - 共用元數據
 * @returns 上傳結果陣列
 *
 * @example
 * ```typescript
 * const files = Array.from(document.getElementById('files-input').files)
 * const results = await uploadMultipleFiles(files, {
 *   page_key: 'diesel',
 *   period_year: 2024,
 *   file_type: 'usage_evidence',
 *   month: 1
 * })
 * ```
 */
export async function uploadMultipleFiles(
  files: File[],
  metadata: FileUploadMetadata
): Promise<FileUploadResponse[]> {
  const results: FileUploadResponse[] = []

  for (const file of files) {
    try {
      const result = await uploadEvidenceFile(file, metadata)
      results.push(result)
    } catch (error) {
      console.error(`Failed to upload file ${file.name}:`, error)
      throw error
    }
  }

  return results
}

/**
 * 驗證檔案類型
 *
 * @param file - 檔案物件
 * @returns 是否為允許的類型
 */
export function validateFileType(file: File): boolean {
  const allowedTypes = [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif',
    'image/webp',
    'image/heic',
    'image/heif',
    'application/pdf',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain',
    'text/csv',
    'application/zip',
    'application/x-zip-compressed'
  ]

  return allowedTypes.includes(file.type)
}
