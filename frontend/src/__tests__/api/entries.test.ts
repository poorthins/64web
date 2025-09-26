import { describe, it, expect, beforeEach, vi } from 'vitest'
import { http, HttpResponse } from 'msw'
import { server } from '../setup'
import {
  sumMonthly,
  getCategoryFromPageKey,
  upsertEnergyEntry,
  getUserEntries,
  deleteEnergyEntry,
  updateEntryStatus,
  getEntryById,
  getEntryByPageKeyAndYear,
  validateMonthlyData,
  type UpsertEntryInput,
  type EnergyEntry
} from '../../api/entries'

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

describe('entries API', () => {
  let mockSupabase: any

  beforeEach(async () => {
    vi.clearAllMocks()

    // Get the mocked supabase client
    const { supabase } = await import('../../lib/supabaseClient')
    mockSupabase = supabase
  })

  describe('sumMonthly', () => {
    it('應該正確計算每月數值的總和', () => {
      const monthly = {
        '1': 100,
        '2': 150,
        '3': 200,
        '12': 300
      }

      const result = sumMonthly(monthly)
      expect(result).toBe(750)
    })

    it('應該處理包含 0 值的數據', () => {
      const monthly = {
        '1': 0,
        '2': 100,
        '3': 0,
        '4': 200
      }

      const result = sumMonthly(monthly)
      expect(result).toBe(300)
    })

    it('應該過濾負數值', () => {
      const monthly = {
        '1': 100,
        '2': -50,  // 負數應該被當作 0
        '3': 200,
        '4': -100  // 負數應該被當作 0
      }

      const result = sumMonthly(monthly)
      expect(result).toBe(300) // 只計算 100 + 200
    })

    it('應該處理空物件', () => {
      const result = sumMonthly({})
      expect(result).toBe(0)
    })

    it('應該處理無效數值', () => {
      const monthly = {
        '1': 100,
        '2': NaN,
        '3': 200,
        '4': undefined as any
      }

      const result = sumMonthly(monthly)
      expect(result).toBe(300) // 只計算有效數值
    })
  })

  describe('getCategoryFromPageKey', () => {
    it('應該正確映射已知的 page key', () => {
      expect(getCategoryFromPageKey('wd40')).toBe('WD-40')
      expect(getCategoryFromPageKey('acetylene')).toBe('乙炔')
      expect(getCategoryFromPageKey('natural_gas')).toBe('天然氣')
      expect(getCategoryFromPageKey('electricity_bill')).toBe('外購電力')
      expect(getCategoryFromPageKey('employee_commute')).toBe('員工通勤')
    })

    it('應該處理未知的 page key', () => {
      const result = getCategoryFromPageKey('unknown_category')
      expect(result).toBe('UNKNOWN_CATEGORY')
    })

    it('應該處理空字串', () => {
      const result = getCategoryFromPageKey('')
      expect(result).toBe('')
    })
  })

  describe('validateMonthlyData', () => {
    it('應該驗證有效的每月數據', () => {
      const monthly = {
        '1': 100,
        '2': 150,
        '12': 300
      }

      const result = validateMonthlyData(monthly)
      expect(result.valid).toBe(true)
      expect(result.errors).toEqual([])
    })

    it('應該檢測無效的月份', () => {
      const monthly = {
        '0': 100,    // 無效月份
        '13': 150,   // 無效月份
        'abc': 200,  // 無效月份
        '6': 300
      }

      const result = validateMonthlyData(monthly)
      expect(result.valid).toBe(false)
      expect(result.errors).toHaveLength(3)
      expect(result.errors).toContain('無效的月份: 0')
      expect(result.errors).toContain('無效的月份: 13')
      expect(result.errors).toContain('無效的月份: abc')
    })

    it('應該檢測無效的數值', () => {
      const monthly = {
        '1': -50,           // 負數
        '2': NaN,           // NaN
        '3': 'invalid' as any, // 非數字
        '4': 300
      }

      const result = validateMonthlyData(monthly)
      expect(result.valid).toBe(false)
      expect(result.errors).toHaveLength(3)
      expect(result.errors).toContain('1月的數值無效: -50')
      expect(result.errors).toContain('2月的數值無效: NaN')
      expect(result.errors).toContain('3月的數值無效: invalid')
    })
  })

  describe('upsertEnergyEntry', () => {
    const mockInput: UpsertEntryInput = {
      page_key: 'wd40',
      period_year: 2024,
      unit: '公升',
      monthly: { '1': 100, '2': 150 },
      notes: '測試記錄'
    }

    it('應該成功創建新的能源記錄', async () => {
      // Mock 沒有現有記錄
      const selectMock = vi.fn(() => ({
        eq: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn(() => ({
              maybeSingle: vi.fn(() => Promise.resolve({ data: null, error: null }))
            }))
          }))
        }))
      }))

      // Mock 插入成功
      const insertMock = vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn(() => Promise.resolve({
            data: { id: 'new-entry-id' },
            error: null
          }))
        }))
      }))

      mockSupabase.from.mockReturnValueOnce({ select: selectMock })
                         .mockReturnValueOnce({ insert: insertMock })

      const result = await upsertEnergyEntry(mockInput)

      expect(result.entry_id).toBe('new-entry-id')
      expect(mockSupabase.from).toHaveBeenCalledWith('energy_entries')
    })

    it('應該成功更新現有記錄', async () => {
      // Mock 現有記錄
      const selectMock = vi.fn(() => ({
        eq: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn(() => ({
              maybeSingle: vi.fn(() => Promise.resolve({
                data: { id: 'existing-id', status: 'draft' },
                error: null
              }))
            }))
          }))
        }))
      }))

      // Mock 更新成功
      const updateMock = vi.fn(() => ({
        eq: vi.fn(() => ({
          select: vi.fn(() => ({
            single: vi.fn(() => Promise.resolve({
              data: { id: 'existing-id' },
              error: null
            }))
          }))
        }))
      }))

      mockSupabase.from.mockReturnValueOnce({ select: selectMock })
                         .mockReturnValueOnce({ update: updateMock })

      const result = await upsertEnergyEntry(mockInput)

      expect(result.entry_id).toBe('existing-id')
    })

    it('應該拒絕總使用量為 0 的記錄', async () => {
      const invalidInput: UpsertEntryInput = {
        ...mockInput,
        monthly: { '1': 0, '2': 0 } // 總計為 0
      }

      await expect(upsertEnergyEntry(invalidInput)).rejects.toThrow('總使用量必須大於 0')
    })

    it('應該處理保持現有狀態的情況', async () => {
      // Mock 現有記錄
      const selectMock = vi.fn(() => ({
        eq: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn(() => ({
              maybeSingle: vi.fn(() => Promise.resolve({
                data: { id: 'existing-id', status: 'approved' },
                error: null
              }))
            }))
          }))
        }))
      }))

      // Mock 更新成功
      const updateMock = vi.fn(() => ({
        eq: vi.fn(() => ({
          select: vi.fn(() => ({
            single: vi.fn(() => Promise.resolve({
              data: { id: 'existing-id' },
              error: null
            }))
          }))
        }))
      }))

      mockSupabase.from.mockReturnValueOnce({ select: selectMock })
                         .mockReturnValueOnce({ update: updateMock })

      await upsertEnergyEntry(mockInput, true) // preserveStatus = true

      // 驗證更新時保持了原始狀態 'approved'
      expect(updateMock).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'approved'
        })
      )
    })

    it('應該處理資料庫錯誤', async () => {
      // Mock 沒有現有記錄
      const selectMock = vi.fn(() => ({
        eq: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn(() => ({
              maybeSingle: vi.fn(() => Promise.resolve({ data: null, error: null }))
            }))
          }))
        }))
      }))

      // Mock 插入失敗
      const insertMock = vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn(() => Promise.resolve({
            data: null,
            error: { message: 'Database error' }
          }))
        }))
      }))

      mockSupabase.from.mockReturnValueOnce({ select: selectMock })
                         .mockReturnValueOnce({ insert: insertMock })

      await expect(upsertEnergyEntry(mockInput)).rejects.toThrow('儲存填報記錄失敗')
    })
  })

  describe('getUserEntries', () => {
    it('應該成功取得用戶的所有記錄', async () => {
      const mockEntries = [
        { id: '1', page_key: 'wd40', period_year: 2024 },
        { id: '2', page_key: 'diesel', period_year: 2024 }
      ]

      const selectMock = vi.fn(() => ({
        eq: vi.fn(() => ({
          order: vi.fn(() => ({
            order: vi.fn(() => Promise.resolve({
              data: mockEntries,
              error: null
            }))
          }))
        }))
      }))

      mockSupabase.from.mockReturnValue({ select: selectMock })

      const result = await getUserEntries()

      expect(result).toEqual(mockEntries)
      expect(mockSupabase.from).toHaveBeenCalledWith('energy_entries')
    })

    it('應該根據 page key 篩選記錄', async () => {
      const mockEntries = [
        { id: '1', page_key: 'wd40', period_year: 2024 }
      ]

      // Create the final query object that supports being awaited and also has eq method
      const finalQuery = {
        eq: vi.fn(() => finalQuery), // Return itself for further chaining
        then: vi.fn((resolve) => {
          resolve({ data: mockEntries, error: null })
          return Promise.resolve({ data: mockEntries, error: null })
        })
      }

      // Create the initial chain
      const orderSecondMock = vi.fn(() => finalQuery)
      const orderFirstMock = vi.fn(() => ({ order: orderSecondMock }))
      const eqOwnerMock = vi.fn(() => ({ order: orderFirstMock }))
      const selectMock = vi.fn(() => ({ eq: eqOwnerMock }))

      mockSupabase.from.mockReturnValue({ select: selectMock })

      const result = await getUserEntries('wd40')
      expect(result).toEqual(mockEntries)
    })

    it('應該根據年份篩選記錄', async () => {
      const mockEntries = [
        { id: '1', page_key: 'wd40', period_year: 2024 }
      ]

      // Create the final query object that supports being awaited and also has eq method
      const finalQuery = {
        eq: vi.fn(() => finalQuery), // Return itself for further chaining
        then: vi.fn((resolve) => {
          resolve({ data: mockEntries, error: null })
          return Promise.resolve({ data: mockEntries, error: null })
        })
      }

      // Create the initial chain
      const orderSecondMock = vi.fn(() => finalQuery)
      const orderFirstMock = vi.fn(() => ({ order: orderSecondMock }))
      const eqOwnerMock = vi.fn(() => ({ order: orderFirstMock }))
      const selectMock = vi.fn(() => ({ eq: eqOwnerMock }))

      mockSupabase.from.mockReturnValue({ select: selectMock })

      const result = await getUserEntries(undefined, 2024)
      expect(result).toEqual(mockEntries)
    })

    it('應該處理查詢失敗', async () => {
      const selectMock = vi.fn(() => ({
        eq: vi.fn(() => ({
          order: vi.fn(() => ({
            order: vi.fn(() => Promise.resolve({
              data: null,
              error: { message: 'Query failed' }
            }))
          }))
        }))
      }))

      mockSupabase.from.mockReturnValue({ select: selectMock })

      await expect(getUserEntries()).rejects.toThrow('取得填報記錄失敗')
    })
  })

  describe('deleteEnergyEntry', () => {
    it('應該成功刪除記錄', async () => {
      const deleteMock = vi.fn(() => ({
        eq: vi.fn(() => ({
          eq: vi.fn(() => Promise.resolve({ error: null }))
        }))
      }))

      mockSupabase.from.mockReturnValue({ delete: deleteMock })

      await deleteEnergyEntry('entry-id')

      expect(deleteMock).toHaveBeenCalled()
      expect(mockSupabase.from).toHaveBeenCalledWith('energy_entries')
    })

    it('應該處理刪除失敗', async () => {
      const deleteMock = vi.fn(() => ({
        eq: vi.fn(() => ({
          eq: vi.fn(() => Promise.resolve({
            error: { message: 'Delete failed' }
          }))
        }))
      }))

      mockSupabase.from.mockReturnValue({ delete: deleteMock })

      await expect(deleteEnergyEntry('entry-id')).rejects.toThrow('刪除填報記錄失敗')
    })
  })

  describe('updateEntryStatus', () => {
    it('應該成功更新記錄狀態', async () => {
      const updateMock = vi.fn(() => ({
        eq: vi.fn(() => ({
          eq: vi.fn(() => Promise.resolve({ error: null }))
        }))
      }))

      mockSupabase.from.mockReturnValue({ update: updateMock })

      await updateEntryStatus('entry-id', 'approved')

      expect(updateMock).toHaveBeenCalledWith({ status: 'approved' })
    })

    it('應該處理更新失敗', async () => {
      const updateMock = vi.fn(() => ({
        eq: vi.fn(() => ({
          eq: vi.fn(() => Promise.resolve({
            error: { message: 'Update failed' }
          }))
        }))
      }))

      mockSupabase.from.mockReturnValue({ update: updateMock })

      await expect(updateEntryStatus('entry-id', 'rejected')).rejects.toThrow('更新狀態失敗')
    })
  })

  describe('getEntryById', () => {
    it('應該成功取得記錄', async () => {
      const mockEntry = {
        id: 'entry-id',
        owner_id: 'user-id',
        page_key: 'wd40',
        status: 'submitted'
      }

      const selectMock = vi.fn(() => ({
        eq: vi.fn(() => ({
          maybeSingle: vi.fn(() => Promise.resolve({
            data: mockEntry,
            error: null
          }))
        }))
      }))

      mockSupabase.from.mockReturnValue({ select: selectMock })

      const result = await getEntryById('entry-id')

      expect(result).toEqual(mockEntry)
      expect(selectMock).toHaveBeenCalledWith('*')
    })

    it('應該處理記錄不存在', async () => {
      const selectMock = vi.fn(() => ({
        eq: vi.fn(() => ({
          maybeSingle: vi.fn(() => Promise.resolve({
            data: null,
            error: null
          }))
        }))
      }))

      mockSupabase.from.mockReturnValue({ select: selectMock })

      const result = await getEntryById('non-existent')
      expect(result).toBeNull()
    })

    it('應該處理查詢失敗', async () => {
      const selectMock = vi.fn(() => ({
        eq: vi.fn(() => ({
          maybeSingle: vi.fn(() => Promise.resolve({
            data: null,
            error: { message: 'Query failed' }
          }))
        }))
      }))

      mockSupabase.from.mockReturnValue({ select: selectMock })

      await expect(getEntryById('entry-id')).rejects.toThrow('取得填報記錄失敗')
    })
  })

  describe('getEntryByPageKeyAndYear', () => {
    it('應該成功取得記錄', async () => {
      const mockEntry = {
        id: 'entry-id',
        page_key: 'wd40',
        period_year: 2024
      }

      const selectMock = vi.fn(() => ({
        eq: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn(() => ({
              maybeSingle: vi.fn(() => Promise.resolve({
                data: mockEntry,
                error: null
              }))
            }))
          }))
        }))
      }))

      mockSupabase.from.mockReturnValue({ select: selectMock })

      const result = await getEntryByPageKeyAndYear('wd40', 2024)

      expect(result).toEqual(mockEntry)
    })

    it('應該處理記錄不存在', async () => {
      const selectMock = vi.fn(() => ({
        eq: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn(() => ({
              maybeSingle: vi.fn(() => Promise.resolve({
                data: null,
                error: null
              }))
            }))
          }))
        }))
      }))

      mockSupabase.from.mockReturnValue({ select: selectMock })

      const result = await getEntryByPageKeyAndYear('nonexistent', 2024)
      expect(result).toBeNull()
    })

    it('應該處理認證錯誤', async () => {
      const { validateAuth } = await import('../../utils/authHelpers')
      vi.mocked(validateAuth).mockResolvedValueOnce({
        user: null,
        error: new Error('Unauthorized')
      })

      await expect(getEntryByPageKeyAndYear('wd40', 2024)).rejects.toThrow('Unauthorized')
    })
  })
})