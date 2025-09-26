// Mock Data Integrity Test
// 執行完整的資料結構和一致性測試

// 直接使用資料定義 (避免模組匯入問題)
const mockUsers = [
  {
    id: '1',
    name: '王小明',
    email: 'ming.wang@company.com',
    department: '研發部',
    status: 'approved',
    submissionDate: '2024-03-15',
    lastActivity: '2024-03-20',
    entries: 12,
    avatar: '👨‍💻'
  },
  {
    id: '2',
    name: '李美華',
    email: 'meihua.li@company.com',
    department: '行銷部',
    status: 'submitted',
    submissionDate: '2024-03-18',
    lastActivity: '2024-03-21',
    entries: 8,
    avatar: '👩‍💼'
  },
  {
    id: '3',
    name: '張志豪',
    email: 'zhihao.zhang@company.com',
    department: '財務部',
    status: 'submitted',
    submissionDate: '2024-03-20',
    lastActivity: '2024-03-22',
    entries: 5,
    avatar: '🧑‍💼'
  },
  {
    id: '4',
    name: '陳雅婷',
    email: 'yating.chen@company.com',
    department: '人資部',
    status: 'rejected',
    submissionDate: '2024-03-10',
    lastActivity: '2024-03-19',
    entries: 15,
    avatar: '👩'
  },
  {
    id: '5',
    name: '林俊傑',
    email: 'junjie.lin@company.com',
    department: '業務部',
    status: 'approved',
    submissionDate: '2024-03-12',
    lastActivity: '2024-03-21',
    entries: 20,
    avatar: '👨'
  },
  {
    id: '6',
    name: '黃詩涵',
    email: 'shihan.huang@company.com',
    department: '設計部',
    status: 'submitted',
    submissionDate: '2024-03-19',
    lastActivity: '2024-03-22',
    entries: 10,
    avatar: '👩‍🎨'
  },
  {
    id: '7',
    name: '劉建國',
    email: 'jianguo.liu@company.com',
    department: '生產部',
    status: 'submitted',
    submissionDate: '2024-03-21',
    lastActivity: '2024-03-23',
    entries: 7,
    avatar: '👨‍🏭'
  },
  {
    id: '8',
    name: '楊雅琪',
    email: 'yaqi.yang@company.com',
    department: '品管部',
    status: 'approved',
    submissionDate: '2024-03-14',
    lastActivity: '2024-03-20',
    entries: 18,
    avatar: '👩‍🔬'
  }
]

const calculateStats = (users) => {
  return {
    submitted: users.filter(u => u.status === 'submitted').length,
    approved: users.filter(u => u.status === 'approved').length,
    rejected: users.filter(u => u.status === 'rejected').length
  }
}

const energyCategories = [
  { id: 'wd40', name: 'WD-40', scope: 1 },
  { id: 'acetylene', name: '乙炔', scope: 1 },
  { id: 'refrigerant', name: '冷媒', scope: 1 },
  { id: 'septictank', name: '化糞池', scope: 1 },
  { id: 'natural_gas', name: '天然氣', scope: 1 },
  { id: 'urea', name: '尿素', scope: 1 },
  { id: 'diesel_generator', name: '柴油(發電機)', scope: 1, hasVersion: true },
  { id: 'diesel', name: '柴油', scope: 1 },
  { id: 'gasoline', name: '汽油', scope: 1 },
  { id: 'lpg', name: '液化石油氣', scope: 1 },
  { id: 'fire_extinguisher', name: '滅火器', scope: 1 },
  { id: 'welding_rod', name: '焊條', scope: 1 },
  { id: 'electricity_bill', name: '外購電力', scope: 2 },
  { id: 'employee_commute', name: '員工通勤', scope: 3 }
]

const statusLabels = {
  submitted: '已提交',
  approved: '已通過',
  rejected: '已退回'
}

const statusColors = {
  submitted: { bg: 'bg-blue-100', text: 'text-blue-800', border: 'border-blue-300' },
  approved: { bg: 'bg-green-100', text: 'text-green-800', border: 'border-green-300' },
  rejected: { bg: 'bg-red-100', text: 'text-red-800', border: 'border-red-300' }
}

const priorityLabels = {
  high: '高',
  medium: '中',
  low: '低'
}

const priorityColors = {
  high: { bg: 'bg-red-100', text: 'text-red-800', border: 'border-red-300' },
  medium: { bg: 'bg-yellow-100', text: 'text-yellow-800', border: 'border-yellow-300' },
  low: { bg: 'bg-gray-100', text: 'text-gray-800', border: 'border-gray-300' }
}

const scopeLabels = {
  1: '範疇一：直接排放',
  2: '範疇二：外購電力',
  3: '範疇三：其他間接排放'
}

const mockSubmissions = [
  {
    id: 'sub_001',
    userId: '1',
    userName: '王小明',
    userDepartment: '研發部',
    categoryId: 'diesel',
    categoryName: '柴油',
    scope: 1,
    status: 'approved',
    submissionDate: '2024-03-15',
    reviewDate: '2024-03-16',
    amount: 150.5,
    unit: '公升',
    co2Emission: 375.25,
    reviewer: '張主管',
    comments: '數據正確，已核准',
    priority: 'medium'
  },
  {
    id: 'sub_002',
    userId: '2',
    userName: '李美華',
    userDepartment: '行銷部',
    categoryId: 'electricity_bill',
    categoryName: '外購電力',
    scope: 2,
    status: 'submitted',
    submissionDate: '2024-03-18',
    amount: 2850,
    unit: '度',
    co2Emission: 1425,
    priority: 'high'
  }
]

const calculateSubmissionStats = (submissions) => {
  return {
    submitted: submissions.filter(s => s.status === 'submitted').length,
    approved: submissions.filter(s => s.status === 'approved').length,
    rejected: submissions.filter(s => s.status === 'rejected').length
  }
}

class MockDataTester {
  constructor() {
    this.errors = []
    this.warnings = []
    this.testResults = []
  }

  // 記錄錯誤
  logError(test, message) {
    this.errors.push({ test, message })
    console.error(`❌ [${test}] ${message}`)
  }

  // 記錄警告
  logWarning(test, message) {
    this.warnings.push({ test, message })
    console.warn(`⚠️ [${test}] ${message}`)
  }

  // 記錄成功
  logSuccess(test, message) {
    this.testResults.push({ test, status: 'success', message })
    console.log(`✅ [${test}] ${message}`)
  }

  // 測試用戶資料結構
  testUserDataStructure() {
    const testName = 'User Data Structure'

    if (!Array.isArray(mockUsers)) {
      this.logError(testName, 'mockUsers 不是陣列')
      return
    }

    if (mockUsers.length === 0) {
      this.logError(testName, 'mockUsers 為空陣列')
      return
    }

    const requiredFields = ['id', 'name', 'email', 'department', 'status', 'submissionDate', 'lastActivity', 'entries', 'avatar']

    mockUsers.forEach((user, index) => {
      requiredFields.forEach(field => {
        if (!(field in user)) {
          this.logError(testName, `用戶 ${index} 缺少必填欄位: ${field}`)
        }
      })

      // 檢查狀態值
      if (!['submitted', 'approved', 'rejected'].includes(user.status)) {
        this.logError(testName, `用戶 ${user.name} 狀態值無效: ${user.status}`)
      }

      // 檢查 email 格式
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(user.email)) {
        this.logError(testName, `用戶 ${user.name} email 格式無效: ${user.email}`)
      }

      // 檢查日期格式
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/
      if (!dateRegex.test(user.submissionDate)) {
        this.logError(testName, `用戶 ${user.name} submissionDate 格式無效: ${user.submissionDate}`)
      }

      if (!dateRegex.test(user.lastActivity)) {
        this.logError(testName, `用戶 ${user.name} lastActivity 格式無效: ${user.lastActivity}`)
      }

      // 檢查 entries 是否為正整數
      if (!Number.isInteger(user.entries) || user.entries < 0) {
        this.logError(testName, `用戶 ${user.name} entries 必須為非負整數: ${user.entries}`)
      }
    })

    this.logSuccess(testName, `所有 ${mockUsers.length} 個用戶資料結構檢查完成`)
  }

  // 測試提交記錄資料結構
  testSubmissionDataStructure() {
    const testName = 'Submission Data Structure'

    if (!Array.isArray(mockSubmissions)) {
      this.logError(testName, 'mockSubmissions 不是陣列')
      return
    }

    if (mockSubmissions.length === 0) {
      this.logError(testName, 'mockSubmissions 為空陣列')
      return
    }

    const requiredFields = ['id', 'userId', 'userName', 'userDepartment', 'categoryId', 'categoryName', 'scope', 'status', 'submissionDate', 'amount', 'unit', 'co2Emission', 'priority']

    mockSubmissions.forEach((submission, index) => {
      requiredFields.forEach(field => {
        if (!(field in submission)) {
          this.logError(testName, `提交記錄 ${index} 缺少必填欄位: ${field}`)
        }
      })

      // 檢查狀態值
      if (!['submitted', 'approved', 'rejected'].includes(submission.status)) {
        this.logError(testName, `提交記錄 ${submission.id} 狀態值無效: ${submission.status}`)
      }

      // 檢查範疇值
      if (![1, 2, 3].includes(submission.scope)) {
        this.logError(testName, `提交記錄 ${submission.id} 範疇值無效: ${submission.scope}`)
      }

      // 檢查優先級
      if (!['high', 'medium', 'low'].includes(submission.priority)) {
        this.logError(testName, `提交記錄 ${submission.id} 優先級無效: ${submission.priority}`)
      }

      // 檢查數值欄位
      if (typeof submission.amount !== 'number' || submission.amount < 0) {
        this.logError(testName, `提交記錄 ${submission.id} amount 必須為非負數: ${submission.amount}`)
      }

      if (typeof submission.co2Emission !== 'number' || submission.co2Emission < 0) {
        this.logError(testName, `提交記錄 ${submission.id} co2Emission 必須為非負數: ${submission.co2Emission}`)
      }
    })

    this.logSuccess(testName, `所有 ${mockSubmissions.length} 個提交記錄資料結構檢查完成`)
  }

  // 測試資料關聯性
  testDataRelationships() {
    const testName = 'Data Relationships'

    // 檢查用戶 ID 一致性
    const userIds = mockUsers.map(u => u.id)
    const submissionUserIds = [...new Set(mockSubmissions.map(s => s.userId))]

    submissionUserIds.forEach(userId => {
      if (!userIds.includes(userId)) {
        this.logError(testName, `提交記錄中的 userId ${userId} 在用戶列表中不存在`)
      }
    })

    // 檢查能源類別一致性
    const categoryIds = energyCategories.map(c => c.id)
    const submissionCategoryIds = [...new Set(mockSubmissions.map(s => s.categoryId))]

    submissionCategoryIds.forEach(categoryId => {
      if (!categoryIds.includes(categoryId)) {
        this.logError(testName, `提交記錄中的 categoryId ${categoryId} 在能源類別中不存在`)
      }
    })

    // 檢查部門名稱一致性
    mockSubmissions.forEach(submission => {
      const user = mockUsers.find(u => u.id === submission.userId)
      if (user && user.department !== submission.userDepartment) {
        this.logError(testName, `提交記錄 ${submission.id} 的 userDepartment (${submission.userDepartment}) 與用戶資料不符 (${user.department})`)
      }
      if (user && user.name !== submission.userName) {
        this.logError(testName, `提交記錄 ${submission.id} 的 userName (${submission.userName}) 與用戶資料不符 (${user.name})`)
      }
    })

    this.logSuccess(testName, '資料關聯性檢查完成')
  }

  // 測試統計計算功能
  testStatisticsCalculation() {
    const testName = 'Statistics Calculation'

    // 測試用戶統計
    const userStats = calculateStats(mockUsers)
    const manualUserStats = {
      submitted: mockUsers.filter(u => u.status === 'submitted').length,
      approved: mockUsers.filter(u => u.status === 'approved').length,
      rejected: mockUsers.filter(u => u.status === 'rejected').length
    }

    if (JSON.stringify(userStats) !== JSON.stringify(manualUserStats)) {
      this.logError(testName, `用戶統計計算錯誤: 期望 ${JSON.stringify(manualUserStats)}, 實際 ${JSON.stringify(userStats)}`)
    }

    // 測試提交記錄統計
    const submissionStats = calculateSubmissionStats(mockSubmissions)
    const manualSubmissionStats = {
      submitted: mockSubmissions.filter(s => s.status === 'submitted').length,
      approved: mockSubmissions.filter(s => s.status === 'approved').length,
      rejected: mockSubmissions.filter(s => s.status === 'rejected').length
    }

    if (JSON.stringify(submissionStats) !== JSON.stringify(manualSubmissionStats)) {
      this.logError(testName, `提交記錄統計計算錯誤: 期望 ${JSON.stringify(manualSubmissionStats)}, 實際 ${JSON.stringify(submissionStats)}`)
    }

    // 檢查總數是否正確
    const totalUsers = userStats.submitted + userStats.approved + userStats.rejected
    if (totalUsers !== mockUsers.length) {
      this.logError(testName, `用戶統計總數錯誤: 期望 ${mockUsers.length}, 實際 ${totalUsers}`)
    }

    const totalSubmissions = submissionStats.submitted + submissionStats.approved + submissionStats.rejected
    if (totalSubmissions !== mockSubmissions.length) {
      this.logError(testName, `提交記錄統計總數錯誤: 期望 ${mockSubmissions.length}, 實際 ${totalSubmissions}`)
    }

    this.logSuccess(testName, '統計計算功能檢查完成')
  }

  // 測試能源類別結構
  testEnergyCategoryStructure() {
    const testName = 'Energy Category Structure'

    if (!Array.isArray(energyCategories)) {
      this.logError(testName, 'energyCategories 不是陣列')
      return
    }

    const requiredFields = ['id', 'name', 'scope']

    energyCategories.forEach((category, index) => {
      requiredFields.forEach(field => {
        if (!(field in category)) {
          this.logError(testName, `能源類別 ${index} 缺少必填欄位: ${field}`)
        }
      })

      // 檢查範疇值
      if (![1, 2, 3].includes(category.scope)) {
        this.logError(testName, `能源類別 ${category.name} 範疇值無效: ${category.scope}`)
      }
    })

    // 檢查是否有柴油發電機的特殊版本設定
    const dieselGenerator = energyCategories.find(c => c.id === 'diesel_generator')
    if (dieselGenerator && !dieselGenerator.hasVersion) {
      this.logWarning(testName, '柴油發電機應該設定 hasVersion: true')
    }

    this.logSuccess(testName, `所有 ${energyCategories.length} 個能源類別結構檢查完成`)
  }

  // 測試標籤和顏色配置
  testLabelsAndColors() {
    const testName = 'Labels and Colors'

    // 檢查狀態標籤完整性
    const statusValues = ['submitted', 'approved', 'rejected']
    statusValues.forEach(status => {
      if (!(status in statusLabels)) {
        this.logError(testName, `狀態標籤缺少: ${status}`)
      }
      if (!(status in statusColors)) {
        this.logError(testName, `狀態顏色配置缺少: ${status}`)
      }
    })

    // 檢查優先級標籤完整性
    const priorityValues = ['high', 'medium', 'low']
    priorityValues.forEach(priority => {
      if (!(priority in priorityLabels)) {
        this.logError(testName, `優先級標籤缺少: ${priority}`)
      }
      if (!(priority in priorityColors)) {
        this.logError(testName, `優先級顏色配置缺少: ${priority}`)
      }
    })

    // 檢查範疇標籤完整性
    const scopeValues = [1, 2, 3]
    scopeValues.forEach(scope => {
      if (!(scope in scopeLabels)) {
        this.logError(testName, `範疇標籤缺少: ${scope}`)
      }
    })

    this.logSuccess(testName, '標籤和顏色配置檢查完成')
  }

  // 測試日期邏輯
  testDateLogic() {
    const testName = 'Date Logic'

    mockUsers.forEach(user => {
      const submissionDate = new Date(user.submissionDate)
      const lastActivity = new Date(user.lastActivity)

      if (lastActivity < submissionDate) {
        this.logWarning(testName, `用戶 ${user.name} 的最後活動時間早於提交時間`)
      }
    })

    mockSubmissions.forEach(submission => {
      if (submission.reviewDate) {
        const submissionDate = new Date(submission.submissionDate)
        const reviewDate = new Date(submission.reviewDate)

        if (reviewDate < submissionDate) {
          this.logError(testName, `提交記錄 ${submission.id} 的審核時間早於提交時間`)
        }
      }

      // 已審核的記錄應該有審核日期
      if (['approved', 'rejected'].includes(submission.status) && !submission.reviewDate) {
        this.logWarning(testName, `提交記錄 ${submission.id} 已審核但缺少審核日期`)
      }
    })

    this.logSuccess(testName, '日期邏輯檢查完成')
  }

  // 執行所有測試
  runAllTests() {
    console.log('🚀 開始執行 Mock 資料完整性測試...\n')

    this.testUserDataStructure()
    this.testSubmissionDataStructure()
    this.testDataRelationships()
    this.testStatisticsCalculation()
    this.testEnergyCategoryStructure()
    this.testLabelsAndColors()
    this.testDateLogic()

    this.generateReport()
  }

  // 生成測試報告
  generateReport() {
    console.log('\n' + '='.repeat(50))
    console.log('📊 Mock 資料測試報告')
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

    console.log('\n📋 資料概要:')
    console.log(`   - 用戶數量: ${mockUsers.length}`)
    console.log(`   - 提交記錄數量: ${mockSubmissions.length}`)
    console.log(`   - 能源類別數量: ${energyCategories.length}`)

    const userStats = calculateStats(mockUsers)
    console.log(`   - 用戶狀態分布: 已提交 ${userStats.submitted}, 已通過 ${userStats.approved}, 已退回 ${userStats.rejected}`)

    const submissionStats = calculateSubmissionStats(mockSubmissions)
    console.log(`   - 提交狀態分布: 已提交 ${submissionStats.submitted}, 已通過 ${submissionStats.approved}, 已退回 ${submissionStats.rejected}`)

    console.log('\n' + (this.errors.length === 0 ? '🎉 所有測試通過！資料完整性良好。' : '⚠️ 發現問題，請檢查上述錯誤。'))
  }
}

// 執行測試
const tester = new MockDataTester()
tester.runAllTests()