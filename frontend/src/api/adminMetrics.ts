import { supabase } from '../lib/supabaseClient'

export interface UserCounters {
  totalUsers: number
  activeUsers: number
  inactiveUsers: number
}

/**
 * 取得使用者數量統計
 * 使用 anon key 前端 client，依賴 RLS policy 讓 admin 可讀全表
 */
export async function fetchUserCounters(): Promise<UserCounters> {
  try {
    // 取得總使用者數量
    const { count: totalUsers, error: totalError } = await supabase
      .from('profiles')
      .select('id', { count: 'exact', head: true })

    if (totalError) {
      console.error('Error fetching total users:', totalError)
      throw new Error(`無法取得總使用者數量: ${totalError.message}`)
    }

    // 取得活躍使用者數量 (is_active = true)
    const { count: activeUsers, error: activeError } = await supabase
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .eq('is_active', true)

    if (activeError) {
      console.error('Error fetching active users:', activeError)
      throw new Error(`無法取得活躍使用者數量: ${activeError.message}`)
    }

    // 取得非活躍使用者數量 (is_active = false)
    const { count: inactiveUsers, error: inactiveError } = await supabase
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .eq('is_active', false)

    if (inactiveError) {
      console.error('Error fetching inactive users:', inactiveError)
      throw new Error(`無法取得非活躍使用者數量: ${inactiveError.message}`)
    }

    return {
      totalUsers: totalUsers || 0,
      activeUsers: activeUsers || 0,
      inactiveUsers: inactiveUsers || 0
    }
  } catch (error) {
    console.error('Error in fetchUserCounters:', error)
    if (error instanceof Error) {
      throw error
    }
    throw new Error('取得使用者統計時發生未知錯誤')
  }
}

/**
 * 驗證當前使用者是否為管理員
 * 可用於前端檢查，但主要安全性仍依賴後端 RLS
 */
export async function checkAdminStatus(): Promise<boolean> {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return false
    }

    // 嘗試讀取一筆 profiles 資料來測試 admin 權限
    // 如果不是 admin，RLS 會限制只能看到自己的資料
    const { data, error } = await supabase
      .from('profiles')
      .select('id')
      .limit(2) // 嘗試讀取 2 筆，如果是 admin 應該能看到多筆

    if (error) {
      console.error('Error checking admin status:', error)
      return false
    }

    // 如果能讀到多於 1 筆資料，或者能讀到不是自己的資料，可能是 admin
    // 這只是輔助檢查，真正的權限控制在 RLS
    return (data && data.length > 1) || false
  } catch (error) {
    console.error('Error in checkAdminStatus:', error)
    return false
  }
}
