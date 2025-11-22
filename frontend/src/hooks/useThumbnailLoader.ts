/**
 * 統一的縮圖載入 Hook
 *
 * 用途：批次載入記錄中的圖片檔案縮圖，避免 API 轟炸
 *
 * 特性：
 * - 泛型設計支援任何 record 類型
 * - 批次載入（BATCH_SIZE = 3）控制並發數量
 * - 自動過濾已載入的縮圖，避免重複請求
 * - Promise.allSettled 確保部分失敗不影響其他檔案
 *
 * @example Type 1 使用（設備型頁面）
 * ```typescript
 * const thumbnails = useThumbnailLoader({
 *   records: savedDevices,
 *   fileExtractor: (device) => device.evidenceFiles || []
 * })
 * ```
 *
 * @example Type 2 使用（群組型頁面）
 * ```typescript
 * const thumbnails = useThumbnailLoader({
 *   records: savedGroups,
 *   fileExtractor: (group) => group.evidenceFiles || []
 * })
 * ```
 *
 * @example SF6Page 多檔案類型
 * ```typescript
 * const thumbnails = useThumbnailLoader({
 *   records: savedDevices,
 *   fileExtractor: (device) => [
 *     ...(device.nameplateFiles || []),
 *     ...(device.certificateFiles || [])
 *   ]
 * })
 * ```
 */

import { useState, useEffect } from 'react'
import { getFileUrl } from '../api/files'

/**
 * 證據檔案介面（與後端一致）
 */
export interface EvidenceFile {
  id: string
  file_path: string
  mime_type: string
  file_name?: string
  file_size?: number
  uploaded_at?: string
  [key: string]: any
}

/**
 * Hook 選項介面
 */
export interface UseThumbnailLoaderOptions<T> {
  /** 記錄陣列（Type 1: devices, Type 2: groups） */
  records: T[]
  /** 從單一記錄中提取檔案的函數 */
  fileExtractor: (record: T) => EvidenceFile[]
  /** 是否啟用載入（預設 true） */
  enabled?: boolean
}

/**
 * 統一的縮圖載入 Hook
 *
 * @param options - Hook 選項
 * @returns 縮圖 URL 映射表 { [fileId]: url }
 */
export function useThumbnailLoader<T>({
  records,
  fileExtractor,
  enabled = true
}: UseThumbnailLoaderOptions<T>): Record<string, string> {
  const [thumbnails, setThumbnails] = useState<Record<string, string>>({})

  useEffect(() => {
    if (!enabled) return

    const loadThumbnails = async () => {
      const tasks: Array<{ fileId: string; loadFn: () => Promise<string> }> = []

      // 收集所有需要載入的圖片檔案
      records.forEach((record) => {
        const files = fileExtractor(record)
        files.forEach((file) => {
          // 只載入圖片 && 尚未載入的檔案
          if (file.mime_type.startsWith('image/') && !thumbnails[file.id]) {
            tasks.push({
              fileId: file.id,
              loadFn: () => getFileUrl(file.file_path)
            })
          }
        })
      })

      // 如果沒有需要載入的檔案，直接返回
      if (tasks.length === 0) return

      // 批次執行（一次最多 3 個並發，避免 API 轟炸）
      const BATCH_SIZE = 3
      for (let i = 0; i < tasks.length; i += BATCH_SIZE) {
        const batch = tasks.slice(i, i + BATCH_SIZE)
        const results = await Promise.allSettled(
          batch.map(task => task.loadFn())
        )

        // 更新成功載入的縮圖
        results.forEach((result, index) => {
          if (result.status === 'fulfilled') {
            setThumbnails(prev => ({
              ...prev,
              [batch[index].fileId]: result.value
            }))
          }
        })
      }
    }

    loadThumbnails()
  }, [records, enabled]) // ✅ 正確依賴陣列：不包含 thumbnails，避免無限循環

  return thumbnails
}
