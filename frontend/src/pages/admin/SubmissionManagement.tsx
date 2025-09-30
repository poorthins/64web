import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Users, FileText, CheckCircle, XCircle, AlertTriangle, Search, Calendar, Filter, Eye, RefreshCw, Plus } from 'lucide-react'
import {
  getPendingReviewEntries,
  getReviewedEntries,
  reviewEntry,
  PendingReviewEntry,
  ReviewedEntry
} from '../../api/reviewEnhancements'
import {
  getAllUsersWithSubmissions,
  UserWithSubmissions
} from '../../api/adminSubmissions'
import { listUsers, UserProfile } from '../../api/adminUsers'
import RejectModal from './components/RejectModal'
import { supabase } from '../../lib/supabaseClient'
import { toast } from 'react-hot-toast'

interface SubmissionManagementProps {
  onViewUserSubmissions?: (userId: string, userName: string) => void
}

// 能源類別列表
const energyCategories = [
  { id: 'wd40', name: 'WD-40' },
  { id: 'acetylene', name: '乙炔' },
  { id: 'refrigerant', name: '冷媒' },
  { id: 'septic_tank', name: '化糞池' }, // Fixed: unified page_key to 'septic_tank'
  { id: 'natural_gas', name: '天然氣' },
  { id: 'urea', name: '尿素' },
  { id: 'diesel_generator', name: '柴油(發電機)' },
  { id: 'diesel', name: '柴油' },
  { id: 'gasoline', name: '汽油' },
  { id: 'lpg', name: '液化石油氣' },
  { id: 'fire_extinguisher', name: '滅火器' },
  { id: 'welding_rod', name: '焊條' },
  { id: 'electricity', name: '外購電力' },
  { id: 'employee_commute', name: '員工通勤' }
]

// 標籤類型
type TabType = 'users' | 'submitted' | 'approved' | 'rejected'

const AdminDashboard: React.FC<SubmissionManagementProps> = ({ onViewUserSubmissions }) => {
  const navigate = useNavigate()

  // 當前選中的標籤
  const [activeTab, setActiveTab] = useState<TabType>('users')

  // 統計數據
  const [statistics, setStatistics] = useState({
    totalUsers: 0,
    submitted: 0,
    approved: 0,
    rejected: 0
  })

  // 資料狀態
  const [users, setUsers] = useState<UserProfile[]>([])
  const [submissions, setSubmissions] = useState<(PendingReviewEntry | ReviewedEntry)[]>([])
  const [filteredSubmissions, setFilteredSubmissions] = useState<(PendingReviewEntry | ReviewedEntry)[]>([])
  const [loading, setLoading] = useState(false)

  // 頁面映射表 - 根據類別決定填報頁面路徑
  const pageMap: Record<string, string> = {
    'wd40': '/app/wd40',
    'acetylene': '/app/acetylene',
    'refrigerant': '/app/refrigerant',
    'septic_tank': '/app/septic_tank', // Fixed: unified page_key to 'septic_tank'
    'natural_gas': '/app/natural_gas',
    'urea': '/app/urea',
    'diesel_generator': '/app/diesel_generator',
    'diesel': '/app/diesel',
    'gasoline': '/app/gasoline',
    'lpg': '/app/lpg',
    'fire_extinguisher': '/app/fire_extinguisher',
    'welding_rod': '/app/welding_rod',
    'electricity': '/app/electricity',
    'employee_commute': '/app/employee_commute'
  }

  // 退回對話框
  const [showRejectModal, setShowRejectModal] = useState(false)
  const [rejectingSubmission, setRejectingSubmission] = useState<PendingReviewEntry | ReviewedEntry | null>(null)

  // 用戶管理狀態
  const [showCreateUserModal, setShowCreateUserModal] = useState(false)

  // 載入統計數據
  const loadStatistics = async () => {
    try {
      console.log('📊 載入統計數據...')
      // 直接查詢 energy_entries 表獲取準確統計
      const { data: allEntries, error } = await supabase
        .from('energy_entries')
        .select('id, status')

      if (error) throw error

      // 統計各狀態數量
      const newStats = {
        submitted: allEntries?.filter(e => e.status === 'submitted').length || 0,
        approved: allEntries?.filter(e => e.status === 'approved').length || 0,
        rejected: allEntries?.filter(e => e.status === 'rejected').length || 0
      }

      setStatistics(prev => ({
        ...prev,
        ...newStats
      }))

      console.log('📈 統計結果:', newStats)
    } catch (error) {
      console.error('❌ 載入統計失敗:', error)
    }
  }

  // 載入用戶資料
  const loadUsers = async () => {
    try {
      const usersData = await listUsers()
      setUsers(usersData)
      setStatistics(prev => ({
        ...prev,
        totalUsers: usersData.length
      }))
    } catch (error) {
      console.error('❌ 載入用戶失敗:', error)
    }
  }

  // 載入提交資料
  const loadSubmissions = async () => {
    try {
      const [pendingData, reviewedData] = await Promise.all([
        getPendingReviewEntries(),
        getReviewedEntries()
      ])

      // 合併所有提交資料
      const allSubmissions = [...pendingData, ...reviewedData]
      setSubmissions(allSubmissions)
    } catch (error) {
      console.error('❌ 載入提交資料失敗:', error)
    }
  }

  // 載入所有資料
  const loadAllData = async () => {
    setLoading(true)
    try {
      await Promise.all([
        loadStatistics(),
        loadUsers(),
        loadSubmissions()
      ])
    } catch (error) {
      console.error('❌ 載入資料失敗:', error)
    } finally {
      setLoading(false)
    }
  }

  // 初始載入
  useEffect(() => {
    loadAllData()
  }, [])

  // 根據選中的標籤篩選資料
  useEffect(() => {
    if (activeTab === 'submitted') {
      setFilteredSubmissions(submissions.filter(s => 'status' in s ? s.status === 'submitted' : true))
    } else if (activeTab === 'approved') {
      setFilteredSubmissions(submissions.filter(s => 'status' in s ? s.status === 'approved' : false))
    } else if (activeTab === 'rejected') {
      setFilteredSubmissions(submissions.filter(s => 'status' in s ? s.status === 'rejected' : false))
    } else {
      // users 標籤不需要篩選提交資料
      setFilteredSubmissions([])
    }
  }, [activeTab, submissions])

  // 狀態變更處理
  const handleStatusChange = async (entryId: string, newStatus: 'approved' | 'rejected', notes?: string) => {
    try {
      await reviewEntry(entryId, newStatus, notes)
      toast.success('狀態更新成功')
      loadAllData() // 重新載入所有資料
    } catch (error) {
      toast.error('操作失敗')
      console.error('Status change error:', error)
    }
  }

  // 取得類別名稱
  const getCategoryName = (pageKey: string, category?: string) => {
    let found = energyCategories.find(c => c.id === pageKey)?.name
    if (found) return found

    if (category) {
      found = energyCategories.find(c => c.id === category)?.name
      if (found) return found
    }

    return pageKey || category || '未知類別'
  }

  // 確認退回
  const handleRejectConfirm = async (reason: string) => {
    if (!rejectingSubmission) return;

    try {
      await handleStatusChange(rejectingSubmission.id, 'rejected', reason)
    } catch (error) {
      console.error('退回失敗:', error)
    } finally {
      setShowRejectModal(false)
      setRejectingSubmission(null)
    }
  }

  // 用戶管理面板組件
  const UserManagementPanel = () => (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold">用戶管理</h2>
        <button
          onClick={() => setShowCreateUserModal(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          新增用戶
        </button>
      </div>

      <div className="space-y-4">
        {users.map(user => (
          <div key={user.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="font-semibold">{user.display_name}</h3>
                <p className="text-sm text-gray-600">{user.email}</p>
                <p className="text-sm text-gray-600">
                  狀態：{user.is_active ? '啟用' : '停用'}
                </p>
              </div>
              <div className="flex gap-2">
                <button className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600">
                  編輯
                </button>
                <button className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600">
                  {user.is_active ? '停用' : '啟用'}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )

  // 提交資料面板組件
  const SubmissionPanel = ({ status }: { status: 'submitted' | 'approved' | 'rejected' }) => {
    const statusConfig = {
      submitted: { title: '已提交項目', color: 'blue' },
      approved: { title: '已通過項目', color: 'green' },
      rejected: { title: '已退回項目', color: 'red' }
    }

    const config = statusConfig[status]
    const items = filteredSubmissions

    return (
      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold">{config.title}</h2>
          <span className="text-sm text-gray-600">
            共 {items.length} 筆資料
          </span>
        </div>

        {items.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <p className="text-lg">目前沒有{config.title}</p>
          </div>
        ) : (
          <div className="space-y-4">
            {items.map(entry => (
              <div key={entry.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="font-semibold">{getCategoryName(entry.page_key, entry.category)}</h3>
                    <p className="text-sm text-gray-600">提交者：{entry.owner?.display_name || '未知用戶'}</p>
                    <p className="text-sm text-gray-600">
                      時間：{new Date(entry.created_at).toLocaleDateString()}
                    </p>
                    <p className="text-sm text-gray-600">
                      使用量：{entry.amount} {entry.unit}
                    </p>
                    {status === 'rejected' && entry.review_notes && (
                      <p className="text-sm text-red-600 mt-2">
                        退回原因：{entry.review_notes}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    {status === 'submitted' && (
                      <>
                        <button
                          onClick={() => handleStatusChange(entry.id, 'approved')}
                          className="px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600"
                        >
                          通過
                        </button>
                        <button
                          onClick={() => {
                            setRejectingSubmission(entry)
                            setShowRejectModal(true)
                          }}
                          className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600"
                        >
                          退回
                        </button>
                      </>
                    )}
                    {status === 'approved' && (
                      <button
                        onClick={() => {
                          setRejectingSubmission(entry)
                          setShowRejectModal(true)
                        }}
                        className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600"
                      >
                        退回
                      </button>
                    )}
                    {status === 'rejected' && (
                      <button
                        onClick={() => handleStatusChange(entry.id, 'approved')}
                        className="px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600"
                      >
                        重新通過
                      </button>
                    )}
                    <button
                      onClick={() => {
                        const pagePath = pageMap[entry.page_key] || pageMap[entry.category]
                        if (pagePath) {
                          navigate(`${pagePath}?userId=${entry.owner_id}&entryId=${entry.id}`)
                        }
                      }}
                      className="px-3 py-1 bg-gray-500 text-white rounded hover:bg-gray-600"
                    >
                      詳情
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">載入中...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 標題和統計卡片區 */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {/* 頁面標題 */}
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-gray-900">管理員控制台 🎯</h1>
            <p className="text-gray-600 mt-2">用戶提交狀態管理與統計概覽</p>
            <div className="flex items-center gap-4 mt-3">
              <span className="text-sm text-gray-500">
                最後更新：{new Date().toLocaleString()}
              </span>
              <button
                onClick={loadAllData}
                className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800 transition-colors"
              >
                <RefreshCw className="h-4 w-4" />
                重新整理
              </button>
            </div>
          </div>

          {/* 統計卡片區 */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {/* 用戶管理卡片 */}
            <div
              onClick={() => setActiveTab('users')}
              className={`
                p-6 rounded-lg cursor-pointer transition-all duration-200 hover:shadow-lg hover:scale-105
                ${activeTab === 'users'
                  ? 'bg-blue-100 border-2 border-blue-500 shadow-lg'
                  : 'bg-blue-50 border-2 border-blue-200 hover:shadow-md'}
              `}
            >
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-gray-600 text-sm">用戶管理</p>
                  <p className="text-3xl font-bold mt-2">{statistics.totalUsers}</p>
                </div>
                <Users className="h-8 w-8 text-blue-600" />
              </div>
              <div className="mt-4 text-sm text-blue-600">
                點擊管理用戶
              </div>
            </div>

            {/* 已提交卡片 */}
            <div
              onClick={() => setActiveTab('submitted')}
              className={`
                p-6 rounded-lg cursor-pointer transition-all duration-200 hover:shadow-lg hover:scale-105
                ${activeTab === 'submitted'
                  ? 'bg-yellow-100 border-2 border-yellow-500 shadow-lg'
                  : 'bg-yellow-50 border-2 border-yellow-200 hover:shadow-md'}
              `}
            >
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-gray-600 text-sm">已提交</p>
                  <p className="text-3xl font-bold mt-2">{statistics.submitted}</p>
                </div>
                <FileText className="h-8 w-8 text-yellow-600" />
              </div>
              <div className="mt-4 text-sm text-yellow-600">
                點擊審核提交
              </div>
            </div>

            {/* 已通過卡片 */}
            <div
              onClick={() => setActiveTab('approved')}
              className={`
                p-6 rounded-lg cursor-pointer transition-all duration-200 hover:shadow-lg hover:scale-105
                ${activeTab === 'approved'
                  ? 'bg-green-100 border-2 border-green-500 shadow-lg'
                  : 'bg-green-50 border-2 border-green-200 hover:shadow-md'}
              `}
            >
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-gray-600 text-sm">已通過</p>
                  <p className="text-3xl font-bold mt-2">{statistics.approved}</p>
                </div>
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
              <div className="mt-4 text-sm text-green-600">
                點擊查看通過
              </div>
            </div>

            {/* 已退回卡片 */}
            <div
              onClick={() => setActiveTab('rejected')}
              className={`
                p-6 rounded-lg cursor-pointer transition-all duration-200 hover:shadow-lg hover:scale-105
                ${activeTab === 'rejected'
                  ? 'bg-red-100 border-2 border-red-500 shadow-lg'
                  : 'bg-red-50 border-2 border-red-200 hover:shadow-md'}
              `}
            >
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-gray-600 text-sm">已退回</p>
                  <p className="text-3xl font-bold mt-2">{statistics.rejected}</p>
                </div>
                <XCircle className="h-8 w-8 text-red-600" />
              </div>
              <div className="mt-4 text-sm text-red-600">
                點擊查看退回
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 內容區 - 根據選中的標籤顯示不同內容 */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow">
          {activeTab === 'users' && <UserManagementPanel />}
          {activeTab === 'submitted' && <SubmissionPanel status="submitted" />}
          {activeTab === 'approved' && <SubmissionPanel status="approved" />}
          {activeTab === 'rejected' && <SubmissionPanel status="rejected" />}
        </div>
      </div>

      {/* 退回對話框 */}
      <RejectModal
        isOpen={showRejectModal}
        onClose={() => {
          setShowRejectModal(false)
          setRejectingSubmission(null)
        }}
        onConfirm={handleRejectConfirm}
        submissionInfo={rejectingSubmission ? {
          userName: rejectingSubmission.owner?.display_name || '未知用戶',
          categoryName: getCategoryName(rejectingSubmission.page_key, rejectingSubmission.category),
          amount: rejectingSubmission.amount,
          unit: rejectingSubmission.unit
        } : undefined}
      />
    </div>
  )
}

export default AdminDashboard
