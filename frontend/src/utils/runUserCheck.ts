import { checkAllUsers, checkUserByEmail, checkAuthUsers } from './checkUsers'

/**
 * 執行完整的用戶檢查
 */
export async function runCompleteUserCheck() {
  console.log('🚀 Starting complete user check...')
  console.log('=' .repeat(50))
  
  // 1. 檢查 profiles 表中的所有用戶
  console.log('\n📋 Step 1: Checking profiles table')
  const profilesResult = await checkAllUsers()
  
  // 2. 檢查特定用戶
  console.log('\n📋 Step 2: Checking specific users')
  const a1Result = await checkUserByEmail('a1@test.com')
  const b1Result = await checkUserByEmail('b1@test.com')
  
  // 3. 檢查 auth.users 表
  console.log('\n📋 Step 3: Checking auth.users table')
  const authResult = await checkAuthUsers()
  
  // 4. 總結報告
  console.log('\n📊 SUMMARY REPORT')
  console.log('=' .repeat(50))
  
  console.log(`📋 Profiles table: ${profilesResult.success ? '✅ Success' : '❌ Failed'}`)
  if (profilesResult.success) {
    console.log(`   - Total users: ${profilesResult.users?.length || 0}`)
    profilesResult.users?.forEach(user => {
      console.log(`   - ${user.email}: role=${user.role}, active=${user.is_active}`)
    })
  } else {
    console.log(`   - Error: ${profilesResult.error}`)
  }
  
  console.log(`👤 a1@test.com: ${a1Result.success && a1Result.user ? '✅ Found' : '❌ Not found'}`)
  if (a1Result.success && a1Result.user) {
    console.log(`   - Role: ${a1Result.user.role}`)
    console.log(`   - Active: ${a1Result.user.is_active}`)
  }
  
  console.log(`👤 b1@test.com: ${b1Result.success && b1Result.user ? '✅ Found' : '❌ Not found'}`)
  if (b1Result.success && b1Result.user) {
    console.log(`   - Role: ${b1Result.user.role}`)
    console.log(`   - Active: ${b1Result.user.is_active}`)
  }
  
  console.log(`🔐 Auth users: ${authResult.success ? '✅ Success' : '❌ Failed'}`)
  if (authResult.success) {
    console.log(`   - Total auth users: ${authResult.users?.length || 0}`)
    authResult.users?.forEach(user => {
      console.log(`   - ${user.email}: confirmed=${!!user.email_confirmed_at}`)
    })
  } else {
    console.log(`   - Error: ${authResult.error}`)
  }
  
  console.log('\n🎯 RECOMMENDATIONS')
  console.log('=' .repeat(50))
  
  if (!profilesResult.success) {
    console.log('❌ Cannot access profiles table - check RLS policies')
  } else if (profilesResult.users?.length === 0) {
    console.log('❌ No users found in profiles table')
  } else {
    const userCount = profilesResult.users?.length || 0
    const adminCount = profilesResult.users?.filter(u => u.role === 'admin').length || 0
    const regularCount = profilesResult.users?.filter(u => u.role === 'user').length || 0
    
    console.log(`📊 Found ${userCount} total users: ${adminCount} admins, ${regularCount} regular users`)
    
    if (regularCount === 0) {
      console.log('⚠️  No regular users found - this explains why the filtered list is empty')
      console.log('💡 Solution: Either create b1@test.com as a regular user, or modify existing users')
    }
    
    if (!b1Result.user) {
      console.log('⚠️  b1@test.com not found in profiles table')
      console.log('💡 Solution: Create b1@test.com user record')
    }
  }
  
  return {
    profiles: profilesResult,
    a1User: a1Result,
    b1User: b1Result,
    authUsers: authResult
  }
}

// 如果直接執行此檔案，運行檢查
if (typeof window !== 'undefined') {
  // 在瀏覽器環境中，將函數掛載到 window 物件上以便在控制台中調用
  (window as any).runUserCheck = runCompleteUserCheck
  console.log('💡 You can run user check by calling: runUserCheck()')
}
