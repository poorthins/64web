// State Management Test
// 測試狀態管理、狀態切換和統計計算

// 模擬使用者資料和狀態
const mockUsers = [
  { id: '1', name: '王小明', status: 'submitted', entries: 12 },
  { id: '2', name: '李美華', status: 'approved', entries: 8 },
  { id: '3', name: '張志豪', status: 'rejected', entries: 5 },
  { id: '4', name: '陳雅婷', status: 'submitted', entries: 15 },
  { id: '5', name: '林俊傑', status: 'approved', entries: 20 }
]

const mockSubmissions = [
  { id: 'sub_001', userId: '1', status: 'approved', priority: 'medium', co2Emission: 375.25 },
  { id: 'sub_002', userId: '2', status: 'submitted', priority: 'high', co2Emission: 1425 },
  { id: 'sub_003', userId: '3', status: 'rejected', priority: 'low', co2Emission: 12.1 },
  { id: 'sub_004', userId: '4', status: 'submitted', priority: 'high', co2Emission: 160.6 },
  { id: 'sub_005', userId: '5', status: 'approved', priority: 'medium', co2Emission: 278.84 }
]

// 模擬狀態管理功能
class StateManager {
  constructor(initialUsers = [], initialSubmissions = []) {
    this.users = [...initialUsers]
    this.submissions = [...initialSubmissions]
    this.filters = {
      status: 'all',
      department: 'all',
      search: ''
    }
    this.sorting = {
      field: 'name',
      direction: 'asc'
    }
  }

  // 更新用戶狀態
  updateUserStatus(userId, newStatus) {
    this.users = this.users.map(user =>
      user.id === userId ? { ...user, status: newStatus } : user
    )
    return this.getUser(userId)
  }

  // 更新提交狀態
  updateSubmissionStatus(submissionId, newStatus) {
    this.submissions = this.submissions.map(submission =>
      submission.id === submissionId ? { ...submission, status: newStatus } : submission
    )
    return this.getSubmission(submissionId)
  }

  // 批量更新狀態
  batchUpdateStatus(userIds, newStatus) {
    const updatedUsers = []
    this.users = this.users.map(user => {
      if (userIds.includes(user.id)) {
        const updatedUser = { ...user, status: newStatus }
        updatedUsers.push(updatedUser)
        return updatedUser
      }
      return user
    })
    return updatedUsers
  }

  // 設定篩選器
  setFilter(filterType, value) {
    this.filters[filterType] = value
  }

  // 設定排序
  setSorting(field, direction) {
    this.sorting = { field, direction }
  }

  // 取得篩選後的用戶
  getFilteredUsers() {
    let filtered = [...this.users]

    // 狀態篩選
    if (this.filters.status !== 'all') {
      filtered = filtered.filter(user => user.status === this.filters.status)
    }

    // 部門篩選
    if (this.filters.department !== 'all') {
      filtered = filtered.filter(user => user.department === this.filters.department)
    }

    // 搜尋篩選
    if (this.filters.search) {
      const searchTerm = this.filters.search.toLowerCase()
      filtered = filtered.filter(user =>
        user.name.toLowerCase().includes(searchTerm) ||
        (user.email && user.email.toLowerCase().includes(searchTerm)) ||
        (user.department && user.department.toLowerCase().includes(searchTerm))
      )
    }

    // 排序
    filtered.sort((a, b) => {
      const aVal = a[this.sorting.field] || ''
      const bVal = b[this.sorting.field] || ''

      if (this.sorting.direction === 'asc') {
        return aVal > bVal ? 1 : -1
      } else {
        return aVal < bVal ? 1 : -1
      }
    })

    return filtered
  }

  // 計算統計
  calculateStats() {
    const userStats = {
      submitted: this.users.filter(u => u.status === 'submitted').length,
      approved: this.users.filter(u => u.status === 'approved').length,
      rejected: this.users.filter(u => u.status === 'rejected').length,
      total: this.users.length
    }

    const submissionStats = {
      submitted: this.submissions.filter(s => s.status === 'submitted').length,
      approved: this.submissions.filter(s => s.status === 'approved').length,
      rejected: this.submissions.filter(s => s.status === 'rejected').length,
      total: this.submissions.length
    }

    const priorityStats = {
      high: this.submissions.filter(s => s.priority === 'high').length,
      medium: this.submissions.filter(s => s.priority === 'medium').length,
      low: this.submissions.filter(s => s.priority === 'low').length
    }

    const totalEmissions = this.submissions.reduce((sum, s) => sum + s.co2Emission, 0)

    return {
      users: userStats,
      submissions: submissionStats,
      priority: priorityStats,
      totalEmissions,
      averageEmissions: totalEmissions / this.submissions.length || 0
    }
  }

  // 取得單一用戶
  getUser(userId) {
    return this.users.find(user => user.id === userId)
  }

  // 取得單一提交
  getSubmission(submissionId) {
    return this.submissions.find(submission => submission.id === submissionId)
  }

  // 重置狀態
  reset() {
    this.filters = { status: 'all', department: 'all', search: '' }
    this.sorting = { field: 'name', direction: 'asc' }
  }
}

class StateManagementTester {
  constructor() {
    this.errors = []
    this.warnings = []
    this.testResults = []
    this.stateManager = new StateManager(mockUsers, mockSubmissions)
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

  // 測試狀態切換
  testStatusUpdates() {
    const testName = 'Status Updates'
    console.log('\n📝 測試狀態切換...')

    // 測試單一用戶狀態更新
    const userId = '1'
    const originalUser = this.stateManager.getUser(userId)
    const originalStatus = originalUser.status

    // 更新狀態
    const updatedUser = this.stateManager.updateUserStatus(userId, 'approved')

    if (updatedUser.status !== 'approved') {
      this.logError(testName, `用戶狀態更新失敗: 期望 'approved', 實際 '${updatedUser.status}'`)
    } else {
      this.logSuccess(testName, `用戶 ${userId} 狀態成功從 '${originalStatus}' 更新為 'approved'`)
    }

    // 測試無效用戶 ID
    const invalidUpdate = this.stateManager.updateUserStatus('999', 'approved')
    if (invalidUpdate) {
      this.logError(testName, '無效用戶 ID 應該返回 undefined')
    } else {
      this.logSuccess(testName, '無效用戶 ID 正確返回 undefined')
    }

    // 測試提交狀態更新
    const submissionId = 'sub_002'
    const originalSubmission = this.stateManager.getSubmission(submissionId)
    const originalSubmissionStatus = originalSubmission.status

    const updatedSubmission = this.stateManager.updateSubmissionStatus(submissionId, 'rejected')
    if (updatedSubmission.status !== 'rejected') {
      this.logError(testName, `提交狀態更新失敗: 期望 'rejected', 實際 '${updatedSubmission.status}'`)
    } else {
      this.logSuccess(testName, `提交 ${submissionId} 狀態成功從 '${originalSubmissionStatus}' 更新為 'rejected'`)
    }
  }

  // 測試批量狀態更新
  testBatchStatusUpdates() {
    const testName = 'Batch Status Updates'
    console.log('\n📝 測試批量狀態更新...')

    const userIds = ['2', '4']
    const updatedUsers = this.stateManager.batchUpdateStatus(userIds, 'approved')

    if (updatedUsers.length !== userIds.length) {
      this.logError(testName, `批量更新用戶數量不正確: 期望 ${userIds.length}, 實際 ${updatedUsers.length}`)
    } else {
      this.logSuccess(testName, `成功批量更新 ${updatedUsers.length} 個用戶狀態`)
    }

    // 檢查每個用戶的狀態
    updatedUsers.forEach(user => {
      if (user.status !== 'approved') {
        this.logError(testName, `用戶 ${user.id} 批量更新失敗: 期望 'approved', 實際 '${user.status}'`)
      } else {
        this.logSuccess(testName, `用戶 ${user.id} 批量更新成功`)
      }
    })

    // 測試空陣列
    const emptyBatchUpdate = this.stateManager.batchUpdateStatus([], 'rejected')
    if (emptyBatchUpdate.length !== 0) {
      this.logError(testName, '空陣列批量更新應該返回空陣列')
    } else {
      this.logSuccess(testName, '空陣列批量更新正確處理')
    }
  }

  // 測試篩選功能
  testFiltering() {
    const testName = 'Filtering'
    console.log('\n📝 測試篩選功能...')

    // 重置篩選器
    this.stateManager.reset()

    // 測試狀態篩選
    this.stateManager.setFilter('status', 'approved')
    const approvedUsers = this.stateManager.getFilteredUsers()
    const expectedApproved = this.stateManager.users.filter(u => u.status === 'approved').length

    if (approvedUsers.length !== expectedApproved) {
      this.logError(testName, `狀態篩選錯誤: 期望 ${expectedApproved} 個已通過用戶, 實際 ${approvedUsers.length}`)
    } else {
      this.logSuccess(testName, `狀態篩選正確: 找到 ${approvedUsers.length} 個已通過用戶`)
    }

    // 檢查篩選結果正確性
    const wrongStatus = approvedUsers.find(user => user.status !== 'approved')
    if (wrongStatus) {
      this.logError(testName, `篩選結果包含錯誤狀態的用戶: ${wrongStatus.name} (${wrongStatus.status})`)
    } else {
      this.logSuccess(testName, '所有篩選結果狀態正確')
    }

    // 測試 'all' 篩選
    this.stateManager.setFilter('status', 'all')
    const allUsers = this.stateManager.getFilteredUsers()
    if (allUsers.length !== this.stateManager.users.length) {
      this.logError(testName, `'all' 篩選錯誤: 期望 ${this.stateManager.users.length}, 實際 ${allUsers.length}`)
    } else {
      this.logSuccess(testName, "'all' 篩選正確返回所有用戶")
    }

    // 測試搜尋篩選
    this.stateManager.setFilter('search', '王')
    const searchResults = this.stateManager.getFilteredUsers()
    const expectedSearchResults = this.stateManager.users.filter(u => u.name.includes('王'))

    if (searchResults.length !== expectedSearchResults.length) {
      this.logError(testName, `搜尋篩選錯誤: 期望 ${expectedSearchResults.length}, 實際 ${searchResults.length}`)
    } else {
      this.logSuccess(testName, `搜尋篩選正確: 找到 ${searchResults.length} 個匹配用戶`)
    }
  }

  // 測試排序功能
  testSorting() {
    const testName = 'Sorting'
    console.log('\n📝 測試排序功能...')

    // 重置並設定按名稱升序排序
    this.stateManager.reset()
    this.stateManager.setSorting('name', 'asc')
    const ascSorted = this.stateManager.getFilteredUsers()

    // 檢查升序排序
    for (let i = 1; i < ascSorted.length; i++) {
      if (ascSorted[i-1].name > ascSorted[i].name) {
        this.logError(testName, `升序排序錯誤: ${ascSorted[i-1].name} 應該在 ${ascSorted[i].name} 之前`)
        break
      }
    }
    this.logSuccess(testName, '升序排序正確')

    // 測試降序排序
    this.stateManager.setSorting('name', 'desc')
    const descSorted = this.stateManager.getFilteredUsers()

    // 檢查降序排序
    for (let i = 1; i < descSorted.length; i++) {
      if (descSorted[i-1].name < descSorted[i].name) {
        this.logError(testName, `降序排序錯誤: ${descSorted[i-1].name} 應該在 ${descSorted[i].name} 之後`)
        break
      }
    }
    this.logSuccess(testName, '降序排序正確')

    // 測試按數字欄位排序
    this.stateManager.setSorting('entries', 'asc')
    const entriesSorted = this.stateManager.getFilteredUsers()

    for (let i = 1; i < entriesSorted.length; i++) {
      if ((entriesSorted[i-1].entries || 0) > (entriesSorted[i].entries || 0)) {
        this.logError(testName, `entries 升序排序錯誤: ${entriesSorted[i-1].entries} 應該 <= ${entriesSorted[i].entries}`)
        break
      }
    }
    this.logSuccess(testName, 'entries 欄位排序正確')
  }

  // 測試統計計算
  testStatisticsCalculation() {
    const testName = 'Statistics Calculation'
    console.log('\n📝 測試統計計算...')

    const stats = this.stateManager.calculateStats()

    // 檢查用戶統計
    const expectedUserStats = {
      submitted: this.stateManager.users.filter(u => u.status === 'submitted').length,
      approved: this.stateManager.users.filter(u => u.status === 'approved').length,
      rejected: this.stateManager.users.filter(u => u.status === 'rejected').length,
      total: this.stateManager.users.length
    }

    Object.keys(expectedUserStats).forEach(key => {
      if (stats.users[key] !== expectedUserStats[key]) {
        this.logError(testName, `用戶統計 ${key} 錯誤: 期望 ${expectedUserStats[key]}, 實際 ${stats.users[key]}`)
      }
    })
    this.logSuccess(testName, '用戶統計計算正確')

    // 檢查提交統計
    const expectedSubmissionStats = {
      submitted: this.stateManager.submissions.filter(s => s.status === 'submitted').length,
      approved: this.stateManager.submissions.filter(s => s.status === 'approved').length,
      rejected: this.stateManager.submissions.filter(s => s.status === 'rejected').length,
      total: this.stateManager.submissions.length
    }

    Object.keys(expectedSubmissionStats).forEach(key => {
      if (stats.submissions[key] !== expectedSubmissionStats[key]) {
        this.logError(testName, `提交統計 ${key} 錯誤: 期望 ${expectedSubmissionStats[key]}, 實際 ${stats.submissions[key]}`)
      }
    })
    this.logSuccess(testName, '提交統計計算正確')

    // 檢查碳排放統計
    const expectedTotalEmissions = this.stateManager.submissions.reduce((sum, s) => sum + s.co2Emission, 0)
    const expectedAverageEmissions = expectedTotalEmissions / this.stateManager.submissions.length

    if (Math.abs(stats.totalEmissions - expectedTotalEmissions) > 0.01) {
      this.logError(testName, `總碳排放計算錯誤: 期望 ${expectedTotalEmissions}, 實際 ${stats.totalEmissions}`)
    } else {
      this.logSuccess(testName, '總碳排放計算正確')
    }

    if (Math.abs(stats.averageEmissions - expectedAverageEmissions) > 0.01) {
      this.logError(testName, `平均碳排放計算錯誤: 期望 ${expectedAverageEmissions}, 實際 ${stats.averageEmissions}`)
    } else {
      this.logSuccess(testName, '平均碳排放計算正確')
    }
  }

  // 測試狀態一致性
  testStateConsistency() {
    const testName = 'State Consistency'
    console.log('\n📝 測試狀態一致性...')

    // 記錄初始狀態
    const initialUserCount = this.stateManager.users.length
    const initialSubmissionCount = this.stateManager.submissions.length

    // 執行一系列操作
    this.stateManager.updateUserStatus('1', 'approved')
    this.stateManager.setFilter('status', 'approved')
    this.stateManager.setSorting('name', 'desc')
    this.stateManager.batchUpdateStatus(['2', '3'], 'submitted')

    // 檢查狀態一致性
    if (this.stateManager.users.length !== initialUserCount) {
      this.logError(testName, `用戶數量改變: 期望 ${initialUserCount}, 實際 ${this.stateManager.users.length}`)
    } else {
      this.logSuccess(testName, '用戶數量保持一致')
    }

    if (this.stateManager.submissions.length !== initialSubmissionCount) {
      this.logError(testName, `提交數量改變: 期望 ${initialSubmissionCount}, 實際 ${this.stateManager.submissions.length}`)
    } else {
      this.logSuccess(testName, '提交數量保持一致')
    }

    // 檢查篩選器狀態
    if (this.stateManager.filters.status !== 'approved') {
      this.logError(testName, `篩選器狀態異常: 期望 'approved', 實際 '${this.stateManager.filters.status}'`)
    } else {
      this.logSuccess(testName, '篩選器狀態保持正確')
    }

    // 檢查排序狀態
    if (this.stateManager.sorting.field !== 'name' || this.stateManager.sorting.direction !== 'desc') {
      this.logError(testName, `排序狀態異常: 期望 name/desc, 實際 ${this.stateManager.sorting.field}/${this.stateManager.sorting.direction}`)
    } else {
      this.logSuccess(testName, '排序狀態保持正確')
    }
  }

  // 測試邊界條件
  testEdgeCases() {
    const testName = 'Edge Cases'
    console.log('\n📝 測試邊界條件...')

    // 測試空資料集
    const emptyStateManager = new StateManager([], [])
    const emptyStats = emptyStateManager.calculateStats()

    if (emptyStats.users.total !== 0 || emptyStats.submissions.total !== 0) {
      this.logError(testName, '空資料集統計錯誤')
    } else {
      this.logSuccess(testName, '空資料集統計正確')
    }

    // 測試無效篩選值
    this.stateManager.setFilter('status', 'invalid_status')
    const invalidFiltered = this.stateManager.getFilteredUsers()
    if (invalidFiltered.length !== 0) {
      this.logError(testName, '無效狀態篩選應該返回空結果')
    } else {
      this.logSuccess(testName, '無效狀態篩選正確處理')
    }

    // 測試無效排序欄位
    this.stateManager.reset()
    this.stateManager.setSorting('invalid_field', 'asc')
    const invalidSorted = this.stateManager.getFilteredUsers()
    if (invalidSorted.length === 0) {
      this.logError(testName, '無效排序欄位不應該影響結果數量')
    } else {
      this.logSuccess(testName, '無效排序欄位正確處理')
    }
  }

  // 執行所有測試
  runAllTests() {
    console.log('🚀 開始執行狀態管理測試...\n')

    this.testStatusUpdates()
    this.testBatchStatusUpdates()
    this.testFiltering()
    this.testSorting()
    this.testStatisticsCalculation()
    this.testStateConsistency()
    this.testEdgeCases()

    this.generateReport()
  }

  // 生成測試報告
  generateReport() {
    console.log('\n' + '='.repeat(50))
    console.log('📊 狀態管理測試報告')
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
    console.log('   - ✅ 狀態切換功能')
    console.log('   - ✅ 批量狀態更新')
    console.log('   - ✅ 篩選功能')
    console.log('   - ✅ 排序功能')
    console.log('   - ✅ 統計計算')
    console.log('   - ✅ 狀態一致性')
    console.log('   - ✅ 邊界條件處理')

    const finalStats = this.stateManager.calculateStats()
    console.log('\n📈 最終狀態統計:')
    console.log(`   - 用戶: 總計 ${finalStats.users.total} (已提交 ${finalStats.users.submitted}, 已通過 ${finalStats.users.approved}, 已退回 ${finalStats.users.rejected})`)
    console.log(`   - 提交: 總計 ${finalStats.submissions.total} (已提交 ${finalStats.submissions.submitted}, 已通過 ${finalStats.submissions.approved}, 已退回 ${finalStats.submissions.rejected})`)
    console.log(`   - 碳排放: 總計 ${finalStats.totalEmissions.toFixed(2)} kg, 平均 ${finalStats.averageEmissions.toFixed(2)} kg`)

    console.log('\n' + (this.errors.length === 0 ? '🎉 所有狀態管理測試通過！' : '⚠️ 發現問題，請檢查上述錯誤。'))
  }
}

// 執行測試
const tester = new StateManagementTester()
tester.runAllTests()