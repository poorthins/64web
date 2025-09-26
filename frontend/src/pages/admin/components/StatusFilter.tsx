import React from 'react'
import { UserStatus, statusLabels, statusColors } from '../data/mockData'

interface StatusFilterProps {
  selectedStatuses: UserStatus[]
  onChange: (statuses: UserStatus[]) => void
}

const StatusFilter: React.FC<StatusFilterProps> = ({
  selectedStatuses,
  onChange
}) => {
  const statuses: UserStatus[] = ['submitted', 'approved', 'rejected']

  const toggleStatus = (status: UserStatus) => {
    const newStatuses = selectedStatuses.includes(status)
      ? selectedStatuses.filter(s => s !== status)
      : [...selectedStatuses, status]
    onChange(newStatuses)
  }

  const selectAll = () => {
    onChange(statuses)
  }

  const clearAll = () => {
    onChange([])
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-gray-700">狀態篩選</h3>
        <div className="flex space-x-2">
          <button
            onClick={selectAll}
            className="text-xs text-blue-600 hover:text-blue-800 underline"
          >
            全選
          </button>
          <button
            onClick={clearAll}
            className="text-xs text-gray-500 hover:text-gray-700 underline"
          >
            清除
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {statuses.map(status => {
          const isSelected = selectedStatuses.includes(status)
          const colors = statusColors[status]

          return (
            <button
              key={status}
              onClick={() => toggleStatus(status)}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 border ${
                isSelected
                  ? `${colors.bg} ${colors.text} ${colors.border} border-2`
                  : 'bg-gray-100 text-gray-600 border-gray-200 hover:bg-gray-200'
              }`}
            >
              {statusLabels[status]}
              {isSelected && (
                <span className="ml-1 text-xs">✓</span>
              )}
            </button>
          )
        })}
      </div>

      <div className="text-xs text-gray-500">
        {selectedStatuses.length === 0 ? (
          '顯示所有狀態'
        ) : (
          `已選擇 ${selectedStatuses.length} 個狀態`
        )}
      </div>
    </div>
  )
}

export default StatusFilter