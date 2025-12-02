/**
 * useNaturalGasData - 天然氣頁面資料載入 Hook
 *
 * 處理從 API 載入的資料：
 * - 帳單資料（billData）
 * - 錶號資料（meterData）
 * - 低位熱值資料（heatValue）
 * - 佐證檔案分配（Type 2 架構）
 * - 向後相容：自動補 groupId
 */

import { useEffect } from 'react'
import { EnergyEntry } from '../../../api/entries'
import { EvidenceFile } from '../../../api/files'
import { useGhostFileCleaner } from '../../../hooks/useGhostFileCleaner'
import { generateRecordId } from '../../../utils/idGenerator'
import { NaturalGasBillRecord, NaturalGasMeter } from '../../../types/naturalGasTypes'
import { EntryStatus } from '../../../components/StatusSwitcher'

interface UseNaturalGasDataParams {
  pageKey: string
  loadedEntry: EnergyEntry | null
  loadedFiles: EvidenceFile[]
  dataLoading: boolean
  savedGroups: NaturalGasBillRecord[]
  setSavedGroups: (groups: NaturalGasBillRecord[] | ((prev: NaturalGasBillRecord[]) => NaturalGasBillRecord[])) => void
  setMeters: (meters: NaturalGasMeter[]) => void
  setHeatValue: (value: number) => void
  setMonthlyHeatValues: (values: Record<number, number>) => void  // ⭐ 新增
  setHeatValueFiles: (files: Record<number, EvidenceFile[]>) => void  // ⭐ 改成月度版本
  setInitialStatus: (status: EntryStatus) => void
  setCurrentEntryId: (id: string | null) => void
  setCurrentStatus?: (status: EntryStatus) => void
}

export function useNaturalGasData(params: UseNaturalGasDataParams) {
  const {
    pageKey,
    loadedEntry,
    loadedFiles,
    dataLoading,
    savedGroups,
    setSavedGroups,
    setMeters,
    setHeatValue,
    setMonthlyHeatValues,  // ⭐ 新增
    setHeatValueFiles,
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
            memoryFiles: []  // ⭐ 初始化時清空 memoryFiles
          }))

          setSavedGroups(updated)
        }
      }

      // 載入錶號資料
      if (payload?.meterData) {
        const meterArray = Array.isArray(payload.meterData) ? payload.meterData : []
        setMeters(meterArray)
      }

      // ⭐ 載入月度低位熱值
      if (payload?.heatValue && typeof payload.heatValue === 'object') {
        const heatValueData = payload.heatValue as {
          value?: number  // 向後相容：舊的單一熱值
          monthly?: Record<string, number>  // 新的月度熱值
        }

        // ⭐ 優先載入月度熱值
        if (heatValueData.monthly && typeof heatValueData.monthly === 'object') {
          const monthlyValues: Record<number, number> = {}
          Object.entries(heatValueData.monthly).forEach(([month, value]) => {
            monthlyValues[Number(month)] = value
          })

          // ⭐ 設置月度熱值到 state
          setMonthlyHeatValues(monthlyValues)

          // ⭐ 使用第一個月的熱值作為預設值（向後相容）
          if (Object.keys(monthlyValues).length > 0) {
            const firstMonth = Math.min(...Object.keys(monthlyValues).map(Number))
            setHeatValue(monthlyValues[firstMonth])
          }
        } else if (typeof heatValueData.value === 'number') {
          // 向後相容：如果是舊資料只有單一熱值
          setHeatValue(heatValueData.value)
          // ⭐ 同時設置到第1個月（向後相容）
          setMonthlyHeatValues({ 1: heatValueData.value })
        }
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

        // ⭐ 分離帳單檔案和熱值檔案（支援月度格式）
        const billFiles = validFiles.filter(f =>
          f.record_id !== 'heat_value' && !f.record_id?.startsWith('heat_value_')
        )
        const heatValueFilesArray = validFiles.filter(f =>
          f.record_id === 'heat_value' || f.record_id?.startsWith('heat_value_')
        )

        // 分配帳單檔案到對應的 record（Type 2 架構）
        if (savedGroups.length > 0) {
          setSavedGroups(prev =>
            prev.map(bill => {
              // ⭐ Type 2 關鍵：使用 split(',').includes() 過濾
              const filesForThisBill = billFiles.filter(f =>
                f.record_id && f.record_id.split(',').includes(bill.id)
              )
              return {
                ...bill,
                evidenceFiles: filesForThisBill,
                memoryFiles: []  // ⭐ 清除 memoryFiles（檔案已上傳成為 evidenceFiles）
              }
            })
          )
        }

        // ⭐ 分配月度熱值佐證檔案
        if (heatValueFilesArray.length > 0) {
          const monthlyFiles: Record<number, EvidenceFile[]> = {}

          heatValueFilesArray.forEach(file => {
            if (file.record_id === 'heat_value') {
              // 向後相容：舊格式的單一熱值檔案，放到第 1 個月
              if (!monthlyFiles[1]) monthlyFiles[1] = []
              monthlyFiles[1].push(file)
            } else if (file.record_id?.startsWith('heat_value_')) {
              // 新格式：heat_value_1, heat_value_2, ..., heat_value_12
              const month = parseInt(file.record_id.replace('heat_value_', ''))
              if (month >= 1 && month <= 12) {
                if (!monthlyFiles[month]) monthlyFiles[month] = []
                monthlyFiles[month].push(file)
              }
            }
          })

          setHeatValueFiles(monthlyFiles)
        }
      }

      cleanAndAssignFiles()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadedFiles, pageKey, dataLoading, savedGroups.length])
}
