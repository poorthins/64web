import React from 'react'
import { createPortal } from 'react-dom'
import { AlertCircle, Loader2, X } from 'lucide-react'
import { designTokens } from '../utils/designTokens'

interface ConfirmClearModalProps {
  /** 是否顯示 Modal */
  show: boolean
  /** 確認清除的回調函數 */
  onConfirm: () => void
  /** 取消的回調函數 */
  onCancel: () => void
  /** 是否正在清除中 */
  isClearing?: boolean
}

/**
 * ConfirmClearModal - 清除確認彈窗組件
 *
 * 用於所有能源填報頁面的清除確認對話框
 *
 * 使用方式：
 * ```tsx
 * <ConfirmClearModal
 *   show={showClearConfirmModal}
 *   onConfirm={handleClear}
 *   onCancel={() => setShowClearConfirmModal(false)}
 *   isClearing={clearLoading}
 * />
 * ```
 */
export const ConfirmClearModal: React.FC<ConfirmClearModalProps> = ({
  show,
  onConfirm,
  onCancel,
  isClearing = false
}) => {
  if (!show) return null

  return createPortal(
    <div
      className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 p-4"
      style={{ zIndex: 20000 }}
    >
      <div className="bg-white rounded-lg shadow-2xl max-w-2xl w-full">
        <div className="p-6">
          {/* 關閉按鈕 */}
          <div className="flex justify-end mb-2">
            <button
              onClick={onCancel}
              disabled={isClearing}
              className="text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              aria-label="關閉"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* 內容區 */}
          <div className="text-center">
            {/* 警告圖示 */}
            <div
              className="w-12 h-12 mx-auto rounded-full mb-4 flex items-center justify-center"
              style={{ backgroundColor: '#DC2626' }}
            >
              <AlertCircle className="h-6 w-6 text-white" />
            </div>

            {/* 標題 */}
            <h3
              className="text-lg font-medium mb-2"
              style={{ color: designTokens.colors.textPrimary }}
            >
              確認清除
            </h3>

            {/* 警告訊息 */}
            <p
              className="mb-4 font-medium text-lg"
              style={{ color: designTokens.colors.textPrimary }}
            >
              清除後，這一頁所有資料都會被移除
            </p>

            {/* 提示資訊卡片 */}
            <div
              className="rounded-lg p-4 mb-4 text-left"
              style={{ backgroundColor: '#FEE2E2' }}
            >
              <p
                className="text-base mb-2 font-medium"
                style={{ color: '#991B1B' }}
              >
                ⚠️ 此操作無法復原，將會刪除：
              </p>
              <ul
                className="text-base space-y-1"
                style={{ color: '#7F1D1D' }}
              >
                <li>• 所有填寫的使用數據</li>
                <li>• 已上傳到伺服器的佐證檔案</li>
                <li>• 相關的審核記錄</li>
              </ul>
            </div>

            {/* 按鈕區 */}
            <div className="flex gap-4">
              <button
                onClick={onCancel}
                disabled={isClearing}
                className="flex-1 py-2 rounded-lg font-medium transition-colors border-2"
                style={{
                  borderColor: designTokens.colors.textSecondary,
                  color: designTokens.colors.textPrimary
                }}
                onMouseEnter={(e) => {
                  if (!isClearing) {
                    (e.target as HTMLButtonElement).style.backgroundColor = '#F3F4F6';
                  }
                }}
                onMouseLeave={(e) => {
                  (e.target as HTMLButtonElement).style.backgroundColor = 'transparent';
                }}
              >
                取消
              </button>
              <button
                onClick={onConfirm}
                disabled={isClearing}
                className="flex-1 py-2 rounded-lg text-white font-medium transition-colors flex items-center justify-center"
                style={{ backgroundColor: '#DC2626' }}
                onMouseEnter={(e) => {
                  if (!isClearing) {
                    (e.target as HTMLButtonElement).style.backgroundColor = '#B91C1C';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isClearing) {
                    (e.target as HTMLButtonElement).style.backgroundColor = '#DC2626';
                  }
                }}
              >
                {isClearing ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin mr-2" />
                    清除中...
                  </>
                ) : (
                  '確定清除'
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  )
}

export default ConfirmClearModal
