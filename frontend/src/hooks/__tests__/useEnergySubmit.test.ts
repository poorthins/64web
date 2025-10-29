import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { useEnergySubmit } from '../useEnergySubmit'
import * as entriesApi from '../../api/entries'
import * as filesApi from '../../api/files'

// Mock dependencies
vi.mock('../../api/entries', async () => {
  const actual = await vi.importActual<typeof import('../../api/entries')>('../../api/entries')
  return {
    ...actual,
    upsertEnergyEntry: vi.fn()  // 只 mock upsertEnergyEntry
  }
})
vi.mock('../../api/files')

describe('useEnergySubmit', () => {
  const mockPageKey = 'test_page'
  const mockYear = 2025
  const mockEntryId = 'test-entry-id'

  beforeEach(() => {
    vi.clearAllMocks()

    // Mock upsertEnergyEntry
    vi.spyOn(entriesApi, 'upsertEnergyEntry').mockResolvedValue({
      entry_id: mockEntryId
    })

    // Mock uploadEvidenceWithEntry
    vi.spyOn(filesApi, 'uploadEvidenceWithEntry').mockResolvedValue({
      id: 'file-id',
      file_name: 'test.pdf',
      file_path: '/test/path',
      file_size: 1024,
      file_type: 'msds',
      created_at: new Date().toISOString()
    } as any)
  })

  // ========================================
  // 基本功能測試
  // ========================================
  describe('基本功能', () => {
    it('應該成功提交（無 notes）', async () => {
      // WD40/Acetylene 案例
      const { result } = renderHook(() => useEnergySubmit(mockPageKey, mockYear))

      await act(async () => {
        const entry_id = await result.current.submit({
          formData: {
            unit: 'L',
            monthly: { '1': 100 },
            unitCapacity: 0,
            carbonRate: 0,
            monthlyQuantity: {}
          },
          msdsFiles: [],
          monthlyFiles: []
        })

        expect(entry_id).toBe(mockEntryId)
      })

      // 驗證呼叫 upsertEnergyEntry（新 API：3 參數）
      expect(entriesApi.upsertEnergyEntry).toHaveBeenCalledWith(
        expect.objectContaining({
          page_key: mockPageKey,
          period_year: mockYear,
          unit: 'L',
          monthly: { '1': 100 },
          extraPayload: expect.objectContaining({
            notes: '' // 無 notes 時應為空字串
          })
        }),
        false, // shouldPreserveStatus = false
        'submitted' // initialStatus = 'submitted'
      )
    })

    it('應該成功提交（有 notes）', async () => {
      // LPG/Refrigerant 案例 - 防護教訓 #1
      const { result } = renderHook(() => useEnergySubmit(mockPageKey, mockYear))

      await act(async () => {
        const entry_id = await result.current.submit({
          formData: {
            unit: 'KG',
            monthly: { '1': 50 },
            unitCapacity: 0,
            carbonRate: 0,
            monthlyQuantity: {},
            notes: '單位重量: 20 KG/桶' // ⭐ 有 notes
          },
          msdsFiles: [],
          monthlyFiles: []
        })

        expect(entry_id).toBe(mockEntryId)
      })

      // 驗證 notes 正確傳入（新 API：3 參數）
      expect(entriesApi.upsertEnergyEntry).toHaveBeenCalledWith(
        expect.objectContaining({
          extraPayload: expect.objectContaining({
            notes: '單位重量: 20 KG/桶' // ⭐ 應保留 notes
          })
        }),
        false, // shouldPreserveStatus = false
        'submitted' // initialStatus = 'submitted'
      )
    })

    it('應該使用 preserveStatus = false', async () => {
      // 確保狀態永遠變為 submitted
      const { result } = renderHook(() => useEnergySubmit(mockPageKey, mockYear))

      await act(async () => {
        await result.current.submit({
          formData: {
            unit: 'L',
            monthly: { '1': 100 },
            unitCapacity: 0,
            carbonRate: 0,
            monthlyQuantity: {}
          },
          msdsFiles: [],
          monthlyFiles: []
        })
      })

      // 驗證參數正確（新 API：3 參數）
      expect(entriesApi.upsertEnergyEntry).toHaveBeenCalledWith(
        expect.any(Object),
        false, // ⭐ shouldPreserveStatus = false
        'submitted' // ⭐ initialStatus = 'submitted'
      )
    })
  })

  // ========================================
  // 檔案上傳測試
  // ========================================
  describe('檔案上傳', () => {
    it('應該上傳 MSDS 檔案', async () => {
      const { result } = renderHook(() => useEnergySubmit(mockPageKey, mockYear))

      const mockMsdsFile = {
        file: new File(['msds content'], 'msds.pdf', { type: 'application/pdf' }),
        preview: 'blob:preview'
      }

      await act(async () => {
        await result.current.submit({
          formData: {
            unit: 'L',
            monthly: { '1': 100 },
            unitCapacity: 0,
            carbonRate: 0,
            monthlyQuantity: {}
          },
          msdsFiles: [mockMsdsFile],
          monthlyFiles: []
        })
      })

      // 驗證上傳 MSDS 檔案（新 API：fileType, standard）
      expect(filesApi.uploadEvidenceWithEntry).toHaveBeenCalledWith(
        mockMsdsFile.file,
        expect.objectContaining({
          entryId: mockEntryId,
          pageKey: mockPageKey,
          standard: '64', // 新參數
          fileType: 'msds' // category → fileType
        })
      )
    })

    it('應該上傳月份檔案', async () => {
      const { result } = renderHook(() => useEnergySubmit(mockPageKey, mockYear))

      const mockMonthlyFile = {
        file: new File(['monthly content'], 'jan.pdf', { type: 'application/pdf' }),
        preview: 'blob:preview'
      }

      await act(async () => {
        await result.current.submit({
          formData: {
            unit: 'L',
            monthly: { '1': 100 },
            unitCapacity: 0,
            carbonRate: 0,
            monthlyQuantity: {}
          },
          msdsFiles: [],
          monthlyFiles: [[mockMonthlyFile]] // 第一個月的檔案
        })
      })

      // 驗證上傳月份檔案（新 API：fileType, standard）
      expect(filesApi.uploadEvidenceWithEntry).toHaveBeenCalledWith(
        mockMonthlyFile.file,
        expect.objectContaining({
          entryId: mockEntryId,
          pageKey: mockPageKey,
          standard: '64', // 新參數
          fileType: 'usage_evidence', // category → fileType
          month: 1
        })
      )
    })

    it('應該處理多檔案上傳', async () => {
      const { result } = renderHook(() => useEnergySubmit(mockPageKey, mockYear))

      const mockMsdsFile = { file: new File(['msds'], 'msds.pdf'), preview: 'blob:1' }
      const mockMonthFile1 = { file: new File(['jan'], 'jan.pdf'), preview: 'blob:2' }
      const mockMonthFile2 = { file: new File(['feb'], 'feb.pdf'), preview: 'blob:3' }

      await act(async () => {
        await result.current.submit({
          formData: {
            unit: 'L',
            monthly: { '1': 100 },
            unitCapacity: 0,
            carbonRate: 0,
            monthlyQuantity: {}
          },
          msdsFiles: [mockMsdsFile],
          monthlyFiles: [[mockMonthFile1], [mockMonthFile2]]
        })
      })

      // 驗證上傳了 3 個檔案
      expect(filesApi.uploadEvidenceWithEntry).toHaveBeenCalledTimes(3)
    })
  })

  // ========================================
  // 錯誤處理測試
  // ========================================
  describe('錯誤處理', () => {
    it('API 失敗時應設定 error', async () => {
      const mockError = new Error('API 失敗')
      vi.spyOn(entriesApi, 'upsertEnergyEntry').mockRejectedValueOnce(mockError)

      const { result } = renderHook(() => useEnergySubmit(mockPageKey, mockYear))

      await act(async () => {
        try {
          await result.current.submit({
            formData: {
              unit: 'L',
              monthly: { '1': 100 },
              unitCapacity: 0,
              carbonRate: 0,
              monthlyQuantity: {}
            },
            msdsFiles: [],
            monthlyFiles: []
          })
        } catch (error) {
          // 預期拋出錯誤
        }
      })

      // 驗證 error 狀態
      await waitFor(() => {
        expect(result.current.error).toBeTruthy()
      })
    })

    it('檔案上傳失敗時應正確處理', async () => {
      const mockError = new Error('檔案上傳失敗')
      vi.spyOn(filesApi, 'uploadEvidenceWithEntry').mockRejectedValueOnce(mockError)

      const { result } = renderHook(() => useEnergySubmit(mockPageKey, mockYear))

      const mockFile = {
        file: new File(['content'], 'test.pdf'),
        preview: 'blob:preview'
      }

      await act(async () => {
        try {
          await result.current.submit({
            formData: {
              unit: 'L',
              monthly: { '1': 100 },
              unitCapacity: 0,
              carbonRate: 0,
              monthlyQuantity: {}
            },
            msdsFiles: [mockFile],
            monthlyFiles: []
          })
        } catch (error) {
          // 預期拋出錯誤
        }
      })

      // 驗證 error 狀態
      await waitFor(() => {
        expect(result.current.error).toBeTruthy()
      })
    })
  })

  // ========================================
  // 狀態管理測試
  // ========================================
  describe('狀態管理', () => {
    it('提交中應設定 submitting = true', async () => {
      const { result } = renderHook(() => useEnergySubmit(mockPageKey, mockYear))

      // 初始狀態
      expect(result.current.submitting).toBe(false)

      // 開始提交（不等待完成）
      act(() => {
        result.current.submit({
          formData: {
            unit: 'L',
            monthly: { '1': 100 },
            unitCapacity: 0,
            carbonRate: 0,
            monthlyQuantity: {}
          },
          msdsFiles: [],
          monthlyFiles: []
        })
      })

      // 提交中應該是 true
      expect(result.current.submitting).toBe(true)

      // 等待完成
      await waitFor(() => {
        expect(result.current.submitting).toBe(false)
      })
    })

    it('成功後應設定 success 訊息', async () => {
      const { result } = renderHook(() => useEnergySubmit(mockPageKey, mockYear))

      await act(async () => {
        await result.current.submit({
          formData: {
            unit: 'L',
            monthly: { '1': 100 },
            unitCapacity: 0,
            carbonRate: 0,
            monthlyQuantity: {}
          },
          msdsFiles: [],
          monthlyFiles: []
        })
      })

      // 驗證 success 訊息
      await waitFor(() => {
        expect(result.current.success).toBeTruthy()
      })
    })
  })

  // ========================================
  // 歷史 Bug 防護測試
  // ========================================
  describe('歷史 Bug 防護', () => {
    it('[教訓 #1] notes 有值時應保留（防止 LPG Bug #1）', async () => {
      const { result } = renderHook(() => useEnergySubmit(mockPageKey, mockYear))

      const testNotes = '單位重量: 20 KG/桶'

      await act(async () => {
        await result.current.submit({
          formData: {
            unit: 'KG',
            monthly: { '1': 50 },
            unitCapacity: 0,
            carbonRate: 0,
            monthlyQuantity: {},
            notes: testNotes
          },
          msdsFiles: [],
          monthlyFiles: []
        })
      })

      // ⭐ 驗證 notes 正確傳入，不會被覆蓋成空字串（新 API：3 參數）
      expect(entriesApi.upsertEnergyEntry).toHaveBeenCalledWith(
        expect.objectContaining({
          extraPayload: expect.objectContaining({
            notes: testNotes // 必須保留原值
          })
        }),
        false, // shouldPreserveStatus = false
        'submitted' // initialStatus = 'submitted'
      )
    })

    it('[教訓 #5] extraPayload 不應包含衍生資料（防止 WeldingRod Bug #7）', async () => {
      const { result } = renderHook(() => useEnergySubmit(mockPageKey, mockYear))

      await act(async () => {
        await result.current.submit({
          formData: {
            unit: 'KG',
            monthly: { '1': 100, '2': 200 },
            unitCapacity: 10,
            carbonRate: 0.5,
            monthlyQuantity: {}
          },
          msdsFiles: [],
          monthlyFiles: []
        })
      })

      // 驗證 extraPayload 只包含原始數據，不包含計算結果
      const callArgs = vi.mocked(entriesApi.upsertEnergyEntry).mock.calls[0][0]

      expect(callArgs.extraPayload).toEqual(
        expect.objectContaining({
          unitCapacity: 10,
          carbonRate: 0.5,
          monthly: { '1': 100, '2': 200 },
          monthlyQuantity: {}
          // ❌ 不應該有 totalWeight, totalUsage 等衍生資料
        })
      )

      // 確保沒有衍生資料欄位
      expect(callArgs.extraPayload).not.toHaveProperty('totalWeight')
      expect(callArgs.extraPayload).not.toHaveProperty('totalUsage')
      expect(callArgs.extraPayload).not.toHaveProperty('calculated')
    })
  })

  // ========================================
  // 狀態保留邏輯測試（WD40 rejected 狀態特殊行為）
  // ========================================
  describe('shouldPreserveStatus 邏輯', () => {
    it('[rejected + save] 應保持 rejected 狀態', async () => {
      // 場景：用戶在 rejected 狀態下點「暫存」
      const { result } = renderHook(() =>
        useEnergySubmit(mockPageKey, mockYear, 'rejected')
      )

      await act(async () => {
        await result.current.save({
          formData: {
            unit: 'L',
            monthly: { '1': 100 },
            unitCapacity: 0,
            carbonRate: 0,
            monthlyQuantity: {}
          },
          msdsFiles: [],
          monthlyFiles: []
        })
      })

      // 驗證：shouldPreserveStatus = true（保持原狀態）
      expect(entriesApi.upsertEnergyEntry).toHaveBeenCalledWith(
        expect.any(Object),
        true, // ⭐ shouldPreserveStatus = true（保持 rejected）
        'saved' // initialStatus = 'saved'（但因為 preserve=true 所以不會用到）
      )
    })

    it('[rejected + submit] 應改為 submitted 狀態', async () => {
      // 場景：用戶在 rejected 狀態下點「提交填報」
      const { result } = renderHook(() =>
        useEnergySubmit(mockPageKey, mockYear, 'rejected')
      )

      await act(async () => {
        await result.current.submit({
          formData: {
            unit: 'L',
            monthly: { '1': 100 },
            unitCapacity: 0,
            carbonRate: 0,
            monthlyQuantity: {}
          },
          msdsFiles: [],
          monthlyFiles: []
        })
      })

      // 驗證：shouldPreserveStatus = false（改變狀態）
      expect(entriesApi.upsertEnergyEntry).toHaveBeenCalledWith(
        expect.any(Object),
        false, // ⭐ shouldPreserveStatus = false（改成 submitted）
        'submitted' // ⭐ initialStatus = 'submitted'
      )
    })

    it('[其他狀態 + save] 應改為 saved 狀態', async () => {
      // 場景：用戶在 submitted 狀態下點「暫存」
      const { result } = renderHook(() =>
        useEnergySubmit(mockPageKey, mockYear, 'submitted')
      )

      await act(async () => {
        await result.current.save({
          formData: {
            unit: 'L',
            monthly: { '1': 100 },
            unitCapacity: 0,
            carbonRate: 0,
            monthlyQuantity: {}
          },
          msdsFiles: [],
          monthlyFiles: []
        })
      })

      // 驗證：shouldPreserveStatus = false（改變狀態）
      expect(entriesApi.upsertEnergyEntry).toHaveBeenCalledWith(
        expect.any(Object),
        false, // ⭐ shouldPreserveStatus = false（改成 saved）
        'saved' // ⭐ initialStatus = 'saved'
      )
    })

    it('[無狀態 + save] 應改為 saved 狀態', async () => {
      // 場景：新記錄點「暫存」
      const { result } = renderHook(() =>
        useEnergySubmit(mockPageKey, mockYear) // 沒有 currentStatus
      )

      await act(async () => {
        await result.current.save({
          formData: {
            unit: 'L',
            monthly: { '1': 100 },
            unitCapacity: 0,
            carbonRate: 0,
            monthlyQuantity: {}
          },
          msdsFiles: [],
          monthlyFiles: []
        })
      })

      // 驗證：shouldPreserveStatus = false（設為 saved）
      expect(entriesApi.upsertEnergyEntry).toHaveBeenCalledWith(
        expect.any(Object),
        false, // ⭐ shouldPreserveStatus = false
        'saved' // ⭐ initialStatus = 'saved'
      )
    })
  })

  // ========================================
  // save() 方法測試（暫存功能）
  // ========================================
  describe('save() 方法', () => {
    it('應該成功暫存', async () => {
      const { result } = renderHook(() => useEnergySubmit(mockPageKey, mockYear))

      await act(async () => {
        const entry_id = await result.current.save({
          formData: {
            unit: 'L',
            monthly: { '1': 100 },
            unitCapacity: 0,
            carbonRate: 0,
            monthlyQuantity: {}
          },
          msdsFiles: [],
          monthlyFiles: []
        })

        expect(entry_id).toBe(mockEntryId)
      })

      // 驗證成功訊息
      await waitFor(() => {
        expect(result.current.success).toContain('暫存成功')
      })
    })

    it('暫存時應設定 saving 狀態', async () => {
      const { result } = renderHook(() => useEnergySubmit(mockPageKey, mockYear))

      // 初始狀態
      expect(result.current.submitting).toBe(false)

      // 開始暫存
      act(() => {
        result.current.save({
          formData: {
            unit: 'L',
            monthly: { '1': 100 },
            unitCapacity: 0,
            carbonRate: 0,
            monthlyQuantity: {}
          },
          msdsFiles: [],
          monthlyFiles: []
        })
      })

      // 暫存中應該是 true（使用 submitting 狀態）
      expect(result.current.submitting).toBe(true)

      // 等待完成
      await waitFor(() => {
        expect(result.current.submitting).toBe(false)
      })
    })

    it('暫存時應傳入 isDraft=true', async () => {
      const { result } = renderHook(() => useEnergySubmit(mockPageKey, mockYear))

      await act(async () => {
        await result.current.save({
          formData: {
            unit: 'L',
            monthly: { '1': 100 },
            unitCapacity: 0,
            carbonRate: 0,
            monthlyQuantity: {}
          },
          msdsFiles: [],
          monthlyFiles: []
        })
      })

      // 驗證 initialStatus = 'saved'（表示 isDraft=true）
      expect(entriesApi.upsertEnergyEntry).toHaveBeenCalledWith(
        expect.any(Object),
        false, // shouldPreserveStatus = false（無 rejected 狀態）
        'saved' // ⭐ initialStatus = 'saved'（isDraft=true）
      )
    })
  })
})
