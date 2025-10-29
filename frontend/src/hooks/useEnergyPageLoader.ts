import { useEffect, useRef } from 'react'
import { useEnergyData } from './useEnergyData'
import { useGhostFileCleaner } from './useGhostFileCleaner'
import type { EnergyEntry } from '../api/entries'
import type { EvidenceFile } from '../api/files'

/**
 * 檔案分類結果
 *
 * 每個頁面可以根據需求返回不同的分類結構
 */
export interface FileClassificationResult {
  /** 全域檔案（如 MSDS、發票等不屬於特定月份/記錄的檔案） */
  globalFiles?: EvidenceFile[]

  /** 按月份分類的檔案 */
  monthlyFiles?: {
    month: number
    files: EvidenceFile[]
  }[]

  /** 按季度分類的檔案 */
  quarterlyFiles?: {
    quarter: number
    files: EvidenceFile[]
  }[]

  /** 按記錄分類的檔案（用於多筆記錄頁面） */
  recordFiles?: {
    recordId: string
    recordIndex?: number
    files: EvidenceFile[]
  }[]

  /** 自定義分類（完全自由格式） */
  customFiles?: Record<string, EvidenceFile[]>
}

/**
 * useEnergyPageLoader 選項
 */
export interface UseEnergyPageLoaderOptions {
  /** 頁面識別碼 (e.g., 'diesel', 'wd40') */
  pageKey: string

  /** 年份 */
  year: number

  /** 可選的 entry ID（用於審核模式） */
  entryId?: string | null

  /**
   * Entry 資料載入完成時的回調
   *
   * 用於處理 entry 資料，例如：
   * - 設定表單初始值（單位重量、碳排係數等）
   * - 設定 entry 狀態
   * - 設定月份資料
   *
   * @param entry - 載入的 entry 資料
   */
  onEntryLoad: (entry: EnergyEntry) => void

  /**
   * 檔案載入完成時的回調
   *
   * 這個函式負責「如何分類檔案」，每個頁面可以根據自己的需求定義。
   * Hook 會自動：
   * 1. 等待 loading 完成
   * 2. 清理幽靈檔案
   * 3. 調用此函式進行分類
   *
   * @param files - 清理後的有效檔案陣列
   * @param entry - 對應的 entry 資料（可能需要用於關聯）
   * @returns 分類結果
   *
   * @example
   * // 簡單的月度 + MSDS 分類
   * onFilesLoad: (files) => ({
   *   globalFiles: files.filter(f => f.file_type === 'msds'),
   *   monthlyFiles: Array.from({ length: 12 }, (_, i) => ({
   *     month: i + 1,
   *     files: files.filter(f => f.file_type === 'usage_evidence' && f.month === i + 1)
   *   }))
   * })
   */
  onFilesLoad: (files: EvidenceFile[], entry: EnergyEntry | null) => FileClassificationResult | void

  /**
   * 是否在初始載入時跳過回調
   *
   * 某些頁面可能需要在第一次載入時不觸發狀態變更，避免誤判為「資料已修改」
   *
   * @default true
   */
  skipInitialCallback?: boolean
}

/**
 * useEnergyPageLoader 返回值
 */
export interface UseEnergyPageLoaderReturn {
  /** 載入的 entry 資料 */
  entry: EnergyEntry | null

  /** 清理後的有效檔案 */
  files: EvidenceFile[]

  /** 是否正在載入 */
  loading: boolean

  /** 載入錯誤訊息 */
  error: string | null

  /** 重新載入資料 */
  reload: () => Promise<void>
}

/**
 * 統一的能源頁面資料載入 Hook
 *
 * ## 設計目標
 *
 * 消除 14 個能源頁面中重複的資料載入邏輯，統一處理：
 * - Entry 和 Files 的載入時序問題
 * - dataLoading 保護機制
 * - 幽靈檔案清理
 * - 檔案分類邏輯
 *
 * ## 核心原則
 *
 * 1. **Good Taste**: 用兩個獨立的 useEffect 處理 Entry 和 Files，消除時序競爭
 * 2. **簡單回調**: 每個頁面只需定義「如何處理資料」，其他邏輯統一處理
 * 3. **Don't break userspace**: 保證遷移後功能完全一致
 *
 * ## 使用範例
 *
 * ### 範例 1: 簡單的月度 + MSDS 頁面 (Diesel, Gasoline, WD40)
 *
 * ```typescript
 * const { entry, files, loading } = useEnergyPageLoader({
 *   pageKey: 'diesel',
 *   year: 2025,
 *   onEntryLoad: (entry) => {
 *     // 處理 entry 資料
 *     setUnitWeight(entry.payload?.unitWeight || 0)
 *     setCurrentEntryId(entry.id)
 *   },
 *   onFilesLoad: (files) => {
 *     // 分類檔案
 *     const msdsFiles = files.filter(f => f.file_type === 'msds')
 *     setMsdsFiles(msdsFiles)
 *
 *     // 月份檔案
 *     setMonthlyData(prev => prev.map(data => ({
 *       ...data,
 *       files: files.filter(f => f.file_type === 'usage_evidence' && f.month === data.month)
 *     })))
 *   }
 * })
 * ```
 *
 * ### 範例 2: 多筆記錄頁面 (FireExtinguisher, DieselGeneratorTest)
 *
 * ```typescript
 * const { entry, files, loading } = useEnergyPageLoader({
 *   pageKey: 'fire_extinguisher',
 *   year: 2025,
 *   onEntryLoad: (entry) => {
 *     const records = entry.payload?.records || []
 *     setRecords(records)
 *   },
 *   onFilesLoad: (files, entry) => {
 *     // 全域檔案（不屬於任何特定記錄）
 *     const globalFiles = files.filter(f =>
 *       f.record_id == null && f.record_index == null
 *     )
 *     setGlobalFiles(globalFiles)
 *
 *     // 記錄關聯檔案
 *     const records = entry?.payload?.records || []
 *     setRecords(records.map(record => ({
 *       ...record,
 *       files: files.filter(f => f.record_id === record.id)
 *     })))
 *   }
 * })
 * ```
 *
 * @param options - Hook 選項
 * @returns UseEnergyPageLoaderReturn
 */
export function useEnergyPageLoader(
  options: UseEnergyPageLoaderOptions
): UseEnergyPageLoaderReturn {
  const { pageKey, year, entryId, onEntryLoad, onFilesLoad, skipInitialCallback = true } = options

  // 使用基礎的資料載入 Hook
  const { entry, files, loading, error, reload } = useEnergyData(pageKey, year, entryId)

  // 幽靈檔案清理
  const { cleanFiles } = useGhostFileCleaner()

  // 追蹤是否為初始載入
  const isInitialLoad = useRef(true)

  // ⭐ 使用 useRef 保存最新的回調函數和 entry，避免 useEffect 依賴變化導致無限循環
  const onEntryLoadRef = useRef(onEntryLoad)
  const onFilesLoadRef = useRef(onFilesLoad)
  const entryRef = useRef(entry)

  // 每次 render 更新 ref 的值
  useEffect(() => {
    onEntryLoadRef.current = onEntryLoad
    onFilesLoadRef.current = onFilesLoad
    entryRef.current = entry
  })

  /**
   * useEffect 1: 處理 Entry 資料
   *
   * 只監聽 entry 和 loading，確保 entry 變化時立即處理
   */
  useEffect(() => {
    // 等待載入完成
    if (loading) {
      return
    }

    // 沒有 entry，跳過處理
    if (!entry) {
      return
    }

    // 如果設定為跳過初始回調，且這是初始載入，則跳過
    if (skipInitialCallback && isInitialLoad.current) {
      console.log(`✅ [useEnergyPageLoader] Entry loaded for ${pageKey}, skipping initial callback`)
      return
    }

    console.log(`✅ [useEnergyPageLoader] Processing entry for ${pageKey}:`, entry.id)

    // 調用用戶提供的回調（使用 ref 避免依賴變化）
    onEntryLoadRef.current(entry)
  }, [entry, loading, pageKey, skipInitialCallback])

  /**
   * useEffect 2: 處理 Files 資料
   *
   * 只監聽 files 和 loading，確保 files 變化時立即處理
   * 自動清理幽靈檔案，然後調用用戶的分類函式
   */
  useEffect(() => {
    // 等待載入完成
    if (loading) {
      return
    }

    // 沒有檔案，跳過處理
    if (files.length === 0) {
      // 但如果不是初始載入，且有 entry，表示檔案被清空了，需要通知頁面
      if (!isInitialLoad.current && entryRef.current) {
        console.log(`⚠️ [useEnergyPageLoader] Files cleared for ${pageKey}`)
        onFilesLoadRef.current([], entryRef.current)
      }
      return
    }

    // 清理幽靈檔案並分類
    const processFiles = async () => {
      console.log(`🔍 [useEnergyPageLoader] Processing ${files.length} files for ${pageKey}`)

      // 清理幽靈檔案
      const validFiles = await cleanFiles(files)
      console.log(`✅ [useEnergyPageLoader] ${validFiles.length} valid files after cleanup`)

      // 如果設定為跳過初始回調，且這是初始載入，則跳過
      if (skipInitialCallback && isInitialLoad.current) {
        console.log(`✅ [useEnergyPageLoader] Files loaded for ${pageKey}, skipping initial callback`)
        // 標記初始載入完成
        isInitialLoad.current = false
        return
      }

      // 調用用戶提供的分類函式（使用 ref 避免依賴變化）
      onFilesLoadRef.current(validFiles, entryRef.current)

      // 標記初始載入完成
      isInitialLoad.current = false
    }

    processFiles()
  }, [files, loading, cleanFiles, pageKey, skipInitialCallback])

  return {
    entry,
    files,
    loading,
    error,
    reload
  }
}
