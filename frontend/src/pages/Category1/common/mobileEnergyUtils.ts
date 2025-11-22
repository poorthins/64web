/**
 * 移動源能源頁面工具函式（柴油、汽油等共用）
 */

import { MobileEnergyRecord } from './mobileEnergyTypes'
import { generateRecordId } from '../../../utils/idGenerator'
import { LAYOUT_CONSTANTS } from './mobileEnergyConstants'

/**
 * 建立指定數量的空白記錄
 * @param count - 記錄數量，預設為 3
 * @returns MobileEnergyRecord[] - 空白記錄陣列
 */
export const createEmptyRecords = (count: number = LAYOUT_CONSTANTS.DEFAULT_RECORDS_COUNT): MobileEnergyRecord[] => {
  return Array.from({ length: count }, () => ({
    id: generateRecordId(),
    date: '',
    quantity: 0,
    evidenceFiles: [],
    memoryFiles: [],
    groupId: undefined
  }))
}

/**
 * 準備提交/儲存的資料
 * @param energyData - 能源使用記錄
 * @returns 準備好的資料物件
 */
export const prepareSubmissionData = (energyData: MobileEnergyRecord[]) => {
  const totalQuantity = energyData.reduce((sum, item) => sum + item.quantity, 0)

  // 清理 payload：只送基本資料，移除 File 物件
  const cleanedEnergyData = energyData.map((r: MobileEnergyRecord) => ({
    id: r.id,
    date: r.date,
    quantity: r.quantity,
    groupId: r.groupId,
    ...(r.specId !== undefined && { specId: r.specId }),          // ⭐ 保留 specId（WD40 專用）
    ...(r.deviceType !== undefined && { deviceType: r.deviceType }), // ⭐ 保留 deviceType（柴油固定源專用）
    ...(r.deviceName !== undefined && { deviceName: r.deviceName })  // ⭐ 保留 deviceName（柴油固定源專用）
  }))

  // 建立群組 → recordIds 映射表
  const groupRecordIds = new Map<string, string[]>()
  energyData.forEach(record => {
    if (record.groupId) {
      if (!groupRecordIds.has(record.groupId)) {
        groupRecordIds.set(record.groupId, [])
      }
      groupRecordIds.get(record.groupId)!.push(record.id)
    }
  })

  // 去重：每個群組只保留第一個 record 的 memoryFiles
  const seenGroupIds = new Set<string>()
  const deduplicatedRecordData = energyData.map(record => {
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
    cleanedEnergyData,
    deduplicatedRecordData
  }
}
