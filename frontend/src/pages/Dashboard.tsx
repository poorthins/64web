import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useUserProfile } from '../hooks/useUserProfile'
import { designTokens } from '../utils/designTokens'
import {
  getReportingProgress,
  getRejectedEntries,
  getPendingEntries,
  getRecentActivities,
  ReportingProgressSummary,
  RejectedEntry,
  PendingEntry,
  RecentActivity
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
  const { user } = useAuth()
  const { displayName } = useUserProfile()
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

  useEffect(() => {
    loadDashboardData()
  }, [])

  const loadDashboardData = async () => {
    try {
      setLoading(true)
      setError(null)

      const [progressData, rejectedData, pendingData, activitiesData] = await Promise.all([
        getReportingProgress(),
        getRejectedEntries(),
        getPendingEntries(),
        getRecentActivities()
      ])

      setProgress(progressData)
      setRejectedEntries(rejectedData)
      setPendingEntries(pendingData)
      setRecentActivities(activitiesData)
    } catch (err) {
      console.error('載入工作台數據失敗:', err)
      setError(err instanceof Error ? err.message : '載入數據時發生未知錯誤')
    } finally {
      setLoading(false)
    }
  }

  const handleNavigateToPage = (pageKey: string) => {
    navigate(`/app/${pageKey}`)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('zh-TW', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    })
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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen" style={{ backgroundColor: designTokens.colors.background }}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 mx-auto mb-4" 
               style={{ borderColor: designTokens.colors.accentPrimary }}></div>
          <p style={{ color: designTokens.colors.textSecondary }}>載入填報工作台...</p>
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

  const progressPercentage = progress ? Math.round((progress.completed / progress.total) * 100) : 0

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
                  {progress.completed}/{progress.total}
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

            {/* 狀態統計 */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-3 bg-gray-50 rounded-lg">
                <div className="text-2xl font-bold text-gray-600">{progress.total - progress.completed}</div>
                <div className="text-sm text-gray-500">待填寫</div>
              </div>
              <div className="text-center p-3 bg-blue-50 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">{progress.byStatus.submitted}</div>
                <div className="text-sm text-blue-500">已提交</div>
              </div>
              <div className="text-center p-3 bg-green-50 rounded-lg">
                <div className="text-2xl font-bold text-green-600">{progress.byStatus.approved}</div>
                <div className="text-sm text-green-500">已通過</div>
              </div>
              <div className="text-center p-3 bg-red-50 rounded-lg">
                <div className="text-2xl font-bold text-red-600">{progress.byStatus.rejected}</div>
                <div className="text-sm text-red-500">已退回</div>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 需要處理的項目 (左側主要區域) */}
          <div className="lg:col-span-2 space-y-6">
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

            {/* 未填寫項目 */}
            {pendingEntries.length > 0 && (
              <div className="bg-white rounded-lg shadow-sm border p-6" style={{ borderColor: designTokens.colors.border }}>
                <div className="flex items-center mb-4">
                  <Clock className="w-6 h-6 mr-2" style={{ color: designTokens.colors.accentSecondary }} />
                  <h3 className="text-lg font-semibold" style={{ color: designTokens.colors.textPrimary }}>
                    待填寫項目 ({pendingEntries.length})
                  </h3>
                </div>

                {/* 按範疇分組 */}
                {['範疇一', '範疇二', '範疇三'].map(category => {
                  const categoryEntries = pendingEntries.filter(entry => entry.category === category)
                  if (categoryEntries.length === 0) return null

                  return (
                    <div key={category} className="mb-6 last:mb-0">
                      <h4 className="text-md font-medium mb-3" style={{ color: designTokens.colors.textPrimary }}>
                        {category}
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {categoryEntries.map((entry) => (
                          <div 
                            key={entry.pageKey}
                            onClick={() => handleNavigateToPage(entry.pageKey)}
                            className="p-4 border rounded-lg cursor-pointer hover:shadow-md transition-all"
                            style={{ 
                              borderColor: designTokens.colors.border,
                              backgroundColor: designTokens.colors.cardBg
                            }}
                          >
                            <div className="flex items-center justify-between">
                              <div>
                                <div className="font-medium" style={{ color: designTokens.colors.textPrimary }}>
                                  {entry.title}
                                </div>
                                <div className="text-sm" style={{ color: designTokens.colors.textSecondary }}>
                                  {entry.scope}
                                </div>
                              </div>
                              <ArrowRight className="w-4 h-4" style={{ color: designTokens.colors.accentSecondary }} />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            {/* 全部完成的情況 */}
            {rejectedEntries.length === 0 && pendingEntries.length === 0 && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-6 text-center">
                <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-green-800 mb-2">
                  恭喜！所有填報項目已完成
                </h3>
                <p className="text-green-600">
                  您已完成所有 {progress?.total || 14} 個項目的填報，請等待管理員審核
                </p>
              </div>
            )}
          </div>

          {/* 最近活動記錄 (右側) */}
          <div className="bg-white rounded-lg shadow-sm border p-6" style={{ borderColor: designTokens.colors.border }}>
            <h3 className="text-lg font-semibold mb-4" style={{ color: designTokens.colors.textPrimary }}>
              最近活動
            </h3>

            <div className="space-y-4">
              {recentActivities.length > 0 ? (
                recentActivities
                  .filter(activity => activity.status !== 'draft')
                  .map((activity) => (
                    <div key={activity.id} className="flex items-start space-x-3">
                      <div className={`w-2 h-2 rounded-full mt-2 ${
                        activity.status === 'approved' ? 'bg-green-400' :
                        activity.status === 'rejected' ? 'bg-red-400' :
                        activity.status === 'submitted' ? 'bg-blue-400' :
                        'bg-gray-400'
                      }`}></div>
                      <div className="flex-1">
                        <p className="text-sm font-medium" style={{ color: designTokens.colors.textPrimary }}>
                          {activity.type}
                        </p>
                        <p className="text-sm" style={{ color: designTokens.colors.textSecondary }}>
                          {activity.description}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          {getRelativeTime(activity.timestamp)}
                        </p>
                      </div>
                    </div>
                  ))
              ) : (
                <div className="text-center py-8">
                  <Activity className="w-8 h-8 mx-auto mb-3" style={{ color: designTokens.colors.textSecondary }} />
                  <p className="text-sm font-medium mb-2" style={{ color: designTokens.colors.textPrimary }}>
                    暫無活動記錄
                  </p>
                  <p className="text-xs" style={{ color: designTokens.colors.textSecondary }}>
                    開始填寫數據後，您的活動記錄將顯示在這裡
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default DashboardPage