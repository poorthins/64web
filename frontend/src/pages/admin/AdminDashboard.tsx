import React, { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Users, FileText, CheckCircle, XCircle, Plus, LogOut } from 'lucide-react'
import { apiUserToUIUser } from './utils/userTransformers'
import StatsCard from './components/StatsCard'
import UserCard from './components/UserCard'
import UserExportModal from './components/UserExportModal'
import { DashboardSkeleton } from './components/LoadingSkeleton'
import { PageHeader } from './components/PageHeader'
import { UserStatus, User } from './types/admin'
import { statusLabels } from './constants/userStatus'
import { demonstrateFileRenaming } from './utils/exportUtils'
import { handleAPIError, showErrorToast, withRetry } from './utils/errorHandler'
import { useKeyboardShortcuts, createCommonShortcuts, showShortcutToast } from './hooks/useKeyboardShortcuts'
import { useUsers } from './hooks/useUsers'
import { useMetrics } from './hooks/useMetrics'
import { useUserExport } from './hooks/useUserExport'
import { supabase } from '../../lib/supabaseClient'
import { toast } from 'react-hot-toast'

const AdminDashboard: React.FC = () => {
  const navigate = useNavigate()

  // API hooks
  const { users, isLoading: usersLoading, error: usersError, refreshUsers, createNewUser, updateExistingUser, toggleStatus } = useUsers()
  const { metrics, isLoading: metricsLoading, error: metricsError, refreshMetrics } = useMetrics()
  const {
    selectedUser,
    showExportModal,
    isExporting: isUserExporting,
    exportProgress,
    handleQuickExport,
    handleExportConfirm,
    handleExportClose
  } = useUserExport()

  // UI state
  const [showCreateUserModal, setShowCreateUserModal] = useState(false)

  // 組合載入狀態和錯誤
  const isLoading = usersLoading || metricsLoading
  const error = usersError || metricsError

  // 轉換 API 用戶資料為 UI 格式
  const convertedUsers: User[] = useMemo(() => {
    return users.map(apiUserToUIUser)
  }, [users])

  // 統計數據 - 只使用 metrics API
  const statistics = useMemo(() => {
    return {
      totalUsers: users.length,
      submitted: metrics?.pendingReviews ?? 0,
      approved: metrics?.approvedReviews ?? 0,
      rejected: metrics?.needsFixReviews ?? 0
    }
  }, [metrics, users.length])

  // 優化的分層載入策略
  const loadAllData = async () => {
    try {
      console.log('🚀 [AdminDashboard] 開始分層載入資料...')

      // 第一層：載入核心用戶資料（最高優先級）
      console.log('📊 [AdminDashboard] 第一層：載入用戶資料')
      await refreshUsers()

      // 第二層：載入統計資料
      console.log('📈 [AdminDashboard] 第二層：載入統計資料')
      await refreshMetrics()

      console.log('✅ [AdminDashboard] 分層載入完成')
    } catch (err: any) {
      console.error('❌ [AdminDashboard] 載入失敗:', err)
      const apiError = handleAPIError(err)
      showErrorToast(apiError)
    }
  }

  // 初始載入
  useEffect(() => {
    loadAllData()
  }, [])

  // 鍵盤快捷鍵
  const shortcuts = createCommonShortcuts({
    help: () => showShortcutToast(shortcuts),
    back: () => navigate('/app')
  })

  useKeyboardShortcuts({ shortcuts })

  // 處理用戶操作
  const handleUserClick = (user: any) => {
    navigate(`/app/admin/users/${user.id}`)
  }

  const handleCreateUser = () => {
    navigate('/app/admin/create')
  }

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut()
      navigate('/login')
    } catch (error) {
      console.error('登出失敗:', error)
      toast.error('登出失敗')
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
      </div>

      {convertedUsers.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">👥</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            尚未建立用戶
          </h3>
          <p className="text-gray-500 mb-4">
            點擊上方「新增用戶」按鈕建立第一位用戶
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {convertedUsers.map(user => (
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
        {/* 綠色 Header */}
        <div className="bg-[#2e7d32] rounded-3xl p-12 mb-8 shadow-2xl relative overflow-hidden">
          {/* 裝飾圓圈 */}
          <div className="absolute top-[-50%] right-[-10%] w-96 h-96 bg-white/10 rounded-full"></div>
          <div className="absolute bottom-[-30%] left-[-5%] w-72 h-72 bg-white/5 rounded-full"></div>

          {/* Header 內容 */}
          <div className="relative z-10 flex items-center justify-between">
            <div className="flex items-center gap-8">
              <div className="flex-shrink-0">
                <img
                  src="/formosanus-logo.png"
                  alt="山椒魚永續工程 Logo"
                  className="w-32 h-32 object-contain bg-white rounded-full p-2 shadow-xl"
                />
              </div>
              <div className="text-left text-white">
                <div className="text-sm opacity-85 mb-2 tracking-wide">山椒魚永續工程股份有限公司</div>
                <h1 className="text-5xl font-bold mb-2 tracking-tight">碳足跡管理系統</h1>
                <p className="text-lg opacity-90">企業用戶填報管理與統計分析</p>
              </div>
            </div>

            {/* 登出按鈕 */}
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-6 py-3 bg-white/20 hover:bg-white/30 text-white rounded-xl transition-colors backdrop-blur-sm"
            >
              <LogOut className="w-5 h-5" />
              <span className="font-medium">登出</span>
            </button>
          </div>
        </div>

        {/* 統計卡片區 */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-5 mb-8">
          {/* 總用戶數卡片 */}
          <div className="bg-white rounded-2xl p-7 shadow-md transition-all hover:shadow-lg hover:-translate-y-1 border-l-4 border-transparent relative overflow-hidden">
            {/* 右上角裝飾圓圈 */}
            <div className="absolute top-0 right-0 w-24 h-24 bg-[#2e7d32]/10 rounded-full -mr-8 -mt-8"></div>

            {/* 內容 */}
            <div className="relative z-10 flex items-center justify-center gap-6">
              {/* 左側：圖示 + 文字 */}
              <div className="flex flex-col items-center gap-3">
                <div className="w-14 h-14 rounded-xl bg-[#2e7d32]/10 flex items-center justify-center">
                  <Users className="w-7 h-7 text-[#2e7d32]" />
                </div>
                <div className="text-sm text-gray-500 font-medium">總用戶數</div>
              </div>

              {/* 右側：數字 */}
              <div className="text-7xl font-bold text-gray-900">{statistics.totalUsers}</div>
            </div>
          </div>

          {/* 待審核卡片 */}
          <div className="bg-white rounded-2xl p-7 shadow-md transition-all hover:shadow-lg hover:-translate-y-1 border-l-4 border-transparent relative overflow-hidden">
            {/* 右上角裝飾圓圈 */}
            <div className="absolute top-0 right-0 w-24 h-24 bg-[#ff9800]/10 rounded-full -mr-8 -mt-8"></div>

            {/* 內容 */}
            <div className="relative z-10 flex items-center justify-center gap-6">
              {/* 左側：圖示 + 文字 */}
              <div className="flex flex-col items-center gap-3">
                <div className="w-14 h-14 rounded-xl bg-[#ff9800]/10 flex items-center justify-center">
                  <FileText className="w-7 h-7 text-[#ff9800]" />
                </div>
                <div className="text-sm text-gray-500 font-medium">待審核</div>
              </div>

              {/* 右側：數字 */}
              <div className="text-7xl font-bold text-gray-900">{statistics.submitted}</div>
            </div>
          </div>

          {/* 已通過卡片 */}
          <div className="bg-white rounded-2xl p-7 shadow-md transition-all hover:shadow-lg hover:-translate-y-1 border-l-4 border-transparent relative overflow-hidden">
            {/* 右上角裝飾圓圈 */}
            <div className="absolute top-0 right-0 w-24 h-24 bg-[#66bb6a]/10 rounded-full -mr-8 -mt-8"></div>

            {/* 內容 */}
            <div className="relative z-10 flex items-center justify-center gap-6">
              {/* 左側：圖示 + 文字 */}
              <div className="flex flex-col items-center gap-3">
                <div className="w-14 h-14 rounded-xl bg-[#66bb6a]/10 flex items-center justify-center">
                  <CheckCircle className="w-7 h-7 text-[#66bb6a]" />
                </div>
                <div className="text-sm text-gray-500 font-medium">已通過</div>
              </div>

              {/* 右側：數字 */}
              <div className="text-7xl font-bold text-gray-900">{statistics.approved}</div>
            </div>
          </div>

          {/* 已退回卡片 */}
          <div className="bg-white rounded-2xl p-7 shadow-md transition-all hover:shadow-lg hover:-translate-y-1 border-l-4 border-transparent relative overflow-hidden">
            {/* 右上角裝飾圓圈 */}
            <div className="absolute top-0 right-0 w-24 h-24 bg-[#ef5350]/10 rounded-full -mr-8 -mt-8"></div>

            {/* 內容 */}
            <div className="relative z-10 flex items-center justify-center gap-6">
              {/* 左側：圖示 + 文字 */}
              <div className="flex flex-col items-center gap-3">
                <div className="w-14 h-14 rounded-xl bg-[#ef5350]/10 flex items-center justify-center">
                  <XCircle className="w-7 h-7 text-[#ef5350]" />
                </div>
                <div className="text-sm text-gray-500 font-medium">已退回</div>
              </div>

              {/* 右側：數字 */}
              <div className="text-7xl font-bold text-gray-900">{statistics.rejected}</div>
            </div>
          </div>
        </div>

        {/* 內容區 - 用戶管理面板 */}
        <div className="bg-white rounded-2xl shadow-md p-8">
          <UserManagementPanel />
        </div>

        {/* 用戶匯出對話框 */}
        <UserExportModal
          isOpen={showExportModal}
          onClose={handleExportClose}
          onConfirm={handleExportConfirm}
          userName={selectedUser?.name || ''}
          companyName={selectedUser?.department || ''}
          isExporting={isUserExporting}
          exportProgress={exportProgress}
        />
      </div>
    </div>
  )
}

export default AdminDashboard
