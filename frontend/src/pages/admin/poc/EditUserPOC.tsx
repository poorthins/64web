import React, { useState, useEffect, useMemo } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { energyCategories, scopeLabels, UserFormData, mockUsers } from './data/mockData'
import { InputField, SelectField, validateUserForm, hasErrors, getFieldError } from './components/FormUtils'
import { exportUserData, exportDepartmentData, demonstrateFileRenaming } from './utils/exportUtils'
import UserExportModal, { ExportOptions } from './components/UserExportModal'
import { exportSingleUser } from './utils/userExportUtils'
import { EditUserSkeleton } from './components/EditUserSkeleton'
import { PageHeader } from './components/PageHeader'
import { ChangeSummary } from './components/ChangeIndicator'
import { handleAPIError, showErrorToast, withRetry } from './utils/errorHandler'
import { useUnsavedChanges } from './hooks/useUnsavedChanges'
import { useKeyboardShortcuts, createCommonShortcuts } from './hooks/useKeyboardShortcuts'
import { useAdvancedNavigation, showNavigationToast } from './hooks/useAdvancedNavigation'

const EditUserPOC: React.FC = () => {
  const navigate = useNavigate()
  const { userId } = useParams<{ userId: string }>()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isExporting, setIsExporting] = useState(false)
  const [showUserExportModal, setShowUserExportModal] = useState(false)
  const [isUserExporting, setIsUserExporting] = useState(false)

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

    return changeMap
  }, [originalData, formData])

  const hasUnsavedChanges = Object.keys(changes).length > 0

  // 模擬載入用戶資料
  useEffect(() => {
    const loadUserData = withRetry(async () => {
      setIsLoading(true)

      // 模擬 API 調用延遲
      await new Promise(resolve => setTimeout(resolve, 800))

      // 模擬可能的錯誤（10% 機率）
      if (Math.random() < 0.1) {
        throw new Error('模擬載入用戶資料失敗')
      }

      const user = mockUsers.find(u => u.id === userId)
      if (user) {
        const userData = {
          name: user.name,
          email: user.email,
          password: '', // 空白表示不更改密碼，輸入新密碼則更新
          company: '示例科技有限公司',
          targetYear: 2024,
          energyCategories: ['diesel', 'electricity', 'employee_commute'], // 模擬已選擇的類別
          dieselGeneratorVersion: undefined,
          isActive: true
        }
        setFormData(userData)
        setOriginalData(userData) // 儲存原始資料
      } else {
        throw new Error('找不到指定的用戶')
      }

      setIsLoading(false)
    }, {
      maxRetries: 3,
      baseDelay: 1000
    })

    if (userId) {
      loadUserData.catch((err: any) => {
        const apiError = handleAPIError(err)
        showErrorToast(apiError)
        setIsLoading(false)
      })
    }
  }, [userId])

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

    // 編輯模式下，如果密碼為空則表示不更改
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
      await withRetry(async () => {
        // 模擬 API 調用延遲
        await new Promise(resolve => setTimeout(resolve, 1500))

        // 模擬可能的錯誤（10% 機率）
        if (Math.random() < 0.1) {
          throw new Error('模擬更新用戶失敗')
        }

        console.log('更新用戶:', formData)
      }, {
        maxRetries: 2,
        baseDelay: 1000
      })

      setShowSuccess(true)

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

  const toggleUserStatus = () => {
    handleInputChange('isActive', !formData.isActive)
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
    navigateWithConfirmation('/app/admin/poc')
  }

  const shortcuts = createCommonShortcuts({
    save: handleSave,
    cancel: handleCancel,
    back: () => navigateWithConfirmation('/app/admin/poc')
  })

  useKeyboardShortcuts({ shortcuts })

  // Advanced navigation shortcuts
  const { showHelp } = useAdvancedNavigation({
    currentPage: 'edit-user',
    userId: userId || undefined,
    enabled: !isLoading
  })

  // 匯出功能
  const handleExportUser = async () => {
    if (!userId) return

    setIsExporting(true)
    try {
      await exportUserData(userId)
      console.log('✅ 個人資料匯出成功')
    } catch (error) {
      console.error('❌ 匯出失敗:', error)
      alert('匯出失敗，請稍後再試')
    } finally {
      setIsExporting(false)
    }
  }

  const handleExportDepartment = async () => {
    if (!formData.department) return

    setIsExporting(true)
    try {
      await exportDepartmentData(formData.department)
      console.log('✅ 部門資料匯出成功')
    } catch (error) {
      console.error('❌ 匯出失敗:', error)
      alert('匯出失敗，請稍後再試')
    } finally {
      setIsExporting(false)
    }
  }

  const handleDemoFileRenaming = () => {
    demonstrateFileRenaming()
    alert('請查看控制台查看智慧檔案重新命名展示')
  }

  // 單一用戶匯出功能
  const handleSingleUserExport = () => {
    setShowUserExportModal(true)
  }

  const handleUserExportConfirm = async (options: ExportOptions) => {
    if (!userId) return

    setIsUserExporting(true)
    try {
      await exportSingleUser(userId, options)
      setShowUserExportModal(false)
      alert('匯出完成！請查看控制台查看詳細資訊。正式版本將下載 Excel 檔案。')
    } catch (error) {
      console.error('❌ 用戶匯出失敗:', error)
      alert('匯出失敗，請稍後再試')
    } finally {
      setIsUserExporting(false)
    }
  }

  const handleUserExportClose = () => {
    if (!isUserExporting) {
      setShowUserExportModal(false)
    }
  }

  /**
   * 處理能源類別審核導航
   */
  const handleCategoryReview = (categoryId: string) => {
    if (!userId) {
      console.error('缺少用戶ID')
      return
    }

    // 檢查用戶是否啟用了該類別
    if (!formData.energyCategories.includes(categoryId)) {
      console.warn(`用戶未啟用類別: ${categoryId}`)
      return
    }

    console.log(`導航到審核頁面: userId=${userId}, category=${categoryId}`)

    // 如果有未儲存的變更，先提醒用戶
    if (hasUnsavedChanges) {
      const confirmed = window.confirm(
        '您有未儲存的變更，確定要離開此頁面嗎？變更將會遺失。'
      )
      if (!confirmed) {
        return
      }
    }

    // 導航到審核頁面
    navigate(`/app/admin/poc/users/${userId}/review/${categoryId}`)
  }

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
            <PageHeader
              title="編輯用戶 ✏️"
              subtitle="修改用戶帳戶資料和能源類別權限"
              currentPage="edit"
              userId={userId}
              backPath="/app/admin/poc"
              showBackButton={true}
            />

            {/* 變更摘要 */}
            {hasUnsavedChanges && (
              <ChangeSummary changes={changes} className="mb-6" />
            )}

            <form id="edit-user-form" onSubmit={handleSubmit} className="bg-white rounded-xl shadow-lg p-6 space-y-6">
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
                    label="帳號 (Email)"
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={(value) => handleInputChange('email', value)}
                    error={getFieldError(errors, 'email')}
                    required
                  />

                  <InputField
                    label="重設密碼"
                    name="password"
                    type="text"
                    value={formData.password}
                    onChange={(value) => handleInputChange('password', value)}
                    error={getFieldError(errors, 'password')}
                    placeholder="留空表示不更改密碼，輸入新密碼則更新"
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
                <div className="flex items-center space-x-3">
                  <button
                    type="button"
                    onClick={handleCancel}
                    className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                    title="取消編輯 (Esc)"
                  >
                    取消
                  </button>

                  {hasUnsavedChanges && (
                    <span className="text-sm text-orange-600 flex items-center">
                      <span className="w-2 h-2 bg-orange-400 rounded-full mr-2 animate-pulse"></span>
                      有未儲存的變更
                    </span>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting || !hasUnsavedChanges}
                  className="px-8 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center"
                  title="儲存變更 (Ctrl+S)"
                >
                  {isSubmitting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
                      更新中...
                    </>
                  ) : (
                    <>
                      <span className="mr-2">💾</span>
                      {hasUnsavedChanges ? '儲存變更' : '無變更'}
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

            {/* 審核管理 */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="font-semibold text-gray-900 mb-3 flex items-center">
                <span className="mr-2">🔍</span>
                審核管理
              </h3>

              <div className="space-y-2">
                <div className="text-xs text-gray-500 mb-3">
                  點擊能源類別進入審核頁面
                </div>

                {/* 範疇一 */}
                <div className="mb-4">
                  <div className="text-xs font-medium text-gray-700 mb-2">範疇一：直接排放</div>
                  <div className="grid grid-cols-2 gap-2">
                    {groupedCategories[1].map(category => (
                      <button
                        key={category.id}
                        onClick={() => handleCategoryReview(category.id)}
                        disabled={!formData.energyCategories.includes(category.id)}
                        className={`text-xs p-2 rounded transition-colors text-left ${
                          formData.energyCategories.includes(category.id)
                            ? 'bg-blue-50 text-blue-700 hover:bg-blue-100 cursor-pointer'
                            : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                        }`}
                        title={
                          formData.energyCategories.includes(category.id)
                            ? `點擊審核 ${category.name}`
                            : `用戶未啟用 ${category.name}`
                        }
                      >
                        {category.name}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 範疇二 */}
                <div className="mb-4">
                  <div className="text-xs font-medium text-gray-700 mb-2">範疇二：外購電力</div>
                  <div className="grid grid-cols-1 gap-2">
                    {groupedCategories[2].map(category => (
                      <button
                        key={category.id}
                        onClick={() => handleCategoryReview(category.id)}
                        disabled={!formData.energyCategories.includes(category.id)}
                        className={`text-xs p-2 rounded transition-colors text-left ${
                          formData.energyCategories.includes(category.id)
                            ? 'bg-green-50 text-green-700 hover:bg-green-100 cursor-pointer'
                            : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                        }`}
                        title={
                          formData.energyCategories.includes(category.id)
                            ? `點擊審核 ${category.name}`
                            : `用戶未啟用 ${category.name}`
                        }
                      >
                        {category.name}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 範疇三 */}
                <div className="mb-2">
                  <div className="text-xs font-medium text-gray-700 mb-2">範疇三：其他間接排放</div>
                  <div className="grid grid-cols-1 gap-2">
                    {groupedCategories[3].map(category => (
                      <button
                        key={category.id}
                        onClick={() => handleCategoryReview(category.id)}
                        disabled={!formData.energyCategories.includes(category.id)}
                        className={`text-xs p-2 rounded transition-colors text-left ${
                          formData.energyCategories.includes(category.id)
                            ? 'bg-purple-50 text-purple-700 hover:bg-purple-100 cursor-pointer'
                            : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                        }`}
                        title={
                          formData.energyCategories.includes(category.id)
                            ? `點擊審核 ${category.name}`
                            : `用戶未啟用 ${category.name}`
                        }
                      >
                        {category.name}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="mt-3 p-2 bg-blue-50 rounded text-xs text-blue-700">
                💡 提示：只能審核用戶已啟用的能源類別
              </div>
            </div>

            {/* 資料匯出 */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="font-semibold text-gray-900 mb-3 flex items-center">
                <span className="mr-2">📦</span>
                資料匯出
              </h3>

              <div className="space-y-2">
                <button
                  onClick={handleExportUser}
                  disabled={isExporting}
                  className="w-full text-left px-3 py-2 text-sm text-blue-700 hover:bg-blue-50 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                >
                  {isExporting ? (
                    <>
                      <div className="animate-spin rounded-full h-3 w-3 border border-blue-500 border-t-transparent mr-2"></div>
                      匯出中...
                    </>
                  ) : (
                    <>
                      👤 匯出個人資料 (.zip)
                    </>
                  )}
                </button>
                <button
                  onClick={handleExportDepartment}
                  disabled={isExporting || !formData.department}
                  className="w-full text-left px-3 py-2 text-sm text-green-700 hover:bg-green-50 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  🏢 匯出部門資料 (.zip)
                </button>
                <button
                  onClick={handleDemoFileRenaming}
                  className="w-full text-left px-3 py-2 text-sm text-purple-700 hover:bg-purple-50 rounded transition-colors"
                >
                  🔄 智慧命名展示
                </button>
              </div>

              <div className="mt-3 p-2 bg-blue-50 rounded text-xs text-blue-700">
                💡 智慧檔案重新命名：將亂碼檔名轉為規範化中文檔名
              </div>
            </div>

            {/* 快速操作 */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="font-semibold text-gray-900 mb-3 flex items-center">
                <span className="mr-2">⚡</span>
                快速操作
              </h3>

              <div className="space-y-2">
                <button
                  onClick={handleSingleUserExport}
                  className="w-full text-left px-3 py-2 text-sm text-green-700 hover:bg-green-50 rounded transition-colors font-medium border border-green-200"
                >
                  📊 匯出用戶資料
                </button>
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

      {/* 用戶匯出對話框 */}
      <UserExportModal
        isOpen={showUserExportModal}
        onClose={handleUserExportClose}
        onConfirm={handleUserExportConfirm}
        userName={formData.name}
        companyName={formData.company}
        isExporting={isUserExporting}
      />
    </div>
  )
}

export default EditUserPOC