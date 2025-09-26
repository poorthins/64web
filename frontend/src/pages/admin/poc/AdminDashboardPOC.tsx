import React, { useState, useMemo, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import StatsCard from './components/StatsCard'
import UserCard from './components/UserCard'
import SearchBar from './components/SearchBar'
import StatusFilter from './components/StatusFilter'
import UserExportModal, { ExportOptions } from './components/UserExportModal'
import { DashboardSkeleton } from './components/LoadingSkeleton'
import { PageHeader } from './components/PageHeader'
import { mockUsers, calculateStats, UserStatus, statusLabels, User } from './data/mockData'
import { demonstrateFileRenaming } from './utils/exportUtils'
import { exportSingleUser } from './utils/userExportUtils'
import { handleAPIError, showErrorToast, withRetry } from './utils/errorHandler'
import { useKeyboardShortcuts, createCommonShortcuts, showShortcutToast } from './hooks/useKeyboardShortcuts'
import { useAdvancedNavigation } from './hooks/useAdvancedNavigation'

const AdminDashboardPOC: React.FC = () => {
  const navigate = useNavigate()
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedStatuses, setSelectedStatuses] = useState<UserStatus[]>([])
  const [showUserExportModal, setShowUserExportModal] = useState(false)
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [isUserExporting, setIsUserExporting] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date())
  const [isRefreshing, setIsRefreshing] = useState(false)
  const autoRefreshIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)

  const stats = useMemo(() => calculateStats(mockUsers), [])

  // 載入資料函數
  const loadData = async (showLoadingState = true) => {
    if (showLoadingState) {
      setIsLoading(true)
    } else {
      setIsRefreshing(true)
    }
    setError(null)

    try {
      await withRetry(async () => {
        // 模擬 API 延遲
        await new Promise(resolve => setTimeout(resolve, showLoadingState ? 1500 : 800))

        // 模擬可能的錯誤（5% 機率）
        if (Math.random() < 0.05) {
          throw new Error('模擬網路錯誤')
        }
      }, {
        maxRetries: 2,
        baseDelay: 1000
      })

      setLastUpdated(new Date())
    } catch (err: any) {
      const apiError = handleAPIError(err)
      setError(apiError.message)
      showErrorToast(apiError)
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }

  // 初始載入
  useEffect(() => {
    loadData()
  }, [])

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

  // Advanced navigation shortcuts
  const { showHelp } = useAdvancedNavigation({
    currentPage: 'dashboard',
    enabled: !loading
  })

  const filteredUsers = useMemo(() => {
    return mockUsers.filter(user => {
      const matchesSearch = searchQuery === '' ||
        user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.department.toLowerCase().includes(searchQuery.toLowerCase())

      const matchesStatus = selectedStatuses.length === 0 ||
        selectedStatuses.includes(user.status)

      return matchesSearch && matchesStatus
    })
  }, [searchQuery, selectedStatuses])

  const handleStatsCardClick = (status: UserStatus) => {
    console.log(`點擊統計卡片: ${statusLabels[status]}`)
    navigate(`/app/admin/poc/statistics?status=${status}`)
  }

  const handleUserClick = (user: any) => {
    console.log('點擊用戶卡片:', user)
    navigate(`/app/admin/poc/edit/${user.id}`)
  }

  const handleCreateUser = () => {
    navigate('/app/admin/poc/create')
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
          title="管理員控制台 POC 🚀"
          subtitle="用戶提交狀態管理與統計概覽"
          currentPage="dashboard"
          showBackButton={false}
        >
          {/* API 測試連結、重新整理按鈕和狀態指示器 */}
          <div className="flex items-center space-x-4">
            <button
              onClick={() => navigate('/app/admin/poc/api-test')}
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
              顯示 {filteredUsers.length} 位用戶 (共 {mockUsers.length} 位)
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
            <span>🔧 POC 版本</span>
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

export default AdminDashboardPOC