import React from 'react'

interface ProgressBarProps {
  completed: number
  total: number
}

const ProgressBar: React.FC<ProgressBarProps> = ({ completed, total }) => {
  const percentage = total > 0 ? Math.round((completed / total) * 100) : 0

  return (
    <section className="py-12 px-6">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow-md p-8">
          <h3 className="text-2xl font-bold text-figma-primary mb-6 text-center">
            完成進度
          </h3>

          <div className="flex items-center justify-center space-x-4 mb-4">
            <span className="text-figma-accent font-bold" style={{ fontSize: '34px' }}>
              {completed}/{total}
            </span>
            <span className="text-gray-600 font-semibold" style={{ fontSize: '24px' }}>
              {percentage}%
            </span>
          </div>

          {/* Progress Bar */}
          <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden">
            <div
              className="bg-figma-accent h-full rounded-full transition-all duration-500 ease-out"
              style={{ width: `${percentage}%` }}
            />
          </div>

          <p className="text-center text-gray-500 mt-4 text-sm">
            已完成 {completed} 項，共 {total} 項能源類別
          </p>
        </div>
      </div>
    </section>
  )
}

export default ProgressBar
