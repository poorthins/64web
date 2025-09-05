/**
 * 認證服務 - 重新導出現有的 authService
 */
export {
  getAuthToken,
  refreshAuthToken,
  clearAuth,
  isAuthenticated,
  getCurrentUser,
  login,
  logout,
  onAuthStateChanged,
  setAuth,
  type AuthTokens,
  type LoginCredentials,
  type User
} from '@/services/authService';
