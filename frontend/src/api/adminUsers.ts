import { supabase } from '../lib/supabaseClient'
import { validateAuth, handleAPIError } from '../utils/authHelpers'

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
  email?: string
  company?: string
  job_title?: string
  phone?: string
}

export interface UserUpdateData {
  display_name?: string
  email?: string
  company?: string
  job_title?: string
  phone?: string
  role?: string
  is_active?: boolean
}

export interface FillingConfig {
  diesel_generator_mode: 'refuel' | 'test'
}

export interface CreateUserData {
  email: string
  password: string
  display_name: string
  company?: string
  job_title?: string
  phone?: string
  role?: string
  filling_config?: FillingConfig
}

/**
 * 從 profiles 表格取得所有使用者資料
 * 依賴 RLS policy 讓 admin 可讀全表
 */
export async function listUsers(): Promise<UserProfile[]> {
  try {
    const authResult = await validateAuth()
    if (authResult.error) throw authResult.error
    const user = authResult.user

    const { data, error } = await supabase
      .from('profiles')
      .select('id, display_name, role, is_active, email, company, job_title, phone')
      .eq('role', 'user')  // 只顯示一般用戶，不顯示管理員

    if (error) {
      console.error('Error fetching users:', error)
      throw handleAPIError(error, '無法取得使用者列表')
    }

    return data || []
  } catch (error) {
    console.error('Error in listUsers:', error)
    if (error instanceof Error) {
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
    const authResult = await validateAuth()
    if (authResult.error) throw authResult.error

    const { data, error } = await supabase
      .from('energy_entries')
      .select('owner_id')

    if (error) {
      console.error('Error fetching entries count:', error)
      throw handleAPIError(error, '無法統計填報筆數')
    }

    const countMap = new Map<string, number>()
    
    if (data) {
      data.forEach(entry => {
        if (entry.owner_id) {
          const currentCount = countMap.get(entry.owner_id) || 0
          countMap.set(entry.owner_id, currentCount + 1)
        }
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
    const authResult = await validateAuth()
    if (authResult.error) throw authResult.error

    const { data: user, error: userError } = await supabase
      .from('profiles')
      .select('id, display_name, role, is_active')
      .eq('id', userId)
      .single()

    if (userError) {
      console.error('Error fetching user:', userError)
      throw handleAPIError(userError, '無法取得使用者資料')
    }

    if (!user) {
      return null
    }

    // 取得該使用者的填報筆數
    const { count: entriesCount, error: countError } = await supabase
      .from('energy_entries')
      .select('id', { count: 'exact', head: true })
      .eq('owner_id', userId)

    if (countError) {
      console.error('Error counting user entries:', countError)
      // 不拋出錯誤，只是將 entries_count 設為 0
    }

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
    const authResult = await validateAuth()
    if (authResult.error) throw authResult.error

    const { error } = await supabase
      .from('profiles')
      .update({ is_active: isActive })
      .eq('id', userId)

    if (error) {
      console.error('Error updating user status:', error)
      throw handleAPIError(error, '無法更新使用者狀態')
    }
  } catch (error) {
    console.error('Error in updateUserStatus:', error)
    if (error instanceof Error) {
      throw error
    }
    throw new Error('更新使用者狀態時發生未知錯誤')
  }
}

/**
 * 批量更新使用者狀態
 */
export async function bulkUpdateUserStatus(userIds: string[], isActive: boolean): Promise<void> {
  try {
    const authResult = await validateAuth()
    if (authResult.error) throw authResult.error

    const { error } = await supabase
      .from('profiles')
      .update({ is_active: isActive })
      .in('id', userIds)

    if (error) {
      console.error('Error bulk updating user status:', error)
      throw handleAPIError(error, '無法批量更新使用者狀態')
    }
  } catch (error) {
    console.error('Error in bulkUpdateUserStatus:', error)
    if (error instanceof Error) {
      throw error
    }
    throw new Error('批量更新使用者狀態時發生未知錯誤')
  }
}

/**
 * 更新使用者資料
 */
export async function updateUser(userId: string, userData: UserUpdateData): Promise<void> {
  try {
    const authResult = await validateAuth()
    if (authResult.error) throw authResult.error

    // 如果需要更新 auth.users 表中的 email，需要特殊處理
    if (userData.email) {
      const { error: authError } = await supabase.auth.admin.updateUserById(
        userId,
        { email: userData.email }
      )
      
      if (authError) {
        console.error('Error updating user email in auth:', authError)
        throw handleAPIError(authError, '無法更新使用者 email')
      }
    }

    // 更新 profiles 表中的資料
    const profileData = { ...userData }
    delete profileData.email // email 已在上面處理

    const { error } = await supabase
      .from('profiles')
      .update(profileData)
      .eq('id', userId)

    if (error) {
      console.error('Error updating user profile:', error)
      throw handleAPIError(error, '無法更新使用者資料')
    }
  } catch (error) {
    console.error('Error in updateUser:', error)
    if (error instanceof Error) {
      throw error
    }
    throw new Error('更新使用者資料時發生未知錯誤')
  }
}

/**
 * 建立新使用者
 */
export async function createUser(userData: CreateUserData): Promise<UserProfile> {
  try {
    const authResult = await validateAuth()
    if (authResult.error) throw authResult.error

    // 在 auth.users 表中建立使用者
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: userData.email,
      password: userData.password,
      email_confirm: true
    })

    if (authError) {
      console.error('Error creating user in auth:', authError)
      throw handleAPIError(authError, '無法建立使用者帳號')
    }

    if (!authData.user) {
      throw new Error('建立使用者失敗：未取得使用者資料')
    }

    // 在 profiles 表中建立使用者資料
    const profileData = {
      id: authData.user.id,
      display_name: userData.display_name,
      email: userData.email,
      company: userData.company,
      job_title: userData.job_title,
      phone: userData.phone,
      role: userData.role || 'user',
      is_active: true,
      filling_config: userData.filling_config || { diesel_generator_mode: 'refuel' }
    }

    const { data: profileResult, error: profileError } = await supabase
      .from('profiles')
      .insert(profileData)
      .select()
      .single()

    if (profileError) {
      console.error('Error creating user profile:', profileError)
      // 如果 profile 建立失敗，應該刪除已建立的 auth 使用者
      await supabase.auth.admin.deleteUser(authData.user.id)
      throw handleAPIError(profileError, '無法建立使用者資料')
    }

    return profileResult
  } catch (error) {
    console.error('Error in createUser:', error)
    if (error instanceof Error) {
      throw error
    }
    throw new Error('建立使用者時發生未知錯誤')
  }
}

/**
 * 刪除使用者
 */
export async function deleteUser(userId: string): Promise<void> {
  try {
    const authResult = await validateAuth()
    if (authResult.error) throw authResult.error

    // 先從 profiles 表中刪除
    const { error: profileError } = await supabase
      .from('profiles')
      .delete()
      .eq('id', userId)

    if (profileError) {
      console.error('Error deleting user profile:', profileError)
      throw handleAPIError(profileError, '無法刪除使用者資料')
    }

    // 從 auth.users 表中刪除
    const { error: authError } = await supabase.auth.admin.deleteUser(userId)

    if (authError) {
      console.error('Error deleting user from auth:', authError)
      throw handleAPIError(authError, '無法刪除使用者帳號')
    }
  } catch (error) {
    console.error('Error in deleteUser:', error)
    if (error instanceof Error) {
      throw error
    }
    throw new Error('刪除使用者時發生未知錯誤')
  }
}

/**
 * 取得使用者詳細資料（包含所有欄位）
 */
export async function getUserDetails(userId: string): Promise<UserProfile | null> {
  try {
    const authResult = await validateAuth()
    if (authResult.error) throw authResult.error

    const { data: user, error: userError } = await supabase
      .from('profiles')
      .select('id, display_name, role, is_active, email, company, job_title, phone')
      .eq('id', userId)
      .single()

    if (userError) {
      if (userError.code === 'PGRST116') {
        return null // 用戶不存在
      }
      console.error('Error fetching user details:', userError)
      throw handleAPIError(userError, '無法取得使用者詳細資料')
    }

    return user
  } catch (error) {
    console.error('Error in getUserDetails:', error)
    if (error instanceof Error) {
      throw error
    }
    throw new Error('取得使用者詳細資料時發生未知錯誤')
  }
}
