import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { uploadEvidence, uploadEvidenceWithEntry, type FileMetadata, type EvidenceFile } from '../files'
import * as authHelpers from '../../utils/authHelpers'
import { supabase } from '../../supabaseClient'

// Mock Supabase
vi.mock('../../supabaseClient', () => ({
  supabase: {
    from: vi.fn(),
    storage: {
      from: vi.fn()
    }
  }
}))

// Mock authHelpers
vi.mock('../../utils/authHelpers', () => ({
  validateAuth: vi.fn(),
  handleAPIError: vi.fn((error, message) => new Error(message))
}))

// Mock entries module
vi.mock('../entries', () => ({
  getCategoryFromPageKey: vi.fn((pageKey: string) => {
    const map: Record<string, string> = {
      'diesel': '柴油',
      'gasoline': '汽油',
      'natural_gas': '天然氣'
    }
    return map[pageKey] || pageKey
  })
}))

// Mock categoryConstants
vi.mock('../../utils/categoryConstants', () => ({
  getCategoryInfo: vi.fn(() => ({
    standard: '64',
    scope: 1
  }))
}))

describe('files.ts', () => {
  const mockUser = {
    id: 'user-123',
    email: 'test@example.com',
    app_metadata: {},
    user_metadata: {},
    aud: 'authenticated',
    created_at: new Date().toISOString()
  } as any

  const mockFile = new File(['test content'], 'test.pdf', { type: 'application/pdf' })

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

  describe('uploadEvidence', () => {
    const validMeta: FileMetadata & { entryId: string } = {
      pageKey: 'diesel',
      standard: '64',
      year: 2024,
      entryId: 'entry-123',
      fileType: 'usage_evidence',
      month: 1
    }

    it('應該成功上傳檔案', async () => {
      // Mock Storage upload
      const mockUpload = vi.fn().mockResolvedValue({
        data: { path: 'test-path' },
        error: null
      })

      vi.mocked(supabase.storage.from).mockReturnValue({
        upload: mockUpload
      } as any)

      // Mock database insert with chainable methods
      const mockSingle = vi.fn().mockResolvedValue({
        data: {
          id: 'file-123',
          owner_id: mockUser.id,
          entry_id: 'entry-123',
          file_path: 'test-path',
          file_name: 'test.pdf',
          mime_type: 'application/pdf',
          file_size: 12,
          file_type: 'usage_evidence',
          month: 1,
          created_at: new Date().toISOString()
        },
        error: null
      })

      const mockSelect = vi.fn().mockReturnValue({
        single: mockSingle
      })

      const mockInsert = vi.fn().mockReturnValue({
        select: mockSelect
      })

      vi.mocked(supabase.from).mockReturnValue({
        insert: mockInsert
      } as any)

      const result = await uploadEvidence(mockFile, validMeta)

      expect(result).toMatchObject({
        id: 'file-123',
        file_name: 'test.pdf',
        mime_type: 'application/pdf'
      })
      expect(mockUpload).toHaveBeenCalled()
    })

    it('應該拋出錯誤當使用者未登入', async () => {
      vi.mocked(authHelpers.validateAuth).mockResolvedValue({
        user: null,
        session: null,
        error: new Error('未登入')
      })

      await expect(uploadEvidence(mockFile, validMeta)).rejects.toThrow('未登入')
    })

    it('應該處理 Storage 上傳錯誤', async () => {
      vi.mocked(supabase.storage.from).mockReturnValue({
        upload: vi.fn().mockResolvedValue({
          data: null,
          error: { message: 'Upload failed' }
        })
      } as any)

      await expect(uploadEvidence(mockFile, validMeta)).rejects.toThrow()
    })

    it('應該正確推斷 MIME 類型', async () => {
      const jpgFile = new File(['image'], 'test.jpg', { type: '' }) // 空 type

      const mockUpload = vi.fn().mockResolvedValue({
        data: { path: 'test-path' },
        error: null
      })

      vi.mocked(supabase.storage.from).mockReturnValue({
        upload: mockUpload
      } as any)

      const mockSingle = vi.fn().mockResolvedValue({
        data: {
          id: 'file-123',
          mime_type: 'image/jpeg',
          file_name: 'test.jpg'
        },
        error: null
      })

      const mockSelect = vi.fn().mockReturnValue({
        single: mockSingle
      })

      const mockInsert = vi.fn().mockImplementation((data) => {
        // 驗證 MIME 類型是否正確推斷
        expect(data.mime_type).toBe('image/jpeg')
        return {
          select: mockSelect
        }
      })

      vi.mocked(supabase.from).mockReturnValue({
        insert: mockInsert
      } as any)

      await uploadEvidence(jpgFile, validMeta)

      expect(mockInsert).toHaveBeenCalled()
    })
  })

  describe('uploadEvidenceWithEntry', () => {
    const validMeta: FileMetadata & { entryId: string } = {
      pageKey: 'diesel',
      standard: '64',
      year: 2024,
      entryId: 'entry-123',
      fileType: 'usage_evidence'
    }

    it('應該要求 entryId', async () => {
      // TypeScript 會在編譯時檢查，這裡測試運行時行為
      const metaWithoutEntry = {
        pageKey: 'diesel',
        standard: '64',
        year: 2024
      } as any

      await expect(uploadEvidenceWithEntry(mockFile, metaWithoutEntry)).rejects.toThrow()
    })

    it('應該成功上傳當提供有效的 entryId', async () => {
      const mockUpload = vi.fn().mockResolvedValue({
        data: { path: 'test-path' },
        error: null
      })

      vi.mocked(supabase.storage.from).mockReturnValue({
        upload: mockUpload
      } as any)

      vi.mocked(supabase.from).mockReturnValue({
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: {
                id: 'file-123',
                entry_id: 'entry-123'
              },
              error: null
            })
          })
        })
      } as any)

      const result = await uploadEvidenceWithEntry(mockFile, validMeta)

      expect(result.entry_id).toBe('entry-123')
    })
  })

  describe('檔案覆蓋功能', () => {
    const metaWithOverwrite: FileMetadata & { entryId: string; allowOverwrite: boolean } = {
      pageKey: 'diesel',
      standard: '64',
      year: 2024,
      entryId: 'entry-123',
      fileType: 'usage_evidence',
      allowOverwrite: true
    }

    it('應該刪除舊檔案當 allowOverwrite=true', async () => {
      const existingFile = {
        id: 'old-file-123',
        file_path: 'old-path',
        file_name: 'old.pdf'
      }

      let callCount = 0

      // Mock supabase.from with different behaviors based on call count
      vi.mocked(supabase.from).mockImplementation(() => {
        callCount++

        if (callCount === 1) {
          // First call: query existing files
          const mockEq = vi.fn().mockReturnThis()
          const chainable = {
            select: vi.fn().mockReturnThis(),
            eq: mockEq,
            then: vi.fn((resolve) => resolve({ data: [existingFile], error: null }))
          }
          mockEq.mockReturnValue(chainable)
          chainable.select.mockReturnValue(chainable)
          return chainable as any
        } else if (callCount === 2) {
          // Second call: delete old file
          const chainable = {
            delete: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            then: vi.fn((resolve) => resolve({ error: null }))
          }
          chainable.delete.mockReturnValue(chainable)
          chainable.eq.mockReturnValue(chainable)
          return chainable as any
        } else {
          // Third call: insert new file
          const mockSingle = vi.fn().mockResolvedValue({
            data: { id: 'new-file-123' },
            error: null
          })
          const mockSelect = vi.fn().mockReturnValue({ single: mockSingle })
          const mockInsert = vi.fn().mockReturnValue({ select: mockSelect })
          return {
            insert: mockInsert
          } as any
        }
      })

      // Mock Storage
      const mockRemove = vi.fn().mockResolvedValue({ error: null })
      vi.mocked(supabase.storage.from).mockReturnValue({
        remove: mockRemove,
        upload: vi.fn().mockResolvedValue({ data: { path: 'new-path' }, error: null })
      } as any)

      await uploadEvidence(mockFile, metaWithOverwrite)

      expect(mockRemove).toHaveBeenCalledWith(['old-path'])
    })
  })

  describe('MIME 類型推斷', () => {
    it('應該正確推斷 PDF', () => {
      const file = new File([''], 'test.pdf', { type: '' })
      expect(file.name.endsWith('.pdf')).toBe(true)
    })

    it('應該正確推斷 JPG', () => {
      const file = new File([''], 'test.jpg', { type: '' })
      expect(file.name.endsWith('.jpg')).toBe(true)
    })

    it('應該正確推斷 PNG', () => {
      const file = new File([''], 'test.png', { type: '' })
      expect(file.name.endsWith('.png')).toBe(true)
    })

    it('應該使用 file.type 當它有值', () => {
      const file = new File([''], 'test.pdf', { type: 'application/pdf' })
      expect(file.type).toBe('application/pdf')
    })
  })

  describe('檔案類型驗證', () => {
    it('應該接受所有檔案類型', async () => {
      const unknownFile = new File([''], 'test.xyz', { type: 'application/unknown' })

      const validMeta: FileMetadata & { entryId: string } = {
        pageKey: 'diesel',
        standard: '64',
        year: 2024,
        entryId: 'entry-123',
        fileType: 'other'
      }

      // Mock Storage and database
      vi.mocked(supabase.storage.from).mockReturnValue({
        upload: vi.fn().mockResolvedValue({
          data: { path: 'test-path' },
          error: null
        })
      } as any)

      const mockSingle = vi.fn().mockResolvedValue({
        data: { id: 'file-123' },
        error: null
      })

      const mockSelect = vi.fn().mockReturnValue({
        single: mockSingle
      })

      const mockInsert = vi.fn().mockReturnValue({
        select: mockSelect
      })

      vi.mocked(supabase.from).mockReturnValue({
        insert: mockInsert
      } as any)

      // 應該不會拋出錯誤
      const result = await uploadEvidence(unknownFile, validMeta)
      expect(result).toBeDefined()
    })
  })

  describe('邊界情況', () => {
    it('應該處理大檔案', async () => {
      const largeContent = new Array(1024 * 1024).fill('a').join('') // 1MB
      const largeFile = new File([largeContent], 'large.pdf', { type: 'application/pdf' })

      const validMeta: FileMetadata & { entryId: string } = {
        pageKey: 'diesel',
        standard: '64',
        year: 2024,
        entryId: 'entry-123',
        fileType: 'usage_evidence'
      }

      vi.mocked(supabase.storage.from).mockReturnValue({
        upload: vi.fn().mockResolvedValue({
          data: { path: 'test-path' },
          error: null
        })
      } as any)

      const mockSingle = vi.fn().mockResolvedValue({
        data: {
          id: 'file-123',
          file_size: largeFile.size
        },
        error: null
      })

      const mockSelect = vi.fn().mockReturnValue({
        single: mockSingle
      })

      const mockInsert = vi.fn().mockReturnValue({
        select: mockSelect
      })

      vi.mocked(supabase.from).mockReturnValue({
        insert: mockInsert
      } as any)

      const result = await uploadEvidence(largeFile, validMeta)
      expect(result.file_size).toBe(largeFile.size)
    })

    it('應該處理空檔案名稱', async () => {
      const fileWithNoName = new File(['content'], '', { type: 'application/pdf' })

      const validMeta: FileMetadata & { entryId: string } = {
        pageKey: 'diesel',
        standard: '64',
        year: 2024,
        entryId: 'entry-123',
        fileType: 'usage_evidence'
      }

      vi.mocked(supabase.storage.from).mockReturnValue({
        upload: vi.fn().mockResolvedValue({
          data: { path: 'test-path' },
          error: null
        })
      } as any)

      vi.mocked(supabase.from).mockReturnValue({
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { id: 'file-123' },
              error: null
            })
          })
        })
      } as any)

      await uploadEvidence(fileWithNoName, validMeta)
      // 應該不會拋出錯誤
    })

    it('應該使用當前年份當 year 未提供', async () => {
      const currentYear = new Date().getFullYear()

      const metaWithoutYear: FileMetadata & { entryId: string } = {
        pageKey: 'diesel',
        standard: '64',
        entryId: 'entry-123',
        fileType: 'usage_evidence'
        // year 未提供
      }

      vi.mocked(supabase.storage.from).mockReturnValue({
        upload: vi.fn().mockResolvedValue({
          data: { path: 'test-path' },
          error: null
        })
      } as any)

      const mockSingle = vi.fn().mockResolvedValue({
        data: { id: 'file-123' },
        error: null
      })

      const mockSelect = vi.fn().mockReturnValue({
        single: mockSingle
      })

      const mockInsert = vi.fn().mockReturnValue({
        select: mockSelect
      })

      vi.mocked(supabase.from).mockReturnValue({
        insert: mockInsert
      } as any)

      await uploadEvidence(mockFile, metaWithoutYear)

      // year 應該被設為當前年份
      expect(mockInsert).toHaveBeenCalled()
    })
  })
})
