import React, { useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'

interface BackButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  to?: string  // 指定返回路徑
  label?: string  // 自訂文字
  onBack?: () => void  // 自訂返回邏輯
  className?: string  // 自訂樣式
  showIcon?: boolean  // 是否顯示圖標
  size?: 'sm' | 'md' | 'lg'  // 按鈕大小
  variant?: 'primary' | 'secondary' | 'ghost'  // 按鈕變體
  disabled?: boolean  // 是否禁用
  enableKeyboardShortcut?: boolean  // 是否啟用鍵盤快捷鍵
}

export const BackButton: React.FC<BackButtonProps> = ({
  to,
  label = '返回',
  onBack,
  className = '',
  showIcon = true,
  size = 'md',
  variant = 'secondary',
  disabled = false,
  enableKeyboardShortcut = true,
  ...restProps
}) => {
  const navigate = useNavigate()
  const location = useLocation()

  /**
   * 智慧返回路徑邏輯
   */
  const getSmartBackPath = (currentPath: string): string => {
    // 審核頁面路徑：/app/admin/poc/users/:id/review/:category -> /app/admin/poc/users/:id
    if (currentPath.includes('/review/')) {
      return currentPath.replace(/\/review\/[^/]+$/, '')
    }

    // 用戶編輯頁面：/app/admin/poc/users/:id -> /app/admin/poc
    if (/\/app\/admin\/poc\/users\/[^/]+$/.test(currentPath)) {
      return '/app/admin/poc'
    }

    // 統計詳情頁面：/app/admin/poc/statistics -> /app/admin/poc
    if (currentPath.includes('/statistics')) {
      return '/app/admin/poc'
    }

    // 創建用戶頁面：/app/admin/poc/create -> /app/admin/poc
    if (currentPath.includes('/create')) {
      return '/app/admin/poc'
    }

    // 預設返回主控台
    return '/app/admin/poc'
  }

  /**
   * 處理返回按鈕點擊
   */
  const handleBack = () => {
    if (disabled) return

    if (onBack) {
      onBack()
    } else if (to) {
      navigate(to)
    } else {
      // 使用智慧返回邏輯
      const backPath = getSmartBackPath(location.pathname)
      navigate(backPath)
    }
  }

  /**
   * 鍵盤快捷鍵處理
   */
  useEffect(() => {
    if (!enableKeyboardShortcut || disabled) return

    const handleKeyPress = (e: KeyboardEvent) => {
      // ESC 鍵返回
      if (e.key === 'Escape') {
        e.preventDefault()
        handleBack()
      }

      // Alt + ← 返回主控台
      if (e.altKey && e.key === 'ArrowLeft') {
        e.preventDefault()
        navigate('/app/admin/poc')
      }
    }

    window.addEventListener('keydown', handleKeyPress)
    return () => window.removeEventListener('keydown', handleKeyPress)
  }, [enableKeyboardShortcut, disabled, location.pathname])

  /**
   * 獲取按鈕樣式
   */
  const getButtonStyles = () => {
    const baseStyles = 'inline-flex items-center justify-center rounded-lg transition-all duration-200 font-medium focus:outline-none focus:ring-2 focus:ring-offset-2'

    // 大小樣式
    const sizeStyles = {
      sm: 'px-3 py-1.5 text-sm',
      md: 'px-4 py-2 text-sm',
      lg: 'px-6 py-3 text-base'
    }

    // 變體樣式
    const variantStyles = {
      primary: 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500 disabled:bg-blue-300',
      secondary: 'bg-gray-100 text-gray-700 hover:bg-gray-200 focus:ring-gray-500 disabled:bg-gray-50 disabled:text-gray-400',
      ghost: 'text-gray-600 hover:text-gray-900 hover:bg-gray-50 focus:ring-gray-500 disabled:text-gray-300'
    }

    // 禁用樣式
    const disabledStyles = disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'

    return `${baseStyles} ${sizeStyles[size]} ${variantStyles[variant]} ${disabledStyles} ${className}`
  }

  /**
   * 獲取圖標大小
   */
  const getIconSize = () => {
    const iconSizes = {
      sm: 'text-sm',
      md: 'text-base',
      lg: 'text-lg'
    }
    return iconSizes[size]
  }

  return (
    <button
      {...restProps}
      onClick={handleBack}
      className={getButtonStyles()}
      disabled={disabled}
      title={`${label} ${enableKeyboardShortcut ? '(ESC)' : ''}`}
      type="button"
      aria-label={`${label}按鈕`}
    >
      {showIcon && (
        <span className={`mr-2 ${getIconSize()}`} aria-hidden="true">
          ←
        </span>
      )}
      <span>{label}</span>
    </button>
  )
}

/**
 * 預設配置的返回按鈕變體
 */
export const BackToDashboard: React.FC<Omit<BackButtonProps, 'to' | 'label'>> = (props) => (
  <BackButton
    {...props}
    to="/app/admin/poc"
    label="返回主控台"
  />
)

export const BackToUserEdit: React.FC<Omit<BackButtonProps, 'label'> & { userId: string }> = ({ userId, ...props }) => (
  <BackButton
    {...props}
    to={`/app/admin/poc/users/${userId}`}
    label="返回用戶編輯"
  />
)

export const SmallBackButton: React.FC<BackButtonProps> = (props) => (
  <BackButton
    {...props}
    size="sm"
    variant="ghost"
    showIcon={true}
  />
)

export const PrimaryBackButton: React.FC<BackButtonProps> = (props) => (
  <BackButton
    {...props}
    variant="primary"
  />
)

export default BackButton