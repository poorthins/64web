import { ApprovalStatus } from './useApprovalStatus'

export interface StatusBannerConfig {
  type: 'approved' | 'rejected' | 'pending' | 'saved'
  icon: string
  title: string
  statusText: string  // 簡短版狀態文字（用於底部狀態欄）
  message?: string
  reason?: string
  reviewedAt?: string
}

/**
 * 統一管理頁面狀態橫幅的 Hook
 *
 * @param approvalStatus - 審核狀態物件
 * @param isReviewMode - 是否為審核模式
 * @returns 狀態橫幅配置，若不顯示則返回 null
 */
export const useStatusBanner = (
  approvalStatus: ApprovalStatus,
  isReviewMode: boolean = false
): StatusBannerConfig | null => {
  // 審核模式下不顯示狀態橫幅
  if (isReviewMode) {
    return null
  }

  // 優先級：approved > rejected > pending > saved

  if (approvalStatus.isApproved) {
    return {
      type: 'approved',
      icon: '🎉',
      title: '恭喜您已審核通過！',
      statusText: '已審核通過',
      message: '此填報已完成審核，資料已鎖定無法修改。'
    }
  }

  if (approvalStatus.isRejected) {
    return {
      type: 'rejected',
      icon: '⚠️',
      title: '填報已被退回',
      statusText: '已退回',
      reason: approvalStatus.reviewNotes || '無',
      reviewedAt: approvalStatus.reviewedAt,
      message: '請修正後重新提交'
    }
  }

  if (approvalStatus.isPending) {
    return {
      type: 'pending',
      icon: '📋',
      title: '資料已提交',
      statusText: '已提交待審核',
      message: '您的填報已提交，請等待管理員審核。'
    }
  }

  if (approvalStatus.isSaved) {
    return {
      type: 'saved',
      icon: '💾',
      title: '資料已暫存',
      statusText: '已暫存',
      message: '您的資料已儲存，可隨時修改後提交審核。'
    }
  }

  return null
}

/**
 * 根據橫幅類型返回對應的 Tailwind 樣式類別
 */
export const getBannerColorClasses = (type: StatusBannerConfig['type']): string => {
  const colorMap = {
    approved: 'bg-green-100 border-green-500 text-green-700',
    rejected: 'bg-red-100 border-red-500 text-red-700',
    pending: 'bg-blue-100 border-blue-500 text-blue-700',
    saved: 'bg-gray-100 border-gray-500 text-gray-700'
  }
  return colorMap[type]
}
