/**
 * 導航分類映射配置
 * 將 14 個能源項目映射到 6 個主分類中
 * 用於新版 Dashboard 的導航下拉選單
 */

import { ENERGY_CONFIG } from '../pages/admin/data/energyConfig'

export interface CategoryGroup {
  id: string
  label: string
  items: {
    id: string
    name: string
    route: string
  }[]
}

/**
 * 6 大分類對應的能源項目 ID
 * 根據用戶提供的分類清單定義
 */
export const CATEGORY_GROUPS: CategoryGroup[] = [
  {
    id: 'category1',
    label: '類別一',
    items: [
      'wd40',
      'acetylene',
      'refrigerant',
      'septic_tank',
      'natural_gas',
      'urea',
      'diesel_generator',
      'generator_test',
      'diesel',
      'gasoline',
      'sf6',
      'lpg',
      'fire_extinguisher',
      'welding_rod',
      'gas_cylinder',
      'other_energy_sources'
    ].map(id => {
      const config = ENERGY_CONFIG.find(c => c.id === id)!
      return {
        id: config.id,
        name: config.name,
        route: config.route
      }
    })
  },
  {
    id: 'category2',
    label: '類別二',
    items: [
      'electricity'
    ].map(id => {
      const config = ENERGY_CONFIG.find(c => c.id === id)!
      return {
        id: config.id,
        name: config.name,
        route: config.route
      }
    })
  },
  {
    id: 'category3',
    label: '類別三',
    items: [
      'employee_commute'
    ].map(id => {
      const config = ENERGY_CONFIG.find(c => c.id === id)!
      return {
        id: config.id,
        name: config.name,
        route: config.route
      }
    })
  },
  {
    id: 'category4',
    label: '類別四',
    items: []
  },
  {
    id: 'category5',
    label: '類別五',
    items: []
  },
  {
    id: 'category6',
    label: '類別六',
    items: []
  }
]

/**
 * 取得所有有項目的分類（過濾空分類）
 */
export function getActiveCategories(): CategoryGroup[] {
  return CATEGORY_GROUPS.filter(cat => cat.items.length > 0)
}

/**
 * 取得特定分類的項目列表
 */
export function getCategoryItems(categoryId: string): CategoryGroup['items'] {
  const category = CATEGORY_GROUPS.find(cat => cat.id === categoryId)
  return category?.items ?? []
}

/**
 * 根據能源項目 ID 取得所屬分類
 */
export function getCategoryByItemId(itemId: string): CategoryGroup | null {
  return CATEGORY_GROUPS.find(cat =>
    cat.items.some(item => item.id === itemId)
  ) ?? null
}
