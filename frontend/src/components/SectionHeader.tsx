import React from 'react'
import { LucideIcon } from 'lucide-react'

interface SectionHeaderProps {
  /** Icon 組件（從 lucide-react 引入） */
  icon: LucideIcon

  /** 區塊標題文字 */
  title: string

  /** Icon 顏色（16 進位色碼） */
  iconColor: string

  /** 可選：自訂容器樣式 */
  className?: string
}

/**
 * SectionHeader - 區塊標題組件
 *
 * 用於能源頁面的各個區塊標題（使用數據、資料列表等）
 * 提供統一的 icon + 標題樣式
 *
 * @example
 * // 使用數據區塊
 * <SectionHeader
 *   icon={Database}
 *   title="使用數據"
 *   iconColor="#3996FE"
 * />
 *
 * @example
 * // 資料列表區塊
 * <SectionHeader
 *   icon={List}
 *   title="資料列表"
 *   iconColor="#3996FE"
 * />
 */
export const SectionHeader: React.FC<SectionHeaderProps> = ({
  icon: Icon,
  title,
  iconColor,
  className = ''
}) => {
  return (
    <div className={`flex items-center mb-6 ${className}`}>
      {/* Icon */}
      <Icon
        className="w-6 h-6 mr-3"
        style={{ color: iconColor }}
      />

      {/* 標題文字 */}
      <h2
        className="text-2xl font-semibold"
        style={{ color: iconColor }}
      >
        {title}
      </h2>
    </div>
  )
}

export default SectionHeader