import { useEffect, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabaseClient'

export interface UseRoleReturn {
  role: string | null
  loadingRole: boolean
  error: string | null
}

export const useRole = (): UseRoleReturn => {
  const { user } = useAuth()
  const [role, setRole] = useState<string | null>(null)
  const [loadingRole, setLoadingRole] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchUserRole = async () => {
      if (!user?.id) {
        setRole(null)
        setLoadingRole(false)
        return
      }

      try {
        setLoadingRole(true)
        setError(null)

        const { data, error: fetchError } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single()

        if (fetchError) {
          console.error('Error fetching user role:', fetchError)
          setError(fetchError.message)
          setRole('user') // 預設為 user
        } else {
          setRole(data?.role || 'user')
        }
      } catch (err) {
        console.error('Unexpected error:', err)
        setError(err instanceof Error ? err.message : 'Unknown error')
        setRole('user')
      } finally {
        setLoadingRole(false)
      }
    }

    fetchUserRole()
  }, [user?.id])

  return { role, loadingRole, error }
}