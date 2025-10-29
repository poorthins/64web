import { describe, it, expect } from 'vitest'
import { useStatusBanner, getBannerColorClasses } from '../useStatusBanner'
import { ApprovalStatus } from '../useApprovalStatus'

describe('useStatusBanner', () => {
  // ========================================
  // 基本功能測試
  // ========================================
  describe('基本功能', () => {
    it('審核模式下應返回 null', () => {
      const approvalStatus: ApprovalStatus = {
        isApproved: false,
        isRejected: false,
        isPending: true,
        isSaved: false,
        rejectionReason: '',
        status: 'submitted',
        reviewNotes: '',
        reviewedAt: '',
        reviewerId: ''
      }

      const result = useStatusBanner(approvalStatus, true)
      expect(result).toBeNull()
    })

    it('沒有任何狀態時應返回 null', () => {
      const approvalStatus: ApprovalStatus = {
        isApproved: false,
        isRejected: false,
        isPending: false,
        isSaved: false,
        rejectionReason: '',
        status: null,
        reviewNotes: '',
        reviewedAt: '',
        reviewerId: ''
      }

      const result = useStatusBanner(approvalStatus, false)
      expect(result).toBeNull()
    })
  })

  // ========================================
  // 狀態優先級測試
  // ========================================
  describe('狀態優先級', () => {
    it('approved 優先級最高', () => {
      const approvalStatus: ApprovalStatus = {
        isApproved: true,
        isRejected: true,  // 同時為 true，應優先顯示 approved
        isPending: true,
        isSaved: true,
        rejectionReason: '',
        status: 'approved',
        reviewNotes: '',
        reviewedAt: '',
        reviewerId: ''
      }

      const result = useStatusBanner(approvalStatus, false)
      expect(result?.type).toBe('approved')
      expect(result?.title).toBe('恭喜您已審核通過！')
    })

    it('rejected 優先級高於 pending 和 saved', () => {
      const approvalStatus: ApprovalStatus = {
        isApproved: false,
        isRejected: true,
        isPending: true,  // 同時為 true，應優先顯示 rejected
        isSaved: true,
        rejectionReason: '資料不完整',
        status: 'rejected',
        reviewNotes: '資料不完整',
        reviewedAt: '2024-01-01T10:00:00Z',
        reviewerId: 'reviewer_123'
      }

      const result = useStatusBanner(approvalStatus, false)
      expect(result?.type).toBe('rejected')
      expect(result?.title).toBe('填報已被退回')
    })

    it('pending 優先級高於 saved', () => {
      const approvalStatus: ApprovalStatus = {
        isApproved: false,
        isRejected: false,
        isPending: true,
        isSaved: true,  // 同時為 true，應優先顯示 pending
        rejectionReason: '',
        status: 'submitted',
        reviewNotes: '',
        reviewedAt: '',
        reviewerId: ''
      }

      const result = useStatusBanner(approvalStatus, false)
      expect(result?.type).toBe('pending')
      expect(result?.title).toBe('資料已提交')
    })
  })

  // ========================================
  // 各狀態詳細測試
  // ========================================
  describe('approved 狀態', () => {
    it('應返回正確的 approved 配置', () => {
      const approvalStatus: ApprovalStatus = {
        isApproved: true,
        isRejected: false,
        isPending: false,
        isSaved: false,
        rejectionReason: '',
        status: 'approved',
        reviewNotes: '',
        reviewedAt: '',
        reviewerId: ''
      }

      const result = useStatusBanner(approvalStatus, false)

      expect(result).toEqual({
        type: 'approved',
        icon: '🎉',
        title: '恭喜您已審核通過！',
        statusText: '已審核通過',
        message: '此填報已完成審核，資料已鎖定無法修改。'
      })
    })
  })

  describe('rejected 狀態', () => {
    it('應返回正確的 rejected 配置（含退回原因）', () => {
      const approvalStatus: ApprovalStatus = {
        isApproved: false,
        isRejected: true,
        isPending: false,
        isSaved: false,
        rejectionReason: '資料格式錯誤',
        status: 'rejected',
        reviewNotes: '資料格式錯誤',
        reviewedAt: '2024-01-15T14:30:00Z',
        reviewerId: 'admin_001'
      }

      const result = useStatusBanner(approvalStatus, false)

      expect(result).toEqual({
        type: 'rejected',
        icon: '⚠️',
        title: '填報已被退回',
        statusText: '已退回',
        reason: '資料格式錯誤',
        reviewedAt: '2024-01-15T14:30:00Z',
        message: '請修正後重新提交'
      })
    })

    it('沒有退回原因時應顯示「無」', () => {
      const approvalStatus: ApprovalStatus = {
        isApproved: false,
        isRejected: true,
        isPending: false,
        isSaved: false,
        rejectionReason: '',
        status: 'rejected',
        reviewNotes: '',
        reviewedAt: '',
        reviewerId: ''
      }

      const result = useStatusBanner(approvalStatus, false)

      expect(result?.reason).toBe('無')
    })
  })

  describe('pending 狀態', () => {
    it('應返回正確的 pending 配置', () => {
      const approvalStatus: ApprovalStatus = {
        isApproved: false,
        isRejected: false,
        isPending: true,
        isSaved: false,
        rejectionReason: '',
        status: 'submitted',
        reviewNotes: '',
        reviewedAt: '',
        reviewerId: ''
      }

      const result = useStatusBanner(approvalStatus, false)

      expect(result).toEqual({
        type: 'pending',
        icon: '📋',
        title: '資料已提交',
        statusText: '已提交待審核',
        message: '您的填報已提交，請等待管理員審核。'
      })
    })
  })

  describe('saved 狀態', () => {
    it('應返回正確的 saved 配置', () => {
      const approvalStatus: ApprovalStatus = {
        isApproved: false,
        isRejected: false,
        isPending: false,
        isSaved: true,
        rejectionReason: '',
        status: 'saved',
        reviewNotes: '',
        reviewedAt: '',
        reviewerId: ''
      }

      const result = useStatusBanner(approvalStatus, false)

      expect(result).toEqual({
        type: 'saved',
        icon: '💾',
        title: '資料已暫存',
        statusText: '已暫存',
        message: '您的資料已儲存，可隨時修改後提交審核。'
      })
    })
  })

  // ========================================
  // getBannerColorClasses 測試
  // ========================================
  describe('getBannerColorClasses', () => {
    it('應返回 approved 的正確樣式類別', () => {
      const classes = getBannerColorClasses('approved')
      expect(classes).toBe('bg-green-100 border-green-500 text-green-700')
    })

    it('應返回 rejected 的正確樣式類別', () => {
      const classes = getBannerColorClasses('rejected')
      expect(classes).toBe('bg-red-100 border-red-500 text-red-700')
    })

    it('應返回 pending 的正確樣式類別', () => {
      const classes = getBannerColorClasses('pending')
      expect(classes).toBe('bg-blue-100 border-blue-500 text-blue-700')
    })

    it('應返回 saved 的正確樣式類別', () => {
      const classes = getBannerColorClasses('saved')
      expect(classes).toBe('bg-gray-100 border-gray-500 text-gray-700')
    })
  })

  // ========================================
  // Edge Cases 測試
  // ========================================
  describe('Edge Cases', () => {
    it('isReviewMode 預設為 false 時應正常運作', () => {
      const approvalStatus: ApprovalStatus = {
        isApproved: true,
        isRejected: false,
        isPending: false,
        isSaved: false,
        rejectionReason: '',
        status: 'approved',
        reviewNotes: '',
        reviewedAt: '',
        reviewerId: ''
      }

      // 不傳入 isReviewMode（使用預設值 false）
      const result = useStatusBanner(approvalStatus)

      expect(result).not.toBeNull()
      expect(result?.type).toBe('approved')
    })

    it('reviewedAt 為 undefined 時不應報錯', () => {
      const approvalStatus: ApprovalStatus = {
        isApproved: false,
        isRejected: true,
        isPending: false,
        isSaved: false,
        rejectionReason: '測試',
        status: 'rejected',
        reviewNotes: '測試',
        reviewedAt: undefined,
        reviewerId: ''
      }

      const result = useStatusBanner(approvalStatus, false)

      expect(result?.reviewedAt).toBeUndefined()
      expect(result?.type).toBe('rejected')
    })
  })
})
