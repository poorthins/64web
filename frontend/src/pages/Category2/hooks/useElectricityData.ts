/**
 * useElectricityData - 電費頁面資料載入 Hook
 *
 * 處理從 API 載入的資料：
 * - 帳單資料（billData）
 * - 表號資料（meterData）
 * - 佐證檔案分配（Type 2 架構）
 * - 向後相容：自動補 groupId
 */

import { useEffect } from 'react'
import { EnergyEntry } from '../../../api/entries'
import { EvidenceFile } from '../../../api/files'
import { useGhostFileCleaner } from '../../../hooks/useGhostFileCleaner'
import { generateRecordId } from '../../../utils/idGenerator'
import { ElectricityBillRecord, ElectricityMeter } from '../../../types/electricityTypes'
import { EntryStatus } from '../../../components/StatusSwitcher'

interface UseElectricityDataParams {
  pageKey: string
  loadedEntry: EnergyEntry | null
  loadedFiles: EvidenceFile[]
  dataLoading: boolean
  savedGroups: ElectricityBillRecord[]
  setSavedGroups: (groups: ElectricityBillRecord[] | ((prev: ElectricityBillRecord[]) => ElectricityBillRecord[])) => void
  setMeters: (meters: ElectricityMeter[]) => void
  setInitialStatus: (status: EntryStatus) => void
  setCurrentEntryId: (id: string | null) => void
  setCurrentStatus?: (status: EntryStatus) => void
}

export function useElectricityData(params: UseElectricityDataParams) {
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
            groupId: item.groupId || generateRecordId(),  // ⭐ 向後相容：自動補 groupId
            evidenceFiles: [],
            memoryFiles: []
          }))

          setSavedGroups(updated)
        }
      }

      // 載入表號資料
      if (payload?.meterData) {
        const meterArray = Array.isArray(payload.meterData) ? payload.meterData : []
        setMeters(meterArray)
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

        // 分配帳單檔案到對應的 record（Type 2 架構）
        if (validFiles.length > 0 && savedGroups.length > 0) {
          setSavedGroups(prev =>
            prev.map(bill => {
              // ⭐ Type 2 關鍵：使用 split(',').includes() 過濾
              const filesForThisBill = validFiles.filter(f =>
                f.record_id && f.record_id.split(',').includes(bill.id)
              )
              return {
                ...bill,
                evidenceFiles: filesForThisBill
                // ⚠️ 不清除 memoryFiles
              }
            })
          )
        }
      }

      cleanAndAssignFiles()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadedFiles, pageKey, dataLoading, savedGroups.length])
}
