/**
 * 用戶狀態相關常數
 */

import type { UserStatus } from '../types/admin'

/**
 * 狀態顏色配置（用於 Tailwind CSS）
 */
export const statusColors: Record<UserStatus, { bg: string; text: string; border: string }> = {
  submitted: {
    bg: 'bg-blue-100',
    text: 'text-blue-800',
    border: 'border-blue-300'
  },
  approved: {
    bg: 'bg-green-100',
    text: 'text-green-800',
    border: 'border-green-300'
  },
  rejected: {
    bg: 'bg-red-100',
    text: 'text-red-800',
    border: 'border-red-300'
  }
}

/**
 * 狀態標籤（中文顯示）
 */
export const statusLabels: Record<UserStatus, string> = {
  submitted: '已提交',
  approved: '已通過',
  rejected: '已退回'
}
