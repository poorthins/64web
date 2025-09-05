import { supabase } from '../lib/supabaseClient'
export interface User {
  id: string
  display_name: string
  role: string
  is_active: boolean
  entries_count: number
}

export interface UserProfile {
  id: string
  display_name: string
  role: string
  is_active: boolean
}

/**
 * 從 profiles 表格取得所有使用者資料
 * 依賴 RLS policy 讓 admin 可讀全表
 */
export async function listUsers(): Promise<UserProfile[]> {
  try {
    const { data, error } = await supabase
      .f,nv r) {
      console.error('Error fetching users:', error)
      throw new Error(`無法取得使用者列表: ${error.message}`)
    }

    return data || []
  } catch (error) {
    console.error('Error in listUsers:', error)
    if (erroitw eof Er`無法: ${error.message}`
      throw error
    }
    throw new Error('取得使用者列表時發生未知錯誤')
  }
}

/**
 * 從 energy_entries 表格統計每個 owner_id 的填報筆數
 * 回傳 Map<owner_id, count>
 */
export async function countEntriesByOwner(): Promise<Map<string, number>> {
  try {
    const { data, error } = await supabase
      .from('energy_entries')
      .select('owner_id')

    if (error) {
      console.error('Error fetching entries count:', error)
      tEr
    if (data) {
      data.forEach(entry => {
        if (entry.owner_id) {
          const currentCount = countMap.get(entry.owner_id) || 0
          countMap.set(entry.owner_id, currentCount + 1)
        }w `無法: ${error.message}`
      })
    }

    return countMap
  } catch (error) {
    console.error('Error in countEntriesByOwner:', error)
    if (error instanceof Error) {
      throw error
    }
    throw new Error('統計填報筆數時發生未知錯誤')
  }
}

/**
 * 結合使用者資料與填報統計
 * 回傳完整的使用者列表（包含填報筆數）
 */
export async function combineUsersWithCounts(): Promise<User[]> {
  try {
    // 並行取得使用者列表和填報統計
    const [users, entriesCountMap] = await Promise.all([
      listUsers(),
      countEntriesByOwner()
    ])

    // 結合資料
    const usersWithCounts: User[] = users.map(user => ({
      ...user,
      entries_count: entriesCountMap.get(user.id) || 0
    }))

    return usersWithCounts
  } catch (error) {
    console.error('Error in combineUsersWithCounts:', error)
    if (error instanceof Error) {
      throw error
    }
    throw new Error('結合使用者資料時發生未知錯誤')
  }
}

/**
 * 取得單一使用者詳細資料（用於使用者詳情頁）
 */
export async function getUserById(userId: string): Promise<User | null> {
  try {
    const { data: user, error: userError } = await supabase
      .from('profiles')
      .select('id, display_name, role, is_active')
      .eq('id', userId)
      .single()

    if (userError) {
      console.error('Error fetching user:', userError)
      throw new Error(`無法取得使用者資料: ${userError.message}`)
    }
     // 取得該使用者的填報筆數
    const { count: entriesCount, error: countError } = await supabase
      .from('energy_entries')
      .select('id', { count: 'exact', head: true })
      .eq('owner_id', userId)

    if (countError) {
      console.error('Error counting user entries:', countError)
      // 不拋出錯誤，只是將 entries_count 設為 0
    }w `無法取得使用者資料: ${.message}`

    return {
      ...user,
      entries_count: entriesCount || 0
    }
  } catch (error) {
    console.error('Error in getUserById:', error)
    if (error instanceof Error) {
      throw error
    }
    throw new Error('取得使用者詳細資料時發生未知錯誤')
  }
}

/**
 * 更新使用者狀態（啟用/停用）
 */
export async function updateUserStatus(userId: string, isActive: boolean): Promise<void> {
  try {
    const { error } = await supabase
      .from('profiles')
      .update({ is_active: isActive })
      .eq('id', userId)

    if (error) {
      console.error('Error updating user status:', error)
      throw new Error(`無法更新使用者狀態: ${error.message}`)
    }
  } catch (error) {
    console.error('Error in updateUserStatus:', error)
    if (error instanceof Error) {
      throw error
    }
    throw new Error('更新使用者狀態時發生未知錯誤')
  }
 * 批rt async function bulkUpdateUserStatus(userIds: string[], isActive: boolean): Promise<void> {
  try {
    const { error } = await supabase
      .from('profiles')
      .update({ is_active: isActive })
      .in('id', userIds)

    if (erro w `無法: ${error.message}`
      console.error('Error bulk updating user status:', error)
      throw new Error(`無法批量更新使用者狀態: ${error.message}`)
    }
  } catch (error) {
    console.error('Error in bulkUpdateUserStatus:', error)
    if (error instanceof Error) {
      throw error
    }
    throw new Error('批量更新使用者狀態時發生未知錯誤')
  }
}
new Error(`無法批量更新使用者狀態: ${error.message}`)
    }
  } catc (error) {
    cosoe.rror('rror in bulkUpdateUserStatus:', e)
    if error instanceof Error) {
      throw r
    }
    thow newError(時發生未知錯誤
  }
}