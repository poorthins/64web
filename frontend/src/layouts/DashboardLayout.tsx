import { useEffect } from 'react'
import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { LoginAttemptNotification } from '../components/LoginAttemptNotification'

/**
 * DashboardLayout - 新版儀表板專用的 Layout
 * 特點：
 * 1. 不包含側邊欄（Sidebar）- 使用頂部導航
 * 2. 不包含舊版 header - 各頁面自行處理
 * 3. 全螢幕寬度設計
 * 4. 保留認證檢查與登入跳轉邏輯
 */
const DashboardLayout = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const { user, loading } = useAuth()

  // 認證檢查 - 未登入則跳轉到登入頁
  useEffect(() => {
    if (!loading && !user) {
      const currentPath = location.pathname + location.search
      const redirectParam = currentPath !== '/app' ? `?redirect=${encodeURIComponent(currentPath)}` : ''
      navigate(`/login${redirectParam}`, { replace: true })
    }
  }, [user, loading, navigate, location])

  // Loading 狀態
  if (loading) {
    return (
      <div className="min-h-screen bg-figma-gray flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-figma-accent"></div>
      </div>
    )
  }

  // 未登入狀態（loading 完成後仍無 user）
  if (!user) {
    return (
      <div className="min-h-screen bg-figma-gray flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-figma-accent"></div>
      </div>
    )
  }

  // 已登入 - 渲染新版 Dashboard
  return (
    <div className="min-h-screen w-full bg-figma-gray">
      <LoginAttemptNotification />

      {/* Outlet 會渲染 Dashboard.tsx 內容 */}
      <Outlet />
    </div>
  )
}

export default DashboardLayout
