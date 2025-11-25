import { supabase } from '../lib/supabaseClient'
import { validateAuth, handleAPIError } from '../utils/authHelpers'

// 資料庫 key 轉前端 key 的映射
// Fixed: unified page_key to 'septic_tank'
const DB_TO_FRONTEND_MAP: Record<string, string> = {
  'electricity': 'electricity'
}

/**
 * 將資料庫格式的能源類別轉換為前端格式
 */
function convertDbKeysToFrontend(categories: string[]): string[] {
  return categories.map(key => DB_TO_FRONTEND_MAP[key] || key);
}

export interface ReportingProgressSummary {
  total: number
  completed: number
  byStatus: {
    submitted: number
    approved: number
    rejected: number
    returned: number
  }
  reportingPeriod: {
    startDate: string
    endDate: string
  } | null
}

export interface RejectedEntry {
  id: string
  pageKey: string
  title: string
  category: string
  reviewNotes: string
  updatedAt: string
}

export interface PendingEntry {
  pageKey: string
  title: string
  category: string
  scope: string
}

export interface RecentActivity {
  id: string
  type: string
  description: string
  timestamp: string
  status: string
}

export interface AllEntry {
  pageKey: string           // 項目識別碼
  title: string            // 項目名稱
  category: string         // 範疇分類 (範疇一/範疇二/範疇三)
  scope: string           // 排放範圍描述
  status: 'pending' | 'saved' | 'submitted' | 'approved' | 'rejected' | 'returned' | 'draft' | 'under_review' | 'needs_revision' | 'needs_fix' | null  // 後端可能回傳的所有狀態
  updatedAt?: string      // 最後更新時間
  rejectionReason?: string // 退回原因 (狀態為 rejected 時)
  entryId?: string        // 填報記錄 ID (用於取得退回原因)
}

export interface RejectionDetail {
  reason: string          // 退回原因
  reviewer_notes: string  // 審核者備註
  rejected_at: string    // 退回時間
}

const allCategories = [
  { pageKey: 'wd40', title: 'WD-40', category: '範疇一', scope: '直接排放' },
  { pageKey: 'acetylene', title: '乙炔', category: '範疇一', scope: '直接排放' },
  { pageKey: 'refrigerant', title: '冷媒', category: '範疇一', scope: '直接排放' },
  { pageKey: 'septic_tank', title: '化糞池', category: '範疇一', scope: '直接排放' },
  { pageKey: 'natural_gas', title: '天然氣', category: '範疇一', scope: '直接排放' },
  { pageKey: 'urea', title: '尿素', category: '範疇一', scope: '直接排放' },
  { pageKey: 'diesel_generator', title: '柴油(固定源)', category: '範疇一', scope: '直接排放' },
  { pageKey: 'generator_test', title: '發電機測試資料', category: '範疇一', scope: '直接排放' },
  { pageKey: 'diesel', title: '柴油(移動源)', category: '範疇一', scope: '直接排放' },
  { pageKey: 'gasoline', title: '汽油', category: '範疇一', scope: '直接排放' },
  { pageKey: 'sf6', title: '六氟化硫', category: '範疇一', scope: '直接排放' },
  { pageKey: 'lpg', title: '液化石油氣', category: '範疇一', scope: '直接排放' },
  { pageKey: 'fire_extinguisher', title: '滅火器', category: '範疇一', scope: '直接排放' },
  { pageKey: 'welding_rod', title: '焊條', category: '範疇一', scope: '直接排放' },
  { pageKey: 'gas_cylinder', title: '氣體鋼瓶', category: '範疇一', scope: '直接排放' },
  { pageKey: 'other_energy_sources', title: '其他使用能源', category: '範疇一', scope: '直接排放' },
  { pageKey: 'electricity', title: '外購電力', category: '範疇二', scope: '間接排放' },
  { pageKey: 'employee_commute', title: '員工通勤', category: '範疇三', scope: '其他間接' }
]

const titleMap: Record<string, string> = {
  'wd40': 'WD-40',
  'acetylene': '乙炔',
  'refrigerant': '冷媒',
  'septic_tank': '化糞池',
  'natural_gas': '天然氣',
  'urea': '尿素',
  'diesel_generator': '柴油(固定源)',
  'generator_test': '發電機測試資料',
  'diesel': '柴油(移動源)',
  'gasoline': '汽油',
  'sf6': '六氟化硫',
  'lpg': '液化石油氣',
  'fire_extinguisher': '滅火器',
  'welding_rod': '焊條',
  'gas_cylinder': '氣體鋼瓶',
  'other_energy_sources': '其他使用能源',
  'electricity': '外購電力',
  'employee_commute': '員工通勤'
}

export async function getReportingProgress(): Promise<ReportingProgressSummary> {
  try {
    const authResult = await validateAuth()
    if (authResult.error || !authResult.user) {
      throw authResult.error || new Error('使用者未登入')
    }
    const user = authResult.user
    const currentYear = new Date().getFullYear()

    const { data: entries, error: entriesError } = await supabase
      .from('energy_entries')
      .select('page_key, status')
      .eq('owner_id', user.id)
      .eq('period_year', currentYear)

    if (entriesError) {
      throw handleAPIError(entriesError, '取得填報記錄失敗')
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('report_start_date, report_end_date')
      .eq('id', user.id)
      .single()

    const entriesMap = new Map(entries?.map(e => [e.page_key, e.status]) || [])

    const byStatus = {
      submitted: 0,
      approved: 0,
      rejected: 0,
      returned: 0
    }

    let completed = 0

    allCategories.forEach(category => {
      const status = entriesMap.get(category.pageKey)
      if (status) {
        completed++
        if (status in byStatus) {
          byStatus[status as keyof typeof byStatus]++
        }
      }
    })

    return {
      total: allCategories.length,
      completed,
      byStatus,
      reportingPeriod: profile ? {
        startDate: profile.report_start_date || '',
        endDate: profile.report_end_date || ''
      } : null
    }
  } catch (error) {
    console.error('Error in getReportingProgress:', error)
    if (error instanceof Error) {
      throw error
    }
    throw new Error('取得填報進度時發生未知錯誤')
  }
}

export async function getRejectedEntries(): Promise<RejectedEntry[]> {
  try {
    const authResult = await validateAuth()
    if (authResult.error || !authResult.user) {
      throw authResult.error || new Error('使用者未登入')
    }
    const user = authResult.user
    const currentYear = new Date().getFullYear()

    // 取得使用者權限配置
    const { data: profile } = await supabase
      .from('profiles')
      .select('filling_config')
      .eq('id', user.id)
      .single()

    // 取得退回記錄
    const { data: entries, error } = await supabase
      .from('energy_entries')
      .select('id, page_key, category, updated_at, review_notes')
      .eq('owner_id', user.id)
      .eq('period_year', currentYear)
      .in('status', ['rejected', 'returned'])
      .order('updated_at', { ascending: false })

    if (error) {
      throw handleAPIError(error, '取得退回記錄失敗')
    }

    if (!entries) {
      return []
    }

    // 加入權限過濾邏輯
    let filteredEntries = entries

    // 如果不是管理員，需要進行權限過濾
    if (profile?.filling_config?.energy_categories) {
      // 1. 取得使用者的 filling_config.energy_categories (資料庫格式)
      const userDbCategories = profile.filling_config.energy_categories || []

      // 2. 轉換資料庫 key 到前端 key
      const userFrontendCategories = convertDbKeysToFrontend(userDbCategories)

      // 3. 過濾掉沒權限的項目
      filteredEntries = entries.filter(entry =>
        userFrontendCategories.includes(entry.page_key)
      )
    }

    return filteredEntries.map(entry => ({
      id: entry.id,
      pageKey: entry.page_key,
      title: titleMap[entry.page_key] || entry.page_key,
      category: entry.category,
      reviewNotes: entry.review_notes || '無退回原因說明',
      updatedAt: entry.updated_at
    }))
  } catch (error) {
    console.error('Error in getRejectedEntries:', error)
    if (error instanceof Error) {
      throw error
    }
    throw new Error('取得退回記錄時發生未知錯誤')
  }
}

export async function getPendingEntries(): Promise<PendingEntry[]> {
  try {
    const authResult = await validateAuth()
    if (authResult.error || !authResult.user) {
      throw authResult.error || new Error('使用者未登入')
    }
    const user = authResult.user
    const currentYear = new Date().getFullYear()

    const { data: existingEntries, error } = await supabase
      .from('energy_entries')
      .select('page_key')
      .eq('owner_id', user.id)
      .eq('period_year', currentYear)

    if (error) {
      throw handleAPIError(error, '取得已填寫記錄失敗')
    }

    const existingPageKeys = new Set(existingEntries?.map(e => e.page_key) || [])

    return allCategories.filter(category =>
      !existingPageKeys.has(category.pageKey)
    )
  } catch (error) {
    console.error('Error in getPendingEntries:', error)
    if (error instanceof Error) {
      throw error
    }
    throw new Error('取得待填寫項目時發生未知錯誤')
  }
}

export async function getRecentActivities(): Promise<RecentActivity[]> {
  try {
    const authResult = await validateAuth()
    if (authResult.error || !authResult.user) {
      throw authResult.error || new Error('使用者未登入')
    }
    const user = authResult.user
    const currentYear = new Date().getFullYear()

    const { data: entries, error } = await supabase
      .from('energy_entries')
      .select('page_key, status, updated_at, category')
      .eq('owner_id', user.id)
      .eq('period_year', currentYear)
      .order('updated_at', { ascending: false })
      .limit(10)

    if (error) {
      throw handleAPIError(error, '取得活動記錄失敗')
    }

    const statusMap: Record<string, string> = {
      'saved': '已暫存',
      'submitted': '提交審核',
      'approved': '審核通過',
      'rejected': '審核退回',
      'returned': '要求修正'
    }

    return entries?.map(entry => ({
      id: entry.page_key + '_' + entry.updated_at,
      type: statusMap[entry.status] || entry.status,
      description: `${titleMap[entry.page_key] || entry.page_key} - ${entry.category}`,
      timestamp: entry.updated_at,
      status: entry.status
    })) || []
  } catch (error) {
    console.error('Error in getRecentActivities:', error)
    if (error instanceof Error) {
      throw error
    }
    throw new Error('取得活動記錄時發生未知錯誤')
  }
}

export async function getAllEntries(): Promise<AllEntry[]> {
  try {
    const authResult = await validateAuth()
    if (authResult.error || !authResult.user) {
      throw authResult.error || new Error('使用者未登入')
    }
    const user = authResult.user
    const currentYear = new Date().getFullYear()

    // 取得使用者所有填報記錄
    const { data: entries, error } = await supabase
      .from('energy_entries')
      .select('id, page_key, status, updated_at, category')
      .eq('owner_id', user.id)
      .eq('period_year', currentYear)

    if (error) {
      throw handleAPIError(error, '取得項目記錄失敗')
    }

    // 建立狀態對應表
    const entryStatusMap = new Map()
    entries?.forEach(entry => {
      entryStatusMap.set(entry.page_key, {
        entryId: entry.id,
        status: entry.status,
        updatedAt: entry.updated_at,
        category: entry.category
      })
    })

    // 結合 allCategories 與實際狀態
    const result = allCategories.map(category => {
      const entryData = entryStatusMap.get(category.pageKey)
      return {
        pageKey: category.pageKey,
        title: category.title,
        category: category.category,
        scope: category.scope,
        status: entryData?.status || null,
        updatedAt: entryData?.updatedAt,
        rejectionReason: undefined, // 後續透過 getRejectionReason 載入
        entryId: entryData?.entryId
      }
    })

    return result
  } catch (error) {
    console.error('Error in getAllEntries:', error)
    if (error instanceof Error) {
      throw error
    }
    throw new Error('取得所有項目時發生未知錯誤')
  }
}

export async function getRejectionReason(entryId: string): Promise<RejectionDetail> {
  try {
    const authResult = await validateAuth()
    if (authResult.error || !authResult.user) {
      throw authResult.error || new Error('使用者未登入')
    }
    const user = authResult.user

    const { data: entry, error } = await supabase
      .from('energy_entries')
      .select('review_notes, updated_at, status')
      .eq('id', entryId)
      .eq('owner_id', user.id) // 確保資料安全
      .maybeSingle()  // ✅ 使用 maybeSingle() 防止查詢失敗

    if (error) {
      throw handleAPIError(error, '取得退回原因失敗')
    }

    if (!entry) {
      throw new Error('找不到對應的填報記錄或無權限查看')
    }

    return {
      reason: entry.review_notes || '無退回原因說明',
      reviewer_notes: entry.review_notes || '',
      rejected_at: entry.updated_at
    }
  } catch (error) {
    console.error('Error in getRejectionReason:', error)
    if (error instanceof Error) {
      throw error
    }
    throw new Error('取得退回原因時發生未知錯誤')
  }
}