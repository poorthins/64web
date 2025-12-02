import { supabase } from '../supabaseClient'
import { validateAuth, handleAPIError } from '../utils/authHelpers'

// 資料庫 key 轉前端 key
// Fixed: unified page_key to 'septic_tank'
const DB_TO_FRONTEND_MAP: Record<string, string> = {
  'electricity': 'electricity'
};

/**
 * 將資料庫格式的能源類別轉換為前端格式
 */
function convertDbKeysToFrontend(categories: string[]): string[] {
  return categories.map(key => DB_TO_FRONTEND_MAP[key] || key);
}

export interface UserPermissions {
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

/**
 * 從用戶的填報記錄推斷能源類別權限
 * 這個函數與 adminUsers.ts 中的相同，但針對當前用戶
 */
export async function inferCurrentUserEnergyCategories(): Promise<string[]> {
  try {
    const authResult = await validateAuth()
    if (authResult.error || !authResult.user) {
      throw authResult.error || new Error('未驗證用戶')
    }

    const userId = authResult.user.id

    // 查詢用戶的所有填報記錄，取得不重複的 page_key
    const { data: entries, error: entriesError } = await supabase
      .from('energy_entries')
      .select('page_key')
      .eq('owner_id', userId)

    if (entriesError) {
      console.error('Error fetching current user entries for permission inference:', entriesError)
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

    console.log(`🔍 為當前用戶推斷的能源類別權限:`, {
      原始PageKeys: uniquePageKeys,
      推斷權限: inferredCategories
    })

    return Array.from(new Set(inferredCategories)) // 去重
  } catch (error) {
    console.error('Error in inferCurrentUserEnergyCategories:', error)
    // 推斷失敗時返回空陣列，不中斷流程
    return []
  }
}

/**
 * 取得當前用戶的詳細資料（不包含權限推斷）
 */
export async function getCurrentUserDetails(): Promise<UserPermissions | null> {
  try {
    const authResult = await validateAuth()
    if (authResult.error || !authResult.user) {
      throw authResult.error || new Error('未驗證用戶')
    }

    const userId = authResult.user.id

    const { data: user, error: userError } = await supabase
      .from('profiles')
      .select('id, display_name, role, is_active, email, company, job_title, phone, filling_config')
      .eq('id', userId)
      .maybeSingle()

    if (userError) {
      if (userError.code === 'PGRST116') {
        return null // 用戶不存在
      }
      console.error('Error fetching current user details:', userError)
      throw handleAPIError(userError, '無法取得使用者詳細資料')
    }

    return user
  } catch (error) {
    console.error('Error in getCurrentUserDetails:', error)
    if (error instanceof Error) {
      throw error
    }
    throw new Error('取得使用者詳細資料時發生未知錯誤')
  }
}

/**
 * 取得當前用戶資料（結合基本資料和權限推斷）
 * 這是主要的用戶權限獲取函數
 */
export async function getCurrentUserPermissions(): Promise<UserPermissions | null> {
  try {
    // 同時取得基本用戶資料和推斷權限
    const [user, inferredCategories] = await Promise.all([
      getCurrentUserDetails(),
      inferCurrentUserEnergyCategories()
    ])

    if (!user) {
      return null
    }

    const fillingConfig = user.filling_config || {}

    // 如果 filling_config 中沒有能源類別權限，使用推斷的權限
    const dbEnergyCategories = fillingConfig.energy_categories || inferredCategories

    // 將資料庫格式的能源類別轉換為前端格式
    const frontendEnergyCategories = convertDbKeysToFrontend(dbEnergyCategories)

    console.log(`🛠️ 當前用戶的權限設定:`, {
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
    console.error('Error in getCurrentUserPermissions:', error)
    if (error instanceof Error) {
      throw error
    }
    throw new Error('取得用戶權限資料時發生未知錯誤')
  }
}

/**
 * 檢查當前用戶是否有特定能源類別的權限
 */
export async function hasEnergyCategory(category: string): Promise<boolean> {
  try {
    const userPermissions = await getCurrentUserPermissions()

    if (!userPermissions || !userPermissions.energy_categories) {
      return false
    }

    return userPermissions.energy_categories.includes(category)
  } catch (error) {
    console.error('Error checking energy category permission:', error)
    return false // 發生錯誤時預設為無權限
  }
}