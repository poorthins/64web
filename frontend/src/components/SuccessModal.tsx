import React, { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { CheckCircle, X, Save } from 'lucide-react'
import { designTokens } from '../utils/designTokens'

interface SuccessModalProps {
  /** 是否顯示 Modal */
  show: boolean
  /** 關閉的回調函數 */
  onClose: () => void
  /** 類型：save (儲存) 或 submit (提交) */
  type?: 'save' | 'submit'
}

// ⭐ 全局鎖：防止 React.StrictMode 導致多個實例同時顯示
let isModalActive = false

/**
 * SuccessModal - 提交成功彈窗組件
 *
 * 用於所有能源填報頁面的提交成功確認對話框
 *
 * 使用方式：
 * ```tsx
 * <SuccessModal
 *   show={showSuccessModal}
 *   message={success}
 *   onClose={() => setShowSuccessModal(false)}
 * />
 * ```
 */
export const SuccessModal: React.FC<SuccessModalProps> = ({
  show,
  onClose,
  type = 'submit'
}) => {
  const hasLock = useRef(false)

  useEffect(() => {
    if (show && !isModalActive) {
      // 獲取鎖
      isModalActive = true
      hasLock.current = true
    }

    return () => {
      // 釋放鎖
      if (hasLock.current) {
        isModalActive = false
        hasLock.current = false
      }
    }
  }, [show])

  // 如果沒顯示，或者沒拿到鎖，就不渲染
  if (!show || !hasLock.current) return null

  // 根據類型決定樣式
  const isSave = type === 'save'
  const iconBgColor = isSave ? '#3996FE' : designTokens.colors.success
  const buttonColor = isSave ? '#3996FE' : designTokens.colors.primary
  const buttonHoverColor = isSave ? '#2563EB' : '#10b981'
  const title = isSave ? '儲存成功！' : '提交成功！'
  const Icon = isSave ? Save : CheckCircle

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
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
              aria-label="關閉"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* 內容區 */}
          <div className="text-center">
            {/* 成功圖示 */}
            <div
              className="w-12 h-12 mx-auto rounded-full mb-4 flex items-center justify-center"
              style={{ backgroundColor: iconBgColor }}
            >
              <Icon className="h-6 w-6 text-white" />
            </div>

            {/* 標題 */}
            <h3
              className="text-lg font-medium mb-4"
              style={{ color: designTokens.colors.textPrimary }}
            >
              {title}
            </h3>

            {/* 提示資訊卡片 */}
            <div
              className="rounded-lg p-4 mb-4 text-left"
              style={{ backgroundColor: 'rgba(245, 245, 245, 0.90)' }}
            >
              <p
                className="text-base mb-2 font-medium"
                style={{ color: designTokens.colors.textPrimary }}
              >
                您的資料已成功儲存，您可以：
              </p>
              <ul
                className="text-base space-y-1"
                style={{ color: designTokens.colors.textSecondary }}
              >
                <li>• 隨時回來查看或修改資料</li>
                <li>• 重新上傳新的證明文件</li>
                <li>• 新增或刪除使用記錄</li>
              </ul>
            </div>

            {/* 確認按鈕 */}
            <button
              onClick={onClose}
              className="w-full py-2 rounded-lg text-white font-medium transition-colors"
              style={{ backgroundColor: buttonColor }}
              onMouseEnter={(e) => {
                (e.target as HTMLButtonElement).style.backgroundColor = buttonHoverColor;
              }}
              onMouseLeave={(e) => {
                (e.target as HTMLButtonElement).style.backgroundColor = buttonColor;
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

export default SuccessModal
