import { useEffect, useState, useCallback } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../supabaseClient'

export interface UseRoleReturn {
  role: string | null
  loadingRole: boolean
  error: string | null
  refetchRole: () => Promise<void>
}

export const useRole = (): UseRoleReturn => {
  const { user } = useAuth()
  const [role, setRole] = useState<string | null>(null)
  const [loadingRole, setLoadingRole] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchUserRole = useCallback(async () => {
    if (!user?.id) {
      console.log('🔍 useRole: No user ID, setting role to null')
      setRole(null)
      setLoadingRole(false)
      return
    }

    try {
      console.log('🔍 useRole: Fetching role for user:', user.id)
      setLoadingRole(true)
      setError(null)

      // 先嘗試直接查詢 profiles 表
      const { data, error: fetchError } = await supabase
        .from('profiles')
        .select('role, display_name, is_active, email')
        .eq('id', user.id)
        .single()

      if (fetchError) {
        console.error('❌ useRole: Error fetching user role from profiles:', {
          error: fetchError,
          code: fetchError.code,
          message: fetchError.message,
          details: fetchError.details,
          hint: fetchError.hint
        })

        // 如果是 RLS 或找不到記錄的錯誤，嘗試使用 RPC 函數
        if (fetchError.code === 'PGRST116' || fetchError.code === '42501') {
          console.log('🔍 useRole: Trying is_admin RPC function as fallback')
          
          const { data: adminResult, error: adminError } = await supabase.rpc('is_admin')
          
          if (adminError) {
            console.error('❌ useRole: is_admin RPC also failed:', adminError)
            setError(`無法確認用戶角色: ${fetchError.message}`)
            setRole('user') // 預設為 user，安全起見
          } else {
            console.log('✅ useRole: Got result from is_admin RPC:', adminResult)
            setRole(adminResult ? 'admin' : 'user')
          }
        } else {
          setError(`查詢用戶角色失敗: ${fetchError.message}`)
          setRole('user') // 預設為 user
        }
      } else {
        console.log('✅ useRole: Successfully fetched user profile:', data)
        const userRole = data?.role || 'user'
        console.log('✅ useRole: User role determined as:', userRole)
        setRole(userRole)
        
        // 記錄完整的用戶資訊用於除錯
        console.log('📊 useRole: Complete user profile:', {
          role: data.role,
          displayName: data.display_name,
          isActive: data.is_active,
          email: data.email
        })
      }
    } catch (err) {
      console.error('💥 useRole: Unexpected error:', err)
      const errorMessage = err instanceof Error ? err.message : 'Unknown error'
      setError(`獲取用戶角色時發生未知錯誤: ${errorMessage}`)
      setRole('user') // 預設為 user
    } finally {
      setLoadingRole(false)
    }
  }, [user?.id])

  useEffect(() => {
    fetchUserRole()
  }, [fetchUserRole])

  return { role, loadingRole, error, refetchRole: fetchUserRole }
}