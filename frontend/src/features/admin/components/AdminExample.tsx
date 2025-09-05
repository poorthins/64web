/**
 * 管理員範例組件 - 展示如何使用新的企業級架構
 */
import React, { useState, useEffect } from 'react';
import { ApiService, getErrorMessage } from '@/infrastructure/api/client';
import { ErrorBoundary } from '@/shared/components/ErrorBoundary';
import { AlertCircle, CheckCircle, Loader2 } from 'lucide-react';

interface User {
  id: string;
  email: string;
  display_name: string;
  role: string;
  company?: string;
  entries_count: number;
}

/**
 * 展示如何使用 API 客戶端的範例組件
 */
export function AdminExample() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // 載入用戶列表
  const loadUsers = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const data = await ApiService.get<{ users: User[] }>('/api/admin/users');
      setUsers(data.users);
      setSuccess('成功載入用戶列表');
    } catch (err) {
      const errorMessage = getErrorMessage(err);
      setError(errorMessage);
      console.error('Failed to load users:', err);
    } finally {
      setLoading(false);
    }
  };

  // 創建新用戶
  const createUser = async (email: string, displayName: string, company: string) => {
    setLoading(true);
    setError(null);
    setSuccess(null);
    
    try {
      await ApiService.post('/api/admin/create-user', {
        email,
        displayName,
        company,
      });
      
      setSuccess('成功創建新用戶');
      // 重新載入用戶列表
      await loadUsers();
    } catch (err) {
      const errorMessage = getErrorMessage(err);
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // 組件載入時獲取用戶列表
  useEffect(() => {
    loadUsers();
  }, []);

  return (
    <ErrorBoundary>
      <div className="p-6 max-w-6xl mx-auto">
        <h1 className="text-2xl font-bold mb-6">企業級架構範例 - 管理員面板</h1>
        
        {/* 狀態訊息 */}
        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-red-600" />
            <span className="text-red-800">{error}</span>
          </div>
        )}
        
        {success && (
          <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-md flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-green-600" />
            <span className="text-green-800">{success}</span>
          </div>
        )}

        {/* 創建用戶表單 */}
        <div className="mb-8 p-6 bg-white rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-4">創建新用戶</h2>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              createUser(
                formData.get('email') as string,
                formData.get('displayName') as string,
                formData.get('company') as string
              );
            }}
            className="space-y-4"
          >
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email
              </label>
              <input
                type="email"
                name="email"
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                顯示名稱
              </label>
              <input
                type="text"
                name="displayName"
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                公司
              </label>
              <input
                type="text"
                name="company"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              創建用戶
            </button>
          </form>
        </div>

        {/* 用戶列表 */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <h2 className="text-lg font-semibold p-6 border-b">用戶列表</h2>
          
          {loading && !users.length ? (
            <div className="p-6 text-center">
              <Loader2 className="w-8 h-8 animate-spin mx-auto text-gray-400" />
              <p className="mt-2 text-gray-600">載入中...</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Email
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      顯示名稱
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      角色
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      公司
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      填報數量
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {users.map((user) => (
                    <tr key={user.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {user.email}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {user.display_name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          user.role === 'admin' 
                            ? 'bg-purple-100 text-purple-800' 
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {user.role}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {user.company || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {user.entries_count}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* 架構特點說明 */}
        <div className="mt-8 p-6 bg-blue-50 rounded-lg">
          <h3 className="text-lg font-semibold mb-3">企業級架構特點：</h3>
          <ul className="space-y-2 text-sm">
            <li>✅ 統一的 API 客戶端處理所有 HTTP 請求</li>
            <li>✅ 自動的錯誤處理和重試機制</li>
            <li>✅ 錯誤邊界組件捕獲並優雅處理錯誤</li>
            <li>✅ TypeScript 類型安全</li>
            <li>✅ 模塊化的功能組織結構</li>
            <li>✅ 可重用的共享組件</li>
            <li>✅ 統一的錯誤訊息處理</li>
            <li>✅ 請求追蹤和日誌記錄（開發環境）</li>
          </ul>
        </div>
      </div>
    </ErrorBoundary>
  );
}

export default AdminExample;
