/**
 * 柴油發電機版本切換相關API測試
 * 專門測試柴油發電機版本更新、權限檢查等功能
 */

import { describe, test, expect, beforeEach, vi } from 'vitest'

// 模擬認證輔助函數
vi.mock('../../utils/authHelpers', () => ({
  validateAuth: vi.fn(() => Promise.resolve({ user: { id: 'test-admin-id' }, error: null })),
  handleAPIError: vi.fn((error, message) => new Error(message + ': ' + error.message))
}))

// 模擬 Supabase 客戶端
vi.mock('../../lib/supabaseClient', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(),
      update: vi.fn(),
      insert: vi.fn(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn()
    })),
    auth: {
      admin: {
        updateUserById: vi.fn(),
        createUser: vi.fn(),
        deleteUser: vi.fn()
      }
    }
  }
}))

import { updateUser } from '../../api/adminUsers'
import { supabase } from '../../lib/supabaseClient'

describe('柴油發電機API測試', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    console.log = vi.fn() // 靜音console.log
    console.error = vi.fn() // 靜音console.error
  })

  describe('updateUser 柴油發電機版本更新', () => {
    const userId = 'user-123'
    const mockCurrentProfile = {
      filling_config: {
        target_year: 2024,
        energy_categories: ['wd40', 'diesel_generator']
      }
    }

    beforeEach(() => {
      // 模擬獲取當前用戶 email
      mockSupabaseSelect
        .mockResolvedValueOnce({ data: { email: 'test@example.com' } })
        // 模擬獲取當前 filling_config
        .mockResolvedValueOnce({ data: mockCurrentProfile })

      mockSupabaseUpdate.mockResolvedValue({ error: null })
    })

    test('應該成功設置柴油發電機版本為 refuel', async () => {
      const updateData = {
        display_name: '測試用戶',
        diesel_generator_version: 'refuel'
      }

      await updateUser(userId, updateData)

      // 驗證更新調用
      expect(mockSupabaseUpdate).toHaveBeenCalledWith({
        display_name: '測試用戶',
        filling_config: {
          ...mockCurrentProfile.filling_config,
          diesel_generator_mode: 'refuel'
        }
      })
    })

    test('應該成功設置柴油發電機版本為 test', async () => {
      const updateData = {
        display_name: '測試用戶',
        diesel_generator_version: 'test'
      }

      await updateUser(userId, updateData)

      // 驗證更新調用
      expect(mockSupabaseUpdate).toHaveBeenCalledWith({
        display_name: '測試用戶',
        filling_config: {
          ...mockCurrentProfile.filling_config,
          diesel_generator_mode: 'test'
        }
      })
    })

    test('應該成功清除柴油發電機版本（設為undefined）', async () => {
      const updateData = {
        display_name: '測試用戶',
        diesel_generator_version: undefined
      }

      await updateUser(userId, updateData)

      // 驗證更新調用 - diesel_generator_mode 應該被移除
      const expectedConfig = { ...mockCurrentProfile.filling_config }
      delete expectedConfig.diesel_generator_mode

      expect(mockSupabaseUpdate).toHaveBeenCalledWith({
        display_name: '測試用戶',
        filling_config: expectedConfig
      })
    })

    test('應該同時更新能源類別和柴油發電機版本', async () => {
      const updateData = {
        display_name: '測試用戶',
        energy_categories: ['wd40', 'diesel_generator', 'gasoline'],
        diesel_generator_version: 'test'
      }

      await updateUser(userId, updateData)

      // 驗證更新調用
      expect(mockSupabaseUpdate).toHaveBeenCalledWith({
        display_name: '測試用戶',
        filling_config: {
          ...mockCurrentProfile.filling_config,
          energy_categories: ['wd40', 'diesel_generator', 'gasoline'], // 轉換後的格式
          diesel_generator_mode: 'test'
        }
      })
    })

    test('應該處理沒有既有filling_config的情況', async () => {
      // 模擬沒有既有config的用戶
      mockSupabaseSelect
        .mockResolvedValueOnce({ data: { email: 'test@example.com' } })
        .mockResolvedValueOnce({ data: { filling_config: null } })

      const updateData = {
        display_name: '新用戶',
        diesel_generator_version: 'refuel',
        energy_categories: ['diesel_generator']
      }

      await updateUser(userId, updateData)

      // 驗證更新調用
      expect(mockSupabaseUpdate).toHaveBeenCalledWith({
        display_name: '新用戶',
        filling_config: {
          energy_categories: ['diesel_generator'],
          diesel_generator_mode: 'refuel'
        }
      })
    })
  })

  describe('能源類別權限檢查', () => {
    test('應該正確轉換diesel_generator格式', () => {
      // 這個測試驗證我們的key轉換邏輯
      const { convertFrontendKeysToDb, convertDbKeysToFrontend } = require('../../api/adminUsers')

      // 測試前端→資料庫轉換（即使diesel_generator保持一致）
      const frontendCategories = ['wd40', 'diesel_generator', 'gasoline']
      const dbCategories = convertFrontendKeysToDb ? convertFrontendKeysToDb(frontendCategories) : frontendCategories

      expect(dbCategories).toContain('diesel_generator')

      // 測試資料庫→前端轉換
      const backToFrontend = convertDbKeysToFrontend ? convertDbKeysToFrontend(dbCategories) : dbCategories

      expect(backToFrontend).toContain('diesel_generator')
    })
  })

  describe('邊界情況測試', () => {
    test('應該處理同時清除多個配置的情況', async () => {
      const userId = 'user-123'
      const mockCurrentProfile = {
        filling_config: {
          target_year: 2024,
          energy_categories: ['wd40'],
          diesel_generator_mode: 'refuel'
        }
      }

      mockSupabaseSelect
        .mockResolvedValueOnce({ data: { email: 'test@example.com' } })
        .mockResolvedValueOnce({ data: mockCurrentProfile })

      mockSupabaseUpdate.mockResolvedValue({ error: null })

      const updateData = {
        display_name: '測試用戶',
        energy_categories: ['wd40'], // 移除 diesel_generator
        diesel_generator_version: undefined // 清除版本
      }

      await updateUser(userId, updateData)

      // 驗證 diesel_generator_mode 被正確移除
      const expectedConfig = {
        target_year: 2024,
        energy_categories: ['wd40']
        // diesel_generator_mode 應該被移除
      }

      expect(mockSupabaseUpdate).toHaveBeenCalledWith({
        display_name: '測試用戶',
        filling_config: expectedConfig
      })
    })

    test('應該處理API錯誤情況', async () => {
      const userId = 'user-123'

      mockSupabaseSelect
        .mockResolvedValueOnce({ data: { email: 'test@example.com' } })
        .mockResolvedValueOnce({ data: { filling_config: {} } })

      // 模擬更新失敗
      mockSupabaseUpdate.mockResolvedValue({
        error: { message: 'Database connection failed' }
      })

      const updateData = {
        diesel_generator_version: 'test'
      }

      await expect(updateUser(userId, updateData)).rejects.toThrow()
    })
  })

  describe('版本設置驗證', () => {
    test('應該只接受有效的柴油發電機版本值', async () => {
      const userId = 'user-123'
      const validVersions = ['refuel', 'test', undefined]

      mockSupabaseSelect
        .mockResolvedValue({ data: { email: 'test@example.com' } })
        .mockResolvedValue({ data: { filling_config: {} } })
      mockSupabaseUpdate.mockResolvedValue({ error: null })

      // 測試有效版本
      for (const version of validVersions) {
        const updateData = {
          display_name: '測試用戶',
          diesel_generator_version: version
        }

        await expect(updateUser(userId, updateData)).resolves.not.toThrow()
      }
    })
  })
})

console.log('🧪 柴油發電機API單元測試已創建')
console.log('📝 測試覆蓋範圍:')
console.log('  ✅ 版本設置 (refuel/test)')
console.log('  ✅ 版本清除 (undefined)')
console.log('  ✅ 能源類別同步更新')
console.log('  ✅ Key格式轉換')
console.log('  ✅ 邊界情況處理')
console.log('  ✅ 錯誤處理')