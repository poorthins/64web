/**
 * useSF6Notifications - SF6 通知管理 Hook
 *
 * 功能：
 * - 管理 Toast 訊息（成功/錯誤）
 * - 管理 Modal 狀態（成功彈窗、清除確認彈窗）
 * - 提供統一的通知 API
 */

import { useState } from 'react'

export interface UseSF6NotificationsReturn {
  // Toast 狀態
  error: string | null
  success: string | null
  setError: (message: string | null) => void
  setSuccess: (message: string | null) => void

  // Modal 狀態
  showSuccessModal: boolean
  successModalType: 'save' | 'submit'
  showClearConfirmModal: boolean

  // Modal 操作
  setShowSuccessModal: (show: boolean) => void
  setSuccessModalType: (type: 'save' | 'submit') => void
  setShowClearConfirmModal: (show: boolean) => void

  // 便捷方法
  showError: (message: string) => void
  showSuccess: (message: string, type?: 'save' | 'submit') => void
  showClearConfirm: () => void
  hideClearConfirm: () => void
  clearAllNotifications: () => void
}

export function useSF6Notifications(): UseSF6NotificationsReturn {
  // Toast 狀態
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  // Modal 狀態
  const [showSuccessModal, setShowSuccessModal] = useState(false)
  const [successModalType, setSuccessModalType] = useState<'save' | 'submit'>('submit')
  const [showClearConfirmModal, setShowClearConfirmModal] = useState(false)

  /**
   * 顯示錯誤訊息
   */
  const showError = (message: string) => {
    setError(message)
  }

  /**
   * 顯示成功訊息
   */
  const showSuccess = (message: string, type: 'save' | 'submit' = 'save') => {
    setSuccess(message)
    setSuccessModalType(type)
    setShowSuccessModal(true)
  }

  /**
   * 顯示清除確認對話框
   */
  const showClearConfirm = () => {
    setShowClearConfirmModal(true)
  }

  /**
   * 隱藏清除確認對話框
   */
  const hideClearConfirm = () => {
    setShowClearConfirmModal(false)
  }

  /**
   * 清除所有通知
   */
  const clearAllNotifications = () => {
    setError(null)
    setSuccess(null)
    setShowSuccessModal(false)
    setShowClearConfirmModal(false)
  }

  return {
    // Toast 狀態
    error,
    success,
    setError,
    setSuccess,

    // Modal 狀態
    showSuccessModal,
    successModalType,
    showClearConfirmModal,

    // Modal 操作
    setShowSuccessModal,
    setSuccessModalType,
    setShowClearConfirmModal,

    // 便捷方法
    showError,
    showSuccess,
    showClearConfirm,
    hideClearConfirm,
    clearAllNotifications
  }
}
