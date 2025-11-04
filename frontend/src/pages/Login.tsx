import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabaseClient'

const LoginPage = () => {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { user, loading: authLoading } = useAuth()
  
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const redirectPath = searchParams.get('redirect') || '/app'

  useEffect(() => {
    // 延遲一點再檢查，避免初始載入時的問題
    const timer = setTimeout(() => {
      if (!authLoading && user) {
        navigate(redirectPath, { replace: true })
      }
    }, 100)
    
    return () => clearTimeout(timer)
  }, [user, authLoading, navigate, redirectPath])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      // 1. 先檢查是否已有 active session
      console.log('🔍 Checking active session for:', email)
      const { data: sessionCheck, error: checkError } = await supabase.rpc('check_active_session', {
        check_email: email
      })

      console.log('📊 Session check result:', { sessionCheck, checkError })

      if (checkError) {
        console.error('❌ Session check failed:', checkError)
        setError(`系統檢查失敗: ${checkError.message}`)
        return
      }

      // 2. 如果有 active session,拒絕登入
      if (sessionCheck?.has_active_session) {
        console.log('🚫 Active session detected, blocking login')
        setError('此帳號已在其他裝置登入中。如需登入,請先登出其他裝置。')
        return
      }

      console.log('✅ No active session, proceeding with login')

      // 3. 沒有 active session,允許登入
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      })

      if (error) {
        setError(error.message)
        return
      }

      if (data.user) {
        navigate(redirectPath, { replace: true })
      }
    } catch (err) {
      setError('登入時發生未知錯誤')
    } finally {
      setLoading(false)
    }
  }

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        {/* 公司 Logo 區域 - 長方形設計 */}
        <div className="mx-auto flex justify-center mb-8">
          <img 
            src="/logo.png" 
            alt="Company Logo" 
            className="h-28 max-w-sm object-contain"
            onError={(e) => {
              // 如果圖片載入失敗，顯示預設圖示
              const target = e.target as HTMLImageElement;
              target.style.display = 'none';
              const svgWrapper = target.nextElementSibling as HTMLElement;
              if (svgWrapper) svgWrapper.style.display = 'flex';
            }}
          />
          {/* 預設圖示（當 logo.png 不存在時顯示） */}
          <div className="hidden flex h-16 w-16 items-center justify-center text-blue-600">
            <svg className="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          </div>
        </div>
        
        <h2 className="text-center text-2xl font-bold tracking-tight text-gray-900 leading-tight">
          歡迎登入山椒魚組織型碳足跡盤查系統
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          請輸入您的帳號資訊
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          <form className="space-y-6" onSubmit={handleSubmit}>
            {error && (
              <div className="bg-red-50 border border-red-300 text-red-700 px-4 py-3 rounded-md text-sm">
                {error}
              </div>
            )}

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                電子郵件
              </label>
              <div className="mt-1">
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  className="block w-full rounded-md border-gray-300 px-3 py-2 placeholder-gray-400 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 sm:text-sm"
                  placeholder="請輸入您的電子郵件"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading}
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                密碼
              </label>
              <div className="mt-1">
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  className="block w-full rounded-md border-gray-300 px-3 py-2 placeholder-gray-400 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 sm:text-sm"
                  placeholder="請輸入您的密碼"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                />
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={loading || !email || !password}
                className="flex w-full justify-center rounded-md border border-transparent bg-blue-600 py-2 px-4 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <div className="flex items-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    登入中...
                  </div>
                ) : (
                  '登入'
                )}
              </button>
            </div>
          </form>

        </div>
      </div>
    </div>
  )
}

export default LoginPage