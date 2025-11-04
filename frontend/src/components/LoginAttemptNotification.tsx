import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

interface LoginAttempt {
  id: string
  attempted_at: string
  ip_address: string | null
  user_agent: string | null
}

export const LoginAttemptNotification = () => {
  const [attempts, setAttempts] = useState<LoginAttempt[]>([])
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    // 每 10 秒檢查一次未讀的登入嘗試
    const checkAttempts = async () => {
      const { data, error } = await supabase.rpc('get_unread_login_attempts')

      if (error) {
        console.error('Failed to fetch login attempts:', error)
        return
      }

      if (data && data.length > 0) {
        setAttempts(data)
        setIsVisible(true)
      }
    }

    // 初次檢查
    checkAttempts()

    // 設定定期檢查
    const interval = setInterval(checkAttempts, 10000) // 10 秒

    return () => clearInterval(interval)
  }, [])

  const handleDismiss = async () => {
    // 標記為已讀
    const { error } = await supabase.rpc('mark_login_attempts_as_read')

    if (error) {
      console.error('Failed to mark as read:', error)
      return
    }

    setIsVisible(false)
    setAttempts([])
  }

  if (!isVisible || attempts.length === 0) {
    return null
  }

  const latestAttempt = attempts[0]
  const attemptTime = new Date(latestAttempt.attempted_at).toLocaleString('zh-TW')

  return (
    <div className="fixed top-4 right-4 z-50 max-w-sm">
      <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 shadow-lg rounded-lg">
        <div className="flex items-start">
          <div className="flex-shrink-0">
            <svg
              className="h-6 w-6 text-yellow-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
          <div className="ml-3 flex-1">
            <h3 className="text-sm font-medium text-yellow-800">
              登入嘗試警告
            </h3>
            <div className="mt-2 text-sm text-yellow-700">
              <p>
                有人嘗試在 <strong>{attemptTime}</strong> 登入您的帳號
              </p>
              {attempts.length > 1 && (
                <p className="mt-1 text-xs">
                  共 {attempts.length} 次嘗試
                </p>
              )}
            </div>
            <div className="mt-4">
              <button
                onClick={handleDismiss}
                className="text-sm font-medium text-yellow-800 hover:text-yellow-900 underline"
              >
                我知道了
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
