import { supabase } from '../supabaseClient'
import { User, Session } from '@supabase/supabase-js'
import { diagnoseAuthState, conditionalLog, isDiagnosticMode } from './authDiagnostics'

export interface AuthResult {
  user: User | null
  session: Session | null
  error: Error | null
}

export interface RLSError {
  isRLSError: boolean
  message: string
  code?: string
  table?: string
  operation?: 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE'
  suggestion?: string
}

/**
 * 統一的認證檢查函數 - 使用 getSession 確保一致性
 * 增強版包含詳細診斷功能
 */
export async function validateAuth(): Promise<AuthResult> {
  try {
    conditionalLog('🔍 [validateAuth] 開始認證檢查...')
    
    // 在診斷模式下進行完整診斷
    if (isDiagnosticMode()) {
      const diagnosis = await diagnoseAuthState()
      conditionalLog('🔍 [validateAuth] 詳細診斷結果:', diagnosis)
    }
    
    const { data: { session }, error } = await supabase.auth.getSession()
    
    if (error) {
      console.error('Auth validation error:', error)
      conditionalLog('❌ [validateAuth] 認證檢查失敗:', {
        errorMessage: error.message,
        errorCode: error.code || 'UNKNOWN'
      })
      return {
        user: null,
        session: null,
        error: new Error(`認證檢查失敗: ${error.message}`)
      }
    }

    if (!session?.user) {
      conditionalLog('❌ [validateAuth] Session 或 User 不存在:', {
        hasSession: !!session,
        hasUser: !!session?.user
      })
      return {
        user: null,
        session: null,
        error: new Error('使用者未登入')
      }
    }

    // 驗證 session 是否已過期
    if (session.expires_at && session.expires_at * 1000 < Date.now()) {
      console.warn('Session expired, attempting refresh...')
      conditionalLog('⏰ [validateAuth] Session 已過期，嘗試刷新:', {
        expiresAt: new Date(session.expires_at * 1000).toLocaleString(),
        now: new Date().toLocaleString(),
        expiredBy: Date.now() - (session.expires_at * 1000)
      })
      
      // 嘗試刷新 session
      const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession()
      
      if (refreshError || !refreshData.session) {
        conditionalLog('❌ [validateAuth] Session 刷新失敗:', {
          refreshError: refreshError?.message,
          hasNewSession: !!refreshData.session
        })
        return {
          user: null,
          session: null,
          error: new Error('Session 已過期，請重新登入')
        }
      }

      conditionalLog('✅ [validateAuth] Session 刷新成功:', {
        newUserId: refreshData.session.user.id,
        newExpiresAt: refreshData.session.expires_at ? 
          new Date(refreshData.session.expires_at * 1000).toLocaleString() : 'N/A'
      })

      return {
        user: refreshData.session.user,
        session: refreshData.session,
        error: null
      }
    }

    conditionalLog('✅ [validateAuth] 認證檢查成功:', {
      userId: session.user.id,
      email: session.user.email,
      expiresAt: session.expires_at ? 
        new Date(session.expires_at * 1000).toLocaleString() : 'N/A'
    })

    return {
      user: session.user,
      session: session,
      error: null
    }
  } catch (error) {
    console.error('Unexpected error in validateAuth:', error)
    conditionalLog('💥 [validateAuth] 未預期的錯誤:', {
      errorType: error?.constructor?.name,
      errorMessage: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    })
    return {
      user: null,
      session: null,
      error: error instanceof Error ? error : new Error('認證檢查時發生未知錯誤')
    }
  }
}

/**
 * 快速檢查用戶是否已登入（不包含刷新邏輯）
 */
export async function isUserAuthenticated(): Promise<boolean> {
  try {
    const { data: { session } } = await supabase.auth.getSession()
    return !!(session?.user && session.expires_at && session.expires_at * 1000 > Date.now())
  } catch (error) {
    console.error('Error checking authentication status:', error)
    return false
  }
}

/**
 * 分析錯誤是否為 RLS 相關錯誤
 */
export function analyzeRLSError(error: any): RLSError {
  const message = error?.message || ''
  const code = error?.code || ''
  const details = error?.details || ''
  
  // 常見的 RLS 錯誤模式
  const rlsPatterns = [
    { pattern: /row.*security/i, message: 'Row Level Security 政策阻擋了此操作' },
    { pattern: /permission.*denied/i, message: '權限被拒絕，可能是 RLS 政策限制' },
    { pattern: /policy.*violation/i, message: 'RLS 政策違規' },
    { pattern: /access.*denied/i, message: '存取被拒絕，檢查 RLS 政策設定' },
    { pattern: /insufficient.*privilege/i, message: '權限不足，可能是 RLS 政策問題' }
  ]

  // 特定錯誤代碼
  const rlsErrorCodes = ['42501', '42P01', '42883']
  
  let isRLSError = false
  let suggestion = ''
  let table = ''
  let operation: 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE' | undefined

  // 檢查是否為已知的 RLS 錯誤
  let rlsMessage = message
  for (const { pattern, message: patternMessage } of rlsPatterns) {
    if (pattern.test(message) || pattern.test(details)) {
      isRLSError = true
      rlsMessage = patternMessage
      break
    }
  }

  if (rlsErrorCodes.includes(code)) {
    isRLSError = true
  }

  // 嘗試從錯誤訊息中提取表格和操作類型
  const tableMatch = message.match(/table\s+"?(\w+)"?/i) || details.match(/table\s+"?(\w+)"?/i)
  if (tableMatch) {
    table = tableMatch[1]
  }

  const operationMatch = message.match(/\b(SELECT|INSERT|UPDATE|DELETE)\b/i) || details.match(/\b(SELECT|INSERT|UPDATE|DELETE)\b/i)
  if (operationMatch) {
    operation = operationMatch[1].toUpperCase() as any
  }

  // 根據表格和操作提供建議
  if (isRLSError) {
    if (table && operation) {
      suggestion = `請檢查 ${table} 表的 ${operation} RLS 政策是否允許當前用戶操作`
    } else if (operation) {
      suggestion = `請檢查 ${operation} 操作的 RLS 政策設定`
    } else {
      suggestion = '請檢查相關表格的 RLS 政策是否正確設定，或聯繫管理員'
    }

    // 特定表格的建議
    if (table === 'form_drafts') {
      suggestion += '。確認 form_drafts_select_own 和 form_drafts_insert_policy 政策已啟用。'
    } else if (table === 'entry_files') {
      suggestion += '。確認 entry_files_select_own 和 entry_files_insert_policy 政策已啟用。'
    }
  }

  return {
    isRLSError,
    message: isRLSError ? `RLS 錯誤: ${rlsMessage}` : message,
    code,
    table,
    operation,
    suggestion
  }
}

/**
 * 標準化 API 錯誤處理
 */
export function handleAPIError(error: any, context: string): Error {
  const message = error?.message || '未知錯誤'
  const code = error?.code || ''
  
  // 特殊處理資料庫約束錯誤
  if (message.includes('null value in column') && message.includes('violates not-null constraint')) {
    // 提取欄位名稱
    const columnMatch = message.match(/column "([^"]+)"/)
    const tableMatch = message.match(/of relation "([^"]+)"/)
    const column = columnMatch ? columnMatch[1] : '未知欄位'
    const table = tableMatch ? tableMatch[1] : '未知表格'
    
    if (column === 'entry_id' && table === 'entry_files') {
      return new Error('檔案上傳失敗：請先建立能源使用記錄再上傳檔案')
    }
    
    return new Error(`資料庫約束錯誤：${table} 表的 ${column} 欄位不可為空`)
  }
  
  // 其他約束錯誤
  if (message.includes('violates') && message.includes('constraint')) {
    return new Error(`資料庫約束錯誤：${message}`)
  }
  
  const rlsAnalysis = analyzeRLSError(error)
  
  if (rlsAnalysis.isRLSError) {
    const errorMessage = `${context} - ${rlsAnalysis.message}`
    const enhancedError = new Error(errorMessage)
    
    // 添加額外的調試信息
    ;(enhancedError as any).isRLSError = true
    ;(enhancedError as any).originalError = error
    ;(enhancedError as any).table = rlsAnalysis.table
    ;(enhancedError as any).operation = rlsAnalysis.operation
    ;(enhancedError as any).suggestion = rlsAnalysis.suggestion
    
    console.error('RLS Error Details:', {
      context,
      message: rlsAnalysis.message,
      table: rlsAnalysis.table,
      operation: rlsAnalysis.operation,
      suggestion: rlsAnalysis.suggestion,
      originalError: error
    })
    
    return enhancedError
  }

  // 一般錯誤處理
  return new Error(`${context}: ${message}`)
}

/**
 * 檢查用戶是否為管理員
 */
export async function isAdmin(): Promise<boolean> {
  try {
    const authResult = await validateAuth()
    if (authResult.error || !authResult.user) {
      return false
    }

    // 呼叫資料庫中的 is_admin() 函數
    const { data, error } = await supabase.rpc('is_admin')
    
    if (error) {
      console.error('Error checking admin status:', error)
      return false
    }

    return data === true
  } catch (error) {
    console.error('Error in isAdmin check:', error)
    return false
  }
}

/**
 * 除錯用：記錄認證狀態
 */
export async function logAuthStatus(): Promise<void> {
  try {
    const { data: { session }, error } = await supabase.auth.getSession()
    
    console.group('🔐 Authentication Status')
    console.log('Session exists:', !!session)
    console.log('User ID:', session?.user?.id || 'N/A')
    console.log('User email:', session?.user?.email || 'N/A')
    console.log('Session expires at:', session?.expires_at ? new Date(session.expires_at * 1000).toLocaleString() : 'N/A')
    console.log('Session valid:', session?.expires_at ? session.expires_at * 1000 > Date.now() : false)
    if (error) console.log('Auth error:', error)
    console.groupEnd()
  } catch (error) {
    console.error('Error logging auth status:', error)
  }
}

/**
 * 詳細認證狀態日誌（增強版）
 * 包含更全面的診斷資訊
 */
export async function logDetailedAuthStatus(): Promise<void> {
  try {
    console.group('🔍 詳細認證狀態診斷')
    
    // 使用完整診斷功能
    const diagnosis = await diagnoseAuthState()
    
    console.log('📊 認證狀態總覽:', {
      isAuthenticated: diagnosis.isAuthenticated,
      hasUser: !!diagnosis.user,
      hasSession: !!diagnosis.session,
      hasErrors: !!(diagnosis.userError || diagnosis.sessionError)
    })
    
    if (diagnosis.user) {
      console.log('👤 用戶資訊:', {
        id: diagnosis.user.id,
        email: diagnosis.user.email,
        emailConfirmed: diagnosis.user.email_confirmed_at ? '已確認' : '未確認',
        lastSignIn: diagnosis.user.last_sign_in_at || 'N/A'
      })
    }
    
    if (diagnosis.session) {
      console.log('🎫 Session 資訊:', {
        userId: diagnosis.session.user?.id,
        provider: diagnosis.session.user?.app_metadata?.provider || 'N/A',
        role: diagnosis.session.user?.role || 'N/A'
      })
    }
    
    console.log('⏰ Token 狀態:', diagnosis.tokenStatus)
    console.log('💾 本地儲存狀態:', diagnosis.localStorageStatus)
    
    if (diagnosis.userError) {
      console.error('❌ User 錯誤:', diagnosis.userError)
    }
    
    if (diagnosis.sessionError) {
      console.error('❌ Session 錯誤:', diagnosis.sessionError)
    }
    
    console.groupEnd()
  } catch (error) {
    console.error('Error in detailed auth status logging:', error)
  }
}