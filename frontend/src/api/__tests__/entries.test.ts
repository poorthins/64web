import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  sumMonthly,
  getCategoryFromPageKey,
  validateMonthlyData,
  upsertEnergyEntry,
  getUserEntries,
  deleteEnergyEntry,
  updateEntryStatus,
  getEntryById,
  getEntryByPageKeyAndYear,
  type UpsertEntryInput
} from '../entries'
import * as authHelpers from '../../utils/authHelpers'
import { supabase } from '../../lib/supabaseClient'

// Mock Supabase
vi.mock('../../lib/supabaseClient', () => ({
  supabase: {
    from: vi.fn(),
    auth: {
      getUser: vi.fn()
    }
  }
}))

// Mock authHelpers
vi.mock('../../utils/authHelpers', () => ({
  validateAuth: vi.fn(),
  handleAPIError: vi.fn((error, message) => new Error(message))
}))

describe('entries.ts - 工具函數', () => {
  describe('sumMonthly', () => {
    it('應該正確計算月度總和', () => {
      const monthly = {
        '1': 100,
        '2': 200,
        '3': 150
      }
      expect(sumMonthly(monthly)).toBe(450)
    })

    it('應該處理空物件', () => {
      expect(sumMonthly({})).toBe(0)
    })

    it('應該過濾負數', () => {
      const monthly = {
        '1': 100,
        '2': -50,  // 負數應該被視為 0
        '3': 150
      }
      expect(sumMonthly(monthly)).toBe(250)
    })

    it('應該處理無效數值', () => {
      const monthly = {
        '1': 100,
        '2': NaN,
        '3': 150
      }
      expect(sumMonthly(monthly)).toBe(250)
    })

    it('應該處理字串數字', () => {
      const monthly = {
        '1': '100' as any,
        '2': '200' as any
      }
      expect(sumMonthly(monthly)).toBe(300)
    })
  })

  describe('getCategoryFromPageKey', () => {
    it('應該正確轉換 diesel', () => {
      expect(getCategoryFromPageKey('diesel')).toBe('柴油')
    })

    it('應該正確轉換 gasoline', () => {
      expect(getCategoryFromPageKey('gasoline')).toBe('汽油')
    })

    it('應該正確轉換 natural_gas', () => {
      expect(getCategoryFromPageKey('natural_gas')).toBe('天然氣')
    })

    it('應該正確轉換 wd40', () => {
      expect(getCategoryFromPageKey('wd40')).toBe('WD-40')
    })

    it('應該拋出錯誤當 pageKey 未知', () => {
      expect(() => getCategoryFromPageKey('unknown_key')).toThrow('未知的能源類別')
    })
  })

  describe('validateMonthlyData', () => {
    it('應該驗證有效的月度數據', () => {
      const monthly = {
        '1': 100,
        '2': 200,
        '12': 150
      }
      const result = validateMonthlyData(monthly)
      expect(result.valid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('應該拒絕無效的月份', () => {
      const monthly = {
        '0': 100,    // 月份 < 1
        '13': 200    // 月份 > 12
      }
      const result = validateMonthlyData(monthly)
      expect(result.valid).toBe(false)
      expect(result.errors).toContain('無效的月份: 0')
      expect(result.errors).toContain('無效的月份: 13')
    })

    it('應該拒絕負數', () => {
      const monthly = {
        '1': -100
      }
      const result = validateMonthlyData(monthly)
      expect(result.valid).toBe(false)
      expect(result.errors[0]).toContain('1月的數值無效')
    })

    it('應該拒絕 NaN', () => {
      const monthly = {
        '1': NaN
      }
      const result = validateMonthlyData(monthly)
      expect(result.valid).toBe(false)
      expect(result.errors[0]).toContain('1月的數值無效')
    })
  })
})

describe('entries.ts - API 函數', () => {
  const mockUser = {
    id: 'user-123',
    email: 'test@example.com',
    app_metadata: {},
    user_metadata: {},
    aud: 'authenticated',
    created_at: new Date().toISOString()
  } as any

  beforeEach(() => {
    // Mock validateAuth 成功
    vi.mocked(authHelpers.validateAuth).mockResolvedValue({
      user: mockUser,
      session: null,
      error: null
    })
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('upsertEnergyEntry', () => {
    const validInput: UpsertEntryInput = {
      page_key: 'diesel',
      period_year: 2024,
      unit: '公升',
      monthly: { '1': 100, '2': 200 }
    }

    it('應該成功建立新記錄', async () => {
      // Mock Supabase 查詢（無現有記錄）
      const mockSelect = vi.fn().mockReturnThis()
      const mockEq = vi.fn().mockReturnThis()
      const mockMaybeSingle = vi.fn().mockResolvedValue({ data: null, error: null })

      vi.mocked(supabase.from).mockReturnValue({
        select: mockSelect,
        eq: mockEq,
        maybeSingle: mockMaybeSingle
      } as any)

      // Mock 第二次呼叫（插入）
      const mockInsert = vi.fn().mockReturnThis()
      const mockSelectAfterInsert = vi.fn().mockResolvedValue({
        data: { id: 'new-entry-123' },
        error: null
      })

      vi.mocked(supabase.from).mockReturnValueOnce({
        select: mockSelect,
        eq: mockEq,
        maybeSingle: mockMaybeSingle
      } as any).mockReturnValueOnce({
        insert: mockInsert,
        select: mockSelectAfterInsert.mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({ data: { id: 'new-entry-123' }, error: null })
      } as any)

      const result = await upsertEnergyEntry(validInput)

      expect(result.entry_id).toBe('new-entry-123')
      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          owner_id: mockUser.id,
          page_key: 'diesel',
          period_year: 2024,
          category: '柴油',
          amount: 300,
          status: 'submitted'
        })
      )
    })

    it('應該成功更新現有記錄', async () => {
      const existingEntry = { id: 'existing-123', status: 'draft' }

      // Mock 第一次查詢（找到現有記錄）
      vi.mocked(supabase.from).mockReturnValueOnce({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({ data: existingEntry, error: null })
      } as any)

      // Mock 更新
      vi.mocked(supabase.from).mockReturnValueOnce({
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({ data: { id: 'existing-123' }, error: null })
      } as any)

      const result = await upsertEnergyEntry(validInput)

      expect(result.entry_id).toBe('existing-123')
    })

    it('應該拋出錯誤當總量為 0', async () => {
      const invalidInput: UpsertEntryInput = {
        page_key: 'diesel',
        period_year: 2024,
        unit: '公升',
        monthly: {}  // 空的月度數據
      }

      await expect(upsertEnergyEntry(invalidInput)).rejects.toThrow('總使用量必須大於 0')
    })

    it('應該拋出錯誤當使用者未登入', async () => {
      vi.mocked(authHelpers.validateAuth).mockResolvedValue({
        user: null,
        session: null,
        error: new Error('未登入')
      })

      await expect(upsertEnergyEntry(validInput)).rejects.toThrow('未登入')
    })

    it('應該處理 Supabase 錯誤', async () => {
      // Mock 查詢失敗
      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({
          data: null,
          error: { message: 'Database error' }
        })
      } as any)

      await expect(upsertEnergyEntry(validInput)).rejects.toThrow()
    })

    it('應該保留現有狀態當 preserveStatus=true', async () => {
      const existingEntry = { id: 'existing-123', status: 'approved' }

      // Mock 查詢現有記錄
      vi.mocked(supabase.from).mockReturnValueOnce({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({ data: existingEntry, error: null })
      } as any)

      // Mock 更新
      const mockUpdate = vi.fn().mockReturnThis()
      vi.mocked(supabase.from).mockReturnValueOnce({
        update: mockUpdate,
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({ data: { id: 'existing-123' }, error: null })
      } as any)

      await upsertEnergyEntry(validInput, true)

      // 驗證狀態保持為 'approved'
      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'approved'
        })
      )
    })
  })

  describe('getUserEntries', () => {
    it('應該取得使用者的所有記錄', async () => {
      const mockEntries = [
        { id: 'entry-1', page_key: 'diesel', period_year: 2024 },
        { id: 'entry-2', page_key: 'gasoline', period_year: 2024 }
      ]

      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis()
      } as any)

      // Mock 最後的執行結果
      vi.mocked(supabase.from).mockReturnValueOnce({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({ data: mockEntries, error: null })
        })
      } as any)

      const result = await getUserEntries()

      expect(result).toEqual(mockEntries)
    })

    it('應該根據 pageKey 過濾', async () => {
      const mockEq = vi.fn().mockReturnThis()
      const mockOrder = vi.fn().mockReturnThis()
      const chainableMock = {
        select: vi.fn().mockReturnThis(),
        eq: mockEq,
        order: mockOrder,
        then: vi.fn((resolve) => resolve({ data: [], error: null }))
      }

      // 確保所有方法都返回同一個 chainable mock
      mockEq.mockReturnValue(chainableMock)
      mockOrder.mockReturnValue(chainableMock)
      chainableMock.select.mockReturnValue(chainableMock)

      vi.mocked(supabase.from).mockReturnValue(chainableMock as any)

      await getUserEntries('diesel')

      expect(mockEq).toHaveBeenCalledWith('owner_id', mockUser.id)
      expect(mockEq).toHaveBeenCalledWith('page_key', 'diesel')
    })

    it('應該根據年份過濾', async () => {
      const mockEq = vi.fn().mockReturnThis()
      const mockOrder = vi.fn().mockReturnThis()
      const chainableMock = {
        select: vi.fn().mockReturnThis(),
        eq: mockEq,
        order: mockOrder,
        then: vi.fn((resolve) => resolve({ data: [], error: null }))
      }

      // 確保所有方法都返回同一個 chainable mock
      mockEq.mockReturnValue(chainableMock)
      mockOrder.mockReturnValue(chainableMock)
      chainableMock.select.mockReturnValue(chainableMock)

      vi.mocked(supabase.from).mockReturnValue(chainableMock as any)

      await getUserEntries(undefined, 2024)

      expect(mockEq).toHaveBeenCalledWith('period_year', 2024)
    })

    it('應該拋出錯誤當使用者未登入', async () => {
      vi.mocked(authHelpers.validateAuth).mockResolvedValue({
        user: null,
        session: null,
        error: new Error('未登入')
      })

      await expect(getUserEntries()).rejects.toThrow('未登入')
    })
  })

  describe('deleteEnergyEntry', () => {
    it('應該成功刪除記錄', async () => {
      const mockDelete = vi.fn().mockReturnThis()
      const mockEq = vi.fn().mockReturnThis()

      vi.mocked(supabase.from).mockReturnValue({
        delete: mockDelete,
        eq: mockEq
      } as any)

      // Mock 最後的執行
      vi.mocked(supabase.from).mockReturnValueOnce({
        delete: mockDelete,
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ error: null })
        })
      } as any)

      await deleteEnergyEntry('entry-123')

      expect(mockDelete).toHaveBeenCalled()
    })

    it('應該只能刪除自己的記錄', async () => {
      const mockEq = vi.fn().mockReturnThis()
      const mockDelete = vi.fn().mockReturnThis()
      const chainableMock = {
        delete: mockDelete,
        eq: mockEq,
        then: vi.fn((resolve) => resolve({ error: null }))
      }

      // 確保所有方法都返回同一個 chainable mock
      mockDelete.mockReturnValue(chainableMock)
      mockEq.mockReturnValue(chainableMock)

      vi.mocked(supabase.from).mockReturnValue(chainableMock as any)

      await deleteEnergyEntry('entry-123')

      expect(mockEq).toHaveBeenCalledWith('id', 'entry-123')
      expect(mockEq).toHaveBeenCalledWith('owner_id', mockUser.id)
    })

    it('應該處理刪除錯誤', async () => {
      vi.mocked(supabase.from).mockReturnValue({
        delete: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ error: { message: 'Delete failed' } })
        })
      } as any)

      await expect(deleteEnergyEntry('entry-123')).rejects.toThrow()
    })
  })

  describe('updateEntryStatus', () => {
    it('應該成功更新狀態', async () => {
      const mockUpdate = vi.fn().mockReturnThis()

      vi.mocked(supabase.from).mockReturnValue({
        update: mockUpdate,
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ error: null })
        })
      } as any)

      await updateEntryStatus('entry-123', 'approved')

      expect(mockUpdate).toHaveBeenCalledWith({ status: 'approved' })
    })

    it('應該只能更新自己的記錄', async () => {
      const mockEq = vi.fn().mockReturnThis()
      const mockUpdate = vi.fn().mockReturnThis()
      const chainableMock = {
        update: mockUpdate,
        eq: mockEq,
        then: vi.fn((resolve) => resolve({ error: null }))
      }

      // 確保所有方法都返回同一個 chainable mock
      mockUpdate.mockReturnValue(chainableMock)
      mockEq.mockReturnValue(chainableMock)

      vi.mocked(supabase.from).mockReturnValue(chainableMock as any)

      await updateEntryStatus('entry-123', 'approved')

      expect(mockEq).toHaveBeenCalledWith('id', 'entry-123')
      expect(mockEq).toHaveBeenCalledWith('owner_id', mockUser.id)
    })
  })

  describe('getEntryById', () => {
    it('應該取得指定 ID 的記錄', async () => {
      const mockEntry = {
        id: 'entry-123',
        owner_id: 'user-123',
        page_key: 'diesel'
      }

      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({ data: mockEntry, error: null })
      } as any)

      const result = await getEntryById('entry-123')

      expect(result).toEqual(mockEntry)
    })

    it('應該回傳 null 當記錄不存在', async () => {
      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null })
      } as any)

      const result = await getEntryById('non-existent')

      expect(result).toBeNull()
    })
  })

  describe('getEntryByPageKeyAndYear', () => {
    it('應該根據 pageKey 和年份取得記錄', async () => {
      const mockEntry = {
        id: 'entry-123',
        page_key: 'diesel',
        period_year: 2024
      }

      const mockEq = vi.fn().mockReturnThis()

      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: mockEq,
        maybeSingle: vi.fn().mockResolvedValue({ data: mockEntry, error: null })
      } as any)

      const result = await getEntryByPageKeyAndYear('diesel', 2024)

      expect(result).toEqual(mockEntry)
      expect(mockEq).toHaveBeenCalledWith('owner_id', mockUser.id)
      expect(mockEq).toHaveBeenCalledWith('page_key', 'diesel')
      expect(mockEq).toHaveBeenCalledWith('period_year', 2024)
    })

    it('應該回傳 null 當沒有符合的記錄', async () => {
      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null })
      } as any)

      const result = await getEntryByPageKeyAndYear('diesel', 2024)

      expect(result).toBeNull()
    })
  })
})
