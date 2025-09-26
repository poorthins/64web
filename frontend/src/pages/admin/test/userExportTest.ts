// 測試單一用戶匯出功能
import { exportSingleUser } from '../utils/userExportUtils'
import { ExportOptions } from '../components/UserExportModal'

// 測試用戶匯出的完整流程
export async function testUserExportComplete() {
  console.log('🚀 開始測試完整用戶匯出功能...')
  console.log('='.repeat(60))

  const testOptions: ExportOptions = {
    basicInfo: true,
    submittedRecords: true,
    rejectedRecords: true,
    includeRejectReasons: true,
    includeFileList: true
  }

  try {
    console.log('📋 測試選項：')
    console.log('  ✅ 基本資料')
    console.log('  ✅ 已提交記錄')
    console.log('  ✅ 已退回記錄')
    console.log('  ✅ 包含退回原因')
    console.log('  ✅ 包含檔案清單')
    console.log('')

    console.log('👤 開始匯出用戶 ID: 1 (王小明)...')
    await exportSingleUser('1', testOptions)

    console.log('✅ 完整用戶匯出測試成功！')
    return true

  } catch (error) {
    console.error('❌ 完整用戶匯出測試失敗：', error)
    return false
  }
}

// 測試不同選項組合
export async function testDifferentExportOptions() {
  console.log('\n🎯 測試不同匯出選項組合...')
  console.log('='.repeat(60))

  const testCases = [
    {
      name: '僅基本資料',
      options: {
        basicInfo: true,
        submittedRecords: false,
          rejectedRecords: false,
        includeRejectReasons: false,
        includeFileList: false
      }
    },
    {
      name: '基本資料 + 已提交記錄',
      options: {
        basicInfo: true,
        submittedRecords: true,
          rejectedRecords: false,
        includeRejectReasons: false,
        includeFileList: true
      }
    },
    {
      name: '僅退回記錄 + 原因',
      options: {
        basicInfo: false,
        submittedRecords: false,
          rejectedRecords: true,
        includeRejectReasons: true,
        includeFileList: false
      }
    }
  ]

  let successCount = 0

  for (const testCase of testCases) {
    try {
      console.log(`\n📊 測試案例：${testCase.name}`)
      console.log('選項：', Object.entries(testCase.options)
        .filter(([_, value]) => value)
        .map(([key]) => key)
        .join(', '))

      await exportSingleUser('2', testCase.options) // 測試用戶李美華
      console.log(`✅ ${testCase.name} 測試成功`)
      successCount++

    } catch (error) {
      console.error(`❌ ${testCase.name} 測試失敗：`, error)
    }
  }

  console.log(`\n📊 選項組合測試結果: ${successCount}/${testCases.length} 成功`)
  return successCount === testCases.length
}

// 測試多個用戶
export async function testMultipleUsers() {
  console.log('\n👥 測試多個用戶匯出...')
  console.log('='.repeat(60))

  const userIds = ['1', '2', '3'] // 王小明、李美華、張志豪
  const defaultOptions: ExportOptions = {
    basicInfo: true,
    submittedRecords: true,
    rejectedRecords: false,
    includeRejectReasons: false,
    includeFileList: true
  }

  let successCount = 0

  for (const userId of userIds) {
    try {
      console.log(`\n👤 匯出用戶 ID: ${userId}...`)
      await exportSingleUser(userId, defaultOptions)
      console.log(`✅ 用戶 ${userId} 匯出成功`)
      successCount++

    } catch (error) {
      console.error(`❌ 用戶 ${userId} 匯出失敗：`, error)
    }
  }

  console.log(`\n📊 多用戶測試結果: ${successCount}/${userIds.length} 成功`)
  return successCount === userIds.length
}

// 測試錯誤處理
export async function testErrorHandling() {
  console.log('\n⚠️ 測試錯誤處理...')
  console.log('='.repeat(60))

  const defaultOptions: ExportOptions = {
    basicInfo: true,
    submittedRecords: true,
    rejectedRecords: false,
    includeRejectReasons: false,
    includeFileList: true
  }

  try {
    console.log('測試不存在的用戶 ID: 999...')
    await exportSingleUser('999', defaultOptions)
    console.log('❌ 應該要拋出錯誤但沒有')
    return false

  } catch (error) {
    console.log('✅ 正確處理了不存在用戶的錯誤：', error)
    return true
  }
}

// 執行所有測試
export async function runAllUserExportTests() {
  console.log('🧪 開始執行單一用戶匯出功能測試套件...')
  console.log('='.repeat(80))

  const results = {
    complete: false,
    options: false,
    multiple: false,
    error: false
  }

  try {
    // 1. 完整功能測試
    results.complete = await testUserExportComplete()

    // 2. 不同選項組合測試
    results.options = await testDifferentExportOptions()

    // 3. 多用戶測試
    results.multiple = await testMultipleUsers()

    // 4. 錯誤處理測試
    results.error = await testErrorHandling()

    // 總結
    console.log('\n' + '='.repeat(80))
    console.log('📊 單一用戶匯出測試總結:')
    console.log(`✅ 完整功能: ${results.complete ? '通過' : '失敗'}`)
    console.log(`🎯 選項組合: ${results.options ? '通過' : '失敗'}`)
    console.log(`👥 多用戶: ${results.multiple ? '通過' : '失敗'}`)
    console.log(`⚠️ 錯誤處理: ${results.error ? '通過' : '失敗'}`)

    const allPassed = Object.values(results).every(Boolean)
    console.log(`\n🎉 整體結果: ${allPassed ? '✅ 所有測試通過!' : '❌ 部分測試失敗'}`)

    return { results, allPassed }

  } catch (error) {
    console.error('❌ 測試執行過程中發生嚴重錯誤：', error)
    return { results, allPassed: false }
  }
}

// 在瀏覽器環境中暴露測試函數
if (typeof window !== 'undefined') {
  (window as any).userExportTests = {
    runAllUserExportTests,
    testUserExportComplete,
    testDifferentExportOptions,
    testMultipleUsers,
    testErrorHandling
  }
}