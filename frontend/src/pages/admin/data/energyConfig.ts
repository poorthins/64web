/**
 * 能源類別統一配置檔
 * Single Source of Truth for Energy Categories
 */

export interface EnergyCategory {
  id: string
  name: string
  scope: 1 | 2 | 3
  route: string
  hasVersion?: boolean
}

/**
 * 所有能源類別的完整配置
 */
export const ENERGY_CONFIG: readonly EnergyCategory[] = [
  // 範疇一：直接排放
  { id: 'wd40', name: 'WD-40', scope: 1, route: '/app/wd40' },
  { id: 'acetylene', name: '乙炔', scope: 1, route: '/app/acetylene' },
  { id: 'refrigerant', name: '冷媒', scope: 1, route: '/app/refrigerant' },
  { id: 'septic_tank', name: '化糞池', scope: 1, route: '/app/septic_tank' },
  { id: 'natural_gas', name: '天然氣', scope: 1, route: '/app/natural_gas' },
  { id: 'urea', name: '尿素', scope: 1, route: '/app/urea' },
  { id: 'diesel_generator', name: '柴油(固定源)', scope: 1, route: '/app/diesel_generator' },
  { id: 'generator_test', name: '發電機測試資料', scope: 1, route: '/app/generator_test' },
  { id: 'diesel', name: '柴油(移動源)', scope: 1, route: '/app/diesel' },
  { id: 'gasoline', name: '汽油', scope: 1, route: '/app/gasoline' },
  { id: 'sf6', name: '六氟化硫', scope: 1, route: '/app/sf6' },
  { id: 'lpg', name: '液化石油氣', scope: 1, route: '/app/lpg' },
  { id: 'fire_extinguisher', name: '滅火器', scope: 1, route: '/app/fire_extinguisher' },
  { id: 'welding_rod', name: '焊條', scope: 1, route: '/app/welding_rod' },

  // 範疇二：外購電力
  { id: 'electricity', name: '外購電力', scope: 2, route: '/app/electricity' },

  // 範疇三：其他間接排放
  { id: 'employee_commute', name: '員工通勤', scope: 3, route: '/app/employee_commute' }
] as const

/**
 * 範疇標籤
 */
export const SCOPE_LABELS = {
  1: '範疇一：直接排放',
  2: '範疇二：外購電力',
  3: '範疇三：其他間接排放'
} as const

/**
 * 相容舊程式碼的 alias
 * @deprecated 請改用 SCOPE_LABELS
 */
export const scopeLabels = SCOPE_LABELS

/**
 * 相容舊程式碼的 alias
 * @deprecated 請改用 ENERGY_CONFIG
 */
export const energyCategories = [...ENERGY_CONFIG]

/**
 * 根據 page_key 取得類別名稱
 */
export function getCategoryName(pageKey: string, fallbackCategory?: string): string {
  // 先嘗試用 pageKey 查詢（如果傳入的是 page_key）
  let category = ENERGY_CONFIG.find(c => c.id === pageKey)
  if (category) return category.name

  // 如果找不到，嘗試用顯示名稱查找（處理資料庫中直接存顯示名稱的情況）
  if (!category) {
    category = ENERGY_CONFIG.find(c => c.name === pageKey)
    if (category) return category.name
  }

  // ⭐ 向後相容：處理資料庫舊格式名稱
  if (!category) {
    const legacyNameMap: Record<string, string> = {
      '柴油': 'diesel',                // 舊名稱 → page_key
      '柴油(發電機)': 'diesel_generator'
    }
    const mappedPageKey = legacyNameMap[pageKey]
    if (mappedPageKey) {
      category = ENERGY_CONFIG.find(c => c.id === mappedPageKey)
      if (category) return category.name
    }
  }

  // 如果有提供 fallbackCategory，嘗試用它查詢
  if (fallbackCategory) {
    const fallback = ENERGY_CONFIG.find(c => c.id === fallbackCategory)
    if (fallback) return fallback.name
  }

  // 都找不到時返回原始 key
  return pageKey || fallbackCategory || '未知類別'
}

/**
 * 根據 page_key 取得路由路徑
 */
export function getPageRoute(pageKey: string): string | null {
  const category = ENERGY_CONFIG.find(c => c.id === pageKey)
  return category?.route ?? null
}

/**
 * 根據顯示名稱取得路由路徑（用於從資料庫 category 欄位取得路由）
 */
export function getPageRouteByName(categoryName: string): string | null {
  // 先嘗試用 id 查找（如果傳入的是 page_key）
  let category = ENERGY_CONFIG.find(c => c.id === categoryName)

  // 如果找不到，再嘗試用顯示名稱查找
  if (!category) {
    category = ENERGY_CONFIG.find(c => c.name === categoryName)
  }

  // ⭐ 向後相容：處理資料庫舊格式名稱
  if (!category) {
    const legacyNameMap: Record<string, string> = {
      '柴油': 'diesel',                // 舊名稱 → page_key
      '柴油(發電機)': 'diesel_generator'
    }
    const pageKey = legacyNameMap[categoryName]
    if (pageKey) {
      category = ENERGY_CONFIG.find(c => c.id === pageKey)
    }
  }

  return category?.route ?? null
}

/**
 * 根據 page_key 取得完整類別資訊
 */
export function getCategoryById(pageKey: string): EnergyCategory | null {
  return ENERGY_CONFIG.find(c => c.id === pageKey) ?? null
}

/**
 * 根據範疇取得類別列表
 */
export function getCategoriesByScope(scope: 1 | 2 | 3): EnergyCategory[] {
  return ENERGY_CONFIG.filter(c => c.scope === scope)
}

/**
 * 取得所有類別列表（轉為普通陣列）
 */
export function getAllCategories(): EnergyCategory[] {
  return [...ENERGY_CONFIG]
}

/**
 * 建立頁面映射表（相容舊程式碼）
 */
export function createPageMap(): Record<string, string> {
  return ENERGY_CONFIG.reduce((map, category) => {
    map[category.id] = category.route
    return map
  }, {} as Record<string, string>)
}

/**
 * 建立類別名稱映射表（相容舊程式碼）
 */
export function createCategoryNameMap(): Record<string, string> {
  return ENERGY_CONFIG.reduce((map, category) => {
    map[category.id] = category.name
    return map
  }, {} as Record<string, string>)
}
