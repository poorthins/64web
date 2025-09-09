import { createUser } from '../api/adminUsers'

/**
 * 創建測試用戶 b1@test.com
 */
export async function createB1TestUser() {
  try {
    console.log('🚀 Creating b1@test.com user...')
    
    const userData = {
      email: 'b1@test.com',
      password: 'password123',
      display_name: 'Test User B1',
      company: '測試公司',
      job_title: '測試職位',
      phone: '0912345678',
      role: 'user'
    }

    const result = await createUser(userData)
    
    console.log('✅ Successfully created user:', result)
    return { success: true, user: result }
  } catch (error) {
    console.error('❌ Error creating user:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }
  }
}

// 在瀏覽器環境中掛載到 window 物件
if (typeof window !== 'undefined') {
  (window as any).createB1User = createB1TestUser
  console.log('💡 You can create b1@test.com by calling: createB1User()')
}
