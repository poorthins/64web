import React from 'react'
import { useAuth } from '../contexts/AuthContext'

const PingPage: React.FC = () => {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-lg">Loading...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-2xl font-bold mb-4">Ping Status</h1>
        {user ? (
          <p className="text-green-600">
            logged in: <span className="font-mono">{user.email}</span>
          </p>
        ) : (
          <p className="text-gray-600">guest</p>
        )}
      </div>
    </div>
  )
}

export default PingPage