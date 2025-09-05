import { supabase } from '../lib/supabaseClient'
import { TEST_CATEGORIES, isValidCategory } from './categoryConstants'

export interface TestResult {
  name: string
  success: boolean
  message: string
  details?: any
  error?: string
}

export interface DatabaseTestResults {
  overall: boolean
  tests: TestResult[]
  timestamp: string
}

/**
 * 測試 Supabase 基本連接
 */
export async function testSupabaseConnection(): Promise<TestResult> {
  try {
    console.log('🔍 Testing Supabase connection...')
    
    // 測試基本連接 - 嘗試獲取當前 session
    const { data, error } = await supabase.auth.getSession()
    
    if (error) {
      console.error('❌ Supabase connection failed:', error)
      return {
        name: 'Supabase 連接測試',
        success: false,
        message: `連接失敗: ${error.message}`,
        error: error.message
      }
    }

    console.log('✅ Supabase connection successful')
    return {
      name: 'Supabase 連接測試',
      success: true,
      message: '連接正常',
      details: {
        hasSession: !!data.session,
        sessionExpiry: data.session?.expires_at ? new Date(data.session.expires_at * 1000).toLocaleString() : 'N/A'
      }
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : '未知錯誤'
    console.error('❌ Supabase connection test error:', error)
    return {
      name: 'Supabase 連接測試',
      success: false,
      message: `測試執行失敗: ${errorMessage}`,
      error: errorMessage
    }
  }
}

/**
 * 測試讀取 energy_entries 表
 */
export async function testReadEnergyEntries(): Promise<TestResult> {
  try {
    console.log('🔍 Testing energy_entries read access...')
    
    // 嘗試查詢 energy_entries 表（限制結果數量）
    const { data, error, count } = await supabase
      .from('energy_entries')
      .select('*', { count: 'exact' })
      .limit(5)

    if (error) {
      console.error('❌ Read energy_entries failed:', error)
      return {
        name: 'energy_entries 讀取測試',
        success: false,
        message: `讀取失敗: ${error.message}`,
        error: error.message
      }
    }

    console.log('✅ energy_entries read successful, count:', count)
    return {
      name: 'energy_entries 讀取測試',
      success: true,
      message: `成功讀取，共 ${count || 0} 筆記錄`,
      details: {
        totalCount: count,
        sampleData: data?.slice(0, 2) || [],
        hasData: (data?.length || 0) > 0
      }
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : '未知錯誤'
    console.error('❌ Read energy_entries test error:', error)
    return {
      name: 'energy_entries 讀取測試',
      success: false,
      message: `測試執行失敗: ${errorMessage}`,
      error: errorMessage
    }
  }
}

/**
 * 測試新增測試資料到 energy_entries
 * 使用正確的 category 值以符合資料庫約束
 */
export async function testInsertTestData(): Promise<TestResult> {
  try {
    console.log('🔍 Testing energy_entries insert access...')
    
    // 獲取當前用戶
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      console.error('❌ User not authenticated:', userError)
      return {
        name: 'energy_entries 新增測試',
        success: false,
        message: '用戶未登入，無法測試新增功能',
        error: userError?.message || '用戶未登入'
      }
    }

    // 準備測試資料 (使用 categoryConstants 中定義的正確值)
    const testCategory = TEST_CATEGORIES.WD40
    const testData = {
      owner_id: user.id,
      page_key: `test_${testCategory.page_key}_db_test`,
      period_year: new Date().getFullYear(),
      category: testCategory.category,  // 使用常量中定義的正確值
      scope: testCategory.scope,
      unit: testCategory.unit,
      amount: 999.99,
      payload: {
        monthly: { '1': 50, '2': 75 },
        notes: 'Database connection test data - can be deleted',
        test_metadata: {
          created_by: 'database_test',
          purpose: 'connection_verification',
          safe_to_delete: true
        }
      },
      status: 'draft',
      period_start: `${new Date().getFullYear()}-01-01`,
      period_end: `${new Date().getFullYear()}-12-31`
    }

    // 嘗試插入測試資料
    const { data, error } = await supabase
      .from('energy_entries')
      .insert(testData)
      .select()
      .single()

    if (error) {
      console.error('❌ Insert test data failed:', error)
      
      // 提供更具體的錯誤資訊
      let errorMessage = error.message
      let suggestion = '請檢查資料庫權限和欄位約束'
      
      if (error.message.includes('chk_energy_entries_category')) {
        const isValid = isValidCategory(testData.category)
        errorMessage = `Category 約束錯誤: 使用的 category "${testData.category}" ${
          isValid ? '應該是有效的，但' : '不在允許的值列表中'
        }`
        suggestion = `請檢查資料庫中 energy_entries 表的 category 欄位約束。當前使用: "${testData.category}"`
      } else if (error.code === '23514') {
        errorMessage = `資料庫約束錯誤: ${error.message} (約束檢查失敗)`
        suggestion = '請檢查所有欄位值是否符合資料庫約束條件'
      } else if (error.code === '42501') {
        errorMessage = `權限錯誤: 當前用戶沒有新增資料的權限`
        suggestion = '請檢查 RLS (Row Level Security) 政策是否允許當前用戶新增資料'
      } else if (error.code === '23505') {
        errorMessage = `唯一性約束錯誤: ${error.message}`
        suggestion = '可能是測試資料已存在，請手動清理或使用不同的測試值'
      }
      
      return {
        name: 'energy_entries 新增測試',
        success: false,
        message: `新增失敗: ${errorMessage}`,
        error: error.message,
        details: {
          errorCode: error.code,
          errorDetails: error.details,
          usedTestData: testData,
          suggestion: suggestion,
          categoryValidation: {
            used: testData.category,
            isValid: isValidCategory(testData.category),
            availableCategories: '請查看 categoryConstants.ts 中的定義'
          }
        }
      }
    }

    console.log('✅ Test data inserted successfully:', data?.id)
    
    // 嘗試清理測試資料
    try {
      await supabase
        .from('energy_entries')
        .delete()
        .eq('id', data.id)
      console.log('🧹 Test data cleaned up')
    } catch (cleanupError) {
      console.warn('⚠️ Failed to cleanup test data:', cleanupError)
    }

    return {
      name: 'energy_entries 新增測試',
      success: true,
      message: '成功新增並清理測試資料',
      details: {
        insertedId: data.id,
        testData: {
          page_key: testData.page_key,
          category: testData.category,
          scope: testData.scope,
          amount: testData.amount,
          unit: testData.unit
        }
      }
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : '未知錯誤'
    console.error('❌ Insert test data error:', error)
    return {
      name: 'energy_entries 新增測試',
      success: false,
      message: `測試執行失敗: ${errorMessage}`,
      error: errorMessage
    }
  }
}

/**
 * 執行所有資料庫測試
 */
export async function runAllDatabaseTests(): Promise<DatabaseTestResults> {
  console.group('🧪 Database Connection Tests Started')
  const startTime = Date.now()
  
  try {
    const tests: TestResult[] = []
    
    // 1. 測試 Supabase 連接
    const connectionTest = await testSupabaseConnection()
    tests.push(connectionTest)
    
    // 2. 測試讀取權限
    const readTest = await testReadEnergyEntries()
    tests.push(readTest)
    
    // 3. 測試寫入權限（只有在連接和讀取都成功時才執行）
    if (connectionTest.success && readTest.success) {
      const insertTest = await testInsertTestData()
      tests.push(insertTest)
    } else {
      tests.push({
        name: 'energy_entries 新增測試',
        success: false,
        message: '跳過測試 - 前置條件未滿足',
        error: '連接或讀取測試失敗'
      })
    }

    const endTime = Date.now()
    const duration = endTime - startTime
    const successCount = tests.filter(t => t.success).length
    const overall = successCount === tests.length

    console.log(`📊 Tests completed in ${duration}ms - ${successCount}/${tests.length} passed`)
    console.groupEnd()

    return {
      overall,
      tests,
      timestamp: new Date().toLocaleString()
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : '未知錯誤'
    console.error('❌ Database test suite failed:', error)
    console.groupEnd()
    
    return {
      overall: false,
      tests: [{
        name: '測試套件執行',
        success: false,
        message: `測試套件執行失敗: ${errorMessage}`,
        error: errorMessage
      }],
      timestamp: new Date().toLocaleString()
    }
  }
}

/**
 * 清理所有測試資料（管理功能）
 */
export async function cleanupTestData(): Promise<TestResult> {
  try {
    console.log('🧹 Cleaning up test data...')
    
    const { data, error } = await supabase
      .from('energy_entries')
      .delete()
      .like('page_key', 'test_%')

    if (error) {
      console.error('❌ Cleanup failed:', error)
      return {
        name: '清理測試資料',
        success: false,
        message: `清理失敗: ${error.message}`,
        error: error.message
      }
    }

    console.log('✅ Test data cleanup completed')
    return {
      name: '清理測試資料',
      success: true,
      message: '測試資料已清理',
      details: { deletedRows: data }
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : '未知錯誤'
    console.error('❌ Cleanup test data error:', error)
    return {
      name: '清理測試資料',
      success: false,
      message: `清理執行失敗: ${errorMessage}`,
      error: errorMessage
    }
  }
}