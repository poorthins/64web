import React from 'react'
import { Navigate } from 'react-router-dom'
import { useRole } from '../hooks/useRole'
import { AlertCircle } from 'lucide-react'

interface AdminRouteProps {
  children: React.ReactNode
  fallback?: React.ReactNode
}

const AdminRoute: React.FC<AdminRouteProps> = ({ children, fallback }) => {
  const { role, loadingRole, error, refetchRole } = useRole()

  console.log('🔒 AdminRoute Debug:', { role, loadingRole, error })

  if (loadingRole) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">驗證管理員權限中...</p>
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
            <h2 className="text-lg font-semibold text-red-800">權限驗證失敗</h2>
          </div>
          <p className="text-red-700 mb-4">無法驗證管理員權限：{error}</p>
          <button
            onClick={() => refetchRole()}
            className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors mb-4"
          >
            重新檢查權限
          </button>
          {fallback ? (
            <div className="mb-4">
              <p className="text-gray-600 text-sm">將顯示替代內容...</p>
              {fallback}
            </div>
          ) : (
            <Navigate to="/app" replace />
          )}
        </div>
      </div>
    )
  }

  if (role !== 'admin') {
    console.log('❌ Access denied - Role is not admin:', role)
    // 避免死循環：如果已經在 /app 首頁，不要再重定向
    if (window.location.pathname === '/app') {
      return fallback ? <>{fallback}</> : (
        <div className="flex items-center justify-center min-h-screen p-4">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 max-w-md text-center">
            <AlertCircle className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
            <h2 className="text-lg font-semibold text-yellow-800 mb-2">需要管理員權限</h2>
            <p className="text-yellow-700">您的角色是：{role || '未知'}</p>
            <p className="text-yellow-700 text-sm mt-2">請聯繫系統管理員獲取權限</p>
          </div>
        </div>
      )
    }
    return <Navigate to="/app" replace />
  }

  console.log('✅ Admin access granted')
  return <>{children}</>
}

export default AdminRoute