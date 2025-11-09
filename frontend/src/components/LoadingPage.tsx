import React from 'react'
import { Loader2 } from 'lucide-react'
import { designTokens } from '../utils/designTokens'

/**
 * LoadingPage - 統一的載入畫面組件
 *
 * 用於所有能源填報頁面的資料載入狀態顯示
 *
 * 使用方式：
 * ```tsx
 * if (dataLoading) return <LoadingPage />
 * ```
 */
export const LoadingPage: React.FC = () => {
  return (
    <div
      className="min-h-screen flex items-center justify-center"
      style={{ backgroundColor: designTokens.colors.background }}
    >
      <div className="text-center">
        <Loader2
          className="w-12 h-12 animate-spin mx-auto mb-4"
          style={{ color: designTokens.colors.accentPrimary }}
        />
        <p style={{ color: designTokens.colors.textPrimary }}>
          載入中...
        </p>
      </div>
    </div>
  )
}

export default LoadingPage
