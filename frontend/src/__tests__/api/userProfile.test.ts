import { describe, it, expect, beforeEach, vi } from 'vitest'
import { http, HttpResponse } from 'msw'
import { server } from '../setup'
import {
  inferCurrentUserEnergyCategories,
  getCurrentUserDetails,
  getCurrentUserPermissions,
  hasEnergyCategory,
  type UserPermissions
} from '../../api/userProfile'
import { mockUsers } from '../../__mocks__/data/users'

const BASE_URL = 'https://fake-supabase-url.supabase.co'

// Mock supabase client
vi.mock('../../lib/supabaseClient', () => ({
  supabase: {
    from: vi.fn(),
    auth: {
      admin: {
        createUser: vi.fn(),
        updateUserById: vi.fn(),
        deleteUser: vi.fn()
      }
    }
  }
}))

// Mock auth helpers
vi.mock('../../utils/authHelpers', () => ({
  validateAuth: vi.fn(() => Promise.resolve({
    user: { id: 'current-user', role: 'user' },
    error: null
  })),
  handleAPIError: vi.fn((error, message) => {
    const errorMessage = typeof error === 'string' ? error : error?.message || 'Unknown error'
    return new Error(`${message}: ${errorMessage}`)
  })
}))

describe('userProfile API', () => {
  let mockSupabase: any

  beforeEach(async () => {
    vi.clearAllMocks()

    // Get the mocked supabase client
    const { supabase } = await import('../../lib/supabaseClient')
    mockSupabase = supabase
  })

  describe('inferCurrentUserEnergyCategories', () => {
    it('應該成功推斷當前用戶的能源類別', async () => {
      const selectMock = vi.fn(() => ({
        eq: vi.fn(() => Promise.resolve({
          data: [
            { page_key: 'wd40' },
            { page_key: 'diesel' },
            { page_key: 'electricity' }
          ],
          error: null
        }))
      }))

      mockSupabase.from.mockReturnValue({
        select: selectMock
      })

      const result = await inferCurrentUserEnergyCategories()

      expect(result).toBeInstanceOf(Array)
      expect(result).toContain('wd') // 'wd40' 被正則提取為 'wd'
      expect(result).toContain('diesel')
      expect(result).toContain('electricity')
      expect(mockSupabase.from).toHaveBeenCalledWith('energy_entries')
    })

    it('應該去除重複的能源類別', async () => {
      const selectMock = vi.fn(() => ({
        eq: vi.fn(() => Promise.resolve({
          data: [
            { page_key: 'wd40' },
            { page_key: 'wd40' }, // 重複
            { page_key: 'diesel' }
          ],
          error: null
        }))
      }))

      mockSupabase.from.mockReturnValue({
        select: selectMock
      })

      const result = await inferCurrentUserEnergyCategories()
      expect(result).toEqual(['wd', 'diesel'])
      expect(result.length).toBe(2) // 應該去重
    })

    it('應該處理沒有填報記錄的情況', async () => {
      const selectMock = vi.fn(() => ({
        eq: vi.fn(() => Promise.resolve({
          data: [],
          error: null
        }))
      }))

      mockSupabase.from.mockReturnValue({
        select: selectMock
      })

      const result = await inferCurrentUserEnergyCategories()
      expect(result).toEqual([])
    })

    it('應該處理查詢失敗並返回空陣列', async () => {
      const selectMock = vi.fn(() => ({
        eq: vi.fn(() => Promise.resolve({
          data: null,
          error: { message: 'Database error' }
        }))
      }))

      mockSupabase.from.mockReturnValue({
        select: selectMock
      })

      const result = await inferCurrentUserEnergyCategories()
      expect(result).toEqual([])
    })

    it('應該處理無效的認證', async () => {
      const { validateAuth } = await import('../../utils/authHelpers')
      vi.mocked(validateAuth).mockResolvedValueOnce({
        user: null,
        error: new Error('Unauthorized')
      })

      const result = await inferCurrentUserEnergyCategories()
      expect(result).toEqual([])
    })
  })

  describe('getCurrentUserDetails', () => {
    it('應該成功取得當前用戶詳細資料', async () => {
      const selectMock = vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(() => Promise.resolve({
            data: mockUsers[0],
            error: null
          }))
        }))
      }))

      mockSupabase.from.mockReturnValue({
        select: selectMock
      })

      const result = await getCurrentUserDetails()

      expect(result).not.toBeNull()
      expect(result?.id).toBe(mockUsers[0].id)
      expect(result).toHaveProperty('display_name')
      expect(result).toHaveProperty('email')
      expect(mockSupabase.from).toHaveBeenCalledWith('profiles')
    })

    it('應該處理用戶不存在的情況', async () => {
      const selectMock = vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(() => Promise.resolve({
            data: null,
            error: { code: 'PGRST116' }
          }))
        }))
      }))

      mockSupabase.from.mockReturnValue({
        select: selectMock
      })

      const result = await getCurrentUserDetails()
      expect(result).toBeNull()
    })

    it('應該處理其他資料庫錯誤', async () => {
      const selectMock = vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(() => Promise.resolve({
            data: null,
            error: { message: 'Database error' }
          }))
        }))
      }))

      mockSupabase.from.mockReturnValue({
        select: selectMock
      })

      await expect(getCurrentUserDetails()).rejects.toThrow('無法取得使用者詳細資料')
    })

    it('應該處理無效認證', async () => {
      const { validateAuth } = await import('../../utils/authHelpers')
      vi.mocked(validateAuth).mockResolvedValueOnce({
        user: null,
        error: new Error('Unauthorized')
      })

      await expect(getCurrentUserDetails()).rejects.toThrow('Unauthorized')
    })
  })

  describe('getCurrentUserPermissions', () => {
    it('應該將資料庫格式轉換為前端格式', async () => {
      // Mock getCurrentUserDetails with DB format categories
      const selectMock1 = vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(() => Promise.resolve({
            data: {
              ...mockUsers[0],
              filling_config: {
                energy_categories: ['septic_tank', 'electricity'], // 資料庫格式
                target_year: 2024,
                diesel_generator_mode: 'refuel'
              }
            },
            error: null
          }))
        }))
      }))

      // Mock inferCurrentUserEnergyCategories
      const selectMock2 = vi.fn(() => ({
        eq: vi.fn(() => Promise.resolve({
          data: [],
          error: null
        }))
      }))

      mockSupabase.from
        .mockReturnValueOnce({ select: selectMock1 })
        .mockReturnValueOnce({ select: selectMock2 })

      const result = await getCurrentUserPermissions()

      expect(result).not.toBeNull()
      expect(result).toHaveProperty('energy_categories')

      // 應該轉換為前端格式
      expect(result?.energy_categories).toEqual(['septic_tank', 'electricity_bill'])
      expect(result?.energy_categories).not.toContain('septic_tank')
      expect(result?.energy_categories).not.toContain('electricity')
    })

    it('應該結合基本資料和權限推斷', async () => {
      // Mock getCurrentUserDetails
      const selectMock1 = vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(() => Promise.resolve({
            data: {
              ...mockUsers[0],
              filling_config: {
                energy_categories: ['wd40', 'diesel'],
                target_year: 2024,
                diesel_generator_mode: 'refuel'
              }
            },
            error: null
          }))
        }))
      }))

      // Mock inferCurrentUserEnergyCategories (second call)
      const selectMock2 = vi.fn(() => ({
        eq: vi.fn(() => Promise.resolve({
          data: [{ page_key: 'acetylene' }],
          error: null
        }))
      }))

      mockSupabase.from
        .mockReturnValueOnce({ select: selectMock1 })  // First call for user details
        .mockReturnValueOnce({ select: selectMock2 })  // Second call for entries

      const result = await getCurrentUserPermissions()

      expect(result).not.toBeNull()
      expect(result).toHaveProperty('energy_categories')
      expect(result).toHaveProperty('target_year')
      expect(result).toHaveProperty('diesel_generator_version')

      // 應該使用 filling_config 中的權限，而不是推斷權限
      expect(result?.energy_categories).toEqual(['wd40', 'diesel'])
      expect(result?.target_year).toBe(2024)
      expect(result?.diesel_generator_version).toBe('refuel')
    })

    it('應該在沒有 filling_config 時使用推斷權限', async () => {
      // Mock getCurrentUserDetails - no filling_config
      const selectMock1 = vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(() => Promise.resolve({
            data: {
              ...mockUsers[0],
              filling_config: null
            },
            error: null
          }))
        }))
      }))

      // Mock inferCurrentUserEnergyCategories
      const selectMock2 = vi.fn(() => ({
        eq: vi.fn(() => Promise.resolve({
          data: [
            { page_key: 'wd40' },
            { page_key: 'diesel' }
          ],
          error: null
        }))
      }))

      mockSupabase.from
        .mockReturnValueOnce({ select: selectMock1 })
        .mockReturnValueOnce({ select: selectMock2 })

      const result = await getCurrentUserPermissions()

      expect(result).not.toBeNull()
      // 應該使用推斷的權限
      expect(result?.energy_categories).toEqual(['wd', 'diesel'])
      // 預設值
      expect(result?.target_year).toBe(new Date().getFullYear())
      expect(result?.diesel_generator_version).toBe('refuel')
    })

    it('應該處理用戶不存在的情況', async () => {
      const selectMock = vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(() => Promise.resolve({
            data: null,
            error: { code: 'PGRST116' }
          }))
        }))
      }))

      mockSupabase.from
        .mockReturnValueOnce({ select: selectMock })  // User details call
        .mockReturnValue({ select: vi.fn() })         // Infer categories call (won't be reached)

      const result = await getCurrentUserPermissions()
      expect(result).toBeNull()
    })

    it('應該保持不需要轉換的類別不變', async () => {
      // Mock getCurrentUserDetails with mixed categories
      const selectMock1 = vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(() => Promise.resolve({
            data: {
              ...mockUsers[0],
              filling_config: {
                energy_categories: ['wd40', 'septic_tank', 'natural_gas', 'electricity'], // 混合格式
                target_year: 2024,
                diesel_generator_mode: 'refuel'
              }
            },
            error: null
          }))
        }))
      }))

      const selectMock2 = vi.fn(() => ({
        eq: vi.fn(() => Promise.resolve({
          data: [],
          error: null
        }))
      }))

      mockSupabase.from
        .mockReturnValueOnce({ select: selectMock1 })
        .mockReturnValueOnce({ select: selectMock2 })

      const result = await getCurrentUserPermissions()

      expect(result).not.toBeNull()
      expect(result?.energy_categories).toEqual(['wd40', 'septic_tank', 'natural_gas', 'electricity_bill'])

      // 檢查轉換是否正確
      expect(result?.energy_categories).toContain('wd40') // 不需要轉換
      expect(result?.energy_categories).toContain('septic_tank') // septic_tank → septic_tank
      expect(result?.energy_categories).toContain('natural_gas') // 不需要轉換
      expect(result?.energy_categories).toContain('electricity_bill') // electricity → electricity_bill

      // 檢查原始的資料庫格式不存在
      expect(result?.energy_categories).not.toContain('septic_tank')
      expect(result?.energy_categories).not.toContain('electricity')
    })

    it('應該處理錯誤情況', async () => {
      const { validateAuth } = await import('../../utils/authHelpers')
      vi.mocked(validateAuth).mockRejectedValueOnce(new Error('Auth failed'))

      // The function rethrows Error instances directly, so we should expect the original error
      await expect(getCurrentUserPermissions()).rejects.toThrow('Auth failed')
    })
  })

  describe('hasEnergyCategory', () => {
    it('應該正確檢查能源類別權限', async () => {
      // Mock getCurrentUserPermissions call chain
      const selectMock1 = vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(() => Promise.resolve({
            data: {
              ...mockUsers[0],
              filling_config: {
                energy_categories: ['wd40', 'diesel', 'electricity'] // 資料庫格式
              }
            },
            error: null
          }))
        }))
      }))

      const selectMock2 = vi.fn(() => ({
        eq: vi.fn(() => Promise.resolve({
          data: [],
          error: null
        }))
      }))

      mockSupabase.from
        .mockReturnValueOnce({ select: selectMock1 })
        .mockReturnValueOnce({ select: selectMock2 })

      const hasWd40 = await hasEnergyCategory('wd40')
      expect(hasWd40).toBe(true)

      // Reset mocks for second call
      mockSupabase.from
        .mockReturnValueOnce({ select: selectMock1 })
        .mockReturnValueOnce({ select: selectMock2 })

      const hasGasoline = await hasEnergyCategory('gasoline')
      expect(hasGasoline).toBe(false)
    })

    it('應該正確檢查前端格式的權限', async () => {
      // Mock getCurrentUserPermissions call chain with DB format
      const selectMock1 = vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(() => Promise.resolve({
            data: {
              ...mockUsers[0],
              filling_config: {
                energy_categories: ['septic_tank', 'electricity'] // 資料庫格式
              }
            },
            error: null
          }))
        }))
      }))

      const selectMock2 = vi.fn(() => ({
        eq: vi.fn(() => Promise.resolve({
          data: [],
          error: null
        }))
      }))

      mockSupabase.from
        .mockReturnValueOnce({ select: selectMock1 })
        .mockReturnValueOnce({ select: selectMock2 })

      // 檢查前端格式的權限
      const hasSeptictank = await hasEnergyCategory('septic_tank')
      expect(hasSeptictank).toBe(true)

      // Reset mocks for second call
      mockSupabase.from
        .mockReturnValueOnce({ select: selectMock1 })
        .mockReturnValueOnce({ select: selectMock2 })

      const hasElectricityBill = await hasEnergyCategory('electricity_bill')
      expect(hasElectricityBill).toBe(true)

      // Reset mocks for third call - 檢查原始資料庫格式應該檢查失敗
      mockSupabase.from
        .mockReturnValueOnce({ select: selectMock1 })
        .mockReturnValueOnce({ select: selectMock2 })

      const hasElectricity = await hasEnergyCategory('electricity')
      expect(hasElectricity).toBe(false) // 應該找不到，因為已經轉換成 electricity_bill
    })

    it('應該處理用戶沒有能源類別權限的情況', async () => {
      const selectMock1 = vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(() => Promise.resolve({
            data: {
              ...mockUsers[0],
              filling_config: {
                energy_categories: []
              }
            },
            error: null
          }))
        }))
      }))

      const selectMock2 = vi.fn(() => ({
        eq: vi.fn(() => Promise.resolve({
          data: [],
          error: null
        }))
      }))

      mockSupabase.from
        .mockReturnValueOnce({ select: selectMock1 })
        .mockReturnValueOnce({ select: selectMock2 })

      const result = await hasEnergyCategory('wd40')
      expect(result).toBe(false)
    })

    it('應該處理用戶不存在的情況', async () => {
      const selectMock = vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(() => Promise.resolve({
            data: null,
            error: { code: 'PGRST116' }
          }))
        }))
      }))

      mockSupabase.from.mockReturnValue({ select: selectMock })

      const result = await hasEnergyCategory('wd40')
      expect(result).toBe(false)
    })

    it('應該在發生錯誤時預設為無權限', async () => {
      const { validateAuth } = await import('../../utils/authHelpers')
      vi.mocked(validateAuth).mockRejectedValueOnce(new Error('Auth failed'))

      const result = await hasEnergyCategory('wd40')
      expect(result).toBe(false)
    })
  })
})