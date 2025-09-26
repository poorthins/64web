/**
 * 跨瀏覽器相容的 ID 生成工具
 *
 * 提供多種 ID 生成方式，用於替代 crypto.randomUUID()
 * 以確保在所有瀏覽器環境下都能正常工作
 */

/**
 * 生成簡單的隨機 ID
 * 基於時間戳和隨機數的組合
 *
 * @param prefix - ID 前綴，預設為空字串
 * @returns 格式: prefix-timestamp-random 或 timestamp-random
 */
export function generateSimpleId(prefix: string = ''): string {
  const timestamp = Date.now()
  const random = Math.random().toString(36).substr(2, 9)
  return prefix ? `${prefix}-${timestamp}-${random}` : `${timestamp}-${random}`
}

/**
 * 生成 UUID v4 格式的 ID
 * 跨瀏覽器相容版本，不依賴 crypto.randomUUID()
 *
 * @returns 符合 UUID v4 格式的字串: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
 */
export function generateUUID(): string {
  // 如果支援 crypto.randomUUID()，優先使用
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    try {
      return crypto.randomUUID()
    } catch (error) {
      // 如果在非安全環境下呼叫會拋出錯誤，回退到備用方案
      console.warn('crypto.randomUUID() failed, using fallback method')
    }
  }

  // 備用方案：使用 Math.random() 生成 UUID v4 格式
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0
    const v = c === 'x' ? r : (r & 0x3 | 0x8)
    return v.toString(16)
  })
}

/**
 * 生成記錄 ID
 * 用於 UreaPage 中的使用記錄
 *
 * @returns 記錄用的唯一 ID
 */
export function generateRecordId(): string {
  return generateUUID()
}

/**
 * 生成記憶體檔案 ID
 * 用於暫存檔案的唯一標識
 *
 * @returns 記憶體檔案用的 ID
 */
export function generateMemoryFileId(): string {
  return generateSimpleId('memory')
}

/**
 * 檢查 ID 是否為有效格式
 *
 * @param id - 要檢查的 ID
 * @returns 是否為有效 ID
 */
export function isValidId(id: string): boolean {
  if (!id || typeof id !== 'string') {
    return false
  }

  // UUID v4 格式檢查
  const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[4][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
  if (uuidPattern.test(id)) {
    return true
  }

  // 簡單 ID 格式檢查 (timestamp-random 或 prefix-timestamp-random)
  const simplePattern = /^(\w+-)?(\d+)-([a-z0-9]+)$/
  if (simplePattern.test(id)) {
    return true
  }

  return false
}