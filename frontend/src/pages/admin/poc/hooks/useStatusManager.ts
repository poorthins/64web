import { useState, useEffect, useCallback, useRef } from 'react'
import {
  statusManager,
  SubmissionStatus,
  StatusChangeEvent,
  StatusChangeResult
} from '../utils/statusManager'
import { SubmissionRecord } from '../data/mockData'

export interface UseStatusManagerReturn {
  // 資料狀態
  submissions: SubmissionRecord[]
  stats: Record<SubmissionStatus, number>
  loading: boolean
  error: string | null

  // 操作函數
  changeStatus: (id: string, newStatus: SubmissionStatus, reason?: string) => Promise<StatusChangeResult>
  bulkChangeStatus: (ids: string[], newStatus: SubmissionStatus, reason?: string) => Promise<any>
  getSubmissionsByStatus: (status: SubmissionStatus) => SubmissionRecord[]
  getStatusHistory: (id: string) => StatusChangeEvent[]

  // 檢查函數
  isValidTransition: (currentStatus: SubmissionStatus, newStatus: SubmissionStatus) => boolean
  isEditable: (status: SubmissionStatus) => boolean
  getLockMessage: (status: SubmissionStatus) => string
  getAvailableTransitions: (currentStatus: SubmissionStatus) => SubmissionStatus[]

  // 刷新資料
  refresh: () => void
  reset: () => void
}

export const useStatusManager = (autoRefresh = false, refreshInterval = 30000): UseStatusManagerReturn => {
  const [submissions, setSubmissions] = useState<SubmissionRecord[]>([])
  const [stats, setStats] = useState<Record<SubmissionStatus, number>>({
    submitted: 0,
    approved: 0,
    rejected: 0
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null)

  // 刷新資料
  const refresh = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      // 模擬載入延遲
      await new Promise(resolve => setTimeout(resolve, 300))

      const allSubmissions = statusManager.getAllSubmissions()
      const calculatedStats = statusManager.calculateStats()

      setSubmissions([...allSubmissions])
      setStats({ ...calculatedStats })
    } catch (err) {
      setError(err instanceof Error ? err.message : '載入資料失敗')
    } finally {
      setLoading(false)
    }
  }, [])

  // 狀態變更處理
  const changeStatus = useCallback(async (
    id: string,
    newStatus: SubmissionStatus,
    reason?: string
  ): Promise<StatusChangeResult> => {
    try {
      setError(null)
      const result = await statusManager.changeStatus(id, newStatus, reason, 'admin_user')

      if (result.success) {
        // 狀態變更成功，監聽器會自動觸發刷新，不需要手動刷新
        console.log('✅ 狀態變更成功，等待監聽器刷新...')

        // 顯示成功訊息
        if (typeof window !== 'undefined') {
          const toast = document.createElement('div')
          toast.className = 'fixed top-4 right-4 bg-green-500 text-white px-4 py-2 rounded-lg shadow-lg z-50'
          toast.textContent = result.message
          document.body.appendChild(toast)
          setTimeout(() => document.body.removeChild(toast), 3000)
        }
      } else {
        setError(result.message)
      }

      return result
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '狀態變更失敗'
      setError(errorMessage)
      return {
        success: false,
        message: errorMessage,
        error: 'UNEXPECTED_ERROR'
      }
    }
  }, [refresh])

  // 批量狀態變更
  const bulkChangeStatus = useCallback(async (
    ids: string[],
    newStatus: SubmissionStatus,
    reason?: string
  ) => {
    try {
      setError(null)
      setLoading(true)

      const result = await statusManager.bulkChangeStatus(ids, newStatus, reason, 'admin_user')

      // 批量操作會觸發多個狀態變更事件，監聽器會自動刷新
      console.log('✅ 批量狀態變更完成，等待監聽器刷新...')

      // 顯示結果訊息
      if (typeof window !== 'undefined') {
        const successCount = result.successful.length
        const failCount = result.failed.length
        const message = `成功變更 ${successCount} 項，失敗 ${failCount} 項`

        const toast = document.createElement('div')
        toast.className = `fixed top-4 right-4 px-4 py-2 rounded-lg shadow-lg z-50 text-white ${
          failCount === 0 ? 'bg-green-500' : 'bg-yellow-500'
        }`
        toast.textContent = message
        document.body.appendChild(toast)
        setTimeout(() => document.body.removeChild(toast), 3000)
      }

      return result
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '批量變更失敗'
      setError(errorMessage)
      throw err
    } finally {
      setLoading(false)
    }
  }, [refresh])

  // 根據狀態篩選
  const getSubmissionsByStatus = useCallback((status: SubmissionStatus): SubmissionRecord[] => {
    return submissions.filter(submission => submission.status === status)
  }, [submissions])

  // 取得狀態歷史
  const getStatusHistory = useCallback((id: string): StatusChangeEvent[] => {
    return statusManager.getStatusHistory(id)
  }, [])

  // 檢查函數
  const isValidTransition = useCallback((currentStatus: SubmissionStatus, newStatus: SubmissionStatus): boolean => {
    return statusManager.isValidTransition(currentStatus, newStatus)
  }, [])

  const isEditable = useCallback((status: SubmissionStatus): boolean => {
    return statusManager.isEditable(status)
  }, [])

  const getLockMessage = useCallback((status: SubmissionStatus): string => {
    return statusManager.getLockMessage(status)
  }, [])

  const getAvailableTransitions = useCallback((currentStatus: SubmissionStatus): SubmissionStatus[] => {
    return statusManager.getAvailableTransitions(currentStatus)
  }, [])

  // 重置資料
  const reset = useCallback(() => {
    statusManager.reset()
    refresh()
  }, [refresh])

  // 狀態變更監聽器
  useEffect(() => {
    const handleStatusChange = (event: StatusChangeEvent) => {
      console.log('Status changed:', event)
      // 延遲刷新避免過於頻繁的更新
      setTimeout(refresh, 100)
    }

    statusManager.addListener(handleStatusChange)

    return () => {
      statusManager.removeListener(handleStatusChange)
    }
  }, [refresh])

  // 初始載入
  useEffect(() => {
    refresh()
  }, [refresh])

  // 自動刷新
  useEffect(() => {
    if (autoRefresh) {
      refreshIntervalRef.current = setInterval(refresh, refreshInterval)

      return () => {
        if (refreshIntervalRef.current) {
          clearInterval(refreshIntervalRef.current)
        }
      }
    }
  }, [autoRefresh, refreshInterval, refresh])

  // 清理定時器
  useEffect(() => {
    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current)
      }
    }
  }, [])

  return {
    // 資料狀態
    submissions,
    stats,
    loading,
    error,

    // 操作函數
    changeStatus,
    bulkChangeStatus,
    getSubmissionsByStatus,
    getStatusHistory,

    // 檢查函數
    isValidTransition,
    isEditable,
    getLockMessage,
    getAvailableTransitions,

    // 刷新資料
    refresh,
    reset
  }
}

// 輔助 Hook：監聽特定項目的狀態變更
export const useSubmissionStatus = (submissionId: string) => {
  const [status, setStatus] = useState<SubmissionStatus | null>(null)
  const [history, setHistory] = useState<StatusChangeEvent[]>([])

  useEffect(() => {
    const updateStatus = () => {
      const currentStatus = statusManager.getSubmissionStatus(submissionId)
      const statusHistory = statusManager.getStatusHistory(submissionId)

      setStatus(currentStatus)
      setHistory([...statusHistory])
    }

    const handleStatusChange = (event: StatusChangeEvent) => {
      if (event.id === submissionId) {
        updateStatus()
      }
    }

    // 初始載入
    updateStatus()

    // 監聽變更
    statusManager.addListener(handleStatusChange)

    return () => {
      statusManager.removeListener(handleStatusChange)
    }
  }, [submissionId])

  return { status, history }
}

// 輔助 Hook：狀態統計資料
export const useStatusStats = () => {
  const [stats, setStats] = useState<Record<SubmissionStatus, number>>({
    submitted: 0,
    approved: 0,
    rejected: 0
  })

  useEffect(() => {
    const updateStats = () => {
      const newStats = statusManager.calculateStats()
      setStats({ ...newStats })
    }

    const handleStatusChange = () => {
      updateStats()
    }

    // 初始載入
    updateStats()

    // 監聽變更
    statusManager.addListener(handleStatusChange)

    return () => {
      statusManager.removeListener(handleStatusChange)
    }
  }, [])

  return stats
}