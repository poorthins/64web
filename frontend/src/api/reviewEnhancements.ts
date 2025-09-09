import { supabase } from '../lib/supabaseClient'
import { validateAuth, handleAPIError } from '../utils/authHelpers'

export interface PendingReviewEntry {
  id: string
  owner_id: string
  page_key: string
  category: string
  period_year: number
  unit: string
  amount: number
  payload: any
  created_at: string
  updated_at: string
  status: 'submitted'
  owner: {
    id: string
    display_name: string
    email?: string
  }
  evidence_files: Array<{
    id: string
    file_name: string
    file_path: string
    mime_type: string
    file_size: number
    created_at: string
  }>
}

export interface ReviewFilters {
  userId?: string
  status?: 'approved' | 'rejected' | 'all'
  startDate?: string
  endDate?: string
  category?: string
}

export interface ReviewedEntry {
  id: string
  owner_id: string
  page_key: string
  category: string
  period_year: number
  unit: string
  amount: number
  status: 'approved' | 'rejected'
  reviewer_id: string
  review_notes: string
  reviewed_at: string
  is_locked: boolean
  owner: {
    display_name: string
    email?: string
  }
  reviewer: {
    display_name: string
  }
}

/**
 * 獲取待審核項目 (填報總攬用)
 * 只顯示 status = 'submitted' 的項目
 */
export async function getPendingReviewEntries(userId?: string): Promise<PendingReviewEntry[]> {
  try {
    const authResult = await validateAuth()
    if (authResult.error) throw authResult.error

    let query = supabase
      .from('energy_entries')
      .select(`
        id,
        owner_id,
        page_key,
        category,
        period_year,
        unit,
        amount,
        payload,
        created_at,
        updated_at,
        status,
        profiles!owner_id (
          id,
          display_name,
          email
        ),
        entry_files (
          id,
          file_name,
          file_path,
          mime_type,
          file_size,
          created_at
        )
      `)
      .eq('status', 'submitted')
      .order('created_at', { ascending: false })

    if (userId) {
      query = query.eq('owner_id', userId)
    }

    const { data, error } = await query

    if (error) {
      throw handleAPIError(error, '無法取得待審核項目')
    }

    return (data || []).map(item => {
      const profile = Array.isArray(item.profiles) ? item.profiles[0] : item.profiles
      return {
        id: item.id,
        owner_id: item.owner_id,
        page_key: item.page_key,
        category: item.category,
        period_year: item.period_year,
        unit: item.unit,
        amount: item.amount,
        payload: item.payload,
        created_at: item.created_at,
        updated_at: item.updated_at,
        status: item.status as 'submitted',
        owner: {
          id: profile?.id || '',
          display_name: profile?.display_name || '',
          email: profile?.email
        },
        evidence_files: item.entry_files || []
      }
    })
  } catch (error) {
    console.error('Error in getPendingReviewEntries:', error)
    if (error instanceof Error) {
      throw error
    }
    throw new Error('取得待審核項目時發生未知錯誤')
  }
}

/**
 * 獲取已審核項目 (填報審核用)
 * 顯示 status = 'approved' 或 'rejected' 的項目
 */
export async function getReviewedEntries(filters: ReviewFilters = {}): Promise<ReviewedEntry[]> {
  try {
    const authResult = await validateAuth()
    if (authResult.error) throw authResult.error

    let query = supabase
      .from('energy_entries')
      .select(`
        id,
        owner_id,
        page_key,
        category,
        period_year,
        unit,
        amount,
        status,
        reviewer_id,
        review_notes,
        reviewed_at,
        is_locked,
        profiles!owner_id (
          display_name,
          email
        ),
        reviewer_profiles:profiles!reviewer_id (
          display_name
        )
      `)
      .in('status', ['approved', 'rejected'])
      .order('reviewed_at', { ascending: false })

    // 應用篩選條件
    if (filters.userId) {
      query = query.eq('owner_id', filters.userId)
    }

    if (filters.status && filters.status !== 'all') {
      query = query.eq('status', filters.status)
    }

    if (filters.startDate) {
      query = query.gte('reviewed_at', filters.startDate)
    }

    if (filters.endDate) {
      query = query.lte('reviewed_at', filters.endDate)
    }

    if (filters.category) {
      query = query.eq('category', filters.category)
    }

    const { data, error } = await query

    if (error) {
      throw handleAPIError(error, '無法取得已審核項目')
    }

    return (data || []).map(item => {
      const ownerProfile = Array.isArray(item.profiles) ? item.profiles[0] : item.profiles
      const reviewerProfile = Array.isArray(item.reviewer_profiles) ? item.reviewer_profiles[0] : item.reviewer_profiles
      return {
        id: item.id,
        owner_id: item.owner_id,
        page_key: item.page_key,
        category: item.category,
        period_year: item.period_year,
        unit: item.unit,
        amount: item.amount,
        status: item.status as 'approved' | 'rejected',
        reviewer_id: item.reviewer_id,
        review_notes: item.review_notes || '',
        reviewed_at: item.reviewed_at,
        is_locked: item.is_locked || false,
        owner: {
          display_name: ownerProfile?.display_name || '',
          email: ownerProfile?.email
        },
        reviewer: {
          display_name: reviewerProfile?.display_name || ''
        }
      }
    })
  } catch (error) {
    console.error('Error in getReviewedEntries:', error)
    if (error instanceof Error) {
      throw error
    }
    throw new Error('取得已審核項目時發生未知錯誤')
  }
}

/**
 * 執行批閱操作
 * 將項目狀態從 'submitted' 改為 'approved' 或 'rejected'
 */
export async function reviewEntry(
  entryId: string, 
  action: 'approve' | 'reject', 
  notes?: string
): Promise<void> {
  try {
    const authResult = await validateAuth()
    if (authResult.error) throw authResult.error

    const status = action === 'approve' ? 'approved' : 'rejected'
    const updateData: any = {
      status,
      reviewer_id: authResult.user?.id,
      review_notes: notes || '',
      reviewed_at: new Date().toISOString()
    }

    // 如果是通過，則鎖定該項目
    if (action === 'approve') {
      updateData.is_locked = true
    }

    const { error } = await supabase
      .from('energy_entries')
      .update(updateData)
      .eq('id', entryId)
      .eq('status', 'submitted') // 只能審核 submitted 狀態的項目

    if (error) {
      throw handleAPIError(error, '無法執行批閱操作')
    }
  } catch (error) {
    console.error('Error in reviewEntry:', error)
    if (error instanceof Error) {
      throw error
    }
    throw new Error('執行批閱操作時發生未知錯誤')
  }
}

/**
 * 批量批閱操作
 */
export async function bulkReviewEntries(
  entryIds: string[], 
  action: 'approve' | 'reject', 
  notes?: string
): Promise<void> {
  try {
    const authResult = await validateAuth()
    if (authResult.error) throw authResult.error

    const status = action === 'approve' ? 'approved' : 'rejected'
    const updateData: any = {
      status,
      reviewer_id: authResult.user?.id,
      review_notes: notes || '',
      reviewed_at: new Date().toISOString()
    }

    if (action === 'approve') {
      updateData.is_locked = true
    }

    const { error } = await supabase
      .from('energy_entries')
      .update(updateData)
      .in('id', entryIds)
      .eq('status', 'submitted')

    if (error) {
      throw handleAPIError(error, '無法執行批量批閱操作')
    }
  } catch (error) {
    console.error('Error in bulkReviewEntries:', error)
    if (error instanceof Error) {
      throw error
    }
    throw new Error('執行批量批閱操作時發生未知錯誤')
  }
}

/**
 * 獲取有待審項目的使用者列表
 */
export async function getUsersWithPendingEntries(): Promise<Array<{
  id: string
  display_name: string
  email?: string
  pending_count: number
}>> {
  try {
    const authResult = await validateAuth()
    if (authResult.error) throw authResult.error

    const { data, error } = await supabase
      .from('energy_entries')
      .select(`
        owner_id,
        profiles!owner_id (
          id,
          display_name,
          email
        )
      `)
      .eq('status', 'submitted')

    if (error) {
      throw handleAPIError(error, '無法取得待審核用戶列表')
    }

    // 統計每個用戶的待審核項目數量
    const userCounts = new Map<string, { user: any, count: number }>()
    
    data?.forEach(entry => {
      if (entry.profiles) {
        const profile = Array.isArray(entry.profiles) ? entry.profiles[0] : entry.profiles
        if (profile) {
          const userId = profile.id
          const existing = userCounts.get(userId)
          if (existing) {
            existing.count++
          } else {
            userCounts.set(userId, {
              user: profile,
              count: 1
            })
          }
        }
      }
    })

    return Array.from(userCounts.values()).map(({ user, count }) => ({
      id: user.id,
      display_name: user.display_name || '',
      email: user.email,
      pending_count: count
    })).sort((a, b) => b.pending_count - a.pending_count)
  } catch (error) {
    console.error('Error in getUsersWithPendingEntries:', error)
    if (error instanceof Error) {
      throw error
    }
    throw new Error('取得待審核用戶列表時發生未知錯誤')
  }
}

/**
 * 重新提交被退回的項目
 * 當使用者修改後重新提交時，將狀態從 'rejected' 改回 'submitted'
 */
export async function resubmitEntry(entryId: string): Promise<void> {
  try {
    const authResult = await validateAuth()
    if (authResult.error) throw authResult.error

    const { error } = await supabase
      .from('energy_entries')
      .update({
        status: 'submitted',
        updated_at: new Date().toISOString(),
        // 清除之前的審核資訊
        reviewer_id: null,
        review_notes: null,
        reviewed_at: null,
        is_locked: false
      })
      .eq('id', entryId)
      .eq('owner_id', authResult.user?.id) // 確保只能重新提交自己的項目
      .eq('status', 'rejected') // 只能重新提交被退回的項目

    if (error) {
      throw handleAPIError(error, '無法重新提交項目')
    }
  } catch (error) {
    console.error('Error in resubmitEntry:', error)
    if (error instanceof Error) {
      throw error
    }
    throw new Error('重新提交項目時發生未知錯誤')
  }
}
