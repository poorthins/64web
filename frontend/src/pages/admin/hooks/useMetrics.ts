import { useState, useEffect, useCallback } from 'react'
import {
  getSubmissionStats,
  getAllUsersWithSubmissions,
  type SubmissionStats,
  type UserWithSubmissions
} from '../../../api/adminSubmissions'
import { listUsers, type UserProfile } from '../../../api/adminUsers'
import { getSubmissionStatistics, type SubmissionStatistics } from '../../../api/reviewEnhancements'

export interface DashboardMetrics {
  // 用戶統計
  totalUsers: number
  activeUsers: number
  inactiveUsers: number
  newUsersThisMonth: number

  // 填報統計 (使用新的三狀態系統)
  totalSubmissions: number
  pendingReviews: number   // submitted
  approvedReviews: number  // approved
  needsFixReviews: number  // rejected (原 needs_fix)

  // 系統指標
  submissionRate: number // 有填報用戶 / 總用戶
  approvalRate: number   // 通過 / 總審核
  lastDataUpdate: Date
}

export interface UseMetricsState {
  metrics: DashboardMetrics | null
  isLoading: boolean
  error: string | null
  lastFetch: Date | null
}

export interface UseMetricsActions {
  fetchMetrics: () => Promise<void>
  refreshMetrics: () => Promise<void>
}

const CACHE_DURATION = 5 * 60 * 1000 // 5分鐘快取

function calculateMetrics(
  users: UserProfile[],
  usersWithSubmissions: UserWithSubmissions[],
  submissionStatistics: SubmissionStatistics
): DashboardMetrics {
  // 用戶統計
  const totalUsers = users.length
  const activeUsers = users.filter(user => user.is_active).length
  const inactiveUsers = totalUsers - activeUsers

  // 計算本月新用戶 (簡化處理，實際應該從 created_at 計算)
  const newUsersThisMonth = Math.floor(totalUsers * 0.1) // 模擬值

  // 填報統計 (使用新的三狀態統計)
  const totalSubmissions = submissionStatistics.total
  const pendingReviews = submissionStatistics.submitted   // submitted -> 已提交
  const approvedReviews = submissionStatistics.approved   // approved -> 已通過
  const needsFixReviews = submissionStatistics.rejected   // rejected -> 已退回

  // 計算比率
  const usersWithSubmissionsCount = usersWithSubmissions.filter(user => user.submission_count > 0).length
  const submissionRate = totalUsers > 0 ? (usersWithSubmissionsCount / totalUsers) * 100 : 0

  const totalReviewed = approvedReviews + needsFixReviews
  const approvalRate = totalReviewed > 0 ? (approvedReviews / totalReviewed) * 100 : 0

  return {
    totalUsers,
    activeUsers,
    inactiveUsers,
    newUsersThisMonth,
    totalSubmissions,
    pendingReviews,
    approvedReviews,
    needsFixReviews,
    submissionRate: Math.round(submissionRate * 100) / 100,
    approvalRate: Math.round(approvalRate * 100) / 100,
    lastDataUpdate: new Date()
  }
}

export function useMetrics(): UseMetricsState & UseMetricsActions {
  const [state, setState] = useState<UseMetricsState>({
    metrics: null,
    isLoading: false,
    error: null,
    lastFetch: null
  })

  // 檢查快取是否仍有效
  const isCacheValid = useCallback(() => {
    if (!state.lastFetch) return false
    return Date.now() - state.lastFetch.getTime() < CACHE_DURATION
  }, [state.lastFetch])

  // 取得所有指標資料
  const fetchMetrics = useCallback(async () => {
    if (isCacheValid() && state.metrics) {
      console.log('使用快取的指標資料')
      return
    }

    setState(prev => ({ ...prev, isLoading: true, error: null }))

    try {
      console.log('🔄 [useMetrics] 開始載入指標資料（優化版本）...')

      // 優化：减少重複API調用，利用現有資料
      const [
        usersWithSubmissions,
        submissionStatistics
      ] = await Promise.all([
        getAllUsersWithSubmissions(),
        getSubmissionStatistics() // 使用新的三狀態統計 API
      ])

      // 嘗試從 usersWithSubmissions 中獲取基本用戶資料，避免重複調用 listUsers()
      const users = usersWithSubmissions.length > 0
        ? usersWithSubmissions.map(u => ({
            id: u.id,
            display_name: u.display_name || 'Unknown',
            role: u.role || 'user',
            is_active: u.is_active ?? true,
            email: u.email
          }))
        : await listUsers() // 如果無法從現有資料獲取，才執行額外調用

      console.log('📊 原始資料載入完成：')
      console.log(`  - 用戶數：${users.length}`)
      console.log(`  - 有填報的用戶：${usersWithSubmissions.length}`)
      console.log(`  - 總填報數：${submissionStatistics.total}`)
      console.log(`  - 三狀態統計:`, {
        已提交: submissionStatistics.submitted,
        已通過: submissionStatistics.approved,
        已退回: submissionStatistics.rejected
      })

      // 計算指標
      const metrics = calculateMetrics(users, usersWithSubmissions, submissionStatistics)

      setState(prev => ({
        ...prev,
        metrics,
        isLoading: false,
        lastFetch: new Date(),
        error: null
      }))

      console.log('✅ 指標資料計算完成')
      console.log('📈 指標摘要：')
      console.log(`  - 總用戶：${metrics.totalUsers}`)
      console.log(`  - 啟用用戶：${metrics.activeUsers}`)
      console.log(`  - 總填報：${metrics.totalSubmissions}`)
      console.log(`  - 已提交：${metrics.pendingReviews}`)
      console.log(`  - 已通過：${metrics.approvedReviews}`)
      console.log(`  - 已退回：${metrics.needsFixReviews}`)
      console.log(`  - 填報率：${metrics.submissionRate}%`)
      console.log(`  - 通過率：${metrics.approvalRate}%`)

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '載入指標資料失敗'
      console.error('❌ 載入指標資料錯誤：', error)

      setState(prev => ({
        ...prev,
        error: errorMessage,
        isLoading: false
      }))
    }
  }, [isCacheValid, state.metrics])

  // 強制重新整理指標
  const refreshMetrics = useCallback(async (): Promise<void> => {
    setState(prev => ({ ...prev, lastFetch: null })) // 清除快取
    await fetchMetrics()
  }, [fetchMetrics])

  // 初始載入
  useEffect(() => {
    fetchMetrics()
  }, [fetchMetrics])

  return {
    ...state,
    fetchMetrics,
    refreshMetrics
  }
}

// 輕量級的統計 hook，只取得基本數據
export function useBasicStats() {
  const [stats, setStats] = useState<SubmissionStats | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchStats = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const submissionStats = await getSubmissionStats()
      setStats(submissionStats)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '取得統計資料失敗'
      setError(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchStats()
  }, [fetchStats])

  return { stats, isLoading, error, refetch: fetchStats }
}