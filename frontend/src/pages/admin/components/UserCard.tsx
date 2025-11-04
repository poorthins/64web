import React from 'react'
import { User } from '../types/admin'

interface UserCardProps {
  user: User
  onClick?: (user: User) => void
}

const UserCard: React.FC<UserCardProps> = ({ user, onClick }) => {
  return (
    <div
      onClick={() => onClick?.(user)}
      className="admin-user-card"
    >
      <div className="admin-user-card-company">
        {user.department}
      </div>
      <div className="admin-user-card-name">
        {user.name} · {user.email}
      </div>
    </div>
  )
}

export default UserCard