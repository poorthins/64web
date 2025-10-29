import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { useRecordFileMapping } from '../useRecordFileMapping'
import * as filesApi from '../../api/files'
import type { EvidenceFile } from '../../api/files'
import type { MemoryFile } from '../../services/documentHandler'

// Mock dependencies
vi.mock('../../api/files', () => ({
  uploadEvidenceWithEntry: vi.fn()
}))

describe('useRecordFileMapping', () => {
  const mockPageKey = 'fire_extinguisher'
  const mockEntryId = 'test-entry-id'
  let mockFileCounter = 1

  // 測試用 Mock 資料
  const createMockMemoryFile = (name: string): MemoryFile => ({
    file: new File(['content'], name, { type: 'application/pdf' }),
    preview: `blob:${name}`
  })

  const createMockEvidenceFile = (id: string, recordId: string): EvidenceFile => ({
    id,
    file_name: `${recordId}.pdf`,
    file_path: `/test/${recordId}`,
    file_size: 1024,
    file_type: 'other',
    created_at: new Date().toISOString(),
    record_id: recordId,
    entry_id: mockEntryId,
    page_key: mockPageKey,
    owner_id: 'test-user',
    standard: '64'
  })

  beforeEach(() => {
    vi.clearAllMocks()
    mockFileCounter = 1

    // Mock uploadEvidenceWithEntry
    vi.mocked(filesApi.uploadEvidenceWithEntry).mockImplementation(async (file, metadata) => {
      const fileId = `file-uuid-${mockFileCounter++}`
      return createMockEvidenceFile(fileId, metadata.recordId || '')
    })
  })

  // ========================================
  // 1. 基本功能測試
  // ========================================
  describe('基本功能', () => {
    it('應該初始化空映射表', () => {
      const { result } = renderHook(() => useRecordFileMapping(mockPageKey, mockEntryId))

      expect(result.current.fileMapping).toEqual({})
    })

    it('應該成功上傳記錄檔案並更新映射表', async () => {
      const { result } = renderHook(() => useRecordFileMapping(mockPageKey, mockEntryId))

      const mockFile = createMockMemoryFile('test.pdf')
      const recordId = 'fire_1'

      await act(async () => {
        await result.current.uploadRecordFiles(recordId, [mockFile])
      })

      // 驗證上傳 API 被呼叫
      expect(filesApi.uploadEvidenceWithEntry).toHaveBeenCalledWith(
        mockFile.file,
        expect.objectContaining({
          entryId: mockEntryId,
          pageKey: mockPageKey,
          standard: '64',
          recordId
        })
      )

      // 驗證映射表已更新
      expect(result.current.fileMapping).toEqual({
        [recordId]: ['file-uuid-1']
      })
    })

    it('應該取得屬於特定記錄的檔案', async () => {
      const { result } = renderHook(() => useRecordFileMapping(mockPageKey, mockEntryId))

      const recordId = 'fire_1'
      const mockFile = createMockMemoryFile('test.pdf')

      // 上傳檔案
      await act(async () => {
        await result.current.uploadRecordFiles(recordId, [mockFile])
      })

      // 建立全部檔案清單（包含其他記錄的檔案）
      const allFiles: EvidenceFile[] = [
        createMockEvidenceFile('file-uuid-1', 'fire_1'),
        createMockEvidenceFile('file-uuid-2', 'fire_2'),
        createMockEvidenceFile('file-uuid-3', 'fire_3')
      ]

      // 取得屬於 fire_1 的檔案
      const recordFiles = result.current.getRecordFiles(recordId, allFiles)

      expect(recordFiles).toHaveLength(1)
      expect(recordFiles[0].id).toBe('file-uuid-1')
      expect(recordFiles[0].record_id).toBe('fire_1')
    })

    it('應該從 payload 載入映射表', () => {
      const { result } = renderHook(() => useRecordFileMapping(mockPageKey, mockEntryId))

      const mockPayload = {
        fileMapping: {
          'fire_1': ['file-uuid-1', 'file-uuid-2'],
          'fire_2': ['file-uuid-3']
        }
      }

      act(() => {
        result.current.loadFileMapping(mockPayload)
      })

      expect(result.current.fileMapping).toEqual(mockPayload.fileMapping)
    })

    it('應該取得要存入 payload 的映射表', async () => {
      const { result } = renderHook(() => useRecordFileMapping(mockPageKey, mockEntryId))

      const mockFile = createMockMemoryFile('test.pdf')

      await act(async () => {
        await result.current.uploadRecordFiles('fire_1', [mockFile])
      })

      const mappingForPayload = result.current.getFileMappingForPayload()

      expect(mappingForPayload).toEqual({
        'fire_1': ['file-uuid-1']
      })
    })

    it('應該刪除記錄的映射', async () => {
      const { result } = renderHook(() => useRecordFileMapping(mockPageKey, mockEntryId))

      const mockFile1 = createMockMemoryFile('test1.pdf')
      const mockFile2 = createMockMemoryFile('test2.pdf')

      // 上傳 2 筆記錄的檔案
      await act(async () => {
        await result.current.uploadRecordFiles('fire_1', [mockFile1])
        await result.current.uploadRecordFiles('fire_2', [mockFile2])
      })

      expect(result.current.fileMapping).toHaveProperty('fire_1')
      expect(result.current.fileMapping).toHaveProperty('fire_2')

      // 刪除 fire_1 的映射
      act(() => {
        result.current.removeRecordMapping('fire_1')
      })

      expect(result.current.fileMapping).not.toHaveProperty('fire_1')
      expect(result.current.fileMapping).toHaveProperty('fire_2')
    })
  })

  // ========================================
  // 2. 檔案關聯測試（核心功能）
  // ========================================
  describe('檔案關聯邏輯', () => {
    it('應該用 recordId 關聯檔案（不是索引）', async () => {
      const { result } = renderHook(() => useRecordFileMapping(mockPageKey, mockEntryId))

      const mockFile = createMockMemoryFile('test.pdf')
      const recordId = 'fire_1'

      await act(async () => {
        await result.current.uploadRecordFiles(recordId, [mockFile])
      })

      // 驗證上傳時使用 recordId
      expect(filesApi.uploadEvidenceWithEntry).toHaveBeenCalledWith(
        mockFile.file,
        expect.objectContaining({
          recordId  // ⭐ 關鍵：使用 recordId 而不是 recordIndex
        })
      )
    })

    it('應該支援一對多關聯（一個記錄多個檔案）', async () => {
      const { result } = renderHook(() => useRecordFileMapping(mockPageKey, mockEntryId))

      const mockFiles = [
        createMockMemoryFile('file1.pdf'),
        createMockMemoryFile('file2.pdf'),
        createMockMemoryFile('file3.pdf')
      ]
      const recordId = 'fire_1'

      await act(async () => {
        await result.current.uploadRecordFiles(recordId, mockFiles)
      })

      // 驗證映射表包含 3 個檔案
      expect(result.current.fileMapping[recordId]).toHaveLength(3)
      expect(result.current.fileMapping[recordId]).toEqual([
        'file-uuid-1',
        'file-uuid-2',
        'file-uuid-3'
      ])
    })

    it('應該正確過濾不同記錄的檔案', async () => {
      const { result } = renderHook(() => useRecordFileMapping(mockPageKey, mockEntryId))

      // 上傳 3 筆記錄的檔案
      await act(async () => {
        await result.current.uploadRecordFiles('fire_1', [createMockMemoryFile('file1.pdf')])
        await result.current.uploadRecordFiles('fire_2', [createMockMemoryFile('file2.pdf')])
        await result.current.uploadRecordFiles('fire_3', [createMockMemoryFile('file3.pdf')])
      })

      // 建立全部檔案清單
      const allFiles: EvidenceFile[] = [
        createMockEvidenceFile('file-uuid-1', 'fire_1'),
        createMockEvidenceFile('file-uuid-2', 'fire_2'),
        createMockEvidenceFile('file-uuid-3', 'fire_3')
      ]

      // 取得 fire_2 的檔案
      const fire2Files = result.current.getRecordFiles('fire_2', allFiles)

      expect(fire2Files).toHaveLength(1)
      expect(fire2Files[0].id).toBe('file-uuid-2')
      expect(fire2Files[0].record_id).toBe('fire_2')
    })

    it('應該處理沒有檔案的記錄', () => {
      const { result } = renderHook(() => useRecordFileMapping(mockPageKey, mockEntryId))

      const allFiles: EvidenceFile[] = [
        createMockEvidenceFile('file-uuid-1', 'fire_1')
      ]

      // 查詢沒有檔案的記錄
      const emptyRecordFiles = result.current.getRecordFiles('fire_999', allFiles)

      expect(emptyRecordFiles).toHaveLength(0)
    })
  })

  // ========================================
  // 3. 真實場景測試（防 Bug）⭐ 最關鍵
  // ========================================
  describe('真實場景', () => {
    it('[場景 1] 刪除中間記錄 → 其他記錄檔案不受影響', async () => {
      const { result } = renderHook(() => useRecordFileMapping(mockPageKey, mockEntryId))

      // 模擬 3 筆記錄
      const records = [
        { id: 'fire_1', name: '滅火器 A' },
        { id: 'fire_2', name: '滅火器 B' },
        { id: 'fire_3', name: '滅火器 C' }
      ]

      // 上傳檔案
      await act(async () => {
        await result.current.uploadRecordFiles('fire_1', [createMockMemoryFile('file1.pdf')])
        await result.current.uploadRecordFiles('fire_2', [createMockMemoryFile('file2.pdf')])
        await result.current.uploadRecordFiles('fire_3', [createMockMemoryFile('file3.pdf')])
      })

      // 建立全部檔案清單
      const allFiles: EvidenceFile[] = [
        createMockEvidenceFile('file-uuid-1', 'fire_1'),
        createMockEvidenceFile('file-uuid-2', 'fire_2'),
        createMockEvidenceFile('file-uuid-3', 'fire_3')
      ]

      // 刪除中間記錄（fire_2）
      records.splice(1, 1)  // 現在變成 [fire_1, fire_3]
      act(() => {
        result.current.removeRecordMapping('fire_2')
      })

      // 驗證：fire_1 和 fire_3 的檔案關聯不受影響
      const fire1Files = result.current.getRecordFiles('fire_1', allFiles)
      const fire3Files = result.current.getRecordFiles('fire_3', allFiles)

      expect(fire1Files).toHaveLength(1)
      expect(fire1Files[0].id).toBe('file-uuid-1')  // ✅ 正確

      expect(fire3Files).toHaveLength(1)
      expect(fire3Files[0].id).toBe('file-uuid-3')  // ✅ 正確（不是 file-uuid-2）
    })

    it('[場景 2] 新增記錄在前面 → 舊記錄檔案不受影響', async () => {
      const { result } = renderHook(() => useRecordFileMapping(mockPageKey, mockEntryId))

      // 初始 3 筆記錄
      const records = [
        { id: 'fire_1', name: '滅火器 A' },
        { id: 'fire_2', name: '滅火器 B' },
        { id: 'fire_3', name: '滅火器 C' }
      ]

      // 上傳檔案
      await act(async () => {
        await result.current.uploadRecordFiles('fire_1', [createMockMemoryFile('file1.pdf')])
        await result.current.uploadRecordFiles('fire_2', [createMockMemoryFile('file2.pdf')])
        await result.current.uploadRecordFiles('fire_3', [createMockMemoryFile('file3.pdf')])
      })

      // 新增記錄在最前面（FireExtinguisherPage 的問題）
      const newRecord = { id: 'fire_4', name: '滅火器 D' }
      records.unshift(newRecord)  // [fire_4, fire_1, fire_2, fire_3]

      // 上傳新記錄的檔案
      await act(async () => {
        await result.current.uploadRecordFiles('fire_4', [createMockMemoryFile('file4.pdf')])
      })

      // 建立全部檔案清單
      const allFiles: EvidenceFile[] = [
        createMockEvidenceFile('file-uuid-1', 'fire_1'),
        createMockEvidenceFile('file-uuid-2', 'fire_2'),
        createMockEvidenceFile('file-uuid-3', 'fire_3'),
        createMockEvidenceFile('file-uuid-4', 'fire_4')
      ]

      // 驗證：舊記錄的檔案關聯不受影響
      const fire1Files = result.current.getRecordFiles('fire_1', allFiles)
      const fire2Files = result.current.getRecordFiles('fire_2', allFiles)
      const fire3Files = result.current.getRecordFiles('fire_3', allFiles)
      const fire4Files = result.current.getRecordFiles('fire_4', allFiles)

      expect(fire1Files[0].id).toBe('file-uuid-1')  // ✅ 正確
      expect(fire2Files[0].id).toBe('file-uuid-2')  // ✅ 正確
      expect(fire3Files[0].id).toBe('file-uuid-3')  // ✅ 正確
      expect(fire4Files[0].id).toBe('file-uuid-4')  // ✅ 正確
    })

    it('[場景 3] 重新載入 → 映射表正確還原', async () => {
      const { result } = renderHook(() => useRecordFileMapping(mockPageKey, mockEntryId))

      // 上傳檔案並建立映射
      await act(async () => {
        await result.current.uploadRecordFiles('fire_1', [createMockMemoryFile('file1.pdf')])
        await result.current.uploadRecordFiles('fire_2', [createMockMemoryFile('file2.pdf')])
      })

      // 取得要存檔的映射表
      const savedMapping = result.current.getFileMappingForPayload()
      expect(savedMapping).toEqual({
        'fire_1': ['file-uuid-1'],
        'fire_2': ['file-uuid-2']
      })

      // 模擬重新進入頁面（重新渲染 Hook）
      const { result: newResult } = renderHook(() =>
        useRecordFileMapping(mockPageKey, mockEntryId)
      )

      // 從 payload 載入映射表
      act(() => {
        newResult.current.loadFileMapping({
          fileMapping: savedMapping
        })
      })

      // 驗證：映射表正確還原
      expect(newResult.current.fileMapping).toEqual(savedMapping)

      // 驗證：可以正確取得檔案
      const allFiles: EvidenceFile[] = [
        createMockEvidenceFile('file-uuid-1', 'fire_1'),
        createMockEvidenceFile('file-uuid-2', 'fire_2')
      ]

      const fire1Files = newResult.current.getRecordFiles('fire_1', allFiles)
      expect(fire1Files).toHaveLength(1)
      expect(fire1Files[0].id).toBe('file-uuid-1')
    })

    it('[場景 4] 混合操作（新增、刪除、重新載入）', async () => {
      const { result } = renderHook(() => useRecordFileMapping(mockPageKey, mockEntryId))

      // 步驟 1：上傳 3 筆記錄
      await act(async () => {
        await result.current.uploadRecordFiles('fire_1', [createMockMemoryFile('file1.pdf')])
        await result.current.uploadRecordFiles('fire_2', [createMockMemoryFile('file2.pdf')])
        await result.current.uploadRecordFiles('fire_3', [createMockMemoryFile('file3.pdf')])
      })

      // 步驟 2：刪除 fire_2
      act(() => {
        result.current.removeRecordMapping('fire_2')
      })

      // 步驟 3：新增 fire_4 在前面
      await act(async () => {
        await result.current.uploadRecordFiles('fire_4', [createMockMemoryFile('file4.pdf')])
      })

      // 步驟 4：存檔並重新載入
      const savedMapping = result.current.getFileMappingForPayload()

      const { result: newResult } = renderHook(() =>
        useRecordFileMapping(mockPageKey, mockEntryId)
      )

      act(() => {
        newResult.current.loadFileMapping({ fileMapping: savedMapping })
      })

      // 驗證：映射表正確（fire_1, fire_3, fire_4，沒有 fire_2）
      expect(newResult.current.fileMapping).toEqual({
        'fire_1': ['file-uuid-1'],
        'fire_3': ['file-uuid-3'],
        'fire_4': ['file-uuid-4']
      })

      // 驗證：檔案關聯正確
      const allFiles: EvidenceFile[] = [
        createMockEvidenceFile('file-uuid-1', 'fire_1'),
        createMockEvidenceFile('file-uuid-3', 'fire_3'),
        createMockEvidenceFile('file-uuid-4', 'fire_4')
      ]

      const fire1Files = newResult.current.getRecordFiles('fire_1', allFiles)
      const fire3Files = newResult.current.getRecordFiles('fire_3', allFiles)
      const fire4Files = newResult.current.getRecordFiles('fire_4', allFiles)

      expect(fire1Files[0].id).toBe('file-uuid-1')
      expect(fire3Files[0].id).toBe('file-uuid-3')
      expect(fire4Files[0].id).toBe('file-uuid-4')
    })
  })

  // ========================================
  // 4. 向後相容測試
  // ========================================
  describe('向後相容', () => {
    it('payload 沒有 fileMapping 時應設為空物件', () => {
      const { result } = renderHook(() => useRecordFileMapping(mockPageKey, mockEntryId))

      const mockPayload = {
        records: []
        // 沒有 fileMapping（舊資料格式）
      }

      act(() => {
        result.current.loadFileMapping(mockPayload)
      })

      expect(result.current.fileMapping).toEqual({})
    })

    it('應該顯示警告訊息（舊資料格式）', () => {
      const { result } = renderHook(() => useRecordFileMapping(mockPageKey, mockEntryId))
      const consoleSpy = vi.spyOn(console, 'warn')

      const mockPayload = {
        records: []
        // 沒有 fileMapping
      }

      act(() => {
        result.current.loadFileMapping(mockPayload)
      })

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('沒有 fileMapping')
      )

      consoleSpy.mockRestore()
    })
  })

  // ========================================
  // 5. 錯誤處理測試
  // ========================================
  describe('錯誤處理', () => {
    it('entryId 為 null 時應拋錯', async () => {
      const { result } = renderHook(() => useRecordFileMapping(mockPageKey, null))

      const mockFile = createMockMemoryFile('test.pdf')

      await act(async () => {
        await expect(
          result.current.uploadRecordFiles('fire_1', [mockFile])
        ).rejects.toThrow('entryId 為空')
      })
    })

    it('上傳失敗時應拋出錯誤', async () => {
      const mockError = new Error('上傳失敗')
      vi.mocked(filesApi.uploadEvidenceWithEntry).mockRejectedValueOnce(mockError)

      const { result } = renderHook(() => useRecordFileMapping(mockPageKey, mockEntryId))

      const mockFile = createMockMemoryFile('test.pdf')

      await act(async () => {
        await expect(
          result.current.uploadRecordFiles('fire_1', [mockFile])
        ).rejects.toThrow('上傳失敗')
      })
    })

    it('空檔案陣列應正常處理', async () => {
      const { result } = renderHook(() => useRecordFileMapping(mockPageKey, mockEntryId))

      await act(async () => {
        await result.current.uploadRecordFiles('fire_1', [])
      })

      // 不應該呼叫上傳 API
      expect(filesApi.uploadEvidenceWithEntry).not.toHaveBeenCalled()

      // 映射表應該是空的
      expect(result.current.fileMapping).toEqual({})
    })
  })

  // ========================================
  // 6. 邊界情況測試
  // ========================================
  describe('邊界情況', () => {
    it('應該處理大量記錄（100 筆）', async () => {
      const { result } = renderHook(() => useRecordFileMapping(mockPageKey, mockEntryId))

      // 上傳 100 筆記錄
      await act(async () => {
        for (let i = 1; i <= 100; i++) {
          await result.current.uploadRecordFiles(
            `fire_${i}`,
            [createMockMemoryFile(`file${i}.pdf`)]
          )
        }
      })

      // 驗證映射表包含 100 筆記錄
      expect(Object.keys(result.current.fileMapping)).toHaveLength(100)

      // 驗證可以正確取得任意記錄的檔案
      const allFiles: EvidenceFile[] = Array.from({ length: 100 }, (_, i) =>
        createMockEvidenceFile(`file-uuid-${i + 1}`, `fire_${i + 1}`)
      )

      const fire50Files = result.current.getRecordFiles('fire_50', allFiles)
      expect(fire50Files[0].id).toBe('file-uuid-50')
    })

    it('應該處理大量檔案（每筆記錄 10 個檔案）', async () => {
      const { result } = renderHook(() => useRecordFileMapping(mockPageKey, mockEntryId))

      // 建立 10 個檔案
      const mockFiles = Array.from({ length: 10 }, (_, i) =>
        createMockMemoryFile(`file${i}.pdf`)
      )

      await act(async () => {
        await result.current.uploadRecordFiles('fire_1', mockFiles)
      })

      // 驗證映射表包含 10 個檔案 ID
      expect(result.current.fileMapping['fire_1']).toHaveLength(10)
    })

    it('應該處理相同 recordId 多次上傳（累積檔案）', async () => {
      const { result } = renderHook(() => useRecordFileMapping(mockPageKey, mockEntryId))

      // 第一次上傳
      await act(async () => {
        await result.current.uploadRecordFiles('fire_1', [createMockMemoryFile('file1.pdf')])
      })

      expect(result.current.fileMapping['fire_1']).toHaveLength(1)

      // 第二次上傳相同 recordId
      await act(async () => {
        await result.current.uploadRecordFiles('fire_1', [createMockMemoryFile('file2.pdf')])
      })

      // 驗證：應該累積，不是覆蓋
      expect(result.current.fileMapping['fire_1']).toHaveLength(2)
      expect(result.current.fileMapping['fire_1']).toEqual([
        'file-uuid-1',
        'file-uuid-2'
      ])
    })
  })

  // ========================================
  // 7. 歷史 Bug 防護測試
  // ========================================
  describe('歷史 Bug 防護', () => {
    it('[Bug] 防止檔案與記錄錯位（刪除中間記錄）', async () => {
      // 這是實際發生的 Bug：刪除中間記錄後，後續記錄拿到前一筆的檔案
      const { result } = renderHook(() => useRecordFileMapping(mockPageKey, mockEntryId))

      // 模擬實際情況
      await act(async () => {
        await result.current.uploadRecordFiles('fire_1', [createMockMemoryFile('老王.pdf')])
        await result.current.uploadRecordFiles('fire_2', [createMockMemoryFile('老李.pdf')])
        await result.current.uploadRecordFiles('fire_3', [createMockMemoryFile('老陳.pdf')])
      })

      // 刪除老李
      act(() => {
        result.current.removeRecordMapping('fire_2')
      })

      const allFiles: EvidenceFile[] = [
        createMockEvidenceFile('file-uuid-1', 'fire_1'),
        createMockEvidenceFile('file-uuid-2', 'fire_2'),
        createMockEvidenceFile('file-uuid-3', 'fire_3')
      ]

      // 驗證：老陳不會拿到老李的檔案
      const chenFiles = result.current.getRecordFiles('fire_3', allFiles)
      expect(chenFiles[0].id).toBe('file-uuid-3')  // ✅ 拿到自己的檔案
      expect(chenFiles[0].id).not.toBe('file-uuid-2')  // ❌ 不是老李的檔案
    })

    it('[Bug] 防止檔案與記錄錯位（新增記錄在前面）', async () => {
      // FireExtinguisherPage 特有問題：新記錄插在前面
      const { result } = renderHook(() => useRecordFileMapping(mockPageKey, mockEntryId))

      await act(async () => {
        await result.current.uploadRecordFiles('fire_1', [createMockMemoryFile('老王.pdf')])
        await result.current.uploadRecordFiles('fire_2', [createMockMemoryFile('老李.pdf')])
      })

      // 新增老趙在最前面
      await act(async () => {
        await result.current.uploadRecordFiles('fire_0', [createMockMemoryFile('老趙.pdf')])
      })

      const allFiles: EvidenceFile[] = [
        createMockEvidenceFile('file-uuid-1', 'fire_1'),
        createMockEvidenceFile('file-uuid-2', 'fire_2'),
        createMockEvidenceFile('file-uuid-3', 'fire_0')
      ]

      // 驗證：老王和老李的檔案不受影響
      const wangFiles = result.current.getRecordFiles('fire_1', allFiles)
      const liFiles = result.current.getRecordFiles('fire_2', allFiles)
      const zhaoFiles = result.current.getRecordFiles('fire_0', allFiles)

      expect(wangFiles[0].id).toBe('file-uuid-1')  // ✅ 老王的檔案
      expect(liFiles[0].id).toBe('file-uuid-2')    // ✅ 老李的檔案
      expect(zhaoFiles[0].id).toBe('file-uuid-3')  // ✅ 老趙的檔案
    })

    it('[Bug] 防止重新載入後檔案消失', async () => {
      // 另一個常見 Bug：沒存 fileMapping 導致重新載入後檔案不見
      const { result } = renderHook(() => useRecordFileMapping(mockPageKey, mockEntryId))

      await act(async () => {
        await result.current.uploadRecordFiles('fire_1', [createMockMemoryFile('test.pdf')])
      })

      // 模擬提交時忘記存 fileMapping（Bug）
      const payloadWithoutMapping = {
        records: []
        // 沒有 fileMapping
      }

      const { result: newResult } = renderHook(() =>
        useRecordFileMapping(mockPageKey, mockEntryId)
      )

      act(() => {
        newResult.current.loadFileMapping(payloadWithoutMapping)
      })

      // 驗證：應該要有警告，且映射表為空
      expect(newResult.current.fileMapping).toEqual({})

      // 這就是為什麼我們需要 fileMapping 的原因
    })
  })
})
