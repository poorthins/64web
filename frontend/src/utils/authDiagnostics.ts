/**
 * 認證狀態診斷工具
 * 用於診斷 RLS 錯誤和認證失效問題
 */

import { supabase } from '../supabaseClient'
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

  // 檢查1：直接取得用戶資訊
  const { data: { user }, error: userError } = await supabase.auth.getUser()

  // 檢查2：取得當前 session
  const { data: { session }, error: sessionError } = await supabase.auth.getSession()
  
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
  } catch (error) {
    // localStorage check failed
  }

  const isAuthenticated = !!(user && !userError && session && !session.expires_at || (session?.expires_at && session.expires_at * 1000 > Date.now()))
  
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

  // 操作前的認證狀態
  const preAuthState = await diagnoseAuthState()

  try {
    const result = await operation()
    return result

  } catch (error) {
    // 操作失敗後再次檢查認證狀態
    const postAuthState = await diagnoseAuthState()

    throw error
  }
}

/**
 * 設置認證狀態變化監控
 * 在應用啟動時調用一次
 */
export const setupAuthStateMonitoring = (): (() => void) => {

  const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
    // Monitor auth state changes silently
  })

  // 返回清理函數
  return () => {
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
 * 條件式診斷日誌 - 已移除 console 輸出
 */
export const conditionalLog = (message: string, data?: any): void => {
  // Diagnostic logging removed
}