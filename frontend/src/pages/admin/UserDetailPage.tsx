import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { 
  ArrowLeft, 
  User, 
  Building, 
  Shield, 
  Activity, 
  FileText, 
  Calendar,
  AlertCircle,
  Loader2,
  UserCheck,
  UserX,
  Mail,
  Phone,
  Briefcase,
  Edit,
  Clock,
  CheckCircle,
  XCircle,
  Eye
} from 'lucide-react'
import { getUserDetails, updateUserStatus, UserProfile } from '../../api/adminUsers'
import UserEditModal from '../../components/UserEditModal'

const UserDetailPage = () => {
  const { userId } = useParams<{ userId: string }>()
  const navigate = useNavigate()
  
  const [user, setUser] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [updating, setUpdating] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)

  useEffect(() => {
    if (userId) {
      fetchUserDetail()
    }
  }, [userId])

  const fetchUserDetail = async () => {
    if (!userId) return

    try {
      setLoading(true)
      setError(null)
      const userData = await getUserDetails(userId)
      setUser(userData)
    } catch (error) {
      console.error('Error fetching user detail:', error)
      setError(error instanceof Error ? error.message : '載入使用者詳細資料失敗')
    } finally {
      setLoading(false)
    }
  }

  const handleStatusUpdate = async (isActive: boolean) => {
    if (!user) return

    try {
      setUpdating(true)
      await updateUserStatus(user.id, isActive)
      
      // 更新本地狀態
      setUser({ ...user, is_active: isActive })
      alert(`成功${isActive ? '啟用' : '停用'}使用者`)
    } catch (error) {
      console.error('Error updating user status:', error)
      alert(`更新使用者狀態時發生錯誤: ${error instanceof Error ? error.message : '未知錯誤'}`)
    } finally {
      setUpdating(false)
    }
  }

  const handleBack = () => {
    navigate('/app/admin')
  }

  const handleEditSuccess = () => {
    setShowEditModal(false)
    fetchUserDetail() // 重新載入用戶資料
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-center py-12">
            <div className="flex items-center space-x-2">
              <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
              <span className="text-gray-600">載入使用者詳細資料中...</span>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (error || !user) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-4xl mx-auto">
          <div className="mb-6">
            <button
              onClick={handleBack}
              className="flex items-center text-gray-600 hover:text-gray-900 transition-colors"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              返回使用者列表
            </button>
          </div>
          
          <div className="bg-red-50 border border-red-200 rounded-lg p-6">
            <div className="flex items-center">
              <AlertCircle className="w-5 h-5 text-red-500 mr-2" />
              <div className="flex-1">
                <h3 className="text-sm font-medium text-red-800">載入使用者詳細資料時發生錯誤</h3>
                <p className="text-sm text-red-700 mt-1">
                  {error || '找不到指定的使用者'}
                </p>
              </div>
              <button
                onClick={fetchUserDetail}
                className="ml-4 px-3 py-1 bg-red-100 hover:bg-red-200 text-red-800 text-sm rounded-md transition-colors"
              >
                重試
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={handleBack}
            className="flex items-center text-gray-600 hover:text-gray-900 transition-colors mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            返回使用者列表
          </button>
          
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                {user.display_name || 'N/A'}
              </h1>
              <p className="text-gray-600 mt-1">使用者詳細資料</p>
            </div>
            
            <div className="flex items-center space-x-3">
              <span className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full ${
                user.is_active 
                  ? 'bg-green-100 text-green-800' 
                  : 'bg-red-100 text-red-800'
              }`}>
                {user.is_active ? '啟用' : '停用'}
              </span>
              
              <button
                onClick={() => handleStatusUpdate(!user.is_active)}
                disabled={updating}
                className={`px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 ${
                  user.is_active
                    ? 'bg-red-600 hover:bg-red-700 text-white'
                    : 'bg-green-600 hover:bg-green-700 text-white'
                }`}
              >
                {updating ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : user.is_active ? (
                  <UserX className="w-4 h-4" />
                ) : (
                  <UserCheck className="w-4 h-4" />
                )}
                {user.is_active ? '停用使用者' : '啟用使用者'}
              </button>
            </div>
          </div>
        </div>

        {/* User Info Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Basic Info */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="p-3 bg-blue-50 rounded-full">
                <User className="w-6 h-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">使用者名稱</p>
                <p className="text-lg font-semibold text-gray-900">
                  {user.display_name || 'N/A'}
                </p>
              </div>
            </div>
          </div>

          {/* Email */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="p-3 bg-green-50 rounded-full">
                <Mail className="w-6 h-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">電子郵件</p>
                <p className="text-lg font-semibold text-gray-900">
                  {user.email || 'N/A'}
                </p>
              </div>
            </div>
          </div>

          {/* Company */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="p-3 bg-indigo-50 rounded-full">
                <Building className="w-6 h-6 text-indigo-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">公司</p>
                <p className="text-lg font-semibold text-gray-900">
                  {user.company || 'N/A'}
                </p>
              </div>
            </div>
          </div>

          {/* Role */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="p-3 bg-purple-50 rounded-full">
                <Shield className="w-6 h-6 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">角色</p>
                <p className="text-lg font-semibold text-gray-900">
                  {user.role === 'admin' ? '管理員' : '使用者'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Secondary Info Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {/* Job Title */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="p-3 bg-yellow-50 rounded-full">
                <Briefcase className="w-6 h-6 text-yellow-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">職位</p>
                <p className="text-lg font-semibold text-gray-900">
                  {user.job_title || 'N/A'}
                </p>
              </div>
            </div>
          </div>

          {/* Phone */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="p-3 bg-teal-50 rounded-full">
                <Phone className="w-6 h-6 text-teal-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">電話</p>
                <p className="text-lg font-semibold text-gray-900">
                  {user.phone || 'N/A'}
                </p>
              </div>
            </div>
          </div>

          {/* Account Status */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center">
              <div className={`p-3 rounded-full ${
                user.is_active ? 'bg-green-50' : 'bg-red-50'
              }`}>
                {user.is_active ? (
                  <CheckCircle className="w-6 h-6 text-green-600" />
                ) : (
                  <XCircle className="w-6 h-6 text-red-600" />
                )}
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">帳號狀態</p>
                <p className={`text-lg font-semibold ${
                  user.is_active ? 'text-green-700' : 'text-red-700'
                }`}>
                  {user.is_active ? '已啟用' : '已停用'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* User Activity and System Information */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-8">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">系統資訊</h2>
          </div>
          
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  使用者 ID
                </label>
                <div className="p-3 bg-gray-50 rounded-lg">
                  <code className="text-sm text-gray-800">{user.id}</code>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  帳號權限
                </label>
                <div className="flex items-center">
                  <Shield className={`w-4 h-4 mr-2 ${
                    user.role === 'admin' ? 'text-purple-500' : 'text-blue-500'
                  }`} />
                  <span className={`font-medium ${
                    user.role === 'admin' ? 'text-purple-700' : 'text-blue-700'
                  }`}>
                    {user.role === 'admin' ? '管理員權限' : '一般使用者權限'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Contact Information */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-8">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">聯絡資訊</h2>
              <button
                onClick={() => setShowEditModal(true)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
              >
                <Edit className="w-4 h-4" />
                編輯資料
              </button>
            </div>
          </div>
          
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  顯示名稱
                </label>
                <div className="p-3 bg-gray-50 rounded-lg">
                  <div className="text-sm text-gray-800">{user.display_name || 'N/A'}</div>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  電子郵件
                </label>
                <div className="p-3 bg-gray-50 rounded-lg">
                  <div className="text-sm text-gray-800">{user.email || 'N/A'}</div>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  公司名稱
                </label>
                <div className="p-3 bg-gray-50 rounded-lg">
                  <div className="text-sm text-gray-800">{user.company || 'N/A'}</div>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  職位
                </label>
                <div className="p-3 bg-gray-50 rounded-lg">
                  <div className="text-sm text-gray-800">{user.job_title || 'N/A'}</div>
                </div>
              </div>
              
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  聯絡電話
                </label>
                <div className="p-3 bg-gray-50 rounded-lg">
                  <div className="text-sm text-gray-800">{user.phone || 'N/A'}</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="mt-8 flex justify-between items-center">
          <div className="flex space-x-4">
            <button
              onClick={() => navigate(`/app/admin/users/${user.id}/entries`)}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
            >
              <FileText className="w-4 h-4" />
              查看填報記錄
            </button>
            
            <button
              onClick={() => navigate(`/app/admin/users/${user.id}/submissions`)}
              className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
            >
              <Eye className="w-4 h-4" />
              查看審核狀況
            </button>
          </div>
          
          <div className="text-sm text-gray-500">
            <Clock className="w-4 h-4 inline mr-1" />
            最後更新: {new Date().toLocaleDateString('zh-TW')}
          </div>
        </div>
      </div>
      
      {/* Edit User Modal */}
      {showEditModal && (
        <UserEditModal
          userId={user.id}
          isOpen={true}
          onClose={() => setShowEditModal(false)}
          onSuccess={handleEditSuccess}
        />
      )}
    </div>
  )
}

export default UserDetailPage
