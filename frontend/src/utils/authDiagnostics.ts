/**
 * 認證狀態診斷工具
 * 用於診斷 RLS 錯誤和認證失效問題
 */

import { supabase } from '../lib/supabaseClient'
import { User, Session } from '@supabase/supabase-js'

export interface AuthDiagnosticResult {
  user: User | null
  session: Session | null
  userError: any
  sessionError: any
  isAuthenticated: boolean
  tokenStatus: {
    exists: boolean
    expired: boolean
    expiresAt?: string
    timeToExpiryMinutes?: number
  }
  localStorageStatus: {
    hasAuthToken: boolean
    tokenData?: any
  }
}

/**
 * 診斷當前的認證狀態
 * 檢查 user、session、token 過期等狀況
 */
export const diagnoseAuthState = async (): Promise<AuthDiagnosticResult> => {
  console.log('=== 認證狀態診斷開始 ===')
  
  // 檢查1：直接取得用戶資訊
  const { data: { user }, error: userError } = await supabase.auth.getUser()
  console.log('getUser() 結果:', { 
    userId: user?.id, 
    email: user?.email,
    error: userError?.message 
  })
  
  // 檢查2：取得當前 session
  const { data: { session }, error: sessionError } = await supabase.auth.getSession()
  console.log('getSession() 結果:', { 
    userId: session?.user?.id,
    accessToken: session?.access_token ? '存在' : '不存在',
    refreshToken: session?.refresh_token ? '存在' : '不存在',
    expiresAt: session?.expires_at,
    error: sessionError?.message
  })
  
  // 檢查3：Token 過期狀態
  let tokenStatus: {
    exists: boolean
    expired: boolean
    expiresAt?: string
    timeToExpiryMinutes?: number
  } = {
    exists: false,
    expired: false
  }
  
  if (session?.expires_at) {
    const expiryTime = new Date(session.expires_at * 1000)
    const now = new Date()
    const timeToExpiry = expiryTime.getTime() - now.getTime()
    const isExpired = now > expiryTime
    
    tokenStatus = {
      exists: true,
      expired: isExpired,
      expiresAt: expiryTime.toLocaleString(),
      timeToExpiryMinutes: Math.floor(timeToExpiry / (1000 * 60))
    }
    
    console.log('Token 時間狀態:', { 
      expires: expiryTime.toLocaleString(),
      now: now.toLocaleString(),
      isExpired,
      timeToExpiryMinutes: Math.floor(timeToExpiry / (1000 * 60))
    })
  }
  
  // 檢查4：瀏覽器儲存狀態
  let localStorageStatus: {
    hasAuthToken: boolean
    tokenData?: any
  } = { hasAuthToken: false }
  
  try {
    // 檢查 Supabase 的標準 localStorage key 模式
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
    const projectRef = supabaseUrl ? new URL(supabaseUrl).hostname.split('.')[0] : 'unknown'
    const authKey = `sb-${projectRef}-auth-token`
    
    const localStorageData = localStorage.getItem(authKey)
    localStorageStatus = {
      hasAuthToken: !!localStorageData,
      tokenData: localStorageData ? '存在但不顯示內容' : undefined
    }
    
    console.log('LocalStorage 認證狀態:', {
      key: authKey,
      exists: !!localStorageData,
      dataLength: localStorageData?.length || 0
    })
  } catch (error) {
    console.warn('檢查 localStorage 時發生錯誤:', error)
  }
  
  const isAuthenticated = !!(user && !userError && session && !session.expires_at || (session?.expires_at && session.expires_at * 1000 > Date.now()))
  
  console.log('=== 認證狀態診斷結束 ===')
  
  return { 
    user, 
    session, 
    userError, 
    sessionError,
    isAuthenticated,
    tokenStatus,
    localStorageStatus
  }
}

/**
 * 包裝任何可能觸發 RLS 的操作，加入診斷資訊
 */
export const debugRLSOperation = async <T>(
  operationName: string, 
  operation: () => Promise<T>
): Promise<T> => {
  console.log(`\n=== ${operationName} 操作開始 ===`)
  
  // 操作前的認證狀態
  const preAuthState = await diagnoseAuthState()
  
  try {
    console.log(`執行 ${operationName}...`)
    const result = await operation()
    
    console.log(`${operationName} 執行成功:`, result)
    return result
    
  } catch (error) {
    console.error(`${operationName} 執行失敗:`, error)
    
    // 操作失敗後再次檢查認證狀態
    console.log('=== 失敗後的認證狀態檢查 ===')
    const postAuthState = await diagnoseAuthState()
    
    // 比較前後認證狀態
    console.log('認證狀態比較:', {
      操作前: {
        userId: preAuthState.user?.id,
        hasError: !!preAuthState.userError,
        isAuthenticated: preAuthState.isAuthenticated,
        tokenExpired: preAuthState.tokenStatus.expired
      },
      操作後: {
        userId: postAuthState.user?.id,
        hasError: !!postAuthState.userError,
        isAuthenticated: postAuthState.isAuthenticated,
        tokenExpired: postAuthState.tokenStatus.expired
      },
      狀態是否改變: preAuthState.user?.id !== postAuthState.user?.id ||
                   preAuthState.isAuthenticated !== postAuthState.isAuthenticated
    })
    
    // 特別檢查是否為 RLS 相關錯誤
    if (error instanceof Error) {
      const errorMessage = error.message.toLowerCase()
      if (errorMessage.includes('rls') || 
          errorMessage.includes('row level security') ||
          errorMessage.includes('permission') ||
          errorMessage.includes('policy')) {
        console.error('🚨 檢測到 RLS 相關錯誤！')
        console.error('錯誤分析:', {
          errorType: 'RLS_ERROR',
          message: error.message,
          authStateValid: postAuthState.isAuthenticated,
          userIdExists: !!postAuthState.user?.id,
          sessionExists: !!postAuthState.session,
          tokenExpired: postAuthState.tokenStatus.expired,
          suggestion: '建議檢查 auth.uid() 是否為 null 以及相關 RLS 政策'
        })
      }
    }
    
    throw error
  } finally {
    console.log(`=== ${operationName} 操作結束 ===\n`)
  }
}

/**
 * 設置認證狀態變化監控
 * 在應用啟動時調用一次
 */
export const setupAuthStateMonitoring = (): (() => void) => {
  console.log('設置認證狀態監控...')
  
  const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
    console.log('🔔 認證狀態變化事件:', {
      event: event,
      userId: session?.user?.id,
      timestamp: new Date().toLocaleString(),
      sessionExists: !!session,
      accessTokenExists: !!session?.access_token,
      expiresAt: session?.expires_at ? new Date(session.expires_at * 1000).toLocaleString() : null
    })
    
    // 特別注意的事件
    switch (event) {
      case 'SIGNED_OUT':
        console.warn('⚠️ 用戶已登出')
        break
      case 'TOKEN_REFRESHED':
        console.log('✅ Token 已刷新')
        break
      case 'SIGNED_IN':
        console.log('✅ 用戶已登入')
        break
      case 'USER_UPDATED':
        console.log('ℹ️ 用戶資訊已更新')
        break
      default:
        console.log(`ℹ️ 認證事件: ${event}`)
    }
    
    // 如果 session 突然消失但事件不是 SIGNED_OUT
    if (!session && event !== 'SIGNED_OUT') {
      console.error('❌ Session 意外消失，事件:', event)
      console.error('這可能表示認證狀態異常，建議立即檢查')
    }
    
    // 檢查 token 即將過期的情況
    if (session?.expires_at) {
      const expiresIn = (session.expires_at * 1000) - Date.now()
      const minutesToExpiry = Math.floor(expiresIn / (1000 * 60))
      
      if (minutesToExpiry <= 5 && minutesToExpiry > 0) {
        console.warn(`⏰ Token 將在 ${minutesToExpiry} 分鐘後過期`)
      } else if (minutesToExpiry <= 0) {
        console.error('🚨 Token 已過期!')
      }
    }
  })
  
  // 返回清理函數
  return () => {
    console.log('清理認證狀態監控...')
    subscription.unsubscribe()
  }
}

/**
 * 快速檢查認證狀態的簡化版本
 * 用於不需要詳細診斷的場景
 */
export const quickAuthCheck = async (): Promise<{
  isValid: boolean
  userId?: string
  issue?: string
}> => {
  try {
    const { data: { session }, error } = await supabase.auth.getSession()
    
    if (error) {
      return { isValid: false, issue: `認證錯誤: ${error.message}` }
    }
    
    if (!session?.user) {
      return { isValid: false, issue: '用戶未登入' }
    }
    
    if (session.expires_at && session.expires_at * 1000 <= Date.now()) {
      return { isValid: false, issue: 'Token 已過期' }
    }
    
    return { isValid: true, userId: session.user.id }
  } catch (error) {
    return { 
      isValid: false, 
      issue: `認證檢查異常: ${error instanceof Error ? error.message : String(error)}` 
    }
  }
}

/**
 * 強制診斷模式的環境變數檢查
 */
export const isDiagnosticMode = (): boolean => {
  return import.meta.env.DEV || 
         import.meta.env.VITE_AUTH_DIAGNOSTIC === 'true' ||
         localStorage.getItem('auth_diagnostic_mode') === 'true'
}

/**
 * 條件式診斷日誌 - 只在診斷模式下輸出詳細資訊
 */
export const conditionalLog = (message: string, data?: any): void => {
  if (isDiagnosticMode()) {
    if (data) {
      console.log(message, data)
    } else {
      console.log(message)
    }
  }
}