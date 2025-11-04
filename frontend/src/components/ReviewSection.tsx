import React, { useState, useEffect } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { useSubmissions } from '../pages/admin/hooks/useSubmissions'
import { reviewEntry } from '../api/reviewEnhancements'

interface ReviewSectionProps {
  entryId: string
  userId: string
  category: string
  userName?: string
  amount?: number
  unit?: string
  onApprove?: () => void
  onReject?: (reason: string) => void
  className?: string
  // 管理員編輯相關
  role?: string | null
  onSave?: () => void
  isSaving?: boolean
}

const ReviewSection: React.FC<ReviewSectionProps> = ({
  entryId,
  userId,
  category,
  userName,
  amount,
  unit,
  onApprove,
  onReject,
  className = '',
  role,
  onSave,
  isSaving
}) => {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const [reviewComment, setReviewComment] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  // 不再使用舊的 reviewSubmission
  // const { reviewSubmission } = useSubmissions()

  // 只在審核模式下顯示
  const isReviewMode = searchParams.get('mode') === 'review'

  // 如果不是審核模式，不渲染組件
  if (!isReviewMode) return null

  // 處理通過審核
  const handleApprove = async () => {
    console.group('📝 ReviewSection - 通過審核');
    console.log('操作參數:', { entryId, reviewComment });

    setIsSubmitting(true)
    try {
      // 使用新的三狀態 API
      await reviewEntry(entryId, 'approve', reviewComment || '審核通過')

      console.log('✅ 通過審核成功');
      console.log('🔔 準備顯示 alert...');
      alert('✅ 審核通過！')
      console.log('🔔 alert 已執行');

      // 回調外部處理函數
      onApprove?.()

      // 清空評論
      setReviewComment('')

      // 短暫延遲讓用戶看到訊息，然後返回用戶詳情頁
      console.log('⏱️ 設定 1 秒後跳轉...');
      setTimeout(() => {
        console.log('🔄 開始跳轉到:', `/app/admin/users/${userId}`);
        navigate(`/app/admin/users/${userId}`)
      }, 1000) // 1秒延遲

    } catch (error) {
      console.error('❌ 審核通過失敗:', error)
      alert('❌ 審核失敗：' + (error instanceof Error ? error.message : '未知錯誤'))
    } finally {
      setIsSubmitting(false)
      console.groupEnd();
    }
  }

  // 處理退回修正
  const handleReject = async () => {
    if (!reviewComment.trim()) {
      alert('⚠️ 請填寫退回原因，說明需要修正的地方')
      return
    }

    console.group('📝 ReviewSection - 退回修正');
    console.log('操作參數:', { entryId, reviewComment });

    setIsSubmitting(true)
    try {
      // 使用新的三狀態 API
      await reviewEntry(entryId, 'reject', reviewComment)

      console.log('✅ 退回修正成功');
      alert('✅ 已退回，原因：' + reviewComment)

      // 回調外部處理函數
      onReject?.(reviewComment)

      // 清空評論
      setReviewComment('')

      // 短暫延遲讓用戶看到訊息，然後返回用戶詳情頁
      setTimeout(() => {
        navigate(`/app/admin/users/${userId}`)
      }, 1000) // 1秒延遲

    } catch (error) {
      console.error('❌ 審核退回失敗:', error)
      alert('❌ 退回失敗：' + (error instanceof Error ? error.message : '未知錯誤'))
    } finally {
      setIsSubmitting(false)
      console.groupEnd();
    }
  }


  return (
    <div className={`mt-8 p-6 bg-yellow-50 border-2 border-yellow-200 rounded-lg ${className}`}>
      {/* 審核標題 */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-gray-900 flex items-center">
          <span className="mr-2">📋</span>
          管理員審核區
        </h3>
        <div className="text-sm text-yellow-700 bg-yellow-100 px-3 py-1 rounded-full">
          審核模式
        </div>
      </div>

      {/* 填報資訊卡片 */}
      <div className="mb-6 p-4 bg-white border border-yellow-200 rounded-lg">
        <h4 className="font-medium text-gray-900 mb-3 flex items-center">
          <span className="mr-2">📊</span>
          填報資訊
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-600">填報ID:</span>
            <span className="font-mono text-gray-900">{entryId}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">用戶ID:</span>
            <span className="font-mono text-gray-900">{userId}</span>
          </div>
          {userName && (
            <div className="flex justify-between">
              <span className="text-gray-600">填報者:</span>
              <span className="text-gray-900">{userName}</span>
            </div>
          )}
          <div className="flex justify-between">
            <span className="text-gray-600">類別:</span>
            <span className="text-gray-900">{category}</span>
          </div>
          {amount !== undefined && unit && (
            <div className="flex justify-between">
              <span className="text-gray-600">數量:</span>
              <span className="text-gray-900">{amount.toLocaleString()} {unit}</span>
            </div>
          )}
        </div>
      </div>

      {/* 審核意見輸入 */}
      <div className="mb-6">
        <label className="block mb-2 font-medium text-gray-900">
          審核意見
          <span className="text-sm text-gray-500 ml-2">
            (通過審核可選填，退回修正必須填寫)
          </span>
        </label>
        <textarea
          className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 transition-all duration-200 resize-none"
          rows={4}
          placeholder="請說明需要修正的地方，或填寫審核備註..."
          value={reviewComment}
          onChange={(e) => setReviewComment(e.target.value)}
          disabled={isSubmitting}
          maxLength={500}
        />
        <div className="flex justify-between mt-1 text-xs text-gray-500">
          <span>提供具體的修正建議有助於提高填報品質</span>
          <span>{reviewComment.length}/500</span>
        </div>
      </div>

      {/* 操作按鈕 */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* 管理員專用：儲存修改按鈕 */}
        {role === 'admin' && onSave && (
          <button
            onClick={onSave}
            disabled={isSaving}
            className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center font-medium"
          >
            {isSaving ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
                儲存中...
              </>
            ) : (
              <>
                <span className="mr-2">💾</span>
                儲存編輯
              </>
            )}
          </button>
        )}

        <button
          onClick={handleApprove}
          disabled={isSubmitting}
          className="flex-1 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center font-medium"
        >
          {isSubmitting ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
              處理中...
            </>
          ) : (
            <>
              <span className="mr-2">✅</span>
              通過審核
            </>
          )}
        </button>

        <button
          onClick={handleReject}
          disabled={isSubmitting}
          className="flex-1 px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center font-medium"
        >
          {isSubmitting ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
              處理中...
            </>
          ) : (
            <>
              <span className="mr-2">❌</span>
              退回修正
            </>
          )}
        </button>
      </div>

      {/* 審核指引 */}
      <div className="mt-4 p-3 bg-yellow-100 border border-yellow-300 rounded-lg">
        <p className="text-sm text-yellow-800">
          <span className="font-medium">💡 審核指引：</span>
          通過審核表示資料正確無誤；退回修正請詳細說明問題，幫助用戶改善填報品質。
        </p>
      </div>
    </div>
  )
}

export default ReviewSection