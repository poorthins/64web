import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  upsertEnergyEntry,
  getEntryByPageKeyAndYear,
  type UpsertEntryInput
} from '../../api/entries'

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

describe('外購電力 API 測試', () => {
  let mockSupabase: any

  beforeEach(async () => {
    vi.clearAllMocks()
    const { supabase } = await import('../../lib/supabaseClient')
    mockSupabase = supabase
  })

  const mockElectricityInput: UpsertEntryInput = {
    page_key: 'electricity',
    period_year: 2024,
    unit: 'kWh',
    monthly: {
      '1': 1500.5,
      '2': 1800.2,
      '3': 2000.0,
      '4': 1750.8
    },
    notes: '外購電力用量填報 - 4筆繳費單',
    extraPayload: {
      monthly: {
        '1': 1500.5,
        '2': 1800.2,
        '3': 2000.0,
        '4': 1750.8
      },
      billData: [
        {
          id: '1',
          billingStart: '113/1/1',
          billingEnd: '113/1/31',
          billingDays: 31,
          billingUnits: 1500.5
        },
        {
          id: '2',
          billingStart: '113/2/1',
          billingEnd: '113/2/29',
          billingDays: 29,
          billingUnits: 1800.2
        }
      ]
    }
  }

  describe('外購電力填報資料提交', () => {

    it('應該成功提交外購電力填報資料', async () => {
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
            data: { id: 'electricity-entry-id' },
            error: null
          }))
        }))
      }))

      mockSupabase.from.mockReturnValueOnce({ select: selectMock })
                         .mockReturnValueOnce({ insert: insertMock })

      const result = await upsertEnergyEntry(mockElectricityInput)

      expect(result.entry_id).toBe('electricity-entry-id')

      // 驗證插入的資料格式
      expect(insertMock).toHaveBeenCalledWith(
        expect.objectContaining({
          owner_id: 'current-user',
          page_key: 'electricity',
          period_year: 2024,
          category: '外購電力',
          unit: 'kWh',
          amount: 7051.5,
          status: 'submitted',
          period_start: '2024-01-01',
          period_end: '2024-12-31',
          payload: expect.objectContaining({
            monthly: expect.objectContaining({
              '1': 1500.5,
              '2': 1800.2,
              '3': 2000.0,
              '4': 1750.8
            }),
            notes: '外購電力用量填報 - 4筆繳費單',
            billData: expect.arrayContaining([
              expect.objectContaining({
                billingStart: '113/1/1',
                billingEnd: '113/1/31',
                billingDays: 31,
                billingUnits: 1500.5
              })
            ])
          })
        })
      )
    })

    it('應該正確計算外購電力總使用量', async () => {
      const selectMock = vi.fn(() => ({
        eq: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn(() => ({
              maybeSingle: vi.fn(() => Promise.resolve({ data: null, error: null }))
            }))
          }))
        }))
      }))

      const insertMock = vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn(() => Promise.resolve({
            data: { id: 'electricity-entry-id' },
            error: null
          }))
        }))
      }))

      mockSupabase.from.mockReturnValueOnce({ select: selectMock })
                         .mockReturnValueOnce({ insert: insertMock })

      await upsertEnergyEntry(mockElectricityInput)

      // 驗證總使用量應該是 1500.5 + 1800.2 + 2000.0 + 1750.8 = 7051.5
      expect(insertMock).toHaveBeenCalledWith(
        expect.objectContaining({
          amount: 7051.5
        })
      )
    })

    it('應該拒絕無效的外購電力資料', async () => {
      const invalidInput: UpsertEntryInput = {
        ...mockElectricityInput,
        monthly: { '1': 0, '2': 0 } // 總計為 0
      }

      await expect(upsertEnergyEntry(invalidInput)).rejects.toThrow('總使用量必須大於 0')
    })

    it('應該處理跨月份電費單的月份分配', async () => {
      const crossMonthInput: UpsertEntryInput = {
        ...mockElectricityInput,
        monthly: {
          '1': 800.0,  // 1月部分
          '2': 700.0   // 2月部分
        },
        extraPayload: {
          monthly: {
            '1': 800.0,
            '2': 700.0
          },
          billData: [
            {
              id: '1',
              billingStart: '113/1/15',  // 1月15日開始
              billingEnd: '113/2/14',    // 2月14日結束
              billingDays: 31,
              billingUnits: 1500.0
            }
          ]
        }
      }

      const selectMock = vi.fn(() => ({
        eq: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn(() => ({
              maybeSingle: vi.fn(() => Promise.resolve({ data: null, error: null }))
            }))
          }))
        }))
      }))

      const insertMock = vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn(() => Promise.resolve({
            data: { id: 'cross-month-entry-id' },
            error: null
          }))
        }))
      }))

      mockSupabase.from.mockReturnValueOnce({ select: selectMock })
                         .mockReturnValueOnce({ insert: insertMock })

      const result = await upsertEnergyEntry(crossMonthInput)

      expect(result.entry_id).toBe('cross-month-entry-id')

      // 驗證跨月份資料正確儲存
      expect(insertMock).toHaveBeenCalledWith(
        expect.objectContaining({
          amount: 1500.0,
          payload: expect.objectContaining({
            monthly: expect.objectContaining({
              '1': 800.0,
              '2': 700.0
            })
          })
        })
      )
    })
  })

  describe('外購電力記錄查詢', () => {
    it('應該正確查詢外購電力記錄', async () => {
      const mockElectricityEntry = {
        id: 'electricity-entry-id',
        page_key: 'electricity',
        period_year: 2024,
        unit: 'kWh',
        monthly: { '1': 1500.5, '2': 1800.2 },
        total_usage: 3300.7,
        status: 'submitted',
        extraPayload: {
          billData: [
            {
              id: '1',
              billingStart: '113/1/1',
              billingEnd: '113/1/31',
              billingDays: 31,
              billingUnits: 1500.5
            }
          ]
        }
      }

      const selectMock = vi.fn(() => ({
        eq: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn(() => ({
              maybeSingle: vi.fn(() => Promise.resolve({
                data: mockElectricityEntry,
                error: null
              }))
            }))
          }))
        }))
      }))

      mockSupabase.from.mockReturnValue({ select: selectMock })

      const result = await getEntryByPageKeyAndYear('electricity', 2024)

      expect(result).toEqual(mockElectricityEntry)

      // 驗證查詢成功
      expect(result).toEqual(mockElectricityEntry)
    })

    it('應該處理找不到外購電力記錄的情況', async () => {
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

      const result = await getEntryByPageKeyAndYear('electricity', 2024)
      expect(result).toBeNull()
    })
  })

  describe('外購電力資料驗證', () => {
    it('應該驗證月份資料格式正確性', async () => {
      const validInput: UpsertEntryInput = {
        ...mockElectricityInput,
        monthly: {
          '1': 1500.5,
          '2': 1800.2,
          '12': 2000.0
        }
      }

      const selectMock = vi.fn(() => ({
        eq: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn(() => ({
              maybeSingle: vi.fn(() => Promise.resolve({ data: null, error: null }))
            }))
          }))
        }))
      }))

      const insertMock = vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn(() => Promise.resolve({
            data: { id: 'valid-entry-id' },
            error: null
          }))
        }))
      }))

      mockSupabase.from.mockReturnValueOnce({ select: selectMock })
                         .mockReturnValueOnce({ insert: insertMock })

      const result = await upsertEnergyEntry(validInput)
      expect(result.entry_id).toBe('valid-entry-id')
    })

    it('應該拒絕負數使用量', async () => {
      const invalidInput: UpsertEntryInput = {
        ...mockElectricityInput,
        monthly: {
          '1': -1500.5,  // 負數
          '2': 1800.2
        }
      }

      // 由於我們的驗證邏輯會在提交前檢查，這個測試確保負數被過濾
      const selectMock = vi.fn(() => ({
        eq: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn(() => ({
              maybeSingle: vi.fn(() => Promise.resolve({ data: null, error: null }))
            }))
          }))
        }))
      }))

      const insertMock = vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn(() => Promise.resolve({
            data: { id: 'filtered-entry-id' },
            error: null
          }))
        }))
      }))

      mockSupabase.from.mockReturnValueOnce({ select: selectMock })
                         .mockReturnValueOnce({ insert: insertMock })

      await upsertEnergyEntry(invalidInput)

      // 驗證負數被過濾，總使用量只計算正數
      expect(insertMock).toHaveBeenCalledWith(
        expect.objectContaining({
          amount: 1800.2  // 只計算正數部分
        })
      )
    })
  })

  describe('外購電力更新操作', () => {
    it('應該成功更新現有外購電力記錄', async () => {
      const existingEntry = {
        id: 'existing-electricity-id',
        status: 'draft',
        page_key: 'electricity'
      }

      const selectMock = vi.fn(() => ({
        eq: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn(() => ({
              maybeSingle: vi.fn(() => Promise.resolve({
                data: existingEntry,
                error: null
              }))
            }))
          }))
        }))
      }))

      const updateMock = vi.fn(() => ({
        eq: vi.fn(() => ({
          select: vi.fn(() => ({
            single: vi.fn(() => Promise.resolve({
              data: { id: 'existing-electricity-id' },
              error: null
            }))
          }))
        }))
      }))

      mockSupabase.from.mockReturnValueOnce({ select: selectMock })
                         .mockReturnValueOnce({ update: updateMock })

      const result = await upsertEnergyEntry(mockElectricityInput)

      expect(result.entry_id).toBe('existing-electricity-id')

      // 驗證更新操作
      expect(updateMock).toHaveBeenCalledWith(
        expect.objectContaining({
          owner_id: 'current-user',
          page_key: 'electricity',
          period_year: 2024,
          category: '外購電力',
          unit: 'kWh',
          amount: 7051.5,
          status: 'submitted'
        })
      )
    })

    it('應該保持現有狀態更新記錄', async () => {
      const approvedEntry = {
        id: 'approved-electricity-id',
        status: 'approved',
        page_key: 'electricity'
      }

      const selectMock = vi.fn(() => ({
        eq: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn(() => ({
              maybeSingle: vi.fn(() => Promise.resolve({
                data: approvedEntry,
                error: null
              }))
            }))
          }))
        }))
      }))

      const updateMock = vi.fn(() => ({
        eq: vi.fn(() => ({
          select: vi.fn(() => ({
            single: vi.fn(() => Promise.resolve({
              data: { id: 'approved-electricity-id' },
              error: null
            }))
          }))
        }))
      }))

      mockSupabase.from.mockReturnValueOnce({ select: selectMock })
                         .mockReturnValueOnce({ update: updateMock })

      await upsertEnergyEntry(mockElectricityInput, true) // preserveStatus = true

      // 驗證狀態保持為 'approved'
      expect(updateMock).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'approved'
        })
      )
    })
  })
})