import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { useEvidenceFiles } from '../useEvidenceFiles'
import * as filesAPI from '../../api/files'

// Mock API
vi.mock('../../api/files', () => ({
  getEntryFiles: vi.fn(),
  uploadEvidenceWithEntry: vi.fn(),
  deleteEvidenceFile: vi.fn()
}))

describe('useEvidenceFiles', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('初始化', () => {
    it('沒有 entryId 時不應載入檔案', () => {
      const { result } = renderHook(() => useEvidenceFiles(null))

      expect(result.current.files).toEqual([])
      expect(result.current.loading).toBe(false)
      expect(filesAPI.getEntryFiles).not.toHaveBeenCalled()
    })

    it('有 entryId 時應自動載入檔案', async () => {
      const mockFiles = [
        {
          id: 'file-1',
          file_name: 'test.pdf',
          file_size: 1024,
          mime_type: 'application/pdf',
          file_path: '/path/to/file',
          created_at: '2025-01-01',
          owner_id: 'user-1',
          entry_id: 'entry-1',
          file_type: 'usage_evidence'
        }
      ]

      vi.mocked(filesAPI.getEntryFiles).mockResolvedValue(mockFiles)

      const { result } = renderHook(() => useEvidenceFiles('entry-1'))

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      expect(filesAPI.getEntryFiles).toHaveBeenCalledWith('entry-1')
      expect(result.current.files).toEqual(mockFiles)
      expect(result.current.error).toBeNull()
    })

    it('載入失敗時應設定錯誤訊息', async () => {
      vi.mocked(filesAPI.getEntryFiles).mockRejectedValue(new Error('Network error'))

      const { result } = renderHook(() => useEvidenceFiles('entry-1'))

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      expect(result.current.files).toEqual([])
      expect(result.current.error).toBe('Network error')
    })

    it('應該去除重複的檔案', async () => {
      const mockFiles = [
        {
          id: 'file-1',
          file_name: 'test.pdf',
          file_size: 1024,
          mime_type: 'application/pdf',
          file_path: '/path/to/file',
          created_at: '2025-01-01',
          owner_id: 'user-1',
          entry_id: 'entry-1',
          file_type: 'usage_evidence'
        },
        {
          id: 'file-1', // 重複的 ID
          file_name: 'test.pdf',
          file_size: 1024,
          mime_type: 'application/pdf',
          file_path: '/path/to/file',
          created_at: '2025-01-01',
          owner_id: 'user-1',
          entry_id: 'entry-1',
          file_type: 'usage_evidence'
        }
      ]

      vi.mocked(filesAPI.getEntryFiles).mockResolvedValue(mockFiles)

      const { result } = renderHook(() => useEvidenceFiles('entry-1'))

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      expect(result.current.files).toHaveLength(1)
      expect(result.current.files[0].id).toBe('file-1')
    })
  })

  describe('addFiles - 新增檔案到暫存', () => {
    it('應該將檔案新增到暫存區', () => {
      const { result } = renderHook(() => useEvidenceFiles(null))

      const mockFile = new File(['content'], 'test.pdf', { type: 'application/pdf' })

      act(() => {
        result.current.addFiles([mockFile])
      })

      expect(result.current.files).toHaveLength(1)
      expect(result.current.files[0].file_name).toBe('test.pdf')
      expect(result.current.files[0].file_size).toBe(7) // 'content' length
      expect(result.current.files[0].id).toMatch(/^memory-/)
    })

    it('應該為圖片檔案建立預覽 URL', () => {
      const { result } = renderHook(() => useEvidenceFiles(null))

      const mockFile = new File(['content'], 'image.jpg', { type: 'image/jpeg' })

      // Mock URL.createObjectURL
      global.URL.createObjectURL = vi.fn(() => 'blob:http://localhost/test')

      act(() => {
        result.current.addFiles([mockFile])
      })

      expect(result.current.files[0].file_path).toBe('blob:http://localhost/test')
      expect(global.URL.createObjectURL).toHaveBeenCalledWith(mockFile)
    })

    it('應該可以新增多個檔案', () => {
      const { result } = renderHook(() => useEvidenceFiles(null))

      const files = [
        new File(['1'], 'test1.pdf', { type: 'application/pdf' }),
        new File(['2'], 'test2.pdf', { type: 'application/pdf' })
      ]

      act(() => {
        result.current.addFiles(files)
      })

      expect(result.current.files).toHaveLength(2)
      expect(result.current.files[0].file_name).toBe('test1.pdf')
      expect(result.current.files[1].file_name).toBe('test2.pdf')
    })

    it('hasMemoryFiles 應該回傳 true', () => {
      const { result } = renderHook(() => useEvidenceFiles(null))

      const mockFile = new File(['content'], 'test.pdf', { type: 'application/pdf' })

      act(() => {
        result.current.addFiles([mockFile])
      })

      expect(result.current.hasMemoryFiles).toBe(true)
    })
  })

  describe('removeFile - 刪除檔案', () => {
    it('應該刪除暫存檔案', () => {
      const { result } = renderHook(() => useEvidenceFiles(null))

      const mockFile = new File(['content'], 'test.pdf', { type: 'application/pdf' })

      act(() => {
        result.current.addFiles([mockFile])
      })

      const fileId = result.current.files[0].id

      act(() => {
        result.current.removeFile(fileId)
      })

      expect(result.current.files).toHaveLength(0)
    })

    it('應該釋放圖片預覽 URL', () => {
      const { result } = renderHook(() => useEvidenceFiles(null))

      const mockFile = new File(['content'], 'image.jpg', { type: 'image/jpeg' })

      global.URL.createObjectURL = vi.fn(() => 'blob:http://localhost/test')
      global.URL.revokeObjectURL = vi.fn()

      act(() => {
        result.current.addFiles([mockFile])
      })

      const fileId = result.current.files[0].id

      act(() => {
        result.current.removeFile(fileId)
      })

      expect(global.URL.revokeObjectURL).toHaveBeenCalledWith('blob:http://localhost/test')
    })

    it('應該刪除伺服器檔案', async () => {
      vi.mocked(filesAPI.deleteEvidenceFile).mockResolvedValue()

      const mockFiles = [
        {
          id: 'server-file-1',
          file_name: 'test.pdf',
          file_size: 1024,
          mime_type: 'application/pdf',
          file_path: '/path/to/file',
          created_at: '2025-01-01',
          owner_id: 'user-1',
          entry_id: 'entry-1',
          file_type: 'usage_evidence'
        }
      ]

      vi.mocked(filesAPI.getEntryFiles).mockResolvedValue(mockFiles)

      const { result } = renderHook(() => useEvidenceFiles('entry-1'))

      await waitFor(() => {
        expect(result.current.files).toHaveLength(1)
      })

      await act(async () => {
        await result.current.removeFile('server-file-1')
      })

      expect(filesAPI.deleteEvidenceFile).toHaveBeenCalledWith('server-file-1')
      expect(result.current.files).toHaveLength(0)
    })

    it('刪除伺服器檔案失敗時應設定錯誤', async () => {
      vi.mocked(filesAPI.deleteEvidenceFile).mockRejectedValue(new Error('Delete failed'))

      const mockFiles = [
        {
          id: 'server-file-1',
          file_name: 'test.pdf',
          file_size: 1024,
          mime_type: 'application/pdf',
          file_path: '/path/to/file',
          created_at: '2025-01-01',
          owner_id: 'user-1',
          entry_id: 'entry-1',
          file_type: 'usage_evidence'
        }
      ]

      vi.mocked(filesAPI.getEntryFiles).mockResolvedValue(mockFiles)

      const { result } = renderHook(() => useEvidenceFiles('entry-1'))

      await waitFor(() => {
        expect(result.current.files).toHaveLength(1)
      })

      await expect(act(async () => {
        await result.current.removeFile('server-file-1')
      })).rejects.toThrow('Delete failed')

      expect(result.current.error).toBe('Delete failed')
      expect(result.current.files).toHaveLength(1) // 檔案未被刪除
    })
  })

  describe('uploadAll - 上傳所有暫存檔案', () => {
    it('應該上傳所有暫存檔案', async () => {
      vi.mocked(filesAPI.uploadEvidenceWithEntry).mockResolvedValue({
        id: 'uploaded-1',
        file_name: 'test.pdf',
        file_size: 1024,
        mime_type: 'application/pdf',
        file_path: '/path/to/file',
        created_at: '2025-01-01',
        owner_id: 'user-1',
        entry_id: 'entry-1',
        file_type: 'usage_evidence'
      })

      vi.mocked(filesAPI.getEntryFiles).mockResolvedValue([])

      const { result } = renderHook(() => useEvidenceFiles(null))

      const files = [
        new File(['1'], 'test1.pdf', { type: 'application/pdf' }),
        new File(['2'], 'test2.pdf', { type: 'application/pdf' })
      ]

      act(() => {
        result.current.addFiles(files)
      })

      let uploadResult
      await act(async () => {
        uploadResult = await result.current.uploadAll('entry-1', {
          pageKey: 'diesel',
          year: 2025,
          category: 'usage_evidence'
        })
      })

      expect(uploadResult).toEqual({ succeeded: 2, failed: 0 })
      expect(filesAPI.uploadEvidenceWithEntry).toHaveBeenCalledTimes(2)
    })

    it('沒有暫存檔案時應直接返回', async () => {
      const { result } = renderHook(() => useEvidenceFiles(null))

      let uploadResult
      await act(async () => {
        uploadResult = await result.current.uploadAll('entry-1')
      })

      expect(uploadResult).toEqual({ succeeded: 0, failed: 0 })
      expect(filesAPI.uploadEvidenceWithEntry).not.toHaveBeenCalled()
    })

    it('上傳失敗時應計算失敗數量', async () => {
      vi.mocked(filesAPI.uploadEvidenceWithEntry)
        .mockResolvedValueOnce({
          id: 'uploaded-1',
          file_name: 'test.pdf',
          file_size: 1024,
          mime_type: 'application/pdf',
          file_path: '/path/to/file',
          created_at: '2025-01-01',
          owner_id: 'user-1',
          entry_id: 'entry-1',
          file_type: 'usage_evidence'
        })
        .mockRejectedValueOnce(new Error('Upload failed'))

      vi.mocked(filesAPI.getEntryFiles).mockResolvedValue([])

      const { result } = renderHook(() => useEvidenceFiles(null))

      const files = [
        new File(['1'], 'test1.pdf', { type: 'application/pdf' }),
        new File(['2'], 'test2.pdf', { type: 'application/pdf' })
      ]

      act(() => {
        result.current.addFiles(files)
      })

      let uploadResult
      await act(async () => {
        uploadResult = await result.current.uploadAll('entry-1', {
          pageKey: 'diesel',
          year: 2025
        })
      })

      expect(uploadResult).toEqual({ succeeded: 1, failed: 1 })
    })

    it('上傳後應重新載入檔案', async () => {
      const uploadedFile = {
        id: 'uploaded-1',
        file_name: 'test.pdf',
        file_size: 1024,
        mime_type: 'application/pdf',
        file_path: '/path/to/file',
        created_at: '2025-01-01',
        owner_id: 'user-1',
        entry_id: 'entry-1',
        file_type: 'usage_evidence'
      }

      vi.mocked(filesAPI.uploadEvidenceWithEntry).mockResolvedValue(uploadedFile)
      vi.mocked(filesAPI.getEntryFiles).mockResolvedValue([uploadedFile])

      const { result } = renderHook(() => useEvidenceFiles(null))

      const mockFile = new File(['content'], 'test.pdf', { type: 'application/pdf' })

      act(() => {
        result.current.addFiles([mockFile])
      })

      expect(result.current.files[0].id).toMatch(/^memory-/)

      await act(async () => {
        await result.current.uploadAll('entry-1', {
          pageKey: 'diesel',
          year: 2025
        })
      })

      await waitFor(() => {
        expect(result.current.files[0].id).toBe('uploaded-1')
      })
    })
  })

  describe('clear - 清空所有檔案', () => {
    it('應該清空所有檔案', () => {
      const { result } = renderHook(() => useEvidenceFiles(null))

      const mockFile = new File(['content'], 'test.pdf', { type: 'application/pdf' })

      act(() => {
        result.current.addFiles([mockFile])
      })

      expect(result.current.files).toHaveLength(1)

      act(() => {
        result.current.clear()
      })

      expect(result.current.files).toHaveLength(0)
    })

    it('應該釋放所有預覽 URL', () => {
      const { result } = renderHook(() => useEvidenceFiles(null))

      const mockFile = new File(['content'], 'image.jpg', { type: 'image/jpeg' })

      global.URL.createObjectURL = vi.fn(() => 'blob:http://localhost/test')
      global.URL.revokeObjectURL = vi.fn()

      act(() => {
        result.current.addFiles([mockFile])
      })

      act(() => {
        result.current.clear()
      })

      expect(global.URL.revokeObjectURL).toHaveBeenCalledWith('blob:http://localhost/test')
    })
  })

  describe('reload - 重新載入檔案', () => {
    it('應該重新載入檔案', async () => {
      const mockFiles = [
        {
          id: 'file-1',
          file_name: 'test.pdf',
          file_size: 1024,
          mime_type: 'application/pdf',
          file_path: '/path/to/file',
          created_at: '2025-01-01',
          owner_id: 'user-1',
          entry_id: 'entry-1',
          file_type: 'usage_evidence'
        }
      ]

      vi.mocked(filesAPI.getEntryFiles).mockResolvedValue(mockFiles)

      const { result } = renderHook(() => useEvidenceFiles('entry-1'))

      await waitFor(() => {
        expect(result.current.files).toHaveLength(1)
      })

      // 清空檔案
      vi.mocked(filesAPI.getEntryFiles).mockResolvedValue([])

      await act(async () => {
        await result.current.reload()
      })

      expect(result.current.files).toHaveLength(0)
    })
  })
})
