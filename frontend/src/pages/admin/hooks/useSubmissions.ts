import { useState, useEffect, useCallback } from 'react'
import {
  getAllUsersWithSubmissions,
  getSubmissionStats,
  reviewSubmission,
  type UserWithSubmissions,
  type SubmissionStats,
  type Submission
} from '../../../api/adminSubmissions'

export interface UseSubmissionsState {
  usersWithSubmissions: UserWithSubmissions[]
  submissionStats: SubmissionStats | null
  isLoading: boolean
  error: string | null
  lastFetch: Date | null
}

export interface UseSubmissionsActions {
  fetchSubmissions: () => Promise<void>
  fetchStats: () => Promise<void>
  getSubmissionDetail: (submissionId: string) => Promise<Submission | null>
  reviewSubmission: (
    entryId: string,
    newStatus: 'pending' | 'approved' | 'needs_fix',
    reviewNotes: string
  ) => Promise<void>
  refreshData: () => Promise<void>
}

const CACHE_DURATION = 5 * 60 * 1000 // 5分鐘快取

export function useSubmissions(): UseSubmissionsState & UseSubmissionsActions {
  const [state, setState] = useState<UseSubmissionsState>({
    usersWithSubmissions: [],
    submissionStats: null,
    isLoading: false,
    error: null,
    lastFetch: null
  })

  // 檢查快取是否仍有效
  const isCacheValid = useCallback(() => {
    if (!state.lastFetch) return false
    return Date.now() - state.lastFetch.getTime() < CACHE_DURATION
  }, [state.lastFetch])

  // 取得用戶填報資料
  const fetchSubmissions = useCallback(async () => {
    if (isCacheValid() && state.usersWithSubmissions.length > 0) {
      console.log('使用快取的填報資料')
      return
    }

    setState(prev => ({ ...prev, isLoading: true, error: null }))

    try {
      const usersData = await getAllUsersWithSubmissions()

      setState(prev => ({
        ...prev,
        usersWithSubmissions: usersData,
        isLoading: false,
        lastFetch: new Date()
      }))

      console.log(`✅ 成功取得 ${usersData.length} 位用戶填報資料`)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '取得填報資料失敗'
      console.error('❌ 取得填報資料錯誤：', error)

      setState(prev => ({
        ...prev,
        error: errorMessage,
        isLoading: false
      }))
    }
  }, [isCacheValid, state.usersWithSubmissions.length])

  // 取得統計資料
  const fetchStats = useCallback(async () => {
    setState(prev => ({ ...prev, isLoading: true, error: null }))

    try {
      const stats = await getSubmissionStats()

      setState(prev => ({
        ...prev,
        submissionStats: stats,
        isLoading: false
      }))

      console.log('✅ 成功取得填報統計資料')
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '取得統計資料失敗'
      console.error('❌ 取得統計資料錯誤：', error)

      setState(prev => ({
        ...prev,
        error: errorMessage,
        isLoading: false
      }))
    }
  }, [])

  // 取得特定填報詳情（暫時回傳 null，待 API 實作）
  const getSubmissionDetail = useCallback(async (submissionId: string): Promise<Submission | null> => {
    try {
      // 暫時實作：從現有資料中查找
      console.log('查找填報詳情:', submissionId)

      // 實際實作時需要相應的 API 端點
      return null
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '取得填報詳情失敗'
      console.error('❌ 取得填報詳情錯誤：', error)

      setState(prev => ({
        ...prev,
        error: errorMessage
      }))

      return null
    }
  }, [])

  // 強制重新整理所有資料
  const refreshData = useCallback(async (): Promise<void> => {
    setState(prev => ({ ...prev, lastFetch: null })) // 清除快取

    // 並行載入填報資料和統計資料
    await Promise.all([
      fetchSubmissions(),
      fetchStats()
    ])
  }, [fetchSubmissions, fetchStats])

  // 審核填報
  const reviewSubmission = useCallback(async (
    entryId: string,
    newStatus: 'pending' | 'approved' | 'needs_fix',
    reviewNotes: string
  ): Promise<void> => {
    setState(prev => ({ ...prev, isLoading: true, error: null }))

    try {
      // reviewSubmission 只接受 'approved' 或 'needs_fix'
      if (newStatus === 'pending') {
        throw new Error('無法將狀態設為 pending')
      }
      await reviewSubmission(entryId, newStatus, reviewNotes)

      // 重新載入資料以反映變更
      await refreshData()

      console.log('✅ 成功完成審核：', entryId)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '審核失敗'
      console.error('❌ 審核錯誤：', error)

      setState(prev => ({
        ...prev,
        error: errorMessage,
        isLoading: false
      }))

      throw error
    }
  }, [refreshData])

  // 初始載入 - 只執行一次
  useEffect(() => {
    let isMounted = true

    const loadInitialData = async () => {
      if (!isMounted) return

      try {
        await Promise.all([
          fetchSubmissions(),
          fetchStats()
        ])
      } catch (error) {
        console.error('初始載入失敗:', error)
      }
    }

    loadInitialData()

    return () => {
      isMounted = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // 空陣列 = 只在 mount 時執行一次

  return {
    ...state,
    fetchSubmissions,
    fetchStats,
    getSubmissionDetail,
    reviewSubmission,
    refreshData
  }
}

// 單一用戶填報詳情的 hook
export function useUserSubmissions(userId: string | null) {
  const [submissions, setSubmissions] = useState<Submission[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadUserSubmissions = useCallback(async () => {
    if (!userId) {
      setSubmissions([])
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      // 這裡可以加入取得特定用戶填報記錄的 API 呼叫
      // 目前先使用 getAllUsersWithSubmissions 篩選
      const allUsersData = await getAllUsersWithSubmissions()
      const userSubmissions = allUsersData.find(user => user.id === userId)

      // 這裡需要額外的 API 來取得詳細的填報記錄
      // 暫時返回空陣列
      setSubmissions([])

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '取得用戶填報記錄失敗'
      setError(errorMessage)
      setSubmissions([])
    } finally {
      setIsLoading(false)
    }
  }, [userId])

  useEffect(() => {
    let isMounted = true

    const load = async () => {
      if (!isMounted) return
      await loadUserSubmissions()
    }

    load()

    return () => {
      isMounted = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]) // 只在 userId 變化時重新載入

  return { submissions, isLoading, error, reload: loadUserSubmissions }
}