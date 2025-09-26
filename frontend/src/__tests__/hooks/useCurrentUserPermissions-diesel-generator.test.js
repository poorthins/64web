/**
 * 柴油發電機權限檢查Hook測試
 * 測試 useCurrentUserPermissions 對 diesel_generator 的處理
 */

import { renderHook, waitFor } from '@testing-library/react'
import { useCurrentUserPermissions } from '../../hooks/useCurrentUserPermissions'

// 模擬 AuthContext
const mockUseAuth = jest.fn()
jest.mock('../../contexts/AuthContext', () => ({
  useAuth: () => mockUseAuth()
}))

// 模擬 API 調用
const mockGetCurrentUserPermissions = jest.fn()
jest.mock('../../api/userProfile', () => ({
  getCurrentUserPermissions: () => mockGetCurrentUserPermissions(),
  hasEnergyCategory: jest.fn()
}))

// 模擬能源類別常數
jest.mock('../../utils/energyCategories', () => ({
  ALL_ENERGY_CATEGORIES: ['wd40', 'diesel_generator', 'gasoline', 'septictank', 'electricity_bill'],
  ENERGY_CATEGORIES_BY_SCOPE: {
    scope1: ['wd40', 'diesel_generator', 'gasoline'],
    scope2: ['electricity_bill'],
    scope3: ['septictank']
  }
}))

describe('useCurrentUserPermissions 柴油發電機測試', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    console.log = jest.fn()
    console.error = jest.fn()
  })

  describe('管理員權限測試', () => {
    test('管理員應該對柴油發電機有權限', async () => {
      mockUseAuth.mockReturnValue({
        isAdmin: true,
        loadingRole: false
      })

      const { result } = renderHook(() => useCurrentUserPermissions())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      // 管理員應該對所有能源類別都有權限
      expect(result.current.checkEnergyCategory('diesel_generator')).toBe(true)
      expect(result.current.hasPermissionSync('diesel_generator')).toBe(true)
    })
  })

  describe('一般用戶權限測試', () => {
    beforeEach(() => {
      mockUseAuth.mockReturnValue({
        isAdmin: false,
        loadingRole: false
      })
    })

    test('有diesel_generator權限的用戶應該通過檢查', async () => {
      const mockUserPermissions = {
        id: 'user-123',
        display_name: '測試用戶',
        role: 'user',
        energy_categories: ['wd40', 'diesel_generator', 'gasoline'],
        target_year: 2024,
        diesel_generator_version: 'refuel',
        is_active: true
      }

      mockGetCurrentUserPermissions.mockResolvedValue(mockUserPermissions)

      const { result } = renderHook(() => useCurrentUserPermissions())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current.checkEnergyCategory('diesel_generator')).toBe(true)
      expect(result.current.hasPermissionSync('diesel_generator')).toBe(true)
    })

    test('沒有diesel_generator權限的用戶應該被拒絕', async () => {
      const mockUserPermissions = {
        id: 'user-123',
        display_name: '測試用戶',
        role: 'user',
        energy_categories: ['wd40', 'gasoline'], // 沒有 diesel_generator
        target_year: 2024,
        is_active: true
      }

      mockGetCurrentUserPermissions.mockResolvedValue(mockUserPermissions)

      const { result } = renderHook(() => useCurrentUserPermissions())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current.checkEnergyCategory('diesel_generator')).toBe(false)
      expect(result.current.hasPermissionSync('diesel_generator')).toBe(false)
    })

    test('應該正確處理Key格式轉換', async () => {
      const mockUserPermissions = {
        id: 'user-123',
        display_name: '測試用戶',
        role: 'user',
        energy_categories: ['wd40', 'diesel_generator'], // 前端格式
        target_year: 2024,
        is_active: true
      }

      mockGetCurrentUserPermissions.mockResolvedValue(mockUserPermissions)

      const { result } = renderHook(() => useCurrentUserPermissions())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      // 測試不同格式的檢查都應該通過
      expect(result.current.checkEnergyCategory('diesel_generator')).toBe(true)

      // 由於我們的映射表中 diesel_generator → diesel_generator，這個測試驗證一致性
      expect(result.current.hasPermissionSync('diesel_generator')).toBe(true)
    })

    test('應該正確過濾基於權限的項目', async () => {
      const mockUserPermissions = {
        id: 'user-123',
        display_name: '測試用戶',
        role: 'user',
        energy_categories: ['diesel_generator'], // 只有柴油發電機權限
        target_year: 2024,
        is_active: true
      }

      mockGetCurrentUserPermissions.mockResolvedValue(mockUserPermissions)

      const { result } = renderHook(() => useCurrentUserPermissions())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      const testItems = [
        { id: 'wd40', name: 'WD-40' },
        { id: 'diesel_generator', name: '柴油發電機' },
        { id: 'gasoline', name: '汽油' }
      ]

      const filteredItems = result.current.filterByPermissions(
        testItems,
        item => item.id
      )

      // 應該只返回柴油發電機
      expect(filteredItems).toHaveLength(1)
      expect(filteredItems[0].id).toBe('diesel_generator')
    })

    test('應該正確獲取可見範疇', async () => {
      const mockUserPermissions = {
        id: 'user-123',
        display_name: '測試用戶',
        role: 'user',
        energy_categories: ['diesel_generator'], // 只有範疇一的柴油發電機
        target_year: 2024,
        is_active: true
      }

      mockGetCurrentUserPermissions.mockResolvedValue(mockUserPermissions)

      const { result } = renderHook(() => useCurrentUserPermissions())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      const visibleScopes = result.current.getVisibleScopes()

      // 應該只看到範疇一
      expect(visibleScopes).toContain('scope1')
      expect(visibleScopes).not.toContain('scope2')
      expect(visibleScopes).not.toContain('scope3')
    })
  })

  describe('邊界情況測試', () => {
    beforeEach(() => {
      mockUseAuth.mockReturnValue({
        isAdmin: false,
        loadingRole: false
      })
    })

    test('應該處理空權限列表', async () => {
      const mockUserPermissions = {
        id: 'user-123',
        display_name: '測試用戶',
        role: 'user',
        energy_categories: [], // 空權限
        target_year: 2024,
        is_active: true
      }

      mockGetCurrentUserPermissions.mockResolvedValue(mockUserPermissions)

      const { result } = renderHook(() => useCurrentUserPermissions())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current.checkEnergyCategory('diesel_generator')).toBe(false)
      expect(result.current.hasPermissionSync('diesel_generator')).toBe(false)
    })

    test('應該處理null權限', async () => {
      const mockUserPermissions = {
        id: 'user-123',
        display_name: '測試用戶',
        role: 'user',
        energy_categories: null, // null權限
        target_year: 2024,
        is_active: true
      }

      mockGetCurrentUserPermissions.mockResolvedValue(mockUserPermissions)

      const { result } = renderHook(() => useCurrentUserPermissions())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current.checkEnergyCategory('diesel_generator')).toBe(false)
    })

    test('應該處理API錯誤', async () => {
      mockGetCurrentUserPermissions.mockRejectedValue(new Error('API Error'))

      const { result } = renderHook(() => useCurrentUserPermissions())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current.error).toBeTruthy()
      expect(result.current.permissions).toBeNull()
    })
  })

  describe('快取機制測試', () => {
    beforeEach(() => {
      mockUseAuth.mockReturnValue({
        isAdmin: false,
        loadingRole: false
      })
    })

    test('應該使用快取避免重複API調用', async () => {
      const mockUserPermissions = {
        id: 'user-123',
        display_name: '測試用戶',
        role: 'user',
        energy_categories: ['diesel_generator'],
        target_year: 2024,
        is_active: true
      }

      mockGetCurrentUserPermissions.mockResolvedValue(mockUserPermissions)

      const { result } = renderHook(() => useCurrentUserPermissions())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      // 第一次調用
      expect(mockGetCurrentUserPermissions).toHaveBeenCalledTimes(1)

      // 多次權限檢查不應觸發額外API調用
      result.current.checkEnergyCategory('diesel_generator')
      result.current.hasPermissionSync('diesel_generator')
      result.current.checkEnergyCategory('wd40')

      expect(mockGetCurrentUserPermissions).toHaveBeenCalledTimes(1)
    })
  })
})

console.log('🧪 柴油發電機權限檢查Hook測試已創建')
console.log('📝 測試覆蓋範圍:')
console.log('  ✅ 管理員權限檢查')
console.log('  ✅ 一般用戶權限檢查')
console.log('  ✅ Key格式轉換')
console.log('  ✅ 權限過濾功能')
console.log('  ✅ 可見範疇計算')
console.log('  ✅ 邊界情況處理')
console.log('  ✅ 快取機制驗證')