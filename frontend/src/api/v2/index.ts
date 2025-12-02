/**
 * API v2 - 統一匯出
 *
 * 新的 API 層，直接對應後端 Flask endpoints
 * 取代舊的 Supabase 直接查詢方式
 *
 * 優點：
 * 1. 集中業務邏輯在後端
 * 2. 統一錯誤處理
 * 3. 類型安全的 TypeScript 介面
 * 4. 更容易測試和維護
 *
 * 使用方式：
 * ```typescript
 * import { carbonAPI, entryAPI, fileAPI } from '@/api/v2'
 *
 * // 計算碳排放
 * const carbon = await carbonAPI.calculateCarbon({
 *   page_key: 'diesel',
 *   monthly_data: { '1': 100 },
 *   year: 2024
 * })
 *
 * // 提交能源條目
 * const entry = await entryAPI.submitEnergyEntry({
 *   page_key: 'diesel',
 *   period_year: 2024,
 *   unit: '公升',
 *   monthly: { '1': 100 }
 * })
 *
 * // 上傳檔案
 * const file = await fileAPI.uploadEvidenceFile(fileObject, {
 *   page_key: 'diesel',
 *   period_year: 2024,
 *   file_type: 'usage_evidence',
 *   month: 1
 * })
 * ```
 */

// Carbon API
export * as carbonAPI from './carbonAPI'
export type {
  CarbonCalculateRequest,
  CarbonCalculateResponse
} from './carbonAPI'

// Entry API
export * as entryAPI from './entryAPI'
export type {
  EntrySubmitRequest,
  EntrySubmitResponse,
  EntryUpdateRequest,
  EntryUpdateResponse
} from './entryAPI'

// File API
export * as fileAPI from './fileAPI'
export type {
  FileUploadMetadata,
  FileUploadResponse,
  FileDeleteRequest,
  FileDeleteResponse
} from './fileAPI'
