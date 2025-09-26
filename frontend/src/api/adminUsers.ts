import { supabase } from '../lib/supabaseClient'
import { validateAuth, handleAPIError } from '../utils/authHelpers'

// 前端 key 轉資料庫 key
const FRONTEND_TO_DB_MAP: Record<string, string> = {
  'septictank': 'septic_tank',
  'electricity_bill': 'electricity',
  'diesel_generator': 'diesel_generator' // 柴油發電機保持一致
};

// 資料庫 key 轉前端 key
const DB_TO_FRONTEND_MAP: Record<string, string> = {
  'septic_tank': 'septictank',
  'electricity': 'electricity_bill',
  'diesel_generator': 'diesel_generator' // 柴油發電機保持一致
};

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
 * 更新使用者資料
 */
export async function updateUser(userId: string, userData: UserUpdateData): Promise<void> {
  try {
    const authResult = await validateAuth()
    if (authResult.error) throw authResult.error

    // 先獲取當前用戶資料來比較 email 是否有變更
    const { data: currentUser } = await supabase
      .from('profiles')
      .select('email')
      .eq('id', userId)
      .single()

    // 處理 password 更新 - 使用 Supabase 專門的 API
    if (userData.password) {
      const { error: passwordError } = await supabase.auth.admin.updateUserById(
        userId,
        { password: userData.password }
      )

      if (passwordError) {
        console.error('Error updating user password:', passwordError)
        throw handleAPIError(passwordError, '無法更新使用者密碼')
      }
    }

    // 處理 email 更新 - 只在真的有變更時才更新 auth.users
    if (userData.email && userData.email !== currentUser?.email) {
      const { error: emailError } = await supabase.auth.admin.updateUserById(
        userId,
        { email: userData.email }
      )

      if (emailError) {
        console.error('Error updating user email in auth:', emailError)
        throw handleAPIError(emailError, '無法更新使用者 email')
      }
    }

    // 準備 profiles 表的更新資料
    const profileData = { ...userData }

    // 移除已處理過的欄位
    delete profileData.password // password 已在上面處理

    // 如果 email 沒有變更，從更新資料中移除
    if (userData.email === currentUser?.email) {
      delete profileData.email
    }

    // 移除不存在的欄位，將其儲存在 filling_config 中
    delete profileData.energy_categories
    delete profileData.target_year
    delete profileData.diesel_generator_version

    // 處理 filling_config 更新
    if (userData.energy_categories !== undefined || userData.target_year !== undefined || userData.diesel_generator_version !== undefined) {
      // 先取得目前的 filling_config
      const { data: currentProfile } = await supabase
        .from('profiles')
        .select('filling_config')
        .eq('id', userId)
        .single()

      const currentConfig = currentProfile?.filling_config || {}

      // 轉換前端格式的能源類別為資料庫格式
      const convertedEnergyCategories = userData.energy_categories !== undefined
        ? convertFrontendKeysToDb(userData.energy_categories)
        : undefined;

      profileData.filling_config = {
        ...currentConfig,
        ...(convertedEnergyCategories !== undefined && { energy_categories: convertedEnergyCategories }),
        ...(userData.target_year !== undefined && { target_year: userData.target_year })
      }

      // 處理柴油發電機版本：允許設置為 undefined 來清除
      if (userData.diesel_generator_version !== undefined) {
        if (userData.diesel_generator_version) {
          profileData.filling_config.diesel_generator_mode = userData.diesel_generator_version
        } else {
          // 如果傳入 undefined，則從 config 中移除
          delete profileData.filling_config.diesel_generator_mode
        }
      }
    }

    // 只在有資料需要更新時才執行更新
    if (Object.keys(profileData).length > 0) {
      const { error } = await supabase
        .from('profiles')
        .update(profileData)
        .eq('id', userId)

      if (error) {
        console.error('Error updating user profile:', error)
        throw handleAPIError(error, '無法更新使用者資料')
      }
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

    // 轉換前端格式的能源類別為資料庫格式
    const convertedEnergyCategories = userData.energy_categories
      ? convertFrontendKeysToDb(userData.energy_categories)
      : [];

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
      filling_config: {
        ...userData.filling_config,
        diesel_generator_mode: userData.diesel_generator_version || userData.filling_config?.diesel_generator_mode || 'refuel',
        // 將能源類別權限儲存在 filling_config 中，使用資料庫格式
        energy_categories: convertedEnergyCategories,
        target_year: userData.target_year || new Date().getFullYear()
      }
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
