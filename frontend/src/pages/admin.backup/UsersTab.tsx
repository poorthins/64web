import { useState, useEffect } from 'react'
import { Eye, Search, Users, UserCheck, UserX, AlertCircle, Loader2, Edit, ToggleLeft, ToggleRight } from 'lucide-react'
import { combineUsersWithCounts, bulkUpdateUserStatus, updateUserStatus, User } from '../../api/adminUsers'
import UserEditModal from '../../components/UserEditModal'

interface UsersTabProps {
  onViewUserEntries: (userId: string, userName: string) => void
}

const UsersTab: React.FC<UsersTabProps> = ({ onViewUserEntries }) => {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set())
  const [bulkUpdating, setBulkUpdating] = useState(false)
  const [editingUserId, setEditingUserId] = useState<string | null>(null)
  const [togglingUsers, setTogglingUsers] = useState<Set<string>>(new Set())

  useEffect(() => {
    fetchUsers()
  }, [])

  const fetchUsers = async () => {
    try {
      setLoading(true)
      setError(null)
      const usersData = await combineUsersWithCounts()
      setUsers(usersData)
    } catch (error) {
      console.error('Error fetching users:', error)
      setError(error instanceof Error ? error.message : '載入使用者列表失敗')
    } finally {
      setLoading(false)
    }
  }

  const filteredUsers = users.filter(user =>
    user.display_name?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const handleSelectUser = (userId: string) => {
    const newSelected = new Set(selectedUsers)
    if (newSelected.has(userId)) {
      newSelected.delete(userId)
    } else {
      newSelected.add(userId)
    }
    setSelectedUsers(newSelected)
  }

  const handleSelectAll = () => {
    if (selectedUsers.size === filteredUsers.length) {
      setSelectedUsers(new Set())
    } else {
      setSelectedUsers(new Set(filteredUsers.map(user => user.id)))
    }
  }

  const handleBulkUpdate = async (isActive: boolean) => {
    if (selectedUsers.size === 0) {
      alert('請選擇要更新的用戶')
      return
    }

    try {
      setBulkUpdating(true)
      await bulkUpdateUserStatus(Array.from(selectedUsers), isActive)
      
      // 重新載入用戶列表
      await fetchUsers()
      setSelectedUsers(new Set())
      alert(`成功${isActive ? '啟用' : '停用'} ${selectedUsers.size} 個用戶`)
    } catch (error) {
      console.error('Error updating users:', error)
      alert(`更新用戶狀態時發生錯誤: ${error instanceof Error ? error.message : '未知錯誤'}`)
    } finally {
      setBulkUpdating(false)
    }
  }

  const handleViewUser = (userId: string, userName: string) => {
    // 導向使用者詳情頁
    window.location.href = `/app/admin/users/${userId}`
  }

  const handleEditUser = (userId: string) => {
    setEditingUserId(userId)
  }

  const handleEditSuccess = () => {
    fetchUsers() // 重新載入用戶列表
  }

  const handleToggleUserStatus = async (userId: string, currentStatus: boolean) => {
    try {
      setTogglingUsers(prev => new Set([...prev, userId]))
      await updateUserStatus(userId, !currentStatus)
      await fetchUsers()
    } catch (error) {
      console.error('Error toggling user status:', error)
      alert(`更新用戶狀態時發生錯誤: ${error instanceof Error ? error.message : '未知錯誤'}`)
    } finally {
      setTogglingUsers(prev => {
        const newSet = new Set(prev)
        newSet.delete(userId)
        return newSet
      })
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="flex items-center space-x-2">
          <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
          <span className="text-gray-600">載入使用者列表中...</span>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <div className="flex items-center">
          <AlertCircle className="w-5 h-5 text-red-500 mr-2" />
          <div className="flex-1">
            <h3 className="text-sm font-medium text-red-800">載入使用者列表時發生錯誤</h3>
            <p className="text-sm text-red-700 mt-1">{error}</p>
          </div>
          <button
            onClick={fetchUsers}
            className="ml-4 px-3 py-1 bg-red-100 hover:bg-red-200 text-red-800 text-sm rounded-md transition-colors"
          >
            重試
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-blue-50 rounded-lg p-4">
          <div className="flex items-center">
            <Users className="h-8 w-8 text-blue-600" />
            <div className="ml-4">
              <div className="text-2xl font-bold text-blue-900">{users.length}</div>
              <div className="text-blue-600">總使用者數</div>
            </div>
          </div>
        </div>
        <div className="bg-green-50 rounded-lg p-4">
          <div className="flex items-center">
            <UserCheck className="h-8 w-8 text-green-600" />
            <div className="ml-4">
              <div className="text-2xl font-bold text-green-900">
                {users.filter(u => u.is_active).length}
              </div>
              <div className="text-green-600">活躍使用者</div>
            </div>
          </div>
        </div>
        <div className="bg-red-50 rounded-lg p-4">
          <div className="flex items-center">
            <UserX className="h-8 w-8 text-red-600" />
            <div className="ml-4">
              <div className="text-2xl font-bold text-red-900">
                {users.filter(u => !u.is_active).length}
              </div>
              <div className="text-red-600">停用使用者</div>
            </div>
          </div>
        </div>
      </div>

      {/* Search and Actions */}
      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <input
            type="text"
            placeholder="搜尋用戶名稱..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        
        <div className="flex gap-2">
          <button
            onClick={() => handleBulkUpdate(true)}
            disabled={selectedUsers.size === 0 || bulkUpdating}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {bulkUpdating ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <UserCheck className="h-4 w-4" />
            )}
            啟用 ({selectedUsers.size})
          </button>
          <button
            onClick={() => handleBulkUpdate(false)}
            disabled={selectedUsers.size === 0 || bulkUpdating}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {bulkUpdating ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <UserX className="h-4 w-4" />
            )}
            停用 ({selectedUsers.size})
          </button>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left">
                  <input
                    type="checkbox"
                    checked={selectedUsers.size === filteredUsers.length && filteredUsers.length > 0}
                    onChange={handleSelectAll}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  使用者
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  角色
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  狀態
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  填報數量
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  操作
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredUsers.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <input
                      type="checkbox"
                      checked={selectedUsers.has(user.id)}
                      onChange={() => handleSelectUser(user.id)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <button
                      onClick={() => handleEditUser(user.id)}
                      className="text-sm font-medium text-blue-600 hover:text-blue-900 hover:underline text-left"
                    >
                      {user.display_name || 'N/A'}
                    </button>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      user.role === 'admin' 
                        ? 'bg-red-100 text-red-800' 
                        : 'bg-blue-100 text-blue-800'
                    }`}>
                      {user.role === 'admin' ? '管理員' : '使用者'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <button
                      onClick={() => handleToggleUserStatus(user.id, user.is_active)}
                      disabled={togglingUsers.has(user.id)}
                      className={`inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full transition-colors hover:opacity-80 disabled:opacity-50 ${
                        user.is_active 
                          ? 'bg-green-100 text-green-800 hover:bg-green-200' 
                          : 'bg-red-100 text-red-800 hover:bg-red-200'
                      }`}
                    >
                      {togglingUsers.has(user.id) ? (
                        <Loader2 className="h-3 w-3 animate-spin mr-1" />
                      ) : user.is_active ? (
                        <ToggleRight className="h-3 w-3 mr-1" />
                      ) : (
                        <ToggleLeft className="h-3 w-3 mr-1" />
                      )}
                      {user.is_active ? '啟用' : '停用'}
                    </button>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <span className="font-medium">{user.entries_count}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleEditUser(user.id)}
                        className="text-blue-600 hover:text-blue-900 flex items-center gap-1"
                        title="編輯用戶資料"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleViewUser(user.id, user.display_name)}
                        className="text-gray-600 hover:text-gray-900 flex items-center gap-1"
                        title="查看詳細資料"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => onViewUserEntries(user.id, user.display_name || 'N/A')}
                        className="text-green-600 hover:text-green-900 flex items-center gap-1"
                        title="查看填報記錄"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {filteredUsers.length === 0 && (
        <div className="text-center py-12">
          <Users className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">沒有找到用戶</h3>
          <p className="mt-1 text-sm text-gray-500">
            {searchTerm ? '嘗試調整搜尋條件' : '系統中暫無用戶'}
          </p>
        </div>
      )}

      {/* Edit User Modal */}
      {editingUserId && (
        <UserEditModal
          userId={editingUserId}
          isOpen={true}
          onClose={() => setEditingUserId(null)}
          onSuccess={handleEditSuccess}
        />
      )}
    </div>
  )
}

export default UsersTab
