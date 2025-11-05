import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

/**
 * FullScreenLayout - 全螢幕佈局
 *
 * 特點：
 * - 只做認證檢查
 * - 不渲染任何 UI 容器（無側邊欄、無導航）
 * - 子頁面完全控制自己的外觀
 *
 * 適用頁面：
 * - 需要全螢幕展示的頁面（如盤查清單、儀表板等）
 */
export default function FullScreenLayout() {
  const { user, loading } = useAuth()

  // 載入中顯示簡單的載入畫面
  if (loading) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500 mx-auto mb-4"></div>
          <p className="text-gray-600">載入中...</p>
        </div>
      </div>
    )
  }

  // 未登入則重定向到登入頁
  if (!user) {
    return <Navigate to="/login" replace />
  }

  // 直接渲染子頁面，不包任何 UI
  return <Outlet />
}
