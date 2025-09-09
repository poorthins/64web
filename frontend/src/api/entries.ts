import { supabase } from '../lib/supabaseClient'
import { validateAuth, handleAPIError } from '../utils/authHelpers'

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
 * @param preserveStatus - 是否保持現有狀態（預設為 false，會設為 submitted）
 * @returns Promise<UpsertEntryResult>
 */
export async function upsertEnergyEntry(input: UpsertEntryInput, preserveStatus: boolean = false): Promise<UpsertEntryResult> {
  try {
    const authResult = await validateAuth()
    if (authResult.error || !authResult.user) {
      throw authResult.error || new Error('使用者未登入')
    }
    const user = authResult.user

    console.log('🔍 [upsertEnergyEntry] Starting with:', {
      user_id: user.id,
      page_key: input.page_key,
      period_year: input.period_year,
      monthly_data_count: Object.keys(input.monthly).length,
      preserve_status: preserveStatus
    })

    // 計算總使用量
    const total = sumMonthly(input.monthly)

    // 檢查總使用量是否大於 0（資料庫約束要求）
    if (total <= 0) {
      throw new Error('總使用量必須大於 0，請至少填入一個月份的使用量')
    }

    // 推斷類別名稱
    const category = getCategoryFromPageKey(input.page_key)
    
    console.log('📊 [upsertEnergyEntry] Calculated values:', {
      category,
      total_amount: total
    })

    // 先檢查是否已存在記錄
    console.log('🔎 [upsertEnergyEntry] Checking existing entry...')
    const { data: existingEntry } = await supabase
      .from('energy_entries')
      .select('id, status')
      .eq('owner_id', user.id)
      .eq('page_key', input.page_key)
      .eq('period_year', input.period_year)
      .maybeSingle()

    console.log('📋 [upsertEnergyEntry] Existing entry:', existingEntry)

    // 決定狀態：如果要保持現有狀態且有現有記錄，則使用現有狀態；否則設為 submitted
    let status = 'submitted'
    if (preserveStatus && existingEntry?.status) {
      status = existingEntry.status
      console.log('🔄 [upsertEnergyEntry] Preserving existing status:', status)
    } else {
      console.log('🔄 [upsertEnergyEntry] Setting status to submitted')
    }

    // 準備 upsert 資料
    const entryData = {
      owner_id: user.id,
      page_key: input.page_key,
      period_year: input.period_year,
      category: category,
      unit: input.unit,
      amount: total,           // 確保大於 0
      payload: {
        monthly: input.monthly,
        notes: input.notes ?? null
      },
      status: status,
      // 設定期間範圍（年度範圍）
      period_start: `${input.period_year}-01-01`,
      period_end: `${input.period_year}-12-31`
    }

    let data, error

    if (existingEntry) {
      // 更新現有記錄
      console.log('⏫ [upsertEnergyEntry] Updating existing entry:', existingEntry.id)
      const updateResult = await supabase
        .from('energy_entries')
        .update(entryData)
        .eq('id', existingEntry.id)
        .select('id')
        .single()
      
      data = updateResult.data
      error = updateResult.error
      console.log('✅ [upsertEnergyEntry] Update result:', { data, error })
    } else {
      // 插入新記錄
      console.log('📝 [upsertEnergyEntry] Creating new entry...')
      const insertResult = await supabase
        .from('energy_entries')
        .insert(entryData)
        .select('id')
        .single()
      
      data = insertResult.data
      error = insertResult.error
      console.log('✅ [upsertEnergyEntry] Insert result:', { data, error })
    }

    if (error) {
      console.error('Error upserting energy entry:', error)
      throw handleAPIError(error, '儲存填報記錄失敗')
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
    const authResult = await validateAuth()
    if (authResult.error || !authResult.user) {
      throw authResult.error || new Error('使用者未登入')
    }
    const user = authResult.user

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
      throw handleAPIError(error, '取得填報記錄失敗')
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
    const authResult = await validateAuth()
    if (authResult.error || !authResult.user) {
      throw authResult.error || new Error('使用者未登入')
    }
    const user = authResult.user

    const { error } = await supabase
      .from('energy_entries')
      .delete()
      .eq('id', entryId)
      .eq('owner_id', user.id) // 確保只能刪除自己的記錄

    if (error) {
      console.error('Error deleting energy entry:', error)
      throw handleAPIError(error, '刪除填報記錄失敗')
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
 * 更新能源填報記錄的狀態
 * @param entryId - 記錄 ID
 * @param status - 新狀態 ('draft' | 'submitted' | 'approved' | 'rejected')
 * @returns Promise<void>
 */
export async function updateEntryStatus(entryId: string, status: 'draft' | 'submitted' | 'approved' | 'rejected'): Promise<void> {
  try {
    const authResult = await validateAuth()
    if (authResult.error || !authResult.user) {
      throw authResult.error || new Error('使用者未登入')
    }
    const user = authResult.user

    console.log('🔄 [updateEntryStatus] Updating status:', {
      entry_id: entryId,
      new_status: status,
      user_id: user.id
    })

    const { error } = await supabase
      .from('energy_entries')
      .update({ status })
      .eq('id', entryId)
      .eq('owner_id', user.id) // 確保只能更新自己的記錄

    if (error) {
      console.error('Error updating entry status:', error)
      throw handleAPIError(error, '更新狀態失敗')
    }

    console.log('✅ [updateEntryStatus] Status updated successfully')
  } catch (error) {
    console.error('Error in updateEntryStatus:', error)
    if (error instanceof Error) {
      throw error
    }
    throw new Error('更新狀態時發生未知錯誤')
  }
}

/**
 * 根據頁面鍵值和年份取得能源填報記錄
 * @param pageKey - 頁面識別碼
 * @param year - 年份
 * @returns Promise<EnergyEntry | null>
 */
export async function getEntryByPageKeyAndYear(pageKey: string, year: number): Promise<EnergyEntry | null> {
  try {
    const authResult = await validateAuth()
    if (authResult.error || !authResult.user) {
      throw authResult.error || new Error('使用者未登入')
    }
    const user = authResult.user

    const { data, error } = await supabase
      .from('energy_entries')
      .select('*')
      .eq('owner_id', user.id)
      .eq('page_key', pageKey)
      .eq('period_year', year)
      .maybeSingle()

    if (error) {
      console.error('Error getting entry by page key and year:', error)
      throw handleAPIError(error, '取得填報記錄失敗')
    }

    return data
  } catch (error) {
    console.error('Error in getEntryByPageKeyAndYear:', error)
    if (error instanceof Error) {
      throw error
    }
    throw new Error('取得填報記錄時發生未知錯誤')
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
