import { useState, useEffect } from 'react'
import { X, Save, Loader2, User, Mail, Building, Briefcase, Phone } from 'lucide-react'
import { UserProfile, UserUpdateData, updateUser, getUserDetails } from '../api/adminUsers'

interface UserEditModalProps {
  userId: string
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

const UserEditModal: React.FC<UserEditModalProps> = ({
  userId,
  isOpen,
  onClose,
  onSuccess
}) => {
  const [user, setUser] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [formData, setFormData] = useState<UserUpdateData>({
    display_name: '',
    email: '',
    company: '',
    job_title: '',
    phone: '',
    role: 'user',
    is_active: true
  })

  useEffect(() => {
    if (isOpen && userId) {
      fetchUserDetails()
    }
  }, [isOpen, userId])

  const fetchUserDetails = async () => {
    try {
      setLoading(true)
      setError(null)
      const userData = await getUserDetails(userId)
      if (userData) {
        setUser(userData)
        setFormData({
          display_name: userData.display_name || '',
          email: userData.email || '',
          company: userData.company || '',
          job_title: userData.job_title || '',
          phone: userData.phone || '',
          role: userData.role || 'user',
          is_active: userData.is_active ?? true
        })
      }
    } catch (error) {
      console.error('Error fetching user details:', error)
      setError(error instanceof Error ? error.message : '載入用戶資料失敗')
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (field: keyof UserUpdateData, value: string | boolean) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return

    try {
      setSaving(true)
      setError(null)

      // 過濾掉空值和未變更的值
      const updateData: UserUpdateData = {}
      
      if (formData.display_name !== user.display_name && formData.display_name?.trim()) {
        updateData.display_name = formData.display_name.trim()
      }
      
      if (formData.email !== user.email && formData.email?.trim()) {
        updateData.email = formData.email.trim()
      }
      
      if (formData.company !== user.company) {
        updateData.company = formData.company?.trim() || undefined
      }
      
      if (formData.job_title !== user.job_title) {
        updateData.job_title = formData.job_title?.trim() || undefined
      }
      
      if (formData.phone !== user.phone) {
        updateData.phone = formData.phone?.trim() || undefined
      }
      
      if (formData.role !== user.role && formData.role) {
        updateData.role = formData.role
      }
      
      if (formData.is_active !== user.is_active) {
        updateData.is_active = formData.is_active
      }

      // 如果沒有任何變更，直接關閉
      if (Object.keys(updateData).length === 0) {
        onClose()
        return
      }

      await updateUser(userId, updateData)
      onSuccess()
      onClose()
    } catch (error) {
      console.error('Error updating user:', error)
      setError(error instanceof Error ? error.message : '更新用戶資料失敗')
    } finally {
      setSaving(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-900">編輯用戶資料</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        {/* Loading */}
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
            <span className="ml-2 text-gray-600">載入中...</span>
          </div>
        ) : user ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Display Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <User className="inline h-4 w-4 mr-1" />
                顯示名稱 *
              </label>
              <input
                type="text"
                value={formData.display_name}
                onChange={(e) => handleInputChange('display_name', e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="請輸入顯示名稱"
                required
              />
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <Mail className="inline h-4 w-4 mr-1" />
                Email *
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="請輸入 Email"
                required
              />
            </div>

            {/* Company */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <Building className="inline h-4 w-4 mr-1" />
                公司
              </label>
              <input
                type="text"
                value={formData.company}
                onChange={(e) => handleInputChange('company', e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="請輸入公司名稱"
              />
            </div>

            {/* Job Title */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <Briefcase className="inline h-4 w-4 mr-1" />
                職稱
              </label>
              <input
                type="text"
                value={formData.job_title}
                onChange={(e) => handleInputChange('job_title', e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="請輸入職稱"
              />
            </div>

            {/* Phone */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <Phone className="inline h-4 w-4 mr-1" />
                電話
              </label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => handleInputChange('phone', e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="請輸入電話號碼"
              />
            </div>

            {/* Role */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                角色
              </label>
              <select
                value={formData.role}
                onChange={(e) => handleInputChange('role', e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="user">使用者</option>
                <option value="admin">管理員</option>
              </select>
            </div>

            {/* Active Status */}
            <div className="flex items-center">
              <input
                type="checkbox"
                id="is_active"
                checked={formData.is_active}
                onChange={(e) => handleInputChange('is_active', e.target.checked)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <label htmlFor="is_active" className="ml-2 text-sm text-gray-700">
                啟用此帳戶
              </label>
            </div>

            {/* Buttons */}
            <div className="flex justify-end gap-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                disabled={saving}
                className="px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 disabled:opacity-50"
              >
                取消
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
              >
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    儲存中...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    儲存
                  </>
                )}
              </button>
            </div>
          </form>
        ) : (
          <div className="text-center py-8">
            <p className="text-gray-500">找不到用戶資料</p>
          </div>
        )}
      </div>
    </div>
  )
}

export default UserEditModal