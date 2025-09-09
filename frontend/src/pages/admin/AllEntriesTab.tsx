import { useState, useEffect } from 'react'
import { Calendar, Users, Eye, ChevronRight, CheckCircle, XCircle, AlertTriangle, Loader2, Filter, Search } from 'lucide-react'
import { getAllUsersWithSubmissions, getSubmissionStats, UserWithSubmissions, SubmissionStats } from '../../api/adminSubmissions'

interface AllEntriesTabProps {
  onViewUserSubmissions?: (userId: string, userName: string) => void
}

const AllEntriesTab: React.FC<AllEntriesTabProps> = ({ onViewUserSubmissions }) => {
  const [users, setUsers] = useState<UserWithSubmissions[]>([])
  const [stats, setStats] = useState<SubmissionStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'approved' | 'needs_fix'>('all')
  const [activeFilter, setActiveFilter] = useState<'all' | 'active' | 'inactive'>('all')

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      setLoading(true)
      setError(null)
      const [usersData, statsData] = await Promise.all([
        getAllUsersWithSubmissions(),
        getSubmissionStats()
      ])
      setUsers(usersData)
      setStats(statsData)
    } catch (error) {
      console.error('Error fetching data:', error)
      setError(error instanceof Error ? error.message : '載入資料失敗')
    } finally {
      setLoading(false)
    }
  }

  const filteredUsers = users.filter(user => {
    // 搜尋過濾
    const matchesSearch = user.display_name.toLowerCase().includes(searchTerm.toLowerCase())
    
    // 狀態過濾
    const matchesActiveFilter = activeFilter === 'all' || 
      (activeFilter === 'active' && user.is_active) ||
      (activeFilter === 'inactive' && !user.is_active)
    
    // 審核狀態過濾
    let matchesStatusFilter = true
    if (statusFilter !== 'all') {
      if (statusFilter === 'pending' && user.pending_reviews === 0) matchesStatusFilter = false
      if (statusFilter === 'approved' && user.approved_reviews === 0) matchesStatusFilter = false
      if (statusFilter === 'needs_fix' && user.needs_fix_reviews === 0) matchesStatusFilter = false
    }

    return matchesSearch && matchesActiveFilter && matchesStatusFilter
  })

  const handleViewUserSubmissions = (userId: string, userName: string) => {
    if (onViewUserSubmissions) {
      onViewUserSubmissions(userId, userName)
    } else {
      // 預設行為：導向用戶填報頁面
      window.location.href = `/app/admin/users/${userId}/entries`
    }
  }

  const getStatusBadge = (user: UserWithSubmissions) => {
    if (user.submission_count === 0) {
      return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-800">無填報</span>
    }

    const badges = []
    if (user.pending_reviews > 0) {
      badges.push(
        <span key="pending" className="px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800">
          待審 {user.pending_reviews}
        </span>
      )
    }
    if (user.approved_reviews > 0) {
      badges.push(
        <span key="approved" className="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
          已核准 {user.approved_reviews}
        </span>
      )
    }
    if (user.needs_fix_reviews > 0) {
      badges.push(
        <span key="needs_fix" className="px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">
          需修正 {user.needs_fix_reviews}
        </span>
      )
    }

    return <div className="flex gap-1 flex-wrap">{badges}</div>
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="flex items-center space-x-2">
          <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
          <span className="text-gray-600">載入用戶填報資料中...</span>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <div className="flex items-center">
          <AlertTriangle className="w-5 h-5 text-red-500 mr-2" />
          <div className="flex-1">
            <h3 className="text-sm font-medium text-red-800">載入資料時發生錯誤</h3>
            <p className="text-sm text-red-700 mt-1">{error}</p>
          </div>
          <button
            onClick={fetchData}
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
      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-blue-50 rounded-lg p-4">
            <div className="flex items-center">
              <Users className="h-8 w-8 text-blue-600" />
              <div className="ml-4">
                <div className="text-2xl font-bold text-blue-900">{stats.total_users_with_submissions}</div>
                <div className="text-blue-600">填報用戶</div>
              </div>
            </div>
          </div>
          <div className="bg-yellow-50 rounded-lg p-4">
            <div className="flex items-center">
              <AlertTriangle className="h-8 w-8 text-yellow-600" />
              <div className="ml-4">
                <div className="text-2xl font-bold text-yellow-900">{stats.pending_reviews}</div>
                <div className="text-yellow-600">待審核</div>
              </div>
            </div>
          </div>
          <div className="bg-green-50 rounded-lg p-4">
            <div className="flex items-center">
              <CheckCircle className="h-8 w-8 text-green-600" />
              <div className="ml-4">
                <div className="text-2xl font-bold text-green-900">{stats.approved_reviews}</div>
                <div className="text-green-600">已核准</div>
              </div>
            </div>
          </div>
          <div className="bg-red-50 rounded-lg p-4">
            <div className="flex items-center">
              <XCircle className="h-8 w-8 text-red-600" />
              <div className="ml-4">
                <div className="text-2xl font-bold text-red-900">{stats.needs_fix_reviews}</div>
                <div className="text-red-600">需修正</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Header and Filters */}
      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-900">用戶填報總覽</h2>
        
        <div className="flex gap-4 items-center">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <input
              type="text"
              placeholder="搜尋用戶..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          
          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
            className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">全部狀態</option>
            <option value="pending">有待審核</option>
            <option value="approved">有已核准</option>
            <option value="needs_fix">有需修正</option>
          </select>
          
          {/* Active Filter */}
          <select
            value={activeFilter}
            onChange={(e) => setActiveFilter(e.target.value as typeof activeFilter)}
            className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">全部用戶</option>
            <option value="active">啟用用戶</option>
            <option value="inactive">停用用戶</option>
          </select>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  用戶
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  狀態
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  填報總數
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  審核狀況
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  最後填報
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
                    <div className="flex items-center">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {user.display_name || 'N/A'}
                        </div>
                        {user.email && (
                          <div className="text-sm text-gray-500">{user.email}</div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      user.is_active 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {user.is_active ? '啟用' : '停用'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {user.submission_count}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getStatusBadge(user)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {user.latest_submission_date 
                      ? new Date(user.latest_submission_date).toLocaleDateString()
                      : '-'
                    }
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button
                      onClick={() => handleViewUserSubmissions(user.id, user.display_name)}
                      className="inline-flex items-center text-blue-600 hover:text-blue-900"
                      disabled={user.submission_count === 0}
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      查看填報
                      <ChevronRight className="h-4 w-4 ml-1" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {filteredUsers.length === 0 && (
        <div className="text-center py-12">
          <Calendar className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">沒有找到符合條件的用戶</h3>
          <p className="mt-1 text-sm text-gray-500">
            {searchTerm || statusFilter !== 'all' || activeFilter !== 'all'
              ? '嘗試調整篩選條件'
              : '系統中尚無用戶填報記錄'
            }
          </p>
        </div>
      )}
    </div>
  )
}

export default AllEntriesTab