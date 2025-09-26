import React, { createContext, useContext, useEffect, useState, useMemo } from 'react'
import { User } from '@supabase/supabase-js'
import { supabase } from '../lib/supabaseClient'
import { useRole } from '../hooks/useRole'

interface AuthContextType {
  user: User | null
  loading: boolean
  isAdmin: boolean
  role: string | null
  loadingRole: boolean
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  isAdmin: false,
  role: null,
  loadingRole: true
})

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      setLoading(false)
    })

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user ?? null)
        setLoading(false)
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  // 使用 useRole hook 來獲取角色資訊
  const { role, loadingRole } = useRole()

  // 計算 isAdmin
  const isAdmin = useMemo(() => {
    if (loadingRole) return false // 載入中時預設為 false
    return role === 'admin'
  }, [role, loadingRole])

  const value = {
    user,
    loading,
    isAdmin,
    role,
    loadingRole
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}