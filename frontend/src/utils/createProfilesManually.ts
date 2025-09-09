import { supabase } from '../lib/supabaseClient'

export const createProfileManually = async (userId: string, email: string, role: 'admin' | 'user') => {
  try {
    console.log(`🔧 Creating profile for ${email} with role ${role}...`)
    
    // Try to insert the profile directly
    const { data, error } = await supabase
      .from('profiles')
      .upsert({
        id: userId,
        email: email,
        role: role,
        is_active: true,
        display_name: role === 'admin' ? 'Admin User' : 'Regular User',
        company: 'Test Company',
        job_title: role === 'admin' ? 'Administrator' : 'Employee',
        phone: role === 'admin' ? '0900-000-001' : '0900-000-002',
        report_year: 2025,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'id'
      })
    
    if (error) {
      console.error(`❌ Error creating profile for ${email}:`, error)
      return false
    } else {
      console.log(`✅ Successfully created profile for ${email}`)
      return true
    }
  } catch (err) {
    console.error(`❌ Unexpected error creating profile for ${email}:`, err)
    return false
  }
}

export const createCurrentUserProfile = async () => {
  try {
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      console.error('❌ No authenticated user found:', userError)
      return false
    }
    
    console.log(`👤 Current user: ${user.email}`)
    
    // Determine role based on email
    const role = user.email === 'a1@test.com' ? 'admin' : 'user'
    
    return await createProfileManually(user.id, user.email!, role)
    
  } catch (err) {
    console.error('❌ Error creating current user profile:', err)
    return false
  }
}

export const testProfilesTable = async () => {
  try {
    console.log('🔍 Testing profiles table access...')
    
    // Try to read from profiles table
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .limit(1)
    
    if (error) {
      console.error('❌ Error accessing profiles table:', error)
      console.log('💡 This might indicate:')
      console.log('  - Table does not exist')
      console.log('  - RLS policies are blocking access')
      console.log('  - Database connection issues')
      return false
    } else {
      console.log('✅ Profiles table is accessible')
      console.log('📊 Current profiles count:', data?.length || 0)
      return true
    }
  } catch (err) {
    console.error('❌ Unexpected error testing profiles table:', err)
    return false
  }
}

// Make functions available globally for console use
if (typeof window !== 'undefined') {
  (window as any).createCurrentUserProfile = createCurrentUserProfile;
  (window as any).testProfilesTable = testProfilesTable;
  (window as any).createProfileManually = createProfileManually;
}
