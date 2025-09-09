import { supabase } from '../lib/supabaseClient'

/**
 * 綜合診斷腳本 - 在瀏覽器 Console 中執行
 * 使用方法：在 Console 中執行 window.diagnoseRole()
 */
export const diagnoseRole = async () => {
  console.group('🔍 碳足跡系統 - 角色診斷開始')
  
  try {
    console.log('='.repeat(50))
    console.log('📋 系統診斷報告')
    console.log('='.repeat(50))

    // 1. 檢查認證狀態
    console.group('1️⃣ 認證狀態檢查')
    const { data: session, error: sessionError } = await supabase.auth.getSession()
    
    if (sessionError) {
      console.error('❌ Session 錯誤:', sessionError)
    } else {
      console.log('✅ Session 狀態:', {
        hasSession: !!session?.session,
        userId: session?.session?.user?.id,
        email: session?.session?.user?.email,
        expiresAt: session?.session?.expires_at ? new Date(session.session.expires_at * 1000).toLocaleString() : 'N/A',
        isExpired: session?.session?.expires_at ? session.session.expires_at * 1000 < Date.now() : false
      })
    }
    console.groupEnd()

    // 2. 檢查用戶資料
    console.group('2️⃣ 用戶資料檢查')
    const { data: user, error: userError } = await supabase.auth.getUser()
    
    if (userError) {
      console.error('❌ User 錯誤:', userError)
    } else {
      console.log('✅ User 資料:', {
        userId: user?.user?.id,
        email: user?.user?.email,
        metadata: user?.user?.user_metadata
      })
    }
    console.groupEnd()

    // 3. 檢查 profiles 表權限
    console.group('3️⃣ Profiles 表查詢檢查')
    if (user?.user?.id) {
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.user.id)
        .single()
      
      if (profileError) {
        console.error('❌ Profile 查詢錯誤:', {
          error: profileError,
          code: profileError.code,
          message: profileError.message,
          details: profileError.details,
          hint: profileError.hint
        })
        
        // 分析可能的 RLS 問題
        if (profileError.code === 'PGRST116' || profileError.message?.includes('row')) {
          console.warn('🚨 可能的 RLS 問題：')
          console.warn('- 檢查 profiles 表的 RLS 政策是否允許用戶讀取自己的資料')
          console.warn('- 確認 profiles_select_own 政策已啟用')
          console.warn('- 驗證用戶 ID 在 profiles 表中是否存在')
        }
      } else {
        console.log('✅ Profile 資料:', profile)
        console.log('📊 角色資訊:', {
          role: profile?.role,
          isActive: profile?.is_active,
          displayName: profile?.display_name,
          company: profile?.company
        })
      }
    }
    console.groupEnd()

    // 4. 測試管理員 RPC 函數
    console.group('4️⃣ 管理員 RPC 函數檢查')
    const { data: isAdminResult, error: adminError } = await supabase.rpc('is_admin')
    
    if (adminError) {
      console.error('❌ is_admin RPC 錯誤:', adminError)
    } else {
      console.log('✅ is_admin 結果:', isAdminResult)
    }
    console.groupEnd()

    // 5. 檢查現有用戶列表（如果是管理員）
    console.group('5️⃣ 管理員權限測試')
    const { data: allProfiles, error: allProfilesError } = await supabase
      .from('profiles')
      .select('id, display_name, role, is_active')
      .limit(5)
    
    if (allProfilesError) {
      console.error('❌ 無法查詢其他用戶（非管理員或 RLS 問題）:', allProfilesError.message)
    } else {
      console.log('✅ 可以查詢用戶列表（管理員權限）:', allProfiles)
    }
    console.groupEnd()

    // 6. 本地存儲檢查
    console.group('6️⃣ 本地存儲檢查')
    console.log('LocalStorage 內容:', Object.keys(localStorage).reduce((acc, key) => {
      acc[key] = localStorage.getItem(key)
      return acc
    }, {} as Record<string, any>))
    
    console.log('SessionStorage 內容:', Object.keys(sessionStorage).reduce((acc, key) => {
      acc[key] = sessionStorage.getItem(key)
      return acc
    }, {} as Record<string, any>))
    console.groupEnd()

    // 7. 建議修復步驟
    console.group('7️⃣ 修復建議')
    console.log('🔧 建議修復步驟:')
    console.log('1. 清除瀏覽器快取: localStorage.clear(); sessionStorage.clear(); location.reload()')
    console.log('2. 檢查資料庫中的用戶資料是否存在')
    console.log('3. 驗證 Supabase RLS 政策設定')
    console.log('4. 確認用戶角色欄位是否正確設為 "admin" 或 "user"')
    console.groupEnd()

  } catch (error) {
    console.error('💥 診斷過程中發生錯誤:', error)
  }

  console.log('='.repeat(50))
  console.log('✅ 診斷完成')
  console.log('='.repeat(50))
  console.groupEnd()
}

/**
 * 快速清除快取的工具函數
 */
export const clearAllCache = () => {
  console.log('🧹 清除所有快取...')
  localStorage.clear()
  sessionStorage.clear()
  console.log('✅ 快取已清除，正在重新載入頁面...')
  window.location.reload()
}

/**
 * 快速切換到管理員測試帳號的工具函數
 */
export const testAdminLogin = async () => {
  console.log('🔐 嘗試管理員測試登入...')
  const { data, error } = await supabase.auth.signInWithPassword({
    email: 'a1@test.com',
    password: '123456' // 假設密碼，請替換為實際密碼
  })
  
  if (error) {
    console.error('❌ 管理員登入失敗:', error)
  } else {
    console.log('✅ 管理員登入成功:', data)
    setTimeout(() => {
      window.location.reload()
    }, 1000)
  }
}

/**
 * 將診斷函數掛載到 window 對象上，方便在 Console 中使用
 */
if (typeof window !== 'undefined') {
  ;(window as any).diagnoseRole = diagnoseRole
  ;(window as any).clearAllCache = clearAllCache
  ;(window as any).testAdminLogin = testAdminLogin
  
  console.log('🔧 診斷工具已載入！')
  console.log('使用方法：')
  console.log('- window.diagnoseRole() : 完整診斷')
  console.log('- window.clearAllCache() : 清除快取')
  console.log('- window.testAdminLogin() : 測試管理員登入')
}