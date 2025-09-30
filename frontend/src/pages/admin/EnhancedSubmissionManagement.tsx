import { useState, useEffect } from 'react'
import { useSearchParams, useNavigate, useLocation } from 'react-router-dom'
import {
  Users, FileText, CheckCircle, XCircle, AlertTriangle, Eye, ChevronRight,
  Clock, Calendar, Filter, Search, RefreshCw, Download, FileCheck,
  MessageSquare, User, Calendar as CalendarIcon, ArrowLeft
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
import RejectModal from './components/RejectModal'

interface EnhancedSubmissionManagementProps {
  onViewUserSubmissions?: (userId: string, userName: string) => void
}

type ViewMode = 'overview' | 'pending' | 'reviewed'

const EnhancedSubmissionManagement: React.FC<EnhancedSubmissionManagementProps> = ({
  onViewUserSubmissions
}) => {
  // URL 參數讀取和導航
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const location = useLocation()

  // 從 URL 參數初始化狀態
  const getInitialViewMode = (): ViewMode => {
    const view = searchParams.get('view')
    if (view === 'pending' || view === 'reviewed' || view === 'overview') {
      return view
    }
    return 'overview'
  }

  const getInitialStatusFilter = (): 'all' | 'approved' | 'rejected' => {
    const status = searchParams.get('status')
    if (status === 'approved' || status === 'rejected') {
      return status
    }
    return 'all'
  }

  // 狀態管理
  const [viewMode, setViewMode] = useState<ViewMode>(getInitialViewMode())
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
  const [statusFilter, setStatusFilter] = useState<'all' | 'approved' | 'rejected'>(getInitialStatusFilter())
  const [categoryFilter, setCategoryFilter] = useState<string>('')
  
  // 審核狀態
  const [selectedEntries, setSelectedEntries] = useState<Set<string>>(new Set())
  const [reviewingEntries, setReviewingEntries] = useState<Set<string>>(new Set())
  const [reviewNotes, setReviewNotes] = useState<string>('')
  const [showBulkReviewModal, setShowBulkReviewModal] = useState(false)
  const [bulkAction, setBulkAction] = useState<'approve' | 'reject'>('approve')

  // 單個退回模態框
  const [showRejectModal, setShowRejectModal] = useState(false)
  const [selectedEntry, setSelectedEntry] = useState<PendingReviewEntry | null>(null)

  // 載入數據 - 每次進入頁面或 URL 參數變化時重新載入
  useEffect(() => {
    fetchData()
  }, [location.search]) // 當 URL 參數變化時重新載入

  // 監聽 URL 參數變化
  useEffect(() => {
    const newViewMode = getInitialViewMode()
    const newStatusFilter = getInitialStatusFilter()

    if (newViewMode !== viewMode) {
      setViewMode(newViewMode)
    }

    if (newStatusFilter !== statusFilter) {
      setStatusFilter(newStatusFilter)
    }
  }, [searchParams])

  const fetchData = async () => {
    try {
      setLoading(true)
      setError(null)

      console.log('🔄 [EnhancedSubmissionManagement] Reloading data...', {
        currentUrl: location.pathname + location.search,
        timestamp: new Date().toISOString()
      })

      const [pending, reviewed, users] = await Promise.all([
        getPendingReviewEntries(),
        getReviewedEntries(),
        getUsersWithPendingEntries()
      ])

      setPendingEntries(pending)
      setReviewedEntries(reviewed)
      setUsersWithPending(users)

      console.log('✅ [EnhancedSubmissionManagement] Data reloaded successfully:', {
        pendingCount: pending.length,
        reviewedCount: reviewed.length,
        usersCount: users.length
      })
    } catch (error) {
      console.error('❌ [EnhancedSubmissionManagement] Error fetching data:', error)
      setError(error instanceof Error ? error.message : '載入資料失敗')
    } finally {
      setLoading(false)
    }
  }

  // 頁面映射 - 根據類別決定填報頁面路徑
  const pageMap: Record<string, string> = {
    'WD-40': '/app/wd40',
    '柴油': '/app/diesel',
    '柴油(發電機)': '/app/diesel_generator',
    '汽油': '/app/gasoline',
    '天然氣': '/app/natural_gas',
    '液化石油氣': '/app/lpg',
    '乙炔': '/app/acetylene',
    '冷媒': '/app/refrigerant',
    '化糞池': '/app/septic_tank',
    '尿素': '/app/urea',
    '焊條': '/app/welding_rod',
    '滅火器': '/app/fire_extinguisher',
    '外購電力': '/app/electricity',
    '員工通勤': '/app/employee_commute'
  }

  // 查看填報詳情 - 導航到審核模式
  const handleViewSubmission = (entry: PendingReviewEntry | ReviewedEntry) => {
    console.log('🔍 準備導航到:', entry)
    console.log('📊 填報類別:', entry.category)

    const pagePath = pageMap[entry.category]
    console.log('🗺️ 頁面路徑映射:', pagePath)

    if (!pagePath) {
      console.error('❌ Unknown category:', entry.category)
      console.log('🗂️ 可用的類別映射:', Object.keys(pageMap))
      setError(`未知的填報類別: ${entry.category}`)
      return
    }

    // 修正 userId 欄位名稱
    const userId = entry.owner_id || entry.userId || entry.owner?.id
    const reviewUrl = `${pagePath}?mode=review&entryId=${entry.id}&userId=${userId}`

    console.log('🚀 導航 URL:', reviewUrl)
    console.log('👤 用戶 ID:', userId)

    try {
      navigate(reviewUrl)
      console.log('✅ 導航指令已發送')
    } catch (error) {
      console.error('❌ 導航失敗:', error)
      setError('導航失敗，請稍後重試')
    }
  }

  // 根據 URL 參數生成動態標題
  const getCurrentTitle = () => {
    const view = searchParams.get('view')
    const status = searchParams.get('status')

    if (view === 'pending') {
      return '待審核填報'
    } else if (view === 'reviewed') {
      switch (status) {
        case 'approved':
          return '已通過填報'
        case 'rejected':
          return '已退回填報'
        default:
          return '已審核填報'
      }
    } else {
      return '填報管理'
    }
  }

  // 通過操作
  const handleApprove = async (entryId: string) => {
    try {
      setReviewingEntries(prev => new Set([...prev, entryId]))
      await reviewEntry(entryId, 'approve')
      await fetchData() // 重新載入數據
    } catch (error) {
      console.error('Approve failed:', error)
      setError(error instanceof Error ? error.message : '通過審核失敗')
    } finally {
      setReviewingEntries(prev => {
        const newSet = new Set(prev)
        newSet.delete(entryId)
        return newSet
      })
    }
  }

  // 開啟退回模態框
  const handleRejectClick = (entry: PendingReviewEntry) => {
    setSelectedEntry(entry)
    setShowRejectModal(true)
  }

  // 確認退回操作
  const handleRejectConfirm = async (reason: string) => {
    if (!selectedEntry) return

    try {
      setReviewingEntries(prev => new Set([...prev, selectedEntry.id]))
      await reviewEntry(selectedEntry.id, 'reject', reason)
      await fetchData() // 重新載入數據
      setShowRejectModal(false)
      setSelectedEntry(null)
    } catch (error) {
      console.error('Reject failed:', error)
      setError(error instanceof Error ? error.message : '退回審核失敗')
    } finally {
      setReviewingEntries(prev => {
        const newSet = new Set(prev)
        newSet.delete(selectedEntry.id)
        return newSet
      })
    }
  }

  // 關閉退回模態框
  const handleRejectClose = () => {
    setShowRejectModal(false)
    setSelectedEntry(null)
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
      {/* 頂部標題區 */}
      <div className="mb-6 flex items-center gap-4">
        <button
          onClick={() => navigate('/app/admin')}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors duration-200 flex items-center justify-center"
          title="返回管理控制台"
        >
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900">
            {getCurrentTitle()}
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            {viewMode === 'pending' && '管理待審核的填報項目'}
            {viewMode === 'reviewed' && '查看已完成審核的項目'}
            {viewMode === 'overview' && '填報項目統計概覽'}
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={fetchData}
            disabled={loading}
            className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors duration-200 flex items-center space-x-1"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            <span className="text-sm">重新整理</span>
          </button>
        </div>
      </div>

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
                  <div
                    key={entry.id}
                    className="border rounded-lg p-4 cursor-pointer hover:bg-gray-50 hover:border-blue-300 transition-all duration-200"
                    onClick={() => handleViewSubmission(entry)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-3">
                        <input
                          type="checkbox"
                          checked={selectedEntries.has(entry.id)}
                          onChange={(e) => {
                            e.stopPropagation() // 防止觸發卡片點擊
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
                          onClick={(e) => {
                            e.stopPropagation() // 防止觸發卡片點擊
                            handleApprove(entry.id)
                          }}
                          disabled={reviewingEntries.has(entry.id)}
                          className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700 disabled:opacity-50"
                        >
                          {reviewingEntries.has(entry.id) ? '處理中...' : '通過'}
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation() // 防止觸發卡片點擊
                            handleRejectClick(entry)
                          }}
                          disabled={reviewingEntries.has(entry.id)}
                          className="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700 disabled:opacity-50"
                        >
                          {reviewingEntries.has(entry.id) ? '處理中...' : '退回'}
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation() // 防止觸發卡片點擊
                            handleViewSubmission(entry)
                          }}
                          className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 flex items-center space-x-1"
                        >
                          <Eye className="w-4 h-4" />
                          <span>查看詳情</span>
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
                  <div
                    key={entry.id}
                    className="border rounded-lg p-4 cursor-pointer hover:bg-gray-50 hover:border-blue-300 transition-all duration-200"
                    onClick={() => handleViewSubmission(entry)}
                  >
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

                      {/* 查看詳情按鈕 */}
                      <div className="flex space-x-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation() // 防止觸發卡片點擊
                            handleViewSubmission(entry)
                          }}
                          className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 flex items-center space-x-1"
                        >
                          <Eye className="w-4 h-4" />
                          <span>查看詳情</span>
                        </button>
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

      {/* 退回原因模態框 */}
      <RejectModal
        isOpen={showRejectModal}
        onClose={handleRejectClose}
        onConfirm={handleRejectConfirm}
        submissionInfo={selectedEntry ? {
          userName: selectedEntry.owner.display_name,
          categoryName: selectedEntry.category,
          amount: selectedEntry.amount,
          unit: selectedEntry.unit
        } : undefined}
      />
    </div>
  )
}

export default EnhancedSubmissionManagement
