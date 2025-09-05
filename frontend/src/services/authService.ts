/**
 * 認證服務 - 處理用戶認證相關功能
 */

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface User {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'user';
}

const TOKEN_STORAGE_KEY = 'auth_tokens';
const USER_STORAGE_KEY = 'auth_user';

/**
 * 獲取認證 token
 */
export async function getAuthToken(): Promise<string | null> {
  try {
    const storedTokens = localStorage.getItem(TOKEN_STORAGE_KEY);
    if (!storedTokens) {
      return null;
    }

    const tokens: AuthTokens = JSON.parse(storedTokens);
    
    // 檢查 token 是否過期
    if (Date.now() >= tokens.expiresAt) {
      // Token 過期，嘗試刷新
      const newToken = await refreshAuthToken();
      return newToken;
    }

    return tokens.accessToken;
  } catch (error) {
    console.error('Error getting auth token:', error);
    clearAuth();
    return null;
  }
}

/**
 * 刷新認證 token
 */
export async function refreshAuthToken(): Promise<string | null> {
  try {
    const storedTokens = localStorage.getItem(TOKEN_STORAGE_KEY);
    if (!storedTokens) {
      return null;
    }

    const tokens: AuthTokens = JSON.parse(storedTokens);
    
    // 向後端發送刷新請求
    const response = await fetch('/api/auth/refresh', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${tokens.refreshToken}`,
      },
    });

    if (!response.ok) {
      throw new Error('Token refresh failed');
    }

    const data = await response.json();
    const newTokens: AuthTokens = {
      accessToken: data.access_token,
      refreshToken: data.refresh_token || tokens.refreshToken,
      expiresAt: Date.now() + (data.expires_in * 1000),
    };

    // 保存新的 tokens
    localStorage.setItem(TOKEN_STORAGE_KEY, JSON.stringify(newTokens));
    
    return newTokens.accessToken;
  } catch (error) {
    console.error('Error refreshing token:', error);
    clearAuth();
    return null;
  }
}

/**
 * 設置認證信息
 */
export function setAuth(tokens: AuthTokens, user: User): void {
  localStorage.setItem(TOKEN_STORAGE_KEY, JSON.stringify(tokens));
  localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
  
  // 觸發存儲事件，通知其他 tab
  window.dispatchEvent(new StorageEvent('storage', {
    key: TOKEN_STORAGE_KEY,
    newValue: JSON.stringify(tokens),
  }));
}

/**
 * 清除認證信息
 */
export function clearAuth(): void {
  localStorage.removeItem(TOKEN_STORAGE_KEY);
  localStorage.removeItem(USER_STORAGE_KEY);
  
  // 觸發存儲事件，通知其他 tab
  window.dispatchEvent(new StorageEvent('storage', {
    key: TOKEN_STORAGE_KEY,
    newValue: null,
  }));
}

/**
 * 獲取當前用戶信息
 */
export function getCurrentUser(): User | null {
  try {
    const storedUser = localStorage.getItem(USER_STORAGE_KEY);
    return storedUser ? JSON.parse(storedUser) : null;
  } catch (error) {
    console.error('Error getting current user:', error);
    return null;
  }
}

/**
 * 檢查用戶是否已登入
 */
export async function isAuthenticated(): Promise<boolean> {
  const token = await getAuthToken();
  return token !== null;
}

/**
 * 登入
 */
export async function login(credentials: LoginCredentials): Promise<User> {
  const response = await fetch('/api/auth/login', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(credentials),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Login failed');
  }

  const data = await response.json();
  
  const tokens: AuthTokens = {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresAt: Date.now() + (data.expires_in * 1000),
  };

  const user: User = data.user;
  
  setAuth(tokens, user);
  return user;
}

/**
 * 登出
 */
export async function logout(): Promise<void> {
  try {
    const token = await getAuthToken();
    if (token) {
      // 通知後端登出
      await fetch('/api/auth/logout', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
    }
  } catch (error) {
    console.error('Error during logout:', error);
  } finally {
    clearAuth();
  }
}

/**
 * 監聽認證狀態變化
 */
export function onAuthStateChanged(callback: (isAuthenticated: boolean) => void): () => void {
  const handleStorageChange = (event: StorageEvent) => {
    if (event.key === TOKEN_STORAGE_KEY) {
      const isAuth = event.newValue !== null;
      callback(isAuth);
    }
  };

  window.addEventListener('storage', handleStorageChange);
  
  // 返回清理函數
  return () => {
    window.removeEventListener('storage', handleStorageChange);
  };
}