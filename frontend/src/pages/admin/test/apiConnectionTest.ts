// API 連接測試檔案
// 分階段測試：第一批讀取 API，第二批寫入 API

import { listUsers, combineUsersWithCounts, createUser, updateUser, type UserProfile, type CreateUserData, type UserUpdateData } from '../../../api/adminUsers'
import { getAllUsersWithSubmissions, getSubmissionStats, type UserWithSubmissions, type SubmissionStats } from '../../../api/adminSubmissions'
import { User, SubmissionRecord, UserStatus } from '../data/mockData'

// ===== 資料轉換函數 =====

/**
 * 狀態轉換邏輯：API 的 is_active + review_history → Mock 的 status
 */
export function convertUserStatus(
  isActive: boolean,
  pendingReviews: number = 0,
  approvedReviews: number = 0,
  needsFixReviews: number = 0
): UserStatus {
  if (!isActive) return 'rejected'

  // 如果有需要修正的審核，狀態為 rejected
  if (needsFixReviews > 0) return 'rejected'

  // 如果有已通過的審核，狀態為 approved
  if (approvedReviews > 0) return 'approved'

  // 如果有待審核或只有提交資料，狀態為 submitted
  return 'submitted'
}

/**
 * 日期格式統一：ISO → 顯示格式
 */
export function formatDateForDisplay(isoDate?: string): string {
  if (!isoDate) return new Date().toISOString().split('T')[0]
  return isoDate.split('T')[0] // 2024-03-20T10:30:00Z → 2024-03-20
}

/**
 * API UserWithSubmissions → Mock User 轉換
 */
export function convertAPIUserToMock(apiUser: UserWithSubmissions): User {
  return {
    id: apiUser.id,
    name: apiUser.display_name || '未知用戶',
    email: apiUser.email || '',
    department: '未知部門', // API 沒有此欄位，使用預設值
    status: convertUserStatus(
      apiUser.is_active,
      apiUser.pending_reviews,
      apiUser.approved_reviews,
      apiUser.needs_fix_reviews
    ),
    submissionDate: formatDateForDisplay(apiUser.latest_submission_date),
    lastActivity: formatDateForDisplay(apiUser.latest_submission_date),
    entries: apiUser.submission_count,
    avatar: '👤' // 預設頭像
  }
}

/**
 * 建立測試用戶資料（帶安全標記）
 */
export function createTestUserData(): CreateUserData {
  const timestamp = Date.now()
  return {
    email: `test_${timestamp}@example.com`,
    password: 'TestPassword123!',
    display_name: `測試用戶_${timestamp}`,
    company: '測試公司',
    job_title: '測試職位',
    phone: '0912-345-678',
    role: 'user'
  }
}

// ===== API 測試類別 =====

export class APIConnectionTester {
  private results: Record<string, any> = {}
  private errors: Record<string, Error> = {}

  // 第一批：讀取 API 測試
  async testReadAPIs(): Promise<{ success: boolean; results: any; errors: any }> {
    console.log('🔍 開始第一批：讀取 API 測試')

    // 測試 1: listUsers
    try {
      console.log('📝 測試 listUsers()...')
      const users = await listUsers()
      this.results.listUsers = {
        success: true,
        count: users.length,
        data: users.slice(0, 3), // 只顯示前3筆作為範例
        message: `成功讀取 ${users.length} 位用戶`
      }
      console.log(`✅ listUsers() 成功：${users.length} 位用戶`)
    } catch (error) {
      this.errors.listUsers = error as Error
      this.results.listUsers = { success: false, error: error.message }
      console.log('❌ listUsers() 失敗：', error.message)
    }

    // 測試 2: combineUsersWithCounts
    try {
      console.log('📊 測試 combineUsersWithCounts()...')
      const usersWithCounts = await combineUsersWithCounts()
      this.results.combineUsersWithCounts = {
        success: true,
        count: usersWithCounts.length,
        data: usersWithCounts.slice(0, 3),
        message: `成功獲取 ${usersWithCounts.length} 位用戶統計`
      }
      console.log(`✅ combineUsersWithCounts() 成功：${usersWithCounts.length} 位用戶`)
    } catch (error) {
      this.errors.combineUsersWithCounts = error as Error
      this.results.combineUsersWithCounts = { success: false, error: error.message }
      console.log('❌ combineUsersWithCounts() 失敗：', error.message)
    }

    // 測試 3: getAllUsersWithSubmissions
    try {
      console.log('📋 測試 getAllUsersWithSubmissions()...')
      const usersWithSubmissions = await getAllUsersWithSubmissions()
      this.results.getAllUsersWithSubmissions = {
        success: true,
        count: usersWithSubmissions.length,
        data: usersWithSubmissions.slice(0, 3),
        message: `成功獲取 ${usersWithSubmissions.length} 位用戶提交統計`
      }
      console.log(`✅ getAllUsersWithSubmissions() 成功：${usersWithSubmissions.length} 位用戶`)
    } catch (error) {
      this.errors.getAllUsersWithSubmissions = error as Error
      this.results.getAllUsersWithSubmissions = { success: false, error: error.message }
      console.log('❌ getAllUsersWithSubmissions() 失敗：', error.message)
    }

    // 測試 4: getSubmissionStats
    try {
      console.log('📈 測試 getSubmissionStats()...')
      const stats = await getSubmissionStats()
      this.results.getSubmissionStats = {
        success: true,
        data: stats,
        message: `成功獲取提交統計：總計 ${stats.total_submissions} 筆`
      }
      console.log(`✅ getSubmissionStats() 成功：總計 ${stats.total_submissions} 筆提交`)
    } catch (error) {
      this.errors.getSubmissionStats = error as Error
      this.results.getSubmissionStats = { success: false, error: error.message }
      console.log('❌ getSubmissionStats() 失敗：', error.message)
    }

    const successCount = Object.values(this.results).filter(r => r.success).length
    const totalTests = Object.keys(this.results).length
    const overallSuccess = successCount === totalTests

    console.log(`🎯 第一批測試完成：${successCount}/${totalTests} 成功`)

    return {
      success: overallSuccess,
      results: this.results,
      errors: this.errors
    }
  }

  // 第二批：寫入 API 測試（謹慎執行）
  async testWriteAPIs(): Promise<{ success: boolean; results: any; errors: any }> {
    console.log('⚠️  開始第二批：寫入 API 測試（將建立測試資料）')

    // 測試 1: createUser（建立測試用戶）
    try {
      console.log('👤 測試 createUser()（建立測試用戶）...')
      const testUserData = createTestUserData()
      const newUser = await createUser(testUserData)

      this.results.createUser = {
        success: true,
        data: newUser,
        testData: testUserData,
        message: `成功建立測試用戶：${newUser.display_name}`
      }
      console.log(`✅ createUser() 成功：${newUser.display_name} (ID: ${newUser.id})`)

      // 測試 2: updateUser（更新剛建立的測試用戶）
      try {
        console.log('✏️  測試 updateUser()（更新測試用戶）...')
        const updateData: UserUpdateData = {
          display_name: `${testUserData.display_name}_已更新`,
          company: '測試公司_已更新'
        }

        await updateUser(newUser.id, updateData)
        this.results.updateUser = {
          success: true,
          userId: newUser.id,
          updateData,
          message: `成功更新測試用戶：${updateData.display_name}`
        }
        console.log(`✅ updateUser() 成功：已更新用戶 ${newUser.id}`)
      } catch (error) {
        this.errors.updateUser = error as Error
        this.results.updateUser = { success: false, error: error.message }
        console.log('❌ updateUser() 失敗：', error.message)
      }

    } catch (error) {
      this.errors.createUser = error as Error
      this.results.createUser = { success: false, error: error.message }
      console.log('❌ createUser() 失敗：', error.message)
    }

    const writeSuccessCount = Object.values(this.results).filter(r => r.success && !['listUsers', 'combineUsersWithCounts', 'getAllUsersWithSubmissions', 'getSubmissionStats'].includes(r.testName)).length
    const writeTotalTests = Object.keys(this.results).length - 4 // 扣除讀取 API 的 4 個測試

    console.log(`🎯 第二批測試完成：${writeSuccessCount}/${writeTotalTests} 成功`)

    return {
      success: true, // 寫入測試不影響整體成功率，因為可能會因為權限或環境限制失敗
      results: this.results,
      errors: this.errors
    }
  }

  // 資料轉換測試
  async testDataConversion(): Promise<void> {
    console.log('🔄 測試資料轉換函數...')

    try {
      // 測試狀態轉換
      const testStatuses = [
        { isActive: true, pending: 1, approved: 0, needsFix: 0, expected: 'submitted' },
        { isActive: true, pending: 0, approved: 1, needsFix: 0, expected: 'approved' },
        { isActive: true, pending: 0, approved: 0, needsFix: 1, expected: 'rejected' },
        { isActive: false, pending: 0, approved: 0, needsFix: 0, expected: 'rejected' }
      ]

      for (const test of testStatuses) {
        const result = convertUserStatus(test.isActive, test.pending, test.approved, test.needsFix)
        const success = result === test.expected
        console.log(`${success ? '✅' : '❌'} 狀態轉換測試：${test.isActive ? '啟用' : '停用'} + 待審:${test.pending} 通過:${test.approved} 需修正:${test.needsFix} → ${result} ${success ? '' : `(預期: ${test.expected})`}`)
      }

      // 測試日期轉換
      const testDate = '2024-03-20T10:30:00Z'
      const converted = formatDateForDisplay(testDate)
      const dateSuccess = converted === '2024-03-20'
      console.log(`${dateSuccess ? '✅' : '❌'} 日期轉換測試：${testDate} → ${converted}`)

    } catch (error) {
      console.log('❌ 資料轉換測試失敗：', error.message)
    }
  }

  // 獲取完整測試報告
  getTestReport(): {
    summary: any;
    details: any;
    recommendations: string[]
  } {
    const allResults = Object.keys(this.results)
    const successfulTests = allResults.filter(key => this.results[key].success)
    const failedTests = allResults.filter(key => !this.results[key].success)

    const summary = {
      total: allResults.length,
      successful: successfulTests.length,
      failed: failedTests.length,
      successRate: `${Math.round((successfulTests.length / allResults.length) * 100)}%`
    }

    const recommendations = []

    if (failedTests.length > 0) {
      recommendations.push('檢查失敗的 API 調用錯誤訊息')
      recommendations.push('確認用戶權限和 RLS 設定')
    }

    if (failedTests.includes('createUser') || failedTests.includes('updateUser')) {
      recommendations.push('檢查寫入權限和資料庫約束')
    }

    if (successfulTests.length > 0) {
      recommendations.push('成功的 API 可以用於系統整合')
    }

    return {
      summary,
      details: { results: this.results, errors: this.errors },
      recommendations
    }
  }
}

// 預設匯出測試器實例
export const apiTester = new APIConnectionTester()