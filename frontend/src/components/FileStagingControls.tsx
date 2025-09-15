import React from 'react'
import { Save, X, Upload, Trash2, AlertCircle } from 'lucide-react'

interface FileStagingControlsProps {
  hasChanges: boolean
  changeCount: {
    deletes: number
    uploads: number
    total: number
  }
  onSyncChanges: () => Promise<void>
  onCancelChanges: () => void
  syncing?: boolean
  error?: string | null
  disabled?: boolean
}

const FileStagingControls: React.FC<FileStagingControlsProps> = ({
  hasChanges,
  changeCount,
  onSyncChanges,
  onCancelChanges,
  syncing = false,
  error = null,
  disabled = false
}) => {
  if (!hasChanges) {
    return null
  }

  return (
    <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-lg">
      {/* 變更統計 */}
      <div className="flex items-center space-x-2 mb-3">
        <AlertCircle className="w-4 h-4 text-amber-600" />
        <span className="text-sm font-medium text-amber-800">
          有未儲存的檔案變更
        </span>
      </div>
      
      <div className="flex items-center justify-between">
        <div className="text-sm text-amber-700">
          {changeCount.uploads > 0 && (
            <span className="inline-flex items-center mr-4">
              <Upload className="w-3 h-3 mr-1" />
              待上傳 {changeCount.uploads} 個檔案
            </span>
          )}
          {changeCount.deletes > 0 && (
            <span className="inline-flex items-center">
              <Trash2 className="w-3 h-3 mr-1" />
              待刪除 {changeCount.deletes} 個檔案
            </span>
          )}
        </div>
        
        <div className="flex items-center space-x-2">
          <button
            onClick={onCancelChanges}
            disabled={syncing || disabled}
            className="px-3 py-1.5 text-sm border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-1"
          >
            <X className="w-3 h-3" />
            <span>取消變更</span>
          </button>
          
          <button
            onClick={onSyncChanges}
            disabled={syncing || disabled}
            className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-1"
          >
            {syncing ? (
              <>
                <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white" />
                <span>更新中...</span>
              </>
            ) : (
              <>
                <Save className="w-3 h-3" />
                <span>更新檔案</span>
              </>
            )}
          </button>
        </div>
      </div>
      
      {error && (
        <div className="mt-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded p-2">
          {error}
        </div>
      )}
    </div>
  )
}

export default FileStagingControls