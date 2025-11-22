/**
 * 移動源能源通用型別定義
 */

import type { EvidenceFile } from '../../../api/files'
import type { MemoryFile } from '../../../services/documentHandler'

export interface MobileEnergyRecord {
  id: string
  date: string
  quantity: number
  evidenceFiles?: EvidenceFile[]
  memoryFiles?: MemoryFile[]
  groupId?: string
  deviceType?: string  // 柴油發電機專用
  deviceName?: string  // 設備名稱
  specId?: string      // WD-40 專用：規格 ID
}

export interface CurrentEditingGroup {
  groupId: string | null
  records: MobileEnergyRecord[]
  memoryFiles: MemoryFile[]
}

export interface EvidenceGroup {
  groupId: string
  evidence: EvidenceFile | null
  records: MobileEnergyRecord[]
}

/**
 * 發電機測試記錄型別
 */
export interface GeneratorTestRecord {
  id: string
  location: string              // 發電機位置
  generatorPower: number         // 發電功率（kW）
  testFrequency: number          // 測試頻率（次/年）
  testDuration: number           // 測試時間（分/次）
  groupId?: string
  evidenceFiles?: EvidenceFile[]
  memoryFiles?: MemoryFile[]
}

/**
 * 發電機測試編輯區狀態
 */
export interface GeneratorTestEditingGroup {
  groupId: string | null
  records: GeneratorTestRecord[]
  memoryFiles: MemoryFile[]
}

/**
 * SF6 記錄型別
 */
export interface SF6Record {
  id: string
  location: string              // 設備位置
  sf6Weight: number             // SF6氣體重量（g）
  model: string                 // 型號
  leakageRate: number           // 年洩漏率（%）
  groupId?: string
  nameplateFiles?: EvidenceFile[]      // GCB 氣體斷路器銘牌照片
  certificateFiles?: EvidenceFile[]    // SF6 氣體重量/ 年洩漏率證明文件
  memoryNameplateFiles?: MemoryFile[]
  memoryCertificateFiles?: MemoryFile[]
}

/**
 * SF6 編輯區狀態
 */
export interface SF6EditingGroup {
  groupId: string | null
  record: SF6Record  // ⭐ 注意：單一記錄，不是陣列
  memoryNameplateFiles: MemoryFile[]
  memoryCertificateFiles: MemoryFile[]
}
