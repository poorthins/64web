/**
 * 快速測試腳本 - 驗證資料庫連接測試功能
 * 可在瀏覽器 Console 中執行
 */

import { runAllDatabaseTests } from './databaseTest'

// 將測試函數掛載到 window 對象，方便 Console 調用
declare global {
  interface Window {
    testDatabaseConnection: () => Promise<void>
  }
}

/**
 * 在 Console 中執行資料庫測試
 * 使用方法: 在瀏覽器 Console 中輸入 window.testDatabaseConnection()
 */
window.testDatabaseConnection = async () => {
  console.clear()
  console.log('🚀 Starting database connection test from Console...')
  
  try {
    const results = await runAllDatabaseTests()
    
    console.log('\n' + '='.repeat(50))
    console.log('📊 DATABASE TEST RESULTS SUMMARY')
    console.log('='.repeat(50))
    
    console.log(`⏰ Timestamp: ${results.timestamp}`)
    console.log(`🎯 Overall Status: ${results.overall ? '✅ PASS' : '❌ FAIL'}`)
    console.log(`📈 Success Rate: ${results.tests.filter(t => t.success).length}/${results.tests.length}`)
    
    console.log('\n📋 Individual Test Results:')
    results.tests.forEach((test, index) => {
      const status = test.success ? '✅' : '❌'
      console.log(`${index + 1}. ${status} ${test.name}`)
      console.log(`   Message: ${test.message}`)
      
      if (test.error) {
        console.log(`   Error: ${test.error}`)
      }
      
      if (test.details) {
        console.log(`   Details:`, test.details)
      }
      console.log('')
    })
    
    if (results.overall) {
      console.log('🎉 All tests passed! Your Supabase connection is working correctly.')
    } else {
      console.log('⚠️ Some tests failed. Please check the errors above.')
    }
    
  } catch (error) {
    console.error('❌ Test execution failed:', error)
  }
}

// 自動提示如何使用
console.log('💡 Tip: You can run database tests manually by typing:')
console.log('   window.testDatabaseConnection()')

export {}