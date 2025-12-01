import { uploadEvidenceFile } from '../api/v2/fileAPI'
import { deleteEvidence, adminDeleteEvidence } from '../api/files'
import type { AdminSaveParams } from './useAdminSave'
import type { MemoryFile } from '../services/documentHandler'
import type { CurrentEditingGroup } from '../pages/Category1/common/mobileEnergyTypes'

/**
 * Type 2 頁面共用的輔助函數 Hook
 *
 * 用於所有 Type 2 頁面（DieselPage, UreaPage, GasolinePage 等）
 * 提供 6 個核心輔助函數，避免重複代碼
 *
 * @param pageKey - 頁面 key（如 'diesel', 'urea'）
 * @param year - 期間年份
 * @returns 6 個輔助函數
 */
export function useType2Helpers<T extends {
  id: string
  groupId?: string
  memoryFiles?: MemoryFile[]
  date?: string
  month?: number
  quantity?: number
  hours?: number
}>(pageKey: string, year: number) {

  // ⭐ 輔助函數 #1：建立群組映射（Type 2 核心邏輯）
  const buildGroupsMap = (records: T[]) => {
    const groupsMap = new Map<string, T[]>()
    records.forEach(record => {
      const gid = record.groupId || 'no-group'
      if (!groupsMap.has(gid)) groupsMap.set(gid, [])
      groupsMap.get(gid)!.push(record)
    })
    return groupsMap
  }

  // 輔助函數 #2：上傳群組檔案
  const uploadGroupFiles = async (groupsMap: Map<string, T[]>, entryId: string) => {
    for (const [, groupRecords] of groupsMap.entries()) {
      const firstRecord = groupRecords[0]
      if (firstRecord?.memoryFiles && firstRecord.memoryFiles.length > 0) {
        const newFiles = firstRecord.memoryFiles.filter(mf => mf.file && mf.file.size > 0)

        for (const file of newFiles) {
          await uploadEvidenceFile(file.file, {
            page_key: pageKey,
            period_year: year,
            file_type: 'other',
            entry_id: entryId,
            record_id: groupRecords.map(r => r.id).join(','),  // ⭐ Type 2 關鍵：comma-separated
            standard: '64'
          })
        }
      }
    }
  }

  // 輔助函數 #3：刪除已標記的檔案（一般使用者）
  const deleteMarkedFiles = async (
    filesToDelete: string[],
    setFilesToDelete: (files: string[]) => void
  ) => {
    if (filesToDelete.length > 0) {
      for (const fileId of filesToDelete) {
        try {
          await deleteEvidence(fileId)
        } catch (error) {
          // 靜默失敗
        }
      }
      setFilesToDelete([])
    }
  }

  // 輔助函數 #4：收集管理員要上傳的檔案
  const collectAdminFilesToUpload = (allGroups: T[]): AdminSaveParams['files'] => {
    const groupsMap = buildGroupsMap(allGroups)
    const filesToUpload: AdminSaveParams['files'] = []

    for (const [, groupRecords] of groupsMap.entries()) {
      const firstRecord = groupRecords[0]
      if (firstRecord?.memoryFiles && firstRecord.memoryFiles.length > 0) {
        const newFiles = firstRecord.memoryFiles.filter(mf => mf.file && mf.file.size > 0)

        for (const mf of newFiles) {
          filesToUpload.push({
            file: mf.file,
            metadata: {
              recordIndex: 0,
              allRecordIds: groupRecords.map(r => r.id),
              recordId: firstRecord.id
            }
          })
        }
      }
    }

    return filesToUpload
  }

  // 輔助函數 #5：刪除管理員標記的檔案
  const deleteMarkedFilesAsAdmin = async (
    filesToDelete: string[],
    setFilesToDelete: (files: string[]) => void
  ) => {
    if (filesToDelete.length > 0) {
      for (const fileId of filesToDelete) {
        try {
          await deleteEvidence(fileId)  // ✅ 修復後的 deleteEvidence() 已由 RLS Policy 控制權限
        } catch (error) {
          // 靜默失敗
        }
      }
      setFilesToDelete([])
    }
  }

  // 輔助函數 #6：同步編輯區修改到 savedGroups
  const syncEditingGroupChanges = (
    currentEditingGroup: { groupId: string | null; records: T[]; memoryFiles: MemoryFile[] },
    savedGroups: T[],
    setSavedGroups: (groups: T[]) => void
  ): T[] => {
    if (currentEditingGroup.groupId === null) {
      return savedGroups
    }

    // ⭐ 支援不同欄位：date/month, quantity/hours
    const hasModifications = currentEditingGroup.records.some(r => {
      const hasDateOrMonth = ('date' in r && r.date?.trim() !== '') || ('month' in r && (r.month ?? 0) > 0)
      const hasQuantityOrHours = ('quantity' in r && (r.quantity ?? 0) > 0) || ('hours' in r && (r.hours ?? 0) > 0)
      return hasDateOrMonth || hasQuantityOrHours
    }) || currentEditingGroup.memoryFiles.length > 0

    if (!hasModifications) {
      return savedGroups
    }

    const { groupId, records, memoryFiles } = currentEditingGroup

    // ⭐ 過濾有效記錄（支援不同欄位）
    const validRecords = records.filter(r => {
      const hasDateOrMonth = ('date' in r && r.date?.trim() !== '') || ('month' in r && (r.month ?? 0) > 0)
      const hasQuantityOrHours = ('quantity' in r && (r.quantity ?? 0) > 0) || ('hours' in r && (r.hours ?? 0) > 0)
      return hasDateOrMonth || hasQuantityOrHours
    })

    const recordsWithGroupId = validRecords.map(r => ({
      ...r,
      groupId: groupId,
      memoryFiles: [...memoryFiles]
    })) as T[]

    const finalSavedGroups = [
      ...recordsWithGroupId,
      ...savedGroups.filter(r => r.groupId !== groupId)
    ]

    setSavedGroups(finalSavedGroups)
    return finalSavedGroups
  }

  return {
    buildGroupsMap,
    uploadGroupFiles,
    deleteMarkedFiles,
    collectAdminFilesToUpload,
    deleteMarkedFilesAsAdmin,
    syncEditingGroupChanges
  }
}
