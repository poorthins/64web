import { supabase } from '../supabaseClient'
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
 * 支援自由轉換項目狀態: submitted, approved, rejected
 */
export async function reviewEntry(
  entryId: string,
  action: 'approve' | 'reject' | 'reset',
  notes?: string
): Promise<void> {
  console.group('📡 reviewEntry 執行診斷');
  console.log('輸入參數:', { entryId, action, notes });

  try {
    // 1. 認證檢查
    const authResult = await validateAuth();
    console.log('認證狀態:', authResult.error ? '❌失敗' : '✅成功');
    if (authResult.error) throw authResult.error;

    // 2. 決定新狀態
    let newStatus: string;
    switch(action) {
      case 'approve': newStatus = 'approved'; break;
      case 'reject': newStatus = 'rejected'; break;
      case 'reset': newStatus = 'submitted'; break;
      default: throw new Error('無效的操作');
    }
    console.log('狀態轉換:', '? → ' + newStatus);

    // 3. 先查詢當前狀態（診斷用）
    const { data: currentData, error: queryError } = await supabase
      .from('energy_entries')
      .select('id, status')
      .eq('id', entryId)
      .single();

    console.log('當前狀態:', currentData?.status || '查詢失敗');

    // 4. 執行更新（不限制原始狀態）
    const updateData: any = {
      status: newStatus,
      review_notes: notes || '',
      reviewed_at: action === 'reset' ? null : new Date().toISOString(),
      reviewer_id: action === 'reset' ? null : authResult.user?.id
    }
    console.log('更新資料:', updateData);

    // 如果是通過，則鎖定該項目；如果是重置，則解鎖
    if (action === 'approve') {
      updateData.is_locked = true
    } else if (action === 'reset') {
      updateData.is_locked = false
    }

    console.log('5. 執行更新（不限制原始狀態）');

    // 執行更新前，先確認記錄存在
    console.log('準備更新的 ID:', entryId);

    const { data: checkData, error: checkError } = await supabase
      .from('energy_entries')
      .select('id, status, owner_id')
      .eq('id', entryId);

    console.log('查詢結果:', { checkData, checkError });

    if (!checkData || checkData.length === 0) {
      throw new Error(`找不到記錄 ID: ${entryId}`);
    }

    // 然後才執行更新
    const { data, error } = await supabase
      .from('energy_entries')
      .update(updateData)
      .eq('id', entryId)
      .select();

    // 檢查是否成功
    if (error) {
      console.error('❌ Supabase 錯誤:', error);
      throw error;
    }

    if (!data || !Array.isArray(data) || data.length === 0) {
      console.error('❌ 沒有更新任何記錄');
      throw new Error('沒有找到或更新指定的記錄');
    }

    console.log('✅ 更新成功，受影響記錄:', data[0]);

    console.log('✅ 更新成功');

  } catch (error) {
    console.error('❌ reviewEntry 失敗:', error);
    throw error;
  } finally {
    console.groupEnd();
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

/**
 * 獲取三狀態統計資料
 * 直接從 energy_entries 表統計各狀態的項目數量
 */
export interface SubmissionStatistics {
  submitted: number  // 已提交
  approved: number   // 已通過
  rejected: number   // 已退回
  total: number      // 總計
  lastUpdated: string // 最後更新時間
}

export async function getSubmissionStatistics(): Promise<SubmissionStatistics> {
  console.group('📊 getSubmissionStatistics - 獲取三狀態統計');

  try {
    const authResult = await validateAuth();
    if (authResult.error) throw authResult.error;

    console.log('1. 查詢所有項目狀態...');

    const { data, error } = await supabase
      .from('energy_entries')
      .select('status')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('❌ 查詢失敗:', error);
      throw handleAPIError(error, '無法取得統計資料');
    }

    console.log('2. 原始資料:', {
      總項目數: data?.length || 0,
      項目狀態分布: data?.reduce((acc: any, item) => {
        acc[item.status] = (acc[item.status] || 0) + 1;
        return acc;
      }, {})
    });

    // 統計各狀態數量
    let submitted = 0;
    let approved = 0;
    let rejected = 0;

    data?.forEach(entry => {
      switch (entry.status) {
        case 'submitted':
          submitted++;
          break;
        case 'approved':
          approved++;
          break;
        case 'rejected':
          rejected++;
          break;
        default:
          console.warn('⚠️ 發現未知狀態:', entry.status);
          // 預設將未知狀態歸類為已提交
          submitted++;
      }
    });

    const total = submitted + approved + rejected;
    const statistics: SubmissionStatistics = {
      submitted,
      approved,
      rejected,
      total,
      lastUpdated: new Date().toISOString()
    };

    console.log('3. 統計結果:', statistics);
    console.log('✅ 統計完成');

    return statistics;

  } catch (error) {
    console.error('❌ getSubmissionStatistics 失敗:', error);
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('取得統計資料時發生未知錯誤');
  } finally {
    console.groupEnd();
  }
}
