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
 * 根據當前狀態返回相應的權限控制
 */
export function useEditPermissions(status: EntryStatus): EditPermissions {
  return useMemo(() => {
    switch (status) {
      case 'draft':
        return {
          canEdit: true,
          canUploadFiles: true,
          canDeleteFiles: true,
          isReadonly: false,
          submitButtonText: '提交填報',
          statusDescription: '可完全編輯，包含所有操作'
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
      
      default:
        return {
          canEdit: false,
          canUploadFiles: false,
          canDeleteFiles: false,
          isReadonly: true,
          submitButtonText: '未知狀態',
          statusDescription: '未知狀態'
        }
    }
  }, [status])
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
    case 'draft':
      return '提交填報'
    case 'rejected':
      return '重新提交'
    case 'submitted':
      return '更新提交'
    case 'approved':
      return '已核准'
    default:
      return '提交'
  }
}