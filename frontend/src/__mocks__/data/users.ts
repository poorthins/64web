import { UserProfile } from '../../api/adminUsers'

export const mockUsers: UserProfile[] = [
  {
    id: 'user-1',
    display_name: '王小明',
    role: 'user',
    is_active: true,
    email: 'ming.wang@company.com',
    company: '示例科技有限公司',
    job_title: '研發工程師',
    phone: '0912345678',
    filling_config: {
      energy_categories: ['wd40', 'diesel', 'electricity'],
      target_year: 2024,
      diesel_generator_mode: 'refuel'
    }
  },
  {
    id: 'user-2',
    display_name: '李美華',
    role: 'user',
    is_active: true,
    email: 'meihua.li@company.com',
    company: '綠能科技股份有限公司',
    job_title: '環境工程師',
    phone: '0923456789',
    filling_config: {
      energy_categories: ['natural_gas', 'employee_commute'],
      target_year: 2024,
      diesel_generator_mode: 'test'
    }
  },
  {
    id: 'user-3',
    display_name: '張志豪',
    role: 'user',
    is_active: false,
    email: 'zhihao.zhang@company.com',
    company: '永續發展企業',
    job_title: '碳管理專員',
    phone: '0934567890',
    filling_config: {
      energy_categories: ['acetylene', 'lpg', 'fire_extinguisher'],
      target_year: 2024,
      diesel_generator_mode: 'refuel'
    }
  },
  {
    id: 'admin-1',
    display_name: '系統管理員',
    role: 'admin',
    is_active: true,
    email: 'admin@company.com',
    company: '管理公司',
    job_title: '系統管理員',
    phone: '0900000000',
    filling_config: {
      energy_categories: [], // 管理員不需要配置，程式碼中會給予全部權限
      target_year: 2024,
      diesel_generator_mode: 'refuel'
    }
  },
  {
    id: 'user-winnie',
    display_name: 'Winnie',
    role: 'user',
    is_active: true,
    email: 'winnie@company.com',
    company: '測試公司',
    job_title: '測試專員',
    phone: '0945678901',
    filling_config: {
      // Winnie 有 13/14 權限，沒有 wd40
      energy_categories: [
        'acetylene', 'refrigerant', 'septic_tank', 'natural_gas', 'urea',
        'diesel_generator', 'diesel', 'gasoline', 'lpg', 'fire_extinguisher',
        'welding_rod', 'electricity', 'employee_commute'
      ],
      target_year: 2024,
      diesel_generator_mode: 'refuel'
    }
  },
  {
    id: 'user-no-scope2',
    display_name: '無範疇二權限用戶',
    role: 'user',
    is_active: true,
    email: 'no-scope2@company.com',
    company: '測試公司',
    job_title: '測試專員',
    phone: '0956789012',
    filling_config: {
      // 只有範疇一和三的權限，沒有範疇二
      energy_categories: ['wd40', 'diesel', 'employee_commute'],
      target_year: 2024,
      diesel_generator_mode: 'refuel'
    }
  },
  {
    id: 'user-no-permissions',
    display_name: '無權限用戶',
    role: 'user',
    is_active: true,
    email: 'no-permissions@company.com',
    company: '測試公司',
    job_title: '測試專員',
    phone: '0967890123',
    filling_config: {
      energy_categories: [], // 完全沒有權限
      target_year: 2024,
      diesel_generator_mode: 'refuel'
    }
  }
]

export const mockUser = mockUsers[0]

export const mockUserWithPermissions = {
  ...mockUser,
  energy_categories: mockUser.filling_config?.energy_categories || [],
  target_year: mockUser.filling_config?.target_year || 2024,
  diesel_generator_version: mockUser.filling_config?.diesel_generator_mode || 'refuel'
}

// 特定測試場景的用戶
export const mockAdmin = mockUsers.find(u => u.id === 'admin-1')!
export const mockWinnieUser = mockUsers.find(u => u.id === 'user-winnie')!
export const mockNoScope2User = mockUsers.find(u => u.id === 'user-no-scope2')!
export const mockNoPermissionsUser = mockUsers.find(u => u.id === 'user-no-permissions')!

// 創建測試用戶的工廠函數
export const createMockUser = (overrides: Partial<UserProfile> = {}): UserProfile => ({
  id: `user-${Date.now()}`,
  display_name: 'Test User',
  role: 'user',
  is_active: true,
  email: 'test@example.com',
  company: 'Test Company',
  job_title: 'Test Position',
  phone: '0912345678',
  filling_config: {
    energy_categories: ['wd40', 'diesel'],
    target_year: 2024,
    diesel_generator_mode: 'refuel'
  },
  ...overrides
})

// 模擬 API 響應數據
export const mockApiResponse = {
  success: {
    data: mockUsers,
    error: null
  },
  error: {
    data: null,
    error: {
      message: 'Database connection failed',
      code: 'DATABASE_ERROR',
      details: null
    }
  }
}