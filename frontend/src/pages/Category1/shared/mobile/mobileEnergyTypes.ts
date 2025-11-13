/**
 * 移動源能源通用型別定義
 */

import type { EvidenceFile } from '../../../../api/files'
import type { MemoryFile } from '../../../../services/documentHandler'

export interface MobileEnergyRecord {
  id: string
  date: string
  quantity: number
  evidenceFiles?: EvidenceFile[]
  memoryFiles?: MemoryFile[]
  groupId?: string
  deviceType?: string  // 柴油發電機專用
  deviceName?: string  // 設備名稱
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
