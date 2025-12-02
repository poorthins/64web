/**
 * Energy Entry Submission API v2
 * 對應後端 /api/entries/* endpoints
 */

import { supabase } from '../../supabaseClient'

/**
 * 能源條目提交請求
 * 匹配後端 EntrySubmitRequest schema
 */
export interface EntrySubmitRequest {
  page_key: string
  period_year: number
  unit: string
  monthly?: Record<string, number>  // Optional (Type 5 不需要)
  notes?: string
  payload?: Record<string, any>
  extraPayload?: Record<string, any>
  status?: 'saved' | 'submitted' | 'approved' | 'rejected'
}

/**
 * 能源條目提交響應
 * 匹配後端 EntrySubmitResponse schema
 */
export interface EntrySubmitResponse {
  success: boolean
  entry_id: string
  message?: string
}

/**
 * 能源條目更新請求
 * 匹配後端 EntryUpdateRequest schema
 */
export interface EntryUpdateRequest {
  monthly?: Record<string, number>
  notes?: string
  payload?: Record<string, any>
  extraPayload?: Record<string, any>
  status?: string
}

/**
 * 能源條目更新響應
 */
export interface EntryUpdateResponse {
  success: boolean
  entry_id: string
  message?: string
}

/**
 * 提交能源條目
 *
 * @param request - 提交請求參數
 * @returns 提交結果（包含 entry_id）
 * @throws Error - 當提交失敗時拋出錯誤
 *
 * @example
 * ```typescript
 * const result = await submitEnergyEntry({
 *   page_key: 'diesel',
 *   period_year: 2024,
 *   unit: '公升',
 *   monthly: { '1': 100, '2': 150 },
 *   notes: '2024年度柴油使用記錄',
 *   status: 'submitted'
 * })
 * console.log(result.entry_id) // "uuid-123"
 * ```
 */
export async function submitEnergyEntry(
  request: EntrySubmitRequest
): Promise<EntrySubmitResponse> {
  try {
    // 取得認證 token
    const { data: { session }, error: authError } = await supabase.auth.getSession()

    if (authError || !session) {
      throw new Error('使用者未登入')
    }

    // 呼叫後端 API
    console.log('🚀 [submitEnergyEntry] Sending request:', request)
    const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/entries/submit`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`
      },
      body: JSON.stringify(request)
    })

    console.log('📡 [submitEnergyEntry] Response status:', response.status)

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
      console.error('❌ [submitEnergyEntry] Error response:', errorData)
      const errorMessage = typeof errorData.error === 'string'
        ? errorData.error
        : JSON.stringify(errorData)
      throw new Error(errorMessage || `HTTP ${response.status}: ${response.statusText}`)
    }

    const result = await response.json()
    return result
  } catch (error) {
    console.error('Entry submission failed:', error)
    throw error instanceof Error ? error : new Error('提交能源條目時發生未知錯誤')
  }
}

/**
 * 更新能源條目
 *
 * @param entryId - 條目 ID
 * @param request - 更新請求參數
 * @returns 更新結果
 * @throws Error - 當更新失敗時拋出錯誤
 *
 * @example
 * ```typescript
 * const result = await updateEnergyEntry('uuid-123', {
 *   monthly: { '1': 120, '2': 160 },
 *   notes: '更新後的備註'
 * })
 * ```
 */
export async function updateEnergyEntry(
  entryId: string,
  request: EntryUpdateRequest
): Promise<EntryUpdateResponse> {
  try {
    // 取得認證 token
    const { data: { session }, error: authError } = await supabase.auth.getSession()

    if (authError || !session) {
      throw new Error('使用者未登入')
    }

    // 呼叫後端 API
    const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/entries/${entryId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`
      },
      body: JSON.stringify(request)
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
      throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`)
    }

    const result = await response.json()
    return result
  } catch (error) {
    console.error('Entry update failed:', error)
    throw error instanceof Error ? error : new Error('更新能源條目時發生未知錯誤')
  }
}

/**
 * 驗證月份數據格式
 *
 * @param monthly - 月份數據
 * @throws Error - 當數據格式不正確時拋出錯誤
 */
export function validateMonthlyData(monthly: Record<string, number>): void {
  for (const [monthStr, value] of Object.entries(monthly)) {
    const month = parseInt(monthStr)

    if (isNaN(month) || month < 1 || month > 12) {
      throw new Error(`Invalid month: ${monthStr}. Must be 1-12`)
    }

    if (value < 0) {
      throw new Error(`Negative value not allowed for month ${monthStr}: ${value}`)
    }
  }
}
