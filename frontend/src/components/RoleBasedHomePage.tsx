import React from 'react'
import { useRole } from '../hooks/useRole'
import AdminDashboard from '../pages/admin/AdminDashboard'
import DashboardPage from '../pages/Dashboard'
import { AlertCircle } from 'lucide-react'

const RoleBasedHomePage: React.FC = () => {
  const { role, loadingRole, error, refetchRole } = useRole()

  console.log('🔍 RoleBasedHomePage Debug:', { role, loadingRole, error })

  if (loadingRole) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">載入用戶角色中...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen p-4">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md">
          <div className="flex items-center mb-4">
            <AlertCircle className="w-6 h-6 text-red-500 mr-3" />
            <h2 className="text-lg font-semibold text-red-800">角色檢查失敗</h2>
          </div>
          <p className="text-red-700 mb-4">{error}</p>
          <div className="space-y-2">
            <button
              onClick={() => refetchRole()}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              重新檢查角色
            </button>
            <button
              onClick={() => window.location.reload()}
              className="w-full px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
            >
              重新載入頁面
            </button>
          </div>
          <div className="mt-4 p-3 bg-gray-50 rounded-md">
            <h3 className="text-sm font-medium text-gray-800 mb-2">除錯資訊：</h3>
            <p className="text-xs text-gray-600">請檢查瀏覽器 Console 的詳細日誌</p>
            <p className="text-xs text-gray-600 mt-1">角色: {role || '未取得'}</p>
          </div>
        </div>
      </div>
    )
  }

  console.log('✅ Role determined:', role)

  if (role === 'admin') {
    return <AdminDashboard />
  }

  return <DashboardPage />
}

export default RoleBasedHomePage