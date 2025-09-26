import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import { useCurrentUserPermissions, useEnergyPermission } from '../../hooks/useCurrentUserPermissions'
import { mockAdmin, mockWinnieUser, mockNoScope2User, mockNoPermissionsUser } from '../../__mocks__/data/users'
import { ALL_ENERGY_CATEGORIES } from '../../utils/energyCategories'

// Mock AuthContext
vi.mock('../../contexts/AuthContext', () => ({
  useAuth: vi.fn()
}))

// Mock API functions
vi.mock('../../api/userProfile', () => ({
  getCurrentUserPermissions: vi.fn(),
  hasEnergyCategory: vi.fn()
}))

describe('useCurrentUserPermissions', () => {
  let mockUseAuth: any
  let mockGetCurrentUserPermissions: any
  let mockHasEnergyCategory: any

  beforeEach(async () => {
    vi.clearAllMocks()

    const { useAuth } = await import('../../contexts/AuthContext')
    const { getCurrentUserPermissions, hasEnergyCategory } = await import('../../api/userProfile')

    mockUseAuth = vi.mocked(useAuth)
    mockGetCurrentUserPermissions = vi.mocked(getCurrentUserPermissions)
    mockHasEnergyCategory = vi.mocked(hasEnergyCategory)

    // 預設 mock 返回值
    mockUseAuth.mockReturnValue({
      user: null,
      loading: false,
      isAdmin: false,
      role: 'user',
      loadingRole: false
    })
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  describe('管理員權限', () => {
    beforeEach(() => {
      mockUseAuth.mockReturnValue({
        user: { id: 'admin-1' },
        loading: false,
        isAdmin: true,
        role: 'admin',
        loadingRole: false
      })
    })

    it('管理員應該擁有所有能源類別權限', async () => {
      const { result } = renderHook(() => useCurrentUserPermissions())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current.permissions).not.toBeNull()
      expect(result.current.permissions?.energy_categories).toEqual(ALL_ENERGY_CATEGORIES)
      expect(result.current.permissions?.role).toBe('admin')

      // 不應該呼叫 API，因為管理員直接使用本地權限
      expect(mockGetCurrentUserPermissions).not.toHaveBeenCalled()
    })

    it('管理員的所有權限檢查都應該返回 true', async () => {
      const { result } = renderHook(() => useCurrentUserPermissions())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      // 測試各種權限檢查
      expect(result.current.hasPermissionSync('wd40')).toBe(true)
      expect(result.current.hasPermissionSync('electricity')).toBe(true)
      expect(result.current.hasPermissionSync('employee_commute')).toBe(true)
      expect(result.current.hasPermissionSync('non_existent_category')).toBe(true) // 管理員對所有類別都有權限

      // 異步檢查也應該返回 true
      await expect(result.current.hasPermission('wd40')).resolves.toBe(true)
    })

    it('管理員應該看到所有範疇', async () => {
      const { result } = renderHook(() => useCurrentUserPermissions())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      const visibleScopes = result.current.getVisibleScopes()
      expect(visibleScopes).toEqual(['scope1', 'scope2', 'scope3'])
    })

    it('管理員的過濾函數應該返回所有項目', async () => {
      const { result } = renderHook(() => useCurrentUserPermissions())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      const testItems = [
        { id: 1, category: 'wd40' },
        { id: 2, category: 'electricity' },
        { id: 3, category: 'unknown_category' }
      ]

      const filtered = result.current.filterByPermissions(testItems, (item) => item.category)
      expect(filtered).toEqual(testItems) // 管理員看到所有項目
    })
  })

  describe('一般用戶權限', () => {
    beforeEach(() => {
      mockUseAuth.mockReturnValue({
        user: { id: 'user-winnie' },
        loading: false,
        isAdmin: false,
        role: 'user',
        loadingRole: false
      })
    })

    it('應該從 API 獲取用戶權限', async () => {
      const mockPermissions = {
        id: 'user-winnie',
        display_name: 'Winnie',
        role: 'user',
        energy_categories: ['acetylene', 'diesel', 'electricity'], // 沒有 wd40
        target_year: 2024,
        diesel_generator_version: 'refuel'
      }

      mockGetCurrentUserPermissions.mockResolvedValue(mockPermissions)

      const { result } = renderHook(() => useCurrentUserPermissions())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(mockGetCurrentUserPermissions).toHaveBeenCalled()
      expect(result.current.permissions).toEqual(mockPermissions)
    })

    it('應該正確檢查用戶權限', async () => {
      const mockPermissions = {
        id: 'user-winnie',
        display_name: 'Winnie',
        role: 'user',
        energy_categories: ['acetylene', 'diesel', 'electricity'], // 沒有 wd40
        target_year: 2024,
        diesel_generator_version: 'refuel'
      }

      mockGetCurrentUserPermissions.mockResolvedValue(mockPermissions)

      const { result } = renderHook(() => useCurrentUserPermissions())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      // 有權限的類別
      expect(result.current.hasPermissionSync('acetylene')).toBe(true)
      expect(result.current.hasPermissionSync('diesel')).toBe(true)
      expect(result.current.hasPermissionSync('electricity')).toBe(true)

      // 沒有權限的類別
      expect(result.current.hasPermissionSync('wd40')).toBe(false)
      expect(result.current.hasPermissionSync('gasoline')).toBe(false)
    })

    it('應該根據權限過濾項目', async () => {
      const mockPermissions = {
        id: 'user-winnie',
        display_name: 'Winnie',
        role: 'user',
        energy_categories: ['diesel', 'electricity'], // 只有這兩個權限
        target_year: 2024,
        diesel_generator_version: 'refuel'
      }

      mockGetCurrentUserPermissions.mockResolvedValue(mockPermissions)

      const { result } = renderHook(() => useCurrentUserPermissions())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      const testItems = [
        { id: 1, category: 'wd40' },      // 沒有權限
        { id: 2, category: 'diesel' },    // 有權限
        { id: 3, category: 'electricity' } // 有權限
      ]

      const filtered = result.current.filterByPermissions(testItems, (item) => item.category)
      expect(filtered).toEqual([
        { id: 2, category: 'diesel' },
        { id: 3, category: 'electricity' }
      ])
    })

    it('應該正確計算可見範疇', async () => {
      const mockPermissions = {
        id: 'user-no-scope2',
        display_name: '無範疇二權限用戶',
        role: 'user',
        energy_categories: ['wd40', 'diesel', 'employee_commute'], // 範疇一和三，沒有範疇二
        target_year: 2024,
        diesel_generator_version: 'refuel'
      }

      mockGetCurrentUserPermissions.mockResolvedValue(mockPermissions)

      const { result } = renderHook(() => useCurrentUserPermissions())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      const visibleScopes = result.current.getVisibleScopes()
      expect(visibleScopes).toEqual(['scope1', 'scope3']) // 沒有 scope2
    })

    it('無權限用戶應該看不到任何範疇', async () => {
      const mockPermissions = {
        id: 'user-no-permissions',
        display_name: '無權限用戶',
        role: 'user',
        energy_categories: [], // 完全沒有權限
        target_year: 2024,
        diesel_generator_version: 'refuel'
      }

      mockGetCurrentUserPermissions.mockResolvedValue(mockPermissions)

      const { result } = renderHook(() => useCurrentUserPermissions())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      const visibleScopes = result.current.getVisibleScopes()
      expect(visibleScopes).toEqual([])
    })
  })

  describe('載入狀態處理', () => {
    it('角色載入中時應該顯示載入狀態', () => {
      mockUseAuth.mockReturnValue({
        user: { id: 'user-1' },
        loading: false,
        isAdmin: false,
        role: null,
        loadingRole: true // 角色載入中
      })

      const { result } = renderHook(() => useCurrentUserPermissions())

      expect(result.current.isLoading).toBe(true)
    })

    it('用戶認證載入中時的行為', () => {
      mockUseAuth.mockReturnValue({
        user: null,
        loading: true, // 認證載入中
        isAdmin: false,
        role: null,
        loadingRole: false
      })

      const { result } = renderHook(() => useCurrentUserPermissions())

      // 應該不會嘗試獲取權限，因為用戶還在載入中
      expect(mockGetCurrentUserPermissions).not.toHaveBeenCalled()
    })
  })

  describe('錯誤處理', () => {
    beforeEach(() => {
      mockUseAuth.mockReturnValue({
        user: { id: 'user-1' },
        loading: false,
        isAdmin: false,
        role: 'user',
        loadingRole: false
      })
    })

    it('API 錯誤時應該設置錯誤狀態', async () => {
      const errorMessage = '無法取得用戶權限'
      mockGetCurrentUserPermissions.mockRejectedValue(new Error(errorMessage))

      const { result } = renderHook(() => useCurrentUserPermissions())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current.error).toBe(errorMessage)
      expect(result.current.permissions).toBeNull()
    })

    it('異步權限檢查錯誤時應該返回 false', async () => {
      mockGetCurrentUserPermissions.mockResolvedValue(null) // 沒有權限資料
      mockHasEnergyCategory.mockRejectedValue(new Error('API 錯誤'))

      const { result } = renderHook(() => useCurrentUserPermissions())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      // 異步檢查應該降級到 API，但 API 錯誤時返回 false
      await expect(result.current.hasPermission('wd40')).resolves.toBe(false)
    })
  })

  describe('快取機制', () => {
    beforeEach(() => {
      mockUseAuth.mockReturnValue({
        user: { id: 'user-1' },
        loading: false,
        isAdmin: false,
        role: 'user',
        loadingRole: false
      })
    })

    it('refetch 應該強制重新獲取權限', async () => {
      const mockPermissions = {
        id: 'user-1',
        display_name: 'Test User',
        role: 'user',
        energy_categories: ['wd40'],
        target_year: 2024,
        diesel_generator_version: 'refuel'
      }

      mockGetCurrentUserPermissions.mockResolvedValue(mockPermissions)

      const { result } = renderHook(() => useCurrentUserPermissions())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(mockGetCurrentUserPermissions).toHaveBeenCalledTimes(1)

      // 呼叫 refetch
      await act(async () => {
        await result.current.refetch()
      })

      expect(mockGetCurrentUserPermissions).toHaveBeenCalledTimes(2)
    })
  })
})

describe('useEnergyPermission', () => {
  let mockUseAuth: any

  beforeEach(async () => {
    vi.clearAllMocks()

    const { useAuth } = await import('../../contexts/AuthContext')
    mockUseAuth = vi.mocked(useAuth)
  })

  it('應該正確返回單個能源類別的權限', async () => {
    mockUseAuth.mockReturnValue({
      user: { id: 'admin-1' },
      loading: false,
      isAdmin: true,
      role: 'admin',
      loadingRole: false
    })

    const { result } = renderHook(() => useEnergyPermission('wd40'))

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.hasPermission).toBe(true) // 管理員有權限
  })

  it('一般用戶應該根據實際權限返回結果', async () => {
    mockUseAuth.mockReturnValue({
      user: { id: 'user-1' },
      loading: false,
      isAdmin: false,
      role: 'user',
      loadingRole: false
    })

    const mockGetCurrentUserPermissions = await import('../../api/userProfile')
    vi.mocked(mockGetCurrentUserPermissions.getCurrentUserPermissions).mockResolvedValue({
      id: 'user-1',
      display_name: 'Test User',
      role: 'user',
      energy_categories: ['diesel'], // 沒有 wd40
      target_year: 2024,
      diesel_generator_version: 'refuel'
    })

    const { result } = renderHook(() => useEnergyPermission('wd40'))

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.hasPermission).toBe(false) // 沒有 wd40 權限
  })

  describe('雙向格式支援', () => {
    it('應該支援資料庫格式檢查前端格式權限', async () => {
      // 設定用戶有前端格式的權限
      const mockPermissions = {
        id: 'user-frontend-format',
        display_name: '前端格式權限用戶',
        role: 'user',
        energy_categories: ['septictank', 'electricity_bill'], // 前端格式
        target_year: 2024,
        diesel_generator_version: 'refuel'
      }

      mockUseAuth.mockReturnValue({
        user: { id: 'user-frontend-format' },
        loading: false,
        isAdmin: false,
        role: 'user',
        loadingRole: false
      })

      mockGetCurrentUserPermissions.mockResolvedValue(mockPermissions)

      const { result } = renderHook(() => useCurrentUserPermissions())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      // 使用資料庫格式檢查應該能找到對應的前端格式權限
      expect(result.current.hasPermissionSync('septic_tank')).toBe(true) // DB格式 → 前端格式
      expect(result.current.hasPermissionSync('electricity')).toBe(true) // DB格式 → 前端格式

      // 直接使用前端格式檢查也應該正常
      expect(result.current.hasPermissionSync('septictank')).toBe(true)
      expect(result.current.hasPermissionSync('electricity_bill')).toBe(true)

      // 沒有權限的項目應該返回 false
      expect(result.current.hasPermissionSync('wd40')).toBe(false)
    })

    it('應該支援前端格式檢查資料庫格式權限', async () => {
      // 設定用戶有資料庫格式的權限
      const mockPermissions = {
        id: 'user-db-format',
        display_name: '資料庫格式權限用戶',
        role: 'user',
        energy_categories: ['septic_tank', 'electricity'], // 資料庫格式
        target_year: 2024,
        diesel_generator_version: 'refuel'
      }

      mockUseAuth.mockReturnValue({
        user: { id: 'user-db-format' },
        loading: false,
        isAdmin: false,
        role: 'user',
        loadingRole: false
      })

      mockGetCurrentUserPermissions.mockResolvedValue(mockPermissions)

      const { result } = renderHook(() => useCurrentUserPermissions())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      // 使用前端格式檢查應該能找到對應的資料庫格式權限
      expect(result.current.hasPermissionSync('septictank')).toBe(true) // 前端格式 → DB格式
      expect(result.current.hasPermissionSync('electricity_bill')).toBe(true) // 前端格式 → DB格式

      // 直接使用資料庫格式檢查也應該正常
      expect(result.current.hasPermissionSync('septic_tank')).toBe(true)
      expect(result.current.hasPermissionSync('electricity')).toBe(true)

      // 沒有權限的項目應該返回 false
      expect(result.current.hasPermissionSync('wd40')).toBe(false)
    })

    it('不需要轉換的類別應該正常工作', async () => {
      const mockPermissions = {
        id: 'user-mixed',
        display_name: '混合格式用戶',
        role: 'user',
        energy_categories: ['wd40', 'natural_gas', 'septictank'], // 混合：普通 + 前端格式
        target_year: 2024,
        diesel_generator_version: 'refuel'
      }

      mockUseAuth.mockReturnValue({
        user: { id: 'user-mixed' },
        loading: false,
        isAdmin: false,
        role: 'user',
        loadingRole: false
      })

      mockGetCurrentUserPermissions.mockResolvedValue(mockPermissions)

      const { result } = renderHook(() => useCurrentUserPermissions())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      // 不需要轉換的類別應該正常
      expect(result.current.hasPermissionSync('wd40')).toBe(true)
      expect(result.current.hasPermissionSync('natural_gas')).toBe(true)

      // 前端格式應該正常
      expect(result.current.hasPermissionSync('septictank')).toBe(true)

      // 對應的資料庫格式也應該能檢查到
      expect(result.current.hasPermissionSync('septic_tank')).toBe(true)

      // 沒有的權限應該返回 false
      expect(result.current.hasPermissionSync('electricity')).toBe(false)
      expect(result.current.hasPermissionSync('electricity_bill')).toBe(false)
    })
  })
})