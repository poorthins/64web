// 測試匯出功能的獨立文件
import {
  smartFileRename,
  handleDuplicateFileName,
  categoryNameMap,
  generateTimestamp,
  demonstrateFileRenaming
} from '../utils/exportUtils'

// 測試智慧檔案重新命名
export function testSmartFileRenaming() {
  console.log('🧪 開始測試智慧檔案重新命名功能...')
  console.log('='.repeat(60))

  const testCases = [
    // MSDS 檔案測試
    { file: 'safety_msds_data.pdf', category: 'diesel', expected: '柴油發電機_MSDS安全資料表.pdf' },
    { file: 'sds_information.pdf', category: 'natural_gas', expected: '天然氣_MSDS安全資料表.pdf' },

    // 月份檔案測試
    { file: '03_monthly_usage.jpg', category: 'electricity_bill', expected: '電費單_3月_使用證明.jpg' },
    { file: 'jan_report.xlsx', category: 'employee_commute', expected: '員工通勤_1月_使用證明.xlsx' },
    { file: 'file_12_bill.png', category: 'lpg', expected: '液化石油氣_12月_帳單.png' },

    // 年度檔案測試
    { file: 'annual_summary_2024.pdf', category: 'coal', expected: '煤炭使用_年度統計報告.pdf' },
    { file: 'year_report.xlsx', category: 'gasoline', expected: '汽油使用_年度統計報告.xlsx' },

    // 一般檔案測試
    { file: 'random_abc123.pdf', category: 'waste_disposal', expected: '廢棄物處理_資料.pdf' },
    { file: 'invoice_xyz789.png', category: 'water_consumption', expected: '水資源消耗_發票.png' },

    // 亂碼檔名測試
    { file: 'jgflkdp123.png', category: 'natural_gas', expected: '天然氣_資料.png' },
    { file: 'xyz456abc.pdf', category: 'diesel', expected: '柴油發電機_資料.pdf' }
  ]

  let passedTests = 0
  let failedTests = 0

  testCases.forEach((testCase, index) => {
    const result = smartFileRename(testCase.file, testCase.category)
    const passed = result === testCase.expected

    console.log(`測試 ${index + 1}: ${passed ? '✅' : '❌'}`)
    console.log(`  輸入: ${testCase.file}`)
    console.log(`  類別: ${categoryNameMap[testCase.category]}`)
    console.log(`  預期: ${testCase.expected}`)
    console.log(`  結果: ${result}`)

    if (passed) {
      passedTests++
    } else {
      failedTests++
      console.log(`  ❌ 不符合預期!`)
    }
    console.log('')
  })

  console.log('='.repeat(60))
  console.log(`📊 測試結果: ${passedTests} 通過, ${failedTests} 失敗`)
  console.log(`🎯 成功率: ${Math.round((passedTests / testCases.length) * 100)}%`)

  return { passedTests, failedTests, totalTests: testCases.length }
}

// 測試重複檔名處理
export function testDuplicateFileHandling() {
  console.log('🧪 開始測試重複檔名處理功能...')
  console.log('='.repeat(60))

  const existingNames = new Set<string>()
  const testFiles = [
    '柴油發電機_MSDS安全資料表.pdf',
    '柴油發電機_MSDS安全資料表.pdf', // 重複
    '柴油發電機_MSDS安全資料表.pdf', // 重複
    '天然氣_1月_使用證明.jpg',
    '天然氣_1月_使用證明.jpg', // 重複
  ]

  const expectedResults = [
    '柴油發電機_MSDS安全資料表.pdf',
    '柴油發電機_MSDS安全資料表_1.pdf',
    '柴油發電機_MSDS安全資料表_2.pdf',
    '天然氣_1月_使用證明.jpg',
    '天然氣_1月_使用證明_1.jpg'
  ]

  let allPassed = true

  testFiles.forEach((fileName, index) => {
    const result = handleDuplicateFileName(fileName, existingNames)
    const expected = expectedResults[index]
    const passed = result === expected

    console.log(`測試 ${index + 1}: ${passed ? '✅' : '❌'}`)
    console.log(`  輸入: ${fileName}`)
    console.log(`  預期: ${expected}`)
    console.log(`  結果: ${result}`)

    if (!passed) {
      allPassed = false
      console.log(`  ❌ 不符合預期!`)
    }
    console.log('')
  })

  console.log('='.repeat(60))
  console.log(`📊 重複檔名處理測試: ${allPassed ? '✅ 全部通過' : '❌ 有失敗項目'}`)

  return allPassed
}

// 測試時間戳生成
export function testTimestampGeneration() {
  console.log('🧪 測試時間戳生成功能...')
  console.log('='.repeat(60))

  const timestamp1 = generateTimestamp()
  const timestamp2 = generateTimestamp()

  console.log(`時間戳 1: ${timestamp1}`)
  console.log(`時間戳 2: ${timestamp2}`)

  // 檢查格式 (YYYYMMDD_HHMMSS)
  const timestampRegex = /^\d{8}_\d{6}$/
  const format1Valid = timestampRegex.test(timestamp1)
  const format2Valid = timestampRegex.test(timestamp2)

  console.log(`格式檢查 1: ${format1Valid ? '✅' : '❌'}`)
  console.log(`格式檢查 2: ${format2Valid ? '✅' : '❌'}`)

  return format1Valid && format2Valid
}

// 執行所有測試
export function runAllTests() {
  console.log('🚀 開始執行匯出功能完整測試套件...')
  console.log('='.repeat(80))

  // 1. 智慧檔案重新命名測試
  const renamingResults = testSmartFileRenaming()

  // 2. 重複檔名處理測試
  const duplicateResults = testDuplicateFileHandling()

  // 3. 時間戳生成測試
  const timestampResults = testTimestampGeneration()

  // 4. 展示智慧命名
  console.log('\n🎯 智慧檔案重新命名展示:')
  demonstrateFileRenaming()

  // 總結
  console.log('\n' + '='.repeat(80))
  console.log('📊 測試總結:')
  console.log(`📁 智慧命名: ${renamingResults.passedTests}/${renamingResults.totalTests} 通過`)
  console.log(`🔄 重複處理: ${duplicateResults ? '✅ 通過' : '❌ 失敗'}`)
  console.log(`⏰ 時間戳: ${timestampResults ? '✅ 通過' : '❌ 失敗'}`)

  const allTestsPassed =
    renamingResults.failedTests === 0 &&
    duplicateResults &&
    timestampResults

  console.log(`\n🎉 整體結果: ${allTestsPassed ? '✅ 所有測試通過!' : '❌ 部分測試失敗'}`)

  return {
    renamingResults,
    duplicateResults,
    timestampResults,
    allTestsPassed
  }
}

// 如果直接執行此檔案，運行所有測試
if (typeof window !== 'undefined') {
  // 在瀏覽器環境中，將測試函數暴露到全局
  (window as any).exportTests = {
    runAllTests,
    testSmartFileRenaming,
    testDuplicateFileHandling,
    testTimestampGeneration
  }
}