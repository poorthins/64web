import { describe, it, expect, beforeEach, vi } from 'vitest'
import { AdminReviewsAPI, adminReviewsAPI, ApiError } from '../adminReviews'
import { mockSubmissions, mockUsers, energyCategories } from '../../pages/admin/poc/data/mockData'

// Mock the data imports
vi.mock('../../pages/admin/poc/data/mockData', () => ({
  mockSubmissions: [
    {
      id: 'test_001',
      userId: 'user_001',
      userName: '測試用戶',
      userDepartment: '測試部門',
      categoryId: 'diesel',
      categoryName: '柴油',
      scope: 1,
      status: 'submitted',
      submissionDate: '2024-03-15',
      amount: 100,
      unit: '公升',
      co2Emission: 250,
      priority: 'medium'
    },
    {
      id: 'test_002',
      userId: 'user_001',
      userName: '測試用戶',
      userDepartment: '測試部門',
      categoryId: 'electricity_bill',
      categoryName: '外購電力',
      scope: 2,
      status: 'approved',
      submissionDate: '2024-03-10',
      reviewDate: '2024-03-11',
      amount: 2000,
      unit: '度',
      co2Emission: 1000,
      reviewer: '管理員',
      priority: 'high'
    }
  ],
  mockUsers: [
    {
      id: 'user_001',
      name: '測試用戶',
      email: 'test@example.com',
      department: '測試部門',
      status: 'submitted',
      submissionDate: '2024-03-15',
      lastActivity: '2024-03-20',
      entries: 2,
      avatar: '👨‍💻'
    }
  ],
  energyCategories: [
    { id: 'diesel', name: '柴油', scope: 1 },
    { id: 'electricity_bill', name: '外購電力', scope: 2 },
    { id: 'employee_commute', name: '員工通勤', scope: 3 }
  ]
}))

describe('AdminReviewsAPI', () => {
  let api: AdminReviewsAPI

  beforeEach(() => {
    api = new AdminReviewsAPI()
    vi.clearAllMocks()
  })

  describe('getReviewData', () => {
    it('應該成功獲取審核資料', async () => {
      const result = await api.getReviewData('user_001', 'diesel')

      expect(result).toEqual({
        submission: expect.objectContaining({
          id: 'test_001',
          userId: 'user_001',
          categoryId: 'diesel',
          status: 'submitted'
        }),
        category: {
          id: 'diesel',
          name: '柴油',
          scope: 1
        },
        user: {
          id: 'user_001',
          name: '測試用戶',
          email: 'test@example.com',
          department: '測試部門'
        }
      })
    })

    it('應該在缺少參數時拋出錯誤', async () => {
      await expect(api.getReviewData('', 'diesel')).rejects.toThrow('用戶ID和類別ID為必填項目')
      await expect(api.getReviewData('user_001', '')).rejects.toThrow('用戶ID和類別ID為必填項目')
    })

    it('應該在找不到提交記錄時拋出404錯誤', async () => {
      await expect(api.getReviewData('nonexistent', 'diesel')).rejects.toMatchObject({
        message: '找不到對應的審核資料',
        status: 404,
        code: 'SUBMISSION_NOT_FOUND'
      })
    })

    it('應該在找不到用戶時拋出404錯誤', async () => {
      // 模擬有提交記錄但沒有對應用戶的情況
      const mockSubmissionsWithInvalidUser = [
        {
          ...mockSubmissions[0],
          userId: 'invalid_user'
        }
      ]

      vi.doMock('../../pages/admin/poc/data/mockData', () => ({
        mockSubmissions: mockSubmissionsWithInvalidUser,
        mockUsers,
        energyCategories
      }))

      await expect(api.getReviewData('invalid_user', 'diesel')).rejects.toMatchObject({
        message: '找不到對應的用戶',
        status: 404,
        code: 'USER_NOT_FOUND'
      })
    })
  })

  describe('approveReview', () => {
    it('應該成功通過審核', async () => {
      const result = await api.approveReview('user_001', 'diesel', '數據正確')

      expect(result.success).toBe(true)
      expect(result.message).toContain('已通過')
      expect(result.data).toMatchObject({
        status: 'approved',
        reviewer: '管理員',
        comments: '數據正確'
      })
      expect(result.data?.reviewDate).toBeDefined()
      expect(result.data?.reviewedAt).toBeDefined()
    })

    it('應該使用預設評論當沒有提供評論時', async () => {
      const result = await api.approveReview('user_001', 'diesel')

      expect(result.success).toBe(true)
      expect(result.data?.comments).toBe('審核通過')
    })

    it('應該在記錄已經被通過時返回失敗', async () => {
      const result = await api.approveReview('user_001', 'electricity_bill')

      expect(result.success).toBe(false)
      expect(result.message).toContain('已經被通過')
    })

    it('應該在缺少參數時拋出錯誤', async () => {
      await expect(api.approveReview('', 'diesel')).rejects.toThrow('用戶ID和類別ID為必填項目')
    })
  })

  describe('rejectReview', () => {
    it('應該成功退回審核', async () => {
      const reason = '資料不完整，請重新提交'
      const result = await api.rejectReview('user_001', 'diesel', reason)

      expect(result.success).toBe(true)
      expect(result.message).toContain('已退回')
      expect(result.data).toMatchObject({
        status: 'rejected',
        reviewer: '管理員',
        reviewNotes: reason,
        comments: '審核退回'
      })
      expect(result.data?.reviewDate).toBeDefined()
      expect(result.data?.reviewedAt).toBeDefined()
    })

    it('應該在缺少退回原因時拋出錯誤', async () => {
      await expect(api.rejectReview('user_001', 'diesel', '')).rejects.toThrow('退回原因為必填項目')
      await expect(api.rejectReview('user_001', 'diesel', '   ')).rejects.toThrow('退回原因為必填項目')
    })

    it('應該在缺少參數時拋出錯誤', async () => {
      await expect(api.rejectReview('', 'diesel', '原因')).rejects.toThrow('用戶ID和類別ID為必填項目')
      await expect(api.rejectReview('user_001', '', '原因')).rejects.toThrow('用戶ID和類別ID為必填項目')
    })
  })

  describe('getEnergyCategories', () => {
    it('應該成功獲取所有能源類別', async () => {
      const categories = await api.getEnergyCategories()

      expect(categories).toEqual([
        { id: 'diesel', name: '柴油', scope: 1 },
        { id: 'electricity_bill', name: '外購電力', scope: 2 },
        { id: 'employee_commute', name: '員工通勤', scope: 3 }
      ])
    })
  })

  describe('getUserReviews', () => {
    it('應該成功獲取用戶的所有審核記錄', async () => {
      const reviews = await api.getUserReviews('user_001')

      expect(reviews).toHaveLength(2)
      expect(reviews[0]).toMatchObject({
        userId: 'user_001',
        categoryId: 'diesel'
      })
      expect(reviews[1]).toMatchObject({
        userId: 'user_001',
        categoryId: 'electricity_bill'
      })
    })

    it('應該在缺少用戶ID時拋出錯誤', async () => {
      await expect(api.getUserReviews('')).rejects.toThrow('用戶ID為必填項目')
    })

    it('應該在用戶沒有審核記錄時返回空陣列', async () => {
      const reviews = await api.getUserReviews('nonexistent_user')

      expect(reviews).toEqual([])
    })
  })

  describe('錯誤處理', () => {
    it('應該正確創建 API 錯誤', () => {
      const error = api['createApiError']('測試錯誤', 400, 'TEST_ERROR')

      expect(error).toBeInstanceOf(Error)
      expect(error.message).toBe('測試錯誤')
      expect(error.status).toBe(400)
      expect(error.code).toBe('TEST_ERROR')
    })
  })

  describe('網路錯誤模擬', () => {
    it('應該有機率拋出網路錯誤', async () => {
      // 透過多次調用來測試錯誤機率
      const promises = Array(20).fill(null).map(async () => {
        try {
          await api.getEnergyCategories()
          return 'success'
        } catch (error) {
          if (error instanceof Error && (error as ApiError).code === 'NETWORK_ERROR') {
            return 'network_error'
          }
          throw error
        }
      })

      const results = await Promise.all(promises)
      const successCount = results.filter(r => r === 'success').length
      const errorCount = results.filter(r => r === 'network_error').length

      // 至少應該有一些成功的調用
      expect(successCount).toBeGreaterThan(0)

      // 總數應該等於調用次數
      expect(successCount + errorCount).toBe(20)
    })
  })
})

describe('adminReviewsAPI 單例', () => {
  it('應該導出 API 單例實例', () => {
    expect(adminReviewsAPI).toBeInstanceOf(AdminReviewsAPI)
  })

  it('單例實例應該具有所有必需的方法', () => {
    expect(typeof adminReviewsAPI.getReviewData).toBe('function')
    expect(typeof adminReviewsAPI.approveReview).toBe('function')
    expect(typeof adminReviewsAPI.rejectReview).toBe('function')
    expect(typeof adminReviewsAPI.getEnergyCategories).toBe('function')
    expect(typeof adminReviewsAPI.getUserReviews).toBe('function')
  })
})