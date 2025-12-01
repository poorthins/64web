/**
 * 電力頁面型別定義
 */

import { EvidenceFile } from '../api/files'
import { MemoryFile } from '../services/documentHandler'

/**
 * 電表表號
 */
export interface ElectricityMeter {
  /** 表號 ID (UUID) */
  id: string
  /** 表號名稱 */
  meterNumber: string
}

/**
 * 電力帳單資料
 */
export interface ElectricityBill {
  /** 帳單 ID (UUID) */
  id: string
  /** 關聯的表號 ID */
  meterId?: string
  /** 計費起日 (ROC 格式: "113/01/01") */
  billingStart: string
  /** 計費訖日 (ROC 格式: "113/02/28") */
  billingEnd: string
  /** 計費度數 (單位：kWh) */
  billingUnits: number
  /** 已上傳的佐證檔案 */
  files: EvidenceFile[]
  /** 暫存檔案（尚未上傳） */
  memoryFiles?: MemoryFile[]
}

/**
 * Type 2 架構：帳單記錄（包含群組 ID）
 */
export interface ElectricityBillRecord extends ElectricityBill {
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
  records: ElectricityBillRecord[]
  /** 群組共用的暫存檔案（尚未上傳） */
  memoryFiles: MemoryFile[]
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
 * 電力頁面完整狀態
 */
export interface ElectricityPageState {
  /** 表號清單 */
  meters: ElectricityMeter[]
  /** 帳單清單 */
  bills: ElectricityBill[]
  /** 月份狀態 */
  monthlyProgress: MonthStatus[]
}
