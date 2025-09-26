import React, { useState } from 'react'

interface RejectModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: (reason: string) => void
  submissionInfo?: {
    userName: string
    categoryName: string
    amount: number
    unit: string
  }
}

const RejectModal: React.FC<RejectModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  submissionInfo
}) => {
  const [reason, setReason] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleConfirm = async () => {
    if (!reason.trim()) {
      alert('請輸入退回原因')
      return
    }

    setIsSubmitting(true)
    try {
      // 模擬 API 延遲
      await new Promise(resolve => setTimeout(resolve, 800))
      onConfirm(reason.trim())
      setReason('')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleClose = () => {
    if (!isSubmitting) {
      setReason('')
      onClose()
    }
  }

  if (!isOpen) return null

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget && !isSubmitting) {
      handleClose()
    }
  }

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      onClick={handleBackdropClick}
    >
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full">
        {/* 標題列 */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900 flex items-center">
            <span className="mr-2">❌</span>
            退回申請
          </h2>
          {!isSubmitting && (
            <button
              onClick={handleClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <span className="text-2xl">×</span>
            </button>
          )}
        </div>

        {/* 內容區域 */}
        <div className="p-6">
          {/* 申請資訊 */}
          {submissionInfo && (
            <div className="mb-4 p-3 bg-gray-50 rounded-lg">
              <h3 className="text-sm font-medium text-gray-700 mb-2">退回申請資訊</h3>
              <div className="text-sm text-gray-600 space-y-1">
                <div>申請人：{submissionInfo.userName}</div>
                <div>類別：{submissionInfo.categoryName}</div>
                <div>數量：{submissionInfo.amount.toLocaleString()} {submissionInfo.unit}</div>
              </div>
            </div>
          )}

          {/* 退回原因輸入 */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              退回原因 <span className="text-red-500">*</span>
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="請詳細說明退回原因，以便申請人了解需要修正的地方..."
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-all duration-200 resize-none"
              rows={4}
              disabled={isSubmitting}
              maxLength={500}
            />
            <div className="flex justify-between text-xs text-gray-500">
              <span>請填寫具體的修正建議</span>
              <span>{reason.length}/500</span>
            </div>
          </div>

          {/* 提示訊息 */}
          <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-sm text-yellow-800">
              💡 建議包含：具體問題描述、需要補充的資料、修正建議等
            </p>
          </div>
        </div>

        {/* 底部按鈕 */}
        <div className="flex justify-end gap-3 p-6 border-t border-gray-200 bg-gray-50 rounded-b-xl">
          <button
            onClick={handleClose}
            disabled={isSubmitting}
            className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            取消
          </button>
          <button
            onClick={handleConfirm}
            disabled={isSubmitting || !reason.trim()}
            className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center"
          >
            {isSubmitting ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
                處理中...
              </>
            ) : (
              <>
                <span className="mr-2">❌</span>
                確認退回
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

export default RejectModal