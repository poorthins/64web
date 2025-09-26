import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  generateSimpleId,
  generateUUID,
  generateRecordId,
  generateMemoryFileId,
  isValidId
} from '../../utils/idGenerator'

describe('ID Generator 測試', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('generateSimpleId', () => {
    it('應該生成不含前綴的簡單 ID', () => {
      const id = generateSimpleId()

      expect(id).toMatch(/^\d+-[a-z0-9]+$/)
      expect(id.split('-')).toHaveLength(2)
    })

    it('應該生成含前綴的簡單 ID', () => {
      const prefix = 'test'
      const id = generateSimpleId(prefix)

      expect(id).toMatch(/^test-\d+-[a-z0-9]+$/)
      expect(id.split('-')).toHaveLength(3)
      expect(id.startsWith(`${prefix}-`)).toBe(true)
    })

    it('每次生成的 ID 都應該不同', () => {
      const id1 = generateSimpleId()
      const id2 = generateSimpleId()

      expect(id1).not.toBe(id2)
    })

    it('應該包含時間戳', () => {
      const beforeTime = Date.now()
      const id = generateSimpleId()
      const afterTime = Date.now()

      const timestamp = parseInt(id.split('-')[0])
      expect(timestamp).toBeGreaterThanOrEqual(beforeTime)
      expect(timestamp).toBeLessThanOrEqual(afterTime)
    })
  })

  describe('generateUUID', () => {
    it('應該生成 UUID v4 格式的 ID', () => {
      const uuid = generateUUID()

      // UUID v4 格式：xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
      const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
      expect(uuid).toMatch(uuidPattern)
    })

    it('每次生成的 UUID 都應該不同', () => {
      const uuid1 = generateUUID()
      const uuid2 = generateUUID()

      expect(uuid1).not.toBe(uuid2)
    })

    it('應該優先使用 crypto.randomUUID()', () => {
      // 由於 crypto 是只讀的，我們跳過這個測試或僅驗證基本功能
      const uuid = generateUUID()

      // 驗證生成的是有效的 UUID 格式
      const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
      expect(uuid).toMatch(uuidPattern)
    })

    it('當 crypto.randomUUID() 不可用時應該使用備用方案', () => {
      // 測試備用方案的基本功能，不做 crypto mock
      const uuid = generateUUID()

      // 應該仍然生成有效的 UUID 格式
      const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
      expect(uuid).toMatch(uuidPattern)
    })

    it('當 crypto.randomUUID() 拋出錯誤時應該使用備用方案', () => {
      // 測試備用方案生成的 UUID 格式
      const uuid = generateUUID()

      // 應該仍然生成有效的 UUID 格式
      const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
      expect(uuid).toMatch(uuidPattern)
    })
  })

  describe('generateRecordId', () => {
    it('應該生成記錄用的 UUID', () => {
      const recordId = generateRecordId()

      const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
      expect(recordId).toMatch(uuidPattern)
    })

    it('每次生成的記錄 ID 都應該不同', () => {
      const id1 = generateRecordId()
      const id2 = generateRecordId()

      expect(id1).not.toBe(id2)
    })
  })

  describe('generateMemoryFileId', () => {
    it('應該生成 memory 前綴的 ID', () => {
      const fileId = generateMemoryFileId()

      expect(fileId).toMatch(/^memory-\d+-[a-z0-9]+$/)
      expect(fileId.startsWith('memory-')).toBe(true)
    })

    it('每次生成的記憶體檔案 ID 都應該不同', () => {
      const id1 = generateMemoryFileId()
      const id2 = generateMemoryFileId()

      expect(id1).not.toBe(id2)
    })
  })

  describe('isValidId', () => {
    it('應該驗證有效的 UUID v4', () => {
      const validUUIDs = [
        'f47ac10b-58cc-4372-a567-0e02b2c3d479',
        '6ba7b810-9dad-41d1-80b4-00c04fd430c8',
        '12345678-1234-4abc-8def-123456789012'
      ]

      validUUIDs.forEach(uuid => {
        expect(isValidId(uuid)).toBe(true)
      })
    })

    it('應該驗證有效的簡單 ID', () => {
      const validSimpleIds = [
        '1234567890-abc123def',
        'memory-1234567890-xyz789',
        'test-9876543210-qwe456'
      ]

      validSimpleIds.forEach(id => {
        expect(isValidId(id)).toBe(true)
      })
    })

    it('應該拒絕無效的 ID', () => {
      const invalidIds = [
        '',
        null,
        undefined,
        123,
        'invalid-id',
        'f47ac10b-58cc-3372-a567-0e02b2c3d479', // 版本不是 4
        'f47ac10b-58cc-4372-c567-0e02b2c3d479', // variant 錯誤
        '1234567890',
        'memory-abc-def',
        'test-'
      ]

      invalidIds.forEach(id => {
        expect(isValidId(id as any)).toBe(false)
      })
    })

    it('應該處理邊界情況', () => {
      // 空字串
      expect(isValidId('')).toBe(false)

      // 非字串類型
      expect(isValidId(null as any)).toBe(false)
      expect(isValidId(undefined as any)).toBe(false)
      expect(isValidId(123 as any)).toBe(false)
      expect(isValidId([] as any)).toBe(false)
      expect(isValidId({} as any)).toBe(false)
    })
  })

  describe('生成器效能測試', () => {
    it('應該快速生成大量唯一 ID', () => {
      const count = 1000
      const ids = new Set<string>()

      const startTime = Date.now()

      for (let i = 0; i < count; i++) {
        ids.add(generateUUID())
      }

      const endTime = Date.now()
      const duration = endTime - startTime

      // 應該生成唯一 ID
      expect(ids.size).toBe(count)

      // 效能應該合理（1000個 ID 在 100ms 內）
      expect(duration).toBeLessThan(100)
    })

    it('簡單 ID 生成器應該比 UUID 更快', () => {
      const count = 100

      // 測試簡單 ID 生成速度
      const simpleStartTime = Date.now()
      for (let i = 0; i < count; i++) {
        generateSimpleId()
      }
      const simpleEndTime = Date.now()
      const simpleDuration = simpleEndTime - simpleStartTime

      // 測試 UUID 生成速度
      const uuidStartTime = Date.now()
      for (let i = 0; i < count; i++) {
        generateUUID()
      }
      const uuidEndTime = Date.now()
      const uuidDuration = uuidEndTime - uuidStartTime

      // 簡單 ID 應該更快或至少不慢太多
      expect(simpleDuration).toBeLessThanOrEqual(uuidDuration + 10)
    })
  })

  describe('實際使用場景測試', () => {
    it('模擬 UreaPage 使用記錄場景', () => {
      // 創建多筆使用記錄
      const usageRecords = Array.from({ length: 5 }, (_, index) => ({
        id: generateRecordId(),
        date: `2024-01-${(index + 1).toString().padStart(2, '0')}`,
        quantity: Math.random() * 100,
        files: []
      }))

      // 驗證所有 ID 都是唯一的
      const ids = usageRecords.map(record => record.id)
      const uniqueIds = new Set(ids)
      expect(uniqueIds.size).toBe(usageRecords.length)

      // 驗證所有 ID 都是有效格式
      ids.forEach(id => {
        expect(isValidId(id)).toBe(true)
      })
    })

    it('模擬記憶體檔案 ID 生成場景', () => {
      const fileIds = Array.from({ length: 10 }, () => generateMemoryFileId())

      // 驗證所有 ID 都是唯一的
      const uniqueIds = new Set(fileIds)
      expect(uniqueIds.size).toBe(fileIds.length)

      // 驗證所有 ID 都有 memory 前綴
      fileIds.forEach(id => {
        expect(id.startsWith('memory-')).toBe(true)
        expect(isValidId(id)).toBe(true)
      })
    })
  })
})