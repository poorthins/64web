/**
 * useEnergyPageNotifications - 能源頁面通用通知管理 Hook
 *
 * 適用於所有能源填報頁面（柴油、汽油、冷媒、SF6 等）
 *
 * 功能：
 * - 管理 Toast 訊息（成功/錯誤）
 * - 管理成功彈窗狀態
 * - 管理清除確認彈窗狀態
 */

import { useState } from 'react'

export function useEnergyPageNotifications() {
  // Toast 狀態
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  // Modal 狀態
  const [showSuccessModal, setShowSuccessModal] = useState(false)
  const [showClearConfirmModal, setShowClearConfirmModal] = useState(false)

  // 清除所有通知
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
    showClearConfirmModal,
    setShowSuccessModal,
    setShowClearConfirmModal,

    // 便捷方法
    clearAllNotifications
  }
}
