import { describe, it, expect } from 'vitest'
import { AdminReviewsAPI, adminReviewsAPI } from '../adminReviews'

describe('AdminReviewsAPI - Basic Tests', () => {
  it('應該導出 API 類別', () => {
    expect(AdminReviewsAPI).toBeDefined()
    expect(typeof AdminReviewsAPI).toBe('function')
  })

  it('應該導出 API 實例', () => {
    expect(adminReviewsAPI).toBeDefined()
    expect(adminReviewsAPI).toBeInstanceOf(AdminReviewsAPI)
  })

  it('API 實例應該具有所有必需的方法', () => {
    expect(typeof adminReviewsAPI.getReviewData).toBe('function')
    expect(typeof adminReviewsAPI.approveReview).toBe('function')
    expect(typeof adminReviewsAPI.rejectReview).toBe('function')
    expect(typeof adminReviewsAPI.getEnergyCategories).toBe('function')
    expect(typeof adminReviewsAPI.getUserReviews).toBe('function')
  })

  it('應該在缺少參數時拋出錯誤', async () => {
    await expect(adminReviewsAPI.getReviewData('', 'diesel')).rejects.toThrow('用戶ID和類別ID為必填項目')
    await expect(adminReviewsAPI.getReviewData('user_001', '')).rejects.toThrow('用戶ID和類別ID為必填項目')
  })

  it('應該在退回審核時檢查退回原因', async () => {
    await expect(adminReviewsAPI.rejectReview('user_001', 'diesel', '')).rejects.toThrow('退回原因為必填項目')
    await expect(adminReviewsAPI.rejectReview('user_001', 'diesel', '   ')).rejects.toThrow('退回原因為必填項目')
  })

  it('應該能夠獲取能源類別清單', async () => {
    const categories = await adminReviewsAPI.getEnergyCategories()
    expect(Array.isArray(categories)).toBe(true)
    expect(categories.length).toBeGreaterThan(0)

    // 檢查第一個類別的結構
    const firstCategory = categories[0]
    expect(firstCategory).toHaveProperty('id')
    expect(firstCategory).toHaveProperty('name')
    expect(firstCategory).toHaveProperty('scope')
    expect([1, 2, 3]).toContain(firstCategory.scope)
  })
})