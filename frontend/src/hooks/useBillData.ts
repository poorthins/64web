/**
 * useBillData - 通用帳單資料載入（天然氣 + 電力）
 *
 * 處理從 API 載入的資料：
 * - 帳單資料（billData）
 * - 錶號資料（meterData）
 * - 佐證檔案分配（Type 2 架構）
 * - 向後相容：自動補 groupId
 *
 * 支援額外資料載入（如天然氣的熱值）透過 config 傳入
 */

import { useEffect } from 'react'
import { EnergyEntry } from '../api/entries'
import { EvidenceFile } from '../api/files'
import { useGhostFileCleaner } from './useGhostFileCleaner'
import { generateRecordId } from '../utils/idGenerator'
import { EntryStatus } from '../components/StatusSwitcher'

// ==================== 泛型型別定義 ====================

interface BaseBillRecord {
  id: string
  groupId?: string
  meterId?: string
  billingStart: string
  billingEnd: string
  billingUnits: number
  files?: string[]
  memoryFiles?: any[]
  evidenceFiles?: EvidenceFile[]
}

interface BaseMeter {
  id: string
  meterNumber: string
}

// ==================== Config 參數 ====================

export interface BillDataConfig {
  /** 從 payload 載入額外資料（如熱值） */
  loadExtraData?: (payload: any) => void
  /** 過濾佐證檔案（如熱值檔案需要排除） */
  filterBillFiles?: (files: EvidenceFile[]) => EvidenceFile[]
  /** 載入額外檔案（如熱值檔案） */
  loadExtraFiles?: (files: EvidenceFile[]) => void
}

// ==================== Hook 參數 ====================

interface UseBillDataParams<TRecord extends BaseBillRecord, TMeter extends BaseMeter> {
  pageKey: string
  loadedEntry: EnergyEntry | null
  loadedFiles: EvidenceFile[]
  dataLoading: boolean
  savedGroups: TRecord[]
  setSavedGroups: (groups: TRecord[] | ((prev: TRecord[]) => TRecord[])) => void
  setMeters: (meters: TMeter[]) => void
  setInitialStatus: (status: EntryStatus) => void
  setCurrentEntryId: (id: string | null) => void
  setCurrentStatus?: (status: EntryStatus) => void
}

// ==================== Hook 主體 ====================

export function useBillData<TRecord extends BaseBillRecord, TMeter extends BaseMeter>(
  params: UseBillDataParams<TRecord, TMeter>,
  config?: BillDataConfig
) {
  const {
    pageKey,
    loadedEntry,
    loadedFiles,
    dataLoading,
    savedGroups,
    setSavedGroups,
    setMeters,
    setInitialStatus,
    setCurrentEntryId,
    setCurrentStatus
  } = params

  const { cleanFiles } = useGhostFileCleaner()

  // 第一步：從 entry.payload 載入記錄資料
  useEffect(() => {
    if (loadedEntry && !dataLoading) {
      const entryStatus = loadedEntry.status as EntryStatus
      setInitialStatus(entryStatus)
      setCurrentEntryId(loadedEntry.id)
      if (setCurrentStatus) {
        setCurrentStatus(entryStatus)
      }

      const payload = loadedEntry.payload

      // 載入帳單資料
      if (payload?.billData) {
        const billArray = Array.isArray(payload.billData) ? payload.billData : []

        if (billArray.length > 0) {
          const updated = billArray.map((item: any) => ({
            ...item,
            id: String(item.id || generateRecordId()),
            groupId: item.groupId || generateRecordId(),  // 向後相容：自動補 groupId
            evidenceFiles: [],
            memoryFiles: []  // 初始化時清空 memoryFiles
          }))

          setSavedGroups(updated as TRecord[])
        }
      }

      // 載入錶號資料
      if (payload?.meterData) {
        const meterArray = Array.isArray(payload.meterData) ? payload.meterData : []
        setMeters(meterArray as TMeter[])
      }

      // 載入額外資料（如熱值）
      if (config?.loadExtraData) {
        config.loadExtraData(payload)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadedEntry, dataLoading])

  // 第二步：檔案載入後分配到記錄
  useEffect(() => {
    if (dataLoading) return

    if (loadedFiles.length > 0) {
      const cleanAndAssignFiles = async () => {
        // 清理幽靈檔案
        const validFiles = await cleanFiles(loadedFiles.filter(f => f.page_key === pageKey))

        // 過濾帳單檔案（排除額外檔案，如熱值）
        const billFiles = config?.filterBillFiles
          ? config.filterBillFiles(validFiles)
          : validFiles

        // 分配帳單檔案到對應的 record（Type 2 架構）
        if (savedGroups.length > 0) {
          setSavedGroups(prev =>
            prev.map(bill => {
              // Type 2 關鍵：使用 split(',').includes() 過濾
              const filesForThisBill = billFiles.filter(f =>
                f.record_id && f.record_id.split(',').includes(bill.id)
              )
              return {
                ...bill,
                evidenceFiles: filesForThisBill,
                memoryFiles: []  // 清除 memoryFiles（檔案已上傳成為 evidenceFiles）
              }
            })
          )
        }

        // 載入額外檔案（如熱值）
        if (config?.loadExtraFiles) {
          config.loadExtraFiles(validFiles)
        }
      }

      cleanAndAssignFiles()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadedFiles, pageKey, dataLoading, savedGroups.length])
}
