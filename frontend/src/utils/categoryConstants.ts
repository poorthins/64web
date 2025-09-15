/**
 * 能源類別常量定義
 * 這些值必須與資料庫的約束條件一致
 */

// 支援的能源類別對應關係
export const ENERGY_CATEGORIES = {
  // 範疇一 - 直接溫室氣體排放
  scope1: {
    'wd40': { category: 'WD-40', unit: 'ML', scope: 1 },
    'acetylene': { category: '乙炔', unit: 'kg', scope: 1 },
    'refrigerant': { category: '冷媒', unit: 'kg', scope: 1 },
    'septictank': { category: '化糞池', unit: 'person', scope: 1 },
    'natural_gas': { category: '天然氣', unit: 'm³', scope: 1 },
    'urea': { category: '尿素', unit: 'kg', scope: 1 },
    'diesel_generator': { category: '柴油(發電機)', unit: 'L', scope: 1 },
    'diesel': { category: '柴油', unit: 'L', scope: 1 },
    'gasoline': { category: '汽油', unit: 'L', scope: 1 },
    'lpg': { category: '液化石油氣', unit: 'kg', scope: 1 },
    'fire_extinguisher': { category: '滅火器', unit: 'kg', scope: 1 },
    'welding_rod': { category: '焊條', unit: 'kg', scope: 1 }
  },
  // 範疇二 - 能源間接溫室氣體排放
  scope2: {
    'electricity_bill': { category: '外購電力', unit: 'kWh', scope: 2 }
  },
  // 範疇三 - 其他間接溫室氣體排放
  scope3: {
    'employee_commute': { category: '員工通勤', unit: 'person-km', scope: 3 }
  }
} as const

// 扁平化的類別對應表，方便查找
export const CATEGORY_MAP: Record<string, { category: string; unit: string; scope: number }> = {
  ...ENERGY_CATEGORIES.scope1,
  ...ENERGY_CATEGORIES.scope2,
  ...ENERGY_CATEGORIES.scope3
}

// 除錯用：檢查 CATEGORY_MAP 構建結果
console.log('🔧 [categoryConstants] ENERGY_CATEGORIES.scope1:', ENERGY_CATEGORIES.scope1)
console.log('🔧 [categoryConstants] 最終 CATEGORY_MAP:', CATEGORY_MAP)
console.log('🔧 [categoryConstants] CATEGORY_MAP 包含的 keys:', Object.keys(CATEGORY_MAP))
console.log('🔧 [categoryConstants] wd40 是否存在:', 'wd40' in CATEGORY_MAP)
console.log('🔧 [categoryConstants] wd40 的值:', CATEGORY_MAP['wd40'])

// 根據 page_key 獲取對應的 category 資訊
export function getCategoryInfo(pageKey: string) {
  console.log('🔍 [getCategoryInfo] 查詢 page_key:', pageKey)
  console.log('🔍 [getCategoryInfo] CATEGORY_MAP 內容:', CATEGORY_MAP)
  console.log('🔍 [getCategoryInfo] CATEGORY_MAP 可用 keys:', Object.keys(CATEGORY_MAP))
  
  const info = CATEGORY_MAP[pageKey]
  console.log('🔍 [getCategoryInfo] 找到的資訊:', info)
  
  if (!info) {
    const error = `Unknown page_key: ${pageKey}. Supported keys: ${Object.keys(CATEGORY_MAP).join(', ')}`
    console.error('❌ [getCategoryInfo] 錯誤:', error)
    throw new Error(error)
  }
  
  console.log('✅ [getCategoryInfo] 成功回傳資訊:', info)
  return info
}

// 獲取所有支援的 category 值列表
export function getAllCategories(): string[] {
  return Object.values(CATEGORY_MAP).map(info => info.category)
}

// 驗證 category 值是否有效
export function isValidCategory(category: string): boolean {
  return getAllCategories().includes(category)
}

// 用於測試的有效 category 範例
export const TEST_CATEGORIES = {
  WD40: { category: 'WD-40', page_key: 'wd40', unit: 'ML', scope: 1 },
  ACETYLENE: { category: '乙炔', page_key: 'acetylene', unit: 'kg', scope: 1 },
  ELECTRICITY: { category: '外購電力', page_key: 'electricity_bill', unit: 'kWh', scope: 2 },
  COMMUTE: { category: '員工通勤', page_key: 'employee_commute', unit: 'person-km', scope: 3 }
} as const