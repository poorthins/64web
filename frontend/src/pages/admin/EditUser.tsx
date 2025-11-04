import React, { useState, useEffect, useMemo } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { energyCategories, scopeLabels } from './data/energyConfig'
import { UserFormData } from './types/admin'
import { InputField, SelectField, validateUserForm, hasErrors, getFieldError } from './components/FormUtils'
import { EditUserSkeleton } from './components/EditUserSkeleton'
import { handleAPIError, showErrorToast, withRetry } from './utils/errorHandler'
import { useUnsavedChanges } from './hooks/useUnsavedChanges'
import { useKeyboardShortcuts, createCommonShortcuts } from './hooks/useKeyboardShortcuts'
import { useUsers, useUser } from './hooks/useUsers'
import { apiUserToFormData, formDataToUpdateUserData } from './utils/userTransformers'

const EditUser: React.FC = () => {
  const navigate = useNavigate()
  const { userId } = useParams<{ userId: string }>()

  // API hooks
  const { updateExistingUser, toggleStatus } = useUsers()
  const { user, isLoading: userLoading, error: userError, reload } = useUser(userId || null)

  // UI state
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)

  // 組合載入狀態和錯誤
  const isLoading = userLoading
  const error = userError

  const [originalData, setOriginalData] = useState<UserFormData | null>(null)
  const [formData, setFormData] = useState<UserFormData>({
    name: '',
    email: '',
    password: '',
    company: '',
    targetYear: new Date().getFullYear(),
    energyCategories: [],
    dieselGeneratorVersion: undefined,
    isActive: true
  })

  const [errors, setErrors] = useState<any>({})

  // 計算變更
  const changes = useMemo(() => {
    if (!originalData) return {}

    const changeMap: { [key: string]: { original: any; current: any; label: string } } = {}

    const fieldsToCheck = [
      { key: 'name', label: '姓名' },
      { key: 'email', label: '電子郵件' },
      { key: 'company', label: '公司名稱' },
      { key: 'department', label: '部門' },
      { key: 'targetYear', label: '目標年份' },
      { key: 'energyCategories', label: '能源類別' },
      { key: 'dieselGeneratorVersion', label: '柴油發電機版本' },
      { key: 'isActive', label: '帳戶狀態' }
    ]

    fieldsToCheck.forEach(({ key, label }) => {
      const original = (originalData as any)[key]
      const current = (formData as any)[key]

      if (JSON.stringify(original) !== JSON.stringify(current)) {
        changeMap[key] = { original, current, label }
      }
    })

    // 特殊處理：密碼欄位（永遠不顯示原始值，只檢查是否有輸入）
    if (formData.password && formData.password.trim() !== '') {
      changeMap['password'] = {
        original: '********',
        current: '********',
        label: '密碼'
      }
    }

    return changeMap
  }, [originalData, formData])

  const hasUnsavedChanges = Object.keys(changes).length > 0

  // 當 API 載入完成後更新表單資料
  useEffect(() => {
    if (user && !isLoading) {
      console.log('🔍 [診斷] 原始 user 資料:', user);
      const userData = apiUserToFormData(user)
      console.log('🔍 [診斷] 轉換後的 formData:', userData);
      console.log('🔍 [診斷] dieselGeneratorVersion:', userData.dieselGeneratorVersion);
      setFormData(userData)
      setOriginalData(userData)
      // 用戶資料載入完成
    }
  }, [user, isLoading])

  // 處理載入錯誤
  useEffect(() => {
    if (error) {
      // 載入用戶資料失敗
      showErrorToast({
        message: error,
        code: 'LOAD_USER_ERROR',
        details: null
      })
    }
  }, [error])

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

    // 處理柴油發電機版本選擇
    if (categoryId === 'diesel_generator') {
      if (checked) {
        // 勾選柴油發電機時，如果沒有設置版本，預設為 'refuel'
        if (!formData.dieselGeneratorVersion) {
          handleInputChange('dieselGeneratorVersion', 'refuel')
        }
      } else {
        // 取消勾選時清除版本選擇
        handleInputChange('dieselGeneratorVersion', undefined)
      }
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!userId) {
      showErrorToast({
        message: '無效的用戶 ID',
        code: 'INVALID_USER_ID',
        details: null
      })
      return
    }

    // 編輯模式下，密碼為可選
    const validationData = { ...formData }
    if (formData.password === '') {
      delete (validationData as any).password
    }

    const validationErrors = validateUserForm(validationData, true) // 編輯模式
    setErrors(validationErrors)

    if (hasErrors(validationErrors)) {
      return
    }

    setIsSubmitting(true)

    try {
      // 準備 API 更新資料
      const updateData = formDataToUpdateUserData(formData)
      console.log('🔍 [診斷] 準備發送的 updateData:', updateData);
      console.log('🔍 [診斷] diesel_generator_version 要更新成:', updateData.filling_config?.diesel_generator_mode);

      // 正在更新用戶資料

      // 呼叫 API 更新用戶
      await updateExistingUser(userId, updateData)

      // 用戶資料更新成功

      setShowSuccess(true)

      // 延遲導航，讓用戶看到成功訊息
      setTimeout(() => {
        navigate(`/app/admin/users/${userId}`)
      }, 2000)

    } catch (err: any) {
      // 更新用戶失敗

      // 處理特定錯誤
      let errorMessage = '更新用戶失敗'

      if (err.message?.includes('email')) {
        errorMessage = '電子郵件格式錯誤或已被其他用戶使用'
      } else if (err.message?.includes('permission') || err.message?.includes('RLS')) {
        errorMessage = '權限不足，無法更新此用戶'
      } else if (err.message?.includes('network') || err.message?.includes('fetch')) {
        errorMessage = '網路連線問題，請檢查網路後重試'
      } else if (err.message) {
        errorMessage = err.message
      }

      const apiError = {
        message: errorMessage,
        code: err.code || 'UPDATE_USER_ERROR',
        details: err.details || null
      }

      showErrorToast(apiError)
    } finally {
      setIsSubmitting(false)
    }
  }

  const toggleUserStatus = async () => {
    if (!userId) return

    try {
      // 正在切換用戶狀態

      // 呼叫 API 切換狀態
      await toggleStatus(userId)

      // 更新本地狀態
      handleInputChange('isActive', !formData.isActive)

      // 用戶狀態切換成功
    } catch (err: any) {
      // 切換用戶狀態失敗

      showErrorToast({
        message: err.message || '切換用戶狀態失敗',
        code: err.code || 'TOGGLE_STATUS_ERROR',
        details: err.details || null
      })
    }
  }

  // 未儲存變更警告
  const { navigateWithConfirmation } = useUnsavedChanges({
    hasUnsavedChanges,
    message: '您有未儲存的變更，確定要離開此頁面嗎？'
  })

  // 鍵盤快捷鍵
  const handleSave = () => {
    const form = document.getElementById('edit-user-form') as HTMLFormElement
    form?.requestSubmit()
  }

  const handleCancel = () => {
    navigateWithConfirmation(`/app/admin/users/${userId}`)
  }

  const shortcuts = createCommonShortcuts({
    save: handleSave,
    cancel: handleCancel,
    back: () => navigateWithConfirmation(`/app/admin/users/${userId}`)
  })

  useKeyboardShortcuts({ shortcuts })

  if (isLoading) {
    return <EditUserSkeleton />
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
            正在返回用戶詳情...
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--apple-gray-4)' }}>
      <div className="admin-container">
        {/* 返回按鈕 */}
        <div style={{ marginBottom: '24px' }}>
          <button
            onClick={handleCancel}
            style={{
              border: 'none',
              background: 'none',
              color: 'var(--apple-blue)',
              fontSize: '16px',
              cursor: 'pointer',
              padding: '8px',
              display: 'flex',
              alignItems: 'center',
              gap: '4px'
            }}
          >
            <span style={{ fontSize: '20px' }}>←</span> 返回
          </button>
        </div>

        {/* 頁面標題 */}
        <div className="bg-[#2e7d32] rounded-3xl p-12 mb-8 shadow-2xl relative overflow-hidden">
          {/* 裝飾圓圈 */}
          <div className="absolute top-[-50%] right-[-10%] w-96 h-96 bg-white/10 rounded-full"></div>
          <div className="absolute bottom-[-30%] left-[-5%] w-72 h-72 bg-white/5 rounded-full"></div>

          {/* Header 內容 */}
          <div className="relative z-10 text-center text-white">
            <h1 className="text-5xl font-bold mb-2 tracking-tight">編輯用戶</h1>
            <p className="text-lg opacity-90">修改用戶資訊與能源類別權限</p>
          </div>
        </div>

        {/* 表單卡片 */}
        <form id="edit-user-form" onSubmit={handleSubmit} className="form-card">
          {/* 基本資料 */}
          <div className="form-section">
            <h3 className="form-section-title">基本資料</h3>

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
                    label="公司名稱"
                    name="company"
                    value={formData.company}
                    onChange={(value) => handleInputChange('company', value)}
                    error={getFieldError(errors, 'company')}
                    required
                  />

                  <InputField
                    label="帳號 (Email)"
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={(value) => handleInputChange('email', value)}
                    error={getFieldError(errors, 'email')}
                    required
                    disabled
                    autoComplete="off"
                  />

                  <InputField
                    label="重設密碼"
                    name="password"
                    type="password"
                    value={formData.password}
                    onChange={(value) => handleInputChange('password', value)}
                    error={getFieldError(errors, 'password')}
                    placeholder="留空則不更改密碼"
                    helpText="輸入新密碼以重設,留空則保持原密碼不變"
                    autoComplete="new-password"
                  />

                  <InputField
                    label="目標年份"
                    name="targetYear"
                    type="number"
                    value={formData.targetYear.toString()}
                    onChange={(value) => handleInputChange('targetYear', parseInt(value) || new Date().getFullYear())}
                    onBlur={() => {}}
                    error={getFieldError(errors, 'targetYear')}
                    placeholder="請輸入目標年份 (例：2024)"
                    required
                  />

                  <SelectField
                    label="帳戶狀態"
                    name="status"
                    value={formData.isActive ? 'approved' : 'rejected'}
                    onChange={(value) => handleInputChange('isActive', value === 'approved')}
                    options={[
                      { value: 'approved', label: '啟用' },
                      { value: 'rejected', label: '停用' }
                    ]}
                    showPlaceholder={false}
                  />
                </div>
              </div>

          {/* 能源類別選擇 */}
          <div className="form-section">
            <h3 className="form-section-title">能源類別權限</h3>

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
            <div className="form-section">
              <h3 className="form-section-title">柴油發電機版本</h3>

                  <div className="space-y-3">
                    {(() => {
                      console.log('🔍 [診斷] 當前 dieselGeneratorVersion 狀態:', formData.dieselGeneratorVersion);
                      return null;
                    })()}
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

          {/* 表單操作按鈕 */}
          <div className="form-actions">
            <button
              type="button"
              onClick={handleCancel}
              className="admin-btn admin-btn-secondary"
            >
              取消
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !hasUnsavedChanges}
              className="admin-btn admin-btn-primary"
              style={{
                opacity: (isSubmitting || !hasUnsavedChanges) ? 0.5 : 1,
                cursor: (isSubmitting || !hasUnsavedChanges) ? 'not-allowed' : 'pointer'
              }}
            >
              {isSubmitting ? '更新中...' : '儲存變更'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default EditUser