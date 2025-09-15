import { useEffect, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabaseClient'

export interface UserProfile {
  id: string
  email: string
  display_name: string | null
  company: string | null
  job_title: string | null
  phone: string | null
  role: string
  is_active: boolean
}

export interface UseUserProfileReturn {
  profile: UserProfile | null
  displayName: string
  loading: boolean
  error: string | null
}

export const useUserProfile = (): UseUserProfileReturn => {
  const { user } = useAuth()
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchUserProfile = async () => {
      if (!user?.id) {
        setProfile(null)
        setLoading(false)
        return
      }

      try {
        setLoading(true)
        setError(null)

        const { data, error: fetchError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single()

        if (fetchError) {
          console.error('Error fetching user profile:', fetchError)
          setError(fetchError.message)
        } else if (data) {
          setProfile(data)
        }
      } catch (err) {
        console.error('Unexpected error:', err)
        setError(err instanceof Error ? err.message : 'Unknown error')
      } finally {
        setLoading(false)
      }
    }

    fetchUserProfile()
  }, [user?.id])

  // 取得顯示名稱，優先使用 display_name，如果沒有則使用 email
  const displayName = profile?.display_name || user?.email || ''

  return { profile, displayName, loading, error }
}