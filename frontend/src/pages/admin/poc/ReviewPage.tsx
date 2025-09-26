import React, { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { BackButton } from './components/BackButton'
import { Breadcrumb, getBreadcrumbItems } from './components/Breadcrumb'
import { LoadingSpinner } from './components/LoadingSkeleton'
import RejectModal from './components/RejectModal'
import { adminReviewsAPI, ReviewData, ReviewActionResponse } from '../../../api/adminReviews'
import { energyCategories, COMMON_REJECT_REASONS } from './data/mockData'
import { useAdvancedNavigation, getCategoryDisplayName, showNavigationToast } from './hooks/useAdvancedNavigation'

const ReviewPage: React.FC = () => {
  const navigate = useNavigate()
  const { userId, category } = useParams<{ userId: string; category: string }>()

  // 狀態管理
  const [reviewData, setReviewData] = useState<ReviewData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false)

  /**
   * 載入審核資料
   */
  const loadReviewData = async () => {
    if (!userId || !category) {
      setError('缺少必要的參數')
      setIsLoading(false)
      return
    }

    try {
      setIsLoading(true)
      setError(null)

      const data = await adminReviewsAPI.getReviewData(userId, category)
      setReviewData(data)
    } catch (err: any) {
      console.error('載入審核資料失敗:', err)
      setError(err.message || '載入審核資料失敗')
    } finally {
      setIsLoading(false)
    }
  }

  // 初始載入
  useEffect(() => {
    loadReviewData()
  }, [userId, category])

  // Advanced navigation shortcuts
  const { showHelp } = useAdvancedNavigation({
    currentPage: 'review',
    userId: userId || undefined,
    category: category || undefined,
    enabled: !isLoading && !isProcessing
  })

  /**
   * 獲取能源類別顯示名稱
   */
  const getCategoryDisplayName = (categoryId?: string) => {
    if (!categoryId) return '未知類別'
    const cat = energyCategories.find(c => c.id === categoryId)
    return cat ? cat.name : categoryId
  }

  /**
   * 渲染不同類別的資料格式
   */
  const renderCategoryData = (data: ReviewData) => {
    const { submission, category } = data

    // 基本資料顯示
    const baseInfo = (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="font-semibold text-gray-900 mb-3">📊 填報資料</h3>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-600">數量：</span>
                <span className="font-medium">{submission.amount.toLocaleString()} {submission.unit}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">CO₂ 排放量：</span>
                <span className="font-medium text-green-600">{submission.co2Emission.toLocaleString()} kg</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">提交日期：</span>
                <span className="font-medium">{submission.submissionDate}</span>
              </div>
            </div>
          </div>

          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="font-semibold text-gray-900 mb-3">🔍 類別資訊</h3>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-600">能源類別：</span>
                <span className="font-medium">{category.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">排放範疇：</span>
                <span className="font-medium">範疇 {category.scope}</span>
              </div>
              {category.hasVersion && (
                <div className="flex justify-between">
                  <span className="text-gray-600">版本類型：</span>
                  <span className="font-medium">有版本選項</span>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="bg-blue-50 rounded-lg p-4">
            <h3 className="font-semibold text-gray-900 mb-3">👤 提交者資訊</h3>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-600">姓名：</span>
                <span className="font-medium">{data.user.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">部門：</span>
                <span className="font-medium">{data.user.department}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">信箱：</span>
                <span className="font-medium text-blue-600">{data.user.email}</span>
              </div>
            </div>
          </div>

          {submission.priority && (
            <div className="bg-yellow-50 rounded-lg p-4">
              <h3 className="font-semibold text-gray-900 mb-3">⚡ 審核資訊</h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-600">優先級：</span>
                  <span className={`font-medium ${
                    submission.priority === 'high' ? 'text-red-600' :
                    submission.priority === 'medium' ? 'text-yellow-600' :
                    'text-gray-600'
                  }`}>
                    {submission.priority === 'high' ? '高' :
                     submission.priority === 'medium' ? '中' : '低'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">當前狀態：</span>
                  <span className={`font-medium ${
                    submission.status === 'approved' ? 'text-green-600' :
                    submission.status === 'rejected' ? 'text-red-600' :
                    'text-blue-600'
                  }`}>
                    {submission.status === 'approved' ? '已通過' :
                     submission.status === 'rejected' ? '已退回' : '待審核'}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    )

    // 根據不同類別添加特殊資訊
    switch (category.id) {
      case 'diesel_generator':
        return (
          <div className="space-y-6">
            {baseInfo}
            <div className="bg-orange-50 rounded-lg p-4">
              <h3 className="font-semibold text-gray-900 mb-3">⚙️ 柴油發電機特殊資訊</h3>
              <p className="text-orange-800 text-sm">
                此類別需要特別注意發電機運行時間記錄和燃料消耗計算方式。
                請確認提供的數據包含完整的運行日誌。
              </p>
            </div>
          </div>
        )

      case 'electricity_bill':
        return (
          <div className="space-y-6">
            {baseInfo}
            <div className="bg-green-50 rounded-lg p-4">
              <h3 className="font-semibold text-gray-900 mb-3">⚡ 外購電力特殊資訊</h3>
              <p className="text-green-800 text-sm">
                請確認電力使用量數據來源為正式電費單，並檢查計算期間是否正確。
                注意台電電費單上的度數讀取方式。
              </p>
            </div>
          </div>
        )

      case 'employee_commute':
        return (
          <div className="space-y-6">
            {baseInfo}
            <div className="bg-purple-50 rounded-lg p-4">
              <h3 className="font-semibold text-gray-900 mb-3">🚗 員工通勤特殊資訊</h3>
              <p className="text-purple-800 text-sm">
                員工通勤數據需要包含交通方式統計和平均通勤距離。
                請確認數據來源的準確性和代表性。
              </p>
            </div>
          </div>
        )

      default:
        return baseInfo
    }
  }

  /**
   * 處理通過審核
   */
  const handleApprove = async () => {
    if (!userId || !category || !reviewData) return

    const confirmed = window.confirm(
      `確定要通過 ${reviewData.user.name} 的 ${reviewData.category.name} 申請嗎？`
    )
    if (!confirmed) return

    setIsProcessing(true)
    try {
      const result = await adminReviewsAPI.approveReview(userId, category, '管理員審核通過')

      if (result.success) {
        alert(`✅ ${result.message}`)
        // 更新本地狀態
        if (reviewData && result.data) {
          setReviewData({
            ...reviewData,
            submission: result.data
          })
        }
      } else {
        alert(`❌ 操作失敗：${result.message}`)
      }
    } catch (err: any) {
      console.error('審核通過操作失敗:', err)
      alert(`❌ 操作失敗：${err.message}`)
    } finally {
      setIsProcessing(false)
    }
  }

  /**
   * 處理退回審核
   */
  const handleReject = () => {
    setIsRejectModalOpen(true)
  }

  /**
   * 確認退回審核
   */
  const handleRejectConfirm = async (reason: string) => {
    if (!userId || !category || !reviewData) return

    setIsProcessing(true)
    try {
      const result = await adminReviewsAPI.rejectReview(userId, category, reason)

      if (result.success) {
        alert(`❌ ${result.message}`)
        // 更新本地狀態
        if (reviewData && result.data) {
          setReviewData({
            ...reviewData,
            submission: result.data
          })
        }
        setIsRejectModalOpen(false)
      } else {
        alert(`❌ 操作失敗：${result.message}`)
      }
    } catch (err: any) {
      console.error('審核退回操作失敗:', err)
      alert(`❌ 操作失敗：${err.message}`)
    } finally {
      setIsProcessing(false)
    }
  }

  /**
   * 關閉退回模態框
   */
  const handleRejectClose = () => {
    if (!isProcessing) {
      setIsRejectModalOpen(false)
    }
  }

  // 載入中狀態
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-center py-20">
            <LoadingSpinner size="lg" />
            <span className="ml-3 text-gray-600">載入審核資料中...</span>
          </div>
        </div>
      </div>
    )
  }

  // 錯誤狀態
  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-xl shadow-lg p-8">
            <div className="text-center py-12">
              <div className="text-6xl mb-4">⚠️</div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">載入失敗</h2>
              <p className="text-gray-600 mb-6">{error}</p>
              <div className="space-x-4">
                <button
                  onClick={loadReviewData}
                  className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  重新載入
                </button>
                <BackButton
                  variant="secondary"
                  label="返回"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // 沒有資料
  if (!reviewData) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-xl shadow-lg p-8">
            <div className="text-center py-12">
              <div className="text-6xl mb-4">📋</div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">找不到審核資料</h2>
              <p className="text-gray-600 mb-6">
                無法找到用戶 {userId} 的 {getCategoryDisplayName(category)} 審核資料
              </p>
              <BackButton
                variant="primary"
                label="返回"
              />
            </div>
          </div>
        </div>
      </div>
    )
  }

  const breadcrumbItems = [
    { label: '主控台', path: '/app/admin/poc' },
    { label: '用戶編輯', path: `/app/admin/poc/users/${userId}` },
    { label: `${reviewData.category.name} 審核`, isActive: true }
  ]

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* 頂部導航 */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-4">
              <BackButton
                to={`/app/admin/poc/users/${userId}`}
                variant="secondary"
                size="sm"
              />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  {reviewData.category.name} 審核
                </h1>
                <p className="text-gray-600">
                  用戶：{reviewData.user.name} ({reviewData.user.department})
                </p>
              </div>
            </div>
            <div className="text-sm text-gray-500">
              記錄編號：{reviewData.submission.id}
            </div>
          </div>

          <Breadcrumb items={breadcrumbItems} />
        </div>

        {/* 審核內容 */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          {renderCategoryData(reviewData)}
        </div>

        {/* 審核操作 */}
        {reviewData.submission.status === 'submitted' && (
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">審核操作</h2>
            <div className="flex items-center justify-between">
              <p className="text-gray-600">
                請仔細檢查上述資料，確認無誤後進行審核操作
              </p>
              <div className="flex space-x-4">
                <button
                  onClick={handleReject}
                  disabled={isProcessing}
                  data-action="reject"
                  className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center"
                >
                  {isProcessing ? (
                    <LoadingSpinner size="sm" className="mr-2" />
                  ) : (
                    <span className="mr-2">❌</span>
                  )}
                  退回
                </button>
                <button
                  onClick={handleApprove}
                  disabled={isProcessing}
                  data-action="approve"
                  className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center"
                >
                  {isProcessing ? (
                    <LoadingSpinner size="sm" className="mr-2" />
                  ) : (
                    <span className="mr-2">✅</span>
                  )}
                  通過
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 已審核狀態顯示 */}
        {reviewData.submission.status !== 'submitted' && (
          <div className={`rounded-xl shadow-sm p-6 ${
            reviewData.submission.status === 'approved' ? 'bg-green-50' : 'bg-red-50'
          }`}>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              {reviewData.submission.status === 'approved' ? '✅ 已通過審核' : '❌ 已退回'}
            </h2>
            <div className="space-y-3">
              {reviewData.submission.reviewDate && (
                <p className="text-gray-600">
                  <span className="font-medium">審核日期：</span>
                  {reviewData.submission.reviewDate}
                </p>
              )}
              {reviewData.submission.reviewer && (
                <p className="text-gray-600">
                  <span className="font-medium">審核人員：</span>
                  {reviewData.submission.reviewer}
                </p>
              )}
              {reviewData.submission.reviewNotes && (
                <div>
                  <p className="font-medium text-gray-900 mb-2">退回原因：</p>
                  <div className="bg-white rounded-lg p-3 border">
                    {reviewData.submission.reviewNotes}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* 退回模態框 */}
      <RejectModal
        isOpen={isRejectModalOpen}
        onClose={handleRejectClose}
        onConfirm={handleRejectConfirm}
        submissionInfo={reviewData ? {
          userName: reviewData.user.name,
          categoryName: reviewData.category.name,
          amount: reviewData.submission.amount,
          unit: reviewData.submission.unit
        } : undefined}
      />
    </div>
  )
}

export default ReviewPage