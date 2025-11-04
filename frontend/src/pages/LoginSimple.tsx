import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabaseClient'

const LoginSimple = () => {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { user, loading: authLoading } = useAuth()
  
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const redirectPath = searchParams.get('redirect') || '/app'

  useEffect(() => {
    // 如果已經登入，自動重導向
    if (!authLoading && user) {
      navigate(redirectPath, { replace: true })
    }
  }, [user, authLoading, navigate, redirectPath])

  // 如果正在檢查認證狀態，顯示載入畫面
  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500"></div>
      </div>
    )
  }

  // 如果已登入，顯示重導向中的載入畫面
  if (user) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500"></div>
      </div>
    )
  }

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

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center py-12 px-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <img
          src="/formosanus-logo.png"
          alt="Logo"
          className="h-20 w-20 mx-auto mb-6 object-contain"
        />

        {/* 標題 */}
        <h2 className="text-3xl font-bold text-center text-gray-900 mb-8">
          Log In
        </h2>

        {/* 表單 */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div data-testid="login-error" className="bg-red-50 border border-red-300 text-red-700 px-4 py-3 rounded-md text-sm">
              {error}
            </div>
          )}

          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            data-testid="login-email"
            className="block w-full bg-white border border-gray-300 rounded-md py-3 px-4 placeholder-gray-400 focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
            placeholder="Account"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={loading}
          />

          <input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            data-testid="login-password"
            className="block w-full bg-white border border-gray-300 rounded-md py-3 px-4 placeholder-gray-400 focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={loading}
          />

          <button
            type="submit"
            disabled={loading || !email || !password}
            data-testid="login-submit"
            className="block mx-auto mt-6 bg-green-500 hover:bg-green-600 text-white font-medium py-2 px-8 rounded-full focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? (
              <div className="flex items-center">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Loading...
              </div>
            ) : (
              'Start'
            )}
          </button>
        </form>
      </div>
    </div>
  )
}

export default LoginSimple