import { useEffect, useState } from 'react'
import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useRole } from '../hooks/useRole'
import { useUserProfile } from '../hooks/useUserProfile'
import Sidebar from '../components/Sidebar'
import MainContent from '../components/MainContent'
import { supabase } from '../supabaseClient'
import { LoginAttemptNotification } from '../components/LoginAttemptNotification'
import LogoutButton from '../components/common/LogoutButton'

const ProtectedLayout = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const { user, loading } = useAuth()
  const { role, loadingRole } = useRole()
  const { displayName } = useUserProfile()
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
      <LoginAttemptNotification />
      <Sidebar />

      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-white shadow-sm border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-8">
              <h1 className="text-xl font-semibold text-gray-800">
                碳排放追蹤系統
              </h1>
              
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="flex items-center text-sm text-gray-600">
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                <span data-testid="nav-email">{displayName}</span>
                {!loadingRole && (
                  <span className={`ml-2 px-2 py-1 text-xs rounded-full ${
                    role === 'admin' ? 'bg-red-100 text-red-800' : 'bg-blue-100 text-blue-800'
                  }`}>
                    {role === 'admin' ? '管理員' : '使用者'}
                  </span>
                )}
              </div>
              
              <LogoutButton
                onClick={handleSignOut}
                disabled={isSigningOut}
                isLoading={isSigningOut}
                data-testid="nav-logout"
              />
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