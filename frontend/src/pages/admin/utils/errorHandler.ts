export interface APIError {
  code: string;
  message: string;
  details?: any;
  status?: number;
}

export enum ErrorType {
  NETWORK_ERROR = 'NETWORK_ERROR',
  PERMISSION_ERROR = 'PERMISSION_ERROR',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  SERVER_ERROR = 'SERVER_ERROR',
  TIMEOUT_ERROR = 'TIMEOUT_ERROR',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR'
}

export const ERROR_MESSAGES: Record<ErrorType, string> = {
  [ErrorType.NETWORK_ERROR]: '網路連線異常，請檢查網路狀態',
  [ErrorType.PERMISSION_ERROR]: '權限不足，請聯繫管理員',
  [ErrorType.VALIDATION_ERROR]: '資料格式錯誤，請檢查輸入內容',
  [ErrorType.SERVER_ERROR]: '伺服器發生錯誤，請稍後再試',
  [ErrorType.TIMEOUT_ERROR]: '請求逾時，請重新嘗試',
  [ErrorType.UNKNOWN_ERROR]: '系統發生未知錯誤，請聯繫技術支援'
};

export const classifyError = (error: any): ErrorType => {
  if (!error) return ErrorType.UNKNOWN_ERROR;

  if (error.name === 'TimeoutError' || error.code === 'TIMEOUT') {
    return ErrorType.TIMEOUT_ERROR;
  }

  if (error.status || error.response?.status) {
    const status = error.status || error.response.status;

    if (status === 401 || status === 403) {
      return ErrorType.PERMISSION_ERROR;
    }

    if (status >= 400 && status < 500) {
      return ErrorType.VALIDATION_ERROR;
    }

    if (status >= 500) {
      return ErrorType.SERVER_ERROR;
    }
  }

  if (error.code === 'NETWORK_ERROR' || error.message?.includes('Network Error')) {
    return ErrorType.NETWORK_ERROR;
  }

  return ErrorType.UNKNOWN_ERROR;
};

export const handleAPIError = (error: any): APIError => {
  const errorType = classifyError(error);
  const message = ERROR_MESSAGES[errorType];

  return {
    code: errorType,
    message,
    details: error,
    status: error.status || error.response?.status
  };
};

export const showErrorToast = (error: APIError | string, duration: number = 5000): void => {
  const message = typeof error === 'string' ? error : error.message;

  if (typeof window !== 'undefined') {
    const existingToast = document.getElementById('error-toast');
    if (existingToast) {
      existingToast.remove();
    }

    const toast = document.createElement('div');
    toast.id = 'error-toast';
    toast.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: #f56565;
      color: white;
      padding: 16px 20px;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      z-index: 9999;
      max-width: 400px;
      font-size: 14px;
      line-height: 1.5;
      animation: slideIn 0.3s ease-out;
    `;

    const style = document.createElement('style');
    style.textContent = `
      @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
      }
      @keyframes slideOut {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(100%); opacity: 0; }
      }
    `;
    document.head.appendChild(style);

    toast.innerHTML = `
      <div style="display: flex; align-items: center; justify-content: space-between;">
        <span style="flex: 1; margin-right: 8px;">${message}</span>
        <button onclick="this.parentElement.parentElement.remove()"
                style="background: none; border: none; color: white; font-size: 18px; cursor: pointer; padding: 0; width: 20px; height: 20px; display: flex; align-items: center; justify-content: center;">×</button>
      </div>
    `;

    document.body.appendChild(toast);

    setTimeout(() => {
      if (toast.parentElement) {
        toast.style.animation = 'slideOut 0.3s ease-in';
        setTimeout(() => toast.remove(), 300);
      }
    }, duration);
  }
};

export const logError = (error: any, context?: string): void => {
  if (process.env.NODE_ENV === 'development') {
    const timestamp = new Date().toISOString();
    const errorDetails = {
      timestamp,
      context,
      error: {
        message: error.message,
        stack: error.stack,
        name: error.name,
        code: error.code,
        status: error.status || error.response?.status,
        response: error.response?.data
      }
    };

    console.group(`🚨 錯誤紀錄 - ${timestamp}`);
    console.error('Context:', context);
    console.error('Error:', error);
    console.error('Details:', errorDetails);
    console.groupEnd();
  }
};

export interface RetryOptions {
  maxRetries?: number;
  baseDelay?: number;
  maxDelay?: number;
  retryCondition?: (error: any) => boolean;
}

export const withRetry = async <T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> => {
  const {
    maxRetries = 3,
    baseDelay = 1000,
    maxDelay = 8000,
    retryCondition = (error: any) => {
      const errorType = classifyError(error);
      return errorType === ErrorType.NETWORK_ERROR || errorType === ErrorType.TIMEOUT_ERROR;
    }
  } = options;

  let lastError: any;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      if (attempt === maxRetries || !retryCondition(error)) {
        throw error;
      }

      const delay = Math.min(baseDelay * Math.pow(2, attempt), maxDelay);
      logError(error, `重試第 ${attempt + 1} 次，${delay}ms 後重試`);

      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError;
};

export const createRetryableFunction = <T extends any[], R>(
  fn: (...args: T) => Promise<R>,
  options?: RetryOptions
) => {
  return (...args: T): Promise<R> => {
    return withRetry(() => fn(...args), options);
  };
};