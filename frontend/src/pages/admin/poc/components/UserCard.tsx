import React from 'react'
import { User, statusColors, statusLabels } from '../data/mockData'

interface UserCardProps {
  user: User
  onClick?: (user: User) => void
}

const UserCard: React.FC<UserCardProps> = ({ user, onClick }) => {
  const colors = statusColors[user.status]

  return (
    <div
      onClick={() => onClick?.(user)}
      className="bg-white rounded-lg p-5 shadow-md hover:shadow-lg transition-all duration-200 cursor-pointer border border-gray-100"
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center space-x-3">
          <div className="text-3xl">{user.avatar}</div>
          <div>
            <h3 className="font-semibold text-gray-800">{user.name}</h3>
            <p className="text-sm text-gray-500">{user.department}</p>
          </div>
        </div>
        <span
          className={`px-3 py-1 rounded-full text-xs font-medium ${colors.bg} ${colors.text} ${colors.border} border`}
        >
          {statusLabels[user.status]}
        </span>
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