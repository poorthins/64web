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
  
  try {
    const results = await runAllDatabaseTests()
    
    
    
    results.tests.forEach((test, index) => {
      const status = test.success ? '✅' : '❌'
      
      if (test.error) {
      }
      
      if (test.details) {
      }
    })
    
    if (results.overall) {
    } else {
    }
    
  } catch (error) {
  }
}

// 自動提示如何使用

export {}