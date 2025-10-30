import { useMemo } from 'react'
import { EntryStatus } from '../components/StatusSwitcher'

export interface EditPermissions {
  canEdit: boolean
  canUploadFiles: boolean
  canDeleteFiles: boolean
  isReadonly: boolean
  submitButtonText: string
  statusDescription: string
}

/**
 * 編輯權限控制 Hook
 * 根據當前狀態和審核模式返回相應的權限控制
 *
 * @param status - 當前填報狀態
 * @param isReviewMode - 是否為審核模式（管理員查看時）
 * @param role - 用戶角色（'admin' | 'user'）
 * @returns EditPermissions
 */
export function useEditPermissions(
  status: EntryStatus,
  isReviewMode: boolean = false,
  role?: string
): EditPermissions {
  return useMemo(() => {
    // ✅ 審核模式：只有非管理員強制唯讀
    if (isReviewMode && role !== 'admin') {
      return {
        canEdit: false,
        canUploadFiles: false,
        canDeleteFiles: false,
        isReadonly: true,
        submitButtonText: '審核模式',
        statusDescription: '審核模式 - 唯讀'
      }
    }

    switch (status) {
      case 'saved':
        return {
          canEdit: true,
          canUploadFiles: true,
          canDeleteFiles: true,
          isReadonly: false,
          submitButtonText: '提交填報',
          statusDescription: '已暫存，可完全編輯'
        }

      case 'rejected':
        return {
          canEdit: true,
          canUploadFiles: true,
          canDeleteFiles: true,
          isReadonly: false,
          submitButtonText: '重新提交',
          statusDescription: '可完全編輯，修正後重新提交'
        }

      case 'submitted':
        return {
          canEdit: true,
          canUploadFiles: true,
          canDeleteFiles: true,
          isReadonly: false,
          submitButtonText: '更新提交',
          statusDescription: '可編輯並更新，等待審核'
        }

      case 'approved':
        return {
          canEdit: false,
          canUploadFiles: false,
          canDeleteFiles: false,
          isReadonly: true,
          submitButtonText: '已核准',
          statusDescription: '完全唯讀，無法編輯'
        }

      default:  // draft 或其他狀態
        return {
          canEdit: true,
          canUploadFiles: true,
          canDeleteFiles: true,
          isReadonly: false,
          submitButtonText: '提交填報',
          statusDescription: '草稿狀態，可完全編輯'
        }
    }
  }, [status, isReviewMode, role])  // ← 依賴項加入 role
}

/**
 * 檢查特定狀態是否可編輯
 */
export function canEditStatus(status: EntryStatus): boolean {
  return status !== 'approved'
}

/**
 * 檢查特定狀態是否可上傳檔案
 */
export function canUploadFilesForStatus(status: EntryStatus): boolean {
  return status !== 'approved'
}

/**
 * 檢查特定狀態是否為唯讀
 */
export function isReadonlyStatus(status: EntryStatus): boolean {
  return status === 'approved'
}

/**
 * 取得狀態對應的提交按鈕文字
 */
export function getSubmitButtonText(status: EntryStatus): string {
  switch (status) {
    case 'saved':
      return '提交填報'
    case 'rejected':
      return '重新提交'
    case 'submitted':
      return '更新提交'
    case 'approved':
      return '已核准'
    default:
      return '提交填報'
  }
}