/**
 * 天然氣頁面型別定義
 */

import { EvidenceFile } from '../api/files'
import { MemoryFile } from '../services/documentHandler'

/**
 * 低位熱值資料
 */
export interface HeatValue {
  /** 低位熱值 (單位：kcal/m³) */
  value: number
  /** 已上傳的佐證檔案 */
  files: EvidenceFile[]
  /** 暫存檔案（尚未上傳） */
  memoryFiles: MemoryFile[]
}

/**
 * 天然氣錶號
 */
export interface NaturalGasMeter {
  /** 錶號 ID (UUID) */
  id: string
  /** 錶號名稱 */
  meterNumber: string
}

/**
 * 天然氣帳單資料
 */
export interface NaturalGasBill {
  /** 帳單 ID (UUID) */
  id: string
  /** 關聯的錶號 ID */
  meterId?: string
  /** 計費起日 (ROC 格式: "113/01/01") */
  billingStart: string
  /** 計費訖日 (ROC 格式: "113/02/28") */
  billingEnd: string
  /** 計費度數 (單位：m³) */
  billingUnits: number
  /** 已上傳的佐證檔案 */
  files: EvidenceFile[]
  /** 暫存檔案（尚未上傳） */
  memoryFiles?: MemoryFile[]
}

/**
 * Type 2 架構：帳單記錄（包含群組 ID）
 */
export interface NaturalGasBillRecord extends NaturalGasBill {
  /** 群組 ID（用於綁定多筆帳單共用同一份佐證） */
  groupId?: string
  /** 已上傳的佐證檔案（伺服器回傳） */
  evidenceFiles?: EvidenceFile[]
}

/**
 * Type 2 架構：當前編輯群組
 */
export interface BillEditingGroup {
  /** 群組 ID（null = 新增模式，有值 = 編輯模式） */
  groupId: string | null
  /** 該群組的所有帳單記錄 */
  records: NaturalGasBillRecord[]
  /** 群組共用的暫存檔案（尚未上傳） */
  memoryFiles: MemoryFile[]
}

/**
 * Type 2 架構：低位熱值臨時編輯狀態
 */
export interface HeatValueEditingState {
  /** 當前編輯的月份（null = 未選擇） */
  month: number | null
  /** 低位熱值 (單位：kcal/m³) */
  value: number
  /** 暫存檔案（尚未儲存） */
  memoryFiles: MemoryFile[]
  /** 已上傳的佐證檔案（編輯模式） */
  evidenceFiles?: EvidenceFile[]
}

/**
 * 月份狀態
 */
export interface MonthStatus {
  /** 月份 (1-12) */
  month: number
  /** 該月用量 */
  usage: number
  /** 該月狀態 */
  status: 'complete' | 'partial' | 'empty'
  /** 覆蓋百分比 (0-100) */
  percentage: number
}

/**
 * 天然氣頁面完整狀態
 */
export interface NaturalGasPageState {
  /** 低位熱值 */
  heatValue: HeatValue
  /** 錶號清單 */
  meters: NaturalGasMeter[]
  /** 帳單清單 */
  bills: NaturalGasBill[]
  /** 月份狀態 */
  monthlyProgress: MonthStatus[]
}
