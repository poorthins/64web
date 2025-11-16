import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { useRecordFileMapping } from '../useRecordFileMapping'
import type { EvidenceFile } from '../../api/files'

// Mock dependencies
vi.mock('../../api/files', () => ({
  uploadEvidenceWithEntry: vi.fn()
}))

import { uploadEvidenceWithEntry } from '../../api/files'

describe('useRecordFileMapping', () => {
  const mockFile1 = { file: new File([], 'test1.jpg'), preview: 'blob:1' } as any
  const mockFile2 = { file: new File([], 'test2.jpg'), preview: 'blob:2' } as any

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(uploadEvidenceWithEntry)
      .mockResolvedValueOnce({ id: 'file-id-1' } as any)
      .mockResolvedValueOnce({ id: 'file-id-2' } as any)
  })

  describe('uploadRecordFiles()', () => {
    it('應該上傳檔案並更新映射表', async () => {
      const { result } = renderHook(() => useRecordFileMapping('diesel', 'entry-1'))

      const fileIds = await act(async () => {
        return await result.current.uploadRecordFiles('record-1', [mockFile1, mockFile2])
      })

      // 驗證上傳
      expect(uploadEvidenceWithEntry).toHaveBeenCalledTimes(2)
      expect(uploadEvidenceWithEntry).toHaveBeenCalledWith(
        mockFile1.file,
        expect.objectContaining({
          entryId: 'entry-1',
          pageKey: 'diesel',
          recordId: 'record-1',
          fileType: 'other'
        })
      )

      // 驗證回傳檔案 ID
      expect(fileIds).toEqual(['file-id-1', 'file-id-2'])

      // 驗證映射表更新
      await waitFor(() => {
        expect(result.current.fileMapping['record-1']).toEqual(['file-id-1', 'file-id-2'])
      })
    })

    it('應該支援 dynamicEntryId 參數', async () => {
      const { result } = renderHook(() => useRecordFileMapping('diesel', 'entry-1'))

      await act(async () => {
        await result.current.uploadRecordFiles('record-1', [mockFile1], 'entry-2')
      })

      expect(uploadEvidenceWithEntry).toHaveBeenCalledWith(
        mockFile1.file,
        expect.objectContaining({
          entryId: 'entry-2'  // 使用動態 entryId
        })
      )
    })

    it('應該支援自訂 fileType', async () => {
      const { result } = renderHook(() => useRecordFileMapping('diesel', 'entry-1'))

      await act(async () => {
        await result.current.uploadRecordFiles('record-1', [mockFile1], undefined, 'msds')
      })

      expect(uploadEvidenceWithEntry).toHaveBeenCalledWith(
        mockFile1.file,
        expect.objectContaining({
          fileType: 'msds'
        })
      )
    })

    it('應該傳遞 allRecordIds 參數', async () => {
      const { result } = renderHook(() => useRecordFileMapping('diesel', 'entry-1'))

      const allRecordIds = ['record-1', 'record-2', 'record-3']

      await act(async () => {
        await result.current.uploadRecordFiles(
          'record-1',
          [mockFile1],
          undefined,
          undefined,
          allRecordIds
        )
      })

      expect(uploadEvidenceWithEntry).toHaveBeenCalledWith(
        mockFile1.file,
        expect.objectContaining({
          allRecordIds: allRecordIds
        })
      )
    })

    it('空檔案陣列應該返回空陣列', async () => {
      const { result } = renderHook(() => useRecordFileMapping('diesel', 'entry-1'))

      const fileIds = await act(async () => {
        return await result.current.uploadRecordFiles('record-1', [])
      })

      expect(fileIds).toEqual([])
      expect(uploadEvidenceWithEntry).not.toHaveBeenCalled()
    })

    it('entryId 為 null 時應該拋錯', async () => {
      const { result } = renderHook(() => useRecordFileMapping('diesel', null))

      await act(async () => {
        await expect(
          result.current.uploadRecordFiles('record-1', [mockFile1])
        ).rejects.toThrow('entryId 為空，無法上傳檔案')
      })
    })

    it('上傳失敗應該拋出錯誤', async () => {
      // 清除 beforeEach 的 mock 並設置失敗情況
      vi.mocked(uploadEvidenceWithEntry).mockReset()

      const { result } = renderHook(() => useRecordFileMapping('diesel', 'entry-1'))

      const uploadError = new Error('上傳失敗')
      vi.mocked(uploadEvidenceWithEntry).mockRejectedValue(uploadError)

      await act(async () => {
        await expect(
          result.current.uploadRecordFiles('record-1', [mockFile1])
        ).rejects.toThrow('上傳失敗')
      })
    })

    it('應該累積同一記錄的多次上傳', async () => {
      // 清除 beforeEach 的 mock 並重新設置
      vi.mocked(uploadEvidenceWithEntry).mockReset()
      vi.mocked(uploadEvidenceWithEntry)
        .mockResolvedValueOnce({ id: 'file-id-1' } as any)
        .mockResolvedValueOnce({ id: 'file-id-3' } as any)

      const { result } = renderHook(() => useRecordFileMapping('diesel', 'entry-1'))

      // 第一次上傳
      await act(async () => {
        await result.current.uploadRecordFiles('record-1', [mockFile1])
      })

      // 第二次上傳
      await act(async () => {
        await result.current.uploadRecordFiles('record-1', [mockFile2])
      })

      await waitFor(() => {
        // 應該累積檔案 ID
        expect(result.current.fileMapping['record-1']).toEqual(['file-id-1', 'file-id-3'])
      })
    })
  })

  describe('getRecordFiles()', () => {
    it('應該從 record_ids 陣列查詢檔案（優先）', () => {
      const { result } = renderHook(() => useRecordFileMapping('diesel', 'entry-1'))

      const allFiles = [
        { id: 'file-1', record_ids: ['record-1', 'record-2'] },
        { id: 'file-2', record_ids: ['record-2'] },
        { id: 'file-3', record_ids: ['record-1'] }
      ] as any

      const files = result.current.getRecordFiles('record-1', allFiles)

      expect(files).toHaveLength(2)
      expect(files.map(f => f.id)).toEqual(['file-1', 'file-3'])
    })

    it('應該從 record_id 欄位查詢檔案（fallback 1）', () => {
      const { result } = renderHook(() => useRecordFileMapping('diesel', 'entry-1'))

      const allFiles = [
        { id: 'file-1', record_id: 'record-1' },
        { id: 'file-2', record_id: 'record-2' },
        { id: 'file-3', record_id: 'record-1' }
      ] as any

      const files = result.current.getRecordFiles('record-1', allFiles)

      expect(files).toHaveLength(2)
      expect(files.map(f => f.id)).toEqual(['file-1', 'file-3'])
    })

    it('應該從 recordId 欄位查詢檔案（向後相容）', () => {
      const { result } = renderHook(() => useRecordFileMapping('diesel', 'entry-1'))

      const allFiles = [
        { id: 'file-1', recordId: 'record-1' },  // 注意是 recordId 不是 record_id
        { id: 'file-2', recordId: 'record-2' }
      ] as any

      const files = result.current.getRecordFiles('record-1', allFiles)

      expect(files).toHaveLength(1)
      expect(files[0].id).toBe('file-1')
    })

    it('應該從 fileMapping 查詢檔案（fallback 2）', () => {
      const { result } = renderHook(() => useRecordFileMapping('diesel', 'entry-1'))

      // 手動載入映射表
      act(() => {
        result.current.loadFileMapping({
          fileMapping: {
            'record-1': ['file-1', 'file-3']
          }
        })
      })

      const allFiles = [
        { id: 'file-1' },
        { id: 'file-2' },
        { id: 'file-3' }
      ] as any

      const files = result.current.getRecordFiles('record-1', allFiles)

      expect(files).toHaveLength(2)
      expect(files.map(f => f.id)).toEqual(['file-1', 'file-3'])
    })

    it('找不到檔案時應該返回空陣列', () => {
      const { result } = renderHook(() => useRecordFileMapping('diesel', 'entry-1'))

      const allFiles = [
        { id: 'file-1', record_id: 'record-2' }
      ] as any

      const files = result.current.getRecordFiles('record-1', allFiles)

      expect(files).toEqual([])
    })

    it('優先順序：record_ids > record_id > fileMapping', () => {
      const { result } = renderHook(() => useRecordFileMapping('diesel', 'entry-1'))

      // 載入 fileMapping（最低優先）
      act(() => {
        result.current.loadFileMapping({
          fileMapping: {
            'record-1': ['file-3']
          }
        })
      })

      // allFiles 同時有 record_ids 和 record_id
      const allFiles = [
        { id: 'file-1', record_ids: ['record-1'] },  // 最高優先
        { id: 'file-2', record_id: 'record-1' },     // 次優先
        { id: 'file-3' }                              // 最低優先（fileMapping）
      ] as any

      const files = result.current.getRecordFiles('record-1', allFiles)

      // 應該只返回 record_ids 的結果
      expect(files).toHaveLength(1)
      expect(files[0].id).toBe('file-1')
    })
  })

  describe('loadFileMapping()', () => {
    it('應該從 payload 載入映射表', () => {
      const { result } = renderHook(() => useRecordFileMapping('diesel', 'entry-1'))

      const payload = {
        fileMapping: {
          'record-1': ['file-1', 'file-2'],
          'record-2': ['file-3']
        }
      }

      act(() => {
        result.current.loadFileMapping(payload)
      })

      expect(result.current.fileMapping).toEqual(payload.fileMapping)
    })

    it('payload 沒有 fileMapping 應該設為空物件', () => {
      const { result } = renderHook(() => useRecordFileMapping('diesel', 'entry-1'))

      const payload = {
        records: []
      }

      act(() => {
        result.current.loadFileMapping(payload)
      })

      expect(result.current.fileMapping).toEqual({})
    })

    it('payload 為 null 應該設為空物件', () => {
      const { result } = renderHook(() => useRecordFileMapping('diesel', 'entry-1'))

      act(() => {
        result.current.loadFileMapping(null)
      })

      expect(result.current.fileMapping).toEqual({})
    })
  })

  describe('getFileMappingForPayload()', () => {
    it('應該返回當前的映射表', async () => {
      const { result } = renderHook(() => useRecordFileMapping('diesel', 'entry-1'))

      // 上傳檔案建立映射
      await act(async () => {
        await result.current.uploadRecordFiles('record-1', [mockFile1])
      })

      const mapping = result.current.getFileMappingForPayload()

      expect(mapping).toEqual({
        'record-1': ['file-id-1']
      })
    })
  })

  describe('removeRecordMapping()', () => {
    it('應該刪除指定記錄的映射', () => {
      const { result } = renderHook(() => useRecordFileMapping('diesel', 'entry-1'))

      // 載入映射表
      act(() => {
        result.current.loadFileMapping({
          fileMapping: {
            'record-1': ['file-1'],
            'record-2': ['file-2'],
            'record-3': ['file-3']
          }
        })
      })

      // 刪除 record-2
      act(() => {
        result.current.removeRecordMapping('record-2')
      })

      expect(result.current.fileMapping).toEqual({
        'record-1': ['file-1'],
        'record-3': ['file-3']
      })
    })

    it('刪除不存在的記錄應該不影響映射表', () => {
      const { result } = renderHook(() => useRecordFileMapping('diesel', 'entry-1'))

      act(() => {
        result.current.loadFileMapping({
          fileMapping: {
            'record-1': ['file-1']
          }
        })
      })

      act(() => {
        result.current.removeRecordMapping('record-999')
      })

      expect(result.current.fileMapping).toEqual({
        'record-1': ['file-1']
      })
    })
  })

  describe('核心場景：刪除中間記錄後檔案對應正確', () => {
    it('刪除中間記錄後，其他記錄的檔案不應被影響', async () => {
      // 清除 beforeEach 的 mock 並重新設置
      vi.mocked(uploadEvidenceWithEntry).mockReset()
      vi.mocked(uploadEvidenceWithEntry)
        .mockResolvedValueOnce({ id: 'file-id-1' } as any)
        .mockResolvedValueOnce({ id: 'file-id-3' } as any)
        .mockResolvedValueOnce({ id: 'file-id-4' } as any)

      const { result } = renderHook(() => useRecordFileMapping('diesel', 'entry-1'))

      // 上傳三個記錄的檔案
      await act(async () => {
        await result.current.uploadRecordFiles('record-1', [mockFile1])
      })

      await act(async () => {
        await result.current.uploadRecordFiles('record-2', [mockFile2])
      })

      const file3 = { file: new File([], 'test3.jpg'), preview: 'blob:3' } as any
      await act(async () => {
        await result.current.uploadRecordFiles('record-3', [file3])
      })

      // 刪除中間記錄（record-2）
      act(() => {
        result.current.removeRecordMapping('record-2')
      })

      // 驗證映射表
      expect(result.current.fileMapping).toEqual({
        'record-1': ['file-id-1'],
        'record-3': ['file-id-4']
      })

      // 驗證查詢檔案（模擬從資料庫載入）
      const allFiles = [
        { id: 'file-id-1', record_id: 'record-1' },
        { id: 'file-id-3', record_id: 'record-2' },
        { id: 'file-id-4', record_id: 'record-3' }
      ] as EvidenceFile[]

      const files1 = result.current.getRecordFiles('record-1', allFiles)
      const files3 = result.current.getRecordFiles('record-3', allFiles)

      expect(files1.map(f => f.id)).toEqual(['file-id-1'])
      expect(files3.map(f => f.id)).toEqual(['file-id-4'])
    })
  })
})