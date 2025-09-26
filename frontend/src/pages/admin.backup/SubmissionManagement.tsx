import { useState, useEffect } from 'react'
import { Users, FileText, CheckCircle, XCircle, AlertTriangle, Eye, ChevronRight, Clock, Calendar, Filter, Search } from 'lucide-react'
import { getAllUsersWithSubmissions, getSubmissionStats, UserWithSubmissions, SubmissionStats } from '../../api/adminSubmissions'

interface SubmissionManagementProps {
  onViewUserSubmissions: (userId: string, userName: string) => void
}

const SubmissionManagement: React.FC<SubmissionManagementProps> = ({ onViewUserSubmissions }) => {
  const [users, setUsers] = useState<UserWithSubmissions[]>([])
  const [stats, setStats] = useState<SubmissionStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // 篩選狀態
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'approved' | 'needs_fix' | 'no_submissions'>('all')
  const [completionFilter, setCompletionFilter] = useState<'all' | 'complete' | 'incomplete'>('all')

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
    const matchesSearch = user.display_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.email?.toLowerCase().includes(searchTerm.toLowerCase())
    
    // 審核狀態過濾
    let matchesStatusFilter = true
    if (statusFilter !== 'all') {
      switch (statusFilter) {
        case 'pending':
          matchesStatusFilter = user.pending_reviews > 0
          break
        case 'approved':
          matchesStatusFilter = user.approved_reviews > 0
          break
        case 'needs_fix':
          matchesStatusFilter = user.needs_fix_reviews > 0
          break
        case 'no_submissions':
          matchesStatusFilter = user.submission_count === 0
          break
      }
    }

    // 完成度過濾
    let matchesCompletionFilter = true
    if (completionFilter !== 'all') {
      const completionRate = user.submission_count > 0 ? (user.approved_reviews / user.submission_count) : 0
      if (completionFilter === 'complete') {
        matchesCompletionFilter = completionRate >= 0.8 // 80% 以上算完成
      } else if (completionFilter === 'incomplete') {
        matchesCompletionFilter = completionRate < 0.8
      }
    }

    return matchesSearch && matchesStatusFilter && matchesCompletionFilter
  })

  const getCompletionRate = (user: UserWithSubmissions) => {
    if (user.submission_count === 0) return 0
    return Math.round((user.approved_reviews / user.submission_count) * 100)
  }

  const getCompletionStatus = (user: UserWithSubmissions) => {
    if (user.submission_count === 0) {
      return { 
        text: '未開始', 
        color: 'bg-gray-100 text-gray-800',
        icon: <Clock className="h-4 w-4" />
      }
    }

    const rate = getCompletionRate(user)
    
    if (rate >= 100) {
      return { 
        text: '已完成', 
        color: 'bg-green-100 text-green-800',
        icon: <CheckCircle className="h-4 w-4" />
      }
    } else if (rate >= 80) {
      return { 
        text: '近完成', 
        color: 'bg-blue-100 text-blue-800',
        icon: <AlertTriangle className="h-4 w-4" />
      }
    } else if (user.needs_fix_reviews > 0) {
      return { 
        text: '需修正', 
        color: 'bg-red-100 text-red-800',
        icon: <XCircle className="h-4 w-4" />
      }
    } else {
      return { 
        text: '進行中', 
        color: 'bg-yellow-100 text-yellow-800',
        icon: <Clock className="h-4 w-4" />
      }
    }
  }

  const getPriorityLevel = (user: UserWithSubmissions) => {
    if (user.needs_fix_reviews > 0) return 'high' // 有需要修正的項目
    if (user.pending_reviews > 0) return 'medium' // 有待審核的項目
    if (user.submission_count === 0) return 'low' // 未開始填報
    return 'normal'
  }

  const sortedUsers = [...filteredUsers].sort((a, b) => {
    // 依優先級排序
    const priorityOrder = { high: 0, medium: 1, normal: 2, low: 3 }
    const aPriority = getPriorityLevel(a)
    const bPriority = getPriorityLevel(b)
    
    if (aPriority !== bPriority) {
      return priorityOrder[aPriority] - priorityOrder[bPriority]
    }
    
    // 相同優先級時，依填報數量降序排列
    return b.submission_count - a.submission_count
  })

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="flex items-center space-x-2">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="text-gray-600">載入填報資料中...</span>
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
      {/* 統計卡片 */}
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
                <div className="text-green-600">已通過</div>
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

      {/* 頁面標題和篩選 */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">填報審核管理</h2>
            <p className="text-sm text-gray-600 mt-1">檢視和審核所有用戶的填報資料</p>
          </div>
          
          <div className="flex gap-3">
            {/* 搜尋 */}
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
            
            {/* 狀態篩選 */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
              className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">所有狀態</option>
              <option value="pending">有待審核</option>
              <option value="approved">有已通過</option>
              <option value="needs_fix">需要修正</option>
              <option value="no_submissions">未開始填報</option>
            </select>
            
            {/* 完成度篩選 */}
            <select
              value={completionFilter}
              onChange={(e) => setCompletionFilter(e.target.value as typeof completionFilter)}
              className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">所有完成度</option>
              <option value="complete">已完成 (≥80%)</option>
              <option value="incomplete">未完成 (&lt;80%)</option>
            </select>
          </div>
        </div>

        {/* 用戶列表 */}
        <div className="space-y-3">
          {sortedUsers.map((user) => {
            const completionStatus = getCompletionStatus(user)
            const priorityLevel = getPriorityLevel(user)
            
            return (
              <div 
                key={user.id} 
                className={`border rounded-lg p-4 hover:shadow-md transition-all cursor-pointer ${
                  priorityLevel === 'high' ? 'border-red-200 bg-red-50' :
                  priorityLevel === 'medium' ? 'border-yellow-200 bg-yellow-50' :
                  'border-gray-200 bg-white'
                }`}
                onClick={() => onViewUserSubmissions(user.id, user.display_name)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    {/* 優先級指示器 */}
                    {priorityLevel === 'high' && (
                      <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
                    )}
                    {priorityLevel === 'medium' && (
                      <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                    )}
                    {priorityLevel === 'low' && (
                      <div className="w-3 h-3 bg-gray-400 rounded-full"></div>
                    )}
                    
                    {/* 用戶資訊 */}
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium text-gray-900">{user.display_name}</h3>
                        <span className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded-full ${completionStatus.color}`}>
                          {completionStatus.icon}
                          <span className="ml-1">{completionStatus.text}</span>
                        </span>
                      </div>
                      <p className="text-sm text-gray-500">{user.email}</p>
                    </div>
                  </div>
                  
                  {/* 統計資訊 */}
                  <div className="flex items-center space-x-6 text-sm">
                    <div className="text-center">
                      <div className="font-medium text-gray-900">{user.submission_count}</div>
                      <div className="text-gray-500">總填報</div>
                    </div>
                    
                    {user.pending_reviews > 0 && (
                      <div className="text-center">
                        <div className="font-medium text-yellow-600">{user.pending_reviews}</div>
                        <div className="text-gray-500">待審</div>
                      </div>
                    )}
                    
                    {user.approved_reviews > 0 && (
                      <div className="text-center">
                        <div className="font-medium text-green-600">{user.approved_reviews}</div>
                        <div className="text-gray-500">已通過</div>
                      </div>
                    )}
                    
                    {user.needs_fix_reviews > 0 && (
                      <div className="text-center">
                        <div className="font-medium text-red-600">{user.needs_fix_reviews}</div>
                        <div className="text-gray-500">需修正</div>
                      </div>
                    )}
                    
                    {/* 完成率 */}
                    <div className="text-center">
                      <div className="font-medium text-gray-900">{getCompletionRate(user)}%</div>
                      <div className="text-gray-500">完成率</div>
                    </div>
                    
                    {/* 最後填報時間 */}
                    {user.latest_submission_date && (
                      <div className="text-center">
                        <div className="font-medium text-gray-900">
                          {new Date(user.latest_submission_date).toLocaleDateString()}
                        </div>
                        <div className="text-gray-500">最後填報</div>
                      </div>
                    )}
                    
                    <ChevronRight className="h-5 w-5 text-gray-400" />
                  </div>
                </div>
                
                {/* 進度條 */}
                {user.submission_count > 0 && (
                  <div className="mt-3">
                    <div className="flex justify-between text-xs text-gray-500 mb-1">
                      <span>審核進度</span>
                      <span>{getCompletionRate(user)}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full transition-all duration-300 ${
                          getCompletionRate(user) >= 100 ? 'bg-green-500' :
                          getCompletionRate(user) >= 80 ? 'bg-blue-500' :
                          user.needs_fix_reviews > 0 ? 'bg-red-500' :
                          'bg-yellow-500'
                        }`}
                        style={{ width: `${getCompletionRate(user)}%` }}
                      ></div>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {sortedUsers.length === 0 && (
          <div className="text-center py-12">
            <FileText className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">沒有找到符合條件的用戶</h3>
            <p className="mt-1 text-sm text-gray-500">
              {searchTerm || statusFilter !== 'all' || completionFilter !== 'all'
                ? '嘗試調整篩選條件'
                : '系統中尚無用戶填報記錄'
              }
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

export default SubmissionManagement