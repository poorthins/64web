import React, { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { energyCategories, scopeLabels, UserFormData, mockUsers } from './data/mockData'
import { InputField, SelectField, validateUserForm, hasErrors, getFieldError } from './components/FormUtils'

const EditUserPOC: React.FC = () => {
  const navigate = useNavigate()
  const { userId } = useParams<{ userId: string }>()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  const [formData, setFormData] = useState<UserFormData>({
    name: '',
    email: '',
    password: '',
    company: '',
    department: '',
    targetYear: new Date().getFullYear(),
    energyCategories: [],
    dieselGeneratorVersion: undefined,
    isActive: true
  })

  const [errors, setErrors] = useState<any>({})

  // 模擬載入用戶資料
  useEffect(() => {
    const loadUserData = async () => {
      try {
        setIsLoading(true)
        // 模擬 API 調用
        await new Promise(resolve => setTimeout(resolve, 800))

        const user = mockUsers.find(u => u.id === userId)
        if (user) {
          setFormData({
            name: user.name,
            email: user.email,
            password: '••••••', // 不顯示真實密碼
            company: '示例科技有限公司',
            department: user.department,
            targetYear: 2024,
            energyCategories: ['diesel', 'electricity_bill', 'employee_commute'], // 模擬已選擇的類別
            dieselGeneratorVersion: undefined,
            isActive: true
          })
        }
      } catch (error) {
        console.error('載入用戶資料失敗:', error)
      } finally {
        setIsLoading(false)
      }
    }

    if (userId) {
      loadUserData()
    }
  }, [userId])

  const currentYear = new Date().getFullYear()
  const yearOptions = Array.from({ length: 11 }, (_, i) => ({
    value: currentYear + i,
    label: `${currentYear + i} 年`
  }))

  const groupedCategories = {
    1: energyCategories.filter(cat => cat.scope === 1),
    2: energyCategories.filter(cat => cat.scope === 2),
    3: energyCategories.filter(cat => cat.scope === 3)
  }

  const handleInputChange = (field: keyof UserFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    if (errors[field]) {
      setErrors((prev: any) => ({ ...prev, [field]: undefined }))
    }
  }

  const handleCategoryChange = (categoryId: string, checked: boolean) => {
    const newCategories = checked
      ? [...formData.energyCategories, categoryId]
      : formData.energyCategories.filter(id => id !== categoryId)

    handleInputChange('energyCategories', newCategories)

    if (categoryId === 'diesel_generator' && !checked) {
      handleInputChange('dieselGeneratorVersion', undefined)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // 編輯模式下，密碼為可選
    const validationData = { ...formData }
    if (formData.password === '••••••') {
      delete (validationData as any).password
    }

    const validationErrors = validateUserForm(validationData)
    setErrors(validationErrors)

    if (hasErrors(validationErrors)) {
      return
    }

    setIsSubmitting(true)

    try {
      await new Promise(resolve => setTimeout(resolve, 1500))
      console.log('更新用戶:', formData)
      setShowSuccess(true)

      setTimeout(() => {
        navigate('/app/admin/poc')
      }, 2000)
    } catch (error) {
      console.error('更新用戶失敗:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const toggleUserStatus = () => {
    handleInputChange('isActive', !formData.isActive)
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent mx-auto mb-4"></div>
          <p className="text-gray-600">載入用戶資料中...</p>
        </div>
      </div>
    )
  }

  if (showSuccess) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="bg-white rounded-xl shadow-lg p-8 max-w-md w-full text-center">
          <div className="text-6xl mb-4">✅</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">用戶更新成功！</h2>
          <p className="text-gray-600 mb-4">
            已成功更新 <strong>{formData.name}</strong> 的資料
          </p>
          <div className="text-sm text-gray-500">
            正在返回主控台...
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="flex">
        {/* 主要表單區域 */}
        <div className="flex-1 p-6">
          <div className="max-w-3xl">
            <div className="mb-6">
              <button
                onClick={() => navigate('/app/admin/poc')}
                className="flex items-center text-blue-600 hover:text-blue-800 mb-4"
              >
                <span className="mr-2">←</span>
                返回主控台
              </button>

              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                編輯用戶 ✏️
              </h1>
              <p className="text-gray-600">
                修改用戶帳戶資料和能源類別權限
              </p>
            </div>

            <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-lg p-6 space-y-6">
              {/* 基本資料 */}
              <div className="border-b border-gray-200 pb-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                  <span className="mr-2">📋</span>
                  基本資料
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <InputField
                    label="姓名"
                    name="name"
                    value={formData.name}
                    onChange={(value) => handleInputChange('name', value)}
                    error={getFieldError(errors, 'name')}
                    required
                  />

                  <InputField
                    label="電子郵件"
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={(value) => handleInputChange('email', value)}
                    error={getFieldError(errors, 'email')}
                    required
                  />

                  <InputField
                    label="密碼"
                    name="password"
                    type="password"
                    value={formData.password}
                    onChange={(value) => handleInputChange('password', value)}
                    error={getFieldError(errors, 'password')}
                    placeholder="留空表示不更改密碼"
                  />

                  <InputField
                    label="公司名稱"
                    name="company"
                    value={formData.company}
                    onChange={(value) => handleInputChange('company', value)}
                    error={getFieldError(errors, 'company')}
                    required
                  />

                  <InputField
                    label="部門"
                    name="department"
                    value={formData.department}
                    onChange={(value) => handleInputChange('department', value)}
                    error={getFieldError(errors, 'department')}
                    required
                  />

                  <SelectField
                    label="目標年份"
                    name="targetYear"
                    value={formData.targetYear}
                    onChange={(value) => handleInputChange('targetYear', parseInt(value))}
                    options={yearOptions}
                    error={getFieldError(errors, 'targetYear')}
                    required
                  />
                </div>
              </div>

              {/* 能源類別選擇 */}
              <div className="border-b border-gray-200 pb-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                  <span className="mr-2">⚡</span>
                  能源類別權限
                </h2>

                {getFieldError(errors, 'energyCategories') && (
                  <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-sm text-red-600 flex items-center">
                      <span className="mr-1">⚠️</span>
                      {getFieldError(errors, 'energyCategories')}
                    </p>
                  </div>
                )}

                <div className="space-y-6">
                  {([1, 2, 3] as const).map(scope => (
                    <div key={scope} className="bg-gray-50 rounded-lg p-4">
                      <h3 className="font-medium text-gray-900 mb-3">
                        {scopeLabels[scope]}
                      </h3>

                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                        {groupedCategories[scope].map(category => (
                          <label
                            key={category.id}
                            className="flex items-center space-x-2 cursor-pointer"
                          >
                            <input
                              type="checkbox"
                              checked={formData.energyCategories.includes(category.id)}
                              onChange={(e) => handleCategoryChange(category.id, e.target.checked)}
                              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                            />
                            <span className="text-sm text-gray-700">{category.name}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* 柴油發電機版本選擇 */}
              {formData.energyCategories.includes('diesel_generator') && (
                <div className="border-b border-gray-200 pb-6">
                  <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                    <span className="mr-2">🔧</span>
                    柴油發電機版本
                  </h2>

                  <div className="space-y-3">
                    <label className="flex items-center space-x-3 cursor-pointer">
                      <input
                        type="radio"
                        name="dieselGeneratorVersion"
                        value="refuel"
                        checked={formData.dieselGeneratorVersion === 'refuel'}
                        onChange={() => handleInputChange('dieselGeneratorVersion', 'refuel')}
                        className="text-blue-600 focus:ring-blue-500"
                      />
                      <div>
                        <div className="font-medium text-gray-900">加油版 ⛽</div>
                        <div className="text-sm text-gray-600">需要手動記錄加油量</div>
                      </div>
                    </label>

                    <label className="flex items-center space-x-3 cursor-pointer">
                      <input
                        type="radio"
                        name="dieselGeneratorVersion"
                        value="test"
                        checked={formData.dieselGeneratorVersion === 'test'}
                        onChange={() => handleInputChange('dieselGeneratorVersion', 'test')}
                        className="text-blue-600 focus:ring-blue-500"
                      />
                      <div>
                        <div className="font-medium text-gray-900">測試版 🧪</div>
                        <div className="text-sm text-gray-600">自動計算運行時間</div>
                      </div>
                    </label>
                  </div>

                  {getFieldError(errors, 'dieselGeneratorVersion') && (
                    <p className="mt-2 text-sm text-red-600 flex items-center">
                      <span className="mr-1">⚠️</span>
                      {getFieldError(errors, 'dieselGeneratorVersion')}
                    </p>
                  )}
                </div>
              )}

              {/* 提交按鈕 */}
              <div className="flex items-center justify-between pt-6">
                <button
                  type="button"
                  onClick={() => navigate('/app/admin/poc')}
                  className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  取消
                </button>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-8 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center"
                >
                  {isSubmitting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
                      更新中...
                    </>
                  ) : (
                    <>
                      <span className="mr-2">💾</span>
                      更新用戶
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* 側邊欄 */}
        <div className="w-80 bg-white border-l border-gray-200 p-6">
          <div className="space-y-6">
            {/* 用戶狀態 */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="font-semibold text-gray-900 mb-3 flex items-center">
                <span className="mr-2">👤</span>
                用戶狀態
              </h3>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">帳戶狀態</span>
                  <button
                    onClick={toggleUserStatus}
                    className={`px-3 py-1 rounded-full text-xs font-medium ${
                      formData.isActive
                        ? 'bg-green-100 text-green-800'
                        : 'bg-red-100 text-red-800'
                    }`}
                  >
                    {formData.isActive ? '✅ 啟用' : '❌ 停用'}
                  </button>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">最後登入</span>
                  <span className="text-sm text-gray-900">2024-03-22</span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">創建日期</span>
                  <span className="text-sm text-gray-900">2024-01-15</span>
                </div>
              </div>
            </div>

            {/* 快速統計 */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="font-semibold text-gray-900 mb-3 flex items-center">
                <span className="mr-2">📊</span>
                用戶統計
              </h3>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">總記錄數</span>
                  <span className="text-sm font-medium text-gray-900">12</span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">本月記錄</span>
                  <span className="text-sm font-medium text-gray-900">3</span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">已啟用類別</span>
                  <span className="text-sm font-medium text-gray-900">
                    {formData.energyCategories.length}
                  </span>
                </div>
              </div>
            </div>

            {/* 快速操作 */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="font-semibold text-gray-900 mb-3 flex items-center">
                <span className="mr-2">⚡</span>
                快速操作
              </h3>

              <div className="space-y-2">
                <button className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-white rounded transition-colors">
                  📧 發送重設密碼信
                </button>
                <button className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-white rounded transition-colors">
                  📋 查看用戶記錄
                </button>
                <button className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-white rounded transition-colors">
                  📊 查看詳細統計
                </button>
                <button className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded transition-colors">
                  🗑️ 刪除用戶
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default EditUserPOC