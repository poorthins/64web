import { useEffect } from 'react'
import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useRole } from '../hooks/useRole'

/**
 * 管理員專用 Layout - 全版面無側邊欄
 * Header 已移至 AdminDashboard 內部
 */
const AdminLayout = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const { user, loading } = useAuth()
  const { role, loadingRole } = useRole()

  // 驗證登入狀態
  useEffect(() => {
    if (!loading && !user) {
      const currentPath = location.pathname + location.search
      const redirectParam = currentPath !== '/app' ? `?redirect=${encodeURIComponent(currentPath)}` : ''
      navigate(`/login${redirectParam}`, { replace: true })
    }
  }, [user, loading, navigate, location])

  // 驗證管理員權限
  useEffect(() => {
    if (!loading && !loadingRole && user) {
      // 關鍵修正：明確檢查 role 不為 null 且不是 admin 時才跳轉
      // 避免在 role 還在載入時（role=null）誤判為非管理員
      if (role !== null && role !== 'admin') {
        console.log('⚠️ AdminLayout: 非管理員權限，跳轉到 /app', { role, user })
        navigate('/app', { replace: true })
      }
    }
  }, [role, loadingRole, loading, user, navigate])

  // 載入中顯示 loading 畫面
  if (loading || loadingRole) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  // 載入完成後，只有確認是管理員才顯示內容
  // 非管理員會被 useEffect 重定向，這裡返回 null 避免閃現內容
  if (!user || role !== 'admin') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--apple-gray-4, #f5f5f7)' }}>
      <Outlet />
    </div>
  )
}

export default AdminLayout
