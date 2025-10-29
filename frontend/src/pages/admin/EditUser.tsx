import React, { useState, useEffect, useMemo } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { energyCategories, scopeLabels, UserFormData } from './data/mockData'
import { InputField, SelectField, validateUserForm, hasErrors, getFieldError } from './components/FormUtils'
import { EditUserSkeleton } from './components/EditUserSkeleton'
import { PageHeader } from './components/PageHeader'
import { ChangeSummary } from './components/ChangeIndicator'
import { handleAPIError, showErrorToast, withRetry } from './utils/errorHandler'
import { useUnsavedChanges } from './hooks/useUnsavedChanges'
import { useKeyboardShortcuts, createCommonShortcuts } from './hooks/useKeyboardShortcuts'
import { useUsers, useUser } from './hooks/useUsers'
import { useSubmissions } from './hooks/useSubmissions'
import { type UserUpdateData, getUserEnergyEntries } from '../../api/adminUsers'
import { exportUserEntriesExcel } from './utils/exportUtils'

const EditUser: React.FC = () => {
  const navigate = useNavigate()
  const { userId } = useParams<{ userId: string }>()

  // API hooks
  const { updateExistingUser, toggleStatus } = useUsers()
  const { user, isLoading: userLoading, error: userError, reload } = useUser(userId || null)
  const { reviewSubmission } = useSubmissions()

  // UI state
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)
  const [isExporting, setIsExporting] = useState(false)

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

    return changeMap
  }, [originalData, formData])

  const hasUnsavedChanges = Object.keys(changes).length > 0

  // 轉換 API 用戶資料為表單格式
  const convertAPIUserToFormData = (apiUser: any): UserFormData => {
    const fillingConfig = apiUser.filling_config || {}
    console.log('🔍 [診斷] API 返回的 filling_config:', fillingConfig);
    console.log('🔍 [診斷] diesel_generator_mode 值:', fillingConfig.diesel_generator_mode);

    return {
      name: apiUser.display_name || '',
      email: apiUser.email || '',
      password: '', // 空白表示不更改密碼，輸入新密碼則更新
      company: apiUser.company || '',
      targetYear: fillingConfig.target_year || new Date().getFullYear(),
      energyCategories: fillingConfig.energy_categories || [],
      dieselGeneratorVersion: fillingConfig.diesel_generator_mode || undefined,
      isActive: apiUser.is_active ?? true
      // 加完 console.log 確認這行是否正確
    }
  }

  // 當 API 載入完成後更新表單資料
  useEffect(() => {
    if (user && !isLoading) {
      console.log('🔍 [診斷] 原始 user 資料:', user);
      const userData = convertAPIUserToFormData(user)
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
      const updateData: UserUpdateData = {
        display_name: formData.name,
        email: formData.email,
        company: formData.company,
        job_title: '',
        is_active: formData.isActive,
        energy_categories: formData.energyCategories,
        target_year: formData.targetYear,
        diesel_generator_version: formData.dieselGeneratorVersion
      }
      console.log('🔍 [診斷] 準備發送的 updateData:', updateData);
      console.log('🔍 [診斷] diesel_generator_version 要更新成:', updateData.diesel_generator_version);

      // 密碼直接更新
      if (formData.password) {
        updateData.password = formData.password
      }

      // 正在更新用戶資料

      // 呼叫 API 更新用戶
      await updateExistingUser(userId, updateData)

      // 用戶資料更新成功

      setShowSuccess(true)

      // 延遲導航，讓用戶看到成功訊息
      setTimeout(() => {
        navigate('/app/admin')
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
    navigateWithConfirmation('/app/admin')
  }

  const shortcuts = createCommonShortcuts({
    save: handleSave,
    cancel: handleCancel,
    back: () => navigateWithConfirmation('/app/admin')
  })

  useKeyboardShortcuts({ shortcuts })

  // 匯出功能（ZIP：Excel + 佐證資料）
  const [exportProgress, setExportProgress] = useState<{ status: string; current?: number; total?: number } | null>(null)

  const handleExportUser = async () => {
    if (!userId) return

    setIsExporting(true)
    setExportProgress({ status: '正在載入填報記錄...' })

    try {
      // 從 API 取得使用者的能源填報記錄
      const entries = await getUserEnergyEntries(userId)

      // 檢查是否有資料
      if (!entries || entries.length === 0) {
        alert('此使用者尚無填報資料')
        setExportProgress(null)
        return
      }

      // 使用完整匯出功能（Excel + 佐證資料）
      const { exportUserEntriesWithFiles } = await import('./utils/exportUtils')
      const result = await exportUserEntriesWithFiles(
        userId,
        formData.name || '未知用戶',
        entries,
        (status, current, total) => {
          setExportProgress({ status, current, total })
        }
      )

      setExportProgress(null)

      if (result.failed === 0) {
        alert(`✅ 下載完成！\n成功：${result.success} 個檔案`)
      } else {
        alert(`⚠️ 部分檔案失敗\n成功：${result.success}\n失敗：${result.failed}\n\n錯誤：\n${result.errors.join('\n')}`)
      }
    } catch (error) {
      console.error('❌ 匯出失敗:', error)
      const errorMessage = error instanceof Error ? error.message : '匯出失敗，請稍後再試'
      alert(errorMessage)
      setExportProgress(null)
    } finally {
      setIsExporting(false)
    }
  }

  // 已刪除不需要的匯出功能

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
              backPath="/app/admin"
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
                  />

                  <InputField
                    label="重設密碼"
                    name="password"
                    type="text"
                    value={formData.password}
                    onChange={(value) => handleInputChange('password', value)}
                    error={getFieldError(errors, 'password')}
                    placeholder="輸入則表示更新密碼"
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

            {/* 資料匯出 */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="font-semibold text-gray-900 mb-3 flex items-center">
                <span className="mr-2">📥</span>
                下載用戶資料
              </h3>

              <button
                onClick={handleExportUser}
                disabled={isExporting}
                className="w-full px-4 py-3 text-left bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-between font-medium"
              >
                <div className="flex items-center">
                  {isExporting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-3"></div>
                      下載中...
                    </>
                  ) : (
                    <>
                      <span className="text-xl mr-3">📦</span>
                      下載 ZIP（Excel + 佐證資料）
                    </>
                  )}
                </div>
              </button>

              {exportProgress && (
                <div className="mt-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="text-sm text-blue-800 mb-2">{exportProgress.status}</div>
                  {exportProgress.total !== undefined && exportProgress.current !== undefined && (
                    <div>
                      <div className="flex justify-between text-xs text-blue-600 mb-1">
                        <span>{exportProgress.current} / {exportProgress.total}</span>
                        <span>{Math.round((exportProgress.current / exportProgress.total) * 100)}%</span>
                      </div>
                      <div className="w-full bg-blue-200 rounded-full h-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${(exportProgress.current / exportProgress.total) * 100}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className="mt-3 p-3 bg-gray-100 rounded text-xs text-gray-700">
                <div className="font-semibold mb-1">📁 下載內容：</div>
                <ul className="space-y-1">
                  <li>• Excel 多工作表報表（所有能源類別）</li>
                  <li>• 佐證資料檔案（自動重新命名）</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>

    </div>
  )
}

export default EditUser