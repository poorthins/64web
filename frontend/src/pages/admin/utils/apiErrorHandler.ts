// 增強的 API 錯誤處理機制
import { showErrorToast } from './errorHandler'

export interface APIError {
  message: string
  code: string
  details?: any
  statusCode?: number
  retryable?: boolean
}

export interface ErrorContext {
  operation: string
  component: string
  userId?: string
  data?: any
}

// Supabase 錯誤代碼映射
const SUPABASE_ERROR_MESSAGES: Record<string, string> = {
  // 認證錯誤
  'PGRST301': '權限不足，請重新登入',
  'PGRST116': '資料列層級安全性違規，權限不足',
  'JWT_EXPIRED': '登入已過期，請重新登入',
  'REFRESH_TOKEN_EXPIRED': '登入已過期，請重新登入',

  // 資料驗證錯誤
  '23505': '資料重複，此電子郵件已被使用',
  '23503': '外鍵約束違規，關聯資料不存在',
  '23514': '資料格式錯誤，請檢查輸入值',

  // 網路錯誤
  'FETCH_ERROR': '網路連線問題，請檢查網路狀態',
  'NETWORK_ERROR': '網路連線問題，請檢查網路狀態',
  'TIMEOUT_ERROR': '請求超時，請稍後重試',

  // 一般錯誤
  'INTERNAL_SERVER_ERROR': '伺服器內部錯誤，請稍後重試',
  'SERVICE_UNAVAILABLE': '服務暫時無法使用，請稍後重試'
}

// RLS 政策錯誤檢測
function isRLSError(error: any): boolean {
  return (
    error?.code === 'PGRST116' ||
    error?.message?.includes('RLS') ||
    error?.message?.includes('row-level security') ||
    error?.message?.includes('policy')
  )
}

// Token 過期錯誤檢測
function isTokenExpiredError(error: any): boolean {
  return (
    error?.code === 'JWT_EXPIRED' ||
    error?.code === 'REFRESH_TOKEN_EXPIRED' ||
    error?.message?.includes('JWT') ||
    error?.message?.includes('token')
  )
}

// 網路錯誤檢測
function isNetworkError(error: any): boolean {
  return (
    error?.code === 'NETWORK_ERROR' ||
    error?.code === 'FETCH_ERROR' ||
    error?.message?.includes('fetch') ||
    error?.message?.includes('network') ||
    !navigator.onLine
  )
}

// 重試錯誤判斷
function isRetryableError(error: APIError): boolean {
  return (
    error.code === 'TIMEOUT_ERROR' ||
    error.code === 'NETWORK_ERROR' ||
    error.code === 'INTERNAL_SERVER_ERROR' ||
    error.code === 'SERVICE_UNAVAILABLE' ||
    (error.statusCode && error.statusCode >= 500)
  )
}

// 轉換錯誤為標準格式
export function normalizeAPIError(error: any, context?: ErrorContext): APIError {
  let apiError: APIError = {
    message: '未知錯誤',
    code: 'UNKNOWN_ERROR',
    retryable: false
  }

  // 處理不同類型的錯誤
  if (error?.response) {
    // HTTP 回應錯誤
    apiError.statusCode = error.response.status
    apiError.code = error.response.status.toString()
    apiError.details = error.response.data

    if (error.response.data?.message) {
      apiError.message = error.response.data.message
    } else if (error.response.statusText) {
      apiError.message = error.response.statusText
    }
  } else if (error?.code && error?.message) {
    // Supabase/API 錯誤
    apiError.code = error.code
    apiError.message = error.message
    apiError.details = error.details
  } else if (error instanceof Error) {
    // JavaScript 錯誤
    apiError.message = error.message
    apiError.code = error.name || 'JAVASCRIPT_ERROR'
  } else if (typeof error === 'string') {
    // 字串錯誤
    apiError.message = error
  }

  // 檢查特殊錯誤類型
  if (isRLSError(error)) {
    apiError.code = 'RLS_VIOLATION'
    apiError.message = '權限不足，請聯繫系統管理員'
  } else if (isTokenExpiredError(error)) {
    apiError.code = 'TOKEN_EXPIRED'
    apiError.message = '登入已過期，請重新登入'
  } else if (isNetworkError(error)) {
    apiError.code = 'NETWORK_ERROR'
    apiError.message = '網路連線問題，請檢查網路狀態'
  }

  // 使用預定義訊息
  if (SUPABASE_ERROR_MESSAGES[apiError.code]) {
    apiError.message = SUPABASE_ERROR_MESSAGES[apiError.code]
  }

  // 判斷是否可重試
  apiError.retryable = isRetryableError(apiError) || false

  // 添加上下文資訊
  if (context) {
    apiError.details = {
      ...apiError.details,
      context
    }
  }

  return apiError
}

// 錯誤處理策略
export async function handleAPIError(
  error: any,
  context?: ErrorContext,
  options?: {
    showToast?: boolean
    logError?: boolean
    autoRetry?: boolean
    onTokenExpired?: () => void
  }
): Promise<APIError> {
  const {
    showToast = true,
    logError = true,
    autoRetry = false,
    onTokenExpired
  } = options || {}

  const apiError = normalizeAPIError(error, context)

  // 記錄錯誤
  if (logError) {
    console.group(`❌ API 錯誤 [${context?.component || 'Unknown'}]`)
    console.error('操作:', context?.operation || 'Unknown')
    console.error('錯誤代碼:', apiError.code)
    console.error('錯誤訊息:', apiError.message)
    console.error('原始錯誤:', error)
    if (apiError.details) {
      console.error('詳細資訊:', apiError.details)
    }
    console.groupEnd()
  }

  // 處理 Token 過期
  if (apiError.code === 'TOKEN_EXPIRED' && onTokenExpired) {
    console.log('🔄 Token 已過期，準備重新登入...')
    onTokenExpired()
    return apiError
  }

  // 顯示錯誤提示
  if (showToast) {
    showErrorToast(apiError)
  }

  // 自動重試（如果適用）
  if (autoRetry && apiError.retryable) {
    console.log('🔄 錯誤可重試，將在 3 秒後自動重試...')
    // 這裡可以實作自動重試邏輯
  }

  return apiError
}

// 網路狀態監控
export function setupNetworkMonitoring(): () => void {
  const handleOnline = () => {
    console.log('🌐 網路連線已恢復')
    showErrorToast({
      message: '網路連線已恢復',
      code: 'NETWORK_RESTORED',
      details: null
    })
  }

  const handleOffline = () => {
    console.log('🚫 網路連線已中斷')
    showErrorToast({
      message: '網路連線已中斷，請檢查網路狀態',
      code: 'NETWORK_OFFLINE',
      details: null
    })
  }

  window.addEventListener('online', handleOnline)
  window.addEventListener('offline', handleOffline)

  // 返回清理函數
  return () => {
    window.removeEventListener('online', handleOnline)
    window.removeEventListener('offline', handleOffline)
  }
}

// 使用範例 Hook
export function useEnhancedErrorHandler(component: string) {
  const handleError = (error: any, operation: string, data?: any) => {
    return handleAPIError(error, {
      component,
      operation,
      data
    }, {
      showToast: true,
      logError: true,
      onTokenExpired: () => {
        // 可以在這裡實作重新登入邏輯
        window.location.href = '/login'
      }
    })
  }

  return { handleError }
}