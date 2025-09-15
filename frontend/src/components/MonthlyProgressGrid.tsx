import React from 'react'

// 月份狀態介面
export interface MonthStatus {
  month: number
  status: 'complete' | 'partial' | 'empty'
  coverage: number
  details?: string // 例: "7-8月帳單覆蓋73%"
}

interface MonthlyProgressGridProps {
  monthStatuses: MonthStatus[]
  year?: number
  className?: string
}

// 取得月份狀態對應的背景顏色
const getMonthStatusColor = (status: string): string => {
  switch (status) {
    case 'complete': 
      return 'bg-green-100 border-green-300 text-green-800 hover:bg-green-200'
    case 'partial': 
      return 'bg-red-100 border-red-300 text-red-800 hover:bg-red-200'
    case 'empty': 
      return 'bg-gray-100 border-gray-300 text-gray-500 hover:bg-gray-200'
    default:
      return 'bg-gray-100 border-gray-300 text-gray-500'
  }
}

// 取得狀態指示圓點的顏色
const getStatusIconColor = (status: string): string => {
  switch (status) {
    case 'complete': return 'bg-green-500'
    case 'partial': return 'bg-red-500'
    case 'empty': return 'bg-gray-300'
    default: return 'bg-gray-300'
  }
}

// 取得狀態對應的emoji符號
const getStatusEmoji = (status: string): string => {
  switch (status) {
    case 'complete': return '✅'
    case 'partial': return '⚠️'
    case 'empty': return '⭕'
    default: return '⭕'
  }
}

// 產生詳細的tooltip文字
const generateTooltipText = (monthStatus: MonthStatus): string => {
  const { month, status, coverage, details } = monthStatus
  
  switch (status) {
    case 'complete':
      return `${month}月完全覆蓋 ✓ (${coverage.toFixed(1)}%)${details ? `\n${details}` : ''}`
    case 'partial':
      return `${month}月部分覆蓋 (${coverage.toFixed(1)}%) - 建議補充${month}月相關帳單${details ? `\n${details}` : ''}`
    case 'empty':
      return `${month}月未填寫 - 需要提供${month}月帳單`
    default:
      return `${month}月`
  }
}

const MonthlyProgressGrid: React.FC<MonthlyProgressGridProps> = ({ 
  monthStatuses, 
  year = new Date().getFullYear(),
  className = '' 
}) => {
  return (
    <div className={`bg-white border border-gray-200 rounded-lg p-4 ${className}`}>
      {/* 標題 */}
      <div className="mb-4">
        <h4 className="text-sm font-medium text-gray-700 mb-1">
          {year}年度填寫進度
        </h4>
        <div className="flex items-center space-x-4 text-xs text-gray-500">
          <div className="flex items-center space-x-1">
            <div className="w-3 h-3 bg-green-500 rounded"></div>
            <span>完全填寫</span>
          </div>
          <div className="flex items-center space-x-1">
            <div className="w-3 h-3 bg-red-500 rounded"></div>
            <span>部分填寫</span>
          </div>
          <div className="flex items-center space-x-1">
            <div className="w-3 h-3 bg-gray-300 rounded"></div>
            <span>未填寫</span>
          </div>
        </div>
      </div>

      {/* 12格月份網格 */}
      <div className="monthly-progress-grid grid grid-cols-6 gap-2">
        {monthStatuses.map((monthStatus) => (
          <div 
            key={monthStatus.month}
            className={`
              flex flex-col items-center p-3 rounded-lg border-2 transition-all duration-200 cursor-help
              ${getMonthStatusColor(monthStatus.status)}
            `}
            title={generateTooltipText(monthStatus)}
          >
            {/* 月份標籤 */}
            <span className="text-xs font-medium mb-1">
              {monthStatus.month}月
            </span>
            
            {/* 狀態指示圓點 */}
            <div className={`w-4 h-4 rounded-full ${getStatusIconColor(monthStatus.status)}`} />
            
            {/* 覆蓋百分比（僅在有數據時顯示） */}
            {monthStatus.coverage > 0 && (
              <span className="text-xs mt-1 font-medium">
                {monthStatus.coverage.toFixed(0)}%
              </span>
            )}
            
            {/* 狀態emoji（小螢幕時顯示） */}
            <span className="text-sm mt-1 sm:hidden">
              {getStatusEmoji(monthStatus.status)}
            </span>
          </div>
        ))}
      </div>

      {/* 響應式布局說明（手機版改為3x4） */}
      <style>{`
        @media (max-width: 640px) {
          .monthly-progress-grid {
            grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
          }
        }
      `}</style>
    </div>
  )
}

export default MonthlyProgressGrid