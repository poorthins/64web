import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  upsertEnergyEntry,
  getEntryByPageKeyAndYear,
  getCategoryFromPageKey,
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

describe('尿素 API 測試', () => {
  let mockSupabase: any

  beforeEach(async () => {
    vi.clearAllMocks()
    const { supabase } = await import('../../lib/supabaseClient')
    mockSupabase = supabase
  })

  const mockUreaInput: UpsertEntryInput = {
    page_key: 'urea',
    period_year: 2024,
    unit: '公斤',
    monthly: {
      '1': 25.5,
      '3': 30.2,
      '6': 40.0,
      '9': 35.8
    },
    notes: '尿素使用量填報 - 4筆使用記錄',
    extraPayload: {
      usageRecords: [
        {
          id: 'record-1',
          date: '2024-01-15',
          quantity: 25.5
        },
        {
          id: 'record-2',
          date: '2024-03-22',
          quantity: 30.2
        },
        {
          id: 'record-3',
          date: '2024-06-10',
          quantity: 40.0
        },
        {
          id: 'record-4',
          date: '2024-09-05',
          quantity: 35.8
        }
      ],
      totalUsage: 131.5,
      notes: '尿素使用量，共4筆記錄'
    }
  }

  describe('尿素類別映射測試', () => {
    it('應該正確映射urea到尿素', () => {
      const result = getCategoryFromPageKey('urea')
      expect(result).toBe('尿素')
    })

    it('應該在控制台輸出正確的診斷信息', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

      getCategoryFromPageKey('urea')

      expect(consoleSpy).toHaveBeenCalledWith('🔍 [5] getCategoryFromPageKey 收到:', 'urea')
      expect(consoleSpy).toHaveBeenCalledWith('🔍 [6] 對應結果:', 'urea', '->', '尿素')
      expect(consoleSpy).toHaveBeenCalledWith('🔍 [7] categoryMap 是否包含 urea:', true)

      consoleSpy.mockRestore()
    })
  })

  describe('尿素填報資料提交', () => {
    it('應該成功提交尿素填報資料', async () => {
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
            data: { id: 'urea-entry-id' },
            error: null
          }))
        }))
      }))

      mockSupabase.from.mockReturnValueOnce({ select: selectMock })
                         .mockReturnValueOnce({ insert: insertMock })

      const result = await upsertEnergyEntry(mockUreaInput)

      expect(result.entry_id).toBe('urea-entry-id')

      // 驗證插入的資料格式
      expect(insertMock).toHaveBeenCalledWith(
        expect.objectContaining({
          owner_id: 'current-user',
          page_key: 'urea',
          period_year: 2024,
          category: '尿素',
          unit: '公斤',
          amount: 131.5,
          status: 'submitted',
          period_start: '2024-01-01',
          period_end: '2024-12-31',
          payload: expect.objectContaining({
            monthly: expect.objectContaining({
              '1': 25.5,
              '3': 30.2,
              '6': 40.0,
              '9': 35.8
            }),
            notes: '尿素使用量，共4筆記錄',
            totalUsage: 131.5,
            usageRecords: expect.arrayContaining([
              expect.objectContaining({
                id: 'record-1',
                date: '2024-01-15',
                quantity: 25.5
              })
            ])
          })
        })
      )
    })

    it('應該正確計算尿素總使用量', async () => {
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
            data: { id: 'urea-entry-id' },
            error: null
          }))
        }))
      }))

      mockSupabase.from.mockReturnValueOnce({ select: selectMock })
                         .mockReturnValueOnce({ insert: insertMock })

      await upsertEnergyEntry(mockUreaInput)

      // 驗證總使用量應該是 25.5 + 30.2 + 40.0 + 35.8 = 131.5
      expect(insertMock).toHaveBeenCalledWith(
        expect.objectContaining({
          amount: 131.5
        })
      )
    })

    it('應該拒絕無效的尿素資料', async () => {
      const invalidInput: UpsertEntryInput = {
        ...mockUreaInput,
        monthly: { '1': 0, '2': 0 } // 總計為 0
      }

      await expect(upsertEnergyEntry(invalidInput)).rejects.toThrow('總使用量必須大於 0')
    })

    it('應該處理按日期記錄的使用量', async () => {
      const dailyRecordInput: UpsertEntryInput = {
        ...mockUreaInput,
        monthly: {
          '2': 15.5,  // 2月使用量
          '4': 20.0,  // 4月使用量
          '8': 25.3   // 8月使用量
        },
        extraPayload: {
          usageRecords: [
            {
              id: 'daily-1',
              date: '2024-02-14',
              quantity: 15.5
            },
            {
              id: 'daily-2',
              date: '2024-04-20',
              quantity: 20.0
            },
            {
              id: 'daily-3',
              date: '2024-08-10',
              quantity: 25.3
            }
          ],
          totalUsage: 60.8,
          notes: '尿素使用量，共3筆記錄'
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
            data: { id: 'daily-record-entry-id' },
            error: null
          }))
        }))
      }))

      mockSupabase.from.mockReturnValueOnce({ select: selectMock })
                         .mockReturnValueOnce({ insert: insertMock })

      const result = await upsertEnergyEntry(dailyRecordInput)

      expect(result.entry_id).toBe('daily-record-entry-id')

      // 驗證按日期記錄的資料正確儲存
      expect(insertMock).toHaveBeenCalledWith(
        expect.objectContaining({
          amount: 60.8,
          payload: expect.objectContaining({
            monthly: expect.objectContaining({
              '2': 15.5,
              '4': 20.0,
              '8': 25.3
            }),
            usageRecords: expect.arrayContaining([
              expect.objectContaining({
                date: '2024-02-14',
                quantity: 15.5
              })
            ])
          })
        })
      )
    })
  })

  describe('尿素記錄查詢', () => {
    it('應該正確查詢尿素記錄', async () => {
      const mockUreaEntry = {
        id: 'urea-entry-id',
        page_key: 'urea',
        period_year: 2024,
        unit: '公斤',
        monthly: { '1': 25.5, '3': 30.2, '6': 40.0 },
        amount: 95.7,
        status: 'submitted',
        extraPayload: {
          usageRecords: [
            {
              id: 'record-1',
              date: '2024-01-15',
              quantity: 25.5
            }
          ],
          totalUsage: 95.7
        }
      }

      const selectMock = vi.fn(() => ({
        eq: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn(() => ({
              maybeSingle: vi.fn(() => Promise.resolve({
                data: mockUreaEntry,
                error: null
              }))
            }))
          }))
        }))
      }))

      mockSupabase.from.mockReturnValue({ select: selectMock })

      const result = await getEntryByPageKeyAndYear('urea', 2024)

      // 驗證查詢成功
      expect(result).toEqual(mockUreaEntry)
    })

    it('應該處理找不到尿素記錄的情況', async () => {
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

      const result = await getEntryByPageKeyAndYear('urea', 2024)
      expect(result).toBeNull()
    })
  })

  describe('尿素資料驗證', () => {
    it('應該驗證月份資料格式正確性', async () => {
      const validInput: UpsertEntryInput = {
        ...mockUreaInput,
        monthly: {
          '1': 15.5,
          '6': 25.2,
          '12': 30.0
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
            data: { id: 'valid-urea-entry-id' },
            error: null
          }))
        }))
      }))

      mockSupabase.from.mockReturnValueOnce({ select: selectMock })
                         .mockReturnValueOnce({ insert: insertMock })

      const result = await upsertEnergyEntry(validInput)
      expect(result.entry_id).toBe('valid-urea-entry-id')
    })

    it('應該拒絕負數使用量', async () => {
      const invalidInput: UpsertEntryInput = {
        ...mockUreaInput,
        monthly: {
          '1': -15.5,  // 負數
          '2': 25.2
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
            data: { id: 'filtered-urea-entry-id' },
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
          amount: 25.2  // 只計算正數部分
        })
      )
    })
  })

  describe('尿素更新操作', () => {
    it('應該成功更新現有尿素記錄', async () => {
      const existingEntry = {
        id: 'existing-urea-id',
        status: 'draft',
        page_key: 'urea'
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
              data: { id: 'existing-urea-id' },
              error: null
            }))
          }))
        }))
      }))

      mockSupabase.from.mockReturnValueOnce({ select: selectMock })
                         .mockReturnValueOnce({ update: updateMock })

      const result = await upsertEnergyEntry(mockUreaInput)

      expect(result.entry_id).toBe('existing-urea-id')

      // 驗證更新操作
      expect(updateMock).toHaveBeenCalledWith(
        expect.objectContaining({
          owner_id: 'current-user',
          page_key: 'urea',
          period_year: 2024,
          category: '尿素',
          unit: '公斤',
          amount: 131.5,
          status: 'submitted'
        })
      )
    })

    it('應該保持現有狀態更新記錄', async () => {
      const approvedEntry = {
        id: 'approved-urea-id',
        status: 'approved',
        page_key: 'urea'
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
              data: { id: 'approved-urea-id' },
              error: null
            }))
          }))
        }))
      }))

      mockSupabase.from.mockReturnValueOnce({ select: selectMock })
                         .mockReturnValueOnce({ update: updateMock })

      await upsertEnergyEntry(mockUreaInput, true) // preserveStatus = true

      // 驗證狀態保持為 'approved'
      expect(updateMock).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'approved'
        })
      )
    })
  })

  describe('尿素使用記錄結構測試', () => {
    it('應該支援複雜的使用記錄結構', async () => {
      const complexInput: UpsertEntryInput = {
        page_key: 'urea',
        period_year: 2024,
        unit: '公斤',
        monthly: {
          '1': 45.3,
          '7': 52.7
        },
        notes: '尿素使用量填報 - 包含複雜記錄',
        extraPayload: {
          usageRecords: [
            {
              id: 'complex-1',
              date: '2024-01-10',
              quantity: 20.3,
              notes: '第一次使用'
            },
            {
              id: 'complex-2',
              date: '2024-01-25',
              quantity: 25.0,
              notes: '第二次使用'
            },
            {
              id: 'complex-3',
              date: '2024-07-15',
              quantity: 52.7,
              notes: '夏季大量使用'
            }
          ],
          totalUsage: 98.0,
          notes: '尿素使用量，共3筆記錄',
          msdsUploaded: true,
          evidenceCount: 6
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
            data: { id: 'complex-urea-entry-id' },
            error: null
          }))
        }))
      }))

      mockSupabase.from.mockReturnValueOnce({ select: selectMock })
                         .mockReturnValueOnce({ insert: insertMock })

      const result = await upsertEnergyEntry(complexInput)

      expect(result.entry_id).toBe('complex-urea-entry-id')

      // 驗證複雜結構正確儲存
      expect(insertMock).toHaveBeenCalledWith(
        expect.objectContaining({
          payload: expect.objectContaining({
            usageRecords: expect.arrayContaining([
              expect.objectContaining({
                id: 'complex-1',
                date: '2024-01-10',
                quantity: 20.3,
                notes: '第一次使用'
              })
            ]),
            msdsUploaded: true,
            evidenceCount: 6
          })
        })
      )
    })
  })

  describe('邊界情況測試', () => {
    it('應該處理單一月份使用量', async () => {
      const singleMonthInput: UpsertEntryInput = {
        ...mockUreaInput,
        monthly: {
          '6': 100.0  // 只有6月有使用量
        },
        extraPayload: {
          usageRecords: [
            {
              id: 'single-record',
              date: '2024-06-15',
              quantity: 100.0
            }
          ],
          totalUsage: 100.0,
          notes: '單月使用記錄'
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
            data: { id: 'single-month-entry-id' },
            error: null
          }))
        }))
      }))

      mockSupabase.from.mockReturnValueOnce({ select: selectMock })
                         .mockReturnValueOnce({ insert: insertMock })

      const result = await upsertEnergyEntry(singleMonthInput)

      expect(result.entry_id).toBe('single-month-entry-id')
      expect(insertMock).toHaveBeenCalledWith(
        expect.objectContaining({
          amount: 100.0
        })
      )
    })

    it('應該處理高精度小數點數值', async () => {
      const precisionInput: UpsertEntryInput = {
        ...mockUreaInput,
        monthly: {
          '3': 12.567,
          '8': 23.891
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
            data: { id: 'precision-entry-id' },
            error: null
          }))
        }))
      }))

      mockSupabase.from.mockReturnValueOnce({ select: selectMock })
                         .mockReturnValueOnce({ insert: insertMock })

      await upsertEnergyEntry(precisionInput)

      // 驗證高精度數值正確計算: 12.567 + 23.891 = 36.458
      expect(insertMock).toHaveBeenCalledWith(
        expect.objectContaining({
          amount: 36.458
        })
      )
    })
  })
})