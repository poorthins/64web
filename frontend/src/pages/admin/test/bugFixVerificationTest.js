// Bug Fix Verification Test
// 驗證修復的 Bug 是否正確解決

// 模擬修復後的智慧檔案命名函數
const fixedSmartFileRename = (originalFileName, categoryId) => {
  const categoryNameMap = {
    'diesel': '柴油發電機',
    'gasoline': '汽油使用',
    'natural_gas': '天然氣',
    'electricity_bill': '電費單',
    'employee_commute': '員工通勤'
  }

  const monthMap = {
    '01': '1月', '02': '2月', '03': '3月', '04': '4月',
    '05': '5月', '06': '6月', '07': '7月', '08': '8月',
    '09': '9月', '10': '10月', '11': '11月', '12': '12月',
    'jan': '1月', 'feb': '2月', 'mar': '3月', 'apr': '4月',
    'may': '5月', 'jun': '6月', 'jul': '7月', 'aug': '8月',
    'sep': '9月', 'oct': '10月', 'nov': '11月', 'dec': '12月'
  }

  const fileTypeMap = {
    'bill': '帳單',
    'invoice': '發票',
    'receipt': '收據',
    'certificate': '證明書',
    'report': '報告',
    'data': '資料',
    'annual': '年度統計報告',
    'quarterly': '季度報告'
  }

  const categoryName = categoryNameMap[categoryId] || categoryId
  const extension = originalFileName.split('.').pop() || 'pdf'
  const lowerFileName = originalFileName.toLowerCase()

  // MSDS 檔案檢測
  if (lowerFileName.includes('msds') || lowerFileName.includes('sds') || lowerFileName.includes('安全')) {
    return `${categoryName}_MSDS安全資料表.${extension}`
  }

  // 月份檔案檢測 (修復後的邏輯)
  let monthMatch = null
  let month = ''

  // 檢查中文月份模式 (1月-12月)
  monthMatch = lowerFileName.match(/([1-9]|1[0-2])月/)
  if (monthMatch) {
    month = monthMatch[0]
  }

  if (!monthMatch) {
    // 檢查英文月份縮寫
    monthMatch = lowerFileName.match(/(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)/i)
    if (monthMatch) {
      const englishMonth = monthMatch[0].toLowerCase()
      month = monthMap[englishMonth] || monthMatch[0]
    }
  }

  if (!monthMatch) {
    // 檢查數字月份 (只匹配明確的月份模式，如 _03_ 或 03_)
    monthMatch = lowerFileName.match(/(?:^|_)(0[1-9]|1[0-2])(?:_|$)/)
    if (monthMatch) {
      const monthNum = parseInt(monthMatch[1])
      if (monthNum >= 1 && monthNum <= 12) {
        month = `${monthNum}月`
      } else {
        monthMatch = null
      }
    }
  }

  if (monthMatch) {
    // 偵測檔案類型
    let fileType = '使用證明'
    for (const [key, value] of Object.entries(fileTypeMap)) {
      if (lowerFileName.includes(key)) {
        fileType = value
        break
      }
    }

    return `${categoryName}_${month}_${fileType}.${extension}`
  }

  // 年度檔案檢測
  if (lowerFileName.includes('annual') || lowerFileName.includes('year') || lowerFileName.includes('年度')) {
    return `${categoryName}_年度統計報告.${extension}`
  }

  // 季度檔案檢測
  if (lowerFileName.includes('quarter') || lowerFileName.includes('q1') || lowerFileName.includes('q2') ||
      lowerFileName.includes('q3') || lowerFileName.includes('q4') || lowerFileName.includes('季')) {
    return `${categoryName}_季度報告.${extension}`
  }

  // 一般檔案命名
  let fileType = '資料'
  for (const [key, value] of Object.entries(fileTypeMap)) {
    if (lowerFileName.includes(key)) {
      fileType = value
      break
    }
  }

  return `${categoryName}_${fileType}.${extension}`
}

class BugFixVerificationTester {
  constructor() {
    this.errors = []
    this.warnings = []
    this.testResults = []
  }

  logError(test, message) {
    this.errors.push({ test, message })
    console.error(`❌ [${test}] ${message}`)
  }

  logWarning(test, message) {
    this.warnings.push({ test, message })
    console.warn(`⚠️ [${test}] ${message}`)
  }

  logSuccess(test, message) {
    this.testResults.push({ test, status: 'success', message })
    console.log(`✅ [${test}] ${message}`)
  }

  // 測試之前發現的 Bug 修復
  testBugFixes() {
    const testName = 'Bug Fix Verification'
    console.log('\n🔧 驗證 Bug 修復...')

    // Bug 1: 一般檔案被誤判為月份檔案
    const generalFileResult = fixedSmartFileRename('file_abc123.pdf', 'diesel')
    const expectedGeneral = '柴油發電機_資料.pdf'
    if (generalFileResult === expectedGeneral) {
      this.logSuccess(testName, `Bug 1 已修復: 一般檔案正確命名 - ${generalFileResult}`)
    } else {
      this.logError(testName, `Bug 1 未修復: 期望 "${expectedGeneral}", 實際 "${generalFileResult}"`)
    }

    // Bug 2: 年度檔案被誤判為月份檔案
    const annualFileResult = fixedSmartFileRename('annual_summary_2024.pdf', 'employee_commute')
    const expectedAnnual = '員工通勤_年度統計報告.pdf'
    if (annualFileResult === expectedAnnual) {
      this.logSuccess(testName, `Bug 2 已修復: 年度檔案正確命名 - ${annualFileResult}`)
    } else {
      this.logError(testName, `Bug 2 未修復: 期望 "${expectedAnnual}", 實際 "${annualFileResult}"`)
    }

    // 確保正常的月份檔案仍然正確
    const monthFileResult = fixedSmartFileRename('03_monthly_usage.jpg', 'electricity_bill')
    const expectedMonth = '電費單_3月_使用證明.jpg'
    if (monthFileResult === expectedMonth) {
      this.logSuccess(testName, `月份檔案仍正常工作: ${monthFileResult}`)
    } else {
      this.logError(testName, `月份檔案功能損壞: 期望 "${expectedMonth}", 實際 "${monthFileResult}"`)
    }
  }

  // 測試邊界情況
  testEdgeCases() {
    const testName = 'Edge Cases'
    console.log('\n📝 測試邊界情況...')

    const edgeTests = [
      {
        input: 'file_123abc.pdf',
        categoryId: 'diesel',
        expected: '柴油發電機_資料.pdf',
        description: '包含數字但非月份的檔案'
      },
      {
        input: 'data_2024_report.pdf',
        categoryId: 'natural_gas',
        expected: '天然氣_報告.pdf',
        description: '包含年份但非annual的檔案'
      },
      {
        input: '13_invalid_month.pdf',
        categoryId: 'gasoline',
        expected: '汽油使用_資料.pdf',
        description: '無效月份數字'
      },
      {
        input: '00_invalid_month.pdf',
        categoryId: 'gasoline',
        expected: '汽油使用_資料.pdf',
        description: '零月份'
      },
      {
        input: 'dec_usage.pdf',
        categoryId: 'electricity_bill',
        expected: '電費單_12月_使用證明.pdf',
        description: '英文月份縮寫'
      },
      {
        input: '5月使用證明.pdf',
        categoryId: 'diesel',
        expected: '柴油發電機_5月_使用證明.pdf',
        description: '中文月份'
      }
    ]

    edgeTests.forEach(test => {
      const result = fixedSmartFileRename(test.input, test.categoryId)
      if (result === test.expected) {
        this.logSuccess(testName, `${test.description}: ${test.input} → ${result}`)
      } else {
        this.logError(testName, `${test.description} 失敗: 期望 "${test.expected}", 實際 "${result}"`)
      }
    })
  }

  // 測試回歸問題
  testRegression() {
    const testName = 'Regression Test'
    console.log('\n🔄 回歸測試...')

    // 確保修復沒有破壞現有功能
    const regressionTests = [
      {
        input: 'msds_safety_data.pdf',
        categoryId: 'natural_gas',
        expected: '天然氣_MSDS安全資料表.pdf',
        description: 'MSDS 檔案檢測'
      },
      {
        input: 'SDS安全資料.pdf',
        categoryId: 'gasoline',
        expected: '汽油使用_MSDS安全資料表.pdf',
        description: '中文 MSDS 檔案'
      },
      {
        input: 'quarterly_report.pdf',
        categoryId: 'employee_commute',
        expected: '員工通勤_季度報告.pdf',
        description: '季度檔案檢測'
      },
      {
        input: 'invoice_bill.pdf',
        categoryId: 'electricity_bill',
        expected: '電費單_發票.pdf',
        description: '檔案類型檢測'
      }
    ]

    regressionTests.forEach(test => {
      const result = fixedSmartFileRename(test.input, test.categoryId)
      if (result === test.expected) {
        this.logSuccess(testName, `${test.description}: ${test.input} → ${result}`)
      } else {
        this.logError(testName, `${test.description} 回歸失敗: 期望 "${test.expected}", 實際 "${result}"`)
      }
    })
  }

  // 測試效能影響
  testPerformanceImpact() {
    const testName = 'Performance Impact'
    console.log('\n⚡ 測試效能影響...')

    const testFiles = [
      'file_abc123.pdf',
      'msds_safety_data.pdf',
      '03_monthly_usage.jpg',
      'annual_summary_2024.pdf',
      'quarterly_report.xlsx',
      'invoice_bill.pdf'
    ]

    const categories = ['diesel', 'natural_gas', 'electricity_bill', 'employee_commute']

    // 執行效能測試
    const iterations = 1000
    const startTime = performance.now()

    for (let i = 0; i < iterations; i++) {
      const file = testFiles[i % testFiles.length]
      const category = categories[i % categories.length]
      fixedSmartFileRename(file, category)
    }

    const endTime = performance.now()
    const totalTime = endTime - startTime
    const avgTime = totalTime / iterations

    this.logSuccess(testName, `處理 ${iterations} 個檔案耗時 ${totalTime.toFixed(2)}ms`)
    this.logSuccess(testName, `平均每個檔案處理時間 ${avgTime.toFixed(4)}ms`)

    if (avgTime < 1) {
      this.logSuccess(testName, '效能表現良好 (< 1ms per file)')
    } else if (avgTime < 5) {
      this.logWarning(testName, `效能可接受但可能需要優化 (${avgTime.toFixed(4)}ms per file)`)
    } else {
      this.logError(testName, `效能問題 (${avgTime.toFixed(4)}ms per file)`)
    }
  }

  // 執行所有測試
  runAllTests() {
    console.log('🚀 開始執行 Bug 修復驗證測試...\n')

    this.testBugFixes()
    this.testEdgeCases()
    this.testRegression()
    this.testPerformanceImpact()

    this.generateReport()
  }

  // 生成測試報告
  generateReport() {
    console.log('\n' + '='.repeat(50))
    console.log('📊 Bug 修復驗證報告')
    console.log('='.repeat(50))

    console.log(`✅ 成功測試: ${this.testResults.filter(r => r.status === 'success').length} 項`)
    console.log(`⚠️  警告: ${this.warnings.length} 項`)
    console.log(`❌ 錯誤: ${this.errors.length} 項`)

    if (this.warnings.length > 0) {
      console.log('\n⚠️ 警告詳情:')
      this.warnings.forEach(warning => {
        console.log(`   - [${warning.test}] ${warning.message}`)
      })
    }

    if (this.errors.length > 0) {
      console.log('\n❌ 錯誤詳情:')
      this.errors.forEach(error => {
        console.log(`   - [${error.test}] ${error.message}`)
      })
    }

    console.log('\n📋 修復總結:')
    console.log('   - 🐛 修復檔案命名誤判問題')
    console.log('   - 🎯 改進月份檢測邏輯')
    console.log('   - 🛡️  增強邊界條件處理')
    console.log('   - ⚡ 維持良好的效能表現')

    console.log('\n🎯 修復效果:')
    if (this.errors.length === 0) {
      console.log('   - ✅ 所有已知 Bug 已修復')
      console.log('   - ✅ 沒有引入新的回歸問題')
      console.log('   - ✅ 效能沒有明顯影響')
    } else {
      console.log('   - ❌ 仍有未解決的問題')
      console.log('   - 📝 需要進一步調查和修復')
    }

    console.log('\n' + (this.errors.length === 0 ? '🎉 所有 Bug 修復驗證通過！系統穩定性良好。' : '⚠️ 發現問題，需要進一步修復。'))
  }
}

// 執行測試
const tester = new BugFixVerificationTester()
tester.runAllTests()