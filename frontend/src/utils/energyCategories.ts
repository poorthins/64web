// 完整的能源類別定義（用於權限系統）
export const ALL_ENERGY_CATEGORIES = [
  'wd40',
  'acetylene',
  'refrigerant',
  'septic_tank',
  'natural_gas',
  'urea',
  'diesel_generator',
  'diesel',
  'gasoline',
  'lpg',
  'fire_extinguisher',
  'welding_rod',
  'electricity_bill',
  'employee_commute'
] as const

// 按範疇分組的能源類別
export const ENERGY_CATEGORIES_BY_SCOPE = {
  scope1: [
    'wd40', 'acetylene', 'refrigerant', 'septic_tank', 'natural_gas', 'urea',
    'diesel_generator', 'diesel', 'gasoline', 'lpg', 'fire_extinguisher', 'welding_rod'
  ],
  scope2: ['electricity_bill'],
  scope3: ['employee_commute']
} as const

// 範疇標籤映射
export const SCOPE_LABELS = {
  scope1: '範疇一（直接排放）',
  scope2: '範疇二（間接排放）',
  scope3: '範疇三（其他間接）'
} as const

// 能源類別到範疇的映射
export const CATEGORY_TO_SCOPE_MAP: Record<string, keyof typeof ENERGY_CATEGORIES_BY_SCOPE> = {
  // 範疇一
  wd40: 'scope1',
  acetylene: 'scope1',
  refrigerant: 'scope1',
  septic_tank: 'scope1',
  natural_gas: 'scope1',
  urea: 'scope1',
  diesel_generator: 'scope1',
  diesel: 'scope1',
  gasoline: 'scope1',
  lpg: 'scope1',
  fire_extinguisher: 'scope1',
  welding_rod: 'scope1',
  // 範疇二
  electricity_bill: 'scope2',
  // 範疇三
  employee_commute: 'scope3'
}

export type EnergyCategory = typeof ALL_ENERGY_CATEGORIES[number]
export type EnergyScope = keyof typeof ENERGY_CATEGORIES_BY_SCOPE