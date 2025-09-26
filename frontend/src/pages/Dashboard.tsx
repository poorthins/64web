import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useUserProfile } from '../hooks/useUserProfile'
import { useCurrentUserPermissions } from '../hooks/useCurrentUserPermissions'
import { designTokens } from '../utils/designTokens'
import { ALL_ENERGY_CATEGORIES } from '../utils/energyCategories'
import {
  getReportingProgress,
  getRejectedEntries,
  getPendingEntries,
  getRecentActivities,
  getAllEntries,
  getRejectionReason,
  ReportingProgressSummary,
  RejectedEntry,
  PendingEntry,
  RecentActivity,
  AllEntry,
  RejectionDetail
} from '../api/dashboardAPI'
import { AlertCircle, Clock, CheckCircle, XCircle, ArrowRight, Calendar, Activity } from 'lucide-react'

// 狀態資訊取得函數
const getStatusInfo = (status: string | null) => {
  if (!status) {
    return {
      text: '待填寫',
      color: 'text-gray-500',
      bgColor: 'bg-gray-50',
      icon: <Clock className="w-4 h-4" />
    }
  }
  
  switch (status) {
    case 'submitted':
      return {
        text: '已提交',
        color: 'text-blue-600',
        bgColor: 'bg-blue-50',
        icon: <CheckCircle className="w-4 h-4" />
      }
    case 'approved':
      return {
        text: '已通過',
        color: 'text-green-600',
        bgColor: 'bg-green-50',
        icon: <CheckCircle className="w-4 h-4" />
      }
    case 'rejected':
      return {
        text: '已退回',
        color: 'text-red-600',
        bgColor: 'bg-red-50',
        icon: <XCircle className="w-4 h-4" />
      }
    default:
      return {
        text: '待填寫',
        color: 'text-gray-500',
        bgColor: 'bg-gray-50',
        icon: <Clock className="w-4 h-4" />
      }
  }
}

const DashboardPage = () => {
  const navigate = useNavigate()
  const { user, isAdmin } = useAuth()
  const { displayName } = useUserProfile()
  const { permissions, filterByPermissions, hasPermissionSync, isLoading: isPermissionsLoading } = useCurrentUserPermissions()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // 根據時間顯示問候語
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return '早安';
    if (hour < 18) return '午安';
    return '晚安';
  }

  // 狀態數據
  const [progress, setProgress] = useState<ReportingProgressSummary | null>(null)
  const [rejectedEntries, setRejectedEntries] = useState<RejectedEntry[]>([])
  const [pendingEntries, setPendingEntries] = useState<PendingEntry[]>([])
  const [recentActivities, setRecentActivities] = useState<RecentActivity[]>([])

  // 新增狀態管理
  const [allEntries, setAllEntries] = useState<AllEntry[]>([])
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null)
  const [expandedRejections, setExpandedRejections] = useState<Set<string>>(new Set())
  const [rejectionReasons, setRejectionReasons] = useState<Record<string, RejectionDetail>>({})

  // 計算基於權限的統計
  const permissionBasedStats = useMemo(() => {
    if (isPermissionsLoading || !permissions) {
      return {
        totalCategories: 0,
        completedCount: 0,
        progressPercentage: 0,
        visibleEntries: [],
        visibleCategoryCounts: { pending: 0, submitted: 0, approved: 0, rejected: 0 }
      }
    }

    // 管理員看到所有 14 個類別，一般用戶看有權限的類別
    const totalCategories = isAdmin ? ALL_ENERGY_CATEGORIES.length : (permissions.energy_categories?.length || 0)

    // 只統計有權限的項目
    const visibleEntries = filterByPermissions(allEntries, (entry) => entry.pageKey)

    // 計算已完成數量（只統計有權限且狀態為 approved 的項目）
    const completedCount = visibleEntries.filter(entry => entry.status === 'approved').length

    // 計算進度百分比
    const progressPercentage = totalCategories > 0 ? Math.round((completedCount / totalCategories) * 100) : 0

    // 計算各狀態的數量（只統計可見項目）
    const visibleCategoryCounts = { pending: 0, submitted: 0, approved: 0, rejected: 0 }
    visibleEntries.forEach(entry => {
      const status = entry.status || 'pending'
      if (status in visibleCategoryCounts) {
        visibleCategoryCounts[status as keyof typeof visibleCategoryCounts]++
      }
    })

    return {
      totalCategories,
      completedCount,
      progressPercentage,
      visibleEntries,
      visibleCategoryCounts
    }
  }, [isPermissionsLoading, permissions, isAdmin, allEntries, filterByPermissions])

  useEffect(() => {
    loadDashboardData()
  }, [])

  const loadDashboardData = async () => {
    try {
      setLoading(true)
      setError(null)

      const [progressData, rejectedData, pendingData, activitiesData, allEntriesData] = await Promise.all([
        getReportingProgress(),
        getRejectedEntries(),
        getPendingEntries(),
        getRecentActivities(),
        getAllEntries()
      ])

      setProgress(progressData)
      setRejectedEntries(rejectedData)
      setPendingEntries(pendingData)
      setRecentActivities(activitiesData)
      setAllEntries(allEntriesData)
    } catch (err) {
      console.error('載入工作台數據失敗:', err)
      setError(err instanceof Error ? err.message : '載入數據時發生未知錯誤')
    } finally {
      setLoading(false)
    }
  }

  const handleNavigateToPage = (pageKey: string) => {
    // 檢查權限（雖然理論上不應該顯示無權限的項目，但保險起見）
    if (!isAdmin && !hasPermissionSync(pageKey)) {
      console.warn(`嘗試訪問無權限的頁面: ${pageKey}`)
      return
    }
    navigate(`/app/${pageKey}`)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('zh-TW', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    })
  }

  // 狀態篩選邏輯
  const getEntryStatus = (entry: AllEntry): string => {
    return entry.status || 'pending'
  }

  const filteredEntries = useMemo(() => {
    const { visibleEntries } = permissionBasedStats
    if (selectedStatus === null) {
      return visibleEntries
    }
    return visibleEntries.filter(entry => getEntryStatus(entry) === selectedStatus)
  }, [permissionBasedStats, selectedStatus])

  // 使用基於權限的統計
  const statusCounts = permissionBasedStats.visibleCategoryCounts

  const toggleStatusFilter = (status: string | null) => {
    setSelectedStatus(prev => prev === status ? null : status)
  }

  // 退回項目展開功能
  const toggleRejectionExpand = async (pageKey: string) => {
    setExpandedRejections(prev => {
      const newSet = new Set(prev)
      if (newSet.has(pageKey)) {
        newSet.delete(pageKey)
      } else {
        newSet.add(pageKey)
        // 載入退回原因
        loadRejectionReason(pageKey)
      }
      return newSet
    })
  }

  const loadRejectionReason = async (pageKey: string) => {
    try {
      const rejectedEntry = allEntries.find(e => e.pageKey === pageKey && e.status === 'rejected')
      if (rejectedEntry && rejectedEntry.entryId) {
        const reason = await getRejectionReason(rejectedEntry.entryId)
        setRejectionReasons(prev => ({
          ...prev,
          [pageKey]: reason
        }))
      }
    } catch (error) {
      console.error('載入退回原因失敗:', error)
    }
  }

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      pending: '待填寫項目',
      submitted: '已提交項目',
      approved: '已通過項目',
      rejected: '已退回項目'
    }
    return labels[status] || '未知狀態'
  }

  // StatusBadge 元件
  const StatusBadge = ({ status }: { status: string }) => {
    const config: Record<string, { text: string; bg: string; textColor: string }> = {
      pending: { text: '待填寫', bg: 'bg-gray-100', textColor: 'text-gray-600' },
      submitted: { text: '已提交', bg: 'bg-blue-100', textColor: 'text-blue-600' },
      approved: { text: '已通過', bg: 'bg-green-100', textColor: 'text-green-600' },
      rejected: { text: '已退回', bg: 'bg-red-100', textColor: 'text-red-600' }
    }

    const { text, bg, textColor } = config[status] || config.pending

    return (
      <span className={`px-2 py-1 text-xs rounded-full ${bg} ${textColor}`}>
        {text}
      </span>
    )
  }

  const getRelativeTime = (dateString: string) => {
    const now = new Date()
    const date = new Date(dateString)
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60))
    
    if (diffInHours < 1) return '剛剛'
    if (diffInHours < 24) return `${diffInHours}小時前`
    
    const diffInDays = Math.floor(diffInHours / 24)
    if (diffInDays < 7) return `${diffInDays}天前`
    
    return formatDate(dateString)
  }

  if (loading || isPermissionsLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen" style={{ backgroundColor: designTokens.colors.background }}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 mx-auto mb-4"
               style={{ borderColor: designTokens.colors.accentPrimary }}></div>
          <p style={{ color: designTokens.colors.textSecondary }}>
            {isPermissionsLoading ? '載入權限資料...' : '載入填報工作台...'}
          </p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center">
            <AlertCircle className="h-5 w-5 text-red-400 mr-2" />
            <p className="text-red-700">{error}</p>
          </div>
          <button
            onClick={loadDashboardData}
            className="mt-3 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            重新載入
          </button>
        </div>
      </div>
    )
  }

  // 使用基於權限的進度統計
  const { totalCategories, completedCount, progressPercentage } = permissionBasedStats

  return (
    <div className="min-h-screen" style={{ backgroundColor: designTokens.colors.background }}>
      <div className="p-6 space-y-6">
        {/* 歡迎訊息 */}
        <div className="mb-8">
          <p className="text-2xl font-semibold" style={{ color: designTokens.colors.textPrimary }}>
            {displayName}，{getGreeting()}
          </p>
        </div>

        {/* 填報進度總覽 */}
        {progress && (
          <div className="bg-white rounded-lg shadow-sm border p-6" style={{ borderColor: designTokens.colors.border }}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold" style={{ color: designTokens.colors.textPrimary }}>
                填報進度總覽
              </h2>
              {progress.reportingPeriod && (
                <div className="flex items-center text-sm" style={{ color: designTokens.colors.textSecondary }}>
                  <Calendar className="w-4 h-4 mr-2" />
                  填寫期間：{formatDate(progress.reportingPeriod.startDate)} - {formatDate(progress.reportingPeriod.endDate)}
                </div>
              )}
            </div>

            {/* 整體進度 */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-lg font-medium" style={{ color: designTokens.colors.textPrimary }}>
                  整體完成度
                </span>
                <span className="text-2xl font-bold" style={{ color: designTokens.colors.accentPrimary }}>
                  {completedCount}/{totalCategories}
                  {!isAdmin && (
                    <span className="text-sm font-normal text-gray-500 ml-2">
                      (您有權限的類別)
                    </span>
                  )}
                </span>
              </div>
              
              <div className="w-full bg-gray-200 rounded-full h-3 mb-2">
                <div 
                  className="h-3 rounded-full transition-all duration-500"
                  style={{ 
                    backgroundColor: designTokens.colors.accentPrimary,
                    width: `${progressPercentage}%`
                  }}
                ></div>
              </div>
              
              <div className="text-right">
                <span className="text-lg font-semibold" style={{ color: designTokens.colors.accentPrimary }}>
                  {progressPercentage}%
                </span>
              </div>
            </div>

            {/* 狀態統計 - 可點擊篩選 */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <button
                onClick={() => toggleStatusFilter(null)}
                className={`text-center p-3 rounded-lg transition-all ${
                  selectedStatus === null
                    ? 'ring-2 ring-blue-500 shadow-md bg-blue-50'
                    : 'bg-gray-50 hover:shadow-sm'
                }`}
              >
                <div className="text-2xl font-bold text-gray-600">{permissionBasedStats.visibleEntries.length}</div>
                <div className="text-sm text-gray-500">全部{!isAdmin && '(有權限)'}</div>
              </button>

              <button
                onClick={() => toggleStatusFilter('pending')}
                className={`text-center p-3 rounded-lg transition-all ${
                  selectedStatus === 'pending'
                    ? 'ring-2 ring-blue-500 shadow-md bg-gray-100'
                    : 'bg-gray-50 hover:shadow-sm'
                }`}
              >
                <div className="text-2xl font-bold text-gray-600">{statusCounts.pending}</div>
                <div className="text-sm text-gray-500">待填寫</div>
              </button>

              <button
                onClick={() => toggleStatusFilter('submitted')}
                className={`text-center p-3 rounded-lg transition-all ${
                  selectedStatus === 'submitted'
                    ? 'ring-2 ring-blue-500 shadow-md bg-blue-100'
                    : 'bg-blue-50 hover:shadow-sm'
                }`}
              >
                <div className="text-2xl font-bold text-blue-600">{statusCounts.submitted}</div>
                <div className="text-sm text-blue-500">已提交</div>
              </button>

              <button
                onClick={() => toggleStatusFilter('approved')}
                className={`text-center p-3 rounded-lg transition-all ${
                  selectedStatus === 'approved'
                    ? 'ring-2 ring-blue-500 shadow-md bg-green-100'
                    : 'bg-green-50 hover:shadow-sm'
                }`}
              >
                <div className="text-2xl font-bold text-green-600">{statusCounts.approved}</div>
                <div className="text-sm text-green-500">已通過</div>
              </button>

              <button
                onClick={() => toggleStatusFilter('rejected')}
                className={`text-center p-3 rounded-lg transition-all ${
                  selectedStatus === 'rejected'
                    ? 'ring-2 ring-blue-500 shadow-md bg-red-100'
                    : 'bg-red-50 hover:shadow-sm'
                }`}
              >
                <div className="text-2xl font-bold text-red-600">{statusCounts.rejected}</div>
                <div className="text-sm text-red-500">已退回</div>
              </button>
            </div>
          </div>
        )}

        {/* 項目列表區域 - 全寬顯示 */}
        <div className="space-y-6">
            {/* 已退回項目 - 高優先級警示 */}
            {rejectedEntries.length > 0 && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-6">
                <div className="flex items-center mb-4">
                  <XCircle className="w-6 h-6 text-red-500 mr-2" />
                  <h3 className="text-lg font-semibold text-red-800">
                    需要立即處理 ({rejectedEntries.length})
                  </h3>
                </div>
                
                <div className="space-y-3">
                  {rejectedEntries.map((entry) => (
                    <div key={entry.id} className="bg-white border border-red-200 rounded-lg p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center mb-2">
                            <span className="font-medium text-gray-900">{entry.title}</span>
                            <span className="ml-2 px-2 py-1 bg-red-100 text-red-800 text-xs rounded-full">
                              {entry.category}
                            </span>
                          </div>
                          <p className="text-sm text-red-700 mb-2">
                            <strong>退回原因：</strong>{entry.reviewNotes}
                          </p>
                          <p className="text-xs text-gray-500">
                            退回時間：{getRelativeTime(entry.updatedAt)}
                          </p>
                        </div>
                        <button
                          onClick={() => handleNavigateToPage(entry.pageKey)}
                          className="ml-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center"
                        >
                          立即修正
                          <ArrowRight className="w-4 h-4 ml-2" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 項目列表 - 整合篩選功能 */}
            <div className="bg-white rounded-lg shadow-sm border p-6" style={{ borderColor: designTokens.colors.border }}>
              <div className="flex items-center mb-4">
                <Clock className="w-6 h-6 mr-2" style={{ color: designTokens.colors.accentSecondary }} />
                <h3 className="text-lg font-semibold" style={{ color: designTokens.colors.textPrimary }}>
                  {selectedStatus === null ? '所有項目' : getStatusLabel(selectedStatus)} ({filteredEntries.length})
                </h3>
              </div>

              {filteredEntries.length > 0 ? (
                /* 按範疇分組顯示 */
                ['範疇一', '範疇二', '範疇三'].map(category => {
                  const categoryEntries = filteredEntries.filter(entry => entry.category === category)
                  if (categoryEntries.length === 0) return null

                  return (
                    <div key={category} className="mb-6 last:mb-0">
                      <h4 className="text-md font-medium mb-3" style={{ color: designTokens.colors.textPrimary }}>
                        {category}
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {categoryEntries.map((entry) => {
                          const status = getEntryStatus(entry)
                          const statusConfig: Record<string, { bg: string; text: string; border: string }> = {
                            pending: {
                              bg: 'bg-gray-50 hover:bg-gray-100',
                              text: 'text-gray-800',
                              border: 'border-gray-200'
                            },
                            submitted: {
                              bg: 'bg-blue-50 hover:bg-blue-100',
                              text: 'text-blue-800',
                              border: 'border-blue-200'
                            },
                            approved: {
                              bg: 'bg-green-50 hover:bg-green-100',
                              text: 'text-green-800',
                              border: 'border-green-200'
                            },
                            rejected: {
                              bg: 'bg-red-50 hover:bg-red-100',
                              text: 'text-red-800',
                              border: 'border-red-200'
                            }
                          }

                          const config = statusConfig[status] || statusConfig.pending

                          return (
                            <div
                              key={entry.pageKey}
                              onClick={() => handleNavigateToPage(entry.pageKey)}
                              className={`p-4 border rounded-lg cursor-pointer hover:shadow-md transition-all ${config.bg} ${config.border}`}
                            >
                              <div className="flex items-center justify-between">
                                <div>
                                  <div className={`font-medium ${config.text}`}>
                                    {entry.title}
                                  </div>
                                  <div className={`text-sm opacity-75 ${config.text}`}>
                                    {entry.scope}
                                  </div>
                                  <div className={`text-xs mt-1 ${config.text}`}>
                                    {status === 'pending' ? '待填寫' :
                                     status === 'submitted' ? '已提交' :
                                     status === 'approved' ? '已通過' :
                                     status === 'rejected' ? '已退回' : '未知狀態'}
                                  </div>
                                </div>
                                <ArrowRight className="w-4 h-4" style={{ color: designTokens.colors.accentSecondary }} />
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )
                })
              ) : (
                /* 無項目時的顯示 */
                <div className="text-center py-12">
                  <AlertCircle className="w-12 h-12 mx-auto mb-4" style={{ color: designTokens.colors.textSecondary }} />
                  <p className="text-lg font-medium mb-2" style={{ color: designTokens.colors.textPrimary }}>
                    {selectedStatus ? `沒有${getStatusLabel(selectedStatus)}` : '暫無項目'}
                  </p>
                  <p className="text-sm" style={{ color: designTokens.colors.textSecondary }}>
                    {selectedStatus ? '請選擇其他狀態查看' : '請等待系統載入完成'}
                  </p>
                </div>
              )}
            </div>

        </div>
      </div>
    </div>
  )
}

export default DashboardPage