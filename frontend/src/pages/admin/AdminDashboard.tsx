import React, { useState, useEffect, useMemo, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Users, FileText, CheckCircle, XCircle, Plus, RefreshCw, Search, Filter, Calendar, Eye } from 'lucide-react'
import StatsCard from './components/StatsCard'
import UserCard from './components/UserCard'
import SearchBar from './components/SearchBar'
import StatusFilter from './components/StatusFilter'
import UserExportModal, { ExportOptions } from './components/UserExportModal'
import { DashboardSkeleton } from './components/LoadingSkeleton'
import { PageHeader } from './components/PageHeader'
import RejectModal from './components/RejectModal'
import { UserStatus, statusLabels, User } from './data/mockData'
import { demonstrateFileRenaming } from './utils/exportUtils'
import { exportSingleUser } from './utils/userExportUtils'
import { handleAPIError, showErrorToast, withRetry } from './utils/errorHandler'
import { useKeyboardShortcuts, createCommonShortcuts, showShortcutToast } from './hooks/useKeyboardShortcuts'
import { useUsers } from './hooks/useUsers'
import { useMetrics } from './hooks/useMetrics'
import {
  getPendingReviewEntries,
  getReviewedEntries,
  reviewEntry,
  PendingReviewEntry,
  ReviewedEntry
} from '../../api/reviewEnhancements'
import { supabase } from '../../lib/supabaseClient'
import { toast } from 'react-hot-toast'

// 標籤類型
type TabType = 'users' | 'submitted' | 'approved' | 'rejected'

// 能源類別列表
const energyCategories = [
  { id: 'wd40', name: 'WD-40' },
  { id: 'acetylene', name: '乙炔' },
  { id: 'refrigerant', name: '冷媒' },
  { id: 'septic_tank', name: '化糞池' },
  { id: 'septictank', name: '化糞池' },
  { id: 'natural_gas', name: '天然氣' },
  { id: 'urea', name: '尿素' },
  { id: 'diesel_generator', name: '柴油(發電機)' },
  { id: 'diesel', name: '柴油' },
  { id: 'gasoline', name: '汽油' },
  { id: 'lpg', name: '液化石油氣' },
  { id: 'fire_extinguisher', name: '滅火器' },
  { id: 'welding_rod', name: '焊條' },
  { id: 'electricity_bill', name: '外購電力' },
  { id: 'employee_commute', name: '員工通勤' }
]

const AdminDashboard: React.FC = () => {
  const navigate = useNavigate()

  // 當前選中的標籤
  const [activeTab, setActiveTab] = useState<TabType>('users')

  // API hooks
  const { users, isLoading: usersLoading, error: usersError, refreshUsers, createNewUser, updateExistingUser, toggleStatus } = useUsers()
  const { metrics, isLoading: metricsLoading, error: metricsError, refreshMetrics } = useMetrics()

  // 提交項目資料
  const [submissions, setSubmissions] = useState<(PendingReviewEntry | ReviewedEntry)[]>([])
  const [filteredSubmissions, setFilteredSubmissions] = useState<(PendingReviewEntry | ReviewedEntry)[]>([])

  // UI state
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedStatuses, setSelectedStatuses] = useState<UserStatus[]>([])
  const [showUserExportModal, setShowUserExportModal] = useState(false)
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [isUserExporting, setIsUserExporting] = useState(false)
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date())
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [showCreateUserModal, setShowCreateUserModal] = useState(false)
  const autoRefreshIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)

  // 退回對話框
  const [showRejectModal, setShowRejectModal] = useState(false)
  const [rejectingSubmission, setRejectingSubmission] = useState<PendingReviewEntry | ReviewedEntry | null>(null)

  // 頁面映射表
  const pageMap: Record<string, string> = {
    'wd40': '/app/wd40',
    'acetylene': '/app/acetylene',
    'refrigerant': '/app/refrigerant',
    'septic_tank': '/app/septictank',
    'septictank': '/app/septictank',
    'natural_gas': '/app/natural_gas',
    'urea': '/app/urea',
    'diesel_generator': '/app/diesel_generator',
    'diesel': '/app/diesel',
    'gasoline': '/app/gasoline',
    'lpg': '/app/lpg',
    'fire_extinguisher': '/app/fire_extinguisher',
    'welding_rod': '/app/welding_rod',
    'electricity_bill': '/app/electricity_bill',
    'employee_commute': '/app/employee_commute'
  }

  // 組合載入狀態和錯誤
  const isLoading = usersLoading || metricsLoading
  const error = usersError || metricsError

  // 將 API UserProfile 轉換為 UI User 格式
  const convertAPIUserToUIUser = (apiUser: any): User => {
    let status: UserStatus = 'submitted'
    if (!apiUser.is_active) {
      status = 'rejected'
    } else if (apiUser.entries_count > 0) {
      status = 'approved'
    }

    return {
      id: apiUser.id,
      name: apiUser.display_name || '未知用戶',
      email: apiUser.email || '',
      department: apiUser.company || apiUser.job_title || '未知部門',
      status,
      submissionDate: new Date().toISOString().split('T')[0],
      lastActivity: new Date().toISOString().split('T')[0],
      entries: apiUser.entries_count || 0,
      avatar: '👤'
    }
  }

  // 轉換 API 用戶資料為 UI 格式
  const convertedUsers: User[] = useMemo(() => {
    return users.map(convertAPIUserToUIUser)
  }, [users])

  // 統計數據
  const statistics = useMemo(() => {
    const baseStats = {
      totalUsers: users.length,
      submitted: 0,
      approved: 0,
      rejected: 0
    }

    if (metrics) {
      return {
        ...baseStats,
        submitted: metrics.pendingReviews,
        approved: metrics.approvedReviews,
        rejected: metrics.needsFixReviews
      }
    }

    // 從提交資料計算
    if (submissions.length > 0) {
      const submitted = submissions.filter(s => !('status' in s) || s.status === 'submitted').length
      const approved = submissions.filter(s => 'status' in s && s.status === 'approved').length
      const rejected = submissions.filter(s => 'status' in s && s.status === 'rejected').length

      return {
        ...baseStats,
        submitted,
        approved,
        rejected
      }
    }

    return baseStats
  }, [metrics, users.length, submissions])

  // 載入提交資料
  const loadSubmissions = async () => {
    try {
      const [pendingData, reviewedData] = await Promise.all([
        getPendingReviewEntries(),
        getReviewedEntries()
      ])

      const allSubmissions = [...pendingData, ...reviewedData]
      setSubmissions(allSubmissions)
    } catch (error) {
      console.error('❌ 載入提交資料失敗:', error)
    }
  }

  // 優化的分層載入策略
  const loadAllData = async (showLoadingState = true) => {
    if (!showLoadingState) {
      setIsRefreshing(true)
    }

    try {
      console.log('🚀 [AdminDashboard] 開始分層載入資料...')

      // 第一層：載入核心用戶資料（最高優先級）
      console.log('📊 [AdminDashboard] 第一層：載入用戶資料')
      await refreshUsers()

      // 第二層：並行載入次要資料
      console.log('📈 [AdminDashboard] 第二層：並行載入統計和提交資料')
      await Promise.all([
        refreshMetrics(),
        loadSubmissions()
      ])

      setLastUpdated(new Date())
      console.log('✅ [AdminDashboard] 分層載入完成')
    } catch (err: any) {
      console.error('❌ [AdminDashboard] 載入失敗:', err)
      const apiError = handleAPIError(err)
      showErrorToast(apiError)
    } finally {
      setIsRefreshing(false)
    }
  }

  // 初始載入
  useEffect(() => {
    loadAllData()
  }, [])

  // 根據選中的標籤篩選資料
  useEffect(() => {
    if (activeTab === 'submitted') {
      setFilteredSubmissions(submissions.filter(s => !('status' in s) || s.status === 'submitted'))
    } else if (activeTab === 'approved') {
      setFilteredSubmissions(submissions.filter(s => 'status' in s && s.status === 'approved'))
    } else if (activeTab === 'rejected') {
      setFilteredSubmissions(submissions.filter(s => 'status' in s && s.status === 'rejected'))
    } else {
      setFilteredSubmissions([])
    }
  }, [activeTab, submissions])

  // 自動重新整理設定
  useEffect(() => {
    const startAutoRefresh = () => {
      if (autoRefreshIntervalRef.current) {
        clearInterval(autoRefreshIntervalRef.current)
      }

      autoRefreshIntervalRef.current = setInterval(() => {
        console.log('🔄 [AdminDashboard] 自動重新整理 (2分鐘)')
        loadAllData(false)
      }, 120000) // 每 2 分鐘，降低刷新頻率
    }

    startAutoRefresh()

    return () => {
      if (autoRefreshIntervalRef.current) {
        clearInterval(autoRefreshIntervalRef.current)
      }
    }
  }, [])

  // 手動重新整理
  const handleRefresh = () => {
    loadAllData(false)
  }

  // 搜尋焦點
  const focusSearch = () => {
    searchInputRef.current?.focus()
  }

  // 鍵盤快捷鍵
  const shortcuts = createCommonShortcuts({
    refresh: handleRefresh,
    search: focusSearch,
    help: () => showShortcutToast(shortcuts),
    back: () => navigate('/app')
  })

  useKeyboardShortcuts({ shortcuts })

  // 篩選用戶
  const filteredUsers = useMemo(() => {
    return convertedUsers.filter(user => {
      const matchesSearch = searchQuery === '' ||
        user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.department.toLowerCase().includes(searchQuery.toLowerCase())

      const matchesStatus = selectedStatuses.length === 0 ||
        selectedStatuses.includes(user.status)

      return matchesSearch && matchesStatus
    })
  }, [convertedUsers, searchQuery, selectedStatuses])

  // 取得類別名稱
  const getCategoryName = (pageKey: string, category?: string) => {
    let found = energyCategories.find(c => c.id === pageKey)?.name
    if (found) return found

    if (category) {
      found = energyCategories.find(c => c.id === category)?.name
      if (found) return found
    }

    return pageKey || category || '未知類別'
  }

  // 狀態變更處理
  const handleStatusChange = async (entryId: string, newStatus: 'approved' | 'rejected', notes?: string) => {
    try {
      await reviewEntry(entryId, newStatus, notes)
      toast.success('狀態更新成功')
      loadAllData()
    } catch (error) {
      toast.error('操作失敗')
      console.error('Status change error:', error)
    }
  }

  // 確認退回
  const handleRejectConfirm = async (reason: string) => {
    if (!rejectingSubmission) return

    try {
      await handleStatusChange(rejectingSubmission.id, 'rejected', reason)
    } catch (error) {
      console.error('退回失敗:', error)
    } finally {
      setShowRejectModal(false)
      setRejectingSubmission(null)
    }
  }

  // 處理用戶操作
  const handleUserClick = (user: any) => {
    navigate(`/app/admin/edit/${user.id}`)
  }

  const handleCreateUser = () => {
    navigate('/app/admin/create')
  }

  // 快捷匯出功能
  const handleQuickExport = (user: User) => {
    setSelectedUser(user)
    setShowUserExportModal(true)
  }

  const handleUserExportConfirm = async (options: ExportOptions) => {
    if (!selectedUser) return

    setIsUserExporting(true)
    try {
      await withRetry(() => exportSingleUser(selectedUser.id, options))
      setShowUserExportModal(false)
      toast.success('匯出完成！')
    } catch (err) {
      const apiError = handleAPIError(err)
      showErrorToast(apiError)
    } finally {
      setIsUserExporting(false)
    }
  }

  const handleUserExportClose = () => {
    if (!isUserExporting) {
      setShowUserExportModal(false)
      setSelectedUser(null)
    }
  }

  // 用戶管理面板組件
  const UserManagementPanel = () => (
    <div className="p-6">
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-900 flex items-center">
            <span className="mr-2">👥</span>
            用戶列表管理
          </h2>
          <button
            onClick={handleCreateUser}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center"
          >
            <span className="mr-2">➕</span>
            新增用戶
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="lg:col-span-3">
            <SearchBar
              value={searchQuery}
              onChange={setSearchQuery}
              ref={searchInputRef}
              placeholder="搜尋用戶名稱、信箱或部門... (Ctrl+F)"
            />
          </div>

          <div className="lg:col-span-1">
            <StatusFilter
              selectedStatuses={selectedStatuses}
              onChange={setSelectedStatuses}
            />
          </div>
        </div>
      </div>

      <div className="mb-4 flex items-center justify-between">
        <div className="text-sm text-gray-600">
          顯示 {filteredUsers.length} 位用戶 (共 {convertedUsers.length} 位)
        </div>

        {(searchQuery || selectedStatuses.length > 0) && (
          <button
            onClick={() => {
              setSearchQuery('')
              setSelectedStatuses([])
            }}
            className="text-sm text-blue-600 hover:text-blue-800 underline"
          >
            清除所有篩選
          </button>
        )}
      </div>

      {filteredUsers.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">🔍</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            找不到相符的用戶
          </h3>
          <p className="text-gray-500 mb-4">
            {searchQuery ? `沒有找到包含「${searchQuery}」的用戶` : '沒有符合篩選條件的用戶'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredUsers.map(user => (
            <UserCard
              key={user.id}
              user={user}
              onClick={handleUserClick}
              onQuickExport={handleQuickExport}
            />
          ))}
        </div>
      )}
    </div>
  )

  // 提交資料面板組件
  const SubmissionPanel = ({ status }: { status: 'submitted' | 'approved' | 'rejected' }) => {
    const statusConfig = {
      submitted: { title: '已提交項目', color: 'blue' },
      approved: { title: '已通過項目', color: 'green' },
      rejected: { title: '已退回項目', color: 'red' }
    }

    const config = statusConfig[status]
    const items = filteredSubmissions

    return (
      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold">{config.title}</h2>
          <span className="text-sm text-gray-600">
            共 {items.length} 筆資料
          </span>
        </div>

        {items.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <p className="text-lg">目前沒有{config.title}</p>
          </div>
        ) : (
          <div className="space-y-4">
            {items.map(entry => (
              <div
                key={entry.id}
                className="border rounded-lg p-4 hover:shadow-lg hover:border-blue-300 transition-all duration-200 cursor-pointer bg-white hover:bg-gray-50"
                onClick={() => {
                  const pagePath = pageMap[entry.page_key] || pageMap[entry.category]
                  if (pagePath) {
                    navigate(`${pagePath}?mode=review&userId=${entry.owner_id}&entryId=${entry.id}`)
                  }
                }}
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-start gap-4">
                      <div className="flex-1">
                        <h3 className="font-semibold text-lg">
                          {getCategoryName(entry.page_key, entry.category)}
                        </h3>
                        <p className="text-sm text-gray-600 mt-1">
                          提交者：{entry.owner?.display_name || '未知用戶'}
                        </p>
                        <div className="flex flex-wrap gap-3 mt-2 text-sm text-gray-500">
                          <span className="flex items-center">
                            <Calendar className="h-3 w-3 mr-1" />
                            {new Date(entry.created_at).toLocaleDateString()}
                          </span>
                          <span>
                            使用量：{entry.amount} {entry.unit}
                          </span>
                        </div>
                        {status === 'rejected' && entry.review_notes && (
                          <div className="mt-3 bg-red-50 border border-red-200 rounded-md p-3">
                            <p className="text-sm text-red-800">
                              <strong>退回原因：</strong> {entry.review_notes}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center ml-4">
                    <div className="text-sm text-gray-500 flex items-center">
                      <Eye className="h-4 w-4 mr-1" />
                      點擊查看詳情
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }

  if (isLoading) {
    return <DashboardSkeleton />
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 p-6 flex items-center justify-center">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-6 text-center">
          <div className="text-red-500 text-5xl mb-4">⚠️</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">載入失敗</h3>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
          >
            重新載入
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 標題和統計卡片區 */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <PageHeader
            title="管理員控制台 🚀"
            subtitle="用戶提交狀態管理與統計概覽"
            currentPage="dashboard"
            showBackButton={false}
          >
            <div className="flex items-center space-x-4">
              <button
                onClick={() => navigate('/app/admin/api-test')}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors duration-200 flex items-center space-x-2 text-sm font-medium"
                title="測試 API 連接性"
              >
                <span>🔗</span>
                <span>API 測試</span>
              </button>

              <div className="text-sm text-gray-500 text-right">
                <div>最後更新：{lastUpdated.toLocaleTimeString('zh-TW')}</div>
                <div className="flex items-center mt-1">
                  <div className={`w-2 h-2 rounded-full mr-2 ${isRefreshing ? 'bg-yellow-400 animate-pulse' : 'bg-green-400'}`}></div>
                  {isRefreshing ? '更新中...' : '自動重新整理 (30秒)'}
                </div>
              </div>

              <button
                onClick={handleRefresh}
                disabled={isRefreshing}
                className="px-3 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg transition-colors duration-200 flex items-center text-sm"
                title="手動重新整理 (F5)"
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
                {isRefreshing ? '更新中' : '重新整理'}
              </button>
            </div>
          </PageHeader>

          {/* 統計卡片區 */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mt-6">
            {/* 用戶管理卡片 */}
            <div
              onClick={() => setActiveTab('users')}
              className={`
                p-6 rounded-lg cursor-pointer transition-all duration-200 hover:shadow-lg hover:scale-105
                ${activeTab === 'users'
                  ? 'bg-blue-100 border-2 border-blue-500 shadow-lg'
                  : 'bg-blue-50 border-2 border-blue-200 hover:shadow-md'}
              `}
            >
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-gray-600 text-sm">用戶管理</p>
                  <p className="text-3xl font-bold mt-2">{statistics.totalUsers}</p>
                </div>
                <Users className="h-8 w-8 text-blue-600" />
              </div>
              <div className="mt-4 text-sm text-blue-600">
                點擊管理用戶
              </div>
            </div>

            {/* 已提交卡片 */}
            <div
              onClick={() => setActiveTab('submitted')}
              className={`
                p-6 rounded-lg cursor-pointer transition-all duration-200 hover:shadow-lg hover:scale-105
                ${activeTab === 'submitted'
                  ? 'bg-yellow-100 border-2 border-yellow-500 shadow-lg'
                  : 'bg-yellow-50 border-2 border-yellow-200 hover:shadow-md'}
              `}
            >
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-gray-600 text-sm">已提交</p>
                  <p className="text-3xl font-bold mt-2">{statistics.submitted}</p>
                </div>
                <FileText className="h-8 w-8 text-yellow-600" />
              </div>
              <div className="mt-4 text-sm text-yellow-600">
                點擊審核提交
              </div>
            </div>

            {/* 已通過卡片 */}
            <div
              onClick={() => setActiveTab('approved')}
              className={`
                p-6 rounded-lg cursor-pointer transition-all duration-200 hover:shadow-lg hover:scale-105
                ${activeTab === 'approved'
                  ? 'bg-green-100 border-2 border-green-500 shadow-lg'
                  : 'bg-green-50 border-2 border-green-200 hover:shadow-md'}
              `}
            >
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-gray-600 text-sm">已通過</p>
                  <p className="text-3xl font-bold mt-2">{statistics.approved}</p>
                </div>
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
              <div className="mt-4 text-sm text-green-600">
                點擊查看通過
              </div>
            </div>

            {/* 已退回卡片 */}
            <div
              onClick={() => setActiveTab('rejected')}
              className={`
                p-6 rounded-lg cursor-pointer transition-all duration-200 hover:shadow-lg hover:scale-105
                ${activeTab === 'rejected'
                  ? 'bg-red-100 border-2 border-red-500 shadow-lg'
                  : 'bg-red-50 border-2 border-red-200 hover:shadow-md'}
              `}
            >
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-gray-600 text-sm">已退回</p>
                  <p className="text-3xl font-bold mt-2">{statistics.rejected}</p>
                </div>
                <XCircle className="h-8 w-8 text-red-600" />
              </div>
              <div className="mt-4 text-sm text-red-600">
                點擊查看退回
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 內容區 - 根據選中的標籤顯示不同內容 */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow">
          {activeTab === 'users' && <UserManagementPanel />}
          {activeTab === 'submitted' && <SubmissionPanel status="submitted" />}
          {activeTab === 'approved' && <SubmissionPanel status="approved" />}
          {activeTab === 'rejected' && <SubmissionPanel status="rejected" />}
        </div>
      </div>

      {/* 用戶匯出對話框 */}
      <UserExportModal
        isOpen={showUserExportModal}
        onClose={handleUserExportClose}
        onConfirm={handleUserExportConfirm}
        userName={selectedUser?.name || ''}
        companyName="示例科技有限公司"
        isExporting={isUserExporting}
      />

      {/* 退回對話框 */}
      <RejectModal
        isOpen={showRejectModal}
        onClose={() => {
          setShowRejectModal(false)
          setRejectingSubmission(null)
        }}
        onConfirm={handleRejectConfirm}
        submissionInfo={rejectingSubmission ? {
          userName: rejectingSubmission.owner?.display_name || '未知用戶',
          categoryName: getCategoryName(rejectingSubmission.page_key, rejectingSubmission.category),
          amount: rejectingSubmission.amount,
          unit: rejectingSubmission.unit
        } : undefined}
      />
    </div>
  )
}

export default AdminDashboard