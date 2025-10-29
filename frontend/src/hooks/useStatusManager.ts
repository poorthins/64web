import { useState, useCallback, useRef } from 'react'
import { EntryStatus } from '../components/StatusSwitcher'
import { updateEntryStatus } from '../api/entries'

export interface StatusManagerOptions {
  initialStatus: EntryStatus
  entryId: string | null
  onStatusChange?: (newStatus: EntryStatus) => void
  onError?: (error: string) => void
  onSuccess?: (message: string) => void
}

export interface StatusManagerResult {
  currentStatus: EntryStatus
  isUpdating: boolean
  updateStatus: (newStatus: EntryStatus, reason?: string) => Promise<void>
  canAutoTransition: (fromStatus: EntryStatus, toStatus: EntryStatus) => boolean
  handleSubmitSuccess: () => Promise<void>
  handleDataModified: () => Promise<void>
}

/**
 * 狀態管理 Hook
 * 統一管理狀態轉換邏輯，包括自動轉換和手動轉換
 */
export function useStatusManager({
  initialStatus,
  entryId,
  onStatusChange,
  onError,
  onSuccess
}: StatusManagerOptions): StatusManagerResult {
  const [currentStatus, setCurrentStatus] = useState<EntryStatus>(initialStatus)
  const [isUpdating, setIsUpdating] = useState(false)
  const lastModifiedTimeRef = useRef<number>(0)

  // 更新狀態的核心函數
  const updateStatus = useCallback(async (newStatus: EntryStatus, reason?: string): Promise<void> => {
    if (!entryId || currentStatus === newStatus) {
      return
    }

    setIsUpdating(true)
    
    try {
      // 調用後端 API 更新狀態
      await updateEntryStatus(entryId, newStatus)
      
      // 更新本地狀態
      setCurrentStatus(newStatus)
      
      // 觸發回調
      if (onStatusChange) {
        onStatusChange(newStatus)
      }

      // 顯示成功訊息
      const statusLabels: Record<EntryStatus, string> = {
        saved: '已暫存',
        submitted: '已提交',
        approved: '已核准',
        rejected: '已駁回'
      }
      
      let message = ''
      if (reason) {
        message = `${reason}，狀態已更新為「${statusLabels[newStatus]}」`
      } else {
        // 根據狀態轉換提供更具體的訊息
        if (newStatus === 'submitted') {
          message = '資料已提交，等待審核'
        } else {
          message = `狀態已更新為「${statusLabels[newStatus]}」`
        }
      }
      
      if (onSuccess) {
        onSuccess(message)
      }

    } catch (error) {
      console.error('Status update failed:', error)
      const errorMessage = error instanceof Error ? error.message : '狀態更新失敗'
      if (onError) {
        onError(errorMessage)
      }
    } finally {
      setIsUpdating(false)
    }
  }, [entryId, currentStatus, onStatusChange, onError, onSuccess])

  // 檢查是否可以進行自動狀態轉換
  const canAutoTransition = useCallback((fromStatus: EntryStatus, toStatus: EntryStatus): boolean => {
    // 定義允許的自動轉換路徑
    const allowedTransitions: Record<EntryStatus, EntryStatus[]> = {
      saved: [], // 已暫存不允許自動轉換
      submitted: [], // 已提交不允許自動轉換
      approved: [], // 已核准不允許自動轉換
      rejected: ['submitted'] // 已駁回可以自動轉為已提交
    }

    return allowedTransitions[fromStatus]?.includes(toStatus) || false
  }, [])

  // 處理提交成功後的狀態轉換
  const handleSubmitSuccess = useCallback(async (): Promise<void> => {
    if (canAutoTransition(currentStatus, 'submitted')) {
      await updateStatus('submitted', '提交成功')
    }
  }, [currentStatus, canAutoTransition, updateStatus])

  // 處理資料被修改時的狀態處理
  const handleDataModified = useCallback(async (): Promise<void> => {
    // 防止過於頻繁的狀態更新
    const now = Date.now()
    if (now - lastModifiedTimeRef.current < 1000) { // 1秒內不重複觸發
      return
    }
    lastModifiedTimeRef.current = now

    // 資料修改時的狀態處理（不再回退為草稿）
    // 可以在這裡加入其他狀態處理邏輯
  }, [])

  return {
    currentStatus,
    isUpdating,
    updateStatus,
    canAutoTransition,
    handleSubmitSuccess,
    handleDataModified
  }
}