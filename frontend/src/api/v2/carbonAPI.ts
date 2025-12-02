/**
 * Carbon Calculation API v2
 * 對應後端 /api/carbon/calculate endpoint
 */

import { supabase } from '../../supabaseClient'

/**
 * 碳排放計算請求
 * 匹配後端 CarbonCalculateRequest schema
 */
export interface CarbonCalculateRequest {
  page_key: string
  monthly_data: Record<string, number>
  year: number
}

/**
 * 碳排放計算響應
 * 匹配後端 CarbonCalculateResponse schema
 */
export interface CarbonCalculateResponse {
  total_emission: number
  monthly_emission: Record<string, number>
  emission_factor: number
  formula: string
  page_key: string
  year: number
}

/**
 * 計算碳排放量
 *
 * @param request - 計算請求參數
 * @returns 碳排放計算結果
 * @throws Error - 當計算失敗時拋出錯誤
 *
 * @example
 * ```typescript
 * const result = await calculateCarbon({
 *   page_key: 'diesel',
 *   monthly_data: { '1': 100, '2': 150 },
 *   year: 2024
 * })
 * console.log(result.total_emission) // 652.17
 * ```
 */
export async function calculateCarbon(
  request: CarbonCalculateRequest
): Promise<CarbonCalculateResponse> {
  try {
    // 取得認證 token
    const { data: { session }, error: authError } = await supabase.auth.getSession()

    if (authError || !session) {
      throw new Error('使用者未登入')
    }

    // 呼叫後端 API
    const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/carbon/calculate`, {
      method: 'POST',
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
    console.error('Carbon calculation failed:', error)
    throw error instanceof Error ? error : new Error('計算碳排放時發生未知錯誤')
  }
}

/**
 * 取得指定能源類型的排放係數
 *
 * @param pageKey - 能源類型鍵值
 * @param year - 年份
 * @returns 排放係數（kgCO2e per unit）
 */
export async function getEmissionFactor(pageKey: string, year: number): Promise<number> {
  // 使用計算 API 取得排放係數（傳入空的 monthly_data）
  const result = await calculateCarbon({
    page_key: pageKey,
    monthly_data: {},
    year
  })

  return result.emission_factor
}
