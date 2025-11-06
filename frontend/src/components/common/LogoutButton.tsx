import React from 'react'

interface LogoutButtonProps {
  onClick: () => void
  disabled?: boolean
  isLoading?: boolean
  className?: string
  'data-testid'?: string
}

/**
 * LogoutButton - 統一的登出按鈕樣式
 *
 * 統一規格：
 * - 尺寸：153×51px
 * - 白色背景，深綠色文字 (#0E3C32)
 * - 圓角：50px
 * - 陰影：0px 4px 4px 0px rgba(0, 0, 0, 0.25)
 * - 字體：Inter, 24px, 粗體 (700)
 * - Hover：文字變色為 #01E083
 */
const LogoutButton: React.FC<LogoutButtonProps> = ({
  onClick,
  disabled = false,
  isLoading = false,
  className = '',
  'data-testid': dataTestId
}) => {
  return (
    <button
      onClick={onClick}
      disabled={disabled || isLoading}
      data-testid={dataTestId}
      className={`
        bg-white font-medium transition-colors flex items-center justify-center
        text-[#0E3C32] hover:text-[#01E083] disabled:opacity-50
        ${className}
      `}
      style={{
        width: '153px',
        height: '51px',
        flexShrink: 0,
        textAlign: 'center',
        fontFamily: 'Inter',
        fontSize: '24px',
        fontStyle: 'normal',
        fontWeight: 700,
        lineHeight: 'normal',
        borderRadius: '50px',
        boxShadow: '0px 4px 4px 0px rgba(0, 0, 0, 0.25)'
      }}
    >
      {isLoading ? '登出中...' : 'Log out'}
    </button>
  )
}

export default LogoutButton
