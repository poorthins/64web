import React from 'react'
import { User, statusColors, statusLabels } from '../data/mockData'

interface UserCardProps {
  user: User
  onClick?: (user: User) => void
  onQuickExport?: (user: User) => void
}

const UserCard: React.FC<UserCardProps> = ({ user, onClick, onQuickExport }) => {
  const colors = statusColors[user.status]

  const handleExportClick = (e: React.MouseEvent) => {
    e.stopPropagation() // 防止觸發卡片的 onClick
    onQuickExport?.(user)
  }

  return (
    <div
      onClick={() => onClick?.(user)}
      className="bg-white rounded-lg p-5 shadow-md hover:shadow-xl transition-all duration-300 cursor-pointer border border-gray-100 hover:border-blue-200 hover:scale-[1.02] hover:-translate-y-1 group"
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center space-x-3">
          <div className="text-3xl">{user.avatar}</div>
          <div>
            <h3 className="font-semibold text-gray-800 group-hover:text-blue-700 transition-colors duration-200">{user.name}</h3>
            <p className="text-sm text-gray-500 group-hover:text-gray-600 transition-colors duration-200">{user.department}</p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          {onQuickExport && (
            <button
              onClick={handleExportClick}
              className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-all duration-200 group"
              title="匯出該用戶資料"
            >
              <span className="text-lg group-hover:scale-110 transition-transform">📥</span>
            </button>
          )}
          <span
            className={`px-3 py-1 rounded-full text-xs font-medium ${colors.bg} ${colors.text} ${colors.border} border`}
          >
            {statusLabels[user.status]}
          </span>
        </div>
      </div>

      <div className="space-y-2 text-sm">
        <div className="flex items-center text-gray-600">
          <span className="mr-2">📧</span>
          <span className="truncate">{user.email}</span>
        </div>
        <div className="flex items-center text-gray-600">
          <span className="mr-2">📋</span>
          <span>{user.entries} 筆記錄</span>
        </div>
        <div className="flex items-center text-gray-600">
          <span className="mr-2">📅</span>
          <span>提交於 {user.submissionDate}</span>
        </div>
      </div>

      <div className="mt-4 pt-3 border-t border-gray-100">
        <div className="flex items-center justify-between text-xs text-gray-500">
          <span>最後活動</span>
          <span>{user.lastActivity}</span>
        </div>
      </div>
    </div>
  )
}

export default UserCard