import React from 'react'

export type EntryStatus = 'submitted' | 'approved' | 'rejected'

interface StatusSwitcherProps {
  currentStatus: EntryStatus
  onStatusChange: (status: EntryStatus) => void
  disabled?: boolean
  className?: string
}

const statusConfig = {
  rejected: {
    label: '已駁回',
    color: 'bg-red-100 text-red-700 border-red-300',
    hoverColor: 'hover:bg-red-200',
    description: '可編輯，按鈕顯示「重新提交」'
  },
  submitted: {
    label: '已提交',
    color: 'bg-blue-100 text-blue-700 border-blue-300',
    hoverColor: 'hover:bg-blue-200',
    description: '可編輯，按鈕顯示「更新提交」'
  },
  approved: {
    label: '已核准',
    color: 'bg-green-100 text-green-700 border-green-300',
    hoverColor: 'hover:bg-green-200',
    description: '完全唯讀，隱藏編輯按鈕'
  }
}

export default function StatusSwitcher({ 
  currentStatus, 
  onStatusChange, 
  disabled = false,
  className = '' 
}: StatusSwitcherProps) {
  const handleStatusClick = (status: EntryStatus) => {
    if (disabled) return
    onStatusChange(status)
  }

  return (
    <div className={`flex items-center space-x-3 ${className}`}>
      {/* 狀態標籤 - 同一行顯示 */}
      <div className="flex space-x-2">
        {(Object.keys(statusConfig) as EntryStatus[]).map((status) => {
          const config = statusConfig[status]
          const isActive = currentStatus === status
          const isClickable = !disabled && !isActive
          
          return (
            <button
              key={status}
              onClick={() => handleStatusClick(status)}
              disabled={disabled || isActive}
              className={`
                px-3 py-1.5 text-xs font-medium rounded-md border transition-colors duration-200
                ${isActive 
                  ? `${config.color} ring-2 ring-offset-1 ring-blue-500` 
                  : `bg-white text-gray-600 border-gray-300 ${isClickable ? `${config.hoverColor} hover:border-gray-400` : ''}`
                }
                ${disabled ? 'opacity-50 cursor-not-allowed' : isActive ? 'cursor-default' : 'cursor-pointer'}
              `}
              title={`${config.label} - ${config.description}`}
            >
              {config.label}
            </button>
          )
        })}
      </div>
      
      {/* 狀態說明 */}
      <div className="text-xs text-gray-500">
        {statusConfig[currentStatus].description}
      </div>
    </div>
  )
}

// 輔助函數：判斷當前狀態是否允許編輯
export function canEdit(status: EntryStatus): boolean {
  return status !== 'approved'
}

// 輔助函數：判斷當前狀態是否允許上傳檔案
export function canUploadFiles(status: EntryStatus): boolean {
  return status !== 'approved'
}

// 輔助函數：判斷當前狀態是否為唯讀
export function isReadOnly(status: EntryStatus): boolean {
  return status === 'approved'
}

// 輔助函數：根據狀態取得按鈕文字
export function getButtonText(status: EntryStatus): string {
  switch (status) {
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
