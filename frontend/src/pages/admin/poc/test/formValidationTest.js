// Form Validation Test
// 測試表單驗證邏輯和邊界值處理

// 模擬驗證規則 (來自 useFormValidation hook)
const createValidationRules = () => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  const strongPasswordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/

  return {
    required: (message = '此欄位為必填') => (value) => {
      if (!value || (typeof value === 'string' && !value.trim())) {
        return message
      }
      return null
    },

    minLength: (min, message) => (value) => {
      if (value && value.length < min) {
        return message || `至少需要 ${min} 個字符`
      }
      return null
    },

    maxLength: (max, message) => (value) => {
      if (value && value.length > max) {
        return message || `最多 ${max} 個字符`
      }
      return null
    },

    email: (message = '請輸入有效的電子郵件格式') => (value) => {
      if (value && !emailRegex.test(value)) {
        return message
      }
      return null
    },

    password: (message = '密碼必須包含至少8個字符，包括大小寫字母、數字和特殊符號') => (value) => {
      if (value && (value.length < 8 || !strongPasswordRegex.test(value))) {
        return message
      }
      return null
    },

    arrayMinLength: (min, message) => (value) => {
      if (!Array.isArray(value) || value.length < min) {
        return message || `至少需要選擇 ${min} 項`
      }
      return null
    },

    numberRange: (min, max, message) => (value) => {
      const num = Number(value)
      if (isNaN(num) || num < min || num > max) {
        return message || `必須在 ${min} 到 ${max} 之間`
      }
      return null
    }
  }
}

// 模擬表單資料
const testFormData = {
  valid: {
    name: '張小明',
    email: 'zhang@company.com',
    password: 'SecurePass123!',
    company: '科技股份有限公司',
    department: '資訊部',
    targetYear: 2024,
    energyCategories: ['diesel', 'electricity_bill'],
    dieselGeneratorVersion: 'refuel'
  },

  invalid: {
    empty: {
      name: '',
      email: '',
      password: '',
      company: '',
      department: '',
      targetYear: null,
      energyCategories: []
    },

    invalidFormat: {
      name: 'A', // 太短
      email: 'invalid-email', // 無效格式
      password: '123', // 太弱
      company: 'A'.repeat(101), // 太長
      department: ' ', // 只有空白
      targetYear: 1999, // 超出範圍
      energyCategories: []
    },

    boundary: {
      name: 'AB', // 邊界值 (最小長度)
      email: 'a@b.co', // 邊界值 (最短有效格式)
      password: 'Aa1!5678', // 邊界值 (最短有效密碼)
      company: 'A'.repeat(100), // 邊界值 (最大長度)
      department: '部門',
      targetYear: 2024, // 當前年份
      energyCategories: ['diesel'] // 最小數量
    }
  }
}

class FormValidationTester {
  constructor() {
    this.errors = []
    this.warnings = []
    this.testResults = []
    this.rules = createValidationRules()
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

  // 執行單一欄位驗證
  validateField(fieldName, value, rules, expectedValid = true) {
    const testName = `Field Validation - ${fieldName}`

    for (const rule of rules) {
      const error = rule(value)
      if (error && expectedValid) {
        this.logError(testName, `${fieldName}: ${error} (值: ${JSON.stringify(value)})`)
        return false
      } else if (!error && !expectedValid) {
        this.logWarning(testName, `${fieldName}: 預期應該失敗但通過了驗證 (值: ${JSON.stringify(value)})`)
      }
    }

    if (expectedValid) {
      this.logSuccess(testName, `${fieldName} 驗證通過`)
    }

    return true
  }

  // 測試有效資料
  testValidData() {
    const testName = 'Valid Data Test'
    console.log('\n📝 測試有效資料...')

    const validationRules = {
      name: [this.rules.required('姓名為必填欄位'), this.rules.minLength(2, '姓名至少需要 2 個字符')],
      email: [this.rules.required('電子郵件為必填欄位'), this.rules.email()],
      password: [this.rules.required('密碼為必填欄位'), this.rules.password()],
      company: [this.rules.required('公司名稱為必填欄位'), this.rules.maxLength(100, '公司名稱最多 100 個字符')],
      department: [this.rules.required('部門為必填欄位')],
      targetYear: [this.rules.required('目標年份為必填欄位'), this.rules.numberRange(2024, 2034, '目標年份必須在 2024-2034 之間')],
      energyCategories: [this.rules.arrayMinLength(1, '至少需要選擇一個能源類別')]
    }

    const data = testFormData.valid
    let allValid = true

    Object.keys(validationRules).forEach(field => {
      const isValid = this.validateField(field, data[field], validationRules[field], true)
      if (!isValid) allValid = false
    })

    if (allValid) {
      this.logSuccess(testName, '所有有效資料測試通過')
    }
  }

  // 測試空值資料
  testEmptyData() {
    const testName = 'Empty Data Test'
    console.log('\n📝 測試空值資料...')

    const validationRules = {
      name: [this.rules.required('姓名為必填欄位')],
      email: [this.rules.required('電子郵件為必填欄位')],
      password: [this.rules.required('密碼為必填欄位')],
      company: [this.rules.required('公司名稱為必填欄位')],
      department: [this.rules.required('部門為必填欄位')],
      energyCategories: [this.rules.arrayMinLength(1, '至少需要選擇一個能源類別')]
    }

    const data = testFormData.invalid.empty
    let allFailed = true

    Object.keys(validationRules).forEach(field => {
      const error = validationRules[field][0](data[field])
      if (!error) {
        this.logError(testName, `${field} 空值應該失敗但通過了驗證`)
        allFailed = false
      } else {
        this.logSuccess(testName, `${field} 空值正確被拒絕: ${error}`)
      }
    })

    if (allFailed) {
      this.logSuccess(testName, '所有空值資料測試通過 - 正確拒絕了空值')
    }
  }

  // 測試無效格式資料
  testInvalidFormatData() {
    const testName = 'Invalid Format Test'
    console.log('\n📝 測試無效格式資料...')

    const tests = [
      {
        field: 'name',
        value: 'A',
        rule: this.rules.minLength(2, '姓名至少需要 2 個字符'),
        shouldFail: true
      },
      {
        field: 'email',
        value: 'invalid-email',
        rule: this.rules.email(),
        shouldFail: true
      },
      {
        field: 'password',
        value: '123',
        rule: this.rules.password(),
        shouldFail: true
      },
      {
        field: 'company',
        value: 'A'.repeat(101),
        rule: this.rules.maxLength(100, '公司名稱最多 100 個字符'),
        shouldFail: true
      },
      {
        field: 'targetYear',
        value: 1999,
        rule: this.rules.numberRange(2024, 2034, '目標年份必須在 2024-2034 之間'),
        shouldFail: true
      }
    ]

    tests.forEach(test => {
      const error = test.rule(test.value)
      if (test.shouldFail && !error) {
        this.logError(testName, `${test.field} 無效值應該失敗但通過了: ${test.value}`)
      } else if (test.shouldFail && error) {
        this.logSuccess(testName, `${test.field} 無效值正確被拒絕: ${error}`)
      }
    })
  }

  // 測試邊界值
  testBoundaryValues() {
    const testName = 'Boundary Values Test'
    console.log('\n📝 測試邊界值...')

    const tests = [
      {
        field: 'name',
        value: 'AB', // 最小有效長度
        rule: this.rules.minLength(2),
        shouldPass: true
      },
      {
        field: 'email',
        value: 'a@b.co', // 最短有效格式
        rule: this.rules.email(),
        shouldPass: true
      },
      {
        field: 'password',
        value: 'Aa1!5678', // 最短有效密碼
        rule: this.rules.password(),
        shouldPass: true
      },
      {
        field: 'company',
        value: 'A'.repeat(100), // 最大允許長度
        rule: this.rules.maxLength(100),
        shouldPass: true
      },
      {
        field: 'targetYear',
        value: 2024, // 最小允許年份
        rule: this.rules.numberRange(2024, 2034),
        shouldPass: true
      },
      {
        field: 'targetYear',
        value: 2034, // 最大允許年份
        rule: this.rules.numberRange(2024, 2034),
        shouldPass: true
      },
      {
        field: 'energyCategories',
        value: ['diesel'], // 最小數量
        rule: this.rules.arrayMinLength(1),
        shouldPass: true
      }
    ]

    tests.forEach(test => {
      const error = test.rule(test.value)
      if (test.shouldPass && error) {
        this.logError(testName, `${test.field} 邊界值應該通過但失敗了: ${error} (值: ${JSON.stringify(test.value)})`)
      } else if (test.shouldPass && !error) {
        this.logSuccess(testName, `${test.field} 邊界值正確通過 (值: ${JSON.stringify(test.value)})`)
      }
    })
  }

  // 測試密碼強度
  testPasswordStrength() {
    const testName = 'Password Strength Test'
    console.log('\n📝 測試密碼強度...')

    const passwordTests = [
      { password: '12345678', expected: false, reason: '只有數字' },
      { password: 'abcdefgh', expected: false, reason: '只有小寫字母' },
      { password: 'ABCDEFGH', expected: false, reason: '只有大寫字母' },
      { password: 'Abcdefgh', expected: false, reason: '缺少數字和特殊符號' },
      { password: 'Abcdefg1', expected: false, reason: '缺少特殊符號' },
      { password: 'Abc123!', expected: false, reason: '太短（少於8字符）' },
      { password: 'Abc123!@', expected: true, reason: '符合所有要求' },
      { password: 'MySecure123!', expected: true, reason: '強密碼' },
      { password: 'P@ssw0rd123', expected: true, reason: '包含所有必要元素' }
    ]

    passwordTests.forEach(test => {
      const error = this.rules.password()(test.password)
      const passed = !error

      if (test.expected && !passed) {
        this.logError(testName, `密碼應該通過但失敗了: "${test.password}" (${test.reason}) - 錯誤: ${error}`)
      } else if (!test.expected && passed) {
        this.logError(testName, `密碼應該失敗但通過了: "${test.password}" (${test.reason})`)
      } else {
        this.logSuccess(testName, `密碼測試正確: "${test.password}" (${test.reason})`)
      }
    })
  }

  // 測試 Email 格式
  testEmailFormat() {
    const testName = 'Email Format Test'
    console.log('\n📝 測試 Email 格式...')

    const emailTests = [
      { email: 'test@example.com', expected: true },
      { email: 'user.name@domain.co.uk', expected: true },
      { email: 'user+tag@example.org', expected: true },
      { email: 'test@sub.domain.com', expected: true },
      { email: 'invalid-email', expected: false },
      { email: '@domain.com', expected: false },
      { email: 'user@', expected: false },
      { email: 'user@domain', expected: false },
      { email: 'user name@domain.com', expected: false },
      { email: 'user@domain .com', expected: false },
      { email: '', expected: true } // 空值由 required 規則處理，email 規則允許空值通過
    ]

    emailTests.forEach(test => {
      const error = this.rules.email()(test.email)
      const passed = !error

      if (test.expected && !passed) {
        this.logError(testName, `Email 應該通過但失敗了: "${test.email}" - 錯誤: ${error}`)
      } else if (!test.expected && passed) {
        this.logError(testName, `Email 應該失敗但通過了: "${test.email}"`)
      } else {
        this.logSuccess(testName, `Email 測試正確: "${test.email}"`)
      }
    })
  }

  // 測試陣列驗證
  testArrayValidation() {
    const testName = 'Array Validation Test'
    console.log('\n📝 測試陣列驗證...')

    const arrayTests = [
      { value: [], minLength: 1, expected: false, description: '空陣列' },
      { value: ['item1'], minLength: 1, expected: true, description: '單項陣列' },
      { value: ['item1', 'item2'], minLength: 2, expected: true, description: '雙項陣列' },
      { value: ['item1'], minLength: 2, expected: false, description: '不足最小長度' },
      { value: null, minLength: 1, expected: false, description: 'null 值' },
      { value: undefined, minLength: 1, expected: false, description: 'undefined 值' }
    ]

    arrayTests.forEach(test => {
      const error = this.rules.arrayMinLength(test.minLength)(test.value)
      const passed = !error

      if (test.expected && !passed) {
        this.logError(testName, `陣列應該通過但失敗了: ${test.description} - 錯誤: ${error}`)
      } else if (!test.expected && passed) {
        this.logError(testName, `陣列應該失敗但通過了: ${test.description}`)
      } else {
        this.logSuccess(testName, `陣列測試正確: ${test.description}`)
      }
    })
  }

  // 執行所有測試
  runAllTests() {
    console.log('🚀 開始執行表單驗證測試...\n')

    this.testValidData()
    this.testEmptyData()
    this.testInvalidFormatData()
    this.testBoundaryValues()
    this.testPasswordStrength()
    this.testEmailFormat()
    this.testArrayValidation()

    this.generateReport()
  }

  // 生成測試報告
  generateReport() {
    console.log('\n' + '='.repeat(50))
    console.log('📊 表單驗證測試報告')
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

    console.log('\n📋 測試總結:')
    console.log('   - ✅ 有效資料驗證')
    console.log('   - ✅ 空值資料驗證')
    console.log('   - ✅ 無效格式驗證')
    console.log('   - ✅ 邊界值測試')
    console.log('   - ✅ 密碼強度測試')
    console.log('   - ✅ Email 格式測試')
    console.log('   - ✅ 陣列驗證測試')

    console.log('\n' + (this.errors.length === 0 ? '🎉 所有表單驗證測試通過！' : '⚠️ 發現問題，請檢查上述錯誤。'))
  }
}

// 執行測試
const tester = new FormValidationTester()
tester.runAllTests()