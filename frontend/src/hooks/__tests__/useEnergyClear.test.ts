import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { useEnergyClear } from '../useEnergyClear'
import type { ClearParams } from '../useEnergyClear'
import type { EntryStatus } from '../../components/StatusSwitcher'

// Mock dependencies
vi.mock('../../api/entries', () => ({
  deleteEnergyEntry: vi.fn()
}))

vi.mock('../../api/files', () => ({
  deleteEvidenceFile: vi.fn(),
  cleanOrphanFiles: vi.fn()
}))

vi.mock('../../services/documentHandler', () => ({
  DocumentHandler: {
    clearAllMemoryFiles: vi.fn()
  }
}))

import { deleteEnergyEntry } from '../../api/entries'
import { deleteEvidenceFile, cleanOrphanFiles } from '../../api/files'
import { DocumentHandler } from '../../services/documentHandler'

describe('useEnergyClear', () => {
  const mockFiles = [
    { id: 'file-1', file_name: 'test1.jpg', file_path: 'path/test1.jpg' },
    { id: 'file-2', file_name: 'test2.jpg', file_path: 'path/test2.jpg' }
  ] as any

  const mockMemoryFiles = [
    { file: new File([], 'mem1.jpg'), preview: 'blob:1' }
  ] as any

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(deleteEnergyEntry).mockResolvedValue(undefined)
    vi.mocked(deleteEvidenceFile).mockResolvedValue(undefined)
    vi.mocked(cleanOrphanFiles).mockResolvedValue({ deletedCount: 0, errors: [] })
  })

  describe('clear() - 成功情況', () => {
    it('應該刪除所有檔案和 entry', async () => {
      const { result } = renderHook(() => useEnergyClear('test-entry-id', 'submitted'))

      const params: ClearParams = {
        filesToDelete: mockFiles,
        memoryFilesToClean: mockMemoryFiles
      }

      await act(async () => {
        await result.current.clear(params)
      })

      // 驗證刪除所有檔案
      expect(deleteEvidenceFile).toHaveBeenCalledTimes(2)
      expect(deleteEvidenceFile).toHaveBeenCalledWith('file-1')
      expect(deleteEvidenceFile).toHaveBeenCalledWith('file-2')

      // 驗證刪除 entry
      expect(deleteEnergyEntry).toHaveBeenCalledWith('test-entry-id')

      // 驗證清理孤兒檔案
      expect(cleanOrphanFiles).toHaveBeenCalled()

      // 驗證清理記憶體檔案
      expect(DocumentHandler.clearAllMemoryFiles).toHaveBeenCalledWith(mockMemoryFiles)
    })

    it('應該支援二維陣列的 memoryFiles', async () => {
      const { result } = renderHook(() => useEnergyClear('test-entry-id', 'submitted'))

      const memoryFiles2D = [
        [{ file: new File([], 'a.jpg'), preview: 'blob:a' }],
        [{ file: new File([], 'b.jpg'), preview: 'blob:b' }]
      ] as any

      const params: ClearParams = {
        filesToDelete: [],
        memoryFilesToClean: memoryFiles2D
      }

      await act(async () => {
        await result.current.clear(params)
      })

      expect(DocumentHandler.clearAllMemoryFiles).toHaveBeenCalledTimes(2)
    })

    it('清除完成後 clearing 應該為 false', async () => {
      const { result } = renderHook(() => useEnergyClear('test-entry-id', 'submitted'))

      const params: ClearParams = {
        filesToDelete: mockFiles,
        memoryFilesToClean: mockMemoryFiles
      }

      await act(async () => {
        await result.current.clear(params)
      })

      await waitFor(() => {
        expect(result.current.clearing).toBe(false)
      })
    })
  })

  describe('clear() - 錯誤處理', () => {
    it('entryId 為 null 時應該拋錯', async () => {
      const { result } = renderHook(() => useEnergyClear(null, 'submitted'))

      const params: ClearParams = {
        filesToDelete: [],
        memoryFilesToClean: []
      }

      await act(async () => {
        await expect(result.current.clear(params)).rejects.toThrow('沒有可清除的資料')
      })

      expect(result.current.error).toBe('沒有可清除的資料')
    })

    it('approved 狀態應該拒絕清除', async () => {
      const { result } = renderHook(() => useEnergyClear('test-entry-id', 'approved'))

      const params: ClearParams = {
        filesToDelete: [],
        memoryFilesToClean: []
      }

      await act(async () => {
        await expect(result.current.clear(params)).rejects.toThrow('已通過審核的資料無法清除')
      })

      expect(result.current.error).toBe('已通過審核的資料無法清除')
      expect(deleteEnergyEntry).not.toHaveBeenCalled()
    })

    it('部分檔案刪除失敗應該收集錯誤但繼續執行', async () => {
      const { result } = renderHook(() => useEnergyClear('test-entry-id', 'submitted'))

      // 第一個檔案刪除失敗
      vi.mocked(deleteEvidenceFile)
        .mockRejectedValueOnce(new Error('刪除失敗'))
        .mockResolvedValueOnce(undefined)

      const params: ClearParams = {
        filesToDelete: mockFiles,
        memoryFilesToClean: []
      }

      await act(async () => {
        await expect(result.current.clear(params)).rejects.toThrow(/清除未完全成功/)
      })

      // 即使部分失敗，仍應嘗試刪除所有檔案
      expect(deleteEvidenceFile).toHaveBeenCalledTimes(2)
      // entry 仍應被刪除
      expect(deleteEnergyEntry).toHaveBeenCalled()
    })

    it('entry 刪除失敗應該拋錯', async () => {
      const { result } = renderHook(() => useEnergyClear('test-entry-id', 'submitted'))

      vi.mocked(deleteEnergyEntry).mockRejectedValue(new Error('資料庫錯誤'))

      const params: ClearParams = {
        filesToDelete: [],
        memoryFilesToClean: []
      }

      await act(async () => {
        await expect(result.current.clear(params)).rejects.toThrow('刪除記錄失敗，請重試')
      })

      expect(result.current.error).toBe('刪除記錄失敗，請重試')
    })

    it('孤兒檔案清理失敗不應影響主流程', async () => {
      const { result } = renderHook(() => useEnergyClear('test-entry-id', 'submitted'))

      vi.mocked(cleanOrphanFiles).mockRejectedValue(new Error('清理失敗'))

      const params: ClearParams = {
        filesToDelete: [],
        memoryFilesToClean: []
      }

      // 不應拋錯
      await act(async () => {
        await result.current.clear(params)
      })

      expect(deleteEnergyEntry).toHaveBeenCalled()
      expect(result.current.error).toBeNull()
    })

    it('孤兒檔案清理回報錯誤應該被收集', async () => {
      const { result } = renderHook(() => useEnergyClear('test-entry-id', 'submitted'))

      vi.mocked(cleanOrphanFiles).mockResolvedValue({
        deletedCount: 2,
        errors: ['檔案 A 刪除失敗', '檔案 B 刪除失敗']
      })

      const params: ClearParams = {
        filesToDelete: [],
        memoryFilesToClean: []
      }

      await act(async () => {
        await expect(result.current.clear(params)).rejects.toThrow(/清除未完全成功/)
      })

      expect(result.current.error).toContain('檔案 A 刪除失敗')
      expect(result.current.error).toContain('檔案 B 刪除失敗')
    })
  })

  describe('clearError()', () => {
    it('應該清除錯誤訊息', async () => {
      const { result } = renderHook(() => useEnergyClear('test-entry-id', 'approved'))

      const params: ClearParams = {
        filesToDelete: [],
        memoryFilesToClean: []
      }

      await act(async () => {
        try {
          await result.current.clear(params)
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
  })

  describe('clearing 狀態', () => {
    it('清除期間 clearing 應該為 true', async () => {
      const { result } = renderHook(() => useEnergyClear('test-entry-id', 'submitted'))

      vi.mocked(deleteEnergyEntry).mockImplementation(() =>
        new Promise(resolve => setTimeout(resolve, 100))
      )

      const params: ClearParams = {
        filesToDelete: [],
        memoryFilesToClean: []
      }

      let promise: Promise<void>
      act(() => {
        promise = result.current.clear(params)
      })

      await waitFor(() => {
        expect(result.current.clearing).toBe(true)
      })

      await act(async () => {
        await promise
      })

      expect(result.current.clearing).toBe(false)
    })
  })
})