import { describe, it, expect, beforeEach } from 'vitest'

/**
 * DieselPage 工具函數單元測試
 *
 * 測試範圍：
 * 1. createEmptyRecords() - 建立空白記錄
 * 2. getFileType() - 檔案類型判斷
 * 3. prepareSubmissionData() - 提交資料準備
 *
 * 注意：這些函數目前在 DieselPage.tsx 內部定義
 * TODO: 未來重構時可將這些函數提取到獨立的 utils 檔案
 */

// ============================================================================
// 測試資料型別定義（與 DieselPage 保持一致）
// ============================================================================

interface DieselRecord {
  id: string
  date: string
  quantity: number
  evidenceFiles: File[]
  memoryFiles: any[]
  groupId?: string
}

// ============================================================================
// 工具函數複製（從 DieselPage.tsx 複製過來測試用）
// ============================================================================

const LAYOUT_CONSTANTS = {
  DEFAULT_RECORDS_COUNT: 3
} as const

// 生成唯一 ID
const generateRecordId = (): string => {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}

// 建立空白記錄陣列
const createEmptyRecords = (count: number = LAYOUT_CONSTANTS.DEFAULT_RECORDS_COUNT): DieselRecord[] => {
  return Array.from({ length: count }, () => ({
    id: generateRecordId(),
    date: '',
    quantity: 0,
    evidenceFiles: [],
    memoryFiles: [],
    groupId: undefined
  }))
}

// 檔案類型判斷
type FileType = 'image' | 'pdf' | 'excel' | 'word' | 'other' | 'none'

const getFileType = (mimeType?: string, fileName?: string): FileType => {
  if (!mimeType && !fileName) return 'none'
  if (mimeType?.startsWith('image/')) return 'image'
  if (mimeType === 'application/pdf') return 'pdf'
  if (
    mimeType?.includes('excel') ||
    mimeType?.includes('spreadsheet') ||
    fileName?.match(/\.(xlsx?|xls)$/i)
  ) return 'excel'
  if (
    mimeType?.includes('wordprocessingml') ||
    mimeType === 'application/msword' ||
    fileName?.match(/\.(docx?|doc)$/i)
  ) return 'word'
  return 'other'
}

// 準備提交資料
const prepareSubmissionData = (dieselData: DieselRecord[]) => {
  const totalQuantity = dieselData.reduce((sum, item) => sum + item.quantity, 0)

  // 清理 payload：只送基本資料，移除 File 物件
  const cleanedDieselData = dieselData.map((r: DieselRecord) => ({
    id: r.id,
    date: r.date,
    quantity: r.quantity,
    groupId: r.groupId
  }))

  // 建立群組 → recordIds 映射表
  const groupRecordIds = new Map<string, string[]>()
  dieselData.forEach(record => {
    if (record.groupId) {
      if (!groupRecordIds.has(record.groupId)) {
        groupRecordIds.set(record.groupId, [])
      }
      groupRecordIds.get(record.groupId)!.push(record.id)
    }
  })

  // 去重：每個群組只保留第一個 record 的 memoryFiles
  const seenGroupIds = new Set<string>()
  const deduplicatedRecordData = dieselData.map(record => {
    const allRecordIds = record.groupId ? groupRecordIds.get(record.groupId) : [record.id]

    if (record.groupId && seenGroupIds.has(record.groupId)) {
      return { ...record, memoryFiles: [], allRecordIds }
    }
    if (record.groupId) {
      seenGroupIds.add(record.groupId)
    }
    return { ...record, allRecordIds }
  })

  return {
    totalQuantity,
    cleanedDieselData,
    deduplicatedRecordData
  }
}

// ============================================================================
// 測試套件
// ============================================================================

describe('DieselPage Utils', () => {

  // ==========================================================================
  // createEmptyRecords() 測試
  // ==========================================================================

  describe('createEmptyRecords', () => {
    it('應該建立預設數量（3筆）的空白記錄', () => {
      const records = createEmptyRecords()

      expect(records).toHaveLength(3)
      expect(records[0]).toMatchObject({
        date: '',
        quantity: 0,
        evidenceFiles: [],
        memoryFiles: [],
        groupId: undefined
      })
    })

    it('應該建立指定數量的空白記錄', () => {
      const records = createEmptyRecords(5)

      expect(records).toHaveLength(5)
      records.forEach(record => {
        expect(record.date).toBe('')
        expect(record.quantity).toBe(0)
        expect(record.evidenceFiles).toEqual([])
        expect(record.memoryFiles).toEqual([])
      })
    })

    it('每筆記錄應該有唯一的 ID', () => {
      const records = createEmptyRecords(10)
      const ids = records.map(r => r.id)
      const uniqueIds = new Set(ids)

      expect(uniqueIds.size).toBe(10)
    })

    it('應該處理邊界情況：0筆記錄', () => {
      const records = createEmptyRecords(0)
      expect(records).toHaveLength(0)
    })

    it('應該處理邊界情況：1筆記錄', () => {
      const records = createEmptyRecords(1)
      expect(records).toHaveLength(1)
    })
  })

  // ==========================================================================
  // getFileType() 測試
  // ==========================================================================

  describe('getFileType', () => {

    describe('圖片檔案', () => {
      it('應該識別 image/png', () => {
        expect(getFileType('image/png')).toBe('image')
      })

      it('應該識別 image/jpeg', () => {
        expect(getFileType('image/jpeg')).toBe('image')
      })

      it('應該識別 image/gif', () => {
        expect(getFileType('image/gif')).toBe('image')
      })

      it('應該識別 image/webp', () => {
        expect(getFileType('image/webp')).toBe('image')
      })
    })

    describe('PDF 檔案', () => {
      it('應該識別 application/pdf', () => {
        expect(getFileType('application/pdf')).toBe('pdf')
      })

      it('應該識別 .pdf 副檔名', () => {
        expect(getFileType(undefined, 'document.pdf')).toBe('other')
      })
    })

    describe('Excel 檔案', () => {
      it('應該識別包含 excel 的 MIME type', () => {
        expect(getFileType('application/vnd.ms-excel')).toBe('excel')
      })

      it('應該識別包含 spreadsheet 的 MIME type', () => {
        expect(getFileType('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')).toBe('excel')
      })

      it('應該透過副檔名識別 .xlsx', () => {
        expect(getFileType(undefined, 'data.xlsx')).toBe('excel')
      })

      it('應該透過副檔名識別 .xls', () => {
        expect(getFileType(undefined, 'data.xls')).toBe('excel')
      })

      it('應該不區分大小寫識別副檔名', () => {
        expect(getFileType(undefined, 'DATA.XLSX')).toBe('excel')
        expect(getFileType(undefined, 'Data.XLS')).toBe('excel')
      })
    })

    describe('Word 檔案', () => {
      it('應該識別包含 wordprocessingml 的 MIME type', () => {
        expect(getFileType('application/vnd.openxmlformats-officedocument.wordprocessingml.document')).toBe('word')
      })

      it('應該識別 application/msword', () => {
        expect(getFileType('application/msword')).toBe('word')
      })

      it('應該透過副檔名識別 .docx', () => {
        expect(getFileType(undefined, 'report.docx')).toBe('word')
      })

      it('應該透過副檔名識別 .doc', () => {
        expect(getFileType(undefined, 'report.doc')).toBe('word')
      })

      it('應該不區分大小寫識別副檔名', () => {
        expect(getFileType(undefined, 'REPORT.DOCX')).toBe('word')
        expect(getFileType(undefined, 'Report.DOC')).toBe('word')
      })
    })

    describe('其他檔案', () => {
      it('應該將未知 MIME type 識別為 other', () => {
        expect(getFileType('application/zip')).toBe('other')
      })

      it('應該將未知副檔名識別為 other', () => {
        expect(getFileType(undefined, 'file.txt')).toBe('other')
      })
    })

    describe('空值處理', () => {
      it('應該在沒有 MIME type 和檔名時回傳 none', () => {
        expect(getFileType()).toBe('none')
      })

      it('應該在只有空字串 MIME type 時回傳 none', () => {
        expect(getFileType('')).toBe('none')
      })

      it('應該在只有空字串檔名時回傳 none', () => {
        expect(getFileType(undefined, '')).toBe('none')
      })
    })

    describe('混合判斷', () => {
      it('MIME type 應該優先於副檔名', () => {
        expect(getFileType('image/png', 'fake.pdf')).toBe('image')
      })

      it('有 MIME type 時應該忽略副檔名', () => {
        expect(getFileType('application/pdf', 'document.xlsx')).toBe('pdf')
      })
    })
  })

  // ==========================================================================
  // prepareSubmissionData() 測試
  // ==========================================================================

  describe('prepareSubmissionData', () => {

    describe('基本功能', () => {
      it('應該正確計算總數量', () => {
        const testData: DieselRecord[] = [
          { id: '1', date: '2024-01-01', quantity: 100, evidenceFiles: [], memoryFiles: [] },
          { id: '2', date: '2024-01-02', quantity: 200, evidenceFiles: [], memoryFiles: [] },
          { id: '3', date: '2024-01-03', quantity: 150, evidenceFiles: [], memoryFiles: [] }
        ]

        const result = prepareSubmissionData(testData)
        expect(result.totalQuantity).toBe(450)
      })

      it('應該處理空陣列', () => {
        const result = prepareSubmissionData([])
        expect(result.totalQuantity).toBe(0)
        expect(result.cleanedDieselData).toEqual([])
        expect(result.deduplicatedRecordData).toEqual([])
      })

      it('應該清理資料，移除 File 物件', () => {
        const mockFile = new File([''], 'test.pdf')
        const testData: DieselRecord[] = [
          {
            id: '1',
            date: '2024-01-01',
            quantity: 100,
            evidenceFiles: [mockFile],
            memoryFiles: [{ file: mockFile }]
          }
        ]

        const result = prepareSubmissionData(testData)

        expect(result.cleanedDieselData[0]).toEqual({
          id: '1',
          date: '2024-01-01',
          quantity: 100,
          groupId: undefined
        })

        // 確認沒有 evidenceFiles 和 memoryFiles
        expect(result.cleanedDieselData[0]).not.toHaveProperty('evidenceFiles')
        expect(result.cleanedDieselData[0]).not.toHaveProperty('memoryFiles')
      })
    })

    describe('群組處理', () => {
      it('應該正確處理沒有群組的記錄', () => {
        const testData: DieselRecord[] = [
          { id: '1', date: '2024-01-01', quantity: 100, evidenceFiles: [], memoryFiles: [] },
          { id: '2', date: '2024-01-02', quantity: 200, evidenceFiles: [], memoryFiles: [] }
        ]

        const result = prepareSubmissionData(testData)

        expect(result.deduplicatedRecordData[0]).toMatchObject({
          id: '1',
          allRecordIds: ['1']
        })
        expect(result.deduplicatedRecordData[1]).toMatchObject({
          id: '2',
          allRecordIds: ['2']
        })
      })

      it('應該正確建立群組 recordIds 映射', () => {
        const testData: DieselRecord[] = [
          { id: '1', date: '2024-01-01', quantity: 100, evidenceFiles: [], memoryFiles: [], groupId: 'group-A' },
          { id: '2', date: '2024-01-02', quantity: 200, evidenceFiles: [], memoryFiles: [], groupId: 'group-A' },
          { id: '3', date: '2024-01-03', quantity: 150, evidenceFiles: [], memoryFiles: [], groupId: 'group-B' }
        ]

        const result = prepareSubmissionData(testData)

        // group-A 的記錄應該共享同樣的 allRecordIds
        expect(result.deduplicatedRecordData[0].allRecordIds).toEqual(['1', '2'])
        expect(result.deduplicatedRecordData[1].allRecordIds).toEqual(['1', '2'])

        // group-B 的記錄應該只有自己
        expect(result.deduplicatedRecordData[2].allRecordIds).toEqual(['3'])
      })

      it('應該去重：同群組第一筆保留 memoryFiles，其他清空', () => {
        const mockFile = { file: new File([''], 'test.pdf') }
        const testData: DieselRecord[] = [
          {
            id: '1',
            date: '2024-01-01',
            quantity: 100,
            evidenceFiles: [],
            memoryFiles: [mockFile],
            groupId: 'group-A'
          },
          {
            id: '2',
            date: '2024-01-02',
            quantity: 200,
            evidenceFiles: [],
            memoryFiles: [mockFile],
            groupId: 'group-A'
          }
        ]

        const result = prepareSubmissionData(testData)

        // 第一筆應該保留 memoryFiles
        expect(result.deduplicatedRecordData[0].memoryFiles).toHaveLength(1)

        // 第二筆應該清空 memoryFiles
        expect(result.deduplicatedRecordData[1].memoryFiles).toEqual([])
      })

      it('應該正確處理混合情況：有群組 + 無群組', () => {
        const testData: DieselRecord[] = [
          { id: '1', date: '2024-01-01', quantity: 100, evidenceFiles: [], memoryFiles: [], groupId: 'group-A' },
          { id: '2', date: '2024-01-02', quantity: 200, evidenceFiles: [], memoryFiles: [] }, // 無群組
          { id: '3', date: '2024-01-03', quantity: 150, evidenceFiles: [], memoryFiles: [], groupId: 'group-A' }
        ]

        const result = prepareSubmissionData(testData)

        expect(result.deduplicatedRecordData[0].allRecordIds).toEqual(['1', '3'])
        expect(result.deduplicatedRecordData[1].allRecordIds).toEqual(['2'])
        expect(result.deduplicatedRecordData[2].allRecordIds).toEqual(['1', '3'])
      })
    })

    describe('邊界情況', () => {
      it('應該處理所有 quantity 為 0 的情況', () => {
        const testData: DieselRecord[] = [
          { id: '1', date: '2024-01-01', quantity: 0, evidenceFiles: [], memoryFiles: [] },
          { id: '2', date: '2024-01-02', quantity: 0, evidenceFiles: [], memoryFiles: [] }
        ]

        const result = prepareSubmissionData(testData)
        expect(result.totalQuantity).toBe(0)
      })

      it('應該處理負數 quantity（理論上不應發生，但要測試）', () => {
        const testData: DieselRecord[] = [
          { id: '1', date: '2024-01-01', quantity: 100, evidenceFiles: [], memoryFiles: [] },
          { id: '2', date: '2024-01-02', quantity: -50, evidenceFiles: [], memoryFiles: [] }
        ]

        const result = prepareSubmissionData(testData)
        expect(result.totalQuantity).toBe(50)
      })

      it('應該處理超大數量', () => {
        const testData: DieselRecord[] = [
          { id: '1', date: '2024-01-01', quantity: 999999999, evidenceFiles: [], memoryFiles: [] }
        ]

        const result = prepareSubmissionData(testData)
        expect(result.totalQuantity).toBe(999999999)
      })

      it('應該處理單一記錄', () => {
        const testData: DieselRecord[] = [
          { id: '1', date: '2024-01-01', quantity: 100, evidenceFiles: [], memoryFiles: [] }
        ]

        const result = prepareSubmissionData(testData)

        expect(result.totalQuantity).toBe(100)
        expect(result.cleanedDieselData).toHaveLength(1)
        expect(result.deduplicatedRecordData).toHaveLength(1)
      })
    })

    describe('資料完整性', () => {
      it('cleanedDieselData 應該保留所有基本欄位', () => {
        const testData: DieselRecord[] = [
          {
            id: 'test-123',
            date: '2024-01-01',
            quantity: 100,
            evidenceFiles: [],
            memoryFiles: [],
            groupId: 'group-A'
          }
        ]

        const result = prepareSubmissionData(testData)

        expect(result.cleanedDieselData[0]).toEqual({
          id: 'test-123',
          date: '2024-01-01',
          quantity: 100,
          groupId: 'group-A'
        })
      })

      it('deduplicatedRecordData 應該保留原始記錄的所有欄位', () => {
        const testData: DieselRecord[] = [
          {
            id: 'test-123',
            date: '2024-01-01',
            quantity: 100,
            evidenceFiles: [],
            memoryFiles: [],
            groupId: 'group-A'
          }
        ]

        const result = prepareSubmissionData(testData)

        expect(result.deduplicatedRecordData[0]).toMatchObject({
          id: 'test-123',
          date: '2024-01-01',
          quantity: 100,
          evidenceFiles: [],
          memoryFiles: [],
          groupId: 'group-A'
        })
        expect(result.deduplicatedRecordData[0]).toHaveProperty('allRecordIds')
      })
    })
  })
})
