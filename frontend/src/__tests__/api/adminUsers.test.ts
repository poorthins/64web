import { describe, it, expect, beforeEach, vi } from 'vitest'
import { http, HttpResponse } from 'msw'
import { server } from '../setup'
import {
  listUsers,
  countEntriesByOwner,
  combineUsersWithCounts,
  getUserById,
  updateUserStatus,
  bulkUpdateUserStatus,
  updateUser,
  createUser,
  deleteUser,
  inferUserEnergyCategories,
  getUserDetails,
  getUserWithPermissions,
  type UserProfile,
  type UserUpdateData,
  type CreateUserData
} from '../../api/adminUsers'
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
    user: { id: 'admin-1', role: 'admin' },
    error: null
  })),
  handleAPIError: vi.fn((error, message) => {
    const errorMessage = typeof error === 'string' ? error : error?.message || 'Unknown error'
    return new Error(`${message}: ${errorMessage}`)
  })
}))

describe('adminUsers API', () => {
  let mockSupabase: any

  beforeEach(async () => {
    vi.clearAllMocks()

    // Get the mocked supabase client
    const { supabase } = await import('../../lib/supabaseClient')
    mockSupabase = supabase
  })

  describe('listUsers', () => {
    it('應該成功取得用戶列表', async () => {
      // Mock the query chain properly
      const selectMock = vi.fn(() => ({
        eq: vi.fn(() => Promise.resolve({
          data: mockUsers.filter(u => u.role === 'user'),
          error: null
        }))
      }))

      mockSupabase.from.mockReturnValue({
        select: selectMock
      })

      const result = await listUsers()

      expect(result).toBeInstanceOf(Array)
      expect(mockSupabase.from).toHaveBeenCalledWith('profiles')
    })

    it('應該處理錯誤情況', async () => {
      const selectMock = vi.fn(() => ({
        eq: vi.fn(() => Promise.resolve({
          data: null,
          error: { message: 'Database error' }
        }))
      }))

      mockSupabase.from.mockReturnValue({
        select: selectMock
      })

      await expect(listUsers()).rejects.toThrow('無法取得使用者列表')
    })

    it('應該回傳空陣列當資料為空時', async () => {
      const selectMock = vi.fn(() => ({
        eq: vi.fn(() => Promise.resolve({
          data: [],
          error: null
        }))
      }))

      mockSupabase.from.mockReturnValue({
        select: selectMock
      })

      const result = await listUsers()
      expect(result).toEqual([])
    })
  })

  describe('countEntriesByOwner', () => {
    it('應該正確統計填報筆數', async () => {
      const selectMock = vi.fn(() => Promise.resolve({
        data: [
          { owner_id: 'user-1' },
          { owner_id: 'user-1' },
          { owner_id: 'user-2' },
          { owner_id: 'user-3' }
        ],
        error: null
      }))

      mockSupabase.from.mockReturnValue({
        select: selectMock
      })

      const result = await countEntriesByOwner()

      expect(result).toBeInstanceOf(Map)
      expect(result.get('user-1')).toBe(2)
      expect(result.get('user-2')).toBe(1)
      expect(result.get('user-3')).toBe(1)
    })

    it('應該過濾空的 owner_id', async () => {
      const selectMock = vi.fn(() => Promise.resolve({
        data: [
          { owner_id: 'user-1' },
          { owner_id: null },
          { owner_id: '' },
          { owner_id: 'user-1' }
        ],
        error: null
      }))

      mockSupabase.from.mockReturnValue({
        select: selectMock
      })

      const result = await countEntriesByOwner()
      expect(result.get('user-1')).toBe(2)
      expect(result.has('')).toBe(false)
    })
  })

  describe('updateUserStatus', () => {
    it('應該成功更新用戶狀態', async () => {
      const updateMock = vi.fn(() => ({
        eq: vi.fn(() => Promise.resolve({ error: null }))
      }))

      mockSupabase.from.mockReturnValue({
        update: updateMock
      })

      await updateUserStatus('user-1', true)

      expect(updateMock).toHaveBeenCalledWith({ is_active: true })
    })

    it('應該處理更新失敗', async () => {
      const updateMock = vi.fn(() => ({
        eq: vi.fn(() => Promise.resolve({
          error: { message: 'Update failed' }
        }))
      }))

      mockSupabase.from.mockReturnValue({
        update: updateMock
      })

      await expect(updateUserStatus('user-1', false)).rejects.toThrow('無法更新使用者狀態')
    })
  })

  describe('createUser', () => {
    it('應該成功創建新用戶', async () => {
      // Mock auth.admin.createUser
      mockSupabase.auth.admin.createUser.mockResolvedValue({
        data: { user: { id: 'new-user-id', email: 'test@example.com' } },
        error: null
      })

      // Mock profiles insert
      const insertMock = vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn(() => Promise.resolve({
            data: { ...mockUsers[0], id: 'new-user-id', email: 'test@example.com' },
            error: null
          }))
        }))
      }))

      mockSupabase.from.mockReturnValue({
        insert: insertMock
      })

      const userData: CreateUserData = {
        email: 'test@example.com',
        password: 'password123',
        display_name: '測試用戶',
        company: '測試公司'
      }

      const result = await createUser(userData)

      expect(result).toHaveProperty('id')
      expect(result.email).toBe('test@example.com')
      expect(mockSupabase.auth.admin.createUser).toHaveBeenCalled()
    })

    it('應該處理創建失敗', async () => {
      mockSupabase.auth.admin.createUser.mockResolvedValue({
        data: null,
        error: { message: 'Email already exists' }
      })

      const userData: CreateUserData = {
        email: 'existing@example.com',
        password: 'password123',
        display_name: '測試用戶'
      }

      await expect(createUser(userData)).rejects.toThrow('無法建立使用者帳號')
    })
  })

  describe('deleteUser', () => {
    it('應該成功刪除用戶', async () => {
      const deleteMock = vi.fn(() => ({
        eq: vi.fn(() => Promise.resolve({ error: null }))
      }))

      mockSupabase.from.mockReturnValue({
        delete: deleteMock
      })

      mockSupabase.auth.admin.deleteUser.mockResolvedValue({ error: null })

      await deleteUser('user-1')

      expect(deleteMock).toHaveBeenCalled()
      expect(mockSupabase.auth.admin.deleteUser).toHaveBeenCalledWith('user-1')
    })
  })

  describe('getUserById', () => {
    it('應該取得單一用戶資料', async () => {
      // Mock profile query
      const selectMock1 = vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(() => Promise.resolve({
            data: mockUsers[0],
            error: null
          }))
        }))
      }))

      // Mock entries count query
      const selectMock2 = vi.fn(() => ({
        eq: vi.fn(() => Promise.resolve({
          count: 5,
          error: null
        }))
      }))

      mockSupabase.from
        .mockReturnValueOnce({ select: selectMock1 })  // First call for profile
        .mockReturnValueOnce({ select: selectMock2 })  // Second call for count

      const result = await getUserById('user-1')

      expect(result).not.toBeNull()
      expect(result?.id).toBe('user-1')
      expect(result?.entries_count).toBe(5)
    })

    it('應該處理用戶不存在', async () => {
      const selectMock = vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(() => Promise.resolve({
            data: null,
            error: { message: 'Not found' }
          }))
        }))
      }))

      mockSupabase.from.mockReturnValue({
        select: selectMock
      })

      await expect(getUserById('non-existent')).rejects.toThrow('無法取得使用者資料')
    })
  })

  describe('inferUserEnergyCategories', () => {
    it('應該從填報記錄推斷能源類別', async () => {
      const selectMock = vi.fn(() => ({
        eq: vi.fn(() => Promise.resolve({
          data: [
            { page_key: 'wd40' },
            { page_key: 'diesel' },
            { page_key: 'electricity_bill' }
          ],
          error: null
        }))
      }))

      mockSupabase.from.mockReturnValue({
        select: selectMock
      })

      const result = await inferUserEnergyCategories('user-1')

      expect(result).toBeInstanceOf(Array)
      expect(result).toContain('wd')  // The regex extracts 'wd' from 'wd40'
      expect(result).toContain('diesel')
      expect(result).toContain('electricity_bill')
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

      const result = await inferUserEnergyCategories('user-1')
      expect(result).toEqual([])
    })
  })

  describe('getUserDetails', () => {
    it('應該取得用戶詳細資料', async () => {
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

      const result = await getUserDetails('user-1')

      expect(result).not.toBeNull()
      expect(result?.id).toBe('user-1')
    })

    it('應該處理用戶不存在', async () => {
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

      const result = await getUserDetails('non-existent')
      expect(result).toBeNull()
    })
  })
})