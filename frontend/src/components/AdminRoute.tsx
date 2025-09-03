import React from 'react'
import { Navigate } from 'react-router-dom'
import { useRole } from '../hooks/useRole'

interface AdminRouteProps {
  children: React.ReactNode
}

const AdminRoute: React.FC<AdminRouteProps> = ({ children }) => {
  const { role, loadingRole } = useRole()

  if (loadingRole) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (role !== 'admin') {
    return <Navigate to="/app" replace />
  }

  return <>{children}</>
}

export default AdminRoute