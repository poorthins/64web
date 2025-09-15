import React from 'react'
import { Upload, Loader2, Trash2, CheckCircle } from 'lucide-react'
import StatusIndicator from './StatusIndicator'
import { EntryStatus } from './StatusSwitcher'

interface BottomActionBarProps {
  // 狀態管理
  currentStatus: EntryStatus
  currentEntryId: string | null
  isUpdating: boolean
  hasSubmittedBefore?: boolean
  hasAnyData?: boolean  // 新增：是否有填寫資料
  
  // 操作權限
  editPermissions: {
    canEdit: boolean
    canUploadFiles: boolean
  }
  
  // 操作狀態
  submitting: boolean
  
  // 事件處理
  onSubmit: () => void
  onClear: () => void
  
  // 樣式配置
  designTokens: any
}

/**
 * 統一的底部操作欄組件
 * 
 * TODO: 資料庫整合 API 接口
 * - getEntryStatus(pageKey: string, year: number): Promise<EntryStatusResponse>
 * - updateEntryStatus(entryId: string, status: EntryStatus): Promise<void>
 * - 實現 30 秒輪詢更新機制
 * - 添加錯誤處理和重試邏輯
 */
export default function BottomActionBar({
  currentStatus,
  currentEntryId,
  isUpdating,
  hasSubmittedBefore = false,
  hasAnyData = false,
  editPermissions,
  submitting,
  onSubmit,
  onClear,
  designTokens
}: BottomActionBarProps) {
  
  // 權限判斷
  const isReadOnly = currentStatus === 'approved'
  const canEdit = !isReadOnly
  const canSubmit = !isReadOnly && (!hasSubmittedBefore || !isReadOnly)
  
  return (
    <div className="fixed bottom-0 left-64 xl:left-64 lg:left-56 md:left-48 sm:left-44 right-4 z-40">
      <div 
        className="border-t"
        style={{ 
          backgroundColor: designTokens.colors.cardBg,
          borderColor: designTokens.colors.border,
          boxShadow: designTokens.shadows.lg
        }}
      >
        <div className="max-w-4xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            {/* 左側: 狀態顯示區域 */}
            <div className="flex items-center gap-2">
              {/* 狀態指示器 */}
              {hasSubmittedBefore && currentStatus ? (
                <StatusIndicator status={currentStatus} />
              ) : !hasSubmittedBefore && hasAnyData ? (
                <div className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse" />
              ) : !hasSubmittedBefore ? (
                <div className="w-2 h-2 rounded-full bg-gray-400" />
              ) : null}
              
              {/* 狀態文字 */}
              <span className="text-sm text-gray-600">
                {!hasSubmittedBefore ? (
                  hasAnyData ? "請完成填寫並提交" : "請開始填寫資料"
                ) : (
                  <>
                    {currentStatus === 'submitted' && "已提交待審"}
                    {currentStatus === 'approved' && 
                      <span className="text-green-600 font-medium">審核通過（已鎖定）</span>
                    }
                    {currentStatus === 'rejected' && (
                      hasAnyData ? 
                        <span className="text-orange-600 font-medium">
                          訂正中 - 請完成修改後重新提交
                        </span> : 
                        <span className="text-red-600 font-medium">
                          已退回 - 請修正問題
                        </span>
                    )}
                  </>
                )}
              </span>
              
              {/* 退回警示 */}
              {currentStatus === 'rejected' && (
                <span className="text-xs text-red-500 ml-2">⚠️ 需要修正</span>
              )}
              
              {/* 更新中指示器 */}
              {isUpdating && (
                <Loader2 className="w-4 h-4 animate-spin text-blue-600 ml-2" />
              )}
            </div>
            
            {/* 右側: 操作按鈕 */}
            <div className="flex items-center space-x-3">
              {/* 清除按鈕 - 審核通過後隱藏 */}
              {canEdit && (
                <button 
                  onClick={onClear}
                  disabled={submitting || !canEdit}
                  className="px-4 py-2 border rounded-lg disabled:cursor-not-allowed transition-colors flex items-center space-x-2 font-medium disabled:opacity-50"
                  style={{ 
                    borderColor: designTokens.colors.border,
                    color: designTokens.colors.textSecondary
                  }}
                  onMouseEnter={(e) => {
                    if (!submitting && canEdit) {
                      (e.target as HTMLButtonElement).style.backgroundColor = '#f3f4f6';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!submitting && canEdit) {
                      (e.target as HTMLButtonElement).style.backgroundColor = 'transparent';
                    }
                  }}
                >
                  <Trash2 className="w-4 h-4" />
                  <span>清除</span>
                </button>
              )}
              
              {/* 提交按鈕 */}
              <button 
                onClick={onSubmit}
                disabled={submitting || !canSubmit}
                className={`px-6 py-2 rounded-lg transition-colors flex items-center space-x-2 font-medium disabled:opacity-50 ${
                  canSubmit 
                    ? 'bg-green-600 text-white hover:bg-green-700 cursor-pointer' 
                    : 'bg-gray-400 text-gray-200 cursor-not-allowed'
                }`}
              >
                {currentStatus === 'approved' ? (
                  <>
                    <CheckCircle className="w-4 h-4" />
                    <span>已通過（鎖定）</span>
                  </>
                ) : submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>處理中...</span>
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4" />
                    <span>
                      {!hasSubmittedBefore ? '提交填報' :
                       currentStatus === 'rejected' ? 
                         (hasAnyData ? '重新提交（已修正）' : '重新提交') :
                       '更新提交'}
                    </span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}