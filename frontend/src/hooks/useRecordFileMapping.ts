import { useState, useCallback } from 'react'
import { uploadEvidenceWithEntry, type EvidenceFile } from '../api/files'
import { type MemoryFile } from '../services/documentHandler'

/**
 * 檔案映射表：記錄 ID → 檔案 ID[]
 *
 * 範例：
 * {
 *   "fire_extinguisher_1704067200": ["file-uuid-1", "file-uuid-2"],
 *   "diesel_202501": ["file-uuid-3"]
 * }
 */
export type FileMapping = Record<string, string[]>

/**
 * Hook 回傳值介面
 */
export interface UseRecordFileMappingReturn {
  /** 上傳記錄的檔案並更新映射表，回傳上傳的檔案 ID 陣列 */
  uploadRecordFiles: (recordId: string, files: MemoryFile[], dynamicEntryId?: string, fileType?: string, allRecordIds?: string[]) => Promise<string[]>

  /** 取得屬於某記錄的檔案 */
  getRecordFiles: (recordId: string, allFiles: EvidenceFile[]) => EvidenceFile[]

  /** 從 payload 載入映射表 */
  loadFileMapping: (payload: any) => void

  /** 取得要存入 payload 的映射表 */
  getFileMappingForPayload: () => FileMapping

  /** 刪除記錄的映射（清理通訊錄） */
  removeRecordMapping: (recordId: string) => void

  /** 當前映射表狀態 */
  fileMapping: FileMapping
}

/**
 * 多記錄頁面檔案映射 Hook
 *
 * ## 問題背景
 *
 * 舊做法使用陣列索引關聯檔案：
 * ```typescript
 * // 上傳時
 * recordIndex: 0, 1, 2  // 用索引關聯
 *
 * // 刪除中間記錄後
 * records = [A, C]  // 索引變成 [0, 1]
 * files = [fileA, fileB, fileC]  // 索引還是 [0, 1, 2]
 * 結果：C 拿到 B 的檔案（索引 1 對到舊的索引 1）❌
 * ```
 *
 * 新做法使用穩定 recordId：
 * ```typescript
 * // 上傳時
 * recordId: "fire_1", "fire_2", "fire_3"  // 用 ID 關聯
 * fileMapping: {
 *   "fire_1": ["file-uuid-1"],
 *   "fire_2": ["file-uuid-2"],
 *   "fire_3": ["file-uuid-3"]
 * }
 *
 * // 刪除中間記錄後
 * records = [fire_1, fire_3]  // ID 不變
 * fileMapping: {
 *   "fire_1": ["file-uuid-1"],
 *   "fire_3": ["file-uuid-3"]  // 移除 fire_2
 * }
 * 結果：fire_3 拿到自己的檔案 ✅
 * ```
 *
 * ## 適用頁面
 *
 * - FireExtinguisherPage（滅火器清單）- 最嚴重（新增在前面）
 * - DieselPage（12 個月記錄）
 * - UreaPage（12 個月記錄）
 * - DieselGeneratorPage（發電機清單）
 *
 * ## 核心功能
 *
 * 1. **uploadRecordFiles(recordId, files)** - 上傳檔案並記錄映射
 * 2. **getRecordFiles(recordId, allFiles)** - 查詢屬於某記錄的檔案
 * 3. **loadFileMapping(payload)** - 從 payload 載入映射表（重新進入頁面）
 * 4. **getFileMappingForPayload()** - 取得要存檔的映射表（提交時）
 * 5. **removeRecordMapping(recordId)** - 刪除映射（刪除記錄時）
 *
 * @param pageKey - 頁面識別碼（如 'fire_extinguisher'）
 * @param entryId - Entry ID（用於上傳檔案，null 時無法上傳）
 *
 * @example
 * ```typescript
 * // 1. 引入 Hook
 * const {
 *   uploadRecordFiles,
 *   getRecordFiles,
 *   loadFileMapping,
 *   getFileMappingForPayload,
 *   removeRecordMapping
 * } = useRecordFileMapping(pageKey, entry?.id || null)
 *
 * // 2. 載入時還原映射表
 * useEffect(() => {
 *   if (entry?.payload) {
 *     loadFileMapping(entry.payload.fireExtinguisherData)
 *   }
 * }, [entry])
 *
 * // 3. 上傳檔案
 * await uploadRecordFiles(record.id, record.memoryFiles)
 *
 * // 4. 顯示檔案
 * const recordFiles = getRecordFiles(record.id, allFiles)
 *
 * // 5. 刪除記錄
 * removeRecordMapping(recordId)
 *
 * // 6. 提交時存入 payload
 * payload: {
 *   records: data.records,
 *   fileMapping: getFileMappingForPayload()
 * }
 * ```
 */
export function useRecordFileMapping(
  pageKey: string,
  entryId: string | null
): UseRecordFileMappingReturn {

  // 檔案映射表狀態（通訊錄）
  const [fileMapping, setFileMapping] = useState<FileMapping>({})

  /**
   * 上傳記錄的檔案
   *
   * 流程：
   * 1. 驗證 entryId 不為空
   * 2. 批次上傳檔案到 Storage
   * 3. 收集上傳後的檔案 ID
   * 4. 更新 fileMapping（recordId → fileIds）
   *
   * @param recordId - 記錄的穩定 ID（如 "fire_extinguisher_1704067200"）
   * @param files - 要上傳的記憶體檔案陣列
   * @param dynamicEntryId - 動態 entry ID（提交時的新 ID）
   * @param fileType - 檔案類型（預設 'other'）
   *
   * @throws {Error} entryId 為 null 時拋錯
   * @throws {Error} 檔案上傳失敗時拋錯
   *
   * @example
   * ```typescript
   * await uploadRecordFiles("fire_1", [
   *   { file: File, preview: "blob:..." },
   *   { file: File, preview: "blob:..." }
   * ], entry_id, 'usage_evidence')
   * ```
   */
  const uploadRecordFiles = useCallback(async (
    recordId: string,
    files: MemoryFile[],
    dynamicEntryId?: string,  // ⭐ 接受動態 entryId（提交時的新 ID）
    fileType?: string,  // ⭐ 接受檔案類型（預設 'other'）
    allRecordIds?: string[]  // ⭐ 新增：群組的所有 recordId
  ): Promise<string[]> => {  // ⭐ 改為回傳 string[]
    // 使用傳入的 dynamicEntryId，若無則使用初始化時的 entryId
    const actualEntryId = dynamicEntryId || entryId

    // 驗證 entryId
    if (!actualEntryId) {
      throw new Error('[useRecordFileMapping] entryId 為空，無法上傳檔案')
    }

    // 處理空檔案陣列
    if (files.length === 0) {
      return []
    }

    try {
      const uploadedFileIds: string[] = []

      // 批次上傳所有檔案
      for (const memoryFile of files) {
        const result = await uploadEvidenceWithEntry(memoryFile.file, {
          entryId: actualEntryId,  // ✅ 使用 actualEntryId（動態或初始化的）
          pageKey,
          standard: '64',
          recordId: recordId,  // ⭐ 傳入穩定的 recordId（寫入資料庫）
          allRecordIds: allRecordIds,  // ⭐ 傳遞群組的所有 recordId
          fileType: (fileType || 'other') as 'msds' | 'usage_evidence' | 'other' | 'heat_value_evidence' | 'annual_evidence' | 'nameplate_evidence'
        })
        uploadedFileIds.push(result.id)
      }

      // 更新映射表（合併新舊檔案 ID）- 仍然更新 React state（給 UI 用）
      setFileMapping(prev => ({
        ...prev,
        [recordId]: [...(prev[recordId] || []), ...uploadedFileIds]
      }))

      // ⭐ 回傳檔案 ID 陣列（給提交流程手動累積用）
      return uploadedFileIds

    } catch (error) {
      console.error(`❌ [useRecordFileMapping] 上傳失敗 (recordId=${recordId}):`, error)
      throw error
    }
  }, [entryId, pageKey])

  /**
   * 取得屬於某記錄的檔案
   *
   * 向後相容邏輯：
   * 1. 優先從資料庫 record_id 欄位查詢（新做法，single source of truth）
   * 2. 若找不到，則從 fileMapping 查詢（舊資料格式 fallback）
   *
   * @param recordId - 記錄的穩定 ID
   * @param allFiles - 所有檔案（從 useEnergyData 取得）
   * @returns 屬於這個記錄的檔案陣列
   *
   * @example
   * ```typescript
   * const recordFiles = getRecordFiles("fire_1", allFiles)
   * // 回傳：[{ id: "file-uuid-1", ... }]
   * ```
   */
  const getRecordFiles = useCallback((
    recordId: string,
    allFiles: EvidenceFile[]
  ): EvidenceFile[] => {
    // 方法 1：查資料庫 record_ids 陣列（新做法，支援多對一）
    const filesWithRecordIds = (allFiles as any[]).filter(f =>
      f.record_ids?.includes(recordId)
    )

    if (filesWithRecordIds.length > 0) {
      return filesWithRecordIds as EvidenceFile[]
    }

    // 方法 2：fallback 查 record_id 欄位（舊做法，向後相容）
    const filesWithRecordId = (allFiles as any[]).filter(f =>
      f.record_id === recordId || f.recordId === recordId
    )

    if (filesWithRecordId.length > 0) {
      return filesWithRecordId as EvidenceFile[]
    }

    // 方法 3：fallback 查 fileMapping（payload 存的，可能過時）
    const fileIds = fileMapping[recordId] || []
    if (fileIds.length > 0) {
      return allFiles.filter(f => fileIds.includes(f.id))
    }

    // 找不到檔案 → 通常是新記錄，回傳空陣列
    return []
  }, [fileMapping])

  /**
   * 從 payload 載入 fileMapping
   *
   * 用途：重新進入頁面時，從資料庫載入的 payload 還原映射表
   *
   * 向後相容：
   * - 如果 payload 有 fileMapping → 載入
   * - 如果 payload 沒有 fileMapping（舊資料） → 設為空物件（fallback 到資料庫 record_id）
   *
   * @param payload - entry.payload（從 useEnergyData 取得）
   *
   * @example
   * ```typescript
   * useEffect(() => {
   *   if (entry?.payload) {
   *     loadFileMapping(entry.payload.fireExtinguisherData)
   *   }
   * }, [entry])
   * ```
   */
  const loadFileMapping = useCallback((payload: any) => {
    if (payload?.fileMapping) {
      setFileMapping(payload.fileMapping)
    } else {
      // 向後相容：舊資料沒有 fileMapping，使用空物件（fallback 到資料庫 record_id）
      setFileMapping({})
    }
  }, [])

  /**
   * 取得要存入 payload 的映射表
   *
   * 用途：提交時呼叫，將 fileMapping 存入 extraPayload
   *
   * @returns 當前的 fileMapping
   *
   * @example
   * ```typescript
   * await upsertEnergyEntry({
   *   page_key: pageKey,
   *   period_year: year,
   *   extraPayload: {
   *     records: data.records,
   *     fileMapping: getFileMappingForPayload()  // ⭐ 存入映射表
   *   }
   * })
   * ```
   */
  const getFileMappingForPayload = useCallback((): FileMapping => {
    return fileMapping
  }, [fileMapping])

  /**
   * 刪除記錄的映射
   *
   * 用途：當使用者刪除記錄時，清理對應的映射（從通訊錄移除）
   *
   * 注意：
   * - 只刪除映射，不刪除實際檔案
   * - 檔案刪除由其他邏輯處理（如 useEnergyClear）
   *
   * @param recordId - 要刪除的記錄 ID
   *
   * @example
   * ```typescript
   * const handleDeleteRecord = (recordId: string) => {
   *   // 刪除記錄
   *   setData(prev => ({
   *     records: prev.records.filter(r => r.id !== recordId)
   *   }))
   *
   *   // ⭐ 清理映射表
   *   removeRecordMapping(recordId)
   * }
   * ```
   */
  const removeRecordMapping = useCallback((recordId: string) => {
    setFileMapping(prev => {
      const newMapping = { ...prev }
      delete newMapping[recordId]
      return newMapping
    })
  }, [])

  return {
    uploadRecordFiles,
    getRecordFiles,
    loadFileMapping,
    getFileMappingForPayload,
    removeRecordMapping,
    fileMapping
  }
}
