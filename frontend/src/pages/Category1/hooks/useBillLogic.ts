/**
 * useBillLogic - 帳單編輯邏輯（通用）
 *
 * 封裝 Type 2 架構的帳單編輯邏輯：
 * - 新增/編輯/刪除帳單
 * - 載入群組到編輯區
 * - 檔案管理
 * - 清除邏輯
 */

import { useState, useCallback } from 'react'
import { generateRecordId } from '../../../utils/idGenerator'
import { useEnergyClear } from '../../../hooks/useEnergyClear'
import { MemoryFile } from '../../../services/documentHandler'
import { EvidenceFile } from '../../../api/files'
import { EntryStatus } from '../../../components/StatusSwitcher'

interface BaseBillRecord {
  id: string
  groupId?: string
  meterId?: string
  billingStart: string
  billingEnd: string
  billingUnits: number
  files?: string[]
  memoryFiles?: MemoryFile[]
  evidenceFiles?: EvidenceFile[]
}

interface BillEditingGroup<TRecord> {
  groupId: string | null
  records: TRecord[]
  memoryFiles: MemoryFile[]
}

interface UseBillLogicParams<TRecord extends BaseBillRecord> {
  createEmptyBill: () => TRecord
  validateGroup: (records: TRecord[]) => { isValid: boolean; validRecords: TRecord[]; error?: string }
  currentEntryId: string | null
  frontendStatus: EntryStatus
  onError: (error: string) => void
  onSuccess: (message: string) => void
}

export function useBillLogic<TRecord extends BaseBillRecord>({
  createEmptyBill,
  validateGroup,
  currentEntryId,
  frontendStatus,
  onError,
  onSuccess
}: UseBillLogicParams<TRecord>) {
  const [currentEditingGroup, setCurrentEditingGroup] = useState<BillEditingGroup<TRecord>>({
    groupId: null,
    records: [createEmptyBill()],
    memoryFiles: []
  })

  const [savedGroups, setSavedGroups] = useState<TRecord[]>([])
  const [filesToDelete, setFilesToDelete] = useState<string[]>([])
  const { clear: clearEnergy, clearing } = useEnergyClear(currentEntryId, frontendStatus)

  /**
   * 新增/編輯帳單：保存當前編輯的記錄
   */
  const addRecordToCurrentGroup = useCallback(() => {
    const { groupId, records, memoryFiles } = currentEditingGroup
    const isEditMode = groupId !== null

    // 驗證記錄
    const validationResult = validateGroup(records)
    if (!validationResult.isValid) {
      onError(validationResult.error || '請填寫完整資料')
      return
    }

    if (validationResult.validRecords.length === 0) {
      onError('請至少填寫一筆完整的帳單資料')
      return
    }

    // 決定 groupId
    const finalGroupId = isEditMode ? groupId : generateRecordId()

    // 將 groupId 和 memoryFiles 套用到有效記錄
    const recordsWithGroupId = validationResult.validRecords.map(r => ({
      ...r,
      groupId: finalGroupId,
      memoryFiles: [...memoryFiles]
    }))

    if (isEditMode) {
      // 編輯模式：更新該群組
      setSavedGroups(prev => [
        ...recordsWithGroupId,
        ...prev.filter(r => r.groupId !== groupId)
      ])
    } else {
      // 新增模式：加入已保存列表
      setSavedGroups(prev => [...recordsWithGroupId, ...prev])
    }

    // 重置編輯區
    setCurrentEditingGroup({
      groupId: null,
      records: [createEmptyBill()],
      memoryFiles: []
    })
  }, [currentEditingGroup, validateGroup, onError, createEmptyBill])

  /**
   * 更新編輯區的帳單欄位
   */
  const updateCurrentGroupRecord = useCallback((id: string, field: keyof TRecord, value: any) => {
    setCurrentEditingGroup(prev => ({
      ...prev,
      records: prev.records.map(record =>
        record.id === id ? { ...record, [field]: value } : record
      )
    }))
  }, [])

  /**
   * 從編輯區移除帳單
   */
  const removeRecordFromCurrentGroup = useCallback((id: string) => {
    setCurrentEditingGroup(prev => ({
      ...prev,
      records: prev.records.filter(r => r.id !== id)
    }))
  }, [])

  /**
   * 載入群組到編輯區
   */
  const loadGroupToEditor = useCallback((groupId: string) => {
    const groupRecords = savedGroups.filter(r => r.groupId === groupId)
    if (groupRecords.length === 0) return

    setCurrentEditingGroup({
      groupId,
      records: groupRecords.map(r => ({ ...r })),
      memoryFiles: groupRecords[0]?.memoryFiles || []
    })

    onSuccess('已載入帳單群組到編輯區')
  }, [savedGroups, onSuccess])

  /**
   * 刪除已保存的群組
   */
  const deleteSavedGroup = useCallback((groupId: string) => {
    setSavedGroups(prev => prev.filter(r => r.groupId !== groupId))
  }, [])

  /**
   * 刪除佐證檔案
   */
  const handleDeleteEvidence = useCallback(async (fileId: string) => {
    setFilesToDelete(prev => [...prev, fileId])
  }, [])

  /**
   * 清除確認
   */
  const handleClearConfirm = useCallback(async (extraFiles?: {
    evidenceFiles?: EvidenceFile[]
    memoryFiles?: MemoryFile[]
  }) => {
    try {
      // 收集所有檔案
      const allFiles = [
        ...currentEditingGroup.records.flatMap(r => r.evidenceFiles || []),
        ...savedGroups.flatMap(r => r.evidenceFiles || []),
        ...(extraFiles?.evidenceFiles || [])
      ]
      const allMemoryFiles = [
        ...currentEditingGroup.memoryFiles,
        ...savedGroups.flatMap(r => r.memoryFiles || []),
        ...(extraFiles?.memoryFiles || [])
      ]

      // 使用 Hook 清除
      await clearEnergy({
        filesToDelete: allFiles,
        memoryFilesToClean: allMemoryFiles
      })

      // 重置前端狀態
      setCurrentEditingGroup({
        groupId: null,
        records: [createEmptyBill()],
        memoryFiles: []
      })
      setSavedGroups([])
    } catch (err) {
      console.error('清除失敗:', err)
      onError('清除失敗，請重試')
    }
  }, [currentEditingGroup, savedGroups, clearEnergy, createEmptyBill, onError])

  return {
    // 狀態
    currentEditingGroup,
    setCurrentEditingGroup,
    savedGroups,
    setSavedGroups,
    filesToDelete,
    setFilesToDelete,
    clearing,

    // 操作函式
    addRecordToCurrentGroup,
    updateCurrentGroupRecord,
    removeRecordFromCurrentGroup,
    loadGroupToEditor,
    deleteSavedGroup,
    handleDeleteEvidence,
    handleClearConfirm
  }
}
