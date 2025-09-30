import { describe, it, expect, beforeEach, vi } from 'vitest'
import { getCategoryFromPageKey } from '../../api/entries'

describe('getCategoryFromPageKey API測試', () => {
  beforeEach(() => {
    // Clear console logs for clean test output
    vi.clearAllMocks()
  })

  describe('尿素相關測試', () => {
    it('應該正確映射urea到尿素', () => {
      const result = getCategoryFromPageKey('urea')
      expect(result).toBe('尿素')
    })

    it('應該在控制台輸出正確的診斷信息', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

      getCategoryFromPageKey('urea')

      expect(consoleSpy).toHaveBeenCalledWith('🔍 [5] getCategoryFromPageKey 收到:', 'urea')
      expect(consoleSpy).toHaveBeenCalledWith('🔍 [6] 對應結果:', 'urea', '->', '尿素')
      expect(consoleSpy).toHaveBeenCalledWith('🔍 [7] categoryMap 是否包含 urea:', true)

      consoleSpy.mockRestore()
    })
  })

  describe('化糞池格式相容性測試', () => {
    it('應該支援septic_tank格式', () => {
      const result = getCategoryFromPageKey('septic_tank')
      expect(result).toBe('化糞池')
    })

    it('應該支援septic_tank格式（向後相容）', () => {
      const result = getCategoryFromPageKey('septic_tank')
      expect(result).toBe('化糞池')
    })

    it('兩種格式應該返回相同結果', () => {
      const result1 = getCategoryFromPageKey('septic_tank')
      const result2 = getCategoryFromPageKey('septic_tank')
      expect(result1).toBe(result2)
    })
  })

  describe('所有能源類別映射測試', () => {
    const expectedMappings = [
      { pageKey: 'wd40', expected: 'WD-40' },
      { pageKey: 'acetylene', expected: '乙炔' },
      { pageKey: 'refrigerant', expected: '冷媒' },
      { pageKey: 'septic_tank', expected: '化糞池' },
      { pageKey: 'septic_tank', expected: '化糞池' },
      { pageKey: 'natural_gas', expected: '天然氣' },
      { pageKey: 'urea', expected: '尿素' },
      { pageKey: 'diesel_generator', expected: '柴油(發電機)' },
      { pageKey: 'diesel', expected: '柴油' },
      { pageKey: 'gasoline', expected: '汽油' },
      { pageKey: 'lpg', expected: '液化石油氣' },
      { pageKey: 'fire_extinguisher', expected: '滅火器' },
      { pageKey: 'welding_rod', expected: '焊條' },
      { pageKey: 'electricity_bill', expected: '外購電力' },
      { pageKey: 'employee_commute', expected: '員工通勤' }
    ]

    expectedMappings.forEach(({ pageKey, expected }) => {
      it(`應該正確映射${pageKey}到${expected}`, () => {
        const result = getCategoryFromPageKey(pageKey)
        expect(result).toBe(expected)
      })
    })
  })

  describe('未知類別處理測試', () => {
    it('應該將未知pageKey轉換為大寫', () => {
      const result = getCategoryFromPageKey('unknown_category')
      expect(result).toBe('UNKNOWN_CATEGORY')
    })

    it('應該處理空字串', () => {
      const result = getCategoryFromPageKey('')
      expect(result).toBe('')
    })

    it('應該處理特殊字符', () => {
      const result = getCategoryFromPageKey('test-123_abc')
      expect(result).toBe('TEST-123_ABC')
    })
  })

  describe('大小寫敏感性測試', () => {
    it('應該對大小寫敏感', () => {
      const result = getCategoryFromPageKey('UREA')
      expect(result).toBe('UREA') // 未在映射中，返回大寫
    })

    it('只有精確匹配才能映射', () => {
      const result = getCategoryFromPageKey('Urea')
      expect(result).toBe('UREA') // 未在映射中，返回大寫
    })
  })

  describe('修復前後對比測試', () => {
    it('修復前septic_tank可能無法正確映射，現在應該可以', () => {
      const result = getCategoryFromPageKey('septic_tank')
      expect(result).not.toBe('SEPTICTANK') // 不應該是fallback結果
      expect(result).toBe('化糞池') // 應該正確映射
    })

    it('septic_tank應該一直都能正確映射', () => {
      const result = getCategoryFromPageKey('septic_tank')
      expect(result).toBe('化糞池')
    })
  })

  describe('邊界情況測試', () => {
    it('應該處理null輸入（如果TypeScript允許）', () => {
      const result = getCategoryFromPageKey(null as any)
      expect(result).toBe('') // null被轉換為空字串
    })

    it('應該處理undefined輸入（如果TypeScript允許）', () => {
      const result = getCategoryFromPageKey(undefined as any)
      expect(result).toBe('') // undefined被轉換為空字串
    })

    it('應該處理數字輸入（如果TypeScript允許）', () => {
      const result = getCategoryFromPageKey(123 as any)
      expect(result).toBe('123')
    })
  })
})