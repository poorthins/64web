import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import Sidebar from '../../components/Sidebar'
import { NavigationProvider } from '../../contexts/NavigationContext'
import { ALL_ENERGY_CATEGORIES } from '../../utils/energyCategories'

// Mock contexts and hooks
vi.mock('../../contexts/AuthContext', () => ({
  useAuth: vi.fn()
}))

vi.mock('../../hooks/useCurrentUserPermissions', () => ({
  useCurrentUserPermissions: vi.fn()
}))

vi.mock('../../contexts/NavigationContext', () => ({
  NavigationProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  useNavigation: vi.fn(() => ({ selectItem: vi.fn() }))
}))

// Mock react-router-dom
const mockNavigate = vi.fn()
const mockLocation = { pathname: '/app' }

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useLocation: () => mockLocation,
    BrowserRouter: ({ children }: { children: React.ReactNode }) => <div>{children}</div>
  }
})

describe('Sidebar', () => {
  let mockUseAuth: any
  let mockUseCurrentUserPermissions: any

  beforeEach(async () => {
    vi.clearAllMocks()

    const { useAuth } = await import('../../contexts/AuthContext')
    const { useCurrentUserPermissions } = await import('../../hooks/useCurrentUserPermissions')

    mockUseAuth = vi.mocked(useAuth)
    mockUseCurrentUserPermissions = vi.mocked(useCurrentUserPermissions)

    // 預設 mock 返回值
    mockUseAuth.mockReturnValue({
      user: { id: 'user-1' },
      loading: false,
      isAdmin: false,
      role: 'user',
      loadingRole: false
    })

    mockUseCurrentUserPermissions.mockReturnValue({
      permissions: null,
      isLoading: false,
      error: null,
      lastFetch: null,
      refetch: vi.fn(),
      checkEnergyCategory: vi.fn(),
      hasPermission: vi.fn(),
      hasPermissionSync: vi.fn(() => false),
      filterByPermissions: vi.fn((items) => []),
      getVisibleScopes: vi.fn(() => [])
    })
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  const renderSidebar = () => {
    return render(
      <BrowserRouter>
        <NavigationProvider>
          <Sidebar />
        </NavigationProvider>
      </BrowserRouter>
    )
  }

  describe('載入狀態', () => {
    it('角色載入中時應該顯示載入指示器', () => {
      mockUseAuth.mockReturnValue({
        user: { id: 'user-1' },
        loading: false,
        isAdmin: false,
        role: null,
        loadingRole: true // 載入中
      })

      renderSidebar()

      expect(screen.getByText('載入權限中...')).toBeInTheDocument()
    })

    it('權限載入中時應該顯示載入指示器', () => {
      mockUseCurrentUserPermissions.mockReturnValue({
        permissions: null,
        isLoading: true, // 權限載入中
        error: null,
        lastFetch: null,
        refetch: vi.fn(),
        checkEnergyCategory: vi.fn(),
        hasPermission: vi.fn(),
        hasPermissionSync: vi.fn(() => false),
        filterByPermissions: vi.fn((items) => []),
        getVisibleScopes: vi.fn(() => [])
      })

      renderSidebar()

      expect(screen.getByText('載入權限中...')).toBeInTheDocument()
    })
  })

  describe('管理員顯示', () => {
    beforeEach(() => {
      mockUseAuth.mockReturnValue({
        user: { id: 'admin-1' },
        loading: false,
        isAdmin: true,
        role: 'admin',
        loadingRole: false
      })

      mockUseCurrentUserPermissions.mockReturnValue({
        permissions: {
          id: 'admin-1',
          display_name: '系統管理員',
          role: 'admin',
          energy_categories: [...ALL_ENERGY_CATEGORIES],
          target_year: 2024,
          diesel_generator_version: 'refuel'
        },
        isLoading: false,
        error: null,
        lastFetch: new Date(),
        refetch: vi.fn(),
        checkEnergyCategory: vi.fn(() => true),
        hasPermission: vi.fn(() => true),
        hasPermissionSync: vi.fn(() => true), // 管理員對所有類別都有權限
        filterByPermissions: vi.fn((items) => items), // 管理員看到所有項目
        getVisibleScopes: vi.fn(() => ['scope1', 'scope2', 'scope3']) // 管理員看到所有範疇
      })
    })

    it('管理員應該看到所有 3 個範疇', async () => {
      renderSidebar()

      await waitFor(() => {
        expect(screen.getByText('範疇一（直接排放）')).toBeInTheDocument()
        expect(screen.getByText('範疇二（間接排放）')).toBeInTheDocument()
        expect(screen.getByText('範疇三（其他間接）')).toBeInTheDocument()
      })
    })

    it('管理員應該看到管理員模式區塊', async () => {
      renderSidebar()

      await waitFor(() => {
        expect(screen.getByText('管理員模式')).toBeInTheDocument()
        expect(screen.getByText('管理控制台')).toBeInTheDocument()
        expect(screen.getByText('新增用戶')).toBeInTheDocument()
      })
    })

    it('點擊範疇一應該展開並顯示所有類別', async () => {
      renderSidebar()

      await waitFor(() => {
        const scope1Button = screen.getByText('範疇一（直接排放）')
        fireEvent.click(scope1Button)
      })

      // 檢查一些範疇一的項目是否顯示
      await waitFor(() => {
        expect(screen.getByText('WD-40')).toBeInTheDocument()
        expect(screen.getByText('乙炔')).toBeInTheDocument()
        expect(screen.getByText('柴油')).toBeInTheDocument()
      })
    })
  })

  describe('一般用戶顯示', () => {
    beforeEach(() => {
      mockUseAuth.mockReturnValue({
        user: { id: 'user-winnie' },
        loading: false,
        isAdmin: false,
        role: 'user',
        loadingRole: false
      })
    })

    it('有部分權限的用戶應該只看到有權限的範疇和類別', async () => {
      const mockHasPermissionSync = vi.fn((category: string) => {
        // Winnie 有範疇一和三的部分權限，沒有範疇二
        const winniePermissions = ['diesel', 'gasoline', 'employee_commute']
        return winniePermissions.includes(category)
      })

      mockUseCurrentUserPermissions.mockReturnValue({
        permissions: {
          id: 'user-winnie',
          display_name: 'Winnie',
          role: 'user',
          energy_categories: ['diesel', 'gasoline', 'employee_commute'],
          target_year: 2024,
          diesel_generator_version: 'refuel'
        },
        isLoading: false,
        error: null,
        lastFetch: new Date(),
        refetch: vi.fn(),
        checkEnergyCategory: mockHasPermissionSync,
        hasPermission: vi.fn(),
        hasPermissionSync: mockHasPermissionSync,
        filterByPermissions: vi.fn((items, keyGetter) =>
          items.filter(item => mockHasPermissionSync(keyGetter(item)))
        ),
        getVisibleScopes: vi.fn(() => ['scope1', 'scope3']) // 沒有 scope2
      })

      renderSidebar()

      await waitFor(() => {
        // 應該看到範疇一和三
        expect(screen.getByText('範疇一（直接排放）')).toBeInTheDocument()
        expect(screen.getByText('範疇三（其他間接）')).toBeInTheDocument()

        // 不應該看到範疇二
        expect(screen.queryByText('範疇二（間接排放）')).not.toBeInTheDocument()
      })

      // 展開範疇一檢查子項目
      const scope1Button = screen.getByText('範疇一（直接排放）')
      fireEvent.click(scope1Button)

      await waitFor(() => {
        // 應該看到有權限的項目
        expect(screen.getByText('柴油')).toBeInTheDocument()
        expect(screen.getByText('汽油')).toBeInTheDocument()

        // 不應該看到沒權限的項目（這些應該被過濾掉）
        expect(screen.queryByText('WD-40')).not.toBeInTheDocument()
      })
    })

    it('完全沒有權限的用戶應該看到無權限提示', async () => {
      mockUseCurrentUserPermissions.mockReturnValue({
        permissions: {
          id: 'user-no-permissions',
          display_name: '無權限用戶',
          role: 'user',
          energy_categories: [],
          target_year: 2024,
          diesel_generator_version: 'refuel'
        },
        isLoading: false,
        error: null,
        lastFetch: new Date(),
        refetch: vi.fn(),
        checkEnergyCategory: vi.fn(() => false),
        hasPermission: vi.fn(() => false),
        hasPermissionSync: vi.fn(() => false),
        filterByPermissions: vi.fn(() => []),
        getVisibleScopes: vi.fn(() => []) // 沒有可見範疇
      })

      renderSidebar()

      await waitFor(() => {
        expect(screen.getByText('暫無可用的能源類別')).toBeInTheDocument()
        expect(screen.getByText('請聯繫管理員開通權限')).toBeInTheDocument()
      })
    })
  })

  describe('導航功能', () => {
    it('點擊能源類別應該導航到對應頁面', async () => {
      mockUseAuth.mockReturnValue({
        user: { id: 'admin-1' },
        loading: false,
        isAdmin: true,
        role: 'admin',
        loadingRole: false
      })

      mockUseCurrentUserPermissions.mockReturnValue({
        permissions: {
          id: 'admin-1',
          display_name: '系統管理員',
          role: 'admin',
          energy_categories: [...ALL_ENERGY_CATEGORIES],
          target_year: 2024,
          diesel_generator_version: 'refuel'
        },
        isLoading: false,
        error: null,
        lastFetch: new Date(),
        refetch: vi.fn(),
        checkEnergyCategory: vi.fn(() => true),
        hasPermission: vi.fn(() => true),
        hasPermissionSync: vi.fn(() => true),
        filterByPermissions: vi.fn((items) => items),
        getVisibleScopes: vi.fn(() => ['scope1', 'scope2', 'scope3'])
      })

      renderSidebar()

      // 展開範疇一
      await waitFor(() => {
        const scope1Button = screen.getByText('範疇一（直接排放）')
        fireEvent.click(scope1Button)
      })

      // 點擊柴油項目
      await waitFor(() => {
        const dieselButton = screen.getByText('柴油')
        fireEvent.click(dieselButton)
      })

      expect(mockNavigate).toHaveBeenCalledWith('/app/diesel')
    })

    it('點擊管理員功能應該導航到對應頁面', async () => {
      mockUseAuth.mockReturnValue({
        user: { id: 'admin-1' },
        loading: false,
        isAdmin: true,
        role: 'admin',
        loadingRole: false
      })

      mockUseCurrentUserPermissions.mockReturnValue({
        permissions: {
          id: 'admin-1',
          display_name: '系統管理員',
          role: 'admin',
          energy_categories: [...ALL_ENERGY_CATEGORIES],
          target_year: 2024,
          diesel_generator_version: 'refuel'
        },
        isLoading: false,
        error: null,
        lastFetch: new Date(),
        refetch: vi.fn(),
        checkEnergyCategory: vi.fn(() => true),
        hasPermission: vi.fn(() => true),
        hasPermissionSync: vi.fn(() => true),
        filterByPermissions: vi.fn((items) => items),
        getVisibleScopes: vi.fn(() => ['scope1', 'scope2', 'scope3'])
      })

      renderSidebar()

      await waitFor(() => {
        const adminButton = screen.getByText('管理控制台')
        fireEvent.click(adminButton)
      })

      expect(mockNavigate).toHaveBeenCalledWith('/app/admin')
    })

    it('點擊系統標題應該導航到首頁', async () => {
      renderSidebar()

      await waitFor(() => {
        const titleButton = screen.getByText('碳盤查系統')
        fireEvent.click(titleButton)
      })

      expect(mockNavigate).toHaveBeenCalledWith('/app')
    })
  })

  describe('智能範疇隱藏', () => {
    it('只有範疇一權限時，應該隱藏範疇二和三的標題', async () => {
      const mockHasPermissionSync = vi.fn((category: string) => {
        // 只有範疇一的部分權限
        return ['wd40', 'diesel'].includes(category)
      })

      mockUseCurrentUserPermissions.mockReturnValue({
        permissions: {
          id: 'user-scope1-only',
          display_name: '只有範疇一用戶',
          role: 'user',
          energy_categories: ['wd40', 'diesel'],
          target_year: 2024,
          diesel_generator_version: 'refuel'
        },
        isLoading: false,
        error: null,
        lastFetch: new Date(),
        refetch: vi.fn(),
        checkEnergyCategory: mockHasPermissionSync,
        hasPermission: vi.fn(),
        hasPermissionSync: mockHasPermissionSync,
        filterByPermissions: vi.fn((items, keyGetter) =>
          items.filter(item => mockHasPermissionSync(keyGetter(item)))
        ),
        getVisibleScopes: vi.fn(() => ['scope1']) // 只有 scope1 可見
      })

      renderSidebar()

      await waitFor(() => {
        // 應該看到範疇一
        expect(screen.getByText('範疇一（直接排放）')).toBeInTheDocument()

        // 不應該看到範疇二和三的標題
        expect(screen.queryByText('範疇二（間接排放）')).not.toBeInTheDocument()
        expect(screen.queryByText('範疇三（其他間接）')).not.toBeInTheDocument()
      })
    })
  })
})