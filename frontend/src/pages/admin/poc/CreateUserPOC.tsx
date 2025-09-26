import React, { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { energyCategories, scopeLabels, UserFormData } from './data/mockData'
import { InputField, SelectField } from './components/FormUtils'
import { PageHeader } from './components/PageHeader'
import { PasswordStrengthIndicator } from './components/PasswordStrengthIndicator'
import { handleAPIError, showErrorToast, withRetry } from './utils/errorHandler'
import { useFormValidation, createValidationRules } from './hooks/useFormValidation'
import { useKeyboardShortcuts, createCommonShortcuts } from './hooks/useKeyboardShortcuts'

const CreateUserPOC: React.FC = () => {
  const navigate = useNavigate()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)
  const formRef = useRef<HTMLFormElement>(null)

  const initialFormData: UserFormData = {
    name: '',
    email: '',
    password: '',
    company: '',
    department: '',
    targetYear: new Date().getFullYear(),
    energyCategories: [],
    dieselGeneratorVersion: undefined,
    isActive: true
  }

  // 建立驗證規則
  const rules = createValidationRules()
  const validationRules = {
    name: [rules.required('姓名為必填欄位'), rules.minLength(2, '姓名至少需要 2 個字符')],
    email: [rules.required('電子郵件為必填欄位'), rules.email()],
    password: [rules.required('密碼為必填欄位'), rules.password()],
    company: [rules.required('公司名稱為必填欄位')],
    department: [rules.required('部門為必填欄位')],
    targetYear: [rules.required('目標年份為必填欄位'), rules.custom(
      (value: number) => {
        const currentYear = new Date().getFullYear()
        return value >= currentYear && value <= currentYear + 10
      },
      `目標年份必須在 ${new Date().getFullYear()} 到 ${new Date().getFullYear() + 10} 之間`
    )],
    energyCategories: [rules.arrayMinLength(1, '至少需要選擇一個能源類別')]
  }

  const {
    data: formData,
    errors,
    updateField,
    touchField,
    hasErrors: formHasErrors,
    validateAndGetErrors,
    reset: resetForm
  } = useFormValidation(initialFormData, validationRules)

  const groupedCategories = {
    1: energyCategories.filter(cat => cat.scope === 1),
    2: energyCategories.filter(cat => cat.scope === 2),
    3: energyCategories.filter(cat => cat.scope === 3)
  }

  const handleInputChange = (field: keyof UserFormData, value: any) => {
    updateField(field, value)
  }

  const handleInputBlur = (field: keyof UserFormData) => {
    touchField(field)
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

  // 全選/取消全選功能
  const handleSelectAllInScope = (scope: 1 | 2 | 3) => {
    const scopeCategories = groupedCategories[scope].map(cat => cat.id)
    const currentScopeCategories = formData.energyCategories.filter(id =>
      scopeCategories.includes(id)
    )

    if (currentScopeCategories.length === scopeCategories.length) {
      // 全部已選，取消全選
      const newCategories = formData.energyCategories.filter(id =>
        !scopeCategories.includes(id)
      )
      handleInputChange('energyCategories', newCategories)
    } else {
      // 部分或全部未選，全選
      const otherCategories = formData.energyCategories.filter(id =>
        !scopeCategories.includes(id)
      )
      handleInputChange('energyCategories', [...otherCategories, ...scopeCategories])
    }
  }

  // 成功 Toast
  const showSuccessToast = () => {
    const toast = document.createElement('div')
    toast.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: #10b981;
      color: white;
      padding: 16px 20px;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      z-index: 9999;
      font-size: 14px;
      animation: slideIn 0.3s ease-out;
    `

    toast.innerHTML = `
      <div style="display: flex; align-items: center;">
        <span style="margin-right: 8px;">✅</span>
        <span>用戶創建成功！</span>
      </div>
    `

    document.body.appendChild(toast)

    setTimeout(() => {
      if (toast.parentElement) {
        toast.style.animation = 'slideOut 0.3s ease-in'
        setTimeout(() => toast.remove(), 300)
      }
    }, 3000)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const validationErrors = validateAndGetErrors()

    if (formHasErrors(validationErrors)) {
      return
    }

    setIsSubmitting(true)

    try {
      await withRetry(async () => {
        // 模擬 API 調用延遲
        await new Promise(resolve => setTimeout(resolve, 1500))

        // 模擬可能的錯誤（15% 機率）
        if (Math.random() < 0.15) {
          throw new Error('模擬創建用戶失敗')
        }

        console.log('創建用戶:', formData)
      }, {
        maxRetries: 2,
        baseDelay: 1000
      })

      setShowSuccess(true)
      showSuccessToast()

      setTimeout(() => {
        navigate('/app/admin/poc')
      }, 2000)
    } catch (err) {
      const apiError = handleAPIError(err)
      showErrorToast(apiError)
    } finally {
      setIsSubmitting(false)
    }
  }

  // 鍵盤快捷鍵
  const handleSave = () => {
    formRef.current?.requestSubmit()
  }

  const handleCancel = () => {
    if (window.confirm('確定要取消建立用戶嗎？未儲存的變更將會遺失。')) {
      navigate('/app/admin/poc')
    }
  }

  const shortcuts = createCommonShortcuts({
    save: handleSave,
    cancel: handleCancel,
    back: () => navigate('/app/admin/poc')
  })

  useKeyboardShortcuts({ shortcuts })

  if (showSuccess) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="bg-white rounded-xl shadow-lg p-8 max-w-md w-full text-center">
          <div className="text-6xl mb-4">🎉</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">用戶創建成功！</h2>
          <p className="text-gray-600 mb-4">
            已成功為 <strong>{formData.name}</strong> 創建帳戶
          </p>
          <div className="text-sm text-gray-500">
            正在返回主控台...
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        <PageHeader
          title="新增用戶 👤"
          subtitle="建立新的用戶帳戶並設定能源類別權限"
          currentPage="create"
        />

        <form ref={formRef} onSubmit={handleSubmit} className="bg-white rounded-xl shadow-lg p-6 space-y-6">
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
                onBlur={() => handleInputBlur('name')}
                error={errors.name}
                placeholder="請輸入姓名"
                required
              />

              <InputField
                label="電子郵件"
                name="email"
                type="email"
                value={formData.email}
                onChange={(value) => handleInputChange('email', value)}
                onBlur={() => handleInputBlur('email')}
                error={errors.email}
                placeholder="user@company.com"
                required
              />

              <div>
                <InputField
                  label="密碼"
                  name="password"
                  type="text"
                  value={formData.password}
                  onChange={(value) => handleInputChange('password', value)}
                  onBlur={() => handleInputBlur('password')}
                  error={errors.password}
                  placeholder="至少8個字符，包含字母和數字"
                  required
                />
                <PasswordStrengthIndicator password={formData.password} />
              </div>

              <InputField
                label="公司名稱"
                name="company"
                value={formData.company}
                onChange={(value) => handleInputChange('company', value)}
                onBlur={() => handleInputBlur('company')}
                error={errors.company}
                placeholder="請輸入公司名稱"
                required
              />

              <InputField
                label="部門"
                name="department"
                value={formData.department}
                onChange={(value) => handleInputChange('department', value)}
                onBlur={() => handleInputBlur('department')}
                error={errors.department}
                placeholder="請輸入部門"
                required
              />

              <InputField
                label="目標年份"
                name="targetYear"
                type="number"
                value={formData.targetYear.toString()}
                onChange={(value) => handleInputChange('targetYear', parseInt(value) || new Date().getFullYear())}
                onBlur={() => handleInputBlur('targetYear')}
                error={errors.targetYear}
                placeholder="請輸入目標年份 (例：2024)"
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

            {errors.energyCategories && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-600 flex items-center">
                  <span className="mr-1">⚠️</span>
                  {errors.energyCategories}
                </p>
              </div>
            )}

            <div className="space-y-6">
              {([1, 2, 3] as const).map(scope => {
                const scopeCategories = groupedCategories[scope]
                const selectedInScope = formData.energyCategories.filter(id =>
                  scopeCategories.map(cat => cat.id).includes(id)
                )
                const allSelected = selectedInScope.length === scopeCategories.length
                const noneSelected = selectedInScope.length === 0

                return (
                  <div key={scope} className="bg-gray-50 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-medium text-gray-900">
                        {scopeLabels[scope]}
                      </h3>
                      <button
                        type="button"
                        onClick={() => handleSelectAllInScope(scope)}
                        className="text-sm text-blue-600 hover:text-blue-800 font-medium transition-colors duration-200"
                      >
                        {allSelected ? '取消全選' : '全選'}
                      </button>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                      {scopeCategories.map(category => (
                        <label
                          key={category.id}
                          className="flex items-center space-x-2 cursor-pointer p-2 rounded-lg hover:bg-white transition-colors duration-200"
                        >
                          <input
                            type="checkbox"
                            checked={formData.energyCategories.includes(category.id)}
                            onChange={(e) => handleCategoryChange(category.id, e.target.checked)}
                            onBlur={() => handleInputBlur('energyCategories')}
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                          <span className="text-sm text-gray-700 select-none">{category.name}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )
              })}
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

              {errors.dieselGeneratorVersion && (
                <p className="mt-2 text-sm text-red-600 flex items-center">
                  <span className="mr-1">⚠️</span>
                  {errors.dieselGeneratorVersion}
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
                  創建中...
                </>
              ) : (
                <>
                  <span className="mr-2">✓</span>
                  創建用戶
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default CreateUserPOC