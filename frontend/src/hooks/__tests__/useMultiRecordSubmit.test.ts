import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { useMultiRecordSubmit } from '../useMultiRecordSubmit'
import type { MultiRecordSubmitParams } from '../useMultiRecordSubmit'

// Mock dependencies
vi.mock('../../api/entries', () => ({
  upsertEnergyEntry: vi.fn()
}))

vi.mock('../../utils/authDiagnostics', () => ({
  debugRLSOperation: vi.fn((desc, fn) => fn())
}))

import { upsertEnergyEntry } from '../../api/entries'

describe('useMultiRecordSubmit', () => {
  const mockEntryInput = {
    page_key: 'diesel',
    period_year: 2025,
    unit: 'L',
    amount: 100,
    payload: { monthly: [] }
  }

  const mockRecordData = [
    {
      id: 'record-1',
      memoryFiles: [],
      allRecordIds: ['record-1', 'record-2']
    },
    {
      id: 'record-2',
      memoryFiles: [],
      allRecordIds: ['record-1', 'record-2']
    }
  ]

  const mockUploadRecordFiles = vi.fn().mockResolvedValue(['file-1', 'file-2'])
  const mockOnSuccess = vi.fn().mockResolvedValue(undefined)

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(upsertEnergyEntry).mockResolvedValue({ entry_id: 'test-entry-id' })
  })

  describe('submit()', () => {
    it('應該使用 status=submitted 呼叫 upsertEnergyEntry', async () => {
      const { result } = renderHook(() => useMultiRecordSubmit('diesel', 2025))

      const params: MultiRecordSubmitParams = {
        entryInput: mockEntryInput,
        recordData: mockRecordData,
        uploadRecordFiles: mockUploadRecordFiles,
        onSuccess: mockOnSuccess
      }

      await act(async () => {
        await result.current.submit(params)
      })

      expect(upsertEnergyEntry).toHaveBeenCalledWith(
        mockEntryInput,
        false,           // preserveStatus
        'submitted'      // initialStatus
      )
    })

    it('應該上傳所有記錄的檔案', async () => {
      const { result } = renderHook(() => useMultiRecordSubmit('diesel', 2025))

      const recordsWithFiles = [
        {
          id: 'record-1',
          memoryFiles: [{ file: new File([], 'test1.jpg') } as any],
          allRecordIds: ['record-1']
        },
        {
          id: 'record-2',
          memoryFiles: [{ file: new File([], 'test2.jpg') } as any],
          allRecordIds: ['record-2']
        }
      ]

      const params: MultiRecordSubmitParams = {
        entryInput: mockEntryInput,
        recordData: recordsWithFiles,
        uploadRecordFiles: mockUploadRecordFiles
      }

      await act(async () => {
        await result.current.submit(params)
      })

      expect(mockUploadRecordFiles).toHaveBeenCalledTimes(2)
      expect(mockUploadRecordFiles).toHaveBeenCalledWith(
        'record-1',
        recordsWithFiles[0].memoryFiles,
        'test-entry-id',
        undefined,
        ['record-1']
      )
    })

    it('應該在所有步驟完成後執行 onSuccess', async () => {
      const { result } = renderHook(() => useMultiRecordSubmit('diesel', 2025))

      const params: MultiRecordSubmitParams = {
        entryInput: mockEntryInput,
        recordData: mockRecordData,
        uploadRecordFiles: mockUploadRecordFiles,
        onSuccess: mockOnSuccess
      }

      await act(async () => {
        await result.current.submit(params)
      })

      expect(mockOnSuccess).toHaveBeenCalledWith('test-entry-id')
      expect(mockOnSuccess).toHaveBeenCalledTimes(1)
    })

    it('應該設定正確的成功訊息', async () => {
      const { result } = renderHook(() => useMultiRecordSubmit('diesel', 2025))

      const params: MultiRecordSubmitParams = {
        entryInput: mockEntryInput,
        recordData: mockRecordData,
        uploadRecordFiles: mockUploadRecordFiles
      }

      await act(async () => {
        await result.current.submit(params)
      })

      await waitFor(() => {
        expect(result.current.success).toBe('提交成功！共 2 筆記錄')
        expect(result.current.submitting).toBe(false)
      })
    })

    it('上傳失敗時應該設定錯誤訊息', async () => {
      const { result } = renderHook(() => useMultiRecordSubmit('diesel', 2025))

      const uploadError = new Error('上傳失敗')
      vi.mocked(upsertEnergyEntry).mockRejectedValue(uploadError)

      const params: MultiRecordSubmitParams = {
        entryInput: mockEntryInput,
        recordData: mockRecordData,
        uploadRecordFiles: mockUploadRecordFiles
      }

      await act(async () => {
        try {
          await result.current.submit(params)
        } catch (err) {
          // 預期會拋錯
        }
      })

      await waitFor(() => {
        expect(result.current.error).toBe('上傳失敗')
        expect(result.current.submitting).toBe(false)
      })
    })
  })

  describe('save()', () => {
    it('應該使用 status=saved 呼叫 upsertEnergyEntry', async () => {
      const { result } = renderHook(() => useMultiRecordSubmit('diesel', 2025))

      const params: MultiRecordSubmitParams = {
        entryInput: mockEntryInput,
        recordData: mockRecordData,
        uploadRecordFiles: mockUploadRecordFiles
      }

      await act(async () => {
        await result.current.save(params)
      })

      expect(upsertEnergyEntry).toHaveBeenCalledWith(
        mockEntryInput,
        false,       // preserveStatus
        'saved'      // initialStatus
      )
    })

    it('應該設定正確的暫存成功訊息', async () => {
      const { result } = renderHook(() => useMultiRecordSubmit('diesel', 2025))

      const params: MultiRecordSubmitParams = {
        entryInput: mockEntryInput,
        recordData: mockRecordData,
        uploadRecordFiles: mockUploadRecordFiles
      }

      await act(async () => {
        await result.current.save(params)
      })

      await waitFor(() => {
        expect(result.current.success).toBe('暫存成功！資料已儲存，可稍後繼續編輯')
      })
    })
  })

  describe('clearError() / clearSuccess()', () => {
    it('clearError 應該清除錯誤訊息', async () => {
      const { result } = renderHook(() => useMultiRecordSubmit('diesel', 2025))

      vi.mocked(upsertEnergyEntry).mockRejectedValue(new Error('測試錯誤'))

      const params: MultiRecordSubmitParams = {
        entryInput: mockEntryInput,
        recordData: mockRecordData,
        uploadRecordFiles: mockUploadRecordFiles
      }

      await act(async () => {
        try {
          await result.current.submit(params)
        } catch (err) {
          // ignore
        }
      })

      expect(result.current.error).toBeTruthy()

      act(() => {
        result.current.clearError()
      })

      expect(result.current.error).toBeNull()
    })

    it('clearSuccess 應該清除成功訊息', async () => {
      const { result } = renderHook(() => useMultiRecordSubmit('diesel', 2025))

      const params: MultiRecordSubmitParams = {
        entryInput: mockEntryInput,
        recordData: mockRecordData,
        uploadRecordFiles: mockUploadRecordFiles
      }

      await act(async () => {
        await result.current.save(params)
      })

      expect(result.current.success).toBeTruthy()

      act(() => {
        result.current.clearSuccess()
      })

      expect(result.current.success).toBeNull()
    })
  })

  describe('submitting 狀態', () => {
    it('提交期間 submitting 應該為 true', async () => {
      const { result } = renderHook(() => useMultiRecordSubmit('diesel', 2025))

      vi.mocked(upsertEnergyEntry).mockImplementation(() =>
        new Promise(resolve => setTimeout(() => resolve({ entry_id: 'test-id' }), 100))
      )

      const params: MultiRecordSubmitParams = {
        entryInput: mockEntryInput,
        recordData: mockRecordData,
        uploadRecordFiles: mockUploadRecordFiles
      }

      let promise: Promise<void>
      act(() => {
        promise = result.current.submit(params)
      })

      expect(result.current.submitting).toBe(true)

      await act(async () => {
        await promise
      })

      expect(result.current.submitting).toBe(false)
    })
  })
})