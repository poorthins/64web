import React, { useState, useMemo, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import StatsCard from './components/StatsCard'
import UserCard from './components/UserCard'
import SearchBar from './components/SearchBar'
import StatusFilter from './components/StatusFilter'
import UserExportModal, { ExportOptions } from './components/UserExportModal'
import { DashboardSkeleton } from './components/LoadingSkeleton'
import { PageHeader } from './components/PageHeader'
import { UserStatus, statusLabels, User } from './data/mockData'
import { demonstrateFileRenaming } from './utils/exportUtils'
import { exportSingleUser } from './utils/userExportUtils'
import { handleAPIError, showErrorToast, withRetry } from './utils/errorHandler'
import { useKeyboardShortcuts, createCommonShortcuts, showShortcutToast } from './hooks/useKeyboardShortcuts'
import { useUsers } from './hooks/useUsers'
import { useMetrics } from './hooks/useMetrics'

const AdminDashboard: React.FC = () => {
  const navigate = useNavigate()

  // API hooks
  const { users, isLoading: usersLoading, error: usersError, refreshUsers } = useUsers()
  const { metrics, isLoading: metricsLoading, error: metricsError, refreshMetrics } = useMetrics()

  // UI state
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedStatuses, setSelectedStatuses] = useState<UserStatus[]>([])
  const [showUserExportModal, setShowUserExportModal] = useState(false)
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [isUserExporting, setIsUserExporting] = useState(false)
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date())
  const [isRefreshing, setIsRefreshing] = useState(false)
  const autoRefreshIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)

  // 組合載入狀態和錯誤
  const isLoading = usersLoading || metricsLoading
  const error = usersError || metricsError

  // 將 API UserProfile 轉換為 UI User 格式
  const convertAPIUserToUIUser = (apiUser: any): User => {
    // 根據 is_active 和其他條件計算狀態
    let status: UserStatus = 'submitted'
    if (!apiUser.is_active) {
      status = 'rejected'
    } else if (apiUser.entries_count > 0) {
      status = 'approved' // 有填報記錄的啟用用戶視為通過
    }

    return {
      id: apiUser.id,
      name: apiUser.display_name || '未知用戶',
      email: apiUser.email || '',
      department: apiUser.company || apiUser.job_title || '未知部門',
      status,
      submissionDate: new Date().toISOString().split('T')[0], // 簡化處理
      lastActivity: new Date().toISOString().split('T')[0],
      entries: apiUser.entries_count || 0,
      avatar: '👤' // 預設頭像
    }
  }

  // 轉換 API 用戶資料為 UI 格式
  const convertedUsers: User[] = useMemo(() => {
    return users.map(convertAPIUserToUIUser)
  }, [users])

  // 計算統計資料（使用真實指標或轉換的用戶資料）
  const stats = useMemo(() => {
    if (metrics) {
      return {
        submitted: metrics.pendingReviews,
        approved: metrics.approvedReviews,
        rejected: metrics.needsFixReviews
      }
    }
    // 後備方案：從轉換的用戶資料計算
    return convertedUsers.reduce((acc, user) => {
      acc[user.status]++
      return acc
    }, { submitted: 0, approved: 0, rejected: 0 } as { submitted: number; approved: number; rejected: number })
  }, [metrics, convertedUsers])

  // 載入資料函數（現在使用 API hooks）
  const loadData = async (showLoadingState = true) => {
    if (!showLoadingState) {
      setIsRefreshing(true)
    }

    try {
      // 重新整理 API 資料
      await Promise.all([
        refreshUsers(),
        refreshMetrics()
      ])

      setLastUpdated(new Date())
      // 資料重新整理完成
    } catch (err: any) {
      const apiError = handleAPIError(err)
      showErrorToast(apiError)
      // 重新整理失敗
    } finally {
      setIsRefreshing(false)
    }
  }

  // API hooks 已自動處理初始載入，不需要額外的 useEffect

  // 自動重新整理設定
  useEffect(() => {
    const startAutoRefresh = () => {
      if (autoRefreshIntervalRef.current) {
        clearInterval(autoRefreshIntervalRef.current)
      }

      autoRefreshIntervalRef.current = setInterval(() => {
        loadData(false) // 背景重新整理，不顯示載入狀態
      }, 30000) // 每 30 秒
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
    loadData(false)
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
    back: () => navigate('/app/admin')
  })

  useKeyboardShortcuts({ shortcuts })

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

  const handleStatsCardClick = (status: UserStatus) => {
    console.log(`📊 點擊統計卡片: ${statusLabels[status]}`)
    // 映射狀態到對應的檢視模式和篩選條件（使用新的三狀態系統）
    let targetUrl = '/app/admin/submissions'

    switch (status) {
      case 'submitted':
        // 已提交 -> 待審核列表
        targetUrl += '?view=pending'
        console.log('🔗 跳轉到待審核列表')
        break
      case 'approved':
        // 已通過 -> 已審核列表中的通過項目
        targetUrl += '?view=reviewed&status=approved'
        console.log('🔗 跳轉到已通過項目列表')
        break
      case 'rejected':
        // 已退回 -> 已審核列表中的退回項目
        targetUrl += '?view=reviewed&status=rejected'
        console.log('🔗 跳轉到已退回項目列表')
        break
      default:
        targetUrl += '?view=overview'
        console.log('🔗 跳轉到總覽頁面')
    }

    console.log(`🚀 導航到: ${targetUrl}`)
    navigate(targetUrl)
  }

  const handleUserClick = (user: any) => {
    console.log('點擊用戶卡片:', user)
    navigate(`/app/admin/edit/${user.id}`)
  }

  const handleCreateUser = () => {
    navigate('/app/admin/create')
  }

  const handleDemoFileRenaming = () => {
    demonstrateFileRenaming()
    alert('請查看控制台查看智慧檔案重新命名展示')
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
      alert('匯出完成！請查看控制台查看詳細資訊。正式版本將下載 Excel 檔案。')
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
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <PageHeader
          title="管理員控制台 🚀"
          subtitle="用戶提交狀態管理與統計概覽"
          currentPage="dashboard"
          showBackButton={false}
        >
          {/* API 測試連結、重新整理按鈕和狀態指示器 */}
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
              <span className={`mr-2 ${isRefreshing ? 'animate-spin' : ''}`}>
                🔄
              </span>
              {isRefreshing ? '更新中' : '重新整理'}
            </button>
          </div>
        </PageHeader>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <StatsCard
            title="已提交"
            count={stats.submitted}
            icon="📝"
            bgColor="bg-blue-100"
            onClick={() => handleStatsCardClick('submitted')}
          />
          <StatsCard
            title="已通過"
            count={stats.approved}
            icon="✅"
            bgColor="bg-green-100"
            onClick={() => handleStatsCardClick('approved')}
          />
          <StatsCard
            title="已退回"
            count={stats.rejected}
            icon="❌"
            bgColor="bg-red-100"
            onClick={() => handleStatsCardClick('rejected')}
          />
        </div>

        <div className="bg-white rounded-xl shadow-lg p-6">
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
              {(searchQuery || selectedStatuses.length > 0) && (
                <button
                  onClick={() => {
                    setSearchQuery('')
                    setSelectedStatuses([])
                  }}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors duration-200"
                >
                  清除篩選條件
                </button>
              )}
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

        <div className="mt-8 text-center text-sm text-gray-500">
          <div className="flex items-center justify-center space-x-4">
            <span>🔧 管理版本</span>
            <span>•</span>
            <span>使用假資料展示</span>
            <span>•</span>
            <span>React 18 + TypeScript + Tailwind CSS</span>
          </div>
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
    </div>
  )
}

export default AdminDashboard