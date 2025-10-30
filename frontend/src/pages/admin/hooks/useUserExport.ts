import { useState } from 'react'
import { toast } from 'react-hot-toast'
import { exportSingleUser } from '../utils/userExportUtils'
import { handleAPIError, showErrorToast, withRetry } from '../utils/errorHandler'
import type { User } from '../types/admin'

export interface ExportProgress {
  status: string
  current?: number
  total?: number
}

export interface UseUserExportReturn {
  // State
  selectedUser: User | null
  showExportModal: boolean
  isExporting: boolean
  exportProgress: ExportProgress | null

  // Actions
  handleQuickExport: (user: User) => void
  handleExportConfirm: () => Promise<void>
  handleExportClose: () => void
}

/**
 * 用戶匯出功能 Hook
 * 統一處理用戶資料匯出的狀態管理與錯誤處理
 */
export function useUserExport(): UseUserExportReturn {
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [showExportModal, setShowExportModal] = useState(false)
  const [isExporting, setIsExporting] = useState(false)
  const [exportProgress, setExportProgress] = useState<ExportProgress | null>(null)

  const handleQuickExport = (user: User) => {
    setSelectedUser(user)
    setShowExportModal(true)
  }

  const handleExportConfirm = async () => {
    if (!selectedUser) return

    setIsExporting(true)
    setExportProgress({ status: '正在準備...' })

    try {
      const result = await withRetry(() =>
        exportSingleUser(
          selectedUser.id,
          selectedUser.name,
          (status, current, total) => {
            setExportProgress({ status, current, total })
          }
        )
      )

      setShowExportModal(false)
      setExportProgress(null)

      if (result.failed === 0) {
        toast.success(`✅ 下載完成！成功：${result.success} 個檔案`)
      } else {
        toast.success(`⚠️ 部分檔案失敗\n成功：${result.success}\n失敗：${result.failed}`)
      }
    } catch (err: any) {
      const apiError = handleAPIError(err)
      showErrorToast(apiError)
      setExportProgress(null)
    } finally {
      setIsExporting(false)
    }
  }

  const handleExportClose = () => {
    if (!isExporting) {
      setShowExportModal(false)
      setSelectedUser(null)
      setExportProgress(null)
    }
  }

  return {
    selectedUser,
    showExportModal,
    isExporting,
    exportProgress,
    handleQuickExport,
    handleExportConfirm,
    handleExportClose
  }
}
