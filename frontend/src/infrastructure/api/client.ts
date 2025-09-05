/**
 * API 客戶端配置
 */
import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse, AxiosError } from 'axios';
import { getAuthToken, refreshAuthToken, clearAuth } from '@/features/auth/services/authService';

// API 基礎配置
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
const API_TIMEOUT = parseInt(import.meta.env.VITE_API_TIMEOUT || '30000', 10); // 預設 30 秒
const MAX_RETRIES = parseInt(import.meta.env.VITE_API_MAX_RETRIES || '3', 10);
const RETRY_DELAY = parseInt(import.meta.env.VITE_API_RETRY_DELAY || '1000', 10);

// 創建 axios 實例
export const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: API_TIMEOUT,
  headers: {
    'Content-Type': 'application/json',
  },
});

// 請求攔截器
apiClient.interceptors.request.use(
  async (config: any) => {
    // 添加認證 token（除非明確跳過）
    if (!config.skipAuth) {
      const token = await getAuthToken();
      if (token) {
        if (!config.headers) {
          config.headers = {};
        }
        config.headers.Authorization = `Bearer ${token}`;
      }
    }

    // 添加請求 ID（用於追蹤）
    if (config.headers) {
      config.headers['X-Request-ID'] = generateRequestId();
    }

    // 記錄請求（開發環境）
    if (import.meta.env.DEV) {
      console.log(`[API Request] ${config.method?.toUpperCase()} ${config.url}`, {
        params: config.params,
        data: config.data,
      });
    }

    return config;
  },
  (error: any) => {
    console.error('[API Request Error]', error);
    return Promise.reject(error);
  }
);

// 響應攔截器
apiClient.interceptors.response.use(
  (response: AxiosResponse) => {
    // 記錄響應（開發環境）
    if (import.meta.env.DEV) {
      console.log(`[API Response] ${response.config.method?.toUpperCase()} ${response.config.url}`, {
        status: response.status,
        data: response.data,
      });
    }

    return response;
  },
  async (error: AxiosError) => {
    const originalRequest = error.config as (AxiosRequestConfig & { _retry?: boolean }) | undefined;
    
    if (!originalRequest) {
      return Promise.reject(error);
    }

    // 記錄錯誤
    console.error('[API Response Error]', {
      url: originalRequest?.url,
      status: error.response?.status,
      message: error.message,
      data: error.response?.data,
    });

    // 處理 401 錯誤（未授權）
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        // 嘗試刷新 token
        const newToken = await refreshAuthToken();
        if (newToken) {
          if (!originalRequest.headers) {
            originalRequest.headers = {};
          }
          originalRequest.headers.Authorization = `Bearer ${newToken}`;
          return apiClient(originalRequest);
        } else {
          // 無法獲取新 token，清除認證
          clearAuth();
          if (typeof window !== 'undefined') {
            window.location.href = '/login';
          }
          return Promise.reject(new Error('Authentication failed'));
        }
      } catch (refreshError) {
        // 刷新失敗，清除認證並重定向到登入頁
        clearAuth();
        if (typeof window !== 'undefined') {
          window.location.href = '/login';
        }
        return Promise.reject(refreshError);
      }
    }

    // 處理其他錯誤
    return Promise.reject(error);
  }
);

// 生成請求 ID
function generateRequestId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
}

// API 錯誤類型
export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, any>;
  timestamp: string;
  path: string;
}

// API 響應類型
export interface ApiResponse<T = any> {
  data: T;
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
    totalPages?: number;
  };
}

// API 請求選項
export interface ApiRequestOptions extends AxiosRequestConfig {
  skipAuth?: boolean;
  retries?: number;
  retryDelay?: number;
  headers?: Record<string, string>;
}

// 通用 API 請求方法
export class ApiService {
  /**
   * GET 請求
   */
  static async get<T = any>(
    url: string,
    params?: Record<string, any>,
    options?: ApiRequestOptions
  ): Promise<T> {
    const response = await apiClient.get<T>(url, { params, ...options });
    return response.data;
  }

  /**
   * POST 請求
   */
  static async post<T = any>(
    url: string,
    data?: any,
    options?: ApiRequestOptions
  ): Promise<T> {
    const response = await apiClient.post<T>(url, data, options);
    return response.data;
  }

  /**
   * PUT 請求
   */
  static async put<T = any>(
    url: string,
    data?: any,
    options?: ApiRequestOptions
  ): Promise<T> {
    const response = await apiClient.put<T>(url, data, options);
    return response.data;
  }

  /**
   * PATCH 請求
   */
  static async patch<T = any>(
    url: string,
    data?: any,
    options?: ApiRequestOptions
  ): Promise<T> {
    const response = await apiClient.patch<T>(url, data, options);
    return response.data;
  }

  /**
   * DELETE 請求
   */
  static async delete<T = any>(
    url: string,
    options?: ApiRequestOptions
  ): Promise<T> {
    const response = await apiClient.delete<T>(url, options);
    return response.data;
  }

  /**
   * 上傳文件
   */
  static async upload<T = any>(
    url: string,
    file: File,
    onProgress?: (progress: number) => void,
    options?: ApiRequestOptions
  ): Promise<T> {
    const formData = new FormData();
    formData.append('file', file);

    const response = await apiClient.post<T>(url, formData, {
      ...options,
      headers: {
        ...options?.headers,
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress: (progressEvent: any) => {
        if (onProgress && progressEvent.total) {
          const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          onProgress(progress);
        }
      },
    });

    return response.data;
  }

  /**
   * 批量請求
   */
  static async batch<T = any>(
    requests: Array<() => Promise<any>>
  ): Promise<T[]> {
    return Promise.all(requests.map(request => request()));
  }
}

// 導出錯誤處理工具
export function isApiError(error: any): error is AxiosError<ApiError> {
  return error.isAxiosError === true;
}

export function getErrorMessage(error: any): string {
  if (isApiError(error)) {
    return error.response?.data?.message || error.message || 'An error occurred';
  }
  return error.message || 'An unexpected error occurred';
}

export function getErrorCode(error: any): string | undefined {
  if (isApiError(error)) {
    return error.response?.data?.code;
  }
  return undefined;
}

// 重試邏輯
export async function withRetry<T>(
  fn: () => Promise<T>,
  retries: number = MAX_RETRIES,
  delay: number = RETRY_DELAY
): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    if (retries > 0 && shouldRetry(error)) {
      await new Promise(resolve => setTimeout(resolve, delay));
      return withRetry(fn, retries - 1, delay * 2);
    }
    throw error;
  }
}

// 判斷是否應該重試
function shouldRetry(error: any): boolean {
  if (isApiError(error)) {
    const status = error.response?.status;
    // 只在網絡錯誤或服務器錯誤時重試，不在客戶端錯誤時重試
    return !status || status >= 500 || status === 408 || status === 429;
  }
  // 對於網絡錯誤等非 HTTP 錯誤，允許重試
  return true;
}

// API 健康檢查
export async function healthCheck(): Promise<boolean> {
  try {
    const response = await apiClient.get('/health', { 
      timeout: 5000,
      skipAuth: true 
    } as ApiRequestOptions);
    return response.status === 200;
  } catch (error) {
    console.warn('API health check failed:', error);
    return false;
  }
}

// 配置管理
export const apiConfig = {
  baseURL: API_BASE_URL,
  timeout: API_TIMEOUT,
  maxRetries: MAX_RETRIES,
  retryDelay: RETRY_DELAY,
} as const;

// 導出默認實例
export default apiClient;
