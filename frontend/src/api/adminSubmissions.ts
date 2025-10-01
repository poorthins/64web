import { supabase } from '../lib/supabaseClient'
import { validateAuth, handleAPIError } from '../utils/authHelpers'

export interface Submission {
  id: string
  period_start: string
  period_end: string
  category: string
  unit: string
  amount: number
  notes: string
  created_at: string
  updated_at: string
  owner_id: string
  profiles: {
    id: string
    display_name: string
    email?: string
    company?: string
    job_title?: string
  } | null
  review_history: ReviewStatus[]
}

export interface ReviewStatus {
  id: string
  entry_id: string
  old_status?: 'pending' | 'approved' | 'needs_fix'
  new_status: 'pending' | 'approved' | 'needs_fix'
  review_notes: string
  created_at: string
}

export interface UserWithSubmissions {
  id: string
  display_name: string
  email?: string
  is_active: boolean
  role: string
  submission_count: number
  latest_submission_date?: string
  pending_reviews: number
  approved_reviews: number
  needs_fix_reviews: number
}

export interface SubmissionStats {
  total_submissions: number
  pending_reviews: number
  approved_reviews: number
  needs_fix_reviews: number
  total_users_with_submissions: number
}

/**
 * 取得所有使用者及其填報統計
 * ⚠️ 暫時停用：避免造成 stack overflow
 */
export async function getAllUsersWithSubmissions(): Promise<UserWithSubmissions[]> {
  console.warn('⚠️ getAllUsersWithSubmissions 已暫時停用，避免 stack overflow')
  return []
}

/**
 * 取得所有填報記錄（用於管理員審核頁面）
 */
export async function getAllSubmissions(): Promise<Submission[]> {
  try {
    const authResult = await validateAuth()
    if (authResult.error) throw authResult.error

    const { data, error } = await supabase
      .from('energy_entries')
      .select(`
        id,
        period_start,
        period_end,
        category,
        unit,
        amount,
        notes,
        created_at,
        updated_at,
        owner_id,
        profiles:owner_id (
          id,
          display_name,
          email,
          company,
          job_title
        ),
        review_history (
          id,
          entry_id,
          old_status,
          new_status,
          review_notes,
          created_at
        )
      `)
      .order('created_at', { ascending: false })

    if (error) {
      throw handleAPIError(error, '無法取得所有填報記錄')
    }

    return (data || []) as unknown as Submission[]
  } catch (error) {
    console.error('Error in getAllSubmissions:', error)
    if (error instanceof Error) {
      throw error
    }
    throw new Error('取得所有填報記錄時發生未知錯誤')
  }
}

/**
 * 取得特定用戶的所有填報記錄
 */
export async function getUserSubmissions(userId: string): Promise<Submission[]> {
  try {
    const authResult = await validateAuth()
    if (authResult.error) throw authResult.error

    const { data, error } = await supabase
      .from('energy_entries')
      .select(`
        id,
        period_start,
        period_end,
        category,
        unit,
        amount,
        notes,
        created_at,
        updated_at,
        owner_id,
        profiles:owner_id (
          id,
          display_name,
          email
        ),
        review_history (
          id,
          entry_id,
          old_status,
          new_status,
          review_notes,
          created_at
        )
      `)
      .eq('owner_id', userId)
      .order('created_at', { ascending: false })

    if (error) {
      throw handleAPIError(error, '無法取得用戶填報記錄')
    }

    return (data || []) as unknown as Submission[]
  } catch (error) {
    console.error('Error in getUserSubmissions:', error)
    if (error instanceof Error) {
      throw error
    }
    throw new Error('取得用戶填報記錄時發生未知錯誤')
  }
}

/**
 * 審核填報記錄
 */
export async function reviewSubmission(
  entryId: string,
  status: 'approved' | 'needs_fix',
  note: string = ''
): Promise<void> {
  try {
    const authResult = await validateAuth()
    if (authResult.error) throw authResult.error

    const { error: reviewError } = await supabase
      .from('review_history')
      .insert({
        entry_id: entryId,
        new_status: status,
        review_notes: note
      })

    if (reviewError) {
      throw handleAPIError(reviewError, '無法建立審核記錄')
    }

    // 如果是核准狀態，鎖定該填報項目
    if (status === 'approved') {
      const { error: lockError } = await supabase
        .from('energy_entries')
        .update({
          is_locked: true,
          approved_at: new Date().toISOString(),
          approved_by: authResult.user?.id
        })
        .eq('id', entryId)

      if (lockError) {
        console.warn('Failed to lock entry after approval:', lockError)
        // 不拋出錯誤，因為審核記錄已經建立
      }
    }
  } catch (error) {
    console.error('Error in reviewSubmission:', error)
    if (error instanceof Error) {
      throw error
    }
    throw new Error('審核填報時發生未知錯誤')
  }
}

/**
 * 取得填報統計資料
 * ⚠️ 暫時停用：避免造成 stack overflow
 */
export async function getSubmissionStats(): Promise<SubmissionStats> {
  console.warn('⚠️ getSubmissionStats 已暫時停用，避免 stack overflow')
  return {
    total_submissions: 0,
    pending_reviews: 0,
    approved_reviews: 0,
    needs_fix_reviews: 0,
    total_users_with_submissions: 0
  }
}

/**
 * 批量審核填報記錄
 */
export async function bulkReviewSubmissions(
  entryIds: string[],
  status: 'approved' | 'needs_fix',
  note: string = ''
): Promise<void> {
  try {
    const authResult = await validateAuth()
    if (authResult.error) throw authResult.error

    const reviewRecords = entryIds.map(entryId => ({
      entry_id: entryId,
      new_status: status,
      review_notes: note
    }))

    const { error } = await supabase
      .from('review_history')
      .insert(reviewRecords)

    if (error) {
      throw handleAPIError(error, '無法建立批量審核記錄')
    }
  } catch (error) {
    console.error('Error in bulkReviewSubmissions:', error)
    if (error instanceof Error) {
      throw error
    }
    throw new Error('批量審核填報時發生未知錯誤')
  }
}

/**
 * 鎖定用戶的填報權限（通過後鎖定）
 */
export async function lockUserSubmissions(userId: string): Promise<void> {
  try {
    const authResult = await validateAuth()
    if (authResult.error) throw authResult.error

    const { error } = await supabase
      .from('profiles')
      .update({
        submission_locked: true,
        locked_at: new Date().toISOString(),
        locked_by: authResult.user?.id
      })
      .eq('id', userId)

    if (error) {
      throw handleAPIError(error, '無法鎖定用戶填報權限')
    }
  } catch (error) {
    console.error('Error in lockUserSubmissions:', error)
    if (error instanceof Error) {
      throw error
    }
    throw new Error('鎖定用戶填報權限時發生未知錯誤')
  }
}

/**
 * 解鎖用戶的填報權限
 */
export async function unlockUserSubmissions(userId: string): Promise<void> {
  try {
    const authResult = await validateAuth()
    if (authResult.error) throw authResult.error

    const { error } = await supabase
      .from('profiles')
      .update({
        submission_locked: false,
        unlocked_at: new Date().toISOString(),
        unlocked_by: authResult.user?.id
      })
      .eq('id', userId)

    if (error) {
      throw handleAPIError(error, '無法解鎖用戶填報權限')
    }
  } catch (error) {
    console.error('Error in unlockUserSubmissions:', error)
    if (error instanceof Error) {
      throw error
    }
    throw new Error('解鎖用戶填報權限時發生未知錯誤')
  }
}

/**
 * 檢查填報項目是否已鎖定
 */
export async function checkEntryLockStatus(entryId: string): Promise<boolean> {
  try {
    const authResult = await validateAuth()
    if (authResult.error) throw authResult.error

    const { data, error } = await supabase
      .from('energy_entries')
      .select('is_locked')
      .eq('id', entryId)
      .single()

    if (error) {
      throw handleAPIError(error, '無法檢查填報鎖定狀態')
    }

    return data?.is_locked || false
  } catch (error) {
    console.error('Error in checkEntryLockStatus:', error)
    return false // 發生錯誤時預設為未鎖定
  }
}

/**
 * 批量處理用戶審核完成後的狀態更新
 */
export async function completeUserReview(
  userId: string,
  lockUser: boolean = true
): Promise<void> {
  try {
    const authResult = await validateAuth()
    if (authResult.error) throw authResult.error

    // 檢查用戶所有填報是否都已通過
    const { data: entries, error: entriesError } = await supabase
      .from('energy_entries')
      .select(`
        id,
        review_history (
          old_status,
          new_status,
          review_notes,
          created_at
        )
      `)
      .eq('owner_id', userId)

    if (entriesError) {
      throw handleAPIError(entriesError, '無法檢查用戶填報狀態')
    }

    let allApproved = true
    
    if (entries) {
      for (const entry of entries) {
        if (!entry.review_history || entry.review_history.length === 0) {
          allApproved = false
          break
        }

        // 取得最新審核狀態
        const latestReview = entry.review_history.sort((a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        )[0]

        if (latestReview.new_status !== 'approved') {
          allApproved = false
          break
        }
      }
    }

    // 如果所有填報都已通過且要求鎖定用戶，則鎖定
    if (allApproved && lockUser) {
      await lockUserSubmissions(userId)
    }
  } catch (error) {
    console.error('Error in completeUserReview:', error)
    if (error instanceof Error) {
      throw error
    }
    throw new Error('完成用戶審核時發生未知錯誤')
  }
}

/**
 * 取得特定填報項目的詳細資訊（包含檔案）
 */
export async function getSubmissionDetail(entryId: string): Promise<Submission & { files?: any[] }> {
  try {
    const authResult = await validateAuth()
    if (authResult.error) throw authResult.error

    const { data: entry, error: entryError } = await supabase
      .from('energy_entries')
      .select(`
        id,
        period_start,
        period_end,
        category,
        unit,
        amount,
        notes,
        created_at,
        updated_at,
        owner_id,
        is_locked,
        approved_at,
        profiles:owner_id (
          id,
          display_name,
          email
        ),
        review_history (
          id,
          entry_id,
          old_status,
          new_status,
          review_notes,
          created_at
        )
      `)
      .eq('id', entryId)
      .single()

    if (entryError) {
      throw handleAPIError(entryError, '無法取得填報詳細資訊')
    }

    // 這裡應該查詢檔案表來取得相關檔案
    const files: any[] = []

    return {
      ...entry,
      files
    } as unknown as Submission & { files?: any[] }
  } catch (error) {
    console.error('Error in getSubmissionDetail:', error)
    if (error instanceof Error) {
      throw error
    }
    throw new Error('取得填報詳細資訊時發生未知錯誤')
  }
}