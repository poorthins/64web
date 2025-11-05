import { supabase } from '../lib/supabaseClient'
import { validateAuth, handleAPIError } from '../utils/authHelpers'
import type { EnergyEntry } from './entries'

// API Base URL（從環境變數取得，預設 localhost）
const API_BASE_URL = import.meta.env.VITE_API_BASE || 'http://localhost:5000'

// 前端 key 轉資料庫 key
// Fixed: unified page_key to 'septic_tank'
const FRONTEND_TO_DB_MAP: Record<string, string> = {
  'electricity': 'electricity',
  'diesel_generator': 'diesel_generator' // 柴油發電機保持一致
};

// 資料庫 key 轉前端 key
// Fixed: unified page_key to 'septic_tank'
const DB_TO_FRONTEND_MAP: Record<string, string> = {
  'electricity': 'electricity',
  'diesel_generator': 'diesel_generator' // 柴油發電機保持一致
};

export interface User {
  id: string
  display_name: string
  role: string
  is_active: boolean
  entries_count: number
  email?: string
  company?: string
  job_title?: string
  phone?: string
  filling_config?: any
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
  filling_config?: any // JSON field in database
  energy_categories?: string[]
  target_year?: number
  diesel_generator_version?: 'refuel' | 'test'
}

export interface UserUpdateData {
  display_name?: string
  email?: string
  password?: string
  company?: string
  job_title?: string
  phone?: string
  role?: string
  is_active?: boolean
  filling_config?: any // JSON field in database
  energy_categories?: string[]
  target_year?: number
  diesel_generator_version?: 'refuel' | 'test'
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
  energy_categories?: string[]
  target_year?: number
  diesel_generator_version?: 'refuel' | 'test'
}

/**
 * 將前端格式的能源類別轉換為資料庫格式
 */
function convertFrontendKeysToDb(categories: string[]): string[] {
  return categories.map(key => FRONTEND_TO_DB_MAP[key] || key);
}

/**
 * 將資料庫格式的能源類別轉換為前端格式
 */
function convertDbKeysToFrontend(categories: string[]): string[] {
  return categories.map(key => DB_TO_FRONTEND_MAP[key] || key);
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
      .select('id, display_name, role, is_active, email, company, job_title, phone, filling_config')
      .eq('role', 'user')  // 只顯示一般用戶，不顯示管理員

    if (error) {
      console.error('Error fetching users:', error)
      throw handleAPIError(error, '無法取得使用者列表')
    }

    // 在返回資料前轉換所有使用者的 energy_categories 格式（資料庫格式 → 前端格式）
    const usersWithConvertedKeys = (data || []).map(user => {
      if (user?.filling_config?.energy_categories) {
        return {
          ...user,
          filling_config: {
            ...user.filling_config,
            energy_categories: convertDbKeysToFrontend(user.filling_config.energy_categories)
          }
        };
      }
      return user;
    });

    return usersWithConvertedKeys
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
      .select('id, display_name, role, is_active, email, company, job_title, phone, filling_config')
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

    // 在返回資料前轉換 energy_categories 格式（資料庫格式 → 前端格式）
    if (user?.filling_config?.energy_categories) {
      user.filling_config.energy_categories = convertDbKeysToFrontend(user.filling_config.energy_categories);
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
 * 更新使用者資料（透過後端 API，使用 service_role key）
 */
export async function updateUser(userId: string, userData: UserUpdateData): Promise<void> {
  try {
    const authResult = await validateAuth()
    if (authResult.error) throw authResult.error

    // 準備後端 API 請求資料
    const requestData: any = {}

    // 基本欄位
    if (userData.display_name !== undefined) requestData.display_name = userData.display_name
    if (userData.email !== undefined) requestData.email = userData.email
    if (userData.password !== undefined) requestData.password = userData.password
    if (userData.company !== undefined) requestData.company = userData.company
    if (userData.job_title !== undefined) requestData.job_title = userData.job_title
    if (userData.phone !== undefined) requestData.phone = userData.phone
    if (userData.role !== undefined) requestData.role = userData.role
    if (userData.is_active !== undefined) requestData.is_active = userData.is_active

    // 能源類別和配置（轉換為資料庫格式）
    if (userData.energy_categories !== undefined) {
      requestData.energy_categories = convertFrontendKeysToDb(userData.energy_categories)
    }
    if (userData.target_year !== undefined) requestData.target_year = userData.target_year
    if (userData.diesel_generator_version !== undefined) {
      requestData.diesel_generator_version = userData.diesel_generator_version
    }

    // 呼叫後端 API
    const response = await fetch(`${API_BASE_URL}/api/admin/users/${userId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authResult.session?.access_token}`
      },
      body: JSON.stringify(requestData)
    })

    const result = await response.json()

    if (!response.ok) {
      console.error('Error updating user via backend:', result)
      throw new Error(result.error || '更新使用者失敗')
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

    // ⭐ 轉換前端格式的能源類別為資料庫格式
    const convertedEnergyCategories = userData.energy_categories
      ? convertFrontendKeysToDb(userData.energy_categories)
      : []

    // ⭐ 呼叫後端 API（後端有 service_role key 權限）
    const response = await fetch(`${API_BASE_URL}/api/admin/create-user`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authResult.session?.access_token}`
      },
      body: JSON.stringify({
        email: userData.email,
        password: userData.password,
        displayName: userData.display_name,
        company: userData.company,
        phone: userData.phone,
        job_title: userData.job_title,
        role: userData.role || 'user',
        energy_categories: convertedEnergyCategories,
        target_year: userData.target_year || new Date().getFullYear(),
        diesel_generator_version: userData.diesel_generator_version || 'refuel'
      })
    })

    const result = await response.json()

    if (!response.ok) {
      console.error('Error creating user via backend:', result)
      throw new Error(result.error || '建立使用者失敗')
    }

    if (!result.user) {
      throw new Error('建立使用者失敗：後端未回傳使用者資料')
    }

    // ⭐ 後端已建立完整 profile，直接回傳
    return result.user
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
 * 從用戶的填報記錄推斷能源類別權限
 */
export async function inferUserEnergyCategories(userId: string): Promise<string[]> {
  try {
    const authResult = await validateAuth()
    if (authResult.error) throw authResult.error

    // 查詢用戶的所有填報記錄，取得不重複的 page_key
    const { data: entries, error: entriesError } = await supabase
      .from('energy_entries')
      .select('page_key')
      .eq('owner_id', userId)

    if (entriesError) {
      console.error('Error fetching user entries for permission inference:', entriesError)
      // 如果查詢失敗，返回空陣列而不是拋出錯誤
      return []
    }

    if (!entries || entries.length === 0) {
      return []
    }

    // 從 page_key 推斷能源類別 ID
    const uniquePageKeys = Array.from(new Set(entries.map(entry => entry.page_key)))
    const inferredCategories = uniquePageKeys.map(pageKey => {
      // 移除可能的前綴和後綴，提取核心的能源類別 ID
      const match = pageKey.match(/([a-z_]+)/i)
      return match ? match[1] : pageKey
    }).filter(Boolean)

    console.log(`🔍 為用戶 ${userId} 推斷的能源類別權限:`, {
      原始PageKeys: uniquePageKeys,
      推斷權限: inferredCategories
    })

    return Array.from(new Set(inferredCategories)) // 去重
  } catch (error) {
    console.error('Error in inferUserEnergyCategories:', error)
    // 推斷失敗時返回空陣列，不中斷流程
    return []
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
      .select('id, display_name, role, is_active, email, company, job_title, phone, filling_config')
      .eq('id', userId)
      .single()

    if (userError) {
      if (userError.code === 'PGRST116') {
        return null // 用戶不存在
      }
      console.error('Error fetching user details:', userError)
      throw handleAPIError(userError, '無法取得使用者詳細資料')
    }

    // 在返回資料前轉換 energy_categories 格式（資料庫格式 → 前端格式）
    if (user?.filling_config?.energy_categories) {
      user.filling_config.energy_categories = convertDbKeysToFrontend(user.filling_config.energy_categories);
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

/**
 * 取得用戶資料（結合基本資料和權限推斷）
 */
export async function getUserWithPermissions(userId: string): Promise<UserProfile | null> {
  try {
    // 同時取得基本用戶資料和推斷權限
    const [user, inferredCategories] = await Promise.all([
      getUserDetails(userId),
      inferUserEnergyCategories(userId)
    ])

    if (!user) {
      return null
    }

    const fillingConfig = user.filling_config || {}

    // 如果 filling_config 中沒有能源類別權限，使用推斷的權限
    const dbEnergyCategories = fillingConfig.energy_categories || inferredCategories

    // 將資料庫格式的能源類別轉換為前端格式
    const frontendEnergyCategories = dbEnergyCategories.length > 0
      ? convertDbKeysToFrontend(dbEnergyCategories)
      : dbEnergyCategories;

    console.log(`🛠️ 用戶 ${userId} 的權限設定:`, {
      當前FillingConfig: fillingConfig,
      推斷權限: inferredCategories,
      資料庫格式權限: dbEnergyCategories,
      前端格式權限: frontendEnergyCategories
    })

    // 返回完整的用戶資料，包含權限資訊（使用前端格式）
    return {
      ...user,
      energy_categories: frontendEnergyCategories,
      target_year: fillingConfig.target_year || new Date().getFullYear(),
      diesel_generator_version: fillingConfig.diesel_generator_mode || 'refuel'
    }
  } catch (error) {
    console.error('Error in getUserWithPermissions:', error)
    if (error instanceof Error) {
      throw error
    }
    throw new Error('取得用戶資料時發生未知錯誤')
  }
}

/**
 * 取得用戶的所有能源填報記錄
 * @param userId - 用戶 ID
 * @returns Promise<EnergyEntry[]>
 */
export async function getUserEnergyEntries(userId: string): Promise<EnergyEntry[]> {
  try {
    const authResult = await validateAuth()
    if (authResult.error) throw authResult.error

    const { data, error } = await supabase
      .from('energy_entries')
      .select('*')
      .eq('owner_id', userId)
      .order('page_key', { ascending: true })
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching user energy entries:', error)
      throw handleAPIError(error, '無法取得使用者填報記錄')
    }

    return data || []
  } catch (error) {
    console.error('Error in getUserEnergyEntries:', error)
    if (error instanceof Error) {
      throw error
    }
    throw new Error('取得使用者填報記錄時發生未知錯誤')
  }
}

/**
 * 管理員強制登出指定用戶（清除所有 sessions）
 * @param userId - 用戶 ID
 */
export async function forceLogoutUser(userId: string): Promise<void> {
  try {
    const authResult = await validateAuth()
    if (authResult.error) throw authResult.error

    const response = await fetch(`${API_BASE_URL}/api/admin/users/${userId}/sessions`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authResult.session?.access_token}`
      }
    })

    const result = await response.json()

    if (!response.ok) {
      console.error('Error force logging out user:', result)
      throw new Error(result.error || '強制登出用戶失敗')
    }

    console.log(`✅ 成功清除用戶 ${userId} 的 ${result.deleted_sessions} 個 sessions`)
  } catch (error) {
    console.error('Error in forceLogoutUser:', error)
    if (error instanceof Error) {
      throw error
    }
    throw new Error('強制登出用戶時發生未知錯誤')
  }
}
