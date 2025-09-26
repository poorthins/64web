import { useState, useEffect } from 'react'
import { 
  Users, FileText, CheckCircle, XCircle, AlertTriangle, Eye, ChevronRight, 
  Clock, Calendar, Filter, Search, RefreshCw, Download, FileCheck, 
  MessageSquare, User, Calendar as CalendarIcon
} from 'lucide-react'
import { 
  getPendingReviewEntries, 
  getReviewedEntries, 
  getUsersWithPendingEntries,
  reviewEntry,
  bulkReviewEntries,
  PendingReviewEntry,
  ReviewedEntry,
  ReviewFilters
} from '../../api/reviewEnhancements'

interface EnhancedSubmissionManagementProps {
  onViewUserSubmissions?: (userId: string, userName: string) => void
}

type ViewMode = 'overview' | 'pending' | 'reviewed'

const EnhancedSubmissionManagement: React.FC<EnhancedSubmissionManagementProps> = ({ 
  onViewUserSubmissions 
}) => {
  // 狀態管理
  const [viewMode, setViewMode] = useState<ViewMode>('overview')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // 數據狀態
  const [pendingEntries, setPendingEntries] = useState<PendingReviewEntry[]>([])
  const [reviewedEntries, setReviewedEntries] = useState<ReviewedEntry[]>([])
  const [usersWithPending, setUsersWithPending] = useState<Array<{
    id: string
    display_name: string
    email?: string
    pending_count: number
  }>>([])
  
  // 篩選狀態
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedUserId, setSelectedUserId] = useState<string>('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'approved' | 'rejected'>('all')
  const [categoryFilter, setCategoryFilter] = useState<string>('')
  
  // 審核狀態
  const [selectedEntries, setSelectedEntries] = useState<Set<string>>(new Set())
  const [reviewingEntries, setReviewingEntries] = useState<Set<string>>(new Set())
  const [reviewNotes, setReviewNotes] = useState<string>('')
  const [showBulkReviewModal, setShowBulkReviewModal] = useState(false)
  const [bulkAction, setBulkAction] = useState<'approve' | 'reject'>('approve')

  // 載入數據
  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const [pending, reviewed, users] = await Promise.all([
        getPendingReviewEntries(),
        getReviewedEntries(),
        getUsersWithPendingEntries()
      ])
      
      setPendingEntries(pending)
      setReviewedEntries(reviewed)
      setUsersWithPending(users)
    } catch (error) {
      console.error('Error fetching data:', error)
      setError(error instanceof Error ? error.message : '載入資料失敗')
    } finally {
      setLoading(false)
    }
  }

  // 單個審核操作
  const handleReviewEntry = async (entryId: string, action: 'approve' | 'reject', notes?: string) => {
    try {
      setReviewingEntries(prev => new Set([...prev, entryId]))
      await reviewEntry(entryId, action, notes)
      await fetchData() // 重新載入數據
    } catch (error) {
      console.error('Review failed:', error)
      setError(error instanceof Error ? error.message : '審核操作失敗')
    } finally {
      setReviewingEntries(prev => {
        const newSet = new Set(prev)
        newSet.delete(entryId)
        return newSet
      })
    }
  }

  // 批量審核操作
  const handleBulkReview = async () => {
    if (selectedEntries.size === 0) return
    
    try {
      setLoading(true)
      await bulkReviewEntries(Array.from(selectedEntries), bulkAction, reviewNotes)
      setSelectedEntries(new Set())
      setReviewNotes('')
      setShowBulkReviewModal(false)
      await fetchData()
    } catch (error) {
      console.error('Bulk review failed:', error)
      setError(error instanceof Error ? error.message : '批量審核操作失敗')
    } finally {
      setLoading(false)
    }
  }

  // 篩選邏輯
  const getFilteredPendingEntries = () => {
    return pendingEntries.filter(entry => {
      const matchesSearch = entry.owner.display_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           entry.category.toLowerCase().includes(searchTerm.toLowerCase())
      const matchesUser = !selectedUserId || entry.owner_id === selectedUserId
      const matchesCategory = !categoryFilter || entry.category === categoryFilter
      
      return matchesSearch && matchesUser && matchesCategory
    })
  }

  const getFilteredReviewedEntries = () => {
    return reviewedEntries.filter(entry => {
      const matchesSearch = entry.owner.display_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           entry.category.toLowerCase().includes(searchTerm.toLowerCase())
      const matchesUser = !selectedUserId || entry.owner_id === selectedUserId
      const matchesStatus = statusFilter === 'all' || entry.status === statusFilter
      const matchesCategory = !categoryFilter || entry.category === categoryFilter
      
      return matchesSearch && matchesUser && matchesStatus && matchesCategory
    })
  }

  // 獲取統計數據
  const getStats = () => {
    const totalPending = pendingEntries.length
    const totalApproved = reviewedEntries.filter(e => e.status === 'approved').length
    const totalRejected = reviewedEntries.filter(e => e.status === 'rejected').length
    const totalUsers = usersWithPending.length
    
    return { totalPending, totalApproved, totalRejected, totalUsers }
  }

  const stats = getStats()

  if (loading && pendingEntries.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="flex items-center space-x-2">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="text-gray-600">載入審核資料中...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* 統計卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-yellow-50 rounded-lg p-4">
          <div className="flex items-center">
            <Clock className="h-8 w-8 text-yellow-600" />
            <div className="ml-4">
              <div className="text-2xl font-bold text-yellow-900">{stats.totalPending}</div>
              <div className="text-yellow-600">待審核項目</div>
            </div>
          </div>
        </div>
        <div className="bg-green-50 rounded-lg p-4">
          <div className="flex items-center">
            <CheckCircle className="h-8 w-8 text-green-600" />
            <div className="ml-4">
              <div className="text-2xl font-bold text-green-900">{stats.totalApproved}</div>
              <div className="text-green-600">已通過</div>
            </div>
          </div>
        </div>
        <div className="bg-red-50 rounded-lg p-4">
          <div className="flex items-center">
            <XCircle className="h-8 w-8 text-red-600" />
            <div className="ml-4">
              <div className="text-2xl font-bold text-red-900">{stats.totalRejected}</div>
              <div className="text-red-600">已退回</div>
            </div>
          </div>
        </div>
        <div className="bg-blue-50 rounded-lg p-4">
          <div className="flex items-center">
            <Users className="h-8 w-8 text-blue-600" />
            <div className="ml-4">
              <div className="text-2xl font-bold text-blue-900">{stats.totalUsers}</div>
              <div className="text-blue-600">待審用戶</div>
            </div>
          </div>
        </div>
      </div>

      {/* 錯誤訊息 */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center">
            <AlertTriangle className="w-5 h-5 text-red-500 mr-2" />
            <div className="flex-1">
              <h3 className="text-sm font-medium text-red-800">操作失敗</h3>
              <p className="text-sm text-red-700 mt-1">{error}</p>
            </div>
            <button
              onClick={() => setError(null)}
              className="ml-4 px-3 py-1 bg-red-100 hover:bg-red-200 text-red-800 text-sm rounded-md transition-colors"
            >
              關閉
            </button>
          </div>
        </div>
      )}

      {/* 主要內容區域 */}
      <div className="bg-white rounded-lg border border-gray-200">
        {/* 標籤導航 */}
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6" aria-label="Tabs">
            <button
              onClick={() => setViewMode('overview')}
              className={`flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                viewMode === 'overview'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <Users className="w-4 h-4" />
              <span>用戶總覽</span>
              {stats.totalUsers > 0 && (
                <span className="bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded-full">
                  {stats.totalUsers}
                </span>
              )}
            </button>
            
            <button
              onClick={() => setViewMode('pending')}
              className={`flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                viewMode === 'pending'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <Clock className="w-4 h-4" />
              <span>待審核項目</span>
              {stats.totalPending > 0 && (
                <span className="bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded-full">
                  {stats.totalPending}
                </span>
              )}
            </button>
            
            <button
              onClick={() => setViewMode('reviewed')}
              className={`flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                viewMode === 'reviewed'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <FileCheck className="w-4 h-4" />
              <span>審核歷史</span>
              <span className="bg-gray-100 text-gray-800 text-xs px-2 py-1 rounded-full">
                {stats.totalApproved + stats.totalRejected}
              </span>
            </button>
          </nav>
        </div>

        {/* 內容區域 */}
        <div className="p-6">
          {viewMode === 'overview' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium">有待審項目的用戶</h3>
                <button
                  onClick={fetchData}
                  disabled={loading}
                  className="flex items-center space-x-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                  <span>重新載入</span>
                </button>
              </div>
              
              {usersWithPending.map(user => (
                <div
                  key={user.id}
                  className="border rounded-lg p-4 hover:shadow-md transition-all cursor-pointer"
                  onClick={() => onViewUserSubmissions?.(user.id, user.display_name)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <User className="w-8 h-8 text-gray-400" />
                      <div>
                        <h4 className="font-medium text-gray-900">{user.display_name}</h4>
                        <p className="text-sm text-gray-500">{user.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-4">
                      <div className="text-center">
                        <div className="text-lg font-bold text-yellow-600">{user.pending_count}</div>
                        <div className="text-xs text-gray-500">待審核</div>
                      </div>
                      <ChevronRight className="w-5 h-5 text-gray-400" />
                    </div>
                  </div>
                </div>
              ))}
              
              {usersWithPending.length === 0 && (
                <div className="text-center py-12">
                  <Users className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900">目前沒有待審核項目</h3>
                  <p className="mt-1 text-sm text-gray-500">所有提交的項目都已完成審核</p>
                </div>
              )}
            </div>
          )}

          {viewMode === 'pending' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium">待審核項目</h3>
                <div className="flex space-x-2">
                  {selectedEntries.size > 0 && (
                    <button
                      onClick={() => setShowBulkReviewModal(true)}
                      className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                      批量審核 ({selectedEntries.size})
                    </button>
                  )}
                  <button
                    onClick={fetchData}
                    disabled={loading}
                    className="flex items-center space-x-2 px-3 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50"
                  >
                    <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                    <span>重新載入</span>
                  </button>
                </div>
              </div>

              {/* 篩選控制 */}
              <div className="flex space-x-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <input
                    type="text"
                    placeholder="搜尋用戶或類別..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <select
                  value={selectedUserId}
                  onChange={(e) => setSelectedUserId(e.target.value)}
                  className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">所有用戶</option>
                  {usersWithPending.map(user => (
                    <option key={user.id} value={user.id}>{user.display_name}</option>
                  ))}
                </select>
              </div>

              {/* 待審核項目列表 */}
              <div className="space-y-3">
                {getFilteredPendingEntries().map(entry => (
                  <div key={entry.id} className="border rounded-lg p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-3">
                        <input
                          type="checkbox"
                          checked={selectedEntries.has(entry.id)}
                          onChange={(e) => {
                            const newSelected = new Set(selectedEntries)
                            if (e.target.checked) {
                              newSelected.add(entry.id)
                            } else {
                              newSelected.delete(entry.id)
                            }
                            setSelectedEntries(newSelected)
                          }}
                          className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                        <div className="flex-1">
                          <div className="flex items-center space-x-2">
                            <h4 className="font-medium text-gray-900">{entry.owner.display_name}</h4>
                            <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                              {entry.category}
                            </span>
                          </div>
                          <p className="text-sm text-gray-500 mt-1">
                            {entry.period_year}年 • {entry.amount} {entry.unit}
                          </p>
                          <p className="text-xs text-gray-400 mt-1">
                            提交時間: {new Date(entry.created_at).toLocaleString()}
                          </p>
                          {entry.evidence_files.length > 0 && (
                            <p className="text-xs text-gray-500 mt-1">
                              📎 {entry.evidence_files.length} 個附件
                            </p>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleReviewEntry(entry.id, 'approve')}
                          disabled={reviewingEntries.has(entry.id)}
                          className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700 disabled:opacity-50"
                        >
                          {reviewingEntries.has(entry.id) ? '處理中...' : '通過'}
                        </button>
                        <button
                          onClick={() => handleReviewEntry(entry.id, 'reject')}
                          disabled={reviewingEntries.has(entry.id)}
                          className="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700 disabled:opacity-50"
                        >
                          {reviewingEntries.has(entry.id) ? '處理中...' : '退回'}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {getFilteredPendingEntries().length === 0 && (
                <div className="text-center py-12">
                  <Clock className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900">沒有待審核項目</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    {searchTerm || selectedUserId ? '沒有符合篩選條件的項目' : '目前沒有需要審核的項目'}
                  </p>
                </div>
              )}
            </div>
          )}

          {viewMode === 'reviewed' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium">審核歷史</h3>
                <button
                  onClick={fetchData}
                  disabled={loading}
                  className="flex items-center space-x-2 px-3 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50"
                >
                  <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                  <span>重新載入</span>
                </button>
              </div>

              {/* 篩選控制 */}
              <div className="flex space-x-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <input
                    type="text"
                    placeholder="搜尋用戶或類別..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
                  className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">所有狀態</option>
                  <option value="approved">已通過</option>
                  <option value="rejected">已退回</option>
                </select>
              </div>

              {/* 已審核項目列表 */}
              <div className="space-y-3">
                {getFilteredReviewedEntries().map(entry => (
                  <div key={entry.id} className="border rounded-lg p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2">
                          <h4 className="font-medium text-gray-900">{entry.owner.display_name}</h4>
                          <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                            {entry.category}
                          </span>
                          <span className={`px-2 py-1 text-xs rounded-full ${
                            entry.status === 'approved' 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {entry.status === 'approved' ? '已通過' : '已退回'}
                          </span>
                        </div>
                        <p className="text-sm text-gray-500 mt-1">
                          {entry.period_year}年 • {entry.amount} {entry.unit}
                        </p>
                        <div className="flex items-center space-x-4 text-xs text-gray-400 mt-2">
                          <span>審核者: {entry.reviewer.display_name}</span>
                          <span>審核時間: {new Date(entry.reviewed_at).toLocaleString()}</span>
                        </div>
                        {entry.review_notes && (
                          <div className="mt-2 p-2 bg-gray-50 rounded text-sm">
                            <MessageSquare className="w-4 h-4 inline mr-1" />
                            {entry.review_notes}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {getFilteredReviewedEntries().length === 0 && (
                <div className="text-center py-12">
                  <FileCheck className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900">沒有審核記錄</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    {searchTerm || statusFilter !== 'all' ? '沒有符合篩選條件的記錄' : '尚未有任何審核記錄'}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* 批量審核模態框 */}
      {showBulkReviewModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-medium mb-4">批量審核</h3>
            <p className="text-sm text-gray-600 mb-4">
              您即將對 {selectedEntries.size} 個項目執行批量審核操作
            </p>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  審核動作
                </label>
                <select
                  value={bulkAction}
                  onChange={(e) => setBulkAction(e.target.value as 'approve' | 'reject')}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
                >
                  <option value="approve">通過</option>
                  <option value="reject">退回</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  審核備註 (選填)
                </label>
                <textarea
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value)}
                  placeholder="請輸入審核備註..."
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
                  rows={3}
                />
              </div>
            </div>
            
            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => setShowBulkReviewModal(false)}
                className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                取消
              </button>
              <button
                onClick={handleBulkReview}
                disabled={loading}
                className={`px-4 py-2 text-white rounded-lg disabled:opacity-50 ${
                  bulkAction === 'approve' 
                    ? 'bg-green-600 hover:bg-green-700' 
                    : 'bg-red-600 hover:bg-red-700'
                }`}
              >
                {loading ? '處理中...' : `確認${bulkAction === 'approve' ? '通過' : '退回'}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default EnhancedSubmissionManagement
