import React from 'react'
import { Navigate } from 'react-router-dom'
import { useRole } from '../hooks/useRole'

interface UserRouteProps {
  children: React.ReactNode
}

const UserRoute: React.FC<UserRouteProps> = ({ children }) => {
  const { role, loadingRole } = useRole()

  if (loadingRole) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  // 如果是管理員，重定向到管理員頁面
  if (role === 'admin') {
    return <Navigate to="/app" replace />
  }

  return <>{children}</>
}

export default UserRoute