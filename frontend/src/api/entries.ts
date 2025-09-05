import { supabase } from '../lib/supabaseClient'

// 型別定義
export interface UpsertEntryInput {
  page_key: string
  period_year: number
  unit: string
  monthly: Record<string, number>
  notes?: string
}

export interface EnergyEntry {
  id: string
  owner_id: string
  period_start?: string
  period_end?: string
  category: string
  scope?: string
  unit: string
  amount: number
  notes?: string
  payload: any
  created_at: string
  updated_at: string
  page_key: string
  period_year: number
  status: string
}

export interface UpsertEntryResult {
  entry_id: string
}

/**
 * 計算每月數值的總和
 * @param monthly - 每月數值物件，key 為月份字串 (1-12)
 * @returns 總和
 */
export function sumMonthly(monthly: Record<string, number>): number {
  return Object.values(monthly).reduce((sum, value) => {
    // 確保數值有效且非負
    const numValue = Number(value) || 0
    return sum + (numValue >= 0 ? numValue : 0)
  }, 0)
}

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

/**
 * 新增或更新能源填報記錄
 * @param input - 填報輸入資料
 * @returns Promise<UpsertEntryResult>
 */
export async function upsertEnergyEntry(input: UpsertEntryInput): Promise<UpsertEntryResult> {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      throw new Error('使用者未登入')
    }

    // 計算總使用量
    const total = sumMonthly(input.monthly)

    // 推斷類別名稱
    const category = getCategoryFromPageKey(input.page_key)

    // 準備 upsert 資料
    const entryData = {
      owner_id: user.id,
      page_key: input.page_key,
      period_year: input.period_year,
      category: category,
      unit: input.unit,
      amount: total,           // 目前只使用 amount 欄位
      payload: {
        monthly: input.monthly,
        notes: input.notes ?? null
      },
      status: 'submitted',
      // 設定期間範圍（年度範圍）
      period_start: `${input.period_year}-01-01`,
      period_end: `${input.period_year}-12-31`
    }

    // 先檢查是否已存在記錄
    const { data: existingEntry } = await supabase
      .from('energy_entries')
      .select('id')
      .eq('owner_id', user.id)
      .eq('page_key', input.page_key)
      .eq('period_year', input.period_year)
      .maybeSingle()

    let data, error

    if (existingEntry) {
      // 更新現有記錄
      const updateResult = await supabase
        .from('energy_entries')
        .update(entryData)
        .eq('id', existingEntry.id)
        .select('id')
        .single()
      
      data = updateResult.data
      error = updateResult.error
    } else {
      // 插入新記錄
      const insertResult = await supabase
        .from('energy_entries')
        .insert(entryData)
        .select('id')
        .single()
      
      data = insertResult.data
      error = insertResult.error
    }

    if (error) {
      console.error('Error upserting energy entry:', error)
      throw new Error(`儲存填報記錄失敗: ${error.message}`)
    }

    if (!data) {
      throw new Error('儲存填報記錄失敗：沒有回傳資料')
    }

    return {
      entry_id: data.id
    }
  } catch (error) {
    console.error('Error in upsertEnergyEntry:', error)
    if (error instanceof Error) {
      throw error
    }
    throw new Error('儲存填報記錄時發生未知錯誤')
  }
}

/**
 * 取得使用者的能源填報記錄
 * @param pageKey - 頁面識別碼
 * @param year - 年份（選填）
 * @returns Promise<EnergyEntry[]>
 */
export async function getUserEntries(pageKey?: string, year?: number): Promise<EnergyEntry[]> {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      throw new Error('使用者未登入')
    }

    let query = supabase
      .from('energy_entries')
      .select('*')
      .eq('owner_id', user.id)
      .order('period_year', { ascending: false })
      .order('created_at', { ascending: false })

    if (pageKey) {
      query = query.eq('page_key', pageKey)
    }

    if (year) {
      query = query.eq('period_year', year)
    }

    const { data, error } = await query

    if (error) {
      console.error('Error getting user entries:', error)
      throw new Error(`取得填報記錄失敗: ${error.message}`)
    }

    return data || []
  } catch (error) {
    console.error('Error in getUserEntries:', error)
    if (error instanceof Error) {
      throw error
    }
    throw new Error('取得填報記錄時發生未知錯誤')
  }
}

/**
 * 刪除能源填報記錄
 * @param entryId - 記錄 ID
 */
export async function deleteEnergyEntry(entryId: string): Promise<void> {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      throw new Error('使用者未登入')
    }

    const { error } = await supabase
      .from('energy_entries')
      .delete()
      .eq('id', entryId)
      .eq('owner_id', user.id) // 確保只能刪除自己的記錄

    if (error) {
      console.error('Error deleting energy entry:', error)
      throw new Error(`刪除填報記錄失敗: ${error.message}`)
    }
  } catch (error) {
    console.error('Error in deleteEnergyEntry:', error)
    if (error instanceof Error) {
      throw error
    }
    throw new Error('刪除填報記錄時發生未知錯誤')
  }
}

/**
 * 驗證每月數據
 * @param monthly - 每月數值物件
 * @returns 驗證結果
 */
export function validateMonthlyData(monthly: Record<string, number>): {
  valid: boolean
  errors: string[]
} {
  const errors: string[] = []

  // 檢查月份範圍 (1-12)
  for (const [month, value] of Object.entries(monthly)) {
    const monthNum = parseInt(month, 10)
    if (isNaN(monthNum) || monthNum < 1 || monthNum > 12) {
      errors.push(`無效的月份: ${month}`)
    }

    // 檢查數值有效性
    if (typeof value !== 'number' || isNaN(value) || value < 0) {
      errors.push(`${month}月的數值無效: ${value}`)
    }
  }

  return {
    valid: errors.length === 0,
    errors
  }
}