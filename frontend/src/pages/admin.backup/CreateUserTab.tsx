import { useState } from 'react'
import { UserPlus, Mail, User, Building, Key, Briefcase, Phone } from 'lucide-react'
import { createUser, CreateUserData } from '../../api/adminUsers'

const CreateUserTab: React.FC = () => {
  const [formData, setFormData] = useState<CreateUserData>({
    email: '',
    password: '',
    display_name: '',
    company: '',
    job_title: '',
    phone: '',
    role: 'user'
  })
  const [dieselGeneratorMode, setDieselGeneratorMode] = useState<'refuel' | 'test'>('refuel')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.email || !formData.display_name) {
      alert('請填入必填欄位')
      return
    }

    // 如果沒有提供密碼，使用預設密碼
    const submitData = {
      ...formData,
      password: formData.password || 'TempPassword123!',
      filling_config: {
        diesel_generator_mode: dieselGeneratorMode
      }
    }

    try {
      setLoading(true)
      setSuccess(null)
      
      const newUser = await createUser(submitData)
      
      setSuccess(`用戶建立成功！用戶：${newUser.display_name} (${newUser.email})`)
      setFormData({
        email: '',
        password: '',
        display_name: '',
        company: '',
        job_title: '',
        phone: '',
        role: 'user'
      })
      setDieselGeneratorMode('refuel')
    } catch (error) {
      console.error('Error creating user:', error)
      alert(`建立用戶時發生錯誤: ${error instanceof Error ? error.message : '未知錯誤'}`)
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="text-center">
        <div className="mx-auto h-12 w-12 bg-blue-100 rounded-full flex items-center justify-center">
          <UserPlus className="h-6 w-6 text-blue-600" />
        </div>
        <h2 className="mt-4 text-2xl font-bold text-gray-900">建立新用戶</h2>
        <p className="mt-2 text-gray-600">
          為系統新增一個用戶帳號
        </p>
      </div>

      {/* Success Message */}
      {success && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-green-700">{success}</p>
            </div>
          </div>
        </div>
      )}

      {/* Form */}
      <div className="bg-white shadow-sm rounded-lg border border-gray-200">
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Email */}
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
              電子信箱 <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Mail className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                required
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="user@example.com"
              />
            </div>
          </div>

          {/* Display Name */}
          <div>
            <label htmlFor="display_name" className="block text-sm font-medium text-gray-700 mb-2">
              顯示名稱 <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <User className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                id="display_name"
                name="display_name"
                value={formData.display_name}
                onChange={handleInputChange}
                required
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="張小明"
              />
            </div>
          </div>

          {/* Company and Job Title Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Company */}
            <div>
              <label htmlFor="company" className="block text-sm font-medium text-gray-700 mb-2">
                公司名稱
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Building className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  id="company"
                  name="company"
                  value={formData.company}
                  onChange={handleInputChange}
                  className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="ABC 公司"
                />
              </div>
            </div>

            {/* Job Title */}
            <div>
              <label htmlFor="job_title" className="block text-sm font-medium text-gray-700 mb-2">
                職稱
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Briefcase className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  id="job_title"
                  name="job_title"
                  value={formData.job_title}
                  onChange={handleInputChange}
                  className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="經理"
                />
              </div>
            </div>
          </div>

          {/* Phone */}
          <div>
            <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-2">
              電話號碼
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Phone className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="tel"
                id="phone"
                name="phone"
                value={formData.phone}
                onChange={handleInputChange}
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="02-1234-5678"
              />
            </div>
          </div>

          {/* Role */}
          <div>
            <label htmlFor="role" className="block text-sm font-medium text-gray-700 mb-2">
              用戶角色
            </label>
            <select
              id="role"
              name="role"
              value={formData.role}
              onChange={handleInputChange}
              className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="user">使用者</option>
              <option value="admin">管理員</option>
            </select>
          </div>

          {/* Password */}
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
              密碼
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Key className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                id="password"
                name="password"
                value={formData.password}
                onChange={handleInputChange}
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="留空將使用預設密碼"
              />
            </div>
            <p className="mt-1 text-sm text-gray-500">
              若不指定密碼，系統將使用預設密碼：TempPassword123!
            </p>
          </div>

          {/* Diesel Generator Mode */}
          <div>
            <label htmlFor="dieselGeneratorMode" className="block text-sm font-medium text-gray-700 mb-2">
              柴油發電機記錄模式
            </label>
            <select
              id="dieselGeneratorMode"
              value={dieselGeneratorMode}
              onChange={(e) => setDieselGeneratorMode(e.target.value as 'refuel' | 'test')}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
              required
            >
              <option value="refuel">加油記錄（記錄實際加油量）</option>
              <option value="test">測試記錄（記錄測試耗油量）</option>
            </select>
            <p className="mt-1 text-sm text-gray-500">
              此設定決定用戶在柴油發電機頁面看到的記錄類型
            </p>
          </div>

          {/* Submit Button */}
          <div className="pt-4">
            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  建立中...
                </>
              ) : (
                <>
                  <UserPlus className="h-4 w-4 mr-2" />
                  建立用戶
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Tips */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="text-sm font-medium text-blue-800 mb-2">提醒事項</h3>
        <ul className="text-sm text-blue-700 space-y-1">
          <li>• 新建立的用戶預設角色為「使用者」</li>
          <li>• 新建立的用戶預設狀態為「啟用」</li>
          <li>• 用戶將收到帳號建立通知信件（如果設定了SMTP）</li>
          <li>• 用戶首次登入時建議變更密碼</li>
        </ul>
      </div>
    </div>
  )
}

export default CreateUserTab