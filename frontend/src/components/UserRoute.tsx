import React from 'react'
import { Navigate, useSearchParams } from 'react-router-dom'
import { useRole } from '../hooks/useRole'
import { useEnergyPermission } from '../hooks/useCurrentUserPermissions'

interface UserRouteProps {
  children: React.ReactNode
  energyCategory?: string // 可選的能源類別權限檢查
}

const UserRoute: React.FC<UserRouteProps> = ({ children, energyCategory }) => {
  const { role, loadingRole } = useRole()
  const [searchParams] = useSearchParams()
  const { hasPermission, isLoading: isPermissionLoading } = useEnergyPermission(energyCategory || '')

  // 載入狀態
  if (loadingRole || (energyCategory && isPermissionLoading)) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        {energyCategory && (
          <div className="ml-3 text-gray-600">載入權限資料中...</div>
        )}
      </div>
    )
  }

  // 先判斷是否為審核模式（避免競態條件導致的誤判）
  const isReviewMode = searchParams.get('mode') === 'review'

  if (isReviewMode) {
    if (role === 'admin') {
      console.log('🔓 管理員審核模式 - 允許訪問填報頁面', energyCategory ? `(${energyCategory})` : '')
      return <>{children}</>
    } else {
      // 非管理員嘗試進入審核模式
      console.log('🔒 非管理員無法進入審核模式')
      return <Navigate to="/app" replace />
    }
  }

  // 非審核模式下，管理員跳轉到管理頁面
  if (role === 'admin') {
    console.log('🔒 管理員一般模式 - 重定向到管理頁面')
    return <Navigate to="/app" replace />
  }

  // 如果指定了能源類別，檢查權限
  if (energyCategory && !hasPermission) {
    console.log(`🔒 用戶沒有 ${energyCategory} 能源類別權限 - 顯示無權限頁面`)

    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-6 text-center">
          <div className="mb-4">
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100">
              <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.728-.833-2.498 0L4.316 15.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
          </div>

          <h2 className="text-lg font-medium text-gray-900 mb-2">
            無法存取此頁面
          </h2>

          <p className="text-sm text-gray-600 mb-6">
            您沒有 <span className="font-medium">{energyCategory}</span> 能源類別的填報權限。
            <br />
            請聯繫管理員開通相關權限。
          </p>

          <div className="space-y-3">
            <button
              onClick={() => window.history.back()}
              className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-2 px-4 rounded-md transition-colors"
            >
              返回上一頁
            </button>

            <button
              onClick={() => window.location.href = '/app'}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-md transition-colors"
            >
              回到首頁
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (energyCategory) {
    console.log(`✅ 用戶有 ${energyCategory} 能源類別權限 - 允許訪問`)
  }

  return <>{children}</>
}

export default UserRoute