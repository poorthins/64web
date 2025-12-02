/**
 * useType3Helpers 測試
 *
 * 測試策略（Linus 實用主義）：
 * - 只測 Type 3 特有邏輯（Specs 相關）
 * - Type 2 繼承的函數已在 Type 2 頁面測試過，不重複測
 * - 重點：record_id 格式差異（單一 vs comma-separated）
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useType3Helpers } from '../useType3Helpers'
import * as fileAPI from '../../api/v2/fileAPI'

// Mock Supabase 客戶端（避免初始化錯誤）
vi.mock('../../supabaseClient', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis()
    })),
    auth: {
      getUser: vi.fn()
    }
  }
}))

// Mock uploadEvidenceFile
vi.mock('../../api/v2/fileAPI', () => ({
  uploadEvidenceFile: vi.fn()
}))

// Mock deleteEvidence functions
vi.mock('../../api/files', () => ({
  deleteEvidence: vi.fn(),
  adminDeleteEvidence: vi.fn()
}))

describe('useType3Helpers', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('uploadSpecFiles（Type 3 特有）', () => {
    it('應該使用單一 record_id 上傳規格檔案', async () => {
      const { result } = renderHook(() =>
        useType3Helpers<
          { id: string; memoryFiles?: any[] },
          { id: string; groupId?: string; memoryFiles?: any[] }
        >('wd40', 2024)
      )

      const mockFile = new File(['test'], 'spec.pdf', { type: 'application/pdf' })
      const specs = [
        {
          id: 'spec-001',
          memoryFiles: [{ file: mockFile }]
        },
        {
          id: 'spec-002',
          memoryFiles: [{ file: new File(['test2'], 'spec2.pdf') }]
        }
      ]

      await result.current.uploadSpecFiles(specs, 'entry-123')

      // 驗證：每個規格檔案都用單一 record_id
      expect(fileAPI.uploadEvidenceFile).toHaveBeenCalledTimes(2)

      expect(fileAPI.uploadEvidenceFile).toHaveBeenNthCalledWith(1, mockFile, {
        page_key: 'wd40',
        period_year: 2024,
        file_type: 'other',
        entry_id: 'entry-123',
        record_id: 'spec-001',  // ⭐ 單一 ID
        standard: '64'
      })

      expect(fileAPI.uploadEvidenceFile).toHaveBeenNthCalledWith(2, expect.any(File), {
        page_key: 'wd40',
        period_year: 2024,
        file_type: 'other',
        entry_id: 'entry-123',
        record_id: 'spec-002',  // ⭐ 單一 ID
        standard: '64'
      })
    })

    it('應該過濾無效檔案（file.size = 0）', async () => {
      const { result } = renderHook(() =>
        useType3Helpers<
          { id: string; memoryFiles?: any[] },
          { id: string; groupId?: string; memoryFiles?: any[] }
        >('wd40', 2024)
      )

      const validFile = new File(['test'], 'valid.pdf')
      const emptyFile = new File([], 'empty.pdf')  // size = 0

      const specs = [
        {
          id: 'spec-001',
          memoryFiles: [
            { file: validFile },
            { file: emptyFile },
            { file: null }  // 無效
          ]
        }
      ]

      await result.current.uploadSpecFiles(specs, 'entry-123')

      // 應該只上傳有效檔案
      expect(fileAPI.uploadEvidenceFile).toHaveBeenCalledTimes(1)
      expect(fileAPI.uploadEvidenceFile).toHaveBeenCalledWith(validFile, expect.any(Object))
    })

    it('空 memoryFiles 不應該上傳任何檔案', async () => {
      const { result } = renderHook(() =>
        useType3Helpers<
          { id: string; memoryFiles?: any[] },
          { id: string; groupId?: string; memoryFiles?: any[] }
        >('wd40', 2024)
      )

      const specs = [
        { id: 'spec-001', memoryFiles: [] },
        { id: 'spec-002', memoryFiles: undefined }
      ]

      await result.current.uploadSpecFiles(specs, 'entry-123')

      expect(fileAPI.uploadEvidenceFile).not.toHaveBeenCalled()
    })
  })

  describe('uploadGroupFiles（繼承自 Type 2）', () => {
    it('應該使用 comma-separated record_id 上傳使用記錄檔案', async () => {
      const { result } = renderHook(() =>
        useType3Helpers<
          { id: string; memoryFiles?: any[] },
          { id: string; groupId?: string; memoryFiles?: any[] }
        >('wd40', 2024)
      )

      const mockFile = new File(['test'], 'usage.pdf')

      // 模擬一個群組有 3 筆記錄
      const usageRecords = [
        { id: 'record-001', groupId: 'group-A', memoryFiles: [{ file: mockFile }] },
        { id: 'record-002', groupId: 'group-A' },
        { id: 'record-003', groupId: 'group-A' }
      ]

      const groupsMap = result.current.buildGroupsMap(usageRecords)

      await result.current.uploadGroupFiles(groupsMap, 'entry-123')

      // 驗證：應該用 comma-separated IDs
      expect(fileAPI.uploadEvidenceFile).toHaveBeenCalledTimes(1)
      expect(fileAPI.uploadEvidenceFile).toHaveBeenCalledWith(mockFile, {
        page_key: 'wd40',
        period_year: 2024,
        file_type: 'other',
        entry_id: 'entry-123',
        record_id: 'record-001,record-002,record-003',  // ⭐ Comma-separated
        standard: '64'
      })
    })
  })

  describe('validateSpecsExist（Type 3 特有）', () => {
    it('specs 為空時應拋出錯誤', () => {
      const { result } = renderHook(() =>
        useType3Helpers<
          { id: string; memoryFiles?: any[] },
          { id: string; groupId?: string; memoryFiles?: any[] }
        >('wd40', 2024)
      )

      expect(() => {
        result.current.validateSpecsExist([])
      }).toThrow('請至少建立一個品項')
    })

    it('有 specs 時不應拋出錯誤', () => {
      const { result } = renderHook(() =>
        useType3Helpers<
          { id: string; memoryFiles?: any[] },
          { id: string; groupId?: string; memoryFiles?: any[] }
        >('wd40', 2024)
      )

      const specs = [{ id: 'spec-001', memoryFiles: [] }]

      expect(() => {
        result.current.validateSpecsExist(specs)
      }).not.toThrow()
    })
  })

  describe('validateUsageRecordsHaveSpec（Type 3 特有）', () => {
    it('有記錄沒有 specId 時應拋出錯誤', () => {
      const { result } = renderHook(() =>
        useType3Helpers<
          { id: string; memoryFiles?: any[] },
          { id: string; groupId?: string; memoryFiles?: any[]; specId?: string }
        >('wd40', 2024)
      )

      const records = [
        { id: 'record-001', specId: 'spec-A' },
        { id: 'record-002', specId: undefined },  // ❌ 沒有 specId
        { id: 'record-003', specId: 'spec-B' }
      ]

      expect(() => {
        result.current.validateUsageRecordsHaveSpec(records)
      }).toThrow('請為每筆記錄選擇品項')
    })

    it('所有記錄都有 specId 時不應拋出錯誤', () => {
      const { result } = renderHook(() =>
        useType3Helpers<
          { id: string; memoryFiles?: any[] },
          { id: string; groupId?: string; memoryFiles?: any[]; specId?: string }
        >('wd40', 2024)
      )

      const records = [
        { id: 'record-001', specId: 'spec-A' },
        { id: 'record-002', specId: 'spec-B' }
      ]

      expect(() => {
        result.current.validateUsageRecordsHaveSpec(records)
      }).not.toThrow()
    })

    it('空記錄列表不應拋出錯誤', () => {
      const { result } = renderHook(() =>
        useType3Helpers<
          { id: string; memoryFiles?: any[] },
          { id: string; groupId?: string; memoryFiles?: any[]; specId?: string }
        >('wd40', 2024)
      )

      expect(() => {
        result.current.validateUsageRecordsHaveSpec([])
      }).not.toThrow()
    })
  })

  describe('繼承 Type 2 函數', () => {
    it('應該提供 buildGroupsMap', () => {
      const { result } = renderHook(() =>
        useType3Helpers<
          { id: string; memoryFiles?: any[] },
          { id: string; groupId?: string; memoryFiles?: any[] }
        >('wd40', 2024)
      )

      expect(result.current.buildGroupsMap).toBeDefined()
      expect(typeof result.current.buildGroupsMap).toBe('function')
    })

    it('應該提供 syncEditingGroupChanges', () => {
      const { result } = renderHook(() =>
        useType3Helpers<
          { id: string; memoryFiles?: any[] },
          { id: string; groupId?: string; memoryFiles?: any[] }
        >('wd40', 2024)
      )

      expect(result.current.syncEditingGroupChanges).toBeDefined()
      expect(typeof result.current.syncEditingGroupChanges).toBe('function')
    })
  })
})
