import { supabase } from '../lib/supabaseClient'
import { validateAuth, handleAPIError } from '../utils/authHelpers'

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

const allCategories = [
  { pageKey: 'wd40', title: 'WD-40', category: '範疇一', scope: '直接排放' },
  { pageKey: 'acetylene', title: '乙炔', category: '範疇一', scope: '直接排放' },
  { pageKey: 'refrigerant', title: '冷媒', category: '範疇一', scope: '直接排放' },
  { pageKey: 'septictank', title: '化糞池', category: '範疇一', scope: '直接排放' },
  { pageKey: 'natural_gas', title: '天然氣', category: '範疇一', scope: '直接排放' },
  { pageKey: 'urea', title: '尿素', category: '範疇一', scope: '直接排放' },
  { pageKey: 'diesel_generator', title: '柴油(發電機)', category: '範疇一', scope: '直接排放' },
  { pageKey: 'diesel', title: '柴油', category: '範疇一', scope: '直接排放' },
  { pageKey: 'gasoline', title: '汽油', category: '範疇一', scope: '直接排放' },
  { pageKey: 'lpg', title: '液化石油氣', category: '範疇一', scope: '直接排放' },
  { pageKey: 'fire_extinguisher', title: '滅火器', category: '範疇一', scope: '直接排放' },
  { pageKey: 'welding_rod', title: '焊條', category: '範疇一', scope: '直接排放' },
  { pageKey: 'electricity_bill', title: '外購電力', category: '範疇二', scope: '間接排放' },
  { pageKey: 'employee_commute', title: '員工通勤', category: '範疇三', scope: '其他間接' }
]

const titleMap: Record<string, string> = {
  'wd40': 'WD-40',
  'acetylene': '乙炔',
  'refrigerant': '冷媒',
  'septictank': '化糞池',
  'natural_gas': '天然氣',
  'urea': '尿素',
  'diesel_generator': '柴油(發電機)',
  'diesel': '柴油',
  'gasoline': '汽油',
  'lpg': '液化石油氣',
  'fire_extinguisher': '滅火器',
  'welding_rod': '焊條',
  'electricity_bill': '外購電力',
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

    return entries?.map(entry => ({
      id: entry.id,
      pageKey: entry.page_key,
      title: titleMap[entry.page_key] || entry.page_key,
      category: entry.category,
      reviewNotes: entry.review_notes || '無退回原因說明',
      updatedAt: entry.updated_at
    })) || []
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
      'draft': '草稿',
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