// Supabase 認證和 RLS 錯誤處理
import { supabase } from '../../../lib/supabaseClient'
import { showErrorToast } from './errorHandler'

export interface AuthErrorContext {
  operation: string
  component: string
  attemptReauth?: boolean
}

// 檢查是否為認證相關錯誤
export function isAuthError(error: any): boolean {
  const authErrorCodes = [
    'PGRST301', // JWT expired
    'PGRST116', // RLS violation
    'JWT_EXPIRED',
    'REFRESH_TOKEN_EXPIRED',
    'UNAUTHENTICATED',
    'UNAUTHORIZED'
  ]

  return (
    authErrorCodes.includes(error?.code) ||
    error?.message?.includes('JWT') ||
    error?.message?.includes('token') ||
    error?.message?.includes('RLS') ||
    error?.message?.includes('row-level security') ||
    error?.message?.includes('policy') ||
    error?.message?.includes('permission')
  )
}

// 檢查用戶登入狀態
export async function checkAuthStatus(): Promise<{
  isAuthenticated: boolean
  user: any
  error?: string
}> {
  try {
    const { data: { user }, error } = await supabase.auth.getUser()

    if (error) {
      console.error('檢查認證狀態失敗:', error)
      return {
        isAuthenticated: false,
        user: null,
        error: error.message
      }
    }

    return {
      isAuthenticated: !!user,
      user
    }
  } catch (error) {
    console.error('檢查認證狀態異常:', error)
    return {
      isAuthenticated: false,
      user: null,
      error: '檢查認證狀態失敗'
    }
  }
}

// 嘗試重新整理 Token
export async function refreshAuthToken(): Promise<{
  success: boolean
  error?: string
}> {
  try {
    console.log('🔄 嘗試重新整理認證 Token...')

    const { data, error } = await supabase.auth.refreshSession()

    if (error) {
      console.error('重新整理 Token 失敗:', error)
      return {
        success: false,
        error: error.message
      }
    }

    if (data.session) {
      console.log('✅ Token 重新整理成功')
      return { success: true }
    } else {
      console.error('❌ 重新整理後無有效 Session')
      return {
        success: false,
        error: '重新整理後無有效 Session'
      }
    }
  } catch (error) {
    console.error('重新整理 Token 異常:', error)
    return {
      success: false,
      error: '重新整理 Token 異常'
    }
  }
}

// 處理認證錯誤
export async function handleAuthError(
  error: any,
  context: AuthErrorContext
): Promise<{
  handled: boolean
  shouldRetry: boolean
  shouldRedirect: boolean
}> {
  console.group(`🔐 處理認證錯誤 [${context.component}]`)
  console.log('操作:', context.operation)
  console.log('錯誤:', error)

  // 檢查當前認證狀態
  const authStatus = await checkAuthStatus()
  console.log('目前認證狀態:', authStatus)

  let result = {
    handled: false,
    shouldRetry: false,
    shouldRedirect: false
  }

  if (isAuthError(error)) {
    result.handled = true

    if (!authStatus.isAuthenticated) {
      // 用戶未登入
      console.log('❌ 用戶未登入，需要重新登入')

      showErrorToast({
        message: '登入已過期，請重新登入',
        code: 'AUTH_REQUIRED',
        details: null
      })

      result.shouldRedirect = true
    } else if (context.attemptReauth !== false) {
      // 嘗試重新整理 Token
      console.log('🔄 嘗試重新整理 Token...')

      const refreshResult = await refreshAuthToken()

      if (refreshResult.success) {
        console.log('✅ Token 重新整理成功，可以重試操作')
        result.shouldRetry = true
      } else {
        console.log('❌ Token 重新整理失敗，需要重新登入')

        showErrorToast({
          message: '登入驗證失敗，請重新登入',
          code: 'TOKEN_REFRESH_FAILED',
          details: refreshResult.error
        })

        result.shouldRedirect = true
      }
    } else {
      // RLS 權限問題
      console.log('❌ 權限不足或 RLS 政策阻止')

      showErrorToast({
        message: '權限不足，請聯繫系統管理員',
        code: 'INSUFFICIENT_PERMISSIONS',
        details: null
      })
    }
  }

  console.groupEnd()
  return result
}

// 自動重新登入
export function redirectToLogin(): void {
  console.log('🔄 準備重新導向到登入頁面...')

  // 儲存當前頁面，登入後可以回到這裡
  const currentPath = window.location.pathname + window.location.search
  localStorage.setItem('returnPath', currentPath)

  // 清除認證狀態
  supabase.auth.signOut().then(() => {
    // 導向登入頁面
    window.location.href = '/login'
  }).catch(err => {
    console.error('登出失敗:', err)
    // 即使登出失敗也要導向登入頁面
    window.location.href = '/login'
  })
}

// 檢查管理員權限
export async function checkAdminPermissions(): Promise<{
  isAdmin: boolean
  error?: string
}> {
  try {
    const authStatus = await checkAuthStatus()

    if (!authStatus.isAuthenticated) {
      return {
        isAdmin: false,
        error: '用戶未登入'
      }
    }

    // 檢查用戶角色
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', authStatus.user.id)
      .single()

    if (error) {
      console.error('檢查管理員權限失敗:', error)
      return {
        isAdmin: false,
        error: '檢查權限失敗'
      }
    }

    const isAdmin = profile?.role === 'admin'
    console.log('管理員權限檢查:', { userId: authStatus.user.id, role: profile?.role, isAdmin })

    return { isAdmin }
  } catch (error) {
    console.error('檢查管理員權限異常:', error)
    return {
      isAdmin: false,
      error: '檢查權限異常'
    }
  }
}

// Hook 用於組件中使用
export function useAuthErrorHandler(component: string) {
  const handleError = async (error: any, operation: string, attemptReauth = true) => {
    const result = await handleAuthError(error, {
      component,
      operation,
      attemptReauth
    })

    if (result.shouldRedirect) {
      redirectToLogin()
    }

    return result
  }

  return { handleError, redirectToLogin, checkAdminPermissions }
}