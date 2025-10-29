import { useState, useCallback, useRef } from 'react'
import { EntryStatus } from '../components/StatusSwitcher'
import { updateEntryStatus } from '../api/entries'

export interface FrontendStatusOptions {
  initialStatus: EntryStatus
  entryId: string | null
  onStatusChange?: (newStatus: EntryStatus) => void
  onError?: (error: string) => void
  onSuccess?: (message: string) => void
}

export interface FrontendStatusResult {
  currentStatus: EntryStatus
  setCurrentStatus: (status: EntryStatus) => void  // 直接暴露內部 setter
  setFrontendStatus: (status: EntryStatus) => void  // 向後相容
  handleDataChanged: () => void
  handleSubmitSuccess: () => Promise<void>
  isInitialLoad: React.MutableRefObject<boolean>
}

/**
 * 前端狀態管理 Hook
 * 實現即時的前端狀態變更和提交時的資料庫同步
 */
export function useFrontendStatus({
  initialStatus,
  entryId,
  onStatusChange,
  onError,
  onSuccess
}: FrontendStatusOptions): FrontendStatusResult {
  const [currentStatus, setCurrentStatus] = useState<EntryStatus>(initialStatus)
  const isInitialLoad = useRef(true)

  // 前端狀態變更（不觸碰資料庫）
  const setFrontendStatus = useCallback((status: EntryStatus) => {
    setCurrentStatus(status)
    if (onStatusChange) {
      onStatusChange(status)
    }
  }, [onStatusChange])

  // 資料變更時狀態處理（僅前端變更）
  const handleDataChanged = useCallback(() => {
    // 避免初始載入時觸發狀態變更
    if (isInitialLoad.current) {
      return
    }

    // 資料變更時的狀態處理（不再設為草稿）
    if (onSuccess) {
      onSuccess('資料已修改，請記得提交')
    }
  }, [onSuccess])

  // 提交成功時更新狀態（同時更新前端和資料庫）
  const handleSubmitSuccess = useCallback(async (): Promise<void> => {
    try {
      // 如果有 entryId，更新資料庫狀態
      if (entryId) {
        await updateEntryStatus(entryId, 'submitted')
      }
      
      // 更新前端狀態
      setFrontendStatus('submitted')
      
      if (onSuccess) {
        onSuccess('提交成功，狀態已更新為已提交')
      }
    } catch (error) {
      console.error('Status update failed:', error)
      if (onError) {
        onError(error instanceof Error ? error.message : '狀態更新失敗')
      }
      throw error // 重新拋出錯誤讓調用方處理
    }
  }, [entryId, setFrontendStatus, onError, onSuccess])

  return {
    currentStatus,
    setCurrentStatus,  // 直接暴露內部 setter
    setFrontendStatus,  // 向後相容
    handleDataChanged,
    handleSubmitSuccess,
    isInitialLoad
  }
}