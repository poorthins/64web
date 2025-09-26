import { SubmissionRecord, energyCategories } from '../pages/admin/poc/data/mockData'

export interface ReviewData {
  submission: SubmissionRecord
  category: {
    id: string
    name: string
    scope: 1 | 2 | 3
    hasVersion?: boolean
  }
  user: {
    id: string
    name: string
    email: string
    department: string
  }
}

export interface ReviewActionResponse {
  success: boolean
  message: string
  data?: SubmissionRecord
}

export interface ApiError extends Error {
  status: number
  code: string
}

class AdminReviewsAPI {
  private baseUrl = '/api/admin/reviews'

  private createApiError(message: string, status: number, code: string): ApiError {
    const error = new Error(message) as ApiError
    error.status = status
    error.code = code
    return error
  }

  private async mockDelay(ms: number = 500): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, ms))
  }

  private async simulateNetworkError(): Promise<void> {
    // 模擬 5% 的網路錯誤機率
    if (Math.random() < 0.05) {
      throw this.createApiError('Network error', 500, 'NETWORK_ERROR')
    }
  }

  /**
   * 獲取特定用戶和能源類別的審核資料
   */
  async getReviewData(userId: string, categoryId: string): Promise<ReviewData> {
    if (!userId || !categoryId) {
      throw this.createApiError('用戶ID和類別ID為必填項目', 400, 'MISSING_PARAMETERS')
    }

    await this.mockDelay()
    await this.simulateNetworkError()

    // 從 mock data 中查找對應的提交記錄
    const mockSubmissions = await import('../pages/admin/poc/data/mockData').then(m => m.mockSubmissions)
    const mockUsers = await import('../pages/admin/poc/data/mockData').then(m => m.mockUsers)

    const submission = mockSubmissions.find(s =>
      s.userId === userId && s.categoryId === categoryId
    )

    if (!submission) {
      throw this.createApiError('找不到對應的審核資料', 404, 'SUBMISSION_NOT_FOUND')
    }

    const user = mockUsers.find(u => u.id === userId)
    if (!user) {
      throw this.createApiError('找不到對應的用戶', 404, 'USER_NOT_FOUND')
    }

    const category = energyCategories.find(c => c.id === categoryId)
    if (!category) {
      throw this.createApiError('找不到對應的能源類別', 404, 'CATEGORY_NOT_FOUND')
    }

    return {
      submission,
      category,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        department: user.department
      }
    }
  }

  /**
   * 通過審核
   */
  async approveReview(userId: string, categoryId: string, comment?: string): Promise<ReviewActionResponse> {
    if (!userId || !categoryId) {
      throw this.createApiError('用戶ID和類別ID為必填項目', 400, 'MISSING_PARAMETERS')
    }

    await this.mockDelay()
    await this.simulateNetworkError()

    try {
      const reviewData = await this.getReviewData(userId, categoryId)

      if (reviewData.submission.status === 'approved') {
        return {
          success: false,
          message: '此記錄已經被通過，無法重複操作'
        }
      }

      // 模擬更新記錄狀態
      const updatedSubmission: SubmissionRecord = {
        ...reviewData.submission,
        status: 'approved',
        reviewDate: new Date().toISOString().split('T')[0],
        reviewedAt: new Date().toLocaleString('zh-TW', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit'
        }),
        reviewer: '管理員',
        reviewerId: 'admin_current',
        comments: comment || '審核通過'
      }

      return {
        success: true,
        message: `已通過 ${reviewData.user.name} 的 ${reviewData.category.name} 申請`,
        data: updatedSubmission
      }
    } catch (error) {
      if (error instanceof Error) {
        throw error
      }
      throw this.createApiError('通過審核時發生未知錯誤', 500, 'UNKNOWN_ERROR')
    }
  }

  /**
   * 退回審核
   */
  async rejectReview(userId: string, categoryId: string, reason: string): Promise<ReviewActionResponse> {
    if (!userId || !categoryId) {
      throw this.createApiError('用戶ID和類別ID為必填項目', 400, 'MISSING_PARAMETERS')
    }

    if (!reason || reason.trim().length === 0) {
      throw this.createApiError('退回原因為必填項目', 400, 'MISSING_REASON')
    }

    await this.mockDelay()
    await this.simulateNetworkError()

    try {
      const reviewData = await this.getReviewData(userId, categoryId)

      if (reviewData.submission.status === 'rejected') {
        return {
          success: false,
          message: '此記錄已經被退回，無法重複操作'
        }
      }

      // 模擬更新記錄狀態
      const updatedSubmission: SubmissionRecord = {
        ...reviewData.submission,
        status: 'rejected',
        reviewDate: new Date().toISOString().split('T')[0],
        reviewedAt: new Date().toLocaleString('zh-TW', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit'
        }),
        reviewer: '管理員',
        reviewerId: 'admin_current',
        reviewNotes: reason,
        comments: '審核退回'
      }

      return {
        success: true,
        message: `已退回 ${reviewData.user.name} 的 ${reviewData.category.name} 申請`,
        data: updatedSubmission
      }
    } catch (error) {
      if (error instanceof Error) {
        throw error
      }
      throw this.createApiError('退回審核時發生未知錯誤', 500, 'UNKNOWN_ERROR')
    }
  }

  /**
   * 獲取所有能源類別
   */
  async getEnergyCategories(): Promise<typeof energyCategories> {
    await this.mockDelay(200)
    await this.simulateNetworkError()

    return energyCategories
  }

  /**
   * 獲取用戶的所有審核記錄
   */
  async getUserReviews(userId: string): Promise<SubmissionRecord[]> {
    if (!userId) {
      throw this.createApiError('用戶ID為必填項目', 400, 'MISSING_PARAMETERS')
    }

    await this.mockDelay()
    await this.simulateNetworkError()

    const mockSubmissions = await import('../pages/admin/poc/data/mockData').then(m => m.mockSubmissions)

    const userSubmissions = mockSubmissions.filter(s => s.userId === userId)

    return userSubmissions
  }
}

// 導出單例實例
export const adminReviewsAPI = new AdminReviewsAPI()

// 導出類別供測試使用
export { AdminReviewsAPI }