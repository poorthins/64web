import { describe, it, expect, beforeAll, vi } from 'vitest'
import { createMemoryFile, createMemoryFiles } from '../fileUploadHelpers'

describe('fileUploadHelpers', () => {
  // Mock URL.createObjectURL (瀏覽器 API，測試環境需要 mock)
  beforeAll(() => {
    global.URL.createObjectURL = vi.fn((file) => {
      const name = (file as File).name || 'unknown'
      return `blob:mock-url-${name}`
    })
    global.URL.revokeObjectURL = vi.fn()
  })
  describe('createMemoryFile', () => {
    it('應該正確轉換 PDF 檔案為 MemoryFile', () => {
      // 建立測試用 File
      const testFile = new File(['test content'], 'test.pdf', {
        type: 'application/pdf'
      })

      // 執行轉換
      const result = createMemoryFile(testFile)

      // 驗證結果
      expect(result.id).toBeDefined() // 有 ID
      expect(result.id.length).toBeGreaterThan(0) // ID 非空
      expect(result.file).toBe(testFile) // 原始檔案正確
      expect(result.file_name).toBe('test.pdf') // 檔名正確
      expect(result.file_size).toBe(testFile.size) // 大小正確
      expect(result.mime_type).toBe('application/pdf') // MIME 類型正確
      expect(result.preview).toMatch(/^blob:/) // 預覽 URL 格式正確
    })

    it('應該處理圖片檔案', () => {
      const imageFile = new File(['image content'], 'photo.jpg', {
        type: 'image/jpeg'
      })

      const result = createMemoryFile(imageFile)

      expect(result.mime_type).toBe('image/jpeg')
      expect(result.file_name).toBe('photo.jpg')
      expect(result.preview).toMatch(/^blob:/)
    })

    it('應該處理 PNG 圖片', () => {
      const pngFile = new File(['png content'], 'image.png', {
        type: 'image/png'
      })

      const result = createMemoryFile(pngFile)

      expect(result.mime_type).toBe('image/png')
      expect(result.file_name).toBe('image.png')
    })

    it('應該處理 Excel 檔案', () => {
      const excelFile = new File(['excel content'], 'data.xlsx', {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      })

      const result = createMemoryFile(excelFile)

      expect(result.mime_type).toBe('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
      expect(result.file_name).toBe('data.xlsx')
    })

    it('應該處理舊版 Excel 檔案', () => {
      const xlsFile = new File(['xls content'], 'old-data.xls', {
        type: 'application/vnd.ms-excel'
      })

      const result = createMemoryFile(xlsFile)

      expect(result.mime_type).toBe('application/vnd.ms-excel')
      expect(result.file_name).toBe('old-data.xls')
    })

    it('應該為每個檔案產生唯一 ID', () => {
      const file1 = new File(['content1'], 'file1.pdf', { type: 'application/pdf' })
      const file2 = new File(['content2'], 'file2.pdf', { type: 'application/pdf' })

      const result1 = createMemoryFile(file1)
      const result2 = createMemoryFile(file2)

      // 每次呼叫應該產生不同的 ID
      expect(result1.id).not.toBe(result2.id)
    })
  })

  describe('createMemoryFiles', () => {
    it('應該批次轉換 FileList 為 MemoryFile 陣列', () => {
      const file1 = new File(['test1'], 'test1.pdf', { type: 'application/pdf' })
      const file2 = new File(['test2'], 'test2.jpg', { type: 'image/jpeg' })

      // 模擬 FileList（使用陣列）
      const files = [file1, file2]
      const results = createMemoryFiles(files)

      expect(results).toHaveLength(2)
      expect(results[0].file_name).toBe('test1.pdf')
      expect(results[0].mime_type).toBe('application/pdf')
      expect(results[1].file_name).toBe('test2.jpg')
      expect(results[1].mime_type).toBe('image/jpeg')
    })

    it('應該處理空陣列', () => {
      const results = createMemoryFiles([])

      expect(results).toHaveLength(0)
      expect(results).toEqual([])
    })

    it('應該處理單一檔案陣列', () => {
      const file = new File(['content'], 'single.pdf', { type: 'application/pdf' })
      const results = createMemoryFiles([file])

      expect(results).toHaveLength(1)
      expect(results[0].file_name).toBe('single.pdf')
    })

    it('批次轉換時每個檔案應該有唯一 ID', () => {
      const file1 = new File(['content1'], 'file1.pdf', { type: 'application/pdf' })
      const file2 = new File(['content2'], 'file2.pdf', { type: 'application/pdf' })
      const file3 = new File(['content3'], 'file3.pdf', { type: 'application/pdf' })

      const results = createMemoryFiles([file1, file2, file3])

      // 所有 ID 應該不同
      const ids = results.map(r => r.id)
      const uniqueIds = new Set(ids)
      expect(uniqueIds.size).toBe(3)
    })
  })
})
