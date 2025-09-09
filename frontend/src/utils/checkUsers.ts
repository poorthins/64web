import { supabase } from '../lib/supabaseClient'

/**
 * 檢查 Supabase profiles 表中的所有用戶記錄
 */
export async function checkAllUsers() {
  try {
    console.log('🔍 Checking all users in profiles table...')
    
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('❌ Error fetching users:', error)
      return { success: false, error: error.message }
    }

    console.log('✅ Found users:', data)
    console.log('📊 Total users:', data?.length || 0)
    
    if (data && data.length > 0) {
      data.forEach((user, index) => {
        console.log(`👤 User ${index + 1}:`, {
          id: user.id,
          email: user.email,
          display_name: user.display_name,
          role: user.role,
          is_active: user.is_active,
          created_at: user.created_at
        })
      })
    }

    return { success: true, users: data || [] }
  } catch (error) {
    console.error('💥 Unexpected error:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

/**
 * 檢查特定 email 的用戶
 */
export async function checkUserByEmail(email: string) {
  try {
    console.log(`🔍 Checking user with email: ${email}`)
    
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('email', email)
      .maybeSingle()

    if (error) {
      console.error('❌ Error fetching user:', error)
      return { success: false, error: error.message }
    }

    if (data) {
      console.log('✅ Found user:', data)
    } else {
      console.log('❌ User not found')
    }

    return { success: true, user: data }
  } catch (error) {
    console.error('💥 Unexpected error:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

/**
 * 檢查 auth.users 表（需要管理員權限）
 */
export async function checkAuthUsers() {
  try {
    console.log('🔍 Checking auth.users table...')
    
    const { data, error } = await supabase.auth.admin.listUsers()

    if (error) {
      console.error('❌ Error fetching auth users:', error)
      return { success: false, error: error.message }
    }

    console.log('✅ Found auth users:', data.users)
    console.log('📊 Total auth users:', data.users?.length || 0)
    
    if (data.users && data.users.length > 0) {
      data.users.forEach((user, index) => {
        console.log(`👤 Auth User ${index + 1}:`, {
          id: user.id,
          email: user.email,
          created_at: user.created_at,
          email_confirmed_at: user.email_confirmed_at,
          user_metadata: user.user_metadata
        })
      })
    }

    return { success: true, users: data.users || [] }
  } catch (error) {
    console.error('💥 Unexpected error:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}
