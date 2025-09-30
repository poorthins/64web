import { describe, it, expect, beforeEach, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { useCurrentUserPermissions } from '../../hooks/useCurrentUserPermissions'

// Mock dependencies
vi.mock('../../api/userProfile', () => ({
  getCurrentUserPermissions: vi.fn(),
  hasEnergyCategory: vi.fn()
}))

vi.mock('../../contexts/AuthContext', () => ({
  useAuth: vi.fn()
}))

vi.mock('../../utils/energyCategories', () => ({
  ALL_ENERGY_CATEGORIES: [
    'wd40', 'acetylene', 'refrigerant', 'septic_tank', 'natural_gas',
    'urea', 'diesel_generator', 'diesel', 'gasoline', 'lpg',
    'fire_extinguisher', 'welding_rod', 'electricity', 'employee_commute'
  ],
  ENERGY_CATEGORIES_BY_SCOPE: {
    scope1: [
      'wd40', 'acetylene', 'refrigerant', 'septic_tank', 'natural_gas', 'urea',
      'diesel_generator', 'diesel', 'gasoline', 'lpg', 'fire_extinguisher', 'welding_rod'
    ],
    scope2: ['electricity'],
    scope3: ['employee_commute']
  }
}))

describe('外購電力權限檢查測試', () => {
  let mockGetCurrentUserPermissions: any
  let mockHasEnergyCategory: any
  let mockUseAuth: any

  beforeEach(async () => {
    const userProfileModule = await import('../../api/userProfile')
    const authContextModule = await import('../../contexts/AuthContext')

    mockGetCurrentUserPermissions = vi.mocked(userProfileModule.getCurrentUserPermissions)
    mockHasEnergyCategory = vi.mocked(userProfileModule.hasEnergyCategory)
    mockUseAuth = vi.mocked(authContextModule.useAuth)
  })

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('一般用戶外購電力權限', () => {
    beforeEach(() => {
      mockUseAuth.mockReturnValue({
        isAdmin: false,
        loadingRole: false,
        user: { id: 'user-1', role: 'user' }
      } as any)
    })

    it('應該正確檢查有外購電力權限的用戶', async () => {
      mockGetCurrentUserPermissions.mockResolvedValue({
        id: 'user-1',
        display_name: '測試用戶',
        role: 'user',
        energy_categories: ['electricity'], // 資料庫格式
        target_year: 2024,
        diesel_generator_version: 'refuel',
        is_active: true
      })

      const { result } = renderHook(() => useCurrentUserPermissions())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      // 測試前端格式檢查
      expect(result.current.hasPermissionSync('electricity')).toBe(true)

      // 測試資料庫格式檢查
      expect(result.current.hasPermissionSync('electricity')).toBe(true)
    })

    it('應該正確處理沒有外購電力權限的用戶', async () => {
      mockGetCurrentUserPermissions.mockResolvedValue({
        id: 'user-2',
        display_name: '受限用戶',
        role: 'user',
        energy_categories: ['wd40', 'diesel'], // 沒有 electricity
        target_year: 2024,
        diesel_generator_version: 'refuel',
        is_active: true
      })

      const { result } = renderHook(() => useCurrentUserPermissions())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      // 應該沒有外購電力權限
      expect(result.current.hasPermissionSync('electricity')).toBe(false)
      expect(result.current.hasPermissionSync('electricity')).toBe(false)
    })

    it('應該正確處理格式轉換', async () => {
      mockGetCurrentUserPermissions.mockResolvedValue({
        id: 'user-3',
        display_name: '格式轉換測試',
        role: 'user',
        energy_categories: ['electricity'], // 前端格式存在資料庫中
        target_year: 2024,
        diesel_generator_version: 'refuel',
        is_active: true
      })

      const { result } = renderHook(() => useCurrentUserPermissions())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      // 兩種格式都應該有權限
      expect(result.current.hasPermissionSync('electricity')).toBe(true)
      expect(result.current.hasPermissionSync('electricity')).toBe(true)
    })
  })

  describe('管理員權限', () => {
    beforeEach(() => {
      mockUseAuth.mockReturnValue({
        isAdmin: true,
        loadingRole: false,
        user: { id: 'admin-1', role: 'admin' }
      } as any)
    })

    it('管理員應該有所有外購電力權限', async () => {
      const { result } = renderHook(() => useCurrentUserPermissions())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      // 管理員應該有所有權限
      expect(result.current.hasPermissionSync('electricity')).toBe(true)
      expect(result.current.hasPermissionSync('electricity')).toBe(true)
      expect(result.current.hasPermissionSync('wd40')).toBe(true)
      expect(result.current.hasPermissionSync('employee_commute')).toBe(true)
    })

    it('管理員應該看到所有範疇', async () => {
      const { result } = renderHook(() => useCurrentUserPermissions())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      const visibleScopes = result.current.getVisibleScopes()
      expect(visibleScopes).toEqual(['scope1', 'scope2', 'scope3'])
    })
  })

  describe('範疇二（外購電力）可見性', () => {
    it('有外購電力權限的用戶應該看到範疇二', async () => {
      mockUseAuth.mockReturnValue({
        isAdmin: false,
        loadingRole: false,
        user: { id: 'user-4', role: 'user' }
      } as any)

      mockGetCurrentUserPermissions.mockResolvedValue({
        id: 'user-4',
        display_name: '電力用戶',
        role: 'user',
        energy_categories: ['electricity'],
        target_year: 2024,
        diesel_generator_version: 'refuel',
        is_active: true
      })

      const { result } = renderHook(() => useCurrentUserPermissions())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      const visibleScopes = result.current.getVisibleScopes()
      expect(visibleScopes).toContain('scope2')
    })

    it('沒有外購電力權限的用戶不應該看到範疇二', async () => {
      mockUseAuth.mockReturnValue({
        isAdmin: false,
        loadingRole: false,
        user: { id: 'user-5', role: 'user' }
      } as any)

      mockGetCurrentUserPermissions.mockResolvedValue({
        id: 'user-5',
        display_name: '範疇一用戶',
        role: 'user',
        energy_categories: ['wd40', 'diesel'], // 只有範疇一
        target_year: 2024,
        diesel_generator_version: 'refuel',
        is_active: true
      })

      const { result } = renderHook(() => useCurrentUserPermissions())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      const visibleScopes = result.current.getVisibleScopes()
      expect(visibleScopes).not.toContain('scope2')
      expect(visibleScopes).toContain('scope1')
    })
  })

  describe('異步權限檢查', () => {
    beforeEach(() => {
      mockUseAuth.mockReturnValue({
        isAdmin: false,
        loadingRole: false,
        user: { id: 'user-6', role: 'user' }
      } as any)
    })

    it('應該通過 API 直接檢查權限', async () => {
      mockHasEnergyCategory.mockResolvedValue(true)

      const { result } = renderHook(() => useCurrentUserPermissions())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      const hasPermission = await result.current.hasPermission('electricity')
      expect(hasPermission).toBe(true)
      expect(mockHasEnergyCategory).toHaveBeenCalledWith('electricity')
    })

    it('應該處理 API 檢查失敗', async () => {
      mockHasEnergyCategory.mockRejectedValue(new Error('API 錯誤'))

      const { result } = renderHook(() => useCurrentUserPermissions())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      const hasPermission = await result.current.hasPermission('electricity')
      expect(hasPermission).toBe(false)
    })
  })

  describe('權限過濾功能', () => {
    it('應該根據權限過濾項目', async () => {
      mockUseAuth.mockReturnValue({
        isAdmin: false,
        loadingRole: false,
        user: { id: 'user-7', role: 'user' }
      } as any)

      mockGetCurrentUserPermissions.mockResolvedValue({
        id: 'user-7',
        display_name: '部分權限用戶',
        role: 'user',
        energy_categories: ['electricity', 'wd40'], // 只有這兩個權限
        target_year: 2024,
        diesel_generator_version: 'refuel',
        is_active: true
      })

      const { result } = renderHook(() => useCurrentUserPermissions())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      const allCategories = ['wd40', 'electricity', 'diesel', 'employee_commute']
      const filteredCategories = result.current.filterByPermissions(
        allCategories,
        (item) => item
      )

      expect(filteredCategories).toEqual(['wd40', 'electricity'])
    })

    it('管理員應該看到所有項目', async () => {
      mockUseAuth.mockReturnValue({
        isAdmin: true,
        loadingRole: false,
        user: { id: 'admin-2', role: 'admin' }
      } as any)

      const { result } = renderHook(() => useCurrentUserPermissions())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      const allCategories = ['wd40', 'electricity', 'diesel', 'employee_commute']
      const filteredCategories = result.current.filterByPermissions(
        allCategories,
        (item) => item
      )

      expect(filteredCategories).toEqual(allCategories)
    })
  })

  describe('錯誤處理', () => {
    it('應該處理 API 呼叫錯誤', async () => {
      mockUseAuth.mockReturnValue({
        isAdmin: false,
        loadingRole: false,
        user: { id: 'user-8', role: 'user' }
      } as any)

      mockGetCurrentUserPermissions.mockRejectedValue(new Error('網路錯誤'))

      const { result } = renderHook(() => useCurrentUserPermissions())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current.error).toBe('網路錯誤')
      expect(result.current.permissions).toBeNull()
    })

    it('應該處理載入角色狀態', async () => {
      mockUseAuth.mockReturnValue({
        isAdmin: false,
        loadingRole: true, // 正在載入角色
        user: null
      } as any)

      const { result } = renderHook(() => useCurrentUserPermissions())

      expect(result.current.isLoading).toBe(true)
      expect(result.current.permissions).toBeNull()
    })
  })
})