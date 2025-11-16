import { describe, it, expect } from 'vitest'
import {
  CATEGORY_GROUPS,
  getActiveCategories,
  getCategoryItems,
  getCategoryByItemId
} from '../categoryMapping'

describe('categoryMapping', () => {
  describe('CATEGORY_GROUPS', () => {
    it('應該有 6 個分類', () => {
      expect(CATEGORY_GROUPS).toHaveLength(6)
    })

    it('類別一應該有 14 個項目', () => {
      const category1 = CATEGORY_GROUPS.find(cat => cat.id === 'category1')
      expect(category1).toBeDefined()
      expect(category1!.items).toHaveLength(14)
    })

    it('類別二應該有 1 個項目（外購電力）', () => {
      const category2 = CATEGORY_GROUPS.find(cat => cat.id === 'category2')
      expect(category2).toBeDefined()
      expect(category2!.items).toHaveLength(1)
      expect(category2!.items[0].id).toBe('electricity')
    })

    it('類別三應該有 1 個項目（員工通勤）', () => {
      const category3 = CATEGORY_GROUPS.find(cat => cat.id === 'category3')
      expect(category3).toBeDefined()
      expect(category3!.items).toHaveLength(1)
      expect(category3!.items[0].id).toBe('employee_commute')
    })

    it('類別四五六應該為空（未來擴展）', () => {
      const category4 = CATEGORY_GROUPS.find(cat => cat.id === 'category4')
      const category5 = CATEGORY_GROUPS.find(cat => cat.id === 'category5')
      const category6 = CATEGORY_GROUPS.find(cat => cat.id === 'category6')

      expect(category4!.items).toHaveLength(0)
      expect(category5!.items).toHaveLength(0)
      expect(category6!.items).toHaveLength(0)
    })

    it('每個項目應該有 id, name, route', () => {
      const category1 = CATEGORY_GROUPS.find(cat => cat.id === 'category1')!

      category1.items.forEach(item => {
        expect(item).toHaveProperty('id')
        expect(item).toHaveProperty('name')
        expect(item).toHaveProperty('route')
        expect(typeof item.id).toBe('string')
        expect(typeof item.name).toBe('string')
        expect(typeof item.route).toBe('string')
        expect(item.route).toMatch(/^\/app\//)
      })
    })

    it('應該包含所有 16 個能源項目', () => {
      const allItems = CATEGORY_GROUPS.flatMap(cat => cat.items)
      expect(allItems).toHaveLength(16)

      const expectedIds = [
        'wd40', 'acetylene', 'refrigerant', 'septic_tank', 'natural_gas', 'urea',
        'diesel_generator', 'diesel', 'gasoline', 'sf6', 'generator_test', 'lpg', 'fire_extinguisher', 'welding_rod',
        'electricity', 'employee_commute'
      ]

      expectedIds.forEach(id => {
        expect(allItems.some(item => item.id === id)).toBe(true)
      })
    })
  })

  describe('getActiveCategories()', () => {
    it('應該只返回有項目的分類', () => {
      const activeCategories = getActiveCategories()

      expect(activeCategories).toHaveLength(3)
      expect(activeCategories.every(cat => cat.items.length > 0)).toBe(true)
    })

    it('應該包含類別一、二、三', () => {
      const activeCategories = getActiveCategories()
      const ids = activeCategories.map(cat => cat.id)

      expect(ids).toContain('category1')
      expect(ids).toContain('category2')
      expect(ids).toContain('category3')
    })

    it('不應該包含空分類（類別四五六）', () => {
      const activeCategories = getActiveCategories()
      const ids = activeCategories.map(cat => cat.id)

      expect(ids).not.toContain('category4')
      expect(ids).not.toContain('category5')
      expect(ids).not.toContain('category6')
    })
  })

  describe('getCategoryItems()', () => {
    it('應該返回指定分類的項目', () => {
      const items = getCategoryItems('category1')
      expect(items).toHaveLength(14)
    })

    it('對於不存在的分類應該返回空陣列', () => {
      const items = getCategoryItems('nonexistent')
      expect(items).toEqual([])
    })

    it('對於空分類應該返回空陣列', () => {
      const items = getCategoryItems('category4')
      expect(items).toEqual([])
    })

    it('返回的項目應該包含完整資訊', () => {
      const items = getCategoryItems('category2')
      expect(items).toHaveLength(1)
      expect(items[0]).toEqual({
        id: 'electricity',
        name: '外購電力',
        route: '/app/electricity'
      })
    })
  })

  describe('getCategoryByItemId()', () => {
    it('應該根據項目 ID 找到所屬分類', () => {
      const category = getCategoryByItemId('wd40')
      expect(category).toBeDefined()
      expect(category!.id).toBe('category1')
    })

    it('應該正確映射類別二的項目', () => {
      const category = getCategoryByItemId('electricity')
      expect(category).toBeDefined()
      expect(category!.id).toBe('category2')
      expect(category!.label).toBe('類別二')
    })

    it('應該正確映射類別三的項目', () => {
      const category = getCategoryByItemId('employee_commute')
      expect(category).toBeDefined()
      expect(category!.id).toBe('category3')
      expect(category!.label).toBe('類別三')
    })

    it('對於不存在的項目應該返回 null', () => {
      const category = getCategoryByItemId('nonexistent')
      expect(category).toBeNull()
    })

    it('所有 14 個能源項目都應該有對應分類', () => {
      const allIds = [
        'wd40', 'acetylene', 'refrigerant', 'septic_tank', 'natural_gas', 'urea',
        'diesel_generator', 'diesel', 'gasoline', 'lpg', 'fire_extinguisher', 'welding_rod',
        'electricity', 'employee_commute'
      ]

      allIds.forEach(id => {
        const category = getCategoryByItemId(id)
        expect(category).not.toBeNull()
        expect(['category1', 'category2', 'category3']).toContain(category!.id)
      })
    })
  })
})
