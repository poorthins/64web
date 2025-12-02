import { useState, useEffect, useCallback, useMemo } from 'react'
import { getCurrentUserPermissions, hasEnergyCategory, UserPermissions } from '../api/userProfile'
import { useAuth } from '../contexts/AuthContext'
import { ALL_ENERGY_CATEGORIES, ENERGY_CATEGORIES_BY_SCOPE, EnergyCategory } from '../utils/energyCategories'

// 雙向格式轉換映射表
// Fixed: unified page_key to 'septic_tank'
const DB_TO_FRONTEND_MAP: Record<string, string> = {
  'electricity': 'electricity',
  'diesel_generator': 'diesel_generator', // 柴油發電機保持一致
  'sf6': 'sf6',
  'refrigerant': 'refrigerant',
  'gasoline': 'gasoline',
  'diesel': 'diesel',
  'urea': 'urea',
  'septic_tank': 'septic_tank',
  'generator_test': 'generator_test',
  'wd40': 'wd40'
};

const FRONTEND_TO_DB_MAP: Record<string, string> = {
  'electricity': 'electricity',
  'diesel_generator': 'diesel_generator', // 柴油發電機保持一致
  'sf6': 'sf6',
  'refrigerant': 'refrigerant',
  'gasoline': 'gasoline',
  'diesel': 'diesel',
  'urea': 'urea',
  'septic_tank': 'septic_tank',
  'generator_test': 'generator_test',
  'wd40': 'wd40'
};

export interface UseCurrentUserPermissionsState {
  permissions: UserPermissions | null
  isLoading: boolean
  error: string | null
  lastFetch: Date | null
}

export interface UseCurrentUserPermissionsActions {
  refetch: () => Promise<void>
  checkEnergyCategory: (category: string) => boolean
  hasPermission: (category: string) => boolean | Promise<boolean>
  hasPermissionSync: (category: string) => boolean
  filterByPermissions: <T>(items: T[], keyGetter: (item: T) => string) => T[]
  getVisibleScopes: () => Array<keyof typeof ENERGY_CATEGORIES_BY_SCOPE>
}

const CACHE_DURATION = 0 // 管理員改權限需立即生效，關閉快取

export function useCurrentUserPermissions(): UseCurrentUserPermissionsState & UseCurrentUserPermissionsActions {
  const { isAdmin, loadingRole } = useAuth()
  const [state, setState] = useState<UseCurrentUserPermissionsState>({
    permissions: null,
    isLoading: false,
    error: null,
    lastFetch: null
  })

  // 如果是管理員，返回所有權限的模擬 UserPermissions
  const adminPermissions: UserPermissions | null = useMemo(() => {
    if (!isAdmin) return null
    return {
      id: 'admin',
      display_name: '系統管理員',
      role: 'admin',
      energy_categories: [...ALL_ENERGY_CATEGORIES], // 管理員擁有所有權限
      target_year: new Date().getFullYear(),
      diesel_generator_version: 'refuel',
      is_active: true
    }
  }, [isAdmin])

  // 檢查快取是否仍有效
  const isCacheValid = useCallback(() => {
    if (!state.lastFetch) return false
    return Date.now() - state.lastFetch.getTime() < CACHE_DURATION
  }, [state.lastFetch])

  // 取得當前用戶權限
  const fetchPermissions = useCallback(async () => {
    // 如果是管理員，直接使用管理員權限，不需要 API 調用
    if (isAdmin && adminPermissions) {
      console.log('🔑 管理員用戶，使用全權限')
      setState(prev => ({
        ...prev,
        permissions: adminPermissions,
        isLoading: false,
        error: null,
        lastFetch: new Date()
      }))
      return
    }

    // 如果正在載入角色，暫時不執行
    if (loadingRole) {
      console.log('⏳ 正在載入用戶角色，暫停權限獲取')
      return
    }

    // 如果快取仍有效且有資料，直接返回
    if (isCacheValid() && state.permissions) {
      console.log('🔄 使用快取的用戶權限資料')
      return
    }

    setState(prev => ({ ...prev, isLoading: true, error: null }))

    try {
      const permissions = await getCurrentUserPermissions()

      setState(prev => ({
        ...prev,
        permissions,
        isLoading: false,
        lastFetch: new Date()
      }))

      if (permissions) {
        console.log(`✅ 成功取得當前用戶權限:`, {
          display_name: permissions.display_name,
          energy_categories: permissions.energy_categories,
          role: permissions.role
        })
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '取得用戶權限失敗'
      console.error('❌ 取得用戶權限錯誤：', error)

      setState(prev => ({
        ...prev,
        error: errorMessage,
        isLoading: false
      }))
    }
  }, [isCacheValid, state.permissions, isAdmin, adminPermissions, loadingRole])

  // 強制重新取得權限
  const refetch = useCallback(async (): Promise<void> => {
    setState(prev => ({ ...prev, lastFetch: null })) // 清除快取
    await fetchPermissions()
  }, [fetchPermissions])

  // 同步檢查能源類別權限（使用已快取的資料）
  const checkEnergyCategory = useCallback((category: string): boolean => {
    console.log(`🔍 [Permission Check] 檢查權限: ${category}`)
    console.log(`🔍 [Permission Check] 是否為管理員: ${isAdmin}`)

    // 管理員永遠有權限
    if (isAdmin) {
      console.log(`✅ [Permission Check] 管理員權限通過`)
      return true
    }

    if (!state.permissions || !state.permissions.energy_categories) {
      console.log(`❌ [Permission Check] 無權限資料`, state.permissions)
      return false
    }

    console.log(`🔍 [Permission Check] 用戶權限陣列:`, state.permissions.energy_categories)

    // 直接檢查原始格式
    if (state.permissions.energy_categories.includes(category)) {
      console.log(`✅ [Permission Check] 直接格式匹配: ${category}`)
      return true
    }

    // 檢查格式轉換：如果傳入資料庫格式，檢查對應的前端格式
    const frontendFormat = DB_TO_FRONTEND_MAP[category]
    console.log(`🔍 [Permission Check] DB→前端轉換: ${category} → ${frontendFormat}`)
    if (frontendFormat && state.permissions.energy_categories.includes(frontendFormat)) {
      console.log(`✅ [Permission Check] DB格式轉換匹配: ${category} → ${frontendFormat}`)
      return true
    }

    // 檢查格式轉換：如果傳入前端格式，檢查對應的資料庫格式
    const dbFormat = FRONTEND_TO_DB_MAP[category]
    console.log(`🔍 [Permission Check] 前端→DB轉換: ${category} → ${dbFormat}`)
    if (dbFormat && state.permissions.energy_categories.includes(dbFormat)) {
      console.log(`✅ [Permission Check] 前端格式轉換匹配: ${category} → ${dbFormat}`)
      return true
    }

    console.log(`❌ [Permission Check] 權限檢查失敗: ${category}`)
    return false
  }, [state.permissions, isAdmin])

  // 同步權限檢查（推薦使用）
  const hasPermissionSync = useCallback((category: string): boolean => {
    return checkEnergyCategory(category)
  }, [checkEnergyCategory])

  // 異步檢查能源類別權限（如果需要會重新取得資料）
  const hasPermission = useCallback(async (category: string): Promise<boolean> => {
    // 管理員永遠有權限
    if (isAdmin) {
      return true
    }

    // 先嘗試使用快取資料
    if (state.permissions && isCacheValid()) {
      return checkEnergyCategory(category)
    }

    // 如果沒有快取或過期，使用 API 直接檢查
    try {
      return await hasEnergyCategory(category)
    } catch (error) {
      console.error('Error checking energy category permission:', error)
      return false
    }
  }, [state.permissions, isCacheValid, checkEnergyCategory, isAdmin])

  // 過濾項目基於權限
  const filterByPermissions = useCallback(<T>(
    items: T[],
    keyGetter: (item: T) => string
  ): T[] => {
    // 管理員看到所有項目
    if (isAdmin) {
      return items
    }

    return items.filter(item => hasPermissionSync(keyGetter(item)))
  }, [isAdmin, hasPermissionSync])

  // 獲取可見的範疇
  const getVisibleScopes = useCallback((): Array<keyof typeof ENERGY_CATEGORIES_BY_SCOPE> => {
    // 管理員看到所有範疇
    if (isAdmin) {
      return ['scope1', 'scope2', 'scope3']
    }

    const visibleScopes: Array<keyof typeof ENERGY_CATEGORIES_BY_SCOPE> = []

    // 檢查每個範疇是否有至少一個可見的類別
    Object.entries(ENERGY_CATEGORIES_BY_SCOPE).forEach(([scope, categories]) => {
      const hasAnyCategory = categories.some(category => hasPermissionSync(category))
      if (hasAnyCategory) {
        visibleScopes.push(scope as keyof typeof ENERGY_CATEGORIES_BY_SCOPE)
      }
    })

    return visibleScopes
  }, [isAdmin, hasPermissionSync])

  // 初始載入
  useEffect(() => {
    fetchPermissions()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin, loadingRole])

  // 實際的 permissions 狀態（管理員使用管理員權限，一般用戶使用 API 權限）
  const actualPermissions = isAdmin ? adminPermissions : state.permissions
  const actualIsLoading = loadingRole || state.isLoading

  return {
    permissions: actualPermissions,
    isLoading: actualIsLoading,
    error: state.error,
    lastFetch: state.lastFetch,
    refetch,
    checkEnergyCategory,
    hasPermission,
    hasPermissionSync,
    filterByPermissions,
    getVisibleScopes
  }
}

// 單純的能源類別權限檢查 Hook
export function useEnergyPermission(category: string) {
  const { permissions, isLoading, hasPermissionSync } = useCurrentUserPermissions()

  const hasPermission = hasPermissionSync(category)

  return {
    hasPermission,
    isLoading,
    permissions
  }
}