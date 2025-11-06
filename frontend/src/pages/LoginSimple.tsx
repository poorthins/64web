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
  const [showPassword, setShowPassword] = useState(false)

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

          <div className="relative">
            <input
              id="password"
              name="password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              required
              data-testid="login-password"
              className="block w-full bg-white border border-gray-300 rounded-md py-3 px-4 pr-12 placeholder-gray-400 focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 focus:outline-none"
              disabled={loading}
            >
              {showPassword ? (
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              )}
            </button>
          </div>

          <button
            type="submit"
            disabled={loading || !email || !password}
            data-testid="login-submit"
            className="block mx-auto mt-6 bg-[#01E083] hover:opacity-90 text-white font-medium py-2 px-8 rounded-full focus:outline-none focus:ring-2 focus:ring-[#01E083] focus:ring-offset-2 disabled:bg-gray-400 disabled:cursor-not-allowed transition-all"
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