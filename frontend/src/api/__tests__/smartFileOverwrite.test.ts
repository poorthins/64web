import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { EvidenceFile } from '../files'
import type { MemoryFile } from '../../components/EvidenceUpload'

// Mock files API
vi.mock('../files', () => ({
  deleteEvidenceFile: vi.fn(),
  uploadEvidenceWithEntry: vi.fn(),
}))

// Import after mocking
const { smartOverwriteFiles } = await import('../smartFileOverwrite')
const { deleteEvidenceFile, uploadEvidenceWithEntry } = await import('../files')

describe('智慧型檔案覆蓋 API 測試', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // 測試用的 mock 資料
  const createMockEvidenceFile = (id: string, fileName: string, fileType: 'msds' | 'usage_evidence' = 'usage_evidence'): EvidenceFile => ({
    id,
    owner_id: 'user-123',
    entry_id: 'entry-456',
    file_path: `/test/path/${fileName}`,
    file_name: fileName,
    mime_type: 'image/jpeg',
    file_size: 1024,
    created_at: '2024-01-01T00:00:00Z',
    file_type: fileType,
    page_key: 'urea',
    month: fileType === 'usage_evidence' ? 1 : null
  })

  const createMockMemoryFile = (fileName: string): MemoryFile => ({
    id: `memory-${fileName}`,
    file: new File(['test content'], fileName, { type: 'image/jpeg' }),
    preview: '',
    file_name: fileName,
    file_size: 1024,
    mime_type: 'image/jpeg'
  })

  const mockOptions = {
    entryId: 'entry-456',
    pageKey: 'urea',
    year: 2024,
    debug: false
  }

  it('應該只覆蓋有新檔案的項目', async () => {
    const existingFile1 = createMockEvidenceFile('file-1', 'old-file-1.jpg')
    const existingFile2 = createMockEvidenceFile('file-2', 'old-file-2.jpg')
    const newFile1 = createMockMemoryFile('new-file-1.jpg')

    const items = [
      {
        itemKey: 'item1',
        newFiles: [newFile1], // 有新檔案 - 應該覆蓋
        existingFiles: [existingFile1],
        fileType: 'usage_evidence' as const
      },
      {
        itemKey: 'item2',
        newFiles: [], // 沒有新檔案 - 應該保留
        existingFiles: [existingFile2],
        fileType: 'usage_evidence' as const
      }
    ]

    vi.mocked(deleteEvidenceFile).mockResolvedValue(undefined)
    vi.mocked(uploadEvidenceWithEntry).mockResolvedValue(existingFile1)

    const results = await smartOverwriteFiles(items, mockOptions)

    expect(results).toHaveLength(2)

    // 第一個項目：有新檔案，應該刪除舊檔案並上傳新檔案
    expect(results[0]).toEqual({
      itemKey: 'item1',
      deleted: 1,
      uploaded: 1,
      kept: 0
    })

    // 第二個項目：沒有新檔案，應該保留現有檔案
    expect(results[1]).toEqual({
      itemKey: 'item2',
      deleted: 0,
      uploaded: 0,
      kept: 1
    })

    // 驗證 API 呼叫
    expect(vi.mocked(deleteEvidenceFile)).toHaveBeenCalledTimes(1)
    expect(vi.mocked(deleteEvidenceFile)).toHaveBeenCalledWith('file-1')
    expect(vi.mocked(uploadEvidenceWithEntry)).toHaveBeenCalledTimes(1)
    expect(vi.mocked(uploadEvidenceWithEntry)).toHaveBeenCalledWith(
      newFile1.file,
      expect.objectContaining({
        entryId: 'entry-456',
        pageKey: 'urea',
        year: 2024,
        category: 'usage_evidence'
      })
    )
  })

  it('應該正確處理 MSDS 檔案類型', async () => {
    const existingMsdsFile = createMockEvidenceFile('msds-1', 'old-msds.pdf', 'msds')
    const newMsdsFile = createMockMemoryFile('new-msds.pdf')

    const items = [
      {
        itemKey: 'msds',
        newFiles: [newMsdsFile],
        existingFiles: [existingMsdsFile],
        fileType: 'msds' as const
      }
    ]

    mockDeleteEvidenceFile.mockResolvedValue(undefined)
    mockUploadEvidenceWithEntry.mockResolvedValue(existingMsdsFile)

    await smartOverwriteFiles(items, mockOptions)

    expect(mockUploadEvidenceWithEntry).toHaveBeenCalledWith(
      newMsdsFile.file,
      expect.objectContaining({
        category: 'msds',
        month: undefined // MSDS 檔案不應該有月份
      })
    )
  })

  it('應該處理數字 itemKey 作為月份', async () => {
    const existingFile = createMockEvidenceFile('file-1', 'jan-usage.jpg')
    const newFile = createMockMemoryFile('new-jan-usage.jpg')

    const items = [
      {
        itemKey: 3, // 3月
        newFiles: [newFile],
        existingFiles: [existingFile],
        fileType: 'usage_evidence' as const
      }
    ]

    mockDeleteEvidenceFile.mockResolvedValue(undefined)
    mockUploadEvidenceWithEntry.mockResolvedValue(existingFile)

    await smartOverwriteFiles(items, mockOptions)

    expect(mockUploadEvidenceWithEntry).toHaveBeenCalledWith(
      newFile.file,
      expect.objectContaining({
        category: 'usage_evidence',
        month: 3
      })
    )
  })

  it('應該處理檔案刪除失敗但繼續上傳', async () => {
    const existingFile = createMockEvidenceFile('file-1', 'old-file.jpg')
    const newFile = createMockMemoryFile('new-file.jpg')

    const items = [
      {
        itemKey: 'item1',
        newFiles: [newFile],
        existingFiles: [existingFile],
        fileType: 'usage_evidence' as const
      }
    ]

    // Mock 刪除失敗但上傳成功
    mockDeleteEvidenceFile.mockRejectedValue(new Error('Delete failed'))
    mockUploadEvidenceWithEntry.mockResolvedValue(existingFile)

    const results = await smartOverwriteFiles(items, mockOptions)

    expect(results[0]).toEqual({
      itemKey: 'item1',
      deleted: 0, // 刪除失敗
      uploaded: 1, // 但上傳成功
      kept: 0
    })
  })

  it('應該處理上傳失敗的情況', async () => {
    const existingFile = createMockEvidenceFile('file-1', 'old-file.jpg')
    const newFile = createMockMemoryFile('new-file.jpg')

    const items = [
      {
        itemKey: 'item1',
        newFiles: [newFile],
        existingFiles: [existingFile],
        fileType: 'usage_evidence' as const
      }
    ]

    mockDeleteEvidenceFile.mockResolvedValue(undefined)
    mockUploadEvidenceWithEntry.mockRejectedValue(new Error('Upload failed'))

    const results = await smartOverwriteFiles(items, mockOptions)

    expect(results[0]).toEqual({
      itemKey: 'item1',
      deleted: 1,
      uploaded: 0,
      kept: 0,
      error: 'Upload failed'
    })
  })

  it('應該正確計算總計統計', async () => {
    const items = [
      {
        itemKey: 'item1',
        newFiles: [createMockMemoryFile('new1.jpg')],
        existingFiles: [createMockEvidenceFile('old1', 'old1.jpg')],
        fileType: 'usage_evidence' as const
      },
      {
        itemKey: 'item2',
        newFiles: [], // 保留
        existingFiles: [
          createMockEvidenceFile('old2', 'old2.jpg'),
          createMockEvidenceFile('old3', 'old3.jpg')
        ],
        fileType: 'usage_evidence' as const
      }
    ]

    mockDeleteEvidenceFile.mockResolvedValue(undefined)
    mockUploadEvidenceWithEntry.mockResolvedValue({} as EvidenceFile)

    const results = await smartOverwriteFiles(items, { ...mockOptions, debug: true })

    // 總計：1個刪除，1個上傳，2個保留
    const totalDeleted = results.reduce((sum, r) => sum + r.deleted, 0)
    const totalUploaded = results.reduce((sum, r) => sum + r.uploaded, 0)
    const totalKept = results.reduce((sum, r) => sum + r.kept, 0)

    expect(totalDeleted).toBe(1)
    expect(totalUploaded).toBe(1)
    expect(totalKept).toBe(2)
  })

  it('應該在除錯模式下輸出詳細記錄', async () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

    const items = [
      {
        itemKey: 'test',
        newFiles: [],
        existingFiles: [createMockEvidenceFile('file1', 'test.jpg')],
        fileType: 'usage_evidence' as const
      }
    ]

    await smartOverwriteFiles(items, { ...mockOptions, debug: true })

    expect(consoleSpy).toHaveBeenCalledWith('========== 智慧型檔案覆蓋開始 ==========')
    expect(consoleSpy).toHaveBeenCalledWith('========== 智慧型檔案覆蓋完成 ==========')

    consoleSpy.mockRestore()
  })
})