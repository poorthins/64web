import React from 'react'
import { createPortal } from 'react-dom'
import { AlertCircle, X } from 'lucide-react'
import { designTokens } from '../utils/designTokens'

interface ErrorModalProps {
  /** 是否顯示 Modal */
  show: boolean
  /** 錯誤訊息內容 */
  message: string
  /** 關閉的回調函數 */
  onClose: () => void
}

/**
 * ErrorModal - 錯誤提示彈窗組件
 *
 * 用於顯示錯誤訊息的居中彈窗
 */
export const ErrorModal: React.FC<ErrorModalProps> = ({
  show,
  message,
  onClose
}) => {
  if (!show) return null

  return createPortal(
    <div
      className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 p-4"
      style={{ zIndex: 20000 }}
    >
      <div className="bg-white rounded-lg shadow-2xl max-w-md w-full">
        <div className="p-6">
          {/* 關閉按鈕 */}
          <div className="flex justify-end mb-2">
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
              aria-label="關閉"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* 內容區 */}
          <div className="text-center">
            {/* 錯誤圖示 */}
            <div
              className="w-12 h-12 mx-auto rounded-full mb-4 flex items-center justify-center"
              style={{ backgroundColor: '#EF4444' }}
            >
              <AlertCircle className="h-6 w-6 text-white" />
            </div>

            {/* 標題 */}
            <h3
              className="text-lg font-medium mb-2"
              style={{ color: designTokens.colors.textPrimary }}
            >
              提示
            </h3>

            {/* 錯誤訊息 */}
            <p
              className="mb-6 font-medium text-lg"
              style={{ color: designTokens.colors.textPrimary }}
            >
              {message}
            </p>

            {/* 確認按鈕 */}
            <button
              onClick={onClose}
              className="w-full py-2 rounded-lg text-white font-medium transition-colors"
              style={{ backgroundColor: '#EF4444' }}
              onMouseEnter={(e) => {
                (e.target as HTMLButtonElement).style.backgroundColor = '#DC2626';
              }}
              onMouseLeave={(e) => {
                (e.target as HTMLButtonElement).style.backgroundColor = '#EF4444';
              }}
            >
              確認
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  )
}

export default ErrorModal
