import React from 'react'

interface ComingSoonProps {
  title: string
  description?: string
  icon?: React.ReactNode
}

const ComingSoon: React.FC<ComingSoonProps> = ({ 
  title, 
  description = "此功能正在開發中，敬請期待", 
  icon 
}) => {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] p-8">
      <div className="text-center max-w-md mx-auto">
        {/* 圖示 */}
        <div className="w-24 h-24 mx-auto bg-blue-100 rounded-full flex items-center justify-center mb-6">
          {icon || (
            <svg className="w-12 h-12 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          )}
        </div>

        {/* 標題 */}
        <h1 className="text-3xl font-bold text-gray-900 mb-3">
          {title}
        </h1>

        {/* 描述 */}
        <p className="text-gray-600 text-lg mb-8">
          {description}
        </p>

        {/* Coming Soon 標籤 */}
        <div className="inline-flex items-center px-4 py-2 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 text-white font-medium mb-6">
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Coming Soon
        </div>

        {/* 裝飾性元素 */}
        <div className="grid grid-cols-3 gap-2 max-w-xs mx-auto opacity-20">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-2 bg-blue-200 rounded animate-pulse" style={{ animationDelay: `${i * 0.1}s` }}></div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default ComingSoon