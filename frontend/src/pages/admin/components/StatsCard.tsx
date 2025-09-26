import React from 'react'

interface StatsCardProps {
  title: string
  count: number
  icon: string
  bgColor: string
  onClick?: () => void
}

const StatsCard: React.FC<StatsCardProps> = ({
  title,
  count,
  icon,
  bgColor,
  onClick
}) => {
  return (
    <div
      onClick={onClick}
      className={`${bgColor} rounded-xl p-6 cursor-pointer transition-all duration-200 hover:shadow-lg hover:scale-105 border border-opacity-20`}
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-gray-600 text-sm font-medium mb-1">{title}</p>
          <p className="text-3xl font-bold text-gray-800">{count}</p>
        </div>
        <div className="text-4xl">{icon}</div>
      </div>
    </div>
  )
}

export default StatsCard