import type { EnergyEntry } from '../../../api/entries'

/**
 * 統一的資料記錄格式
 */
export interface ExtractedRecord {
  id?: string
  date?: string
  month?: number
  quantity?: number
  usage?: number
  unit?: string
  groupId?: string  // 柴油/汽油頁面用
  [key: string]: any  // 保留所有原始欄位
}

/**
 * 從 entry 提取所有記錄（暴力窮舉法）
 *
 * 設計原則：寧可多抓也不要漏，但避免重複
 * 優先用 payload，沒有才用 extraPayload
 */
export function extractRecords(entry: EnergyEntry): ExtractedRecord[] {
  const records: ExtractedRecord[] = []
  const payload = entry.payload || entry.extraPayload  // 優先用 payload

  // 策略 1: 找所有陣列型態的資料（對每種資料類型只取一個來源）
  const dataSources = [
    payload?.records,
    payload?.dieselData?.records || payload?.dieselData,
    payload?.gasolineData?.records || payload?.gasolineData,
    payload?.dieselGeneratorData?.records || payload?.dieselGeneratorData,
    payload?.billData,
    payload?.refrigerantData?.records || payload?.refrigerantData,
    payload?.fireExtinguisherData?.records || payload?.fireExtinguisherData,
    payload?.generators,
    // Type 3 頁面的 usageRecords
    payload?.acetyleneData?.usageRecords,
    payload?.wd40Data?.usageRecords,
    payload?.lpgData?.usageRecords,
    payload?.weldingRodData?.usageRecords,
    payload?.gasCylinderData?.usageRecords
  ]

  dataSources.forEach(source => {
    if (Array.isArray(source) && source.length > 0) {
      records.push(...source)
    }
  })

  // 策略 2: 月份資料（monthly 格式）
  // ⚠️ 注意：如果已經有 usageRecords，就不提取 monthly（避免重複）
  const hasUsageRecords = records.length > 0
  const monthly = entry.payload?.monthly || entry.extraPayload?.monthly

  if (!hasUsageRecords && monthly && typeof monthly === 'object') {
    Object.entries(monthly).forEach(([month, value]) => {
      if (value !== null && value !== undefined && value !== '') {
        records.push({
          month: parseInt(month),
          quantity: Number(value),
          usage: Number(value)
        })
      }
    })
  }

  // 策略 3: monthlyQuantity 格式（容量+數量頁面）
  const monthlyQuantity = entry.payload?.monthlyQuantity || entry.extraPayload?.monthlyQuantity
  if (monthlyQuantity && typeof monthlyQuantity === 'object') {
    Object.entries(monthlyQuantity).forEach(([month, quantity]) => {
      if (Number(quantity) > 0) {
        const total = entry.payload?.monthly?.[month] || entry.extraPayload?.monthly?.[month] || 0
        records.push({
          month: parseInt(month),
          quantity: Number(quantity),
          usage: Number(total)
        })
      }
    })
  }

  console.log(`[dataExtractor] Entry ${entry.id} (${entry.page_key}): 提取 ${records.length} 筆記錄`)

  return records
}

/**
 * 品項資料格式
 */
export interface ExtractedSpec {
  id: string
  name: string
  [key: string]: any
}

/**
 * 從 entry 提取品項清單（Type 3 頁面專用）
 */
export function extractSpecs(entry: EnergyEntry): ExtractedSpec[] {
  const payload = entry.payload || entry.extraPayload

  // 暴力窮舉所有可能的 specs 位置
  const possibleSpecs = [
    payload?.acetyleneData?.specs,
    payload?.wd40Data?.specs,
    payload?.lpgData?.specs,
    payload?.weldingRodData?.specs,
    payload?.fireExtinguisherData?.specs,
    payload?.gasCylinderData?.specs,
    payload?.specs  // fallback
  ]

  for (const specs of possibleSpecs) {
    if (Array.isArray(specs) && specs.length > 0) {
      return specs.map(s => ({
        id: String(s.id),
        name: String(s.name || ''),
        ...s
      }))
    }
  }

  return []
}

/**
 * 根據 specId 取得品項名稱
 */
export function getSpecName(specId: string | undefined, specs: ExtractedSpec[]): string {
  if (!specId) return ''
  const spec = specs.find(s => s.id === specId)
  return spec?.name || '未知品項'
}

/**
 * 取得 entry 的基本資訊（用於 Excel 欄位）
 */
export function getEntryMetadata(entry: EnergyEntry): {
  unitCapacity?: number
  carbonRate?: number
  heatValue?: number
  [key: string]: any
} {
  return {
    unitCapacity: entry.payload?.unitCapacity || entry.extraPayload?.unitCapacity,
    carbonRate: entry.payload?.carbonRate || entry.extraPayload?.carbonRate,
    heatValue: entry.payload?.heatValue || entry.extraPayload?.heatValue,
    unit: entry.unit,
    ...entry.payload,
    ...entry.extraPayload
  }
}
