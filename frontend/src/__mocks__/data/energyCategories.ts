// 能源類別 Mock 數據
export const mockEnergyCategories = [
  {
    key: 'wd40',
    label: 'WD-40',
    category: '範疇一',
    scope: 1
  },
  {
    key: 'acetylene',
    label: '乙炔',
    category: '範疇一',
    scope: 1
  },
  {
    key: 'refrigerant',
    label: '冷媒',
    category: '範疇一',
    scope: 1
  },
  {
    key: 'septic_tank',
    label: '化糞池',
    category: '範疇一',
    scope: 1
  },
  {
    key: 'natural_gas',
    label: '天然氣',
    category: '範疇一',
    scope: 1
  },
  {
    key: 'urea',
    label: '尿素',
    category: '範疇一',
    scope: 1
  },
  {
    key: 'diesel_generator',
    label: '柴油(發電機)',
    category: '範疇一',
    scope: 1,
    hasVersion: true
  },
  {
    key: 'diesel',
    label: '柴油',
    category: '範疇一',
    scope: 1
  },
  {
    key: 'gasoline',
    label: '汽油',
    category: '範疇一',
    scope: 1
  },
  {
    key: 'lpg',
    label: '液化石油氣',
    category: '範疇一',
    scope: 1
  },
  {
    key: 'fire_extinguisher',
    label: '滅火器',
    category: '範疇一',
    scope: 1
  },
  {
    key: 'welding_rod',
    label: '焊條',
    category: '範疇一',
    scope: 1
  },
  {
    key: 'electricity',
    label: '外購電力',
    category: '範疇二',
    scope: 2
  },
  {
    key: 'employee_commute',
    label: '員工通勤',
    category: '範疇三',
    scope: 3
  }
]

// 根據 scope 分組的能源類別
export const mockGroupedEnergyCategories = {
  1: mockEnergyCategories.filter(cat => cat.scope === 1),
  2: mockEnergyCategories.filter(cat => cat.scope === 2),
  3: mockEnergyCategories.filter(cat => cat.scope === 3)
}

// 範疇標籤
export const mockScopeLabels = {
  1: '範疇一：直接排放',
  2: '範疇二：外購電力',
  3: '範疇三：其他間接排放'
}

// 獲取能源類別的工具函數
export const getEnergyCategory = (key: string) =>
  mockEnergyCategories.find(cat => cat.key === key)

export const getEnergyCategoriesByScope = (scope: number) =>
  mockEnergyCategories.filter(cat => cat.scope === scope)

// 驗證能源類別是否存在
export const isValidEnergyCategory = (key: string): boolean =>
  mockEnergyCategories.some(cat => cat.key === key)

// 獲取所有能源類別的 key
export const getAllEnergyCategoryKeys = (): string[] =>
  mockEnergyCategories.map(cat => cat.key)