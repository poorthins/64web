import { useEffect, useState } from 'react'
import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useRole } from '../hooks/useRole'
import Sidebar from '../components/Sidebar'
import MainContent from '../components/MainContent'
import { supabase } from '../lib/supabaseClient'

const ProtectedLayout = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const { user, loading } = useAuth()
  const { role, loadingRole } = useRole()
  const [isSigningOut, setIsSigningOut] = useState(false)

  useEffect(() => {
    if (!loading && !user) {
      const currentPath = location.pathname + location.search
      const redirectParam = currentPath !== '/app' ? `?redirect=${encodeURIComponent(currentPath)}` : ''
      navigate(`/login${redirectParam}`, { replace: true })
    }
  }, [user, loading, navigate, location])

  const handleSignOut = async () => {
    setIsSigningOut(true)
    try {
      await supabase.auth.signOut()
      navigate('/login', { replace: true })
    } catch (error) {
      console.error('Error signing out:', error)
      setIsSigningOut(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen w-full h-screen bg-gray-50 flex overflow-hidden">
      <Sidebar />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-white shadow-sm border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-8">
              <h1 className="text-xl font-semibold text-gray-800">
                碳排放追蹤系統
              </h1>
              
              {/* 導航連結 */}
              <nav className="hidden md:flex items-center space-x-6">
                {/* 只有非管理員才顯示一般導航按鈕 */}
                {!loadingRole && role !== 'admin' && (
                  <>
                    <button
                      onClick={() => navigate('/app')}
                      className={`px-3 py-2 text-sm font-medium rounded-md transition duration-200 ${
                        location.pathname === '/app'
                          ? 'bg-blue-100 text-blue-700'
                          : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                      }`}
                    >
                      總覽
                    </button>
                    
                    <button
                      onClick={() => navigate('/app/calculator')}
                      className={`px-3 py-2 text-sm font-medium rounded-md transition duration-200 ${
                        location.pathname === '/app/calculator'
                          ? 'bg-blue-100 text-blue-700'
                          : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                      }`}
                    >
                      計算器
                    </button>
                    
                    <button
                      onClick={() => navigate('/app/my/entries')}
                      className={`px-3 py-2 text-sm font-medium rounded-md transition duration-200 ${
                        location.pathname === '/app/my/entries'
                          ? 'bg-blue-100 text-blue-700'
                          : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                      }`}
                    >
                      我的填報
                    </button>
                    
                    <button
                      onClick={() => navigate('/app/help')}
                      className={`px-3 py-2 text-sm font-medium rounded-md transition duration-200 ${
                        location.pathname === '/app/help'
                          ? 'bg-blue-100 text-blue-700'
                          : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                      }`}
                    >
                      支援中心
                    </button>
                  </>
                )}
              </nav>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="flex items-center text-sm text-gray-600">
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                <span data-testid="nav-email">{user.email}</span>
                {!loadingRole && (
                  <span className={`ml-2 px-2 py-1 text-xs rounded-full ${
                    role === 'admin' ? 'bg-red-100 text-red-800' : 'bg-blue-100 text-blue-800'
                  }`}>
                    {role === 'admin' ? '管理員' : '使用者'}
                  </span>
                )}
              </div>
              
              <button
                onClick={handleSignOut}
                disabled={isSigningOut}
                data-testid="nav-logout"
                className="bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white px-3 py-1 rounded text-sm transition duration-200"
              >
                {isSigningOut ? '登出中...' : '登出'}
              </button>
            </div>
          </div>
        </header>
        
        <main className="flex-1 overflow-hidden">
          <MainContent>
            <Outlet />
          </MainContent>
        </main>
      </div>
    </div>
  )
}

export default ProtectedLayout