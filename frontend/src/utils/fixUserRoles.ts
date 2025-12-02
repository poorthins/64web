import { supabase } from '../supabaseClient'

export const checkUserRoles = async (): Promise<any[] | undefined> => {
  try {
    console.log('🔍 Checking user roles...')
    
    // Get all profiles
    const { data: profiles, error } = await supabase
      .from('profiles')
      .select('*')
      .order('email')
    
    if (error) {
      console.error('❌ Error fetching profiles:', error)
      return undefined
    }
    
    console.log('📋 Current profiles:')
    profiles?.forEach(profile => {
      console.log(`  - ${profile.email}: ${profile.role} (active: ${profile.is_active})`)
    })
    
    return profiles || []
  } catch (err) {
    console.error('❌ Unexpected error:', err)
    return undefined
  }
}

export const fixUserRoles = async () => {
  try {
    console.log('🔧 Fixing user roles...')
    
    // First, check if a1@test.com exists and set as admin
    const { data: a1Profile, error: a1Error } = await supabase
      .from('profiles')
      .select('*')
      .eq('email', 'a1@test.com')
      .single()
    
    if (a1Error && a1Error.code !== 'PGRST116') {
      console.error('❌ Error checking a1@test.com:', a1Error)
      return
    }
    
    if (a1Profile) {
      // Update a1 to admin
      const { error: updateA1Error } = await supabase
        .from('profiles')
        .update({ 
          role: 'admin',
          is_active: true,
          display_name: 'Admin User',
          company: 'Test Company',
          job_title: 'Administrator',
          phone: '0900-000-001'
        })
        .eq('email', 'a1@test.com')
      
      if (updateA1Error) {
        console.error('❌ Error updating a1@test.com:', updateA1Error)
      } else {
        console.log('✅ Updated a1@test.com to admin role')
      }
    } else {
      console.log('⚠️ a1@test.com profile not found')
    }
    
    // Check if b1@test.com exists and set as user
    const { data: b1Profile, error: b1Error } = await supabase
      .from('profiles')
      .select('*')
      .eq('email', 'b1@test.com')
      .single()
    
    if (b1Error && b1Error.code !== 'PGRST116') {
      console.error('❌ Error checking b1@test.com:', b1Error)
      return
    }
    
    if (b1Profile) {
      // Update b1 to user
      const { error: updateB1Error } = await supabase
        .from('profiles')
        .update({ 
          role: 'user',
          is_active: true,
          display_name: 'Regular User',
          company: 'Test Company',
          job_title: 'Employee',
          phone: '0900-000-002'
        })
        .eq('email', 'b1@test.com')
      
      if (updateB1Error) {
        console.error('❌ Error updating b1@test.com:', updateB1Error)
      } else {
        console.log('✅ Updated b1@test.com to user role')
      }
    } else {
      console.log('⚠️ b1@test.com profile not found')
    }
    
    // Check results
    await checkUserRoles()
    
  } catch (err) {
    console.error('❌ Unexpected error:', err)
  }
}

export const createMissingProfiles = async () => {
  try {
    console.log('🔧 Creating missing profiles...')
    
    // Get auth users
    const { data: { users }, error: authError } = await supabase.auth.admin.listUsers()
    
    if (authError) {
      console.error('❌ Error fetching auth users:', authError)
      return
    }
    
    console.log('👥 Auth users found:', users?.length)
    
    for (const user of users || []) {
      console.log(`📧 Checking user: ${user.email}`)
      
      // Check if profile exists
      const { data: existingProfile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()
      
      if (profileError && profileError.code === 'PGRST116') {
        // Profile doesn't exist, create it
        const role = user.email === 'a1@test.com' ? 'admin' : 'user'
        const displayName = user.email === 'a1@test.com' ? 'Admin User' : 'Regular User'
        const jobTitle = user.email === 'a1@test.com' ? 'Administrator' : 'Employee'
        
        const { error: insertError } = await supabase
          .from('profiles')
          .insert({
            id: user.id,
            email: user.email,
            role: role,
            is_active: true,
            display_name: displayName,
            company: 'Test Company',
            job_title: jobTitle,
            phone: user.email === 'a1@test.com' ? '0900-000-001' : '0900-000-002',
            report_year: 2025
          })
        
        if (insertError) {
          console.error(`❌ Error creating profile for ${user.email}:`, insertError)
        } else {
          console.log(`✅ Created profile for ${user.email} with role: ${role}`)
        }
      } else if (existingProfile) {
        console.log(`✅ Profile already exists for ${user.email}: ${existingProfile.role}`)
      }
    }
    
  } catch (err) {
    console.error('❌ Unexpected error:', err)
  }
}

// Make functions available globally for console use
if (typeof window !== 'undefined') {
  (window as any).checkUserRoles = checkUserRoles;
  (window as any).fixUserRoles = fixUserRoles;
  (window as any).createMissingProfiles = createMissingProfiles;
}
