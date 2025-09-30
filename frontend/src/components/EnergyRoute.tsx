import React from 'react'
import { Navigate, useLocation, useSearchParams } from 'react-router-dom'
import { useRole } from '../hooks/useRole'
import { useEnergyPermission } from '../hooks/useCurrentUserPermissions'

interface EnergyRouteProps {
  children: React.ReactNode
  energyCategory: string
}

// 路由路徑到能源類別的映射
const ROUTE_TO_CATEGORY_MAP: Record<string, string> = {
  '/app/wd40': 'wd40',
  '/app/acetylene': 'acetylene',
  '/app/electricity_bill': 'electricity_bill',
  '/app/employee_commute': 'employee_commute',
  '/app/refrigerant': 'refrigerant',
  '/app/septic_tank': 'septic_tank',
  '/app/natural_gas': 'natural_gas',
  '/app/urea': 'urea',
  '/app/gasoline': 'gasoline',
  '/app/diesel': 'diesel',
  '/app/diesel_generator': 'diesel_generator',
  '/app/lpg': 'lpg',
  '/app/welding_rod': 'welding_rod',
  '/app/fire_extinguisher': 'fire_extinguisher'
}

// 從路由路徑獲取能源類別
export function getEnergyCategoryFromPath(pathname: string): string | null {
  return ROUTE_TO_CATEGORY_MAP[pathname] || null
}

const EnergyRoute: React.FC<EnergyRouteProps> = ({ children, energyCategory }) => {
  const { role, loadingRole } = useRole()
  const { hasPermission, isLoading } = useEnergyPermission(energyCategory)
  const [searchParams] = useSearchParams()
  const location = useLocation()

  // 載入狀態
  if (loadingRole || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        <div className="ml-3 text-gray-600">載入權限資料中...</div>
      </div>
    )
  }

  // 如果是管理員且在審核模式，允許訪問
  const isReviewMode = searchParams.get('mode') === 'review'
  if (role === 'admin' && isReviewMode) {
    console.log('🔓 管理員審核模式 - 允許訪問能源填報頁面:', energyCategory)
    return <>{children}</>
  }

  // 如果是管理員但不在審核模式，重定向到管理員頁面
  if (role === 'admin') {
    console.log('🔒 管理員一般模式 - 重定向到管理頁面')
    return <Navigate to="/app" replace />
  }

  // 檢查一般用戶的能源類別權限
  if (!hasPermission) {
    console.log(`🔒 用戶沒有 ${energyCategory} 能源類別權限 - 重定向到首頁`)

    // 顯示無權限提示頁面而不是直接重定向
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

  console.log(`✅ 用戶有 ${energyCategory} 能源類別權限 - 允許訪問`)
  return <>{children}</>
}

// 自動檢測能源類別的簡化版本
export const AutoEnergyRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const location = useLocation()
  const energyCategory = getEnergyCategoryFromPath(location.pathname)

  if (!energyCategory) {
    console.warn(`⚠️ 無法從路徑 ${location.pathname} 獲取能源類別，允許訪問`)
    return <>{children}</>
  }

  return (
    <EnergyRoute energyCategory={energyCategory}>
      {children}
    </EnergyRoute>
  )
}

export default EnergyRoute