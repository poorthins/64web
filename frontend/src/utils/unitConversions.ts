/**
 * ⚠️ TECH DEBT: 單位轉換邏輯應移至後端
 *
 * 這個檔案包含前端的單位轉換邏輯。
 * 根據架構原則，商業邏輯（包括單位轉換、碳排計算等）應該在後端處理。
 *
 * TODO: 重構計畫
 * 1. 修改後端 API，接收原始值 + unit 欄位
 * 2. 後端負責單位轉換和總量計算
 * 3. 刪除此檔案
 *
 * 相關 Issue: CODE_QUALITY_CHECKLIST.md - P0 Critical
 */

/**
 * 將重量轉換為公斤（kg）
 *
 * @param amount - 數量
 * @param unit - 單位（'kg' | 'gram'）
 * @returns 轉換為公斤的數量
 *
 * @deprecated 此函數應移至後端 API
 */
export function convertWeightToKg(amount: number, unit: 'kg' | 'gram'): number {
  if (unit === 'gram') {
    return amount / 1000
  }
  return amount
}

/**
 * 計算設備陣列的總重量（公斤）
 *
 * @param devices - 設備陣列
 * @returns 總重量（kg）
 *
 * @deprecated 此函數應移至後端 API
 */
export function calculateTotalWeightInKg<T extends { fillAmount: number; unit: 'kg' | 'gram' }>(
  devices: T[]
): number {
  return devices.reduce((sum, device) => {
    return sum + convertWeightToKg(device.fillAmount, device.unit)
  }, 0)
}
